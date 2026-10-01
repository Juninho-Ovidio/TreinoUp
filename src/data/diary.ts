"use client";

import type { ActivityEntry, FoodEntry, WaterEntry } from "@/lib/types";
import { check, sb, uid } from "./base";

// ---------- Diário alimentar ----------

export async function listEntries(date: string): Promise<FoodEntry[]> {
  const id = await uid();
  return check(await sb().from("food_entries").select("*").eq("user_id", id).eq("entry_date", date).order("created_at")) as FoodEntry[];
}

export type NewEntry = Omit<FoodEntry, "id" | "user_id" | "created_at">;

export async function addEntry(values: NewEntry): Promise<FoodEntry> {
  const id = await uid();
  return check(await sb().from("food_entries").insert({ ...values, user_id: id }).select("*").single()) as FoodEntry;
}

export async function updateEntry(entryId: string, patch: Partial<NewEntry>): Promise<FoodEntry> {
  return check(await sb().from("food_entries").update(patch).eq("id", entryId).select("*").single()) as FoodEntry;
}

export async function deleteEntry(entryId: string) {
  check(await sb().from("food_entries").delete().eq("id", entryId));
}

export interface DayTotals {
  entry_date: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

/** Totais por dia num intervalo (para gráficos). */
export async function dailyTotals(start: string, end: string): Promise<DayTotals[]> {
  const id = await uid();
  const rows = check(
    await sb().from("food_entries").select("entry_date,kcal,protein_g,carbs_g,fat_g").eq("user_id", id).gte("entry_date", start).lte("entry_date", end),
  ) as DayTotals[];
  const map = new Map<string, DayTotals>();
  for (const r of rows) {
    const d = map.get(r.entry_date) ?? { entry_date: r.entry_date, kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    d.kcal += Number(r.kcal);
    d.protein_g += Number(r.protein_g);
    d.carbs_g += Number(r.carbs_g);
    d.fat_g += Number(r.fat_g);
    map.set(r.entry_date, d);
  }
  return [...map.values()].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}

/** Copia todos os itens de uma refeição de um dia para outro. */
export async function copyMeal(fromDate: string, mealId: string, toDate: string) {
  const id = await uid();
  const items = check(await sb().from("food_entries").select("*").eq("user_id", id).eq("entry_date", fromDate).eq("meal_id", mealId)) as FoodEntry[];
  if (!items.length) return 0;
  const rows = items.map((it) => ({
    user_id: it.user_id,
    entry_date: toDate,
    meal_id: it.meal_id,
    food_id: it.food_id,
    recipe_id: it.recipe_id,
    name: it.name,
    brand: it.brand,
    quantity: it.quantity,
    unit: it.unit,
    grams: it.grams,
    kcal: it.kcal,
    protein_g: it.protein_g,
    carbs_g: it.carbs_g,
    fat_g: it.fat_g,
    fiber_g: it.fiber_g,
  }));
  check(await sb().from("food_entries").insert(rows));
  return rows.length;
}

// ---------- Água ----------

export async function listWater(date: string): Promise<WaterEntry[]> {
  const id = await uid();
  return check(await sb().from("water_entries").select("*").eq("user_id", id).eq("entry_date", date).order("created_at")) as WaterEntry[];
}

export async function addWater(date: string, amount_ml: number): Promise<WaterEntry> {
  const id = await uid();
  return check(await sb().from("water_entries").insert({ user_id: id, entry_date: date, amount_ml }).select("*").single()) as WaterEntry;
}

export async function deleteWater(entryId: string) {
  check(await sb().from("water_entries").delete().eq("id", entryId));
}

export async function waterTotals(start: string, end: string): Promise<{ entry_date: string; ml: number }[]> {
  const id = await uid();
  const rows = check(await sb().from("water_entries").select("entry_date,amount_ml").eq("user_id", id).gte("entry_date", start).lte("entry_date", end)) as {
    entry_date: string;
    amount_ml: number;
  }[];
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.entry_date, (map.get(r.entry_date) ?? 0) + r.amount_ml);
  return [...map.entries()].map(([entry_date, ml]) => ({ entry_date, ml })).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}

// ---------- Atividades (gasto calórico) ----------

export async function listActivities(date: string): Promise<ActivityEntry[]> {
  const id = await uid();
  return check(await sb().from("activity_entries").select("*").eq("user_id", id).eq("entry_date", date).order("created_at")) as ActivityEntry[];
}

export async function addActivity(values: Omit<ActivityEntry, "id" | "user_id" | "created_at">): Promise<ActivityEntry> {
  const id = await uid();
  return check(await sb().from("activity_entries").insert({ ...values, user_id: id }).select("*").single()) as ActivityEntry;
}

export async function deleteActivity(entryId: string) {
  check(await sb().from("activity_entries").delete().eq("id", entryId));
}

export async function activityTotals(start: string, end: string): Promise<{ entry_date: string; kcal: number; minutes: number }[]> {
  const id = await uid();
  const rows = check(
    await sb().from("activity_entries").select("entry_date,kcal,duration_min").eq("user_id", id).gte("entry_date", start).lte("entry_date", end),
  ) as { entry_date: string; kcal: number; duration_min: number }[];
  const map = new Map<string, { kcal: number; minutes: number }>();
  for (const r of rows) {
    const d = map.get(r.entry_date) ?? { kcal: 0, minutes: 0 };
    d.kcal += r.kcal;
    d.minutes += r.duration_min;
    map.set(r.entry_date, d);
  }
  return [...map.entries()].map(([entry_date, v]) => ({ entry_date, ...v })).sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}
