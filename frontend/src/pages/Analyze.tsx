import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BellRing,
  Check,
  FlaskConical,
  Gauge,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Siren,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/deck/PageHeader";
import { Panel } from "@/components/deck/Panel";
import { Button } from "@/components/deck/Button";
import { Badge } from "@/components/deck/Badge";
import { EmptyState } from "@/components/deck/EmptyState";
import { StatusDot } from "@/components/deck/StatusDot";
import { RiskGauge } from "@/components/instrument/RiskGauge";
import { FeatureBars } from "@/components/instrument/FeatureBars";
import { StatusBadge, toneForStatus } from "@/components/instrument/StatusBadge";
import { useAnalyze, DEFAULTS } from "@/hooks/use-analyze";
import { useAppStore } from "@/lib/store";
import { PRODUCT_TYPES, FAILURE_MODES } from "@/lib/domain";
import { derive, fmtNum, fmtPercent, fmtInt } from "@/lib/derived";
import type { AssessInput, ProductType } from "@/lib/types";
import { cn } from "@/lib/utils/cn";

const LABELS: Record<string, string> = {
  airTemp: "Air temperature",
  processTemp: "Process temperature",
  speed: "Rotational speed",
  torque: "Torque",
  toolWear: "Tool wear",
};

const UNITS: Record<string, string> = { airTemp: "K", processTemp: "K", speed: "rpm", torque: "Nm", toolWear: "min" };

type NumericKey = "airTemp" | "processTemp" | "speed" | "torque" | "toolWear";
const NUMERIC_KEYS: NumericKey[] = ["airTemp", "processTemp", "speed", "torque", "toolWear"];

function NumericField({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-ink-2">{label}</span>
        <span className="font-mono text-[10px] text-ink-3">{unit}</span>
      </div>
      <input
        id={id}
        inputMode="decimal"
        type="number"
        step="any"
        value={Number.isFinite(value) ? value : ""}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
        className="h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60"
      />
    </label>
  );
}

function DerivedGrid({ input }: { input: AssessInput }) {
  const d = derive(input);
  return (
    <div className="grid grid-cols-3 gap-3">
      {(
        [
          ["ΔT", "Temp diff", fmtNum(d.tempDifference, 1), "K"],
          ["P", "Mech power", fmtInt(d.mechanicalPower), "W"],
          ["TS", "Overstrain", fmtInt(d.overstrain), "W·min"],
        ] as const
      ).map(([sym, name, value, unit]) => (
        <div key={sym} className="rounded-lg border border-hairline bg-surface/50 px-2.5 py-2.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">{sym} · {name}</p>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-ink">
            {value} <span className="text-[10px] font-normal text-ink-3">{unit}</span>
          </p>
        </div>
      ))}
    </div>
  );
}

export function Analyze() {
  const { status, assessment, connection, run, reset } = useAnalyze();
  const createAlert = useAppStore((s) => s.createAlert);
  const alerts = useAppStore((s) => s.alerts);

  const [form, setForm] = useState<AssessInput>({ ...DEFAULTS });
  const [alertFiled, setAlertFiled] = useState(false);

  const running = status === "running";
  const hasAlert = useMemo(
    () => (assessment ? alerts.some((a) => a.assessmentId === assessment.id) : false),
    [alerts, assessment],
  );

  const set = <K extends keyof AssessInput>(key: K, value: AssessInput[K]) => setForm((f) => ({ ...f, [key]: value }));

  const canRun = useMemo(() => {
    return Object.values(form).every((v) => typeof v === "number" ? Number.isFinite(v) : true) && form.machineId.trim().length > 0;
  }, [form]);

  const handleRun = () => {
    setAlertFiled(false);
    void run({ ...form, machineId: form.machineId.trim() || DEFAULTS.machineId });
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        index="02 / Analyze Machine"
        title="Machine risk assessment"
        description="Feed current sensor readings and the model returns failure probability, likely failure mode, evidence, and a recommended maintenance action."
      />

      {!assessment && status === "idle" && (
        <div className="flex items-center gap-2 rounded-lg border border-hairline bg-overlay/50 px-4 py-2.5">
          <FlaskConical className="h-3.5 w-3.5 text-signal" strokeWidth={1.6} />
          <p className="text-[12px] text-ink-2">
            Live model first. If the shared backend is unreachable, results fall back to the <span className="text-ink">simulated engine</span> and are labeled as such.
          </p>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Panel title="Operating parameters" eyebrow="Step 1 · inputs" className="xl:col-span-2">
          <div className="space-y-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <span className="text-[11px] font-medium text-ink-2">Product type</span>
                <span className="font-mono text-[10px] text-ink-3">L · M · H</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {PRODUCT_TYPES.map((p) => (
                  <button
                    key={p}
                    onClick={() => set("productType", p as ProductType)}
                    className={cn(
                      "h-9 rounded-lg border font-mono text-xs font-semibold uppercase tracking-wider transition-colors",
                      form.productType === p
                        ? "border-signal/50 bg-signal-dim text-signal"
                        : "border-hairline bg-overlay/60 text-ink-3 hover:text-ink",
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {NUMERIC_KEYS.map((key) => (
                <NumericField
                  key={key}
                  id={key}
                  label={LABELS[key]}
                  unit={UNITS[key]}
                  value={form[key]}
                  onChange={(v) => set(key, v)}
                />
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11px] font-medium text-ink-2">Machine id</span>
                </div>
                <input
                  value={form.machineId}
                  onChange={(e) => set("machineId", e.target.value)}
                  placeholder="MM-0001"
                  className="h-9 w-full rounded-lg border border-hairline bg-overlay/70 px-3 font-mono text-sm tabular-nums text-ink outline-none transition-colors focus:border-signal/60"
                />
              </label>
              <div>
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="text-[11px] font-medium text-ink-2">State</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(["RUNNING", "IDLE"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => set("state", s)}
                      className={cn(
                        "h-9 rounded-lg border font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors",
                        form.state === s
                          ? "border-signal/50 bg-signal-dim text-signal"
                          : "border-hairline bg-overlay/60 text-ink-3 hover:text-ink",
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
              <Button variant="primary" icon={running ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} label={running ? "Assessing…" : "Run assessment"} onClick={handleRun} disabled={running || !canRun} />
              <Button variant="ghost" size="md" icon={<RotateCcw className="h-3.5 w-3.5" />} label="Reset" onClick={() => { setForm({ ...DEFAULTS }); reset(); }} disabled={running} />
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-4 xl:col-span-3">
          {status === "idle" && !assessment ? (
            <EmptyState
              icon={Gauge}
              eyebrow="Awaiting input"
              title="Set parameters and run"
              description="The result shows the failure probability gauge, risk level, likely failure mode with its confidence, derived parameters, supporting evidence, and the recommended maintenance action."
            />
          ) : running && !assessment ? (
            <Panel title="Running assessment" eyebrow="Live call">
              <div className="flex min-h-56 flex-col items-center justify-center gap-4 py-6">
                <Loader2 className="h-7 w-7 animate-spin text-signal" strokeWidth={1.6} />
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">Contacting the model</p>
                  <p className="mt-1 font-mono text-[11px] text-ink-3">POST /call/assess · SSE stream</p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-hairline bg-overlay/60 px-3 py-1.5">
                  <StatusDot tone="live" pulse size="sm" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-2">streaming</span>
                </div>
              </div>
            </Panel>
          ) : (
            assessment && (
              <AssessmentStage
                assessment={assessment}
                connectionMessage={connection?.message}
                alertFiled={alertFiled}
                hasAlert={hasAlert}
                onFileAlert={() => {
                  createAlert(assessment.id);
                  setAlertFiled(true);
                }}
              />
            )
          )}
        </div>
      </section>
    </div>
  );
}

function AssessmentStage({
  assessment,
  connectionMessage,
  alertFiled,
  hasAlert,
  onFileAlert,
}: {
  assessment: import("@/lib/types").Assessment;
  connectionMessage?: string;
  alertFiled: boolean;
  hasAlert: boolean;
  onFileAlert: () => void;
}) {
  const a = assessment;
  const alertTone = toneForStatus(a.riskLevel);

  return (
    <div className="flex flex-col gap-4">
      <Panel
        title="Assessment result"
        eyebrow="Step 2 · model output"
        right={
          <div className="flex items-center gap-2">
            <Badge tone={a.source === "live" ? "signal" : "elevated"}>{a.source === "live" ? "Live model" : "Simulated"}</Badge>
            <StatusDot tone={a.source === "live" ? "healthy" : "elevated"} pulse={a.source === "live"} size="sm" />
          </div>
        }
      >
        <div className="flex flex-col items-center gap-1 py-2 sm:flex-row sm:justify-around">
          <RiskGauge probability={a.failureProbability} size={210} />
          <div className="w-full max-w-60 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2">
              <span className="text-[11px] text-ink-2">Health status</span>
              <StatusBadge value={a.healthStatus} />
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2">
              <span className="text-[11px] text-ink-2">Risk level</span>
              <StatusBadge value={a.riskLevel} />
            </div>
            <div className="flex items-center justify-between gap-2 border-b border-hairline pb-2">
              <span className="text-[11px] text-ink-2">Priority</span>
              <StatusBadge value={a.priority} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-2">Decision threshold</span>
              <span className="font-mono text-xs tabular-nums text-ink">{fmtPercent(a.threshold)}</span>
            </div>
          </div>
        </div>
      </Panel>

      {connectionMessage && (
        <div className="flex items-center gap-2 rounded-lg border border-status-elevated/30 bg-status-elevated/8 px-3.5 py-2.5">
          <Siren className="h-3.5 w-3.5 shrink-0 text-status-elevated" strokeWidth={1.8} />
          <p className="text-[12px] leading-relaxed text-ink-2">
            <span className="font-medium text-ink">Fallback active.</span> {connectionMessage}
          </p>
        </div>
      )}

      {a.notice && (
        <div className="flex items-start gap-2 rounded-lg border border-hairline bg-overlay/50 px-3.5 py-2.5">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" strokeWidth={1.6} />
          <p className="text-[12px] leading-relaxed text-ink-2">{a.notice}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Likely failure mode" eyebrow="Predicted class">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 rounded-lg border border-hairline bg-surface/50 px-3.5 py-3">
              <span className="text-sm font-medium text-ink">{a.mode.name}</span>
              <Badge tone={a.mode.code === "NONE" ? "healthy" : alertTone}>{a.mode.code === "NONE" ? "Nominal" : a.mode.code}</Badge>
            </div>
            {a.mode.confidence !== undefined && (
              <p className="text-[11px] text-ink-3">Confidence {fmtPercent(a.mode.confidence)}</p>
            )}
            {a.modes.filter((m) => m.code !== "NONE").length > 1 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">Runner-up modes</p>
                {a.modes
                  .filter((m) => m.code !== "NONE" && m.code !== a.mode.code)
                  .slice(0, 3)
                  .map((m) => (
                    <div key={m.code} className="flex items-center justify-between text-[12px]">
                      <span className="text-ink-2">{m.name}</span>
                      <span className="font-mono tabular-nums text-ink-3">{m.probability !== undefined ? fmtPercent(m.probability) : m.confidence !== undefined ? fmtPercent(m.confidence) : ""}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Derived parameters" eyebrow="Computed">
          <div className="space-y-3">
            <DerivedGrid input={a.inputs} />
            <div className="rounded-lg border border-hairline bg-surface/40 px-3 py-2.5">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">Sensor values</p>
              <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums">
                <span className="text-ink-3">Product <span className="text-ink">{a.inputs.productType}</span></span>
                <span className="text-ink-3">Air <span className="text-ink">{fmtNum(a.inputs.airTemp, 1)} K</span></span>
                <span className="text-ink-3">Process <span className="text-ink">{fmtNum(a.inputs.processTemp, 1)} K</span></span>
                <span className="text-ink-3">Speed <span className="text-ink">{fmtInt(a.inputs.speed)} rpm</span></span>
                <span className="text-ink-3">Torque <span className="text-ink">{fmtNum(a.inputs.torque, 1)} Nm</span></span>
                <span className="text-ink-3">Tool wear <span className="text-ink">{fmtNum(a.inputs.toolWear, 1)} min</span></span>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel title="Supporting evidence" eyebrow="Why">
          {a.contributing.length ? (
            <FeatureBars features={a.contributing} />
          ) : (
            <p className="text-[13px] text-ink-2">No per-feature attribution returned for this run.</p>
          )}
          {a.evidence.length > 0 && (
            <ul className="mt-4 space-y-1.5 border-t border-hairline pt-4">
              {a.evidence.map((e, i) => (
                <li key={i} className="flex gap-2 text-[12.5px] leading-relaxed text-ink-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-signal/70" />
                  {e}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Recommended action" eyebrow="Maintenance guidance">
            <p className="text-[13.5px] leading-relaxed text-ink-2">{a.recommendation}</p>
            <p className="mt-3 border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-3">
              <Sparkles className="mr-1 inline h-3 w-3 text-signal" strokeWidth={1.6} />
              Decision support only — validate against factory calibration before acting.
            </p>
          </Panel>
          <Panel title="Model explanation" eyebrow="Plain language">
            <p className="text-[13px] leading-relaxed text-ink-2">{a.explanation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline pt-3 font-mono text-[10px] tabular-nums text-ink-3">
              {a.modelVersion && <span>v{a.modelVersion}</span>}
              {a.latencyMs !== undefined && <span>{fmtInt(a.latencyMs)} ms</span>}
              <span>{a.source === "live" ? "HF Space" : "Local engine"}</span>
            </div>
          </Panel>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11.5px] text-ink-3">
          <span>Model may label output as {a.mode.code === "NONE" ? FAILURE_MODES.NONE.name : FAILURE_MODES[a.mode.code as keyof typeof FAILURE_MODES]?.name}.</span>
        </div>
        {hasAlert || alertFiled ? (
          <Button variant="secondary" icon={<Check className="h-4 w-4 text-status-healthy" />} label="Alert on file" disabled />
        ) : (
          <Button variant="danger" icon={<BellRing className="h-4 w-4" />} label="Create alert" onClick={onFileAlert} />
        )}
      </div>

      <div className="flex justify-end">
        <Link to="/machines" className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 hover:text-signal">
          View machine health <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}