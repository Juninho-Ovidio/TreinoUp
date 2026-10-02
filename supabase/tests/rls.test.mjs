// Testes do banco: aplica TODAS as migrations (TreinoUp + Run) num Postgres em WASM (PGlite)
// e confere RLS, regras e triggers. Uso: npm run test:db
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";

const dir = new URL("../migrations/", import.meta.url);
const stubs = readFileSync(new URL("./stubs.sql", import.meta.url), "utf8");
const RUN_MIGRATION = "20261002000001_run_fundacao.sql";

let db;
const OLD = "00000000-0000-4000-8000-0000000000a0"; // conta criada antes da migration do Run
const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";

/** Executa como um usuário logado (papel authenticated + sub no JWT), ou anônimo com id null. */
async function as(userId, fn) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  await db.exec(userId ? "set role authenticated" : "set role anon");
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

const rows = async (sql, params) => (await db.query(sql, params)).rows;
const apply = async (file) => db.exec(readFileSync(new URL(file, dir), "utf8"));

before(async () => {
  db = await PGlite.create({ extensions: { pg_trgm, unaccent } });
  await db.exec(stubs);
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  // Banco do TreinoUp como está hoje, com um usuário real…
  for (const f of files.filter((f) => f < RUN_MIGRATION)) await apply(f);
  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'old@x.com', '{\"name\":\"Conta Antiga\"}')", [OLD]);
  await db.query("update public.profiles set onboarded_at = now(), goal = 'lose' where id = $1", [OLD]);
  // …e então as migrations do Run.
  for (const f of files.filter((f) => f >= RUN_MIGRATION)) await apply(f);

  await db.query("insert into auth.users (id, email, raw_user_meta_data) values ($1, 'a@x.com', $2), ($3, 'b@x.com', '{}')", [
    A,
    JSON.stringify({ name: "Ana Corredora" }),
    B,
  ]);
});

after(async () => {
  await db?.close();
});

describe("compatibilidade com o TreinoUp", () => {
  test("a conta antiga mantém os dados e ganha preferências de privacidade", async () => {
    const [p] = await rows("select name, goal, onboarded_at, username, profile_visibility from public.profiles where id = $1", [OLD]);
    assert.equal(p.name, "Conta Antiga");
    assert.equal(p.goal, "lose");
    assert.notEqual(p.onboarded_at, null);
    assert.equal(p.username, null);
    assert.equal(p.profile_visibility, "followers");
    const [s] = await rows("select * from privacy.settings where user_id = $1", [OLD]);
    assert.equal(s.default_activity_visibility, "followers");
  });

  test("o cadastro continua criando refeições e lembretes do TreinoUp", async () => {
    const [{ meals }] = await rows("select count(*)::int as meals from public.meals where user_id = $1", [A]);
    const [{ reminders }] = await rows("select count(*)::int as reminders from public.notifications where user_id = $1", [A]);
    assert.equal(meals, 5);
    assert.equal(reminders, 5);
  });

  test("ninguém se promove a Premium pelo cliente", async () => {
    await as(A, () => db.query("update public.profiles set plan = 'premium', username = 'ana.corre' where id = $1", [A]));
    const [p] = await rows("select plan, username from public.profiles where id = $1", [A]);
    assert.equal(p.plan, "free");
    assert.equal(p.username, "ana.corre");
  });
});

describe("cadastro novo", () => {
  test("cria perfil com o nome e preferências com padrões seguros", async () => {
    const [p] = await rows("select * from public.profiles where id = $1", [A]);
    assert.equal(p.name, "Ana Corredora");
    assert.equal(p.profile_visibility, "followers");
    const [s] = await rows("select * from privacy.settings where user_id = $1", [A]);
    assert.equal(s.default_map_visibility, "followers");
    assert.equal(s.flyby, false);
    assert.equal(s.contribute_heatmap, false);
  });
});

describe("RLS", () => {
  test("cada usuário só enxerga o próprio perfil", async () => {
    const seen = await as(A, () => rows("select id from public.profiles"));
    assert.deepEqual(
      seen.map((r) => r.id),
      [A],
    );
  });

  test("não altera o perfil de outra pessoa", async () => {
    const res = await as(A, () => db.query("update public.profiles set bio = 'hack' where id = $1", [B]));
    assert.equal(res.affectedRows, 0);
  });

  test("anônimo não lê perfis nem preferências", async () => {
    // No Supabase real o anônimo tem GRANT nas tabelas de public e a RLS devolve zero linhas;
    // aqui (sem os GRANTs padrão) o acesso é negado. As duas respostas são seguras.
    const profiles = await as(null, () => rows("select * from public.profiles")).catch((e) => {
      assert.match(e.message, /permission denied/);
      return [];
    });
    assert.equal(profiles.length, 0);
    await assert.rejects(
      as(null, () => rows("select * from privacy.settings")),
      /permission denied/,
    );
  });

  test("preferências: só as próprias, e não dá para apagar", async () => {
    const seen = await as(A, () => rows("select user_id from privacy.settings"));
    assert.deepEqual(
      seen.map((r) => r.user_id),
      [A],
    );
    const res = await as(A, () => db.query("update privacy.settings set flyby = true where user_id = $1", [B]));
    assert.equal(res.affectedRows, 0);
    await assert.rejects(
      as(A, () => db.query("delete from privacy.settings where user_id = $1", [A])),
      /permission denied/,
    );
  });

  test("o trigger de cadastro não pode ser chamado pelo cliente", async () => {
    await assert.rejects(
      as(A, () => rows("select privacy.handle_new_user()")),
      /permission denied|trigger functions can only be called as triggers/,
    );
  });
});

describe("nome de usuário", () => {
  for (const bad of ["ab", "Joao", "a..b", ".joao", "joao_", "joão", "admin", "x".repeat(31)]) {
    test(`recusa "${bad}"`, async () => {
      await assert.rejects(
        as(B, () => db.query("update public.profiles set username = $2 where id = $1", [B, bad])),
        /check constraint/,
      );
    });
  }

  test("é único", async () => {
    await assert.rejects(
      as(B, () => db.query("update public.profiles set username = 'ana.corre' where id = $1", [B])),
      /duplicate key/,
    );
  });

  test("username_available considera os outros usuários, não o próprio", async () => {
    const [own] = await as(A, () => rows("select public.username_available('ana.corre') as ok"));
    assert.equal(own.ok, true);
    const [other] = await as(B, () => rows("select public.username_available(' Ana.Corre ') as ok"));
    assert.equal(other.ok, false);
    const [free] = await as(B, () => rows("select public.username_available('bia.pedal') as ok"));
    assert.equal(free.ok, true);
  });

  test("anônimo não consulta disponibilidade", async () => {
    await assert.rejects(
      as(null, () => rows("select public.username_available('x.y.z')")),
      /permission denied/,
    );
  });

  test("bio e cidade têm limite", async () => {
    await assert.rejects(
      as(B, () => db.query("update public.profiles set bio = $2 where id = $1", [B, "x".repeat(281)])),
      /profiles_bio_len/,
    );
  });
});

describe("fotos de perfil (storage)", () => {
  test("lê, envia e apaga só na própria pasta", async () => {
    await as(A, () => db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${A}/avatar-1.jpg`]));
    await db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${B}/avatar-1.jpg`]);
    const seen = await as(A, () => rows("select name from storage.objects where bucket_id = 'avatars'"));
    assert.deepEqual(
      seen.map((r) => r.name),
      [`${A}/avatar-1.jpg`],
    );
    await assert.rejects(
      as(A, () => db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [`${B}/avatar-2.jpg`])),
      /row-level security/,
    );
  });

  test("o bucket limita tamanho e tipo", async () => {
    const [bucket] = await rows("select * from storage.buckets where id = 'avatars'");
    assert.equal(Number(bucket.file_size_limit), 5 * 1024 * 1024);
    assert.deepEqual(bucket.allowed_mime_types, ["image/jpeg", "image/png", "image/webp"]);
  });
});

describe("excluir conta", () => {
  test("apaga perfil e preferências em cascata, sem tocar nos outros", async () => {
    await as(A, () => rows("select public.delete_my_account()"));
    assert.equal((await rows("select 1 from public.profiles where id = $1", [A])).length, 0);
    assert.equal((await rows("select 1 from privacy.settings where user_id = $1", [A])).length, 0);
    assert.equal((await rows("select 1 from public.meals where user_id = $1", [A])).length, 0);
    assert.equal((await rows("select 1 from public.profiles where id = $1", [B])).length, 1);
  });
});
