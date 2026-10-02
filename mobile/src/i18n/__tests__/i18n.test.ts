import en from "../locales/en";
import es from "../locales/es";
import ptBR from "../locales/pt-BR";
import { effectiveLanguage, resolveLanguage } from "../language";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

function placeholders(obj: object): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const walk = (o: object, prefix: string) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === "string") out[`${prefix}${k}`] = [...v.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!).sort();
      else if (v && typeof v === "object") walk(v, `${prefix}${k}.`);
    }
  };
  walk(obj, "");
  return out;
}

describe("traduções", () => {
  it.each([
    ["en", en],
    ["es", es],
  ])("%s tem exatamente as mesmas chaves do pt-BR", (_name, locale) => {
    expect(keys(locale).sort()).toEqual(keys(ptBR).sort());
  });

  it.each([
    ["en", en],
    ["es", es],
  ])("%s usa as mesmas variáveis {{…}}", (_name, locale) => {
    expect(placeholders(locale)).toEqual(placeholders(ptBR));
  });

  it("nenhum texto vazio", () => {
    for (const locale of [ptBR, en, es]) {
      for (const [k, v] of Object.entries(placeholders(locale))) expect([k, v]).toBeDefined();
      expect(JSON.stringify(locale)).not.toMatch(/:""/);
    }
  });
});

describe("resolveLanguage", () => {
  it.each([
    ["pt-BR", "pt-BR"],
    ["pt-PT", "pt-BR"],
    ["es-AR", "es"],
    ["en_US", "en"],
    ["fr-FR", "pt-BR"],
    [null, "pt-BR"],
  ])("%p → %s", (tag, lang) => {
    expect(resolveLanguage(tag)).toBe(lang);
  });

  it("preferência manual vence o aparelho", () => {
    expect(effectiveLanguage("es", "en-US")).toBe("es");
    expect(effectiveLanguage("system", "en-US")).toBe("en");
  });
});
