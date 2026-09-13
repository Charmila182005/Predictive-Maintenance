import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
export function Panel({ title, eyebrow, right, children, className, bodyClassName }) {
    const header = title || right || eyebrow;
    return (_jsxs("section", { className: cn("rounded-xl border border-hairline bg-surface", className), children: [header && (_jsxs("header", { className: "flex h-11 min-h-11 items-center justify-between gap-3 border-b border-hairline px-4", children: [_jsxs("div", { className: "min-w-0", children: [eyebrow && (_jsx("p", { className: "font-mono text-[10px] uppercase leading-3 tracking-[0.16em] text-ink-3", children: eyebrow })), title && _jsx("h3", { className: "truncate text-sm font-medium text-ink", children: title })] }), right] })), _jsx("div", { className: cn("p-4", bodyClassName), children: children })] }));
}
