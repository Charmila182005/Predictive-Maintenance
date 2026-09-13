import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-md bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_0%,rgba(255,255,255,0.08)_50%,rgba(255,255,255,0.03)_100%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}