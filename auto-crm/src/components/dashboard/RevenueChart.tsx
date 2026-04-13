"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCompactCurrency } from "@/lib/constants";
import type { MonthlyMetric } from "@/types";

interface RevenueChartProps {
  data: MonthlyMetric[];
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold mb-1.5">{label}</p>
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">
            {entry.name === "Ingresos"
              ? formatCompactCurrency(entry.value * 100)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart({ data }: RevenueChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    revenueDisplay: d.revenue / 100,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Tendencia Mensual
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Ingresos, contactos y deals por mes
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Aun no hay datos suficientes para mostrar tendencias
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
            >
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradContacts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => formatCompactCurrency(v * 100)}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenueDisplay"
                name="Ingresos"
                stroke="#16a34a"
                strokeWidth={2.5}
                fill="url(#gradRevenue)"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="contacts"
                name="Contactos"
                stroke="#2563eb"
                strokeWidth={1.5}
                fill="url(#gradContacts)"
                strokeDasharray="4 2"
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="deals"
                name="Deals"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                fill="none"
                strokeDasharray="2 2"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
