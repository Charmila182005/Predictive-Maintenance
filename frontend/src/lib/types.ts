export type Source = "live" | "simulated" | "fastapi" | "gradio";

export type HealthStatus = "Normal" | "Warning" | "High Risk" | "Critical";
export type RiskLevel = "Low" | "Medium" | "High" | "Critical";
export type Severity = "Warning" | "High" | "Critical";

export type FailureModeCode = "TWF" | "HDF" | "PWF" | "OSF" | "RNF" | "NONE";

export type ProductType = "L" | "M" | "H";

export interface AssessInput {
  productType: ProductType;
  airTemp: number;
  processTemp: number;
  speed: number;
  torque: number;
  toolWear: number;
  machineId: string;
  state: "RUNNING" | "IDLE";
}

export interface DerivedParams {
  tempDifference: number;
  mechanicalPower: number;
  overstrain: number;
}

export interface ContributingFeature {
  key: string;
  label: string;
  value: number;
  unit?: string;
  magnitude: number;
  direction: "increases" | "decreases";
}

export interface FailureModeOutcome {
  code: FailureModeCode;
  name: string;
  confidence?: number;
  probability?: number;
  scoreKind?: string;
  note?: string;
}

export interface Assessment {
  id: string;
  ts: string;
  source: Source;
  inputs: AssessInput;
  derived: DerivedParams;
  failureProbability: number;
  threshold: number;
  healthStatus: HealthStatus;
  riskLevel: RiskLevel;
  mode: FailureModeOutcome;
  modes: FailureModeOutcome[];
  anomalyPercentile?: number;
  contributing: ContributingFeature[];
  evidence: string[];
  explanation: string;
  recommendation: string;
  priority: Severity | "Routine";
  modelVersion?: string;
  latencyMs?: number;
  notice?: string;
}

export type AlertStatus = "Open" | "Acknowledged" | "Resolved";

export interface Alert {
  id: string;
  machineId: string;
  ts: string;
  severity: Severity;
  failureProbability: number;
  riskLevel: RiskLevel;
  modeCode: FailureModeCode;
  modeName: string;
  evidence: string[];
  recommendation: string;
  status: AlertStatus;
  assessmentId: string;
}

export interface Notification {
  id: string;
  ts: string;
  kind: "alert" | "system";
  severity?: Severity;
  title: string;
  body: string;
  read: boolean;
}