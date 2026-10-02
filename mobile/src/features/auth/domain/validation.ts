import { z } from "zod";
import type { ParseKeys } from "i18next";

/** Mensagens dos schemas são chaves de tradução; a tela traduz com t(). */
export type MessageKey = ParseKeys;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "validation.required")
  .pipe(z.email("validation.emailInvalid"));

const password = z
  .string()
  .min(8, "validation.passwordShort")
  // O Supabase (bcrypt) ignora o que passar de 72 bytes.
  .max(72, "validation.passwordLong")
  .refine((v) => /[a-zA-Z]/.test(v) && /\d/.test(v), "validation.passwordWeak");

export const displayNameSchema = z.string().trim().min(1, "validation.nameShort").max(60, "validation.nameLong");

export const loginSchema = z.object({
  email,
  // No login não repetimos as regras de força: senhas antigas continuam valendo.
  password: z.string().min(1, "validation.required"),
});

export const signupSchema = z.object({
  displayName: displayNameSchema,
  email,
  password,
});

export const forgotSchema = z.object({ email });

export const newPasswordSchema = z.object({ password });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;

/** Primeiro erro de cada campo, como chave de tradução. */
export function fieldErrors(error: z.ZodError): Record<string, MessageKey> {
  const out: Record<string, MessageKey> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    if (!out[field]) out[field] = issue.message as MessageKey;
  }
  return out;
}
