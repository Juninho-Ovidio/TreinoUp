import { describe, expect, it } from "vitest";
import { bmrHarrisBenedict, computeAssessment, fatBand } from "@/lib/assessment";

describe("avaliação física", () => {
  const input = {
    sex: "male" as const,
    age: 23,
    weightKg: 79.5,
    heightCm: 180,
    skinfolds: { triceps: 16, abdomen: 42, suprailiac: 40, chest: 20, thigh: 24, midaxillary: 23, subscapular: 22 },
  };

  it("Jackson e Pollock 7 dobras + Siri", () => {
    const r = computeAssessment(input);
    expect(r.fatPct!.toFixed(2)).toBe("24.47");
    expect(r.bmi.toFixed(2)).toBe("24.54");
    expect(fatBand("male", r.fatPct!).label).toBe("Aceitável");
  });

  it("TMB por Harris-Benedict", () => {
    expect(bmrHarrisBenedict("male", 79.5, 180, 23)).toBeCloseTo(1898.75, 2);
  });

  it("sem as 7 dobras não calcula gordura", () => {
    const r = computeAssessment({ ...input, skinfolds: { triceps: 16 } });
    expect(r.fatPct).toBeNull();
    expect(r.targetWeightKg).toBeNull();
  });
});
