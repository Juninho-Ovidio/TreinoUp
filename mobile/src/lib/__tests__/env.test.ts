import { parseEnv } from "../env";

describe("parseEnv", () => {
  it("aceita URL e chave e normaliza a URL", () => {
    const r = parseEnv({
      EXPO_PUBLIC_SUPABASE_URL: " https://abc.supabase.co/ ",
      EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_123",
      EXPO_PUBLIC_AUTH_GOOGLE: "true",
    });
    expect(r).toEqual({
      ok: true,
      env: { supabaseUrl: "https://abc.supabase.co", supabaseAnonKey: "sb_publishable_123", authGoogle: true, authApple: false },
    });
  });

  it("aponta o que falta, inclusive os valores de exemplo", () => {
    expect(parseEnv({})).toEqual({ ok: false, missing: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"] });
    expect(
      parseEnv({
        EXPO_PUBLIC_SUPABASE_URL: "https://SEU-PROJETO.supabase.co",
        EXPO_PUBLIC_SUPABASE_ANON_KEY: "sua-chave-publica",
      }),
    ).toEqual({ ok: false, missing: ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY"] });
  });

  it("recusa URL sem protocolo", () => {
    expect(parseEnv({ EXPO_PUBLIC_SUPABASE_URL: "abc.supabase.co", EXPO_PUBLIC_SUPABASE_ANON_KEY: "k" }).ok).toBe(false);
  });
});
