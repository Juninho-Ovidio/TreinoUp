import { addDays, dateRange, parseISODate, toISODate } from "./dates";

/** Preenche dias sem registro com 0 (para barras). */
export function fillDays<T extends { entry_date: string }>(rows: T[], start: string, end: string, pick: (r: T) => number) {
  const map = new Map(rows.map((r) => [r.entry_date, pick(r)]));
  return dateRange(start, end).map((date) => ({ date, value: map.get(date) ?? 0 }));
}

/**
 * Agrupa por semana (segunda-feira) fazendo a média dos dias COM registro.
 * Usado quando o intervalo é longo demais para uma barra por dia.
 */
export function weeklyAverage(points: { date: string; value: number }[]) {
  const groups = new Map<string, number[]>();
  for (const p of points) {
    const d = parseISODate(p.date);
    const monday = toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12));
    const g = groups.get(monday) ?? [];
    if (p.value > 0) g.push(p.value);
    groups.set(monday, g);
  }
  return [...groups.entries()].map(([date, vals]) => ({ date, value: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0 }));
}

export function weeklySum(points: { date: string; value: number }[]) {
  const groups = new Map<string, number>();
  for (const p of points) {
    const d = parseISODate(p.date);
    const monday = toISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12));
    groups.set(monday, (groups.get(monday) ?? 0) + p.value);
  }
  return [...groups.entries()].map(([date, value]) => ({ date, value }));
}

/** Valor do registro mais próximo em ou antes de uma data. */
export function valueAtOrBefore(rows: { entry_date: string; weight_kg: number }[], date: string): number | null {
  let best: number | null = null;
  for (const r of rows) {
    if (r.entry_date <= date) best = r.weight_kg;
    else break;
  }
  return best;
}

export function averageOfNonZero(points: { value: number }[]) {
  const v = points.filter((p) => p.value > 0);
  return v.length ? v.reduce((a, p) => a + p.value, 0) / v.length : 0;
}

export { addDays };
