import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
const toneClasses = {
    live: "bg-signal text-signal",
    healthy: "bg-status-healthy text-status-healthy",
    elevated: "bg-status-elevated text-status-elevated",
    critical: "bg-status-critical text-status-critical",
    neutral: "bg-ink-3 text-ink-3",
    info: "bg-status-info text-status-info",
};
const sizeClasses = {
    sm: "h-1.5 w-1.5",
    md: "h-2 w-2",
};
export function StatusDot({ tone = "neutral", pulse = false, size = "md", className, }) {
    return (_jsxs("span", { className: cn("relative inline-flex shrink-0", size === "md" ? "h-2 w-2" : "h-1.5 w-1.5", className), children: [pulse && (_jsx("span", { "aria-hidden": true, className: cn("absolute inset-0 rounded-full animate-pulse-ring bg-current opacity-60", toneClasses[tone]) })), _jsx("span", { className: cn("relative block rounded-full", toneClasses[tone], sizeClasses[size]) })] }));
}
