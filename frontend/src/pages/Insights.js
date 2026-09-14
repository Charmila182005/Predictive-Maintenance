import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, BrainCircuit, Check } from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { Panel } from "@/components/deck/Panel";
import { Badge } from "@/components/deck/Badge";
import { Button } from "@/components/deck/Button";
import { EmptyState } from "@/components/deck/EmptyState";
import { StatCard } from "@/components/instrument/StatCard";
import { RiskGauge } from "@/components/instrument/RiskGauge";
import { FeatureBars } from "@/components/instrument/FeatureBars";
import { useAppStore } from "@/lib/store";
import { FAILURE_MODES } from "@/lib/domain";
import { derive, fmtInt, fmtNum, fmtPercent, fmtTs } from "@/lib/derived";
const HEALTH_PRIORITY = {
    Critical: 0,
    "High Risk": 1,
    Warning: 2,
    Normal: 3,
};
const LABELS = {
    airTemp: "Air temperature",
    processTemp: "Process temperature",
    speed: "Rotational speed",
    torque: "Torque",
    toolWear: "Tool wear",
};
export function Insights() {
    const assessments = useAppStore((s) => s.assessments);
    const [searchParams] = useSearchParams();
    const assessmentId = searchParams.get("assessment");
    const spotlight = useMemo(() => {
        return [...assessments].sort((x, y) => {
            const byHealth = HEALTH_PRIORITY[x.healthStatus] - HEALTH_PRIORITY[y.healthStatus];
            if (byHealth !== 0)
                return byHealth;
            return new Date(y.ts).getTime() - new Date(x.ts).getTime();
        });
    }, [assessments]);
    const [selectedId, setSelectedId] = useState(() => assessmentId ?? spotlight[0]?.id ?? "");
    const selected = useMemo(() => {
        // Prefer URL param
        if (assessmentId) {
            const found = assessments.find((x) => x.id === assessmentId);
            if (found)
                return found;
        }
        const found = assessments.find((x) => x.id === selectedId);
        return found ?? spotlight[0];
    }, [assessments, selectedId, assessmentId, spotlight]);
    const selectable = assessments.slice(0, 12);
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "05 / AI Insights", title: "AI insights", description: "Plain-language breakdown of an assessment \u2014 why the model is worried, which signals drive it, and what to do next.", right: selectable.length ? (_jsx("select", { value: selected?.id ?? "", onChange: (e) => setSelectedId(e.target.value), "aria-label": "Select assessment", className: "h-9 max-w-72 cursor-pointer rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-[11px] tabular-nums text-ink outline-none transition-colors focus:border-signal/60", children: selectable.map((x) => (_jsxs("option", { value: x.id, className: "bg-surface text-ink", children: [x.inputs.machineId, " \u00B7 ", fmtPercent(x.failureProbability), " \u00B7 ", fmtTs(x.ts)] }, x.id))) })) : undefined }), !assessments.length ? (_jsx(EmptyState, { icon: BrainCircuit, eyebrow: "No insight source", title: "No assessment to explain yet", description: "Run a machine assessment and it becomes the explainability source \u2014 the model maps raw signals into feature attribution, evidence, derived checks, and a plain-language why report.", action: _jsx(Link, { to: "/analyze", children: _jsx(Button, { variant: "primary", icon: _jsx(ArrowRight, { className: "h-4 w-4" }), label: "Run an assessment" }) }) })) : (selected && _jsx(InsightsReport, { a: selected }))] }));
}
function InsightsReport({ a }) {
    const d = derive(a.inputs);
    const modeMeta = FAILURE_MODES[a.mode.code];
    const parameterRows = a.contributing.length
        ? a.contributing.map((f) => ({
            key: f.key,
            label: f.label,
            value: `${fmtNum(f.value, 1)}${f.unit ?? ""}`,
            chip: f.direction === "increases" ? (_jsx(Badge, { tone: "high", children: "+ risk" })) : (_jsx(Badge, { tone: "healthy", children: "\u2212 risk" })),
        }))
        : [
            { key: "productType", label: "Product type", value: a.inputs.productType, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
            { key: "airTemp", label: LABELS.airTemp, value: `${fmtNum(a.inputs.airTemp, 1)} K`, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
            { key: "processTemp", label: LABELS.processTemp, value: `${fmtNum(a.inputs.processTemp, 1)} K`, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
            { key: "speed", label: LABELS.speed, value: `${fmtInt(a.inputs.speed)} rpm`, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
            { key: "torque", label: LABELS.torque, value: `${fmtNum(a.inputs.torque, 1)} Nm`, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
            { key: "toolWear", label: LABELS.toolWear, value: `${fmtNum(a.inputs.toolWear, 1)} min`, chip: _jsx(Badge, { tone: "neutral", children: "neutral" }) },
        ];
    const tips = [
        {
            key: "mode",
            text: (_jsxs(_Fragment, { children: ["Predicted mode: ", _jsx("span", { className: "text-ink", children: a.mode.name }), a.mode.confidence !== undefined && _jsxs(_Fragment, { children: [" (confidence ", fmtPercent(a.mode.confidence), ")"] }), " with failure probability ", _jsx("span", { className: "font-mono font-semibold text-ink", children: fmtPercent(a.failureProbability) }), "."] })),
        },
        {
            key: "cause",
            text: (_jsxs(_Fragment, { children: ["Root-cause hypothesis:", " ", _jsx("span", { className: "text-ink", children: a.mode.code === "NONE" ? "No dominant degradation driver detected." : modeMeta.cause })] })),
        },
        {
            key: "indicator",
            text: (_jsxs(_Fragment, { children: ["Primary indicator to watch: ", _jsx("span", { className: "text-ink", children: modeMeta.indicator })] })),
        },
        {
            key: "calibration",
            text: (_jsx(_Fragment, { children: "Decision support only \u2014 the model is factory-calibrated; validate against factory calibration before acting." })),
        },
    ];
    return (_jsxs(_Fragment, { children: [_jsx(Panel, { title: "Assessment spotlight", eyebrow: "Selected run", right: _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx(Badge, { tone: a.source === "live" || a.source === "fastapi" ? "signal" : "elevated", children: a.source === "live" || a.source === "fastapi" ? "Live model" : a.source === "gradio" ? "Gradio fallback" : "Simulated" }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: a.modelVersion && _jsxs(_Fragment, { children: ["v", a.modelVersion] }) }), _jsx("span", { className: "hidden font-mono text-[10px] tabular-nums text-ink-3 sm:inline", children: fmtTs(a.ts, { full: true, seconds: true }) })] }), children: _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-4", children: [_jsx("p", { className: "font-mono text-lg font-semibold tracking-tight text-ink", children: a.inputs.machineId }), _jsx("div", { className: "flex justify-center", children: _jsx(RiskGauge, { probability: a.failureProbability, size: 150 }) }), _jsxs("div", { className: "flex w-full max-w-xs flex-col gap-3", children: [_jsx(StatCard, { label: "Health", value: a.healthStatus, tone: toneForStatus(a.healthStatus) }), _jsx(StatCard, { label: "Risk", value: a.riskLevel, tone: toneForStatus(a.riskLevel) }), _jsx(StatCard, { label: "Probability", value: fmtPercent(a.failureProbability), tone: "signal" })] })] }) }), _jsxs("section", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: [_jsx(Panel, { title: "Feature importance", eyebrow: "SHAP-style attribution", children: a.contributing.length ? (_jsx(FeatureBars, { features: a.contributing })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "No per-feature attribution returned for this run." })) }), _jsx(Panel, { title: "Important parameters", eyebrow: "Observed values", children: _jsx("div", { children: parameterRows.map((r) => (_jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-hairline py-2 last:border-b-0", children: [_jsx("span", { className: "text-[12.5px] text-ink-2", children: r.label }), _jsxs("div", { className: "flex items-center gap-2.5", children: [_jsx("span", { className: "font-mono text-[11.5px] tabular-nums text-ink", children: r.value }), r.chip] })] }, r.key))) }) })] }), _jsx(Panel, { title: "Condition evidence", eyebrow: "Why it was flagged", children: a.evidence.length ? (_jsx("ul", { className: "space-y-1.5", children: a.evidence.map((e, i) => (_jsxs("li", { className: "flex gap-2 text-[13px] leading-relaxed text-ink-2", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal/70" }), e] }, i))) })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "No condition evidence returned for this run." })) }), _jsx(Panel, { title: "Derived calculations", eyebrow: "Checks performed", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "grid grid-cols-3 gap-3", children: [_jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3", children: "\u0394T" }), _jsxs("p", { className: "mt-1 font-mono text-base font-semibold tabular-nums text-ink", children: [fmtNum(d.tempDifference, 1), " ", _jsx("span", { className: "text-[10px] font-normal text-ink-3", children: "K" })] }), _jsx("p", { className: "mt-0.5 font-mono text-[9px] text-ink-3", children: "process \u2212 air" })] }), _jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3", children: "Mechanical power" }), _jsxs("p", { className: "mt-1 font-mono text-base font-semibold tabular-nums text-ink", children: [fmtInt(d.mechanicalPower), " ", _jsx("span", { className: "text-[10px] font-normal text-ink-3", children: "W" })] }), _jsx("p", { className: "mt-0.5 font-mono text-[9px] text-ink-3", children: "torque \u00B7 rpm \u00B7 2\u03C0 / 60" })] }), _jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3", children: "Overstrain" }), _jsxs("p", { className: "mt-1 font-mono text-base font-semibold tabular-nums text-ink", children: [fmtInt(d.overstrain), " ", _jsx("span", { className: "text-[10px] font-normal text-ink-3", children: "W\u00B7min" })] }), _jsx("p", { className: "mt-0.5 font-mono text-[9px] text-ink-3", children: "toolWear \u00B7 torque" })] })] }), _jsxs("div", { className: "rounded-lg border border-hairline bg-surface/40 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3", children: "Raw inputs" }), _jsxs("div", { className: "mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums", children: [_jsxs("span", { className: "text-ink-3", children: ["Product ", _jsx("span", { className: "text-ink", children: a.inputs.productType })] }), _jsxs("span", { className: "text-ink-3", children: ["Air ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.airTemp, 1), " K"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Process ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.processTemp, 1), " K"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Speed ", _jsxs("span", { className: "text-ink", children: [fmtInt(a.inputs.speed), " rpm"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Torque ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.torque, 1), " Nm"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Tool wear ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.toolWear, 1), " min"] })] })] })] })] }) }), _jsx(Panel, { title: "Plain-language explanation", eyebrow: "What the model says", children: _jsx("p", { className: "text-[13.5px] leading-relaxed text-ink-2", children: a.explanation }) }), _jsx(Panel, { title: "Key takeaways", eyebrow: "Decision summary", children: _jsx("ol", { className: "space-y-2", children: tips.map((t) => (_jsxs("li", { className: "flex items-start gap-2.5 rounded-lg border border-hairline bg-surface/40 px-3 py-2.5", children: [_jsx(Check, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-signal", strokeWidth: 2 }), _jsx("p", { className: "text-[12.5px] leading-relaxed text-ink-2", children: t.text })] }, t.key))) }) }), _jsx(Panel, { title: "Recommended action", eyebrow: "Next step", children: _jsx("p", { className: "text-[13.5px] leading-relaxed text-ink-2", children: a.recommendation }) })] }));
}
function toneForStatus(status) {
    if (status === "Critical")
        return "critical";
    if (status === "High Risk" || status === "High")
        return "high";
    if (status === "Warning" || status === "Medium")
        return "elevated";
    if (status === "Normal" || status === "Low")
        return "healthy";
    return "neutral";
}
