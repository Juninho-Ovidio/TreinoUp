"use client";

import type { AnyFood, ExternalFood, Food } from "@/lib/types";
import { AppError, check, sb, uid } from "./base";

/**
 * Busca no banco (função search_foods): alimentos do usuário + catálogo TACO, por nome ou marca,
 * sem diferenciar acento ou maiúsculas, já ordenada por relevância.
 */
export async function searchLocal(q: string, limit = 30): Promise<Food[]> {
  const t = q.trim().slice(0, 60);
  if (!t) return [];
  return check(await sb().rpc("search_foods", { q: t, lim: limit })) as Food[];
}

export async function findByBarcodeLocal(code: string): Promise<Food | null> {
  const rows = check(await sb().from("foods").select("*").eq("barcode", code).limit(1)) as Food[];
  return rows[0] ?? null;
}

export async function getFood(id: string): Promise<Food | null> {
  const rows = check(await sb().from("foods").select("*").eq("id", id).limit(1)) as Food[];
  return rows[0] ?? null;
}

export type FoodInput = Omit<Food, "id" | "user_id">;

export async function createFood(values: FoodInput): Promise<Food> {
  const me = await uid();
  return check(await sb().from("foods").insert({ ...values, user_id: me }).select("*").single()) as Food;
}

export async function updateFood(id: string, values: Partial<FoodInput>): Promise<Food> {
  return check(await sb().from("foods").update(values).eq("id", id).select("*").single()) as Food;
}

export async function deleteFood(id: string) {
  check(await sb().from("foods").delete().eq("id", id));
}

/** Salva um alimento de base externa como cópia do usuário (reaproveita se já existir). */
export async function saveExternal(input: AnyFood): Promise<Food> {
  if (input.id) return input as Food;
  const f = input as ExternalFood;
  const me = await uid();
  if (f.external_id) {
    const existing = check(
      await sb().from("foods").select("*").eq("source", f.source).eq("external_id", f.external_id).or(`user_id.eq.${me},user_id.is.null`).limit(1),
    ) as Food[];
    if (existing[0]) return existing[0];
  }
  const { id: _ignore, user_id: _u, ...values } = f;
  void _ignore;
  void _u;
  return createFood(values);
}

// ---------- Bases externas (via rotas do próprio app) ----------

export async function searchExternal(q: string, signal?: AbortSignal): Promise<ExternalFood[]> {
  const res = await fetch(`/api/foods/search?q=${encodeURIComponent(q)}`, { signal });
  const json = (await res.json().catch(() => ({}))) as { results?: ExternalFood[]; error?: string };
  if (!res.ok) throw new AppError(json.error ?? "A busca externa falhou.");
  return json.results ?? [];
}

/** null = produto não encontrado. */
export async function barcodeExternal(code: string): Promise<ExternalFood | null> {
  const res = await fetch(`/api/foods/barcode/${encodeURIComponent(code)}`);
  if (res.status === 404) return null;
  const json = (await res.json().catch(() => ({}))) as { food?: ExternalFood | null; error?: string };
  if (!res.ok) throw new AppError(json.error ?? "Não foi possível consultar o código.");
  return json.food ?? null;
}

// ---------- Favoritos e recentes ----------

export async function listFavorites(): Promise<Food[]> {
  const me = await uid();
  const rows = check(await sb().from("food_favorites").select("food:foods(*)").eq("user_id", me).order("created_at", { ascending: false })) as unknown as {
    food: Food | null;
  }[];
  return rows.map((r) => r.food).filter((f): f is Food => !!f);
}

export async function favoriteIds(): Promise<Set<string>> {
  const me = await uid();
  const rows = check(await sb().from("food_favorites").select("food_id").eq("user_id", me)) as { food_id: string }[];
  return new Set(rows.map((r) => r.food_id));
}

export async function setFavorite(foodId: string, on: boolean) {
  const me = await uid();
  if (on) check(await sb().from("food_favorites").upsert({ user_id: me, food_id: foodId }, { onConflict: "user_id,food_id" }));
  else check(await sb().from("food_favorites").delete().eq("user_id", me).eq("food_id", foodId));
}

/** Últimos alimentos usados no diário, sem repetir. */
export async function listRecent(limit = 20): Promise<Food[]> {
  const me = await uid();
  const rows = check(
    await sb().from("food_entries").select("food_id").eq("user_id", me).not("food_id", "is", null).order("created_at", { ascending: false }).limit(120),
  ) as { food_id: string }[];
  const ids = [...new Set(rows.map((r) => r.food_id))].slice(0, limit);
  if (!ids.length) return [];
  const foods = check(await sb().from("foods").select("*").in("id", ids)) as Food[];
  const byId = new Map(foods.map((f) => [f.id, f]));
  return ids.map((id) => byId.get(id)).filter((f): f is Food => !!f);
}

/** Alimentos do usuário e do catálogo com mais proteína por 100 kcal. */
export async function highProteinFoods(limit = 8): Promise<Food[]> {
  const rows = check(await sb().from("foods").select("*").gt("kcal_100g", 20).order("protein_100g", { ascending: false }).limit(60)) as Food[];
  return rows
    .map((f) => ({ f, density: f.protein_100g / (f.kcal_100g / 100) }))
    .sort((a, b) => b.density - a.density)
    .slice(0, limit)
    .map((x) => x.f);
}
