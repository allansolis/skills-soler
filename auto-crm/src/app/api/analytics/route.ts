// API route: agrega datos analiticos de los 4 bots Elena
// GET /api/analytics?view=trend|funnel|signals|hours|table
//
// trend  : hot leads por hora (last 24h) - 4 series
// funnel : conteo agregado por threshold (total, warm, hot, handoff)
// signals: top signals detectados en signals_history
// hours  : heatmap mensajes by day-of-week x hour-of-day last 7 days
// table  : stats por business (totales, hot, handoffs, avg_score, conv_rate)

import { NextRequest, NextResponse } from "next/server";

const BOT_PORTS: Record<string, number> = {
  esmeraldas_soler: 5000,
  glass_soler: 5001,
  autos_soler: 5002,
  inversiones_soler: 5003,
};

const BUSINESS_COLORS: Record<string, string> = {
  glass_soler: "#0EA5E9",
  esmeraldas_soler: "#10B981",
  autos_soler: "#F59E0B",
  inversiones_soler: "#8B5CF6",
};

const BUSINESS_NAMES: Record<string, string> = {
  glass_soler: "Glass",
  esmeraldas_soler: "Esmeraldas",
  autos_soler: "Autos",
  inversiones_soler: "Inversiones",
};

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

interface BotLead {
  user_id: string;
  business: string;
  score: number;
  messages_count: number;
  created_at?: string;
  last_update?: string;
  handoff_triggered?: boolean;
  handoff_at?: string;
  signals_history?: Array<{
    timestamp: string;
    delta: number;
    signals: string[];
    message_preview: string;
  }>;
}

interface BotStats {
  total_leads: number;
  hot_leads: number;
  handoffs: number;
  avg_score: number;
  avg_messages: number;
}

async function fetchBot(port: number, endpoint: string) {
  try {
    const res = await fetch(`http://localhost:${port}${endpoint}`, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Try /leads/all first (broader), fall back to /leads/hot
async function fetchAllLeads(port: number): Promise<BotLead[]> {
  const all = await fetchBot(port, "/leads/all");
  if (all?.leads) return all.leads;
  const hot = await fetchBot(port, "/leads/hot");
  if (hot?.leads) return hot.leads;
  return [];
}

function hourBucket(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  // Round down to hour, return ISO-ish "YYYY-MM-DDTHH:00"
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 13) + ":00";
}

function classifySignal(name: string): "positive" | "negative" | "neutral" {
  const positive = [
    "name_provided",
    "asking_price",
    "asking_availability",
    "asking_location",
    "asking_appointment",
    "urgency",
    "specific_product",
    "high_intent",
    "buying_signal",
    "phone_provided",
    "email_provided",
    "ready_to_buy",
  ];
  const negative = [
    "too_expensive",
    "just_browsing",
    "competitor_mention",
    "not_interested",
    "ghosting",
    "objection",
    "rejection",
  ];
  if (positive.some((p) => name.toLowerCase().includes(p))) return "positive";
  if (negative.some((n) => name.toLowerCase().includes(n))) return "negative";
  return "neutral";
}

async function buildTrend() {
  // Last 24h buckets, 4 series (one per business)
  const now = new Date();
  const buckets: string[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    d.setMinutes(0, 0, 0);
    buckets.push(d.toISOString().slice(0, 13) + ":00");
  }

  const series: Record<string, Record<string, number>> = {};
  for (const biz of Object.keys(BOT_PORTS)) {
    series[biz] = Object.fromEntries(buckets.map((b) => [b, 0]));
  }

  await Promise.all(
    Object.entries(BOT_PORTS).map(async ([biz, port]) => {
      const leads = await fetchAllLeads(port);
      for (const lead of leads) {
        // Count hot leads (score >= 70) by their last_update or handoff_at
        if ((lead.score || 0) < 70) continue;
        const stamp = lead.handoff_at || lead.last_update || lead.created_at;
        if (!stamp) continue;
        const bucket = hourBucket(stamp);
        if (bucket in series[biz]) {
          series[biz][bucket] += 1;
        }
      }
    })
  );

  // Format for recharts: [{ hour: "10:00", glass_soler: 3, esmeraldas_soler: 1, ... }, ...]
  const data = buckets.map((b) => {
    const row: Record<string, any> = {
      hour: b.slice(11, 16), // "HH:00"
      timestamp: b,
    };
    for (const biz of Object.keys(BOT_PORTS)) {
      row[biz] = series[biz][b] || 0;
    }
    return row;
  });

  return {
    data,
    series: Object.keys(BOT_PORTS).map((biz) => ({
      key: biz,
      name: BUSINESS_NAMES[biz],
      color: BUSINESS_COLORS[biz],
    })),
  };
}

async function buildFunnel() {
  // Aggregate across 4 bots: total, warm (>=30), hot (>=70), handoff
  let total = 0,
    warm = 0,
    hot = 0,
    handoff = 0;

  const results = await Promise.all(
    Object.values(BOT_PORTS).map((p) => fetchAllLeads(p))
  );

  for (const leads of results) {
    for (const lead of leads) {
      total += 1;
      const s = lead.score || 0;
      if (s >= 30) warm += 1;
      if (s >= 70) hot += 1;
      if (lead.handoff_triggered) handoff += 1;
    }
  }

  const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0);

  return {
    data: [
      { stage: "Total", count: total, color: "#94A3B8", pct: 100 },
      {
        stage: "Warm (30+)",
        count: warm,
        color: "#FACC15",
        pct: pct(warm, total),
      },
      {
        stage: "Hot (70+)",
        count: hot,
        color: "#FB923C",
        pct: pct(hot, total),
      },
      {
        stage: "Handoff",
        count: handoff,
        color: "#EF4444",
        pct: pct(handoff, total),
      },
    ],
    totals: { total, warm, hot, handoff },
  };
}

async function buildSignals() {
  const counts: Record<string, { count: number; type: string }> = {};

  const results = await Promise.all(
    Object.values(BOT_PORTS).map((p) => fetchAllLeads(p))
  );

  for (const leads of results) {
    for (const lead of leads) {
      if (!lead.signals_history) continue;
      for (const entry of lead.signals_history) {
        for (const sig of entry.signals || []) {
          if (!counts[sig]) {
            counts[sig] = { count: 0, type: classifySignal(sig) };
          }
          counts[sig].count += 1;
        }
      }
    }
  }

  const TYPE_COLOR: Record<string, string> = {
    positive: "#10B981",
    negative: "#EF4444",
    neutral: "#94A3B8",
  };

  const top = Object.entries(counts)
    .map(([name, { count, type }]) => ({
      name,
      count,
      type,
      color: TYPE_COLOR[type],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { data: top };
}

async function buildHours() {
  // 7 days x 24 hours grid, count messages by day_of_week & hour_of_day
  // Use signals_history timestamps as proxy for message events (each entry = 1 user msg that scored)
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const cutoff = Date.now() - 7 * 24 * 3600_000;

  const results = await Promise.all(
    Object.values(BOT_PORTS).map((p) => fetchAllLeads(p))
  );

  for (const leads of results) {
    for (const lead of leads) {
      if (!lead.signals_history) continue;
      for (const entry of lead.signals_history) {
        const t = new Date(entry.timestamp).getTime();
        if (isNaN(t) || t < cutoff) continue;
        const d = new Date(t);
        const dow = d.getDay(); // 0=Sun
        const hr = d.getHours();
        grid[dow][hr] += 1;
      }
    }
  }

  // Flatten with max for intensity scale
  let max = 0;
  for (const row of grid) for (const v of row) if (v > max) max = v;

  return {
    grid,
    max,
    days: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
    hours: Array.from({ length: 24 }, (_, i) => i),
  };
}

async function buildTable() {
  // Per business: total, hot, handoffs, avg_score, conv_rate
  const results = await Promise.all(
    Object.entries(BOT_PORTS).map(async ([biz, port]) => {
      const stats = (await fetchBot(port, "/leads/stats")) as BotStats | null;
      return { biz, stats };
    })
  );

  const rows = results.map(({ biz, stats }) => {
    const total = stats?.total_leads || 0;
    const hot = stats?.hot_leads || 0;
    const handoffs = stats?.handoffs || 0;
    const avgScore = stats?.avg_score || 0;
    const convRate = total > 0 ? Math.round((handoffs / total) * 10000) / 100 : 0;
    return {
      business: biz,
      name: BUSINESS_NAMES[biz],
      color: BUSINESS_COLORS[biz],
      total,
      hot,
      handoffs,
      avg_score: Math.round(avgScore * 100) / 100,
      conv_rate: convRate,
    };
  });

  const totals = rows.reduce(
    (acc, r) => {
      acc.total += r.total;
      acc.hot += r.hot;
      acc.handoffs += r.handoffs;
      acc.avg_score_sum += r.avg_score;
      return acc;
    },
    { total: 0, hot: 0, handoffs: 0, avg_score_sum: 0 }
  );

  const footer = {
    business: "all",
    name: "Total",
    color: "#64748B",
    total: totals.total,
    hot: totals.hot,
    handoffs: totals.handoffs,
    avg_score:
      rows.length > 0
        ? Math.round((totals.avg_score_sum / rows.length) * 100) / 100
        : 0,
    conv_rate:
      totals.total > 0
        ? Math.round((totals.handoffs / totals.total) * 10000) / 100
        : 0,
  };

  return { rows, footer };
}

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") || "table";

  try {
    switch (view) {
      case "trend": {
        const payload = await buildTrend();
        return NextResponse.json({ view, ...payload });
      }
      case "funnel": {
        const payload = await buildFunnel();
        return NextResponse.json({ view, ...payload });
      }
      case "signals": {
        const payload = await buildSignals();
        return NextResponse.json({ view, ...payload });
      }
      case "hours": {
        const payload = await buildHours();
        return NextResponse.json({ view, ...payload });
      }
      case "table": {
        const payload = await buildTable();
        return NextResponse.json({ view, ...payload });
      }
      default:
        return NextResponse.json({ error: "view inválido" }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      { error: String(err), view },
      { status: 500 }
    );
  }
}
