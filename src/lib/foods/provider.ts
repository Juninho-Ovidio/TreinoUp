import type { ExternalFood } from "../types";

/**
 * Contrato para bases nutricionais externas. Hoje: Open Food Facts.
 * Para integrar outra base (USDA FoodData Central, TACO via API própria, uma base paga),
 * implemente esta interface e registre em ./index.ts.
 */
export interface FoodProvider {
  id: string;
  label: string;
  search(query: string, opts?: { page?: number; pageSize?: number }): Promise<ExternalFood[]>;
  byBarcode(code: string): Promise<ExternalFood | null>;
}

export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 14) return null;
  return digits;
}
