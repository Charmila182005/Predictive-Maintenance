import type {
  AssessInput,
  Assessment,
  FailureModeCode,
  ContributingFeature,
} from "@/lib/types";

import { derive, round, uid } from "@/lib/derived";
import {
  healthFromProbability,
  riskFromProbability,
  priorityFromProbability,
  FAILURE_MODES,
} from "@/lib/domain";

import { simulateAssessment } from "@/lib/api/fallback";
import { api } from "@/lib/api/client";

export type ConnectionStatus =
  | "checking"
  | "live"
  | "simulated"
  | "offline";

export interface Connection {
  status: ConnectionStatus;
  message?: string;
}

export interface RunResult {
  assessment: Assessment;
  connection: Connection;
}

/**
 * Check whether the FastAPI backend is available.
 */
export async function probeConnection(): Promise<Connection> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(`${api["baseUrl"]}/health`, {
      signal: ctrl.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      return {
        status: "offline",
        message: `Backend responded ${res.status}`,
      };
    }

    return {
      status: "live",
      message: `Connected to ${api["baseUrl"]}`,
    };
  } catch (e) {
    return {
      status: "offline",
      message:
        e instanceof Error && e.name === "AbortError"
          ? "Backend unreachable (timeout)"
          : "Backend unreachable",
    };
  }
}

/**
 * Main prediction flow.
 *
 * FastAPI is the primary prediction engine.
 * Gradio and simulation are only fallbacks.
 */
export async function runAssessment(
  input: AssessInput
): Promise<RunResult> {
  const baseUrl = api["baseUrl"];

  // ---------------------------------------------------------
  // 1. PRIMARY: FastAPI backend
  // ---------------------------------------------------------
  try {
    const response = await api.predict(input);

    console.log("FastAPI prediction response:", response);

    return {
      assessment: normalizeBackendAssessment(input, response),
      connection: {
        status: "live",
        message: `Connected to ${baseUrl} (FastAPI)`,
      },
    };
  } catch (fastApiError) {
    console.warn(
      "FastAPI prediction failed, trying Gradio:",
      fastApiError
    );
  }

  // ---------------------------------------------------------
  // 2. FALLBACK: Gradio
  // ---------------------------------------------------------
  try {
    const eventId = await postAssess(baseUrl, input);
    const outputs = await streamAssess(baseUrl, eventId);
    const data = parseGradioOutputs(outputs);

    return {
      assessment: buildAssessment(input, data, "live"),
      connection: {
        status: "live",
        message: `Connected to Gradio fallback`,
      },
    };
  } catch (gradioError) {
    console.warn(
      "Gradio prediction failed, using simulated:",
      gradioError
    );
  }

  // ---------------------------------------------------------
  // 3. FINAL FALLBACK: Simulated engine
  // ---------------------------------------------------------
  const sim = simulateAssessment(input);

  return {
    assessment: buildAssessment(
      input,
      simDataToGradio(sim),
      "simulated"
    ),
    connection: {
      status: "simulated",
      message: "Using simulated engine — backend unavailable",
    },
  };
}

/**
 * Convert the actual FastAPI snake_case response
 * into the frontend Assessment structure.
 */
function normalizeBackendAssessment(
  input: AssessInput,
  data: any
): Assessment {
  const probability = round(
    Math.max(
      0,
      Math.min(1, Number(data.failure_probability ?? 0))
    ),
    4
  );

  const healthStatus = normalizeHealth(
    data.health_status,
    probability
  );

  const riskLevel = normalizeRisk(
    data.risk_level,
    probability
  );

  // Backend provides the primary failure mode directly.
  const primaryCode = (
    data.failure_mode ?? "NONE"
  ) as FailureModeCode;

  const primaryName =
    data.failure_mode_name ??
    FAILURE_MODES[primaryCode]?.name ??
    FAILURE_MODES.NONE.name;

  const mode: Assessment["mode"] = {
    code: primaryCode,
    name: primaryName,
    probability:
      primaryCode === "NONE"
        ? undefined
        : probability,
    confidence:
      data.failure_mode_confidence ??
      undefined,
    note:
      data.failure_mode_note ??
      undefined,
  };

  // Convert backend failure_modes array.
  const modes: Assessment["modes"] =
    Array.isArray(data.failure_modes)
      ? data.failure_modes.map((m: any) => ({
          code: (m.mode_code ?? "NONE") as FailureModeCode,
          name:
            m.mode_name ??
            FAILURE_MODES[
              (m.mode_code ?? "NONE") as FailureModeCode
            ]?.name ??
            "Unknown",
          probability: m.probability,
          confidence: m.confidence,
          note: m.note,
        }))
      : primaryCode !== "NONE"
        ? [mode]
        : [
            {
              code: "NONE",
              name: FAILURE_MODES.NONE.name,
            },
          ];

  // Backend condition evidence.
  const evidence: string[] = Array.isArray(
    data.condition_evidence
  )
    ? data.condition_evidence.map((e: any) => {
        if (typeof e === "string") return e;

        if (e?.description) return e.description;

        if (e?.message) return e.message;

        if (e?.condition) {
          return `${e.condition}${
            e.measured !== undefined
              ? ` — measured: ${e.measured}`
              : ""
          }`;
        }

        return JSON.stringify(e);
      })
    : [];

  // Backend contributing features.
  const contributing: ContributingFeature[] =
    Array.isArray(data.contributing_features)
      ? data.contributing_features.map((f: any) => ({
          key: f.key ?? f.feature ?? "unknown",
          label:
            f.label ??
            f.feature_name ??
            f.key ??
            "Feature",
          value: Number(f.value ?? 0),
          unit: f.unit,
          magnitude: Number(f.magnitude ?? 0),
          direction:
            f.direction === "decreases"
              ? "decreases"
              : "increases",
        }))
      : [];

  const explanation =
    data.ai_explanation ??
    data.explanation ??
    buildExplanation(
      probability,
      riskLevel,
      primaryName,
      evidence
    );

  const recommendation =
    data.maintenance_recommendation ??
    data.recommended_action ??
    data.recommended_maintenance_action ??
    getRecommendation(primaryCode);

  return {
    id: data.prediction_id ?? uid("asmt"),
    ts:
      data.timestamp ??
      new Date().toISOString(),

    source: "live",

    inputs: {
      ...input,
    },

    derived: derive(input),

    failureProbability: probability,

    threshold: Number(
      data.decision_threshold ?? 0.5
    ),

    healthStatus,

    riskLevel,

    mode,

    modes,

    anomalyPercentile:
      data.anomaly_percentile !== undefined
        ? Number(data.anomaly_percentile)
        : undefined,

    contributing,

    evidence,

    explanation,

    recommendation,

    priority:
      data.urgency === "Immediate" ||
      data.urgency === "Urgent"
        ? "Critical"
        : priorityFromProbability(probability),

    modelVersion:
      data.model_version,

    latencyMs:
      data.latency_ms !== undefined
        ? Number(data.latency_ms)
        : undefined,

    notice:
      data.decision_support_notice,
  };
}

/**
 * Normalize health labels from backend.
 */
function normalizeHealth(
  value: string | undefined,
  probability: number
): Assessment["healthStatus"] {
  if (!value) {
    return healthFromProbability(probability);
  }

  const norm = value.trim().toLowerCase();

  if (norm.includes("critic")) return "Critical";

  if (
    norm.includes("high") ||
    norm.includes("elevated")
  ) {
    return "High Risk";
  }

  if (
    norm.includes("warn") ||
    norm.includes("moderate") ||
    norm.includes("medium")
  ) {
    return "Warning";
  }

  if (
    norm.includes("normal") ||
    norm.includes("healthy") ||
    norm.includes("ok")
  ) {
    return "Normal";
  }

  return healthFromProbability(probability);
}

/**
 * Normalize risk labels from backend.
 */
function normalizeRisk(
  value: string | undefined,
  probability: number
): Assessment["riskLevel"] {
  if (!value) {
    return riskFromProbability(probability);
  }

  const norm = value.trim().toLowerCase();

  if (norm.includes("critic")) return "Critical";
  if (norm.includes("high")) return "High";
  if (norm.includes("medium")) return "Medium";
  if (norm.includes("low")) return "Low";

  return riskFromProbability(probability);
}

/**
 * Human-readable fallback explanation.
 */
function buildExplanation(
  probability: number,
  risk: string,
  modeName: string,
  evidence: string[]
): string {
  const pct = (probability * 100).toFixed(1);

  if (modeName === FAILURE_MODES.NONE.name) {
    return `The model predicts a ${pct}% failure probability with ${risk} risk. No dominant failure mode was identified.`;
  }

  return `The model predicts a ${pct}% failure probability with ${risk} risk, indicating ${modeName} as the likely failure mode. ${
    evidence.length
      ? `Supporting evidence: ${evidence[0]}`
      : ""
  }`;
}

/**
 * Maintenance recommendation fallback.
 */
function getRecommendation(
  code: FailureModeCode
): string {
  return (
    FAILURE_MODES[code]?.action ??
    FAILURE_MODES.NONE.action
  );
}

/**
 * Convert simulation output into common format.
 */
function simDataToGradio(
  sim: ReturnType<typeof simulateAssessment>
) {
  return {
    failureProbability: sim.failureProbability,
    healthStatus: sim.healthStatus,
    riskLevel: sim.riskLevel,
    modes: sim.modes,
    contributing: sim.contributing,
    evidence: sim.evidence,
    explanation: sim.explanation,
    recommendation: sim.recommendation,
    decisionThreshold: sim.threshold,
    anomalyPercentile: sim.anomalyPercentile,
    modelVersion: sim.modelVersion,
    latencyMs: sim.latencyMs,
    notice: sim.notice,
  };
}

/**
 * Build an Assessment for Gradio/simulation fallback.
 */
function buildAssessment(
  input: AssessInput,
  data: any,
  source: "live" | "simulated"
): Assessment {
  const probability = round(
    Math.max(
      0,
      Math.min(1, Number(data.failureProbability ?? 0))
    ),
    4
  );

  const healthStatus = normalizeHealth(
    data.healthStatus,
    probability
  );

  const riskLevel = normalizeRisk(
    data.riskLevel,
    probability
  );

  const modes: Assessment["modes"] =
    Array.isArray(data.modes)
      ? data.modes
      : [];

  const primary =
    modes.find(
      (m: any) => m.code !== "NONE"
    ) ?? modes[0];

  const modeCode = (
    primary?.code ?? "NONE"
  ) as FailureModeCode;

  const modeName =
    primary?.name ??
    FAILURE_MODES.NONE.name;

  const evidence: string[] =
    Array.isArray(data.evidence)
      ? data.evidence
      : [];

  return {
    id: uid("asmt"),
    ts: new Date().toISOString(),
    source,
    inputs: { ...input },
    derived: derive(input),

    failureProbability: probability,

    threshold:
      Number(data.decisionThreshold ?? 0.5),

    healthStatus,

    riskLevel,

    mode: {
      code: modeCode,
      name: modeName,
      probability: primary?.probability,
      confidence: primary?.confidence,
      note: primary?.note,
    },

    modes,

    anomalyPercentile:
      data.anomalyPercentile,

    contributing:
      Array.isArray(data.contributing)
        ? data.contributing
        : [],

    evidence,

    explanation:
      data.explanation ??
      "No additional explanation available.",

    recommendation:
      data.recommendation ??
      getRecommendation(modeCode),

    priority:
      priorityFromProbability(probability),

    modelVersion:
      data.modelVersion,

    latencyMs:
      data.latencyMs,

    notice:
      data.notice,
  };
}

// ---------------------------------------------------------
// Gradio fallback
// ---------------------------------------------------------

const GRADIO_API_URL =
  "https://vvsgyuv123-predictive-maintenance-demo.hf.space/gradio_api";

async function postAssess(
  _base: string,
  input: AssessInput
): Promise<string> {
  const res = await fetch(
    `${GRADIO_API_URL}/call/assess`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: [
          input.productType,
          input.airTemp,
          input.processTemp,
          input.speed,
          input.torque,
          input.toolWear,
          input.machineId || "UNKNOWN",
          input.state || "RUNNING",
        ],
      }),
    }
  );

  if (!res.ok) {
    throw new Error(
      `Gradio call failed: ${res.status}`
    );
  }

  const json = await res.json();

  if (!json.event_id) {
    throw new Error(
      "No event_id from Gradio"
    );
  }

  return json.event_id;
}

async function streamAssess(
  _base: string,
  eventId: string
): Promise<any[]> {
  const res = await fetch(
    `${GRADIO_API_URL}/call/assess/${eventId}`,
    {
      headers: {
        Accept: "text/event-stream",
      },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Gradio stream failed: ${res.status}`
    );
  }

  const reader = res.body?.getReader();

  if (!reader) {
    throw new Error(
      "No response body"
    );
  }

  const decoder = new TextDecoder();

  const outputs: any[] = [];

  let buffer = "";

  while (true) {
    const { done, value } =
      await reader.read();

    if (done) break;

    buffer += decoder.decode(
      value,
      { stream: true }
    );

    const lines =
      buffer.split("\n");

    buffer =
      lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) {
        continue;
      }

      try {
        const parsed =
          JSON.parse(
            line.slice(6)
          );

        if (
          parsed.msg ===
          "process_completed"
        ) {
          outputs.push(
            ...(parsed.output?.data ?? [])
          );
        }
      } catch {
        // Ignore malformed SSE lines.
      }
    }
  }

  return outputs;
}

function parseGradioOutputs(
  outputs: any[]
) {
  if (!outputs.length) {
    throw new Error(
      "No outputs from Gradio"
    );
  }

  const data = outputs[0];

  return {
    failureProbability:
      data.failure_probability,

    healthStatus:
      data.health_status,

    riskLevel:
      data.risk_level,

    modes:
      data.failure_modes?.map(
        (m: any) => ({
          code: m.mode_code,
          name: m.mode_name,
          probability: m.probability,
          confidence: m.confidence,
          note: m.note,
        })
      ) ?? [],

    contributing:
      data.contributing_features ?? [],

    evidence:
      data.condition_evidence ?? [],

    explanation:
      data.explanation,

    recommendation:
      data.recommended_maintenance_action,

    decisionThreshold:
      data.decision_threshold,

    anomalyPercentile:
      data.anomaly_percentile,

    modelVersion:
      data.model_version,

    latencyMs:
      data.latency_ms,

    notice:
      data.decision_support_notice,
  };
}