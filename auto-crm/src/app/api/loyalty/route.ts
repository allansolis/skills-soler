import { db } from "@/db";
import {
  contacts,
  deals,
  pipelineStages,
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyActions,
} from "@/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { NextResponse } from "next/server";

// GET /api/loyalty — Full loyalty dashboard data
export async function GET() {
  const programs = await db.select().from(loyaltyPrograms).all();
  const tiers = await db
    .select()
    .from(loyaltyTiers)
    .orderBy(asc(loyaltyTiers.order))
    .all();
  const actions = await db
    .select()
    .from(loyaltyActions)
    .orderBy(desc(loyaltyActions.createdAt))
    .limit(50)
    .all();

  const allContacts = await db.select().from(contacts).all();
  const allDeals = await db.select().from(deals).all();
  const stages = await db.select().from(pipelineStages).all();

  // Find contacts close to closing a deal (Negociacion or Propuesta stage)
  const closeToClosing = allContacts
    .map((contact) => {
      const contactDeals = allDeals.filter(
        (d) => d.contactId === contact.id
      );
      const activeDeals = contactDeals.filter((d) => {
        const stage = stages.find((s) => s.id === d.stageId);
        return stage && !stage.isWon && !stage.isLost;
      });
      const wonDeals = contactDeals.filter((d) => {
        const stage = stages.find((s) => s.id === d.stageId);
        return stage?.isWon;
      });
      const activeValue = activeDeals.reduce((sum, d) => sum + d.value, 0);
      const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

      // Check if any active deal is in Propuesta or Negociacion
      const isCloseToDeal = activeDeals.some((d) => {
        const stage = stages.find((s) => s.id === d.stageId);
        return (
          stage &&
          (stage.name === "Negociacion" || stage.name === "Propuesta")
        );
      });

      return {
        id: contact.id,
        name: contact.name,
        whatsappPhone: contact.whatsappPhone,
        phone: contact.phone,
        loyaltyTier: contact.loyaltyTier || "none",
        loyaltyPoints: contact.loyaltyPoints || 0,
        totalPurchases: contact.totalPurchases || 0,
        temperature: contact.temperature,
        activeDealsValue: activeValue,
        wonDealsValue: wonValue,
        closeToDeal: isCloseToDeal,
        dealCount: contactDeals.length,
        currentStage: activeDeals.length > 0
          ? stages.find((s) => s.id === activeDeals[0].stageId)?.name || ""
          : wonDeals.length > 0
          ? "Cerrado Ganado"
          : "",
      };
    })
    .filter(
      (c) =>
        c.closeToDeal ||
        c.loyaltyPoints > 0 ||
        c.totalPurchases > 0 ||
        c.wonDealsValue > 0
    )
    .sort((a, b) => {
      // Priority: close to deal first, then by points
      if (a.closeToDeal && !b.closeToDeal) return -1;
      if (!a.closeToDeal && b.closeToDeal) return 1;
      return b.loyaltyPoints - a.loyaltyPoints;
    });

  // Tier distribution
  const tierDistribution = tiers.map((tier) => ({
    name: tier.name,
    color: tier.color,
    count: allContacts.filter(
      (c) =>
        (c.loyaltyTier || "none").toLowerCase() === tier.name.toLowerCase()
    ).length,
    minPoints: tier.minPoints,
    discountPercent: tier.discountPercent,
  }));

  return NextResponse.json({
    success: true,
    programs,
    tiers: tiers.map((t) => ({
      ...t,
      benefits: t.benefits ? JSON.parse(t.benefits) : [],
    })),
    recentActions: actions,
    eligibleContacts: closeToClosing,
    tierDistribution,
    stats: {
      totalMembers: allContacts.filter(
        (c) => c.loyaltyTier && c.loyaltyTier !== "none"
      ).length,
      totalPoints: allContacts.reduce(
        (sum, c) => sum + (c.loyaltyPoints || 0),
        0
      ),
      closeToClosing: closeToClosing.filter((c) => c.closeToDeal).length,
    },
  });
}

// POST /api/loyalty — Assign loyalty tier or award points
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { contactId, action, points = 0, description, dealId } = body;

    if (!contactId || !action) {
      return NextResponse.json(
        { success: false, error: "contactId and action required" },
        { status: 400 }
      );
    }

    // Log the loyalty action
    await db.insert(loyaltyActions)
      .values({
        contactId,
        action,
        points,
        description: description || `${action}: +${points} puntos`,
        dealId: dealId || null,
      })
      .run();

    // Update contact loyalty points
    const contact = await db
      .select()
      .from(contacts)
      .where(eq(contacts.id, contactId))
      .get();

    if (contact) {
      const newPoints = (contact.loyaltyPoints || 0) + points;
      const newPurchases =
        action === "purchase"
          ? (contact.totalPurchases || 0) + 1
          : contact.totalPurchases || 0;

      // Auto-calculate tier based on points
      const allTiers = await db
        .select()
        .from(loyaltyTiers)
        .orderBy(desc(loyaltyTiers.minPoints))
        .all();

      let newTier = "bronce";
      for (const tier of allTiers) {
        if (newPoints >= tier.minPoints) {
          newTier = tier.name.toLowerCase();
          break;
        }
      }

      await db.update(contacts)
        .set({
          loyaltyPoints: newPoints,
          loyaltyTier: newTier,
          totalPurchases: newPurchases,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, contactId))
        .run();

      return NextResponse.json({
        success: true,
        contact: { ...contact, loyaltyPoints: newPoints, loyaltyTier: newTier },
      });
    }

    return NextResponse.json(
      { success: false, error: "Contact not found" },
      { status: 404 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Error processing loyalty action" },
      { status: 500 }
    );
  }
}
