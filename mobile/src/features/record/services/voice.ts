import * as Speech from "expo-speech";
import i18n from "@/i18n";
import { usePrefs } from "@/lib/prefs";
import { formatDuration, formatSpeed, paceParts } from "../domain/format";
import { MILE, type Effect, type RecordingState } from "../domain/session";
import { SPORTS } from "../domain/sports";

type VoiceKey = "started" | "paused" | "resumed" | "autoPaused" | "autoResumed" | "finished";

/** Fala um aviso curto, se os avisos de voz estiverem ligados. */
export function speak(key: VoiceKey) {
  if (!usePrefs.getState().voiceCues) return;
  Speech.speak(i18n.t(`rec.voice.${key}`), { language: i18n.language });
}

/** Avisos a partir dos efeitos da gravação (parcial, pausa automática, fim). */
export function announceEffects(effects: readonly Effect[], state: RecordingState) {
  if (!usePrefs.getState().voiceCues) return;
  const units = state.splitM === MILE ? "imperial" : "metric";
  for (const e of effects) {
    if (e.type === "paused") speak(e.reason === "auto" ? "autoPaused" : "paused");
    else if (e.type === "resumed") speak(e.reason === "auto" ? "autoResumed" : "resumed");
    else if (e.type === "finished") speak("finished");
    else if (e.type === "split") {
      const speedMs = e.split.movingMs > 0 ? e.split.distanceM / (e.split.movingMs / 1000) : null;
      const unit = i18n.t(units === "imperial" ? "rec.voice.unitMi" : "rec.voice.unitKm");
      const time = formatDuration(e.split.movingMs);
      const parts = paceParts(speedMs, units);
      const text =
        SPORTS[state.sport].metric === "pace" && parts
          ? i18n.t("rec.voice.splitPace", { unit, n: e.split.index, time, ...parts })
          : i18n.t("rec.voice.splitSpeed", {
              unit,
              n: e.split.index,
              time,
              speed: `${formatSpeed(speedMs, units, i18n.language)} ${i18n.t(units === "imperial" ? "rec.units.mph" : "rec.units.kmh")}`,
            });
      Speech.speak(text, { language: i18n.language });
    }
  }
}
