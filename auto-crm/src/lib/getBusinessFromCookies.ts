/**
 * Helper para leer business actual desde cookie en server components y API routes.
 *
 * Usage:
 *   import { getBusinessFromCookies } from "@/lib/getBusinessFromCookies";
 *   const business = await getBusinessFromCookies();
 */
import { cookies } from "next/headers";
import {
  BUSINESS_CONFIGS,
  DEFAULT_BUSINESS,
  isValidBusinessId,
  type BusinessId,
} from "./businessConfig";

export type { BusinessId };

export async function getBusinessFromCookies(): Promise<BusinessId> {
  try {
    const cookieStore = await cookies();
    const v = cookieStore.get("business")?.value;
    if (isValidBusinessId(v)) return v;
  } catch {
    // ignore
  }
  return DEFAULT_BUSINESS;
}

/** Compatibilidad con codigo viejo. Internamente usa BUSINESS_CONFIGS. */
export const BUSINESS_LABELS = {
  glass_soler: {
    name: BUSINESS_CONFIGS.glass_soler.name,
    emoji: BUSINESS_CONFIGS.glass_soler.emoji,
    color: BUSINESS_CONFIGS.glass_soler.color,
  },
  esmeraldas_soler: {
    name: BUSINESS_CONFIGS.esmeraldas_soler.name,
    emoji: BUSINESS_CONFIGS.esmeraldas_soler.emoji,
    color: BUSINESS_CONFIGS.esmeraldas_soler.color,
  },
  autos_soler: {
    name: BUSINESS_CONFIGS.autos_soler.name,
    emoji: BUSINESS_CONFIGS.autos_soler.emoji,
    color: BUSINESS_CONFIGS.autos_soler.color,
  },
  inversiones_soler: {
    name: BUSINESS_CONFIGS.inversiones_soler.name,
    emoji: BUSINESS_CONFIGS.inversiones_soler.emoji,
    color: BUSINESS_CONFIGS.inversiones_soler.color,
  },
} as const;
