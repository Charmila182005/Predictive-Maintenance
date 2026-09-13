import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, History, RotateCcw, RefreshCw, Siren } from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { Panel } from "@/components/deck/Panel";
import { Badge } from "@/components/deck/Badge";
import { Button } from "@/components/deck/Button";
import { EmptyState } from "@/components/deck/EmptyState";
import { Sparkline } from "@/components/instrument/Sparkline";
import { StatusBadge } from "@/components/instrument/StatusBadge";
import { useAppStore } from "@/lib/store";
import { APP } from "@/lib/config";
import { fmtPercent, fmtTs } from "@/lib/derived";
import { machineSummaries, trendSeries } from "@/lib/stats";
import { useAssessments, useAlerts } from "@/hooks/use-machines";
const RISK_OPTIONS = ["Low", "Medium", "High", "Critical"];
const MODE_OPTIONS = ["TWF", "HDF", "PWF", "OSF", "RNF"];
const inputCls = "h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60";
function probColor(p) {
    if (p >= 0.8)
        return "var(--color-status-critical)";
    if (p >= 0.6)
        return "var(--color-status-high)";
    if (p >= 0.35)
        return "var(--color-status-elevated)";
    return "var(--color-status-healthy)";
}
// LocalStorage helpers for offline fallback
function getLocalAssessments() {
    try {
        const raw = localStorage.getItem(APP.storageKeys.assessments);
        return raw ? JSON.parse(raw) : [];
    }
    catch {
        return [];
    }
}
function saveLocalAssessments(assessments) {
    try {
        localStorage.setItem(APP.storageKeys.assessments, JSON.stringify(assessments));
    }
    catch {
        // storage unavailable
    }
}
export function HistoryPage() {
    const localAssessments = useAppStore((s) => s.assessments);
    const { assessments: backendAssessments, loading, error, refetch } = useAssessments({ page_size: 100 });
    const { alerts, loading: alertsLoading, refetch: refetchAlerts } = useAlerts({ page_size: 50 });
    const [query, setQuery] = useState("");
    const [machine, setMachine] = useState("all");
    const [risk, setRisk] = useState("all");
    const [mode, setMode] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [dataSource, setDataSource] = useState("backend");
    // Merge backend + local assessments, flag source
    const allAssessments = useMemo(() => {
        if (backendAssessments.length > 0) {
            setDataSource("backend");
            // Also save to localStorage as backup
            saveLocalAssessments(backendAssessments);
            return backendAssessments.map((a) => ({ ...a, _source: "backend" }));
        }
        // Fallback to localStorage
        const local = getLocalAssessments();
        if (local.length > 0) {
            setDataSource("local");
            return local.map((a) => ({ ...a, _source: "local" }));
        }
        // Use local store (from Analyze page runs)
        setDataSource("local");
        return localAssessments.map((a) => ({ ...a, _source: "local" }));
    }, [backendAssessments, localAssessments]);
    const machines = useMemo(() => machineSummaries(allAssessments).map((m) => m.machineId), [allAssessments]);
    const trend = useMemo(() => trendSeries(allAssessments), [allAssessments]);
    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return allAssessments.filter((a) => {
            if (q) {
                const hay = `${a.inputs?.machineId ?? ""} ${a.mode?.name ?? ""} ${a.mode?.code ?? ""}`.toLowerCase();
                if (!hay.includes(q))
                    return false;
            }
            if (machine !== "all" && a.inputs?.machineId !== machine)
                return false;
            if (risk !== "all" && a.riskLevel !== risk)
                return false;
            if (mode === "NOMINAL") {
                if (a.mode?.code !== "NONE")
                    return false;
            }
            else if (mode !== "all" && a.mode?.code !== mode)
                return false;
            const day = (a.ts ?? "").slice(0, 10);
            if (dateFrom && day < dateFrom)
                return false;
            if (dateTo && day > dateTo)
                return false;
            return true;
        });
    }, [allAssessments, query, machine, risk, mode, dateFrom, dateTo]);
    const resetFilters = () => {
        setQuery("");
        setMachine("all");
        setRisk("all");
        setMode("all");
        setDateFrom("");
        setDateTo("");
    };
    if (!allAssessments.length && !loading) {
        return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "04 / Prediction History", title: "Prediction history", description: "Every assessment across the fleet \u2014 with auto-generated alerts for high-risk predictions." }), _jsx(EmptyState, { icon: History, eyebrow: "No history yet", title: "No predictions recorded", description: "Run your first machine assessment and it will land here with its failure probability, risk level, likely failure mode, and model source.", action: _jsx(Link, { to: "/analyze", children: _jsx(Button, { variant: "primary", icon: _jsx(ArrowRight, { className: "h-3.5 w-3.5" }), label: "Run an assessment" }) }) })] }));
    }
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "04 / Prediction History", title: "Prediction history", description: "Every assessment across the fleet \u2014 with auto-generated alerts for high-risk predictions.", right: _jsxs("div", { className: "flex items-center gap-2", children: [dataSource === "local" && (_jsx(Badge, { tone: "elevated", children: "Offline data" })), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(RefreshCw, { className: "h-3.5 w-3.5" }), onClick: () => { refetch(); refetchAlerts(); }, loading: loading, children: "Refresh" })] }) }), error && (_jsxs("div", { className: "rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm", children: ["Backend unavailable, showing local data. Failed to load: ", error] })), _jsx(Panel, { title: "Alerts", eyebrow: "Auto-generated from high-risk predictions", right: _jsxs("span", { className: "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3", children: [alerts.length, " alert", alerts.length === 1 ? "" : "s"] }), children: alerts.length ? (_jsx("div", { className: "space-y-1.5", children: alerts.slice(0, 6).map((a) => (_jsxs("div", { className: "flex items-center gap-3 rounded-lg border border-hairline bg-surface/40 px-3 py-2.5", children: [_jsx(Siren, { className: `h-4 w-4 shrink-0 ${a.severity === "Critical" ? "text-status-critical" : a.severity === "High" ? "text-status-high" : "text-status-elevated"}`, strokeWidth: 1.8 }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs text-ink", children: a.machine_id }), _jsx(StatusBadge, { value: a.severity })] }), _jsxs("p", { className: "mt-0.5 truncate text-[11px] text-ink-3", children: [a.mode_name, " \u00B7 ", fmtTs(a.ts)] })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx("span", { className: "font-mono text-xs font-semibold tabular-nums text-ink", children: fmtPercent(a.failure_probability) }), _jsx(Badge, { tone: "neutral", children: a.status })] })] }, a.id))) })) : (_jsxs("div", { className: "flex min-h-16 flex-col items-center justify-center gap-2 text-center", children: [_jsx(Siren, { className: "h-5 w-5 text-ink-3", strokeWidth: 1.4 }), _jsxs("p", { className: "text-[13px] text-ink-2", children: ["No alerts yet. Assessments above ", fmtPercent(APP.alertThreshold), " auto-file an alert."] })] })) }), _jsx(Panel, { title: "Filters", eyebrow: "Refine the log", children: _jsxs("div", { className: "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-8", children: [_jsxs("label", { className: "block sm:col-span-2", children: [_jsxs("div", { className: "mb-1.5 flex items-baseline justify-between", children: [_jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Search" }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: "machine \u00B7 mode" })] }), _jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "MM-0001, TWF, Heat dissipation\u2026", className: inputCls })] }), _jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-1.5 flex items-baseline justify-between", children: _jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Machine" }) }), _jsxs("select", { value: machine, onChange: (e) => setMachine(e.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All machines" }), machines.map((m) => (_jsx("option", { value: m, children: m }, m)))] })] }), _jsxs("label", { className: "block", children: [_jsxs("div", { className: "mb-1.5 flex items-baseline justify-between", children: [_jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Risk" }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: "Low \u00B7 Critical" })] }), _jsxs("select", { value: risk, onChange: (e) => setRisk(e.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All risks" }), RISK_OPTIONS.map((r) => (_jsx("option", { value: r, children: r }, r)))] })] }), _jsxs("label", { className: "block", children: [_jsxs("div", { className: "mb-1.5 flex items-baseline justify-between", children: [_jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "Failure mode" }), _jsx("span", { className: "font-mono text-[10px] text-ink-3", children: "NOMINAL \u00B7 TWF \u00B7 OSF" })] }), _jsxs("select", { value: mode, onChange: (e) => setMode(e.target.value), className: inputCls, children: [_jsx("option", { value: "all", children: "All modes" }), _jsx("option", { value: "NOMINAL", children: "NOMINAL / No Failure" }), MODE_OPTIONS.map((m) => (_jsx("option", { value: m, children: m }, m)))] })] }), _jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-1.5 flex items-baseline justify-between", children: _jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "From" }) }), _jsx("input", { type: "date", value: dateFrom, onChange: (e) => setDateFrom(e.target.value), className: inputCls })] }), _jsxs("label", { className: "block", children: [_jsx("div", { className: "mb-1.5 flex items-baseline justify-between", children: _jsx("span", { className: "text-[11px] font-medium text-ink-2", children: "To" }) }), _jsx("input", { type: "date", value: dateTo, onChange: (e) => setDateTo(e.target.value), className: inputCls })] }), _jsx("div", { className: "flex items-end", children: _jsx(Button, { variant: "ghost", size: "sm", className: "h-9 w-full", icon: _jsx(RotateCcw, { className: "h-3.5 w-3.5" }), label: "Clear", onClick: resetFilters }) })] }) }), _jsx(Panel, { title: "Risk trend", eyebrow: "All assessments \u00B7 p(failure)", children: trend.length >= 2 ? (_jsxs("div", { className: "flex h-full min-h-36 flex-col justify-end", children: [_jsx(Sparkline, { values: trend.map((t) => t.probability), stroke: "var(--color-signal)", className: "w-full" }), _jsxs("div", { className: "mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 font-mono text-[10px] text-ink-3", children: [_jsxs("span", { children: [fmtTs(trend[0].ts, { full: true }), " \u2192 ", fmtTs(trend[trend.length - 1].ts, { full: true })] }), _jsxs("span", { children: [allAssessments.length, " assessments \u00B7", " ", fmtPercent(Math.min(...trend.map((t) => t.probability))), "\u2013", fmtPercent(Math.max(...trend.map((t) => t.probability)))] })] })] })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "Run a second assessment to plot the failure-probability trend." })) }), _jsx(Panel, { title: "Assessments", eyebrow: "Newest first", right: _jsxs("span", { className: "font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3", children: [filtered.length, " of ", allAssessments.length, " assessments"] }), children: filtered.length ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-surface", children: _jsx("tr", { children: ["Machine", "Time", "Probability", "Risk", "Mode", "Source"].map((h) => (_jsx("th", { className: "border-b border-hairline px-3 py-2 font-mono text-[10px] font-medium uppercase tracking-wider text-ink-3", children: h }, h))) }) }), _jsx("tbody", { children: filtered.map((a) => (_jsxs("tr", { className: "group", children: [_jsx("td", { className: "border-b border-hairline/60 px-3 py-2.5", children: _jsx(Link, { to: `/machines?machine=${encodeURIComponent(a.inputs?.machineId ?? "")}`, className: "font-mono text-xs text-ink transition-colors hover:text-signal", children: a.inputs?.machineId ?? "—" }) }), _jsx("td", { className: "whitespace-nowrap border-b border-hairline/60 px-3 py-2.5 font-mono text-[11px] tabular-nums text-ink-2", children: fmtTs(a.ts, { full: true, seconds: true }) }), _jsx("td", { className: "border-b border-hairline/60 px-3 py-2.5", children: _jsx("span", { className: "font-mono text-sm font-semibold tabular-nums", style: { color: probColor(a.failureProbability) }, children: fmtPercent(a.failureProbability) }) }), _jsx("td", { className: "border-b border-hairline/60 px-3 py-2.5", children: _jsx(StatusBadge, { value: a.riskLevel }) }), _jsx("td", { className: "border-b border-hairline/60 px-3 py-2.5", children: _jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [_jsx(Badge, { tone: a.mode?.code === "NONE" ? "healthy" : "neutral", children: a.mode?.code === "NONE" ? "NOMINAL" : a.mode?.code ?? "—" }), _jsx("span", { className: "text-[10px] text-ink-3", children: a.mode?.name ?? "" })] }) }), _jsx("td", { className: "border-b border-hairline/60 px-3 py-2.5", children: _jsx(Badge, { tone: a.source === "fastapi" || a.source === "live" ? "signal" : "elevated", children: a.source === "fastapi" ? "Live" : a.source === "gradio" ? "Gradio" : a.source === "local" ? "Local" : "Simulated" }) })] }, a.id))) })] }) })) : (_jsxs("div", { className: "flex min-h-32 flex-col items-center justify-center gap-3 text-center", children: [_jsx("p", { className: "text-[13px] text-ink-2", children: "No assessments match the current filters." }), _jsx(Button, { variant: "ghost", size: "sm", icon: _jsx(RotateCcw, { className: "h-3.5 w-3.5" }), label: "Clear filters", onClick: resetFilters })] })) })] }));
}
