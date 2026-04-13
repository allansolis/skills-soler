import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { executiveReports, kbInsights, inventoryItems } from "@/db/schema";
import { desc, sql } from "drizzle-orm";

// Retrospective API: Aggregates past reports into actionable insights for agents
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "7");
  const format = searchParams.get("format") || "json"; // json | csv

  // Get reports for the period
  const reports = db
    .select()
    .from(executiveReports)
    .orderBy(desc(executiveReports.reportDate))
    .limit(days)
    .all();

  if (reports.length === 0) {
    return NextResponse.json({
      retrospective: null,
      message: "No hay reportes disponibles para el periodo solicitado",
    });
  }

  // Aggregate metrics
  const totalSpend = reports.reduce((sum, r) => sum + (r.metaSpend || 0), 0);
  const totalMessages = reports.reduce((sum, r) => sum + (r.metaMessages || 0), 0);
  const totalImpressions = reports.reduce((sum, r) => sum + (r.metaImpressions || 0), 0);
  const totalReach = reports.reduce((sum, r) => sum + (r.metaReach || 0), 0);
  const totalClicks = reports.reduce((sum, r) => sum + (r.metaClicks || 0), 0);
  const avgCtr = reports.filter(r => r.metaCtr).length > 0
    ? reports.reduce((sum, r) => sum + parseFloat(r.metaCtr || "0"), 0) / reports.filter(r => r.metaCtr).length
    : 0;

  // Collect all recommendations and alerts
  const allRecommendations: string[] = [];
  const allAlerts: string[] = [];
  const allCampaignDetails: Record<string, unknown>[] = [];

  for (const report of reports) {
    try {
      const recs = report.recommendations ? JSON.parse(report.recommendations) : [];
      const alerts = report.alerts ? JSON.parse(report.alerts) : [];
      const campaigns = report.campaignDetails ? JSON.parse(report.campaignDetails) : [];
      allRecommendations.push(...recs);
      allAlerts.push(...alerts);
      allCampaignDetails.push(...campaigns);
    } catch {
      // Skip malformed JSON
    }
  }

  // Get KB insights from the same period
  const kbData = db
    .select()
    .from(kbInsights)
    .orderBy(desc(kbInsights.createdAt))
    .limit(50)
    .all();

  const faqCount = kbData.filter(k => k.type === "faq").length;
  const objectionCount = kbData.filter(k => k.type === "objection").length;
  const trendCount = kbData.filter(k => k.type === "trend").length;
  const improvementCount = kbData.filter(k => k.type === "improvement").length;

  // Get inventory status
  const inventory = db.select().from(inventoryItems).all();
  const inStock = inventory.filter(i => i.availability === "in stock").length;
  const topProducts = inventory
    .sort((a, b) => (b.mentionCount || 0) - (a.mentionCount || 0))
    .slice(0, 5)
    .map(p => ({ name: p.name, mentions: p.mentionCount, category: p.category }));

  // Calculate trends
  const firstHalf = reports.slice(Math.ceil(reports.length / 2));
  const secondHalf = reports.slice(0, Math.ceil(reports.length / 2));

  const firstHalfSpend = firstHalf.reduce((s, r) => s + (r.metaSpend || 0), 0);
  const secondHalfSpend = secondHalf.reduce((s, r) => s + (r.metaSpend || 0), 0);
  const spendTrend = firstHalfSpend > 0
    ? ((secondHalfSpend - firstHalfSpend) / firstHalfSpend * 100).toFixed(1)
    : "N/A";

  const firstHalfMsgs = firstHalf.reduce((s, r) => s + (r.metaMessages || 0), 0);
  const secondHalfMsgs = secondHalf.reduce((s, r) => s + (r.metaMessages || 0), 0);
  const msgTrend = firstHalfMsgs > 0
    ? ((secondHalfMsgs - firstHalfMsgs) / firstHalfMsgs * 100).toFixed(1)
    : "N/A";

  // Deduplicate recommendations
  const uniqueRecs = [...new Set(allRecommendations)];
  const uniqueAlerts = [...new Set(allAlerts)];

  const retrospective = {
    period: {
      days,
      from: reports[reports.length - 1]?.reportDate || "N/A",
      to: reports[0]?.reportDate || "N/A",
      reportsCount: reports.length,
    },
    performance: {
      totalSpend_CRC: totalSpend,
      totalMessages: totalMessages,
      totalImpressions: totalImpressions,
      totalReach: totalReach,
      totalClicks: totalClicks,
      avgCtr: avgCtr.toFixed(2) + "%",
      avgCostPerMsg: totalMessages > 0 ? Math.round(totalSpend / totalMessages) : "N/A",
      avgDailySpend: Math.round(totalSpend / reports.length),
    },
    trends: {
      spendTrend: spendTrend + "%",
      messageTrend: msgTrend + "%",
      direction: parseFloat(String(msgTrend)) > 0 ? "mejorando" : "declinando",
    },
    knowledgeBase: {
      totalInsights: kbData.length,
      faqs: faqCount,
      objections: objectionCount,
      trends: trendCount,
      improvements: improvementCount,
    },
    inventory: {
      totalProducts: inventory.length,
      inStock,
      outOfStock: inventory.length - inStock,
      topProducts,
    },
    recommendations: uniqueRecs,
    alerts: uniqueAlerts,
    campaignInsights: allCampaignDetails.slice(0, 10),
    generatedAt: new Date().toISOString(),
  };

  if (format === "csv") {
    const csvRows = [
      "Fecha,Gasto CRC,Impresiones,Alcance,Clicks,CTR,CPC,Mensajes,Costo/Msg,Contactos,Conversaciones,Campanas Activas",
      ...reports.map(r =>
        `${r.reportDate},${r.metaSpend},${r.metaImpressions},${r.metaReach},${r.metaClicks},${r.metaCtr},${r.metaCpc},${r.metaMessages},${r.metaCostPerMsg},${r.totalContacts},${r.totalConversations},${r.activeCampaigns}`
      ),
    ].join("\n");

    return new NextResponse(csvRows, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="retrospectiva_${days}d_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  }

  return NextResponse.json({ retrospective });
}
