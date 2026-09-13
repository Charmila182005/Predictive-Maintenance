import type { FailureModeCode, FailureModeOutcome, HealthStatus, ProductType, RiskLevel, Severity } from "@/lib/types";

export const FAILURE_MODES: Record<
  FailureModeCode,
  { code: FailureModeCode; name: string; cause: string; indicator: string; action: string }
> = {
  TWF: {
    code: "TWF",
    name: "Tool Wear Failure",
    cause: "Gradual tool degradation from accumulated cutting stress.",
    indicator: "Tool wear minutes climbing toward the material limit.",
    action: "Inspect or replace the tool and recalibrate feed.",
  },
  HDF: {
    code: "HDF",
    name: "Heat Dissipation Failure",
    cause: "Cooling or process-heat balance degraded.",
    indicator: "Process temperature approaching air temperature margins.",
    action: "Check coolant flow; verify thermal isolation and airflow.",
  },
  PWF: {
    code: "PWF",
    name: "Power Failure",
    cause: "Motor load or electrical power draw beyond rated envelope.",
    indicator: "Torque × rotational speed indicating abnormal mechanical power.",
    action: "Inspect drive and motor; reduce load until verified.",
  },
  OSF: {
    code: "OSF",
    name: "Overstrain Failure",
    cause: "Combined tool-wear and torque loading overstressing the spindle.",
    indicator: "Overstrain measure (tool wear × torque) above safe band.",
    action: "Reduce torque and schedule spindle inspection.",
  },
  RNF: {
    code: "RNF",
    name: "Random Failure",
    cause: "No dominant process driver — stochastic mechanical or electrical fault.",
    indicator: "Anomalous signature without a clear parameter driver.",
    action: "Schedule diagnostic inspection; monitor trend closely.",
  },
  NONE: {
    code: "NONE",
    name: "No Failure",
    cause: "Operating conditions within the nominal envelope.",
    indicator: "All parameters and derived measures within expected range.",
    action: "Continue routine monitoring; no intervention required.",
  },
};

export const FAILURE_MODE_LIST = Object.values(FAILURE_MODES) as FailureModeOutcome[] & { code: FailureModeCode }[];

export const PRODUCT_TYPES: ProductType[] = ["L", "M", "H"];

export function failureMode(code: string): FailureModeOutcome {
  const key = (Object.keys(FAILURE_MODES) as FailureModeCode[]).includes(code as FailureModeCode)
    ? (code as FailureModeCode)
    : "NONE";
  return { code: FAILURE_MODES[key].code, name: FAILURE_MODES[key].name };
}

/* ---- risk mapping -------------------------------------------------- */

export function healthFromProbability(p: number): HealthStatus {
  if (p >= 0.8) return "Critical";
  if (p >= 0.6) return "High Risk";
  if (p >= 0.35) return "Warning";
  return "Normal";
}

export function riskFromProbability(p: number): RiskLevel {
  if (p >= 0.8) return "Critical";
  if (p >= 0.6) return "High";
  if (p >= 0.35) return "Medium";
  return "Low";
}

export function severityFromProbability(p: number): Severity {
  if (p >= 0.8) return "Critical";
  if (p >= 0.6) return "High";
  return "Warning";
}

export function priorityFromProbability(p: number): Severity | "Routine" {
  if (p >= 0.8) return "Critical";
  if (p >= 0.6) return "High";
  if (p >= 0.35) return "Warning";
  return "Routine";
}

export function probabilityFromStatus(status: HealthStatus): number {
  switch (status) {
    case "Critical":
      return 0.85;
    case "High Risk":
      return 0.7;
    case "Warning":
      return 0.45;
    default:
      return 0.12;
  }
}

/* ---- persistence of failure modes -------------------------------- */

export function flattenModes(modes: FailureModeOutcome[]): FailureModeOutcome[] {
  return modes
    .filter((m) => m.code !== "NONE")
    .sort((a, b) => (b.probability ?? b.confidence ?? 0) - (a.probability ?? a.confidence ?? 0));
}