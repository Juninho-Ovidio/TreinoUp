/** Formatação das métricas da gravação (números com a vírgula/ponto do idioma). */

import { KM, MILE } from "./session";

export type Units = "metric" | "imperial";

const unitM = (u: Units) => (u === "imperial" ? MILE : KM);

/** "1:02:05" ou "27:41". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Distância na unidade (km ou mi) com 2 casas: "5,21". */
export function formatDistance(meters: number, units: Units, locale: string): string {
  return (meters / unitM(units)).toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Ritmo "5:19" (min por km/mi). "–:––" quando parado ou sem dados. */
export function formatPace(speedMs: number | null | undefined, units: Units): string {
  // Abaixo de ~0,5 m/s o ritmo passaria de 30 min/km: mostrar como sem ritmo.
  if (!speedMs || speedMs < 0.5) return "–:––";
  const secPerUnit = Math.round(unitM(units) / speedMs);
  const m = Math.floor(secPerUnit / 60);
  const s = secPerUnit % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Velocidade em km/h ou mi/h com 1 casa: "24,6". */
export function formatSpeed(speedMs: number | null | undefined, units: Units, locale: string): string {
  const v = speedMs && speedMs > 0 ? (speedMs * 3600) / unitM(units) : 0;
  return v.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Elevação em metros (ou pés no sistema imperial), sem casas. */
export function formatElevation(meters: number, units: Units, locale: string): string {
  const v = units === "imperial" ? meters * 3.28084 : meters;
  return Math.round(v).toLocaleString(locale);
}

/** Ritmo por extenso para o aviso de voz: { min, sec }. */
export function paceParts(speedMs: number | null | undefined, units: Units): { min: number; sec: number } | null {
  if (!speedMs || speedMs < 0.5) return null;
  const secPerUnit = Math.round(unitM(units) / speedMs);
  return { min: Math.floor(secPerUnit / 60), sec: secPerUnit % 60 };
}

/** Período do dia do início da atividade, para o título padrão ("Corrida da manhã"). */
export function dayPeriod(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "evening";
  return "night";
}
