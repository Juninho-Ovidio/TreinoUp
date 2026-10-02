import type { RecordingStore, StoredRecording } from "../../data/types";
import { storedStatusFor } from "../../data/types";
import { offset } from "../../domain/geo";
import type { RecordingEvent, TrackPoint } from "../../domain/session";
import { createRecorder } from "../recorder";

/** Banco em memória com o mesmo contrato do SQLite. */
function memoryStore(): RecordingStore & { rows: Map<string, StoredRecording>; pts: Map<string, TrackPoint[]> } {
  const rows = new Map<string, StoredRecording>();
  const pts = new Map<string, TrackPoint[]>();
  return {
    rows,
    pts,
    async saveState(state) {
      const prev = rows.get(state.id);
      rows.set(state.id, {
        id: state.id,
        state: JSON.parse(JSON.stringify(state)),
        status: prev?.status === "saved" ? "saved" : storedStatusFor(state),
        meta: prev?.meta ?? null,
        savedAt: prev?.savedAt ?? null,
      });
    },
    async appendPoints(id, points) {
      pts.set(id, [...(pts.get(id) ?? []), ...points]);
    },
    async getUnfinished() {
      return [...rows.values()].filter((r) => r.status !== "saved").sort((a, b) => b.state.startedAt - a.state.startedAt)[0] ?? null;
    },
    async get(id) {
      return rows.get(id) ?? null;
    },
    async points(id) {
      return pts.get(id) ?? [];
    },
    async save(id, meta, savedAt) {
      const r = rows.get(id)!;
      rows.set(id, { ...r, status: "saved", meta, savedAt });
    },
    async discard(id) {
      rows.delete(id);
      pts.delete(id);
    },
    async listSaved() {
      return [...rows.values()].filter((r) => r.status === "saved");
    },
  };
}

const START = { lat: -23.5874, lng: -46.6576 };
const T0 = 1_790_000_000_000;

function fixes(seconds: number, speed: number, t0 = T0): RecordingEvent[] {
  return Array.from({ length: seconds + 1 }, (_, i) => ({
    type: "location" as const,
    fix: { t: t0 + i * 1000, ...offset(START, speed * i, 90), alt: 760, accuracy: 5, speed },
  }));
}

function setup() {
  let clock = T0;
  const store = memoryStore();
  const effects: string[] = [];
  const recorder = createRecorder({
    store,
    now: () => clock,
    newId: () => "rec-1",
    onEffects: (e) => effects.push(...e.map((x) => x.type)),
  });
  return { store, recorder, effects, tick: (ms: number) => (clock += ms) };
}

describe("recorder", () => {
  it("grava, salva pontos e estado, e avisa a tela", async () => {
    const { store, recorder, effects } = setup();
    const seen: (string | null)[] = [];
    recorder.subscribe((s) => seen.push(s?.status ?? null));
    await recorder.start({ sport: "run", autoPause: "off", units: "metric" });
    await recorder.dispatch(fixes(400, 3));
    expect(store.pts.get("rec-1")!.length).toBeGreaterThan(390);
    expect(store.rows.get("rec-1")!.state.distanceM).toBeGreaterThan(1150);
    expect(effects).toContain("split");
    expect(seen[0]).toBe("recording");
  });

  it("recupera a gravação depois que o app fecha (novo motor lendo o mesmo banco)", async () => {
    const { store, recorder } = setup();
    await recorder.start({ sport: "run", autoPause: "off", units: "metric" });
    await recorder.dispatch(fixes(60, 3));
    const before = recorder.current()!;

    const reborn = createRecorder({ store, now: () => T0 + 61_000, newId: () => "outro" });
    const restored = await reborn.load();
    expect(restored).toEqual(before);
    await reborn.dispatch(fixes(10, 3, T0 + 61_000).map((e, i) => (e.type === "location" ? { ...e, fix: { ...e.fix, ...offset(START, 183 + 3 * i, 90) } } : e)));
    expect(reborn.current()!.distanceM).toBeGreaterThan(before.distanceM);
    // Não começa outra gravação por cima da recuperada.
    expect((await reborn.start({ sport: "ride", autoPause: "off", units: "metric" })).id).toBe("rec-1");
  });

  it("pausar, retomar, finalizar e salvar o resumo", async () => {
    const { store, recorder, tick } = setup();
    await recorder.start({ sport: "run", autoPause: "off", units: "metric" });
    tick(30_000);
    expect((await recorder.pause())!.status).toBe("paused");
    tick(10_000);
    expect((await recorder.resume())!.status).toBe("recording");
    tick(5_000);
    const fin = await recorder.finish();
    expect(fin!.status).toBe("finished");
    expect(fin!.movingMs).toBe(35_000);
    expect((await store.getUnfinished())!.status).toBe("finished");

    await recorder.save({ title: "Corrida", description: "", sport: "run", perceivedEffort: 6, visibility: "followers" });
    expect(recorder.current()).toBeNull();
    expect(await store.getUnfinished()).toBeNull();
    expect((await store.listSaved())[0]!.meta!.perceivedEffort).toBe(6);
  });

  it("descartar apaga a gravação e os pontos", async () => {
    const { store, recorder } = setup();
    await recorder.start({ sport: "run", autoPause: "off", units: "metric" });
    await recorder.dispatch(fixes(20, 3));
    await recorder.finish();
    await recorder.discard();
    expect(store.rows.size).toBe(0);
    expect(store.pts.size).toBe(0);
  });

  it("eventos simultâneos (tela + segundo plano) são aplicados em ordem", async () => {
    const { recorder } = setup();
    await recorder.start({ sport: "run", autoPause: "off", units: "metric" });
    const all = fixes(30, 3);
    await Promise.all([recorder.dispatch(all.slice(0, 15)), recorder.dispatch(all.slice(15))]);
    expect(recorder.current()!.pointCount).toBe(31);
    expect((await recorder.points()).map((p) => p.t)).toEqual(all.map((e) => (e.type === "location" ? e.fix.t : 0)));
  });

  it("sem gravação, eventos não fazem nada", async () => {
    const { recorder } = setup();
    expect(await recorder.dispatch(fixes(3, 3))).toBeNull();
    expect(await recorder.points()).toEqual([]);
  });
});
