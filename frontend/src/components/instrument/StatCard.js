import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
export function StatCard({ label, unit, value, tone, className, }) {
    const toneColor = {
        healthy: "var(--color-status-healthy)",
        elevated: "var(--color-status-elevated)",
        high: "var(--color-status-high)",
        critical: "var(--color-status-critical)",
        signal: "var(--color-signal)",
        neutral: "var(--color-ink)",
    };
    return (_jsxs("div", { className: cn("rounded-lg border border-hairline bg-surface/60 px-3.5 py-3", className), children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.18em] text-ink-3", children: label }), _jsxs("p", { className: "mt-1.5 flex items-baseline gap-1.5 font-mono text-2xl font-semibold tabular-nums tracking-tight", style: { color: tone ? toneColor[tone] : "var(--color-ink)" }, children: [value, unit && _jsx("span", { className: "text-[11px] font-normal text-ink-3", children: unit })] })] }));
}
