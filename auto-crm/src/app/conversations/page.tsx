import { db } from "@/db";
import { conversations, contacts } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { ConversationsView } from "@/components/conversations/ConversationsView";

export const dynamic = "force-dynamic";

export default function ConversationsPage() {
  const allConversations = db
    .select({
      id: conversations.id,
      contactId: conversations.contactId,
      platform: conversations.platform,
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
    .limit(200)
    .all();

  const allContacts = db.select().from(contacts).all();

  const platformStats = {
    whatsapp: allConversations.filter((c) => c.platform === "whatsapp").length,
    instagram: allConversations.filter((c) => c.platform === "instagram").length,
    facebook: allConversations.filter((c) => c.platform === "facebook").length,
    messenger: allConversations.filter((c) => c.platform === "messenger").length,
  };

  const contactsWithWA = allContacts.filter((c) => c.whatsappPhone).length;
  const contactsWithIG = allContacts.filter((c) => c.instagramHandle).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conversaciones Meta</h1>
        <p className="text-sm text-muted-foreground">
          Historial de mensajes de WhatsApp, Instagram y Facebook
        </p>
      </div>

      <ConversationsView
        conversations={allConversations}
        platformStats={platformStats}
        contactsWithWA={contactsWithWA}
        contactsWithIG={contactsWithIG}
      />
    </div>
  );
}
