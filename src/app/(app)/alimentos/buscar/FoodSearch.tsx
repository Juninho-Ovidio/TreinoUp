"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Loader2, PackagePlus, ScanBarcode, Search, Star, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { EmptyState, Skeleton } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { AddFoodSheet, SOURCE_LABEL } from "@/components/app/AddFoodSheet";
import { RecipeAddSheet } from "@/components/app/RecipeAddSheet";
import { useQuery } from "@/hooks/useQuery";
import { keys } from "@/hooks/useDay";
import { barcodeExternal, favoriteIds, findByBarcodeLocal, getFood, listFavorites, listRecent, searchExternal, searchLocal } from "@/data/foods";
import { listRecipes } from "@/data/recipes";
import { listMeals } from "@/data/profile";
import { errorMessage } from "@/data/base";
import { normalizeBarcode } from "@/lib/foods/provider";
import { recipeTotals } from "@/lib/nutrition";
import type { AnyFood, ExternalFood, Food, RecipeWithIngredients } from "@/lib/types";
import { fmt } from "@/lib/format";
import { today } from "@/lib/dates";

type Filter = "all" | "foods" | "recipes" | "favorites" | "recent";

export function FoodSearch() {
  const params = useSearchParams();
  const mealId = params.get("refeicao");
  const date = /^\d{4}-\d{2}-\d{2}$/.test(params.get("data") ?? "") ? params.get("data")! : today();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [filter, setFilter] = useState<Filter>("all");
  const [local, setLocal] = useState<Food[] | null>(null);
  const [external, setExternal] = useState<ExternalFood[] | null>(null);
  const [extState, setExtState] = useState<"idle" | "loading" | "error">("idle");
  const [extError, setExtError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AnyFood | null>(null);
  const [recipe, setRecipe] = useState<RecipeWithIngredients | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const meals = useQuery(keys.meals, listMeals);
  const favorites = useQuery(keys.favorites, listFavorites);
  const recent = useQuery(keys.recent, () => listRecent(20));
  const recipes = useQuery(keys.recipes, listRecipes);

  useEffect(() => {
    favoriteIds().then(setFavs).catch(() => undefined);
  }, []);

  // Abre direto um alimento recém-cadastrado (?food=id).
  useEffect(() => {
    const id = params.get("food");
    if (id) getFood(id).then((f) => f && setSelected(f)).catch(() => undefined);
  }, [params]);

  const term = q.trim();
  const barcode = normalizeBarcode(term);

  // Busca local rápida (debounce curto) e, em seguida, a base externa.
  useEffect(() => {
    setExternal(null);
    setExtState("idle");
    if (term.length < 2) {
      setLocal(null);
      return;
    }
    const ctrl = new AbortController();
    const t1 = setTimeout(async () => {
      try {
        if (barcode) {
          const f = await findByBarcodeLocal(barcode);
          setLocal(f ? [f] : []);
        } else {
          setLocal(await searchLocal(term));
        }
      } catch {
        setLocal([]);
      }
    }, 200);
    const t2 = setTimeout(async () => {
      if (term.length < 3) return;
      setExtState("loading");
      try {
        if (barcode) {
          const f = await barcodeExternal(barcode);
          if (!ctrl.signal.aborted) setExternal(f ? [f] : []);
        } else {
          const r = await searchExternal(term, ctrl.signal);
          if (!ctrl.signal.aborted) setExternal(r);
        }
        if (!ctrl.signal.aborted) setExtState("idle");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setExtState("error");
        setExtError(errorMessage(e));
      }
    }, 700);
    return () => {
      ctrl.abort();
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [term, barcode]);

  // Não mostra na lista externa o que já está salvo localmente.
  const externalFiltered = useMemo(() => {
    const ids = new Set((local ?? []).map((f) => f.external_id).filter(Boolean));
    return (external ?? []).filter((f) => !ids.has(f.external_id));
  }, [external, local]);

  const recipesFiltered = useMemo(() => {
    const list = recipes.data ?? [];
    if (!term) return list;
    const t = term.toLowerCase();
    return list.filter((r) => r.name.toLowerCase().includes(t));
  }, [recipes.data, term]);

  const favList = (favorites.data ?? []).filter((f) => !term || f.name.toLowerCase().includes(term.toLowerCase()));
  const recentList = (recent.data ?? []).filter((f) => !term || f.name.toLowerCase().includes(term.toLowerCase()));

  const scanHref = `/alimentos/scanner?${new URLSearchParams({ ...(mealId ? { refeicao: mealId } : {}), ...(date !== today() ? { data: date } : {}) })}`;
  const newHref = `/alimentos/novo?${new URLSearchParams({ ...(mealId ? { refeicao: mealId } : {}), ...(date !== today() ? { data: date } : {}), ...(barcode ? { barcode } : term ? { nome: term } : {}) })}`;

  const showFoods = filter === "all" || filter === "foods";
  const searching = term.length >= 2;

  return (
    <main className="flex flex-col gap-4">
      <PageHeader title="Adicionar alimento" subtitle={meals.data?.find((m) => m.id === mealId)?.name} back />

      <div className="flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Buscar alimento</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar alimento, marca ou código"
            autoFocus
            enterKeyHint="search"
            className="h-12 w-full rounded-full border border-line bg-surface pl-12 pr-11 text-[16px] placeholder:text-faint focus:border-brand focus:outline-none"
          />
          {q && (
            <button
              onClick={() => {
                setQ("");
                inputRef.current?.focus();
              }}
              className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:bg-surface-2"
              aria-label="Limpar busca"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <Link href={scanHref} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-fg text-bg" aria-label="Escanear código de barras">
          <ScanBarcode className="h-5 w-5" />
        </Link>
      </div>

      <Segmented
        label="Filtro"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "Todos" },
          { value: "foods", label: "Alimentos" },
          { value: "recipes", label: "Receitas" },
          { value: "favorites", label: "Favoritos" },
          { value: "recent", label: "Recentes" },
        ]}
      />

      {/* Sem busca: recentes e favoritos */}
      {!searching && filter === "all" && (
        <>
          <FoodList title="Recentes" foods={recentList.slice(0, 8)} loading={recent.loading} onPick={setSelected} favs={favs} />
          <FoodList title="Favoritos" foods={favList.slice(0, 8)} loading={favorites.loading} onPick={setSelected} favs={favs} />
          {!recent.loading && !favorites.loading && recentList.length === 0 && favList.length === 0 && (
            <EmptyState icon={<Search className="h-6 w-6" />} title="Busque seu primeiro alimento" text="Digite o nome, a marca ou o código de barras. Os que você usar aparecem aqui." />
          )}
        </>
      )}

      {filter === "favorites" && <FoodList foods={favList} loading={favorites.loading} onPick={setSelected} favs={favs} empty="Toque na estrela de um alimento para salvá-lo aqui." />}
      {filter === "recent" && <FoodList foods={recentList} loading={recent.loading} onPick={setSelected} favs={favs} empty="Os alimentos que você registrar aparecem aqui." />}

      {(filter === "recipes" || (filter === "all" && searching)) && (
        <RecipeList recipes={recipesFiltered} loading={recipes.loading} onPick={setRecipe} showEmpty={filter === "recipes"} />
      )}

      {searching && showFoods && (
        <>
          <FoodList title="Alimentos (TACO) e os meus" foods={local ?? []} loading={local === null} onPick={setSelected} favs={favs} hideWhenEmpty />
          <section className="flex flex-col gap-2">
            <h2 className="flex items-center gap-2 px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
              <Globe className="h-4 w-4" aria-hidden /> Produtos embalados
              {extState === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-label="Buscando" />}
            </h2>
            {extState === "error" && <p className="px-1 text-sm text-danger">{extError}</p>}
            {extState === "loading" && externalFiltered.length === 0 && [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
            {extState === "idle" && external && externalFiltered.length === 0 && (local ?? []).length === 0 && (
              <EmptyState
                icon={<PackagePlus className="h-6 w-6" />}
                title={barcode ? "Produto não encontrado" : "Nenhum alimento encontrado"}
                text={barcode ? "Esse código ainda não está na base. Você pode cadastrá-lo." : "Tente outro nome ou cadastre o alimento com os dados do rótulo."}
                action={<ButtonLink href={newHref}>Cadastrar alimento</ButtonLink>}
              />
            )}
            <ul className="flex flex-col gap-2">
              {externalFiltered.map((f) => (
                <li key={f.external_id ?? f.name} className="animate-enter">
                  <FoodRow food={f} onPick={() => setSelected(f)} />
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {searching && showFoods && (
        <Link href={newHref} className="mt-2 flex items-center justify-center gap-2 rounded-2xl border border-dashed border-line py-4 text-sm font-semibold text-muted hover:text-fg">
          <PackagePlus className="h-4 w-4" /> Não achou? Cadastre o alimento
        </Link>
      )}

      <AddFoodSheet
        food={selected}
        meals={meals.data ?? []}
        mealId={mealId}
        date={date}
        favorite={!!(selected && "id" in selected && selected.id && favs.has(selected.id))}
        onFavoriteChange={(id, on) =>
          setFavs((s) => {
            const n = new Set(s);
            if (on) n.add(id);
            else n.delete(id);
            return n;
          })
        }
        onClose={() => setSelected(null)}
      />
      <RecipeAddSheet recipe={recipe} meals={meals.data ?? []} mealId={mealId} date={date} onClose={() => setRecipe(null)} />
    </main>
  );
}

function FoodList({
  title,
  foods,
  loading,
  onPick,
  favs,
  empty,
  hideWhenEmpty,
}: {
  title?: string;
  foods: Food[];
  loading: boolean;
  onPick: (f: Food) => void;
  favs: Set<string>;
  empty?: string;
  hideWhenEmpty?: boolean;
}) {
  if (!loading && foods.length === 0 && (hideWhenEmpty || !empty)) return null;
  return (
    <section className="flex flex-col gap-2">
      {title && <h2 className="px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">{title}</h2>}
      {loading ? (
        [0, 1, 2].map((i) => <Skeleton key={i} className="h-16" />)
      ) : foods.length === 0 ? (
        <p className="px-1 py-6 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {foods.map((f) => (
            <li key={f.id} className="animate-enter">
              <FoodRow food={f} onPick={() => onPick(f)} fav={favs.has(f.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function FoodRow({ food, onPick, fav }: { food: AnyFood; onPick: () => void; fav?: boolean }) {
  const serving = food.serving_g ? `${food.serving_name ?? "porção"} (${fmt(food.serving_g)} g)` : food.unit_g ? `1 ${food.unit_name ?? "unidade"} (${fmt(food.unit_g)} g)` : "100 g";
  const base = food.serving_g ?? food.unit_g ?? 100;
  return (
    <button onClick={onPick} className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-card transition-transform active:scale-[0.99]">
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 font-semibold">
          <span className="truncate">{food.name}</span>
          {fav && <Star className="h-3.5 w-3.5 shrink-0 fill-carbs text-carbs" aria-label="Favorito" />}
        </span>
        <span className="block truncate text-[13px] text-muted">{[food.brand, serving, SOURCE_LABEL[food.source]].filter(Boolean).join(" · ")}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block font-bold">{fmt((food.kcal_100g * base) / 100)}</span>
        <span className="block text-[11px] text-muted">kcal</span>
      </span>
    </button>
  );
}

function RecipeList({ recipes, loading, onPick, showEmpty }: { recipes: RecipeWithIngredients[]; loading: boolean; onPick: (r: RecipeWithIngredients) => void; showEmpty: boolean }) {
  if (loading) return showEmpty ? <Skeleton className="h-16" /> : null;
  if (!recipes.length) {
    return showEmpty ? (
      <EmptyState title="Nenhuma receita ainda" text="Monte receitas com seus ingredientes e adicione porções ao diário." action={<ButtonLink href="/receitas/nova">Criar receita</ButtonLink>} />
    ) : null;
  }
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">Receitas</h2>
      <ul className="flex flex-col gap-2">
        {recipes.map((r) => {
          const t = recipeTotals(r.recipe_ingredients, r.servings);
          return (
            <li key={r.id}>
              <button onClick={() => onPick(r)} className="flex w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left shadow-card active:scale-[0.99]">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{r.name}</span>
                  <span className="block text-[13px] text-muted">
                    {fmt(r.servings)} porções · {r.recipe_ingredients.length} ingredientes
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-bold">{fmt(t.perServing.kcal)}</span>
                  <span className="block text-[11px] text-muted">kcal/porção</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
