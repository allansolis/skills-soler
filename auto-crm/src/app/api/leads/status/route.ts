// API route: gestion del estado MANUAL de leads (Kanban)
// POST /api/leads/status  -> set/update manual status para un lead
// GET  /api/leads/status  -> retorna todo el mapa de statuses manuales
//
// Persistencia: data/leads-statuses.json en el repo CRM.
// Clave compuesta: "{business}:{user_id}"
//
// Estados manuales soportados: contacted | won | lost
// Si manual_status es null/undefined -> el lead vuelve a su columna automatica (por score)

import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const dynamic = "force-dynamic";

const STATUSES_FILE = path.join(process.cwd(), "data", "leads-statuses.json");

export type ManualStatus = "contacted" | "won" | "lost" | null;

export interface LeadStatusEntry {
  manual_status: ManualStatus;
  updated_at: string;
  operator?: string;
  notes?: string;
}

type StatusesMap = Record<string, LeadStatusEntry>;

async function readStatuses(): Promise<StatusesMap> {
  try {
    const raw = await fs.readFile(STATUSES_FILE, "utf8");
    return JSON.parse(raw) as StatusesMap;
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return {};
    }
    throw err;
  }
}

async function writeStatuses(data: StatusesMap): Promise<void> {
  await fs.mkdir(path.dirname(STATUSES_FILE), { recursive: true });
  await fs.writeFile(STATUSES_FILE, JSON.stringify(data, null, 2), "utf8");
}

function buildKey(business: string, user_id: string): string {
  return `${business}:${user_id}`;
}

const ALLOWED_STATUSES = new Set<string>(["contacted", "won", "lost"]);

export async function GET() {
  const statuses = await readStatuses();
  return NextResponse.json({
    ok: true,
    count: Object.keys(statuses).length,
    statuses,
  });
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Body invalido (debe ser JSON)" },
      { status: 400 }
    );
  }

  const { business, user_id, new_status, notes, operator } = body || {};

  if (!business || typeof business !== "string") {
    return NextResponse.json(
      { ok: false, error: "business requerido" },
      { status: 400 }
    );
  }
  if (!user_id || typeof user_id !== "string") {
    return NextResponse.json(
      { ok: false, error: "user_id requerido" },
      { status: 400 }
    );
  }

  // new_status puede ser null/undefined para borrar el estado manual y devolver el lead a su columna automatica.
  if (
    new_status !== null &&
    new_status !== undefined &&
    !ALLOWED_STATUSES.has(new_status)
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: `new_status invalido: ${new_status}. Permitidos: contacted, won, lost, null`,
      },
      { status: 400 }
    );
  }

  const statuses = await readStatuses();
  const key = buildKey(business, user_id);

  if (new_status === null || new_status === undefined) {
    // Reset: borrar el estado manual
    delete statuses[key];
    await writeStatuses(statuses);
    return NextResponse.json({
      ok: true,
      key,
      current_status: null,
    });
  }

  const existing = statuses[key] || {};
  const entry: LeadStatusEntry = {
    manual_status: new_status as ManualStatus,
    updated_at: new Date().toISOString(),
    operator: operator ?? existing.operator ?? "Allann",
    notes: notes !== undefined ? notes : existing.notes,
  };

  statuses[key] = entry;
  await writeStatuses(statuses);

  return NextResponse.json({
    ok: true,
    key,
    current_status: entry.manual_status,
    entry,
  });
}
