#!/usr/bin/env node
/**
 * Importa uma base oficial de alimentos (ex.: Tabela TACO/Unicamp, USDA FoodData Central)
 * para o catálogo compartilhado (foods com user_id nulo), a partir de um CSV.
 *
 * Uso:
 *   node scripts/import-foods-csv.mjs caminho/arquivo.csv --source taco
 *
 * Colunas esperadas (cabeçalho na primeira linha, separador vírgula ou ponto e vírgula):
 *   id, name, kcal_100g, protein_100g, carbs_100g, fat_100g
 * Opcionais:
 *   brand, barcode, fiber_100g, sugar_100g, sodium_mg_100g, serving_name, serving_g, unit_name, unit_g
 *
 * Os números podem usar vírgula decimal. Linhas sem nome ou sem kcal são ignoradas.
 * Reimportar o mesmo arquivo atualiza as linhas (chave: source + id).
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente ou em .env.local.
 * Confira a licença da base antes de importar (a TACO permite uso com citação da fonte).
 */
import { readFileSync, existsSync } from "node:fs";

function loadEnv() {
  for (const f of [".env.local", ".env"]) {
    if (!existsSync(f)) continue;
    for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

function parseCsv(text) {
  const firstLine = text.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ";" : ",";
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  return rows.filter((r) => r.some((c) => c.trim())).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const num = (v) => {
  if (v == null || v === "" || /^(na|tr|\*|-)$/i.test(v)) return null; // "Tr" = traços na TACO
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

async function main() {
  loadEnv();
  const file = process.argv[2];
  const sIdx = process.argv.indexOf("--source");
  const source = sIdx > 0 ? process.argv[sIdx + 1] : "import";
  if (!file) {
    console.error("Uso: node scripts/import-foods-csv.mjs arquivo.csv --source taco|usda|import");
    process.exit(1);
  }
  if (!["taco", "usda", "import"].includes(source)) {
    console.error("--source deve ser taco, usda ou import");
    process.exit(1);
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const records = parseCsv(readFileSync(file, "utf8"));
  const foods = [];
  let skipped = 0;
  records.forEach((r, i) => {
    const kcal = num(r.kcal_100g);
    if (!r.name || kcal == null) return skipped++;
    foods.push({
      user_id: null,
      source,
      external_id: r.id || String(i + 1),
      name: r.name.slice(0, 160),
      brand: r.brand || null,
      barcode: r.barcode || null,
      kcal_100g: kcal,
      protein_100g: num(r.protein_100g) ?? 0,
      carbs_100g: num(r.carbs_100g) ?? 0,
      fat_100g: num(r.fat_100g) ?? 0,
      fiber_100g: num(r.fiber_100g),
      sugar_100g: num(r.sugar_100g),
      sodium_mg_100g: num(r.sodium_mg_100g),
      serving_name: r.serving_name || null,
      serving_g: num(r.serving_g),
      unit_name: r.unit_name || null,
      unit_g: num(r.unit_g),
    });
  });

  // Remove as linhas antigas desta fonte e insere de novo (o índice único usa uma expressão,
  // então o upsert por on_conflict do PostgREST não se aplica).
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const ids = foods.map((f) => f.external_id);
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200).map((x) => `"${String(x).replace(/"/g, '\\"')}"`).join(",");
    await fetch(`${url}/rest/v1/foods?user_id=is.null&source=eq.${source}&external_id=in.(${encodeURIComponent(chunk)})`, { method: "DELETE", headers });
  }
  let done = 0;
  for (let i = 0; i < foods.length; i += 500) {
    const batch = foods.slice(i, i + 500);
    const res = await fetch(`${url}/rest/v1/foods`, { method: "POST", headers: { ...headers, Prefer: "return=minimal" }, body: JSON.stringify(batch) });
    if (!res.ok) {
      console.error(`Falha no lote ${i / 500 + 1}:`, res.status, await res.text());
      process.exit(1);
    }
    done += batch.length;
    process.stdout.write(`\r${done}/${foods.length} alimentos importados`);
  }
  console.log(`\nConcluído. ${skipped} linha(s) ignorada(s) por falta de nome ou calorias.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
