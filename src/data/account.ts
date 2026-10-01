"use client";

import type { Reminder } from "@/lib/types";
import { AppError, check, sb, uid } from "./base";

export async function listReminders(): Promise<Reminder[]> {
  const me = await uid();
  return check(await sb().from("notifications").select("*").eq("user_id", me).order("at_time")) as Reminder[];
}

export async function updateReminder(id: string, patch: Partial<Pick<Reminder, "enabled" | "at_time">>) {
  check(await sb().from("notifications").update(patch).eq("id", id));
}

const EXPORT_TABLES = [
  "profiles",
  "goals",
  "meals",
  "foods",
  "food_favorites",
  "food_entries",
  "recipes",
  "water_entries",
  "weight_entries",
  "body_measurements",
  "workouts",
  "activity_entries",
  "notifications",
] as const;

/** Reúne todos os dados do usuário num JSON. */
export async function exportAll(): Promise<Blob> {
  const me = await uid();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), app: "TreinoUp" };
  for (const t of EXPORT_TABLES) {
    const q = sb().from(t).select("*");
    const res = await q.eq(t === "profiles" ? "id" : "user_id", me);
    out[t] = check(res);
  }
  out.recipe_ingredients = check(await sb().from("recipe_ingredients").select("*, recipes!inner(user_id)").eq("recipes.user_id", me));
  out.workout_exercises = check(await sb().from("workout_exercises").select("*, workouts!inner(user_id)").eq("workouts.user_id", me));
  return new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
}

export async function deleteAccount() {
  const { error } = await sb().rpc("delete_my_account");
  if (error) throw new AppError("Não foi possível excluir a conta agora. Tente de novo.");
  await sb().auth.signOut();
}

export async function uploadAvatar(file: File): Promise<string> {
  const me = await uid();
  if (!file.type.startsWith("image/")) throw new AppError("Escolha um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new AppError("A imagem precisa ter até 5 MB.");
  const blob = await downscale(file, 512);
  const path = `${me}/avatar-${Date.now()}.jpg`;
  const { error } = await sb().storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw new AppError("Não foi possível enviar a foto.");
  return sb().storage.from("avatars").getPublicUrl(path).data.publicUrl;
}

/** Reduz a foto no próprio aparelho antes do envio (economiza dados e armazenamento). */
async function downscale(file: File, max: number): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new AppError("Imagem inválida."))), "image/jpeg", 0.85));
}
