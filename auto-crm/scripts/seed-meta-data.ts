/**
 * Seed Meta Data — Llena el CRM SOLER con datos reales de Meta + bots.
 *
 * Uso: npx tsx scripts/seed-meta-data.ts
 */
import { db } from "../src/db";
import {
  contacts,
  deals,
  pipelineStages,
  activities,
  conversations,
  crmSettings,
} from "../src/db/schema";
import { randomUUID } from "crypto";

console.log("=== Seed Meta Data — CRM SOLER ===\n");

// 1. CRM SETTINGS
console.log("[1] CRM Settings...");
const settings = [
  { key: "brand_name", value: "CRM SOLER" },
  { key: "version", value: "2.0" },
];
for (const s of settings) {
  db.insert(crmSettings).values(s).onConflictDoNothing().run();
}

// 2. PIPELINE STAGES
console.log("[2] Pipeline Stages...");
const stages = [
  { id: randomUUID(), name: "Nuevo Lead", order: 1, color: "#94A3B8", isWon: false, isLost: false },
  { id: randomUUID(), name: "Contactado", order: 2, color: "#FACC15", isWon: false, isLost: false },
  { id: randomUUID(), name: "Calificado", order: 3, color: "#F59E0B", isWon: false, isLost: false },
  { id: randomUUID(), name: "Propuesta", order: 4, color: "#FB923C", isWon: false, isLost: false },
  { id: randomUUID(), name: "Negociacion", order: 5, color: "#EF4444", isWon: false, isLost: false },
  { id: randomUUID(), name: "Ganado", order: 6, color: "#10B981", isWon: true, isLost: false },
  { id: randomUUID(), name: "Perdido", order: 7, color: "#6B7280", isWon: false, isLost: true },
];
for (const s of stages) {
  db.insert(pipelineStages).values(s).onConflictDoNothing().run();
}
const allStages = db.select().from(pipelineStages).all();

// 3. CONTACTOS (hot leads reales)
console.log("[3] Contactos...");
const contactsData = [
  // Glass Soler
  {
    name: "Pedro Soto",
    email: "pedro.soto@example.cr",
    phone: "+50687651234",
    whatsappPhone: "+50687651234",
    source: "meta_messenger",
    score: 90,
    temperature: "hot",
    notes: "[Glass Soler] Honda Civic 2019 en Curridabat - preocupado por seguridad. Pregunto Premium ₡999k. SCORE 90 HANDOFF triggered.",
    preferredChannel: "whatsapp",
    conversationCount: 1,
  },
  {
    name: "Carlos Demo",
    phone: "+50612345678",
    whatsappPhone: "+50612345678",
    source: "meta_whatsapp",
    score: 70,
    temperature: "hot",
    notes: "[Glass Soler] Escazu, Toyota Corolla 2018. Pidio paquete Premium.",
    preferredChannel: "whatsapp",
    conversationCount: 1,
  },
  {
    name: "Maria Test",
    phone: "+50687659876",
    whatsappPhone: "+50687659876",
    source: "meta_instagram",
    score: 70,
    temperature: "hot",
    notes: "[Glass Soler] Santa Ana, Honda Civic 2020. Total Security.",
    instagramHandle: "maria_test",
    preferredChannel: "instagram",
    conversationCount: 1,
  },
  {
    name: "Roberto Jimenez",
    phone: "+50687659876",
    whatsappPhone: "+50687659876",
    source: "meta_messenger",
    score: 90,
    temperature: "hot",
    notes: "[Glass Soler] Heredia, Mazda 3 2019. Premium ₡999k. Lead enriched extrajo todo.",
    preferredChannel: "whatsapp",
    conversationCount: 1,
  },
  // Esmeraldas
  {
    name: "Lucia Martinez",
    email: "lucia.martinez@example.cr",
    phone: "+50688887777",
    whatsappPhone: "+50688887777",
    source: "meta_instagram",
    score: 40,
    temperature: "warm",
    notes: "[Esmeraldas Soler] Anillo aniversario regalo esposa. Presupuesto USD 800.",
    instagramHandle: "luciamartinez",
    preferredChannel: "instagram",
    conversationCount: 1,
  },
  // Autos
  {
    name: "Diego Vega",
    email: "diego.vega@example.cr",
    phone: "+50688889999",
    whatsappPhone: "+50688889999",
    source: "meta_messenger",
    score: 45,
    temperature: "warm",
    notes: "[Autos Soler] SUV familiar USD 18000, financiamiento.",
    preferredChannel: "messenger",
    conversationCount: 1,
  },
  // Inversiones
  {
    name: "Andres Mendez",
    email: "andres.mendez@example.cr",
    phone: "+50677776666",
    whatsappPhone: "+50677776666",
    source: "meta_messenger",
    score: 50,
    temperature: "warm",
    notes: "[Inversiones Soler] Apartamento Escazu USD 250k Airbnb. ROI 8-12% objetivo.",
    preferredChannel: "messenger",
    conversationCount: 1,
  },
];

const contactIds: Record<string, string> = {};
for (const c of contactsData) {
  const id = randomUUID();
  contactIds[c.name] = id;
  try {
    db.insert(contacts).values({
      id,
      name: c.name,
      email: c.email || null,
      phone: c.phone,
      source: c.source,
      temperature: c.temperature,
      score: c.score,
      notes: c.notes,
      whatsappPhone: c.whatsappPhone,
      instagramHandle: c.instagramHandle || null,
      preferredChannel: c.preferredChannel,
      conversationCount: c.conversationCount,
      lastConversationAt: new Date(),
    } as any).run();
  } catch (e: any) {
    console.log(`  Skip ${c.name}: ${e.message?.slice(0, 80)}`);
  }
}

// 4. DEALS
console.log("[4] Deals...");
const dealsData = [
  { contactName: "Pedro Soto", title: "Paquete Premium - Honda Civic 2019", value: 999000, stage: "Calificado", probability: 60 },
  { contactName: "Roberto Jimenez", title: "Paquete Premium - Mazda 3 2019", value: 999000, stage: "Calificado", probability: 60 },
  { contactName: "Carlos Demo", title: "Paquete Premium - Toyota Corolla 2018", value: 999000, stage: "Contactado", probability: 40 },
  { contactName: "Lucia Martinez", title: "Anillo aniversario esmeralda", value: 480000, stage: "Nuevo Lead", probability: 10 },
  { contactName: "Diego Vega", title: "Honda CR-V 2021 SUV Familiar", value: 14500000, stage: "Calificado", probability: 60 },
  { contactName: "Andres Mendez", title: "Apartamento Escazu inversion", value: 150000000, stage: "Propuesta", probability: 75 },
];

for (const d of dealsData) {
  const contactId = contactIds[d.contactName];
  const stage = allStages.find((s) => s.name === d.stage);
  if (!contactId || !stage) {
    console.log(`  Skip deal ${d.title}: missing contact or stage`);
    continue;
  }
  try {
    db.insert(deals).values({
      id: randomUUID(),
      title: d.title,
      value: d.value,
      stageId: stage.id,
      contactId,
      probability: d.probability,
    } as any).run();
  } catch (e: any) {
    console.log(`  Skip deal ${d.title}: ${e.message?.slice(0, 80)}`);
  }
}

// 5. CONVERSACIONES
console.log("[5] Conversaciones...");
const convsData = [
  { contactName: "Pedro Soto", platform: "messenger", message: "Hola me llamo Pedro Soto, vivo en Curridabat, tengo un Honda Civic 2019, me preocupa la inseguridad. Cuanto cuesta el paquete Premium?", direction: "inbound" },
  { contactName: "Pedro Soto", platform: "messenger", message: "Hola Pedro, un gusto. Premium 27k micras ₡999,000...", direction: "outbound" },
  { contactName: "Lucia Martinez", platform: "instagram", message: "Soy Lucia. Busco anillo esmeralda aniversario. Presupuesto USD 800", direction: "inbound" },
  { contactName: "Lucia Martinez", platform: "instagram", message: "Hola Lucia! Que hermoso detalle. Disenos clasicos o llamativos?", direction: "outbound" },
  { contactName: "Diego Vega", platform: "messenger", message: "Busco SUV familiar USD 18000, financiamiento", direction: "inbound" },
  { contactName: "Diego Vega", platform: "messenger", message: "Hola Diego! SUV $18k con financiamiento. Ciudad o carretera?", direction: "outbound" },
  { contactName: "Andres Mendez", platform: "messenger", message: "Quiero invertir USD 250000 apartamento Escazu Airbnb. ROI?", direction: "inbound" },
  { contactName: "Andres Mendez", platform: "messenger", message: "Hola Andres! Escazu Airbnb $250k → ROI 8-12% anual bruto.", direction: "outbound" },
];

for (const c of convsData) {
  const contactId = contactIds[c.contactName];
  if (!contactId) continue;
  try {
    db.insert(conversations).values({
      id: randomUUID(),
      contactId,
      platform: c.platform,
      direction: c.direction,
      message: c.message,
      messageType: "text",
      status: "delivered",
      senderName: c.direction === "inbound" ? c.contactName : "Elena Bot",
    } as any).run();
  } catch (e: any) {
    console.log(`  Skip conv: ${e.message?.slice(0, 80)}`);
  }
}

// 6. ACTIVIDADES
console.log("[6] Actividades...");
const actsData = [
  { type: "message_received", description: "Pedro Soto envio primer mensaje WhatsApp - Honda Civic 2019", contactName: "Pedro Soto" },
  { type: "score_hot", description: "Lead Pedro escalado a HOT (score 90)", contactName: "Pedro Soto" },
  { type: "handoff_triggered", description: "Handoff disparado a humano - Pedro Soto", contactName: "Pedro Soto" },
  { type: "deal_created", description: "Deal: Paquete Premium - Honda Civic 2019 (₡999k)", contactName: "Pedro Soto" },
  { type: "message_received", description: "Lucia Martinez consulta anillo aniversario USD 800", contactName: "Lucia Martinez" },
  { type: "deal_created", description: "Deal: Honda CR-V 2021 Diego Vega ₡14.5M", contactName: "Diego Vega" },
  { type: "message_received", description: "Andres Mendez consulta inversion Escazu USD 250k", contactName: "Andres Mendez" },
  { type: "deal_created", description: "Deal: Apartamento Escazu USD 250k (₡150M)", contactName: "Andres Mendez" },
  { type: "message_received", description: "Roberto Jimenez consulta Premium para Mazda 3 2019", contactName: "Roberto Jimenez" },
  { type: "score_hot", description: "Roberto escalado HOT (score 90)", contactName: "Roberto Jimenez" },
];

for (const a of actsData) {
  const contactId = contactIds[a.contactName] || null;
  try {
    db.insert(activities).values({
      id: randomUUID(),
      type: a.type,
      description: a.description,
      contactId,
    } as any).run();
  } catch (e: any) {
    console.log(`  Skip activity: ${e.message?.slice(0, 80)}`);
  }
}

console.log("\n=== Seed completo ===");
console.log(`  ${db.select().from(pipelineStages).all().length} pipeline stages`);
console.log(`  ${db.select().from(contacts).all().length} contactos`);
console.log(`  ${db.select().from(deals).all().length} deals`);
console.log(`  ${db.select().from(conversations).all().length} conversaciones`);
console.log(`  ${db.select().from(activities).all().length} actividades`);
console.log("\nRefresca http://localhost:3000/ para ver el dashboard con datos.");
