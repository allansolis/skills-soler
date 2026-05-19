import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, like, or, desc, and, SQL } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const temperature = searchParams.get("temperature");
  const source = searchParams.get("source");
  const businessParam = searchParams.get("business");

  // Leer business cookie si no viene en query
  const cookieStore = await cookies();
  const businessRaw =
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS;
  const business = businessRaw === "all" ? "all" : resolveBusinessId(businessRaw);

  const filters: SQL[] = [];

  // Filtro business (a menos que sea "all")
  if (business && business !== "all") {
    filters.push(eq(contacts.business, business));
  }

  if (search) {
    filters.push(
      or(
        like(contacts.name, `%${search}%`),
        like(contacts.email, `%${search}%`),
        like(contacts.company, `%${search}%`)
      )!
    );
  }

  if (temperature) {
    filters.push(eq(contacts.temperature, temperature));
  }

  if (source) {
    filters.push(eq(contacts.source, source));
  }

  let query = db.select().from(contacts);
  if (filters.length > 0) {
    query = query.where(and(...filters)!) as typeof query;
  }

  const results = query.orderBy(desc(contacts.createdAt)).all();
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const {
    name,
    email,
    phone,
    company,
    source,
    temperature,
    score,
    notes,
    business: bodyBusiness,
  } = body;

  if (!name) {
    return NextResponse.json(
      { error: "El nombre es requerido" },
      { status: 400 }
    );
  }

  // Resolver business: body > cookie > default. Asegura que NUNCA se cree huerfano.
  const cookieStore = await cookies();
  const business = resolveBusinessId(
    bodyBusiness || cookieStore.get("business")?.value
  );

  try {
    const now = new Date();
    const result = db
      .insert(contacts)
      .values({
        name,
        email: email || null,
        phone: phone || null,
        company: company || null,
        source: source || "otro",
        temperature: temperature || "cold",
        score: score || 0,
        notes: notes || null,
        business,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: `Error al crear contacto: ${error instanceof Error ? error.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
