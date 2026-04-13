import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { executiveReports } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// Agent 10: Executive Report - stores daily executive reports
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const meta = body.metaAds || {};
    const zolutium = body.zolutium || {};
    const reportDate = body.date || new Date().toISOString().split("T")[0];

    // Check if report for today already exists
    const existing = db
      .select()
      .from(executiveReports)
      .where(eq(executiveReports.reportDate, reportDate))
      .all();

    if (existing.length > 0) {
      // Update existing report
      db.update(executiveReports)
        .set({
          metaSpend: Math.round(meta.spend_CRC || 0),
          metaImpressions: meta.impressions || 0,
          metaReach: meta.reach || 0,
          metaClicks: meta.clicks || 0,
          metaCtr: String(meta.ctr_pct || 0),
          metaCpc: String(meta.cpc_CRC || 0),
          metaMessages: meta.messages || 0,
          metaCostPerMsg: String(meta.costPerMessage_CRC || "N/A"),
          totalContacts: zolutium.totalContacts || 0,
          totalConversations: zolutium.totalConversations || 0,
          activeCampaigns: meta.activeCampaigns || 0,
          campaignDetails: JSON.stringify(meta.campaignDetails || []),
          recommendations: JSON.stringify(body.recommendations || []),
          alerts: JSON.stringify(body.alerts || []),
        })
        .where(eq(executiveReports.id, existing[0].id))
        .run();

      return NextResponse.json({
        success: true,
        action: "updated",
        reportId: existing[0].id,
        date: reportDate,
      });
    }

    // Create new report
    const result = db
      .insert(executiveReports)
      .values({
        reportDate,
        metaSpend: Math.round(meta.spend_CRC || 0),
        metaImpressions: meta.impressions || 0,
        metaReach: meta.reach || 0,
        metaClicks: meta.clicks || 0,
        metaCtr: String(meta.ctr_pct || 0),
        metaCpc: String(meta.cpc_CRC || 0),
        metaMessages: meta.messages || 0,
        metaCostPerMsg: String(meta.costPerMessage_CRC || "N/A"),
        totalContacts: zolutium.totalContacts || 0,
        totalConversations: zolutium.totalConversations || 0,
        activeCampaigns: meta.activeCampaigns || 0,
        campaignDetails: JSON.stringify(meta.campaignDetails || []),
        recommendations: JSON.stringify(body.recommendations || []),
        alerts: JSON.stringify(body.alerts || []),
      })
      .run();

    return NextResponse.json({
      success: true,
      action: "created",
      date: reportDate,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error guardando reporte", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Returns latest reports
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "7");

  const reports = db
    .select()
    .from(executiveReports)
    .orderBy(desc(executiveReports.reportDate))
    .limit(limit)
    .all();

  // Parse JSON fields for the response
  const parsed = reports.map((r) => ({
    ...r,
    campaignDetails: r.campaignDetails ? JSON.parse(r.campaignDetails) : [],
    recommendations: r.recommendations ? JSON.parse(r.recommendations) : [],
    alerts: r.alerts ? JSON.parse(r.alerts) : [],
  }));

  // Calculate trends if we have multiple days
  let trend = null;
  if (parsed.length >= 2) {
    const today = parsed[0];
    const yesterday = parsed[1];
    trend = {
      spendChange: today.metaSpend && yesterday.metaSpend
        ? ((today.metaSpend - yesterday.metaSpend) / (yesterday.metaSpend || 1) * 100).toFixed(1) + "%"
        : "N/A",
      messageChange: today.metaMessages && yesterday.metaMessages
        ? ((today.metaMessages - yesterday.metaMessages) / (yesterday.metaMessages || 1) * 100).toFixed(1) + "%"
        : "N/A",
    };
  }

  return NextResponse.json({
    reports: parsed,
    trend,
    lastUpdated: reports[0]?.createdAt || null,
  });
}
