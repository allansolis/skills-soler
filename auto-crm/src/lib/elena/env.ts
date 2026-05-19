/**
 * Lectura robusta de env vars para Elena.
 *
 * Por que existe: Windows puede tener variables de sistema vacias que
 * sobreescriben las del .env.local. Si process.env.ANTHROPIC_API_KEY es
 * "" o undefined, leemos .env.local directamente para asegurarnos.
 */
import { readFileSync, existsSync } from "fs";
import { join } from "path";

let cachedFileEnv: Record<string, string> | null = null;

function loadFromEnvLocal(): Record<string, string> {
  if (cachedFileEnv) return cachedFileEnv;
  const path = join(process.cwd(), ".env.local");
  const result: Record<string, string> = {};
  if (!existsSync(path)) {
    cachedFileEnv = result;
    return result;
  }
  try {
    const content = readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      // Strip surrounding quotes
      const unquoted = value.replace(/^["']|["']$/g, "");
      result[key] = unquoted;
    }
  } catch (err) {
    console.error("[elena/env] failed to read .env.local:", err);
  }
  cachedFileEnv = result;
  return result;
}

/** Lee env var, prioriza process.env pero cae a .env.local si esta vacio */
export function getEnv(key: string): string {
  const fromProc = process.env[key];
  if (fromProc && fromProc.trim()) return fromProc;
  return loadFromEnvLocal()[key] || "";
}
