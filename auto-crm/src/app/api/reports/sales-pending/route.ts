import { NextResponse } from "next/server";
import { db } from "@/db";
import { deals, contacts, activities, pipelineStages } from "@/db/schema";
import { eq, isNull, desc } from "drizzle-orm";

export async function GET() {
  const allDeals = db
    .select({
      id: deals.id,
      title: deals.title,
      value: deals.value,
      probability: deals.probability,
      expectedClose: deals.expectedClose,
      notes: deals.notes,
      stageId: deals.stageId,
      stageName: pipelineStages.name,
      stageOrder: pipelineStages.order,
      isWon: pipelineStages.isWon,
      isLost: pipelineStages.isLost,
      contactId: deals.contactId,
      contactName: contacts.name,
      contactPhone: contacts.phone,
      contactTemperature: contacts.temperature,
      contactSource: contacts.source,
    })
    .from(deals)
    .leftJoin(contacts, eq(deals.contactId, contacts.id))
    .leftJoin(pipelineStages, eq(deals.stageId, pipelineStages.id))
    .orderBy(desc(deals.value))
    .all();

  const overdueFollowups = db
    .select({
      id: activities.id,
      description: activities.description,
      contactId: activities.contactId,
      dealId: activities.dealId,
      scheduledAt: activities.scheduledAt,
      contactName: contacts.name,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .where(isNull(activities.completedAt))
    .orderBy(desc(activities.scheduledAt))
    .all()
    .filter((a) => a.scheduledAt && new Date(a.scheduledAt) <= new Date());

  const activeDeals = allDeals.filter((d) => !d.isWon && !d.isLost);
  const wonDeals = allDeals.filter((d) => d.isWon);
  const lostDeals = allDeals.filter((d) => d.isLost);

  const negotiation = activeDeals.filter((d) => (d.stageOrder ?? 0) >= 7);
  const proposal = activeDeals.filter((d) => (d.stageOrder ?? 0) === 6);
  const qualified = activeDeals.filter((d) => (d.stageOrder ?? 0) === 5);
  const contacted = activeDeals.filter((d) => (d.stageOrder ?? 0) === 4);
  const newLeads = activeDeals.filter((d) => (d.stageOrder ?? 0) <= 3);

  const pipelineTotal = activeDeals.reduce((s, d) => s + (d.value || 0), 0);
  const wonTotal = wonDeals.reduce((s, d) => s + (d.value || 0), 0);
  const overdueValue = overdueFollowups.reduce((s, f) => {
    const deal = activeDeals.find((d) => d.id === f.dealId);
    return s + (deal?.value || 0);
  }, 0);
  const probableClose = negotiation.reduce(
    (s, d) => s + ((d.value || 0) * (d.probability || 0)) / 100,
    0
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat("es-CR").format(Math.round(v / 100));

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      pipelineTotal: fmt(pipelineTotal),
      wonThisMonth: fmt(wonTotal),
      probableClose: fmt(probableClose),
      overdueFollowups: overdueFollowups.length,
      overdueValue: fmt(overdueValue),
      activeDeals: activeDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
    },
    urgent: overdueFollowups.map((f) => {
      const deal = activeDeals.find((d) => d.id === f.dealId);
      return {
        contact: f.contactName,
        action: f.description,
        scheduledAt: f.scheduledAt,
        dealValue: deal ? fmt(deal.value || 0) : null,
        dealProbability: deal?.probability,
      };
    }),
    negotiation: negotiation.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: fmt(d.value || 0),
      probability: d.probability,
      phone: d.contactPhone,
      notes: d.notes,
      expectedClose: d.expectedClose,
    })),
    proposalSent: proposal.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: fmt(d.value || 0),
      probability: d.probability,
      phone: d.contactPhone,
      notes: d.notes,
    })),
    qualified: qualified.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: fmt(d.value || 0),
      probability: d.probability,
      phone: d.contactPhone,
      source: d.contactSource,
    })),
    contacted: contacted.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: fmt(d.value || 0),
      phone: d.contactPhone,
    })),
    newLeads: newLeads.map((d) => ({
      contact: d.contactName,
      title: d.title,
      value: fmt(d.value || 0),
      source: d.contactSource,
      temperature: d.contactTemperature,
      phone: d.contactPhone,
    })),
    topActions: [
      negotiation[0]
        ? `${negotiation[0].contactName} - ${negotiation[0].title} - Cerrar YA`
        : null,
      negotiation[1]
        ? `${negotiation[1].contactName} - ${negotiation[1].title} - Seguimiento`
        : null,
      proposal[0]
        ? `${proposal[0].contactName} - ${proposal[0].title} - Confirmar`
        : null,
    ].filter(Boolean),
  };

  return NextResponse.json(report);
}
