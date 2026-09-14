import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
const toneClasses = {
    neutral: "border-white/12 bg-white/5 text-ink-2",
    signal: "border-signal/30 bg-signal-dim text-signal",
    healthy: "border-status-healthy/30 bg-status-healthy/10 text-status-healthy",
    elevated: "border-status-elevated/30 bg-status-elevated/10 text-status-elevated",
    high: "border-status-high/35 bg-status-high/12 text-status-high",
    critical: "border-status-critical/35 bg-status-critical/12 text-status-critical",
};
export function Badge({ tone = "neutral", className, children, }) {
    return (_jsx("span", { className: cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider leading-none", toneClasses[tone], className), children: children }));
}
