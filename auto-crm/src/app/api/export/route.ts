import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { contacts, deals, pipelineStages } from "@/db/schema";
import { eq, desc, asc, and, SQL } from "drizzle-orm";
import { formatDate, formatCurrency } from "@/lib/constants";
import { SOURCE_LABELS } from "@/lib/constants";
import {
  BUSINESS_CONFIGS,
  DEFAULT_BUSINESS,
  resolveBusinessId,
} from "@/lib/businessConfig";
import type { LeadSource } from "@/types";

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "contacts";
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const businessRaw =
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS;
  const business = businessRaw === "all" ? "all" : resolveBusinessId(businessRaw);
  const today = new Date().toISOString().split("T")[0];
  const fileTag = business === "all" ? "all" : business;
  // Currency segun marca (Glass/Inversiones USD, Esmeraldas/Autos CRC)
  const currency =
    business !== "all" ? BUSINESS_CONFIGS[business].currency : "CRC";

  if (type === "contacts") {
    const filters: SQL[] = [];
    if (business !== "all") {
      filters.push(eq(contacts.business, business));
    }

    let q = db.select().from(contacts);
    if (filters.length > 0) {
      q = q.where(and(...filters)!) as typeof q;
    }
    const allContacts = q.orderBy(desc(contacts.createdAt)).all();

    const headers = [
      "Nombre",
      "Email",
      "Telefono",
      "Empresa",
      "Negocio",
      "Fuente",
      "Temperatura",
      "Score",
      "Notas",
      "Fecha de creacion",
    ];

    const rows = allContacts.map((c) => [
      c.name,
      c.email || "",
      c.phone || "",
      c.company || "",
      c.business || "",
      SOURCE_LABELS[c.source as LeadSource] || c.source,
      c.temperature === "hot"
        ? "Caliente"
        : c.temperature === "warm"
          ? "Tibio"
          : "Frio",
      String(c.score),
      c.notes || "",
      formatDate(c.createdAt),
    ]);

    const csv = buildCSV(headers, rows);

    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="contactos-${fileTag}-${today}.csv"`,
      },
    });
  }

  if (type === "deals") {
    const filters: SQL[] = [];
    if (business !== "all") {
      filters.push(eq(deals.business, business));
    }

    let q = db
      .select({
        title: deals.title,
        value: deals.value,
        probability: deals.probability,
        notes: deals.notes,
        expectedClose: deals.expectedClose,
        business: deals.business,
        createdAt: deals.createdAt,
        contactName: contacts.name,
        stageName: pipelineStages.name,
      })
      .from(deals)
      .leftJoin(contacts, eq(deals.contactId, contacts.id))
      .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id));

    if (filters.length > 0) {
      q = q.where(and(...filters)!) as typeof q;
    }
    const allDeals = q.orderBy(asc(pipelineStages.order)).all();

    const headers = [
      "Titulo",
      "Valor",
      "Contacto",
      "Etapa",
      "Negocio",
      "Probabilidad",
      "Cierre Estimado",
      "Notas",
      "Fecha de creacion",
    ];

    const rows = allDeals.map((d) => [
      d.title,
      formatCurrency(d.value, currency),
      d.contactName || "",
      d.stageName || "",
      d.business || "",
      `${d.probability}%`,
      formatDate(d.expectedClose),
      d.notes || "",
      formatDate(d.createdAt),
    ]);

    const csv = buildCSV(headers, rows);

    return new Response("﻿" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="deals-${fileTag}-${today}.csv"`,
      },
    });
  }

  return new Response("Tipo invalido. Use ?type=contacts o ?type=deals", {
    status: 400,
  });
}
