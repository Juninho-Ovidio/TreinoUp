import { isShaking, autoPauseStep, EMPTY_AUTO_PAUSE, type AutoPauseState } from "../autoPause";
import { elevationStep, EMPTY_ELEVATION } from "../elevation";
import { dayPeriod, formatDistance, formatDuration, formatElevation, formatPace, formatSpeed, paceParts } from "../format";
import { bounds, distanceMeters, offset } from "../geo";
import { kalmanStep, rejectReason, type RawFix } from "../gpsFilter";
import {
  averageSpeedMs,
  createRecording,
  currentSpeedMs,
  elapsedTimeMs,
  MILE,
  movingTimeMs,
  splitsWithPartial,
  step,
  stepAll,
  type RecordingEvent,
} from "../session";
import { autoPauseApplies, isSportId, SPORTS } from "../sports";

const START = { lat: -23.5874, lng: -46.6576 }; // Parque Ibirapuera
const T0 = Date.UTC(2026, 9, 2, 9, 0, 0);

/** Trajeto em linha reta: um ponto a cada `everyS` segundos, a `speed` m/s. */
function track({
  seconds,
  speed,
  everyS = 1,
  from = START,
  t0 = T0,
  bearing = 90,
  accuracy = 5,
  alt = (i: number) => 760 + 0 * i,
}: {
  seconds: number;
  speed: number;
  everyS?: number;
  from?: { lat: number; lng: number };
  t0?: number;
  bearing?: number;
  accuracy?: number;
  alt?: (i: number) => number;
}): RecordingEvent[] {
  const out: RecordingEvent[] = [];
  for (let i = 0; i <= seconds / everyS; i++) {
    const p = offset(from, speed * everyS * i, bearing);
    out.push({ type: "location", fix: { t: t0 + i * everyS * 1000, ...p, alt: alt(i), accuracy, speed } });
  }
  return out;
}

const fix = (over: Partial<RawFix>): RawFix => ({ t: T0, lat: START.lat, lng: START.lng, alt: null, accuracy: 5, speed: null, ...over });

describe("geo", () => {
  it("distância conhecida: 1 grau de latitude ≈ 111,2 km", () => {
    expect(distanceMeters({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111_195, -1);
  });
  it("offset e distância são coerentes", () => {
    const p = offset(START, 1234, 37);
    expect(distanceMeters(START, p)).toBeCloseTo(1234, 3);
  });
  it("bounds", () => {
    expect(bounds([])).toBeNull();
    expect(bounds([{ lat: 1, lng: 2 }, { lat: -1, lng: 5 }])).toEqual([
      [2, -1],
      [5, 1],
    ]);
  });
});

describe("filtro de GPS", () => {
  it("descarta precisão pior que 30 m ou desconhecida", () => {
    expect(rejectReason(null, fix({ accuracy: 31 }), 12)).toBe("accuracy");
    expect(rejectReason(null, fix({ accuracy: null }), 12)).toBe("accuracy");
    expect(rejectReason(null, fix({ accuracy: 30 }), 12)).toBeNull();
  });
  it("descarta leituras repetidas/fora de ordem", () => {
    expect(rejectReason(fix({}), fix({}), 12)).toBe("stale");
  });
  it("descarta saltos impossíveis para o esporte", () => {
    const far = offset(START, 500, 0);
    expect(rejectReason(fix({}), fix({ t: T0 + 5000, ...far }), 12)).toBe("jump");
    // 500 m em 5 s é possível de carro, mas não correndo; de bike rápida (30 m/s) passa.
    expect(rejectReason(fix({}), fix({ t: T0 + 5000, ...offset(START, 120, 0) }), 30)).toBeNull();
  });
  it("Kalman: leitura imprecisa mexe pouco na estimativa; precisa mexe muito", () => {
    const s0 = kalmanStep(null, fix({ accuracy: 5 }), 3);
    const noisy = offset(START, 40, 0);
    const s1 = kalmanStep(s0, fix({ t: T0 + 1000, ...noisy, accuracy: 30 }), 3);
    expect(distanceMeters(START, s1)).toBeLessThan(5);
    const s2 = kalmanStep(s0, fix({ t: T0 + 1000, ...noisy, accuracy: 3 }), 3);
    expect(distanceMeters(START, s2)).toBeGreaterThan(20);
  });
});

describe("elevação", () => {
  it("ignora oscilação pequena e soma subidas reais", () => {
    let e = EMPTY_ELEVATION;
    for (const a of [760, 762, 759, 761, 760, 762, 759]) e = elevationStep(e, a);
    expect(e.gain).toBe(0);
    for (let a = 760; a <= 800; a += 2) e = elevationStep(e, a);
    for (let i = 0; i < 20; i++) e = elevationStep(e, 800);
    expect(e.gain).toBeGreaterThan(30);
    expect(e.gain).toBeLessThanOrEqual(41);
    for (let a = 800; a >= 780; a -= 2) e = elevationStep(e, a);
    for (let i = 0; i < 20; i++) e = elevationStep(e, 780);
    expect(e.loss).toBeGreaterThan(14);
  });
  it("altitude ausente não muda nada", () => {
    expect(elevationStep(EMPTY_ELEVATION, null)).toBe(EMPTY_ELEVATION);
  });
});

describe("pausa automática (regras)", () => {
  it("bike: parado por 5 s pausa; acima de 1,8 m/s retoma", () => {
    let st = EMPTY_AUTO_PAUSE;
    let d = null as ReturnType<typeof autoPauseStep>["decision"];
    for (let i = 0; i <= 5; i++) ({ state: st, decision: d } = autoPauseStep(st, { t: T0 + i * 1000, speedMs: 0.2 }, "ride", false));
    expect(d).toBe("pause");
    expect(autoPauseStep(st, { t: T0 + 7000, speedMs: 1.0 }, "ride", true).decision).toBeNull();
    expect(autoPauseStep(st, { t: T0 + 8000, speedMs: 2.5 }, "ride", true).decision).toBe("resume");
  });
  it("corrida: celular balançando não pausa mesmo com GPS lento", () => {
    let st: AutoPauseState = { ...EMPTY_AUTO_PAUSE, shaking: true };
    let d = null as ReturnType<typeof autoPauseStep>["decision"];
    for (let i = 0; i <= 6; i++) ({ state: st, decision: d } = autoPauseStep(st, { t: T0 + i * 1000, speedMs: 0.1 }, "foot", false));
    expect(d).toBeNull();
  });
  it("corrida: retoma quando volta a balançar", () => {
    expect(autoPauseStep(EMPTY_AUTO_PAUSE, { t: T0, shaking: true }, "foot", true).decision).toBe("resume");
  });
  it("esportes sem família não pausam", () => {
    expect(autoPauseStep(EMPTY_AUTO_PAUSE, { t: T0, speedMs: 0 }, "other", false).decision).toBeNull();
  });
  it("detector de movimento pelo acelerômetro", () => {
    expect(isShaking([1, 1, 1])).toBeNull();
    expect(isShaking([1, 1.001, 0.999, 1, 1.002, 1])).toBe(false);
    expect(isShaking([0.7, 1.4, 0.8, 1.3, 0.9, 1.5])).toBe(true);
  });
  it("modo da preferência x esporte", () => {
    expect(autoPauseApplies("foot", "run")).toBe(true);
    expect(autoPauseApplies("foot", "ride")).toBe(false);
    expect(autoPauseApplies("ride", "mtb")).toBe(true);
    expect(autoPauseApplies("off", "run")).toBe(false);
    expect(autoPauseApplies("foot", "workout")).toBe(false);
  });
});

describe("sessão de gravação", () => {
  it("corrida de 5 km a 3,33 m/s (5:00/km): distância, tempo e 5 parciais", () => {
    const s0 = createRecording({ id: "a", sport: "run", startedAt: T0 });
    const { state, effects } = stepAll(s0, track({ seconds: 1501, speed: 10 / 3 }));
    expect(state.distanceM).toBeGreaterThan(4990);
    expect(state.distanceM).toBeLessThan(5020);
    expect(state.splits).toHaveLength(5);
    for (const sp of state.splits) {
      expect(sp.distanceM).toBe(1000);
      expect(sp.movingMs / 1000).toBeGreaterThan(296);
      expect(sp.movingMs / 1000).toBeLessThan(304);
    }
    expect(effects.filter((e) => e.type === "split")).toHaveLength(5);
    expect(formatPace(averageSpeedMs(state, T0 + 1501_000), "metric")).toMatch(/^(4:5\d|5:0\d)$/);
    expect(currentSpeedMs(state)).toBeCloseTo(10 / 3, 0);
  });

  it("parciais em milhas no sistema imperial", () => {
    const s0 = createRecording({ id: "a", sport: "run", startedAt: T0, units: "imperial" });
    const { state } = stepAll(s0, track({ seconds: 1000, speed: 4 }));
    expect(state.splitM).toBe(MILE);
    expect(state.splits).toHaveLength(2);
  });

  it("pausa manual não conta tempo nem liga o trajeto entre pausa e retomada", () => {
    let s = createRecording({ id: "a", sport: "run", startedAt: T0 });
    s = stepAll(s, track({ seconds: 60, speed: 3 })).state;
    s = step(s, { type: "pause", t: T0 + 60_000 }).state;
    expect(s.status).toBe("paused");
    // Pontos durante a pausa são ignorados.
    s = stepAll(s, track({ seconds: 60, speed: 3, t0: T0 + 61_000, from: offset(START, 180, 90) })).state;
    const pausedDistance = s.distanceM;
    s = step(s, { type: "resume", t: T0 + 180_000 }).state;
    // Volta a gravar 1 km adiante: sem o "pulo" de 1 km na distância.
    s = stepAll(s, track({ seconds: 60, speed: 3, t0: T0 + 181_000, from: offset(START, 1180, 90) })).state;
    expect(s.distanceM).toBeCloseTo(pausedDistance + 180, -1);
    // 60 s antes da pausa + 61 s depois da retomada (180 s → 241 s).
    expect(movingTimeMs(s, T0 + 241_000)).toBe(121_000);
    expect(elapsedTimeMs(s, T0 + 241_000)).toBe(241_000);
    expect(s.segment).toBe(1);
  });

  it("pausa automática da bike: para no semáforo e volta sozinha", () => {
    let s = createRecording({ id: "a", sport: "ride", startedAt: T0, autoPause: "ride" });
    s = stepAll(s, track({ seconds: 60, speed: 8 })).state;
    const stopAt = offset(START, 480, 90);
    const stopped = stepAll(s, track({ seconds: 20, speed: 0, t0: T0 + 61_000, from: stopAt }));
    expect(stopped.state.status).toBe("paused");
    expect(stopped.state.pauseReason).toBe("auto");
    expect(stopped.effects).toContainEqual({ type: "paused", reason: "auto" });
    const again = stepAll(stopped.state, track({ seconds: 30, speed: 8, t0: T0 + 82_000, from: stopAt }));
    expect(again.state.status).toBe("recording");
    expect(again.effects).toContainEqual({ type: "resumed", reason: "auto" });
    // Os ~20 s parados não entram no tempo em movimento.
    expect(movingTimeMs(again.state, T0 + 112_000) / 1000).toBeLessThan(100);
  });

  it("pausa manual durante a automática não retoma sozinha", () => {
    let s = createRecording({ id: "a", sport: "ride", startedAt: T0, autoPause: "ride" });
    s = stepAll(s, track({ seconds: 30, speed: 0 })).state;
    expect(s.pauseReason).toBe("auto");
    s = step(s, { type: "pause", t: T0 + 31_000 }).state;
    s = stepAll(s, track({ seconds: 20, speed: 8, t0: T0 + 32_000 })).state;
    expect(s.status).toBe("paused");
    expect(s.pauseReason).toBe("manual");
  });

  it("acelerômetro pausa e retoma a corrida", () => {
    let s = createRecording({ id: "a", sport: "run", startedAt: T0, autoPause: "foot" });
    s = stepAll(s, [
      { type: "motion", t: T0 + 1000, shaking: false },
      { type: "motion", t: T0 + 3000, shaking: false },
      { type: "motion", t: T0 + 5500, shaking: false },
    ]).state;
    expect(s.status).toBe("paused");
    s = step(s, { type: "motion", t: T0 + 9000, shaking: true }).state;
    expect(s.status).toBe("recording");
  });

  it("descarta ruído: pontos imprecisos e saltos não somam distância", () => {
    let s = createRecording({ id: "a", sport: "run", startedAt: T0 });
    s = stepAll(s, track({ seconds: 10, speed: 3 })).state;
    const before = s.distanceM;
    s = step(s, { type: "location", fix: fix({ t: T0 + 11_000, ...offset(START, 2000, 0), accuracy: 5 }) }).state;
    s = step(s, { type: "location", fix: fix({ t: T0 + 12_000, ...offset(START, 35, 90), accuracy: 80 }) }).state;
    expect(s.distanceM).toBe(before);
  });

  it("voltas (laps) e volta final ao terminar", () => {
    let s = createRecording({ id: "a", sport: "run", startedAt: T0 });
    s = stepAll(s, track({ seconds: 100, speed: 4 })).state;
    s = step(s, { type: "lap", t: T0 + 100_000 }).state;
    s = stepAll(s, track({ seconds: 50, speed: 4, t0: T0 + 101_000, from: offset(START, 400, 90) })).state;
    const fin = step(s, { type: "finish", t: T0 + 151_000 });
    expect(fin.state.status).toBe("finished");
    expect(fin.state.laps).toHaveLength(2);
    expect(fin.state.laps[0]!.distanceM).toBeCloseTo(400, -1);
    expect(fin.effects).toEqual([{ type: "finished" }]);
    // Depois de finalizada, nada muda.
    expect(step(fin.state, { type: "resume", t: T0 + 200_000 }).state).toBe(fin.state);
  });

  it("parcial final incompleta aparece no resumo", () => {
    let s = createRecording({ id: "a", sport: "run", startedAt: T0 });
    s = stepAll(s, track({ seconds: 400, speed: 3.5 })).state;
    const sp = splitsWithPartial(s, T0 + 400_000);
    expect(sp).toHaveLength(2);
    expect(sp[1]!.distanceM).toBeCloseTo(400, -1);
  });

  it("esporte sem GPS: só cronômetro", () => {
    let s = createRecording({ id: "a", sport: "workout", startedAt: T0 });
    s = stepAll(s, track({ seconds: 60, speed: 3 })).state;
    expect(s.distanceM).toBe(0);
    expect(s.pointCount).toBe(0);
    expect(movingTimeMs(s, T0 + 60_000)).toBe(60_000);
  });

  it("subida conta elevação", () => {
    const s0 = createRecording({ id: "a", sport: "trail_run", startedAt: T0 });
    const { state } = stepAll(s0, track({ seconds: 300, speed: 2, alt: (i) => 760 + i * 0.2 }));
    expect(state.elevation.gain).toBeGreaterThan(50);
  });

  it("o estado é JSON puro (pode ser salvo e recuperado)", () => {
    const s = stepAll(createRecording({ id: "a", sport: "run", startedAt: T0 }), track({ seconds: 30, speed: 3 })).state;
    const back = JSON.parse(JSON.stringify(s));
    expect(back).toEqual(s);
    const next = track({ seconds: 2, speed: 3, t0: T0 + 31_000, from: offset(START, 93, 90) });
    expect(stepAll(back, next).state).toEqual(stepAll(s, next).state);
  });
});

describe("formatação", () => {
  it("duração", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(1661_000)).toBe("27:41");
    expect(formatDuration(3725_000)).toBe("1:02:05");
  });
  it("ritmo, distância, velocidade e elevação", () => {
    expect(formatPace(1000 / 319, "metric")).toBe("5:19");
    expect(formatPace(0.1, "metric")).toBe("–:––");
    expect(formatPace(null, "metric")).toBe("–:––");
    expect(formatDistance(5210, "metric", "pt-BR")).toBe("5,21");
    expect(formatDistance(MILE, "imperial", "en")).toBe("1.00");
    expect(formatSpeed(25 / 3.6, "metric", "pt-BR")).toBe("25,0");
    expect(formatSpeed(null, "metric", "pt-BR")).toBe("0,0");
    expect(formatElevation(100, "imperial", "en")).toBe("328");
    expect(paceParts(1000 / 300, "metric")).toEqual({ min: 5, sec: 0 });
    expect(paceParts(0, "metric")).toBeNull();
  });
  it("período do dia", () => {
    expect(dayPeriod(6)).toBe("morning");
    expect(dayPeriod(13)).toBe("afternoon");
    expect(dayPeriod(19)).toBe("evening");
    expect(dayPeriod(2)).toBe("night");
  });
  it("esportes", () => {
    expect(isSportId("run")).toBe(true);
    expect(isSportId("ski")).toBe(false);
    expect(SPORTS.swim.usesGps).toBe(false);
  });
});
