/**
 * Pausa automática.
 * - Bike: pela velocidade do GPS (parado abaixo de 1 m/s por 5 s; volta acima de 1,8 m/s).
 * - Corrida/caminhada: pelo acelerômetro (o celular parou de balançar) confirmado pelo GPS
 *   (abaixo de 0,6 m/s); volta quando volta a balançar ou o GPS passa de 1,2 m/s.
 *   Sem acelerômetro (ex.: app em segundo plano no iOS), vale só o GPS.
 */

import type { SportFamily } from "./sports";

export interface MotionSample {
  t: number;
  /** Velocidade em m/s (GPS), quando houver. */
  speedMs?: number | null;
  /** Leitura do acelerômetro: o aparelho está balançando? (só corrida/caminhada) */
  shaking?: boolean | null;
}

export interface AutoPauseState {
  /** Desde quando parece parado (ms) ou null. */
  stillSince: number | null;
  /** Última leitura do acelerômetro (null = sem sensor). */
  shaking: boolean | null;
}

export const EMPTY_AUTO_PAUSE: AutoPauseState = { stillSince: null, shaking: null };

const RULES = {
  ride: { stopBelow: 1.0, resumeAbove: 1.8, holdMs: 5000 },
  foot: { stopBelow: 0.6, resumeAbove: 1.2, holdMs: 4000 },
} as const;

export type AutoPauseDecision = "pause" | "resume" | null;

export function autoPauseStep(
  state: AutoPauseState,
  sample: MotionSample,
  family: SportFamily,
  paused: boolean,
): { state: AutoPauseState; decision: AutoPauseDecision } {
  if (family === "other") return { state, decision: null };
  const rule = RULES[family];
  const shaking = sample.shaking === undefined ? state.shaking : sample.shaking;
  const speed = sample.speedMs != null && sample.speedMs >= 0 ? sample.speedMs : null;

  const movingBySensor = family === "foot" && shaking === true;
  const stillBySensor = family === "foot" ? shaking !== true : true;

  if (paused) {
    const resume = movingBySensor || (speed != null && speed >= rule.resumeAbove);
    return { state: { stillSince: null, shaking }, decision: resume ? "resume" : null };
  }

  const slow = speed == null ? family === "foot" && shaking === false : speed < rule.stopBelow;
  if (slow && stillBySensor) {
    const stillSince = state.stillSince ?? sample.t;
    const decision = sample.t - stillSince >= rule.holdMs ? "pause" : null;
    return { state: { stillSince: decision ? null : stillSince, shaking }, decision };
  }
  return { state: { stillSince: null, shaking }, decision: null };
}

/**
 * O acelerômetro indica movimento? Recebe a magnitude (em g) das últimas amostras (~2 s).
 * Correndo ou andando, o desvio-padrão passa fácil de 0,05 g; parado na mão/bolso fica bem abaixo.
 */
export function isShaking(magnitudes: readonly number[], thresholdG = 0.05): boolean | null {
  if (magnitudes.length < 5) return null;
  const mean = magnitudes.reduce((a, b) => a + b, 0) / magnitudes.length;
  const variance = magnitudes.reduce((a, b) => a + (b - mean) ** 2, 0) / magnitudes.length;
  return Math.sqrt(variance) >= thresholdG;
}
