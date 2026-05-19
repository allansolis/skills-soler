"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { TrendingUp, MessageCircle, Target, DollarSign } from "lucide-react";

interface KpiPayload {
  contacts: number;
  hotLeads: number;
  deals: {
    total: number;
    won: number;
    totalRevenue: number;
    avgTicket: number;
    conversionRate: number;
  };
  conversations: {
    inbound: number;
    outbound: number;
    responseRate: number;
  };
  cac: number | null;
}

function fmtCurrency(n: number, currency: "USD" | "CRC"): string {
  if (currency === "USD") return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return `₡${n.toLocaleString("es-CR", { maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

export function KpiWidget() {
  const { business, businessConfig } = useBusiness();
  const [data, setData] = useState<KpiPayload | null>(null);

  useEffect(() => {
    fetch(`/api/kpi?business=${business}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, [business]);

  if (!data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-4 h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Response rate",
      value: fmtPct(data.conversations.responseRate),
      icon: MessageCircle,
      detail: `${data.conversations.inbound} in / ${data.conversations.outbound} out`,
      color: data.conversations.responseRate >= 80 ? "#10B981" : data.conversations.responseRate >= 50 ? "#F59E0B" : "#EF4444",
    },
    {
      label: "Conversion rate",
      value: fmtPct(data.deals.conversionRate),
      icon: Target,
      detail: `${data.deals.won}/${data.contacts} cierre vs leads`,
      color: businessConfig.color,
    },
    {
      label: "Avg ticket",
      value: fmtCurrency(data.deals.avgTicket, businessConfig.currency),
      icon: DollarSign,
      detail: `${data.deals.won} deals ganados`,
      color: "#0EA5E9",
    },
    {
      label: "Revenue total",
      value: fmtCurrency(data.deals.totalRevenue, businessConfig.currency),
      icon: TrendingUp,
      detail: data.cac !== null ? `CAC: ${fmtCurrency(data.cac, businessConfig.currency)}` : "CAC: sin data ads",
      color: "#8B5CF6",
    },
  ];

  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        KPIs ejecutivos {businessConfig.emoji}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.label}
              className="rounded-lg border bg-card p-4 hover:bg-muted/20 transition-colors"
              style={{ borderLeftColor: c.color, borderLeftWidth: 3 }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs text-muted-foreground">{c.label}</div>
                <Icon className="h-3.5 w-3.5" style={{ color: c.color }} />
              </div>
              <div className="text-xl font-bold tabular-nums">{c.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{c.detail}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
