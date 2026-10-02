"use client";

import type { BodyAssessment, BodyMeasurement, MeasurementField, WeightEntry } from "@/lib/types";
import { check, sb, uid } from "./base";

// ---------- Peso ----------

export async function listWeights(start?: string, end?: string): Promise<WeightEntry[]> {
  const me = await uid();
  let q = sb().from("weight_entries").select("id,user_id,entry_date,weight_kg").eq("user_id", me);
  if (start) q = q.gte("entry_date", start);
  if (end) q = q.lte("entry_date", end);
  return check(await q.order("entry_date")) as WeightEntry[];
}

export async function latestWeight(): Promise<WeightEntry | null> {
  const me = await uid();
  const rows = check(await sb().from("weight_entries").select("*").eq("user_id", me).order("entry_date", { ascending: false }).limit(1)) as WeightEntry[];
  return rows[0] ?? null;
}

/** Um registro por dia: salvar de novo na mesma data substitui o valor. */
export async function saveWeight(entry_date: string, weight_kg: number): Promise<WeightEntry> {
  const me = await uid();
  return check(
    await sb().from("weight_entries").upsert({ user_id: me, entry_date, weight_kg }, { onConflict: "user_id,entry_date" }).select("*").single(),
  ) as WeightEntry;
}

export async function deleteWeight(id: string) {
  check(await sb().from("weight_entries").delete().eq("id", id));
}

// ---------- Medidas ----------

export async function listMeasurements(): Promise<BodyMeasurement[]> {
  const me = await uid();
  return check(await sb().from("body_measurements").select("*").eq("user_id", me).order("entry_date")) as BodyMeasurement[];
}

export async function saveMeasurement(entry_date: string, values: Partial<Record<MeasurementField, number | null>>): Promise<BodyMeasurement> {
  const me = await uid();
  const row = check(
    await sb().from("body_measurements").upsert({ user_id: me, entry_date, ...values }, { onConflict: "user_id,entry_date" }).select("*").single(),
  ) as BodyMeasurement;
  // O peso das medidas também entra no histórico de peso.
  if (values.weight_kg) await saveWeight(entry_date, values.weight_kg);
  return row;
}

export async function deleteMeasurement(id: string) {
  check(await sb().from("body_measurements").delete().eq("id", id));
}

// ---------- Avaliação física ----------

export type AssessmentValues = Omit<BodyAssessment, "id" | "user_id" | "created_at">;

export async function listAssessments(): Promise<BodyAssessment[]> {
  const me = await uid();
  return check(await sb().from("body_assessments").select("*").eq("user_id", me).order("assessed_on", { ascending: false })) as BodyAssessment[];
}

/** Uma avaliação por dia: salvar de novo na mesma data substitui a anterior. */
export async function saveAssessment(values: AssessmentValues): Promise<BodyAssessment> {
  const me = await uid();
  const row = check(
    await sb().from("body_assessments").upsert({ user_id: me, ...values }, { onConflict: "user_id,assessed_on" }).select("*").single(),
  ) as BodyAssessment;
  // O peso da avaliação também entra no histórico de peso.
  await saveWeight(values.assessed_on, values.weight_kg);
  return row;
}

export async function deleteAssessment(id: string) {
  check(await sb().from("body_assessments").delete().eq("id", id));
}
