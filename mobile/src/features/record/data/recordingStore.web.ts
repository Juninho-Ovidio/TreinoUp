import type { TrackPoint } from "../domain/session";
import { storedStatusFor, type RecordingStore, type StoredRecording } from "./types";

/**
 * No navegador o SQLite do Expo ainda é experimental: as gravações ficam no localStorage.
 * Serve para testar as telas; a gravação de verdade (tela bloqueada, segundo plano) é no celular.
 */

const KEY = "treinoup.recordings";
const pointsKey = (id: string) => `treinoup.points.${id}`;

function readAll(): StoredRecording[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]") as StoredRecording[];
  } catch {
    return [];
  }
}

function writeAll(list: StoredRecording[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
}

function readPoints(id: string): TrackPoint[] {
  try {
    return JSON.parse(localStorage.getItem(pointsKey(id)) ?? "[]") as TrackPoint[];
  } catch {
    return [];
  }
}

export const recordingStore: RecordingStore = {
  async saveState(state) {
    const list = readAll();
    const i = list.findIndex((r) => r.id === state.id);
    if (i < 0) list.push({ id: state.id, status: storedStatusFor(state), state, meta: null, savedAt: null });
    else list[i] = { ...list[i]!, state, status: list[i]!.status === "saved" ? "saved" : storedStatusFor(state) };
    writeAll(list);
  },

  async appendPoints(id, points) {
    if (!points.length) return;
    const existing = readPoints(id);
    const last = existing[existing.length - 1]?.t ?? -Infinity;
    localStorage.setItem(pointsKey(id), JSON.stringify([...existing, ...points.filter((p) => p.t > last)]));
  },

  async getUnfinished() {
    return (
      readAll()
        .filter((r) => r.status !== "saved")
        .sort((a, b) => b.state.startedAt - a.state.startedAt)[0] ?? null
    );
  },

  async get(id) {
    return readAll().find((r) => r.id === id) ?? null;
  },

  async points(id) {
    return readPoints(id);
  },

  async save(id, meta, savedAt) {
    writeAll(readAll().map((r) => (r.id === id ? { ...r, status: "saved", meta, savedAt } : r)));
  },

  async discard(id) {
    writeAll(readAll().filter((r) => r.id !== id));
    localStorage.removeItem(pointsKey(id));
  },

  async listSaved() {
    return readAll()
      .filter((r) => r.status === "saved")
      .sort((a, b) => b.state.startedAt - a.state.startedAt);
  },
};
