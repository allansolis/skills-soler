import { defineConfig } from "drizzle-kit";
import { config as loadEnv } from "dotenv";

// Load env from .env.local for drizzle-kit CLI (push/generate/migrate)
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// When TURSO_DATABASE_URL is set, use turso dialect (remote libSQL).
// Otherwise default to local sqlite file for dev migrations.
export default defineConfig(
  tursoUrl
    ? {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "turso",
        dbCredentials: {
          url: tursoUrl,
          authToken: tursoToken,
        },
      }
    : {
        schema: "./src/db/schema.ts",
        out: "./drizzle",
        dialect: "sqlite",
        dbCredentials: {
          url: "file:./data/crm.db",
        },
      }
);
