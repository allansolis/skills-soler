"use client";

import { useState, useEffect } from "react";
import { useBusiness, BusinessId } from "@/context/BusinessContext";
import { BUSINESS_CONFIGS } from "@/lib/businessConfig";
import { Flame, Users, TrendingUp, AlertCircle } from "lucide-react";

interface Lead {
  user_id: string;
  business: string;
  score: number;
  messages_count: number;
  created_at?: string;
  last_update?: string;
  handoff_triggered?: boolean;
  handoff_at?: string;
  signals_history?: Array<{
    timestamp: string;
    delta: number;
    signals: string[];
    message_preview: string;
  }>;
}

interface BusinessStats {
  total_leads: number;
  hot_leads: number;
  handoffs: number;
  avg_score: number;
  avg_messages: number;
}

// Derivar labels desde el config canonico para evitar drift
const BUSINESS_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(BUSINESS_CONFIGS).map((c) => [c.id, `${c.emoji} ${c.name}`])
);

export default function LeadsPage() {
  const { allBusinesses, business: currentBusiness, businessConfig } = useBusiness();
  const [view, setView] = useState<"hot" | "handoffs">("hot");
  // Por defecto filtrar al business activo. El usuario puede cambiar a "all".
  const [businessFilter, setBusinessFilter] = useState<BusinessId | "all">(currentBusiness);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Record<string, BusinessStats>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, statsRes] = await Promise.all([
        fetch(`/api/leads?business=${businessFilter}&view=${view}`),
        fetch(`/api/leads?business=all&view=stats`),
      ]);
      const leadsData = await leadsRes.json();
      const statsData = await statsRes.json();
      setLeads(leadsData.leads || leadsData.handoffs || []);
      setStats(statsData.stats || {});
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000); // refresh cada 30s
    return () => clearInterval(interval);
  }, [view, businessFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Totals
  const totalLeads = Object.values(stats).reduce((sum, s) => sum + (s?.total_leads || 0), 0);
  const totalHot = Object.values(stats).reduce((sum, s) => sum + (s?.hot_leads || 0), 0);
  const totalHandoffs = Object.values(stats).reduce((sum, s) => sum + (s?.handoffs || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Flame className="h-6 w-6 text-orange-500" />
            Hot Leads{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Leads cualificados por la Elena de esta marca. Auto-refresh cada 30s.
          </p>
        </div>
        <button
          onClick={fetchLeads}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90"
        >
          {loading ? "Cargando..." : "Refrescar"}
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            Total Leads
          </div>
          <div className="text-2xl font-bold mt-2">{totalLeads}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            Hot Leads (score ≥ 70)
          </div>
          <div className="text-2xl font-bold mt-2 text-orange-500">{totalHot}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Handoffs Pendientes
          </div>
          <div className="text-2xl font-bold mt-2 text-red-500">{totalHandoffs}</div>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="h-4 w-4" />
            Score promedio
          </div>
          <div className="text-2xl font-bold mt-2">
            {totalLeads > 0
              ? Math.round(
                  Object.values(stats).reduce((sum, s) => sum + (s?.avg_score || 0), 0) /
                    Math.max(Object.keys(stats).length, 1)
                )
              : 0}
          </div>
        </div>
      </div>

      {/* Per-business breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {Object.entries(stats).map(([biz, s]) => (
          <div key={biz} className="border rounded-md p-3 bg-card text-sm">
            <div className="font-semibold">{BUSINESS_LABELS[biz] || biz}</div>
            <div className="text-muted-foreground text-xs mt-1">
              {s?.total_leads || 0} leads · {s?.hot_leads || 0} hot · {s?.handoffs || 0} handoff
            </div>
          </div>
        ))}
      </div>

      {/* Filter + view tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted p-1 rounded-md">
          <button
            onClick={() => setView("hot")}
            className={`px-3 py-1 text-sm rounded ${
              view === "hot" ? "bg-background shadow" : "opacity-70"
            }`}
          >
            Hot ({totalHot})
          </button>
          <button
            onClick={() => setView("handoffs")}
            className={`px-3 py-1 text-sm rounded ${
              view === "handoffs" ? "bg-background shadow" : "opacity-70"
            }`}
          >
            Handoffs ({totalHandoffs})
          </button>
        </div>

        <select
          value={businessFilter}
          onChange={(e) => setBusinessFilter(e.target.value as any)}
          className="border rounded-md px-3 py-1 text-sm bg-background"
        >
          <option value="all">Todos los negocios</option>
          {allBusinesses.map((b) => (
            <option key={b.id} value={b.id}>
              {b.emoji} {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error state */}
      {error && (
        <div className="border border-red-300 bg-red-50 p-3 rounded text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Leads table */}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="text-left p-3">User ID</th>
              <th className="text-left p-3">Negocio</th>
              <th className="text-right p-3">Score</th>
              <th className="text-right p-3">Mensajes</th>
              <th className="text-left p-3">Última señal</th>
              <th className="text-left p-3">Última actualización</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center p-8 text-muted-foreground">
                  Sin leads en este filtro
                </td>
              </tr>
            )}
            {leads.map((lead, i) => {
              const lastSignal = lead.signals_history?.slice(-1)[0];
              return (
                <tr key={`${lead.business}-${lead.user_id}-${i}`} className="border-b hover:bg-muted/30">
                  <td className="p-3 font-mono text-xs">{lead.user_id}</td>
                  <td className="p-3">{BUSINESS_LABELS[lead.business] || lead.business}</td>
                  <td className="p-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded ${
                        lead.score >= 70
                          ? "bg-orange-100 text-orange-700"
                          : lead.score >= 50
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-muted"
                      }`}
                    >
                      {lead.score}
                    </span>
                  </td>
                  <td className="p-3 text-right">{lead.messages_count}</td>
                  <td className="p-3 text-xs">
                    {lastSignal ? (
                      <>
                        {lastSignal.signals.join(", ")}
                        <div className="text-muted-foreground italic">
                          {lastSignal.message_preview}
                        </div>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {lead.last_update
                      ? new Date(lead.last_update).toLocaleString("es-CR")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
