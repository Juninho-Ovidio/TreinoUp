"use client";

import { useMemo, useState } from "react";
import { fmt } from "@/lib/format";
import { shortDate } from "@/lib/dates";

export interface BarDatum {
  date: string;
  value: number;
}

/** Barras por dia (ou semana) com linha de meta opcional e toque para ver o valor. */
export function BarChart({
  data,
  unit,
  color = "var(--brand)",
  goal,
  height = 200,
  label,
  format = (v: number) => fmt(v),
}: {
  data: BarDatum[];
  unit: string;
  color?: string;
  goal?: number | null;
  height?: number;
  label: string;
  format?: (v: number) => string;
}) {
  const W = 640, H = height, L = 44, R = 10, T = 16, B = 26;
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const max = Math.max(1, ...data.map((d) => d.value), goal ?? 0) * 1.1;
    const step = niceStep(max / 4);
    const top = Math.ceil(max / step) * step;
    const y = (v: number) => T + (1 - v / top) * (H - T - B);
    const slot = (W - L - R) / Math.max(1, data.length);
    const bw = Math.max(2, Math.min(28, slot * 0.62));
    const ticks: number[] = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    return { y, slot, bw, ticks };
  }, [data, goal, H]);

  const { y, slot, bw, ticks } = geo;
  const avg = data.length ? data.reduce((a, d) => a + d.value, 0) / data.filter((d) => d.value > 0).length || 0 : 0;
  const active = hover != null ? data[hover] : null;
  const labelEvery = Math.ceil(data.length / 6);

  return (
    <figure className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-2" aria-live="polite">
        <span className="text-2xl font-extrabold tracking-tight">
          {format(active ? active.value : avg || 0)} <span className="text-sm font-semibold text-muted">{unit}</span>
        </span>
        <span className="text-sm text-muted">{active ? shortDate(active.date) : "média dos dias com registro"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full select-none" role="img" aria-label={label} onPointerLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {format(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = L + i * slot + (slot - bw) / 2;
          const h = Math.max(0, H - B - y(d.value));
          const over = goal != null && goal > 0 && d.value > goal * 1.05;
          return (
            <g key={d.date} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={L + i * slot} y={T} width={slot} height={H - T - B} fill="transparent" />
              <rect x={x} y={H - B - h} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={over ? "var(--warn)" : color} opacity={hover == null || hover === i ? 1 : 0.45} />
              {i % labelEvery === 0 && (
                <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--muted)">
                  {shortDate(d.date)}
                </text>
              )}
            </g>
          );
        })}
        {goal != null && goal > 0 && (
          <g pointerEvents="none">
            <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--fg)" strokeOpacity="0.5" strokeWidth="1.25" strokeDasharray="5 5" />
            <text x={W - R} y={y(goal) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--muted)">
              meta {format(goal)}
            </text>
          </g>
        )}
      </svg>
      <figcaption className="sr-only">{label}</figcaption>
    </figure>
  );
}

function niceStep(raw: number) {
  const p = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-6))));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}
