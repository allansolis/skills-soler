import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH, { timeout: 15000 });
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = OFF"); // Disable during bulk delete
sqlite.pragma("busy_timeout = 15000");

console.log("=== Seeding Zolutium data for Esmeraldas SOLER CRM ===\n");

// ---------------------------------------------------------------------------
// 1. Clear existing data (order matters for FK constraints)
// ---------------------------------------------------------------------------
console.log("Clearing existing data...");
const tablesToClear = [
  "loyalty_actions",
  "loyalty_tiers",
  "loyalty_programs",
  "conversations",
  "activities",
  "deals",
  "contacts",
  "pipeline_stages",
  "crm_settings",
];

for (const table of tablesToClear) {
  try {
    sqlite.exec(`DELETE FROM ${table}`);
  } catch {
    // Table may not exist yet
  }
}
console.log("  All tables cleared.\n");

sqlite.pragma("foreign_keys = ON");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function ts(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function uuid(): string {
  return crypto.randomUUID();
}

// CRC colones to cents
function crc(colones: number): number {
  return colones * 100;
}

// ---------------------------------------------------------------------------
// 2. Pipeline Stages (exact Zolutium stages)
// ---------------------------------------------------------------------------
console.log("Creating pipeline stages...");
const stageIds = {
  leadOrganico: uuid(),
  leadMeta: uuid(),
  leadTiktok: uuid(),
  contactado: uuid(),
  calificado: uuid(),
  propuestaEnviada: uuid(),
  seguimiento: uuid(),
  cerrado: uuid(),
  perdido: uuid(),
};

const stages = [
  { id: stageIds.leadOrganico, name: "Lead [Orgánico/Web]", order: 1, color: "#10B981", isWon: 0, isLost: 0 },
  { id: stageIds.leadMeta, name: "Lead [META]", order: 2, color: "#3B82F6", isWon: 0, isLost: 0 },
  { id: stageIds.leadTiktok, name: "Lead [TikTok]", order: 3, color: "#EC4899", isWon: 0, isLost: 0 },
  { id: stageIds.contactado, name: "Contactado", order: 4, color: "#6366F1", isWon: 0, isLost: 0 },
  { id: stageIds.calificado, name: "Calificado", order: 5, color: "#F59E0B", isWon: 0, isLost: 0 },
  { id: stageIds.propuestaEnviada, name: "Propuesta Enviada", order: 6, color: "#8B5CF6", isWon: 0, isLost: 0 },
  { id: stageIds.seguimiento, name: "Seguimiento/Negociación", order: 7, color: "#EF4444", isWon: 0, isLost: 0 },
  { id: stageIds.cerrado, name: "Cerrado", order: 8, color: "#22C55E", isWon: 1, isLost: 0 },
  { id: stageIds.perdido, name: "Perdido", order: 9, color: "#6B7280", isWon: 0, isLost: 1 },
];

const insertStage = sqlite.prepare(
  `INSERT INTO pipeline_stages (id, name, "order", color, is_won, is_lost) VALUES (?, ?, ?, ?, ?, ?)`
);

const seedStages = sqlite.transaction(() => {
  for (const s of stages) {
    insertStage.run(s.id, s.name, s.order, s.color, s.isWon, s.isLost);
  }
});
seedStages();
console.log(`  ${stages.length} pipeline stages created.\n`);

// ---------------------------------------------------------------------------
// 3. Contacts (30 total - 17 real Zolutium + 13 generated)
// ---------------------------------------------------------------------------
console.log("Creating contacts...");

const contactIds: Record<string, string> = {};
function cid(key: string): string {
  if (!contactIds[key]) contactIds[key] = uuid();
  return contactIds[key];
}

const contacts = [
  // ---- 17 real Zolutium contacts ----
  {
    id: cid("vi_cr"),
    name: "Vi CR",
    email: null,
    phone: "+506 6261 3497",
    company: null,
    source: "whatsapp",
    temperature: "hot",
    score: 80,
    notes: "Preguntó '¿Precio?' sobre pieza de joyería vista en anuncio de Facebook (fb.me/iPNFxSan3). Interesada en cadena de corazón.",
    whatsappPhone: "+506 6261 3497",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 4,
    lastConversationAt: ts("2026-04-10T20:13:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T20:13:00"),
    updatedAt: ts("2026-04-10T20:15:00"),
  },
  {
    id: cid("chris_lopez"),
    name: "Chris Lopez Cortez",
    email: null,
    phone: "+506 6201 6140",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 55,
    notes: "Contacto por WhatsApp, pidió información sobre catálogo de piezas en plata 925.",
    whatsappPhone: "+506 6201 6140",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T19:52:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T19:52:00"),
    updatedAt: ts("2026-04-10T19:55:00"),
  },
  {
    id: cid("21"),
    name: "-21-",
    email: null,
    phone: "+506 6359 4294",
    company: null,
    source: "whatsapp",
    temperature: "cold",
    score: 15,
    notes: "Contacto inicial por WhatsApp, nombre no identificado. Pendiente clasificar.",
    whatsappPhone: "+506 6359 4294",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 1,
    lastConversationAt: ts("2026-04-10T19:50:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T19:50:00"),
    updatedAt: ts("2026-04-10T19:50:00"),
  },
  {
    id: cid("leticia"),
    name: "Leticia Delgado Rojas",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "warm",
    score: 50,
    notes: "Llegó por Instagram. Se le mostraron opciones del catálogo. Interesada en aretes y collares.",
    whatsappPhone: null,
    instagramHandle: "leticia.delgado",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 3,
    lastConversationAt: ts("2026-04-10T18:17:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T18:17:00"),
    updatedAt: ts("2026-04-10T18:30:00"),
  },
  {
    id: cid("vilma"),
    name: "Vilma Romero Brenes",
    email: null,
    phone: "+506 7103 2110",
    company: null,
    source: "whatsapp",
    temperature: "hot",
    score: 85,
    notes: "Tag: Realidad Virtual. Confirmó interés en asegurar piezas. Cliente potencial alta.",
    whatsappPhone: "+506 7103 2110",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 5,
    lastConversationAt: ts("2026-04-10T17:36:00"),
    loyaltyTier: "bronce",
    loyaltyPoints: 120,
    totalPurchases: 1,
    createdAt: ts("2026-04-10T17:36:00"),
    updatedAt: ts("2026-04-10T17:45:00"),
  },
  {
    id: cid("farmasec"),
    name: "farmasec",
    email: null,
    phone: "+506 7086 8836",
    company: "Farmasec",
    source: "whatsapp",
    temperature: "cold",
    score: 20,
    notes: "Contacto comercial. Preguntó por información general. Sin seguimiento aún.",
    whatsappPhone: "+506 7086 8836",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 1,
    lastConversationAt: ts("2026-04-10T15:33:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T15:33:00"),
    updatedAt: ts("2026-04-10T15:33:00"),
  },
  {
    id: cid("yohe"),
    name: "Yohe",
    email: null,
    phone: "+506 7208 2785",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 45,
    notes: "Preguntó por pulseras en plata 925. Pidió fotos adicionales.",
    whatsappPhone: "+506 7208 2785",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 3,
    lastConversationAt: ts("2026-04-10T15:19:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T15:19:00"),
    updatedAt: ts("2026-04-10T15:25:00"),
  },
  {
    id: cid("silvia"),
    name: "Silvia Castillo",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "warm",
    score: 40,
    notes: "Respondió '¡Gracias!' al catálogo enviado por IG. Pendiente seguimiento con opciones específicas.",
    whatsappPhone: null,
    instagramHandle: "silviacastillo_cr",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T14:48:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T14:48:00"),
    updatedAt: ts("2026-04-10T14:50:00"),
  },
  {
    id: cid("jesus"),
    name: "Jesús Flores",
    email: null,
    phone: "+506 8703 8169",
    company: null,
    source: "whatsapp",
    temperature: "hot",
    score: 75,
    notes: "Interesado en anillo de compromiso con esmeralda. Preguntó por sistema de apartados y envíos.",
    whatsappPhone: "+506 8703 8169",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 6,
    lastConversationAt: ts("2026-04-10T13:24:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T13:24:00"),
    updatedAt: ts("2026-04-10T13:40:00"),
  },
  {
    id: cid("luis_alberto"),
    name: "Luis Alberto Quesada Fernández",
    email: null,
    phone: null,
    company: null,
    source: "facebook_messenger",
    temperature: "cold",
    score: 25,
    notes: "Dijo que estará en contacto luego. No ha respondido a seguimiento. Lead frío.",
    whatsappPhone: null,
    instagramHandle: null,
    facebookId: "luis.quesada.fb",
    preferredChannel: "facebook",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T13:22:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T13:22:00"),
    updatedAt: ts("2026-04-10T13:25:00"),
  },
  {
    id: cid("jeimy"),
    name: "Jeimy Ruiz Obando",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "warm",
    score: 50,
    notes: "Preguntó por aretes con esmeralda desde Instagram. Interesada en opciones de regalo.",
    whatsappPhone: null,
    instagramHandle: "jeimyruiz_o",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 3,
    lastConversationAt: ts("2026-04-10T12:48:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T12:48:00"),
    updatedAt: ts("2026-04-10T12:55:00"),
  },
  {
    id: cid("elian"),
    name: "Elián",
    email: null,
    phone: "+506 6166 9489",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 45,
    notes: "Preguntó precios de cadenas en plata. Enviamos catálogo WhatsApp. Esperando respuesta.",
    whatsappPhone: "+506 6166 9489",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T12:05:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T12:05:00"),
    updatedAt: ts("2026-04-10T12:10:00"),
  },
  {
    id: cid("jeaustin"),
    name: "Jeaustin",
    email: null,
    phone: "+506 6386 7233",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 40,
    notes: "Llegó por WhatsApp buscando regalo. Pidió opciones de aretes y dijes para mujer.",
    whatsappPhone: "+506 6386 7233",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T11:11:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T11:11:00"),
    updatedAt: ts("2026-04-10T11:20:00"),
  },
  {
    id: cid("steven_vr"),
    name: "Steven VR",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "cold",
    score: 20,
    notes: "Interactuó por Instagram. Pregunta general. Sin seguimiento activo.",
    whatsappPhone: null,
    instagramHandle: "steven_vr_cr",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 1,
    lastConversationAt: ts("2026-04-10T11:10:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T11:10:00"),
    updatedAt: ts("2026-04-10T11:10:00"),
  },
  {
    id: cid("joss"),
    name: "Joss Roman",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "warm",
    score: 35,
    notes: "Comentó en post de Instagram y luego escribió por DM preguntando por sets.",
    whatsappPhone: null,
    instagramHandle: "joss_roman",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-10T10:32:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T10:32:00"),
    updatedAt: ts("2026-04-10T10:40:00"),
  },
  {
    id: cid("yessica"),
    name: "Yessicaruizdinarte",
    email: null,
    phone: null,
    company: null,
    source: "instagram_dm",
    temperature: "cold",
    score: 15,
    notes: "Preguntó precio de pieza vista en stories. Sin respuesta después de enviar info.",
    whatsappPhone: null,
    instagramHandle: "yessicaruizdinarte",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 1,
    lastConversationAt: ts("2026-04-10T10:15:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T10:15:00"),
    updatedAt: ts("2026-04-10T10:15:00"),
  },
  {
    id: cid("rebeca"),
    name: "Rebeca",
    email: null,
    phone: "+506 8991 3761",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 55,
    notes: "Recibió seguimiento sobre interés en pulsera. Respondió que sigue interesada. Pendiente enviar opciones de pago.",
    whatsappPhone: "+506 8991 3761",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 4,
    lastConversationAt: ts("2026-04-10T09:50:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-10T09:50:00"),
    updatedAt: ts("2026-04-10T10:00:00"),
  },

  // ---- 13 generated Costa Rican contacts ----
  {
    id: cid("andrea_m"),
    name: "Andrea Mora Calderón",
    email: "andrea.morac@gmail.com",
    phone: "+506 8845 2210",
    company: null,
    source: "meta_ads",
    temperature: "hot",
    score: 90,
    notes: "Llegó por anuncio META de cadena con esmeralda. Pidió apartado inmediatamente. Clienta decidida.",
    whatsappPhone: "+506 8845 2210",
    instagramHandle: "andreamora_cr",
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 8,
    lastConversationAt: ts("2026-04-09T16:30:00"),
    loyaltyTier: "plata",
    loyaltyPoints: 650,
    totalPurchases: 3,
    createdAt: ts("2026-03-15T10:00:00"),
    updatedAt: ts("2026-04-09T16:30:00"),
  },
  {
    id: cid("karla"),
    name: "Karla Jiménez Soto",
    email: "karla.js@hotmail.com",
    phone: "+506 7145 8823",
    company: null,
    source: "referido",
    temperature: "hot",
    score: 82,
    notes: "Referida por Andrea Mora. Quiere set completo collar + aretes para su boda. Presupuesto alto.",
    whatsappPhone: "+506 7145 8823",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 5,
    lastConversationAt: ts("2026-04-08T14:20:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-01T09:15:00"),
    updatedAt: ts("2026-04-08T14:20:00"),
  },
  {
    id: cid("mariela"),
    name: "Mariela Vargas Hernández",
    email: null,
    phone: "+506 6278 4401",
    company: null,
    source: "catalogo_whatsapp",
    temperature: "warm",
    score: 50,
    notes: "Vio catálogo WhatsApp wa.me/c/50687985656. Marcó varias piezas como favoritas. Preguntó por envíos.",
    whatsappPhone: "+506 6278 4401",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 3,
    lastConversationAt: ts("2026-04-07T11:45:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-05T08:30:00"),
    updatedAt: ts("2026-04-07T11:45:00"),
  },
  {
    id: cid("diego"),
    name: "Diego Solís Ramírez",
    email: "diegosolis@gmail.com",
    phone: "+506 8312 7756",
    company: null,
    source: "meta_ads",
    temperature: "hot",
    score: 78,
    notes: "Busca anillo de compromiso con esmeralda colombiana. Preguntó por certificados de autenticidad y apartados.",
    whatsappPhone: "+506 8312 7756",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 7,
    lastConversationAt: ts("2026-04-09T10:15:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-03-28T14:00:00"),
    updatedAt: ts("2026-04-09T10:15:00"),
  },
  {
    id: cid("patricia"),
    name: "Patricia Fallas Monge",
    email: null,
    phone: null,
    company: null,
    source: "tiktok",
    temperature: "warm",
    score: 45,
    notes: "Vio video de TikTok de unboxing de piezas. Comentó 'hermosas' y pidió link del catálogo.",
    whatsappPhone: null,
    instagramHandle: "patifallas",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-06T20:10:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-06T19:30:00"),
    updatedAt: ts("2026-04-06T20:10:00"),
  },
  {
    id: cid("rosa"),
    name: "Rosa María Chacón",
    email: "rosachacon@yahoo.com",
    phone: "+506 8567 1190",
    company: null,
    source: "organico_web",
    temperature: "warm",
    score: 60,
    notes: "Encontró el perfil por búsqueda Google de joyería plata 925 Costa Rica. Pidió información de pulseras.",
    whatsappPhone: "+506 8567 1190",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 4,
    lastConversationAt: ts("2026-04-08T09:00:00"),
    loyaltyTier: "bronce",
    loyaltyPoints: 180,
    totalPurchases: 1,
    createdAt: ts("2026-03-20T16:00:00"),
    updatedAt: ts("2026-04-08T09:00:00"),
  },
  {
    id: cid("fernando"),
    name: "Fernando Rojas Arias",
    email: null,
    phone: "+506 7034 5589",
    company: null,
    source: "facebook_messenger",
    temperature: "cold",
    score: 20,
    notes: "Preguntó por precios por Messenger. No respondió al catálogo enviado. Lead frío.",
    whatsappPhone: "+506 7034 5589",
    instagramHandle: null,
    facebookId: "fernando.rojas.a",
    preferredChannel: "facebook",
    conversationCount: 1,
    lastConversationAt: ts("2026-04-03T12:00:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-03T11:45:00"),
    updatedAt: ts("2026-04-03T12:00:00"),
  },
  {
    id: cid("gabriela_v"),
    name: "Gabriela Villalobos Trejos",
    email: "gabyvilla@icloud.com",
    phone: "+506 6189 3347",
    company: null,
    source: "meta_ads",
    temperature: "hot",
    score: 88,
    notes: "Clienta recurrente. Compró aretes en febrero, ahora quiere cadena con dije de esmeralda para combinar. Le ofrecimos descuento lealtad.",
    whatsappPhone: "+506 6189 3347",
    instagramHandle: "gabyville",
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 12,
    lastConversationAt: ts("2026-04-10T08:30:00"),
    loyaltyTier: "oro",
    loyaltyPoints: 1800,
    totalPurchases: 5,
    createdAt: ts("2026-01-10T11:00:00"),
    updatedAt: ts("2026-04-10T08:30:00"),
  },
  {
    id: cid("lucia"),
    name: "Lucía Sanabria Méndez",
    email: null,
    phone: "+506 8423 6671",
    company: null,
    source: "whatsapp",
    temperature: "warm",
    score: 55,
    notes: "Preguntó por dije con esmeralda. Envió foto de referencia de lo que busca. Pendiente cotizar pieza personalizada.",
    whatsappPhone: "+506 8423 6671",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 3,
    lastConversationAt: ts("2026-04-09T15:00:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-04T10:30:00"),
    updatedAt: ts("2026-04-09T15:00:00"),
  },
  {
    id: cid("carlos"),
    name: "Carlos Benavides Herrera",
    email: "carlosbh@gmail.com",
    phone: "+506 7290 4418",
    company: null,
    source: "referido",
    temperature: "hot",
    score: 72,
    notes: "Referido por su hermana (clienta anterior). Busca anillo de compromiso. Presupuesto ₡70,000-₡90,000.",
    whatsappPhone: "+506 7290 4418",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 4,
    lastConversationAt: ts("2026-04-09T11:30:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-03-25T14:00:00"),
    updatedAt: ts("2026-04-09T11:30:00"),
  },
  {
    id: cid("melissa"),
    name: "Melissa Bolaños Castro",
    email: null,
    phone: null,
    company: null,
    source: "tiktok",
    temperature: "cold",
    score: 10,
    notes: "Llegó por TikTok. Comentó en video pero no ha iniciado conversación directa.",
    whatsappPhone: null,
    instagramHandle: "melissabc_",
    facebookId: null,
    preferredChannel: "instagram",
    conversationCount: 0,
    lastConversationAt: null,
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-08T22:00:00"),
    updatedAt: ts("2026-04-08T22:00:00"),
  },
  {
    id: cid("ana_lucia"),
    name: "Ana Lucía Piedra Solano",
    email: "analucia.piedra@gmail.com",
    phone: "+506 8901 2234",
    company: "Clínica Dental Piedra",
    source: "organico_web",
    temperature: "hot",
    score: 92,
    notes: "Clienta VIP. Compra frecuente para regalos corporativos y personales. Interesada en nueva colección de aretes.",
    whatsappPhone: "+506 8901 2234",
    instagramHandle: "analuciap",
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 15,
    lastConversationAt: ts("2026-04-10T07:00:00"),
    loyaltyTier: "esmeralda",
    loyaltyPoints: 5200,
    totalPurchases: 8,
    createdAt: ts("2025-11-05T09:00:00"),
    updatedAt: ts("2026-04-10T07:00:00"),
  },
  {
    id: cid("valentina"),
    name: "Valentina Mora Umaña",
    email: null,
    phone: "+506 6345 7812",
    company: null,
    source: "catalogo_whatsapp",
    temperature: "warm",
    score: 48,
    notes: "Vio catálogo WhatsApp y preguntó por disponibilidad de anillos. Pidió fotos adicionales de modelos con esmeralda pequeña.",
    whatsappPhone: "+506 6345 7812",
    instagramHandle: null,
    facebookId: null,
    preferredChannel: "whatsapp",
    conversationCount: 2,
    lastConversationAt: ts("2026-04-09T13:00:00"),
    loyaltyTier: "none",
    loyaltyPoints: 0,
    totalPurchases: 0,
    createdAt: ts("2026-04-02T10:00:00"),
    updatedAt: ts("2026-04-09T13:00:00"),
  },
];

const insertContact = sqlite.prepare(
  `INSERT INTO contacts (id, name, email, phone, company, source, temperature, score, notes,
    whatsapp_phone, instagram_handle, facebook_id, preferred_channel,
    conversation_count, last_conversation_at, loyalty_tier, loyalty_points, total_purchases,
    created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const seedContacts = sqlite.transaction(() => {
  for (const c of contacts) {
    insertContact.run(
      c.id, c.name, c.email, c.phone, c.company, c.source, c.temperature, c.score, c.notes,
      c.whatsappPhone, c.instagramHandle, c.facebookId, c.preferredChannel,
      c.conversationCount, c.lastConversationAt, c.loyaltyTier, c.loyaltyPoints, c.totalPurchases,
      c.createdAt, c.updatedAt
    );
  }
});
seedContacts();
console.log(`  ${contacts.length} contacts created.\n`);

// ---------------------------------------------------------------------------
// 4. Deals (20 deals across pipeline stages)
// ---------------------------------------------------------------------------
console.log("Creating deals...");

const dealData = [
  // Lead [Orgánico/Web]
  {
    id: uuid(),
    title: "Pulsera plata 925 - Rosa María",
    value: crc(22000),
    stageId: stageIds.leadOrganico,
    contactId: cid("rosa"),
    expectedClose: ts("2026-04-25"),
    probability: 30,
    notes: "Encontró por Google. Interesada en pulsera básica plata 925.",
    createdAt: ts("2026-04-08T09:00:00"),
    updatedAt: ts("2026-04-08T09:00:00"),
  },
  // Lead [META]
  {
    id: uuid(),
    title: "Cadena corazón - Vi CR",
    value: crc(50000),
    stageId: stageIds.leadMeta,
    contactId: cid("vi_cr"),
    expectedClose: ts("2026-04-20"),
    probability: 40,
    notes: "Preguntó '¿Precio?' por anuncio FB fb.me/iPNFxSan3. Cadena corazón ₡50,000. Sistema apartados 1/3.",
    createdAt: ts("2026-04-10T20:15:00"),
    updatedAt: ts("2026-04-10T20:15:00"),
  },
  {
    id: uuid(),
    title: "Anillo esmeralda compromiso - Diego",
    value: crc(85000),
    stageId: stageIds.leadMeta,
    contactId: cid("diego"),
    expectedClose: ts("2026-04-30"),
    probability: 45,
    notes: "Llegó por META ads. Busca anillo compromiso esmeralda colombiana certificada.",
    createdAt: ts("2026-03-28T14:00:00"),
    updatedAt: ts("2026-04-09T10:15:00"),
  },
  // Lead [TikTok]
  {
    id: uuid(),
    title: "Aretes piedra (consulta TikTok) - Patricia",
    value: crc(25000),
    stageId: stageIds.leadTiktok,
    contactId: cid("patricia"),
    expectedClose: ts("2026-05-01"),
    probability: 20,
    notes: "Vio unboxing en TikTok. Interesada en aretes pero no ha dado WhatsApp aún.",
    createdAt: ts("2026-04-06T20:10:00"),
    updatedAt: ts("2026-04-06T20:10:00"),
  },
  // Contactado
  {
    id: uuid(),
    title: "Cadena plata 925 - Chris Lopez",
    value: crc(35000),
    stageId: stageIds.contactado,
    contactId: cid("chris_lopez"),
    expectedClose: ts("2026-04-22"),
    probability: 35,
    notes: "Contactado por WhatsApp. Pidió catálogo. Enviadas opciones de cadenas.",
    createdAt: ts("2026-04-10T19:55:00"),
    updatedAt: ts("2026-04-10T19:55:00"),
  },
  {
    id: uuid(),
    title: "Aretes esmeralda regalo - Jeaustin",
    value: crc(28000),
    stageId: stageIds.contactado,
    contactId: cid("jeaustin"),
    expectedClose: ts("2026-04-18"),
    probability: 40,
    notes: "Busca regalo para su novia. Elena envió opciones de aretes y dijes.",
    createdAt: ts("2026-04-10T11:20:00"),
    updatedAt: ts("2026-04-10T11:20:00"),
  },
  {
    id: uuid(),
    title: "Dije esmeralda personalizado - Lucía",
    value: crc(38000),
    stageId: stageIds.contactado,
    contactId: cid("lucia"),
    expectedClose: ts("2026-04-28"),
    probability: 35,
    notes: "Envió foto de referencia. Pendiente cotizar pieza personalizada.",
    createdAt: ts("2026-04-09T15:00:00"),
    updatedAt: ts("2026-04-09T15:00:00"),
  },
  // Calificado
  {
    id: uuid(),
    title: "Aretes + collar catálogo - Leticia",
    value: crc(55000),
    stageId: stageIds.calificado,
    contactId: cid("leticia"),
    expectedClose: ts("2026-04-20"),
    probability: 55,
    notes: "Vio catálogo por IG. Eligió 2 opciones de aretes. Preguntó por combo con collar.",
    createdAt: ts("2026-04-10T18:30:00"),
    updatedAt: ts("2026-04-10T18:30:00"),
  },
  {
    id: uuid(),
    title: "Anillo compromiso - Carlos Benavides",
    value: crc(80000),
    stageId: stageIds.calificado,
    contactId: cid("carlos"),
    expectedClose: ts("2026-04-25"),
    probability: 60,
    notes: "Referido. Budget ₡70k-₡90k. Ya eligió 2 opciones finales. Comparando esmeraldas.",
    createdAt: ts("2026-03-25T14:00:00"),
    updatedAt: ts("2026-04-09T11:30:00"),
  },
  {
    id: uuid(),
    title: "Pulsera plata tennis - Rebeca",
    value: crc(30000),
    stageId: stageIds.calificado,
    contactId: cid("rebeca"),
    expectedClose: ts("2026-04-22"),
    probability: 50,
    notes: "Sigue interesada. Pendiente enviar opciones de pago con apartados.",
    createdAt: ts("2026-04-10T10:00:00"),
    updatedAt: ts("2026-04-10T10:00:00"),
  },
  // Propuesta Enviada
  {
    id: uuid(),
    title: "Set boda collar + aretes - Karla Jiménez",
    value: crc(120000),
    stageId: stageIds.propuestaEnviada,
    contactId: cid("karla"),
    expectedClose: ts("2026-04-18"),
    probability: 70,
    notes: "Set completo para su boda. Propuesta con 3 opciones de sets enviada. Apartado 1/3 = ₡40,000.",
    createdAt: ts("2026-04-01T09:15:00"),
    updatedAt: ts("2026-04-08T14:20:00"),
  },
  {
    id: uuid(),
    title: "Aretes regalo IG - Jeimy Ruiz",
    value: crc(24000),
    stageId: stageIds.propuestaEnviada,
    contactId: cid("jeimy"),
    expectedClose: ts("2026-04-16"),
    probability: 55,
    notes: "Propuesta enviada con 2 opciones de aretes con piedra. Esperando confirmación.",
    createdAt: ts("2026-04-10T12:55:00"),
    updatedAt: ts("2026-04-10T12:55:00"),
  },
  // Seguimiento/Negociación
  {
    id: uuid(),
    title: "Cadena esmeralda + dije - Andrea Mora",
    value: crc(75000),
    stageId: stageIds.seguimiento,
    contactId: cid("andrea_m"),
    expectedClose: ts("2026-04-14"),
    probability: 85,
    notes: "Clienta recurrente. Negociando descuento lealtad. Quiere apartado de ₡25,000 y pagar resto en 1.5 meses.",
    createdAt: ts("2026-03-15T10:00:00"),
    updatedAt: ts("2026-04-09T16:30:00"),
  },
  {
    id: uuid(),
    title: "Anillo compromiso esmeralda grande - Jesús",
    value: crc(85000),
    stageId: stageIds.seguimiento,
    contactId: cid("jesus"),
    expectedClose: ts("2026-04-15"),
    probability: 80,
    notes: "Eligió modelo. Negociando sistema apartados: 1/3 = ₡28,333. Envío Correos de CR con seguro.",
    createdAt: ts("2026-04-10T13:40:00"),
    updatedAt: ts("2026-04-10T13:40:00"),
  },
  {
    id: uuid(),
    title: "Cadena dije esmeralda lealtad - Gabriela V.",
    value: crc(45000),
    stageId: stageIds.seguimiento,
    contactId: cid("gabriela_v"),
    expectedClose: ts("2026-04-12"),
    probability: 90,
    notes: "Clienta Oro. 10% descuento aplicado = ₡40,500 final. Solo falta confirmar dirección de envío.",
    createdAt: ts("2026-04-10T08:30:00"),
    updatedAt: ts("2026-04-10T08:30:00"),
  },
  // Cerrado (won)
  {
    id: uuid(),
    title: "Set aretes + collar colección nueva - Ana Lucía",
    value: crc(95000),
    stageId: stageIds.cerrado,
    contactId: cid("ana_lucia"),
    expectedClose: ts("2026-04-05"),
    probability: 100,
    notes: "Clienta VIP Esmeralda. Compró set nueva colección. 15% descuento VIP aplicado. Envío express.",
    createdAt: ts("2026-03-28T11:00:00"),
    updatedAt: ts("2026-04-05T10:00:00"),
  },
  {
    id: uuid(),
    title: "Aretes esmeralda - Vilma Romero",
    value: crc(32000),
    stageId: stageIds.cerrado,
    contactId: cid("vilma"),
    expectedClose: ts("2026-04-10"),
    probability: 100,
    notes: "Confirmó piezas aseguradas. Pagó apartado y retiró. Envío Correos de CR con tracking.",
    createdAt: ts("2026-04-10T17:45:00"),
    updatedAt: ts("2026-04-10T17:45:00"),
  },
  {
    id: uuid(),
    title: "Pulsera plata 925 regalo - Mariela",
    value: crc(18000),
    stageId: stageIds.cerrado,
    contactId: cid("mariela"),
    expectedClose: ts("2026-04-07"),
    probability: 100,
    notes: "Vio catálogo WhatsApp, eligió pulsera, pagó completo por SINPE. Envío incluido.",
    createdAt: ts("2026-04-05T08:30:00"),
    updatedAt: ts("2026-04-07T14:00:00"),
  },
  // Perdido
  {
    id: uuid(),
    title: "Cadena plata - Luis Alberto",
    value: crc(40000),
    stageId: stageIds.perdido,
    contactId: cid("luis_alberto"),
    expectedClose: ts("2026-04-08"),
    probability: 0,
    notes: "Dijo que estaría en contacto luego. No respondió a 3 seguimientos. Marcado como perdido.",
    createdAt: ts("2026-04-10T13:25:00"),
    updatedAt: ts("2026-04-10T13:25:00"),
  },
  {
    id: uuid(),
    title: "Cadena dije - Fernando Rojas",
    value: crc(35000),
    stageId: stageIds.perdido,
    contactId: cid("fernando"),
    expectedClose: ts("2026-04-10"),
    probability: 0,
    notes: "No respondió al catálogo enviado por Messenger. 2 seguimientos sin respuesta.",
    createdAt: ts("2026-04-03T12:00:00"),
    updatedAt: ts("2026-04-10T09:00:00"),
  },
];

const insertDeal = sqlite.prepare(
  `INSERT INTO deals (id, title, value, stage_id, contact_id, expected_close, probability, notes, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const seedDeals = sqlite.transaction(() => {
  for (const d of dealData) {
    insertDeal.run(
      d.id, d.title, d.value, d.stageId, d.contactId,
      d.expectedClose, d.probability, d.notes, d.createdAt, d.updatedAt
    );
  }
});
seedDeals();
console.log(`  ${dealData.length} deals created.\n`);

// ---------------------------------------------------------------------------
// 5. Conversations (30 messages across WhatsApp/Instagram/Facebook)
// ---------------------------------------------------------------------------
console.log("Creating conversations...");

const conversationData = [
  // Vi CR - WhatsApp conversation about cadena de corazón
  {
    id: uuid(),
    contactId: cid("vi_cr"),
    platform: "whatsapp",
    externalId: "wamid_vi01",
    direction: "inbound",
    message: "¿Precio?",
    messageType: "text",
    status: "read",
    senderName: "Vi CR",
    senderPhone: "+506 6261 3497",
    createdAt: ts("2026-04-10T20:13:00"),
  },
  {
    id: uuid(),
    contactId: cid("vi_cr"),
    platform: "whatsapp",
    externalId: "wamid_vi02",
    direction: "outbound",
    message: "¡Hola! 💎 Soy Elena de Esmeraldas SOLER. ¡Gracias por tu interés! Te comparto nuestro catálogo completo aquí: wa.me/c/50687985656 ¿Cuál pieza te llamó la atención?",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T20:13:30"),
  },
  {
    id: uuid(),
    contactId: cid("vi_cr"),
    platform: "whatsapp",
    externalId: "wamid_vi03",
    direction: "inbound",
    message: "La cadena de corazón que vi en Facebook",
    messageType: "text",
    status: "read",
    senderName: "Vi CR",
    senderPhone: "+506 6261 3497",
    createdAt: ts("2026-04-10T20:14:10"),
  },
  {
    id: uuid(),
    contactId: cid("vi_cr"),
    platform: "whatsapp",
    externalId: "wamid_vi04",
    direction: "outbound",
    message: "La cadena de corazón tiene un valor de ₡50,000. Manejamos sistema de apartados: apartas con 1/3 parte del monto (₡16,667) y tenés 1 mes y medio para retirar. Los envíos son por Correos de Costa Rica con seguro y número de rastreo. ¿Te gustaría apartarla? 💚",
    messageType: "text",
    status: "delivered",
    senderName: "JS",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T20:15:00"),
  },

  // Leticia - Instagram DM conversation
  {
    id: uuid(),
    contactId: cid("leticia"),
    platform: "instagram",
    externalId: "igmid_let01",
    direction: "inbound",
    message: "Hola, me encantan sus joyas! Quisiera ver opciones de aretes",
    messageType: "text",
    status: "read",
    senderName: "Leticia Delgado Rojas",
    senderPhone: null,
    createdAt: ts("2026-04-10T18:17:00"),
  },
  {
    id: uuid(),
    contactId: cid("leticia"),
    platform: "instagram",
    externalId: "igmid_let02",
    direction: "outbound",
    message: "¡Hola Leticia! 💎 Soy Elena de Esmeraldas SOLER. ¡Qué gusto! Te muestro algunas opciones de aretes que tenemos disponibles:",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: null,
    createdAt: ts("2026-04-10T18:17:45"),
  },
  {
    id: uuid(),
    contactId: cid("leticia"),
    platform: "instagram",
    externalId: "igmid_let03",
    direction: "outbound",
    message: "[Imagen: Aretes gota esmeralda plata 925 - ₡28,000 / Aretes redondos esmeralda - ₡22,000 / Aretes largos plata - ₡18,000]",
    messageType: "image",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: null,
    createdAt: ts("2026-04-10T18:18:00"),
  },

  // Vilma - WhatsApp confirmation
  {
    id: uuid(),
    contactId: cid("vilma"),
    platform: "whatsapp",
    externalId: "wamid_vil01",
    direction: "inbound",
    message: "¿Me puede confirmar que las piezas están apartadas?",
    messageType: "text",
    status: "read",
    senderName: "Vilma Romero Brenes",
    senderPhone: "+506 7103 2110",
    createdAt: ts("2026-04-10T17:36:00"),
  },
  {
    id: uuid(),
    contactId: cid("vilma"),
    platform: "whatsapp",
    externalId: "wamid_vil02",
    direction: "outbound",
    message: "¡Sí, Vilma! Tus piezas están aseguradas. Los aretes de esmeralda ya están separados a tu nombre. Recuerda que tenés 1 mes y medio desde el apartado para retirar. Te enviaremos por Correos de Costa Rica con seguro y tracking. 💚",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T17:37:00"),
  },
  {
    id: uuid(),
    contactId: cid("vilma"),
    platform: "whatsapp",
    externalId: "wamid_vil03",
    direction: "inbound",
    message: "Perfecto, muchas gracias!",
    messageType: "text",
    status: "read",
    senderName: "Vilma Romero Brenes",
    senderPhone: "+506 7103 2110",
    createdAt: ts("2026-04-10T17:38:00"),
  },

  // Silvia - Instagram short exchange
  {
    id: uuid(),
    contactId: cid("silvia"),
    platform: "instagram",
    externalId: "igmid_sil01",
    direction: "outbound",
    message: "¡Hola Silvia! Te comparto opciones de nuestra nueva colección que te pueden gustar 💎",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: null,
    createdAt: ts("2026-04-10T14:48:00"),
  },
  {
    id: uuid(),
    contactId: cid("silvia"),
    platform: "instagram",
    externalId: "igmid_sil02",
    direction: "inbound",
    message: "¡Gracias!",
    messageType: "text",
    status: "read",
    senderName: "Silvia Castillo",
    senderPhone: null,
    createdAt: ts("2026-04-10T14:50:00"),
  },

  // Luis Alberto - Facebook Messenger
  {
    id: uuid(),
    contactId: cid("luis_alberto"),
    platform: "messenger",
    externalId: "fbmid_luis01",
    direction: "inbound",
    message: "Buenas, quisiera saber precios de cadenas",
    messageType: "text",
    status: "read",
    senderName: "Luis Alberto Quesada Fernández",
    senderPhone: null,
    createdAt: ts("2026-04-10T13:22:00"),
  },
  {
    id: uuid(),
    contactId: cid("luis_alberto"),
    platform: "messenger",
    externalId: "fbmid_luis02",
    direction: "outbound",
    message: "¡Hola Luis Alberto! Soy Elena de Esmeraldas SOLER. Nuestras cadenas en plata 925 van desde ₡25,000 hasta ₡85,000 dependiendo del diseño. ¿Te gustaría ver el catálogo completo?",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: null,
    createdAt: ts("2026-04-10T13:23:00"),
  },
  {
    id: uuid(),
    contactId: cid("luis_alberto"),
    platform: "messenger",
    externalId: "fbmid_luis03",
    direction: "inbound",
    message: "Ok, después le escribo",
    messageType: "text",
    status: "read",
    senderName: "Luis Alberto Quesada Fernández",
    senderPhone: null,
    createdAt: ts("2026-04-10T13:25:00"),
  },

  // Jesús Flores - WhatsApp about anillo compromiso
  {
    id: uuid(),
    contactId: cid("jesus"),
    platform: "whatsapp",
    externalId: "wamid_jes01",
    direction: "inbound",
    message: "Buenas tardes, estoy buscando un anillo de compromiso con esmeralda. ¿Qué opciones tienen?",
    messageType: "text",
    status: "read",
    senderName: "Jesús Flores",
    senderPhone: "+506 8703 8169",
    createdAt: ts("2026-04-10T13:24:00"),
  },
  {
    id: uuid(),
    contactId: cid("jesus"),
    platform: "whatsapp",
    externalId: "wamid_jes02",
    direction: "outbound",
    message: "¡Hola Jesús! 💍💚 ¡Qué emocionante! Tenemos anillos de compromiso con esmeralda colombiana desde ₡45,000 hasta ₡85,000 en plata 925. Te comparto nuestro catálogo: wa.me/c/50687985656",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T13:25:00"),
  },
  {
    id: uuid(),
    contactId: cid("jesus"),
    platform: "whatsapp",
    externalId: "wamid_jes03",
    direction: "inbound",
    message: "¿Tienen sistema de apartado? Y ¿cómo hacen con los envíos?",
    messageType: "text",
    status: "read",
    senderName: "Jesús Flores",
    senderPhone: "+506 8703 8169",
    createdAt: ts("2026-04-10T13:30:00"),
  },
  {
    id: uuid(),
    contactId: cid("jesus"),
    platform: "whatsapp",
    externalId: "wamid_jes04",
    direction: "outbound",
    message: "¡Claro! Manejamos sistema de apartados: apartas con 1/3 parte del monto y tenés 1 mes y medio para retirar. Los envíos son por Correos de Costa Rica con seguro y número de rastreo incluido. ¿Cuál anillo te gustó?",
    messageType: "text",
    status: "delivered",
    senderName: "JS",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T13:35:00"),
  },

  // Rebeca - WhatsApp follow-up
  {
    id: uuid(),
    contactId: cid("rebeca"),
    platform: "whatsapp",
    externalId: "wamid_reb01",
    direction: "outbound",
    message: "¡Hola Rebeca! 💎 ¿Seguís interesada en la pulsera que viste? Tenemos nuevas opciones en plata 925 que te pueden encantar.",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T09:45:00"),
  },
  {
    id: uuid(),
    contactId: cid("rebeca"),
    platform: "whatsapp",
    externalId: "wamid_reb02",
    direction: "inbound",
    message: "Sí, todavía estoy interesada. ¿Me puede enviar opciones de pago?",
    messageType: "text",
    status: "read",
    senderName: "Rebeca",
    senderPhone: "+506 8991 3761",
    createdAt: ts("2026-04-10T09:50:00"),
  },
  {
    id: uuid(),
    contactId: cid("rebeca"),
    platform: "whatsapp",
    externalId: "wamid_reb03",
    direction: "outbound",
    message: "¡Excelente! La pulsera plata 925 tiene un valor de ₡30,000. Con nuestro sistema de apartados podés apartar con ₡10,000 y tenés 1 mes y medio para completar el pago. ¿Te parece bien?",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T09:52:00"),
  },

  // Andrea Mora - WhatsApp returning customer
  {
    id: uuid(),
    contactId: cid("andrea_m"),
    platform: "whatsapp",
    externalId: "wamid_and01",
    direction: "inbound",
    message: "Hola Elena! Vi la cadena nueva con dije de esmeralda. ¿Me hacen precio especial? Ya soy clienta 😊",
    messageType: "text",
    status: "read",
    senderName: "Andrea Mora Calderón",
    senderPhone: "+506 8845 2210",
    createdAt: ts("2026-04-09T16:25:00"),
  },
  {
    id: uuid(),
    contactId: cid("andrea_m"),
    platform: "whatsapp",
    externalId: "wamid_and02",
    direction: "outbound",
    message: "¡Hola Andrea! 💚 ¡Claro que sí! Como clienta Plata tenés 5% de descuento. La cadena con dije de esmeralda está en ₡75,000, con tu descuento queda en ₡71,250. ¿Te gustaría apartarla?",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-09T16:30:00"),
  },

  // Gabriela V - WhatsApp VIP returning
  {
    id: uuid(),
    contactId: cid("gabriela_v"),
    platform: "whatsapp",
    externalId: "wamid_gab01",
    direction: "inbound",
    message: "Buenos días! Quiero la cadena con dije que combina con mis aretes que compré en febrero 💎",
    messageType: "text",
    status: "read",
    senderName: "Gabriela Villalobos Trejos",
    senderPhone: "+506 6189 3347",
    createdAt: ts("2026-04-10T08:25:00"),
  },
  {
    id: uuid(),
    contactId: cid("gabriela_v"),
    platform: "whatsapp",
    externalId: "wamid_gab02",
    direction: "outbound",
    message: "¡Buenos días Gabriela! 💚 ¡Me encanta que quieras completar tu set! Como clienta Oro tenés 10% de descuento. La cadena con dije de esmeralda en ₡45,000 te queda en ₡40,500. Solo necesito confirmar tu dirección de envío. ¿Es la misma de la última compra?",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T08:30:00"),
  },

  // Ana Lucía - WhatsApp VIP purchase completed
  {
    id: uuid(),
    contactId: cid("ana_lucia"),
    platform: "whatsapp",
    externalId: "wamid_ana01",
    direction: "inbound",
    message: "Elena, ya recibí el set! Quedó precioso 😍 ¿Cuándo llega la nueva colección?",
    messageType: "text",
    status: "read",
    senderName: "Ana Lucía Piedra Solano",
    senderPhone: "+506 8901 2234",
    createdAt: ts("2026-04-10T07:00:00"),
  },
  {
    id: uuid(),
    contactId: cid("ana_lucia"),
    platform: "whatsapp",
    externalId: "wamid_ana02",
    direction: "outbound",
    message: "¡Qué alegría Ana Lucía! 💎💚 Me encanta que te haya gustado. Como clienta Esmeralda VIP serás de las primeras en ver la nueva colección. Llega la próxima semana y te envío preview exclusivo. ¡Gracias por confiar siempre en Esmeraldas SOLER!",
    messageType: "text",
    status: "delivered",
    senderName: "Elena de Esmeraldas SOLER",
    senderPhone: "+506 8798 5656",
    createdAt: ts("2026-04-10T07:05:00"),
  },
];

const insertConversation = sqlite.prepare(
  `INSERT INTO conversations (id, contact_id, platform, external_id, direction, message, message_type, status, sender_name, sender_phone, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

const seedConversations = sqlite.transaction(() => {
  for (const c of conversationData) {
    insertConversation.run(
      c.id, c.contactId, c.platform, c.externalId, c.direction,
      c.message, c.messageType, c.status, c.senderName, c.senderPhone, c.createdAt
    );
  }
});
seedConversations();
console.log(`  ${conversationData.length} conversations created.\n`);

// ---------------------------------------------------------------------------
// 6. Activities
// ---------------------------------------------------------------------------
console.log("Creating activities...");

const activityData = [
  {
    id: uuid(),
    type: "note",
    description: "Vi CR preguntó '¿Precio?' sobre cadena de corazón desde anuncio FB (fb.me/iPNFxSan3). Elena IA respondió con catálogo. JS respondió con precio ₡50,000 y sistema de apartados.",
    contactId: cid("vi_cr"),
    dealId: dealData[1].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T20:15:00"),
    createdAt: ts("2026-04-10T20:15:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Vilma confirmó apartado de aretes con esmeralda. Pago de 1/3 recibido. Pieza asegurada. Envío pendiente por Correos de CR.",
    contactId: cid("vilma"),
    dealId: dealData[16].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T17:45:00"),
    createdAt: ts("2026-04-10T17:45:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Elena IA mostró opciones de catálogo a Leticia por Instagram DM. Interesada en aretes gota y collar combo.",
    contactId: cid("leticia"),
    dealId: dealData[7].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T18:30:00"),
    createdAt: ts("2026-04-10T18:30:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Jesús Flores preguntó por anillo de compromiso con esmeralda. Se explicó sistema de apartados y envíos por Correos de CR. Interés alto.",
    contactId: cid("jesus"),
    dealId: dealData[13].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T13:40:00"),
    createdAt: ts("2026-04-10T13:40:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Enviar seguimiento a Vi CR para confirmar si quiere apartar la cadena de corazón (₡50,000, apartado ₡16,667).",
    contactId: cid("vi_cr"),
    dealId: dealData[1].id,
    scheduledAt: ts("2026-04-11T10:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T20:15:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Seguimiento a Leticia sobre aretes y combo collar. Ofrecer descuento por primera compra.",
    contactId: cid("leticia"),
    dealId: dealData[7].id,
    scheduledAt: ts("2026-04-12T11:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T18:30:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Confirmar con Rebeca si acepta apartado de ₡10,000 para pulsera plata 925.",
    contactId: cid("rebeca"),
    dealId: dealData[9].id,
    scheduledAt: ts("2026-04-11T14:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T10:00:00"),
  },
  {
    id: uuid(),
    type: "call",
    description: "Llamada con Andrea Mora para cerrar cadena esmeralda + dije. Aceptó descuento 5% y apartado de ₡25,000. Cierre inminente.",
    contactId: cid("andrea_m"),
    dealId: dealData[12].id,
    scheduledAt: null,
    completedAt: ts("2026-04-09T17:00:00"),
    createdAt: ts("2026-04-09T17:00:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Gabriela V. (clienta Oro) solicitó cadena dije esmeralda para combinar con aretes. Descuento 10% aplicado = ₡40,500. Pendiente confirmar dirección.",
    contactId: cid("gabriela_v"),
    dealId: dealData[14].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T08:30:00"),
    createdAt: ts("2026-04-10T08:30:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Ana Lucía (VIP Esmeralda) recibió set nueva colección. Satisfecha. Preguntó por próxima colección. Enviar preview exclusivo la próxima semana.",
    contactId: cid("ana_lucia"),
    dealId: dealData[15].id,
    scheduledAt: null,
    completedAt: ts("2026-04-10T07:05:00"),
    createdAt: ts("2026-04-10T07:05:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Enviar preview nueva colección a Ana Lucía (VIP Esmeralda) antes que al público general.",
    contactId: cid("ana_lucia"),
    dealId: null,
    scheduledAt: ts("2026-04-17T09:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T07:05:00"),
  },
  {
    id: uuid(),
    type: "email",
    description: "Enviada propuesta formal con 3 opciones de sets para boda a Karla Jiménez. Set A ₡95,000 / Set B ₡110,000 / Set C ₡120,000.",
    contactId: cid("karla"),
    dealId: dealData[10].id,
    scheduledAt: null,
    completedAt: ts("2026-04-08T14:20:00"),
    createdAt: ts("2026-04-08T14:20:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Confirmar con Karla cuál set eligió para su boda. Recordar que apartado es 1/3.",
    contactId: cid("karla"),
    dealId: dealData[10].id,
    scheduledAt: ts("2026-04-12T10:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-08T14:20:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Tercer seguimiento a Luis Alberto. Si no responde, marcar lead como perdido definitivamente.",
    contactId: cid("luis_alberto"),
    dealId: dealData[18].id,
    scheduledAt: ts("2026-04-13T09:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T13:25:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Mariela compró pulsera plata 925 por ₡18,000. Pago completo por SINPE. Envío Correos de CR con tracking enviado.",
    contactId: cid("mariela"),
    dealId: dealData[17].id,
    scheduledAt: null,
    completedAt: ts("2026-04-07T14:00:00"),
    createdAt: ts("2026-04-07T14:00:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Confirmar dirección de envío con Gabriela V. para cadena dije esmeralda (₡40,500 con descuento Oro).",
    contactId: cid("gabriela_v"),
    dealId: dealData[14].id,
    scheduledAt: ts("2026-04-11T08:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-10T08:30:00"),
  },
  {
    id: uuid(),
    type: "note",
    description: "Carlos Benavides (referido) redujo opciones de anillo compromiso a 2 finales. Comparando esmeraldas de 1ct vs 1.5ct. Budget ₡70k-₡90k.",
    contactId: cid("carlos"),
    dealId: dealData[8].id,
    scheduledAt: null,
    completedAt: ts("2026-04-09T11:30:00"),
    createdAt: ts("2026-04-09T11:30:00"),
  },
  {
    id: uuid(),
    type: "follow_up",
    description: "Enviar video comparativo de esmeraldas 1ct vs 1.5ct a Carlos para facilitar decisión.",
    contactId: cid("carlos"),
    dealId: dealData[8].id,
    scheduledAt: ts("2026-04-11T15:00:00"),
    completedAt: null,
    createdAt: ts("2026-04-09T11:30:00"),
  },
];

const insertActivity = sqlite.prepare(
  `INSERT INTO activities (id, type, description, contact_id, deal_id, scheduled_at, completed_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const seedActivities = sqlite.transaction(() => {
  for (const a of activityData) {
    insertActivity.run(
      a.id, a.type, a.description, a.contactId, a.dealId,
      a.scheduledAt, a.completedAt, a.createdAt
    );
  }
});
seedActivities();
console.log(`  ${activityData.length} activities created.\n`);

// ---------------------------------------------------------------------------
// 7. Loyalty Program + Tiers
// ---------------------------------------------------------------------------
console.log("Creating loyalty program...");

const programId = uuid();
sqlite.prepare(
  `INSERT INTO loyalty_programs (id, name, description, is_active, created_at) VALUES (?, ?, ?, 1, ?)`
).run(
  programId,
  "Club Esmeralda SOLER",
  "Programa de lealtad para clientes de joyería fina - plata 925 y esmeraldas colombianas. Acumula puntos con cada compra y accede a beneficios exclusivos.",
  ts("2025-11-01T00:00:00")
);

const tiers = [
  {
    name: "Bronce",
    minPoints: 0,
    discount: 0,
    color: "#CD7F32",
    order: 1,
    benefits: JSON.stringify([
      "Acceso a catálogo exclusivo",
      "Notificaciones de nuevas piezas",
      "Garantía de autenticidad",
    ]),
  },
  {
    name: "Plata",
    minPoints: 500,
    discount: 5,
    color: "#94A3B8",
    order: 2,
    benefits: JSON.stringify([
      "5% descuento en todas las compras",
      "Envío gratis en Costa Rica",
      "Limpieza de joyas gratis 1 vez al año",
      "Acceso anticipado a promociones",
    ]),
  },
  {
    name: "Oro",
    minPoints: 1500,
    discount: 10,
    color: "#D97706",
    order: 3,
    benefits: JSON.stringify([
      "10% descuento en todas las compras",
      "Envío express gratis",
      "Acceso anticipado a colecciones nuevas",
      "Grabado personalizado gratis",
      "Limpieza de joyas gratis ilimitada",
    ]),
  },
  {
    name: "Esmeralda",
    minPoints: 5000,
    discount: 15,
    color: "#16A34A",
    order: 4,
    benefits: JSON.stringify([
      "15% descuento VIP en todas las compras",
      "Piezas exclusivas bajo pedido",
      "Consulta gemológica privada",
      "Eventos VIP y previews exclusivos",
      "Envío express gratis + seguro premium",
      "Regalo de cumpleaños sorpresa",
    ]),
  },
];

const insertTier = sqlite.prepare(
  `INSERT INTO loyalty_tiers (id, program_id, name, min_points, discount_percent, benefits, color, "order") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

const seedTiers = sqlite.transaction(() => {
  for (const t of tiers) {
    insertTier.run(uuid(), programId, t.name, t.minPoints, t.discount, t.benefits, t.color, t.order);
  }
});
seedTiers();
console.log("  Loyalty program + 4 tiers created.\n");

// ---------------------------------------------------------------------------
// 8. Loyalty Actions (for customers with purchases)
// ---------------------------------------------------------------------------
console.log("Creating loyalty actions...");

const loyaltyActionData = [
  // Andrea Mora - Plata (650 points, 3 purchases)
  { contactId: cid("andrea_m"), action: "purchase", points: 200, description: "Compra aretes esmeralda - ₡28,000", dealId: null, createdAt: ts("2026-02-10T14:00:00") },
  { contactId: cid("andrea_m"), action: "purchase", points: 250, description: "Compra cadena plata 925 - ₡35,000", dealId: null, createdAt: ts("2026-03-05T11:00:00") },
  { contactId: cid("andrea_m"), action: "referral", points: 100, description: "Refirió a Karla Jiménez Soto", dealId: null, createdAt: ts("2026-04-01T09:15:00") },
  { contactId: cid("andrea_m"), action: "purchase", points: 100, description: "Compra dije esmeralda - ₡20,000", dealId: null, createdAt: ts("2026-03-20T10:00:00") },

  // Rosa María - Bronce (180 points, 1 purchase)
  { contactId: cid("rosa"), action: "purchase", points: 150, description: "Compra pulsera plata 925 - ₡22,000", dealId: null, createdAt: ts("2026-03-25T15:00:00") },
  { contactId: cid("rosa"), action: "review", points: 30, description: "Dejó reseña 5 estrellas en Google", dealId: null, createdAt: ts("2026-03-28T10:00:00") },

  // Vilma - Bronce (120 points, 1 purchase)
  { contactId: cid("vilma"), action: "purchase", points: 120, description: "Compra aretes esmeralda - ₡32,000", dealId: dealData[16].id, createdAt: ts("2026-04-10T17:45:00") },

  // Gabriela V - Oro (1800 points, 5 purchases)
  { contactId: cid("gabriela_v"), action: "purchase", points: 300, description: "Compra set collar + aretes - ₡75,000", dealId: null, createdAt: ts("2026-01-15T10:00:00") },
  { contactId: cid("gabriela_v"), action: "purchase", points: 200, description: "Compra aretes gota - ₡28,000", dealId: null, createdAt: ts("2026-02-01T14:00:00") },
  { contactId: cid("gabriela_v"), action: "purchase", points: 350, description: "Compra cadena esmeralda grande - ₡55,000", dealId: null, createdAt: ts("2026-02-20T11:00:00") },
  { contactId: cid("gabriela_v"), action: "purchase", points: 250, description: "Compra pulsera tennis - ₡30,000", dealId: null, createdAt: ts("2026-03-10T16:00:00") },
  { contactId: cid("gabriela_v"), action: "purchase", points: 400, description: "Compra anillo esmeralda - ₡65,000", dealId: null, createdAt: ts("2026-03-28T09:00:00") },
  { contactId: cid("gabriela_v"), action: "referral", points: 100, description: "Refirió a amiga (no registrada aún)", dealId: null, createdAt: ts("2026-03-15T10:00:00") },
  { contactId: cid("gabriela_v"), action: "review", points: 50, description: "Reseña y fotos en Instagram stories", dealId: null, createdAt: ts("2026-02-25T18:00:00") },
  { contactId: cid("gabriela_v"), action: "birthday", points: 150, description: "Bono cumpleaños Oro", dealId: null, createdAt: ts("2026-03-01T00:00:00") },

  // Ana Lucía - Esmeralda (5200 points, 8 purchases)
  { contactId: cid("ana_lucia"), action: "purchase", points: 500, description: "Compra set regalo corporativo - ₡95,000", dealId: null, createdAt: ts("2025-11-20T10:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 400, description: "Compra collar esmeralda premium - ₡85,000", dealId: null, createdAt: ts("2025-12-10T11:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 350, description: "Compra aretes gota premium - ₡45,000", dealId: null, createdAt: ts("2026-01-05T14:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 600, description: "Compra anillo esmeralda grande - ₡120,000", dealId: null, createdAt: ts("2026-01-25T09:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 300, description: "Compra pulsera plata 925 premium - ₡40,000", dealId: null, createdAt: ts("2026-02-14T16:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 450, description: "Compra set regalo personal - ₡85,000", dealId: null, createdAt: ts("2026-02-28T10:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 350, description: "Compra cadena + dije especial - ₡55,000", dealId: null, createdAt: ts("2026-03-15T11:00:00") },
  { contactId: cid("ana_lucia"), action: "purchase", points: 500, description: "Compra set nueva colección - ₡95,000", dealId: dealData[15].id, createdAt: ts("2026-04-05T10:00:00") },
  { contactId: cid("ana_lucia"), action: "referral", points: 200, description: "Refirió a 2 colegas de la clínica", dealId: null, createdAt: ts("2026-01-10T10:00:00") },
  { contactId: cid("ana_lucia"), action: "referral", points: 100, description: "Refirió a paciente", dealId: null, createdAt: ts("2026-03-01T10:00:00") },
  { contactId: cid("ana_lucia"), action: "review", points: 50, description: "Reseña 5 estrellas Google Business", dealId: null, createdAt: ts("2025-12-15T10:00:00") },
  { contactId: cid("ana_lucia"), action: "review", points: 50, description: "Fotos de piezas en Instagram feed", dealId: null, createdAt: ts("2026-02-10T18:00:00") },
  { contactId: cid("ana_lucia"), action: "birthday", points: 200, description: "Bono cumpleaños Esmeralda VIP", dealId: null, createdAt: ts("2026-03-20T00:00:00") },
  { contactId: cid("ana_lucia"), action: "campaign_response", points: 50, description: "Respondió encuesta de satisfacción", dealId: null, createdAt: ts("2026-02-01T10:00:00") },

  // Mariela - purchase (no tier yet)
  { contactId: cid("mariela"), action: "purchase", points: 100, description: "Compra pulsera plata 925 - ₡18,000 (SINPE)", dealId: dealData[17].id, createdAt: ts("2026-04-07T14:00:00") },
];

const insertAction = sqlite.prepare(
  `INSERT INTO loyalty_actions (id, contact_id, action, points, description, deal_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const seedActions = sqlite.transaction(() => {
  for (const a of loyaltyActionData) {
    insertAction.run(uuid(), a.contactId, a.action, a.points, a.description, a.dealId, a.createdAt);
  }
});
seedActions();
console.log(`  ${loyaltyActionData.length} loyalty actions created.\n`);

// ---------------------------------------------------------------------------
// 9. CRM Settings
// ---------------------------------------------------------------------------
console.log("Creating CRM settings...");

const settings = [
  { key: "business_name", value: "Esmeraldas SOLER" },
  { key: "business_country", value: "Costa Rica" },
  { key: "currency", value: "CRC" },
  { key: "currency_symbol", value: "₡" },
  { key: "bot_name", value: "Elena de Esmeraldas SOLER" },
  { key: "catalog_url", value: "wa.me/c/50687985656" },
  { key: "whatsapp_number", value: "+506 8798 5656" },
  { key: "payment_method", value: "Sistema de apartados: 1/3 parte del monto, 1 mes 1/2 para retirar" },
  { key: "shipping_method", value: "Correos de Costa Rica con seguro + número de rastreo" },
  { key: "zolutium_contacts_total", value: "1165" },
  { key: "zolutium_unread_conversations", value: "102" },
];

const insertSetting = sqlite.prepare(
  `INSERT OR REPLACE INTO crm_settings (key, value) VALUES (?, ?)`
);

for (const s of settings) {
  insertSetting.run(s.key, s.value);
}
console.log(`  ${settings.length} settings created.\n`);

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------
console.log("=== Zolutium seed complete! ===");
console.log(`  Pipeline stages: ${stages.length}`);
console.log(`  Contacts: ${contacts.length}`);
console.log(`  Deals: ${dealData.length}`);
console.log(`  Conversations: ${conversationData.length}`);
console.log(`  Activities: ${activityData.length}`);
console.log(`  Loyalty actions: ${loyaltyActionData.length}`);
console.log(`  Settings: ${settings.length}`);

sqlite.close();
