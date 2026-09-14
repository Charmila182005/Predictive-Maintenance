import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink } from "react-router-dom";
import { motion } from "framer-motion";
import { TriangleAlert, X } from "lucide-react";
import { useAppStore } from "@/lib/store";
import { cn } from "@/lib/utils/cn";
import { StatusDot } from "@/components/deck/StatusDot";
import { NAV_ITEMS } from "@/lib/nav";
function Wordmark() {
    return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("svg", { viewBox: "0 0 24 24", "aria-hidden": true, className: "h-7 w-7 shrink-0", fill: "none", stroke: "#22d3ee", strokeWidth: "1.6", strokeLinecap: "round", children: [_jsx("line", { x1: "12", y1: "2", x2: "12", y2: "13" }), _jsx("circle", { cx: "12", cy: "17", r: "3.4" }), _jsx("line", { x1: "12", y1: "9", x2: "12", y2: "9", opacity: "0" }), _jsx("circle", { cx: "12", cy: "9", r: "0.8", fill: "#22d3ee", stroke: "none" }), _jsx("line", { x1: "6", y1: "5.5", x2: "8.6", y2: "6.6", strokeWidth: "1.2" }), _jsx("line", { x1: "18", y1: "5.5", x2: "15.4", y2: "6.6", strokeWidth: "1.2" })] }), _jsxs("div", { className: "leading-tight", children: [_jsx("p", { className: "text-[15px] font-semibold tracking-tight text-ink", children: "Fathom" }), _jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3", children: "Predictive Maintenance" })] })] }));
}
function ConnectionFooter() {
    const connection = useAppStore((s) => s.connection);
    const modelVersion = useAppStore((s) => s.assessments[0]?.modelVersion);
    const tone = connection.status === "live" ? "healthy" : connection.status === "simulated" ? "elevated" : connection.status === "offline" ? "critical" : "neutral";
    const label = connection.status === "live" ? "Live" : connection.status === "simulated" ? "Simulated" : connection.status === "offline" ? "Offline" : "Connecting";
    return (_jsx("div", { className: "border-t border-hairline p-3", children: _jsxs("div", { className: "rounded-lg border border-hairline bg-overlay/60 p-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3", children: "Model status" }), _jsx(StatusDot, { tone: tone, pulse: connection.status === "live", size: "sm" })] }), _jsxs("p", { className: "mt-1.5 font-mono text-xs text-ink", children: [label, modelVersion && _jsxs("span", { className: "text-ink-3", children: [" \u00B7 v", modelVersion] })] }), _jsxs("p", { className: "mt-0.5 flex items-center gap-1 font-mono text-[10px] text-ink-3", children: [_jsx(TriangleAlert, { className: "h-3 w-3", strokeWidth: 1.5 }), "Decision support only"] })] }) }));
}
function NavList({ onNavigate }) {
    return (_jsxs("nav", { className: "flex-1 space-y-1 px-3", "aria-label": "Primary", children: [_jsx("p", { className: "px-2 pb-1 pt-4 font-mono text-[9px] uppercase tracking-[0.2em] text-ink-3", children: "Workbench" }), NAV_ITEMS.map((item) => (_jsx(NavLink, { to: item.to, onClick: onNavigate, className: ({ isActive }) => cn("group relative flex items-center gap-3 rounded-lg border px-2.5 py-2.5 text-sm transition-colors duration-150", isActive ? "border-signal/20 bg-signal-dim/60 text-ink" : "border-transparent text-ink-2 hover:bg-white/5 hover:text-ink"), children: ({ isActive }) => (_jsxs(_Fragment, { children: [isActive && (_jsx(motion.span, { layoutId: "nav-indicator", className: "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-signal" })), _jsx(item.icon, { className: "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:translate-x-[1px]", strokeWidth: 1.6 }), _jsx("span", { className: "flex-1 truncate text-[13px] font-medium", children: item.label }), _jsx("span", { className: cn("font-mono text-[10px] tabular-nums", isActive ? "text-signal" : "text-ink-3 group-hover:text-ink-2"), children: item.index })] })) }, item.to)))] }));
}
export function Sidebar({ mobile = false, onNavigate }) {
    const sidebarOpen = useAppStore((s) => s.sidebarOpen);
    const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);
    const content = (_jsxs("div", { className: "flex h-full flex-col", children: [_jsxs("div", { className: "flex h-16 items-center justify-between border-b border-hairline px-4", children: [_jsx(Wordmark, {}), mobile && (_jsx("button", { onClick: () => setSidebarOpen(false), "aria-label": "Close navigation", className: "rounded-lg p-2 text-ink-3 transition-colors hover:bg-white/5 hover:text-ink", children: _jsx(X, { className: "h-4 w-4" }) }))] }), _jsx(NavList, { onNavigate: onNavigate }), _jsx(ConnectionFooter, {})] }));
    if (!mobile) {
        return (_jsx("aside", { className: "hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-56 lg:flex-col lg:border-r lg:border-hairline lg:bg-surface", children: content }));
    }
    return (_jsxs(_Fragment, { children: [sidebarOpen && (_jsx(motion.div, { className: "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden", initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, onClick: () => setSidebarOpen(false) })), _jsx(motion.aside, { className: cn("fixed inset-y-0 left-0 z-50 w-64 border-r border-hairline bg-surface lg:hidden", !sidebarOpen && "pointer-events-none"), initial: false, animate: { x: sidebarOpen ? 0 : "-100%" }, transition: { type: "spring", stiffness: 340, damping: 34 }, children: content })] }));
}
