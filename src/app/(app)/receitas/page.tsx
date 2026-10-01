"use client";

import Link from "next/link";
import { ChefHat, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { Card, EmptyState, Skeleton } from "@/components/ui/Card";
import { useApp } from "@/components/app/AppProvider";
import { useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { listRecipes } from "@/data/recipes";
import { recipeTotals } from "@/lib/nutrition";
import { fmt, fmt1 } from "@/lib/format";
import { FREE_RECIPE_LIMIT } from "@/lib/plans";

export default function RecipesPage() {
  const { can } = useApp();
  const recipes = useQuery(keys.recipes, listRecipes);
  const list = recipes.data ?? [];
  const limited = !can("unlimited_recipes");

  return (
    <main className="flex flex-col gap-4">
      <PageHeader
        title="Receitas"
        subtitle={limited ? `${list.length} de ${FREE_RECIPE_LIMIT} no plano gratuito` : undefined}
        back
        action={
          <Link href="/receitas/nova" className="grid h-10 w-10 place-items-center rounded-full bg-brand text-on-brand" aria-label="Nova receita">
            <Plus className="h-5 w-5" />
          </Link>
        }
      />
      {recipes.loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-[var(--radius-card)]" />)
      ) : list.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ChefHat className="h-6 w-6" />}
            title="Nenhuma receita ainda"
            text="Cadastre os ingredientes uma vez e o app calcula os macros de cada porção."
            action={<ButtonLink href="/receitas/nova">Criar receita</ButtonLink>}
          />
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((r) => {
            const t = recipeTotals(r.recipe_ingredients, r.servings);
            return (
              <li key={r.id} className="animate-enter">
                <Link href={`/receitas/${r.id}`} className="block rounded-[var(--radius-card)] bg-surface p-4 shadow-card active:scale-[0.99]">
                  <p className="truncate font-bold">{r.name}</p>
                  <p className="text-[13px] text-muted">
                    Rende {fmt1(r.servings)} {r.servings === 1 ? "porção" : "porções"} · {r.recipe_ingredients.length} ingredientes
                  </p>
                  <p className="mt-2 text-sm">
                    <b className="text-lg">{fmt(t.perServing.kcal)}</b> kcal/porção · P {fmt(t.perServing.protein)} · C {fmt(t.perServing.carbs)} · G {fmt(t.perServing.fat)}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
