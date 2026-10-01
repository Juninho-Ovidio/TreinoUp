"use client";

import type { GoalRow, Meal, Profile } from "@/lib/types";
import { today } from "@/lib/dates";
import { computeTargets } from "@/lib/goals";
import { check, sb, uid } from "./base";

/** Recria o perfil se a linha não existir (ex.: apagada pelo painel). O plano fica no padrão. */
async function ensureProfile(id: string) {
  check(await sb().from("profiles").upsert({ id }, { onConflict: "id", ignoreDuplicates: true }));
}

export async function getProfile(): Promise<Profile> {
  const id = await uid();
  const found = check(await sb().from("profiles").select("*").eq("id", id).maybeSingle()) as Profile | null;
  if (found) return found;
  await ensureProfile(id);
  return check(await sb().from("profiles").select("*").eq("id", id).single()) as Profile;
}

export async function updateProfile(patch: Partial<Omit<Profile, "id" | "plan" | "created_at" | "updated_at">>): Promise<Profile> {
  const id = await uid();
  const updated = check(await sb().from("profiles").update(patch).eq("id", id).select("*").maybeSingle()) as Profile | null;
  if (updated) return updated;
  await ensureProfile(id);
  return check(await sb().from("profiles").update(patch).eq("id", id).select("*").single()) as Profile;
}

/** Meta vigente numa data: a de maior effective_from <= data. */
export async function getGoalFor(date: string): Promise<GoalRow | null> {
  const id = await uid();
  const rows = check(
    await sb().from("goals").select("*").eq("user_id", id).lte("effective_from", date).order("effective_from", { ascending: false }).limit(1),
  ) as GoalRow[];
  if (rows[0]) return rows[0];
  // Dias anteriores ao cadastro das metas usam a primeira meta registrada.
  const first = check(await sb().from("goals").select("*").eq("user_id", id).order("effective_from").limit(1)) as GoalRow[];
  return first[0] ?? null;
}

export type GoalValues = Pick<GoalRow, "kcal" | "protein_g" | "carbs_g" | "fat_g" | "fiber_g" | "water_ml" | "is_manual">;

/** Salva metas a partir de hoje (o histórico de dias anteriores mantém a meta antiga). */
export async function saveGoal(values: GoalValues, effectiveFrom = today()): Promise<GoalRow> {
  const id = await uid();
  return check(
    await sb()
      .from("goals")
      .upsert({ user_id: id, effective_from: effectiveFrom, ...values }, { onConflict: "user_id,effective_from" })
      .select("*")
      .single(),
  ) as GoalRow;
}

export async function listMeals(): Promise<Meal[]> {
  const id = await uid();
  return check(await sb().from("meals").select("*").eq("user_id", id).order("position")) as Meal[];
}

export async function renameMeal(mealId: string, name: string) {
  check(await sb().from("meals").update({ name }).eq("id", mealId));
}

/** Recalcula e salva as metas a partir do perfil e do peso atual. */
export async function recalcGoals(p: Profile, weightKg: number): Promise<GoalRow | null> {
  if (!p.sex || !p.age || !p.height_cm || !p.activity_level || !p.goal) return null;
  const t = computeTargets({
    sex: p.sex,
    age: p.age,
    heightCm: p.height_cm,
    weightKg,
    activity: p.activity_level,
    goal: p.goal,
    pace: p.pace,
    diet: p.diet_preference,
  });
  return saveGoal({ kcal: t.kcal, protein_g: t.protein_g, carbs_g: t.carbs_g, fat_g: t.fat_g, fiber_g: t.fiber_g, water_ml: t.water_ml, is_manual: false });
}

/** Conclui o onboarding: perfil, primeiro peso e metas, em sequência. */
export async function completeOnboarding(input: {
  profile: Partial<Profile>;
  weightKg: number;
  goal: GoalValues;
}) {
  const id = await uid();
  const date = today();
  // Peso e metas primeiro; o perfil só é marcado como concluído no fim, para que uma falha
  // no meio permita refazer o onboarding.
  check(await sb().from("weight_entries").upsert({ user_id: id, entry_date: date, weight_kg: input.weightKg }, { onConflict: "user_id,entry_date" }));
  await saveGoal(input.goal, date);
  await updateProfile({ ...input.profile, start_weight_kg: input.weightKg, onboarded_at: new Date().toISOString() });
}
