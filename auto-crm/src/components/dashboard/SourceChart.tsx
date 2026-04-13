"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceDistribution } from "@/types";

interface SourceChartProps {
  data: SourceDistribution[];
}

const SOURCE_COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#ea580c", // orange
  "#8b5cf6", // violet
  "#dc2626", // red
  "#0891b2", // cyan
  "#d97706", // amber
  "#64748b", // slate
  "#ec4899", // pink
  "#14b8a6", // teal
  "#6366f1", // indigo
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  return (
    <div className="rounded-xl border bg-card p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.payload.color }}
        />
        <span className="text-sm font-medium">{data.payload.label}</span>
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {data.value} contactos ({data.payload.percent}%)
      </p>
    </div>
  );
}

export function SourceChart({ data }: SourceChartProps) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const enriched = data.map((d, i) => ({
    ...d,
    color: d.color || SOURCE_COLORS[i % SOURCE_COLORS.length],
    percent: total > 0 ? Math.round((d.count / total) * 100) : 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Fuentes de Leads
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          De donde vienen tus contactos
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 || total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No hay contactos para analizar
          </p>
        ) : (
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={enriched}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {enriched.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {enriched
                .sort((a, b) => b.count - a.count)
                .slice(0, 6)
                .map((item) => (
                  <div key={item.source} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs flex-1 truncate">{item.label}</span>
                    <span className="text-xs font-medium tabular-nums">
                      {item.count}
                    </span>
                    <span className="text-[10px] text-muted-foreground w-8 text-right tabular-nums">
                      {item.percent}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
