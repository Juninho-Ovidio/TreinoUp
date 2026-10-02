/**
 * Tokens do TreinoUp Run. Mesma identidade do TreinoUp web (ouro âmbar sobre grafite,
 * Manrope + Plus Jakarta Sans), com três ajustes no tema claro para passar no WCAG AA:
 * texto escuro sobre o ouro, links em âmbar escuro e cinza secundário um pouco mais escuro.
 * Os contrastes são verificados em src/design-system/__tests__/contrast.test.ts.
 */

export type ColorScheme = "light" | "dark";

export interface Palette {
  bg: string;
  surface: string;
  surface2: string;
  fg: string;
  muted: string;
  faint: string;
  line: string;
  /** Cor de destaque para preenchimentos (botões, rota no mapa, curtida, foco). */
  brand: string;
  brandStrong: string;
  brandSoft: string;
  /** Texto e ícones em destaque sobre bg/surface. */
  brandText: string;
  /** Texto sobre `brand`. */
  onBrand: string;
  danger: string;
  dangerSoft: string;
  ok: string;
  warn: string;
  info: string;
  ringTrack: string;
  overlay: string;
  /** Linha da rota no mapa e o contorno que a separa do fundo. */
  route: string;
  routeCasing: string;
  /** Zonas de frequência cardíaca (Z1 → Z5). */
  hrZones: readonly [string, string, string, string, string];
}

/** Grafite e dourado do dock/cabeçalho: iguais nos dois temas, como no TreinoUp. */
export const chrome = {
  graphite: "#14141A",
  graphiteRaised: "#1D1D26",
  glass: "rgba(20, 20, 26, 0.92)",
  glassDark: "rgba(29, 29, 38, 0.92)",
  border: "rgba(255, 255, 255, 0.10)",
  gold: "#FFD27A",
  goldLight: "#FFE29A",
  goldDeep: "#E8A33D",
  goldGlow: "rgba(232, 163, 61, 0.16)",
  idle: "rgba(255, 255, 255, 0.58)",
  pill: "rgba(255, 255, 255, 0.08)",
  white: "#FFFFFF",
} as const;

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    bg: "#FAF8F5",
    surface: "#FFFFFF",
    surface2: "#F5F3F0",
    fg: "#14141A",
    muted: "#6D6D6D",
    faint: "#A9A9A9",
    line: "#E8E6E2",
    brand: "#E8A33D",
    brandStrong: "#D48F1F",
    brandSoft: "#FEF3E5",
    brandText: "#8F5606",
    onBrand: "#14141A",
    danger: "#C9363B",
    dangerSoft: "#FDECEC",
    ok: "#237A50",
    warn: "#B4600F",
    info: "#2F6FCF",
    ringTrack: "#EDE9E5",
    overlay: "rgba(20, 20, 26, 0.45)",
    route: "#E8A33D",
    routeCasing: "#14141A",
    hrZones: ["#8C96A3", "#3AA6E8", "#2F9E6A", "#F0892F", "#E5484D"],
  },
  dark: {
    bg: "#0F0F14",
    surface: "#14141A",
    surface2: "#1A1A21",
    fg: "#F5F5F5",
    muted: "#A0A0A0",
    faint: "#717171",
    line: "#2A2A30",
    brand: "#FFE29A",
    brandStrong: "#FFD64F",
    brandSoft: "#2A2412",
    brandText: "#FFD27A",
    onBrand: "#14141A",
    danger: "#F2787B",
    dangerSoft: "#3A1C1E",
    ok: "#4CC38A",
    warn: "#F5A15A",
    info: "#6EA4F7",
    ringTrack: "#252530",
    overlay: "rgba(0, 0, 0, 0.6)",
    route: "#FFD27A",
    routeCasing: "#0F0F14",
    hrZones: ["#9AA3AD", "#5BB8F0", "#4CC38A", "#F5A15A", "#F2787B"],
  },
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  card: 20,
  dock: 28,
  full: 999,
} as const;

/** Escala de 4 px. */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Alvo de toque mínimo (iOS 44 pt, Android 48 dp). */
export const touchTarget = 48;

export const motion = {
  fast: 150,
  base: 200,
  slow: 250,
} as const;

/**
 * Famílias carregadas em src/design-system/fonts.ts. No React Native cada peso é uma
 * família separada, então os componentes escolhem a família em vez de `fontWeight`.
 */
export const fonts = {
  regular: "Manrope_400Regular",
  medium: "Manrope_500Medium",
  semibold: "Manrope_600SemiBold",
  bold: "Manrope_700Bold",
  extrabold: "Manrope_800ExtraBold",
  displaySemibold: "PlusJakartaSans_600SemiBold",
  display: "PlusJakartaSans_800ExtraBold",
} as const;

export type FontToken = keyof typeof fonts;

export const typography = {
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.extrabold, fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { fontFamily: fonts.bold, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 16 },
  overline: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: "uppercase" },
  /** Números grandes (distância, tempo, ritmo) sempre com dígitos de largura fixa. */
  metric: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32, fontVariant: ["tabular-nums"] },
  metricSmall: { fontFamily: fonts.displaySemibold, fontSize: 18, lineHeight: 22, fontVariant: ["tabular-nums"] },
} as const;

export type TypographyVariant = keyof typeof typography;
