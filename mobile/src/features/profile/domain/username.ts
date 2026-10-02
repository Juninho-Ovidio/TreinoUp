/**
 * Regras do nome de usuário. As mesmas regras estão no banco (constraint `profiles_username_format`
 * e `profiles_username_reserved` em supabase/migrations, na raiz do repositório); um teste garante que as listas batem.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;

export const RESERVED_USERNAMES = [
  "admin",
  "administrador",
  "ajuda",
  "api",
  "app",
  "help",
  "me",
  "moderador",
  "root",
  "run",
  "settings",
  "suporte",
  "support",
  "system",
  "treinoup",
  "treinouprun",
  "www",
] as const;

export type UsernameError = "tooShort" | "tooLong" | "invalidChars" | "invalidEdges" | "consecutiveDots" | "reserved";

/** O que o usuário digita → forma canônica (minúsculas, sem @ e espaços nas pontas). */
export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@+/, "").toLowerCase();
}

export function validateUsername(username: string): UsernameError | null {
  if (username.length < USERNAME_MIN) return "tooShort";
  if (username.length > USERNAME_MAX) return "tooLong";
  if (!/^[a-z0-9._]+$/.test(username)) return "invalidChars";
  if (!/^[a-z0-9].*[a-z0-9]$/.test(username)) return "invalidEdges";
  if (username.includes("..")) return "consecutiveDots";
  if ((RESERVED_USERNAMES as readonly string[]).includes(username)) return "reserved";
  return null;
}

export function usernameErrorKey(error: UsernameError | "taken") {
  return `validation.username.${error}` as const;
}

/** Sugestão a partir do nome ou do e-mail: "José da Silva" → "jose.da.silva". */
export function suggestUsername(name: string | null | undefined, email?: string | null): string {
  const fromText = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9._\s-]/g, "")
      .trim()
      .replace(/[\s-]+/g, ".")
      .replace(/\.{2,}/g, ".")
      .replace(/^[._]+|[._]+$/g, "")
      .slice(0, USERNAME_MAX)
      .replace(/[._]+$/g, "");

  for (const source of [name, email?.split("@")[0]]) {
    if (!source) continue;
    const candidate = fromText(source);
    if (!validateUsername(candidate)) return candidate;
    if (candidate.length > 0 && candidate.length < USERNAME_MIN) {
      const padded = `${candidate}.run`;
      if (!validateUsername(padded)) return padded;
    }
  }
  return "";
}
