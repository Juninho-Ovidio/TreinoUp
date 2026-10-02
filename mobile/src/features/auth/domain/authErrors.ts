/** Traduz erros do Supabase Auth para chaves de mensagem amigáveis. */

export interface AuthErrorLike {
  code?: string | null;
  name?: string | null;
  message?: string | null;
  status?: number | null;
}

export type AuthErrorKey =
  | "auth.errors.invalidCredentials"
  | "auth.errors.emailNotConfirmed"
  | "auth.errors.userExists"
  | "auth.errors.weakPassword"
  | "auth.errors.samePassword"
  | "auth.errors.rateLimited"
  | "auth.errors.network"
  | "auth.errors.providerDisabled"
  | "auth.errors.generic";

const BY_CODE: Record<string, AuthErrorKey> = {
  invalid_credentials: "auth.errors.invalidCredentials",
  email_not_confirmed: "auth.errors.emailNotConfirmed",
  user_already_exists: "auth.errors.userExists",
  email_exists: "auth.errors.userExists",
  weak_password: "auth.errors.weakPassword",
  same_password: "auth.errors.samePassword",
  over_request_rate_limit: "auth.errors.rateLimited",
  over_email_send_rate_limit: "auth.errors.rateLimited",
  over_sms_send_rate_limit: "auth.errors.rateLimited",
  provider_disabled: "auth.errors.providerDisabled",
  oauth_provider_not_supported: "auth.errors.providerDisabled",
};

export function authErrorKey(error: AuthErrorLike | null | undefined): AuthErrorKey {
  if (!error) return "auth.errors.generic";
  if (error.code && BY_CODE[error.code]) return BY_CODE[error.code]!;
  if (error.name === "AuthRetryableFetchError" || /network request failed|failed to fetch/i.test(error.message ?? "")) {
    return "auth.errors.network";
  }
  if (error.status === 429) return "auth.errors.rateLimited";
  // Servidores antigos do GoTrue não mandam `code`: cai na mensagem.
  const msg = (error.message ?? "").toLowerCase();
  if (msg.includes("invalid login credentials")) return "auth.errors.invalidCredentials";
  if (msg.includes("email not confirmed")) return "auth.errors.emailNotConfirmed";
  if (msg.includes("already registered")) return "auth.errors.userExists";
  return "auth.errors.generic";
}
