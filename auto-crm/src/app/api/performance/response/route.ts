// API route: Response Performance
// GET /api/performance/response
// For each business, computes:
//   - messages_per_hour: avg msgs/hour over last 7 days of activity
//   - response_time_avg_ms: median diff between a user msg and the next
//     assistant msg in the same (business, user_id) thread
//   - pct_hot: % of unique user_ids whose lead score >= 70
//   - pct_handoff: % of unique user_ids whose lead score >= 90 (proxy for handoff)
//
// Uses two sources:
//   - SQLite data/conversations.db   (message-level data)
//   - data/leads_scores.json         (score-level data)

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import {
  openBotDb,
  botDbExists,
  BOT_BUSINESSES,
  BUSINESS_NAMES,
  BUSINESS_COLORS,
  getBotDbPath,
} from "@/lib/botSqlite";

interface ConvRow {
  business: string;
  user_id: string;
  role: "user" | "assistant";
  timestamp: string;
}

interface BusinessResponseStats {
  business: string;
  name: string;
  color: string;
  message_count: number;
  user_count: number;
  messages_per_hour: number;
  response_time_avg_ms: number | null;
  response_time_avg_sec: number | null;
  total_leads: number;
  hot_leads: number;
  handoff_leads: number;
  pct_hot: number;
  pct_handoff: number;
}

function readLeadsScores(): Record<string, { business: string; score: number; handoff_triggered?: boolean }> {
  // data/leads_scores.json lives next to conversations.db
  const dbPath = getBotDbPath();
  const dir = path.dirname(dbPath);
  const file = path.join(dir, "leads_scores.json");
  try {
    if (!fs.existsSync(file)) return {};
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function parseTimestamp(ts: string): number {
  // DB format: "YYYY-MM-DD HH:MM:SS" — Date can parse if we add "T"
  // Some rows may already be ISO with "T".
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T") + "Z";
  return new Date(iso).getTime();
}

export async function GET() {
  // Initialize empty stats per business so the table always has 4 rows.
  const stats: Record<string, BusinessResponseStats> = {};
  for (const biz of BOT_BUSINESSES) {
    stats[biz] = {
      business: biz,
      name: BUSINESS_NAMES[biz],
      color: BUSINESS_COLORS[biz],
      message_count: 0,
      user_count: 0,
      messages_per_hour: 0,
      response_time_avg_ms: null,
      response_time_avg_sec: null,
      total_leads: 0,
      hot_leads: 0,
      handoff_leads: 0,
      pct_hot: 0,
      pct_handoff: 0,
    };
  }

  // Aggregate score data from leads_scores.json
  const scores = readLeadsScores();
  for (const entry of Object.values(scores)) {
    // The bots store business as either "glass" or "glass_soler" depending on path.
    // Normalize: any key starting with "glass" -> glass_soler, etc.
    const biz = normalizeBusiness(entry?.business || "");
    if (!biz || !stats[biz]) continue;
    stats[biz].total_leads += 1;
    if ((entry.score || 0) >= 70) stats[biz].hot_leads += 1;
    if (entry.handoff_triggered === true || (entry.score || 0) >= 90) {
      stats[biz].handoff_leads += 1;
    }
  }

  for (const biz of BOT_BUSINESSES) {
    const s = stats[biz];
    s.pct_hot = s.total_leads > 0 ? round((s.hot_leads / s.total_leads) * 100, 2) : 0;
    s.pct_handoff =
      s.total_leads > 0
        ? round((s.handoff_leads / s.total_leads) * 100, 2)
        : 0;
  }

  // Pull message-level data for response-time + msg/hr calculations
  if (botDbExists()) {
    const db = openBotDb();
    if (db) {
      try {
        const rows = db
          .prepare(
            `SELECT business, user_id, role, timestamp
             FROM conversations
             WHERE timestamp > datetime('now', '-7 days')
             ORDER BY business, user_id, timestamp ASC`
          )
          .all() as ConvRow[];

        // group by (business, user_id) to compute response times
        const grouped: Record<string, ConvRow[]> = {};
        const userIdsPerBiz: Record<string, Set<string>> = {};
        const countsPerBiz: Record<string, number> = {};
        const timestampsPerBiz: Record<string, number[]> = {};

        for (const r of rows) {
          const biz = normalizeBusiness(r.business);
          if (!biz) continue;
          const key = `${biz}::${r.user_id}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(r);

          if (!userIdsPerBiz[biz]) userIdsPerBiz[biz] = new Set();
          userIdsPerBiz[biz].add(r.user_id);

          countsPerBiz[biz] = (countsPerBiz[biz] || 0) + 1;
          if (!timestampsPerBiz[biz]) timestampsPerBiz[biz] = [];
          timestampsPerBiz[biz].push(parseTimestamp(r.timestamp));
        }

        // Response time = next assistant msg after a user msg (same thread)
        const responseTimesPerBiz: Record<string, number[]> = {};
        for (const [key, msgs] of Object.entries(grouped)) {
          const biz = key.split("::")[0];
          if (!responseTimesPerBiz[biz]) responseTimesPerBiz[biz] = [];
          for (let i = 0; i < msgs.length - 1; i++) {
            if (msgs[i].role === "user" && msgs[i + 1].role === "assistant") {
              const diff =
                parseTimestamp(msgs[i + 1].timestamp) -
                parseTimestamp(msgs[i].timestamp);
              if (Number.isFinite(diff) && diff >= 0 && diff < 24 * 3600_000) {
                responseTimesPerBiz[biz].push(diff);
              }
            }
          }
        }

        for (const biz of BOT_BUSINESSES) {
          const s = stats[biz];
          s.message_count = countsPerBiz[biz] || 0;
          s.user_count = userIdsPerBiz[biz]?.size || 0;

          // msgs/hour = total / span_hours; span_hours from first..last timestamp
          const ts = timestampsPerBiz[biz];
          if (ts && ts.length >= 2) {
            const span = Math.max(...ts) - Math.min(...ts);
            const hours = span / 3600_000;
            s.messages_per_hour = hours > 0 ? round(s.message_count / hours, 2) : 0;
          } else {
            s.messages_per_hour = 0;
          }

          const med = median(responseTimesPerBiz[biz] || []);
          if (med !== null) {
            s.response_time_avg_ms = Math.round(med);
            s.response_time_avg_sec = round(med / 1000, 2);
          }
        }
      } catch (err) {
        // swallow — return whatever data we have
        console.error("response endpoint sql err:", err);
      } finally {
        db.close();
      }
    }
  }

  return NextResponse.json({
    rows: Object.values(stats),
    db_accessible: botDbExists(),
  });
}

function normalizeBusiness(b: string): string {
  if (!b) return "";
  const k = b.toLowerCase();
  if (k.startsWith("glass")) return "glass_soler";
  if (k.startsWith("esmeralda")) return "esmeraldas_soler";
  if (k.startsWith("auto")) return "autos_soler";
  if (k.startsWith("inversion")) return "inversiones_soler";
  return "";
}

function round(n: number, places = 2): number {
  const f = Math.pow(10, places);
  return Math.round(n * f) / f;
}
