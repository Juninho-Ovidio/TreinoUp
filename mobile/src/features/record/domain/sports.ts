/** Esportes que o app grava e como cada um se comporta na gravação. */

export const SPORT_IDS = ["run", "trail_run", "walk", "hike", "ride", "mtb", "gravel", "swim", "workout", "other"] as const;
export type SportId = (typeof SPORT_IDS)[number];

/** Família usada pela pausa automática: corrida (acelerômetro + GPS) ou bike (GPS). */
export type SportFamily = "foot" | "ride" | "other";

export interface Sport {
  id: SportId;
  family: SportFamily;
  /** Grava trajeto com GPS. Natação em piscina e musculação usam só o cronômetro. */
  usesGps: boolean;
  /** Mostra ritmo (min/km) ou velocidade (km/h). */
  metric: "pace" | "speed";
  /** Mostra a elevação ao vivo (trilha, hiking, MTB). */
  liveElevation: boolean;
  /** Velocidade máxima plausível (m/s); pontos que exigiriam mais que isso são ruído. */
  maxSpeedMs: number;
}

export const SPORTS: Record<SportId, Sport> = {
  run: { id: "run", family: "foot", usesGps: true, metric: "pace", liveElevation: false, maxSpeedMs: 12 },
  trail_run: { id: "trail_run", family: "foot", usesGps: true, metric: "pace", liveElevation: true, maxSpeedMs: 10 },
  walk: { id: "walk", family: "foot", usesGps: true, metric: "pace", liveElevation: false, maxSpeedMs: 6 },
  hike: { id: "hike", family: "foot", usesGps: true, metric: "pace", liveElevation: true, maxSpeedMs: 6 },
  ride: { id: "ride", family: "ride", usesGps: true, metric: "speed", liveElevation: false, maxSpeedMs: 30 },
  mtb: { id: "mtb", family: "ride", usesGps: true, metric: "speed", liveElevation: true, maxSpeedMs: 25 },
  gravel: { id: "gravel", family: "ride", usesGps: true, metric: "speed", liveElevation: true, maxSpeedMs: 25 },
  swim: { id: "swim", family: "other", usesGps: false, metric: "pace", liveElevation: false, maxSpeedMs: 3 },
  workout: { id: "workout", family: "other", usesGps: false, metric: "pace", liveElevation: false, maxSpeedMs: 3 },
  other: { id: "other", family: "other", usesGps: true, metric: "speed", liveElevation: false, maxSpeedMs: 30 },
};

export function isSportId(v: unknown): v is SportId {
  return typeof v === "string" && (SPORT_IDS as readonly string[]).includes(v);
}

/** Preferência de pausa automática: desligada, só nas corridas/caminhadas ou só na bike. */
export type AutoPauseMode = "off" | "foot" | "ride";

export function autoPauseApplies(mode: AutoPauseMode, sport: SportId): boolean {
  return mode !== "off" && SPORTS[sport].usesGps && SPORTS[sport].family === mode;
}
