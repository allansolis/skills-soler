import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "crm.db");

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const sqlite = new Database(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

console.log("Seeding Esmeraldas SOLER CRM...");

// Get pipeline stages
const stages = sqlite
  .prepare('SELECT id, name FROM pipeline_stages ORDER BY "order"')
  .all() as Array<{ id: string; name: string }>;

if (stages.length === 0) {
  console.error(
    "No pipeline stages found. Run the app first to create default stages."
  );
  process.exit(1);
}

const stageMap = new Map(stages.map((s) => [s.name, s.id]));
const now = Math.floor(Date.now() / 1000);
const day = 86400;

// Seed contacts - Clientas reales de joyeria en Costa Rica
const contacts = [
  {
    id: crypto.randomUUID(),
    name: "Valeria Mora Jimenez",
    email: "valeria.mora@gmail.com",
    phone: "+506 8845 1234",
    company: "",
    source: "meta_ads",
    temperature: "hot",
    score: 92,
    notes: "Llego por anuncio 'Belleza verde'. Pregunto por anillo de compromiso con esmeralda. Budget alto, quiere algo unico para su aniversario. Ya vio 3 anillos del catalogo.",
    created_at: now - 2 * day,
    updated_at: now,
  },
  {
    id: crypto.randomUUID(),
    name: "Carolina Rojas Vargas",
    email: "caro.rojas88@hotmail.com",
    phone: "+506 7012 5678",
    company: "",
    source: "instagram_dm",
    temperature: "hot",
    score: 85,
    notes: "Nos escribio por IG DM. Quiere set collar + aretes para regalo Dia de la Madre. Pidio fotos de los sets disponibles. Responde rapido.",
    created_at: now - 3 * day,
    updated_at: now - 1 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Andrea Solano Castro",
    email: "andrea.solano@outlook.com",
    phone: "+506 6134 9012",
    company: "Boutique Esmeralda CR",
    source: "whatsapp",
    temperature: "warm",
    score: 65,
    notes: "Duena de boutique en Escazu. Interesada en compra mayoreo. Pidio catalogo completo y precios especiales. Potencial distribuidor.",
    created_at: now - 5 * day,
    updated_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Maria Fernanda Arias",
    email: "mafe.arias@gmail.com",
    phone: "+506 8567 3456",
    company: "",
    source: "meta_ads",
    temperature: "warm",
    score: 55,
    notes: "Anuncio 'Cadena Plata 925'. Pregunto precio pero no ha respondido al follow-up. Le gusto la cadena con dije de esmeralda pequena.",
    created_at: now - 7 * day,
    updated_at: now - 4 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Daniela Chaves Herrera",
    email: "",
    phone: "+506 7289 6789",
    company: "",
    source: "facebook_messenger",
    temperature: "warm",
    score: 50,
    notes: "Llego por Messenger. Pregunto si las esmeraldas son certificadas. Le enviamos info de autenticidad. Comparando con otra joyeria.",
    created_at: now - 4 * day,
    updated_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Gabriela Mendez Soto",
    email: "gabymendez@icloud.com",
    phone: "+506 8901 2345",
    company: "",
    source: "referido",
    temperature: "hot",
    score: 78,
    notes: "Referida por Valeria. Quiere pulsera tennis para su graduacion. Ya eligio modelo SOLER-PUL-001. Pregunto por facilidades de pago.",
    created_at: now - 1 * day,
    updated_at: now,
  },
  {
    id: crypto.randomUUID(),
    name: "Isabella Vindas Mora",
    email: "isa.vindas@gmail.com",
    phone: "+506 6456 7890",
    company: "",
    source: "catalogo_whatsapp",
    temperature: "cold",
    score: 30,
    notes: "Vio catalogo WhatsApp. Pregunto precios generales pero dijo que 'solo estaba viendo'. Follow-up en 2 semanas.",
    created_at: now - 10 * day,
    updated_at: now - 10 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Stephanie Brenes Quesada",
    email: "steph.brenes@yahoo.com",
    phone: "+506 8234 5678",
    company: "",
    source: "organico",
    temperature: "cold",
    score: 20,
    notes: "Encontro perfil de IG por busqueda. Dio like a 5 posts pero no ha escrito. Posible lead futuro.",
    created_at: now - 14 * day,
    updated_at: now - 14 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Laura Pacheco Zuniga",
    email: "laurapz@gmail.com",
    phone: "+506 7678 1234",
    company: "",
    source: "meta_ads",
    temperature: "hot",
    score: 88,
    notes: "Clienta recurrente. Ya compro aretes en febrero. Ahora quiere anillo con esmeralda grande para ella misma. 'Me lo merezco', dijo. Alta probabilidad.",
    created_at: now - 30 * day,
    updated_at: now - 1 * day,
  },
  {
    id: crypto.randomUUID(),
    name: "Natalia Campos Rivera",
    email: "natcampos@gmail.com",
    phone: "+506 8345 6789",
    company: "",
    source: "instagram_dm",
    temperature: "warm",
    score: 45,
    notes: "Pregunto por piedras sueltas. Quiere comprar esmeralda para montar en anillo propio. Le enviamos opciones SOLER-PIE. Esperando respuesta.",
    created_at: now - 6 * day,
    updated_at: now - 3 * day,
  },
];

const insertContact = sqlite.prepare(
  `INSERT OR IGNORE INTO contacts (id, name, email, phone, company, source, temperature, score, notes, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const c of contacts) {
  insertContact.run(
    c.id,
    c.name,
    c.email,
    c.phone,
    c.company,
    c.source,
    c.temperature,
    c.score,
    c.notes,
    c.created_at,
    c.updated_at
  );
}

console.log(`Created ${contacts.length} contacts`);

// Seed deals - Ventas de joyeria con precios en CRC
const dealData = [
  {
    id: crypto.randomUUID(),
    title: "Anillo Compromiso Esmeralda - Valeria",
    value: 175000,
    stage_id: stageMap.get("Negociacion") || stages[4].id,
    contact_id: contacts[0].id,
    expected_close: now + 3 * day,
    probability: 90,
    notes: "Eligio SOLER-ANI-003. Pidio grabado personalizado. Negociando precio final. Muy probable cierre esta semana.",
    created_at: now - 2 * day,
    updated_at: now,
  },
  {
    id: crypto.randomUUID(),
    title: "Set Collar + Aretes Dia Madre - Carolina",
    value: 100000,
    stage_id: stageMap.get("Cotizacion Enviada") || stages[3].id,
    contact_id: contacts[1].id,
    expected_close: now + 5 * day,
    probability: 75,
    notes: "Le enviamos fotos del Set SOLER-SET-001 y SOLER-SET-002. Comparando ambos. Dia de la Madre es su deadline.",
    created_at: now - 3 * day,
    updated_at: now - 1 * day,
  },
  {
    id: crypto.randomUUID(),
    title: "Pedido Mayoreo - Boutique Esmeralda CR",
    value: 450000,
    stage_id: stageMap.get("Interesado") || stages[2].id,
    contact_id: contacts[2].id,
    expected_close: now + 20 * day,
    probability: 45,
    notes: "Quiere 5 cadenas + 3 pares aretes para su boutique. Pidio precios mayoreo con 25% descuento. Potencial cliente recurrente grande.",
    created_at: now - 5 * day,
    updated_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    title: "Pulsera Tennis Graduacion - Gabriela",
    value: 125000,
    stage_id: stageMap.get("Cotizacion Enviada") || stages[3].id,
    contact_id: contacts[5].id,
    expected_close: now + 7 * day,
    probability: 70,
    notes: "SOLER-PUL-001. Pregunto por pago en 2 tractos. Graduacion es en 2 semanas.",
    created_at: now - 1 * day,
    updated_at: now,
  },
  {
    id: crypto.randomUUID(),
    title: "Anillo Esmeralda Grande - Laura (recurrente)",
    value: 250000,
    stage_id: stageMap.get("Negociacion") || stages[4].id,
    contact_id: contacts[8].id,
    expected_close: now + 5 * day,
    probability: 85,
    notes: "Clienta recurrente, ya compro antes. SOLER-ANI-007 esmeralda 2ct. Le ofrecimos 10% descuento lealtad.",
    created_at: now - 5 * day,
    updated_at: now - 1 * day,
  },
  {
    id: crypto.randomUUID(),
    title: "Cadena Dije Esmeralda - Maria Fernanda",
    value: 65000,
    stage_id: stageMap.get("Elena Respondio") || stages[1].id,
    contact_id: contacts[3].id,
    expected_close: now + 14 * day,
    probability: 30,
    notes: "SOLER-CAD-002. Elena le envio fotos pero no responde desde hace 3 dias. Programar follow-up.",
    created_at: now - 7 * day,
    updated_at: now - 4 * day,
  },
];

const insertDeal = sqlite.prepare(
  `INSERT OR IGNORE INTO deals (id, title, value, stage_id, contact_id, expected_close, probability, notes, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const d of dealData) {
  insertDeal.run(
    d.id,
    d.title,
    d.value,
    d.stage_id,
    d.contact_id,
    d.expected_close,
    d.probability,
    d.notes,
    d.created_at,
    d.updated_at
  );
}

console.log(`Created ${dealData.length} deals`);

// Seed activities - Interacciones tipicas de venta de joyeria
const activityData = [
  {
    id: crypto.randomUUID(),
    type: "note",
    description: "Lead llego por anuncio 'Belleza verde, lujo eterno'. Pregunto directamente por anillos de compromiso. Elena IA envio 3 opciones del catalogo con fotos.",
    contact_id: contacts[0].id,
    deal_id: dealData[0].id,
    scheduled_at: null,
    completed_at: now - 2 * day,
    created_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "call",
    description: "WhatsApp call con Valeria. Confirmo que quiere SOLER-ANI-003, pidio grabado 'V+A'. Acorde precio 175,000 CRC con envio gratis.",
    contact_id: contacts[0].id,
    deal_id: dealData[0].id,
    scheduled_at: null,
    completed_at: now - 1 * day,
    created_at: now - 1 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "note",
    description: "Carolina pidio ver set collar+aretes en video. Elena IA le envio video del SOLER-SET-001 (plata 925 + 3 esmeraldas). Dijo 'hermoso!' y pregunto por precio.",
    contact_id: contacts[1].id,
    deal_id: dealData[1].id,
    scheduled_at: null,
    completed_at: now - 2 * day,
    created_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "email",
    description: "Enviado catalogo mayoreo PDF a Andrea de Boutique Esmeralda CR con precios especiales y condiciones de distribucion.",
    contact_id: contacts[2].id,
    deal_id: dealData[2].id,
    scheduled_at: null,
    completed_at: now - 3 * day,
    created_at: now - 3 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "follow_up",
    description: "Enviar mensaje a Maria Fernanda preguntando si le gusto la cadena SOLER-CAD-002. Ofrecer 10% descuento si confirma esta semana.",
    contact_id: contacts[3].id,
    deal_id: dealData[5].id,
    scheduled_at: now + 1 * day,
    completed_at: null,
    created_at: now,
  },
  {
    id: crypto.randomUUID(),
    type: "note",
    description: "Daniela pregunto por certificado de autenticidad de esmeraldas. Le enviamos foto del certificado colombiano y video del proceso de seleccion.",
    contact_id: contacts[4].id,
    deal_id: null,
    scheduled_at: null,
    completed_at: now - 2 * day,
    created_at: now - 2 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "follow_up",
    description: "Confirmar con Gabriela si acepta pago en 2 tractos para pulsera tennis. Recordar que graduacion es en 2 semanas.",
    contact_id: contacts[5].id,
    deal_id: dealData[3].id,
    scheduled_at: now + 2 * day,
    completed_at: null,
    created_at: now,
  },
  {
    id: crypto.randomUUID(),
    type: "note",
    description: "Laura (clienta recurrente) vio stories de IG con anillos nuevos. Escribio: 'Ese anillo con la esmeralda grande es para mi!' Score subio a 88.",
    contact_id: contacts[8].id,
    deal_id: dealData[4].id,
    scheduled_at: null,
    completed_at: now - 3 * day,
    created_at: now - 3 * day,
  },
  {
    id: crypto.randomUUID(),
    type: "follow_up",
    description: "Enviar fotos de piedras sueltas que llegaron esta semana a Natalia. Tiene interes en esmeralda 1.5ct para montar en su propio anillo.",
    contact_id: contacts[9].id,
    deal_id: null,
    scheduled_at: now + 3 * day,
    completed_at: null,
    created_at: now,
  },
  {
    id: crypto.randomUUID(),
    type: "follow_up",
    description: "Re-contactar a Isabella en 2 semanas. Solo estaba viendo pero mostro interes en aretes. Enviar promo Dia de la Madre.",
    contact_id: contacts[6].id,
    deal_id: null,
    scheduled_at: now + 14 * day,
    completed_at: null,
    created_at: now,
  },
];

const insertActivity = sqlite.prepare(
  `INSERT OR IGNORE INTO activities (id, type, description, contact_id, deal_id, scheduled_at, completed_at, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
);

for (const a of activityData) {
  insertActivity.run(
    a.id,
    a.type,
    a.description,
    a.contact_id,
    a.deal_id,
    a.scheduled_at,
    a.completed_at,
    a.created_at
  );
}

console.log(`Created ${activityData.length} activities`);
console.log("Esmeraldas SOLER seed complete!");

sqlite.close();
