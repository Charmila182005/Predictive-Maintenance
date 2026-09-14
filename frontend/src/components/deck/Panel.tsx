import { cn } from "@/lib/utils/cn";

interface PanelProps {
  title?: string;
  eyebrow?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, eyebrow, right, children, className, bodyClassName }: PanelProps) {
  const header = title || right || eyebrow;
  return (
    <section className={cn("rounded-xl border border-hairline bg-surface", className)}>
      {header && (
        <header className="flex h-11 min-h-11 items-center justify-between gap-3 border-b border-hairline px-4">
          <div className="min-w-0">
            {eyebrow && (
              <p className="font-mono text-[10px] uppercase leading-3 tracking-[0.16em] text-ink-3">{eyebrow}</p>
            )}
            {title && <h3 className="truncate text-sm font-medium text-ink">{title}</h3>}
          </div>
          {right}
        </header>
      )}
      <div className={cn("p-4", bodyClassName)}>{children}</div>
    </section>
  );
}