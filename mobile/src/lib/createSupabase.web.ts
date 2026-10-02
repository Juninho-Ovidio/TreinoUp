import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Navegador: a sessão fica nos mesmos cookies do site TreinoUp (@supabase/ssr).
 * Publicado dentro do site (/app), quem já entrou no TreinoUp abre o Run sem novo login,
 * e sair de um lado sai do outro.
 */
export function createSupabase(url: string, key: string): SupabaseClient {
  return createBrowserClient(url, key, {
    auth: { flowType: "pkce", detectSessionInUrl: false, autoRefreshToken: true, persistSession: true },
  }) as unknown as SupabaseClient;
}
