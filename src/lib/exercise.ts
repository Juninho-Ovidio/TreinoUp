import type { ActivityKind, ExerciseCategory } from "./types";

/**
 * Equivalentes metabólicos (MET) de referência, do Compendium of Physical Activities (Ainsworth et al.).
 * Gasto estimado = MET × peso (kg) × horas. É uma estimativa, não uma medição.
 */
export const ACTIVITIES: Record<ActivityKind, { label: string; met: number; hasDistance: boolean }> = {
  walking: { label: "Caminhada", met: 3.5, hasDistance: true },
  running: { label: "Corrida", met: 9.8, hasDistance: true },
  cycling: { label: "Bicicleta", met: 7.5, hasDistance: true },
  strength: { label: "Musculação", met: 5.0, hasDistance: false },
  soccer: { label: "Futebol", met: 7.0, hasDistance: false },
  swimming: { label: "Natação", met: 5.8, hasDistance: true },
  hiit: { label: "HIIT", met: 8.0, hasDistance: false },
};

/** Ajusta o MET da corrida e da caminhada pela velocidade quando a distância é informada. */
export function metFor(activity: ActivityKind, durationMin: number, distanceKm?: number | null): number {
  const base = ACTIVITIES[activity].met;
  if (!distanceKm || durationMin <= 0) return base;
  const kmh = distanceKm / (durationMin / 60);
  if (activity === "running") {
    // Tabela aproximada do Compendium por velocidade.
    if (kmh < 8) return 8.3;
    if (kmh < 9.7) return 9.8;
    if (kmh < 11.3) return 11.0;
    if (kmh < 12.9) return 11.8;
    if (kmh < 14.5) return 12.8;
    return 14.5;
  }
  if (activity === "walking") {
    if (kmh < 3.2) return 2.8;
    if (kmh < 4.8) return 3.5;
    if (kmh < 5.6) return 4.3;
    if (kmh < 6.4) return 5.0;
    return 7.0;
  }
  if (activity === "cycling") {
    if (kmh < 16) return 4.0;
    if (kmh < 19.3) return 6.8;
    if (kmh < 22.5) return 8.0;
    if (kmh < 25.7) return 10.0;
    return 12.0;
  }
  return base;
}

export function estimateKcal(activity: ActivityKind, durationMin: number, weightKg: number, distanceKm?: number | null): number {
  if (durationMin <= 0 || weightKg <= 0) return 0;
  return Math.round(metFor(activity, durationMin, distanceKm) * weightKg * (durationMin / 60));
}

export const CATEGORY_LABELS: Record<ExerciseCategory, string> = {
  chest: "Peito",
  back: "Costas",
  shoulders: "Ombros",
  arms: "Braços",
  legs: "Pernas",
  glutes: "Glúteos",
  abs: "Abdômen",
  cardio: "Cardio",
};

/** Volume total de um treino: séries × repetições × carga. */
export function workoutVolume(items: { sets: number; reps: number; load_kg: number }[]): number {
  return Math.round(items.reduce((a, i) => a + i.sets * i.reps * i.load_kg, 0));
}
