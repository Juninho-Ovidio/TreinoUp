"use client";

import { useState } from "react";
import { ChevronDown, Ruler, Scale, Percent, Activity } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { ANAMNESIS, PERIMETERS, PROTOCOL, SKINFOLDS, computeAssessment, fatBand, fatBands, TARGET_FAT_PCT } from "@/lib/assessment";
import { numericDate } from "@/lib/dates";
import { fmt, fmt1, signed } from "@/lib/format";
import type { BodyAssessment } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Cartão com título que abre e fecha. */
export function Collapsible({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card className="p-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <h2 className="text-[17px] font-bold">{title}</h2>
        <ChevronDown className={cn("h-5 w-5 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && <div className="px-5 pb-5 animate-fade">{children}</div>}
    </Card>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border-b-[3px] bg-surface-2 p-4" style={{ borderBottomColor: color }}>
      <span style={{ color }}>{icon}</span>
      <span className="text-[13px] text-muted">{label}</span>
      <span className="text-[26px] font-extrabold leading-none tracking-tight">{value}</span>
    </div>
  );
}

// ---------- Medidor de peso ----------

const START = 210;
const SWEEP = 240;

function polar(cx: number, cy: number, r: number, deg: number) {
  const a = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy - r * Math.sin(a) };
}

function arc(cx: number, cy: number, r: number, t0: number, t1: number) {
  const a = polar(cx, cy, r, START - SWEEP * t0);
  const b = polar(cx, cy, r, START - SWEEP * t1);
  const large = SWEEP * (t1 - t0) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

function WeightGauge({ weight, min, max, target }: { weight: number; min: number; max: number; target: number | null }) {
  const lo = Math.min(min * 0.85, weight - 2, target ?? Infinity);
  const hi = Math.max(max * 1.2, weight + 2, target ?? 0);
  const t = (v: number) => Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
  const size = 260;
  const c = size / 2;
  const r = 104;
  const gap = 0.012;
  const dot = polar(c, c, r, START - SWEEP * t(weight));
  const tgt = target != null ? [polar(c, c, r - 16, START - SWEEP * t(target)), polar(c, c, r + 16, START - SWEEP * t(target))] : null;
  return (
    <div className="relative mx-auto" style={{ width: size, height: size * 0.82 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path d={arc(c, c, r, 0, t(min) - gap)} stroke="var(--protein)" strokeOpacity={0.45} strokeWidth={12} fill="none" strokeLinecap="round" />
        <path d={arc(c, c, r, t(min) + gap, t(max) - gap)} stroke="var(--ok)" strokeWidth={12} fill="none" strokeLinecap="round" />
        <path d={arc(c, c, r, t(max) + gap, 1)} stroke="var(--danger)" strokeWidth={12} fill="none" strokeLinecap="round" />
        {Array.from({ length: 25 }, (_, i) => {
          const p = polar(c, c, r - 22, START - (SWEEP * i) / 24);
          return <circle key={i} cx={p.x} cy={p.y} r={1.4} fill="var(--faint)" />;
        })}
        {tgt && <line x1={tgt[0].x} y1={tgt[0].y} x2={tgt[1].x} y2={tgt[1].y} stroke="var(--brand)" strokeWidth={3} strokeLinecap="round" />}
        <circle cx={dot.x} cy={dot.y} r={10} fill="var(--warn)" />
        <circle cx={dot.x} cy={dot.y} r={4.5} fill="#fff" />
      </svg>
      <div className="absolute inset-x-0 top-[34%] text-center">
        <p className="text-[52px] font-extrabold leading-none tracking-tight">
          {fmt1(weight)}
          <span className="text-[28px] text-muted">kg</span>
        </p>
        <p className="mt-1 text-sm font-semibold">Peso atual</p>
      </div>
    </div>
  );
}

// ---------- Rosca de gordura ----------

function FatDonut({ fatPct, fatKg, leanKg, color }: { fatPct: number; fatKg: number; leanKg: number; color: string }) {
  const size = 200;
  const stroke = 26;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const fat = Math.min(1, Math.max(0, fatPct / 100));
  return (
    <div className="relative mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--protein)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={`${circ * fat} ${circ}`} />
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <p className="text-[32px] font-extrabold leading-none">{fmt(fatPct, 2)}%</p>
        <p className="mt-1 text-xs text-muted">de gordura</p>
      </div>
      <span className="sr-only">
        Massa gorda {fmt1(fatKg)} kg, massa magra {fmt1(leanKg)} kg
      </span>
    </div>
  );
}

// ---------- Avaliação completa ----------

type Tab = "main" | "anamnesis" | "measures";

export function AssessmentView({ a, previous }: { a: BodyAssessment; previous: BodyAssessment | null }) {
  const [tab, setTab] = useState<Tab>("main");
  const r = computeAssessment({ sex: a.sex, age: a.age, weightKg: a.weight_kg, heightCm: a.height_cm, skinfolds: a.skinfolds_mm });
  const band = r.fatPct != null ? fatBand(a.sex, r.fatPct) : null;

  return (
    <div className="flex flex-col gap-4">
      <Segmented
        label="Seção da avaliação"
        value={tab}
        onChange={setTab}
        options={[
          { value: "main", label: "Principal" },
          { value: "anamnesis", label: "Anamnese" },
          { value: "measures", label: "Medidas" },
        ]}
      />

      {tab === "main" && (
        <>
          <Collapsible title="Composição corporal">
            <div className="grid grid-cols-2 gap-3">
              <StatTile icon={<Scale className="h-5 w-5" />} label="Massa (kg)" value={fmt(a.weight_kg, 2)} color="var(--ok)" />
              <StatTile icon={<Ruler className="h-5 w-5" />} label="Estatura (cm)" value={fmt(a.height_cm, 2)} color="var(--fat)" />
              <StatTile icon={<Activity className="h-5 w-5" />} label="IMC" value={fmt(r.bmi, 2)} color="var(--protein)" />
              <StatTile icon={<Percent className="h-5 w-5" />} label="Gordura (%)" value={r.fatPct != null ? fmt(r.fatPct, 2) : "–"} color="var(--danger)" />
            </div>
            <dl className="mt-5 flex flex-col gap-4">
              <div>
                <dt className="text-[13px] text-muted">Taxa metabólica basal (kcal)</dt>
                <dd className="mt-0.5 text-lg font-bold">{fmt(r.bmr, 2)}</dd>
              </div>
              {r.fatMassKg != null && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-[13px] text-muted">Massa gorda</dt>
                    <dd className="mt-0.5 text-lg font-bold">{fmt1(r.fatMassKg)} kg</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Massa magra</dt>
                    <dd className="mt-0.5 text-lg font-bold">{fmt1(r.leanMassKg)} kg</dd>
                  </div>
                </div>
              )}
              <div>
                <dt className="text-[13px] text-muted">Protocolo</dt>
                <dd className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
                  <span className="text-lg font-bold">{PROTOCOL.name}</span>
                  <span className="text-[13px] text-muted">
                    {PROTOCOL.detail} · {a.sex === "male" ? "Homens" : "Mulheres"}
                  </span>
                </dd>
              </div>
            </dl>
          </Collapsible>

          <Collapsible title="Massa corporal ideal">
            <WeightGauge weight={a.weight_kg} min={r.healthyMinKg} max={r.healthyMaxKg} target={r.targetWeightKg} />
            <p className="text-center text-[13px] text-muted">Análise feita em {numericDate(a.assessed_on)}</p>
            <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-[13px] text-muted">
              <Legend color="var(--protein)" faded label="Abaixo" />
              <Legend color="var(--ok)" label={`Ideal ${fmt1(r.healthyMinKg)}–${fmt1(r.healthyMaxKg)} kg`} />
              <Legend color="var(--danger)" label="Acima" />
              {r.targetWeightKg != null && <Legend color="var(--brand)" label={`Alvo ${fmt1(r.targetWeightKg)} kg`} />}
            </ul>
            <p className="mt-3 text-center text-xs text-faint">
              Faixa ideal pelo IMC (18,5 a 24,9).{r.targetWeightKg != null && ` Alvo: seu peso com ${TARGET_FAT_PCT[a.sex]}% de gordura, mantendo a massa magra.`}
            </p>
          </Collapsible>

          {r.fatPct != null && band && (
            <Collapsible title="Percentual de gordura">
              <FatDonut fatPct={r.fatPct} fatKg={r.fatMassKg!} leanKg={r.leanMassKg!} color={band.color} />
              <ul className="mt-4 flex justify-center gap-4 text-[13px] text-muted">
                <Legend color={band.color} label={`Gordura ${fmt1(r.fatMassKg)} kg`} />
                <Legend color="var(--protein)" label={`Magra ${fmt1(r.leanMassKg)} kg`} />
              </ul>
              <FatScale sex={a.sex} pct={r.fatPct} />
            </Collapsible>
          )}
          {r.fatPct == null && (
            <Card>
              <p className="text-sm text-muted">Preencha as 7 dobras cutâneas para calcular o percentual de gordura.</p>
            </Card>
          )}
        </>
      )}

      {tab === "anamnesis" && (
        <Collapsible title="Anamnese">
          {ANAMNESIS.some((q) => a.anamnesis[q.key]?.trim()) ? (
            <dl className="flex flex-col gap-4">
              {ANAMNESIS.filter((q) => a.anamnesis[q.key]?.trim()).map((q) => (
                <div key={q.key}>
                  <dt className="text-[13px] font-semibold text-brand-strong">{q.label}</dt>
                  <dd className="mt-0.5 whitespace-pre-line text-[15px]">{a.anamnesis[q.key]}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-sm text-muted">Nenhuma resposta nesta avaliação.</p>
          )}
        </Collapsible>
      )}

      {tab === "measures" && (
        <>
          <MeasureTable
            title="Dobras cutâneas"
            head="Dobras"
            unit="mm"
            rows={SKINFOLDS.map((s) => ({ key: s.key, label: s.label, value: a.skinfolds_mm[s.key], prev: previous?.skinfolds_mm[s.key] }))}
          />
          <MeasureTable
            title="Perímetros"
            head="Perímetros"
            unit="cm"
            rows={PERIMETERS.map((p) => ({ key: p.key, label: p.label, value: a.perimeters_cm[p.key], prev: previous?.perimeters_cm[p.key] }))}
          />
        </>
      )}
    </div>
  );
}

function Legend({ color, label, faded }: { color: string; label: string; faded?: boolean }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ background: color, opacity: faded ? 0.45 : 1 }} aria-hidden />
      {label}
    </li>
  );
}

/** Régua com as faixas de gordura e a posição atual. */
function FatScale({ sex, pct }: { sex: "male" | "female"; pct: number }) {
  const bands = fatBands(sex);
  const top = bands.at(-2)!.max + 10;
  let from = 0;
  const current = fatBand(sex, pct);
  return (
    <div className="mt-5">
      <div className="relative flex h-2.5 overflow-hidden rounded-full">
        {bands.map((b) => {
          const to = Math.min(b.max, top);
          const w = ((to - from) / top) * 100;
          from = to;
          return <span key={b.label} style={{ width: `${w}%`, background: b.color, opacity: b === current ? 1 : 0.35 }} />;
        })}
      </div>
      <div className="relative h-4">
        <span className="absolute top-0.5 h-3 w-0.5 -translate-x-1/2 rounded bg-fg" style={{ left: `${Math.min(100, (pct / top) * 100)}%` }} aria-hidden />
      </div>
      <p className="text-center text-sm">
        Classificação: <strong style={{ color: current.color }}>{current.label}</strong>
      </p>
    </div>
  );
}

function MeasureTable({
  title,
  head,
  unit,
  rows,
}: {
  title: string;
  head: string;
  unit: string;
  rows: { key: string; label: string; value?: number; prev?: number }[];
}) {
  const filled = rows.filter((r) => r.value != null);
  const showDiff = filled.some((r) => r.prev != null);
  return (
    <Collapsible title={title}>
      {filled.length ? (
        <table className="w-full text-[15px]">
          <thead>
            <tr className="text-left text-sm font-semibold text-ok">
              <th className="pb-2 font-semibold">{head}</th>
              {showDiff && <th className="pb-2 text-right font-semibold">Dif.</th>}
              <th className="pb-2 text-right font-semibold">Medidas</th>
            </tr>
          </thead>
          <tbody>
            {filled.map((r) => {
              const d = r.prev != null ? r.value! - r.prev : null;
              return (
                <tr key={r.key}>
                  <td className="py-2.5 text-muted">{r.label}</td>
                  {showDiff && <td className="py-2.5 text-right text-[13px] text-muted">{d != null && d !== 0 ? signed(d) : ""}</td>}
                  <td className="py-2.5 text-right">
                    <span className="text-[17px] font-bold">{fmt1(r.value)}</span> <span className="text-muted">{unit}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-sm text-muted">Nada registrado nesta avaliação.</p>
      )}
    </Collapsible>
  );
}
