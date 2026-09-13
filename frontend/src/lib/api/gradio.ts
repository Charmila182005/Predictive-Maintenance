import type { AssessInput, FailureModeCode, FailureModeOutcome } from "@/lib/types";
import { parsePercent } from "@/lib/derived";

export class LiveError extends Error {
  title?: string;
  constructor(message: string, title?: string) {
    super(message);
    this.name = "LiveError";
    this.title = title;
  }
}

export interface GradioLiveData {
  failureProbability?: number;
  healthStatus?: string;
  predictedClass?: string;
  riskLevel?: string;
  urgency?: string;
  decisionThreshold?: number;
  anomalyPercentile?: number;
  anomalyScore?: string;
  modes: FailureModeOutcome[];
  contributing: { key: string; label: string; value: number; magnitude: number; direction: "increases" | "decreases" }[];
  evidence: string[];
  explanation: string;
  recommendation: string;
  modelVersion?: string;
  predictionId?: string;
  predictionTimestamp?: string;
  latencyMs?: number;
  notice?: string;
}

const FEATURE_LABELS: Record<string, string> = {
  product_type: "Product type",
  air_temperature: "Air temperature",
  process_temperature: "Process temperature",
  rotational_speed: "Rotational speed",
  torque: "Torque",
  tool_wear: "Tool wear",
  machine_id: "Machine id",
  machine_state: "Machine state",
  air_temp: "Air temperature",
  process_temp: "Process temperature",
  speed: "Rotational speed",
  toolWear: "Tool wear",
};

const MODE_CODES: Record<string, FailureModeCode> = {
  TWF: "TWF",
  HDF: "HDF",
  PWF: "PWF",
  OSF: "OSF",
  RNF: "RNF",
};

export async function postAssess(base: string, input: AssessInput): Promise<string> {
  const res = await fetch(`${base}/gradio_api/call/assess`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      data: [
        input.productType,
        input.airTemp,
        input.processTemp,
        input.speed,
        input.torque,
        input.toolWear,
        input.machineId,
        input.state,
      ],
    }),
  });
  if (!res.ok) throw new LiveError(`Backend responded ${res.status}`, "Backend error");
  const body = await res.json().catch(() => null);
  if (!body?.event_id) throw new LiveError("No event id returned", "Backend error");
  return body.event_id;
}

export async function streamAssess(base: string, eventId: string): Promise<unknown[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const res = await fetch(`${base}/gradio_api/call/assess/${eventId}`, {
      headers: { Accept: "text/event-stream" },
      signal: ctrl.signal,
    });
    if (!res.ok) throw new LiveError(`Backend responded ${res.status}`, "Backend error");
    const text = await res.text();
    const events: { ev: string; data: string }[] = [];
    for (const raw of text.split(/\r?\n\r?\n|\r?\n\n/)) {
      if (!raw.trim()) continue;
      const ev = raw.match(/^event:\s*(\S+)/m)?.[1] ?? "message";
      const data = [...raw.matchAll(/^data:\s?(.*)$/gm)].map((m) => m[1]).join("\n");
      events.push({ ev, data });
    }
    for (const e of events) {
      if (e.ev === "error") {
        try {
          const err = JSON.parse(e.data);
          throw new LiveError(err.error ?? "Backend rejected the request", err.title ?? "Backend error");
        } catch (parsed) {
          if (parsed instanceof LiveError) throw parsed;
          throw new LiveError(e.data.slice(0, 200), "Backend error");
        }
      }
      if (e.ev === "complete") {
        try {
          const parsed = JSON.parse(e.data);
          if (Array.isArray(parsed)) return parsed;
        } catch {
          /* fall through */
        }
        throw new LiveError("Malformed result from backend", "Backend error");
      }
    }
    throw new LiveError("Backend closed the stream without a result", "Backend timeout");
  } finally {
    clearTimeout(timer);
  }
}

/* Defensive mapping of the raw Gradio outputs array into typed data. */
export function parseGradioOutputs(input: AssessInput, outputs: unknown[]): GradioLiveData {
  const obj = outputs[outputs.length - 1];
  const full = obj && typeof obj === "object" ? (obj as Record<string, unknown>) : null;

  const failureProbability = full ? parsePercent(full.failure_probability as string | number) : parsePercent(outputs[0] as string);
  const predictedClass = full
    ? ((full.predicted_class as string) ?? (full.predictedClass as string) ?? undefined)
    : (outputs[3] as string | undefined);

  const healthStatus = full
    ? ((full.health_status as string) ?? (full.healthStatus as string) ?? undefined)
    : (outputs[1] as string | undefined);

  const recommendation = (full?.recommended_maintenance_action as string) ?? (outputs[4] as string | undefined) ?? "";

  const threshold = typeof full?.decision_threshold === "number" ? (full.decision_threshold as number) : 0.5;

  const modes = parseModes(full);
  const primary = modes.find((m) => m.code !== "NONE") ?? modes[0];
  const primaryCode = primary?.code ?? resolveModeCode(predictedClass);

  const contributing = parseContributing(full, input);
  const evidence = parseEvidence(full);
  const explanation =
    (full?.explanation as string) ??
    (full?.decision_support_notice as string) ??
    assembleExplanation(healthStatus, primaryCode, contributing);

  const notice = full?.decision_support_notice as string | undefined;

  const latency = typeof full?.latency_ms === "number" ? (full.latency_ms as number) : typeof full?.latency_ms === "string" ? Number.parseFloat(full.latency_ms) : undefined;

  const anomalyPercentile = full
    ? typeof full.anomaly_percentile === "number"
      ? (full.anomaly_percentile as number)
      : typeof full.anomaly_percentile === "string"
        ? parsePercent(full.anomaly_percentile)
        : undefined
    : undefined;

  return {
    failureProbability,
    healthStatus,
    predictedClass,
    riskLevel: full?.risk_level as string | undefined,
    urgency: full?.urgency as string | undefined,
    decisionThreshold: threshold,
    anomalyPercentile:
      anomalyPercentile !== undefined && anomalyPercentile <= 1 ? anomalyPercentile * 100 : anomalyPercentile,
    anomalyScore: full?.anomaly_score as string | undefined,
    modes,
    contributing,
    evidence,
    explanation,
    recommendation,
    modelVersion: full?.model_version as string | undefined,
    predictionId: full?.prediction_id as string | undefined,
    predictionTimestamp: full?.prediction_timestamp as string | undefined,
    latencyMs: latency,
    notice,
  };
}

function resolveModeCode(klass?: string): FailureModeCode {
  if (!klass) return "NONE";
  const norm = klass.trim().toUpperCase();
  if (norm === "NO FAILURE" || norm === "NONE" || norm === "NO_FAILURE") return "NONE";
  if (MODE_CODES[norm]) return MODE_CODES[norm];
  return "NONE";
}

function parseModes(full: Record<string, unknown> | null): FailureModeOutcome[] {
  const source = full?.likely_failure_modes;
  const out: FailureModeOutcome[] = [];
  if (Array.isArray(source)) {
    source.forEach((m) => {
      if (!m || typeof m !== "object") return;
      const rec = m as Record<string, unknown>;
      const code = String(rec.code ?? rec.mode ?? "").toUpperCase();
      if (MODE_CODES[code]) {
        out.push({
          code: MODE_CODES[code],
          name: String(rec.name ?? failureName(code)),
          probability: parsePercent(rec.probability as string | number) ?? (typeof rec.probability === "number" ? rec.probability : undefined),
          confidence: typeof rec.score === "number" || typeof rec.score === "string" ? parsePercent(rec.score) : undefined,
          scoreKind: rec.score_kind as string | undefined,
          note: rec.note as string | undefined,
        });
      } else if (typeof rec.name === "string") {
        const code = resolveCodeFromName(rec.name);
        out.push({
          code,
          name: String(rec.name),
          probability: parsePercent(rec.probability as string | number) ?? (typeof rec.probability === "number" ? rec.probability : undefined),
          note: typeof rec.note === "string" ? rec.note : undefined,
        });
      }
    });
  }
  if (full?.predicted_class) {
    const pc = String(full.predicted_class);
    const code = resolveModeCode(pc);
    if (code !== "NONE" && !out.some((m) => m.code === code)) {
      out.unshift({ code, name: failureName(code), confidence: 1 });
    }
  }
  if (!out.length) {
    const code = resolveModeCode(full?.predicted_class as string | undefined);
    out.push({ code, name: failureName(code) });
  }
  return out.sort((a, b) => (b.probability ?? b.confidence ?? 0) - (a.probability ?? a.confidence ?? 0));
}

const FAILURE_NAME: Record<string, string> = {
  TWF: "Tool Wear Failure",
  HDF: "Heat Dissipation Failure",
  PWF: "Power Failure",
  OSF: "Overstrain Failure",
  RNF: "Random Failure",
};

function failureName(code: FailureModeCode | string): string {
  return FAILURE_NAME[code] ?? "Nominal condition";
}

function resolveCodeFromName(name: string): FailureModeCode {
  const map: [FailureModeCode, RegExp][] = [
    ["TWF", /tool wear/i],
    ["HDF", /heat dissipation/i],
    ["PWF", /power/i],
    ["OSF", /overstrain/i],
    ["RNF", /random/i],
  ];
  for (const [code, re] of map) if (re.test(name)) return code;
  return "NONE";
}

function parseContributing(full: Record<string, unknown> | null, input: AssessInput) {
  const src = full?.contributing_features;
  const inputValues: Record<string, number> = {
    product_type: input.productType === "L" ? 0 : input.productType === "M" ? 1 : 2,
    air_temperature: input.airTemp,
    air_temp: input.airTemp,
    process_temperature: input.processTemp,
    process_temp: input.processTemp,
    rotational_speed: input.speed,
    speed: input.speed,
    torque: input.torque,
    tool_wear: input.toolWear,
    toolWear: input.toolWear,
  };
  const out: { key: string; label: string; value: number; magnitude: number; direction: "increases" | "decreases" }[] = [];
  if (Array.isArray(src)) {
    for (const item of src) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const rawKey = String(rec.feature ?? rec.key ?? rec.name ?? "").toLowerCase().trim();
      const key = rawKey.replace(/\s+/g, "_");
      const magnitude = typeof rec.magnitude === "number" ? Math.abs(rec.magnitude) : typeof rec.contribution === "number" ? Math.abs(rec.contribution) : typeof rec.shap === "number" ? Math.abs(rec.shap) : 0;
      const sign = typeof rec.sign === "number" ? rec.sign : typeof rec.direction === "number" ? rec.direction : 1;
      const value = typeof rec.value === "number" ? rec.value : inputValues[key] ?? 0;
      const label = FEATURE_LABELS[key] ?? String((rec.label ?? rawKey) || key).toUpperCase().replace(/_/g, " ");
      out.push({ key, label, value, magnitude, direction: sign >= 0 ? "increases" : "decreases" });
    }
  }
  return out.slice(0, 8);
}

function parseEvidence(full: Record<string, unknown> | null): string[] {
  const src = full?.condition_evidence;
  if (Array.isArray(src)) {
    const out: string[] = [];
    for (const item of src) {
      if (typeof item === "string") out.push(item);
      else if (item && typeof item === "object") {
        const rec = item as Record<string, unknown>;
        out.push(String(rec.text ?? rec.evidence ?? rec.condition ?? ""));
      }
    }
    return out.map((s) => s.trim()).filter(Boolean);
  }
  if (typeof src === "string") {
    return src
      .split(/\n|;/)
      .map((s) => s.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function assembleExplanation(status: string | undefined, code: FailureModeCode, contributing: GradioLiveData["contributing"]): string {
  void status;
  if (contributing.length) {
    const top = contributing[0];
    const verb = top.direction === "increases" ? "Elevated" : "Suppressed";
    return `${verb} ${top.label} is the dominant shift, reinforcing the ${code === "NONE" ? "nominal" : failureName(code)} assessment. ${top.label} contributes most strongly to the current risk posture.`;
  }
  return `The dominant signal is ${failureName(code)} under current operating conditions; no single parameter dominates the decision boundary.`;
}