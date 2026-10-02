/**
 * Motor da gravação: aplica eventos na máquina de estados, salva tudo no banco local e avisa a tela.
 * Todas as operações passam por uma fila, porque a tarefa de GPS em segundo plano e a tela podem
 * chamar ao mesmo tempo. As dependências são injetadas para os testes.
 */

import { createRecording, stepAll, type Effect, type RecordingEvent, type RecordingState, type TrackPoint } from "../domain/session";
import type { AutoPauseMode, SportId } from "../domain/sports";
import type { RecordingStore, SummaryMeta } from "../data/types";

export interface RecorderDeps {
  store: RecordingStore;
  now: () => number;
  newId: () => string;
  /** Chamado depois de cada lote salvo (voz, vibração…). */
  onEffects?: (effects: Effect[], state: RecordingState) => void;
}

export interface Recorder {
  /** Carrega a gravação em andamento do banco (abertura do app ou tarefa em segundo plano). */
  load(): Promise<RecordingState | null>;
  start(opts: { sport: SportId; autoPause: AutoPauseMode; units: "metric" | "imperial" }): Promise<RecordingState>;
  dispatch(events: readonly RecordingEvent[]): Promise<RecordingState | null>;
  pause(): Promise<RecordingState | null>;
  resume(): Promise<RecordingState | null>;
  lap(): Promise<RecordingState | null>;
  finish(): Promise<RecordingState | null>;
  /** Salva o resumo; a gravação deixa de ser "em andamento". */
  save(meta: SummaryMeta): Promise<void>;
  discard(): Promise<void>;
  current(): RecordingState | null;
  /** Pontos já salvos da gravação atual (para desenhar o mapa). */
  points(): Promise<TrackPoint[]>;
  subscribe(listener: (state: RecordingState | null) => void): () => void;
}

export function createRecorder({ store, now, newId, onEffects }: RecorderDeps): Recorder {
  let state: RecordingState | null = null;
  let loaded = false;
  const listeners = new Set<(s: RecordingState | null) => void>();
  let queue: Promise<unknown> = Promise.resolve();

  const notify = () => listeners.forEach((l) => l(state));

  /** Enfileira: cada operação espera a anterior terminar (mesmo se ela falhar). */
  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = queue.then(fn, fn);
    queue = run.catch(() => undefined);
    return run;
  }

  async function ensureLoaded() {
    if (loaded) return;
    const stored = await store.getUnfinished();
    state = stored?.state ?? null;
    loaded = true;
  }

  async function apply(events: readonly RecordingEvent[]): Promise<RecordingState | null> {
    await ensureLoaded();
    if (!state || !events.length) return state;
    const r = stepAll(state, events);
    state = r.state;
    const points = r.effects.flatMap((e) => (e.type === "point" ? [e.point] : []));
    await store.appendPoints(state.id, points);
    await store.saveState(state);
    notify();
    if (r.effects.length) onEffects?.(r.effects, state);
    return state;
  }

  return {
    load: () =>
      enqueue(async () => {
        await ensureLoaded();
        notify();
        return state;
      }),

    start: (opts) =>
      enqueue(async () => {
        await ensureLoaded();
        if (state && state.status !== "finished") return state;
        state = createRecording({ id: newId(), startedAt: now(), ...opts });
        await store.saveState(state);
        notify();
        return state;
      }),

    dispatch: (events) => enqueue(() => apply(events)),
    pause: () => enqueue(() => apply([{ type: "pause", t: now() }])),
    resume: () => enqueue(() => apply([{ type: "resume", t: now() }])),
    lap: () => enqueue(() => apply([{ type: "lap", t: now() }])),
    finish: () => enqueue(() => apply([{ type: "finish", t: now() }])),

    save: (meta) =>
      enqueue(async () => {
        await ensureLoaded();
        if (!state) return;
        await store.save(state.id, meta, now());
        state = null;
        notify();
      }),

    discard: () =>
      enqueue(async () => {
        await ensureLoaded();
        if (!state) return;
        await store.discard(state.id);
        state = null;
        notify();
      }),

    current: () => state,

    points: () =>
      enqueue(async () => {
        await ensureLoaded();
        return state ? store.points(state.id) : [];
      }),

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
