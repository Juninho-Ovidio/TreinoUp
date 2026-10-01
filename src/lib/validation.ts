import { z } from "zod";

const email = z.string().trim().min(1, "Informe seu e-mail.").email("E-mail inválido.");
const password = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.");

export const loginSchema = z.object({ email, password: z.string().min(1, "Informe sua senha.") });

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome.").max(60, "Nome muito longo."),
    email,
    password,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

export const recoverSchema = z.object({ email });

export const resetSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As senhas não conferem." });

/** Erros do zod no formato { campo: mensagem } */
export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "form");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

/** Traduz mensagens do Supabase Auth. */
export function authMessage(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar. Enviamos um link para a sua caixa de entrada.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Já existe uma conta com esse e-mail.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas seguidas. Aguarde um minuto e tente de novo.";
  if (m.includes("password should be")) return "Escolha uma senha mais forte, com pelo menos 8 caracteres.";
  if (m.includes("same password") || m.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("fetch")) return "Sem conexão com o servidor. Verifique sua internet.";
  return "Não foi possível concluir agora. Tente de novo.";
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
