"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Flame } from "lucide-react";
import { Bar, Ring } from "@/components/ui/Progress";
import { Card } from "@/components/ui/Card";
import { fmt, fmt1 } from "@/lib/format";
import { pct } from "@/lib/nutrition";
import type { GoalRow, Macros } from "@/lib/types";
import { cn } from "@/lib/cn";

/** Dispara true uma única vez quando o valor cruza a meta (para animações de conclusão). */
function useCrossed(value: number, goal: number) {
  const prev = useRef(value);
  const [crossed, setCrossed] = useState(false);
  useEffect(() => {
    if (goal > 0 && prev.current < goal && value >= goal) {
      setCrossed(true);
      const t = setTimeout(() => setCrossed(false), 1200);
      prev.current = value;
      return () => clearTimeout(t);
    }
    prev.current = value;
  }, [value, goal]);
  return crossed;
}

export function CaloriesCard({ totals, goal, burned }: { totals: Macros; goal: GoalRow | null; burned: number }) {
  const target = goal?.kcal ?? 0;
  const budget = target + burned;
  const remaining = budget - totals.kcal;
  const crossed = useCrossed(totals.kcal, budget);
  const over = remaining < 0;

  return (
    <Card className={cn("flex flex-col gap-5 sm:flex-row sm:items-center", crossed && "animate-glow")}>
      <div className="flex justify-center">
        <Ring value={totals.kcal} max={budget} size={184} stroke={16} label="Calorias consumidas hoje">
          <div>
            <p className="text-[34px] font-extrabold leading-none tracking-tight">{fmt(totals.kcal)}</p>
            <p className="mt-1 text-sm text-muted">de {fmt(budget)} kcal</p>
            <p className={cn("mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-bold", over ? "bg-warn/15 text-warn" : "bg-brand-soft text-brand-strong")}>
              {pct(totals.kcal, budget)}%
            </p>
          </div>
        </Ring>
      </div>
      <dl className="grid flex-1 grid-cols-3 gap-2 text-center sm:grid-cols-1 sm:gap-3 sm:text-left">
        <Stat label="Consumidas" value={`${fmt(totals.kcal)}`} unit="kcal" />
        <Stat label="Meta" value={`${fmt(target)}`} unit="kcal" extra={burned > 0 ? `+${fmt(burned)} exercício` : undefined} />
        <Stat label={over ? "Acima" : "Restantes"} value={`${fmt(Math.abs(remaining))}`} unit="kcal" tone={over ? "warn" : "brand"} />
      </dl>
    </Card>
  );
}

function Stat({ label, value, unit, extra, tone }: { label: string; value: string; unit: string; extra?: string; tone?: "brand" | "warn" }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-2 py-3 sm:bg-transparent sm:p-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className={cn("mt-0.5 text-lg font-extrabold", tone === "brand" && "text-brand-strong", tone === "warn" && "text-warn")}>
        {value} <span className="text-xs font-semibold text-muted">{unit}</span>
      </dd>
      {extra && (
        <dd className="mt-0.5 flex items-center justify-center gap-1 text-[11px] font-semibold text-muted sm:justify-start">
          <Flame className="h-3 w-3 text-warn" aria-hidden />
          {extra}
        </dd>
      )}
    </div>
  );
}

const MACROS = [
  { key: "protein", goalKey: "protein_g", label: "Proteínas", color: "var(--protein)" },
  { key: "carbs", goalKey: "carbs_g", label: "Carboidratos", color: "var(--carbs)" },
  { key: "fat", goalKey: "fat_g", label: "Gorduras", color: "var(--fat)" },
] as const;

export function MacroBars({ totals, goal, compact }: { totals: Macros; goal: GoalRow | null; compact?: boolean }) {
  return (
    <div className={cn("grid gap-4", compact ? "grid-cols-3" : "grid-cols-1")}>
      {MACROS.map((m) => (
        <MacroRow key={m.key} label={m.label} color={m.color} value={totals[m.key]} goal={goal ? goal[m.goalKey] : 0} compact={compact} />
      ))}
    </div>
  );
}

function MacroRow({ label, value, goal, color, compact }: { label: string; value: number; goal: number; color: string; compact?: boolean }) {
  const done = goal > 0 && value >= goal;
  const crossed = useCrossed(value, goal);
  return (
    <div className="min-w-0">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className={cn("flex items-center gap-1.5 truncate font-semibold", compact ? "text-xs" : "text-sm")}>
          {label}
          {done && (
            <span key={crossed ? "pop" : "static"} className={cn("grid h-4 w-4 place-items-center rounded-full bg-brand text-on-brand", crossed && "animate-pop")} aria-label="Meta atingida">
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
        </span>
        <span className={cn("shrink-0 tabular-nums text-muted", compact ? "text-[11px]" : "text-sm")}>
          <b className="text-fg">{fmt(value)}</b> / {fmt(goal)} g
        </span>
      </div>
      <Bar value={value} max={goal} color={color} label={`${label}: ${fmt1(value)} de ${fmt(goal)} gramas`} />
    </div>
  );
}
