import { db } from "@/db";
import { contacts, deals, activities, pipelineStages, conversations } from "@/db/schema";
import { eq, asc, desc, and } from "drizzle-orm";
import { getBusinessFromCookies, BUSINESS_LABELS } from "@/lib/getBusinessFromCookies";
import { KPICards } from "@/components/dashboard/KPICards";
import { PipelineChart } from "@/components/dashboard/PipelineChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { NotificationBanner } from "@/components/dashboard/NotificationBanner";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { SourceChart } from "@/components/dashboard/SourceChart";
import { LeadTemperaturePanel } from "@/components/dashboard/LeadTemperaturePanel";
import { MetaChannelStats } from "@/components/dashboard/MetaChannelStats";
import { MultiBusinessLeadsWidget } from "@/components/dashboard/MultiBusinessLeadsWidget";
import { SOURCE_LABELS } from "@/lib/constants";
import type { DashboardStats, SourceDistribution, MonthlyMetric } from "@/types";

export const dynamic = "force-dynamic";

function getMonthKey(date: Date | number): string {
  const d = date instanceof Date ? date : new Date(typeof date === "number" && date < 1e12 ? date * 1000 : Number(date));
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
}

export default async function DashboardPage() {
  const business = await getBusinessFromCookies();
  const bizLabel = BUSINESS_LABELS[business];

  const allContacts = db.select().from(contacts).where(eq(contacts.business, business)).all();
  const allDeals = db.select().from(deals).where(eq(deals.business, business)).all();
  const stages = db
    .select()
    .from(pipelineStages)
    .orderBy(asc(pipelineStages.order))
    .all();

  const activeDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage && !stage.isWon && !stage.isLost;
  });

  const wonDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage?.isWon;
  });

  const lostDeals = allDeals.filter((d) => {
    const stage = stages.find((s) => s.id === d.stageId);
    return stage?.isLost;
  });

  const wonDealsValue = wonDeals.reduce((sum, d) => sum + d.value, 0);
  const totalPipelineValue = activeDeals.reduce((sum, d) => sum + d.value, 0);

  const stats: DashboardStats = {
    totalContacts: allContacts.length,
    activeDeals: activeDeals.length,
    totalPipelineValue,
    wonDealsValue,
    conversionRate:
      allDeals.length > 0
        ? Math.round((wonDeals.length / allDeals.length) * 100)
        : 0,
    hotLeads: allContacts.filter((c) => c.temperature === "hot").length,
    warmLeads: allContacts.filter((c) => c.temperature === "warm").length,
    coldLeads: allContacts.filter((c) => c.temperature === "cold").length,
    lostDeals: lostDeals.length,
    lostDealsValue: lostDeals.reduce((sum, d) => sum + d.value, 0),
    avgDealValue:
      wonDeals.length > 0 ? Math.round(wonDealsValue / wonDeals.length) : 0,
    totalDeals: allDeals.length,
    wonDealsCount: wonDeals.length,
  };

  // Pipeline chart data
  const pipelineData = stages
    .filter((s) => !s.isLost)
    .map((stage) => ({
      name: stage.name,
      count: allDeals.filter((d) => d.stageId === stage.id).length,
      value: allDeals
        .filter((d) => d.stageId === stage.id)
        .reduce((sum, d) => sum + d.value, 0),
      color: stage.color,
    }));

  // Source distribution
  const sourceMap = new Map<string, number>();
  for (const contact of allContacts) {
    const src = contact.source || "otro";
    sourceMap.set(src, (sourceMap.get(src) || 0) + 1);
  }
  const sourceData: SourceDistribution[] = Array.from(sourceMap.entries()).map(
    ([source, count]) => ({
      source,
      label: SOURCE_LABELS[source as keyof typeof SOURCE_LABELS] || source,
      count,
      color: "",
    })
  );

  // Monthly metrics (last 6 months)
  const now = new Date();
  const monthlyMap = new Map<string, MonthlyMetric>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = getMonthKey(d);
    monthlyMap.set(key, { month: key, contacts: 0, deals: 0, revenue: 0 });
  }

  for (const contact of allContacts) {
    const key = getMonthKey(contact.createdAt);
    const entry = monthlyMap.get(key);
    if (entry) entry.contacts++;
  }

  for (const deal of wonDeals) {
    const key = getMonthKey(deal.createdAt);
    const entry = monthlyMap.get(key);
    if (entry) {
      entry.deals++;
      entry.revenue += deal.value;
    }
  }

  const monthlyData: MonthlyMetric[] = Array.from(monthlyMap.values());

  // Recent activities
  const recentActivities = db
    .select({
      id: activities.id,
      type: activities.type,
      description: activities.description,
      contactName: contacts.name,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(contacts, eq(activities.contactId, contacts.id))
    .orderBy(desc(activities.createdAt))
    .limit(8)
    .all();

  const isFirstRun = allContacts.length === 0 && allDeals.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Dashboard <span style={{ color: bizLabel.color }}>
              {bizLabel.emoji} {bizLabel.name}
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {allContacts.length} contactos · {allDeals.length} deals · solo de esta marca
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs text-muted-foreground">Ultima actualizacion</p>
          <p className="text-sm font-medium tabular-nums">
            {new Date().toLocaleDateString("es-CR", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Onboarding */}
      {isFirstRun && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6">
          <h2 className="text-lg font-semibold mb-2">
            Bienvenido a CRM SOLER
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Tu CRM esta listo. Aqui tienes como comenzar:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">1. Personaliza tu CRM</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejecuta <code className="bg-muted px-1 rounded">/setup</code> en
                Claude Code
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">2. Agrega contactos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ve a Contactos o usa{" "}
                <code className="bg-muted px-1 rounded">/add-lead</code>
              </p>
            </div>
            <div className="p-3 rounded-lg bg-card border">
              <p className="font-medium">3. Carga datos demo</p>
              <p className="text-xs text-muted-foreground mt-1">
                Ejecuta{" "}
                <code className="bg-muted px-1 rounded">npm run seed</code> en
                terminal
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications */}
      <NotificationBanner />

      {/* KPI Cards - 8 metricas */}
      <KPICards stats={stats} />

      {/* Fila 2: Revenue trend + Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RevenueChart data={monthlyData} />
        <PipelineChart data={pipelineData} />
      </div>

      {/* Fila 3: Meta channels + Sources + Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetaChannelStats
          whatsappContacts={allContacts.filter((c) => c.whatsappPhone).length}
          igContacts={allContacts.filter((c) => c.instagramHandle).length}
          fbContacts={allContacts.filter((c) => c.facebookId).length}
          totalConversations={db.select().from(conversations).all().length}
          loyaltyMembers={allContacts.filter((c) => c.loyaltyTier && c.loyaltyTier !== "none").length}
        />
        <SourceChart data={sourceData} />
        <LeadTemperaturePanel
          hot={stats.hotLeads}
          warm={stats.warmLeads}
          cold={stats.coldLeads}
        />
      </div>

      {/* Fila 3.5: Multi-business leads (4 Elenas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MultiBusinessLeadsWidget />
      </div>

      {/* Fila 4: Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-3">
        <RecentActivity
          activities={
            recentActivities as Array<{
              id: string;
              type: string;
              description: string;
              contactName: string | null;
              createdAt: number | Date;
            }>
          }
        />
        </div>
      </div>
    </div>
  );
}
