/**
 * Webhook unificado para Meta. Recibe eventos de:
 *   - Facebook Messenger (object="page")
 *   - Instagram DMs (object="instagram")
 *   - WhatsApp Business (object="whatsapp_business_account")
 *
 * GET  → verificacion challenge (hub.mode=subscribe)
 * POST → eventos. Valida HMAC X-Hub-Signature-256.
 *
 * Mapea page_id / phone_number_id / ig_account_id -> business y persiste en CRM.
 */
import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { contacts, conversations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { BusinessId, isValidBusinessId } from "@/lib/businessConfig";
import { handleInboundMessage } from "@/lib/elena/handle-message";

// Vercel/Node serverless functions die after the response is sent.
// Use Next's `after()` so Elena's Anthropic call runs AFTER we return 200 to
// Meta but still inside the function's lifecycle (no 5s webhook timeout risk).
//
// We also force the Node runtime (not Edge) because the libSQL HTTP client
// expects fetch + crypto from Node, and we use HMAC via node:crypto.
export const runtime = "nodejs";
export const maxDuration = 60; // seconds. Anthropic + Meta send + DB writes.

// FB pages
const PAGE_TO_BUSINESS: Record<string, BusinessId> = {
  "860529027138846": "glass_soler",
  "797310113463115": "esmeraldas_soler",
  "100123132505557": "autos_soler",
  "796480326889963": "inversiones_soler",
};

// Instagram Business Accounts
const IG_TO_BUSINESS: Record<string, BusinessId> = {
  "17841480061381569": "glass_soler",       // @glasssoler
  // Esmeraldas Soler IG sera agregada si se configura
};

// WhatsApp phone_number_ids
const WA_PHONE_TO_BUSINESS: Record<string, BusinessId> = {
  "1071826282682496": "glass_soler", // test phone
};

const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "";
const APP_SECRET = process.env.META_APP_SECRET || "";

// --------------------------------------------------------------- GET handler

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("[meta-webhook] verification OK");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[meta-webhook] verification FAIL", { mode, tokenMatch: token === VERIFY_TOKEN });
  return new NextResponse("Forbidden", { status: 403 });
}

// --------------------------------------------------------------- helpers

function verifySignature(rawBody: string, sig: string | null): boolean {
  if (!APP_SECRET) return true; // dev mode permissive
  if (!sig) return false;
  const expected =
    "sha256=" + crypto.createHmac("sha256", APP_SECRET).update(rawBody, "utf-8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

type Platform = "messenger" | "instagram" | "whatsapp";

async function upsertContact(opts: {
  business: BusinessId;
  externalId: string;
  name?: string;
  platform: Platform;
}): Promise<string> {
  const now = new Date();
  const fbId = opts.platform === "messenger" ? opts.externalId : null;
  const igHandle = opts.platform === "instagram" ? opts.externalId : null;
  const waPhone = opts.platform === "whatsapp" ? opts.externalId : null;

  let existing;
  if (fbId) {
    existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.facebookId, fbId), eq(contacts.business, opts.business)))
      .get();
  } else if (igHandle) {
    existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.instagramHandle, igHandle), eq(contacts.business, opts.business)))
      .get();
  } else if (waPhone) {
    existing = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(and(eq(contacts.whatsappPhone, waPhone), eq(contacts.business, opts.business)))
      .get();
  }

  if (existing) {
    await db.update(contacts)
      .set({ updatedAt: now, lastConversationAt: now })
      .where(eq(contacts.id, existing.id))
      .run();
    return existing.id;
  }

  const id = crypto.randomUUID();
  await db.insert(contacts)
    .values({
      id,
      name: opts.name || `Lead ${opts.externalId.slice(-6)}`,
      source: `meta_${opts.platform}`,
      temperature: "cold",
      score: 0,
      business: opts.business,
      facebookId: fbId,
      instagramHandle: igHandle,
      whatsappPhone: waPhone,
      preferredChannel: opts.platform,
      conversationCount: 1,
      lastConversationAt: now,
      loyaltyTier: "none",
      loyaltyPoints: 0,
      totalPurchases: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

async function insertMessage(opts: {
  contactId: string;
  business: BusinessId;
  platform: Platform;
  direction: "inbound" | "outbound";
  message: string;
  externalId: string;
  senderName?: string;
  senderPhone?: string;
  timestampMs?: number;
}): Promise<boolean> {
  const existing = await db
    .select({ id: conversations.id })
    .from(conversations)
    .where(eq(conversations.externalId, opts.externalId))
    .get();
  if (existing) return false;

  const date = opts.timestampMs ? new Date(opts.timestampMs) : new Date();
  await db.insert(conversations)
    .values({
      id: crypto.randomUUID(),
      contactId: opts.contactId,
      platform: opts.platform,
      externalId: opts.externalId,
      direction: opts.direction,
      message: opts.message,
      messageType: "text",
      status: "delivered",
      senderName: opts.senderName || null,
      senderPhone: opts.senderPhone || null,
      business: opts.business,
      createdAt: date,
    })
    .run();
  return true;
}

// --------------------------------------------------------------- handler: page / instagram (Messenger pattern)

interface MessagingEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string; is_echo?: boolean; attachments?: Array<{ type: string }> };
  postback?: { mid?: string; payload?: string; title?: string };
}

async function handlePageEntry(
  entry: { id?: string; messaging?: MessagingEvent[] },
  isInstagram: boolean,
  stats: Stats
): Promise<void> {
  const pageOrIgId = entry.id;
  const business = isInstagram
    ? (pageOrIgId && IG_TO_BUSINESS[pageOrIgId])
    : (pageOrIgId && PAGE_TO_BUSINESS[pageOrIgId]);
  if (!business || !isValidBusinessId(business)) {
    console.warn(`[meta-webhook] unknown ${isInstagram ? "IG" : "page"} id=${pageOrIgId}`);
    stats.skipped++;
    return;
  }

  const platform: Platform = isInstagram ? "instagram" : "messenger";
  const events = entry.messaging || [];

  for (const ev of events) {
    try {
      const senderId = ev.sender?.id;
      const recipientId = ev.recipient?.id;
      if (!senderId) { stats.skipped++; continue; }

      const isEcho = !!ev.message?.is_echo;
      const direction: "inbound" | "outbound" = isEcho ? "outbound" : "inbound";
      const otherUserId = isEcho ? recipientId : senderId;
      if (!otherUserId) { stats.skipped++; continue; }

      const contactId = await upsertContact({
        business,
        externalId: otherUserId,
        platform,
      });

      let text = "";
      let extId = "";
      if (ev.message) {
        text = ev.message.text || "";
        if (!text && ev.message.attachments?.length) {
          text = `[adjunto: ${ev.message.attachments.map((a) => a.type).join(",")}]`;
        }
        text = text || "[mensaje sin texto]";
        extId = ev.message.mid || `${pageOrIgId}_${ev.timestamp}_${senderId}`;
      } else if (ev.postback) {
        text = `[postback] ${ev.postback.title || ev.postback.payload || ""}`;
        extId = ev.postback.mid || `${pageOrIgId}_${ev.timestamp}_${senderId}_postback`;
      } else {
        stats.skipped++;
        continue;
      }

      const ok = await insertMessage({
        contactId, business, platform, direction,
        message: text, externalId: extId, timestampMs: ev.timestamp,
      });
      if (ok) stats.processed++; else stats.skipped++;

      // Disparar Elena en mensajes inbound de texto (no en echoes ni postbacks).
      // Usamos `after()` de Next: corre DESPUES de devolver 200 a Meta pero
      // dentro del lifecycle de la function. Esto evita el timeout de 5s del
      // webhook y permite que la llamada a Anthropic (3-5s) complete.
      if (ok && direction === "inbound" && ev.message?.text) {
        after(async () => {
          try {
            await handleInboundMessage({
              business,
              contactId,
              platform,
              recipientExternalId: otherUserId,
              userMessage: text,
            });
          } catch (err) {
            console.error("[meta-webhook] Elena handler error:", err);
          }
        });
      }
    } catch (err) {
      console.error("[meta-webhook] page event error:", err);
      stats.errors++;
    }
  }
}

// --------------------------------------------------------------- handler: WhatsApp

interface WAMessage {
  from?: string;
  id?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  audio?: object;
  video?: object;
  document?: object;
}

interface WAStatus {
  id?: string;
  recipient_id?: string;
  status?: string; // sent | delivered | read | failed
  timestamp?: string;
}

interface WAEntry {
  id?: string;
  changes?: Array<{
    field?: string;
    value?: {
      messaging_product?: string;
      metadata?: { display_phone_number?: string; phone_number_id?: string };
      contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>;
      messages?: WAMessage[];
      statuses?: WAStatus[];
    };
  }>;
}

async function handleWAEntry(entry: WAEntry, stats: Stats): Promise<void> {
  for (const change of entry.changes || []) {
    if (change.field !== "messages") {
      stats.skipped++;
      continue;
    }
    const value = change.value || {};
    const phoneNumberId = value.metadata?.phone_number_id;
    const business = phoneNumberId && WA_PHONE_TO_BUSINESS[phoneNumberId];
    if (!business || !isValidBusinessId(business)) {
      console.warn(`[meta-webhook] unknown WA phone_id=${phoneNumberId}`);
      stats.skipped++;
      continue;
    }

    const waContacts = value.contacts || [];
    const messages = value.messages || [];

    // Map wa_id -> profile.name para los nuevos contactos
    const nameByWaId: Record<string, string> = {};
    for (const c of waContacts) {
      if (c.wa_id) nameByWaId[c.wa_id] = c.profile?.name || "";
    }

    // Mensajes entrantes
    for (const m of messages) {
      try {
        const waId = m.from;
        if (!waId || !m.id) { stats.skipped++; continue; }

        const contactId = await upsertContact({
          business,
          externalId: waId,
          name: nameByWaId[waId],
          platform: "whatsapp",
        });

        let text = m.text?.body || "";
        if (!text) {
          if (m.image) text = `[imagen] ${m.image.caption || ""}`.trim();
          else if (m.audio) text = "[audio]";
          else if (m.video) text = "[video]";
          else if (m.document) text = "[documento]";
          else text = `[${m.type || "mensaje sin texto"}]`;
        }

        const ts = m.timestamp ? parseInt(m.timestamp, 10) * 1000 : Date.now();
        const ok = await insertMessage({
          contactId, business, platform: "whatsapp", direction: "inbound",
          message: text, externalId: m.id, senderPhone: waId,
          senderName: nameByWaId[waId], timestampMs: ts,
        });
        if (ok) stats.processed++; else stats.skipped++;

        // Disparar Elena para WA (siempre inbound, no hay echoes) via after()
        if (ok && m.text?.body) {
          after(async () => {
            try {
              await handleInboundMessage({
                business,
                contactId,
                platform: "whatsapp",
                recipientExternalId: waId,
                userMessage: text,
              });
            } catch (err) {
              console.error("[meta-webhook] Elena WA handler error:", err);
            }
          });
        }
      } catch (err) {
        console.error("[meta-webhook] WA message error:", err);
        stats.errors++;
      }
    }

    // Status updates (delivered, read) - actualizar status del mensaje original si existe
    for (const st of value.statuses || []) {
      try {
        if (!st.id || !st.status) { stats.skipped++; continue; }
        await db.update(conversations)
          .set({ status: st.status })
          .where(eq(conversations.externalId, st.id))
          .run();
      } catch (err) {
        console.error("[meta-webhook] WA status error:", err);
      }
    }
  }
}

// --------------------------------------------------------------- POST handler

interface Stats {
  processed: number;
  skipped: number;
  errors: number;
}

interface WebhookPayload {
  object?: string;
  entry?: unknown[];
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (APP_SECRET) {
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, sig)) {
      console.warn("[meta-webhook] invalid signature");
      return new NextResponse("Invalid signature", { status: 401 });
    }
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const object = payload.object || "unknown";
  const entries = (payload.entry || []) as unknown[];
  const stats: Stats = { processed: 0, skipped: 0, errors: 0 };

  for (const entry of entries) {
    try {
      if (object === "page") {
        await handlePageEntry(entry as Parameters<typeof handlePageEntry>[0], false, stats);
      } else if (object === "instagram") {
        await handlePageEntry(entry as Parameters<typeof handlePageEntry>[0], true, stats);
      } else if (object === "whatsapp_business_account") {
        await handleWAEntry(entry as WAEntry, stats);
      } else {
        console.warn(`[meta-webhook] unknown object=${object}`);
        stats.skipped++;
      }
    } catch (err) {
      console.error("[meta-webhook] entry error:", err);
      stats.errors++;
    }
  }

  console.log(
    `[meta-webhook] obj=${object} entries=${entries.length} ` +
    `processed=${stats.processed} skipped=${stats.skipped} errors=${stats.errors}`
  );

  return new NextResponse("EVENT_RECEIVED", { status: 200 });
}
