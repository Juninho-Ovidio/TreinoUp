"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Droplet, Dumbbell, Flame, Menu, Plus, Target, UserRound } from "lucide-react";
import { useApp } from "@/components/app/AppProvider";
import { CaloriesCard, MacroBars } from "@/components/app/Nutrition";
import { MealIcon } from "@/components/app/MealIcon";
import { Sparkline } from "@/components/charts/LineChart";
import { Card, SectionTitle, Skeleton } from "@/components/ui/Card";
import { HeaderBar, headerOutlineBtn } from "@/components/ui/HeaderBar";
import { Ring } from "@/components/ui/Progress";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { keys, useDay } from "@/hooks/useDay";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { listWeights } from "@/data/body";
import { workoutsInRange } from "@/data/workouts";
import { addWater } from "@/data/diary";
import { errorMessage } from "@/data/base";
import { addDays, today } from "@/lib/dates";
import { fmt, fmt1, fmtLiters, greetingFirstName, signed } from "@/lib/format";
import { GOAL_LABELS, weightProgress } from "@/lib/goals";
import { ACTIVITIES, workoutVolume } from "@/lib/exercise";

export default function HomePage() {
  const { profile, openSheet } = useApp();
  const toast = useToast();
  const date = today();
  const day = useDay(date);
  const weights = useQuery(`${keys.weights}90`, () => listWeights(addDays(date, -89), date));
  const todayWorkouts = useQuery(`${keys.workouts}:day:${date}`, () => workoutsInRange(date, date));
  const name = greetingFirstName(profile.name);
  // A saudação depende da hora do aparelho: define depois de montar para não divergir do HTML do servidor.
  const [salute, setSalute] = useState("Olá");
  useEffect(() => {
    const h = new Date().getHours();
    setSalute(h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite");
  }, []);

  const wlist = weights.data ?? [];
  const current = wlist.at(-1)?.weight_kg ?? profile.start_weight_kg;
  const start = profile.start_weight_kg;
  const progress = weightProgress(start, current, profile.target_weight_kg);
  const diff = current != null && start != null ? current - start : null;

  async function quickWater() {
    try {
      await addWater(date, 250);
      invalidate(keys.water(date), keys.charts);
      toast.success("+250 ml de água");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <main className="flex flex-col gap-5">
      <HeaderBar className="animate-enter gap-3">
        <Link
          href="/perfil"
          aria-label="Abrir perfil"
          className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#14141a] text-[#ffd27a] ring-2 ring-[#ffd27a]/80 ring-offset-2 ring-offset-[#14141a] transition-transform active:scale-95"
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <UserRound className="h-6 w-6" strokeWidth={2} aria-hidden />
          )}
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[17px] font-extrabold leading-tight tracking-tight text-[#ffd27a]">
            {salute}
            {name ? `, ${name}` : ""}
          </h1>
          <p className="truncate text-[13px] text-white/75">Pronto para o treino?</p>
        </div>
        <Link href="/perfil" className={headerOutlineBtn} aria-label="Menu e perfil">
          <Menu className="h-5 w-5" aria-hidden />
        </Link>
      </HeaderBar>

      {/* Objetivo e peso */}
      <Link href="/progresso" className="block animate-enter" style={{ animationDelay: "40ms" }}>
        <Card className="flex items-center gap-4 transition-transform active:scale-[0.99]">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
            <Target className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Seu objetivo</p>
            <p className="truncate font-bold">{profile.goal ? GOAL_LABELS[profile.goal] : "Defina um objetivo"}</p>
            <p className="text-sm text-muted">
              {current != null ? `${fmt1(current)} kg` : "–"}
              {diff != null && diff !== 0 && <span className={diff < 0 ? "text-brand-strong" : ""}> · {signed(diff)} kg</span>}
              {profile.target_weight_kg != null && <> · meta {fmt1(profile.target_weight_kg)} kg</>}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Sparkline values={wlist.map((w) => w.weight_kg)} width={84} height={30} />
            {profile.goal !== "maintain" && <span className="text-xs font-bold text-brand-strong">{progress}% da meta</span>}
          </div>
        </Card>
      </Link>

      {/* Calorias */}
      <section aria-labelledby="cal-title" className="flex flex-col gap-3 animate-enter" style={{ animationDelay: "80ms" }}>
        <SectionTitle>
          <span id="cal-title">Calorias</span>
        </SectionTitle>
        {day.loading ? <Skeleton className="h-[232px] rounded-[var(--radius-card)]" /> : <CaloriesCard totals={day.totals} goal={day.goal} burned={day.burned} />}
      </section>

      {/* Macros */}
      <section aria-labelledby="mac-title" className="flex flex-col gap-3 animate-enter" style={{ animationDelay: "120ms" }}>
        <SectionTitle>
          <span id="mac-title">Macronutrientes</span>
        </SectionTitle>
        <Card>{day.loading ? <Skeleton className="h-28" /> : <MacroBars totals={day.totals} goal={day.goal} />}</Card>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Hoje */}
        <section aria-labelledby="today-title" className="flex flex-col gap-3">
          <SectionTitle
            action={
              <Link href="/diario" className="flex items-center text-sm font-semibold text-brand-strong">
                Ver diário <ChevronRight className="h-4 w-4" />
              </Link>
            }
          >
            <span id="today-title">Hoje</span>
          </SectionTitle>
          <Card className="p-2">
            {day.loading ? (
              <div className="flex flex-col gap-2 p-3">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {day.meals.map((m) => {
                  const items = day.byMeal.get(m.id) ?? [];
                  const kcal = items.reduce((a, e) => a + e.kcal, 0);
                  return (
                    <li key={m.id}>
                      <Link href={items.length ? `/diario#meal-${m.id}` : `/alimentos/buscar?refeicao=${m.id}`} className="flex items-center gap-3 rounded-2xl px-3 py-3 hover:bg-surface-2">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface-2 text-muted">
                          <MealIcon name={m.icon} className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block font-semibold">{m.name}</span>
                          <span className="block truncate text-sm text-muted">{items.length ? items.map((e) => e.name).join(", ") : "Nada registrado"}</span>
                        </span>
                        {items.length ? (
                          <span className="shrink-0 text-sm font-bold">{fmt(kcal)} kcal</span>
                        ) : (
                          <span className="flex shrink-0 items-center gap-1 text-sm font-semibold text-brand-strong">
                            <Plus className="h-4 w-4" /> Adicionar
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </section>

        <div className="flex flex-col gap-5">
          {/* Água */}
          <section aria-labelledby="water-title" className="flex flex-col gap-3">
            <SectionTitle>
              <span id="water-title">Água</span>
            </SectionTitle>
            <Card className="flex items-center gap-4">
              <button onClick={() => openSheet("water")} aria-label="Abrir controle de água">
                <Ring value={day.waterMl} max={day.goal?.water_ml ?? 2500} size={76} stroke={8} color="var(--water)" label="Água consumida">
                  <Droplet className="h-5 w-5 text-water" aria-hidden />
                </Ring>
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-extrabold">
                  {fmtLiters(day.waterMl)} <span className="text-sm font-semibold text-muted">/ {fmtLiters(day.goal?.water_ml ?? 2500)} L</span>
                </p>
                <p className="text-sm text-muted">{day.water.length} registro(s) hoje</p>
              </div>
              <Button variant="soft" size="sm" onClick={quickWater}>
                +250 ml
              </Button>
            </Card>
          </section>

          {/* Exercício */}
          <section aria-labelledby="ex-title" className="flex flex-col gap-3">
            <SectionTitle>
              <span id="ex-title">Exercício</span>
            </SectionTitle>
            <Card className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-warn/15 text-warn">
                <Flame className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xl font-extrabold">
                  {fmt(day.burned)} <span className="text-sm font-semibold text-muted">kcal gastas</span>
                </p>
                <p className="truncate text-sm text-muted">
                  {day.activities.length ? day.activities.map((a) => `${ACTIVITIES[a.activity].label} ${a.duration_min} min`).join(", ") : "Nenhuma atividade hoje"}
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={() => openSheet("activity")}>
                Registrar
              </Button>
            </Card>
          </section>

          {/* Treino de hoje */}
          <section aria-labelledby="workout-title" className="flex flex-col gap-3">
            <SectionTitle
              action={
                <Link href="/treinos" className="flex items-center text-sm font-semibold text-brand-strong">
                  Ver treinos <ChevronRight className="h-4 w-4" />
                </Link>
              }
            >
              <span id="workout-title">Treino de hoje</span>
            </SectionTitle>
            {todayWorkouts.loading ? (
              <Skeleton className="h-20 rounded-[var(--radius-card)]" />
            ) : todayWorkouts.data?.length ? (
              <ul className="flex flex-col gap-2">
                {todayWorkouts.data.map((w) => (
                  <li key={w.id}>
                    <Link href={`/treinos/${w.id}`} className="block">
                      <Card className="flex items-center gap-4 transition-transform active:scale-[0.99]">
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-soft text-brand-strong">
                          <Dumbbell className="h-6 w-6" aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{w.name}</p>
                          <p className="truncate text-sm text-muted">
                            {w.workout_exercises?.length ?? 0} exercícios · {fmt(workoutVolume(w.workout_exercises ?? []))} kg
                            {w.duration_min ? ` · ${w.duration_min} min` : ""}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 shrink-0 text-muted" aria-hidden />
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <Card className="flex items-center gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-surface-2 text-muted">
                  <Dumbbell className="h-6 w-6" aria-hidden />
                </span>
                <p className="min-w-0 flex-1 text-sm text-muted">Nenhum treino registrado hoje</p>
                <Link href="/treinos/novo" className="shrink-0 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-on-brand">
                  Registrar
                </Link>
              </Card>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
