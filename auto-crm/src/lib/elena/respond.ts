/**
 * Elena response generator usando Anthropic Messages API.
 * - Toma historial de la conversacion (ultimos N mensajes)
 * - Aplica system prompt segun business
 * - Devuelve texto de respuesta + signals (hot lead, escalate)
 */
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { conversations } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import type { BusinessId } from "@/lib/businessConfig";
import { buildSystemPrompt, getPersona } from "./config";
import { getEnv } from "./env";

// IMPORTANTE: en Windows, process.env puede traer ANTHROPIC_API_KEY="" del sistema
// que sobreescribe la del .env.local. Usar getEnv() que cae a leer el archivo.
const API_KEY = getEnv("ANTHROPIC_API_KEY");
const MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-5";

const anthropic = new Anthropic({ apiKey: API_KEY });
const MAX_TOKENS = 500;
const HISTORY_LIMIT = 20;

export interface ElenaResponse {
  text: string;
  hotLead: boolean;
  shouldEscalate: boolean;
  reason?: string;
}

const HOT_LEAD_KEYWORDS = [
  "comprar hoy", "comprar ya", "necesito ahora", "urgente",
  "visitar", "ver en persona", "agendar cita", "test drive",
  "presupuesto", "financiamiento", "cotizacion formal",
  "transferir", "pagar hoy", "depositar",
];

const ESCALATION_KEYWORDS = [
  "humano", "persona real", "asesor", "vendedor", "operador",
  "no es bot", "no eres real",
];

function detectSignals(userMessage: string, response: string): { hotLead: boolean; shouldEscalate: boolean; reason?: string } {
  const lower = userMessage.toLowerCase();
  const hotLead = HOT_LEAD_KEYWORDS.some((k) => lower.includes(k));
  const explicitEscalate = ESCALATION_KEYWORDS.some((k) => lower.includes(k));

  // Si la respuesta contiene la frase del prompt sobre escalar
  const responseSuggestsEscalate = /asesor humano|equipo te contact|te llaman|te contacto un asesor/i.test(response);

  return {
    hotLead,
    shouldEscalate: explicitEscalate || responseSuggestsEscalate,
    reason: hotLead ? "hot lead keyword detected" : explicitEscalate ? "user asked for human" : undefined,
  };
}

interface HistoryMessage {
  direction: "inbound" | "outbound";
  message: string;
  createdAt: Date;
}

function loadHistory(contactId: string, business: BusinessId): HistoryMessage[] {
  const rows = db
    .select({
      direction: conversations.direction,
      message: conversations.message,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(and(eq(conversations.contactId, contactId), eq(conversations.business, business)))
    .orderBy(desc(conversations.createdAt))
    .limit(HISTORY_LIMIT)
    .all();
  // Reverse to chronological (oldest first)
  return rows.reverse().map((r) => ({
    direction: r.direction as "inbound" | "outbound",
    message: r.message || "",
    createdAt: r.createdAt as Date,
  }));
}

export async function generateResponse(opts: {
  business: BusinessId;
  contactId: string;
  userMessage: string;
  contactName?: string;
}): Promise<ElenaResponse> {
  const persona = getPersona(opts.business);

  if (!API_KEY) {
    console.warn("[elena] ANTHROPIC_API_KEY missing, returning fallback");
    return {
      text: persona.greeting,
      hotLead: false,
      shouldEscalate: false,
    };
  }

  // Cargar contexto: ultimos mensajes
  const history = loadHistory(opts.contactId, opts.business);

  // Construir mensajes para Anthropic (excluir el mensaje actual que ya esta en DB)
  // Asume que el mensaje del usuario YA fue insertado por el webhook
  const messages: Anthropic.MessageParam[] = [];

  // El historial puede contener el mensaje del usuario actual al final
  for (const h of history) {
    if (!h.message) continue;
    messages.push({
      role: h.direction === "inbound" ? "user" : "assistant",
      content: h.message,
    });
  }

  // Si el ultimo mensaje no es del usuario, agregar el actual
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    messages.push({ role: "user", content: opts.userMessage });
  }

  try {
    const completion = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: buildSystemPrompt(opts.business),
      messages,
    });

    const responseText = completion.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { type: "text"; text: string }).text)
      .join("\n")
      .trim();

    const signals = detectSignals(opts.userMessage, responseText);

    return {
      text: responseText || persona.greeting,
      hotLead: signals.hotLead,
      shouldEscalate: signals.shouldEscalate,
      reason: signals.reason,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isCredit = /credit balance|insufficient_quota|billing/i.test(msg);
    console.error(`[elena] Anthropic API error (${isCredit ? "BILLING" : "OTHER"}):`, msg);
    return {
      text: persona.greeting,
      hotLead: false,
      shouldEscalate: true,
      reason: isCredit ? "anthropic billing" : "anthropic api error",
    };
  }
}
