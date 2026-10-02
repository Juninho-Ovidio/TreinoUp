import * as SecureStore from "expo-secure-store";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createChunkedStorage, type KeyValueStore } from "./chunkedStorage";

const secureStore: KeyValueStore = {
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) => SecureStore.setItemAsync(key, value),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
};

/** Celular: sessão no Keychain/Keystore (dividida em pedaços), PKCE, sem ler a URL. */
export function createSupabase(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      storage: createChunkedStorage(secureStore),
      autoRefreshToken: true,
      persistSession: true,
      // O retorno dos links de e-mail e do login social é tratado em src/app/auth/callback.tsx.
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
}
