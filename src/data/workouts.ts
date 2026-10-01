"use client";

import type { Exercise, ExerciseCategory, Workout } from "@/lib/types";
import { check, sb, uid } from "./base";

export async function listExercises(): Promise<Exercise[]> {
  return check(await sb().from("exercises").select("*").order("name")) as Exercise[];
}

export async function createExercise(values: { name: string; category: ExerciseCategory; description: string | null }): Promise<Exercise> {
  const me = await uid();
  return check(await sb().from("exercises").insert({ ...values, user_id: me }).select("*").single()) as Exercise;
}

export async function listWorkouts(limit = 50): Promise<Workout[]> {
  const me = await uid();
  return check(
    await sb()
      .from("workouts")
      .select("*, workout_exercises(*)")
      .eq("user_id", me)
      .order("workout_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit),
  ) as Workout[];
}

export async function getWorkout(id: string): Promise<Workout | null> {
  const rows = check(await sb().from("workouts").select("*, workout_exercises(*)").eq("id", id).limit(1)) as Workout[];
  const w = rows[0];
  w?.workout_exercises?.sort((a, b) => a.position - b.position);
  return w ?? null;
}

export async function workoutsInRange(start: string, end: string): Promise<Workout[]> {
  const me = await uid();
  return check(
    await sb().from("workouts").select("*, workout_exercises(*)").eq("user_id", me).gte("workout_date", start).lte("workout_date", end),
  ) as Workout[];
}

export interface WorkoutInput {
  workout_date: string;
  name: string;
  duration_min: number | null;
  notes: string | null;
  exercises: { exercise_id: string | null; name: string; sets: number; reps: number; load_kg: number; rest_s: number | null }[];
}

export async function saveWorkout(input: WorkoutInput, id?: string): Promise<Workout> {
  const me = await uid();
  const base = { workout_date: input.workout_date, name: input.name, duration_min: input.duration_min, notes: input.notes };
  let w: Workout;
  if (id) {
    w = check(await sb().from("workouts").update(base).eq("id", id).select("*").single()) as Workout;
    check(await sb().from("workout_exercises").delete().eq("workout_id", id));
  } else {
    w = check(await sb().from("workouts").insert({ ...base, user_id: me }).select("*").single()) as Workout;
  }
  if (input.exercises.length) {
    check(await sb().from("workout_exercises").insert(input.exercises.map((e, position) => ({ ...e, workout_id: w.id, position }))));
  }
  return w;
}

export async function deleteWorkout(id: string) {
  check(await sb().from("workouts").delete().eq("id", id));
}

/** Última carga usada em cada exercício (pelo nome), para sugerir no próximo treino. */
export async function lastLoads(): Promise<Map<string, { sets: number; reps: number; load_kg: number }>> {
  const list = await listWorkouts(30);
  const map = new Map<string, { sets: number; reps: number; load_kg: number }>();
  for (const w of list) for (const e of w.workout_exercises ?? []) if (!map.has(e.name)) map.set(e.name, { sets: e.sets, reps: e.reps, load_kg: e.load_kg });
  return map;
}
