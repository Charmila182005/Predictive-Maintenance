import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-lg border border-hairline bg-surface/30 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-raised/60 text-ink-3">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.4} />
      </div>
      {eyebrow && (
        <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-ink-3">{eyebrow}</p>
      )}
      <div className="max-w-sm">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{description}</p>}
      </div>
      {action && <div className="mt-1 flex items-center gap-2">{action}</div>}
    </div>
  );
}