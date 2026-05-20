#!/usr/bin/env npx tsx
/**
 * One-shot data migration: copy every row from the local SQLite file
 * (data/crm.db) to the remote Turso DB.
 *
 * Pre-requisites:
 *   - TURSO_DATABASE_URL and TURSO_AUTH_TOKEN set in .env.local
 *   - Schema already pushed to Turso via `npm run db:push`
 *
 * Usage:
 *   npm run db:migrate-from-local
 *
 * Strategy: INSERT OR IGNORE — safe to re-run if it dies partway through.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { createClient } from "@libsql/client";

const LOCAL_DB_PATH = path.join(process.cwd(), "data", "crm.db");
const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_URL) {
  console.error("TURSO_DATABASE_URL not set. Aborting.");
  process.exit(1);
}
if (!fs.existsSync(LOCAL_DB_PATH)) {
  console.error(`Local DB not found at ${LOCAL_DB_PATH}. Aborting.`);
  process.exit(1);
}

const local = new Database(LOCAL_DB_PATH, { readonly: true });
const remote = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// Tables in dependency order: parents before children due to FKs.
const TABLES_IN_ORDER = [
  "pipeline_stages",
  "contacts",
  "deals",
  "activities",
  "crm_settings",
  "conversations",
  "loyalty_programs",
  "loyalty_tiers",
  "kb_insights",
  "inventory_items",
  "executive_reports",
  "meta_assets",
  "loyalty_actions",
];

interface TableInfo {
  name: string;
  type: string;
  notnull: number;
}

function getColumns(table: string): string[] {
  const cols = local.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return cols.map((c) => c.name);
}

async function migrateTable(table: string): Promise<{ inserted: number; skipped: number }> {
  let inserted = 0;
  let skipped = 0;
  let cols: string[];
  try {
    cols = getColumns(table);
  } catch (e) {
    console.warn(`[migrate] ${table}: skip (not present locally) — ${(e as Error).message}`);
    return { inserted, skipped };
  }
  if (cols.length === 0) {
    console.warn(`[migrate] ${table}: skip (no columns reported)`);
    return { inserted, skipped };
  }

  // Quote any reserved-word columns (order)
  const quotedCols = cols.map((c) => (c === "order" ? `"order"` : c));
  const placeholders = cols.map(() => "?").join(", ");
  const insertSql = `INSERT OR IGNORE INTO ${table} (${quotedCols.join(", ")}) VALUES (${placeholders})`;

  const rows = local.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
  if (rows.length === 0) {
    console.log(`[migrate] ${table}: 0 rows locally`);
    return { inserted, skipped };
  }

  console.log(`[migrate] ${table}: migrating ${rows.length} rows...`);

  // Batch insert: 50 rows per batch to keep request size reasonable
  const BATCH = 50;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const stmts = batch.map((row) => {
      const args = cols.map((c) => {
        const v = row[c];
        // libsql client wants null | string | number | bigint | ArrayBuffer | boolean
        if (v === undefined || v === null) return null;
        if (typeof v === "bigint" || typeof v === "boolean" || typeof v === "number" || typeof v === "string") return v;
        // Buffer for blobs
        if (v instanceof Uint8Array) return v.buffer;
        return JSON.stringify(v);
      });
      return { sql: insertSql, args: args as (string | number | bigint | boolean | null | ArrayBuffer)[] };
    });

    try {
      await remote.batch(stmts, "write");
      inserted += batch.length;
    } catch (e) {
      console.error(`[migrate] ${table} batch ${i / BATCH}: ${(e as Error).message}`);
      // Try one-by-one to find which row breaks
      for (const stmt of stmts) {
        try {
          await remote.execute(stmt);
          inserted += 1;
        } catch (e2) {
          skipped += 1;
          console.warn(`[migrate]   row skipped: ${(e2 as Error).message}`);
        }
      }
    }
  }

  console.log(`[migrate] ${table}: inserted=${inserted} skipped=${skipped}`);
  return { inserted, skipped };
}

async function main() {
  console.log(`[migrate] FROM ${LOCAL_DB_PATH}`);
  console.log(`[migrate] TO   ${TURSO_URL}`);

  // Sanity check: remote must be reachable
  try {
    const test = await remote.execute("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1");
    console.log(`[migrate] remote reachable, tables present: ${test.rows.length > 0}`);
  } catch (e) {
    console.error(`[migrate] remote NOT reachable: ${(e as Error).message}`);
    process.exit(1);
  }

  let totalInserted = 0;
  let totalSkipped = 0;
  for (const table of TABLES_IN_ORDER) {
    const { inserted, skipped } = await migrateTable(table);
    totalInserted += inserted;
    totalSkipped += skipped;
  }

  console.log("");
  console.log(`[migrate] DONE — total inserted=${totalInserted}  skipped=${totalSkipped}`);
  local.close();
  process.exit(0);
}

main().catch((err) => {
  console.error("[migrate] FATAL:", err);
  process.exit(1);
});
