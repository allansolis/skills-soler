"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  Activity,
  Settings,
  Briefcase,
  MessageCircle,
  Crown,
  FileBarChart,
  Megaphone,
  Flame,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/context/BusinessContext";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/conversations", label: "Conversaciones", icon: MessageCircle },
  { href: "/leads", label: "Hot Leads", icon: Flame },
  { href: "/leads-kanban", label: "Kanban Leads", icon: Kanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/ads", label: "Meta Ads", icon: Megaphone },
  { href: "/loyalty", label: "Lealtad", icon: Crown },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/activities", label: "Actividades", icon: Activity },
  { href: "/settings", label: "Configuracion", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { businessConfig } = useBusiness();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)] min-h-screen">
      <div className="flex h-16 items-center gap-2 px-6 border-b border-[var(--sidebar-border)]">
        <Briefcase className="h-6 w-6 text-[var(--sidebar-primary)]" />
        <span className="text-lg font-bold tracking-tight">Auto-CRM</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-accent-foreground)]"
                  : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-[var(--sidebar-border)]">
        <p className="text-xs text-[var(--sidebar-foreground)]/50">
          Auto-CRM v2.0
        </p>
        <p className="text-xs text-[var(--sidebar-foreground)]/50" style={{ color: businessConfig.color }}>
          {businessConfig.name}
        </p>
      </div>
    </aside>
  );
}
