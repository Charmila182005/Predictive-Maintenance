import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
export function DistributionBar({ segments, className, }) {
    const total = Math.max(1, segments.reduce((acc, s) => acc + s.count, 0));
    return (_jsxs("div", { className: cn("space-y-3", className), children: [_jsx("div", { className: "flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full", children: segments.map((s) => s.count > 0 ? (_jsx("div", { title: `${s.label} · ${s.count}`, className: "h-full shrink-0 transition-[width] duration-500 first:rounded-l-full last:rounded-r-full", style: { width: `${(s.count / total) * 100}%`, backgroundColor: s.color } }, s.key)) : null) }), _jsx("div", { className: "flex flex-wrap gap-x-4 gap-y-1.5", children: segments.map((s) => (_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("span", { className: "h-1.5 w-1.5 rounded-full", style: { backgroundColor: s.color } }), _jsx("span", { className: "text-[11px] text-ink-2", children: s.label }), _jsx("span", { className: "font-mono text-[11px] tabular-nums text-ink", children: s.count })] }, s.key))) })] }));
}
