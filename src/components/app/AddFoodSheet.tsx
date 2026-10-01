"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { addEntry } from "@/data/diary";
import { saveExternal, setFavorite } from "@/data/foods";
import { errorMessage } from "@/data/base";
import { invalidate } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { buildEntryValues, macrosForGrams, unitOptions } from "@/lib/nutrition";
import type { AnyFood, Meal } from "@/lib/types";
import { fmt, fmt1, parseNum } from "@/lib/format";
import { today } from "@/lib/dates";
import { cn } from "@/lib/cn";

export const SOURCE_LABEL: Record<string, string> = {
  custom: "Meu alimento",
  openfoodfacts: "Open Food Facts",
  taco: "Tabela TACO",
  usda: "USDA",
  import: "Importado",
};

/**
 * Detalhe do alimento: escolher medida (100 g, unidade, porção ou personalizada),
 * ver os nutrientes e adicionar a uma refeição.
 */
export function AddFoodSheet({
  food,
  meals,
  mealId,
  date = today(),
  favorite,
  onClose,
  onFavoriteChange,
}: {
  food: AnyFood | null;
  meals: Meal[];
  mealId?: string | null;
  date?: string;
  favorite?: boolean;
  onClose: () => void;
  onFavoriteChange?: (foodId: string, on: boolean) => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const options = useMemo(() => (food ? unitOptions(food) : []), [food]);
  const [opt, setOpt] = useState(0);
  const [qty, setQty] = useState("100");
  const [meal, setMeal] = useState<string>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!food) return;
    // Começa pela porção/unidade quando existir; senão 100 g.
    const preferred = options.findIndex((o) => o.unit === "serving" || o.unit === "unit");
    setOpt(preferred > 0 ? preferred : 0);
    setQty(preferred > 0 ? "1" : "100");
    setMeal(mealId && meals.some((m) => m.id === mealId) ? mealId : defaultMeal(meals));
  }, [food, options, mealId, meals]);

  if (!food) return null;
  const option = options[opt] ?? options[0];
  const quantity = parseNum(qty) ?? 0;
  const grams = quantity * option.grams;
  const m = macrosForGrams(food, grams);
  const f = (per100: number | null) => (per100 == null ? null : (per100 * grams) / 100);

  async function add() {
    if (!food || quantity <= 0 || grams > 5000) return toast.error("Informe uma quantidade válida.");
    if (!meal) return toast.error("Escolha a refeição.");
    setBusy(true);
    try {
      const saved = await saveExternal(food);
      await addEntry({ ...buildEntryValues(saved, quantity, option), entry_date: date, meal_id: meal });
      invalidate(keys.entries(date), keys.charts, keys.recent);
      toast.success(`${saved.name} adicionado.`);
      onClose();
      router.push(`/diario${date !== today() ? `?data=${date}` : ""}#meal-${meal}`);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function toggleFav() {
    if (!food || !("id" in food) || !food.id) return;
    try {
      await setFavorite(food.id, !favorite);
      onFavoriteChange?.(food.id, !favorite);
      invalidate(keys.favorites);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  const presets = [
    { label: "100 g", opt: 0, qty: "100" },
    ...options.slice(1).map((o, i) => ({ label: o.unit === "unit" ? "1 unidade" : "1 porção", opt: i + 1, qty: "1" })),
  ];

  return (
    <Sheet open={!!food} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold leading-tight">{food.name}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {[food.brand, SOURCE_LABEL[food.source]].filter(Boolean).join(" · ")}
            </p>
          </div>
          {"id" in food && food.id && (
            <button onClick={toggleFav} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2" aria-pressed={!!favorite} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}>
              <Star className={cn("h-6 w-6", favorite ? "fill-carbs text-carbs" : "text-muted")} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label="Medida">
          {presets.map((p) => {
            const on = opt === p.opt && qty === p.qty;
            return (
              <button
                key={p.label + p.opt}
                onClick={() => {
                  setOpt(p.opt);
                  setQty(p.qty);
                }}
                className={cn("h-9 rounded-full px-4 text-sm font-semibold transition-colors", on ? "bg-fg text-bg" : "bg-surface-2 text-fg")}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Quantidade</span>
            <Input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="decimal" aria-label="Quantidade" />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-muted">Medida</span>
            <Select value={opt} onChange={(e) => setOpt(Number(e.target.value))} aria-label="Medida">
              {options.map((o, i) => (
                <option key={o.unit + i} value={i}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        </div>

        <div className="rounded-2xl bg-surface-2 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-muted">{fmt1(grams)} g</span>
            <span className="text-3xl font-extrabold tracking-tight">
              {fmt(m.kcal)} <span className="text-base font-semibold text-muted">kcal</span>
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <Row label="Proteínas" value={m.protein} color="var(--protein)" />
            <Row label="Carboidratos" value={m.carbs} color="var(--carbs)" />
            <Row label="Gorduras" value={m.fat} color="var(--fat)" />
            <Row label="Fibras" value={f(food.fiber_100g)} />
            {food.sugar_100g != null && <Row label="Açúcares" value={f(food.sugar_100g)} />}
            {food.sodium_mg_100g != null && <Row label="Sódio" value={f(food.sodium_mg_100g)} unit="mg" />}
          </dl>
          {food.source === "openfoodfacts" && <p className="mt-3 text-[11px] text-muted">Dados do rótulo enviados por colaboradores do Open Food Facts. Confira com a embalagem.</p>}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-muted">Refeição</span>
          <Select value={meal} onChange={(e) => setMeal(e.target.value)} aria-label="Refeição">
            {meals.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </label>

        <Button size="lg" block onClick={add} loading={busy}>
          Adicionar ao diário
        </Button>
      </div>
    </Sheet>
  );
}

function Row({ label, value, color, unit = "g" }: { label: string; value: number | null; color?: string; unit?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="flex items-center gap-2 text-muted">
        {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />}
        {label}
      </dt>
      <dd className="font-bold">{value == null ? "–" : `${fmt1(value)} ${unit}`}</dd>
    </div>
  );
}

/** Refeição sugerida pelo horário. */
export function defaultMeal(meals: Meal[]): string {
  const h = new Date().getHours();
  const pos = h < 10 ? 0 : h < 15 ? 1 : h < 18 ? 2 : h < 22 ? 3 : 4;
  return (meals.find((m) => m.position === pos) ?? meals[0])?.id ?? "";
}
