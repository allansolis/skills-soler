"use client";

import { useBusiness } from "@/context/BusinessContext";
import { formatCurrency, formatCompactCurrency } from "@/lib/constants";

/**
 * Hook que devuelve formatters de moneda atados al business activo.
 *
 * Usage:
 *   const { format, formatCompact, currency } = useCurrency();
 *   <span>{format(deal.value)}</span>  // → "$1,234.56" (Glass/Inversiones) o "₡123,456" (Esmeraldas/Autos)
 */
export function useCurrency() {
  const { businessConfig } = useBusiness();
  const currency = businessConfig.currency;

  return {
    currency,
    format: (cents: number) => formatCurrency(cents, currency),
    formatCompact: (cents: number) => formatCompactCurrency(cents, currency),
  };
}
