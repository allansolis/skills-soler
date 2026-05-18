// API route: agrega hot leads de los 4 bots Elena
// GET /api/leads?business=glass_soler|esmeraldas_soler|autos_soler|inversiones_soler|all
//
// Llama a cada bot via HTTP (puertos 5000-5003) y agrega los leads.

import { NextRequest, NextResponse } from "next/server";

const BOT_PORTS: Record<string, number> = {
  esmeraldas_soler: 5000,
  glass_soler: 5001,
  autos_soler: 5002,
  inversiones_soler: 5003,
};

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

async function fetchBotLeads(port: number, endpoint: string) {
  try {
    const res = await fetch(`http://localhost:${port}${endpoint}`, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      // Avoid Next caching for live data
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const business = request.nextUrl.searchParams.get("business") || "all";
  const view = request.nextUrl.searchParams.get("view") || "hot"; // hot | handoffs | stats

  const endpoint =
    view === "stats"
      ? "/leads/stats"
      : view === "handoffs"
      ? "/leads/handoffs"
      : "/leads/hot";

  if (business === "all") {
    const results = await Promise.all(
      Object.entries(BOT_PORTS).map(async ([biz, port]) => {
        const data = await fetchBotLeads(port, endpoint);
        return { business: biz, port, data };
      })
    );

    // Agregate
    let aggregated: any[] = [];
    let totalStats: Record<string, any> = {};

    for (const r of results) {
      if (!r.data) continue;
      if (view === "stats") {
        totalStats[r.business] = r.data;
      } else {
        const leads = r.data.leads || r.data.handoffs || [];
        aggregated = [...aggregated, ...leads];
      }
    }

    if (view === "stats") {
      return NextResponse.json({ view, stats: totalStats });
    }

    aggregated.sort((a, b) => (b.score || 0) - (a.score || 0));

    return NextResponse.json({
      view,
      count: aggregated.length,
      leads: aggregated,
    });
  }

  // Single business
  const port = BOT_PORTS[business];
  if (!port) {
    return NextResponse.json({ error: "Business inválido" }, { status: 400 });
  }

  const data = await fetchBotLeads(port, endpoint);
  if (!data) {
    return NextResponse.json(
      { error: `Bot ${business} :${port} no responde` },
      { status: 502 }
    );
  }

  return NextResponse.json({ view, business, ...data });
}
