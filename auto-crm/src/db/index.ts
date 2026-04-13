import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createDatabase(): Database.Database {
  const db = new Database(DB_PATH, { timeout: 15000 });

  // Set pragmas individually with error handling
  try {
    db.pragma("journal_mode = WAL");
  } catch {
    // WAL mode might already be set by another process
  }

  try {
    db.pragma("busy_timeout = 15000");
  } catch {
    // Ignore if can't set
  }

  try {
    db.pragma("foreign_keys = ON");
  } catch {
    // Ignore
  }

  return db;
}

function initTables(db: Database.Database): void {
  // Each CREATE TABLE is its own statement to minimize lock time
  const tables = [
    `CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      source TEXT NOT NULL DEFAULT 'otro',
      temperature TEXT NOT NULL DEFAULT 'cold',
      score INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS pipeline_stages (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      "order" INTEGER NOT NULL,
      color TEXT NOT NULL DEFAULT '#64748b',
      is_won INTEGER NOT NULL DEFAULT 0,
      is_lost INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 0,
      stage_id TEXT NOT NULL REFERENCES pipeline_stages(id),
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      expected_close INTEGER,
      probability INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      deal_id TEXT REFERENCES deals(id),
      scheduled_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS crm_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      contact_id TEXT REFERENCES contacts(id),
      platform TEXT NOT NULL,
      external_id TEXT,
      direction TEXT NOT NULL DEFAULT 'inbound',
      message TEXT,
      message_type TEXT NOT NULL DEFAULT 'text',
      status TEXT NOT NULL DEFAULT 'delivered',
      sender_name TEXT,
      sender_phone TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS loyalty_programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS loyalty_tiers (
      id TEXT PRIMARY KEY,
      program_id TEXT NOT NULL REFERENCES loyalty_programs(id),
      name TEXT NOT NULL,
      min_points INTEGER NOT NULL DEFAULT 0,
      discount_percent INTEGER NOT NULL DEFAULT 0,
      benefits TEXT,
      color TEXT NOT NULL DEFAULT '#64748b',
      "order" INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS kb_insights (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'ventas',
      question TEXT,
      answer TEXT,
      content TEXT,
      source TEXT DEFAULT 'Agent 7 - KB Updater',
      applied_to_zolutium INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS inventory_items (
      id TEXT PRIMARY KEY,
      meta_product_id TEXT,
      retailer_id TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price TEXT,
      availability TEXT DEFAULT 'in stock',
      image_url TEXT,
      description TEXT,
      mention_count INTEGER DEFAULT 0,
      last_sync_at INTEGER,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS executive_reports (
      id TEXT PRIMARY KEY,
      report_date TEXT NOT NULL,
      meta_spend INTEGER DEFAULT 0,
      meta_impressions INTEGER DEFAULT 0,
      meta_reach INTEGER DEFAULT 0,
      meta_clicks INTEGER DEFAULT 0,
      meta_ctr TEXT,
      meta_cpc TEXT,
      meta_messages INTEGER DEFAULT 0,
      meta_cost_per_msg TEXT,
      total_contacts INTEGER DEFAULT 0,
      total_conversations INTEGER DEFAULT 0,
      active_campaigns INTEGER DEFAULT 0,
      campaign_details TEXT,
      recommendations TEXT,
      alerts TEXT,
      ai_summary TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS loyalty_actions (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL REFERENCES contacts(id),
      action TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      description TEXT,
      deal_id TEXT REFERENCES deals(id),
      created_at INTEGER NOT NULL
    )`,
  ];

  for (const sql of tables) {
    try {
      db.exec(sql);
    } catch {
      // Table might already exist or DB is locked - safe to continue
    }
  }
}

function seedDefaultStages(db: Database.Database): void {
  try {
    const result = db
      .prepare("SELECT COUNT(*) as count FROM pipeline_stages")
      .get() as { count: number } | undefined;

    if (!result || result.count > 0) return;

    const defaultStages = [
      { name: "Prospecto", order: 1, color: "#64748b", isWon: 0, isLost: 0 },
      { name: "Contactado", order: 2, color: "#2563eb", isWon: 0, isLost: 0 },
      { name: "Propuesta", order: 3, color: "#8b5cf6", isWon: 0, isLost: 0 },
      { name: "Negociacion", order: 4, color: "#ea580c", isWon: 0, isLost: 0 },
      { name: "Cerrado Ganado", order: 5, color: "#16a34a", isWon: 1, isLost: 0 },
      { name: "Cerrado Perdido", order: 6, color: "#dc2626", isWon: 0, isLost: 1 },
    ];

    const insert = db.prepare(
      `INSERT OR IGNORE INTO pipeline_stages (id, name, "order", color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?)`
    );

    const seedAll = db.transaction(() => {
      for (const stage of defaultStages) {
        insert.run(
          crypto.randomUUID(),
          stage.name,
          stage.order,
          stage.color,
          stage.isWon,
          stage.isLost
        );
      }
    });

    seedAll();
  } catch {
    // Seeding can fail if another worker is doing it — that's fine
  }
}

function migrateContactColumns(db: Database.Database): void {
  const newColumns = [
    { name: "zolutium_id", type: "TEXT" },
    { name: "whatsapp_phone", type: "TEXT" },
    { name: "instagram_handle", type: "TEXT" },
    { name: "facebook_id", type: "TEXT" },
    { name: "preferred_channel", type: "TEXT DEFAULT 'whatsapp'" },
    { name: "conversation_count", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "last_conversation_at", type: "INTEGER" },
    { name: "loyalty_tier", type: "TEXT DEFAULT 'none'" },
    { name: "loyalty_points", type: "INTEGER NOT NULL DEFAULT 0" },
    { name: "total_purchases", type: "INTEGER NOT NULL DEFAULT 0" },
  ];
  for (const col of newColumns) {
    try {
      db.exec(`ALTER TABLE contacts ADD COLUMN ${col.name} ${col.type}`);
    } catch {
      // Column already exists
    }
  }
}

function seedDefaultLoyalty(db: Database.Database): void {
  try {
    const result = db
      .prepare("SELECT COUNT(*) as count FROM loyalty_programs")
      .get() as { count: number } | undefined;
    if (!result || result.count > 0) return;

    const programId = crypto.randomUUID();
    db.prepare(
      `INSERT INTO loyalty_programs (id, name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)`
    ).run(
      programId,
      "Programa Esmeralda SOLER",
      "Programa de lealtad para clientes de joyeria fina - plata 925 y esmeraldas colombianas",
      Date.now()
    );

    const tiers = [
      { name: "Bronce", minPoints: 0, discount: 0, color: "#cd7f32", order: 1, benefits: '["Acceso a catalogo exclusivo","Notificaciones de nuevas piezas"]' },
      { name: "Plata", minPoints: 500, discount: 5, color: "#94a3b8", order: 2, benefits: '["5% descuento en compras","Envio gratis en CR","Limpieza de joyas gratis"]' },
      { name: "Oro", minPoints: 1500, discount: 10, color: "#d97706", order: 3, benefits: '["10% descuento","Acceso anticipado a colecciones","Grabado personalizado gratis"]' },
      { name: "Esmeralda", minPoints: 5000, discount: 15, color: "#16a34a", order: 4, benefits: '["15% descuento VIP","Piezas exclusivas bajo pedido","Consulta gemologica privada","Eventos VIP"]' },
    ];

    const insertTier = db.prepare(
      `INSERT INTO loyalty_tiers (id, program_id, name, min_points, discount_percent, benefits, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );

    const seedTiers = db.transaction(() => {
      for (const tier of tiers) {
        insertTier.run(
          crypto.randomUUID(),
          programId,
          tier.name,
          tier.minPoints,
          tier.discount,
          tier.benefits,
          tier.color,
          tier.order
        );
      }
    });
    seedTiers();
  } catch {
    // Already seeded or locked
  }
}

const sqlite = createDatabase();
initTables(sqlite);
migrateContactColumns(sqlite);
seedDefaultStages(sqlite);
seedDefaultLoyalty(sqlite);

export const db = drizzle(sqlite, { schema });
