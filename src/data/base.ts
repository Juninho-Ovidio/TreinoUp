"use client";

import type { PostgrestError } from "@supabase/supabase-js";
import { supabaseBrowser } from "@/lib/supabase/client";

export const sb = () => supabaseBrowser();

/** Id do usuário logado, lido da sessão local (sem ida ao servidor). */
export async function uid(): Promise<string> {
  const { data } = await sb().auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new AppError("Sua sessão expirou. Entre de novo para continuar.");
  return id;
}

export class AppError extends Error {}

/** Converte erros do banco em mensagens claras em português. */
export function check<T>(res: { data: T; error: PostgrestError | null }): T {
  if (res.error) throw new AppError(friendly(res.error));
  return res.data;
}

function friendly(e: PostgrestError): string {
  if (e.code === "23505") return "Esse registro já existe.";
  if (e.code === "23514") return "Algum valor está fora do intervalo permitido.";
  if (e.code === "23503") return "Esse item está sendo usado em outro lugar e não pode ser removido.";
  if (e.code === "42501" || e.message?.includes("row-level security")) return "Você não tem permissão para fazer isso.";
  if (e.message?.toLowerCase().includes("fetch")) return "Sem conexão com o servidor. Verifique sua internet.";
  return "Não foi possível salvar agora. Tente de novo em instantes.";
}

export function errorMessage(err: unknown): string {
  if (err instanceof AppError) return err.message;
  if (err instanceof TypeError && /fetch/i.test(err.message)) return "Sem conexão com o servidor. Verifique sua internet.";
  if (err instanceof Error && err.message) return err.message;
  return "Algo deu errado. Tente de novo.";
}
