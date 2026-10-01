import "server-only";
import type { ExternalFood } from "../types";
import type { FoodProvider } from "./provider";

/**
 * Open Food Facts — base aberta e colaborativa de produtos embalados (licença ODbL).
 * Os dados vêm de rótulos enviados por voluntários: o app mostra a fonte ao usuário.
 * Limites da API: ~100 leituras de produto/min e ~10 buscas/min por IP. Por isso as respostas
 * são cacheadas pelo Next (revalidate) e a busca externa só roda depois da busca local.
 */
const BASE = "https://world.openfoodfacts.org";
const SEARCH_BASE = "https://search.openfoodfacts.org";
const USER_AGENT = `TreinoUp/0.1 (${process.env.NEXT_PUBLIC_SITE_URL ?? "https://treinoup.app"})`;
const FIELDS = [
  "code",
  "product_name",
  "product_name_pt",
  "brands",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "image_small_url",
].join(",");

interface OffProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string | string[];
  serving_size?: string;
  serving_quantity?: number | string;
  image_small_url?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};

export function mapOffProduct(p: OffProduct): ExternalFood | null {
  const n = p.nutriments ?? {};
  let kcal = num(n["energy-kcal_100g"]);
  if (kcal == null) {
    const kj = num(n["energy_100g"]);
    if (kj != null) kcal = kj / 4.184;
  }
  const name = (p.product_name_pt || p.product_name || "").trim();
  if (!p.code || !name || kcal == null) return null;
  const macroSum = (num(n["proteins_100g"]) ?? 0) + (num(n["carbohydrates_100g"]) ?? 0) + (num(n["fat_100g"]) ?? 0);
  // Cadastro com 0 kcal mas com macros é dado errado na base: melhor não mostrar.
  if (kcal === 0 && macroSum > 1) return null;
  const sodium = num(n["sodium_100g"]);
  const servingG = num(p.serving_quantity);
  return {
    name,
    brand: (Array.isArray(p.brands) ? p.brands[0] : p.brands?.split(",")[0])?.trim() || null,
    barcode: p.code,
    source: "openfoodfacts",
    external_id: p.code,
    serving_name: p.serving_size?.trim() || null,
    serving_g: servingG && servingG > 0 ? servingG : null,
    unit_name: null,
    unit_g: null,
    kcal_100g: Math.round(kcal * 10) / 10,
    protein_100g: num(n["proteins_100g"]) ?? 0,
    carbs_100g: num(n["carbohydrates_100g"]) ?? 0,
    fat_100g: num(n["fat_100g"]) ?? 0,
    fiber_100g: num(n["fiber_100g"]),
    sugar_100g: num(n["sugars_100g"]),
    sodium_mg_100g: sodium != null ? Math.round(sodium * 1000 * 10) / 10 : null,
    image_url: p.image_small_url || null,
  };
}

export const openFoodFacts: FoodProvider = {
  id: "openfoodfacts",
  label: "Open Food Facts",

  async search(query, opts) {
    // Search-a-licious: o endpoint antigo (cgi/search.pl) vive fora do ar. Filtra produtos vendidos
    // no Brasil e busca o nome em português.
    const clean = query.replace(/["\\:()]/g, " ").trim();
    const params = new URLSearchParams({
      q: `${clean} countries_tags:"en:brazil"`,
      langs: "pt",
      page: String(opts?.page ?? 1),
      page_size: String(opts?.pageSize ?? 20),
      fields: FIELDS,
    });
    const res = await fetch(`${SEARCH_BASE}/search?${params}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
    const json = (await res.json()) as { hits?: OffProduct[] };
    return (json.hits ?? []).map(mapOffProduct).filter((f): f is ExternalFood => f !== null);
  },

  async byBarcode(code) {
    const res = await fetch(`${BASE}/api/v2/product/${encodeURIComponent(code)}.json?fields=${FIELDS}`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      next: { revalidate: 60 * 60 * 24 * 7 },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Open Food Facts respondeu ${res.status}`);
    const json = (await res.json()) as { status?: number; product?: OffProduct };
    if (json.status !== 1 || !json.product) return null;
    return mapOffProduct({ ...json.product, code: json.product.code ?? code });
  },
};
