/**
 * Lê a URL de retorno do Supabase (link de e-mail ou login social).
 * Com PKCE o retorno traz `?code=`. Erros vêm em `error`/`error_description`, às vezes
 * no fragmento (#). Tokens no fragmento (fluxo implícito) também são aceitos.
 */

export type AuthCallback =
  | { kind: "code"; code: string; next: string | null }
  | { kind: "tokens"; accessToken: string; refreshToken: string; next: string | null }
  | { kind: "error"; error: string; description: string | null }
  | { kind: "empty" };

function params(part: string): URLSearchParams {
  return new URLSearchParams(part.replace(/^[?#]/, ""));
}

/** Só caminhos internos simples: impede redirecionar para fora do app. */
export function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  return /^\/[a-z0-9\-/]*$/i.test(raw) && !raw.startsWith("//") ? raw : null;
}

export function parseAuthCallback(url: string): AuthCallback {
  const hashIndex = url.indexOf("#");
  const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const hash = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  const queryIndex = beforeHash.indexOf("?");
  const query = params(queryIndex >= 0 ? beforeHash.slice(queryIndex + 1) : "");
  const fragment = params(hash);
  const get = (k: string) => query.get(k) ?? fragment.get(k);

  const error = get("error") ?? get("error_code");
  if (error) return { kind: "error", error, description: get("error_description") };

  const next = safeNext(get("next"));
  const code = get("code");
  if (code) return { kind: "code", code, next };

  const accessToken = get("access_token");
  const refreshToken = get("refresh_token");
  if (accessToken && refreshToken) return { kind: "tokens", accessToken, refreshToken, next };

  return { kind: "empty" };
}

/** Parâmetros já separados (como o Expo Router entrega em useLocalSearchParams). */
export function callbackFromParams(p: Record<string, string | string[] | undefined>): AuthCallback {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(p)) {
    const value = Array.isArray(v) ? v[0] : v;
    if (value != null) qs.set(k, value);
  }
  return parseAuthCallback(`?${qs.toString()}`);
}
