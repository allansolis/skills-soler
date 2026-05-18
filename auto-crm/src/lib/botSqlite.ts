// Helper to open the bot Elena SQLite DB (data/conversations.db)
// The bots run on the host at "C:\Users\Usuario\Desktop\Bot glass soler\".
// This file lives in the auto-crm project, so we have to resolve a path
// pointing outside cwd. Override via BOT_DB_PATH env when running in Docker
// or on a different host.

import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DEFAULT_BOT_DB_PATH =
  "C:\\Users\\Usuario\\Desktop\\Bot glass soler\\data\\conversations.db";

export function getBotDbPath(): string {
  const override = process.env.BOT_DB_PATH;
  if (override && override.trim().length > 0) return override;
  return DEFAULT_BOT_DB_PATH;
}

export function botDbExists(): boolean {
  try {
    return fs.existsSync(getBotDbPath());
  } catch {
    return false;
  }
}

export function openBotDb(): Database.Database | null {
  const p = getBotDbPath();
  if (!fs.existsSync(p)) return null;
  try {
    // readonly = true: we only read for analytics, never write
    return new Database(p, { readonly: true, fileMustExist: true, timeout: 5000 });
  } catch {
    return null;
  }
}

export const BOT_BUSINESSES = [
  "esmeraldas_soler",
  "glass_soler",
  "autos_soler",
  "inversiones_soler",
] as const;

export const BUSINESS_NAMES: Record<string, string> = {
  glass_soler: "Glass Soler",
  esmeraldas_soler: "Esmeraldas Soler",
  autos_soler: "Autos Soler",
  inversiones_soler: "Inversiones Soler",
};

export const BUSINESS_COLORS: Record<string, string> = {
  glass_soler: "#0EA5E9",
  esmeraldas_soler: "#10B981",
  autos_soler: "#F59E0B",
  inversiones_soler: "#8B5CF6",
};

export const BUSINESS_EMOJIS: Record<string, string> = {
  glass_soler: "🪟",
  esmeraldas_soler: "💎",
  autos_soler: "🚗",
  inversiones_soler: "📈",
};

// Anthropic pricing (USD per 1M tokens) — Sonnet 4 / Haiku 3.5 / 4.5 era
export const TOKEN_PRICING = {
  sonnet: { input_per_1m: 3, output_per_1m: 15 },
  haiku: { input_per_1m: 1, output_per_1m: 5 },
} as const;

// Heuristic averages used to estimate cost from message counts.
// User messages: ~200 input tokens, Assistant replies: ~300 output tokens.
export const AVG_TOKENS = {
  per_user_msg_input: 200,
  per_assistant_msg_output: 300,
} as const;

// Model router split (40% haiku for cheap intents, 60% sonnet for full convo)
export const ROUTER_SPLIT = { haiku_pct: 0.4, sonnet_pct: 0.6 } as const;
