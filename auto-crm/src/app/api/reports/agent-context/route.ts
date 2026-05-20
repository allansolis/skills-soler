import { NextResponse } from "next/server";
import { db } from "@/db";
import { executiveReports, kbInsights, inventoryItems } from "@/db/schema";
import { desc } from "drizzle-orm";

// Agent Context API: Provides full context for n8n agents to make better decisions
// Agent 10 calls this before generating its daily report
// Agent 3 calls this before optimizing campaigns
export async function GET() {
  // Last 7 reports
  const reports = await db
    .select()
    .from(executiveReports)
    .orderBy(desc(executiveReports.reportDate))
    .limit(7)
    .all();

  // Latest KB insights
  const insights = await db
    .select()
    .from(kbInsights)
    .orderBy(desc(kbInsights.createdAt))
    .limit(30)
    .all();

  // Inventory state
  const inventory = await db.select().from(inventoryItems).all();

  // Calculate performance trends
  const perfTrends = calculateTrends(reports);

  // Aggregate recommendations from past reports
  const pastRecs: string[] = [];
  const pastAlerts: string[] = [];
  for (const r of reports) {
    try {
      if (r.recommendations) pastRecs.push(...JSON.parse(r.recommendations));
      if (r.alerts) pastAlerts.push(...JSON.parse(r.alerts));
    } catch { /* skip */ }
  }

  // Top questions customers ask (for Elena)
  const topFaqs = insights
    .filter((i) => i.type === "faq")
    .map((i) => ({ question: i.question, answer: i.answer, category: i.category }));

  // Common objections
  const topObjections = insights
    .filter((i) => i.type === "objection")
    .map((i) => ({ objection: i.question, response: i.answer }));

  // Product demand signals
  const productDemand = inventory
    .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))
    .map((p) => ({
      name: p.name,
      retailerId: p.retailerId,
      mentions: p.mentionCount,
      category: p.category,
      availability: p.availability,
      price: p.price,
    }));

  // Build agent context
  const context = {
    generatedAt: new Date().toISOString(),
    purpose: "Contexto para agentes de n8n - usar como retrospectiva para mejora continua",

    // Performance summary
    performance: {
      last7Days: perfTrends,
      latestReport: reports[0]
        ? {
            date: reports[0].reportDate,
            spend: reports[0].metaSpend,
            messages: reports[0].metaMessages,
            costPerMsg: reports[0].metaCostPerMsg,
            ctr: reports[0].metaCtr,
          }
        : null,
      historicalReports: reports.length,
    },

    // What worked and what didn't
    learnings: {
      recurringRecommendations: deduplicateAndRank(pastRecs),
      recurringAlerts: deduplicateAndRank(pastAlerts),
      totalRecommendations: pastRecs.length,
      totalAlerts: pastAlerts.length,
    },

    // Customer intelligence
    customerIntelligence: {
      topFaqs: topFaqs.slice(0, 10),
      topObjections: topObjections.slice(0, 5),
      totalInsights: insights.length,
    },

    // Product intelligence
    productIntelligence: {
      totalProducts: inventory.length,
      inStock: inventory.filter((i) => i.availability === "in stock").length,
      topDemand: productDemand.slice(0, 5),
      lowDemand: productDemand.filter((p) => (p.mentions || 0) === 0),
    },

    // Instructions for agents
    agentInstructions: {
      agent3_optimizer:
        "Usa las tendencias de rendimiento para decidir que campanas escalar/pausar. " +
        "Si cost/msg sube de 100 CRC, pausar. Si baja de 50 CRC, escalar budget.",
      agent7_kb_updater:
        "Analiza conversaciones nuevas y genera FAQs/objeciones. " +
        "Despues de guardar en CRM, llama POST /api/kb/push-zolutium para actualizar Elena.",
      agent10_reporter:
        "Compara metricas de hoy vs tendencias de 7 dias. " +
        "Genera alertas si hay desviaciones >20%. Incluye recomendaciones accionables.",
    },
  };

  return NextResponse.json(context);
}

function calculateTrends(
  reports: Array<{
    metaSpend: number | null;
    metaMessages: number | null;
    metaCtr: string | null;
    metaCostPerMsg: string | null;
  }>
) {
  if (reports.length === 0) {
    return { avgSpend: 0, avgMessages: 0, avgCtr: "0", avgCostPerMsg: "0", trend: "sin datos" };
  }

  const avgSpend = Math.round(
    reports.reduce((s, r) => s + (r.metaSpend || 0), 0) / reports.length
  );
  const avgMessages = Math.round(
    reports.reduce((s, r) => s + (r.metaMessages || 0), 0) / reports.length
  );
  const avgCtr = (
    reports.reduce((s, r) => s + parseFloat(r.metaCtr || "0"), 0) / reports.length
  ).toFixed(2);
  const avgCostPerMsg =
    avgMessages > 0
      ? Math.round(
          reports.reduce((s, r) => s + (r.metaSpend || 0), 0) /
            reports.reduce((s, r) => s + (r.metaMessages || 0), 0)
        )
      : 0;

  // Trend direction
  const mid = Math.ceil(reports.length / 2);
  const recentMsgs = reports.slice(0, mid).reduce((s, r) => s + (r.metaMessages || 0), 0);
  const olderMsgs = reports.slice(mid).reduce((s, r) => s + (r.metaMessages || 0), 0);
  const trend = olderMsgs > 0 ? ((recentMsgs - olderMsgs) / olderMsgs * 100).toFixed(1) : "0";

  return {
    avgSpend,
    avgMessages,
    avgCtr: avgCtr + "%",
    avgCostPerMsg,
    messageTrend: trend + "%",
    direction: parseFloat(trend) > 0 ? "mejorando" : "declinando",
  };
}

function deduplicateAndRank(items: string[]): Array<{ text: string; frequency: number }> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = String(item).toLowerCase().trim();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([text, frequency]) => ({ text, frequency }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 10);
}
