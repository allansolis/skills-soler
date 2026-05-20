/**
 * Health endpoint para watchdog + monitoring.
 * GET /api/health → 200 si DB + env + Elena estan OK.
 */
import { NextResponse } from "next/server";
import { db } from "@/db";
import { contacts, conversations } from "@/db/schema";
import { sql } from "drizzle-orm";
import { getEnv } from "@/lib/elena/env";
import { existsSync } from "fs";
import { join } from "path";

export async function GET() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // 1) DB accesible
  try {
    const r = await db.select({ c: sql<number>`count(*)` }).from(contacts).get();
    checks.db = { ok: true, detail: `${r?.c ?? 0} contacts` };
  } catch (e) {
    checks.db = { ok: false, detail: (e as Error).message };
  }

  // 2) Anthropic API key configurada
  checks.anthropic = {
    ok: !!getEnv("ANTHROPIC_API_KEY"),
    detail: getEnv("ANTHROPIC_API_KEY") ? "configured" : "missing",
  };

  // 3) Meta tokens
  const pageTokens = ["GLASS", "ESMERALDAS", "AUTOS", "INVERSIONES"]
    .map((b) => ({ b, has: !!getEnv(`META_PAGE_TOKEN_${b}`) }));
  const allPagesOk = pageTokens.every((p) => p.has);
  checks.metaPageTokens = {
    ok: allPagesOk,
    detail: `${pageTokens.filter((p) => p.has).length}/4 configured`,
  };

  // 4) Webhook secret
  checks.webhookConfig = {
    ok: !!getEnv("META_VERIFY_TOKEN") && !!getEnv("META_APP_SECRET"),
    detail: "verify+secret",
  };

  // 5) Knowledge bases existen
  const kbDir = join(process.cwd(), "src", "lib", "elena", "kb");
  const kbFiles = ["glass_soler", "esmeraldas_soler", "autos_soler", "inversiones_soler"]
    .map((b) => existsSync(join(kbDir, `${b}.md`)));
  checks.knowledgeBases = {
    ok: kbFiles.every(Boolean),
    detail: `${kbFiles.filter(Boolean).length}/4 KB files`,
  };

  // 6) Conversaciones recientes (24h)
  try {
    const since = Math.floor(Date.now() / 1000) - 86400;
    const r = await db
      .select({ c: sql<number>`count(*)` })
      .from(conversations)
      .where(sql`${conversations.createdAt} >= ${since * 1000}`)
      .get();
    checks.recentActivity = {
      ok: true,
      detail: `${r?.c ?? 0} msgs in last 24h`,
    };
  } catch (e) {
    checks.recentActivity = { ok: false, detail: (e as Error).message };
  }

  const allOk = Object.values(checks).every((c) => c.ok);
  const status = allOk ? 200 : 503;

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime_seconds: Math.floor(process.uptime()),
      checks,
    },
    { status }
  );
}
