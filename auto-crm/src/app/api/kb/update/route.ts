import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kbInsights } from "@/db/schema";
import { desc } from "drizzle-orm";

// Agent 7: KB Updater - receives AI analysis of conversations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries = body.kbEntries || [];
    const fullAnalysis = body.fullAnalysis || {};

    const stats = { faqs: 0, objections: 0, trends: 0, improvements: 0 };

    // Store individual KB entries
    for (const entry of entries) {
      await db.insert(kbInsights)
        .values({
          type: entry.type || "faq",
          category: entry.category || "ventas",
          question: entry.question || entry.objection || null,
          answer: entry.answer || entry.response || null,
          content: JSON.stringify(entry),
          source: body.source || "Agent 7 - KB Updater",
        })
        .run();

      if (entry.type === "faq") stats.faqs++;
      else if (entry.type === "objection") stats.objections++;
      else if (entry.type === "trend") stats.trends++;
      else stats.improvements++;
    }

    // Store full analysis as a summary entry
    if (fullAnalysis && Object.keys(fullAnalysis).length > 0) {
      await db.insert(kbInsights)
        .values({
          type: "analysis_summary",
          category: "sistema",
          content: JSON.stringify(fullAnalysis),
          source: body.source || "Agent 7 - KB Updater",
        })
        .run();
    }

    return NextResponse.json({
      success: true,
      stats,
      totalEntries: entries.length,
      savedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error guardando KB insights", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Returns latest KB insights
export async function GET() {
  const insights = await db
    .select()
    .from(kbInsights)
    .orderBy(desc(kbInsights.createdAt))
    .limit(50)
    .all();

  const byType = {
    faqs: insights.filter((i) => i.type === "faq"),
    objections: insights.filter((i) => i.type === "objection"),
    trends: insights.filter((i) => i.type === "trend"),
    improvements: insights.filter((i) => i.type === "improvement"),
    summaries: insights.filter((i) => i.type === "analysis_summary"),
  };

  return NextResponse.json({
    total: insights.length,
    byType,
    lastUpdated: insights[0]?.createdAt || null,
  });
}
