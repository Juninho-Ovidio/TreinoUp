"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, SectionTitle, Skeleton } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { IngredientPicker } from "@/components/app/IngredientPicker";
import { RecipeAddSheet } from "@/components/app/RecipeAddSheet";
import { useApp } from "@/components/app/AppProvider";
import { invalidate, useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { countRecipes, deleteRecipe, getRecipe, saveRecipe } from "@/data/recipes";
import { listMeals } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { macrosForGrams, recipeTotals } from "@/lib/nutrition";
import type { Food, RecipeWithIngredients } from "@/lib/types";
import { fmt, fmt1, parseNum } from "@/lib/format";
import { FREE_RECIPE_LIMIT } from "@/lib/plans";

interface Row {
  key: string;
  food: Food;
  grams: string;
}

export function RecipeEditor({ id }: { id?: string }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const { can } = useApp();
  const unlimited = can("unlimited_recipes");
  const meals = useQuery(keys.meals, listMeals);

  const [loading, setLoading] = useState(!!id);
  const [saved, setSaved] = useState<RecipeWithIngredients | null>(null);
  const [name, setName] = useState("");
  const [servings, setServings] = useState("4");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [picker, setPicker] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!id) {
      if (!unlimited) countRecipes().then((n) => setBlocked(n >= FREE_RECIPE_LIMIT));
      return;
    }
    getRecipe(id)
      .then((r) => {
        if (!r) return;
        setSaved(r);
        setName(r.name);
        setServings(String(r.servings).replace(".", ","));
        setNotes(r.notes ?? "");
        setRows(r.recipe_ingredients.map((i) => ({ key: i.id, food: i.food, grams: String(i.grams).replace(".", ",") })));
      })
      .catch((e) => toast.error(errorMessage(e)))
      .finally(() => setLoading(false));
  }, [id, unlimited, toast]);

  const ingredients = rows.map((r) => ({ grams: parseNum(r.grams) ?? 0, food: r.food }));
  const s = parseNum(servings) ?? 0;
  const t = recipeTotals(ingredients, s);

  async function save() {
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Dê um nome à receita.";
    if (!s || s <= 0 || s > 100) errs.servings = "Entre 1 e 100 porções.";
    if (!rows.length) errs.rows = "Adicione pelo menos um ingrediente.";
    if (ingredients.some((i) => i.grams <= 0)) errs.rows = "Todos os ingredientes precisam de gramas.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      const r = await saveRecipe(
        { name: name.trim(), servings: s, notes: notes.trim() || null, ingredients: ingredients.map((i) => ({ food_id: i.food.id, grams: i.grams })) },
        id,
      );
      invalidate(keys.recipes);
      toast.success(id ? "Receita atualizada." : "Receita salva.");
      if (!id) router.replace(`/receitas/${r.id}`);
      else setSaved(await getRecipe(id));
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !(await confirm({ title: "Excluir receita?", text: "As porções já registradas no diário continuam lá.", confirmLabel: "Excluir", danger: true }))) return;
    try {
      await deleteRecipe(id);
      invalidate(keys.recipes);
      toast.success("Receita excluída.");
      router.replace("/receitas");
    } catch (e) {
      toast.error(errorMessage(e));
    }
  }

  if (loading) {
    return (
      <main className="flex flex-col gap-4">
        <PageHeader title="Receita" back />
        <Skeleton className="h-48 rounded-[var(--radius-card)]" />
        <Skeleton className="h-32 rounded-[var(--radius-card)]" />
      </main>
    );
  }

  if (blocked) {
    return (
      <main>
        <PageHeader title="Nova receita" back />
        <Card>
          <EmptyState
            icon={<Lock className="h-6 w-6" />}
            title={`Você atingiu ${FREE_RECIPE_LIMIT} receitas`}
            text="No plano gratuito cabem até 5 receitas. No Premium elas são ilimitadas."
            action={<ButtonLink href="/premium">Conhecer o Premium</ButtonLink>}
          />
        </Card>
      </main>
    );
  }

  const dirty = !saved || saved.name !== name.trim() || String(saved.servings) !== String(s) || saved.recipe_ingredients.length !== rows.length || rows.some((r, i) => r.food.id !== saved.recipe_ingredients[i]?.food_id || parseNum(r.grams) !== saved.recipe_ingredients[i]?.grams) || (saved.notes ?? "") !== notes.trim();

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title={id ? "Receita" : "Nova receita"} back="/receitas" />

      <Card className="flex flex-col gap-4">
        <Field label="Nome" error={errors.name}>
          {(fid, d) => <Input id={fid} value={name} onChange={(e) => setName(e.target.value)} placeholder="Frango com arroz e feijão" aria-describedby={d} invalid={!!errors.name} />}
        </Field>
        <Field label="Rende" error={errors.servings}>
          {(fid, d) => <Input id={fid} value={servings} onChange={(e) => setServings(e.target.value)} inputMode="decimal" suffix="porções" aria-describedby={d} invalid={!!errors.servings} />}
        </Field>
      </Card>

      <section className="flex flex-col gap-3">
        <SectionTitle>Ingredientes</SectionTitle>
        <Card className="p-2">
          {rows.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted">Nenhum ingrediente ainda.</p>
          ) : (
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const m = macrosForGrams(r.food, parseNum(r.grams) ?? 0);
                return (
                  <li key={r.key} className="flex items-center gap-2 px-3 py-2.5 animate-enter">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{r.food.name}</p>
                      <p className="text-[12px] text-muted">
                        {fmt(m.kcal)} kcal · P {fmt1(m.protein)} · C {fmt1(m.carbs)} · G {fmt1(m.fat)}
                      </p>
                    </div>
                    <div className="w-24">
                      <Input value={r.grams} onChange={(e) => setRows((l) => l.map((x) => (x.key === r.key ? { ...x, grams: e.target.value } : x)))} inputMode="decimal" suffix="g" aria-label={`Gramas de ${r.food.name}`} className="h-10 px-3" />
                    </div>
                    <button onClick={() => setRows((l) => l.filter((x) => x.key !== r.key))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-danger" aria-label={`Remover ${r.food.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <button onClick={() => setPicker(true)} className="flex h-11 w-full items-center justify-center gap-1.5 rounded-2xl text-sm font-bold text-brand-strong hover:bg-brand-soft">
            <Plus className="h-4 w-4" /> Adicionar ingrediente
          </button>
        </Card>
        {errors.rows && <p className="text-sm font-medium text-danger">{errors.rows}</p>}
      </section>

      <Card className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Receita inteira</p>
          <p className="text-2xl font-extrabold">{fmt(t.total.kcal)} kcal</p>
          <p className="text-[13px] text-muted">
            P {fmt(t.total.protein)} g · C {fmt(t.total.carbs)} g · G {fmt(t.total.fat)} g
          </p>
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Por porção · {fmt(t.gramsPerServing)} g</p>
          <p className="text-2xl font-extrabold text-brand-strong">{fmt(t.perServing.kcal)} kcal</p>
          <p className="text-[13px] text-muted">
            P {fmt1(t.perServing.protein)} g · C {fmt1(t.perServing.carbs)} g · G {fmt1(t.perServing.fat)} g
          </p>
        </div>
      </Card>

      <Field label="Modo de preparo (opcional)">
        {(fid) => (
          <textarea
            id={fid}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[16px] focus:border-brand focus:outline-none"
          />
        )}
      </Field>

      <div className="flex flex-col gap-3">
        {saved && !dirty && (
          <Button size="lg" block onClick={() => setAdding(true)}>
            Adicionar 1 porção ao diário
          </Button>
        )}
        <Button size="lg" block variant={saved && !dirty ? "secondary" : "primary"} onClick={save} loading={busy} disabled={!!saved && !dirty}>
          {saved ? (dirty ? "Salvar alterações" : "Receita salva") : "Salvar receita"}
        </Button>
        {id && (
          <Button variant="ghost" onClick={remove} className="text-danger">
            Excluir receita
          </Button>
        )}
      </div>

      <IngredientPicker open={picker} onClose={() => setPicker(false)} onPick={(food, g) => setRows((l) => [...l, { key: `${food.id}-${Date.now()}`, food, grams: String(g).replace(".", ",") }])} />
      <RecipeAddSheet recipe={adding ? saved : null} meals={meals.data ?? []} onClose={() => setAdding(false)} />
    </main>
  );
}
