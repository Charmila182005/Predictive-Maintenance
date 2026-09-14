import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BellRing, Check, FlaskConical, Gauge, Loader2, RotateCcw, ShieldCheck, Sparkles, } from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { Panel } from "@/components/deck/Panel";
import { Button } from "@/components/deck/Button";
import { Badge } from "@/components/deck/Badge";
import { EmptyState } from "@/components/deck/EmptyState";
import { StatusDot } from "@/components/deck/StatusDot";
import { RiskGauge } from "@/components/instrument/RiskGauge";
import { FeatureBars } from "@/components/instrument/FeatureBars";
import { StatusBadge, toneForStatus, } from "@/components/instrument/StatusBadge";
import { useAnalyze, DEFAULTS } from "@/hooks/use-analyze";
import { useAppStore } from "@/lib/store";
import { PRODUCT_TYPES, FAILURE_MODES } from "@/lib/domain";
import { derive, fmtNum, fmtPercent, fmtInt, } from "@/lib/derived";
import { cn } from "@/lib/utils/cn";
const LABELS = {
    airTemp: "Air temperature",
    processTemp: "Process temperature",
    speed: "Rotational speed",
    torque: "Torque",
    toolWear: "Tool wear",
};
const UNITS = {
    airTemp: "K",
    processTemp: "K",
    speed: "rpm",
    torque: "Nm",
    toolWear: "min",
};
const NUMERIC_KEYS = [
    "airTemp",
    "processTemp",
    "speed",
    "torque",
    "toolWear",
];
function NumericField({ id, label, unit, value, onChange, }) {
    return (_jsxs("label", { className: "block", children: [_jsxs("div", { className: "mb-1.5 flex items-baseline justify-between", children: [_jsx("span", { className: "text-[11px] font-medium text-ink-2", children: label }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: unit })] }), _jsx("input", { id: id, inputMode: "decimal", type: "number", step: "any", value: Number.isFinite(value) ? value : "", onChange: (e) => onChange(e.target.value === ""
                    ? NaN
                    : Number(e.target.value)), className: "h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60" })] }));
}
function DerivedGrid({ input, }) {
    const d = derive(input);
    return (_jsx("div", { className: "grid grid-cols-3 gap-3", children: [
            [
                "ΔT",
                "Temp diff",
                fmtNum(d.tempDifference, 1),
                "K",
            ],
            [
                "P",
                "Mech power",
                fmtInt(d.mechanicalPower),
                "W",
            ],
            [
                "TS",
                "Overstrain",
                fmtInt(d.overstrain),
                "W·min",
            ],
        ].map(([sym, name, value, unit]) => (_jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-2.5 py-2.5", children: [_jsxs("p", { className: "font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3", children: [sym, " \u00B7 ", name] }), _jsxs("p", { className: "mt-1 font-mono text-sm font-semibold tabular-nums text-ink", children: [value, " ", _jsx("span", { className: "text-[10px] font-normal text-ink-3", children: unit })] })] }, sym))) }));
}
export function Analyze() {
    const { status, assessment, connection, run, reset, } = useAnalyze();
    const createAlert = useAppStore((s) => s.createAlert);
    const alerts = useAppStore((s) => s.alerts);
    const [form, setForm] = useState({
        ...DEFAULTS,
    });
    const [alertFiled, setAlertFiled] = useState(false);
    const running = status === "running";
    const hasAlert = useMemo(() => assessment
        ? alerts.some((a) => a.assessmentId ===
            assessment.id)
        : false, [alerts, assessment]);
    const set = (key, value) => setForm((f) => ({
        ...f,
        [key]: value,
    }));
    const canRun = useMemo(() => {
        return (Object.values(form).every((v) => typeof v === "number"
            ? Number.isFinite(v)
            : true) &&
            form.machineId.trim().length > 0);
    }, [form]);
    const handleRun = () => {
        setAlertFiled(false);
        void run({
            ...form,
            machineId: form.machineId.trim() ||
                DEFAULTS.machineId,
        });
    };
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "02 / Analyze Machine", title: "Machine risk assessment", description: "Feed current sensor readings and the model returns failure probability, likely failure mode, evidence, and a recommended maintenance action." }), !assessment && status === "idle" && (_jsxs("div", { className: "flex items-center gap-2 rounded-lg border border-hairline bg-overlay/50 px-4 py-2.5", children: [_jsx(FlaskConical, { className: "h-3.5 w-3.5 text-signal", strokeWidth: 1.6 }), _jsxs("p", { className: "text-[12px] text-ink-2", children: ["Live model first. If the shared backend is unreachable, results fall back to the", " ", _jsx("span", { className: "text-ink", children: "simulated engine" }), " ", "and are labeled as such."] })] })), _jsxs("section", { className: "grid grid-cols-1 gap-4 xl:grid-cols-5", children: [_jsx(Panel, { title: "Operating parameters", eyebrow: "Step 1 \u00B7 inputs", className: "xl:col-span-2", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsxs("div", { className: "mb-1.5 flex items-baseline justify-between", children: [_jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Product type" }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: "L \u00B7 M \u00B7 H" })] }), _jsx("div", { className: "grid grid-cols-3 gap-1.5", children: PRODUCT_TYPES.map((p) => (_jsx("button", { type: "button", onClick: () => set("productType", p), className: cn("h-9 rounded-lg border font-mono text-xs font-semibold uppercase tracking-wider transition-colors", form.productType === p
                                                    ? "border-signal/50 bg-signal-dim text-signal"
                                                    : "border-hairline bg-overlay/60 text-ink-3 hover:text-ink"), children: p }, p))) })] }), _jsx("div", { className: "grid grid-cols-2 gap-3", children: NUMERIC_KEYS.map((key) => (_jsx(NumericField, { id: key, label: LABELS[key], unit: UNITS[key], value: form[key], onChange: (v) => set(key, v) }, key))) }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-1.5 flex items-baseline justify-between", children: _jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Machine id" }) }), _jsx("input", { value: form.machineId, onChange: (e) => set("machineId", e.target.value), placeholder: "MM-0001", className: "h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60" })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-1.5 flex items-baseline justify-between", children: _jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "State" }) }), _jsx("div", { className: "grid grid-cols-2 gap-1.5", children: ["RUNNING", "IDLE"].map((s) => (_jsx("button", { type: "button", onClick: () => set("state", s), className: cn("h-9 rounded-lg border font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors", form.state === s
                                                            ? "border-signal/50 bg-signal-dim text-signal"
                                                            : "border-hairline bg-overlay/60 text-ink-3 hover:text-ink"), children: s }, s))) })] })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-t border-hairline pt-4", children: [_jsx(Button, { variant: "primary", icon: running ? (_jsx(Loader2, { className: "h-4 w-4 animate-spin" })) : (_jsx(ArrowRight, { className: "h-4 w-4" })), label: running
                                                ? "Assessing…"
                                                : "Run assessment", onClick: handleRun, disabled: running || !canRun }), _jsx(Button, { variant: "ghost", size: "md", icon: _jsx(RotateCcw, { className: "h-3.5 w-3.5" }), label: "Reset", onClick: () => {
                                                setForm({
                                                    ...DEFAULTS,
                                                });
                                                reset();
                                            }, disabled: running })] })] }) }), _jsx("div", { className: "flex flex-col gap-4 xl:col-span-3", children: status === "idle" &&
                            !assessment ? (_jsx(EmptyState, { icon: Gauge, eyebrow: "Awaiting input", title: "Set parameters and run", description: "The result shows the failure probability gauge, risk level, likely failure mode with its confidence, derived parameters, supporting evidence, and the recommended maintenance action." })) : running &&
                            !assessment ? (_jsx(Panel, { title: "Running assessment", eyebrow: "Live call", children: _jsxs("div", { className: "flex min-h-56 flex-col items-center justify-center gap-4 py-6", children: [_jsx(Loader2, { className: "h-7 w-7 animate-spin text-signal", strokeWidth: 1.6 }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm font-medium text-ink", children: "Contacting the model" }), _jsx("p", { className: "mt-1 font-mono text-[11px] text-ink-3", children: "POST /v1/predict" })] }), _jsxs("div", { className: "flex items-center gap-2 rounded-full border border-hairline bg-overlay/60 px-3 py-1.5", children: [_jsx(StatusDot, { tone: "live", pulse: true, size: "sm" }), _jsx("span", { className: "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2", children: "requesting" })] })] }) })) : (assessment && (_jsx(AssessmentStage, { assessment: assessment, connectionMessage: connection?.message, connectionStatus: connection?.status, alertFiled: alertFiled, hasAlert: hasAlert, onFileAlert: () => {
                                createAlert(assessment.id);
                                setAlertFiled(true);
                            } }))) })] })] }));
}
function AssessmentStage({ assessment, connectionMessage, connectionStatus, alertFiled, hasAlert, onFileAlert, }) {
    const a = assessment;
    const alertTone = toneForStatus(a.riskLevel);
    const isLive = a.source === "live" &&
        connectionStatus === "live";
    return (_jsxs("div", { className: "flex flex-col gap-4", children: [_jsx(Panel, { title: "Assessment result", eyebrow: "Step 2 \u00B7 model output", right: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Badge, { tone: a.source === "live"
                                ? "signal"
                                : "elevated", children: a.source === "live"
                                ? "Live model"
                                : "Simulated" }), _jsx(StatusDot, { tone: a.source === "live"
                                ? "healthy"
                                : "elevated", pulse: a.source === "live", size: "sm" })] }), children: _jsxs("div", { className: "flex flex-col items-center gap-1 py-2 sm:flex-row sm:justify-around", children: [_jsx(RiskGauge, { probability: a.failureProbability, size: 210 }), _jsxs("div", { className: "w-full max-w-60 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-hairline pb-2", children: [_jsx("span", { className: "text-[11px] text-ink-2", children: "Health status" }), _jsx(StatusBadge, { value: a.healthStatus })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-hairline pb-2", children: [_jsx("span", { className: "text-[11px] text-ink-2", children: "Risk level" }), _jsx(StatusBadge, { value: a.riskLevel })] }), _jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-hairline pb-2", children: [_jsx("span", { className: "text-[11px] text-ink-2", children: "Priority" }), _jsx(StatusBadge, { value: a.priority })] }), _jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-[11px] text-ink-2", children: "Decision threshold" }), _jsx("span", { className: "font-mono text-xs tabular-nums text-ink", children: fmtPercent(a.threshold) })] })] })] }) }), connectionMessage && (_jsxs("div", { className: cn("flex items-center gap-2 rounded-lg px-3.5 py-2.5", isLive
                    ? "border border-status-healthy/30 bg-status-healthy/5"
                    : "border border-status-elevated/30 bg-status-elevated/8"), children: [_jsx(StatusDot, { tone: isLive
                            ? "healthy"
                            : "elevated", pulse: isLive, size: "sm" }), _jsxs("p", { className: "text-[12px] leading-relaxed text-ink-2", children: [_jsx("span", { className: "font-medium text-ink", children: isLive
                                    ? "Backend connected."
                                    : "Fallback active." }), " ", connectionMessage] })] })), a.notice && (_jsxs("div", { className: "flex items-start gap-2 rounded-lg border border-hairline bg-overlay/50 px-3.5 py-2.5", children: [_jsx(ShieldCheck, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3", strokeWidth: 1.6 }), _jsx("p", { className: "text-[12px] leading-relaxed text-ink-2", children: a.notice })] })), _jsxs("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: [_jsx(Panel, { title: "Likely failure mode", eyebrow: "Predicted class", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface/50 px-3.5 py-3", children: [_jsx("span", { className: "text-sm font-medium text-ink", children: a.mode.name }), _jsx(Badge, { tone: a.mode.code === "NONE"
                                                ? "healthy"
                                                : alertTone, children: a.mode.code === "NONE"
                                                ? "Nominal"
                                                : a.mode.code })] }), a.mode.confidence !==
                                    undefined && (_jsxs("p", { className: "text-[11px] text-ink-3", children: ["Confidence", " ", fmtPercent(a.mode.confidence)] })), a.modes.filter((m) => m.code !== "NONE").length > 1 && (_jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3", children: "Runner-up modes" }), a.modes
                                            .filter((m) => m.code !== "NONE" &&
                                            m.code !==
                                                a.mode.code)
                                            .slice(0, 3)
                                            .map((m) => (_jsxs("div", { className: "flex items-center justify-between text-[12px]", children: [_jsx("span", { className: "text-ink-2", children: m.name }), _jsx("span", { className: "font-mono tabular-nums text-ink-3", children: m.probability !==
                                                        undefined
                                                        ? fmtPercent(m.probability)
                                                        : m.confidence !==
                                                            undefined
                                                            ? fmtPercent(m.confidence)
                                                            : "" })] }, m.code)))] }))] }) }), _jsx(Panel, { title: "Derived parameters", eyebrow: "Computed", children: _jsxs("div", { className: "space-y-3", children: [_jsx(DerivedGrid, { input: a.inputs }), _jsxs("div", { className: "rounded-lg border border-hairline bg-surface/40 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3", children: "Sensor values" }), _jsxs("div", { className: "mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums", children: [_jsxs("span", { className: "text-ink-3", children: ["Product", " ", _jsx("span", { className: "text-ink", children: a.inputs.productType })] }), _jsxs("span", { className: "text-ink-3", children: ["Air", " ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.airTemp, 1), " ", "K"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Process", " ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.processTemp, 1), " ", "K"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Speed", " ", _jsxs("span", { className: "text-ink", children: [fmtInt(a.inputs.speed), " ", "rpm"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Torque", " ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.torque, 1), " ", "Nm"] })] }), _jsxs("span", { className: "text-ink-3", children: ["Tool wear", " ", _jsxs("span", { className: "text-ink", children: [fmtNum(a.inputs.toolWear, 1), " ", "min"] })] })] })] })] }) })] }), _jsxs("div", { className: "grid grid-cols-1 gap-4 lg:grid-cols-2", children: [_jsxs(Panel, { title: "Supporting evidence", eyebrow: "Why", children: [a.contributing.length ? (_jsx(FeatureBars, { features: a.contributing })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "No per-feature attribution returned for this run." })), a.evidence.length > 0 && (_jsx("ul", { className: "mt-4 space-y-1.5 border-t border-hairline pt-4", children: a.evidence.map((e, i) => (_jsxs("li", { className: "flex gap-2 text-[12.5px] leading-relaxed text-ink-2", children: [_jsx("span", { className: "mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal/70" }), e] }, i))) }))] }), _jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs(Panel, { title: "Recommended action", eyebrow: "Maintenance guidance", children: [_jsx("p", { className: "text-[13.5px] leading-relaxed text-ink-2", children: a.recommendation }), _jsxs("p", { className: "mt-3 border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-3", children: [_jsx(Sparkles, { className: "mr-1 inline h-3 w-3 text-signal", strokeWidth: 1.6 }), "Decision support only \u2014 validate against factory calibration before acting."] })] }), _jsxs(Panel, { title: "Model explanation", eyebrow: "Plain language", children: [_jsx("p", { className: "text-[13px] leading-relaxed text-ink-2", children: a.explanation }), _jsxs("div", { className: "mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline pt-3 font-mono text-[10px] tabular-nums text-ink-3", children: [a.modelVersion && (_jsxs("span", { children: ["v", a.modelVersion] })), a.latencyMs !==
                                                undefined && (_jsxs("span", { children: [fmtInt(a.latencyMs), " ", "ms"] })), _jsx("span", { children: a.source === "live"
                                                    ? "FastAPI"
                                                    : "Local engine" })] })] })] })] }), _jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsx("div", { className: "flex items-center gap-2 text-[11.5px] text-ink-3", children: _jsxs("span", { children: ["Model may label output as", " ", a.mode.code === "NONE"
                                    ? FAILURE_MODES.NONE
                                        .name
                                    : FAILURE_MODES[a.mode.code]?.name, "."] }) }), hasAlert || alertFiled ? (_jsx(Button, { variant: "secondary", icon: _jsx(Check, { className: "h-4 w-4 text-status-healthy" }), label: "Alert on file", disabled: true })) : (_jsx(Button, { variant: "danger", icon: _jsx(BellRing, { className: "h-4 w-4" }), label: "Create alert", onClick: onFileAlert }))] }), _jsx("div", { className: "flex justify-end", children: _jsxs(Link, { to: "/machines", className: "flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-signal", children: ["View machine health", _jsx(ArrowRight, { className: "h-3 w-3" })] }) })] }));
}
