// API route: Conversation Volume
// GET /api/performance/volume
// Returns last 24h of message counts per business per hour (line chart)

import { NextResponse } from "next/server";
import {
  openBotDb,
  botDbExists,
  BOT_BUSINESSES,
  BUSINESS_NAMES,
  BUSINESS_COLORS,
} from "@/lib/botSqlite";

interface VolumeRow {
  hour: string; // "HH:00"
  timestamp: string; // ISO bucket start
  [business: string]: string | number;
}

interface SeriesMeta {
  key: string;
  name: string;
  color: string;
}

export async function GET() {
  if (!botDbExists()) {
    return NextResponse.json({
      data: [],
      series: BOT_BUSINESSES.map((biz) => ({
        key: biz,
        name: BUSINESS_NAMES[biz],
        color: BUSINESS_COLORS[biz],
      })),
      empty: true,
      message: "SQLite no accesible — verifica BOT_DB_PATH",
    });
  }

  const db = openBotDb();
  if (!db) {
    return NextResponse.json({
      data: [],
      series: [],
      empty: true,
      message: "No se pudo abrir conversations.db",
    });
  }

  // Build 24 hourly buckets ending at the current hour.
  const now = new Date();
  const buckets: { iso: string; label: string }[] = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    d.setMinutes(0, 0, 0);
    buckets.push({
      iso: d.toISOString().slice(0, 13) + ":00",
      label: d.toISOString().slice(11, 13) + ":00",
    });
  }

  // Aggregate counts by business and hour.
  // timestamp format in DB: "YYYY-MM-DD HH:MM:SS" (sqlite datetime('now'))
  type Row = { business: string; hour: string; n: number };
  let rows: Row[] = [];
  try {
    rows = db
      .prepare(
        `SELECT business,
                strftime('%Y-%m-%dT%H:00', timestamp) AS hour,
                COUNT(*) AS n
         FROM conversations
         WHERE timestamp > datetime('now', '-24 hours')
         GROUP BY business, hour
         ORDER BY hour ASC`
      )
      .all() as Row[];
  } catch (err) {
    db.close();
    return NextResponse.json({
      data: [],
      series: [],
      empty: true,
      message: `Error consultando SQLite: ${String(err)}`,
    });
  }
  db.close();

  // Index counts by business->hour for fast lookup
  const counts: Record<string, Record<string, number>> = {};
  for (const biz of BOT_BUSINESSES) counts[biz] = {};
  for (const r of rows) {
    if (!counts[r.business]) counts[r.business] = {};
    counts[r.business][r.hour] = r.n;
  }

  // Compose chart data
  const data: VolumeRow[] = buckets.map(({ iso, label }) => {
    const row: VolumeRow = { hour: label, timestamp: iso };
    for (const biz of BOT_BUSINESSES) {
      row[biz] = counts[biz]?.[iso] || 0;
    }
    return row;
  });

  const series: SeriesMeta[] = BOT_BUSINESSES.map((biz) => ({
    key: biz,
    name: BUSINESS_NAMES[biz],
    color: BUSINESS_COLORS[biz],
  }));

  // Determine if any data is present
  const total = data.reduce(
    (s, row) =>
      s +
      BOT_BUSINESSES.reduce((acc, biz) => acc + Number(row[biz] || 0), 0),
    0
  );

  return NextResponse.json({
    data,
    series,
    empty: total === 0,
    total_messages_24h: total,
  });
}
