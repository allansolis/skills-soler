"use client";

import { useState, useEffect, useCallback } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  RefreshCw,
  TrendingUp,
  DollarSign,
  MessageCircle,
  Eye,
  Users,
  MousePointerClick,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
} from "lucide-react";

interface NormalizedCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget: number;
  spend7d: number;
  impressions7d: number;
  reach7d: number;
  clicks7d: number;
  ctr7d: number;
  cpm7d: number;
  messages7d: number;
  costPerMessage: number;
}

interface AdsLiveResponse {
  account: { id: string; label: string; currency: string };
  summary: {
    activeCount: number;
    pausedCount: number;
    totalCount: number;
    spend7d: number;
    impressions7d: number;
    reach7d: number;
    clicks7d: number;
    messages7d: number;
    avgCtr7d: number;
    avgCostPerMessage7d: number;
  };
  active: NormalizedCampaign[];
  paused: NormalizedCampaign[];
  fetchedAt: string;
  error?: string;
}

function formatMoney(value: number, currency: string): string {
  if (currency === "USD") return `$${value.toFixed(2)}`;
  // CRC uses colon symbol
  return `₡${Math.round(value).toLocaleString("es-CR")}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("es-CR");
}

function statusBadge(status: string) {
  if (status === "ACTIVE") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle2 className="h-3 w-3" /> ACTIVA
      </span>
    );
  }
  if (status === "PAUSED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        <PauseCircle className="h-3 w-3" /> pausada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
      {status}
    </span>
  );
}

export default function AdsPage() {
  const { business, businessConfig } = useBusiness();
  const [data, setData] = useState<AdsLiveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedLabel, setFetchedLabel] = useState<string>("—");

  // map CRM business ID to API business param
  const businessKey = business === "glass_soler" ? "glass" : "esmeraldas";

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ads/live?business=${businessKey}`);
      const payload = (await res.json()) as AdsLiveResponse;
      if (!res.ok || payload.error) {
        setError(payload.error || `HTTP ${res.status}`);
        setData(null);
      } else {
        setData(payload);
        setFetchedLabel(new Date(payload.fetchedAt).toLocaleTimeString("es-CR"));
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [businessKey]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="h-6 w-6" style={{ color: businessConfig.color }} />
            Meta Ads — {businessConfig.name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Datos en vivo desde Meta Graph API. Últimos 7 días. Se actualiza bajo demanda.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Actualizado: {fetchedLabel}</span>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Cargando…" : "Refrescar"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900">No se pudieron cargar las campañas</p>
            <p className="text-xs text-red-700 mt-1 font-mono">{error}</p>
            <p className="text-xs text-red-700 mt-2">
              Si dice &ldquo;Session has expired&rdquo;, regenera el token en{" "}
              <a
                href="https://developers.facebook.com/tools/explorer/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Graph Explorer
              </a>{" "}
              con app &ldquo;Soler Inversiones&rdquo;, copia el valor a{" "}
              <code className="bg-red-100 px-1 rounded">META_ADS_TOKEN</code> en .env.local y
              reinicia el CRM.
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
              label="Campañas activas"
              value={`${data.summary.activeCount} / ${data.summary.totalCount}`}
              sub={`${data.summary.pausedCount} pausadas`}
            />
            <KPICard
              icon={<DollarSign className="h-5 w-5 text-blue-600" />}
              label="Gasto 7 días"
              value={formatMoney(data.summary.spend7d, data.account.currency)}
              sub={`${formatMoney(data.summary.spend7d / 7, data.account.currency)}/día prom`}
            />
            <KPICard
              icon={<MessageCircle className="h-5 w-5 text-purple-600" />}
              label="Mensajes 7 días"
              value={formatNumber(data.summary.messages7d)}
              sub={
                data.summary.messages7d > 0
                  ? `${formatMoney(data.summary.avgCostPerMessage7d, data.account.currency)}/msg`
                  : "sin conversaciones"
              }
            />
            <KPICard
              icon={<TrendingUp className="h-5 w-5 text-orange-600" />}
              label="CTR promedio"
              value={`${data.summary.avgCtr7d.toFixed(2)}%`}
              sub={`${formatNumber(data.summary.clicks7d)} clicks / ${formatNumber(
                data.summary.impressions7d
              )} impr.`}
            />
          </div>

          {/* Active campaigns */}
          <section className="space-y-2">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Campañas activas ({data.active.length})
            </h2>

            {data.active.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No hay campañas activas en este momento.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-white">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Campaña</th>
                      <th className="px-3 py-2 text-left">Objetivo</th>
                      <th className="px-3 py-2 text-right">Budget diario</th>
                      <th className="px-3 py-2 text-right">Spend 7d</th>
                      <th className="px-3 py-2 text-right">
                        <Eye className="h-3 w-3 inline" /> Impr.
                      </th>
                      <th className="px-3 py-2 text-right">
                        <Users className="h-3 w-3 inline" /> Alcance
                      </th>
                      <th className="px-3 py-2 text-right">
                        <MousePointerClick className="h-3 w-3 inline" /> Clicks
                      </th>
                      <th className="px-3 py-2 text-right">CTR</th>
                      <th className="px-3 py-2 text-right">
                        <MessageCircle className="h-3 w-3 inline" /> Msgs
                      </th>
                      <th className="px-3 py-2 text-right">Costo/msg</th>
                      <th className="px-3 py-2 text-left">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.active.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{c.id}</div>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">{c.objective}</td>
                        <td className="px-3 py-2 text-right">
                          {c.dailyBudget > 0
                            ? formatMoney(c.dailyBudget, data.account.currency)
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatMoney(c.spend7d, data.account.currency)}
                        </td>
                        <td className="px-3 py-2 text-right">{formatNumber(c.impressions7d)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(c.reach7d)}</td>
                        <td className="px-3 py-2 text-right">{formatNumber(c.clicks7d)}</td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={
                              c.ctr7d >= 5
                                ? "text-green-700 font-semibold"
                                : c.ctr7d >= 2
                                  ? "text-blue-700"
                                  : "text-gray-600"
                            }
                          >
                            {c.ctr7d.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right font-medium">{c.messages7d}</td>
                        <td className="px-3 py-2 text-right">
                          {c.messages7d > 0
                            ? formatMoney(c.costPerMessage, data.account.currency)
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{statusBadge(c.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Paused campaigns - collapsed */}
          {data.paused.length > 0 && (
            <section className="space-y-2">
              <details className="rounded-lg border bg-white">
                <summary className="cursor-pointer px-4 py-3 text-sm font-medium flex items-center gap-2">
                  <PauseCircle className="h-4 w-4 text-gray-500" />
                  Campañas pausadas ({data.paused.length} de {data.summary.pausedCount})
                </summary>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-600">
                      <tr>
                        <th className="px-3 py-2 text-left">Campaña</th>
                        <th className="px-3 py-2 text-left">Objetivo</th>
                        <th className="px-3 py-2 text-right">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.paused.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">{c.name}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">{c.objective}</td>
                          <td className="px-3 py-2 text-right text-xs font-mono text-gray-500">
                            {c.id}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
          )}

          <p className="text-xs text-muted-foreground">
            Fuente: Meta Graph API v25.0 · Cuenta {data.account.id} · Moneda{" "}
            {data.account.currency}
          </p>
        </>
      )}

      {loading && !data && (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Cargando datos desde Meta…
        </div>
      )}
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
        {icon}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
