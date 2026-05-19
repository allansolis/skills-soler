/**
 * Notificación WhatsApp al asesor humano cuando Elena detecta hot lead.
 *
 * Configurar en .env.local:
 *   ASESOR_WA_NUMBER=50663790438       (numero del asesor con codigo pais)
 */
import { getEnv } from "./env";
import type { BusinessId } from "@/lib/businessConfig";
import { BUSINESS_CONFIGS } from "@/lib/businessConfig";

const V = getEnv("META_API_VERSION") || "v25.0";
const WA_TOKEN = getEnv("META_WA_TOKEN");
const WA_PHONE_ID = getEnv("META_WA_PHONE_ID_TEST"); // El test number tiene los 5 recipients permitidos

export interface HotLeadAlertParams {
  business: BusinessId;
  contactName: string;
  contactExternalId: string;
  platform: "messenger" | "instagram" | "whatsapp";
  userMessage: string;
  detectedReason?: string;
}

const ASESOR_BY_BUSINESS: Record<BusinessId, string | null> = {
  glass_soler: null,        // Configurar con: ASESOR_WA_GLASS
  esmeraldas_soler: null,   // ASESOR_WA_ESMERALDAS
  autos_soler: null,        // ASESOR_WA_AUTOS
  inversiones_soler: null,  // ASESOR_WA_INVERSIONES
};

function getAsesorNumber(business: BusinessId): string | null {
  // Try business-specific first, fall back to default
  const specific = getEnv(`ASESOR_WA_${business.toUpperCase().replace("_SOLER", "")}`);
  if (specific) return specific;
  return getEnv("ASESOR_WA_NUMBER") || ASESOR_BY_BUSINESS[business];
}

export async function notifyHotLead(params: HotLeadAlertParams): Promise<{
  sent: boolean;
  error?: string;
}> {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    return { sent: false, error: "WA token/phone_id missing" };
  }

  const asesor = getAsesorNumber(params.business);
  if (!asesor) {
    return { sent: false, error: `No asesor number for ${params.business}` };
  }

  const cfg = BUSINESS_CONFIGS[params.business];
  const platformEmoji = params.platform === "whatsapp" ? "💬" : params.platform === "instagram" ? "📷" : "💌";
  const text =
    `🔥 *HOT LEAD ${cfg.emoji} ${cfg.name}*\n\n` +
    `Cliente: *${params.contactName}*\n` +
    `Plataforma: ${platformEmoji} ${params.platform}\n` +
    `${params.detectedReason ? `Razón: ${params.detectedReason}\n` : ""}` +
    `\nMensaje:\n_"${params.userMessage.slice(0, 200)}"_\n\n` +
    `Entrá al CRM ya: http://localhost:3000/queue`;

  try {
    const res = await fetch(`https://graph.facebook.com/${V}/${WA_PHONE_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WA_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: asesor,
        type: "text",
        text: { body: text },
      }),
    });
    const data = await res.json();
    if (data.error) {
      return { sent: false, error: data.error.message };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}
