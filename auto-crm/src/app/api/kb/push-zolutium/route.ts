import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { kbInsights } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// Zolutium config
const ZOLUTIUM_API = "https://services.leadconnectorhq.com";
const ZOLUTIUM_TOKEN = "pit-0ea1a634-e80f-4f37-8949-798f99cb3eb3";
const LOCATION_ID = "CzqwqD6eS1JrCHQxdvy2";

// Custom Value IDs and names in Zolutium
const CV_MAP: Record<string, { id: string; name: string }> = {
  kb_faqs: { id: "BYn2zL5bXmddcliddAm2", name: "kb_faqs" },
  kb_objections: { id: "fyZZFhEG23Yp5MhWoJFA", name: "kb_objections" },
  kb_product_tips: { id: "XIJoyEkqmgViIcf1BBV9", name: "kb_product_tips" },
  kb_elena_instructions: { id: "50SeDGCzw2XZGQTRJ7yo", name: "kb_elena_instructions" },
  kb_last_update: { id: "5KSe1VtNCg5xb6C5vpcb", name: "kb_last_update" },
};

async function updateCustomValue(key: string, value: string): Promise<boolean> {
  const cv = CV_MAP[key];
  if (!cv) return false;
  try {
    const res = await fetch(
      `${ZOLUTIUM_API}/locations/${LOCATION_ID}/customValues/${cv.id}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${ZOLUTIUM_TOKEN}`,
          "Content-Type": "application/json",
          Version: "2021-07-28",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        },
        body: JSON.stringify({ name: cv.name, value }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// POST: Push latest KB insights from CRM Local to Zolutium Custom Values
// Elena reads these to improve her responses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const maxEntries = body.maxEntries || 20;

    // Fetch latest insights from DB
    const allInsights = await db
      .select()
      .from(kbInsights)
      .orderBy(desc(kbInsights.createdAt))
      .limit(100)
      .all();

    // Group by type
    const faqs = allInsights
      .filter((i) => i.type === "faq")
      .slice(0, maxEntries)
      .map((i) => ({
        q: i.question || "",
        a: i.answer || "",
        category: i.category,
      }));

    const objections = allInsights
      .filter((i) => i.type === "objection")
      .slice(0, maxEntries)
      .map((i) => ({
        objection: i.question || "",
        response: i.answer || "",
        category: i.category,
      }));

    const trends = allInsights
      .filter((i) => i.type === "trend")
      .slice(0, 10)
      .map((i) => ({
        trend: i.question || "",
        detail: i.answer || "",
      }));

    const improvements = allInsights
      .filter((i) => i.type === "improvement")
      .slice(0, 10)
      .map((i) => ({
        area: i.question || i.category,
        suggestion: i.answer || "",
      }));

    // Build Elena instructions from all insights
    const elenaInstructions = buildElenaInstructions(faqs, objections, trends, improvements);

    // Push to Zolutium Custom Values
    const results = {
      faqs: await updateCustomValue("kb_faqs", JSON.stringify(faqs)),
      objections: await updateCustomValue("kb_objections", JSON.stringify(objections)),
      productTips: await updateCustomValue(
        "kb_product_tips",
        JSON.stringify({ trends, improvements })
      ),
      elenaInstructions: await updateCustomValue(
        "kb_elena_instructions",
        elenaInstructions
      ),
      lastUpdate: await updateCustomValue(
        "kb_last_update",
        JSON.stringify({
          date: new Date().toISOString(),
          faqs_count: faqs.length,
          objections_count: objections.length,
          trends_count: trends.length,
          improvements_count: improvements.length,
          source: "CRM Local - KB Push",
        })
      ),
    };

    // Mark insights as applied to Zolutium
    const insightIds = allInsights
      .filter((i) => !i.appliedToZolutium)
      .map((i) => i.id);

    for (const id of insightIds) {
      await db.update(kbInsights)
        .set({ appliedToZolutium: true })
        .where(eq(kbInsights.id, id))
        .run();
    }

    return NextResponse.json({
      success: true,
      pushed: {
        faqs: faqs.length,
        objections: objections.length,
        trends: trends.length,
        improvements: improvements.length,
      },
      zolutiumResults: results,
      markedAsApplied: insightIds.length,
      pushedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Error pushing KB to Zolutium", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: Check sync status
export async function GET() {
  const total = await db.select().from(kbInsights).all();
  const applied = total.filter((i) => i.appliedToZolutium);
  const pending = total.filter((i) => !i.appliedToZolutium);

  return NextResponse.json({
    total: total.length,
    appliedToZolutium: applied.length,
    pendingSync: pending.length,
    byType: {
      faqs: total.filter((i) => i.type === "faq").length,
      objections: total.filter((i) => i.type === "objection").length,
      trends: total.filter((i) => i.type === "trend").length,
      improvements: total.filter((i) => i.type === "improvement").length,
    },
  });
}

function buildElenaInstructions(
  faqs: Array<{ q: string; a: string; category: string }>,
  objections: Array<{ objection: string; response: string; category: string }>,
  trends: Array<{ trend: string; detail: string }>,
  improvements: Array<{ area: string; suggestion: string }>
): string {
  let instructions = "=== BASE DE CONOCIMIENTO ACTUALIZADA ===\n";
  instructions += `Ultima actualizacion: ${new Date().toISOString().split("T")[0]}\n\n`;

  if (faqs.length > 0) {
    instructions += "--- PREGUNTAS FRECUENTES ---\n";
    for (const faq of faqs) {
      instructions += `P: ${faq.q}\nR: ${faq.a}\n\n`;
    }
  }

  if (objections.length > 0) {
    instructions += "--- MANEJO DE OBJECIONES ---\n";
    for (const obj of objections) {
      instructions += `Objecion: "${obj.objection}"\nRespuesta: ${obj.response}\n\n`;
    }
  }

  if (trends.length > 0) {
    instructions += "--- TENDENCIAS DE CLIENTES ---\n";
    for (const t of trends) {
      instructions += `- ${t.trend}: ${t.detail}\n`;
    }
    instructions += "\n";
  }

  if (improvements.length > 0) {
    instructions += "--- MEJORAS SUGERIDAS ---\n";
    for (const imp of improvements) {
      instructions += `- ${imp.area}: ${imp.suggestion}\n`;
    }
  }

  return instructions;
}
