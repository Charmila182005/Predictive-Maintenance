import { cn } from "@/lib/utils/cn";

export function PageHeader({
  index,
  title,
  description,
  right,
  className,
}: {
  index?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {index && (
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-3">
            <span className="text-signal">{index.split(" ")[0]}</span>
            <span className="mx-1.5 text-hairline-strong">/</span>
            {index.split(" ").slice(1).join(" ")}
          </p>
        )}
        <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px] sm:leading-tight">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-2">{description}</p>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}