import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";
import { usePrefs, type ThemePreference } from "@/lib/prefs";
import { palettes, type ColorScheme, type Palette } from "./tokens";

export interface Theme {
  scheme: ColorScheme;
  colors: Palette;
  preference: ThemePreference;
}

export function resolveScheme(pref: ThemePreference, system: ColorScheme | null | undefined): ColorScheme {
  if (pref === "light" || pref === "dark") return pref;
  return system === "dark" ? "dark" : "light";
}

const ThemeContext = createContext<Theme>({ scheme: "light", colors: palettes.light, preference: "system" });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const preference = usePrefs((s) => s.theme);
  const value = useMemo<Theme>(() => {
    const scheme = resolveScheme(preference, system === "unspecified" ? null : system);
    return { scheme, colors: palettes[scheme], preference };
  }, [preference, system]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
