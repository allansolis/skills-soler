import { db } from "@/db";
import { conversations, contacts } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { ConversationsView } from "@/components/conversations/ConversationsView";
import { getBusinessFromCookies, BUSINESS_LABELS } from "@/lib/getBusinessFromCookies";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const business = await getBusinessFromCookies();
  const bizLabel = BUSINESS_LABELS[business];

  // Filtrar conversaciones por business. Aceptar tambien las conversaciones
  // cuyo contacto pertenezca al business (legacy: conversations sin columna business)
  const allConversations = await db
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
      contactBusiness: contacts.business,
      conversationBusiness: conversations.business,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .orderBy(desc(conversations.createdAt))
    .limit(500)
    .all();

  // Filtrar en memoria para cubrir el caso legacy donde conversations.business es null
  // pero el contacto si tiene business asignado.
  const filtered = allConversations.filter((c) => {
    if (c.conversationBusiness) return c.conversationBusiness === business;
    if (c.contactBusiness) return c.contactBusiness === business;
    return false;
  });

  const allContacts = await db
    .select()
    .from(contacts)
    .where(eq(contacts.business, business))
    .all();

  const platformStats = {
    whatsapp: filtered.filter((c) => c.platform === "whatsapp").length,
    instagram: filtered.filter((c) => c.platform === "instagram").length,
    facebook: filtered.filter((c) => c.platform === "facebook").length,
    messenger: filtered.filter((c) => c.platform === "messenger").length,
  };

  const contactsWithWA = allContacts.filter((c) => c.whatsappPhone).length;
  const contactsWithIG = allContacts.filter((c) => c.instagramHandle).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Conversaciones Meta{" "}
          <span style={{ color: bizLabel.color }}>
            {bizLabel.emoji} {bizLabel.name}
          </span>
        </h1>
        <p className="text-sm text-muted-foreground">
          Historial de mensajes de WhatsApp, Instagram y Facebook · solo de esta marca ({filtered.length} mensajes)
        </p>
      </div>

      <ConversationsView
        conversations={filtered}
        platformStats={platformStats}
        contactsWithWA={contactsWithWA}
        contactsWithIG={contactsWithIG}
      />
    </div>
  );
}
