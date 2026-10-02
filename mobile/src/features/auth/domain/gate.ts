/**
 * Decide o que pode abrir. O layout raiz usa isto nos `Stack.Protected`; a área do Run usa
 * `needsRunOnboarding`. A segurança de verdade está na RLS do banco.
 */

export type GateStatus = "loading" | "signedOut" | "ready" | "error";

export interface GateInput {
  sessionLoaded: boolean;
  hasSession: boolean;
  profileLoaded: boolean;
  /** A busca do perfil falhou (ex.: sem internet na primeira abertura). */
  profileFailed?: boolean;
}

/** Login e cadastro são do TreinoUp: com sessão e perfil carregado, o app abre. */
export function resolveGate({ sessionLoaded, hasSession, profileLoaded, profileFailed }: GateInput): GateStatus {
  if (!sessionLoaded) return "loading";
  if (!hasSession) return "signedOut";
  if (!profileLoaded) return profileFailed ? "error" : "loading";
  return "ready";
}

/** O TreinoUp Run pede o @usuário na primeira vez que a pessoa entra nele. */
export function needsRunOnboarding(profile: { username: string | null } | null | undefined): boolean {
  return !profile?.username;
}
