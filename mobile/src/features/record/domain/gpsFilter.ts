import { distanceMeters } from "./geo";

/** Leitura crua do GPS. */
export interface RawFix {
  /** Epoch em ms. */
  t: number;
  lat: number;
  lng: number;
  /** Altitude em metros (null quando o aparelho não informa). */
  alt: number | null;
  /** Precisão horizontal em metros (raio de 68%). */
  accuracy: number | null;
  /** Velocidade informada pelo aparelho em m/s (null/negativa quando desconhecida). */
  speed: number | null;
}

/** Pior precisão aceita: pontos com raio maior que isso são descartados. */
export const MAX_ACCURACY_M = 30;

export type RejectReason = "accuracy" | "stale" | "jump";

/**
 * Decide se uma leitura entra na gravação.
 * - precisão pior que 30 m (ou desconhecida);
 * - fora de ordem/repetida;
 * - "salto" que exigiria velocidade acima do possível para o esporte (com folga de 50%).
 */
export function rejectReason(prev: RawFix | null, fix: RawFix, maxSpeedMs: number): RejectReason | null {
  if (fix.accuracy == null || !Number.isFinite(fix.accuracy) || fix.accuracy > MAX_ACCURACY_M) return "accuracy";
  if (!prev) return null;
  const dt = (fix.t - prev.t) / 1000;
  if (dt <= 0) return "stale";
  const d = distanceMeters(prev, fix);
  // A folga cobre o erro de posição dos dois pontos (até 2 × 30 m) em leituras muito próximas no tempo.
  const tolerance = (prev.accuracy ?? MAX_ACCURACY_M) + fix.accuracy;
  if (d > maxSpeedMs * 1.5 * dt + tolerance) return "jump";
  return null;
}

/** Estado do filtro de Kalman 1D aplicado a latitude/longitude. */
export interface KalmanState {
  lat: number;
  lng: number;
  /** Variância da estimativa, em m². */
  variance: number;
  t: number;
}

/**
 * Filtro de Kalman simples para posição (modelo de velocidade constante desconhecida).
 * `qMetersPerSecond` é o quanto a posição real pode "andar" por segundo sem ser vista como ruído.
 * Leituras precisas pesam mais; leituras ruins são puxadas para a estimativa anterior.
 */
export function kalmanStep(state: KalmanState | null, fix: RawFix, qMetersPerSecond: number): KalmanState {
  const accuracy = Math.max(fix.accuracy ?? MAX_ACCURACY_M, 1);
  if (!state) return { lat: fix.lat, lng: fix.lng, variance: accuracy * accuracy, t: fix.t };
  const dt = Math.max(0, (fix.t - state.t) / 1000);
  const variance = state.variance + dt * qMetersPerSecond * qMetersPerSecond;
  const k = variance / (variance + accuracy * accuracy);
  return {
    lat: state.lat + k * (fix.lat - state.lat),
    lng: state.lng + k * (fix.lng - state.lng),
    variance: (1 - k) * variance,
    t: fix.t,
  };
}
