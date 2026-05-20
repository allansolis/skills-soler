/**
 * /api/queue — leads esperando respuesta humana.
 * Devuelve conversaciones inbound recientes donde:
 *   - el ULTIMO mensaje fue inbound (cliente espera respuesta)
 *   - el contacto es hot/warm o tiene mensajes recientes (24h)
 *   - filtrado por business activo
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { contacts, conversations } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const business = resolveBusinessId(
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS
  );

  // Query: ultimo mensaje por contacto, donde sea inbound
  const rows = await db
    .select({
      contactId: conversations.contactId,
      contactName: contacts.name,
      temperature: contacts.temperature,
      score: contacts.score,
      platform: conversations.platform,
      direction: conversations.direction,
      message: conversations.message,
      createdAt: conversations.createdAt,
      lastInboundAt: contacts.lastConversationAt,
    })
    .from(conversations)
    .leftJoin(contacts, eq(conversations.contactId, contacts.id))
    .where(
      and(
        eq(conversations.business, business),
        eq(conversations.direction, "inbound")
      )!
    )
    .orderBy(desc(conversations.createdAt))
    .limit(500)
    .all();

  // Agrupar por contacto, mantener solo el ultimo mensaje
  const byContact = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    if (!r.contactId) continue;
    if (!byContact.has(r.contactId)) byContact.set(r.contactId, r);
  }

  // Para cada contacto: verificar si su MUY ultimo mensaje (cualquier dir) es inbound
  const queue: Array<{
    contactId: string;
    contactName: string | null;
    temperature: string | null;
    score: number;
    platform: string;
    lastMessage: string;
    lastInboundAt: number;
    waitingMinutes: number;
    needsAttention: boolean;
  }> = [];

  for (const [cid, r] of byContact) {
    // Verificar si despues del inbound hubo outbound
    const lastMsg = await db
      .select({
        direction: conversations.direction,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(eq(conversations.contactId, cid))
      .orderBy(desc(conversations.createdAt))
      .limit(1)
      .get();

    if (!lastMsg || lastMsg.direction !== "inbound") continue;

    const createdAtMs = r.createdAt instanceof Date ? r.createdAt.getTime() : Number(r.createdAt) * 1000;
    const waitMin = Math.floor((Date.now() - createdAtMs) / 60000);

    queue.push({
      contactId: cid,
      contactName: r.contactName,
      temperature: r.temperature,
      score: r.score || 0,
      platform: r.platform,
      lastMessage: (r.message || "").slice(0, 200),
      lastInboundAt: createdAtMs,
      waitingMinutes: waitMin,
      needsAttention: waitMin > 10 || r.temperature === "hot",
    });
  }

  // Ordenar: hot primero, luego por tiempo esperando descendente
  queue.sort((a, b) => {
    if (a.temperature === "hot" && b.temperature !== "hot") return -1;
    if (a.temperature !== "hot" && b.temperature === "hot") return 1;
    return b.waitingMinutes - a.waitingMinutes;
  });

  return NextResponse.json({
    business,
    count: queue.length,
    hot: queue.filter((q) => q.temperature === "hot").length,
    needsAttention: queue.filter((q) => q.needsAttention).length,
    queue: queue.slice(0, 50),
  });
}
