import type { AssessInput, DerivedParams } from "@/lib/types";

export function derive(input: AssessInput): DerivedParams {
  return {
    tempDifference: round(input.processTemp - input.airTemp, 2),
    mechanicalPower: round((input.torque * input.speed * 2 * Math.PI) / 60, 1),
    overstrain: round(input.toolWear * input.torque, 1),
  };
}

export function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function fmtPercent(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number | undefined | null, digits = 1): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export function fmtInt(n: number | undefined | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  return Math.round(n).toLocaleString("en-US");
}

export function clampP(p: number): number {
  return Math.max(0, Math.min(1, p));
}

export function parsePercent(s: string | number | undefined | null): number | undefined {
  if (s === undefined || s === null) return undefined;
  if (typeof s === "number") return clampP(s);
  const cleaned = String(s).replace(/\s/g, "");
  if (cleaned.endsWith("%")) {
    const n = parseFloat(cleaned);
    return Number.isNaN(n) ? undefined : clampP(n / 100);
  }
  const n = parseFloat(cleaned);
  return Number.isNaN(n) ? undefined : clampP(n);
}

export function toIsoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function fmtTs(iso: string, opts?: { seconds?: boolean; full?: boolean }): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = opts?.seconds ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (opts?.full) {
    const mon = d.toLocaleDateString("en-US", { month: "short" });
    return `${d.getFullYear()}-${mon}-${pad(d.getDate())} ${time}`;
  }
  return time;
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}