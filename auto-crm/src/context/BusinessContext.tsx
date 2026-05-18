"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export type BusinessId =
  | "glass_soler"
  | "esmeraldas_soler"
  | "autos_soler"
  | "inversiones_soler";

export interface BusinessConfig {
  id: BusinessId;
  name: string;
  color: string;
  emoji: string;
  currency: "USD" | "CRC";
  description: string;
}

const BUSINESS_CONFIGS: Record<BusinessId, BusinessConfig> = {
  glass_soler: {
    id: "glass_soler",
    name: "Glass Soler",
    color: "#0EA5E9",
    emoji: "🛡️",
    currency: "USD",
    description: "Polarizado de seguridad",
  },
  esmeraldas_soler: {
    id: "esmeraldas_soler",
    name: "Esmeraldas Soler",
    color: "#10B981",
    emoji: "💎",
    currency: "CRC",
    description: "Joyería con esmeraldas",
  },
  autos_soler: {
    id: "autos_soler",
    name: "Autos Soler",
    color: "#F59E0B",
    emoji: "🚗",
    currency: "CRC",
    description: "Compra-venta de vehículos",
  },
  inversiones_soler: {
    id: "inversiones_soler",
    name: "Inversiones Soler",
    color: "#8B5CF6",
    emoji: "🏘️",
    currency: "USD",
    description: "Asesoría inmobiliaria",
  },
};

interface BusinessContextValue {
  business: BusinessId;
  businessConfig: BusinessConfig;
  setBusiness: (id: BusinessId) => void;
  allBusinesses: BusinessConfig[];
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const [business, setBusiness] = useState<BusinessId>("glass_soler");
  const businessConfig = BUSINESS_CONFIGS[business];

  return (
    <BusinessContext.Provider
      value={{
        business,
        businessConfig,
        setBusiness,
        allBusinesses: Object.values(BUSINESS_CONFIGS),
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    // Fallback for SSR / unwrapped usage — return default Glass
    return {
      business: "glass_soler" as BusinessId,
      businessConfig: BUSINESS_CONFIGS.glass_soler,
      setBusiness: () => {},
      allBusinesses: Object.values(BUSINESS_CONFIGS),
    };
  }
  return ctx;
}
