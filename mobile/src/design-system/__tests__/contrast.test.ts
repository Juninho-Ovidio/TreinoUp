import { contrastRatio, meetsAA, relativeLuminance } from "../contrast";
import { palettes, type ColorScheme } from "../tokens";

describe("contrastRatio", () => {
  it("preto no branco é 21:1", () => {
    expect(contrastRatio("#000", "#fff")).toBeCloseTo(21, 5);
  });

  it("é simétrico e aceita #RGB", () => {
    expect(contrastRatio("#fff", "#14141A")).toBeCloseTo(contrastRatio("#14141a", "#ffffff"), 10);
  });

  it("recusa cores inválidas", () => {
    expect(() => relativeLuminance("laranja")).toThrow("Cor inválida");
  });

  it("texto grande tem limite menor", () => {
    // #E8A33D sobre branco: ~2.2, falha nos dois
    expect(meetsAA("#E8A33D", "#FFFFFF", true)).toBe(false);
    // #6D6D6D sobre branco: ~5.3
    expect(meetsAA("#6D6D6D", "#FFFFFF")).toBe(true);
  });
});

/** Pares de texto/fundo usados nas telas. Todos precisam passar no WCAG AA (4.5:1). */
const TEXT_PAIRS = [
  ["fg", "bg"],
  ["fg", "surface"],
  ["fg", "surface2"],
  ["muted", "bg"],
  ["muted", "surface"],
  ["brandText", "bg"],
  ["brandText", "surface"],
  ["brandText", "brandSoft"],
  ["onBrand", "brand"],
  ["danger", "surface"],
  ["danger", "dangerSoft"],
  ["ok", "surface"],
] as const;

describe.each<ColorScheme>(["light", "dark"])("paleta %s", (scheme) => {
  const p = palettes[scheme];
  it.each(TEXT_PAIRS)("%s sobre %s passa no AA", (fg, bg) => {
    expect(contrastRatio(p[fg], p[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("tem 5 zonas de FC", () => {
    expect(p.hrZones).toHaveLength(5);
  });
});
