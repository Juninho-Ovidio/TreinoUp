import type { AnyFood, EntryUnit, Food, FoodEntry, Macros } from "./types";

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros de uma quantidade em gramas de um alimento cujos valores são por 100 g. */
export function macrosForGrams(food: Pick<AnyFood, "kcal_100g" | "protein_100g" | "carbs_100g" | "fat_100g" | "fiber_100g">, grams: number): Macros {
  const f = Math.max(0, grams) / 100;
  return {
    kcal: round1(food.kcal_100g * f),
    protein: round1(food.protein_100g * f),
    carbs: round1(food.carbs_100g * f),
    fat: round1(food.fat_100g * f),
    fiber: round1((food.fiber_100g ?? 0) * f),
  };
}

export function sumMacros(list: Macros[]): Macros {
  const s = list.reduce(
    (a, b) => ({
      kcal: a.kcal + b.kcal,
      protein: a.protein + b.protein,
      carbs: a.carbs + b.carbs,
      fat: a.fat + b.fat,
      fiber: a.fiber + b.fiber,
    }),
    { ...ZERO },
  );
  return { kcal: round1(s.kcal), protein: round1(s.protein), carbs: round1(s.carbs), fat: round1(s.fat), fiber: round1(s.fiber) };
}

export function entryMacros(e: Pick<FoodEntry, "kcal" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g">): Macros {
  return { kcal: e.kcal, protein: e.protein_g, carbs: e.carbs_g, fat: e.fat_g, fiber: e.fiber_g };
}

export interface UnitOption {
  unit: EntryUnit;
  label: string;
  /** gramas por 1 unidade desta opção */
  grams: number;
}

/** Opções de medida disponíveis para um alimento: 100 g, 1 unidade, 1 porção, gramas livres. */
export function unitOptions(food: Pick<AnyFood, "unit_name" | "unit_g" | "serving_name" | "serving_g">, liquid = false): UnitOption[] {
  const base = liquid ? "ml" : "g";
  const opts: UnitOption[] = [{ unit: base, label: base, grams: 1 }];
  if (food.unit_g && food.unit_g > 0) {
    opts.push({ unit: "unit", label: `${food.unit_name || "unidade"} (${fmtNum(food.unit_g)} ${base})`, grams: food.unit_g });
  }
  if (food.serving_g && food.serving_g > 0) {
    opts.push({ unit: "serving", label: `${food.serving_name || "porção"} (${fmtNum(food.serving_g)} ${base})`, grams: food.serving_g });
  }
  return opts;
}

export function gramsFor(quantity: number, option: UnitOption): number {
  return round1(Math.max(0, quantity) * option.grams);
}

function fmtNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/** Dados de um alimento prontos para gravar no diário (cópia dos valores). */
export function buildEntryValues(food: Food, quantity: number, option: UnitOption) {
  const grams = gramsFor(quantity, option);
  const m = macrosForGrams(food, grams);
  return {
    food_id: food.id,
    recipe_id: null as string | null,
    name: food.name,
    brand: food.brand,
    quantity,
    unit: option.unit,
    grams,
    kcal: m.kcal,
    protein_g: m.protein,
    carbs_g: m.carbs,
    fat_g: m.fat,
    fiber_g: m.fiber,
  };
}

// ---------- Receitas ----------

export interface RecipeTotals {
  total: Macros;
  perServing: Macros;
  totalGrams: number;
  gramsPerServing: number;
}

export function recipeTotals(ingredients: { grams: number; food: Pick<Food, "kcal_100g" | "protein_100g" | "carbs_100g" | "fat_100g" | "fiber_100g"> }[], servings: number): RecipeTotals {
  const total = sumMacros(ingredients.map((i) => macrosForGrams(i.food, i.grams)));
  const s = servings > 0 ? servings : 1;
  const totalGrams = ingredients.reduce((a, i) => a + i.grams, 0);
  return {
    total,
    perServing: {
      kcal: round1(total.kcal / s),
      protein: round1(total.protein / s),
      carbs: round1(total.carbs / s),
      fat: round1(total.fat / s),
      fiber: round1(total.fiber / s),
    },
    totalGrams: round1(totalGrams),
    gramsPerServing: round1(totalGrams / s),
  };
}

// ---------- Metas e progresso ----------

export function pct(value: number, goal: number): number {
  if (!goal || goal <= 0) return 0;
  return Math.round((value / goal) * 100);
}

/** Divisão das calorias entre proteína, carboidrato e gordura (percentuais que somam ~100). */
export function macroSplit(m: Macros) {
  const p = m.protein * 4, c = m.carbs * 4, f = m.fat * 9;
  const total = p + c + f;
  if (total === 0) return { protein: 0, carbs: 0, fat: 0 };
  return { protein: Math.round((p / total) * 100), carbs: Math.round((c / total) * 100), fat: Math.round((f / total) * 100) };
}

/**
 * Avalia se uma refeição está equilibrada (critério simples, não é orientação clínica):
 * proteína >= 20% das kcal, gordura <= 40%, e fibra presente em refeições acima de 300 kcal.
 */
export function assessMeal(m: Macros): { balanced: boolean; notes: string[] } {
  const notes: string[] = [];
  if (m.kcal < 50) return { balanced: false, notes: ["A refeição ainda tem poucos itens para avaliar."] };
  const split = macroSplit(m);
  if (split.protein < 20) notes.push(`Proteína baixa (${split.protein}% das calorias). Uma fonte de proteína ajudaria.`);
  if (split.fat > 40) notes.push(`Gordura alta (${split.fat}% das calorias).`);
  if (m.kcal > 300 && m.fiber < 3) notes.push("Pouca fibra. Verduras, legumes, frutas ou grãos integrais completam o prato.");
  return { balanced: notes.length === 0, notes };
}
