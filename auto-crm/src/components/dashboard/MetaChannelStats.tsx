"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Camera,
  Globe,
  Crown,
  ArrowRight,
} from "lucide-react";

interface MetaChannelStatsProps {
  whatsappContacts: number;
  igContacts: number;
  fbContacts: number;
  totalConversations: number;
  loyaltyMembers: number;
}

export function MetaChannelStats({
  whatsappContacts,
  igContacts,
  fbContacts,
  totalConversations,
  loyaltyMembers,
}: MetaChannelStatsProps) {
  const channels = [
    {
      name: "WhatsApp",
      contacts: whatsappContacts,
      icon: MessageCircle,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950/40",
    },
    {
      name: "Instagram",
      contacts: igContacts,
      icon: Camera,
      color: "text-pink-600",
      bgColor: "bg-pink-50 dark:bg-pink-950/40",
    },
    {
      name: "Facebook",
      contacts: fbContacts,
      icon: Globe,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">
          Canales Meta
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Contactos por red social y programa de lealtad
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {channels.map((ch) => (
          <div
            key={ch.name}
            className={`flex items-center gap-3 p-2.5 rounded-lg ${ch.bgColor}`}
          >
            <ch.icon className={`h-4 w-4 ${ch.color} shrink-0`} />
            <span className="text-sm flex-1">{ch.name}</span>
            <span className="text-sm font-bold tabular-nums">
              {ch.contacts}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-violet-50 dark:bg-violet-950/40">
          <MessageCircle className="h-4 w-4 text-violet-600 shrink-0" />
          <span className="text-sm flex-1">Conversaciones</span>
          <span className="text-sm font-bold tabular-nums">
            {totalConversations}
          </span>
        </div>

        <div className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40">
          <Crown className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-sm flex-1">Lealtad activa</span>
          <span className="text-sm font-bold tabular-nums">
            {loyaltyMembers}
          </span>
        </div>

        <div className="pt-2 flex gap-2">
          <Link
            href="/conversations"
            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          >
            Ver conversaciones <ArrowRight className="h-3 w-3" />
          </Link>
          <Link
            href="/loyalty"
            className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer"
          >
            Ver lealtad <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
