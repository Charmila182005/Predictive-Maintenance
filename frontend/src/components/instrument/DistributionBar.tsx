import { cn } from "@/lib/utils/cn";

export interface Segment {
  key: string;
  label: string;
  count: number;
  color: string;
}

export function DistributionBar({
  segments,
  className,
}: {
  segments: Segment[];
  className?: string;
}) {
  const total = Math.max(1, segments.reduce((acc, s) => acc + s.count, 0));
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) =>
          s.count > 0 ? (
            <div
              key={s.key}
              title={`${s.label} · ${s.count}`}
              className="h-full shrink-0 transition-[width] duration-500 first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(s.count / total) * 100}%`, backgroundColor: s.color }}
            />
          ) : null,
        )}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-ink-2">{s.label}</span>
            <span className="font-mono text-[11px] tabular-nums text-ink">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}