"use client";

import { createBrowserClient } from "@supabase/ssr";
let client: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente Supabase do navegador (singleton). A sessão fica em cookies, compartilhada com o servidor. */
export function supabaseBrowser() {
  if (!client) {
    client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }
  return client;
}
