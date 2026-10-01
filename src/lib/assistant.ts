import type { Food, FoodEntry, GoalRow, Macros, Meal, RecipeWithIngredients } from "./types";
import { assessMeal, entryMacros, macrosForGrams, recipeTotals, sumMacros } from "./nutrition";
import { fmt, fmt1 } from "./format";

/**
 * Assistente Nutri — responde usando SOMENTE os dados registrados pelo usuário.
 * Esta versão é local e baseada em regras (rápida, gratuita, sem enviar dados para fora).
 * Para usar um modelo de linguagem no futuro, crie outro AssistantProvider que chame uma rota
 * do servidor (/api/assistente) passando este mesmo contexto; a interface fica igual.
 */
export interface AssistantContext {
  totals: Macros;
  goal: GoalRow | null;
  burned: number;
  meals: Meal[];
  entries: FoodEntry[];
  foods: Food[]; // recentes + favoritos + ricos em proteína
  recipes: RecipeWithIngredients[];
}

export interface AssistantProvider {
  answer(question: string, ctx: AssistantContext): Promise<string>;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export const SUGGESTIONS = [
  "Quanto eu ainda posso comer hoje?",
  "Quanto de proteína falta?",
  "Minha refeição está equilibrada?",
  "Quais alimentos têm muita proteína?",
  "Me sugira um jantar com 500 kcal.",
];

export const localAssistant: AssistantProvider = {
  async answer(question, ctx) {
    const q = norm(question);
    if (!ctx.goal) return "Ainda não encontrei suas metas. Defina-as em Perfil → Alterar metas e pergunte de novo.";

    if (/(jantar|almoco|lanche|refeicao|cafe).*(\d{2,4})\s*kcal|sugir|sugest/.test(q)) return suggestMeal(q, ctx);
    if (/proteina/.test(q) && /(falta|faltam|resta|ainda)/.test(q)) return proteinLeft(ctx);
    if (/(muita|mais|rico|ricos|alta).*proteina|proteina.*(alimento|comida)/.test(q)) return proteinFoods(ctx);
    if (/equilibrad|balancead/.test(q)) return mealBalance(q, ctx);
    if (/(posso comer|resta|restam|sobra|falta|ainda)/.test(q)) return remaining(ctx);

    return `Posso responder com base no seu diário. Experimente:\n• ${SUGGESTIONS.join("\n• ")}`;
  },
};

function remaining(ctx: AssistantContext) {
  const g = ctx.goal!;
  const budget = g.kcal + ctx.burned;
  const left = budget - ctx.totals.kcal;
  const p = g.protein_g - ctx.totals.protein, c = g.carbs_g - ctx.totals.carbs, f = g.fat_g - ctx.totals.fat;
  const exercise = ctx.burned > 0 ? ` (sua meta de ${fmt(g.kcal)} mais ${fmt(ctx.burned)} kcal de exercício)` : "";
  if (left <= 0) {
    return `Você já consumiu ${fmt(ctx.totals.kcal)} kcal, ${fmt(-left)} acima do planejado para hoje${exercise}. Se ainda sentir fome, prefira verduras, legumes ou uma fonte magra de proteína.`;
  }
  return [
    `Ainda cabem ${fmt(left)} kcal hoje${exercise}.`,
    `Faltam ${fmt(Math.max(0, p))} g de proteína, ${fmt(Math.max(0, c))} g de carboidrato e ${fmt(Math.max(0, f))} g de gordura.`,
  ].join("\n");
}

function proteinLeft(ctx: AssistantContext) {
  const need = ctx.goal!.protein_g - ctx.totals.protein;
  if (need <= 0) return `Meta de proteína batida: ${fmt(ctx.totals.protein)} g de ${fmt(ctx.goal!.protein_g)} g.`;
  const best = densest(ctx.foods, 1)[0];
  const tip = best ? ` Por exemplo, ${fmt((need / best.protein_100g) * 100)} g de ${best.name} cobririam isso (${fmt(macrosForGrams(best, (need / best.protein_100g) * 100).kcal)} kcal).` : "";
  return `Faltam ${fmt(need)} g de proteína para a meta de ${fmt(ctx.goal!.protein_g)} g.${tip}`;
}

function densest(foods: Food[], n: number) {
  const seen = new Set<string>();
  return foods
    .filter((f) => f.kcal_100g > 20 && f.protein_100g > 0 && !seen.has(f.id) && seen.add(f.id))
    .sort((a, b) => b.protein_100g / b.kcal_100g - a.protein_100g / a.kcal_100g)
    .slice(0, n);
}

function proteinFoods(ctx: AssistantContext) {
  const list = densest(ctx.foods, 6);
  if (!list.length) return "Ainda não tenho alimentos seus para comparar. Registre ou cadastre alguns e pergunte de novo.";
  return (
    "Entre os alimentos que você usa ou tem salvos, estes têm mais proteína por caloria:\n" +
    list.map((f) => `• ${f.name}: ${fmt1(f.protein_100g)} g de proteína em 100 g (${fmt(f.kcal_100g)} kcal)`).join("\n")
  );
}

function mealBalance(q: string, ctx: AssistantContext) {
  const named = ctx.meals.find((m) => q.includes(norm(m.name)));
  const withItems = ctx.meals.filter((m) => ctx.entries.some((e) => e.meal_id === m.id));
  const meal = named ?? withItems.at(-1);
  if (!meal) return "Ainda não há refeições registradas hoje.";
  const items = ctx.entries.filter((e) => e.meal_id === meal.id);
  if (!items.length) return `Não há itens em ${meal.name} hoje.`;
  const m = sumMacros(items.map(entryMacros));
  const r = assessMeal(m);
  const head = `${meal.name}: ${fmt(m.kcal)} kcal, ${fmt(m.protein)} g de proteína, ${fmt(m.carbs)} g de carboidrato, ${fmt(m.fat)} g de gordura e ${fmt(m.fiber)} g de fibra.`;
  return r.balanced ? `${head}\nEstá bem distribuída: boa proteína, gordura moderada e fibra presente.` : `${head}\n${r.notes.join("\n")}`;
}

function suggestMeal(q: string, ctx: AssistantContext) {
  const match = q.match(/(\d{2,4})\s*kcal/);
  const target = match ? Number(match[1]) : Math.max(300, Math.round((ctx.goal!.kcal + ctx.burned - ctx.totals.kcal) / 10) * 10);
  if (target < 100) return "Você já está no limite de calorias de hoje.";

  // 1) Uma receita sua que chegue perto do alvo.
  let best: { text: string; diff: number } | null = null;
  for (const r of ctx.recipes) {
    const t = recipeTotals(r.recipe_ingredients, r.servings);
    if (t.perServing.kcal <= 0) continue;
    const portions = Math.max(0.5, Math.round((target / t.perServing.kcal) * 2) / 2);
    const kcal = t.perServing.kcal * portions;
    const diff = Math.abs(kcal - target) / target;
    if (diff < 0.15 && (!best || diff < best.diff)) {
      best = { diff, text: `${fmt1(portions)} ${portions === 1 ? "porção" : "porções"} de ${r.name}: ${fmt(kcal)} kcal, ${fmt(t.perServing.protein * portions)} g de proteína.` };
    }
  }
  if (best) return `Com as suas receitas: ${best.text}`;

  // 2) Uma proteína + um carboidrato dos seus alimentos, 40% / 60% das calorias.
  const protein = densest(ctx.foods, 1)[0];
  const carb = [...ctx.foods].filter((f) => f.id !== protein?.id && f.carbs_100g > f.protein_100g * 2 && f.kcal_100g > 40).sort((a, b) => b.carbs_100g - a.carbs_100g)[0];
  if (!protein || !carb) return `Para sugerir um prato de ${fmt(target)} kcal preciso conhecer mais alimentos seus. Registre algumas refeições ou crie uma receita.`;
  const gp = Math.round(((target * 0.4) / protein.kcal_100g) * 100 / 5) * 5;
  const gc = Math.round(((target * 0.6) / carb.kcal_100g) * 100 / 5) * 5;
  const m = sumMacros([macrosForGrams(protein, gp), macrosForGrams(carb, gc)]);
  return [
    `Uma opção com ${fmt(m.kcal)} kcal, usando alimentos que você já registrou:`,
    `• ${gp} g de ${protein.name}`,
    `• ${gc} g de ${carb.name}`,
    `• Salada ou legumes à vontade`,
    `Total: ${fmt(m.protein)} g de proteína, ${fmt(m.carbs)} g de carboidrato e ${fmt(m.fat)} g de gordura.`,
  ].join("\n");
}
