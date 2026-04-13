"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatCompactCurrency } from "@/lib/constants";

interface StageData {
  name: string;
  count: number;
  value: number;
  color: string;
}

interface PipelineChartProps {
  data: StageData[];
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  return (
    <div className="rounded-xl border bg-card p-3 shadow-lg">
      <p className="text-sm font-semibold">{data.name}</p>
      <div className="mt-1.5 space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{data.count}</span> deals
        </p>
        <p className="text-xs text-muted-foreground">
          Valor:{" "}
          <span className="font-medium text-foreground">
            {formatCurrency(data.value)}
          </span>
        </p>
      </div>
    </div>
  );
}

export function PipelineChart({ data }: PipelineChartProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Pipeline de Ventas
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Deals por etapa con valor en colones
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No hay deals en el pipeline
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data}
              margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/50" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                className="fill-muted-foreground"
                tickFormatter={(v) => formatCompactCurrency(v * 100)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.3 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
