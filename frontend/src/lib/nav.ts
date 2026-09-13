import { Activity, BrainCircuit, Cpu, History, LayoutGrid } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  index: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: "/overview", index: "01", label: "Dashboard", icon: LayoutGrid },
  { to: "/analyze", index: "02", label: "Analyze Machine", icon: Activity },
  { to: "/machines", index: "03", label: "Machines", icon: Cpu },
  { to: "/history", index: "04", label: "Prediction History", icon: History },
  { to: "/insights", index: "05", label: "AI Insights", icon: BrainCircuit },
];

export function navTitleFor(pathname: string): NavItem {
  return NAV_ITEMS.find((n) => pathname.startsWith(n.to)) ?? NAV_ITEMS[0];
}
