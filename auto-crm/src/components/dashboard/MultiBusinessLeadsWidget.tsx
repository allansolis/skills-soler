"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, AlertCircle, Users, ArrowRight } from "lucide-react";

interface BotStats {
  total_leads: number;
  hot_leads: number;
  handoffs: number;
  avg_score: number;
  avg_messages: number;
}

const BUSINESS_LABELS: Record<string, { name: string; emoji: string; color: string }> = {
  glass_soler: { name: "Glass Soler", emoji: "🛡️", color: "#0EA5E9" },
  esmeraldas_soler: { name: "Esmeraldas", emoji: "💎", color: "#10B981" },
  autos_soler: { name: "Autos Soler", emoji: "🚗", color: "#F59E0B" },
  inversiones_soler: { name: "Inversiones", emoji: "🏘️", color: "#8B5CF6" },
};

export function MultiBusinessLeadsWidget() {
  const [stats, setStats] = useState<Record<string, BotStats>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/leads?business=all&view=stats");
        const data = await res.json();
        setStats(data.stats || {});
        setError(null);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalHot = Object.values(stats).reduce((sum, s) => sum + (s?.hot_leads || 0), 0);
  const totalHandoffs = Object.values(stats).reduce((sum, s) => sum + (s?.handoffs || 0), 0);

  return (
    <div className="border rounded-lg p-5 bg-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Hot Leads — 4 Elenas
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-refresh cada 30s
          </p>
        </div>
        <Link
          href="/leads"
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          Ver detalle <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          Cargando...
        </div>
      ) : error ? (
        <div className="text-sm text-red-600">{error}</div>
      ) : (
        <>
          {/* Totals */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border rounded p-3 bg-orange-50 dark:bg-orange-950/20">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3 text-orange-500" /> Hot
              </div>
              <div className="text-2xl font-bold text-orange-600">{totalHot}</div>
            </div>
            <div className="border rounded p-3 bg-red-50 dark:bg-red-950/20">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3 text-red-500" /> Handoffs
              </div>
              <div className="text-2xl font-bold text-red-600">{totalHandoffs}</div>
            </div>
          </div>

          {/* Per business */}
          <div className="space-y-2">
            {Object.entries(stats).map(([biz, s]) => {
              const label = BUSINESS_LABELS[biz] || { name: biz, emoji: "🤖", color: "#999" };
              return (
                <div
                  key={biz}
                  className="flex items-center justify-between text-sm border-l-2 pl-2"
                  style={{ borderLeftColor: label.color }}
                >
                  <span>
                    {label.emoji} {label.name}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {s?.total_leads || 0} convs
                    {(s?.hot_leads || 0) > 0 && (
                      <span className="ml-2 text-orange-600 font-medium">
                        🔥 {s.hot_leads}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
