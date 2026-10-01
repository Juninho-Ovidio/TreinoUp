import { describe, expect, it } from "vitest";
import { assessMeal, buildEntryValues, gramsFor, macroSplit, macrosForGrams, pct, recipeTotals, sumMacros, unitOptions } from "@/lib/nutrition";
import type { Food } from "@/lib/types";

const frango: Food = {
  id: "f1", user_id: null, name: "Frango grelhado", brand: null, barcode: null, source: "custom", external_id: null,
  serving_name: "1 filé", serving_g: 120, unit_name: null, unit_g: null,
  kcal_100g: 165, protein_100g: 31, carbs_100g: 0, fat_100g: 3.6, fiber_100g: null, sugar_100g: null, sodium_mg_100g: null, image_url: null,
};
const ovo: Food = { ...frango, id: "f2", name: "Ovo", serving_name: null, serving_g: null, unit_name: "unidade", unit_g: 50, kcal_100g: 143, protein_100g: 12.6, carbs_100g: 0.7, fat_100g: 9.5, fiber_100g: 0 };

describe("macrosForGrams", () => {
  it("escala valores por 100 g", () => {
    expect(macrosForGrams(frango, 150)).toEqual({ kcal: 247.5, protein: 46.5, carbs: 0, fat: 5.4, fiber: 0 });
  });
  it("trata quantidade negativa como zero", () => {
    expect(macrosForGrams(frango, -10).kcal).toBe(0);
  });
});

describe("unidades", () => {
  it("oferece gramas, unidade e porção quando existem", () => {
    expect(unitOptions(ovo).map((o) => o.unit)).toEqual(["g", "unit"]);
    expect(unitOptions(frango).map((o) => o.unit)).toEqual(["g", "serving"]);
  });
  it("2 unidades de ovo = 100 g = 143 kcal", () => {
    const opt = unitOptions(ovo)[1];
    expect(gramsFor(2, opt)).toBe(100);
    const v = buildEntryValues(ovo, 2, opt);
    expect(v.grams).toBe(100);
    expect(v.kcal).toBe(143);
    expect(v.unit).toBe("unit");
  });
});

describe("somas e percentuais", () => {
  it("soma macros", () => {
    const s = sumMacros([macrosForGrams(frango, 100), macrosForGrams(ovo, 100)]);
    expect(s.kcal).toBe(308);
    expect(s.protein).toBe(43.6);
  });
  it("percentual da meta", () => {
    expect(pct(1245, 1800)).toBe(69);
    expect(pct(10, 0)).toBe(0);
  });
  it("divisão das calorias soma 100", () => {
    const sp = macroSplit({ kcal: 0, protein: 150, carbs: 150, fat: 60, fiber: 0 });
    expect(sp.protein + sp.carbs + sp.fat).toBeGreaterThanOrEqual(99);
    expect(sp.protein + sp.carbs + sp.fat).toBeLessThanOrEqual(101);
  });
});

describe("receitas", () => {
  it("calcula por porção", () => {
    const r = recipeTotals([{ grams: 400, food: frango }, { grams: 200, food: ovo }], 4);
    expect(r.total.kcal).toBe(946);
    expect(r.perServing.kcal).toBe(236.5);
    expect(r.gramsPerServing).toBe(150);
  });
  it("porções zero viram 1", () => {
    expect(recipeTotals([{ grams: 100, food: frango }], 0).perServing.kcal).toBe(165);
  });
});

describe("avaliação de refeição", () => {
  it("aponta proteína baixa", () => {
    const r = assessMeal({ kcal: 500, protein: 10, carbs: 90, fat: 10, fiber: 5 });
    expect(r.balanced).toBe(false);
    expect(r.notes.join(" ")).toMatch(/Proteína baixa/);
  });
  it("refeição equilibrada", () => {
    expect(assessMeal({ kcal: 550, protein: 40, carbs: 60, fat: 15, fiber: 8 }).balanced).toBe(true);
  });
});
