export const SUPPORTED_LANGUAGES = ["pt-BR", "en", "es"] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];
export type LanguagePreference = "system" | Language;

export const DEFAULT_LANGUAGE: Language = "pt-BR";

/** Converte a tag do aparelho (ex.: "pt-PT", "es-AR", "en-US") para um idioma do app. */
export function resolveLanguage(deviceTag: string | null | undefined): Language {
  const base = (deviceTag ?? "").toLowerCase().split(/[-_]/)[0];
  if (base === "pt") return "pt-BR";
  if (base === "es") return "es";
  if (base === "en") return "en";
  return DEFAULT_LANGUAGE;
}

export function effectiveLanguage(pref: LanguagePreference, deviceTag: string | null | undefined): Language {
  return pref === "system" ? resolveLanguage(deviceTag) : pref;
}
