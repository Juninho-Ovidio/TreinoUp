import { cn } from "@/lib/cn";

/** Anel de progresso. value e max em qualquer unidade; passa de 100% vira alerta laranja. */
export function Ring({
  value,
  max,
  size = 180,
  stroke = 14,
  color = "var(--brand)",
  children,
  label,
  className,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
  label: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = max > 0 ? value / max : 0;
  const shown = Math.min(1, Math.max(0, ratio));
  const over = ratio > 1.05;
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--warn)" : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - shown)}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1), stroke 0.3s" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}

export function Bar({ value, max, color = "var(--brand)", className, label }: { value: number; max: number; color?: string; className?: string; label?: string }) {
  const ratio = max > 0 ? value / max : 0;
  const over = ratio > 1.05;
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--ring-track)]", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, ratio * 100))}%`,
          background: over ? "var(--warn)" : color,
          transition: "width 0.7s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      />
    </div>
  );
}
