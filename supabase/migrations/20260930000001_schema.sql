-- NutriTrack — esquema inicial
-- Todas as tabelas de dados pessoais têm user_id e Row Level Security:
-- cada usuário autenticado lê e escreve somente as próprias linhas.

create extension if not exists pg_trgm;

-- ============================================================
-- PERFIL
-- ============================================================
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  name              text,
  avatar_url        text,
  age               smallint check (age between 13 and 110),
  sex               text check (sex in ('male', 'female')),
  height_cm         numeric(5,1) check (height_cm between 100 and 250),
  start_weight_kg   numeric(5,1) check (start_weight_kg between 25 and 400),
  target_weight_kg  numeric(5,1) check (target_weight_kg between 25 and 400),
  goal              text check (goal in ('lose', 'maintain', 'gain', 'recomp')),
  activity_level    text check (activity_level in ('sedentary', 'light', 'moderate', 'very', 'extreme')),
  pace              text not null default 'moderate' check (pace in ('slow', 'moderate', 'fast')),
  diet_preference   text not null default 'normal'
                    check (diet_preference in ('normal', 'low_carb', 'high_protein', 'vegetarian', 'vegan', 'custom')),
  units             text not null default 'metric' check (units in ('metric', 'imperial')),
  theme             text not null default 'system' check (theme in ('system', 'light', 'dark')),
  plan              text not null default 'free' check (plan in ('free', 'premium')),
  onboarded_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Metas diárias. A meta vigente numa data é a de maior effective_from <= data.
create table public.goals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  effective_from  date not null default current_date,
  kcal            integer not null check (kcal between 800 and 8000),
  protein_g       integer not null check (protein_g between 0 and 600),
  carbs_g         integer not null check (carbs_g between 0 and 1200),
  fat_g           integer not null check (fat_g between 0 and 400),
  fiber_g         integer not null default 25 check (fiber_g between 0 and 150),
  water_ml        integer not null default 2500 check (water_ml between 500 and 8000),
  is_manual       boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (user_id, effective_from)
);

-- Refeições do dia (café, almoço…). Criadas automaticamente no cadastro; o usuário pode renomear.
create table public.meals (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null check (char_length(name) between 1 and 40),
  icon      text not null default 'utensils',
  position  smallint not null,
  unique (user_id, position)
);

-- ============================================================
-- ALIMENTOS
-- user_id nulo = alimento do catálogo compartilhado (importado de uma base oficial).
-- Valores nutricionais sempre por 100 g (ou 100 ml).
-- ============================================================
create table public.foods (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 160),
  brand           text,
  barcode         text,
  source          text not null default 'custom' check (source in ('custom', 'openfoodfacts', 'taco', 'usda', 'import')),
  external_id     text,
  serving_name    text,
  serving_g       numeric(7,1) check (serving_g > 0),
  unit_name       text,
  unit_g          numeric(7,1) check (unit_g > 0),
  kcal_100g       numeric(7,1) not null check (kcal_100g >= 0),
  protein_100g    numeric(6,2) not null default 0 check (protein_100g >= 0),
  carbs_100g      numeric(6,2) not null default 0 check (carbs_100g >= 0),
  fat_100g        numeric(6,2) not null default 0 check (fat_100g >= 0),
  fiber_100g      numeric(6,2) check (fiber_100g >= 0),
  sugar_100g      numeric(6,2) check (sugar_100g >= 0),
  sodium_mg_100g  numeric(8,1) check (sodium_mg_100g >= 0),
  image_url       text,
  created_at      timestamptz not null default now()
);
create index foods_name_trgm on public.foods using gin (name gin_trgm_ops);
create index foods_brand_trgm on public.foods using gin (brand gin_trgm_ops);
create index foods_barcode on public.foods (barcode) where barcode is not null;
create unique index foods_user_source_external on public.foods (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), source, external_id)
  where external_id is not null;

create table public.food_favorites (
  user_id     uuid not null references auth.users (id) on delete cascade,
  food_id     uuid not null references public.foods (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, food_id)
);

-- ============================================================
-- RECEITAS
-- ============================================================
create table public.recipes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  servings    numeric(5,1) not null default 1 check (servings > 0 and servings <= 100),
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.recipe_ingredients (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references public.recipes (id) on delete cascade,
  food_id    uuid not null references public.foods (id) on delete restrict,
  grams      numeric(7,1) not null check (grams > 0),
  position   smallint not null default 0
);
create index recipe_ingredients_recipe on public.recipe_ingredients (recipe_id);

-- ============================================================
-- DIÁRIO ALIMENTAR
-- Guarda uma cópia dos valores no momento do registro, para o histórico não mudar
-- se o alimento for editado depois.
-- ============================================================
create table public.food_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  entry_date   date not null,
  meal_id      uuid not null references public.meals (id) on delete cascade,
  food_id      uuid references public.foods (id) on delete set null,
  recipe_id    uuid references public.recipes (id) on delete set null,
  name         text not null,
  brand        text,
  quantity     numeric(7,2) not null check (quantity > 0),
  unit         text not null check (unit in ('g', 'ml', 'unit', 'serving', 'portion')),
  grams        numeric(8,1) not null check (grams > 0),
  kcal         numeric(7,1) not null,
  protein_g    numeric(6,1) not null default 0,
  carbs_g      numeric(6,1) not null default 0,
  fat_g        numeric(6,1) not null default 0,
  fiber_g      numeric(6,1) not null default 0,
  created_at   timestamptz not null default now()
);
create index food_entries_user_date on public.food_entries (user_id, entry_date);
create index food_entries_user_created on public.food_entries (user_id, created_at desc);

-- ============================================================
-- ÁGUA, PESO, MEDIDAS
-- ============================================================
create table public.water_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null,
  amount_ml   integer not null check (amount_ml between 1 and 5000),
  created_at  timestamptz not null default now()
);
create index water_entries_user_date on public.water_entries (user_id, entry_date);

create table public.weight_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null,
  weight_kg   numeric(5,1) not null check (weight_kg between 25 and 400),
  created_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

create table public.body_measurements (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  entry_date  date not null,
  weight_kg   numeric(5,1) check (weight_kg between 25 and 400),
  waist_cm    numeric(5,1) check (waist_cm between 30 and 250),
  abdomen_cm  numeric(5,1) check (abdomen_cm between 30 and 250),
  chest_cm    numeric(5,1) check (chest_cm between 40 and 250),
  arm_cm      numeric(5,1) check (arm_cm between 10 and 100),
  hip_cm      numeric(5,1) check (hip_cm between 40 and 250),
  thigh_cm    numeric(5,1) check (thigh_cm between 20 and 150),
  created_at  timestamptz not null default now(),
  unique (user_id, entry_date)
);

-- ============================================================
-- TREINOS E EXERCÍCIOS
-- ============================================================
create table public.exercises (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,  -- nulo = catálogo
  name         text not null,
  category     text not null check (category in ('chest', 'back', 'shoulders', 'arms', 'legs', 'glutes', 'abs', 'cardio')),
  description  text,
  created_at   timestamptz not null default now()
);
create index exercises_category on public.exercises (category);

create table public.workouts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  workout_date  date not null,
  name          text not null,
  duration_min  smallint check (duration_min between 1 and 600),
  notes         text,
  created_at    timestamptz not null default now()
);
create index workouts_user_date on public.workouts (user_id, workout_date);

create table public.workout_exercises (
  id           uuid primary key default gen_random_uuid(),
  workout_id   uuid not null references public.workouts (id) on delete cascade,
  exercise_id  uuid references public.exercises (id) on delete set null,
  name         text not null,
  sets         smallint not null check (sets between 1 and 20),
  reps         smallint not null check (reps between 1 and 200),
  load_kg      numeric(6,1) not null default 0 check (load_kg >= 0),
  rest_s       smallint check (rest_s between 0 and 900),
  position     smallint not null default 0
);
create index workout_exercises_workout on public.workout_exercises (workout_id);

-- Atividades com gasto calórico (caminhada, corrida…)
create table public.activity_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  entry_date    date not null,
  activity      text not null check (activity in ('walking', 'running', 'cycling', 'strength', 'soccer', 'swimming', 'hiit')),
  duration_min  smallint not null check (duration_min between 1 and 600),
  distance_km   numeric(6,2) check (distance_km >= 0),
  kcal          integer not null check (kcal >= 0),
  created_at    timestamptz not null default now()
);
create index activity_entries_user_date on public.activity_entries (user_id, entry_date);

-- ============================================================
-- LEMBRETES
-- ============================================================
create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('water', 'meal', 'weight', 'workout', 'dinner')),
  enabled    boolean not null default false,
  at_time    time not null,
  unique (user_id, kind)
);

-- ============================================================
-- TRIGGERS
-- ============================================================
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger recipes_touch before update on public.recipes
  for each row execute function public.touch_updated_at();

-- Ao criar a conta: perfil vazio, refeições padrão e lembretes desligados.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, nullif(trim(coalesce(new.raw_user_meta_data ->> 'name', '')), ''));

  insert into public.meals (user_id, name, icon, position) values
    (new.id, 'Café da manhã', 'sunrise', 0),
    (new.id, 'Almoço',        'utensils', 1),
    (new.id, 'Lanche',        'apple', 2),
    (new.id, 'Jantar',        'moon', 3),
    (new.id, 'Ceia',          'cup', 4);

  insert into public.notifications (user_id, kind, enabled, at_time) values
    (new.id, 'water',   false, '10:00'),
    (new.id, 'meal',    false, '12:00'),
    (new.id, 'weight',  false, '07:30'),
    (new.id, 'workout', false, '18:00'),
    (new.id, 'dinner',  false, '20:30');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Proteção: o usuário não pode se promover a Premium pelo cliente.
create or replace function public.protect_profile_plan() returns trigger
language plpgsql as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(), '') <> 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end $$;

create trigger profiles_protect_plan before update on public.profiles
  for each row execute function public.protect_profile_plan();

-- Excluir a própria conta (apaga todos os dados em cascata).
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  -- Receitas primeiro: seus ingredientes apontam para alimentos do usuário (on delete restrict).
  delete from public.recipes where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles           enable row level security;
alter table public.goals              enable row level security;
alter table public.meals              enable row level security;
alter table public.foods              enable row level security;
alter table public.food_favorites     enable row level security;
alter table public.recipes            enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.food_entries       enable row level security;
alter table public.water_entries      enable row level security;
alter table public.weight_entries     enable row level security;
alter table public.body_measurements  enable row level security;
alter table public.exercises          enable row level security;
alter table public.workouts           enable row level security;
alter table public.workout_exercises  enable row level security;
alter table public.activity_entries   enable row level security;
alter table public.notifications      enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Tabelas com user_id direto: uma política "dono" para tudo.
do $$
declare t text;
begin
  foreach t in array array['goals', 'meals', 'food_favorites', 'recipes', 'food_entries', 'water_entries',
                           'weight_entries', 'body_measurements', 'workouts', 'activity_entries', 'notifications']
  loop
    execute format(
      'create policy "own rows" on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;

-- Catálogo compartilhado (user_id nulo) é só leitura; itens próprios são do usuário.
create policy "read catalog and own foods" on public.foods
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "insert own foods" on public.foods
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own foods" on public.foods
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own foods" on public.foods
  for delete to authenticated using (user_id = auth.uid());

create policy "read catalog and own exercises" on public.exercises
  for select to authenticated using (user_id is null or user_id = auth.uid());
create policy "insert own exercises" on public.exercises
  for insert to authenticated with check (user_id = auth.uid());
create policy "update own exercises" on public.exercises
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own exercises" on public.exercises
  for delete to authenticated using (user_id = auth.uid());

-- Tabelas filhas: acesso pelo dono do registro pai.
create policy "own recipe ingredients" on public.recipe_ingredients
  for all to authenticated
  using (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.recipes r where r.id = recipe_id and r.user_id = auth.uid()));

create policy "own workout exercises" on public.workout_exercises
  for all to authenticated
  using (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid()));

-- ============================================================
-- STORAGE: fotos de perfil (bucket público de leitura, escrita só na própria pasta)
-- ============================================================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatar upload own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
