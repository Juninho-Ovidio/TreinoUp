import type { Session } from "@supabase/supabase-js";
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { queryClient } from "@/lib/queryClient";

interface SessionState {
  session: Session | null;
  loaded: boolean;
}

/** Sessão atual do Supabase, compartilhada por todo o app. Alimentada por `startSessionListener`. */
export const useSession = create<SessionState>(() => ({ session: null, loaded: false }));

/** Lê a sessão salva e passa a ouvir mudanças (login, logout, renovação). Retorna o "desligar". */
export function startSessionListener(): () => void {
  const auth = supabase().auth;
  let active = true;

  auth
    .getSession()
    .then(({ data }) => {
      if (active) useSession.setState({ session: data.session, loaded: true });
    })
    .catch(() => {
      if (active) useSession.setState({ session: null, loaded: true });
    });

  const { data } = auth.onAuthStateChange((event, session) => {
    const previous = useSession.getState().session;
    useSession.setState({ session, loaded: true });
    // Trocou de usuário ou saiu: descarta o cache do anterior.
    if (event === "SIGNED_OUT" || (previous && session && previous.user.id !== session.user.id)) {
      queryClient.clear();
    }
  });

  return () => {
    active = false;
    data.subscription.unsubscribe();
  };
}

export function useUserId(): string | null {
  return useSession((s) => s.session?.user.id ?? null);
}
