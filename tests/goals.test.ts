import { describe, expect, it } from "vitest";
import { bmi, bmrMifflin, computeTargets, kcalFromMacros, weightProgress } from "@/lib/goals";
import { estimateKcal, metFor, workoutVolume } from "@/lib/exercise";
import { addDays, dateRange, daysBetween, rangeStart, relativeDayLabel } from "@/lib/dates";
import { parseNum, signed } from "@/lib/format";

describe("metabolismo e metas", () => {
  it("Mifflin-St Jeor", () => {
    expect(bmrMifflin("male", 80, 175, 30)).toBe(1748.75);
    expect(bmrMifflin("female", 60, 165, 30)).toBe(1320.25);
  });

  it("perder peso em ritmo moderado tira ~550 kcal do gasto", () => {
    const t = computeTargets({ sex: "male", age: 30, heightCm: 175, weightKg: 80, activity: "moderate", goal: "lose", pace: "moderate" });
    expect(t.tdee).toBe(2711);
    expect(t.kcal).toBe(2160);
    expect(t.protein_g).toBe(160);
    expect(t.fat_g).toBe(64);
    // carboidrato fecha as calorias
    expect(Math.abs(kcalFromMacros(t.protein_g, t.carbs_g, t.fat_g) - t.kcal)).toBeLessThanOrEqual(6);
  });

  it("nunca desce abaixo do piso de segurança", () => {
    const t = computeTargets({ sex: "female", age: 60, heightCm: 150, weightKg: 45, activity: "sedentary", goal: "lose", pace: "fast" });
    expect(t.kcal).toBeGreaterThanOrEqual(1200);
    expect(t.floored).toBe(true);
  });

  it("low carb limita carboidrato a 25% das calorias", () => {
    const t = computeTargets({ sex: "male", age: 30, heightCm: 175, weightKg: 80, activity: "moderate", goal: "maintain", pace: "moderate", diet: "low_carb" });
    expect(t.carbs_g * 4).toBeLessThanOrEqual(t.kcal * 0.25 + 4);
  });

  it("high protein aumenta a proteína", () => {
    const base = { sex: "male" as const, age: 30, heightCm: 175, weightKg: 80, activity: "moderate" as const, goal: "maintain" as const, pace: "moderate" as const };
    expect(computeTargets({ ...base, diet: "high_protein" }).protein_g).toBeGreaterThan(computeTargets(base).protein_g);
  });

  it("respeita os limites do banco em casos extremos", () => {
    const t = computeTargets({ sex: "male", age: 25, heightCm: 210, weightKg: 300, activity: "extreme", goal: "gain", pace: "fast", diet: "high_protein" });
    expect(t.water_ml).toBeLessThanOrEqual(8000);
    expect(t.kcal).toBeLessThanOrEqual(8000);
    expect(t.protein_g).toBeLessThanOrEqual(600);
    expect(t.fat_g).toBeLessThanOrEqual(400);
  });

  it("progresso do peso para perder e para ganhar", () => {
    expect(weightProgress(80, 77.5, 75)).toBe(50);
    expect(weightProgress(60, 63, 66)).toBe(50);
    expect(weightProgress(80, 82, 75)).toBe(0);
    expect(weightProgress(80, 70, 75)).toBe(100);
  });

  it("IMC", () => {
    expect(bmi(78.1, 175).toFixed(1)).toBe("25.5");
  });
});

describe("exercício", () => {
  it("MET × peso × horas", () => {
    expect(estimateKcal("strength", 60, 80)).toBe(400);
    expect(estimateKcal("walking", 30, 70)).toBe(123);
  });
  it("corrida mais rápida gasta mais", () => {
    expect(metFor("running", 30, 6)).toBeGreaterThan(metFor("running", 30, 4));
  });
  it("volume do treino", () => {
    expect(workoutVolume([{ sets: 3, reps: 10, load_kg: 60 }, { sets: 4, reps: 8, load_kg: 20 }])).toBe(2440);
  });
});

describe("datas e formatos", () => {
  it("soma dias e intervalos", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(daysBetween("2026-09-01", "2026-09-30")).toBe(29);
    expect(dateRange("2026-09-28", "2026-09-30")).toEqual(["2026-09-28", "2026-09-29", "2026-09-30"]);
    expect(rangeStart("7d", "2026-09-30")).toBe("2026-09-24");
  });
  it("rótulos relativos", () => {
    expect(relativeDayLabel("2026-09-30", "2026-09-30")).toBe("Hoje");
    expect(relativeDayLabel("2026-09-29", "2026-09-30")).toBe("Ontem");
  });
  it("números em português", () => {
    expect(parseNum("78,5")).toBe(78.5);
    expect(parseNum("")).toBeNull();
    expect(parseNum("abc")).toBeNull();
    expect(signed(-2.3)).toBe("−2,3");
  });
});
