import type { RecordingState, TrackPoint } from "../domain/session";
import type { SportId } from "../domain/sports";

export type ActivityVisibility = "everyone" | "followers" | "only_me";

/** O que a pessoa preenche na tela de resumo. */
export interface SummaryMeta {
  title: string;
  description: string;
  sport: SportId;
  /** Esforço percebido de 1 a 10 (null = não informado). */
  perceivedEffort: number | null;
  visibility: ActivityVisibility;
}

/**
 * Situação de uma gravação no aparelho:
 * - active: gravando ou pausada;
 * - finished: finalizada, esperando a tela de resumo (salvar/descartar);
 * - saved: salva no aparelho, esperando o envio (Fase 2).
 */
export type StoredStatus = "active" | "finished" | "saved";

export interface StoredRecording {
  id: string;
  status: StoredStatus;
  state: RecordingState;
  meta: SummaryMeta | null;
  savedAt: number | null;
}

/** Armazenamento local das gravações (SQLite no celular, localStorage no navegador). */
export interface RecordingStore {
  /** Cria ou atualiza o estado da gravação. Não rebaixa uma gravação já salva. */
  saveState(state: RecordingState): Promise<void>;
  appendPoints(id: string, points: readonly TrackPoint[]): Promise<void>;
  /** A gravação ativa ou finalizada sem resumo mais recente (para recuperar). */
  getUnfinished(): Promise<StoredRecording | null>;
  get(id: string): Promise<StoredRecording | null>;
  points(id: string): Promise<TrackPoint[]>;
  save(id: string, meta: SummaryMeta, savedAt: number): Promise<void>;
  discard(id: string): Promise<void>;
  listSaved(): Promise<StoredRecording[]>;
}

export function storedStatusFor(state: RecordingState): StoredStatus {
  return state.status === "finished" ? "finished" : "active";
}
