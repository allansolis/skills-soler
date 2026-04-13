import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, deals, pipelineStages, activities } from "@/db/schema";
import { eq } from "drizzle-orm";

// Agent 9: CRM Sync Bidireccional - receives enriched contacts from n8n/Zolutium
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const incoming = Array.isArray(body) ? body : body.contacts ? [body.contacts].flat() : [body];

    const stats = { created: 0, updated: 0, dealsCreated: 0, errors: 0 };

    // Get pipeline stages for mapping
    const stages = db.select().from(pipelineStages).all();
    const stageMap: Record<string, string> = {};
    for (const s of stages) {
      const nameLower = s.name.toLowerCase();
      if (nameLower.includes("prospecto")) stageMap["new"] = s.id;
      if (nameLower.includes("prospecto")) stageMap["lead_organic"] = s.id;
      if (nameLower.includes("prospecto")) stageMap["lead_meta"] = s.id;
      if (nameLower.includes("prospecto")) stageMap["lead_tiktok"] = s.id;
      if (nameLower.includes("contactado")) stageMap["contacted"] = s.id;
      if (nameLower.includes("propuesta")) stageMap["proposal_sent"] = s.id;
      if (nameLower.includes("propuesta")) stageMap["qualified"] = s.id;
      if (nameLower.includes("negociacion")) stageMap["negotiation"] = s.id;
      if (nameLower.includes("ganado")) stageMap["closed_won"] = s.id;
    }

    for (const contact of incoming) {
      try {
        const zId = contact.zolutiumId;
        if (!zId) continue;

        const name = contact.name || "Sin nombre";
        const existing = zId
          ? db.select().from(contacts).where(eq(contacts.zolutiumId, zId)).all()
          : [];

        if (existing.length > 0) {
          // Update existing contact
          db.update(contacts)
            .set({
              name,
              phone: contact.phone || existing[0].phone,
              email: contact.email || existing[0].email,
              source: contact.source || existing[0].source,
              temperature: contact.temperature || existing[0].temperature,
              whatsappPhone: contact.phone || existing[0].whatsappPhone,
              conversationCount: contact.conversationId ? (existing[0].conversationCount || 0) + 1 : existing[0].conversationCount,
              lastConversationAt: contact.lastMessageDate ? new Date(contact.lastMessageDate) : existing[0].lastConversationAt,
              updatedAt: new Date(),
            })
            .where(eq(contacts.id, existing[0].id))
            .run();
          stats.updated++;
        } else {
          // Create new contact
          const newId = crypto.randomUUID();
          db.insert(contacts)
            .values({
              id: newId,
              name,
              phone: contact.phone || null,
              email: contact.email || null,
              source: contact.source || "zolutium",
              temperature: contact.temperature || "cold",
              score: contact.temperature === "hot" ? 80 : contact.temperature === "warm" ? 50 : 20,
              zolutiumId: zId,
              whatsappPhone: contact.phone || null,
              preferredChannel: "whatsapp",
              updatedAt: new Date(),
            })
            .run();

          // Auto-create deal if contact has pipeline stage
          if (contact.crmStatus && stageMap[contact.crmStatus]) {
            db.insert(deals)
              .values({
                title: `Oportunidad - ${name}`,
                value: contact.monetaryValue || 0,
                stageId: stageMap[contact.crmStatus],
                contactId: newId,
                probability: contact.temperature === "hot" ? 70 : contact.temperature === "warm" ? 40 : 10,
              })
              .run();
            stats.dealsCreated++;
          }

          // Log activity
          db.insert(activities)
            .values({
              type: "sync",
              description: `Contacto sincronizado desde Zolutium (${contact.source || "auto"})`,
              contactId: newId,
            })
            .run();

          stats.created++;
        }
      } catch {
        stats.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      stats,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error en sync", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Returns sync status and last sync info
export async function GET() {
  const totalContacts = db.select().from(contacts).all().length;
  const zolutiumContacts = db
    .select()
    .from(contacts)
    .where(eq(contacts.source, "zolutium"))
    .all().length;

  return NextResponse.json({
    totalContacts,
    zolutiumContacts,
    lastCheck: new Date().toISOString(),
  });
}
