"use client";

import { useEffect, useMemo, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import {
  Gauge,
  Activity,
  RefreshCw,
  Server,
  DollarSign,
  Zap,
  TrendingDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ---- Types -----------------------------------------------------------------

interface BotHealth {
  business: string;
  name: string;
  emoji: string;
  port: number;
  status: "UP" | "DOWN";
  response_ms: number | null;
  last_msg_time: string | null;
  error: string | null;
}
interface HealthPayload {
  bots: BotHealth[];
  checked_at: string;
}

interface VolumeSeries {
  key: string;
  name: string;
  color: string;
}
interface VolumePayload {
  data: Array<Record<string, string | number>>;
  series: VolumeSeries[];
  empty?: boolean;
  message?: string;
  total_messages_24h?: number;
}

interface CostBreakdown {
  business: string;
  name: string;
  color: string;
  message_count: number;
  user_messages: number;
  assistant_messages: number;
  input_tokens: number;
  output_tokens: number;
  with_router_usd: number;
  without_router_usd: number;
  savings_usd: number;
  savings_pct: number;
}
interface CostTotals {
  message_count: number;
  user_messages: number;
  assistant_messages: number;
  input_tokens: number;
  output_tokens: number;
  with_router_usd: number;
  without_router_usd: number;
  savings_usd: number;
  savings_pct: number;
}
interface CostPayload {
  breakdown: CostBreakdown[];
  totals: CostTotals;
  empty?: boolean;
  message?: string;
}

interface ResponseRow {
  business: string;
  name: string;
  color: string;
  message_count: number;
  user_count: number;
  messages_per_hour: number;
  response_time_avg_ms: number | null;
  response_time_avg_sec: number | null;
  total_leads: number;
  hot_leads: number;
  handoff_leads: number;
  pct_hot: number;
  pct_handoff: number;
}
interface ResponsePayload {
  rows: ResponseRow[];
  db_accessible: boolean;
}

// ---- Helpers ---------------------------------------------------------------

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function formatUSD(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: usd < 1 ? 4 : 2,
    maximumFractionDigits: 4,
  }).format(usd);
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const diff = Date.now() - t;
  if (diff < 60_000) return `hace ${Math.max(1, Math.floor(diff / 1000))}s`;
  if (diff < 3600_000) return `hace ${Math.floor(diff / 60_000)}m`;
  if (diff < 24 * 3600_000) return `hace ${Math.floor(diff / 3600_000)}h`;
  return `hace ${Math.floor(diff / (24 * 3600_000))}d`;
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border bg-[var(--card)] p-5 ring-1 ring-foreground/5 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Activity className="h-7 w-7 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---- Section A: System Health ---------------------------------------------

function HealthSection({ data }: { data: HealthPayload | null }) {
  return (
    <section>
      <SectionHeader
        icon={Server}
        title="System Health"
        subtitle="Estado de los 4 bots Elena (polling cada 10s)"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {(data?.bots || Array.from({ length: 4 })).map((bot, i) => {
          const b = bot as BotHealth | undefined;
          return (
            <Card key={b?.business || i}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{b?.emoji || "🤖"}</span>
                  <div>
                    <p className="font-semibold text-sm">
                      {b?.name || "Bot ?"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      :{b?.port || "—"}
                    </p>
                  </div>
                </div>
                <StatusBadge status={b?.status} />
              </div>
              <div className="space-y-1.5 text-xs">
                <Row label="Response">
                  <span className="tabular-nums font-medium">
                    {b?.response_ms !== null && b?.response_ms !== undefined
                      ? `${b.response_ms} ms`
                      : "—"}
                  </span>
                </Row>
                <Row label="Última actividad">
                  <span className="text-muted-foreground">
                    {b?.last_msg_time ? formatRelative(b.last_msg_time) : "—"}
                  </span>
                </Row>
                {b?.error ? (
                  <p className="text-[10px] text-red-500/90 mt-1 truncate" title={b.error}>
                    {b.error}
                  </p>
                ) : null}
              </div>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status?: "UP" | "DOWN" }) {
  if (!status) {
    return (
      <span className="px-2 py-0.5 text-[10px] rounded-full bg-muted text-muted-foreground">
        …
      </span>
    );
  }
  if (status === "UP") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-green-500/10 text-green-600 ring-1 ring-green-500/30 font-semibold">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
        UP
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-red-500/10 text-red-600 ring-1 ring-red-500/30 font-semibold">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500" />
      DOWN
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

// ---- Section B: Conversation Volume ---------------------------------------

function VolumeSection({ data }: { data: VolumePayload | null }) {
  const empty = !data || data.empty || (data.data?.length || 0) === 0;
  return (
    <section>
      <SectionHeader
        icon={Activity}
        title="Conversation Volume"
        subtitle="Mensajes por hora últimas 24h"
      />
      <Card>
        {empty ? (
          <EmptyState
            message={
              data?.message ||
              "Sin actividad en las últimas 24h o SQLite no accesible"
            }
          />
        ) : (
          <>
            <div className="flex items-center justify-end text-xs text-muted-foreground mb-2">
              Total 24h:{" "}
              <span className="ml-1 font-semibold text-foreground tabular-nums">
                {data!.total_messages_24h?.toLocaleString() || 0}
              </span>{" "}
              msgs
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart
                data={data!.data}
                margin={{ top: 5, right: 10, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  className="fill-muted-foreground"
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                {data!.series.map((s) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.name}
                    stroke={s.color}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>
    </section>
  );
}

// ---- Section C: Cost Tracking ---------------------------------------------

function CostSection({ data }: { data: CostPayload | null }) {
  const empty = !data || data.empty;
  return (
    <section>
      <SectionHeader
        icon={DollarSign}
        title="Cost Tracking (Anthropic API)"
        subtitle="Costo estimado de los últimos 7 días (heurística: 200 in/300 out tok por mensaje)"
      />

      {empty ? (
        <Card>
          <EmptyState
            message={
              data?.message ||
              "Sin mensajes en los últimos 7 días o SQLite no accesible"
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="md:col-span-2">
            <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
              <Zap className="h-3.5 w-3.5" /> Total estimado (7 días)
            </div>
            <div className="flex items-baseline gap-4 flex-wrap">
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {formatUSD(data!.totals.with_router_usd)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Con model router (40% Haiku · 60% Sonnet)
                </p>
              </div>
              <div className="text-right ml-auto">
                <p className="text-base text-muted-foreground line-through tabular-nums">
                  {formatUSD(data!.totals.without_router_usd)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sin router (100% Sonnet)
                </p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-sm font-semibold text-green-600">
                Ahorro {formatUSD(data!.totals.savings_usd)} (
                {data!.totals.savings_pct.toFixed(1)}%)
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <Metric
                label="Mensajes"
                value={data!.totals.message_count.toLocaleString()}
              />
              <Metric
                label="Tokens in"
                value={data!.totals.input_tokens.toLocaleString()}
              />
              <Metric
                label="Tokens out"
                value={data!.totals.output_tokens.toLocaleString()}
              />
              <Metric
                label="Costo/msg"
                value={
                  data!.totals.message_count > 0
                    ? formatUSD(
                        data!.totals.with_router_usd /
                          data!.totals.message_count
                      )
                    : "—"
                }
              />
            </div>
          </Card>

          <Card>
            <p className="text-xs text-muted-foreground mb-3">Costo por bot</p>
            <ul className="space-y-2.5">
              {data!.breakdown.map((b) => (
                <li
                  key={b.business}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: b.color }}
                    />
                    <span className="text-sm font-medium truncate">{b.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">
                      {formatUSD(b.with_router_usd)}
                    </p>
                    <p className="text-[10px] text-muted-foreground tabular-nums">
                      {b.message_count} msgs
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-[var(--muted)]/30 p-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ---- Section D: Response Performance --------------------------------------

type SortKey =
  | "name"
  | "messages_per_hour"
  | "response_time_avg_sec"
  | "pct_hot"
  | "pct_handoff";

function ResponseSection({ data }: { data: ResponsePayload | null }) {
  const [sortBy, setSortBy] = useState<SortKey>("messages_per_hour");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const rows = useMemo(() => {
    const items = (data?.rows || []).slice();
    items.sort((a, b) => {
      const av = (a[sortBy] ?? 0) as number | string | null;
      const bv = (b[sortBy] ?? 0) as number | string | null;
      let cmp: number;
      if (typeof av === "string" && typeof bv === "string") {
        cmp = av.localeCompare(bv);
      } else {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [data, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(key);
      setSortDir("desc");
    }
  }

  const empty = !data || (data.rows || []).every((r) => r.message_count === 0);

  return (
    <section>
      <SectionHeader
        icon={Zap}
        title="Response Performance"
        subtitle="Tiempo de respuesta, volumen y escalamiento por bot (7 días)"
      />
      <Card>
        {!data?.db_accessible ? (
          <EmptyState message="SQLite no accesible — verifica BOT_DB_PATH" />
        ) : empty ? (
          <EmptyState message="Sin actividad medible en los últimos 7 días" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-xs text-muted-foreground">
                  <Th onClick={() => toggleSort("name")} active={sortBy === "name"} dir={sortDir}>
                    Negocio
                  </Th>
                  <Th
                    align="right"
                    onClick={() => toggleSort("messages_per_hour")}
                    active={sortBy === "messages_per_hour"}
                    dir={sortDir}
                  >
                    Msgs/hora avg
                  </Th>
                  <Th
                    align="right"
                    onClick={() => toggleSort("response_time_avg_sec")}
                    active={sortBy === "response_time_avg_sec"}
                    dir={sortDir}
                  >
                    Resp. avg
                  </Th>
                  <Th
                    align="right"
                    onClick={() => toggleSort("pct_hot")}
                    active={sortBy === "pct_hot"}
                    dir={sortDir}
                  >
                    % Hot
                  </Th>
                  <Th
                    align="right"
                    onClick={() => toggleSort("pct_handoff")}
                    active={sortBy === "pct_handoff"}
                    dir={sortDir}
                  >
                    % Handoff
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.business}
                    className="border-b hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-2.5 px-2 font-medium">
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                        style={{ background: r.color }}
                      />
                      {r.name}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {r.messages_per_hour}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums">
                      {r.response_time_avg_sec !== null
                        ? `${r.response_time_avg_sec}s`
                        : "—"}
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-orange-500 font-semibold">
                      {r.pct_hot}%
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-red-500 font-semibold">
                      {r.pct_handoff}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}

function Th({
  children,
  align = "left",
  onClick,
  active,
  dir,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th
      className={`py-2 px-2 font-medium cursor-pointer select-none ${
        align === "right" ? "text-right" : "text-left"
      } ${active ? "text-foreground" : ""}`}
      onClick={onClick}
    >
      <span className="inline-flex items-center gap-1">
        {align === "right" ? null : children}
        {active ? (
          dir === "asc" ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : null}
        {align === "right" ? children : null}
      </span>
    </th>
  );
}

// ---- Main page -------------------------------------------------------------

export default function PerformancePage() {
  const { business, businessConfig } = useBusiness();
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [volume, setVolume] = useState<VolumePayload | null>(null);
  const [cost, setCost] = useState<CostPayload | null>(null);
  const [resp, setResp] = useState<ResponsePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filtrar payloads en cliente para mostrar solo la marca activa
  const fHealth = useMemo<HealthPayload | null>(() => {
    if (!health || showAll) return health;
    return { ...health, bots: health.bots.filter((b) => b.business === business) };
  }, [health, showAll, business]);

  const fVolume = useMemo<VolumePayload | null>(() => {
    if (!volume || showAll) return volume;
    return { ...volume, series: volume.series.filter((s) => s.key === business) };
  }, [volume, showAll, business]);

  const fCost = useMemo<CostPayload | null>(() => {
    if (!cost || showAll) return cost;
    const breakdown = cost.breakdown.filter((b) => b.business === business);
    const totals = breakdown.reduce(
      (acc, b) => ({
        message_count: acc.message_count + b.message_count,
        user_messages: acc.user_messages + b.user_messages,
        assistant_messages: acc.assistant_messages + b.assistant_messages,
        input_tokens: acc.input_tokens + b.input_tokens,
        output_tokens: acc.output_tokens + b.output_tokens,
        with_router_usd: acc.with_router_usd + b.with_router_usd,
        without_router_usd: acc.without_router_usd + b.without_router_usd,
        savings_usd: acc.savings_usd + b.savings_usd,
        savings_pct: 0,
      }),
      {
        message_count: 0,
        user_messages: 0,
        assistant_messages: 0,
        input_tokens: 0,
        output_tokens: 0,
        with_router_usd: 0,
        without_router_usd: 0,
        savings_usd: 0,
        savings_pct: 0,
      }
    );
    totals.savings_pct =
      totals.without_router_usd > 0
        ? (totals.savings_usd / totals.without_router_usd) * 100
        : 0;
    return { ...cost, breakdown, totals };
  }, [cost, showAll, business]);

  const fResp = useMemo<ResponsePayload | null>(() => {
    if (!resp || showAll) return resp;
    return { ...resp, rows: resp.rows.filter((r) => r.business === business) };
  }, [resp, showAll, business]);

  async function refreshAll() {
    setLoading(true);
    const [h, v, c, r] = await Promise.all([
      fetchJSON<HealthPayload>("/api/performance/health"),
      fetchJSON<VolumePayload>("/api/performance/volume"),
      fetchJSON<CostPayload>("/api/performance/cost"),
      fetchJSON<ResponsePayload>("/api/performance/response"),
    ]);
    setHealth(h);
    setVolume(v);
    setCost(c);
    setResp(r);
    setLastUpdate(new Date());
    setLoading(false);
  }

  async function refreshHealthOnly() {
    const h = await fetchJSON<HealthPayload>("/api/performance/health");
    setHealth(h);
  }

  useEffect(() => {
    refreshAll();
    const fast = setInterval(refreshHealthOnly, 10_000);
    const slow = setInterval(refreshAll, 30_000);
    return () => {
      clearInterval(fast);
      clearInterval(slow);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gauge className="h-6 w-6 text-primary" />
            Performance{" "}
            {!showAll && (
              <span style={{ color: businessConfig.color }}>
                {businessConfig.emoji} {businessConfig.name}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">
            {showAll
              ? "Salud, volumen, costo y respuesta de los 4 bots."
              : "Salud, volumen, costo y respuesta del bot de esta marca."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            <span className="text-muted-foreground">Comparar 4 marcas</span>
          </label>
          {lastUpdate ? (
            <span className="text-xs text-muted-foreground">
              Actualizado{" "}
              {lastUpdate.toLocaleTimeString("es-CR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          ) : null}
          <button
            onClick={refreshAll}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Cargando" : "Refrescar"}
          </button>
        </div>
      </div>

      <HealthSection data={fHealth} />
      <VolumeSection data={fVolume} />
      <CostSection data={fCost} />
      <ResponseSection data={fResp} />
    </div>
  );
}
