import type { ActivityLevel, DietPreference, Goal, Pace, Sex } from "./types";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very: 1.725,
  extreme: 1.9,
};

export const ACTIVITY_LABELS: Record<ActivityLevel, { title: string; hint: string }> = {
  sedentary: { title: "Sedentário", hint: "Pouco ou nenhum exercício" },
  light: { title: "Levemente ativo", hint: "Exercício leve 1 a 3 vezes por semana" },
  moderate: { title: "Moderadamente ativo", hint: "Exercício 3 a 5 vezes por semana" },
  very: { title: "Muito ativo", hint: "Exercício intenso 6 a 7 vezes por semana" },
  extreme: { title: "Extremamente ativo", hint: "Treino pesado diário ou trabalho físico" },
};

export const GOAL_LABELS: Record<Goal, string> = {
  lose: "Perder peso",
  maintain: "Manter peso",
  gain: "Ganhar massa muscular",
  recomp: "Recomposição corporal",
};

export const PACE_LABELS: Record<Pace, { title: string; lose: string; gain: string }> = {
  slow: { title: "Mais lenta", lose: "cerca de 0,25 kg por semana", gain: "cerca de 0,1 kg por semana" },
  moderate: { title: "Moderada", lose: "cerca de 0,5 kg por semana", gain: "cerca de 0,25 kg por semana" },
  fast: { title: "Mais rápida", lose: "cerca de 0,75 kg por semana", gain: "cerca de 0,4 kg por semana" },
};

export const DIET_LABELS: Record<DietPreference, { title: string; hint: string }> = {
  normal: { title: "Normal", hint: "Divisão equilibrada dos macros" },
  low_carb: { title: "Low Carb", hint: "Carboidrato limitado a 25% das calorias" },
  high_protein: { title: "High Protein", hint: "Mais proteína por kg de peso" },
  vegetarian: { title: "Vegetariana", hint: "Mesmas metas; só muda o que você registra" },
  vegan: { title: "Vegana", hint: "Mesmas metas; só muda o que você registra" },
  custom: { title: "Personalizada", hint: "Você define os macros manualmente" },
};

/** Energia de 1 kg de gordura corporal, aproximação usada para o déficit/superávit. */
const KCAL_PER_KG = 7700;

const WEEKLY_KG: Record<"lose" | "gain", Record<Pace, number>> = {
  lose: { slow: 0.25, moderate: 0.5, fast: 0.75 },
  gain: { slow: 0.1, moderate: 0.25, fast: 0.4 },
};

/** Proteína em g por kg de peso corporal, por objetivo. */
const PROTEIN_PER_KG: Record<Goal, number> = { lose: 2.0, maintain: 1.6, gain: 1.8, recomp: 2.2 };

export interface GoalInput {
  sex: Sex;
  age: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: Goal;
  pace: Pace;
  diet?: DietPreference;
}

export interface Targets {
  bmr: number;
  tdee: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  /** o piso de segurança foi aplicado */
  floored: boolean;
}

/** Taxa metabólica basal pela equação de Mifflin-St Jeor. */
export function bmrMifflin(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === "male" ? 5 : -161);
}

export function computeTargets(i: GoalInput): Targets {
  const bmr = bmrMifflin(i.sex, i.weightKg, i.heightCm, i.age);
  const tdee = bmr * ACTIVITY_FACTORS[i.activity];

  let kcal = tdee;
  if (i.goal === "lose") kcal = tdee - (WEEKLY_KG.lose[i.pace] * KCAL_PER_KG) / 7;
  else if (i.goal === "gain") kcal = tdee + (WEEKLY_KG.gain[i.pace] * KCAL_PER_KG) / 7;
  else if (i.goal === "recomp") kcal = tdee * 0.9;

  // Piso: nunca abaixo do metabolismo basal nem de 1200 (mulheres) / 1500 (homens) kcal.
  const floor = Math.max(bmr, i.sex === "male" ? 1500 : 1200);
  const floored = kcal < floor;
  kcal = Math.round(Math.max(kcal, floor) / 10) * 10;

  let proteinPerKg = PROTEIN_PER_KG[i.goal];
  if (i.diet === "high_protein") proteinPerKg += 0.4;
  let protein = Math.round(proteinPerKg * i.weightKg);
  // Proteína nunca passa de 35% das calorias.
  protein = Math.min(protein, Math.round((kcal * 0.35) / 4));

  let fat = Math.round(Math.max(0.8 * i.weightKg, (kcal * 0.2) / 9));
  let carbs = Math.round((kcal - protein * 4 - fat * 9) / 4);

  if (i.diet === "low_carb") {
    const maxCarbs = Math.round((kcal * 0.25) / 4);
    if (carbs > maxCarbs) {
      fat = Math.round(fat + ((carbs - maxCarbs) * 4) / 9);
      carbs = maxCarbs;
    }
  }
  carbs = Math.max(0, carbs);

  // Limites do banco (tabela goals) — só atingidos em casos extremos de peso/atividade.
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kcal: clamp(kcal, 800, 8000),
    protein_g: clamp(protein, 0, 600),
    carbs_g: clamp(carbs, 0, 1200),
    fat_g: clamp(fat, 0, 400),
    fiber_g: clamp(Math.round((kcal / 1000) * 14), 0, 150),
    water_ml: clamp(Math.round((i.weightKg * 35) / 50) * 50, 500, 8000),
    floored,
  };
}

/** Kcal a partir dos macros (4/4/9), usado quando o usuário edita os macros à mão. */
export function kcalFromMacros(protein: number, carbs: number, fat: number) {
  return Math.round(protein * 4 + carbs * 4 + fat * 9);
}

/**
 * Progresso rumo ao peso-meta, de 0 a 100.
 * Serve tanto para perder quanto para ganhar peso.
 */
export function weightProgress(start: number | null | undefined, current: number | null | undefined, target: number | null | undefined): number {
  if (start == null || current == null || target == null) return 0;
  const total = target - start;
  if (total === 0) return 100;
  const done = current - start;
  return Math.max(0, Math.min(100, Math.round((done / total) * 100)));
}

export function bmi(weightKg: number, heightCm: number) {
  const h = heightCm / 100;
  return weightKg / (h * h);
}
