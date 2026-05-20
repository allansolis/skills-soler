import { db } from "@/db";
import { conversations, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

// GET /api/meta/conversations — List all conversations with filters
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform");
  const contactId = searchParams.get("contactId");
  const limit = parseInt(searchParams.get("limit") || "50");

  let query = db
    .select({
      id: conversations.id,
      contactId: conversations.contactId,
      platform: conversations.platform,
      externalId: conversations.externalId,
      direction: conversations.direction,
      message: conversations.message,
      messageType: conversations.messageType,
      status: conversations.status,
      senderName: conversations.senderName,
      senderPhone: conversations.senderPhone,
      createdAt: conversations.createdAt,
      contactName: contacts.name,
      contactPhone: contacts.phone,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(conversations.createdAt))
    .limit(limit);

  let results = await query.all();

  // Filter in JS since drizzle SQLite has limited dynamic where
  if (platform) {
    results = results.filter((r) => r.platform === platform);
  }
  if (contactId) {
    results = results.filter((r) => r.contactId === contactId);
  }

  return NextResponse.json({ success: true, conversations: results });
}

// POST /api/meta/conversations — Log a single conversation manually
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      contactId,
      platform = "whatsapp",
      direction = "outbound",
      message,
      messageType = "text",
    } = body;

    if (!message) {
      return NextResponse.json(
        { success: false, error: "message is required" },
        { status: 400 }
      );
    }

    const newConvo = await db
      .insert(conversations)
      .values({
        contactId: contactId || null,
        platform,
        direction,
        message,
        messageType,
        status: direction === "outbound" ? "sent" : "delivered",
      })
      .returning()
      .get();

    // Update contact conversation count
    if (contactId) {
      const contact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, contactId))
        .get();
      if (contact) {
        await db.update(contacts)
          .set({
            conversationCount: (contact.conversationCount || 0) + 1,
            lastConversationAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(contacts.id, contactId))
          .run();
      }
    }

    return NextResponse.json({ success: true, conversation: newConvo });
  } catch {
    return NextResponse.json(
      { success: false, error: "Error logging conversation" },
      { status: 500 }
    );
  }
}
