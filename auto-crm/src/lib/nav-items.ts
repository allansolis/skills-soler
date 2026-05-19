/**
 * Items de navegacion compartidos entre Sidebar (desktop) y MobileNav.
 * Antes MobileNav tenia 6 menos que Sidebar — paridad funcional rota.
 */
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
  Gauge,
  Search,
  FolderOpen,
  Bot,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Kanban },
  { href: "/contacts", label: "Contactos", icon: Users },
  { href: "/deals", label: "Deals", icon: Briefcase },
  { href: "/conversations", label: "Conversaciones", icon: MessageCircle },
  { href: "/leads", label: "Hot Leads", icon: Flame },
  { href: "/leads-kanban", label: "Kanban Leads", icon: Kanban },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/performance", label: "Performance", icon: Gauge },
  { href: "/ads", label: "Meta Ads", icon: Megaphone },
  { href: "/pages-audit", label: "Auditoría Pages", icon: Search },
  { href: "/meta-content", label: "Contenido Meta", icon: FolderOpen },
  { href: "/elena", label: "Elena (Bot)", icon: Bot },
  { href: "/loyalty", label: "Lealtad", icon: Crown },
  { href: "/reports", label: "Reportes", icon: FileBarChart },
  { href: "/activities", label: "Actividades", icon: Activity },
  { href: "/settings", label: "Configuracion", icon: Settings },
];
