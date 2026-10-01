#!/usr/bin/env node
/**
 * Gera com IA (Google Veo, pela API Gemini) um vídeo de demonstração para cada exercício do catálogo,
 * envia ao bucket "exercise-videos" do Supabase e grava o link em exercises.video_url.
 *
 * Uso:
 *   node scripts/generate-exercise-videos.mjs --dry-run            só mostra os prompts (não gasta nada)
 *   node scripts/generate-exercise-videos.mjs --limit 1            gera 1 vídeo para testar qualidade e custo
 *   node scripts/generate-exercise-videos.mjs                      gera todos que ainda não têm vídeo
 *   node scripts/generate-exercise-videos.mjs --only "Agachamento" só exercícios cujo nome contém o texto
 *
 * Variáveis (ambiente ou .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY   (a service role NUNCA vai para o front-end)
 *   GEMINI_API_KEY                                        chave da API Gemini (aistudio.google.com/apikey)
 *   VEO_MODEL                                             opcional; padrão veo-3.0-fast-generate-001
 *
 * Cada vídeo é cobrado pelo Google por segundo gerado. Rode primeiro com --limit 1.
 * É retomável: quem já tem video_url é pulado, então pode interromper e continuar depois.
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

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function promptFor(ex) {
  const how = ex.description ? ` Execução correta: ${ex.description}` : "";
  return (
    `Vídeo de demonstração de academia, câmera fixa em plano aberto mostrando o corpo inteiro. ` +
    `Uma pessoa atlética executa corretamente o exercício "${ex.name}", com movimento lento, claro e controlado, ` +
    `repetindo de 2 a 3 vezes.${how} ` +
    `Academia moderna e limpa ao fundo, iluminação neutra e uniforme. Sem texto na tela, sem legendas, sem música.`
  );
}

async function generate({ key, model, prompt }) {
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const start = await fetch(`${base}/models/${model}:predictLongRunning`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: "16:9" } }),
  });
  if (!start.ok) throw new Error(`Início falhou (${start.status}): ${await start.text()}`);
  const op = await start.json();
  for (let i = 0; i < 90; i++) {
    await sleep(10_000);
    const poll = await fetch(`${base}/${op.name}`, { headers: { "x-goog-api-key": key } });
    if (!poll.ok) throw new Error(`Consulta falhou (${poll.status}): ${await poll.text()}`);
    const st = await poll.json();
    if (!st.done) continue;
    if (st.error) throw new Error(`Geração falhou: ${JSON.stringify(st.error)}`);
    const sample = st.response?.generateVideoResponse?.generatedSamples?.[0];
    const uri = sample?.video?.uri;
    if (!uri) throw new Error(`Sem vídeo na resposta (talvez bloqueado por filtro): ${JSON.stringify(st.response).slice(0, 300)}`);
    const dl = await fetch(uri, { headers: { "x-goog-api-key": key }, redirect: "follow" });
    if (!dl.ok) throw new Error(`Download falhou (${dl.status})`);
    return Buffer.from(await dl.arrayBuffer());
  }
  throw new Error("Tempo esgotado esperando o vídeo (15 min).");
}

async function main() {
  loadEnv();
  const dry = flag("--dry-run");
  const limit = Number(arg("--limit")) || Infinity;
  const only = arg("--only")?.toLowerCase();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const srk = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gem = process.env.GEMINI_API_KEY;
  const model = process.env.VEO_MODEL || "veo-3.0-fast-generate-001";
  if (!url || !srk) return fail("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  if (!dry && !gem) return fail("Defina GEMINI_API_KEY (ou use --dry-run).");

  const sb = { apikey: srk, Authorization: `Bearer ${srk}` };
  const res = await fetch(`${url}/rest/v1/exercises?user_id=is.null&video_url=is.null&select=id,name,category,description&order=name`, { headers: sb });
  if (!res.ok) return fail(`Não consegui ler os exercícios: ${res.status} ${await res.text()}`);
  let todo = await res.json();
  if (only) todo = todo.filter((e) => e.name.toLowerCase().includes(only));
  todo = todo.slice(0, limit);
  console.log(`${todo.length} exercício(s) sem vídeo${dry ? " (simulação, nada será gerado)" : ""}. Modelo: ${model}\n`);

  let ok = 0;
  for (const [i, ex] of todo.entries()) {
    const prompt = promptFor(ex);
    console.log(`[${i + 1}/${todo.length}] ${ex.name}`);
    if (dry) {
      console.log(`   ${prompt}\n`);
      continue;
    }
    try {
      const mp4 = await generate({ key: gem, model, prompt });
      const path = `${ex.id}.mp4`;
      const up = await fetch(`${url}/storage/v1/object/exercise-videos/${path}`, {
        method: "POST",
        headers: { ...sb, "Content-Type": "video/mp4", "x-upsert": "true" },
        body: mp4,
      });
      if (!up.ok) throw new Error(`Upload falhou (${up.status}): ${await up.text()}`);
      const publicUrl = `${url}/storage/v1/object/public/exercise-videos/${path}`;
      const patch = await fetch(`${url}/rest/v1/exercises?id=eq.${ex.id}`, {
        method: "PATCH",
        headers: { ...sb, "Content-Type": "application/json" },
        body: JSON.stringify({ video_url: publicUrl }),
      });
      if (!patch.ok) throw new Error(`Gravar link falhou (${patch.status}): ${await patch.text()}`);
      ok++;
      console.log(`   pronto (${(mp4.length / 1024 / 1024).toFixed(1)} MB)`);
    } catch (e) {
      console.error(`   erro: ${e.message}`);
    }
  }
  if (!dry) console.log(`\nConcluído: ${ok}/${todo.length} vídeo(s) gerado(s). Rode de novo para tentar os que falharam.`);
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
