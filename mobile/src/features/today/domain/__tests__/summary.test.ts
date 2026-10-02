import { greetingKey, localISODate, percentOf, pickGoal, summarizeDay, type GoalRow } from "../summary";

const goal = (effective_from: string, kcal: number): GoalRow => ({
  effective_from,
  kcal,
  protein_g: 150,
  carbs_g: 200,
  fat_g: 60,
  water_ml: 2500,
});

describe("localISODate", () => {
  it("usa a data local com zeros à esquerda", () => {
    expect(localISODate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("pickGoal", () => {
  const goals = [goal("2026-09-01", 2000), goal("2026-09-20", 1800), goal("2026-10-10", 1700)];
  it("pega a meta vigente na data", () => {
    expect(pickGoal(goals, "2026-10-01")?.kcal).toBe(1800);
    expect(pickGoal(goals, "2026-09-20")?.kcal).toBe(1800);
  });
  it("antes da primeira meta usa a primeira (como o site)", () => {
    expect(pickGoal(goals, "2026-08-01")?.kcal).toBe(2000);
  });
  it("não depende da ordem recebida", () => {
    expect(pickGoal([...goals].reverse(), "2026-12-01")?.kcal).toBe(1700);
  });
  it("sem metas", () => {
    expect(pickGoal([], "2026-10-01")).toBeNull();
  });
});

describe("summarizeDay", () => {
  it("soma o dia e calcula o orçamento com o exercício", () => {
    const s = summarizeDay({
      goal: goal("2026-09-01", 2000),
      entries: [
        { kcal: 500, protein_g: 30, carbs_g: 60, fat_g: 10 },
        // o PostgREST devolve numeric como texto
        { kcal: "350.5" as unknown as number, protein_g: 20, carbs_g: 40, fat_g: 12 },
      ],
      waterMl: [250, 500],
      burnedKcal: [300],
    });
    expect(s).toMatchObject({
      hasGoal: true,
      kcal: 850.5,
      protein: 50,
      carbs: 100,
      fat: 22,
      waterMl: 750,
      burned: 300,
      budget: 2300,
      remaining: 1449.5,
    });
  });

  it("passou da meta: restante negativo", () => {
    const s = summarizeDay({ goal: goal("2026-09-01", 1000), entries: [{ kcal: 1200, protein_g: 0, carbs_g: 0, fat_g: 0 }], waterMl: [], burnedKcal: [] });
    expect(s.remaining).toBe(-200);
  });

  it("sem meta", () => {
    const s = summarizeDay({ goal: null, entries: [], waterMl: [], burnedKcal: [] });
    expect(s).toMatchObject({ hasGoal: false, budget: 0, remaining: 0 });
  });
});

describe("greetingKey", () => {
  it.each([
    [0, "today.night"],
    [4, "today.night"],
    [5, "today.morning"],
    [11, "today.morning"],
    [12, "today.afternoon"],
    [17, "today.afternoon"],
    [18, "today.evening"],
    [23, "today.evening"],
  ])("%i h → %s", (hour, key) => {
    expect(greetingKey(hour)).toBe(key);
  });
});

describe("percentOf", () => {
  it("arredonda e protege meta zero", () => {
    expect(percentOf(850, 2300)).toBe(37);
    expect(percentOf(100, 0)).toBe(0);
  });
});
