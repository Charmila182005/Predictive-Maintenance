import type { Assessment, HealthStatus, RiskLevel } from "@/lib/types";

export interface MachineSummary {
  machineId: string;
  latest: Assessment;
  count: number;
  firstTs: string;
  lastTs: string;
  trend: Assessment[];
}

export function machineSummaries(assessments: Assessment[]): MachineSummary[] {
  const byMachine = new Map<string, Assessment[]>();
  for (const a of assessments) {
    const list = byMachine.get(a.inputs.machineId) ?? [];
    list.push(a);
    byMachine.set(a.inputs.machineId, list);
  }
  const out: MachineSummary[] = [];
  for (const [machineId, list] of byMachine) {
    const byTs = [...list].sort((a, b) => a.ts.localeCompare(b.ts));
    out.push({
      machineId,
      latest: byTs[byTs.length - 1],
      count: list.length,
      firstTs: byTs[0].ts,
      lastTs: byTs[byTs.length - 1].ts,
      trend: byTs,
    });
  }
  return out.sort((a, b) => b.latest.ts.localeCompare(a.latest.ts));
}

export function countByHealth(assessments: Assessment[]): Record<HealthStatus, number> {
  const out: Record<HealthStatus, number> = { Normal: 0, Warning: 0, "High Risk": 0, Critical: 0 };
  for (const a of assessments) out[a.healthStatus] = (out[a.healthStatus] ?? 0) + 1;
  return out;
}

export function countByRisk(assessments: Assessment[]): Record<RiskLevel, number> {
  const out: Record<RiskLevel, number> = { Low: 0, Medium: 0, High: 0, Critical: 0 };
  for (const a of assessments) out[a.riskLevel] = (out[a.riskLevel] ?? 0) + 1;
  return out;
}

export function trendSeries(assessments: Assessment[]): { ts: string; probability: number }[] {
  return [...assessments]
    .sort((a, b) => a.ts.localeCompare(b.ts))
    .map((a) => ({ ts: a.ts, probability: a.failureProbability }));
}

export function meanProbability(assessments: Assessment[]): number {
  if (!assessments.length) return 0;
  return assessments.reduce((acc, a) => acc + a.failureProbability, 0) / assessments.length;
}

export function atRisk(assessments: Assessment[], threshold: number): Assessment[] {
  return assessments.filter((a) => a.failureProbability >= threshold);
}