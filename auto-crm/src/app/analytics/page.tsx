"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  Filter,
  Activity,
  Flame,
  RefreshCw,
} from "lucide-react";

// ---- Types -----------------------------------------------------------------

interface TrendSeries {
  key: string;
  name: string;
  color: string;
}
interface TrendPayload {
  view: "trend";
  data: Array<Record<string, any>>;
  series: TrendSeries[];
}
interface FunnelPayload {
  view: "funnel";
  data: Array<{ stage: string; count: number; color: string; pct: number }>;
  totals: { total: number; warm: number; hot: number; handoff: number };
}
interface SignalsPayload {
  view: "signals";
  data: Array<{ name: string; count: number; type: string; color: string }>;
}
interface HoursPayload {
  view: "hours";
  grid: number[][];
  max: number;
  days: string[];
  hours: number[];
}
interface TableRow {
  business: string;
  name: string;
  color: string;
  total: number;
  hot: number;
  handoffs: number;
  avg_score: number;
  conv_rate: number;
}
interface TablePayload {
  view: "table";
  rows: TableRow[];
  footer: TableRow;
}

// ---- Helpers ---------------------------------------------------------------

async function fetchView<T>(view: string): Promise<T | null> {
  try {
    const res = await fetch(`/api/analytics?view=${view}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function EmptyState({ message = "Sin datos disponibles" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Activity className="h-8 w-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Los bots no respondieron o aún no hay actividad
      </p>
    </div>
  );
}

function WidgetCard({
  title,
  subtitle,
  children,
  icon: Icon,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 ring-1 ring-foreground/5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-base flex items-center gap-2">
            {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
            {title}
          </h3>
          {subtitle ? (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

// ---- Widget 1: Hot Leads Trend ---------------------------------------------

function HotLeadsTrendWidget({ payload }: { payload: TrendPayload | null }) {
  const empty = !payload || !payload.data || payload.data.length === 0;
  const hasAnyData =
    !empty &&
    payload!.data.some((row) =>
      payload!.series.some((s) => (row[s.key] || 0) > 0)
    );

  return (
    <WidgetCard
      title="Hot Leads Trend"
      subtitle="Últimas 24h por bot (score ≥ 70)"
      icon={Flame}
    >
      {empty || !hasAnyData ? (
        <EmptyState message="Aún no hay hot leads en las últimas 24 horas" />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <LineChart
            data={payload!.data}
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
            {payload!.series.map((s) => (
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
      )}
    </WidgetCard>
  );
}

// ---- Widget 2: Conversion Funnel -------------------------------------------

function FunnelWidget({ payload }: { payload: FunnelPayload | null }) {
  const empty =
    !payload || !payload.data || payload.data.every((d) => d.count === 0);

  return (
    <WidgetCard
      title="Conversion Funnel"
      subtitle="Cascada de calificación agregada"
      icon={TrendingUp}
    >
      {empty ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart
            data={payload!.data}
            margin={{ top: 20, right: 10, bottom: 5, left: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
            <XAxis
              dataKey="stage"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: any, _name: any, props: any) => [
                `${value} (${props.payload.pct}%)`,
                "Leads",
              ]}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {payload!.data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList
                dataKey="count"
                position="top"
                className="fill-foreground"
                style={{ fontSize: 11, fontWeight: 600 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}

// ---- Widget 3: Top Signals -------------------------------------------------

function SignalsWidget({ payload }: { payload: SignalsPayload | null }) {
  const empty = !payload || !payload.data || payload.data.length === 0;
  const height = empty ? 260 : Math.max(260, (payload!.data.length || 1) * 28);

  return (
    <WidgetCard
      title="Top Signals"
      subtitle="Señales más frecuentes (verde=positiva, rojo=negativa)"
      icon={Filter}
    >
      {empty ? (
        <EmptyState message="Aún no se detectaron señales" />
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={payload!.data}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              width={140}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.3 }}
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {payload!.data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                className="fill-foreground"
                style={{ fontSize: 10 }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </WidgetCard>
  );
}

// ---- Widget 4: Peak Hours Heatmap ------------------------------------------

function HeatmapWidget({ payload }: { payload: HoursPayload | null }) {
  const empty = !payload || payload.max === 0;

  function intensity(value: number, max: number): string {
    if (max === 0 || value === 0) return "rgba(148,163,184,0.08)";
    const ratio = value / max;
    // Blend from light to strong orange/red
    if (ratio < 0.2) return `rgba(251,191,36,${0.25 + ratio})`;
    if (ratio < 0.5) return `rgba(251,146,60,${0.45 + ratio * 0.3})`;
    if (ratio < 0.8) return `rgba(239,68,68,${0.6 + ratio * 0.2})`;
    return `rgba(220,38,38,${0.85 + ratio * 0.15})`;
  }

  return (
    <WidgetCard
      title="Peak Hours Heatmap"
      subtitle="Mensajes por día×hora (últimos 7 días)"
      icon={BarChart3}
    >
      {empty ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Hour header */}
            <div className="flex items-center gap-px mb-1 pl-10">
              {payload!.hours.map((h) => (
                <div
                  key={h}
                  className="w-5 text-[9px] text-center text-muted-foreground"
                >
                  {h % 3 === 0 ? h : ""}
                </div>
              ))}
            </div>
            {payload!.grid.map((row, dow) => (
              <div key={dow} className="flex items-center gap-px mb-px">
                <div className="w-10 text-[10px] text-right pr-2 text-muted-foreground font-medium">
                  {payload!.days[dow]}
                </div>
                {row.map((value, hr) => (
                  <div
                    key={hr}
                    className="w-5 h-5 rounded-sm cursor-help transition-transform hover:scale-125"
                    style={{ background: intensity(value, payload!.max) }}
                    title={`${payload!.days[dow]} ${hr}:00 — ${value} msg`}
                  />
                ))}
              </div>
            ))}
            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 pl-10 text-[10px] text-muted-foreground">
              <span>0</span>
              <div className="flex gap-px">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((r, i) => (
                  <div
                    key={i}
                    className="w-4 h-3 rounded-sm"
                    style={{ background: intensity(Math.ceil(r * payload!.max), payload!.max) }}
                  />
                ))}
              </div>
              <span>{payload!.max}</span>
            </div>
          </div>
        </div>
      )}
    </WidgetCard>
  );
}

// ---- Widget 5: Business Comparison Table -----------------------------------

function BusinessTableWidget({ payload }: { payload: TablePayload | null }) {
  const empty = !payload || !payload.rows;

  return (
    <WidgetCard
      title="Comparativa por Negocio"
      subtitle="Métricas agregadas de cada Elena"
      icon={BarChart3}
    >
      {empty ? (
        <EmptyState />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-xs text-muted-foreground">
                <th className="text-left py-2 px-2 font-medium">Negocio</th>
                <th className="text-right py-2 px-2 font-medium">
                  Conversaciones
                </th>
                <th className="text-right py-2 px-2 font-medium">Hot</th>
                <th className="text-right py-2 px-2 font-medium">Handoffs</th>
                <th className="text-right py-2 px-2 font-medium">Avg Score</th>
                <th className="text-right py-2 px-2 font-medium">Conv Rate</th>
              </tr>
            </thead>
            <tbody>
              {payload!.rows.map((r) => (
                <tr
                  key={r.business}
                  className="border-b hover:bg-muted/30 transition-colors"
                >
                  <td className="py-2.5 px-2 font-medium">
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ background: r.color }}
                    />
                    {r.name}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.total}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-orange-500 font-semibold">
                    {r.hot}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums text-red-500 font-semibold">
                    {r.handoffs}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.avg_score}
                  </td>
                  <td className="py-2.5 px-2 text-right tabular-nums">
                    {r.conv_rate}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-muted/40 font-semibold">
              <tr>
                <td className="py-2.5 px-2">{payload!.footer.name}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">
                  {payload!.footer.total}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-orange-500">
                  {payload!.footer.hot}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-red-500">
                  {payload!.footer.handoffs}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums">
                  {payload!.footer.avg_score}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums">
                  {payload!.footer.conv_rate}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </WidgetCard>
  );
}

// ---- Main page -------------------------------------------------------------

export default function AnalyticsPage() {
  const [trend, setTrend] = useState<TrendPayload | null>(null);
  const [funnel, setFunnel] = useState<FunnelPayload | null>(null);
  const [signals, setSignals] = useState<SignalsPayload | null>(null);
  const [hours, setHours] = useState<HoursPayload | null>(null);
  const [table, setTable] = useState<TablePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function refreshAll() {
    setLoading(true);
    const [t, f, s, h, tbl] = await Promise.all([
      fetchView<TrendPayload>("trend"),
      fetchView<FunnelPayload>("funnel"),
      fetchView<SignalsPayload>("signals"),
      fetchView<HoursPayload>("hours"),
      fetchView<TablePayload>("table"),
    ]);
    setTrend(t);
    setFunnel(f);
    setSignals(s);
    setHours(h);
    setTable(tbl);
    setLastUpdate(new Date());
    setLoading(false);
  }

  useEffect(() => {
    refreshAll();
    const id = setInterval(refreshAll, 60_000); // refresh cada 60s
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Visión agregada de las 4 Elenas. Auto-refresh cada 60s.
          </p>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Grid layout: 12-col responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Trend - full width top */}
        <div className="lg:col-span-12">
          <HotLeadsTrendWidget payload={trend} />
        </div>

        {/* Funnel + Signals side by side */}
        <div className="lg:col-span-5">
          <FunnelWidget payload={funnel} />
        </div>
        <div className="lg:col-span-7">
          <SignalsWidget payload={signals} />
        </div>

        {/* Heatmap full width */}
        <div className="lg:col-span-12">
          <HeatmapWidget payload={hours} />
        </div>

        {/* Comparison table */}
        <div className="lg:col-span-12">
          <BusinessTableWidget payload={table} />
        </div>
      </div>
    </div>
  );
}
