import "react-native-url-polyfill/auto";
import { AppState, Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createChunkedStorage, type KeyValueStore } from "./chunkedStorage";
import { envResult } from "./env";

const secureStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

// No navegador não existe Keychain: o Supabase usa o localStorage padrão.
const storage = Platform.OS === "web" ? undefined : createChunkedStorage(secureStore);

let client: SupabaseClient | null = null;

/** Cliente único. Só chame depois de conferir `envResult.ok` (o layout raiz faz isso). */
export function supabase(): SupabaseClient {
  if (client) return client;
  if (!envResult.ok) throw new Error(`Configuração ausente: ${envResult.missing.join(", ")}`);
  client = createClient(envResult.env.supabaseUrl, envResult.env.supabaseAnonKey, {
    auth: {
      storage,
      autoRefreshToken: true,
      persistSession: true,
      // O retorno dos links de e-mail e do login social é tratado em src/app/auth/callback.tsx.
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
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
