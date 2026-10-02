import { useEffect, useMemo, useState } from "react";
import { isUsernameAvailable } from "../data/profileRepository";
import { normalizeUsername, validateUsername, type UsernameError } from "../domain/username";

export type UsernameCheck =
  | { state: "idle" }
  | { state: "invalid"; error: UsernameError }
  | { state: "checking" }
  | { state: "available" }
  | { state: "taken" }
  | { state: "unknown" };

/** Resultado que não depende do servidor, ou null quando é preciso consultar a disponibilidade. */
export function localUsernameCheck(username: string, current?: string | null): UsernameCheck | null {
  if (!username) return { state: "idle" };
  const error = validateUsername(username);
  if (error) return { state: "invalid", error };
  if (current && username === current) return { state: "available" };
  return null;
}

/**
 * Valida o nome de usuário enquanto a pessoa digita e consulta a disponibilidade no servidor
 * (com espera de 400 ms). `current` é o nome atual do perfil, que conta como disponível.
 */
export function useUsernameCheck(raw: string, current?: string | null, delayMs = 400): UsernameCheck {
  const username = normalizeUsername(raw);
  const local = useMemo(() => localUsernameCheck(username, current), [username, current]);
  const [remote, setRemote] = useState<{ username: string; state: "available" | "taken" | "unknown" } | null>(null);

  useEffect(() => {
    if (local) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      isUsernameAvailable(username)
        .then((ok) => {
          if (!cancelled) setRemote({ username, state: ok ? "available" : "taken" });
        })
        .catch(() => {
          // Sem internet: deixa salvar; o banco recusa se estiver em uso.
          if (!cancelled) setRemote({ username, state: "unknown" });
        });
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [local, username, delayMs]);

  if (local) return local;
  if (remote?.username === username) return { state: remote.state };
  return { state: "checking" };
}
