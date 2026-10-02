/**
 * Máquina de estados de uma gravação. Função pura `step(estado, evento)`:
 * - o estado é JSON puro (vai para o banco local a cada ponto e permite recuperar após o app fechar);
 * - os "efeitos" dizem o que fazer fora daqui (salvar ponto, avisar parcial por voz…).
 */

import { autoPauseStep, EMPTY_AUTO_PAUSE, type AutoPauseState } from "./autoPause";
import { elevationStep, EMPTY_ELEVATION, type ElevationState } from "./elevation";
import { distanceMeters } from "./geo";
import { kalmanStep, rejectReason, type KalmanState, type RawFix } from "./gpsFilter";
import { autoPauseApplies, SPORTS, type AutoPauseMode, type SportId } from "./sports";

export const KM = 1000;
export const MILE = 1609.344;

/** Ponto aceito e filtrado, como fica salvo. `segment` muda a cada retomada (o mapa não liga pausas). */
export interface TrackPoint {
  t: number;
  lat: number;
  lng: number;
  alt: number | null;
  accuracy: number;
  speed: number | null;
  segment: number;
}

export interface Split {
  index: number;
  distanceM: number;
  movingMs: number;
  elevGainM: number;
}

export type Lap = Split;

interface Mark {
  distanceM: number;
  movingMs: number;
  elevGainM: number;
}

export type RecordingStatus = "recording" | "paused" | "finished";

export interface RecordingState {
  id: string;
  sport: SportId;
  autoPause: AutoPauseMode;
  /** Tamanho da parcial: 1 km ou 1 milha. */
  splitM: number;
  status: RecordingStatus;
  pauseReason: "manual" | "auto" | null;
  startedAt: number;
  finishedAt: number | null;
  /** Tempo em movimento acumulado até `resumedAt`. */
  movingMs: number;
  /** Desde quando está gravando (null se pausado/finalizado). */
  resumedAt: number | null;
  distanceM: number;
  maxSpeedMs: number;
  pointCount: number;
  segment: number;
  lastRaw: RawFix | null;
  lastPoint: TrackPoint | null;
  kalman: KalmanState | null;
  elevation: ElevationState;
  autoPauseState: AutoPauseState;
  splits: Split[];
  splitMark: Mark;
  laps: Lap[];
  lapMark: Mark;
  /** Últimos pontos (tempo, distância acumulada) para o ritmo atual. */
  recent: { t: number; d: number }[];
}

export type RecordingEvent =
  | { type: "location"; fix: RawFix }
  | { type: "motion"; t: number; shaking: boolean | null }
  | { type: "pause"; t: number }
  | { type: "resume"; t: number }
  | { type: "lap"; t: number }
  | { type: "finish"; t: number };

export type Effect =
  | { type: "point"; point: TrackPoint }
  | { type: "split"; split: Split }
  | { type: "lap"; lap: Lap }
  | { type: "paused"; reason: "manual" | "auto" }
  | { type: "resumed"; reason: "manual" | "auto" }
  | { type: "finished" };

/** Janela do ritmo/velocidade atual. */
const RECENT_WINDOW_MS = 30_000;

export function createRecording({
  id,
  sport,
  startedAt,
  autoPause = "off",
  units = "metric",
}: {
  id: string;
  sport: SportId;
  startedAt: number;
  autoPause?: AutoPauseMode;
  units?: "metric" | "imperial";
}): RecordingState {
  const zero: Mark = { distanceM: 0, movingMs: 0, elevGainM: 0 };
  return {
    id,
    sport,
    autoPause,
    splitM: units === "imperial" ? MILE : KM,
    status: "recording",
    pauseReason: null,
    startedAt,
    finishedAt: null,
    movingMs: 0,
    resumedAt: startedAt,
    distanceM: 0,
    maxSpeedMs: 0,
    pointCount: 0,
    segment: 0,
    lastRaw: null,
    lastPoint: null,
    kalman: null,
    elevation: EMPTY_ELEVATION,
    autoPauseState: EMPTY_AUTO_PAUSE,
    splits: [],
    splitMark: zero,
    laps: [],
    lapMark: zero,
    recent: [],
  };
}

/** Tempo em movimento até `now` (conta o trecho em andamento). */
export function movingTimeMs(s: RecordingState, now: number): number {
  return s.movingMs + (s.status === "recording" && s.resumedAt != null ? Math.max(0, now - s.resumedAt) : 0);
}

/** Tempo total desde o início (inclui pausas). */
export function elapsedTimeMs(s: RecordingState, now: number): number {
  return Math.max(0, (s.finishedAt ?? now) - s.startedAt);
}

/** Velocidade atual (m/s) nos últimos 30 s em movimento; null se não houver dados. */
export function currentSpeedMs(s: RecordingState): number | null {
  if (s.status !== "recording" || s.recent.length < 2) return null;
  const first = s.recent[0]!;
  const last = s.recent[s.recent.length - 1]!;
  const dt = (last.t - first.t) / 1000;
  return dt > 0 ? (last.d - first.d) / dt : null;
}

/** Velocidade média (m/s) no tempo em movimento. */
export function averageSpeedMs(s: RecordingState, now: number): number | null {
  const ms = movingTimeMs(s, now);
  return ms > 0 && s.distanceM > 0 ? s.distanceM / (ms / 1000) : null;
}

/** Parciais completas + a última parcial incompleta (como no resumo final). */
export function splitsWithPartial(s: RecordingState, now: number): Split[] {
  const rest = s.distanceM - s.splitMark.distanceM;
  if (rest < 10) return s.splits;
  return [
    ...s.splits,
    {
      index: s.splits.length + 1,
      distanceM: rest,
      movingMs: movingTimeMs(s, now) - s.splitMark.movingMs,
      elevGainM: s.elevation.gain - s.splitMark.elevGainM,
    },
  ];
}

function pauseAt(s: RecordingState, t: number, reason: "manual" | "auto"): RecordingState {
  return {
    ...s,
    status: "paused",
    pauseReason: reason,
    movingMs: movingTimeMs(s, t),
    resumedAt: null,
    recent: [],
    autoPauseState: EMPTY_AUTO_PAUSE,
  };
}

function resumeAt(s: RecordingState, t: number): RecordingState {
  // Novo segmento: a distância não liga o ponto antes da pausa ao ponto depois dela, e o filtro
  // recomeça (senão puxaria o primeiro ponto novo para onde a pessoa parou).
  return {
    ...s,
    status: "recording",
    pauseReason: null,
    resumedAt: t,
    segment: s.segment + 1,
    lastPoint: null,
    lastRaw: null,
    kalman: null,
  };
}

function closeLap(s: RecordingState, t: number): { state: RecordingState; lap: Lap } {
  const moving = movingTimeMs(s, t);
  const lap: Lap = {
    index: s.laps.length + 1,
    distanceM: s.distanceM - s.lapMark.distanceM,
    movingMs: moving - s.lapMark.movingMs,
    elevGainM: s.elevation.gain - s.lapMark.elevGainM,
  };
  return {
    state: { ...s, laps: [...s.laps, lap], lapMark: { distanceM: s.distanceM, movingMs: moving, elevGainM: s.elevation.gain } },
    lap,
  };
}

function ingestFix(s: RecordingState, fix: RawFix): { state: RecordingState; effects: Effect[] } {
  const sport = SPORTS[s.sport];
  const effects: Effect[] = [];
  let state = s;

  // Pausa automática decidida pela velocidade (vale também enquanto pausado, para retomar).
  if (autoPauseApplies(state.autoPause, state.sport) && state.pauseReason !== "manual" && state.status !== "finished") {
    const speedMs =
      fix.speed != null && fix.speed >= 0
        ? fix.speed
        : state.lastRaw && fix.t > state.lastRaw.t
          ? distanceMeters(state.lastRaw, fix) / ((fix.t - state.lastRaw.t) / 1000)
          : null;
    const r = autoPauseStep(state.autoPauseState, { t: fix.t, speedMs }, sport.family, state.status === "paused");
    state = { ...state, autoPauseState: r.state };
    if (r.decision === "pause" && state.status === "recording") {
      state = pauseAt(state, fix.t, "auto");
      effects.push({ type: "paused", reason: "auto" });
    } else if (r.decision === "resume" && state.status === "paused") {
      state = resumeAt(state, fix.t);
      effects.push({ type: "resumed", reason: "auto" });
    }
  }

  if (state.status !== "recording" || !sport.usesGps) return { state: { ...state, lastRaw: fix }, effects };

  const reason = rejectReason(state.lastRaw, fix, sport.maxSpeedMs);
  // Leituras imprecisas não viram referência; leituras "fora de ordem" também não.
  if (reason) return { state: reason === "jump" ? { ...state, lastRaw: fix } : state, effects };

  const kalman = kalmanStep(state.kalman, fix, Math.max(3, sport.maxSpeedMs / 3));
  const point: TrackPoint = {
    t: fix.t,
    lat: kalman.lat,
    lng: kalman.lng,
    alt: fix.alt,
    accuracy: fix.accuracy!,
    speed: fix.speed != null && fix.speed >= 0 ? fix.speed : null,
    segment: state.segment,
  };
  const delta = state.lastPoint ? distanceMeters(state.lastPoint, point) : 0;
  const elevation = elevationStep(state.elevation, fix.alt);
  const distanceM = state.distanceM + delta;
  const recent = [...state.recent, { t: fix.t, d: distanceM }].filter((r) => fix.t - r.t <= RECENT_WINDOW_MS);
  const instant = state.lastPoint && fix.t > state.lastPoint.t ? delta / ((fix.t - state.lastPoint.t) / 1000) : 0;

  state = {
    ...state,
    lastRaw: fix,
    lastPoint: point,
    kalman,
    elevation,
    distanceM,
    recent,
    pointCount: state.pointCount + 1,
    maxSpeedMs: Math.max(state.maxSpeedMs, point.speed ?? (instant <= sport.maxSpeedMs ? instant : 0)),
  };
  effects.push({ type: "point", point });

  // Parciais: pode cruzar mais de uma marca num ponto só (ex.: sinal voltou depois de um túnel).
  const moving = movingTimeMs(state, fix.t);
  while (state.distanceM - state.splitMark.distanceM >= state.splitM) {
    const boundary = state.splitMark.distanceM + state.splitM;
    // Interpola o instante em que a marca foi cruzada dentro deste trecho.
    const before = distanceM - delta;
    const frac = delta > 0 ? Math.min(1, Math.max(0, (boundary - before) / delta)) : 1;
    const prevMoving = state.lastPoint && s.lastPoint ? movingTimeMs(s, s.lastPoint.t) : moving;
    const atMoving = prevMoving + frac * (moving - prevMoving);
    const split: Split = {
      index: state.splits.length + 1,
      distanceM: state.splitM,
      movingMs: Math.round(atMoving - state.splitMark.movingMs),
      elevGainM: state.elevation.gain - state.splitMark.elevGainM,
    };
    state = {
      ...state,
      splits: [...state.splits, split],
      splitMark: { distanceM: boundary, movingMs: Math.round(atMoving), elevGainM: state.elevation.gain },
    };
    effects.push({ type: "split", split });
  }

  return { state, effects };
}

export function step(s: RecordingState, e: RecordingEvent): { state: RecordingState; effects: Effect[] } {
  if (s.status === "finished") return { state: s, effects: [] };

  switch (e.type) {
    case "location":
      return ingestFix(s, e.fix);

    case "motion": {
      if (!autoPauseApplies(s.autoPause, s.sport) || s.pauseReason === "manual") {
        return { state: { ...s, autoPauseState: { ...s.autoPauseState, shaking: e.shaking } }, effects: [] };
      }
      const family = SPORTS[s.sport].family;
      const r = autoPauseStep(s.autoPauseState, { t: e.t, shaking: e.shaking }, family, s.status === "paused");
      let state = { ...s, autoPauseState: r.state };
      if (r.decision === "pause" && state.status === "recording") {
        state = pauseAt(state, e.t, "auto");
        return { state, effects: [{ type: "paused", reason: "auto" }] };
      }
      if (r.decision === "resume" && state.status === "paused") {
        state = resumeAt(state, e.t);
        return { state, effects: [{ type: "resumed", reason: "auto" }] };
      }
      return { state, effects: [] };
    }

    case "pause":
      if (s.status !== "recording") {
        // Pausar durante a pausa automática vira pausa manual (não retoma sozinho).
        return s.pauseReason === "auto" ? { state: { ...s, pauseReason: "manual" }, effects: [] } : { state: s, effects: [] };
      }
      return { state: pauseAt(s, e.t, "manual"), effects: [{ type: "paused", reason: "manual" }] };

    case "resume":
      if (s.status !== "paused") return { state: s, effects: [] };
      return { state: resumeAt(s, e.t), effects: [{ type: "resumed", reason: "manual" }] };

    case "lap": {
      const { state, lap } = closeLap(s, e.t);
      return { state, effects: [{ type: "lap", lap }] };
    }

    case "finish": {
      const moving = movingTimeMs(s, e.t);
      let state: RecordingState = { ...s, movingMs: moving, resumedAt: null, status: "finished", pauseReason: null, finishedAt: e.t };
      // Fecha a volta em andamento se já houver voltas marcadas.
      if (s.laps.length && state.distanceM - state.lapMark.distanceM > 0) state = closeLap({ ...state, status: "paused" }, e.t).state;
      return { state: { ...state, status: "finished" }, effects: [{ type: "finished" }] };
    }
  }
}

/** Aplica vários eventos em sequência (útil para lotes de pontos do GPS e para testes). */
export function stepAll(s: RecordingState, events: readonly RecordingEvent[]): { state: RecordingState; effects: Effect[] } {
  let state = s;
  const effects: Effect[] = [];
  for (const e of events) {
    const r = step(state, e);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}
