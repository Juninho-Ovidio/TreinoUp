import { supabase } from "@/lib/supabase";
import { pickGoal, summarizeDay, type DaySummary, type EntryRow, type GoalRow } from "../domain/summary";

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return (res.data ?? []) as T;
}

/** Lê as mesmas tabelas do diário do site (a RLS garante que são só as do usuário). */
export async function fetchDaySummary(userId: string, date: string): Promise<DaySummary> {
  const db = supabase();
  const [goals, entries, water, activities] = await Promise.all([
    db
      .from("goals")
      .select("effective_from, kcal, protein_g, carbs_g, fat_g, water_ml")
      .eq("user_id", userId)
      .order("effective_from")
      .then((r) => check<GoalRow[]>(r)),
    db
      .from("food_entries")
      .select("kcal, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .eq("entry_date", date)
      .then((r) => check<EntryRow[]>(r)),
    db
      .from("water_entries")
      .select("amount_ml")
      .eq("user_id", userId)
      .eq("entry_date", date)
      .then((r) => check<{ amount_ml: number }[]>(r)),
    db
      .from("activity_entries")
      .select("kcal")
      .eq("user_id", userId)
      .eq("entry_date", date)
      .then((r) => check<{ kcal: number }[]>(r)),
  ]);

  return summarizeDay({
    goal: pickGoal(goals, date),
    entries,
    waterMl: water.map((w) => w.amount_ml),
    burnedKcal: activities.map((a) => a.kcal),
  });
}
