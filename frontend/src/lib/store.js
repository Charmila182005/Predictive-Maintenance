import { create } from "zustand";
import { persist } from "zustand/middleware";
import { uid, clampP } from "@/lib/derived";
import { severityFromProbability } from "@/lib/domain";
function buildAlert(a) {
    return {
        id: uid("alert"),
        machineId: a.inputs.machineId,
        ts: a.ts,
        severity: severityFromProbability(a.failureProbability),
        failureProbability: a.failureProbability,
        riskLevel: a.riskLevel,
        modeCode: a.mode.code,
        modeName: a.mode.name,
        evidence: a.evidence,
        recommendation: a.recommendation,
        status: "Open",
        assessmentId: a.id,
    };
}
export const useAppStore = create()(persist((set, get) => ({
    connection: { status: "checking", message: undefined },
    assessments: [],
    alerts: [],
    notifications: [],
    sidebarOpen: false,
    setConnection: (c) => set({ connection: c }),
    setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
    clearAssessments: () => set({ assessments: [] }),
    clearAlerts: () => set({ alerts: [], notifications: [] }),
    clearData: () => set({ assessments: [], alerts: [], notifications: [] }),
    probe: async (probeFn) => {
        const c = await probeFn();
        set({ connection: c });
    },
    addAssessment: (a) => {
        const severity = severityFromProbability(a.failureProbability);
        const shouldAlert = severity === "High" || severity === "Critical";
        let alert;
        if (shouldAlert) {
            alert = buildAlert(a);
            const note = {
                id: uid("notif"),
                ts: new Date().toISOString(),
                kind: "alert",
                severity: alert.severity,
                title: `${alert.severity} alert — ${alert.machineId}`,
                body: `${alert.modeName} risk at ${(clampP(a.failureProbability) * 100).toFixed(1)}%.`,
                read: false,
            };
            set((s) => ({
                assessments: [a, ...s.assessments],
                alerts: [alert, ...s.alerts],
                notifications: [note, ...s.notifications],
            }));
        }
        else {
            set((s) => ({ assessments: [a, ...s.assessments] }));
        }
        return { alert };
    },
    createAlert: (assessmentId) => {
        const a = get().assessments.find((x) => x.id === assessmentId);
        if (!a)
            return;
        const existing = get().alerts.find((al) => al.assessmentId === assessmentId);
        if (existing)
            return;
        const alert = buildAlert(a);
        const note = {
            id: uid("notif"),
            ts: new Date().toISOString(),
            kind: "alert",
            severity: alert.severity,
            title: `Alert filed — ${alert.machineId}`,
            body: `${alert.modeName} risk at ${(clampP(a.failureProbability) * 100).toFixed(1)}%.`,
            read: false,
        };
        set((s) => ({ alerts: [alert, ...s.alerts], notifications: [note, ...s.notifications] }));
    },
    acknowledgeAlert: (id) => set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: "Acknowledged" } : a)),
    })),
    resolveAlert: (id) => set((s) => ({
        alerts: s.alerts.map((a) => (a.id === id ? { ...a, status: "Resolved" } : a)),
    })),
    markNotificationsRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
    markNotificationRead: (id) => set((s) => ({
        notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
    })),
}), {
    name: "fathom.app.v1",
    partialize: (s) => ({
        assessments: s.assessments,
        alerts: s.alerts,
        notifications: s.notifications,
    }),
}));
export function selectOpenAlerts(alerts) {
    return alerts.filter((a) => a.status === "Open");
}
export function riskColor(level) {
    const s = String(level).toLowerCase();
    if (s.includes("critic"))
        return "var(--color-status-critical)";
    if (s.includes("high"))
        return "var(--color-status-critical)";
    if (s === "warning" || s.includes("warn") || s.includes("medium"))
        return "var(--color-status-elevated)";
    return "var(--color-status-healthy)";
}
