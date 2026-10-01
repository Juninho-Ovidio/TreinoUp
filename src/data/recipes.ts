"use client";

import type { Recipe, RecipeWithIngredients } from "@/lib/types";
import { check, sb, uid } from "./base";

export async function listRecipes(): Promise<RecipeWithIngredients[]> {
  const me = await uid();
  return check(
    await sb().from("recipes").select("*, recipe_ingredients(*, food:foods(*))").eq("user_id", me).order("updated_at", { ascending: false }),
  ) as RecipeWithIngredients[];
}

export async function getRecipe(id: string): Promise<RecipeWithIngredients | null> {
  const rows = check(await sb().from("recipes").select("*, recipe_ingredients(*, food:foods(*))").eq("id", id).limit(1)) as RecipeWithIngredients[];
  const r = rows[0];
  if (r) r.recipe_ingredients.sort((a, b) => a.position - b.position);
  return r ?? null;
}

export interface RecipeInput {
  name: string;
  servings: number;
  notes: string | null;
  ingredients: { food_id: string; grams: number }[];
}

export async function saveRecipe(input: RecipeInput, id?: string): Promise<Recipe> {
  const me = await uid();
  let recipe: Recipe;
  if (id) {
    recipe = check(await sb().from("recipes").update({ name: input.name, servings: input.servings, notes: input.notes }).eq("id", id).select("*").single()) as Recipe;
    check(await sb().from("recipe_ingredients").delete().eq("recipe_id", id));
  } else {
    recipe = check(
      await sb().from("recipes").insert({ user_id: me, name: input.name, servings: input.servings, notes: input.notes }).select("*").single(),
    ) as Recipe;
  }
  if (input.ingredients.length) {
    check(
      await sb()
        .from("recipe_ingredients")
        .insert(input.ingredients.map((i, position) => ({ recipe_id: recipe.id, food_id: i.food_id, grams: i.grams, position }))),
    );
  }
  return recipe;
}

export async function deleteRecipe(id: string) {
  check(await sb().from("recipes").delete().eq("id", id));
}

export async function countRecipes(): Promise<number> {
  const me = await uid();
  const { count, error } = await sb().from("recipes").select("id", { count: "exact", head: true }).eq("user_id", me);
  if (error) return 0;
  return count ?? 0;
}
