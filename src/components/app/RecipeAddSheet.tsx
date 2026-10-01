"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { addEntry } from "@/data/diary";
import { errorMessage } from "@/data/base";
import { invalidate } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { recipeTotals } from "@/lib/nutrition";
import type { Meal, RecipeWithIngredients } from "@/lib/types";
import { fmt, fmt1, parseNum } from "@/lib/format";
import { today } from "@/lib/dates";
import { defaultMeal } from "./AddFoodSheet";

export function RecipeAddSheet({
  recipe,
  meals,
  mealId,
  date = today(),
  onClose,
}: {
  recipe: RecipeWithIngredients | null;
  meals: Meal[];
  mealId?: string | null;
  date?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [qty, setQty] = useState("1");
  const [meal, setMeal] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!recipe) return;
    setQty("1");
    setMeal(mealId && meals.some((m) => m.id === mealId) ? mealId : defaultMeal(meals));
  }, [recipe, mealId, meals]);

  if (!recipe) return null;
  const t = recipeTotals(recipe.recipe_ingredients, recipe.servings);
  const n = parseNum(qty) ?? 0;
  const r = (x: number) => Math.round(x * 10) / 10;

  async function add() {
    if (!recipe) return;
    if (n <= 0 || n > 50) return toast.error("Informe entre 0,1 e 50 porções.");
    if (t.gramsPerServing <= 0) return toast.error("Essa receita ainda não tem ingredientes.");
    if (!meal) return toast.error("Escolha a refeição.");
    setBusy(true);
    try {
      await addEntry({
        entry_date: date,
        meal_id: meal,
        food_id: null,
        recipe_id: recipe.id,
        name: recipe.name,
        brand: null,
        quantity: n,
        unit: "portion",
        grams: r(t.gramsPerServing * n),
        kcal: r(t.perServing.kcal * n),
        protein_g: r(t.perServing.protein * n),
        carbs_g: r(t.perServing.carbs * n),
        fat_g: r(t.perServing.fat * n),
        fiber_g: r(t.perServing.fiber * n),
      });
      invalidate(keys.entries(date), keys.charts);
      toast.success(`${recipe.name} adicionada.`);
      onClose();
      router.push(`/diario${date !== today() ? `?data=${date}` : ""}#meal-${meal}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={!!recipe} onClose={onClose} title={recipe.name}>
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-surface-2 p-4">
          <p className="text-sm text-muted">
            Por porção · {fmt1(t.gramsPerServing)} g · rende {fmt1(recipe.servings)}
          </p>
          <p className="mt-1 text-3xl font-extrabold">
            {fmt(t.perServing.kcal * n)} <span className="text-base font-semibold text-muted">kcal</span>
          </p>
          <p className="mt-1 text-sm text-muted">
            P {fmt1(t.perServing.protein * n)} g · C {fmt1(t.perServing.carbs * n)} g · G {fmt1(t.perServing.fat * n)} g
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Porções</span>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Refeição</span>
            <Select value={meal} onChange={(e) => setMeal(e.target.value)}>
              {meals.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </label>
        </div>
        <Button size="lg" block onClick={add} loading={busy}>
          {n === 1 ? "Adicionar 1 porção ao diário" : `Adicionar ${fmt1(n)} porções ao diário`}
        </Button>
      </div>
    </Sheet>
  );
}
