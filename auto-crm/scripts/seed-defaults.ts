#!/usr/bin/env npx tsx
/**
 * Idempotent seed for default data.
 * Works against the same DB that the running app uses
 * (TURSO_DATABASE_URL if set, otherwise file:./data/crm.db).
 *
 * Usage:
 *   npm run db:push           # 1) create schema via drizzle-kit
 *   npm run db:seed-defaults  # 2) seed pipeline + loyalty (this script)
 *
 * Safe to run multiple times — checks for existing rows before inserting.
 */
import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });

import crypto from "crypto";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL || "file:./data/crm.db";
const authToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url, authToken });

const DEFAULT_STAGES = [
  { name: "Prospecto", order: 1, color: "#64748b", is_won: 0, is_lost: 0 },
  { name: "Contactado", order: 2, color: "#2563eb", is_won: 0, is_lost: 0 },
  { name: "Propuesta", order: 3, color: "#8b5cf6", is_won: 0, is_lost: 0 },
  { name: "Negociacion", order: 4, color: "#ea580c", is_won: 0, is_lost: 0 },
  { name: "Cerrado Ganado", order: 5, color: "#16a34a", is_won: 1, is_lost: 0 },
  { name: "Cerrado Perdido", order: 6, color: "#dc2626", is_won: 0, is_lost: 1 },
];

const DEFAULT_TIERS = [
  { name: "Bronce", min: 0, disc: 0, color: "#cd7f32", order: 1, benefits: '["Acceso a catalogo exclusivo","Notificaciones de nuevas piezas"]' },
  { name: "Plata", min: 500, disc: 5, color: "#94a3b8", order: 2, benefits: '["5% descuento en compras","Envio gratis en CR","Limpieza de joyas gratis"]' },
  { name: "Oro", min: 1500, disc: 10, color: "#d97706", order: 3, benefits: '["10% descuento","Acceso anticipado a colecciones","Grabado personalizado gratis"]' },
  { name: "Esmeralda", min: 5000, disc: 15, color: "#16a34a", order: 4, benefits: '["15% descuento VIP","Piezas exclusivas bajo pedido","Consulta gemologica privada","Eventos VIP"]' },
];

async function main() {
  console.log(`[seed-defaults] target=${url.startsWith("file:") ? url : "remote turso"}`);

  // 1) Pipeline stages
  const stageRow = await client.execute("SELECT COUNT(*) as count FROM pipeline_stages");
  const stageCount = Number(stageRow.rows[0]?.count ?? 0);

  if (stageCount === 0) {
    console.log("[seed-defaults] seeding pipeline_stages...");
    for (const s of DEFAULT_STAGES) {
      await client.execute({
        sql: `INSERT INTO pipeline_stages (id, name, "order", color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), s.name, s.order, s.color, s.is_won, s.is_lost],
      });
    }
    console.log(`[seed-defaults] inserted ${DEFAULT_STAGES.length} stages`);
  } else {
    console.log(`[seed-defaults] pipeline_stages already has ${stageCount} rows, skipping`);
  }

  // 2) Loyalty program + tiers
  const programRow = await client.execute("SELECT COUNT(*) as count FROM loyalty_programs");
  const programCount = Number(programRow.rows[0]?.count ?? 0);

  if (programCount === 0) {
    console.log("[seed-defaults] seeding loyalty program + tiers...");
    const programId = crypto.randomUUID();
    await client.execute({
      sql: `INSERT INTO loyalty_programs (id, name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)`,
      args: [
        programId,
        "Programa Esmeralda SOLER",
        "Programa de lealtad para clientes de joyeria fina - plata 925 y esmeraldas colombianas",
        Date.now(),
      ],
    });
    for (const t of DEFAULT_TIERS) {
      await client.execute({
        sql: `INSERT INTO loyalty_tiers (id, program_id, name, min_points, discount_percent, benefits, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [crypto.randomUUID(), programId, t.name, t.min, t.disc, t.benefits, t.color, t.order],
      });
    }
    console.log(`[seed-defaults] inserted 1 program + ${DEFAULT_TIERS.length} tiers`);
  } else {
    console.log(`[seed-defaults] loyalty_programs already has ${programCount} rows, skipping`);
  }

  console.log("[seed-defaults] done.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed-defaults] FAIL:", err);
  process.exit(1);
});
