import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { ContributingFeature } from "@/lib/types";
import { fmtNum } from "@/lib/derived";

export function FeatureBars({
  features,
  className,
  max = 1,
}: {
  features: ContributingFeature[];
  className?: string;
  max?: number;
}) {
  const scale = Math.max(max, ...features.map((f) => f.magnitude || 0), 1);
  return (
    <div className={className}>
      <div className="space-y-3">
        {features.map((f) => {
          const pct = Math.max(4, (f.magnitude / scale) * 100);
          return (
            <div key={f.key}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[12px] text-ink-2">{f.label}</span>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] tabular-nums text-ink">
                  {f.direction === "increases" ? (
                    <ArrowUpRight className="h-3 w-3 text-status-critical" strokeWidth={2} />
                  ) : (
                    <ArrowDownLeft className="h-3 w-3 text-status-healthy" strokeWidth={2} />
                  )}
                  {fmtNum(f.value, 1)}
                  {f.unit ?? ""}
                </span>
              </div>
              <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    background: f.direction === "increases" ? "var(--color-status-high)" : "var(--color-status-healthy)",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}