import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CircleGauge, ScanSearch, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { StatusDot } from "@/components/deck/StatusDot";
import { Panel } from "@/components/deck/Panel";
import { EmptyState } from "@/components/deck/EmptyState";
import { Button } from "@/components/deck/Button";
import { StatCard } from "@/components/instrument/StatCard";
import { RiskGauge } from "@/components/instrument/RiskGauge";
import { DistributionBar } from "@/components/instrument/DistributionBar";
import { Sparkline } from "@/components/instrument/Sparkline";
import { StatusBadge } from "@/components/instrument/StatusBadge";
import { useAppStore } from "@/lib/store";
import { APP } from "@/lib/config";
import { fmtPercent, fmtTs } from "@/lib/derived";
import { machineSummaries, countByHealth, meanProbability, atRisk, trendSeries } from "@/lib/stats";
const RISK_META = {
    Low: { color: "var(--color-status-healthy)" },
    Medium: { color: "var(--color-status-elevated)" },
    High: { color: "var(--color-status-high)" },
    Critical: { color: "var(--color-status-critical)" },
};
export function Overview() {
    const assessments = useAppStore((s) => s.assessments);
    const alerts = useAppStore((s) => s.alerts);
    const connection = useAppStore((s) => s.connection);
    const stats = useMemo(() => {
        const summaries = machineSummaries(assessments);
        const fleetLatest = summaries.map((m) => m.latest);
        const health = countByHealth(fleetLatest);
        const riskCounts = { Low: 0, Medium: 0, High: 0, Critical: 0 };
        for (const a of fleetLatest)
            riskCounts[a.riskLevel]++;
        const meanProb = meanProbability(fleetLatest);
        const unitsAtRisk = atRisk(fleetLatest, APP.alertThreshold).length;
        const openAlerts = alerts.filter((a) => a.status === "Open").length;
        const trend = trendSeries(assessments).slice(-48);
        return { summaries, health, riskCounts, meanProb, unitsAtRisk, openAlerts, trend };
    }, [assessments, alerts]);
    const tone = connection.status === "live" ? "healthy" : connection.status === "simulated" ? "elevated" : connection.status === "offline" ? "critical" : "neutral";
    const connLabel = connection.status === "live" ? "Live model" : connection.status === "simulated" ? "Simulated engine" : connection.status === "offline" ? "Offline" : "Connecting";
    const attention = stats.summaries
        .map((m) => m.latest)
        .filter((a) => a.riskLevel === "High" || a.riskLevel === "Critical")
        .sort((a, b) => b.failureProbability - a.failureProbability);
    const riskSegments = Object.keys(RISK_META).map((k) => ({
        key: k,
        label: k,
        count: stats.riskCounts[k],
        color: RISK_META[k].color,
    }));
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx(PageHeader, { index: "01 / Dashboard", title: "Fleet overview", description: "Aggregate machine health, failure risk, and open attention \u2014 computed from persisted assessments.", right: _jsxs("div", { className: "flex h-9 items-center gap-2.5 rounded-full border border-hairline bg-overlay/70 px-4", children: [_jsx(StatusDot, { tone: tone, pulse: connection.status === "checking" || connection.status === "live", size: "sm" }), _jsx("span", { className: "font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink-2", children: connLabel })] }) }), !assessments.length ? (_jsx(EmptyState, { icon: ScanSearch, eyebrow: "No assessments yet", title: "The fleet is quiet \u2014 for now", description: "Run your first machine assessment to seed the health summary, risk distribution, and alert feed.", action: _jsx(Link, { to: "/analyze", children: _jsx(Button, { variant: "primary", icon: _jsx(ArrowRight, { className: "h-3.5 w-3.5" }), label: "Run an assessment" }) }) })) : (_jsxs(_Fragment, { children: [_jsxs("section", { "aria-label": "Fleet metrics", className: "grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4", children: [_jsx(StatCard, { label: "Machines tracked", value: String(stats.summaries.length), unit: "fleet" }), _jsx(StatCard, { label: "Fleet health", value: `${(stats.meanProb * 100).toFixed(1)}%`, unit: "mean failure risk", tone: stats.meanProb >= 0.6 ? "critical" : stats.meanProb >= 0.35 ? "elevated" : "healthy" }), _jsx(StatCard, { label: "Units at risk", value: String(stats.unitsAtRisk), unit: "\u2265 60% threshold", tone: stats.unitsAtRisk > 0 ? "high" : "neutral" }), _jsx(StatCard, { label: "Open alerts", value: String(stats.openAlerts), unit: "awaiting action", tone: stats.openAlerts > 0 ? "critical" : "neutral" })] }), _jsxs("section", { className: "grid grid-cols-1 gap-4 lg:grid-cols-3", children: [_jsx(Panel, { title: "Fleet risk gauge", eyebrow: "Aggregate signal", children: _jsx("div", { className: "flex items-center justify-center py-2", children: _jsx(RiskGauge, { probability: stats.meanProb, size: 210, label: "Mean failure risk" }) }) }), _jsx(Panel, { title: "Failure risk distribution", eyebrow: "Latest per machine", className: "lg:col-span-2", children: _jsxs("div", { className: "flex h-full flex-col justify-center gap-4 py-1", children: [_jsx(DistributionBar, { segments: riskSegments }), _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
                                                ["Normal", stats.health.Normal, "var(--color-status-healthy)"],
                                                ["Warning", stats.health.Warning, "var(--color-status-elevated)"],
                                                ["High risk", stats.health["High Risk"], "var(--color-status-high)"],
                                                ["Critical", stats.health.Critical, "var(--color-status-critical)"],
                                            ].map(([label, count, color]) => (_jsxs("div", { className: "rounded-lg border border-hairline bg-surface/50 px-3 py-2.5", children: [_jsx("p", { className: "font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3", children: label }), _jsx("p", { className: "mt-1 font-mono text-xl font-semibold tabular-nums", style: { color }, children: count })] }, label))) })] }) })] }), _jsxs("section", { className: "grid grid-cols-1 gap-4 lg:grid-cols-3", children: [_jsx(Panel, { title: "Risk trend", eyebrow: "All assessments \u00B7 p(failure)", right: stats.trend.length >= 2 ? (_jsxs("span", { className: "font-mono text-[10px] text-ink-3", children: [fmtTs(stats.trend[0].ts), " \u2192 ", fmtTs(stats.trend[stats.trend.length - 1].ts)] })) : undefined, className: "lg:col-span-2", children: _jsx("div", { className: "flex h-full min-h-36 flex-col justify-end", children: stats.trend.length >= 2 ? (_jsxs(_Fragment, { children: [_jsx(Sparkline, { values: stats.trend.map((t) => t.probability), stroke: "var(--color-signal)", className: "w-full" }), _jsxs("div", { className: "mt-2 flex justify-between font-mono text-[10px] text-ink-3", children: [_jsxs("span", { children: [assessments.length, " assessments"] }), _jsx("span", { children: "0\u2013100%" })] })] })) : (_jsx("p", { className: "text-[13px] text-ink-2", children: "Run a second assessment to plot a trend." })) }) }), _jsx(Panel, { title: "Needs attention", eyebrow: "High & critical risk", children: attention.length ? (_jsx("ul", { className: "space-y-2.5", children: attention.slice(0, 5).map((a) => (_jsxs("li", { className: "flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface/50 px-3 py-2.5", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(TriangleAlert, { className: "h-3.5 w-3.5 shrink-0 text-status-high", strokeWidth: 1.8 }), _jsx(Link, { to: `/machines?machine=${a.inputs.machineId}`, className: "truncate font-mono text-xs text-ink hover:text-signal", children: a.inputs.machineId })] }), _jsx("p", { className: "mt-0.5 truncate text-[11px] text-ink-3", children: a.mode.name })] }), _jsxs("div", { className: "flex shrink-0 flex-col items-end gap-1", children: [_jsx("span", { className: "font-mono text-sm font-semibold tabular-nums", style: { color: "var(--color-status-high)" }, children: fmtPercent(a.failureProbability) }), _jsx(StatusBadge, { value: a.riskLevel })] })] }, a.id))) })) : (_jsxs("div", { className: "flex min-h-24 flex-col items-center justify-center gap-2 text-center", children: [_jsx(CircleGauge, { className: "h-6 w-6 text-status-healthy", strokeWidth: 1.4 }), _jsx("p", { className: "text-[13px] text-ink-2", children: "No machines currently in the attention band." })] })) })] }), _jsx("section", { children: _jsx(Panel, { title: "Quick links", eyebrow: "Navigate", children: _jsx("div", { className: "grid grid-cols-2 gap-3 sm:grid-cols-4", children: [
                                    { to: "/analyze", label: "Run Assessment", desc: "Analyze a machine" },
                                    { to: "/machines", label: "Machines", desc: "Manage & update sensors" },
                                    { to: "/history", label: "History", desc: "View all predictions" },
                                    { to: "/insights", label: "Insights", desc: "Deep-dive explainability" },
                                ].map((link) => (_jsxs(Link, { to: link.to, className: "group rounded-lg border border-hairline bg-surface/40 px-4 py-3 transition-colors hover:border-signal/30 hover:bg-signal-dim/20", children: [_jsx("p", { className: "text-sm font-medium text-ink group-hover:text-signal", children: link.label }), _jsx("p", { className: "mt-0.5 text-[11px] text-ink-3", children: link.desc })] }, link.to))) }) }) })] }))] }));
}
