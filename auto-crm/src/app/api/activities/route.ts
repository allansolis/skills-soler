import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { activities, contacts } from "@/db/schema";
import { eq, desc, and, or, isNull, SQL } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const contactId = searchParams.get("contactId");
  const dealId = searchParams.get("dealId");
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const businessRaw =
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS;
  const business = businessRaw === "all" ? "all" : resolveBusinessId(businessRaw);

  const filters: SQL[] = [];

  // Filtrar por business salvo "all". Aceptar activities legacy sin business si el contacto coincide.
  if (business && business !== "all") {
    filters.push(
      or(
        eq(activities.business, business),
        and(isNull(activities.business), eq(contacts.business, business))
      )!
    );
  }

  if (contactId) {
    filters.push(eq(activities.contactId, contactId));
  }

  if (dealId) {
    filters.push(eq(activities.dealId, dealId));
  }

  let query = db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactId: activities.contactId,
      dealId: activities.dealId,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
      contactName: contacts.name,
      business: activities.business,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id));

  if (filters.length > 0) {
    query = query.where(and(...filters)!) as typeof query;
  }

  const results = query.orderBy(desc(activities.createdAt)).all();
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
    type,
    description,
    contactId,
    dealId,
    scheduledAt,
    business: bodyBusiness,
  } = body;

  if (!type || !description || !contactId) {
    return NextResponse.json(
      { error: "Tipo, descripcion y contacto son requeridos" },
      { status: 400 }
    );
  }

  // Resolver business: body > cookie > business del contacto > default
  const cookieStore = await cookies();
  let resolvedBusiness =
    bodyBusiness || cookieStore.get("business")?.value || null;
  if (!resolvedBusiness) {
    const contact = db
      .select({ business: contacts.business })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .get();
    resolvedBusiness = contact?.business || null;
  }
  const business = resolveBusinessId(resolvedBusiness);

  try {
    const result = db
      .insert(activities)
      .values({
        type,
        description,
        contactId,
        dealId: dealId || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        completedAt: null,
        business,
        createdAt: new Date(),
      })
      .returning()
      .get();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    return NextResponse.json(
      { error: `Error al crear actividad: ${msg}` },
      { status: 500 }
    );
  }
}
