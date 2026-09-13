import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
export function PageHeader({ index, title, description, right, className, }) {
    return (_jsxs("div", { className: cn("flex flex-wrap items-end justify-between gap-4", className), children: [_jsxs("div", { className: "min-w-0", children: [index && (_jsxs("p", { className: "font-mono text-[10px] uppercase tracking-[0.28em] text-ink-3", children: [_jsx("span", { className: "text-signal", children: index.split(" ")[0] }), _jsx("span", { className: "mx-1.5 text-hairline-strong", children: "/" }), index.split(" ").slice(1).join(" ")] })), _jsx("h1", { className: "mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px] sm:leading-tight", children: title }), description && _jsx("p", { className: "mt-1.5 max-w-xl text-sm leading-relaxed text-ink-2", children: description })] }), right && _jsx("div", { className: "flex shrink-0 items-center gap-2", children: right })] }));
}
