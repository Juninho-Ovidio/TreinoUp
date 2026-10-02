/** Regras do upload da foto de perfil (espelham o bucket `avatars` no Supabase). */

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AvatarMime = (typeof AVATAR_MIME_TYPES)[number];

const EXT: Record<AvatarMime, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export function avatarMime(mimeType: string | null | undefined, fileName?: string | null): AvatarMime {
  const m = (mimeType ?? "").toLowerCase();
  if ((AVATAR_MIME_TYPES as readonly string[]).includes(m)) return m as AvatarMime;
  const ext = (fileName ?? "").toLowerCase().split(".").pop();
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  // HEIC e desconhecidos: o seletor já reencoda para JPEG (quality < 1).
  return "image/jpeg";
}

/** Caminho no bucket: a primeira pasta é o id do usuário (é o que a política de Storage confere). */
export function avatarPath(userId: string, mime: AvatarMime, now = Date.now()): string {
  return `${userId}/avatar-${now}.${EXT[mime]}`;
}
