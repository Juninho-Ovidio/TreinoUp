"use client";

import { useMemo } from "react";
import { useQuery } from "./useQuery";
import { listActivities, listEntries, listWater } from "@/data/diary";
import { getGoalFor, listMeals } from "@/data/profile";
import { latestWeight } from "@/data/body";
import { entryMacros, sumMacros } from "@/lib/nutrition";
import type { FoodEntry } from "@/lib/types";

/** Chaves de cache usadas em todo o app — mudar aqui mantém tudo sincronizado. */
export const keys = {
  meals: "meals",
  entries: (d: string) => `entries:${d}`,
  water: (d: string) => `water:${d}`,
  activities: (d: string) => `activities:${d}`,
  goal: (d: string) => `goal:${d}`,
  latestWeight: "weight:latest",
  weights: "weights:",
  measurements: "measurements",
  assessments: "assessments",
  charts: "charts:",
  recipes: "recipes",
  workouts: "workouts",
  favorites: "foods:favorites",
  recent: "foods:recent",
};

export function useDay(date: string) {
  const meals = useQuery(keys.meals, listMeals);
  const entries = useQuery(keys.entries(date), () => listEntries(date));
  const goal = useQuery(keys.goal(date), () => getGoalFor(date));
  const water = useQuery(keys.water(date), () => listWater(date));
  const activities = useQuery(keys.activities(date), () => listActivities(date));

  const derived = useMemo(() => {
    const list = entries.data ?? [];
    const byMeal = new Map<string, FoodEntry[]>();
    for (const e of list) byMeal.set(e.meal_id, [...(byMeal.get(e.meal_id) ?? []), e]);
    return {
      totals: sumMacros(list.map(entryMacros)),
      byMeal,
      waterMl: (water.data ?? []).reduce((a, w) => a + w.amount_ml, 0),
      burned: (activities.data ?? []).reduce((a, x) => a + x.kcal, 0),
    };
  }, [entries.data, water.data, activities.data]);

  return {
    meals: meals.data ?? [],
    entries: entries.data ?? [],
    goal: goal.data ?? null,
    water: water.data ?? [],
    activities: activities.data ?? [],
    ...derived,
    loading: meals.loading || entries.loading || goal.loading,
    error: meals.error || entries.error || goal.error,
    refresh: () => Promise.all([meals.refresh(), entries.refresh(), goal.refresh(), water.refresh(), activities.refresh()]),
  };
}

export function useLatestWeight() {
  return useQuery(keys.latestWeight, latestWeight);
}
