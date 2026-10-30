import {
  CheckCheckIcon,
  LandmarkIcon,
  LayoutDashboardIcon,
  ReceiptTextIcon,
  TagsIcon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/features/auth/roles";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Absent : visible par toute personne connectée. */
  permission?: Permission;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboardIcon },
  { href: "/reports", label: "Mes notes", icon: ReceiptTextIcon, permission: "report:create" },
  { href: "/approvals", label: "À valider", icon: CheckCheckIcon, permission: "report:approve:manager" },
  { href: "/finance", label: "Finance", icon: LandmarkIcon, permission: "report:approve:finance" },
  { href: "/admin/categories", label: "Catégories", icon: TagsIcon, permission: "category:manage" },
  { href: "/admin/employees", label: "Collaborateurs", icon: UsersIcon, permission: "employee:read" },
];

/** « /reports/123 » active l'entrée « /reports », mais « / » ne s'active que sur l'accueil. */
export const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
