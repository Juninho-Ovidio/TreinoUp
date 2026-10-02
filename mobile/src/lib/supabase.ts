import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabase } from "./createSupabase";
import { envResult } from "./env";

let client: SupabaseClient | null = null;

/** Cliente único. Só chame depois de conferir `envResult.ok` (o layout raiz faz isso). */
export function supabase(): SupabaseClient {
  if (client) return client;
  if (!envResult.ok) throw new Error(`Configuração ausente: ${envResult.missing.join(", ")}`);
  client = createSupabase(envResult.env.supabaseUrl, envResult.env.supabaseAnonKey);
  return client;
}

/**
 * No celular, a renovação automática do token só deve rodar com o app em primeiro plano.
 * Retorna a função para remover o listener.
 */
export function bindAuthRefreshToAppState(): () => void {
  if (Platform.OS === "web" || !envResult.ok) return () => {};
  const auth = supabase().auth;
  if (AppState.currentState === "active") auth.startAutoRefresh();
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") auth.startAutoRefresh();
    else auth.stopAutoRefresh();
  });
  return () => sub.remove();
}
