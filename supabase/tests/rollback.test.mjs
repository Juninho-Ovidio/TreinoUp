// Prova que o ponto de restauração do banco funciona: aplica o TreinoUp, tira uma "foto" da estrutura,
// aplica a migration do app, roda o rollback e confere que a estrutura voltou idêntica e os dados ficaram.
// Uso: npm run test:db
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const dir = new URL("../migrations/", import.meta.url);
const RUN = "20261002000001_run_fundacao.sql";
const USER = "00000000-0000-4000-8000-0000000000c1";

let db;
const read = (url) => readFileSync(url, "utf8");

/** Estrutura relevante: colunas, constraints, índices, funções, triggers, políticas, schemas e buckets. */
async function snapshot() {
  const q = async (sql) => (await db.query(sql)).rows.map((r) => Object.values(r).join("|")).sort();
  return {
    columns: await q("select table_schema, table_name, column_name, data_type, column_default from information_schema.columns where table_schema in ('public', 'storage')"),
    constraints: await q("select conrelid::regclass::text, conname from pg_constraint where connamespace = 'public'::regnamespace"),
    indexes: await q("select indexname from pg_indexes where schemaname = 'public'"),
    functions: await q("select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public', 'privacy')"),
    triggers: await q("select tgrelid::regclass::text, tgname from pg_trigger where not tgisinternal"),
    policies: await q("select schemaname, tablename, policyname from pg_policies"),
    schemas: await q("select nspname from pg_namespace where nspname not like 'pg_%'"),
    buckets: await q("select id, public, coalesce(file_size_limit::text, '-'), coalesce(array_to_string(allowed_mime_types, ','), '-') from storage.buckets"),
  };
}

before(async () => {
  db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  await db.exec(read(new URL("./stubs.sql", import.meta.url)));
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql") && f < RUN).sort()) await db.exec(read(new URL(f, dir)));
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'c@x.com', '{\"name\":\"Carla\"}')", [USER]);
  await db.query("update public.profiles set goal = 'gain' where id = $1", [USER]);
});

after(async () => {
  await db?.close();
});

test("rollback deixa o banco exatamente como antes do app e preserva os dados do TreinoUp", async () => {
  const before = await snapshot();

  await db.exec(read(new URL(RUN, dir)));
  await db.query("update public.profiles set username = 'carla.run', bio = 'oi' where id = $1", [USER]);
  assert.notDeepEqual(await snapshot(), before, "a migration do app deveria mudar a estrutura");

  await db.exec(read(new URL("../rollback/20261002000001_run_fundacao_down.sql", import.meta.url)));
  assert.deepEqual(await snapshot(), before);

  const [p] = (await db.query("select name, goal from public.profiles where id = $1", [USER])).rows;
  assert.deepEqual(p, { name: "Carla", goal: "gain" });
  const [{ meals }] = (await db.query("select count(*)::int as meals from public.meals where user_id = $1", [USER])).rows;
  assert.equal(meals, 5);
});

test("depois do rollback, o cadastro do TreinoUp continua funcionando e a migration pode ser reaplicada", async () => {
  await db.query("insert into auth.users (id, email) values ('00000000-0000-4000-8000-0000000000c2', 'd@x.com')");
  const [{ n }] = (await db.query("select count(*)::int as n from public.profiles")).rows;
  assert.equal(n, 2);
  await db.exec(read(new URL(RUN, dir)));
  const [{ s }] = (await db.query("select count(*)::int as s from privacy.settings")).rows;
  assert.equal(s, 2);
});
