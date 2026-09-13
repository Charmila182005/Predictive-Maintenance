import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
import { Slot } from "@radix-ui/react-slot";
const variantClasses = {
    primary: "bg-signal text-[#04282e] font-medium hover:brightness-110 shadow-[0_0_0_1px_rgba(34,211,238,0.4),0_4px_18px_-8px_rgba(34,211,238,0.55)]",
    secondary: "bg-raised text-ink border border-hairline-strong/70 hover:border-hairline-strong hover:bg-white/[0.06]",
    ghost: "text-ink-2 hover:text-ink hover:bg-white/5",
    danger: "bg-status-critical/12 text-status-critical border border-status-critical/40 hover:bg-status-critical/20",
};
const sizeClasses = {
    sm: "h-8 px-3 text-xs gap-1.5 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-lg",
    icon: "h-10 w-10 rounded-lg",
};
export function Button({ variant = "secondary", size = "md", icon, label, className, children, loading = false, loadingText = "Loading...", asChild = false, ...rest }) {
    const Comp = asChild ? Slot : "button";
    return (_jsx(Comp, { className: cn("inline-flex items-center justify-center select-none whitespace-nowrap transition-[background-color,color,border-color,box-shadow,transform] duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 disabled:active:scale-100", variantClasses[variant], sizeClasses[size], className), disabled: loading || rest.disabled, ...rest, children: loading ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin h-4 w-4", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "3", fill: "none" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), _jsx("span", { children: loadingText })] })) : (_jsxs(_Fragment, { children: [icon, size !== "icon" && (label ?? children)] })) }));
}
