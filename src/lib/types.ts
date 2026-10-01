// Tipos das linhas do banco (espelham supabase/migrations). Números "numeric" chegam como number.

export type Sex = "male" | "female";
export type Goal = "lose" | "maintain" | "gain" | "recomp";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "very" | "extreme";
export type Pace = "slow" | "moderate" | "fast";
export type DietPreference = "normal" | "low_carb" | "high_protein" | "vegetarian" | "vegan" | "custom";
export type Plan = "free" | "premium";
export type Theme = "system" | "light" | "dark";

export interface Profile {
  id: string;
  name: string | null;
  avatar_url: string | null;
  age: number | null;
  sex: Sex | null;
  height_cm: number | null;
  start_weight_kg: number | null;
  target_weight_kg: number | null;
  goal: Goal | null;
  activity_level: ActivityLevel | null;
  pace: Pace;
  diet_preference: DietPreference;
  units: "metric" | "imperial";
  theme: Theme;
  plan: Plan;
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  user_id: string;
  effective_from: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_ml: number;
  is_manual: boolean;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  position: number;
}

export type FoodSource = "custom" | "openfoodfacts" | "taco" | "usda" | "import";

export interface Food {
  id: string;
  user_id: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: FoodSource;
  external_id: string | null;
  serving_name: string | null;
  serving_g: number | null;
  unit_name: string | null;
  unit_g: number | null;
  kcal_100g: number;
  protein_100g: number;
  carbs_100g: number;
  fat_100g: number;
  fiber_100g: number | null;
  sugar_100g: number | null;
  sodium_mg_100g: number | null;
  image_url: string | null;
}

/** Alimento vindo de uma base externa, ainda não salvo no banco. */
export type ExternalFood = Omit<Food, "id" | "user_id"> & { id?: undefined; user_id?: null };
export type AnyFood = Food | ExternalFood;

export type EntryUnit = "g" | "ml" | "unit" | "serving" | "portion";

export interface FoodEntry {
  id: string;
  user_id: string;
  entry_date: string;
  meal_id: string;
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  brand: string | null;
  quantity: number;
  unit: EntryUnit;
  grams: number;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  created_at: string;
}

export interface Recipe {
  id: string;
  user_id: string;
  name: string;
  servings: number;
  notes: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: string;
  recipe_id: string;
  food_id: string;
  grams: number;
  position: number;
  food?: Food;
}

export interface RecipeWithIngredients extends Recipe {
  recipe_ingredients: (RecipeIngredient & { food: Food })[];
}

export interface WaterEntry {
  id: string;
  user_id: string;
  entry_date: string;
  amount_ml: number;
  created_at: string;
}

export interface WeightEntry {
  id: string;
  user_id: string;
  entry_date: string;
  weight_kg: number;
}

export const MEASUREMENT_FIELDS = ["weight_kg", "waist_cm", "abdomen_cm", "chest_cm", "arm_cm", "hip_cm", "thigh_cm"] as const;
export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number];

export type BodyMeasurement = {
  id: string;
  user_id: string;
  entry_date: string;
} & { [K in MeasurementField]: number | null };

export type ExerciseCategory = "chest" | "back" | "shoulders" | "arms" | "legs" | "glutes" | "abs" | "cardio";

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  category: ExerciseCategory;
  description: string | null;
  video_url: string | null;
}

export interface WorkoutExercise {
  id: string;
  workout_id: string;
  exercise_id: string | null;
  name: string;
  sets: number;
  reps: number;
  load_kg: number;
  rest_s: number | null;
  position: number;
}

export interface Workout {
  id: string;
  user_id: string;
  workout_date: string;
  name: string;
  duration_min: number | null;
  notes: string | null;
  created_at: string;
  workout_exercises?: WorkoutExercise[];
}

export type ActivityKind = "walking" | "running" | "cycling" | "strength" | "soccer" | "swimming" | "hiit";

export interface ActivityEntry {
  id: string;
  user_id: string;
  entry_date: string;
  activity: ActivityKind;
  duration_min: number;
  distance_km: number | null;
  kcal: number;
  created_at: string;
}

export type ReminderKind = "water" | "meal" | "weight" | "workout" | "dinner";

export interface Reminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  enabled: boolean;
  at_time: string;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}
