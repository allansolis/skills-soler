"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Briefcase,
  DollarSign,
  Flame,
  TrendingUp,
  TrendingDown,
  Target,
  Trophy,
  Thermometer,
  BarChart3,
} from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/constants";
import type { DashboardStats } from "@/types";

interface KPICardsProps {
  stats: DashboardStats;
}

interface KPICardData {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Users;
  color: string;
  bgColor: string;
  borderColor: string;
  trend?: { value: string; positive: boolean };
}

export function KPICards({ stats }: KPICardsProps) {
  const winRate =
    stats.totalDeals > 0
      ? Math.round((stats.wonDealsCount / stats.totalDeals) * 100)
      : 0;

  const cards: KPICardData[] = [
    {
      title: "Total Contactos",
      value: stats.totalContacts.toString(),
      subtitle: `${stats.hotLeads} calientes`,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/50",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Deals Activos",
      value: stats.activeDeals.toString(),
      subtitle: `de ${stats.totalDeals} totales`,
      icon: Briefcase,
      color: "text-violet-600 dark:text-violet-400",
      bgColor: "bg-violet-50 dark:bg-violet-950/50",
      borderColor: "border-l-violet-500",
    },
    {
      title: "Pipeline Activo",
      value: formatCurrency(stats.totalPipelineValue),
      subtitle: "en negociacion",
      icon: BarChart3,
      color: "text-amber-600 dark:text-amber-400",
      bgColor: "bg-amber-50 dark:bg-amber-950/50",
      borderColor: "border-l-amber-500",
    },
    {
      title: "Ingresos Cerrados",
      value: formatCurrency(stats.wonDealsValue),
      subtitle: `${stats.wonDealsCount} deals ganados`,
      icon: Trophy,
      color: "text-emerald-600 dark:text-emerald-400",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/50",
      borderColor: "border-l-emerald-500",
    },
    {
      title: "Tasa de Conversion",
      value: formatPercent(stats.conversionRate),
      subtitle: `win rate: ${formatPercent(winRate)}`,
      icon: Target,
      color: "text-cyan-600 dark:text-cyan-400",
      bgColor: "bg-cyan-50 dark:bg-cyan-950/50",
      borderColor: "border-l-cyan-500",
    },
    {
      title: "Deal Promedio",
      value: formatCurrency(stats.avgDealValue),
      subtitle: "valor medio por deal",
      icon: DollarSign,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-green-50 dark:bg-green-950/50",
      borderColor: "border-l-green-500",
    },
    {
      title: "Leads Calientes",
      value: stats.hotLeads.toString(),
      subtitle: `${stats.warmLeads} tibios · ${stats.coldLeads} frios`,
      icon: Flame,
      color: "text-red-600 dark:text-red-400",
      bgColor: "bg-red-50 dark:bg-red-950/50",
      borderColor: "border-l-red-500",
    },
    {
      title: "Deals Perdidos",
      value: stats.lostDeals.toString(),
      subtitle: formatCurrency(stats.lostDealsValue) + " perdidos",
      icon: TrendingDown,
      color: "text-slate-600 dark:text-slate-400",
      bgColor: "bg-slate-50 dark:bg-slate-800/50",
      borderColor: "border-l-slate-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card
          key={card.title}
          className={`border-l-4 ${card.borderColor} hover:shadow-md transition-shadow duration-200`}
        >
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {card.title}
                </p>
                <p className="text-2xl font-bold mt-1 tracking-tight">
                  {card.value}
                </p>
                {card.subtitle && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {card.subtitle}
                  </p>
                )}
              </div>
              <div className={`rounded-xl p-2.5 ${card.bgColor} shrink-0`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
