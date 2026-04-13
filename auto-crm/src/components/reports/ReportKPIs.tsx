"use client";

import {
  DollarSign,
  MessageCircle,
  Eye,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Target,
} from "lucide-react";

interface ReportKPIsProps {
  totalSpend: number;
  totalMessages: number;
  totalImpressions: number;
  totalReach: number;
  avgCtr: string;
  avgCostPerMsg: number | string;
  reportsCount: number;
  spendTrend: string;
  msgTrend: string;
}

function KPICard({
  label,
  value,
  icon: Icon,
  trend,
  color,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  trend?: string;
  color: string;
}) {
  const trendValue = trend ? parseFloat(trend) : 0;
  const isPositive = trendValue > 0;

  return (
    <div className="rounded-xl border bg-card p-4 ring-1 ring-foreground/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
          {label}
        </span>
        <div className={`rounded-lg p-1.5 ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="text-xl font-bold tabular-nums">{value}</p>
      {trend && trend !== "N/A%" && trend !== "NaN%" && (
        <div className="flex items-center gap-1 mt-1">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-emerald-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span
            className={`text-xs font-medium ${
              isPositive ? "text-emerald-500" : "text-red-500"
            }`}
          >
            {trend}
          </span>
        </div>
      )}
    </div>
  );
}

export function ReportKPIs({
  totalSpend,
  totalMessages,
  totalImpressions,
  totalReach,
  avgCtr,
  avgCostPerMsg,
  reportsCount,
  spendTrend,
  msgTrend,
}: ReportKPIsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <KPICard
        label="Gasto Total"
        value={`${totalSpend.toLocaleString("es-CR")} CRC`}
        icon={DollarSign}
        trend={spendTrend}
        color="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
      />
      <KPICard
        label="Mensajes"
        value={totalMessages.toLocaleString("es-CR")}
        icon={MessageCircle}
        trend={msgTrend}
        color="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
      />
      <KPICard
        label="Impresiones"
        value={totalImpressions.toLocaleString("es-CR")}
        icon={Eye}
        color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      />
      <KPICard
        label="Alcance"
        value={totalReach.toLocaleString("es-CR")}
        icon={Target}
        color="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      />
      <KPICard
        label="CTR Promedio"
        value={avgCtr}
        icon={MousePointerClick}
        color="bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
      />
      <KPICard
        label="Costo/Mensaje"
        value={typeof avgCostPerMsg === "number" ? `${avgCostPerMsg} CRC` : avgCostPerMsg}
        icon={BarChart3}
        color="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
      />
      <KPICard
        label="Reportes"
        value={String(reportsCount)}
        icon={BarChart3}
        color="bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400"
      />
      <KPICard
        label="Gasto Diario Prom."
        value={`${Math.round(totalSpend / Math.max(reportsCount, 1)).toLocaleString("es-CR")} CRC`}
        icon={DollarSign}
        color="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
      />
    </div>
  );
}
