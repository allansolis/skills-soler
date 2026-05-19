"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle2, XCircle, RefreshCw, Server } from "lucide-react";

interface HealthCheck {
  ok: boolean;
  detail?: string;
}

interface HealthPayload {
  status: "healthy" | "degraded";
  timestamp: string;
  uptime_seconds: number;
  checks: Record<string, HealthCheck>;
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function StatusPage() {
  const [data, setData] = useState<HealthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      const d = await res.json();
      setData(d);
      setLastUpdate(new Date());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Server className="h-6 w-6 text-primary" />
            System Status
          </h1>
          <p className="text-sm text-muted-foreground">
            Salud del CRM, DB, Elena, Meta integrations. Auto-refresh cada 30s.
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted/40"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {data && (
        <>
          {/* Overall status */}
          <div
            className={`rounded-xl border p-6 ${
              data.status === "healthy"
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <div className="flex items-center gap-4">
              {data.status === "healthy" ? (
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              ) : (
                <XCircle className="h-10 w-10 text-red-500" />
              )}
              <div>
                <div className="text-2xl font-bold capitalize">{data.status}</div>
                <div className="text-sm text-muted-foreground">
                  Uptime: {formatUptime(data.uptime_seconds)} · Last check:{" "}
                  {lastUpdate?.toLocaleTimeString("es-CR")}
                </div>
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(data.checks).map(([name, check]) => (
              <div
                key={name}
                className={`rounded-lg border p-4 bg-card ${
                  check.ok ? "border-green-500/20" : "border-red-500/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-semibold capitalize">
                      {name.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    {check.detail && (
                      <div className="text-xs text-muted-foreground mt-1">{check.detail}</div>
                    )}
                  </div>
                  {check.ok ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tareas programadas */}
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold">Tareas programadas (Windows Task Scheduler)</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  <th className="text-left py-2">Tarea</th>
                  <th className="text-left py-2">Frecuencia</th>
                  <th className="text-left py-2">Acción</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2 font-medium">Auto Start</td>
                  <td className="py-2 text-muted-foreground">Al login</td>
                  <td className="py-2 text-xs">Levanta CRM + Cloudflare tunnel</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Daily Update</td>
                  <td className="py-2 text-muted-foreground">6:00 AM</td>
                  <td className="py-2 text-xs">git pull + npm install + restart</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Meta Sync 9am</td>
                  <td className="py-2 text-muted-foreground">9:00 AM</td>
                  <td className="py-2 text-xs">Extrae datos frescos de Meta</td>
                </tr>
                <tr className="border-b">
                  <td className="py-2 font-medium">Meta Sync 6pm</td>
                  <td className="py-2 text-muted-foreground">6:00 PM</td>
                  <td className="py-2 text-xs">Extrae datos frescos de Meta</td>
                </tr>
                <tr>
                  <td className="py-2 font-medium">Health Check</td>
                  <td className="py-2 text-muted-foreground">Cada 5 min</td>
                  <td className="py-2 text-xs">Restart automatico si cae</td>
                </tr>
              </tbody>
            </table>
            <div className="mt-3 text-xs text-muted-foreground">
              Para correr una manualmente:{" "}
              <code className="bg-muted px-1 rounded">
                Start-ScheduledTask -TaskName &quot;CRM Soler - Meta Sync 9am&quot;
              </code>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
