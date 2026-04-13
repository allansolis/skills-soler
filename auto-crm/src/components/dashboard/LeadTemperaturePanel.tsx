"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, Sun, Snowflake } from "lucide-react";

interface LeadTemperaturePanelProps {
  hot: number;
  warm: number;
  cold: number;
}

export function LeadTemperaturePanel({
  hot,
  warm,
  cold,
}: LeadTemperaturePanelProps) {
  const total = hot + warm + cold;
  const hotPct = total > 0 ? Math.round((hot / total) * 100) : 0;
  const warmPct = total > 0 ? Math.round((warm / total) * 100) : 0;
  const coldPct = total > 0 ? 100 - hotPct - warmPct : 0;

  const segments = [
    {
      label: "Calientes",
      count: hot,
      pct: hotPct,
      icon: Flame,
      color: "text-red-500",
      barColor: "bg-red-500",
      bgColor: "bg-red-50 dark:bg-red-950/40",
    },
    {
      label: "Tibios",
      count: warm,
      pct: warmPct,
      icon: Sun,
      color: "text-amber-500",
      barColor: "bg-amber-500",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "Frios",
      count: cold,
      pct: coldPct,
      icon: Snowflake,
      color: "text-blue-500",
      barColor: "bg-blue-400",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Temperatura de Leads
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {total} contactos clasificados
        </p>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No hay leads clasificados
          </p>
        ) : (
          <div className="space-y-4">
            {/* Barra apilada */}
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              {hotPct > 0 && (
                <div
                  className="bg-red-500 transition-all duration-500"
                  style={{ width: `${hotPct}%` }}
                />
              )}
              {warmPct > 0 && (
                <div
                  className="bg-amber-500 transition-all duration-500"
                  style={{ width: `${warmPct}%` }}
                />
              )}
              {coldPct > 0 && (
                <div
                  className="bg-blue-400 transition-all duration-500"
                  style={{ width: `${coldPct}%` }}
                />
              )}
            </div>

            {/* Desglose */}
            <div className="space-y-2.5">
              {segments.map((seg) => (
                <div
                  key={seg.label}
                  className={`flex items-center gap-3 p-2.5 rounded-lg ${seg.bgColor}`}
                >
                  <seg.icon className={`h-4 w-4 ${seg.color} shrink-0`} />
                  <span className="text-sm flex-1">{seg.label}</span>
                  <span className="text-sm font-bold tabular-nums">
                    {seg.count}
                  </span>
                  <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                    {seg.pct}%
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
