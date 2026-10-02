import { authErrorKey } from "../authErrors";
import { callbackFromParams, parseAuthCallback, safeNext } from "../callbackUrl";
import { needsRunOnboarding, resolveGate } from "../gate";
import { fieldErrors, forgotSchema, loginSchema, newPasswordSchema, signupSchema } from "../validation";

describe("signupSchema", () => {
  it("normaliza o e-mail e aceita senha com letras e números", () => {
    const r = signupSchema.safeParse({ displayName: " Ana ", email: " Ana@Email.COM ", password: "corrida5k" });
    expect(r.success && r.data).toEqual({ displayName: "Ana", email: "ana@email.com", password: "corrida5k" });
  });

  it.each([
    ["curta", "validation.passwordShort"],
    ["somenteletras", "validation.passwordWeak"],
    ["12345678", "validation.passwordWeak"],
    ["a1".repeat(37), "validation.passwordLong"],
  ])("senha %p → %s", (password, key) => {
    const r = signupSchema.safeParse({ displayName: "Ana", email: "a@b.com", password });
    expect(r.success).toBe(false);
    if (!r.success) expect(fieldErrors(r.error).password).toBe(key);
  });

  it("aponta cada campo inválido", () => {
    const r = signupSchema.safeParse({ displayName: "", email: "nao-e-email", password: "abc12345" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(fieldErrors(r.error)).toEqual({ displayName: "validation.nameShort", email: "validation.emailInvalid" });
    }
  });
});

describe("loginSchema / forgotSchema / newPasswordSchema", () => {
  it("login não exige força da senha (senhas antigas valem)", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
  });
  it("login vazio pede preenchimento", () => {
    const r = loginSchema.safeParse({ email: "", password: "" });
    expect(!r.success && fieldErrors(r.error)).toEqual({ email: "validation.required", password: "validation.required" });
  });
  it("recuperar senha valida o e-mail", () => {
    expect(forgotSchema.safeParse({ email: "x" }).success).toBe(false);
  });
  it("nova senha segue a regra de força", () => {
    expect(newPasswordSchema.safeParse({ password: "nova1234" }).success).toBe(true);
    expect(newPasswordSchema.safeParse({ password: "nova" }).success).toBe(false);
  });
});

describe("authErrorKey", () => {
  it.each([
    [{ code: "invalid_credentials" }, "auth.errors.invalidCredentials"],
    [{ code: "email_not_confirmed" }, "auth.errors.emailNotConfirmed"],
    [{ code: "user_already_exists" }, "auth.errors.userExists"],
    [{ code: "weak_password" }, "auth.errors.weakPassword"],
    [{ code: "over_email_send_rate_limit" }, "auth.errors.rateLimited"],
    [{ status: 429 }, "auth.errors.rateLimited"],
    [{ name: "AuthRetryableFetchError" }, "auth.errors.network"],
    [{ message: "Network request failed" }, "auth.errors.network"],
    [{ message: "Invalid login credentials" }, "auth.errors.invalidCredentials"],
    [{ message: "Email not confirmed" }, "auth.errors.emailNotConfirmed"],
    [{ message: "User already registered" }, "auth.errors.userExists"],
    [{ code: "algo_novo", message: "?" }, "auth.errors.generic"],
    [null, "auth.errors.generic"],
  ])("%p → %s", (error, key) => {
    expect(authErrorKey(error)).toBe(key);
  });
});

describe("parseAuthCallback", () => {
  it("lê o código PKCE e o destino", () => {
    expect(parseAuthCallback("treinoup://auth/callback?code=abc&next=%2Freset-password")).toEqual({
      kind: "code",
      code: "abc",
      next: "/reset-password",
    });
  });

  it("lê tokens no fragmento", () => {
    expect(parseAuthCallback("https://x/auth/callback#access_token=a&refresh_token=r&type=recovery")).toEqual({
      kind: "tokens",
      accessToken: "a",
      refreshToken: "r",
      next: null,
    });
  });

  it("erro vence o código", () => {
    expect(parseAuthCallback("x://cb?code=abc#error=access_denied&error_description=Link+expirado")).toEqual({
      kind: "error",
      error: "access_denied",
      description: "Link expirado",
    });
  });

  it("sem nada", () => {
    expect(parseAuthCallback("x://cb")).toEqual({ kind: "empty" });
  });

  it("aceita os parâmetros já separados pelo router", () => {
    expect(callbackFromParams({ code: ["c1", "c2"], next: "/x" })).toEqual({ kind: "code", code: "c1", next: "/x" });
  });

  it.each([
    ["/reset-password", "/reset-password"],
    ["//evil.com", null],
    ["https://evil.com", null],
    ["/a?b=c", null],
    [null, null],
  ])("safeNext(%p) → %p", (raw, expected) => {
    expect(safeNext(raw)).toBe(expected);
  });
});

describe("resolveGate", () => {
  const base = { sessionLoaded: true, hasSession: true, profileLoaded: true };
  it.each([
    [{ ...base, sessionLoaded: false }, "loading"],
    [{ ...base, hasSession: false }, "signedOut"],
    [{ ...base, profileLoaded: false }, "loading"],
    [{ ...base, profileLoaded: false, profileFailed: true }, "error"],
    [base, "ready"],
  ])("%p → %s", (input, status) => {
    expect(resolveGate(input)).toBe(status);
  });
});

describe("needsRunOnboarding", () => {
  it("pede o @usuário só quando ainda não existe", () => {
    expect(needsRunOnboarding({ username: null })).toBe(true);
    expect(needsRunOnboarding(undefined)).toBe(true);
    expect(needsRunOnboarding({ username: "ana.corre" })).toBe(false);
  });
});
