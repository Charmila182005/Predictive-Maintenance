import { Badge, type BadgeTone } from "@/components/deck/Badge";
import { cn } from "@/lib/utils/cn";

export type StatusValue = string;

export function toneForStatus(value: StatusValue): BadgeTone {
  const s = String(value).toLowerCase();
  if (s.includes("critic")) return "critical";
  if (s.includes("high")) return "high";
  if (s.includes("warn") || s.includes("medium") || s.includes("elevated") || s.includes("acknowledged") || s.includes("moderate")) return "elevated";
  if (s.includes("normal") || s.includes("healthy") || s.includes("low") || s.includes("resolved") || s.includes("routine")) return "healthy";
  if (s.includes("open")) return "signal";
  return "neutral";
}

export function StatusBadge({ value, className }: { value: StatusValue; className?: string }) {
  return (
    <Badge tone={toneForStatus(value)} className={className}>
      {value}
    </Badge>
  );
}