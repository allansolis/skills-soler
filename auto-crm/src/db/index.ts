/**
 * Database client (Drizzle ORM + @libsql/client).
 *
 * - Local dev:  TURSO_DATABASE_URL unset  -> file:./data/crm.db
 * - Production: TURSO_DATABASE_URL set    -> remote Turso libSQL
 *
 * Schema management is handled by drizzle-kit (`npm run db:push`).
 * Default seed data (pipeline stages, loyalty tiers) lives in
 * scripts/init-db.ts and is idempotent — run it after the first push.
 *
 * NOTE: every query against `db` is ASYNC. Always `await` calls like
 *   await db.select().from(...).where(...).get()
 *   await db.insert(...).values(...).run()
 *   await db.update(...).set(...).run()
 *   await db.delete(...).where(...).run()
 */
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { getEnv } from "@/lib/elena/env";

function resolveUrl(): { url: string; authToken?: string } {
  const remoteUrl = getEnv("TURSO_DATABASE_URL");
  const remoteToken = getEnv("TURSO_AUTH_TOKEN");
  if (remoteUrl) {
    return { url: remoteUrl, authToken: remoteToken || undefined };
  }
  // Local dev fallback. The path is relative to the Next.js working dir
  // (the auto-crm project root when running `npm run dev` / `npm run start`).
  return { url: "file:./data/crm.db" };
}

let cachedClient: Client | null = null;

function getClient(): Client {
  if (cachedClient) return cachedClient;
  const { url, authToken } = resolveUrl();
  cachedClient = createClient({ url, authToken });
  return cachedClient;
}

export const db = drizzle(getClient(), { schema });

// Expose for one-off raw queries (e.g. data migration scripts).
export const sqlClient = getClient();
