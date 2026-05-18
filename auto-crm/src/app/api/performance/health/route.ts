// API route: ping concurrente a los 4 bots Elena para system health
// GET /api/performance/health
// Returns: { bots: [{ business, name, port, status, response_ms, last_msg_time, error? }] }

import { NextResponse } from "next/server";

const BOT_PORTS: Record<string, number> = {
  esmeraldas_soler: 5000,
  glass_soler: 5001,
  autos_soler: 5002,
  inversiones_soler: 5003,
};

const BUSINESS_NAMES: Record<string, string> = {
  glass_soler: "Glass Soler",
  esmeraldas_soler: "Esmeraldas Soler",
  autos_soler: "Autos Soler",
  inversiones_soler: "Inversiones Soler",
};

const BUSINESS_EMOJIS: Record<string, string> = {
  glass_soler: "🪟",
  esmeraldas_soler: "💎",
  autos_soler: "🚗",
  inversiones_soler: "📈",
};

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

interface BotHealth {
  business: string;
  name: string;
  emoji: string;
  port: number;
  status: "UP" | "DOWN";
  response_ms: number | null;
  last_msg_time: string | null;
  error: string | null;
}

async function pingBot(business: string, port: number): Promise<BotHealth> {
  const name = BUSINESS_NAMES[business] || business;
  const emoji = BUSINESS_EMOJIS[business] || "🤖";
  const start = performance.now();

  try {
    const res = await fetch(`http://localhost:${port}/`, {
      headers: { "X-Webhook-Secret": WEBHOOK_SECRET },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    const elapsed = Math.round(performance.now() - start);

    if (!res.ok) {
      return {
        business,
        name,
        emoji,
        port,
        status: "DOWN",
        response_ms: elapsed,
        last_msg_time: null,
        error: `HTTP ${res.status}`,
      };
    }

    // Try to read body — bots may return JSON or text on /
    let lastMsg: string | null = null;
    try {
      const txt = await res.text();
      try {
        const j = JSON.parse(txt);
        lastMsg =
          j?.last_activity ||
          j?.last_msg_time ||
          j?.last_message_at ||
          j?.timestamp ||
          null;
      } catch {
        // body is plain text — leave lastMsg null
      }
    } catch {
      // ignore body read errors
    }

    return {
      business,
      name,
      emoji,
      port,
      status: "UP",
      response_ms: elapsed,
      last_msg_time: lastMsg,
      error: null,
    };
  } catch (err) {
    const elapsed = Math.round(performance.now() - start);
    return {
      business,
      name,
      emoji,
      port,
      status: "DOWN",
      response_ms: elapsed,
      last_msg_time: null,
      error: String((err as Error)?.message || err),
    };
  }
}

export async function GET() {
  const entries = Object.entries(BOT_PORTS);
  const bots = await Promise.all(
    entries.map(([business, port]) => pingBot(business, port))
  );

  return NextResponse.json({
    bots,
    checked_at: new Date().toISOString(),
  });
}
