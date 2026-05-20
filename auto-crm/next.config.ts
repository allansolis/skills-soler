import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is only used by /lib/botSqlite.ts to read an OPTIONAL
  // external local DB (data/conversations.db on the dev machine). On Vercel
  // that file doesn't exist and the routes return empty. We still mark it as
  // external so Next/Webpack doesn't try to bundle the native binding.
  // @libsql/client is the primary client (works on both local file URLs and
  // remote Turso) and is bundled normally.
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
