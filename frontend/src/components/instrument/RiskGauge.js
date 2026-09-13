import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { cn } from "@/lib/utils/cn";
function probabilityColor(p) {
    if (p >= 0.8)
        return "var(--color-status-critical)";
    if (p >= 0.6)
        return "var(--color-status-high)";
    if (p >= 0.35)
        return "var(--color-status-elevated)";
    return "var(--color-status-healthy)";
}
function polar(r, deg) {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [100 + r * Math.cos(rad), 100 + r * Math.sin(rad)];
}
function arc(start, end, r) {
    const [sx, sy] = polar(r, start);
    const [ex, ey] = polar(r, end);
    const large = end - start > 180 ? 1 : 0;
    return `M ${sx.toFixed(2)} ${sy.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
}
export function RiskGauge({ probability, size = 200, label = "Failure probability", className, }) {
    const p = Math.max(0, Math.min(1, probability));
    const color = probabilityColor(p);
    const ticks = Array.from({ length: 9 }, (_, i) => -225 + i * (270 / 8));
    return (_jsx("div", { className: cn("flex flex-col items-center", className), style: { width: size }, children: _jsxs("svg", { viewBox: "0 0 200 200", width: size, height: size, role: "img", "aria-label": `${label} ${(p * 100).toFixed(1)} percent`, children: [_jsx("path", { d: arc(-225, 45, 82), fill: "none", stroke: "rgba(255,255,255,0.08)", strokeWidth: "7", strokeLinecap: "round" }), p > 0.005 && (_jsx("path", { d: arc(-225, -225 + 270 * p, 82), fill: "none", stroke: color, strokeWidth: "7", strokeLinecap: "round", style: { filter: `drop-shadow(0 0 6px ${color})`, transition: "stroke-dasharray 600ms ease" } })), ticks.map((t) => {
                    const [x1, y1] = polar(94, t);
                    const [x2, y2] = polar(100, t);
                    const active = t <= -225 + 270 * p;
                    return (_jsx("line", { x1: x1, y1: y1, x2: x2, y2: y2, stroke: active ? color : "rgba(255,255,255,0.18)", strokeWidth: "1.5" }, t));
                }), _jsxs("text", { x: "100", y: "96", textAnchor: "middle", fill: "var(--color-ink)", style: { font: "600 30px var(--font-mono)" }, children: [(p * 100).toFixed(1), _jsx("tspan", { style: { font: "500 14px var(--font-mono)", fill: "var(--color-ink-3)" }, children: "%" })] }), _jsx("text", { x: "100", y: "116", textAnchor: "middle", fill: "var(--color-ink-3)", style: { font: "10px var(--font-sans)", letterSpacing: "0.14em", textTransform: "uppercase" }, children: label })] }) }));
}
