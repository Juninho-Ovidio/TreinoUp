import { readFileSync } from "node:fs";
import { join } from "node:path";
import { AVATAR_MAX_BYTES, avatarMime, avatarPath } from "../avatar";
import { onboardingSchema, profileFormSchema, profileLabel } from "../profile";
import {
  normalizeUsername,
  RESERVED_USERNAMES,
  suggestUsername,
  usernameErrorKey,
  validateUsername,
} from "../username";

describe("validateUsername", () => {
  it.each([
    ["ana", null],
    ["ana.corre", null],
    ["bia_pedal_42", null],
    ["a1b", null],
    ["ab", "tooShort"],
    ["a".repeat(31), "tooLong"],
    ["ana-corre", "invalidChars"],
    ["joão", "invalidChars"],
    ["Ana", "invalidChars"],
    [".ana", "invalidEdges"],
    ["ana_", "invalidEdges"],
    ["ana..corre", "consecutiveDots"],
    ["admin", "reserved"],
    ["treinoup", "reserved"],
  ])("%p → %p", (username, error) => {
    expect(validateUsername(username)).toBe(error);
  });

  it("chave de tradução", () => {
    expect(usernameErrorKey("taken")).toBe("validation.username.taken");
  });
});

describe("normalizeUsername", () => {
  it("tira @, espaços e maiúsculas", () => {
    expect(normalizeUsername("  @@Ana.Corre ")).toBe("ana.corre");
  });
});

describe("suggestUsername", () => {
  it.each([
    ["José da Silva", null, "jose.da.silva"],
    ["  Ana-Clara  ", null, "ana.clara"],
    ["Zé", null, "ze.run"],
    ["", "bia.pedal@email.com", "bia.pedal"],
    ["!!!", "x@y.com", "x.run"],
    ["!!!", null, ""],
    ["Maria Eduarda Fernandes de Albuquerque", null, "maria.eduarda.fernandes.de.alb"],
  ])("%p / %p → %p", (name, email, expected) => {
    const s = suggestUsername(name, email);
    expect(s).toBe(expected);
    if (s) expect(validateUsername(s)).toBeNull();
  });

  it("nunca termina em ponto ao cortar", () => {
    const s = suggestUsername("aaaaaaaaaaaaaaaaaaaaaaaaaaaaa b");
    expect(s.endsWith(".")).toBe(false);
    expect(validateUsername(s)).toBeNull();
  });
});

describe("regras iguais no app e no banco", () => {
  const sql = readFileSync(join(__dirname, "../../../../../../supabase/migrations/20261002000001_run_fundacao.sql"), "utf8");

  it("a lista de nomes reservados é a mesma", () => {
    const block = sql.match(/profiles_username_reserved check \(([\s\S]*?)\)\s*\)/)?.[1] ?? "";
    const fromSql = [...block.matchAll(/'([^']+)'/g)].map((m) => m[1]).sort();
    expect(fromSql).toEqual([...RESERVED_USERNAMES].sort());
  });

  it("o formato do banco aceita e recusa os mesmos exemplos", () => {
    const pattern = sql.match(/username ~ '([^']+)'/)?.[1];
    expect(pattern).toBeDefined();
    const re = new RegExp(pattern!);
    const dbAccepts = (u: string) => re.test(u) && !u.includes("..");
    for (const u of ["ana", "ana.corre", "a1b", "x".repeat(30)]) expect(dbAccepts(u)).toBe(true);
    for (const u of ["ab", ".ana", "ana_", "Ana", "ana..b", "ana-b", "x".repeat(31)]) expect(dbAccepts(u)).toBe(false);
  });
});

describe("onboardingSchema", () => {
  it("normaliza o nome de usuário", () => {
    const r = onboardingSchema.safeParse({ username: "@Ana.Corre", displayName: "Ana", units: "metric" });
    expect(r.success && r.data.username).toBe("ana.corre");
  });

  it("devolve a chave do erro do nome de usuário", () => {
    const r = onboardingSchema.safeParse({ username: "ad", displayName: "Ana", units: "metric" });
    expect(!r.success && r.error.issues[0]?.message).toBe("validation.username.tooShort");
  });
});

describe("profileFormSchema", () => {
  it("bio e cidade vazias viram null", () => {
    const r = profileFormSchema.safeParse({ username: "ana", displayName: "Ana", bio: "  ", city: "" });
    expect(r.success && r.data).toEqual({ username: "ana", displayName: "Ana", bio: null, city: null });
  });

  it("limita a bio", () => {
    const r = profileFormSchema.safeParse({ username: "ana", displayName: "Ana", bio: "x".repeat(281), city: "" });
    expect(!r.success && r.error.issues[0]?.message).toBe("validation.bioLong");
  });
});

describe("profileLabel", () => {
  it("prefere o nome, depois @usuario", () => {
    expect(profileLabel({ name: "Ana", username: "ana" })).toBe("Ana");
    expect(profileLabel({ name: " ", username: "ana" })).toBe("@ana");
    expect(profileLabel(null)).toBe("");
  });
});

describe("avatar", () => {
  it.each([
    ["image/png", null, "image/png"],
    ["IMAGE/WEBP", null, "image/webp"],
    [null, "foto.PNG", "image/png"],
    [null, "foto.webp", "image/webp"],
    ["image/heic", "foto.heic", "image/jpeg"],
    [undefined, undefined, "image/jpeg"],
  ])("mime %p / %p → %s", (mime, name, expected) => {
    expect(avatarMime(mime, name)).toBe(expected);
  });

  it("caminho começa pela pasta do usuário", () => {
    expect(avatarPath("u-1", "image/png", 42)).toBe("u-1/avatar-42.png");
  });

  it("limite igual ao do bucket (5 MB)", () => {
    expect(AVATAR_MAX_BYTES).toBe(5242880);
  });
});
