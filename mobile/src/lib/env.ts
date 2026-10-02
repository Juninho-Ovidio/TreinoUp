/**
 * Variáveis públicas do app (EXPO_PUBLIC_*), embutidas no bundle pelo Expo.
 * Nunca coloque segredos aqui: tudo que começa com EXPO_PUBLIC_ fica visível no app.
 * O acesso precisa ser literal (process.env.EXPO_PUBLIC_X) para o Expo fazer a substituição.
 */

export interface Env {
  supabaseUrl: string;
  supabaseAnonKey: string;
  authGoogle: boolean;
  authApple: boolean;
}

export type EnvResult = { ok: true; env: Env } | { ok: false; missing: string[] };

export function parseEnv(raw: Record<string, string | undefined>): EnvResult {
  const url = raw.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const key = raw.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const missing: string[] = [];
  if (!/^https?:\/\/\S+$/.test(url) || url.includes("SEU-PROJETO")) missing.push("EXPO_PUBLIC_SUPABASE_URL");
  if (!key || key === "sua-chave-publica") missing.push("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (missing.length) return { ok: false, missing };
  return {
    ok: true,
    env: {
      supabaseUrl: url.replace(/\/+$/, ""),
      supabaseAnonKey: key,
      authGoogle: raw.EXPO_PUBLIC_AUTH_GOOGLE === "true",
      authApple: raw.EXPO_PUBLIC_AUTH_APPLE === "true",
    },
  };
}

export const envResult: EnvResult = parseEnv({
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  EXPO_PUBLIC_AUTH_GOOGLE: process.env.EXPO_PUBLIC_AUTH_GOOGLE,
  EXPO_PUBLIC_AUTH_APPLE: process.env.EXPO_PUBLIC_AUTH_APPLE,
});
