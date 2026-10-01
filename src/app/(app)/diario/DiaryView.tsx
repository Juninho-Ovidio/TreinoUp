"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Copy, Droplet, Flame, Plus, Trash2 } from "lucide-react";
import { MacroBars } from "@/components/app/Nutrition";
import { MealIcon } from "@/components/app/MealIcon";
import { EntryEditSheet, quantityLabel } from "@/components/app/EntryEditSheet";
import { ActivitySheet, WaterSheet } from "@/components/app/GlobalSheets";
import { ButtonLink } from "@/components/ui/Button";
import { HeaderBar } from "@/components/ui/HeaderBar";
import { Card, EmptyState, Skeleton } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { keys, useDay } from "@/hooks/useDay";
import { invalidate } from "@/hooks/useQuery";
import { copyMeal, deleteActivity } from "@/data/diary";
import { errorMessage } from "@/data/base";
import { addDays, relativeDayLabel, today } from "@/lib/dates";
import { fmt, fmtLiters } from "@/lib/format";
import { entryMacros, sumMacros } from "@/lib/nutrition";
import { ACTIVITIES } from "@/lib/exercise";
import type { FoodEntry } from "@/lib/types";

export function DiaryView() {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const confirm = useConfirm();
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") ?? "") ? params.get("data")! : today();
  const day = useDay(date);
  const [editing, setEditing] = useState<FoodEntry | null>(null);
  const [waterOpen, setWaterOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);

  const go = (d: string) => router.replace(d === today() ? "/diario" : `/diario?data=${d}`, { scroll: false });
  const budget = (day.goal?.kcal ?? 0) + day.burned;
  const remaining = budget - day.totals.kcal;

  async function copyYesterday(mealId: string, mealName: string) {
    try {
      const n = await copyMeal(addDays(date, -1), mealId, date);
      if (!n) return toast.info(`Não há itens em ${mealName} no dia anterior.`);
      invalidate(keys.entries(date), keys.charts);
      toast.success(`${n} ${n === 1 ? "item copiado" : "itens copiados"} de ontem.`);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  async function removeActivity(id: string, label: string) {
    if (!(await confirm({ title: "Remover exercício?", text: label, confirmLabel: "Remover", danger: true }))) return;
    try {
      await deleteActivity(id);
      invalidate(keys.activities(date), keys.charts);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  return (
    <main className="flex flex-col gap-4">
      <HeaderBar className="justify-between">
        <h1 className="pl-1 text-[19px] font-extrabold tracking-tight">Diário</h1>
        <div className="flex items-center gap-0.5 rounded-2xl bg-white/10 p-0.5">
          <button onClick={() => go(addDays(date, -1))} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10" aria-label="Dia anterior">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <label className="relative min-w-[92px] cursor-pointer text-center text-sm font-bold">
            {relativeDayLabel(date)}
            <input
              type="date"
              value={date}
              max={today()}
              onChange={(e) => e.target.value && go(e.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Escolher data"
            />
          </label>
          <button
            onClick={() => go(addDays(date, 1))}
            disabled={date >= today()}
            className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"
            aria-label="Próximo dia"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </HeaderBar>

      {/* Resumo do dia */}
      <Card className="flex flex-col gap-4">
        {day.loading ? (
          <Skeleton className="h-24" />
        ) : (
          <>
            <div className="grid grid-cols-3 text-center">
              <Summary label="Meta" value={fmt(budget)} />
              <Summary label="Consumidas" value={fmt(day.totals.kcal)} />
              <Summary label={remaining < 0 ? "Acima" : "Restantes"} value={fmt(Math.abs(remaining))} tone={remaining < 0 ? "warn" : "brand"} />
            </div>
            <MacroBars totals={day.totals} goal={day.goal} compact />
          </>
        )}
      </Card>

      {day.loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-40 rounded-[var(--radius-card)]" />)
      ) : day.error ? (
        <Card>
          <EmptyState title="Não foi possível carregar o diário" text={errorMessage(day.error)} action={<button className="font-semibold text-brand-strong" onClick={() => day.refresh()}>Tentar de novo</button>} />
        </Card>
      ) : (
        <>
          {day.entries.length === 0 && (
            <Card>
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                title="Seu diário está vazio."
                text="Comece adicionando sua primeira refeição."
                action={
                  <ButtonLink href={`/alimentos/buscar?refeicao=${day.meals[0]?.id ?? ""}${date !== today() ? `&data=${date}` : ""}`}>
                    <Plus className="h-4 w-4" /> Adicionar alimento
                  </ButtonLink>
                }
              />
            </Card>
          )}

          {day.meals.map((meal) => {
            const items = day.byMeal.get(meal.id) ?? [];
            const sub = sumMacros(items.map(entryMacros));
            const addHref = `/alimentos/buscar?refeicao=${meal.id}${date !== today() ? `&data=${date}` : ""}`;
            return (
              <Card key={meal.id} id={`meal-${meal.id}`} className="scroll-mt-24 p-0">
                <div className="flex items-center gap-3 px-5 pb-2 pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-surface-2 text-muted">
                    <MealIcon name={meal.icon} className="h-[18px] w-[18px]" />
                  </span>
                  <h2 className="flex-1 text-[13px] font-extrabold uppercase tracking-[0.08em]">{meal.name}</h2>
                  <span className="text-sm font-extrabold">{fmt(sub.kcal)} kcal</span>
                </div>
                {items.length > 0 && (
                  <ul className="px-2">
                    {items.map((e) => (
                      <li key={e.id} className="animate-enter">
                        <button onClick={() => setEditing(e)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-surface-2">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold">{e.name}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {quantityLabel(e)}
                              {e.brand ? ` · ${e.brand}` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-bold">{fmt(e.kcal)} kcal</span>
                            <span className="block text-[11px] text-muted">
                              P {fmt(e.protein_g)} · C {fmt(e.carbs_g)} · G {fmt(e.fat_g)}
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
                  <Link href={addHref} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">
                    <Plus className="h-4 w-4" /> Adicionar alimento
                  </Link>
                  {items.length > 0 ? (
                    <span className="pr-2 text-[12px] text-muted">
                      P {fmt(sub.protein)} g · C {fmt(sub.carbs)} g · G {fmt(sub.fat)} g
                    </span>
                  ) : (
                    <button onClick={() => copyYesterday(meal.id, meal.name)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:bg-surface-2">
                      <Copy className="h-4 w-4" /> Copiar de ontem
                    </button>
                  )}
                </div>
              </Card>
            );
          })}

          {/* Exercício e água do dia */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="p-0">
              <div className="flex items-center gap-3 px-5 pb-2 pt-4">
                <Flame className="h-5 w-5 text-warn" aria-hidden />
                <h2 className="flex-1 text-[13px] font-extrabold uppercase tracking-[0.08em]">Exercício</h2>
                <span className="text-sm font-extrabold">−{fmt(day.burned)} kcal</span>
              </div>
              <ul className="px-2">
                {day.activities.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-3 py-2">
                    <span className="min-w-0 flex-1 text-sm">
                      <b>{ACTIVITIES[a.activity].label}</b> · {a.duration_min} min{a.distance_km ? ` · ${String(a.distance_km).replace(".", ",")} km` : ""}
                    </span>
                    <span className="text-sm font-bold">{a.kcal} kcal</span>
                    <button onClick={() => removeActivity(a.id, ACTIVITIES[a.activity].label)} className="rounded-full p-1.5 text-muted hover:text-danger" aria-label="Remover exercício">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="border-t border-line px-3 py-2">
                <button onClick={() => setActivityOpen(true)} className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-bold text-brand-strong hover:bg-brand-soft">
                  <Plus className="h-4 w-4" /> Adicionar exercício
                </button>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <Droplet className="h-6 w-6 text-water" aria-hidden />
              <div className="flex-1">
                <p className="text-[13px] font-extrabold uppercase tracking-[0.08em]">Água</p>
                <p className="text-sm text-muted">
                  {fmtLiters(day.waterMl)} de {fmtLiters(day.goal?.water_ml ?? 2500)} L
                </p>
              </div>
              <button onClick={() => setWaterOpen(true)} className="h-10 rounded-full px-4 text-sm font-bold text-brand-strong hover:bg-brand-soft">
                Registrar
              </button>
            </Card>
          </div>
        </>
      )}

      <EntryEditSheet entry={editing} meals={day.meals} onClose={() => setEditing(null)} />
      <WaterSheet open={waterOpen} onClose={() => setWaterOpen(false)} date={date} />
      <ActivitySheet open={activityOpen} onClose={() => setActivityOpen(false)} date={date} />
    </main>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "brand" | "warn" }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      <p className={`text-xl font-extrabold ${tone === "brand" ? "text-brand-strong" : tone === "warn" ? "text-warn" : ""}`}>{value}</p>
    </div>
  );
}
