import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { deals, contacts, pipelineStages } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { DEFAULT_BUSINESS, resolveBusinessId } from "@/lib/businessConfig";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessParam = searchParams.get("business");
  const cookieStore = await cookies();
  const businessRaw =
    businessParam || cookieStore.get("business")?.value || DEFAULT_BUSINESS;
  const business = businessRaw === "all" ? "all" : resolveBusinessId(businessRaw);

  let query = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      stageId: deals.stageId,
      contactId: deals.contactId,
      expectedClose: deals.expectedClose,
      probability: deals.probability,
      notes: deals.notes,
      business: deals.business,
      createdAt: deals.createdAt,
      updatedAt: deals.updatedAt,
      contactName: contacts.name,
      contactEmail: contacts.email,
      contactTemperature: contacts.temperature,
      stageName: pipelineStages.name,
      stageColor: pipelineStages.color,
      stageOrder: pipelineStages.order,
      stageIsWon: pipelineStages.isWon,
      stageIsLost: pipelineStages.isLost,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id));

  if (business !== "all") {
    query = query.where(eq(deals.business, business)) as typeof query;
  }

  const results = await query.orderBy(desc(deals.createdAt)).all();
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
    title,
    value,
    stageId,
    contactId,
    expectedClose,
    probability,
    notes,
    business: bodyBusiness,
  } = body;

  if (!title || !contactId) {
    return NextResponse.json(
      { error: "Titulo y contacto son requeridos" },
      { status: 400 }
    );
  }

  // Get first stage if none provided
  let finalStageId = stageId;
  if (!finalStageId) {
    const firstStage = await db
      .select()
      .from(pipelineStages)
      .orderBy(pipelineStages.order)
      .limit(1)
      .get();
    finalStageId = firstStage?.id;
  }

  if (!finalStageId) {
    return NextResponse.json(
      { error: "No hay etapas de pipeline configuradas" },
      { status: 400 }
    );
  }

  // Resolver business: body > cookie > business del contacto > default
  const cookieStore = await cookies();
  let resolvedBusiness =
    bodyBusiness || cookieStore.get("business")?.value || null;
  if (!resolvedBusiness) {
    const contact = await db
      .select({ business: contacts.business })
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .get();
    resolvedBusiness = contact?.business || null;
  }
  const business = resolveBusinessId(resolvedBusiness);

  try {
    const now = new Date();
    const result = await db
      .insert(deals)
      .values({
        title,
        value: value || 0,
        stageId: finalStageId,
        contactId,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
        probability: Math.max(0, Math.min(100, Number(probability) || 0)),
        notes: notes || null,
        business,
        createdAt: now,
        updatedAt: now,
      })
      .returning()
      .get();

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown";
    if (msg.includes("FOREIGN KEY")) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: `Error al crear deal: ${msg}` },
      { status: 500 }
    );
  }
}
