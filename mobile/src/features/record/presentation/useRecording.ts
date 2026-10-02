import { useEffect, useState, useSyncExternalStore } from "react";
import type { RecordingState, TrackPoint } from "../domain/session";
import { recorder } from "../services/recorderInstance";

/** Estado da gravação atual (null se não houver), atualizado a cada ponto/evento. */
export function useRecordingState(): RecordingState | null {
  return useSyncExternalStore(recorder.subscribe, recorder.current, recorder.current);
}

/** Relógio que anda a cada segundo enquanto `running` (para o cronômetro na tela). */
export function useNow(running: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return now;
}

/**
 * Pontos do percurso da gravação atual, para o mapa.
 * Acrescenta o ponto novo a cada evento; se chegar um lote (ex.: app voltando do segundo plano),
 * recarrega tudo do banco local para não perder os pontos do meio.
 */
let cache: { id: string | null; points: TrackPoint[] } = { id: null, points: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function reload(id: string) {
  recorder.points().then((points) => {
    if (cache.id !== id) return;
    cache = { id, points };
    emit();
  });
}

recorder.subscribe((s) => {
  if (!s) {
    if (cache.id !== null) {
      cache = { id: null, points: [] };
      emit();
    }
    return;
  }
  if (s.id !== cache.id) {
    cache = { id: s.id, points: [] };
    emit();
    reload(s.id);
    return;
  }
  const last = s.lastPoint;
  const known = cache.points[cache.points.length - 1]?.t ?? -Infinity;
  if (!last || last.t <= known) return;
  if (s.pointCount === cache.points.length + 1) {
    cache = { id: s.id, points: [...cache.points, last] };
    emit();
  } else {
    reload(s.id);
  }
});

const subscribePoints = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getPoints = () => cache.points;

export function useTrackPoints(): TrackPoint[] {
  return useSyncExternalStore(subscribePoints, getPoints, getPoints);
}
