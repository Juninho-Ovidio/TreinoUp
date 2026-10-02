import i18n from "@/i18n";
import { usePrefs } from "@/lib/prefs";
import type { SummaryMeta } from "../data/types";
import type { SportId } from "../domain/sports";
import { currentAccess, isTracking, startTracking, stopTracking } from "../services/locationTracking";
import type { LocationAccess } from "../services/locationTypes";
import { recorder } from "../services/recorderInstance";
import { speak } from "../services/voice";
import { SPORTS } from "../domain/sports";

const texts = () => ({
  notificationTitle: i18n.t("rec.perm.notificationTitle"),
  notificationBody: i18n.t("rec.perm.notificationBody"),
});

/** Começa a gravar: cria a gravação e liga o GPS (se o esporte usar). */
export async function startSession(sport: SportId, access: LocationAccess, units: "metric" | "imperial") {
  const { autoPause } = usePrefs.getState();
  usePrefs.getState().setLastSport(sport);
  await recorder.start({ sport, autoPause, units });
  if (SPORTS[sport].usesGps) await startTracking(access, texts());
  speak("started");
}

/**
 * Garante o GPS ligado para uma gravação em andamento (ex.: app reaberto depois de fechar).
 * Retorna o tipo de acesso disponível.
 */
export async function ensureTracking(): Promise<LocationAccess> {
  const state = recorder.current();
  const access = await currentAccess();
  if (state && state.status !== "finished" && SPORTS[state.sport].usesGps && !(await isTracking())) {
    await startTracking(access, texts());
  }
  return access;
}

export async function finishSession() {
  await recorder.finish();
  await stopTracking();
}

export async function saveSession(meta: SummaryMeta) {
  await stopTracking();
  await recorder.save(meta);
}

export async function discardSession() {
  await stopTracking();
  await recorder.discard();
}
