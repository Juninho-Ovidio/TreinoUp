-- PONTO DE RESTAURAÇÃO DO BANCO
-- Desfaz supabase/migrations/20261002000001_run_fundacao.sql e deixa o banco como estava antes do app mobile.
-- Fica fora de migrations/ de propósito: só rode se quiser voltar atrás (SQL Editor → cole → Run).
--
-- ATENÇÃO: apaga o que só existe por causa do app: @usuários, bios, cidades e preferências de privacidade.
-- Os dados do TreinoUp (perfil, metas, diário, treinos, fotos) não são tocados.
-- Testado em supabase/tests/rollback.test.mjs.

begin;

-- Fotos de perfil: tira a leitura da própria pasta e os limites do bucket (que antes não existiam).
drop policy if exists "avatar read own folder" on storage.objects;
update storage.buckets
   set file_size_limit = null,
       allowed_mime_types = null
 where id = 'avatars';

-- Privacidade: trigger do cadastro e o schema inteiro.
drop trigger if exists on_auth_user_created_privacy on auth.users;
drop schema if exists privacy cascade;

-- Perfil: função, índice, regras e colunas novas.
drop function if exists public.username_available(text);
drop index if exists public.profiles_username_key;
alter table public.profiles
  drop constraint if exists profiles_username_format,
  drop constraint if exists profiles_username_reserved,
  drop constraint if exists profiles_bio_len,
  drop constraint if exists profiles_city_len,
  drop constraint if exists profiles_visibility,
  drop column if exists username,
  drop column if exists bio,
  drop column if exists city,
  drop column if exists profile_visibility;

-- Histórico de migrations do Supabase (para a CLI não achar que ela ainda está aplicada).
do $$
begin
  if to_regclass('supabase_migrations.schema_migrations') is not null then
    delete from supabase_migrations.schema_migrations where name = 'run_fundacao';
  end if;
end $$;

commit;
