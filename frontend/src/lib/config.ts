export const APP = {
  name: "Fathom",
  product: "Predictive Maintenance Agent",
  defaultApiBase: "http://localhost:8000",
  warmupTimeoutMs: 12000,
  alertThreshold: 0.6,
  criticalThreshold: 0.8,
  defaultMachineId: "MM-0001",
  storageKeys: {
    assessments: "fathom.assessments.v1",
    alerts: "fathom.alerts.v1",
  },
};

export function apiBase(): string {
  return import.meta.env.VITE_API_BASE ?? APP.defaultApiBase;
}
