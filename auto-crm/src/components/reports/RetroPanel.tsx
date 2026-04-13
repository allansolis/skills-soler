"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  PackageSearch,
  BookOpen,
  TrendingUp,
  RefreshCw,
  Download,
} from "lucide-react";

interface Retrospective {
  period: {
    days: number;
    from: string;
    to: string;
    reportsCount: number;
  };
  performance: {
    totalSpend_CRC: number;
    totalMessages: number;
    totalImpressions: number;
    totalReach: number;
    totalClicks: number;
    avgCtr: string;
    avgCostPerMsg: number | string;
    avgDailySpend: number;
  };
  trends: {
    spendTrend: string;
    messageTrend: string;
    direction: string;
  };
  knowledgeBase: {
    totalInsights: number;
    faqs: number;
    objections: number;
    trends: number;
    improvements: number;
  };
  inventory: {
    totalProducts: number;
    inStock: number;
    outOfStock: number;
    topProducts: Array<{ name: string; mentions: number | null; category: string }>;
  };
  recommendations: string[];
  alerts: string[];
}

interface RetroPanelProps {
  initialData: Retrospective | null;
}

export function RetroPanel({ initialData }: RetroPanelProps) {
  const [retro, setRetro] = useState<Retrospective | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState(7);

  const loadRetro = async (days: number) => {
    setLoading(true);
    setPeriod(days);
    try {
      const res = await fetch(`/api/reports/retrospective?days=${days}`);
      const data = await res.json();
      setRetro(data.retrospective);
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    window.open(`/api/reports/retrospective?days=${period}&format=csv`, "_blank");
  };

  if (!retro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            Retrospectiva IA
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground mb-4">
            Sin datos de retrospectiva. Necesitas reportes ejecutivos para generar una.
          </p>
          <Button variant="outline" onClick={() => loadRetro(7)}>
            Generar Retrospectiva (7 dias)
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          Retrospectiva IA
        </h3>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => loadRetro(d)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-card hover:bg-muted text-muted-foreground"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={downloadCSV}>
            <Download className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={() => loadRetro(period)} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Period Info */}
      <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/50 p-3">
        <p className="text-sm">
          <span className="font-medium">Periodo:</span>{" "}
          {retro.period.from} a {retro.period.to} ({retro.period.reportsCount} reportes)
        </p>
        <p className="text-sm mt-1">
          <span className="font-medium">Tendencia:</span>{" "}
          <Badge variant={retro.trends.direction === "mejorando" ? "default" : "destructive"}>
            {retro.trends.direction === "mejorando" ? "Mejorando" : "Declinando"}
          </Badge>
          <span className="ml-2 text-muted-foreground">
            Gasto {retro.trends.spendTrend} | Mensajes {retro.trends.messageTrend}
          </span>
        </p>
      </div>

      {/* KB + Inventory Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Knowledge Base Insights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-500" />
              Base de Conocimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="FAQs" value={retro.knowledgeBase.faqs} color="text-blue-600" />
              <StatBox label="Objeciones" value={retro.knowledgeBase.objections} color="text-red-600" />
              <StatBox label="Tendencias" value={retro.knowledgeBase.trends} color="text-amber-600" />
              <StatBox label="Mejoras" value={retro.knowledgeBase.improvements} color="text-emerald-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Total: {retro.knowledgeBase.totalInsights} insights en KB
            </p>
          </CardContent>
        </Card>

        {/* Inventory Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-emerald-500" />
              Inventario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <p className="text-2xl font-bold">{retro.inventory.totalProducts}</p>
                <p className="text-xs text-muted-foreground">productos</p>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-emerald-600">En stock: {retro.inventory.inStock}</span>
                  <span className="text-red-600">Agotado: {retro.inventory.outOfStock}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full"
                    style={{
                      width: `${(retro.inventory.inStock / Math.max(retro.inventory.totalProducts, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            {retro.inventory.topProducts.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Mas mencionados:</p>
                {retro.inventory.topProducts.slice(0, 3).map((p, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="truncate max-w-[70%]">{p.name}</span>
                    <Badge variant="secondary">{p.mentions || 0} menciones</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Unified Recommendations */}
      {retro.recommendations.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Recomendaciones Acumuladas ({retro.recommendations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {retro.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-muted-foreground">{String(rec)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatBox({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-lg bg-muted/50 p-2 text-center">
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
