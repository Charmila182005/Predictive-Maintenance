import { derive, round, uid } from "@/lib/derived";
import { healthFromProbability, riskFromProbability, priorityFromProbability, FAILURE_MODES, } from "@/lib/domain";
import { simulateAssessment } from "@/lib/api/fallback";
import { api } from "@/lib/api/client";
export async function probeConnection() {
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
    }
    catch (e) {
        return {
            status: "offline",
            message: e instanceof Error && e.name === "AbortError"
                ? "Backend unreachable (timeout)"
                : "Backend unreachable",
        };
    }
}
export async function runAssessment(input) {
    const baseUrl = api["baseUrl"];
    // ============================================================
    // 1. TRY FASTAPI BACKEND FIRST
    // ============================================================
    try {
        const assessment = await api.predict(input);
        return {
            assessment: normalizeAssessment(assessment, input),
            connection: {
                status: "live",
                message: `Connected to ${baseUrl} (FastAPI)`,
            },
        };
    }
    catch (fastApiError) {
        console.warn("FastAPI prediction failed, trying Gradio:", fastApiError);
    }
    // ============================================================
    // 2. TRY GRADIO FALLBACK
    // ============================================================
    try {
        const eventId = await postAssess(baseUrl, input);
        const outputs = await streamAssess(baseUrl, eventId);
        const data = parseGradioOutputs(input, outputs);
        return {
            assessment: buildAssessment(input, data, "live"),
            connection: {
                status: "live",
                message: `Connected to ${baseUrl} (Gradio fallback)`,
            },
        };
    }
    catch (gradioError) {
        console.warn("Gradio prediction failed, using simulated:", gradioError);
    }
    // ============================================================
    // 3. FINAL FALLBACK: SIMULATED ENGINE
    // ============================================================
    const sim = simulateAssessment(input);
    return {
        assessment: buildAssessment(input, simDataToGradio(sim), "simulated"),
        connection: {
            status: "simulated",
            message: "Using simulated engine — backend unavailable",
        },
    };
}
// ============================================================
// SIMULATED DATA → COMMON FORMAT
// ============================================================
function simDataToGradio(sim) {
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
// ============================================================
// HEALTH NORMALIZATION
// ============================================================
function normalizeHealth(s, p) {
    if (!s) {
        return healthFromProbability(p);
    }
    const norm = s.trim().toLowerCase();
    if (norm.includes("critic")) {
        return "Critical";
    }
    if (norm.includes("high") ||
        norm.includes("elevated")) {
        return "High Risk";
    }
    if (norm.includes("warn") ||
        norm.includes("moderate") ||
        norm.includes("medium")) {
        return "Warning";
    }
    if (norm.includes("normal") ||
        norm.includes("healthy") ||
        norm.includes("ok")) {
        return "Normal";
    }
    return healthFromProbability(p);
}
// ============================================================
// FASTAPI RESPONSE → FRONTEND ASSESSMENT
// ============================================================
function normalizeAssessment(raw, originalInput) {
    // ------------------------------------------------------------
    // FAILURE PROBABILITY
    // ------------------------------------------------------------
    const failureProbability = Number(raw.failureProbability ??
        raw.failure_probability ??
        0);
    // ------------------------------------------------------------
    // INPUT VALUES
    // ------------------------------------------------------------
    const productType = (raw.inputs?.productType ??
        raw.product_type ??
        originalInput?.productType ??
        "L");
    const airTemp = Number(raw.inputs?.airTemp ??
        raw.air_temperature ??
        originalInput?.airTemp ??
        0);
    const processTemp = Number(raw.inputs?.processTemp ??
        raw.process_temperature ??
        originalInput?.processTemp ??
        0);
    const speed = Number(raw.inputs?.speed ??
        raw.rotational_speed ??
        originalInput?.speed ??
        0);
    const torque = Number(raw.inputs?.torque ??
        raw.torque ??
        originalInput?.torque ??
        0);
    const toolWear = Number(raw.inputs?.toolWear ??
        raw.tool_wear ??
        originalInput?.toolWear ??
        0);
    // ------------------------------------------------------------
    // FRONTEND INPUT OBJECT
    // ------------------------------------------------------------
    const inputs = {
        productType,
        airTemp,
        processTemp,
        speed,
        torque,
        toolWear,
        machineId: raw.inputs?.machineId ??
            raw.machine_id ??
            raw.machineId ??
            originalInput?.machineId ??
            "MM-0001",
        state: raw.inputs?.state ??
            raw.state ??
            originalInput?.state ??
            "RUNNING",
    };
    // ------------------------------------------------------------
    // DERIVED PARAMETERS
    // ------------------------------------------------------------
    const tempDifference = processTemp - airTemp;
    const mechanicalPower = (torque * speed * 2 * Math.PI) / 60;
    const overstrain = torque * toolWear;
    const derived = {
        tempDifference,
        mechanicalPower,
        overstrain,
    };
    // ------------------------------------------------------------
    // PRIMARY FAILURE MODE
    // ------------------------------------------------------------
    const modeCode = (raw.mode?.code ??
        raw.failure_mode ??
        raw.predicted_class ??
        "NONE");
    const modeName = raw.mode?.name ??
        raw.failure_mode_name ??
        FAILURE_MODES[modeCode]?.name ??
        "No dominant failure mode";
    const mode = {
        code: modeCode,
        name: modeName,
        confidence: typeof raw.mode?.confidence === "number"
            ? raw.mode.confidence
            : undefined,
        probability: typeof raw.mode?.probability === "number"
            ? raw.mode.probability
            : undefined,
        scoreKind: raw.mode?.scoreKind ??
            raw.mode?.score_kind ??
            undefined,
        note: raw.mode?.note ??
            undefined,
    };
    // ------------------------------------------------------------
    // FAILURE MODE LIST
    // ------------------------------------------------------------
    let modes = [];
    // Case 1:
    // Already in frontend format
    if (Array.isArray(raw.modes)) {
        modes = raw.modes.map((m) => ({
            code: (m.code ?? "NONE"),
            name: m.name ??
                "Unknown failure mode",
            confidence: typeof m.confidence === "number"
                ? m.confidence
                : undefined,
            probability: typeof m.probability === "number"
                ? m.probability
                : undefined,
            scoreKind: m.scoreKind ??
                m.score_kind ??
                undefined,
            note: m.note ??
                undefined,
        }));
    }
    // Case 2:
    // Backend likely_failure_modes
    else if (Array.isArray(raw.likely_failure_modes)) {
        modes =
            raw.likely_failure_modes.map((m) => ({
                code: (m.mode ?? "NONE"),
                name: m.name ??
                    FAILURE_MODES[m.mode]?.name ??
                    "Unknown failure mode",
                probability: typeof m.probability ===
                    "number"
                    ? m.probability
                    : undefined,
                confidence: typeof m.score === "number"
                    ? m.score
                    : undefined,
                scoreKind: m.score_kind ??
                    undefined,
                note: m.note ??
                    undefined,
            }));
    }
    // Case 3:
    // Backend failure_modes object
    else if (raw.failure_modes &&
        typeof raw.failure_modes ===
            "object") {
        modes = Object.entries(raw.failure_modes).map(([code, value]) => {
            const failureCode = code;
            return {
                code: failureCode,
                name: FAILURE_MODES[failureCode]?.name ?? code,
                probability: typeof value === "number"
                    ? value
                    : undefined,
            };
        });
    }
    // ------------------------------------------------------------
    // ENSURE PRIMARY MODE EXISTS
    // ------------------------------------------------------------
    if (!modes.some((m) => m.code === mode.code)) {
        modes.unshift(mode);
    }
    // ------------------------------------------------------------
    // HEALTHY MACHINE
    // ------------------------------------------------------------
    if (modes.length === 0) {
        modes = [
            {
                code: "NONE",
                name: "No dominant failure mode",
            },
        ];
    }
    // ------------------------------------------------------------
    // CONTRIBUTING FEATURES
    // ------------------------------------------------------------
    const contributing = Array.isArray(raw.contributing)
        ? raw.contributing
        : Array.isArray(raw.contributing_features)
            ? raw.contributing_features.map((f) => ({
                key: f.feature ??
                    f.key ??
                    "unknown",
                label: f.label ??
                    f.feature ??
                    "Unknown feature",
                value: Number(f.value ?? 0),
                magnitude: Number(f.magnitude ?? 0),
                direction: f.direction ===
                    "decreases"
                    ? "decreases"
                    : "increases",
            }))
            : [];
    // ------------------------------------------------------------
    // CONDITION EVIDENCE
    // ------------------------------------------------------------
    const evidence = Array.isArray(raw.evidence)
        ? raw.evidence
        : Array.isArray(raw.condition_evidence)
            ? raw.condition_evidence
            : [];
    // ------------------------------------------------------------
    // EXPLANATION
    // ------------------------------------------------------------
    const explanation = raw.ai_explanation ??
        raw.explanation ??
        "No explanation was returned.";
    // ------------------------------------------------------------
    // RECOMMENDATION
    // ------------------------------------------------------------
    const recommendation = raw.recommendation ??
        raw.maintenance_recommendation ??
        raw.recommended_maintenance_action ??
        raw.recommended_action ??
        "Review the machine condition and perform appropriate maintenance.";
    // ------------------------------------------------------------
    // RETURN FINAL FRONTEND OBJECT
    // ------------------------------------------------------------
    return {
        id: raw.id ??
            raw.prediction_id ??
            uid("asmt"),
        ts: raw.ts ??
            raw.timestamp ??
            raw.prediction_timestamp ??
            new Date().toISOString(),
        source: "live",
        inputs,
        derived,
        failureProbability,
        threshold: Number(raw.threshold ??
            raw.decision_threshold ??
            0.5),
        healthStatus: normalizeHealth(raw.healthStatus ??
            raw.health_status, failureProbability),
        riskLevel: raw.riskLevel ??
            raw.risk_level ??
            riskFromProbability(failureProbability),
        mode,
        modes,
        anomalyPercentile: raw.anomalyPercentile ??
            raw.anomaly_percentile,
        contributing,
        evidence,
        explanation,
        recommendation,
        priority: priorityFromProbability(failureProbability),
        modelVersion: raw.modelVersion ??
            raw.model_version,
        latencyMs: raw.latencyMs ??
            raw.latency_ms,
        notice: raw.notice ??
            raw.decision_support_notice,
    };
}
// ============================================================
// BUILD ASSESSMENT FOR GRADIO / SIMULATED DATA
// ============================================================
function buildAssessment(input, data, source) {
    const probability = round(Math.max(0, Math.min(1, data.failureProbability ?? 0)), 4);
    const healthStatus = normalizeHealth(data.healthStatus, probability);
    const riskLevel = data.riskLevel
        ? (data.riskLevel
            .trim()
            .toLowerCase()
            .includes("critic")
            ? "Critical"
            : data.riskLevel
                .trim()
                .toLowerCase()
                .includes("high")
                ? "High"
                : data.riskLevel
                    .trim()
                    .toLowerCase()
                    .includes("medium")
                    ? "Medium"
                    : data.riskLevel
                        .trim()
                        .toLowerCase()
                        .includes("low")
                        ? "Low"
                        : riskFromProbability(probability))
        : riskFromProbability(probability);
    const availableModes = Array.isArray(data.modes)
        ? data.modes
        : [];
    const primary = availableModes.find((m) => m.code !== "NONE");
    const modeCode = (primary?.code ??
        "NONE");
    const modeName = primary?.name ??
        FAILURE_MODES.NONE.name;
    const mode = {
        code: modeCode,
        name: modeName,
        probability: primary?.probability,
        confidence: primary?.confidence,
        note: primary?.note,
    };
    const getMode = (code) => FAILURE_MODES[code];
    const evidence = Array.isArray(data.evidence) &&
        data.evidence.length
        ? data.evidence
        : modeCode === "NONE"
            ? [
                "No condition evidence triggered — all monitored signals within bounds.",
            ]
            : [
                getMode(modeCode).indicator,
            ];
    const explanation = data.explanation ||
        (modeCode === "NONE"
            ? "No dominant degradation driver detected."
            : `Primary driver: ${evidence[0]}`);
    const recommendation = data.recommendation ||
        (modeCode === "NONE"
            ? getMode("NONE").action
            : getMode(modeCode).action);
    const priority = priorityFromProbability(probability);
    return {
        id: uid("asmt"),
        ts: new Date().toISOString(),
        source,
        inputs: {
            ...input,
        },
        derived: derive(input),
        failureProbability: probability,
        threshold: data.decisionThreshold ??
            0.5,
        healthStatus,
        riskLevel,
        mode,
        modes: availableModes,
        anomalyPercentile: data.anomalyPercentile,
        contributing: Array.isArray(data.contributing)
            ? data.contributing
            : [],
        evidence,
        explanation,
        recommendation,
        priority: priority,
        modelVersion: data.modelVersion,
        latencyMs: data.latencyMs,
        notice: data.notice,
    };
}
// ============================================================
// GRADIO FALLBACK
// ============================================================
const GRADIO_API_URL = "https://vvsgyuv123-predictive-maintenance-demo.hf.space/gradio_api";
// ============================================================
// POST GRADIO ASSESSMENT
// ============================================================
async function postAssess(base, input) {
    const res = await fetch(`${GRADIO_API_URL}/call/assess`, {
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
                input.machineId ||
                    "UNKNOWN",
                input.state ||
                    "RUNNING",
            ],
        }),
    });
    if (!res.ok) {
        throw new Error(`Gradio call failed: ${res.status}`);
    }
    const json = await res.json();
    const eventId = json.event_id;
    if (!eventId) {
        throw new Error("No event_id from Gradio");
    }
    return eventId;
}
// ============================================================
// STREAM GRADIO RESPONSE
// ============================================================
async function streamAssess(base, eventId) {
    const res = await fetch(`${GRADIO_API_URL}/call/assess/${eventId}`, {
        headers: {
            Accept: "text/event-stream",
        },
    });
    if (!res.ok) {
        throw new Error(`Gradio stream failed: ${res.status}`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
        throw new Error("No response body");
    }
    const decoder = new TextDecoder();
    const outputs = [];
    let buffer = "";
    while (true) {
        const { done, value, } = await reader.read();
        if (done) {
            break;
        }
        buffer += decoder.decode(value, {
            stream: true,
        });
        const lines = buffer.split("\n");
        buffer =
            lines.pop() || "";
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                try {
                    const parsed = JSON.parse(line.slice(6));
                    if (parsed.msg ===
                        "process_completed") {
                        outputs.push(...(parsed.output
                            ?.data ?? []));
                    }
                }
                catch {
                    // Ignore malformed SSE messages
                }
            }
        }
    }
    return outputs;
}
// ============================================================
// PARSE GRADIO OUTPUT
// ============================================================
function parseGradioOutputs(input, outputs) {
    if (!outputs.length) {
        throw new Error("No outputs from Gradio");
    }
    const data = outputs[0];
    return {
        failureProbability: data.failure_probability,
        healthStatus: data.health_status,
        riskLevel: data.risk_level,
        modes: data.failure_modes?.map((m) => ({
            code: m.mode_code,
            name: m.mode_name,
            probability: m.probability,
            confidence: m.confidence,
            note: m.note,
        })) ?? [],
        contributing: data.contributing_features ??
            [],
        evidence: data.condition_evidence ??
            [],
        explanation: data.explanation,
        recommendation: data.recommended_maintenance_action,
        decisionThreshold: data.decision_threshold,
        anomalyPercentile: data.anomaly_percentile,
        modelVersion: data.model_version,
        latencyMs: data.latency_ms,
        notice: data.decision_support_notice,
    };
}
