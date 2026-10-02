import { supabase } from "@/lib/supabase";
import { AVATAR_MAX_BYTES, avatarMime, avatarPath } from "../domain/avatar";
import type { OnboardingInput, Profile, ProfileFormInput, Units } from "../domain/profile";

export class ProfileError extends Error {
  constructor(
    public readonly key:
      | "validation.username.taken"
      | "profile.photoError"
      | "profile.photoTooBig"
      | "common.errorGeneric",
    cause?: unknown,
  ) {
    super(key, { cause });
    this.name = "ProfileError";
  }
}

const UNIQUE_VIOLATION = "23505";

function rethrow(error: { code?: string } | null): void {
  if (!error) return;
  if (error.code === UNIQUE_VIOLATION) throw new ProfileError("validation.username.taken", error);
  throw new ProfileError("common.errorGeneric", error);
}

/**
 * Perfil do usuário logado. Se a linha não existir (trigger falhou ou foi apagada pelo painel),
 * recria com os dados básicos da conta, como o TreinoUp web faz.
 */
export async function getOrCreateMyProfile(userId: string): Promise<Profile> {
  const db = supabase();
  const { data, error } = await db.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>();
  rethrow(error);
  if (data) return data;

  const { data: userData } = await db.auth.getUser();
  const meta = (userData.user?.user_metadata ?? {}) as Record<string, unknown>;
  const raw = meta.name ?? meta.full_name;
  const name = typeof raw === "string" ? raw.trim().slice(0, 60) : null;
  const created = await db
    .from("profiles")
    .upsert({ id: userId, name: name || null }, { onConflict: "id", ignoreDuplicates: true })
    .select("*")
    .maybeSingle<Profile>();
  rethrow(created.error);
  if (created.data) return created.data;
  // Corrida com outra aba/aparelho: a linha já foi criada; lê de novo.
  const again = await db.from("profiles").select("*").eq("id", userId).single<Profile>();
  rethrow(again.error);
  return again.data!;
}

export async function isUsernameAvailable(username: string): Promise<boolean> {
  const { data, error } = await supabase().rpc("username_available", { candidate: username });
  rethrow(error);
  return data === true;
}

export async function completeOnboarding(userId: string, input: OnboardingInput): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update({
      username: input.username,
      name: input.displayName,
      units: input.units,
    })
    .eq("id", userId)
    .select("*")
    .single<Profile>();
  rethrow(error);
  return data!;
}

export async function updateProfile(userId: string, input: ProfileFormInput): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update({ username: input.username, name: input.displayName, bio: input.bio, city: input.city })
    .eq("id", userId)
    .select("*")
    .single<Profile>();
  rethrow(error);
  return data!;
}

export async function updateUnits(userId: string, units: Units): Promise<Profile> {
  const { data, error } = await supabase()
    .from("profiles")
    .update({ units })
    .eq("id", userId)
    .select("*")
    .single<Profile>();
  rethrow(error);
  return data!;
}

export interface PickedImage {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
}

/** Envia a foto para o bucket `avatars`, apaga as antigas e grava a URL no perfil. */
export async function uploadAvatar(userId: string, image: PickedImage): Promise<Profile> {
  if (image.fileSize && image.fileSize > AVATAR_MAX_BYTES) throw new ProfileError("profile.photoTooBig");
  const db = supabase();
  const mime = avatarMime(image.mimeType, image.fileName);
  const path = avatarPath(userId, mime);

  let body: ArrayBuffer;
  try {
    body = await (await fetch(image.uri)).arrayBuffer();
  } catch (e) {
    throw new ProfileError("profile.photoError", e);
  }
  if (body.byteLength > AVATAR_MAX_BYTES) throw new ProfileError("profile.photoTooBig");

  const bucket = db.storage.from("avatars");
  const up = await bucket.upload(path, body, { contentType: mime, upsert: false });
  if (up.error) throw new ProfileError("profile.photoError", up.error);

  const publicUrl = bucket.getPublicUrl(path).data.publicUrl;
  const { data, error } = await db
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)
    .select("*")
    .single<Profile>();
  rethrow(error);

  // Limpa fotos anteriores (sem bloquear se falhar).
  const listed = await bucket.list(userId);
  const old = (listed.data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== path);
  if (old.length) await bucket.remove(old);

  return data!;
}

/** Exclui a conta (LGPD): remove as fotos pelo Storage e depois apaga o usuário no banco. */
export async function deleteMyAccount(userId: string): Promise<void> {
  const db = supabase();
  const bucket = db.storage.from("avatars");
  const listed = await bucket.list(userId);
  const files = (listed.data ?? []).map((f) => `${userId}/${f.name}`);
  if (files.length) await bucket.remove(files);

  const { error } = await db.rpc("delete_my_account");
  rethrow(error);
  await db.auth.signOut({ scope: "local" });
}
