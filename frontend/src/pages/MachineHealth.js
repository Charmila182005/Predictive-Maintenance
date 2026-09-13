import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Cpu, Search, RefreshCw, Plus, Send } from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { Panel } from "@/components/deck/Panel";
import { EmptyState } from "@/components/deck/EmptyState";
import { Button } from "@/components/deck/Button";
import { StatusBadge, toneForStatus } from "@/components/instrument/StatusBadge";
import { RiskGauge } from "@/components/instrument/RiskGauge";
import { Sparkline } from "@/components/instrument/Sparkline";
import { FeatureBars } from "@/components/instrument/FeatureBars";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api/client";
import { derive, fmtNum, fmtPercent, fmtInt, fmtTs } from "@/lib/derived";
import { machineSummaries } from "@/lib/stats";
import { useMachines, useAssessments } from "@/hooks/use-machines";
import { cn } from "@/lib/utils/cn";
const inputCls = "h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60";
export function MachineHealth() {
    const connection = useAppStore((s) => s.connection);
    const [searchParams, setSearchParams] = useSearchParams();
    const [query, setQuery] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const { machines, loading: machinesLoading, error: machinesError, refetch: refetchMachines } = useMachines();
    const { assessments, loading: assessmentsLoading, error: assessmentsError, refetch: refetchAssessments } = useAssessments();
    const summaries = useMemo(() => machineSummaries(assessments), [assessments]);
    const active = useMemo(() => {
        const requested = searchParams.get("machine");
        return summaries.find((m) => m.machineId === requested) ?? summaries[0];
    }, [summaries, searchParams]);
    const filtered = useMemo(() => summaries.filter((m) => m.machineId.toLowerCase().includes(query.trim().toLowerCase())), [summaries, query]);
    const tone = connection.status === "live" ? "healthy" : connection.status === "simulated" ? "elevated" : connection.status === "offline" ? "critical" : "neutral";
    const connLabel = connection.status === "live" ? "Live" : connection.status === "simulated" ? "Simulated" : connection.status === "offline" ? "Offline" : "Connecting";
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "03 / Machines", title: "Machine health", description: "Manage machines, update sensor values, and track health predictions over time.", right: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex h-9 items-center gap-2.5 rounded-full border border-hairline bg-overlay/70 px-4", children: _jsx(StatusBadge, { value: connLabel }) }), _jsx(Button, { variant: "primary", size: "sm", icon: _jsx(Plus, { className: "h-3.5 w-3.5" }), onClick: () => setShowAddForm(!showAddForm), children: showAddForm ? "Cancel" : "Add Machine" }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(RefreshCw, { className: "h-3.5 w-3.5" }), onClick: () => { refetchMachines(); refetchAssessments(); }, children: "Refresh" })] }) }), showAddForm && (_jsx(AddMachineForm, { onCreated: () => {
                    setShowAddForm(false);
                    refetchMachines();
                }, onCancel: () => setShowAddForm(false) })), machinesError && (_jsxs("div", { className: "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm", children: ["Failed to load machines: ", machinesError] })), assessmentsError && (_jsxs("div", { className: "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm", children: ["Failed to load assessments: ", assessmentsError] })), !summaries.length && !machinesLoading && !assessmentsLoading ? (_jsx(EmptyState, { icon: Cpu, eyebrow: "No machines yet", title: "No assessed units to chart", description: "Add a machine and run an assessment to see health status, failure risk, and signal history.", action: _jsx(Link, { to: "/analyze", children: _jsx(Button, { variant: "primary", icon: _jsx(ArrowRight, { className: "h-3.5 w-3.5" }), label: "Run an assessment" }) }) })) : (_jsxs("section", { className: "grid grid-cols-1 gap-4 lg:grid-cols-3", children: [_jsx(Panel, { title: "Fleet", eyebrow: "Select machine", children: machinesLoading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx("div", { className: "animate-spin rounded-full h-6 w-6 border-2 border-signal-cyan border-t-transparent" }) })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: "relative mb-3", children: [_jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3", strokeWidth: 1.8 }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Filter machines\u2026", className: "h-9 w-full rounded-lg border border-hairline bg-overlay/70 pl-8 pr-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60" })] }), _jsxs("ul", { className: "max-h-[420px] space-y-1.5 overflow-y-auto pr-0.5", children: [filtered.map((m) => {
                                            const isActive = active?.machineId === m.machineId;
                                            return (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => setSearchParams({ machine: m.machineId }), className: cn("flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors", isActive ? "border-signal/30 bg-signal-dim/40" : "border-hairline bg-surface/40 hover:bg-white/5"), children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "truncate font-mono text-xs text-ink", children: m.machineId }), _jsx(StatusBadge, { value: m.latest.healthStatus })] }), _jsxs("p", { className: "mt-0.5 font-mono text-[10px] tabular-nums text-ink-3", children: [m.count, " assessment", m.count === 1 ? "" : "s"] })] }), _jsx("span", { className: "shrink-0 font-mono text-sm font-semibold tabular-nums text-ink", children: fmtPercent(m.latest.failureProbability) })] }) }, m.machineId));
                                        }), !filtered.length && (_jsx("li", { className: "rounded-lg border border-hairline bg-surface/40 px-3 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3", children: "No matches" }))] })] })) }), active ? (_jsx(MachineDetail, { summary: active, onRefresh: () => { refetchMachines(); refetchAssessments(); } })) : (_jsx("div", { className: "lg:col-span-2 flex items-center justify-center rounded-lg border border-hairline bg-surface/30 p-12 text-center", children: _jsxs("div", { children: [_jsx(Cpu, { className: "mx-auto h-8 w-8 text-ink-3", strokeWidth: 1.4 }), _jsx("p", { className: "mt-3 text-[13px] text-ink-2", children: "Select a machine from the fleet panel to view details and update sensor values." })] }) }))] }))] }));
}
function AddMachineForm({ onCreated, onCancel }) {
    const [form, setForm] = useState({ machine_id: "", name: "", type: "", location: "" });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.machine_id || !form.name) {
            setError("Machine ID and Name are required");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            await api.createMachine({
                machine_id: form.machine_id,
                name: form.name,
                type: form.type || undefined,
                location: form.location || undefined,
            });
            onCreated();
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to create machine");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Panel, { title: "Add new machine", eyebrow: "Register a machine", children: _jsxs("form", { onSubmit: handleSubmit, className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4", children: [_jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[11px] font-medium text-ink-2", children: "Machine ID *" }), _jsx("input", { value: form.machine_id, onChange: (e) => setForm({ ...form, machine_id: e.target.value }), placeholder: "MM-0001", className: inputCls, required: true })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[11px] font-medium text-ink-2", children: "Name *" }), _jsx("input", { value: form.name, onChange: (e) => setForm({ ...form, name: e.target.value }), placeholder: "CNC Lathe A", className: inputCls, required: true })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[11px] font-medium text-ink-2", children: "Type" }), _jsx("input", { value: form.type, onChange: (e) => setForm({ ...form, type: e.target.value }), placeholder: "CNC, Lathe, Motor\u2026", className: inputCls })] }), _jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[11px] font-medium text-ink-2", children: "Location" }), _jsx("input", { value: form.location, onChange: (e) => setForm({ ...form, location: e.target.value }), placeholder: "Factory A, Line 3", className: inputCls })] }), error && (_jsx("div", { className: "sm:col-span-2 lg:col-span-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm", children: error })), _jsxs("div", { className: "flex items-end gap-2 sm:col-span-2 lg:col-span-4", children: [_jsx(Button, { type: "submit", variant: "primary", size: "sm", loading: loading, children: "Create Machine" }), _jsx(Button, { type: "button", variant: "ghost", size: "sm", onClick: onCancel, children: "Cancel" })] })] }) }));
}
function MachineDetail({ summary, onRefresh }) {
    const latest = summary.latest;
    const alertTone = toneForStatus(latest.riskLevel);
    const derived = derive(latest.inputs);
    const statRows = [
        { label: "Health status", node: _jsx(StatusBadge, { value: latest.healthStatus }) },
        { label: "Risk level", node: _jsx(StatusBadge, { value: latest.riskLevel }) },
        { label: "Priority", node: _jsx(StatusBadge, { value: latest.priority }) },
        { label: "Decision threshold", node: _jsx("span", { className: "font-mono text-xs tabular-nums text-ink", children: fmtPercent(latest.threshold) }) },
        ...(latest.anomalyPercentile !== undefined && Number.isFinite(latest.anomalyPercentile)
            ? [{ label: "Anomaly percentile", node: _jsxs("span", { className: "font-mono text-xs tabular-nums text-ink", children: [fmtNum(latest.anomalyPercentile), "%"] }) }]
            : []),
    ];
    const runnerUps = latest.modes.filter((m) => m.code !== "NONE" && m.code !== latest.mode.code);
    return (_jsxs("div", { className: "flex flex-col gap-4 lg:col-span-2", children: [_jsx(Panel, { title: summary.machineId, eyebrow: "Latest assessment", right: _jsx("div", { className: "flex min-w-0 items-center gap-2", children: _jsx("span", { className: "shrink-0 font-mono text-[10px] tabular-nums text-ink-3", children: fmtTs(latest.ts, { full: true }) }) }), children: _jsxs("div", { className: "flex flex-col items-center gap-1 py-2 sm:flex-row sm:justify-around", children: [_jsx(RiskGauge, { probability: Number.isFinite(latest.failureProbability) ? latest.failureProbability : 0, size: 190 }), _jsx("div", { className: "w-full max-w-60 space-y-3", children: statRows.map((row, i) => (_jsxs("div", { className: cn("flex items-center justify-between gap-2", i < statRows.length - 1 && "border-b border-hairline pb-2"), children: [_jsx("span", { className: "text-[11px] text-ink-2", children: row.label }), row.node] }, row.label))) })] }) }), _jsx(UpdateSensorsForm, { machineId: summary.machineId, onUpdated: onRefresh }), _jsx(Panel, { title: "Failure mode", eyebrow: "Predicted class", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface/50 px-3.5 py-3", children: [_jsx("span", { className: "truncate text-sm font-medium text-ink", children: latest.mode.name }), _jsx("span", { className: cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", alertTone === "healthy" ? "bg-status-healthy/20 text-status-healthy" : alertTone === "high" ? "bg-status-high/20 text-status-high" : alertTone === "critical" ? "bg-status-critical/20 text-status-critical" : "bg-overlay text-ink-2"), children: latest.mode.code === "NONE" ? "Nominal" : latest.mode.code })] }), latest.mode.confidence !== undefined && (_jsxs("p", { className: "text-[11px] text-ink-3", children: ["Confidence ", fmtPercent(latest.mode.confidence)] })), runnerUps.length > 0 && (_jsxs("div", { className: "space-y-1.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3", children: "Runner-up modes" }), runnerUps.slice(0, 3).map((m) => (_jsxs("div", { className: "flex items-center justify-between text-[12px]", children: [_jsx("span", { className: "truncate text-ink-2", children: m.name }), _jsx("span", { className: "shrink-0 font-mono tabular-nums text-ink-3", children: m.probability !== undefined ? fmtPercent(m.probability) : m.confidence !== undefined ? fmtPercent(m.confidence) : "" })] }, m.code)))] }))] }) }), _jsx(Panel, { title: "Derived parameters", eyebrow: "Computed", children: _jsx("div", { className: "grid grid-cols-3 gap-3", children: [
                        { sym: "ΔT", name: "Process − Air", value: fmtNum(derived.tempDifference, 1), unit: "K" },
                        { sym: "P", name: "Mech power", value: fmtInt(derived.mechanicalPower), unit: "W" },
                        { sym: "TS", name: "Overstrain", value: fmtInt(derived.overstrain), unit: "W·min" },
                    ].map((c) => (_jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-2.5 py-2.5", children: [_jsxs("p", { className: "font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3", children: [c.sym, " \u00B7 ", c.name] }), _jsxs("p", { className: "mt-1 font-mono text-sm font-semibold tabular-nums text-ink", children: [c.value, " ", _jsx("span", { className: "text-[10px] font-normal text-ink-3", children: c.unit })] })] }, c.sym))) }) }), _jsx(Panel, { title: "Risk trend", eyebrow: `${summary.machineId} · p(failure)`, children: summary.count >= 2 ? (_jsxs("div", { className: "flex h-full min-h-36 flex-col justify-end", children: [_jsx(Sparkline, { values: summary.trend.map((a) => a.failureProbability).filter((v) => Number.isFinite(v)), stroke: "var(--color-signal)", className: "w-full" }), _jsxs("div", { className: "mt-2 flex justify-between font-mono text-[10px] tabular-nums text-ink-3", children: [_jsxs("span", { children: [summary.count, " assessments"] }), _jsx("span", { children: "0\u2013100%" })] })] })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "Run a second assessment on this machine to plot a trend." })) }), _jsx(Panel, { title: "Contributing features", eyebrow: "Signal attribution", children: latest.contributing.length ? (_jsx(FeatureBars, { features: latest.contributing })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "No signal attribution returned for this run." })) })] }));
}
function UpdateSensorsForm({ machineId, onUpdated }) {
    const [sensors, setSensors] = useState({
        air_temperature: "",
        process_temperature: "",
        rotational_speed: "",
        torque: "",
        tool_wear: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccess(false);
        const sensorValues = {};
        for (const [k, v] of Object.entries(sensors)) {
            if (v)
                sensorValues[k] = parseFloat(v);
        }
        try {
            await api.updateMachine(machineId, { sensor_values: sensorValues });
            setSuccess(true);
            setSensors({ air_temperature: "", process_temperature: "", rotational_speed: "", torque: "", tool_wear: "" });
            onUpdated();
            setTimeout(() => setSuccess(false), 3000);
        }
        catch (e) {
            setError(e instanceof Error ? e.message : "Failed to update sensors");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx(Panel, { title: "Update sensor values", eyebrow: `${machineId} · auto-predict on submit`, children: _jsxs("form", { onSubmit: handleSubmit, className: "grid grid-cols-2 gap-3 sm:grid-cols-5", children: [[
                    { key: "air_temperature", label: "Air Temp (K)", placeholder: "298.1" },
                    { key: "process_temperature", label: "Process Temp (K)", placeholder: "308.6" },
                    { key: "rotational_speed", label: "Speed (rpm)", placeholder: "1450" },
                    { key: "torque", label: "Torque (Nm)", placeholder: "45" },
                    { key: "tool_wear", label: "Tool Wear (min)", placeholder: "120" },
                ].map((f) => (_jsxs("label", { className: "block", children: [_jsx("span", { className: "mb-1.5 block text-[11px] font-medium text-ink-2", children: f.label }), _jsx("input", { type: "number", step: "any", value: sensors[f.key], onChange: (e) => setSensors({ ...sensors, [f.key]: e.target.value }), placeholder: f.placeholder, className: inputCls })] }, f.key))), _jsxs("div", { className: "col-span-2 flex items-end gap-2 sm:col-span-5", children: [_jsx(Button, { type: "submit", variant: "primary", size: "sm", icon: _jsx(Send, { className: "h-3.5 w-3.5" }), loading: loading, children: "Update & Predict" }), success && (_jsx("span", { className: "text-[12px] text-status-healthy", children: "Updated \u2014 prediction stored" }))] }), error && (_jsx("div", { className: "col-span-2 sm:col-span-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive text-sm", children: error }))] }) }));
}
