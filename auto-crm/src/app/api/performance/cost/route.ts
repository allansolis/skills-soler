// API route: Cost Tracking
// GET /api/performance/cost
// Estimates Anthropic API spend for the last 7 days using simple heuristics:
//   user messages -> input tokens (avg 200 each)
//   assistant messages -> output tokens (avg 300 each)
// Two scenarios computed:
//   "with_router_usd"    -> 40% routed to Haiku, 60% to Sonnet
//   "without_router_usd" -> 100% Sonnet (baseline pricing)
// Savings = without - with.

import { NextResponse } from "next/server";
import {
  openBotDb,
  botDbExists,
  BOT_BUSINESSES,
  BUSINESS_NAMES,
  BUSINESS_COLORS,
  TOKEN_PRICING,
  AVG_TOKENS,
  ROUTER_SPLIT,
} from "@/lib/botSqlite";

interface CostBreakdown {
  business: string;
  name: string;
  color: string;
  message_count: number;
  user_messages: number;
  assistant_messages: number;
  input_tokens: number;
  output_tokens: number;
  with_router_usd: number;
  without_router_usd: number;
  savings_usd: number;
  savings_pct: number;
}

function round(n: number, places = 4): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

function computeCost(
  userMessages: number,
  assistantMessages: number
): {
  with_router_usd: number;
  without_router_usd: number;
} {
  const inputTokens = userMessages * AVG_TOKENS.per_user_msg_input;
  const outputTokens =
    assistantMessages * AVG_TOKENS.per_assistant_msg_output;

  // Without router: 100% Sonnet
  const without =
    (inputTokens / 1_000_000) * TOKEN_PRICING.sonnet.input_per_1m +
    (outputTokens / 1_000_000) * TOKEN_PRICING.sonnet.output_per_1m;

  // With router: 40% Haiku, 60% Sonnet (applied to both input + output)
  const haikuInput =
    (inputTokens * ROUTER_SPLIT.haiku_pct) / 1_000_000;
  const sonnetInput =
    (inputTokens * ROUTER_SPLIT.sonnet_pct) / 1_000_000;
  const haikuOutput =
    (outputTokens * ROUTER_SPLIT.haiku_pct) / 1_000_000;
  const sonnetOutput =
    (outputTokens * ROUTER_SPLIT.sonnet_pct) / 1_000_000;

  const withRouter =
    haikuInput * TOKEN_PRICING.haiku.input_per_1m +
    sonnetInput * TOKEN_PRICING.sonnet.input_per_1m +
    haikuOutput * TOKEN_PRICING.haiku.output_per_1m +
    sonnetOutput * TOKEN_PRICING.sonnet.output_per_1m;

  return { with_router_usd: withRouter, without_router_usd: without };
}

export async function GET() {
  if (!botDbExists()) {
    return NextResponse.json({
      breakdown: [],
      totals: zeroTotals(),
      empty: true,
      message: "SQLite no accesible — verifica BOT_DB_PATH",
    });
  }

  const db = openBotDb();
  if (!db) {
    return NextResponse.json({
      breakdown: [],
      totals: zeroTotals(),
      empty: true,
      message: "No se pudo abrir conversations.db",
    });
  }

  type CountRow = { business: string; role: string; n: number };
  let counts: CountRow[] = [];
  try {
    counts = db
      .prepare(
        `SELECT business, role, COUNT(*) AS n
         FROM conversations
         WHERE timestamp > datetime('now', '-7 days')
         GROUP BY business, role`
      )
      .all() as CountRow[];
  } catch (err) {
    db.close();
    return NextResponse.json({
      breakdown: [],
      totals: zeroTotals(),
      empty: true,
      message: `Error consultando SQLite: ${String(err)}`,
    });
  }
  db.close();

  // Index by business
  const byBusiness: Record<
    string,
    { user: number; assistant: number; total: number }
  > = {};
  for (const biz of BOT_BUSINESSES) {
    byBusiness[biz] = { user: 0, assistant: 0, total: 0 };
  }
  for (const r of counts) {
    if (!byBusiness[r.business]) {
      byBusiness[r.business] = { user: 0, assistant: 0, total: 0 };
    }
    if (r.role === "user") byBusiness[r.business].user += r.n;
    if (r.role === "assistant") byBusiness[r.business].assistant += r.n;
    byBusiness[r.business].total += r.n;
  }

  // Build per-business breakdown
  const breakdown: CostBreakdown[] = Object.entries(byBusiness)
    .filter(([biz]) => BOT_BUSINESSES.includes(biz as (typeof BOT_BUSINESSES)[number]))
    .map(([biz, c]) => {
      const cost = computeCost(c.user, c.assistant);
      const savings = cost.without_router_usd - cost.with_router_usd;
      const savingsPct =
        cost.without_router_usd > 0
          ? (savings / cost.without_router_usd) * 100
          : 0;
      return {
        business: biz,
        name: BUSINESS_NAMES[biz] || biz,
        color: BUSINESS_COLORS[biz] || "#94A3B8",
        message_count: c.total,
        user_messages: c.user,
        assistant_messages: c.assistant,
        input_tokens: c.user * AVG_TOKENS.per_user_msg_input,
        output_tokens: c.assistant * AVG_TOKENS.per_assistant_msg_output,
        with_router_usd: round(cost.with_router_usd),
        without_router_usd: round(cost.without_router_usd),
        savings_usd: round(savings),
        savings_pct: round(savingsPct, 2),
      };
    });

  // Totals across all bots
  const totals = breakdown.reduce(
    (acc, r) => {
      acc.message_count += r.message_count;
      acc.user_messages += r.user_messages;
      acc.assistant_messages += r.assistant_messages;
      acc.input_tokens += r.input_tokens;
      acc.output_tokens += r.output_tokens;
      acc.with_router_usd += r.with_router_usd;
      acc.without_router_usd += r.without_router_usd;
      acc.savings_usd += r.savings_usd;
      return acc;
    },
    zeroTotals()
  );
  totals.with_router_usd = round(totals.with_router_usd);
  totals.without_router_usd = round(totals.without_router_usd);
  totals.savings_usd = round(totals.savings_usd);
  totals.savings_pct =
    totals.without_router_usd > 0
      ? round((totals.savings_usd / totals.without_router_usd) * 100, 2)
      : 0;

  return NextResponse.json({
    breakdown,
    totals,
    pricing: TOKEN_PRICING,
    avg_tokens: AVG_TOKENS,
    router_split: ROUTER_SPLIT,
    empty: totals.message_count === 0,
  });
}

function zeroTotals() {
  return {
    message_count: 0,
    user_messages: 0,
    assistant_messages: 0,
    input_tokens: 0,
    output_tokens: 0,
    with_router_usd: 0,
    without_router_usd: 0,
    savings_usd: 0,
    savings_pct: 0,
  };
}
