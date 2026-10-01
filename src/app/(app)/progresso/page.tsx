"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, Dumbbell, Plus, Ruler, Scale } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { useApp } from "@/components/app/AppProvider";
import { useQuery } from "@/hooks/useQuery";
import { keys, useDay } from "@/hooks/useDay";
import { listWeights } from "@/data/body";
import { dailyTotals, waterTotals } from "@/data/diary";
import { workoutsInRange } from "@/data/workouts";
import { addDays, dateRange, rangeStart, RANGE_LABELS, today, type RangeKey } from "@/lib/dates";
import { fillDays, valueAtOrBefore, weeklyAverage, weeklySum, averageOfNonZero } from "@/lib/series";
import { fmt, fmt1, fmtLiters, signed } from "@/lib/format";
import { workoutVolume } from "@/lib/exercise";
import { weightProgress } from "@/lib/goals";
import { FREE_HISTORY_DAYS } from "@/lib/plans";
import { cn } from "@/lib/cn";

type Tab = "weight" | "nutrition" | "water" | "workouts";
type Metric = "kcal" | "protein_g" | "carbs_g" | "fat_g";

const METRICS: Record<Metric, { label: string; unit: string; color: string }> = {
  kcal: { label: "Calorias", unit: "kcal", color: "var(--brand)" },
  protein_g: { label: "Proteínas", unit: "g", color: "var(--protein)" },
  carbs_g: { label: "Carboidratos", unit: "g", color: "var(--carbs)" },
  fat_g: { label: "Gorduras", unit: "g", color: "var(--fat)" },
};

export default function ProgressPage() {
  const { profile, can, openSheet } = useApp();
  const [tab, setTab] = useState<Tab>("weight");
  const [range, setRange] = useState<RangeKey>("30d");
  const [metric, setMetric] = useState<Metric>("kcal");
  const end = today();
  const start = rangeStart(range, end);
  const long = range === "90d" || range === "1y";
  const fullHistory = can("full_history");
  const today_ = useDay(end);

  // Peso: busca desde 1 ano (para evolução semanal/mensal e para o gráfico).
  const weights = useQuery(`${keys.weights}all`, () => listWeights(addDays(end, -365), end));
  const nutrition = useQuery(tab === "nutrition" ? `${keys.charts}food:${start}` : null, () => dailyTotals(start, end));
  const water = useQuery(tab === "water" ? `${keys.charts}water:${start}` : null, () => waterTotals(start, end));
  const workouts = useQuery(tab === "workouts" ? `${keys.charts}workouts:${start}` : null, () => workoutsInRange(start, end));

  const w = weights.data ?? [];
  const inRange = w.filter((x) => x.entry_date >= start);
  const current = w.at(-1)?.weight_kg ?? null;
  const initial = profile.start_weight_kg;
  const weekAgo = valueAtOrBefore(w, addDays(end, -7));
  const monthAgo = valueAtOrBefore(w, addDays(end, -30));

  const bars = useMemo(() => {
    if (tab === "nutrition" && nutrition.data) {
      const days = fillDays(nutrition.data, start, end, (r) => r[metric]);
      return long ? weeklyAverage(days) : days;
    }
    if (tab === "water" && water.data) {
      const days = fillDays(water.data, start, end, (r) => r.ml);
      return long ? weeklyAverage(days) : days;
    }
    if (tab === "workouts" && workouts.data) {
      const count = new Map<string, number>();
      for (const x of workouts.data) count.set(x.workout_date, (count.get(x.workout_date) ?? 0) + 1);
      const perDay = dateRange(start, end).map((date) => ({ date, value: count.get(date) ?? 0 }));
      return weeklySum(perDay);
    }
    return [];
  }, [tab, nutrition.data, water.data, workouts.data, metric, start, end, long]);

  const goalFor = (m: Metric) => (today_.goal ? (m === "kcal" ? today_.goal.kcal : today_.goal[m]) : null);

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title="Meu progresso"
        action={
          <Link href="/progresso/medidas" className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-semibold shadow-card">
            <Ruler className="h-4 w-4" /> Medidas
          </Link>
        }
      />

      <Segmented
        label="Gráfico"
        value={tab}
        onChange={setTab}
        options={[
          { value: "weight", label: "Peso" },
          { value: "nutrition", label: "Nutrição" },
          { value: "water", label: "Água" },
          { value: "workouts", label: "Treinos" },
        ]}
      />

      <div className="flex items-center gap-2">
        <Segmented
          className="flex-1"
          label="Período"
          value={range}
          onChange={(r) => {
            if (!fullHistory && (r === "90d" || r === "1y")) return;
            setRange(r);
          }}
          options={(["7d", "30d", "90d", "1y"] as RangeKey[]).map((r) => ({ value: r, label: RANGE_LABELS[r], locked: !fullHistory && (r === "90d" || r === "1y") }))}
        />
      </div>
      {!fullHistory && (
        <p className="-mt-2 text-center text-xs text-muted">
          O plano gratuito mostra os últimos {FREE_HISTORY_DAYS} dias.{" "}
          <Link href="/premium" className="font-semibold text-brand-strong">
            Ver Premium
          </Link>
        </p>
      )}

      {tab === "weight" && (
        <>
          <Card>
            {weights.loading ? (
              <Skeleton className="h-56" />
            ) : inRange.length < 2 ? (
              <EmptyState
                icon={<Scale className="h-6 w-6" />}
                title={inRange.length ? "Falta um registro para o gráfico" : "Nenhum peso neste período"}
                text="Registre seu peso algumas vezes por semana, sempre no mesmo horário."
                action={
                  <Button onClick={() => openSheet("weight")}>
                    <Plus className="h-4 w-4" /> Registrar peso
                  </Button>
                }
              />
            ) : (
              <LineChart
                data={inRange.map((x) => ({ date: x.entry_date, value: x.weight_kg }))}
                unit="kg"
                goal={profile.target_weight_kg}
                label={`Peso de ${inRange[0].entry_date} a ${inRange.at(-1)!.entry_date}`}
              />
            )}
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Atual" value={current != null ? `${fmt1(current)} kg` : "–"} />
            <Stat label="Inicial" value={initial != null ? `${fmt1(initial)} kg` : "–"} />
            <Stat label="Meta" value={profile.target_weight_kg != null ? `${fmt1(profile.target_weight_kg)} kg` : "–"} extra={profile.goal !== "maintain" ? `${weightProgress(initial, current, profile.target_weight_kg)}% do caminho` : undefined} />
            <Stat label="Diferença" value={current != null && initial != null ? `${signed(current - initial)} kg` : "–"} good={current != null && initial != null ? direction(profile.goal, current - initial) : undefined} />
            <Stat label="Na semana" value={current != null && weekAgo != null ? `${signed(current - weekAgo)} kg` : "–"} good={current != null && weekAgo != null ? direction(profile.goal, current - weekAgo) : undefined} />
            <Stat label="No mês" value={current != null && monthAgo != null ? `${signed(current - monthAgo)} kg` : "–"} good={current != null && monthAgo != null ? direction(profile.goal, current - monthAgo) : undefined} />
          </div>
          <Button variant="secondary" onClick={() => openSheet("weight")}>
            <Plus className="h-4 w-4" /> Registrar peso
          </Button>
        </>
      )}

      {tab === "nutrition" && (
        <>
          <Segmented label="Nutriente" value={metric} onChange={setMetric} options={(Object.keys(METRICS) as Metric[]).map((m) => ({ value: m, label: METRICS[m].label }))} />
          <Card>
            {nutrition.loading ? (
              <Skeleton className="h-56" />
            ) : bars.every((b) => b.value === 0) ? (
              <EmptyState title="Sem registros neste período" text="Os totais do diário aparecem aqui dia a dia." />
            ) : (
              <BarChart data={bars} unit={METRICS[metric].unit} color={METRICS[metric].color} goal={goalFor(metric)} label={`${METRICS[metric].label} por ${long ? "semana (média diária)" : "dia"}`} />
            )}
          </Card>
          {nutrition.data && nutrition.data.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {(Object.keys(METRICS) as Metric[]).map((m) => {
                const avg = averageOfNonZero(fillDays(nutrition.data!, start, end, (r) => r[m]));
                return <Stat key={m} label={`Média ${METRICS[m].label.toLowerCase()}`} value={`${fmt(avg)} ${METRICS[m].unit}`} extra={goalFor(m) ? `meta ${fmt(goalFor(m)!)}` : undefined} />;
              })}
            </div>
          )}
        </>
      )}

      {tab === "water" && (
        <Card>
          {water.loading ? (
            <Skeleton className="h-56" />
          ) : bars.every((b) => b.value === 0) ? (
            <EmptyState title="Sem registros de água" text="Use o botão + para registrar copos e garrafas." />
          ) : (
            <BarChart data={bars} unit="L" color="var(--water)" goal={today_.goal?.water_ml ?? null} format={(v) => fmtLiters(v)} label="Água por dia" />
          )}
        </Card>
      )}

      {tab === "workouts" && (
        <>
          <Card>
            {workouts.loading ? (
              <Skeleton className="h-56" />
            ) : !workouts.data?.length ? (
              <EmptyState icon={<Dumbbell className="h-6 w-6" />} title="Nenhum treino neste período" text="Registre seus treinos para acompanhar frequência e volume." />
            ) : (
              <BarChart data={bars} unit="treinos" color="var(--fat)" label="Treinos por semana" />
            )}
          </Card>
          {!!workouts.data?.length && (
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Treinos" value={String(workouts.data.length)} />
              <Stat label="Volume total" value={`${fmt(workouts.data.reduce((a, x) => a + workoutVolume(x.workout_exercises ?? []), 0))} kg`} />
            </div>
          )}
          <Link href="/treinos" className="flex items-center justify-between rounded-[var(--radius-card)] bg-surface p-4 font-semibold shadow-card">
            Ver todos os treinos <ChevronRight className="h-5 w-5 text-muted" />
          </Link>
        </>
      )}

      <SectionTitle className="mt-2">Atalhos</SectionTitle>
      <div className="grid grid-cols-2 gap-3">
        <Link href="/treinos" className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 font-semibold shadow-card">
          <Dumbbell className="h-5 w-5 text-fat" /> Treinos
        </Link>
        <Link href="/progresso/medidas" className="flex items-center gap-3 rounded-[var(--radius-card)] bg-surface p-4 font-semibold shadow-card">
          <Ruler className="h-5 w-5 text-protein" /> Medidas
        </Link>
      </div>
    </main>
  );
}

/** Para perder peso, cair é bom; para ganhar, subir é bom. */
function direction(goal: string | null, delta: number): boolean | undefined {
  if (delta === 0 || goal === "maintain" || goal === "recomp" || !goal) return undefined;
  return goal === "lose" ? delta < 0 : delta > 0;
}

function Stat({ label, value, extra, good }: { label: string; value: string; extra?: string; good?: boolean }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-card">
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={cn("mt-1 text-xl font-extrabold", good === true && "text-brand-strong", good === false && "text-warn")}>{value}</p>
      {extra && <p className="text-xs text-muted">{extra}</p>}
    </div>
  );
}
