// Copia o worker do MapLibre GL (mapa da versão web) para public/, de onde o Expo serve arquivos
// estáticos. Roda sozinho no `npm install` (postinstall), sempre na mesma versão do pacote.
import { copyFileSync, mkdirSync } from "node:fs";

const from = new URL("../node_modules/maplibre-gl/dist/", import.meta.url);
const to = new URL("../public/maplibre/", import.meta.url);
mkdirSync(to, { recursive: true });
for (const f of ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"]) copyFileSync(new URL(f, from), new URL(f, to));
console.log("maplibre worker copiado para public/maplibre/");
