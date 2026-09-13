import { cn } from "@/lib/utils/cn";

export function Sparkline({
  values,
  width = 240,
  height = 56,
  stroke = "var(--color-signal)",
  className,
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  className?: string;
}) {
  if (values.length < 2) {
    return <div className={cn("flex items-center justify-center", className)} style={{ width, height }} />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * (width - 4) + 2,
    height - 4 - ((v - min) / span) * (height - 8),
  ]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L ${pts[pts.length - 1][0].toFixed(1)} ${height - 2} L ${pts[0][0].toFixed(1)} ${height - 2} Z`;
  const last = pts[pts.length - 1];
  const id = `spark-${stroke.replace(/\W/g, "")}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className={cn("overflow-visible", className)} aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={line} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d={area} fill={`url(#${id})`} />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={stroke} />
    </svg>
  );
}