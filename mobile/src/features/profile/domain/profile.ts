import { z } from "zod";
import { displayNameSchema } from "@/features/auth/domain/validation";
import { normalizeUsername, usernameErrorKey, validateUsername } from "./username";

export type Units = "metric" | "imperial";
export type ProfileVisibility = "everyone" | "followers";

/**
 * Linha de public.profiles, compartilhada com o TreinoUp web (supabase/migrations na raiz do repositório).
 * Só os campos que o app usa; o perfil também guarda os dados da dieta (meta, peso, altura…).
 */
export interface Profile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  units: Units;
  profile_visibility: ProfileVisibility;
  /** Onboarding da dieta (TreinoUp). O onboarding social do Run depende só de `username`. */
  onboarded_at: string | null;
  plan: "free" | "premium";
  created_at: string;
  updated_at: string;
}

const username = z
  .string()
  .transform(normalizeUsername)
  .superRefine((value, ctx) => {
    const error = validateUsername(value);
    if (error) ctx.addIssue({ code: "custom", message: usernameErrorKey(error) });
  });

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .transform((v) => (v.length ? v : null));

export const onboardingSchema = z.object({
  username,
  displayName: displayNameSchema,
  units: z.enum(["metric", "imperial"]),
});

export const profileFormSchema = z.object({
  username,
  displayName: displayNameSchema,
  bio: optionalText(280, "validation.bioLong"),
  city: optionalText(80, "validation.cityLong"),
});

export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type ProfileFormInput = z.infer<typeof profileFormSchema>;

/** Nome para exibir: nome escolhido, senão @usuario, senão vazio. */
export function profileLabel(p: Pick<Profile, "name" | "username"> | null | undefined): string {
  return p?.name?.trim() || (p?.username ? `@${p.username}` : "");
}
