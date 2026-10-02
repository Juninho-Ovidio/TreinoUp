import type { Sex } from "./types";
import { bmi } from "./goals";

/** Dobras cutâneas do protocolo de Jackson e Pollock (7 dobras), em mm. */
export const SKINFOLDS = [
  { key: "triceps", label: "Tríceps" },
  { key: "abdomen", label: "Abdômen" },
  { key: "suprailiac", label: "Supra-ilíaca" },
  { key: "chest", label: "Peitoral" },
  { key: "thigh", label: "Coxa" },
  { key: "midaxillary", label: "Axilar média" },
  { key: "subscapular", label: "Subescapular" },
] as const;
export type SkinfoldKey = (typeof SKINFOLDS)[number]["key"];

/** Perímetros, em cm. */
export const PERIMETERS = [
  { key: "arm_l_relaxed", label: "Braço esquerdo relaxado" },
  { key: "arm_r_relaxed", label: "Braço direito relaxado" },
  { key: "arm_l_contracted", label: "Braço esquerdo contraído" },
  { key: "arm_r_contracted", label: "Braço direito contraído" },
  { key: "forearm_l", label: "Antebraço esquerdo" },
  { key: "forearm_r", label: "Antebraço direito" },
  { key: "chest", label: "Tórax" },
  { key: "waist", label: "Cintura" },
  { key: "abdomen", label: "Abdômen" },
  { key: "hip", label: "Quadril" },
  { key: "thigh_l", label: "Coxa média esquerda" },
  { key: "thigh_r", label: "Coxa média direita" },
  { key: "calf_l", label: "Panturrilha esquerda" },
  { key: "calf_r", label: "Panturrilha direita" },
] as const;
export type PerimeterKey = (typeof PERIMETERS)[number]["key"];

/** Perguntas da anamnese (texto livre). */
export const ANAMNESIS = [
  { key: "objective", label: "Objetivo principal", placeholder: "Ex.: perder gordura, ganhar massa" },
  { key: "activity", label: "Atividade física atual", placeholder: "Ex.: musculação 4x por semana" },
  { key: "sleep", label: "Sono", placeholder: "Ex.: 7 horas por noite" },
  { key: "diseases", label: "Doenças ou condições", placeholder: "Ex.: hipertensão, diabetes" },
  { key: "medications", label: "Medicamentos em uso", placeholder: "" },
  { key: "injuries", label: "Lesões ou dores", placeholder: "Ex.: dor no joelho direito" },
  { key: "surgeries", label: "Cirurgias", placeholder: "" },
  { key: "habits", label: "Fumo e álcool", placeholder: "Ex.: não fuma, bebe aos fins de semana" },
  { key: "notes", label: "Observações", placeholder: "" },
] as const;
export type AnamnesisKey = (typeof ANAMNESIS)[number]["key"];

export const PROTOCOL = { name: "Jackson e Pollock", detail: "(1978), 7 dobras" };

/** Densidade corporal por Jackson e Pollock, 7 dobras (homens 1978, mulheres 1980). */
export function bodyDensityJP7(sex: Sex, age: number, sumMm: number): number {
  if (sex === "male") return 1.112 - 0.00043499 * sumMm + 0.00000055 * sumMm * sumMm - 0.00028826 * age;
  return 1.097 - 0.00046971 * sumMm + 0.00000056 * sumMm * sumMm - 0.00012828 * age;
}

/** Percentual de gordura pela equação de Siri. */
export function siriFatPct(density: number): number {
  return 495 / density - 450;
}

/** Taxa metabólica basal (Harris-Benedict). */
export function bmrHarrisBenedict(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  if (sex === "male") return 66 + 13.7 * weightKg + 5 * heightCm - 6.8 * age;
  return 655 + 9.6 * weightKg + 1.8 * heightCm - 4.7 * age;
}

/** Faixas de percentual de gordura (referência ACSM, adultos). */
export function fatBands(sex: Sex) {
  return sex === "male"
    ? [
        { label: "Essencial", max: 6, color: "var(--protein)" },
        { label: "Atleta", max: 14, color: "var(--ok)" },
        { label: "Boa forma", max: 18, color: "var(--ok)" },
        { label: "Aceitável", max: 25, color: "var(--warn)" },
        { label: "Obesidade", max: Infinity, color: "var(--danger)" },
      ]
    : [
        { label: "Essencial", max: 14, color: "var(--protein)" },
        { label: "Atleta", max: 21, color: "var(--ok)" },
        { label: "Boa forma", max: 25, color: "var(--ok)" },
        { label: "Aceitável", max: 32, color: "var(--warn)" },
        { label: "Obesidade", max: Infinity, color: "var(--danger)" },
      ];
}

export function fatBand(sex: Sex, pct: number) {
  return fatBands(sex).find((b) => pct < b.max)!;
}

/** Gordura alvo usada no peso ideal: meio da faixa "boa forma". */
export const TARGET_FAT_PCT: Record<Sex, number> = { male: 15, female: 23 };

export interface AssessmentInput {
  sex: Sex;
  age: number;
  weightKg: number;
  heightCm: number;
  skinfolds: Partial<Record<SkinfoldKey, number>>;
}

export interface AssessmentResult {
  bmi: number;
  bmr: number;
  /** Só quando as 7 dobras foram medidas. */
  fatPct: number | null;
  fatMassKg: number | null;
  leanMassKg: number | null;
  /** Peso com a gordura alvo, mantendo a massa magra. */
  targetWeightKg: number | null;
  /** Faixa de peso com IMC entre 18,5 e 24,9. */
  healthyMinKg: number;
  healthyMaxKg: number;
}

export function computeAssessment(i: AssessmentInput): AssessmentResult {
  const folds = SKINFOLDS.map((s) => i.skinfolds[s.key]);
  const complete = folds.every((v) => v != null && v > 0);
  const fatPct = complete ? siriFatPct(bodyDensityJP7(i.sex, i.age, folds.reduce<number>((a, v) => a + v!, 0))) : null;
  const fatMassKg = fatPct != null ? (i.weightKg * fatPct) / 100 : null;
  const leanMassKg = fatMassKg != null ? i.weightKg - fatMassKg : null;
  const h = i.heightCm / 100;
  return {
    bmi: bmi(i.weightKg, i.heightCm),
    bmr: bmrHarrisBenedict(i.sex, i.weightKg, i.heightCm, i.age),
    fatPct,
    fatMassKg,
    leanMassKg,
    targetWeightKg: leanMassKg != null ? leanMassKg / (1 - TARGET_FAT_PCT[i.sex] / 100) : null,
    healthyMinKg: 18.5 * h * h,
    healthyMaxKg: 24.9 * h * h,
  };
}
