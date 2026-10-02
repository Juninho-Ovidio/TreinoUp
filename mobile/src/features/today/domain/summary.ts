/**
 * Resumo do dia do TreinoUp (mesmas regras do site: src/components/app/Nutrition.tsx e src/hooks/useDay.ts).
 * Orçamento do dia = meta de kcal + kcal gastas em exercício; restante = orçamento − consumido.
 */

export interface GoalRow {
  effective_from: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  water_ml: number;
}

export interface EntryRow {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DaySummary {
  hasGoal: boolean;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  waterMl: number;
  burned: number;
  /** Meta de kcal do dia, somada ao que foi gasto em exercício. */
  budget: number;
  /** Positivo = ainda pode comer; negativo = passou da meta. */
  remaining: number;
  goal: GoalRow | null;
}

/** "AAAA-MM-DD" no fuso do aparelho (o diário do site usa a data local). */
export function localISODate(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Meta vigente: a de maior `effective_from` até a data; antes da primeira meta, usa a primeira. */
export function pickGoal(goals: readonly GoalRow[], date: string): GoalRow | null {
  if (!goals.length) return null;
  const sorted = [...goals].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  let current: GoalRow | null = null;
  for (const g of sorted) if (g.effective_from <= date) current = g;
  return current ?? sorted[0]!;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);

export function summarizeDay({
  goal,
  entries,
  waterMl,
  burnedKcal,
}: {
  goal: GoalRow | null;
  entries: readonly EntryRow[];
  waterMl: readonly number[];
  burnedKcal: readonly number[];
}): DaySummary {
  const totals = entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + num(e.kcal),
      protein: acc.protein + num(e.protein_g),
      carbs: acc.carbs + num(e.carbs_g),
      fat: acc.fat + num(e.fat_g),
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  const burned = burnedKcal.reduce((a, b) => a + num(b), 0);
  const budget = (goal?.kcal ?? 0) + burned;
  return {
    hasGoal: !!goal,
    ...totals,
    waterMl: waterMl.reduce((a, b) => a + num(b), 0),
    burned,
    budget,
    remaining: budget - totals.kcal,
    goal,
  };
}

export type GreetingKey = "today.morning" | "today.afternoon" | "today.evening" | "today.night";

/** Saudação pela hora do aparelho, como no site. */
export function greetingKey(hour: number): GreetingKey {
  if (hour < 5) return "today.night";
  if (hour < 12) return "today.morning";
  if (hour < 18) return "today.afternoon";
  return "today.evening";
}

/** Porcentagem inteira (0 quando não há meta). */
export function percentOf(value: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.round((value / goal) * 100);
}
