// Gera a versão web do TreinoUp Run (mobile/) dentro do site, em public/app, antes do `next build`.
// Usa o mesmo Supabase do site (NEXT_PUBLIC_*) e o modo "dentro do site": login, cadastro e tela
// inicial ficam com o TreinoUp; o ícone do Run no Início abre /app/run.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mobile = path.join(root, "mobile");
const out = path.join(root, "public", "app");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.warn("[build-mobile-web] Sem NEXT_PUBLIC_SUPABASE_URL/ANON_KEY: o TreinoUp Run não foi gerado.");
  process.exit(0);
}

if (!existsSync(path.join(mobile, "node_modules"))) {
  execSync("npm ci", { cwd: mobile, stdio: "inherit" });
}
rmSync(out, { recursive: true, force: true });
execSync(`npx expo export --platform web --output-dir "${out}"`, {
  cwd: mobile,
  stdio: "inherit",
  env: {
    ...process.env,
    CI: "1",
    EXPO_WEB_BASE_URL: "/app",
    EXPO_PUBLIC_WEB_EMBEDDED: "true",
    EXPO_PUBLIC_WEB_HOME: "/inicio",
    EXPO_PUBLIC_WEB_LOGIN: "/login",
    EXPO_PUBLIC_SUPABASE_URL: url,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: key,
  },
});
console.log("[build-mobile-web] TreinoUp Run gerado em public/app");
