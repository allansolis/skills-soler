"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Crown,
  Gift,
  Star,
  Trophy,
  Users,
  Gem,
  Target,
  ArrowRight,
  Sparkles,
  Phone,
} from "lucide-react";
import { formatCurrency } from "@/lib/constants";

interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  discountPercent: number;
  benefits: string[];
  color: string;
  order: number;
}

interface EligibleContact {
  id: string;
  name: string;
  whatsappPhone: string | null;
  loyaltyTier: string;
  loyaltyPoints: number;
  totalPurchases: number;
  temperature: string;
  activeDealsValue: number;
  wonDealsValue: number;
  closeToDeal: boolean;
  currentStage: string;
}

interface TierDistribution {
  name: string;
  color: string;
  count: number;
}

interface LoyaltyAction {
  id: string;
  contactId: string;
  action: string;
  points: number;
  description: string | null;
  createdAt: number | Date;
}

interface LoyaltyDashboardProps {
  program: { id: string; name: string; description: string | null } | null;
  tiers: LoyaltyTier[];
  recentActions: LoyaltyAction[];
  eligibleContacts: EligibleContact[];
  tierDistribution: TierDistribution[];
  totalMembers: number;
}

const tierIcons: Record<string, typeof Crown> = {
  bronce: Star,
  plata: Trophy,
  oro: Crown,
  esmeralda: Gem,
};

const actionLabels: Record<string, string> = {
  purchase: "Compra",
  referral: "Referido",
  review: "Resena",
  birthday: "Cumpleanos",
  campaign_response: "Campana",
};

export function LoyaltyDashboard({
  program,
  tiers,
  recentActions,
  eligibleContacts,
  tierDistribution,
  totalMembers,
}: LoyaltyDashboardProps) {
  const [showAll, setShowAll] = useState(false);
  const closeToClosing = eligibleContacts.filter((c) => c.closeToDeal);
  const displayed = showAll ? eligibleContacts : eligibleContacts.slice(0, 8);

  async function awardPoints(contactId: string, points: number) {
    try {
      await fetch("/api/loyalty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          action: "manual",
          points,
          description: `Puntos manuales: +${points}`,
        }),
      });
      window.location.reload();
    } catch {
      // Handle silently
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Miembros Activos
                </p>
                <p className="text-2xl font-bold mt-1">{totalMembers}</p>
                <p className="text-xs text-muted-foreground">en el programa</p>
              </div>
              <div className="rounded-xl p-2.5 bg-emerald-50 dark:bg-emerald-950/50">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Por Cerrar Venta
                </p>
                <p className="text-2xl font-bold mt-1">
                  {closeToClosing.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  en Propuesta/Negociacion
                </p>
              </div>
              <div className="rounded-xl p-2.5 bg-amber-50 dark:bg-amber-950/50">
                <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Puntos Totales
                </p>
                <p className="text-2xl font-bold mt-1">
                  {eligibleContacts
                    .reduce((s, c) => s + c.loyaltyPoints, 0)
                    .toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  distribuidos
                </p>
              </div>
              <div className="rounded-xl p-2.5 bg-violet-50 dark:bg-violet-950/50">
                <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="pt-4 pb-4 px-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Valor Potencial
                </p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(
                    closeToClosing.reduce((s, c) => s + c.activeDealsValue, 0)
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  por cerrar
                </p>
              </div>
              <div className="rounded-xl p-2.5 bg-green-50 dark:bg-green-950/50">
                <Gift className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tiers display */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((tier) => {
          const TierIcon = tierIcons[tier.name.toLowerCase()] || Star;
          const count =
            tierDistribution.find(
              (t) => t.name.toLowerCase() === tier.name.toLowerCase()
            )?.count || 0;

          return (
            <Card
              key={tier.id}
              className="relative overflow-hidden"
              style={{ borderTop: `3px solid ${tier.color}` }}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TierIcon
                      className="h-5 w-5"
                      style={{ color: tier.color }}
                    />
                    <CardTitle className="text-base">{tier.name}</CardTitle>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-xs"
                  >
                    {count} miembros
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-bold">
                    {tier.discountPercent}%
                  </span>
                  <span className="text-xs text-muted-foreground">descuento</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Desde {tier.minPoints.toLocaleString()} puntos
                </p>
                <div className="space-y-1 pt-2 border-t">
                  {tier.benefits.slice(0, 3).map((benefit, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <ArrowRight
                        className="h-3 w-3 mt-0.5 shrink-0"
                        style={{ color: tier.color }}
                      />
                      <span className="text-xs">{benefit}</span>
                    </div>
                  ))}
                  {tier.benefits.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      +{tier.benefits.length - 3} mas...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Clients close to closing + eligible for loyalty */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Clientes para Plan de Lealtad
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Prioridad: clientes cerca de cerrar venta + clientes activos
              </p>
            </div>
            {eligibleContacts.length > 8 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAll(!showAll)}
                className="cursor-pointer"
              >
                {showAll ? "Ver menos" : `Ver todos (${eligibleContacts.length})`}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {displayed.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Agrega contactos y deals para ver clientes elegibles
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayed.map((contact) => {
                const TierIcon =
                  tierIcons[contact.loyaltyTier.toLowerCase()] || Star;
                const tierData = tiers.find(
                  (t) =>
                    t.name.toLowerCase() === contact.loyaltyTier.toLowerCase()
                );

                return (
                  <div
                    key={contact.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      contact.closeToDeal
                        ? "bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    {/* Tier icon */}
                    <div
                      className="rounded-lg p-2 shrink-0"
                      style={{
                        backgroundColor: tierData
                          ? `${tierData.color}15`
                          : "#f1f5f9",
                      }}
                    >
                      <TierIcon
                        className="h-4 w-4"
                        style={{ color: tierData?.color || "#64748b" }}
                      />
                    </div>

                    {/* Contact info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">
                          {contact.name}
                        </span>
                        {contact.closeToDeal && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] px-1.5">
                            {contact.currentStage}
                          </Badge>
                        )}
                        {contact.temperature === "hot" && (
                          <Badge className="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 text-[10px] px-1.5">
                            Caliente
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {contact.whatsappPhone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {contact.whatsappPhone}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {contact.loyaltyPoints} pts
                        </span>
                        {contact.activeDealsValue > 0 && (
                          <span className="text-xs text-amber-600 font-medium">
                            {formatCurrency(contact.activeDealsValue)} en juego
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Tier badge */}
                    <Badge
                      variant="outline"
                      className="text-xs shrink-0"
                      style={{
                        borderColor: tierData?.color,
                        color: tierData?.color,
                      }}
                    >
                      {contact.loyaltyTier === "none"
                        ? "Sin tier"
                        : contact.loyaltyTier}
                    </Badge>

                    {/* Quick action */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer text-xs shrink-0"
                      onClick={() => awardPoints(contact.id, 100)}
                    >
                      +100 pts
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
