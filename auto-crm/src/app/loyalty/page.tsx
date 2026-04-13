import { db } from "@/db";
import {
  contacts,
  deals,
  pipelineStages,
  loyaltyPrograms,
  loyaltyTiers,
  loyaltyActions,
} from "@/db/schema";
import { asc, desc } from "drizzle-orm";
import { LoyaltyDashboard } from "@/components/loyalty/LoyaltyDashboard";

export const dynamic = "force-dynamic";

export default function LoyaltyPage() {
  const programs = db.select().from(loyaltyPrograms).all();
  const tiers = db
    .select()
    .from(loyaltyTiers)
    .orderBy(asc(loyaltyTiers.order))
    .all();
  const actions = db
    .select()
    .from(loyaltyActions)
    .orderBy(desc(loyaltyActions.createdAt))
    .limit(20)
    .all();

  const allContacts = db.select().from(contacts).all();
  const allDeals = db.select().from(deals).all();
  const stages = db.select().from(pipelineStages).all();

  // Build eligible contacts list
  const eligibleContacts = allContacts
    .map((contact) => {
      const contactDeals = allDeals.filter((d) => d.contactId === contact.id);
      const activeDeals = contactDeals.filter((d) => {
        const stage = stages.find((s) => s.id === d.stageId);
        return stage && !stage.isWon && !stage.isLost;
      });
      const wonDeals = contactDeals.filter((d) => {
        const stage = stages.find((s) => s.id === d.stageId);
        return stage?.isWon;
      });

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
        whatsappPhone: contact.whatsappPhone || contact.phone || "",
        loyaltyTier: contact.loyaltyTier || "none",
        loyaltyPoints: contact.loyaltyPoints || 0,
        totalPurchases: contact.totalPurchases || 0,
        temperature: contact.temperature,
        activeDealsValue: activeDeals.reduce((s, d) => s + d.value, 0),
        wonDealsValue: wonDeals.reduce((s, d) => s + d.value, 0),
        closeToDeal: isCloseToDeal,
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
        c.wonDealsValue > 0 ||
        c.temperature === "hot"
    )
    .sort((a, b) => {
      if (a.closeToDeal && !b.closeToDeal) return -1;
      if (!a.closeToDeal && b.closeToDeal) return 1;
      return b.loyaltyPoints - a.loyaltyPoints;
    });

  const tierDistribution = tiers.map((tier) => ({
    name: tier.name,
    color: tier.color,
    count: allContacts.filter(
      (c) => (c.loyaltyTier || "none").toLowerCase() === tier.name.toLowerCase()
    ).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Programa de Lealtad</h1>
        <p className="text-sm text-muted-foreground">
          {programs[0]?.name || "Programa Esmeralda SOLER"} — Fideliza clientes y cierra ventas
        </p>
      </div>

      <LoyaltyDashboard
        program={programs[0] || null}
        tiers={tiers.map((t) => ({
          ...t,
          benefits: t.benefits ? JSON.parse(t.benefits) : [],
        }))}
        recentActions={actions}
        eligibleContacts={eligibleContacts}
        tierDistribution={tierDistribution}
        totalMembers={
          allContacts.filter((c) => c.loyaltyTier && c.loyaltyTier !== "none")
            .length
        }
      />
    </div>
  );
}
