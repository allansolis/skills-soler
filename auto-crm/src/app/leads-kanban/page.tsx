"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useBusiness, BusinessId } from "@/context/BusinessContext";
import { BUSINESS_CONFIGS } from "@/lib/businessConfig";
import {
  Kanban as KanbanIcon,
  RefreshCw,
  X,
  Loader2,
  Clock,
  MessageSquare,
} from "lucide-react";

// ---------- Types ----------

interface SignalEvent {
  timestamp: string;
  delta: number;
  signals: string[];
  message_preview: string;
}

interface Lead {
  user_id: string;
  business: string;
  score: number;
  messages_count: number;
  created_at?: string;
  last_update?: string;
  handoff_triggered?: boolean;
  handoff_at?: string;
  signals_history?: SignalEvent[];
}

type ManualStatus = "contacted" | "won" | "lost" | null;

interface LeadStatusEntry {
  manual_status: ManualStatus;
  updated_at: string;
  operator?: string;
  notes?: string;
}

type ColumnId =
  | "new"
  | "warm"
  | "hot"
  | "handoff"
  | "contacted"
  | "won"
  | "lost";

interface ColumnDef {
  id: ColumnId;
  title: string;
  subtitle: string;
  // Tailwind classes for column header + card border accents.
  headerBg: string;
  headerText: string;
  border: string;
  badge: string;
  kind: "auto" | "manual";
}

// ---------- Constants ----------

const COLUMNS: ColumnDef[] = [
  {
    id: "new",
    title: "NEW",
    subtitle: "Score 0-29",
    headerBg: "bg-slate-500/10 dark:bg-slate-500/20",
    headerText: "text-slate-700 dark:text-slate-200",
    border: "border-slate-400/30",
    badge: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100",
    kind: "auto",
  },
  {
    id: "warm",
    title: "WARM",
    subtitle: "Score 30-49",
    headerBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
    headerText: "text-yellow-800 dark:text-yellow-200",
    border: "border-yellow-500/40",
    badge: "bg-yellow-200 text-yellow-900 dark:bg-yellow-900/60 dark:text-yellow-100",
    kind: "auto",
  },
  {
    id: "hot",
    title: "HOT",
    subtitle: "Score 50-69",
    headerBg: "bg-orange-500/10 dark:bg-orange-500/20",
    headerText: "text-orange-800 dark:text-orange-200",
    border: "border-orange-500/40",
    badge: "bg-orange-200 text-orange-900 dark:bg-orange-900/60 dark:text-orange-100",
    kind: "auto",
  },
  {
    id: "handoff",
    title: "HANDOFF",
    subtitle: "Score 70+ / listo para vendedor",
    headerBg: "bg-red-500/10 dark:bg-red-500/20",
    headerText: "text-red-800 dark:text-red-200",
    border: "border-red-500/40",
    badge: "bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-100",
    kind: "auto",
  },
  {
    id: "contacted",
    title: "CONTACTED",
    subtitle: "Operador en conversacion",
    headerBg: "bg-blue-500/10 dark:bg-blue-500/20",
    headerText: "text-blue-800 dark:text-blue-200",
    border: "border-blue-500/40",
    badge: "bg-blue-200 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100",
    kind: "manual",
  },
  {
    id: "won",
    title: "WON",
    subtitle: "Cerro venta",
    headerBg: "bg-green-500/10 dark:bg-green-500/20",
    headerText: "text-green-800 dark:text-green-200",
    border: "border-green-500/40",
    badge: "bg-green-200 text-green-900 dark:bg-green-900/60 dark:text-green-100",
    kind: "manual",
  },
  {
    id: "lost",
    title: "LOST",
    subtitle: "Descartado",
    headerBg: "bg-zinc-700/10 dark:bg-zinc-800/40",
    headerText: "text-zinc-700 dark:text-zinc-300",
    border: "border-zinc-500/40",
    badge: "bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
    kind: "manual",
  },
];

// Derivar desde el config canonico
const BUSINESS_EMOJI: Record<string, string> = Object.fromEntries(
  Object.values(BUSINESS_CONFIGS).map((c) => [c.id, c.emoji])
);

const REFRESH_MS = 60_000;

// ---------- Helpers ----------

function buildKey(business: string, user_id: string): string {
  return `${business}:${user_id}`;
}

function autoColumnFromScore(score: number): ColumnId {
  if (score >= 70) return "handoff";
  if (score >= 50) return "hot";
  if (score >= 30) return "warm";
  return "new";
}

function scoreBadgeClasses(score: number): string {
  if (score >= 70) return "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30";
  if (score >= 50) return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30";
  if (score >= 30) return "bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/30";
  return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30";
}

function truncateUserId(id: string): string {
  if (id.length <= 16) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const days = Math.floor(h / 24);
  return `${days}d`;
}

// ---------- Page ----------

export default function LeadsKanbanPage() {
  const { allBusinesses, business: currentBusiness, businessConfig } = useBusiness();
  // Por defecto filtrar al business activo. El usuario puede cambiar a "all".
  const [businessFilter, setBusinessFilter] = useState<BusinessId | "all">(currentBusiness);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [statuses, setStatuses] = useState<Record<string, LeadStatusEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [leadsRes, statusesRes] = await Promise.all([
        fetch(`/api/leads?business=${businessFilter}&view=hot`, { cache: "no-store" }),
        fetch(`/api/leads/status`, { cache: "no-store" }),
      ]);
      const leadsData = await leadsRes.json();
      const statusesData = await statusesRes.json();
      setLeads(leadsData.leads || []);
      setStatuses(statusesData.statuses || {});
      setLastRefresh(new Date());
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [businessFilter]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, REFRESH_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Bucket leads into columns
  const leadsByColumn = useMemo(() => {
    const buckets: Record<ColumnId, Lead[]> = {
      new: [],
      warm: [],
      hot: [],
      handoff: [],
      contacted: [],
      won: [],
      lost: [],
    };

    for (const lead of leads) {
      const key = buildKey(lead.business, lead.user_id);
      const manual = statuses[key]?.manual_status;
      if (manual === "contacted" || manual === "won" || manual === "lost") {
        buckets[manual].push(lead);
      } else {
        buckets[autoColumnFromScore(lead.score)].push(lead);
      }
    }

    // Sort each bucket: highest score first, then most recent update
    for (const col of Object.keys(buckets) as ColumnId[]) {
      buckets[col].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const at = a.last_update ? Date.parse(a.last_update) : 0;
        const bt = b.last_update ? Date.parse(b.last_update) : 0;
        return bt - at;
      });
    }

    return buckets;
  }, [leads, statuses]);

  const selectedLead = useMemo(() => {
    if (!selectedKey) return null;
    return (
      leads.find((l) => buildKey(l.business, l.user_id) === selectedKey) || null
    );
  }, [leads, selectedKey]);

  const selectedStatus = selectedKey ? statuses[selectedKey] : undefined;

  const updateStatus = useCallback(
    async (
      lead: Lead,
      newStatus: ManualStatus,
      notes?: string
    ): Promise<boolean> => {
      try {
        const res = await fetch("/api/leads/status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business: lead.business,
            user_id: lead.user_id,
            new_status: newStatus,
            ...(notes !== undefined ? { notes } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setError(data.error || "Error al actualizar estado");
          return false;
        }
        // Update local cache
        const key = buildKey(lead.business, lead.user_id);
        setStatuses((prev) => {
          const next = { ...prev };
          if (newStatus === null) {
            delete next[key];
          } else {
            next[key] = data.entry;
          }
          return next;
        });
        return true;
      } catch (e) {
        setError(String(e));
        return false;
      }
    },
    []
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KanbanIcon className="h-6 w-6 text-orange-500" />
            Kanban Leads{" "}
            <span style={{ color: businessConfig.color }}>
              {businessConfig.emoji} {businessConfig.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Pipeline visual de leads de esta marca. Columnas 1-4 automaticas por score, 5-7 manuales.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value as BusinessId | "all")}
            className="border rounded-md px-3 py-1.5 text-sm bg-background"
          >
            <option value="all">Todos los negocios</option>
            {allBusinesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.emoji} {b.name}
              </option>
            ))}
          </select>
          <button
            onClick={fetchAll}
            disabled={loading}
            className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:opacity-90 text-sm flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refrescar
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span>{leads.length} leads totales</span>
        {lastRefresh && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            ultima carga: {lastRefresh.toLocaleTimeString("es-CR")}
          </span>
        )}
        <span>auto-refresh: 60s</span>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 p-3 rounded text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            col={col}
            leads={leadsByColumn[col.id]}
            statuses={statuses}
            onCardClick={(l) => setSelectedKey(buildKey(l.business, l.user_id))}
            onChangeStatus={updateStatus}
          />
        ))}
      </div>

      {/* Modal */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          status={selectedStatus}
          onClose={() => setSelectedKey(null)}
          onChangeStatus={updateStatus}
        />
      )}
    </div>
  );
}

// ---------- Column ----------

interface KanbanColumnProps {
  col: ColumnDef;
  leads: Lead[];
  statuses: Record<string, LeadStatusEntry>;
  onCardClick: (lead: Lead) => void;
  onChangeStatus: (
    lead: Lead,
    newStatus: ManualStatus,
    notes?: string
  ) => Promise<boolean>;
}

function KanbanColumn({
  col,
  leads,
  statuses,
  onCardClick,
  onChangeStatus,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex-shrink-0 w-72 rounded-lg border ${col.border} bg-card flex flex-col max-h-[calc(100vh-220px)]`}
    >
      <div className={`px-3 py-2.5 rounded-t-lg ${col.headerBg} border-b ${col.border}`}>
        <div className="flex items-center justify-between">
          <div className={`font-bold text-sm tracking-wide ${col.headerText}`}>
            {col.title}
          </div>
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${col.badge}`}
          >
            {leads.length}
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {col.subtitle}
          {col.kind === "manual" && (
            <span className="ml-1 italic">(manual)</span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {leads.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-6 italic">
            sin leads
          </div>
        )}
        {leads.map((lead) => {
          const key = buildKey(lead.business, lead.user_id);
          const status = statuses[key];
          return (
            <LeadCard
              key={key}
              lead={lead}
              currentColumn={col.id}
              manualStatus={status?.manual_status ?? null}
              onClick={() => onCardClick(lead)}
              onChangeStatus={onChangeStatus}
            />
          );
        })}
      </div>
    </div>
  );
}

// ---------- Card ----------

interface LeadCardProps {
  lead: Lead;
  currentColumn: ColumnId;
  manualStatus: ManualStatus;
  onClick: () => void;
  onChangeStatus: (
    lead: Lead,
    newStatus: ManualStatus,
    notes?: string
  ) => Promise<boolean>;
}

function LeadCard({
  lead,
  currentColumn,
  manualStatus,
  onClick,
  onChangeStatus,
}: LeadCardProps) {
  const [busy, setBusy] = useState(false);
  const lastSignal = lead.signals_history?.slice(-1)[0];
  const emoji = BUSINESS_EMOJI[lead.business] || "•";

  async function move(target: ManualStatus, e: React.MouseEvent) {
    e.stopPropagation();
    setBusy(true);
    await onChangeStatus(lead, target);
    setBusy(false);
  }

  // Buttons depend on the current column
  const isManualCol = currentColumn === "contacted" || currentColumn === "won" || currentColumn === "lost";

  return (
    <div
      onClick={onClick}
      className="rounded-md border bg-background hover:bg-accent/40 transition-colors p-2.5 cursor-pointer text-xs space-y-2 shadow-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-mono text-[11px] truncate flex items-center gap-1">
          <span>{emoji}</span>
          <span className="truncate" title={lead.user_id}>
            {truncateUserId(lead.user_id)}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${scoreBadgeClasses(lead.score)}`}
        >
          {lead.score}
        </span>
      </div>

      {lastSignal && (
        <div className="text-[11px] text-muted-foreground line-clamp-2">
          <span className="font-medium">{lastSignal.signals.join(", ")}</span>
          {lastSignal.message_preview && (
            <span className="italic block">"{lastSignal.message_preview}"</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <MessageSquare className="h-3 w-3" />
          {lead.messages_count}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo(lead.last_update)}
        </span>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-1 pt-1 border-t">
        {!isManualCol && manualStatus !== "contacted" && (
          <button
            onClick={(e) => move("contacted", e)}
            disabled={busy}
            className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 disabled:opacity-50"
          >
            Contactar
          </button>
        )}
        {!isManualCol && (
          <button
            onClick={(e) => move("won", e)}
            disabled={busy}
            className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 disabled:opacity-50"
          >
            Won
          </button>
        )}
        {!isManualCol && (
          <button
            onClick={(e) => move("lost", e)}
            disabled={busy}
            className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-500/25 disabled:opacity-50"
          >
            Lost
          </button>
        )}
        {isManualCol && (
          <>
            {currentColumn !== "contacted" && (
              <button
                onClick={(e) => move("contacted", e)}
                disabled={busy}
                className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 disabled:opacity-50"
              >
                A Contactar
              </button>
            )}
            {currentColumn !== "won" && (
              <button
                onClick={(e) => move("won", e)}
                disabled={busy}
                className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 disabled:opacity-50"
              >
                Won
              </button>
            )}
            {currentColumn !== "lost" && (
              <button
                onClick={(e) => move("lost", e)}
                disabled={busy}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-500/25 disabled:opacity-50"
              >
                Lost
              </button>
            )}
            <button
              onClick={(e) => move(null, e)}
              disabled={busy}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted/80 disabled:opacity-50"
              title="Volver a columna automatica por score"
            >
              Reset
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Modal ----------

interface LeadDetailModalProps {
  lead: Lead;
  status?: LeadStatusEntry;
  onClose: () => void;
  onChangeStatus: (
    lead: Lead,
    newStatus: ManualStatus,
    notes?: string
  ) => Promise<boolean>;
}

function LeadDetailModal({
  lead,
  status,
  onClose,
  onChangeStatus,
}: LeadDetailModalProps) {
  const [notes, setNotes] = useState<string>(status?.notes ?? "");
  const [savingStatus, setSavingStatus] = useState<ManualStatus | "none" | null>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  // When the lead being shown changes, reset notes
  useEffect(() => {
    setNotes(status?.notes ?? "");
  }, [lead.user_id, lead.business, status?.notes]);

  const currentManual = status?.manual_status ?? null;
  const autoCol = autoColumnFromScore(lead.score);

  async function handleSetStatus(target: ManualStatus) {
    setSavingStatus(target ?? "none");
    await onChangeStatus(lead, target, notes);
    setSavingStatus(null);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    // Save notes: preserve current manual status if any, else just attach notes
    // by promoting to "contacted" if there isn't a manual status yet
    const target: ManualStatus = currentManual ?? "contacted";
    await onChangeStatus(lead, target, notes);
    setSavingNotes(false);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-card">
          <div className="flex items-center gap-2">
            <span className="text-xl">{BUSINESS_EMOJI[lead.business] || "•"}</span>
            <div>
              <div className="font-mono text-sm">{lead.user_id}</div>
              <div className="text-xs text-muted-foreground">{lead.business}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-md"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Score + status snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div className="border rounded p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Score</div>
              <div className={`font-bold inline-block px-2 py-0.5 rounded mt-1 ${scoreBadgeClasses(lead.score)}`}>
                {lead.score}
              </div>
            </div>
            <div className="border rounded p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Mensajes</div>
              <div className="font-semibold mt-1">{lead.messages_count}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Auto-col</div>
              <div className="font-semibold mt-1 uppercase">{autoCol}</div>
            </div>
            <div className="border rounded p-2">
              <div className="text-[10px] uppercase text-muted-foreground">Manual</div>
              <div className="font-semibold mt-1 uppercase">
                {currentManual ?? "—"}
              </div>
            </div>
          </div>

          {lead.handoff_triggered && (
            <div className="border-l-4 border-red-500 bg-red-500/10 px-3 py-2 text-xs rounded">
              Handoff disparado{lead.handoff_at ? ` el ${new Date(lead.handoff_at).toLocaleString("es-CR")}` : ""}
            </div>
          )}

          {/* Signals history */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Historial de senales</h3>
            <div className="border rounded-md max-h-56 overflow-y-auto">
              {(!lead.signals_history || lead.signals_history.length === 0) && (
                <div className="p-3 text-xs text-muted-foreground italic">
                  Sin senales registradas
                </div>
              )}
              {lead.signals_history?.slice().reverse().map((s, i) => (
                <div key={i} className="border-b last:border-b-0 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{s.signals.join(", ") || "—"}</span>
                    <span className={`font-mono ${s.delta > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                      {s.delta > 0 ? "+" : ""}
                      {s.delta}
                    </span>
                  </div>
                  {s.message_preview && (
                    <div className="text-muted-foreground italic mt-1 line-clamp-2">
                      "{s.message_preview}"
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(s.timestamp).toLocaleString("es-CR")}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-semibold block mb-1">Notas del operador</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Ej: Llame, no contesto. Reagendar para manana."
              className="w-full border rounded-md p-2 text-sm bg-background"
            />
            {status?.updated_at && (
              <div className="text-[10px] text-muted-foreground mt-1">
                Ultimo update: {new Date(status.updated_at).toLocaleString("es-CR")}
                {status.operator ? ` · ${status.operator}` : ""}
              </div>
            )}
            <button
              onClick={handleSaveNotes}
              disabled={savingNotes}
              className="mt-2 text-xs px-3 py-1 bg-primary text-primary-foreground rounded-md hover:opacity-90 disabled:opacity-60"
            >
              {savingNotes ? "Guardando..." : "Guardar notas"}
            </button>
          </div>

          {/* Change manual status */}
          <div>
            <div className="text-sm font-semibold mb-2">Cambiar estado manual</div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSetStatus("contacted")}
                disabled={savingStatus !== null || currentManual === "contacted"}
                className="text-xs px-3 py-1.5 rounded-md bg-blue-500/15 text-blue-700 dark:text-blue-300 hover:bg-blue-500/25 disabled:opacity-50"
              >
                {savingStatus === "contacted" ? "..." : "Marcar Contacted"}
              </button>
              <button
                onClick={() => handleSetStatus("won")}
                disabled={savingStatus !== null || currentManual === "won"}
                className="text-xs px-3 py-1.5 rounded-md bg-green-500/15 text-green-700 dark:text-green-300 hover:bg-green-500/25 disabled:opacity-50"
              >
                {savingStatus === "won" ? "..." : "Marcar Won"}
              </button>
              <button
                onClick={() => handleSetStatus("lost")}
                disabled={savingStatus !== null || currentManual === "lost"}
                className="text-xs px-3 py-1.5 rounded-md bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-500/25 disabled:opacity-50"
              >
                {savingStatus === "lost" ? "..." : "Marcar Lost"}
              </button>
              <button
                onClick={() => handleSetStatus(null)}
                disabled={savingStatus !== null || currentManual === null}
                className="text-xs px-3 py-1.5 rounded-md bg-muted hover:bg-muted/80 disabled:opacity-50"
                title="Volver a columna automatica por score"
              >
                {savingStatus === "none" ? "..." : "Reset"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
