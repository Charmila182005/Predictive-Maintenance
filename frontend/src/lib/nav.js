import { Activity, BrainCircuit, Cpu, History, LayoutGrid } from "lucide-react";
export const NAV_ITEMS = [
    { to: "/overview", index: "01", label: "Dashboard", icon: LayoutGrid },
    { to: "/analyze", index: "02", label: "Analyze Machine", icon: Activity },
    { to: "/machines", index: "03", label: "Machines", icon: Cpu },
    { to: "/history", index: "04", label: "Prediction History", icon: History },
    { to: "/insights", index: "05", label: "AI Insights", icon: BrainCircuit },
];
export function navTitleFor(pathname) {
    return NAV_ITEMS.find((n) => pathname.startsWith(n.to)) ?? NAV_ITEMS[0];
}
