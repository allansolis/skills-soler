/**
 * Configuracion canonica de los 4 negocios del grupo Soler.
 *
 * SINGLE SOURCE OF TRUTH. Importar siempre desde aqui:
 *   - BUSINESS_CONFIGS
 *   - BUSINESS_IDS (array para validacion)
 *   - DEFAULT_BUSINESS
 *   - BusinessId (tipo)
 *
 * Antes habia 6 archivos con copias parciales que ya habian divergido
 * (ej. emoji de glass_soler era 🛡️ en unos lados y 🪟 en otros).
 */

export type BusinessId =
  | "glass_soler"
  | "esmeraldas_soler"
  | "autos_soler"
  | "inversiones_soler";

export interface BusinessConfig {
  id: BusinessId;
  name: string;
  shortName: string;
  color: string;
  emoji: string;
  currency: "USD" | "CRC";
  description: string;
  /** Puerto del bot Elena en el ecosistema n8n */
  botPort: number;
}

export const BUSINESS_CONFIGS: Record<BusinessId, BusinessConfig> = {
  glass_soler: {
    id: "glass_soler",
    name: "Glass Soler",
    shortName: "Glass",
    color: "#0EA5E9",
    emoji: "🛡️",
    currency: "USD",
    description: "Polarizado de seguridad",
    botPort: 5001,
  },
  esmeraldas_soler: {
    id: "esmeraldas_soler",
    name: "Esmeraldas Soler",
    shortName: "Esmeraldas",
    color: "#10B981",
    emoji: "💎",
    currency: "CRC",
    description: "Joyería con esmeraldas",
    botPort: 5000,
  },
  autos_soler: {
    id: "autos_soler",
    name: "Autos Soler",
    shortName: "Autos",
    color: "#F59E0B",
    emoji: "🚗",
    currency: "CRC",
    description: "Compra-venta de vehículos",
    botPort: 5002,
  },
  inversiones_soler: {
    id: "inversiones_soler",
    name: "Inversiones Soler",
    shortName: "Inversiones",
    color: "#8B5CF6",
    emoji: "🏘️",
    currency: "USD",
    description: "Asesoría inmobiliaria",
    botPort: 5003,
  },
};

export const BUSINESS_IDS: BusinessId[] = [
  "glass_soler",
  "esmeraldas_soler",
  "autos_soler",
  "inversiones_soler",
];

export const DEFAULT_BUSINESS: BusinessId = "glass_soler";

export const ALL_BUSINESSES: BusinessConfig[] = Object.values(BUSINESS_CONFIGS);

/** True si el string es un BusinessId valido */
export function isValidBusinessId(value: unknown): value is BusinessId {
  return typeof value === "string" && BUSINESS_IDS.includes(value as BusinessId);
}

/** Resolver business desde string, devolviendo DEFAULT si invalido */
export function resolveBusinessId(value: unknown): BusinessId {
  return isValidBusinessId(value) ? value : DEFAULT_BUSINESS;
}

/** Obtener config con fallback a default */
export function getBusinessConfig(id: unknown): BusinessConfig {
  return BUSINESS_CONFIGS[resolveBusinessId(id)];
}
