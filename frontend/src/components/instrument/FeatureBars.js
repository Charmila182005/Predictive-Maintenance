import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { fmtNum } from "@/lib/derived";
export function FeatureBars({ features, className, max = 1, }) {
    const scale = Math.max(max, ...features.map((f) => f.magnitude || 0), 1);
    return (_jsx("div", { className: className, children: _jsx("div", { className: "space-y-3", children: features.map((f) => {
                const pct = Math.max(4, (f.magnitude / scale) * 100);
                return (_jsxs("div", { children: [_jsxs("div", { className: "mb-1 flex items-center justify-between gap-2", children: [_jsx("span", { className: "truncate text-[12px] text-ink-2", children: f.label }), _jsxs("span", { className: "flex shrink-0 items-center gap-1.5 font-mono text-[11px] tabular-nums text-ink", children: [f.direction === "increases" ? (_jsx(ArrowUpRight, { className: "h-3 w-3 text-status-critical", strokeWidth: 2 })) : (_jsx(ArrowDownLeft, { className: "h-3 w-3 text-status-healthy", strokeWidth: 2 })), fmtNum(f.value, 1), f.unit ?? ""] })] }), _jsx("div", { className: "relative h-1.5 w-full overflow-hidden rounded-full bg-white/5", children: _jsx("div", { className: "absolute inset-y-0 left-0 rounded-full transition-[width] duration-500", style: {
                                    width: `${pct}%`,
                                    background: f.direction === "increases" ? "var(--color-status-high)" : "var(--color-status-healthy)",
                                } }) })] }, f.key));
            }) }) }));
}
