import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const contacts = sqliteTable("contacts", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  source: text("source").notNull().default("otro"),
  temperature: text("temperature").notNull().default("cold"),
  score: integer("score").notNull().default(0),
  notes: text("notes"),
  // Zolutium sync
  zolutiumId: text("zolutium_id"),
  // Meta / Social fields
  whatsappPhone: text("whatsapp_phone"),
  instagramHandle: text("instagram_handle"),
  facebookId: text("facebook_id"),
  preferredChannel: text("preferred_channel").default("whatsapp"),
  conversationCount: integer("conversation_count").notNull().default(0),
  lastConversationAt: integer("last_conversation_at", { mode: "timestamp" }),
  // Loyalty
  loyaltyTier: text("loyalty_tier").default("none"),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  totalPurchases: integer("total_purchases").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const pipelineStages = sqliteTable("pipeline_stages", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  color: text("color").notNull().default("#64748b"),
  isWon: integer("is_won", { mode: "boolean" }).notNull().default(false),
  isLost: integer("is_lost", { mode: "boolean" }).notNull().default(false),
});

export const deals = sqliteTable("deals", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  value: integer("value").notNull().default(0),
  stageId: text("stage_id")
    .notNull()
    .references(() => pipelineStages.id),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  expectedClose: integer("expected_close", { mode: "timestamp" }),
  probability: integer("probability").notNull().default(0),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const activities = sqliteTable("activities", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(),
  description: text("description").notNull(),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  dealId: text("deal_id").references(() => deals.id),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const crmSettings = sqliteTable("crm_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Meta conversations log
export const conversations = sqliteTable("conversations", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contactId: text("contact_id").references(() => contacts.id),
  platform: text("platform").notNull(), // whatsapp | instagram | facebook | messenger
  externalId: text("external_id"), // Meta conversation/message ID
  direction: text("direction").notNull().default("inbound"), // inbound | outbound
  message: text("message"),
  messageType: text("message_type").notNull().default("text"), // text | image | audio | video | document
  status: text("status").notNull().default("delivered"), // sent | delivered | read | failed
  senderName: text("sender_name"),
  senderPhone: text("sender_phone"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Loyalty programs
export const loyaltyPrograms = sqliteTable("loyalty_programs", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  description: text("description"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Loyalty tiers with benefits
export const loyaltyTiers = sqliteTable("loyalty_tiers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  programId: text("program_id")
    .notNull()
    .references(() => loyaltyPrograms.id),
  name: text("name").notNull(), // Bronce | Plata | Oro | Esmeralda
  minPoints: integer("min_points").notNull().default(0),
  discountPercent: integer("discount_percent").notNull().default(0),
  benefits: text("benefits"), // JSON array of benefit strings
  color: text("color").notNull().default("#64748b"),
  order: integer("order").notNull().default(0),
});

// n8n Agent data tables
export const kbInsights = sqliteTable("kb_insights", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // faq | objection | trend | improvement
  category: text("category").notNull().default("ventas"),
  question: text("question"),
  answer: text("answer"),
  content: text("content"), // JSON for complex data
  source: text("source").default("Agent 7 - KB Updater"),
  appliedToZolutium: integer("applied_to_zolutium", { mode: "boolean" }).default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const inventoryItems = sqliteTable("inventory_items", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  metaProductId: text("meta_product_id"),
  retailerId: text("retailer_id"),
  name: text("name").notNull(),
  category: text("category").notNull(), // cadenas | sets | aretes | pulseras | anillos | piedras
  price: text("price"),
  availability: text("availability").default("in stock"),
  imageUrl: text("image_url"),
  description: text("description"),
  mentionCount: integer("mention_count").default(0),
  lastSyncAt: integer("last_sync_at", { mode: "timestamp" })
    .$defaultFn(() => new Date()),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const executiveReports = sqliteTable("executive_reports", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  reportDate: text("report_date").notNull(),
  metaSpend: integer("meta_spend").default(0),
  metaImpressions: integer("meta_impressions").default(0),
  metaReach: integer("meta_reach").default(0),
  metaClicks: integer("meta_clicks").default(0),
  metaCtr: text("meta_ctr"),
  metaCpc: text("meta_cpc"),
  metaMessages: integer("meta_messages").default(0),
  metaCostPerMsg: text("meta_cost_per_msg"),
  totalContacts: integer("total_contacts").default(0),
  totalConversations: integer("total_conversations").default(0),
  activeCampaigns: integer("active_campaigns").default(0),
  campaignDetails: text("campaign_details"), // JSON
  recommendations: text("recommendations"), // JSON
  alerts: text("alerts"), // JSON
  aiSummary: text("ai_summary"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Loyalty rewards / actions log
export const loyaltyActions = sqliteTable("loyalty_actions", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  contactId: text("contact_id")
    .notNull()
    .references(() => contacts.id),
  action: text("action").notNull(), // purchase | referral | review | birthday | campaign_response
  points: integer("points").notNull().default(0),
  description: text("description"),
  dealId: text("deal_id").references(() => deals.id),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
