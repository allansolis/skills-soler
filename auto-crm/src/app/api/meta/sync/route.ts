import { db } from "@/db";
import { contacts, conversations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

const META_TOKEN = process.env.META_ACCESS_TOKEN || "";
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID || "777414378791556";
const META_API_BASE = "https://graph.facebook.com/v21.0";

interface MetaMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface MetaContact {
  wa_id: string;
  profile: { name: string };
}

// POST /api/meta/sync — Sync conversations from Meta platforms
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform = "whatsapp", messages = [], contactsData = [] } = body;

    const results = { synced: 0, contactsUpdated: 0, errors: [] as string[] };

    // Process incoming webhook messages (from n8n or direct webhook)
    for (const msg of messages as MetaMessage[]) {
      try {
        const senderPhone = msg.from;
        const senderName =
          (contactsData as MetaContact[]).find(
            (c) => c.wa_id === senderPhone
          )?.profile?.name || senderPhone;

        // Find or create contact by WhatsApp phone
        let existingContacts = await db
          .select()
          .from(contacts)
          .where(eq(contacts.whatsappPhone, senderPhone))
          .all();

        if (existingContacts.length === 0) {
          // Also check by regular phone
          existingContacts = await db
            .select()
            .from(contacts)
            .where(eq(contacts.phone, senderPhone))
            .all();
        }

        let contactId: string;

        if (existingContacts.length > 0) {
          contactId = existingContacts[0].id;
          // Update contact with WhatsApp info
          await db.update(contacts)
            .set({
              whatsappPhone: senderPhone,
              preferredChannel: platform,
              conversationCount:
                (existingContacts[0].conversationCount || 0) + 1,
              lastConversationAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, contactId))
            .run();
          results.contactsUpdated++;
        } else {
          // Create new contact from conversation
          const newContact = await db
            .insert(contacts)
            .values({
              name: senderName,
              phone: senderPhone,
              whatsappPhone: senderPhone,
              source: platform === "whatsapp" ? "whatsapp" : "redes_sociales",
              preferredChannel: platform,
              conversationCount: 1,
              lastConversationAt: new Date(),
              temperature: "warm",
            })
            .returning()
            .get();
          contactId = newContact.id;
          results.contactsUpdated++;
        }

        // Log conversation
        await db.insert(conversations)
          .values({
            contactId,
            platform,
            externalId: msg.id,
            direction: "inbound",
            message: msg.text?.body || `[${msg.type}]`,
            messageType: msg.type || "text",
            status: "delivered",
            senderName,
            senderPhone,
          })
          .run();

        results.synced++;
      } catch (err) {
        results.errors.push(
          `Error processing message ${msg.id}: ${String(err)}`
        );
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: "Error syncing Meta data" },
      { status: 500 }
    );
  }
}

// GET /api/meta/sync — Get sync status and stats
export async function GET() {
  const allConversations = await db.select().from(conversations).all();
  const allContacts = await db.select().from(contacts).all();

  const whatsappContacts = allContacts.filter((c) => c.whatsappPhone);
  const igContacts = allContacts.filter((c) => c.instagramHandle);
  const fbContacts = allContacts.filter((c) => c.facebookId);

  const platformCounts = {
    whatsapp: allConversations.filter((c) => c.platform === "whatsapp").length,
    instagram: allConversations.filter((c) => c.platform === "instagram")
      .length,
    facebook: allConversations.filter((c) => c.platform === "facebook").length,
    messenger: allConversations.filter((c) => c.platform === "messenger")
      .length,
  };

  return NextResponse.json({
    success: true,
    stats: {
      totalConversations: allConversations.length,
      platformCounts,
      contactsWithWhatsApp: whatsappContacts.length,
      contactsWithInstagram: igContacts.length,
      contactsWithFacebook: fbContacts.length,
      totalContactsWithSocial:
        whatsappContacts.length + igContacts.length + fbContacts.length,
    },
    hasMetaToken: !!META_TOKEN,
  });
}
