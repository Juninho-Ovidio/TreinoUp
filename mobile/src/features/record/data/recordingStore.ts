import * as SQLite from "expo-sqlite";
import type { RecordingState, TrackPoint } from "../domain/session";
import { storedStatusFor, type RecordingStore, type StoredRecording, type SummaryMeta } from "./types";

/**
 * Gravações no SQLite do aparelho (funciona sem internet e sobrevive ao app fechar).
 * Também é usado pela tarefa de localização em segundo plano.
 */

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function db(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const d = await SQLite.openDatabaseAsync("treinoup-recordings.db");
      await d.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS recordings (
          id TEXT PRIMARY KEY NOT NULL,
          status TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          state TEXT NOT NULL,
          meta TEXT,
          saved_at INTEGER
        );
        CREATE INDEX IF NOT EXISTS recordings_status ON recordings (status, started_at);
        CREATE TABLE IF NOT EXISTS points (
          recording_id TEXT NOT NULL,
          t INTEGER NOT NULL,
          lat REAL NOT NULL,
          lng REAL NOT NULL,
          alt REAL,
          accuracy REAL NOT NULL,
          speed REAL,
          segment INTEGER NOT NULL,
          PRIMARY KEY (recording_id, t)
        );
      `);
      return d;
    })();
  }
  return dbPromise;
}

interface Row {
  id: string;
  status: StoredRecording["status"];
  state: string;
  meta: string | null;
  saved_at: number | null;
}

const toStored = (r: Row): StoredRecording => ({
  id: r.id,
  status: r.status,
  state: JSON.parse(r.state) as RecordingState,
  meta: r.meta ? (JSON.parse(r.meta) as SummaryMeta) : null,
  savedAt: r.saved_at,
});

export const recordingStore: RecordingStore = {
  async saveState(state) {
    const d = await db();
    await d.runAsync(
      `INSERT INTO recordings (id, status, started_at, state) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         state = excluded.state,
         status = CASE WHEN recordings.status = 'saved' THEN 'saved' ELSE excluded.status END`,
      state.id,
      storedStatusFor(state),
      state.startedAt,
      JSON.stringify(state),
    );
  },

  async appendPoints(id, points) {
    if (!points.length) return;
    const d = await db();
    await d.withTransactionAsync(async () => {
      for (const p of points) {
        await d.runAsync(
          "INSERT OR IGNORE INTO points (recording_id, t, lat, lng, alt, accuracy, speed, segment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          id,
          p.t,
          p.lat,
          p.lng,
          p.alt,
          p.accuracy,
          p.speed,
          p.segment,
        );
      }
    });
  },

  async getUnfinished() {
    const d = await db();
    const row = await d.getFirstAsync<Row>(
      "SELECT id, status, state, meta, saved_at FROM recordings WHERE status IN ('active', 'finished') ORDER BY started_at DESC LIMIT 1",
    );
    return row ? toStored(row) : null;
  },

  async get(id) {
    const d = await db();
    const row = await d.getFirstAsync<Row>("SELECT id, status, state, meta, saved_at FROM recordings WHERE id = ?", id);
    return row ? toStored(row) : null;
  },

  async points(id) {
    const d = await db();
    const rows = await d.getAllAsync<TrackPoint>(
      "SELECT t, lat, lng, alt, accuracy, speed, segment FROM points WHERE recording_id = ? ORDER BY t",
      id,
    );
    return rows;
  },

  async save(id, meta, savedAt) {
    const d = await db();
    await d.runAsync("UPDATE recordings SET status = 'saved', meta = ?, saved_at = ? WHERE id = ?", JSON.stringify(meta), savedAt, id);
  },

  async discard(id) {
    const d = await db();
    await d.withTransactionAsync(async () => {
      await d.runAsync("DELETE FROM points WHERE recording_id = ?", id);
      await d.runAsync("DELETE FROM recordings WHERE id = ?", id);
    });
  },

  async listSaved() {
    const d = await db();
    const rows = await d.getAllAsync<Row>(
      "SELECT id, status, state, meta, saved_at FROM recordings WHERE status = 'saved' ORDER BY started_at DESC LIMIT 200",
    );
    return rows.map(toStored);
  },
};
