import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AutoPauseMode, SportId } from "@/features/record/domain/sports";
import type { LanguagePreference } from "@/i18n/language";

export type ThemePreference = "system" | "light" | "dark";

interface PrefsState {
  theme: ThemePreference;
  language: LanguagePreference;
  /** Gravação: último esporte usado, pausa automática, avisos de voz e tela sempre ligada. */
  lastSport: SportId;
  autoPause: AutoPauseMode;
  voiceCues: boolean;
  keepScreenOn: boolean;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
  setLastSport: (sport: SportId) => void;
  setAutoPause: (mode: AutoPauseMode) => void;
  setVoiceCues: (on: boolean) => void;
  setKeepScreenOn: (on: boolean) => void;
}

/** Preferências do aparelho (não sincronizam entre dispositivos). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: "system",
      lastSport: "run",
      autoPause: "off",
      voiceCues: true,
      keepScreenOn: false,
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setLastSport: (lastSport) => set({ lastSport }),
      setAutoPause: (autoPause) => set({ autoPause }),
      setVoiceCues: (voiceCues) => set({ voiceCues }),
      setKeepScreenOn: (keepScreenOn) => set({ keepScreenOn }),
    }),
    {
      name: "treinoup.prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language, lastSport, autoPause, voiceCues, keepScreenOn }) => ({
        theme,
        language,
        lastSport,
        autoPause,
        voiceCues,
        keepScreenOn,
      }),
    },
  ),
);
