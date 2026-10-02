import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "@/lib/supabase";
import { authErrorKey, type AuthErrorKey } from "../domain/authErrors";
import { parseAuthCallback } from "../domain/callbackUrl";
import type { LoginInput, SignupInput } from "../domain/validation";

/** Erro com chave de tradução, para a tela mostrar a mensagem certa. */
export class AuthFailure extends Error {
  constructor(public readonly key: AuthErrorKey) {
    super(key);
    this.name = "AuthFailure";
  }
}

function fail(error: unknown): never {
  throw new AuthFailure(authErrorKey(error as never));
}

/** URL de retorno para links de e-mail e login social (treinoup://auth/callback no celular). */
export function callbackUrl(next?: string): string {
  return Linking.createURL("auth/callback", next ? { queryParams: { next } } : undefined);
}

export async function signInWithPassword(input: LoginInput) {
  const { error } = await supabase().auth.signInWithPassword(input);
  if (error) fail(error);
}

/** Retorna `needsConfirmation` quando o projeto exige confirmar o e-mail antes de entrar. */
export async function signUp(input: SignupInput): Promise<{ needsConfirmation: boolean }> {
  const { data, error } = await supabase().auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: callbackUrl(), data: { name: input.displayName, full_name: input.displayName } },
  });
  if (error) fail(error);
  // Com confirmação ligada, o Supabase devolve um usuário sem identidades quando o e-mail já existe.
  if (data.user && data.user.identities?.length === 0) throw new AuthFailure("auth.errors.userExists");
  return { needsConfirmation: !data.session };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase().auth.resetPasswordForEmail(email, { redirectTo: callbackUrl("/reset-password") });
  if (error) fail(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) fail(error);
}

export async function signOut() {
  // "local": sai deste aparelho mesmo sem internet.
  await supabase().auth.signOut({ scope: "local" });
}

/** Troca o retorno de um link/login social por uma sessão. */
export async function completeAuthFromUrl(url: string): Promise<{ next: string | null }> {
  const parsed = parseAuthCallback(url);
  const auth = supabase().auth;
  if (parsed.kind === "code") {
    const { error } = await auth.exchangeCodeForSession(parsed.code);
    if (error) fail(error);
    return { next: parsed.next };
  }
  if (parsed.kind === "tokens") {
    const { error } = await auth.setSession({ access_token: parsed.accessToken, refresh_token: parsed.refreshToken });
    if (error) fail(error);
    return { next: parsed.next };
  }
  if (parsed.kind === "error") fail({ code: parsed.error, message: parsed.description });
  fail(null);
}

/**
 * Login com Google (ou Apple fora do iOS) pelo navegador do sistema.
 * Retorna false se a pessoa fechou o navegador sem concluir.
 */
export async function signInWithOAuth(provider: "google" | "apple"): Promise<boolean> {
  const redirectTo = callbackUrl();
  const auth = supabase().auth;

  if (Platform.OS === "web") {
    // No navegador o Supabase redireciona a página inteira e volta em /auth/callback.
    const { error } = await auth.signInWithOAuth({ provider, options: { redirectTo } });
    if (error) fail(error);
    return true;
  }

  const { data, error } = await auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: true } });
  if (error || !data.url) fail(error);
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== "success") return false;
  await completeAuthFromUrl(result.url);
  return true;
}

/** Login nativo da Apple no iOS. Retorna false se a pessoa cancelou. */
export async function signInWithAppleNative(): Promise<boolean> {
  // O Supabase compara o hash do nonce que vai dentro do token da Apple.
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === "ERR_REQUEST_CANCELED") return false;
    throw new AuthFailure("auth.errors.generic");
  }
  if (!credential.identityToken) throw new AuthFailure("auth.errors.generic");

  const { error } = await supabase().auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
    nonce: rawNonce,
  });
  if (error) fail(error);

  // A Apple só manda o nome no primeiro login: guardamos para sugerir no onboarding.
  const fullName = [credential.fullName?.givenName, credential.fullName?.familyName].filter(Boolean).join(" ");
  if (fullName) await supabase().auth.updateUser({ data: { name: fullName, full_name: fullName } });
  return true;
}

export async function appleNativeAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}
