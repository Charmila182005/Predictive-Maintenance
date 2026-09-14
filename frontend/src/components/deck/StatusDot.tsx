import { cn } from "@/lib/utils/cn";

export type StatusTone = "live" | "healthy" | "elevated" | "critical" | "neutral" | "info";

const toneClasses: Record<StatusTone, string> = {
  live: "bg-signal text-signal",
  healthy: "bg-status-healthy text-status-healthy",
  elevated: "bg-status-elevated text-status-elevated",
  critical: "bg-status-critical text-status-critical",
  neutral: "bg-ink-3 text-ink-3",
  info: "bg-status-info text-status-info",
};

const sizeClasses = {
  sm: "h-1.5 w-1.5",
  md: "h-2 w-2",
};

export function StatusDot({
  tone = "neutral",
  pulse = false,
  size = "md",
  className,
}: {
  tone?: StatusTone;
  pulse?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", size === "md" ? "h-2 w-2" : "h-1.5 w-1.5", className)}>
      {pulse && (
        <span
          aria-hidden
          className={cn("absolute inset-0 rounded-full animate-pulse-ring bg-current opacity-60", toneClasses[tone])}
        />
      )}
      <span className={cn("relative block rounded-full", toneClasses[tone], sizeClasses[size])} />
    </span>
  );
}