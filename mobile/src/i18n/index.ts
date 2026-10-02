import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";
import en from "./locales/en";
import es from "./locales/es";
import ptBR from "./locales/pt-BR";
import { DEFAULT_LANGUAGE, effectiveLanguage, type LanguagePreference } from "./language";

export const resources = {
  "pt-BR": { translation: ptBR },
  en: { translation: en },
  es: { translation: es },
} as const;

export function deviceLanguageTag(): string | null {
  return getLocales()[0]?.languageTag ?? null;
}

const i18n = createInstance();

i18n.use(initReactI18next).init({
  resources,
  lng: effectiveLanguage("system", deviceLanguageTag()),
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  returnNull: false,
});

export function applyLanguagePreference(pref: LanguagePreference) {
  const lng = effectiveLanguage(pref, deviceLanguageTag());
  if (i18n.language !== lng) i18n.changeLanguage(lng);
}

export default i18n;
