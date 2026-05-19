"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/context/BusinessContext";
import { Flame, Clock, MessageCircle, RefreshCw, AlertCircle } from "lucide-react";

interface QueueItem {
  contactId: string;
  contactName: string | null;
  temperature: string | null;
  score: number;
  platform: string;
  lastMessage: string;
  lastInboundAt: number;
  waitingMinutes: number;
  needsAttention: boolean;
}

function formatWait(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) return `${Math.floor(min / 60)}h ${min % 60}m`;
  return `${Math.floor(min / 1440)}d`;
}

const PLATFORM_BG: Record<string, string> = {
  messenger: "#0084FF",
  instagram: "#E4405F",
  whatsapp: "#25D366",
};

export default function QueuePage() {
  const { business, businessConfig } = useBusiness();
  const [data, setData] = useState<{
    count: number;
    hot: number;
    needsAttention: number;
    queue: QueueItem[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/queue?business=${business}`, { cache: "no-store" });
      setData(await r.json());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6 text-orange-500" />
            Queue de respuestas{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Mensajes inbound sin respuesta humana. Auto-refresh 30s.
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
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border p-4 bg-card">
              <div className="text-xs text-muted-foreground">Esperando</div>
              <div className="text-2xl font-bold tabular-nums">{data.count}</div>
            </div>
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/5 p-4">
              <div className="text-xs text-orange-700 dark:text-orange-300 flex items-center gap-1">
                <Flame className="h-3 w-3" /> Hot leads
              </div>
              <div className="text-2xl font-bold tabular-nums text-orange-600">{data.hot}</div>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <div className="text-xs text-red-700 dark:text-red-300 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" /> &gt;10min sin respuesta
              </div>
              <div className="text-2xl font-bold tabular-nums text-red-600">{data.needsAttention}</div>
            </div>
          </div>

          {data.queue.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              ✓ Sin mensajes esperando respuesta. Buen trabajo.
            </div>
          ) : (
            <div className="rounded-xl border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-2 px-3">Contacto</th>
                    <th className="text-left py-2 px-3">Plataforma</th>
                    <th className="text-left py-2 px-3">Ultimo mensaje</th>
                    <th className="text-right py-2 px-3">Esperando</th>
                    <th className="text-right py-2 px-3">Temp</th>
                  </tr>
                </thead>
                <tbody>
                  {data.queue.map((q) => (
                    <tr
                      key={q.contactId}
                      className={`border-b hover:bg-muted/30 ${
                        q.temperature === "hot" ? "bg-orange-500/5" : ""
                      }`}
                    >
                      <td className="py-2 px-3 font-medium">
                        {q.contactName || `Lead ${q.contactId.slice(-6)}`}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] text-white"
                          style={{ background: PLATFORM_BG[q.platform] || "#666" }}
                        >
                          {q.platform}
                        </span>
                      </td>
                      <td className="py-2 px-3 max-w-md">
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {q.lastMessage}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`tabular-nums ${
                            q.waitingMinutes > 30 ? "text-red-600 font-semibold" :
                            q.waitingMinutes > 10 ? "text-orange-600 font-semibold" : ""
                          }`}
                        >
                          {formatWait(q.waitingMinutes)}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right">
                        {q.temperature === "hot" && (
                          <span className="inline-flex items-center gap-1 text-orange-600 text-xs font-semibold">
                            <Flame className="h-3 w-3" /> HOT
                          </span>
                        )}
                        {q.temperature === "warm" && (
                          <span className="text-xs text-yellow-600">warm</span>
                        )}
                        {q.temperature === "cold" && (
                          <span className="text-xs text-muted-foreground">cold</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
