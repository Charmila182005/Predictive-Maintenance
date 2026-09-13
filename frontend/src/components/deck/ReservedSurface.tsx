import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ReservedSurface({
  icon: Icon,
  index,
  phase,
  title,
  description,
  className,
}: {
  icon: LucideIcon;
  index: string;
  phase: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border border-hairline bg-surface",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(34,211,238,0.06),transparent_70%)]"
      />
      <div aria-hidden className="stage-grid pointer-events-none absolute inset-x-0 top-0 h-full opacity-40" />
      <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-14 text-center">
        <span
          aria-hidden
          className="pointer-events-none select-none font-mono text-[92px] font-semibold leading-none tracking-tighter text-white/[0.035]"
        >
          {index}
        </span>
        <div className="-mt-4 flex h-10 w-10 items-center justify-center rounded-lg border border-hairline bg-raised/60 text-ink-3">
          <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
        </div>
        <h3 className="mt-4 text-sm font-medium text-ink">{title}</h3>
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-2">{description}</p>
        <span className="mt-5 rounded-full border border-hairline bg-overlay/70 px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.22em] text-ink-3">
          Surface reserved · Phase {phase}
        </span>
      </div>
    </div>
  );
}