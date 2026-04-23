import {
  LayoutDashboard,
  Users,
  Building2,
  ClipboardList,
  FolderOpen,
  Calculator,
  Map,
  FileText,
  Briefcase,
  UserCog,
  BarChart2,
  ScrollText,
  Receipt,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@prisma/client";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Clientes PF", href: "/clientes", icon: Users },
      { label: "Offshore", href: "/offshore", icon: Building2 },
      { label: "Obrigações", href: "/obrigacoes", icon: ClipboardList },
      { label: "Abertura", href: "/abertura", icon: FolderOpen },
      { label: "Simulador", href: "/simulador", icon: Calculator },
      { label: "Invoices", href: "/invoices", icon: Receipt },
    ],
  },
  {
    label: "Admin",
    items: [
      {
        label: "Jurisdições",
        href: "/admin/jurisdicoes",
        icon: Map,
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        label: "Templates",
        href: "/admin/templates",
        icon: FileText,
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        label: "Prestadores",
        href: "/admin/prestadores",
        icon: Briefcase,
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        label: "Usuários",
        href: "/admin/usuarios",
        icon: UserCog,
        roles: ["SUPER_ADMIN"],
      },
      {
        label: "Simulador",
        href: "/admin/simulador",
        icon: BarChart2,
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
      {
        label: "Auditoria",
        href: "/admin/auditoria",
        icon: ScrollText,
        roles: ["ADMIN", "SUPER_ADMIN"],
      },
    ],
  },
];
