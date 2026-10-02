import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LanguagePreference } from "@/i18n/language";

export type ThemePreference = "system" | "light" | "dark";

interface PrefsState {
  theme: ThemePreference;
  language: LanguagePreference;
  setTheme: (theme: ThemePreference) => void;
  setLanguage: (language: LanguagePreference) => void;
}

/** Preferências do aparelho (não sincronizam entre dispositivos). */
export const usePrefs = create<PrefsState>()(
  persist(
    (set) => ({
      theme: "system",
      language: "system",
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "treinoup.prefs",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ theme, language }) => ({ theme, language }),
    },
  ),
);
