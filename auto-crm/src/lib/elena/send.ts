/**
 * Envia respuesta de Elena via Meta Graph API.
 * - Messenger: POST /me/messages con page token
 * - Instagram: POST /me/messages con page token (mismo, distinto recipient)
 * - WhatsApp: POST /{phone_number_id}/messages con WA token
 */
import type { BusinessId } from "@/lib/businessConfig";
import { getEnv } from "./env";

const V = getEnv("META_API_VERSION") || "v25.0";

/** Page tokens por business. Configurar en .env.local */
function getPageToken(business: BusinessId): string | null {
  const map: Record<BusinessId, string> = {
    glass_soler: getEnv("META_PAGE_TOKEN_GLASS"),
    esmeraldas_soler: getEnv("META_PAGE_TOKEN_ESMERALDAS"),
    autos_soler: getEnv("META_PAGE_TOKEN_AUTOS"),
    inversiones_soler: getEnv("META_PAGE_TOKEN_INVERSIONES"),
  };
  return map[business] || null;
}

/** WA phone_number_id por business */
function getWaPhoneId(business: BusinessId): string | null {
  const map: Record<BusinessId, string> = {
    glass_soler: getEnv("META_WA_PHONE_ID_TEST"), // test number mapped to Glass
    esmeraldas_soler: getEnv("META_WA_PHONE_ID_ESMERALDAS"),
    autos_soler: getEnv("META_WA_PHONE_ID_AUTOS"),
    inversiones_soler: getEnv("META_WA_PHONE_ID_INVERSIONES"),
  };
  return map[business] || null;
}

const WA_TOKEN = getEnv("META_WA_TOKEN");

export interface SendResult {
  success: boolean;
  externalId?: string;
  error?: string;
}

export async function sendViaMessenger(opts: {
  business: BusinessId;
  recipientId: string;
  text: string;
}): Promise<SendResult> {
  const token = getPageToken(opts.business);
  if (!token) {
    return { success: false, error: `No page token for ${opts.business} (set META_PAGE_TOKEN_${opts.business.toUpperCase()})` };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${V}/me/messages?access_token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: opts.recipientId },
        message: { text: opts.text },
        messaging_type: "RESPONSE",
      }),
    });
    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    return { success: true, externalId: data.message_id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function sendViaInstagram(opts: {
  business: BusinessId;
  recipientId: string;
  text: string;
}): Promise<SendResult> {
  // IG usa el mismo endpoint que Messenger con el page token
  return sendViaMessenger({
    business: opts.business,
    recipientId: opts.recipientId,
    text: opts.text,
  });
}

export async function sendViaWhatsapp(opts: {
  business: BusinessId;
  recipientWaId: string;
  text: string;
}): Promise<SendResult> {
  const phoneId = getWaPhoneId(opts.business);
  if (!phoneId) {
    return { success: false, error: `No WA phone_number_id for ${opts.business}` };
  }
  if (!WA_TOKEN) {
    return { success: false, error: "META_WA_TOKEN missing" };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/${V}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: opts.recipientWaId,
        type: "text",
        text: { body: opts.text },
      }),
    });
    const data = await res.json();
    if (data.error) {
      return { success: false, error: data.error.message };
    }
    const messageId = data.messages?.[0]?.id;
    return { success: true, externalId: messageId };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export type Platform = "messenger" | "instagram" | "whatsapp";

export async function sendResponse(opts: {
  business: BusinessId;
  platform: Platform;
  recipientId: string;
  text: string;
}): Promise<SendResult> {
  if (opts.platform === "messenger") {
    return sendViaMessenger({ business: opts.business, recipientId: opts.recipientId, text: opts.text });
  }
  if (opts.platform === "instagram") {
    return sendViaInstagram({ business: opts.business, recipientId: opts.recipientId, text: opts.text });
  }
  if (opts.platform === "whatsapp") {
    return sendViaWhatsapp({ business: opts.business, recipientWaId: opts.recipientId, text: opts.text });
  }
  return { success: false, error: `Unknown platform: ${opts.platform}` };
}
