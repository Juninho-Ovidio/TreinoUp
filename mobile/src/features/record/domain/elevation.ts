/**
 * Ganho de elevação com suavização: a altitude do GPS oscila alguns metros parada.
 * 1) média móvel exponencial da altitude; 2) histerese: só conta subida/descida depois de
 * variar ao menos `thresholdM` em relação ao último ponto de referência.
 */

export interface ElevationState {
  smoothed: number | null;
  anchor: number | null;
  gain: number;
  loss: number;
}

export const EMPTY_ELEVATION: ElevationState = { smoothed: null, anchor: null, gain: 0, loss: 0 };

export function elevationStep(
  state: ElevationState,
  altitude: number | null,
  { alpha = 0.25, thresholdM = 3 }: { alpha?: number; thresholdM?: number } = {},
): ElevationState {
  if (altitude == null || !Number.isFinite(altitude)) return state;
  const smoothed = state.smoothed == null ? altitude : state.smoothed + alpha * (altitude - state.smoothed);
  const anchor = state.anchor ?? smoothed;
  const diff = smoothed - anchor;
  if (diff >= thresholdM) return { smoothed, anchor: smoothed, gain: state.gain + diff, loss: state.loss };
  if (diff <= -thresholdM) return { smoothed, anchor: smoothed, gain: state.gain, loss: state.loss - diff };
  return { smoothed, anchor, gain: state.gain, loss: state.loss };
}
