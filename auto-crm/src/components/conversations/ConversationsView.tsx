"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  Camera,
  Globe,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatRelativeDate } from "@/lib/constants";

interface ConversationItem {
  id: string;
  contactId: string | null;
  platform: string;
  direction: string;
  message: string | null;
  messageType: string;
  status: string;
  senderName: string | null;
  senderPhone: string | null;
  createdAt: number | Date;
  contactName: string | null;
  contactPhone: string | null;
}

interface PlatformStats {
  whatsapp: number;
  instagram: number;
  facebook: number;
  messenger: number;
}

interface ConversationsViewProps {
  conversations: ConversationItem[];
  platformStats: PlatformStats;
  contactsWithWA: number;
  contactsWithIG: number;
}

const platformConfig = {
  whatsapp: {
    icon: MessageCircle,
    label: "WhatsApp",
    color: "text-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/40",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  instagram: {
    icon: Camera,
    label: "Instagram",
    color: "text-pink-600",
    bgColor: "bg-pink-50 dark:bg-pink-950/40",
    badgeColor: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  },
  facebook: {
    icon: Globe,
    label: "Facebook",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/40",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  messenger: {
    icon: MessageCircle,
    label: "Messenger",
    color: "text-violet-600",
    bgColor: "bg-violet-50 dark:bg-violet-950/40",
    badgeColor: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",
  },
};

export function ConversationsView({
  conversations,
  platformStats,
  contactsWithWA,
  contactsWithIG,
}: ConversationsViewProps) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const totalConvos =
    platformStats.whatsapp +
    platformStats.instagram +
    platformStats.facebook +
    platformStats.messenger;

  const filtered = conversations.filter((c) => {
    if (filter !== "all" && c.platform !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.senderName?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.message?.toLowerCase().includes(q) ||
        c.senderPhone?.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(
          Object.entries(platformConfig) as [
            keyof typeof platformConfig,
            (typeof platformConfig)[keyof typeof platformConfig],
          ][]
        ).map(([key, config]) => {
          const count = platformStats[key as keyof PlatformStats];
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all ${
                filter === key ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => setFilter(filter === key ? "all" : key)}
            >
              <CardContent className="pt-4 pb-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl p-2.5 ${config.bgColor}`}>
                    <config.icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">
                      {config.label}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Contact stats */}
      <div className="flex gap-4 items-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4 text-green-500" />
          <span>
            <strong>{contactsWithWA}</strong> con WhatsApp guardado
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Camera className="h-4 w-4 text-pink-500" />
          <span>
            <strong>{contactsWithIG}</strong> con Instagram
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-blue-500" />
          <span>
            <strong>{totalConvos}</strong> conversaciones totales
          </span>
        </div>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, telefono o mensaje..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {filter !== "all" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter("all")}
            className="cursor-pointer"
          >
            Limpiar filtro
          </Button>
        )}
      </div>

      {/* Conversation list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Historial de Mensajes
            {filter !== "all" && (
              <Badge variant="secondary" className="ml-2">
                {platformConfig[filter as keyof typeof platformConfig]?.label}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                {totalConvos === 0
                  ? "No hay conversaciones aun. Las conversaciones de WhatsApp, Instagram y Facebook se sincronizaran automaticamente via n8n."
                  : "No se encontraron conversaciones con ese filtro"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((convo) => {
                const config =
                  platformConfig[
                    convo.platform as keyof typeof platformConfig
                  ] || platformConfig.whatsapp;
                const isInbound = convo.direction === "inbound";

                return (
                  <div
                    key={convo.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    {/* Platform icon */}
                    <div className={`rounded-lg p-2 shrink-0 ${config.bgColor}`}>
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                    </div>

                    {/* Message content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {convo.contactName || convo.senderName || "Desconocido"}
                        </span>
                        <Badge
                          className={`text-[10px] px-1.5 py-0 ${config.badgeColor}`}
                        >
                          {config.label}
                        </Badge>
                        {isInbound ? (
                          <ArrowDownLeft className="h-3 w-3 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {convo.message || `[${convo.messageType}]`}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {convo.senderPhone || ""}{" "}
                        {convo.senderPhone ? "· " : ""}
                        {formatRelativeDate(convo.createdAt)}
                      </p>
                    </div>

                    {/* Status */}
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {convo.status}
                    </Badge>
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
