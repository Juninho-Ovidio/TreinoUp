-- TreinoUp Run (app mobile) — Fase 0: perfil social e privacidade.
-- Estende o banco do TreinoUp sem mexer no que já existe:
--   • o núcleo compartilhado (perfil) continua em public e só ganha colunas novas;
--   • cada área nova do Run ganha o próprio schema (aqui: privacy).
-- Padrões seguros: perfil, atividades e mapas começam visíveis só para seguidores.

-- ============================================================
-- PERFIL: campos sociais (nome de usuário, bio, cidade, visibilidade)
-- ============================================================
alter table public.profiles
  add column if not exists username text,
  add column if not exists bio text,
  add column if not exists city text,
  add column if not exists profile_visibility text not null default 'followers';

-- Mesmas regras de mobile/src/features/profile/domain/username.ts (um teste compara as duas).
alter table public.profiles
  add constraint profiles_username_format check (
    username is null or (
      username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
      and position('..' in username) = 0
    )
  ),
  add constraint profiles_username_reserved check (
    username is null or username not in (
      'admin', 'administrador', 'ajuda', 'api', 'app', 'help', 'me', 'moderador', 'root', 'run',
      'settings', 'suporte', 'support', 'system', 'treinoup', 'treinouprun', 'www'
    )
  ),
  add constraint profiles_bio_len check (bio is null or char_length(bio) <= 280),
  add constraint profiles_city_len check (city is null or char_length(city) <= 80),
  add constraint profiles_visibility check (profile_visibility in ('everyone', 'followers'));

create unique index if not exists profiles_username_key on public.profiles (username);

-- Disponibilidade do nome de usuário sem expor os perfis dos outros (a RLS só mostra o próprio).
create or replace function public.username_available(candidate text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
     and not exists (
       select 1 from public.profiles p
       where p.username = lower(trim(candidate)) and p.id <> auth.uid()
     );
$$;
revoke all on function public.username_available(text) from public, anon;
grant execute on function public.username_available(text) to authenticated;

-- ============================================================
-- SCHEMA privacy: preferências de privacidade
-- (os controles completos chegam na Fase 4; os padrões já nascem seguros)
-- ============================================================
create schema if not exists privacy;
grant usage on schema privacy to authenticated, service_role;

create table privacy.settings (
  user_id                      uuid primary key references auth.users (id) on delete cascade,
  default_activity_visibility  text not null default 'followers'
                               check (default_activity_visibility in ('everyone', 'followers', 'only_me')),
  default_map_visibility       text not null default 'followers'
                               check (default_map_visibility in ('public', 'followers', 'hidden')),
  group_activities             text not null default 'everyone' check (group_activities in ('everyone', 'only_me')),
  hidden_details               text[] not null default '{}'
                               check (hidden_details <@ array['power', 'heartrate', 'speed', 'calories', 'start_time']::text[]),
  flyby                        boolean not null default false,
  contribute_heatmap           boolean not null default false,
  enhanced_privacy             boolean not null default false,
  updated_at                   timestamptz not null default now()
);

create trigger settings_touch before update on privacy.settings
  for each row execute function public.touch_updated_at();

alter table privacy.settings enable row level security;
create policy "read own settings" on privacy.settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "insert own settings" on privacy.settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "update own settings" on privacy.settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Sem DELETE: as preferências somem junto com a conta (cascata de auth.users).
revoke all on privacy.settings from anon, authenticated;
grant select, insert, update on privacy.settings to authenticated;
grant all on privacy.settings to service_role;

-- Novas contas ganham as preferências padrão. Trigger próprio, para não alterar o do TreinoUp.
create or replace function privacy.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into privacy.settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;
revoke all on function privacy.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_privacy after insert on auth.users
  for each row execute function privacy.handle_new_user();

-- Contas que já existem.
insert into privacy.settings (user_id)
select id from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- STORAGE: fotos de perfil
-- O app lista a própria pasta para apagar fotos antigas; o bucket passa a validar tamanho e tipo.
-- ============================================================
update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'avatars';

create policy "avatar read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
