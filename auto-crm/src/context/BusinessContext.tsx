"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import {
  BUSINESS_CONFIGS,
  ALL_BUSINESSES,
  DEFAULT_BUSINESS,
  type BusinessId,
  type BusinessConfig,
} from "@/lib/businessConfig";

// Re-export para compatibilidad con imports existentes
export type { BusinessId, BusinessConfig };

interface BusinessContextValue {
  business: BusinessId;
  businessConfig: BusinessConfig;
  setBusiness: (id: BusinessId) => void;
  allBusinesses: BusinessConfig[];
}

const BusinessContext = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({
  children,
  initialBusiness,
}: {
  children: ReactNode;
  initialBusiness?: BusinessId;
}) {
  const [business, setBusiness] = useState<BusinessId>(initialBusiness ?? DEFAULT_BUSINESS);
  const businessConfig = BUSINESS_CONFIGS[business];

  return (
    <BusinessContext.Provider
      value={{
        business,
        businessConfig,
        setBusiness,
        allBusinesses: ALL_BUSINESSES,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) {
    return {
      business: DEFAULT_BUSINESS,
      businessConfig: BUSINESS_CONFIGS[DEFAULT_BUSINESS],
      setBusiness: () => {},
      allBusinesses: ALL_BUSINESSES,
    };
  }
  return ctx;
}
