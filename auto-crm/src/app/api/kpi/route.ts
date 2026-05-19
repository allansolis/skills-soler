/**
 * /api/kpi — KPIs ejecutivos por business: CAC, LTV, conversion rate, ROI
 */
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { contacts, deals, pipelineStages, conversations } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const business = resolveBusinessId(
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS
  );

  // Total contacts
  const totalContacts = db
    .select({ c: sql<number>`count(*)` })
    .from(contacts)
    .where(eq(contacts.business, business))
    .get();

  // Hot leads
  const hotLeads = db
    .select({ c: sql<number>`count(*)` })
    .from(contacts)
    .where(and(eq(contacts.business, business), eq(contacts.temperature, "hot"))!)
    .get();

  // Won deals
  const stages = db.select().from(pipelineStages).all();
  const wonStageIds = stages.filter((s) => s.isWon).map((s) => s.id);

  const allDeals = db.select().from(deals).where(eq(deals.business, business)).all();
  const wonDeals = allDeals.filter((d) => wonStageIds.includes(d.stageId));
  const totalRevenue = wonDeals.reduce((s, d) => s + d.value, 0);
  const avgTicket = wonDeals.length > 0 ? totalRevenue / wonDeals.length : 0;

  // Conversion rate: won deals / total contacts
  const conversionRate = totalContacts?.c
    ? (wonDeals.length / totalContacts.c) * 100
    : 0;

  // CAC (placeholder - se calcula con datos Meta Ads via cron, aqui devolvemos null si no hay data)
  // En produccion, sync diario de spend_30d a una tabla `meta_spend_daily` y dividir.
  const cac = null;

  // Conversaciones inbound vs outbound (engagement)
  const conversationStats = db
    .select({
      direction: conversations.direction,
      c: sql<number>`count(*)`,
    })
    .from(conversations)
    .where(eq(conversations.business, business))
    .groupBy(conversations.direction)
    .all();

  const inbound = conversationStats.find((r) => r.direction === "inbound")?.c || 0;
  const outbound = conversationStats.find((r) => r.direction === "outbound")?.c || 0;

  // Response rate: % de inbound que tuvo outbound
  const responseRate = inbound > 0 ? (outbound / inbound) * 100 : 0;

  return NextResponse.json({
    business,
    contacts: totalContacts?.c || 0,
    hotLeads: hotLeads?.c || 0,
    deals: {
      total: allDeals.length,
      won: wonDeals.length,
      totalRevenue,
      avgTicket,
      conversionRate,
    },
    conversations: {
      inbound,
      outbound,
      responseRate,
    },
    cac, // null por ahora — se setea cuando hagamos sync diario
  });
}
