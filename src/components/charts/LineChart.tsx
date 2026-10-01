"use client";

import { useId, useMemo, useRef, useState } from "react";
import { fmt1, fmt } from "@/lib/format";
import { parseISODate, shortDate } from "@/lib/dates";

export interface Point {
  date: string; // AAAA-MM-DD
  value: number;
}

/**
 * Gráfico de linha em SVG, responsivo e interativo (toque ou mouse mostra o valor).
 * Eixo X proporcional às datas; eixo Y com passos "redondos".
 */
export function LineChart({
  data,
  unit,
  color = "var(--brand)",
  height = 200,
  goal,
  digits = 1,
  label,
}: {
  data: Point[];
  unit: string;
  color?: string;
  height?: number;
  goal?: number | null;
  digits?: number;
  label: string;
}) {
  const W = 640, H = height, L = 40, R = 14, T = 16, B = 26;
  const gid = useId().replace(/:/g, "");
  const svg = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (data.length === 0) return null;
    const ts = data.map((d) => parseISODate(d.date).getTime());
    const t0 = ts[0], t1 = ts[ts.length - 1];
    const vals = data.map((d) => d.value).concat(goal != null ? [goal] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1) { lo -= 1; hi += 1; }
    const span = hi - lo;
    const step = niceStep(span / 4);
    lo = Math.floor(lo / step) * step;
    hi = Math.ceil(hi / step) * step;
    const x = (t: number) => (t1 === t0 ? (L + W - R) / 2 : L + ((t - t0) / (t1 - t0)) * (W - L - R));
    const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const pts = data.map((d, i) => ({ x: x(ts[i]), y: y(d.value), d }));
    const ticks: number[] = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    const labelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];
    return { pts, ticks, y, labelIdx };
  }, [data, goal, H]);

  if (!geo) return null;
  const { pts, ticks, y, labelIdx } = geo;
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts.at(-1)!.x.toFixed(1)} ${H - B} L${pts[0].x.toFixed(1)} ${H - B} Z`;
  const active = hover != null ? pts[hover] : pts.at(-1)!;

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svg.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = 0;
    for (let i = 1; i < pts.length; i++) if (Math.abs(pts[i].x - px) < Math.abs(pts[best].x - px)) best = i;
    setHover(best);
  }

  const fmtV = (v: number) => (digits === 0 ? fmt(v) : fmt1(v));

  return (
    <figure className="w-full">
      <div className="mb-2 flex items-baseline justify-between gap-2" aria-live="polite">
        <span className="text-2xl font-extrabold tracking-tight">
          {fmtV(active.d.value)} <span className="text-sm font-semibold text-muted">{unit}</span>
        </span>
        <span className="text-sm text-muted">{shortDate(active.d.date)}</span>
      </div>
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-pan-y select-none"
        role="img"
        aria-label={label}
        onPointerMove={onMove}
        onPointerDown={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={`g${gid}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={L - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {fmt1(t)}
            </text>
          </g>
        ))}
        {goal != null && (
          <g>
            <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="var(--muted)" strokeWidth="1.25" strokeDasharray="5 5" />
            <text x={W - R} y={y(goal) - 6} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--muted)">
              meta {fmtV(goal)}
            </text>
          </g>
        )}
        <path d={area} fill={`url(#g${gid})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.length <= 45 && pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />)}
        <line x1={active.x} x2={active.x} y1={T} y2={H - B} stroke="var(--line)" strokeWidth="1" opacity={hover != null ? 1 : 0} />
        <circle cx={active.x} cy={active.y} r="6" fill="var(--surface)" stroke={color} strokeWidth="2.5" />
        {labelIdx.map((i) => (
          <text key={i} x={pts[i].x} y={H - 6} textAnchor={i === 0 ? "start" : i === pts.length - 1 ? "end" : "middle"} fontSize="11" fill="var(--muted)">
            {shortDate(data[i].date)}
          </text>
        ))}
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

/** Linha mínima sem eixos, para cards. */
export function Sparkline({ values, color = "var(--brand)", width = 120, height = 36 }: { values: number[]; color?: string; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * (width - 6) + 3).toFixed(1)},${(height - 3 - ((v - lo) / span) * (height - 6)).toFixed(1)}`);
  const last = pts.at(-1)!.split(",");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="3.5" fill={color} />
    </svg>
  );
}
