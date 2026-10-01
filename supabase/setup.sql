-- TreinoUp - setup completo (gerado a partir de supabase/migrations/).
-- Cole tudo no Supabase > SQL Editor > New query e clique em Run. Rode uma vez so, num projeto novo.

-- ============================================================
-- 20260930000001_schema.sql
-- ============================================================
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

-- ============================================================
-- 20260930000002_seed_exercises.sql
-- ============================================================
-- Catálogo inicial de exercícios (user_id nulo = visível para todos, somente leitura).
insert into public.exercises (user_id, name, category, description) values
  (null, 'Supino reto com barra',      'chest', 'Deitado no banco reto, desça a barra até a linha do peito e empurre até estender os braços.'),
  (null, 'Supino inclinado com halteres', 'chest', 'Banco a 30–45°. Desça os halteres ao lado do peito e empurre para cima, aproximando-os no topo.'),
  (null, 'Crucifixo com halteres',     'chest', 'Braços levemente flexionados, abra até sentir o alongamento do peito e feche em arco.'),
  (null, 'Crossover',                  'chest', 'Na polia alta, puxe as alças para baixo e à frente até as mãos se encontrarem.'),
  (null, 'Flexão de braço',            'chest', 'Corpo alinhado, desça o peito até perto do chão e empurre de volta.'),

  (null, 'Puxada frontal',             'back', 'Na polia alta, puxe a barra até a parte de cima do peito, levando os cotovelos para baixo.'),
  (null, 'Barra fixa',                 'back', 'Pendurado na barra, suba até o queixo passar da barra e desça controlando.'),
  (null, 'Remada curvada com barra',   'back', 'Tronco inclinado à frente, costas retas, puxe a barra em direção ao umbigo.'),
  (null, 'Remada baixa',               'back', 'Sentado na polia baixa, puxe o triângulo até o abdômen mantendo o peito aberto.'),
  (null, 'Remada unilateral',          'back', 'Apoiado no banco, puxe o halter ao lado do quadril, um braço por vez.'),
  (null, 'Levantamento terra',         'back', 'Barra no chão, costas neutras, estenda quadril e joelhos até ficar em pé.'),

  (null, 'Desenvolvimento com halteres', 'shoulders', 'Sentado, empurre os halteres da altura das orelhas até acima da cabeça.'),
  (null, 'Elevação lateral',           'shoulders', 'Eleve os halteres pelas laterais até a altura dos ombros, cotovelos levemente flexionados.'),
  (null, 'Elevação frontal',           'shoulders', 'Eleve o halter à frente do corpo até a altura dos ombros.'),
  (null, 'Crucifixo invertido',        'shoulders', 'Tronco inclinado, abra os braços para os lados trabalhando a parte de trás do ombro.'),

  (null, 'Rosca direta com barra',     'arms', 'Cotovelos junto ao corpo, flexione os braços levando a barra até os ombros.'),
  (null, 'Rosca martelo',              'arms', 'Pegada neutra (palmas para dentro), flexione os braços alternadamente.'),
  (null, 'Tríceps na polia (corda)',   'arms', 'Cotovelos fixos ao lado do corpo, estenda os braços abrindo a corda no final.'),
  (null, 'Tríceps testa',              'arms', 'Deitado, desça a barra em direção à testa flexionando só os cotovelos e estenda.'),
  (null, 'Mergulho no banco',          'arms', 'Mãos no banco atrás do corpo, desça flexionando os cotovelos e suba.'),

  (null, 'Agachamento livre',          'legs', 'Barra nas costas, desça o quadril até as coxas ficarem paralelas ao chão e suba.'),
  (null, 'Leg press 45°',              'legs', 'Empurre a plataforma estendendo as pernas sem travar os joelhos.'),
  (null, 'Cadeira extensora',          'legs', 'Sentado, estenda os joelhos elevando o apoio até as pernas ficarem retas.'),
  (null, 'Mesa flexora',               'legs', 'Deitado de bruços, flexione os joelhos trazendo o apoio em direção aos glúteos.'),
  (null, 'Stiff',                      'legs', 'Pernas quase estendidas, desça a barra rente às pernas inclinando o tronco e volte.'),
  (null, 'Afundo',                     'legs', 'Dê um passo à frente e desça até os dois joelhos formarem cerca de 90°.'),
  (null, 'Panturrilha em pé',          'legs', 'Na ponta dos pés, suba o máximo possível e desça alongando.'),

  (null, 'Elevação pélvica',           'glutes', 'Costas apoiadas no banco, barra no quadril, eleve o quadril contraindo os glúteos.'),
  (null, 'Cadeira abdutora',           'glutes', 'Sentado, afaste as pernas contra a resistência da máquina.'),
  (null, 'Glúteo na polia',            'glutes', 'Com a tornozeleira na polia baixa, leve a perna para trás estendendo o quadril.'),
  (null, 'Agachamento búlgaro',        'glutes', 'Pé de trás apoiado no banco, desça com a perna da frente e suba.'),

  (null, 'Prancha',                    'abs', 'Apoiado nos antebraços e pontas dos pés, mantenha o corpo alinhado pelo tempo definido.'),
  (null, 'Abdominal supra',            'abs', 'Deitado, joelhos flexionados, eleve o tronco contraindo o abdômen.'),
  (null, 'Abdominal infra',            'abs', 'Deitado, eleve as pernas em direção ao peito sem balançar.'),
  (null, 'Abdominal na polia',         'abs', 'Ajoelhado de frente para a polia alta, flexione o tronco puxando a corda.'),

  (null, 'Esteira',                    'cardio', 'Caminhada ou corrida na esteira.'),
  (null, 'Bicicleta ergométrica',      'cardio', 'Pedalada em ritmo constante ou em intervalos.'),
  (null, 'Elíptico',                   'cardio', 'Movimento contínuo de braços e pernas com baixo impacto.'),
  (null, 'Pular corda',                'cardio', 'Saltos contínuos com a corda.');

-- ============================================================
-- 20260930000003_grants.sql
-- ============================================================
-- Permissões explícitas da Data API.
-- Projetos Supabase novos podem não expor automaticamente as tabelas do schema public;
-- sem estes GRANTs o app recebe "permission denied" mesmo com RLS correta.
-- A RLS continua sendo quem decide quais linhas cada usuário vê.

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant all on tables to service_role;

-- ============================================================
-- 20261001000001_taco_e_busca.sql
-- ============================================================
-- Catálogo brasileiro (TACO) e busca sem acento.
-- Fonte: Tabela Brasileira de Composição de Alimentos (TACO), 4ª edição revisada e ampliada,
-- NEPA/UNICAMP, 2011. Valores por 100 g de parte comestível. Reprodução permitida citando a fonte.
-- Dados extraídos por https://github.com/IgorFZ/taco-br (MIT).

create extension if not exists unaccent;

-- unaccent não é IMMUTABLE; este invólucro permite usá-lo em índices.
create or replace function public.f_unaccent(text) returns text
language sql immutable parallel safe strict
as $$ select public.unaccent('public.unaccent', $1) $$;

create index if not exists foods_search_trgm on public.foods
  using gin (lower(public.f_unaccent(name || ' ' || coalesce(brand, ''))) gin_trgm_ops);

-- Busca por todas as palavras, sem acento nem maiúsculas. Roda como o usuário (RLS vale):
-- vê o catálogo e os próprios alimentos. Ordena: meus primeiro, nome começando pelo termo, mais curtos.
create or replace function public.search_foods(q text, lim int default 30)
returns setof public.foods
language sql stable security invoker set search_path = public, extensions
as $$
  with t as (
    select lower(public.f_unaccent(trim(q))) as term,
           array(select w from unnest(string_to_array(lower(public.f_unaccent(trim(q))), ' ')) w where w <> '') as words
  )
  select f.*
  from public.foods f, t
  where cardinality(t.words) > 0
    and not exists (
      select 1 from unnest(t.words) w
      where lower(public.f_unaccent(f.name || ' ' || coalesce(f.brand, ''))) not like '%' || replace(replace(w, '%', ''), '_', '') || '%'
    )
  order by
    (f.user_id is not null) desc,
    (lower(public.f_unaccent(f.name)) like t.term || '%') desc,
    (f.source = 'taco') desc,
    char_length(f.name),
    f.name
  limit least(greatest(lim, 1), 60)
$$;
grant execute on function public.search_foods(text, int) to authenticated;

insert into public.foods (user_id, source, external_id, name, kcal_100g, protein_100g, carbs_100g, fat_100g, fiber_100g, sodium_mg_100g)
select null, 'taco', v.id, v.name, v.kcal, v.p, v.c, v.f, v.fi, v.na
from (values
('1', 'Arroz, integral, cozido', 124, 2.6, 25.8, 1, 2.7, 1),
('2', 'Arroz, integral, cru', 360, 7.3, 77.5, 1.9, 4.8, 2),
('3', 'Arroz, tipo 1, cozido', 128, 2.5, 28.1, 0.2, 1.6, 1),
('4', 'Arroz, tipo 1, cru', 358, 7.2, 78.8, 0.3, 1.6, 1),
('5', 'Arroz, tipo 2, cozido', 130, 2.6, 28.2, 0.4, 1.1, 2),
('6', 'Arroz, tipo 2, cru', 358, 7.2, 78.9, 0.3, 1.7, 1),
('7', 'Aveia, flocos, crua', 394, 13.9, 66.6, 8.5, 9.1, 5),
('8', 'Biscoito, doce, maisena', 443, 8.1, 75.2, 12, 2.1, 352),
('9', 'Biscoito, doce, recheado com chocolate', 472, 6.4, 70.5, 19.6, 3, 239),
('10', 'Biscoito, doce, recheado com morango', 471, 5.7, 71, 19.6, 1.5, 230),
('11', 'Biscoito, doce, wafer, recheado de chocolate', 502, 5.6, 67.5, 24.7, 1.8, 137),
('12', 'Biscoito, doce, wafer, recheado de morango', 513, 4.5, 67.4, 26.4, 0.8, 120),
('13', 'Biscoito, salgado, cream cracker', 432, 10.1, 68.7, 14.4, 2.5, 854),
('14', 'Bolo, mistura para', 419, 6.2, 84.7, 6.1, 1.7, 463),
('15', 'Bolo, pronto, aipim', 324, 4.4, 47.9, 12.7, 0.7, 111),
('16', 'Bolo, pronto, chocolate', 410, 6.2, 54.7, 18.5, 1.4, 283),
('17', 'Bolo, pronto, coco', 333, 5.7, 52.3, 11.3, 1.1, 190),
('18', 'Bolo, pronto, milho', 311, 4.8, 45.1, 12.4, 0.7, 134),
('19', 'Canjica, branca, crua', 358, 7.2, 78.1, 1, 5.5, 1),
('20', 'Canjica, com leite integral', 112, 2.4, 23.6, 1.2, 1.2, 28),
('21', 'Cereais, milho, flocos, com sal', 370, 7.3, 80.8, 1.6, 5.3, 272),
('22', 'Cereais, milho, flocos, sem sal', 363, 6.9, 80.4, 1.2, 1.8, 31),
('23', 'Cereais, mingau, milho, infantil', 394, 6.4, 87.3, 1.1, 3.2, 399),
('24', 'Cereais, mistura para vitamina, trigo, cevada e aveia', 381, 8.9, 81.6, 2.1, 5, 1163),
('25', 'Cereal matinal, milho', 365, 7.2, 83.8, 1, 4.1, 655),
('26', 'Cereal matinal, milho, açúcar', 377, 4.7, 88.8, 0.7, 2.1, 405),
('27', 'Creme de arroz, pó', 386, 7, 83.9, 1.2, 1.1, 1),
('28', 'Creme de milho, pó', 333, 4.8, 86.1, 1.6, 3.7, 594),
('29', 'Curau, milho verde', 78, 2.4, 13.9, 1.6, 0.5, 21),
('30', 'Curau, milho verde, mistura para', 402, 2.2, 79.8, 13.4, 2.5, 223),
('31', 'Farinha, de arroz, enriquecida', 363, 1.3, 85.5, 0.3, 0.6, 17),
('32', 'Farinha, de centeio, integral', 336, 12.5, 73.3, 1.8, 15.5, 41),
('33', 'Farinha, de milho, amarela', 351, 7.2, 79.1, 1.5, 5.5, 45),
('34', 'Farinha, de rosca', 371, 11.4, 75.8, 1.5, 4.8, 333),
('35', 'Farinha, de trigo', 360, 9.8, 75.1, 1.4, 2.3, 1),
('36', 'Farinha, láctea, de cereais', 415, 11.9, 77.8, 5.8, 1.9, 125),
('37', 'Lasanha, massa fresca, cozida', 164, 5.8, 32.5, 1.2, 1.6, 207),
('38', 'Lasanha, massa fresca, crua', 220, 7, 45.1, 1.3, 1.6, 667),
('39', 'Macarrão, instantâneo', 436, 8.8, 62.4, 17.2, 5.6, 1516),
('40', 'Macarrão, trigo, cru', 371, 10, 77.9, 1.3, 2.9, 7),
('41', 'Macarrão, trigo, cru, com ovos', 371, 10.3, 76.6, 2, 2.3, 15),
('42', 'Milho, amido, cru', 361, 0.6, 87.1, 0, 0.7, 8),
('43', 'Milho, fubá, cru', 353, 7.2, 78.9, 1.9, 4.7, null),
('44', 'Milho, verde, cru', 138, 6.6, 28.6, 0.6, 3.9, 1),
('45', 'Milho, verde, enlatado, drenado', 98, 3.2, 17.1, 2.4, 4.6, 260),
('46', 'Mingau tradicional, pó', 373, 0.6, 89.3, 0.4, 0.9, 15),
('47', 'Pamonha, barra para cozimento, pré-cozida', 171, 2.6, 30.7, 4.8, 2.4, 132),
('48', 'Pão, aveia, forma', 343, 12.4, 59.6, 5.7, 6, 606),
('49', 'Pão, de soja', 309, 11.3, 56.5, 3.6, 5.7, 663),
('50', 'Pão, glúten, forma', 253, 12, 44.1, 2.7, 2.5, 22),
('51', 'Pão, milho, forma', 292, 8.3, 56.4, 3.1, 4.3, 507),
('52', 'Pão, trigo, forma, integral', 253, 9.4, 49.9, 3.7, 6.9, 506),
('53', 'Pão, trigo, francês', 300, 8, 58.6, 3.1, 2.3, 648),
('54', 'Pão, trigo, sovado', 311, 8.4, 61.5, 2.8, 2.4, 431),
('55', 'Pastel, de carne, cru', 289, 10.7, 42, 8.8, 1, 1309),
('56', 'Pastel, de carne, frito', 388, 10.1, 43.8, 20.1, 1, 1040),
('57', 'Pastel, de queijo, cru', 308, 9.9, 45.9, 9.6, 1.1, 985),
('58', 'Pastel, de queijo, frito', 422, 8.7, 48.1, 22.7, 0.9, 821),
('59', 'Pastel, massa, crua', 310, 6.9, 57.4, 5.5, 1.4, 1344),
('60', 'Pastel, massa, frita', 570, 6, 49.3, 40.9, 1.3, 1175),
('61', 'Pipoca, com óleo de soja, sem sal', 448, 9.9, 70.3, 15.9, 14.3, 4),
('62', 'Polenta, pré-cozida', 103, 2.3, 23.3, 0.3, 2.4, 442),
('63', 'Torrada, pão francês', 377, 10.5, 74.6, 3.3, 3.4, 829),
('64', 'Abóbora, cabotian, cozida', 48, 1.4, 10.8, 0.7, 2.5, 1),
('65', 'Abóbora, cabotian, crua', 39, 1.7, 8.4, 0.5, 2.2, null),
('66', 'Abóbora, menina brasileira, crua', 14, 0.6, 3.3, 0, 1.2, null),
('67', 'Abóbora, moranga, crua', 12, 1, 2.7, 0.1, 1.7, null),
('68', 'Abóbora, moranga, refogada', 29, 0.4, 6, 0.8, 1.5, 3),
('69', 'Abobora, pescoço, crua', 24, 0.7, 6.1, 0.1, 2.3, 1),
('70', 'Abobrinha, italiana, cozida', 15, 1.1, 3, 0.2, 1.6, 1),
('71', 'Abobrinha, italiana, crua', 19, 1.1, 4.3, 0.1, 1.4, null),
('72', 'Abobrinha, italiana, refogada', 24, 1.1, 4.2, 0.8, 1.4, 2),
('73', 'Abobrinha, paulista, crua', 31, 0.6, 7.9, 0.1, 2.6, 1),
('74', 'Acelga, crua', 21, 1.4, 4.6, 0.1, 1.1, 1),
('75', 'Agrião, cru', 17, 2.7, 2.3, 0.2, 2.1, 7),
('76', 'Aipo, cru', 19, 0.8, 4.3, 0.1, 1, 10),
('77', 'Alface, americana, crua', 9, 0.6, 1.7, 0.1, 1, 7),
('78', 'Alface, crespa, crua', 11, 1.3, 1.7, 0.2, 1.8, 3),
('79', 'Alface, lisa, crua', 14, 1.7, 2.4, 0.1, 2.3, 4),
('80', 'Alface, roxa, crua', 13, 0.9, 2.5, 0.2, 2, 7),
('81', 'Alfavaca, crua', 29, 2.7, 5.2, 0.5, 4.1, 5),
('82', 'Alho, cru', 113, 7, 23.9, 0.2, 4.3, 5),
('83', 'Alho-poró, cru', 32, 1.4, 6.9, 0.1, 2.5, 2),
('84', 'Almeirão, cru', 18, 1.8, 3.3, 0.2, 2.6, 2),
('85', 'Almeirão, refogado', 65, 1.7, 5.7, 4.8, 3.4, 15),
('86', 'Batata, baroa, cozida', 80, 0.9, 18.9, 0.2, 1.8, 2),
('87', 'Batata, baroa, crua', 101, 1, 24, 0.2, 2.1, null),
('88', 'Batata, doce, cozida', 77, 0.6, 18.4, 0.1, 2.2, 3),
('89', 'Batata, doce, crua', 118, 1.3, 28.2, 0.1, 2.6, 9),
('90', 'Batata, frita, tipo chips, industrializada', 543, 5.6, 51.2, 36.6, 2.5, 607),
('91', 'Batata, inglesa, cozida', 52, 1.2, 11.9, 0, 1.3, 2),
('92', 'Batata, inglesa, crua', 64, 1.8, 14.7, 0, 1.2, null),
('93', 'Batata, inglesa, frita', 267, 5, 35.6, 13.1, 8.1, 2),
('94', 'Batata, inglesa, sauté', 68, 1.3, 14.1, 0.9, 1.4, 8),
('95', 'Berinjela, cozida', 19, 0.7, 4.5, 0.1, 2.5, 1),
('96', 'Berinjela, crua', 20, 1.2, 4.4, 0.1, 2.9, null),
('97', 'Beterraba, cozida', 32, 1.3, 7.2, 0.1, 1.9, 23),
('98', 'Beterraba, crua', 49, 1.9, 11.1, 0.1, 3.4, 10),
('99', 'Biscoito, polvilho doce', 438, 1.3, 80.5, 12.2, 1.2, 98),
('100', 'Brócolis, cozido', 25, 2.1, 4.4, 0.5, 3.4, 2),
('101', 'Brócolis, cru', 25, 3.6, 4, 0.3, 2.9, 3),
('102', 'Cará, cozido', 78, 1.5, 18.9, 0.1, 2.6, 1),
('103', 'Cará, cru', 96, 2.3, 23, 0.1, 7.3, null),
('104', 'Caruru, cru', 34, 3.2, 6, 0.6, 4.5, 14),
('105', 'Catalonha, crua', 24, 1.9, 4.8, 0.3, 2, 9),
('106', 'Catalonha, refogada', 63, 2, 4.8, 4.8, 3.7, 25),
('107', 'Cebola, crua', 39, 1.7, 8.9, 0.1, 2.2, 1),
('108', 'Cebolinha, crua', 20, 1.9, 3.4, 0.4, 3.6, 2),
('109', 'Cenoura, cozida', 30, 0.8, 6.7, 0.2, 2.6, 8),
('110', 'Cenoura, crua', 34, 1.3, 7.7, 0.2, 3.2, 3),
('111', 'Chicória, crua', 14, 1.1, 2.9, 0.1, 2.2, 14),
('112', 'Chuchu, cozido', 19, 0.4, 4.8, 0, 1, 2),
('113', 'Chuchu, cru', 17, 0.7, 4.1, 0.1, 1.3, null),
('114', 'Coentro, folhas desidratadas', 309, 20.9, 48, 10.4, 37.3, 18),
('115', 'Couve, manteiga, crua', 27, 2.9, 4.3, 0.5, 3.1, 6),
('116', 'Couve, manteiga, refogada', 90, 1.7, 8.7, 6.6, 5.7, 11),
('117', 'Couve-flor, crua', 23, 1.9, 4.5, 0.2, 2.4, 3),
('118', 'Couve-flor, cozida', 19, 1.2, 3.9, 0.3, 2.1, 2),
('119', 'Espinafre, Nova Zelândia, cru', 16, 2, 2.6, 0.2, 2.1, 17),
('120', 'Espinafre, Nova Zelândia, refogado', 67, 2.7, 4.2, 5.4, 2.5, 47),
('121', 'Farinha, de mandioca, crua', 361, 1.6, 87.9, 0.3, 6.4, 1),
('122', 'Farinha, de mandioca, torrada', 365, 1.2, 89.2, 0.3, 6.5, 10),
('123', 'Farinha, de puba', 360, 1.6, 87.3, 0.5, 4.2, 4),
('124', 'Fécula, de mandioca', 331, 0.5, 81.1, 0.3, 0.6, 2),
('125', 'Feijão, broto, cru', 39, 4.2, 7.8, 0.1, 2, 2),
('126', 'Inhame, cru', 97, 2.1, 23.2, 0.2, 1.7, null),
('127', 'Jiló, cru', 27, 1.4, 6.2, 0.2, 4.8, null),
('128', 'Jurubeba, crua', 126, 4.4, 23.1, 3.9, 23.9, 1),
('129', 'Mandioca, cozida', 125, 0.6, 30.1, 0.3, 1.6, 1),
('130', 'Mandioca, crua', 151, 1.1, 36.2, 0.3, 1.9, 2),
('131', 'Mandioca, farofa, temperada', 406, 2.1, 80.3, 9.1, 7.8, 575),
('132', 'Mandioca, frita', 300, 1.4, 50.3, 11.2, 1.9, 9),
('133', 'Manjericão, cru', 21, 2, 3.6, 0.4, 3.3, 4),
('134', 'Maxixe, cru', 14, 1.4, 2.7, 0.1, 2.2, 11),
('135', 'Mostarda, folha, crua', 18, 2.1, 3.2, 0.2, 1.9, 3),
('136', 'Nhoque, batata, cozido', 181, 5.9, 36.8, 1.9, 1.8, 7),
('137', 'Nabo, cru', 18, 1.2, 4.1, 0.1, 2.6, 2),
('138', 'Palmito, juçara, em conserva', 23, 1.8, 4.3, 0.4, 3.2, 514),
('139', 'Palmito, pupunha, em conserva', 29, 2.5, 5.5, 0.5, 2.6, 563),
('140', 'Pão, de queijo, assado', 363, 5.1, 34.2, 24.6, 0.6, 773),
('141', 'Pão, de queijo, cru', 295, 3.6, 38.5, 14, 1, 405),
('142', 'Pepino, cru', 10, 0.9, 2, 0, 1.1, null),
('143', 'Pimentão, amarelo, cru', 28, 1.2, 6, 0.4, 1.9, null),
('144', 'Pimentão, verde, cru', 21, 1.1, 4.9, 0.2, 2.6, null),
('145', 'Pimentão, vermelho, cru', 23, 1, 5.5, 0.1, 1.6, null),
('146', 'Polvilho, doce', 351, 0.4, 86.8, 0, 0.2, 2),
('147', 'Quiabo, cru', 30, 1.9, 6.4, 0.3, 4.6, 1),
('148', 'Rabanete, cru', 14, 1.4, 2.7, 0.1, 2.2, 11),
('149', 'Repolho, branco, cru', 17, 0.9, 3.9, 0.1, 1.9, 4),
('150', 'Repolho, roxo, cru', 31, 1.9, 7.2, 0.1, 2, 2),
('151', 'Repolho, roxo, refogado', 42, 1.8, 7.6, 1.2, 1.8, 3),
('152', 'Rúcula, crua', 13, 1.8, 2.2, 0.1, 1.7, 9),
('153', 'Salsa, crua', 33, 3.3, 5.7, 0.6, 1.9, 2),
('154', 'Seleta de legumes, enlatada', 57, 3.4, 12.7, 0.4, 3.1, 398),
('155', 'Serralha, crua', 30, 2.7, 4.9, 0.7, 3.5, 19),
('156', 'Taioba, crua', 34, 2.9, 5.4, 0.9, 4.5, 1),
('157', 'Tomate, com semente, cru', 15, 1.1, 3.1, 0.2, 1.2, 1),
('158', 'Tomate, extrato', 61, 2.4, 15, 0.2, 2.8, 498),
('159', 'Tomate, molho industrializado', 38, 1.4, 7.7, 0.9, 3.1, 418),
('160', 'Tomate, purê', 28, 1.4, 6.9, 0, 1, 104),
('161', 'Tomate, salada', 21, 0.8, 5.1, 0, 2.3, 5),
('162', 'Vagem, crua', 25, 1.8, 5.3, 0.2, 2.4, null),
('163', 'Abacate, cru', 96, 1.2, 6, 8.4, 6.3, null),
('164', 'Abacaxi, cru', 48, 0.9, 12.3, 0.1, 1, null),
('165', 'Abacaxi, polpa, congelada', 31, 0.5, 7.8, 0.1, 0.3, 1),
('166', 'Abiu, cru', 62, 0.8, 14.9, 0.7, 1.7, null),
('167', 'Açaí, polpa, com xarope de guaraná e glucose', 110, 0.7, 21.5, 3.7, 1.7, 15),
('168', 'Açaí, polpa, congelada', 58, 0.8, 6.2, 3.9, 2.6, 5),
('169', 'Acerola, crua', 33, 0.9, 8, 0.2, 1.5, null),
('170', 'Acerola, polpa, congelada', 22, 0.6, 5.5, 0, 0.7, 1),
('171', 'Ameixa, calda, enlatada', 183, 0.4, 46.9, 0, 0.5, 3),
('172', 'Ameixa, crua', 53, 0.8, 13.9, 0, 2.4, null),
('173', 'Ameixa, em calda, enlatada, drenada', 177, 1, 47.7, 0.3, 4.5, 3),
('174', 'Atemóia, crua', 97, 1, 25.3, 0.3, 2.1, 1),
('175', 'Banana, da terra, crua', 128, 1.4, 33.7, 0.2, 1.5, null),
('176', 'Banana, doce em barra', 280, 2.2, 75.7, 0.1, 3.8, 10),
('177', 'Banana, figo, crua', 105, 1.1, 27.8, 0.1, 2.8, null),
('178', 'Banana, maçã, crua', 87, 1.8, 22.3, 0.1, 2.6, null),
('179', 'Banana, nanica, crua', 92, 1.4, 23.8, 0.1, 1.9, null),
('180', 'Banana, ouro, crua', 112, 1.5, 29.3, 0.2, 2, null),
('181', 'Banana, pacova, crua', 78, 1.2, 20.3, 0.1, 2, 1),
('182', 'Banana, prata, crua', 98, 1.3, 26, 0.1, 2, null),
('183', 'Cacau, cru', 74, 1, 19.4, 0.1, 2.2, 1),
('184', 'Cajá-Manga, cru', 46, 1.3, 11.4, 0, 2.6, 1),
('185', 'Cajá, polpa, congelada', 26, 0.6, 6.4, 0.2, 1.4, 7),
('186', 'Caju, cru', 43, 1, 10.3, 0.3, 1.7, 3),
('187', 'Caju, polpa, congelada', 37, 0.5, 9.4, 0.2, 0.8, 4),
('188', 'Caju, suco concentrado, envasado', 45, 0.4, 10.7, 0.2, 0.6, 45),
('189', 'Caqui, chocolate, cru', 71, 0.4, 19.3, 0.1, 6.5, 2),
('190', 'Carambola, crua', 46, 0.9, 11.5, 0.2, 2, 4),
('191', 'Ciriguela, crua', 76, 1.4, 18.9, 0.4, 3.9, 2),
('192', 'Cupuaçu, cru', 49, 1.2, 10.4, 1, 3.1, 3),
('193', 'Cupuaçu, polpa, congelada', 49, 0.8, 11.4, 0.6, 1.6, 1),
('194', 'Figo, cru', 41, 1, 10.2, 0.2, 1.8, null),
('195', 'Figo, enlatado, em calda', 184, 0.6, 50.3, 0.2, 2, 7),
('196', 'Fruta-pão, crua', 67, 1.1, 17.2, 0.2, 5.5, 1),
('197', 'Goiaba, branca, com casca, crua', 52, 0.9, 12.4, 0.5, 6.3, null),
('198', 'Goiaba, doce em pasta', 269, 0.6, 74.1, 0, 3.7, 4),
('199', 'Goiaba, doce, cascão', 286, 0.4, 78.7, 0.1, 4.4, 11),
('200', 'Goiaba, vermelha, com casca, crua', 54, 1.1, 13, 0.4, 6.2, null),
('201', 'Graviola, crua', 62, 0.8, 15.8, 0.2, 1.9, 4),
('202', 'Graviola, polpa, congelada', 38, 0.6, 9.8, 0.1, 1.2, 3),
('203', 'Jabuticaba, crua', 58, 0.6, 15.3, 0.1, 2.3, null),
('204', 'Jaca, crua', 88, 1.4, 22.5, 0.3, 2.4, 2),
('205', 'Jambo, cru', 27, 0.9, 6.5, 0.1, 5.1, 22),
('206', 'Jamelão, cru', 41, 0.5, 10.6, 0.1, 1.8, 1),
('207', 'Kiwi, cru', 51, 1.3, 11.5, 0.6, 2.7, null),
('208', 'Laranja, baía, crua', 45, 1, 11.5, 0.1, 1.1, null),
('209', 'Laranja, baía, suco', 37, 0.7, 8.7, 0, null, null),
('210', 'Laranja, da terra, crua', 51, 1.1, 12.9, 0.2, 4, 1),
('211', 'Laranja, da terra, suco', 41, 0.7, 9.6, 0.1, 1, null),
('212', 'Laranja, lima, crua', 46, 1.1, 11.5, 0.1, 1.8, 1),
('213', 'Laranja, lima, suco', 39, 0.7, 9.2, 0.1, 0.4, null),
('214', 'Laranja, pêra, crua', 37, 1, 8.9, 0.1, 0.8, null),
('215', 'Laranja, pêra, suco', 33, 0.7, 7.6, 0.1, null, null),
('216', 'Laranja, valência, crua', 46, 0.8, 11.7, 0.2, 1.7, 1),
('217', 'Laranja, valência, suco', 36, 0.5, 8.6, 0.1, 0.4, null),
('218', 'Limão, cravo, suco', 14, 0.3, 5.2, 0, null, null),
('219', 'Limão, galego, suco', 22, 0.6, 7.3, 0.1, null, null),
('220', 'Limão, tahiti, cru', 32, 0.9, 11.1, 0.1, 1.2, 1),
('221', 'Maçã, Argentina, com casca, crua', 63, 0.2, 16.6, 0.2, 2, 1),
('222', 'Maçã, Fuji, com casca, crua', 56, 0.3, 15.2, 0, 1.3, null),
('223', 'Macaúba, crua', 404, 2.1, 13.9, 40.7, 13.4, 1),
('224', 'Mamão, doce em calda, drenado', 196, 0.2, 54, 0.1, 1.3, 3),
('225', 'Mamão, Formosa, cru', 45, 0.8, 11.6, 0.1, 1.8, 3),
('226', 'Mamão, Papaia, cru', 40, 0.5, 10.4, 0.1, 1, 2),
('227', 'Mamão verde, doce em calda, drenado', 209, 0.3, 57.6, 0.1, 1.2, 5),
('228', 'Manga, Haden, crua', 64, 0.4, 16.7, 0.3, 1.6, 1),
('229', 'Manga, Palmer, crua', 72, 0.4, 19.4, 0.2, 1.6, 2),
('230', 'Manga, polpa, congelada', 48, 0.4, 12.5, 0.2, 1.1, 7),
('231', 'Manga, Tommy Atkins, crua', 51, 0.9, 12.8, 0.2, 2.1, null),
('232', 'Maracujá, cru', 68, 2, 12.3, 2.1, 1.1, 2),
('233', 'Maracujá, polpa, congelada', 39, 0.8, 9.6, 0.2, 0.5, 8),
('234', 'Maracujá, suco concentrado, envasado', 42, 0.8, 9.6, 0.2, 0.4, 22),
('235', 'Melancia, crua', 33, 0.9, 8.1, 0, 0.1, null),
('236', 'Melão, cru', 29, 0.7, 7.5, 0, 0.3, 11),
('237', 'Mexerica, Murcote, crua', 58, 0.9, 14.9, 0.1, 3.1, 1),
('238', 'Mexerica, Rio, crua', 37, 0.7, 9.3, 0.1, 2.7, 2),
('239', 'Morango, cru', 30, 0.9, 6.8, 0.3, 1.7, null),
('240', 'Nêspera, crua', 43, 0.3, 11.5, 0, 3, null),
('241', 'Pequi, cru', 205, 2.3, 13, 18, 19, null),
('242', 'Pêra, Park, crua', 61, 0.2, 16.1, 0.2, 3, 1),
('243', 'Pêra, Williams, crua', 53, 0.6, 14, 0.1, 3, null),
('244', 'Pêssego, Aurora, cru', 36, 0.8, 9.3, 0, 1.4, null),
('245', 'Pêssego, enlatado, em calda', 63, 0.7, 16.9, 0, 1, 3),
('246', 'Pinha, crua', 88, 1.5, 22.4, 0.3, 3.4, 1),
('247', 'Pitanga, crua', 41, 0.9, 10.2, 0.2, 3.2, 2),
('248', 'Pitanga, polpa, congelada', 19, 0.3, 4.8, 0.1, 0.7, 5),
('249', 'Romã, crua', 56, 0.4, 15.1, 0, 0.4, 1),
('250', 'Tamarindo, cru', 276, 3.2, 72.5, 0.5, 6.4, 0),
('251', 'Tangerina, Poncã, crua', 38, 0.8, 9.6, 0.1, 0.9, null),
('252', 'Tangerina, Poncã, suco', 36, 0.5, 8.8, 0, null, null),
('253', 'Tucumã, cru', 262, 2.1, 26.5, 19.1, 12.7, 4),
('254', 'Umbu, cru', 37, 0.8, 9.4, 0, 2, null),
('255', 'Umbu, polpa, congelada', 34, 0.5, 8.8, 0.1, 1.3, 6),
('256', 'Uva, Itália, crua', 53, 0.7, 13.6, 0.2, 0.9, null),
('257', 'Uva, Rubi, crua', 49, 0.6, 12.7, 0.2, 0.9, 8),
('258', 'Uva, suco concentrado, envasado', 58, 0, 14.7, 0, 0.2, 10),
('259', 'Azeite, de dendê', 884, 0, 0, 100, null, null),
('260', 'Azeite, de oliva, extra virgem', 884, 0, 0, 100, null, null),
('261', 'Manteiga, com sal', 726, 0.4, 0.1, 82.4, null, 579),
('262', 'Manteiga, sem sal', 758, 0.4, 0, 86, null, 4),
('263', 'Margarina, com óleo hidrogenado, com sal (65% de lipídeos)', 596, 0, 0, 67.4, null, 894),
('264', 'Margarina, com óleo hidrogenado, sem sal (80% de lipídeos)', 723, 0, 0, 81.7, null, 78),
('265', 'Margarina, com óleo interesterificado, com sal (65%de lipídeos)', 594, 0, 0, 67.2, null, 561),
('266', 'Margarina, com óleo interesterificado, sem sal (65% de lipídeos)', 593, 0, 0, 67.1, null, 33),
('267', 'Óleo, de babaçu', 884, 0, 0, 100, null, null),
('268', 'Óleo, de canola', 884, 0, 0, 100, null, null),
('269', 'Óleo, de girassol', 884, 0, 0, 100, null, null),
('270', 'Óleo, de milho', 884, 0, 0, 100, null, null),
('271', 'Óleo, de pequi', 884, 0, 0, 100, null, null),
('272', 'Óleo, de soja', 884, 0, 0, 100, null, null),
('273', 'Abadejo, filé, congelado, assado', 112, 23.5, 0, 1.2, null, 334),
('274', 'Abadejo, filé, congelado,cozido', 91, 19.3, 0, 0.9, null, 189),
('275', 'Abadejo, filé, congelado, cru', 59, 13.1, 0, 0.4, null, 79),
('276', 'Abadejo, filé, congelado, grelhado', 130, 27.6, 0, 1.3, null, 305),
('277', 'Atum, conserva em óleo', 166, 26.2, 0, 6, null, 362),
('278', 'Atum, fresco, cru', 118, 25.7, 0, 0.9, null, 30),
('279', 'Bacalhau, salgado, cru', 136, 29, 0, 1.3, null, 13585),
('280', 'Bacalhau, salgado, refogado', 140, 24, 1.2, 3.6, null, 1256),
('281', 'Cação, posta, com farinha de trigo, frita', 208, 25, 3.1, 10, 0.5, 160),
('282', 'Cação, posta, cozida', 116, 25.6, 0, 0.7, null, 115),
('283', 'Cação, posta, crua', 83, 17.9, 0, 0.8, null, 176),
('284', 'Camarão, Rio Grande, grande, cozido', 90, 19, 0, 1, null, 367),
('285', 'Camarão, Rio Grande, grande, cru', 47, 10, 0, 0.5, null, 201),
('286', 'Camarão, Sete Barbas, sem cabeça, com casca, frito', 231, 18.4, 2.9, 15.6, null, 99),
('287', 'Caranguejo, cozido', 83, 18.5, 0, 0.4, null, 360),
('288', 'Corimba, cru', 128, 17.4, 0, 6, null, 47),
('289', 'Corimbatá, assado', 261, 19.9, 0, 19.6, null, 40),
('290', 'Corimbatá, cozido', 239, 20.1, 0, 16.9, null, 37),
('291', 'Corvina de água doce, crua', 101, 18.9, 0, 2.2, null, 45),
('292', 'Corvina do mar, crua', 94, 18.6, 0, 1.6, null, 68),
('293', 'Corvina grande, assada', 147, 26.8, 0, 3.6, null, 85),
('294', 'Corvina grande, cozida', 100, 23.4, 0, 2.6, null, 68),
('295', 'Dourada de água doce, fresca', 131, 18.8, 0, 5.6, null, 40),
('296', 'Lambari, congelado, cru', 131, 16.8, 0, 6.5, null, 48),
('297', 'Lambari, congelado, frito', 327, 28.4, 0, 22.8, null, 65),
('298', 'Lambari, fresco, cru', 152, 15.7, 0, 9.4, null, 41),
('299', 'Manjuba, com farinha de trigo, frita', 344, 23.5, 10.2, 22.6, 0.4, 37),
('300', 'Manjuba, frita', 349, 30.1, 0, 24.5, null, 41),
('301', 'Merluza, filé, assado', 122, 26.6, 0, 0.9, null, 120),
('302', 'Merluza, filé, cru', 89, 16.6, 0, 2, null, 80),
('303', 'Merluza, filé, frito', 192, 26.9, 0, 8.5, null, 90),
('304', 'Pescada, branca, crua', 111, 16.3, 0, 4.6, null, 76),
('305', 'Pescada, branca, frita', 223, 27.4, 0, 11.8, null, 107),
('306', 'Pescada, filé, com farinha de trigo, frito', 283, 21.4, 5, 19.1, null, 91),
('307', 'Pescada, filé, cru', 107, 16.7, 0, 4, null, 77),
('308', 'Pescada, filé, frito', 154, 28.6, 0, 3.6, null, 115),
('309', 'Pescada, filé, molho escabeche', 142, 11.8, 5, 8, 0.8, 51),
('310', 'Pescadinha, crua', 76, 15.5, 0, 1.1, null, 120),
('311', 'Pintado, assado', 192, 36.5, 0, 4, null, 81),
('312', 'Pintado, cru', 91, 18.6, 0, 1.3, null, 43),
('313', 'Pintado, grelhado', 152, 30.8, 0, 2.3, null, 53),
('314', 'Porquinho, cru', 93, 20.5, 0, 0.6, null, 67),
('315', 'Salmão, filé, com pele, fresco, grelhado', 229, 23.9, 0, 14, null, 85),
('316', 'Salmão, sem pele, fresco, cru', 170, 19.3, 0, 9.7, null, 64),
('317', 'Salmão, sem pele, fresco, grelhado', 243, 26.1, 0, 14.5, null, 96),
('318', 'Sardinha, assada', 164, 32.2, 0, 3, null, 74),
('319', 'Sardinha, conserva em óleo', 285, 15.9, 0, 24, null, 666),
('320', 'Sardinha, frita', 257, 33.4, 0, 12.7, null, 60),
('321', 'Sardinha, inteira, crua', 114, 21.1, 0, 2.7, null, 60),
('322', 'Tucunaré, filé, congelado, cru', 88, 18, 0, 1.2, null, 57),
('323', 'Apresuntado', 129, 13.5, 2.9, 6.7, null, 943),
('324', 'Caldo de carne, tablete', 241, 7.8, 15.1, 16.6, 0.6, 22180),
('325', 'Caldo de galinha, tablete', 251, 6.3, 10.6, 20.4, 11.8, 22300),
('326', 'Carne, bovina, acém, moído, cozido', 212, 26.7, 0, 10.9, null, 52),
('327', 'Carne, bovina, acém, moído, cru', 137, 19.4, 0, 5.9, null, 49),
('328', 'Carne, bovina, acém, sem gordura, cozido', 215, 27.3, 0, 10.9, null, 56),
('329', 'Carne, bovina, acém, sem gordura, cru', 144, 20.8, 0, 6.1, null, 50),
('330', 'Carne, bovina, almôndegas, cruas', 189, 12.3, 9.8, 11.2, null, 621),
('331', 'Carne, bovina, almôndegas, fritas', 272, 18.2, 14.3, 15.8, null, 1030),
('332', 'Carne, bovina, bucho, cozido', 133, 21.6, 0, 4.5, null, 38),
('333', 'Carne, bovina, bucho, cru', 137, 20.5, 0, 5.5, null, 45),
('334', 'Carne, bovina, capa de contra-filé, com gordura, crua', 217, 19.2, 0, 15, null, 58),
('335', 'Carne, bovina, capa de contra-filé, com gordura, grelhada', 312, 30.7, 0, 20, null, 81),
('336', 'Carne, bovina, capa de contra-filé, sem gordura, crua', 131, 21.5, 0, 4.3, null, 79),
('337', 'Carne, bovina, capa de contra-filé, sem gordura, grelhada', 239, 35.1, 0, 10, null, 83),
('338', 'Carne, bovina, charque, cozido', 263, 36.4, 0, 11.9, null, 1443),
('339', 'Carne, bovina, charque, cru', 249, 22.7, 0, 16.8, null, 5875),
('340', 'Carne, bovina, contra-filé, à milanesa', 352, 20.6, 12.2, 24, 0.4, 77),
('341', 'Carne, bovina, contra-filé de costela, cru', 202, 19.8, 0, 13.1, null, 39),
('342', 'Carne, bovina, contra-filé de costela, grelhado', 275, 29.9, 0, 16.3, null, 51),
('343', 'Carne, bovina, contra-filé, com gordura, cru', 206, 21.2, 0, 12.8, null, 44),
('344', 'Carne, bovina, contra-filé, com gordura, grelhado', 278, 32.4, 0, 15.5, null, 57),
('345', 'Carne, bovina, contra-filé, sem gordura, cru', 157, 24, 0, 6, null, 53),
('346', 'Carne, bovina, contra-filé, sem gordura, grelhado', 194, 35.9, 0, 4.5, null, 58),
('347', 'Carne, bovina, costela, assada', 373, 28.8, 0, 27.7, null, 92),
('348', 'Carne, bovina, costela, crua', 358, 16.7, 0, 31.8, null, 70),
('349', 'Carne, bovina, coxão duro, sem gordura, cozido', 217, 31.9, 0, 8.9, null, 41),
('350', 'Carne, bovina, coxão duro, sem gordura, cru', 148, 21.5, 0, 6.2, null, 49),
('351', 'Carne, bovina, coxão mole, sem gordura, cozido', 219, 32.4, 0, 8.9, null, 44),
('352', 'Carne, bovina, coxão mole, sem gordura, cru', 169, 21.2, 0, 8.7, null, 61),
('353', 'Carne, bovina, cupim, assado', 330, 28.6, 0, 23, null, 72),
('354', 'Carne, bovina, cupim, cru', 221, 19.5, 0, 15.3, null, 47),
('355', 'Carne, bovina, fígado, cru', 141, 20.7, 1.1, 5.4, null, 76),
('356', 'Carne, bovina, fígado, grelhado', 225, 29.9, 4.2, 9, null, 82),
('357', 'Carne, bovina, filé mingnon, sem gordura, cru', 143, 21.6, 0, 5.6, null, 49),
('358', 'Carne, bovina, filé mingnon, sem gordura, grelhado', 220, 32.8, 0, 8.8, null, 58),
('359', 'Carne, bovina, flanco, sem gordura, cozido', 196, 29.4, 0, 7.8, null, 42),
('360', 'Carne, bovina, flanco, sem gordura, cru', 141, 20, 0, 6.2, null, 54),
('361', 'Carne, bovina, fraldinha, com gordura, cozida', 338, 24.2, 0, 26, null, 39),
('362', 'Carne, bovina, fraldinha, com gordura, crua', 221, 17.6, 0, 16.1, null, 51),
('363', 'Carne, bovina, lagarto, cozido', 222, 32.9, 0, 9.1, null, 48),
('364', 'Carne, bovina, lagarto, cru', 135, 20.5, 0, 5.2, null, 54),
('365', 'Carne, bovina, língua, cozida', 315, 21.4, 0, 24.8, null, 59),
('366', 'Carne, bovina, língua, crua', 215, 17.1, 0, 15.8, null, 73),
('367', 'Carne, bovina, maminha, crua', 153, 20.9, 0, 7, null, 37),
('368', 'Carne, bovina, maminha, grelhada', 153, 30.7, 0, 2.4, null, 58),
('369', 'Carne, bovina, miolo de alcatra, sem gordura, cru', 163, 21.6, 0, 7.8, null, 43),
('370', 'Carne, bovina, miolo de alcatra, sem gordura, grelhado', 241, 31.9, 0, 11.6, null, 52),
('371', 'Carne, bovina, músculo, sem gordura, cozido', 194, 31.2, 0, 6.7, null, 62),
('372', 'Carne, bovina, músculo, sem gordura, cru', 142, 21.6, 0, 5.5, null, 66),
('373', 'Carne, bovina, paleta, com gordura, crua', 159, 21.4, 0, 7.5, null, 65),
('374', 'Carne, bovina, paleta, sem gordura, cozida', 194, 29.7, 0, 7.4, null, 58),
('375', 'Carne, bovina, paleta, sem gordura, crua', 141, 21, 0, 5.7, null, 66),
('376', 'Carne, bovina, patinho, sem gordura, cru', 133, 21.7, 0, 4.5, null, 49),
('377', 'Carne, bovina, patinho, sem gordura, grelhado', 219, 35.9, 0, 7.3, null, 60),
('378', 'Carne, bovina, peito, sem gordura, cozido', 338, 22.2, 0, 27, null, 56),
('379', 'Carne, bovina, peito, sem gordura, cru', 259, 17.6, 0, 20.4, null, 64),
('380', 'Carne, bovina, picanha, com gordura, crua', 213, 18.8, 0, 14.7, null, 38),
('381', 'Carne, bovina, picanha, com gordura, grelhada', 289, 26.4, 0, 19.5, null, 60),
('382', 'Carne, bovina, picanha, sem gordura, crua', 134, 21.3, 0, 4.7, null, 61),
('383', 'Carne, bovina, picanha, sem gordura, grelhada', 238, 31.9, 0, 11.3, null, 61),
('384', 'Carne, bovina, seca, cozida', 313, 26.9, 0, 21.9, null, 1943),
('385', 'Carne, bovina, seca, crua', 313, 19.7, 0, 25.4, null, 4440),
('386', 'Coxinha de frango, frita', 283, 9.6, 34.5, 11.8, 5, 532),
('387', 'Croquete, de carne, cru', 246, 12, 13.9, 15.6, null, 711),
('388', 'Croquete, de carne, frito', 347, 16.9, 18.1, 22.7, null, 916),
('389', 'Empada de frango, pré-cozida, assada', 358, 6.9, 47.5, 15.6, 2.2, 525),
('390', 'Empada, de frango, pré-cozida', 377, 7.3, 35.5, 22.9, 2.2, 771),
('391', 'Frango, asa, com pele, crua', 213, 18.1, 0, 15.1, null, 96),
('392', 'Frango, caipira, inteiro, com pele, cozido', 243, 23.9, 0, 15.6, null, 56),
('393', 'Frango, caipira, inteiro, sem pele, cozido', 196, 29.6, 0, 7.7, null, 53),
('394', 'Frango, coração, cru', 222, 12.6, 0, 18.6, null, 95),
('395', 'Frango, coração, grelhado', 207, 22.4, 0.6, 12.1, null, 128),
('396', 'Frango, coxa, com pele, assada', 215, 28.5, 0.1, 10.4, null, 95),
('397', 'Frango, coxa, com pele, crua', 161, 17.1, 0, 9.8, null, 95),
('398', 'Frango, coxa, sem pele, cozida', 167, 26.9, 0, 5.8, null, 64),
('399', 'Frango, coxa, sem pele, crua', 120, 17.8, 0, 4.9, null, 98),
('400', 'Frango, fígado, cru', 106, 17.6, 0, 3.5, null, 82),
('401', 'Frango, filé, à milanesa', 221, 28.5, 7.5, 7.8, 1.1, 122),
('402', 'Frango, inteiro, com pele, cru', 226, 16.4, 0, 17.3, null, 63),
('403', 'Frango, inteiro, sem pele, assado', 187, 28, 0, 7.5, null, 70),
('404', 'Frango, inteiro, sem pele, cozido', 170, 25, 0, 7.1, null, 51),
('405', 'Frango, inteiro, sem pele, cru', 129, 20.6, 0, 4.6, null, 73),
('406', 'Frango, peito, com pele, assado', 212, 33.4, 0, 7.6, null, 56),
('407', 'Frango, peito, com pele, cru', 149, 20.8, 0, 6.7, null, 62),
('408', 'Frango, peito, sem pele, cozido', 163, 31.5, 0, 3.2, null, 36),
('409', 'Frango, peito, sem pele, cru', 119, 21.5, 0, 3, null, 56),
('410', 'Frango, peito, sem pele, grelhado', 159, 32, 0, 2.5, null, 50),
('411', 'Frango, sobrecoxa, com pele, assada', 260, 28.7, 0, 15.2, null, 96),
('412', 'Frango, sobrecoxa, com pele, crua', 255, 15.5, 0, 20.9, null, 68),
('413', 'Frango, sobrecoxa, sem pele, assada', 233, 29.2, 0, 12, null, 106),
('414', 'Frango, sobrecoxa, sem pele, crua', 162, 17.6, 0, 9.6, null, 80),
('415', 'Hambúrguer, bovino, cru', 215, 13.2, 4.2, 16.2, null, 869),
('416', 'Hambúrguer, bovino, frito', 258, 20, 6.3, 17, null, 1252),
('417', 'Hambúrguer, bovino, grelhado', 210, 13.2, 11.3, 12.4, null, 1090),
('418', 'Lingüiça, frango, crua', 218, 14.2, 0, 17.4, null, 1126),
('419', 'Lingüiça, frango, frita', 245, 18.3, 0, 18.5, null, 1374),
('420', 'Lingüiça, frango, grelhada', 244, 18.2, 0, 18.4, null, 1351),
('421', 'Lingüiça, porco, crua', 227, 16.1, 0, 17.6, null, 1176),
('422', 'Lingüiça, porco, frita', 280, 20.5, 0, 21.3, null, 1432),
('423', 'Lingüiça, porco, grelhada', 296, 23.2, 0, 21.9, null, 1456),
('424', 'Mortadela', 269, 12, 5.8, 21.6, null, 1212),
('425', 'Peru, congelado, assado', 163, 26.2, 0, 5.7, null, 628),
('426', 'Peru, congelado, cru', 94, 18.1, 0, 1.8, null, 711),
('427', 'Porco, bisteca, crua', 164, 21.5, 0, 8, null, 54),
('428', 'Porco, bisteca, frita', 311, 33.7, 0, 18.5, null, 63),
('429', 'Porco, bisteca, grelhada', 280, 28.9, 0, 17.4, null, 51),
('430', 'Porco, costela, assada', 402, 30.2, 0, 30.3, null, 63),
('431', 'Porco, costela, crua', 256, 18, 0, 19.8, null, 88),
('432', 'Porco, lombo, assado', 210, 35.7, 0, 6.4, null, 39),
('433', 'Porco, lombo, cru', 176, 22.6, 0, 8.8, null, 53),
('434', 'Porco, orelha, salgada, crua', 258, 18.5, 0, 19.9, null, 616),
('435', 'Porco, pernil, assado', 262, 32.1, 0, 13.9, null, 62),
('436', 'Porco, pernil, cru', 186, 20.1, 0, 11.1, null, 102),
('437', 'Porco, rabo, salgado, cru', 377, 15.6, 0, 34.5, null, 1158),
('438', 'Presunto, com capa de gordura', 128, 14.4, 1.4, 6.8, null, 1021),
('439', 'Presunto, sem capa de gordura', 94, 14.3, 2.1, 2.7, null, 1039),
('440', 'Quibe, assado', 136, 14.6, 12.9, 2.7, 1.9, 40),
('441', 'Quibe, cru', 109, 12.4, 10.8, 1.7, 1.6, 39),
('442', 'Quibe, frito', 254, 14.9, 12.3, 15.8, null, 836),
('443', 'Salame', 398, 25.8, 2.9, 30.6, null, 1574),
('444', 'Toucinho, cru', 593, 11.5, 0, 60.3, null, 50),
('445', 'Toucinho, frito', 697, 27.3, 0, 64.3, null, 125),
('446', 'Bebida láctea, pêssego', 55, 2.1, 7.6, 1.9, 0.3, 46),
('447', 'Creme de Leite', 221, 1.5, 4.5, 22.5, null, 52),
('448', 'Iogurte, natural', 51, 4.1, 1.9, 3, null, 52),
('449', 'Iogurte, natural, desnatado', 41, 3.8, 5.8, 0.3, null, 60),
('451', 'Iogurte, sabor morango', 70, 2.7, 9.7, 2.3, 0.2, 38),
('452', 'Iogurte, sabor pêssego', 68, 2.5, 9.4, 2.3, 0.7, 37),
('453', 'Leite, condensado', 313, 7.7, 57, 6.7, null, 94),
('454', 'Leite, de cabra', 66, 3.1, 5.2, 3.8, null, 74),
('455', 'Leite, de vaca, achocolatado', 83, 2.1, 14.2, 2.2, 0.6, 72),
('456', 'Leite, de vaca, desnatado, pó', 362, 34.7, 53, 0.9, null, 432),
('459', 'Leite, de vaca, integral, pó', 497, 25.4, 39.2, 26.9, null, 323),
('460', 'Leite, fermentado', 70, 1.9, 15.7, 0.1, null, 33),
('461', 'Queijo, minas, frescal', 264, 17.4, 3.2, 20.2, null, 31),
('462', 'Queijo, minas, meia cura', 321, 21.2, 3.6, 24.6, null, 501),
('463', 'Queijo, mozarela', 330, 22.6, 3, 25.2, null, 581),
('464', 'Queijo, parmesão', 453, 35.6, 1.7, 33.5, null, 1844),
('465', 'Queijo, pasteurizado', 303, 9.4, 5.7, 27.4, null, 780),
('466', 'Queijo, petit suisse, morango', 121, 5.8, 18.5, 2.8, null, 412),
('467', 'Queijo, prato', 360, 22.7, 1.9, 29.1, null, 580),
('468', 'Queijo, requeijão, cremoso', 257, 9.6, 2.4, 23.4, null, 558),
('469', 'Queijo, ricota', 140, 12.6, 3.8, 8.1, null, 283),
('470', 'Bebida isotônica, sabores variados', 26, 0, 6.4, 0, null, 44),
('471', 'Café, infusão 10%', 9, 0.7, 1.5, 0.1, null, 1),
('472', 'Cana, aguardente', 216, 0, 0, 0, null, 3),
('473', 'Cana, caldo de', 65, 0, 18.2, 0, 0.1, null),
('474', 'Cerveja, pilsen', 41, 0.6, 3.3, 0, null, 4),
('475', 'Chá, erva-doce, infusão 5%', 1, 0, 0.4, 0, null, 1),
('476', 'Chá, mate, infusão 5%', 3, 0, 0.6, 0.1, null, null),
('477', 'Chá, preto, infusão 5%', 2, 0, 0.6, 0, null, null),
('478', 'Coco, água de', 22, 0, 5.3, 0, 0.1, 2),
('479', 'Refrigerante, tipo água tônica', 31, 0, 8, 0, null, 8),
('480', 'Refrigerante, tipo cola', 34, 0, 8.7, 0, null, 7),
('481', 'Refrigerante, tipo guaraná', 39, 0, 10, 0, null, 9),
('482', 'Refrigerante, tipo laranja', 46, 0, 11.8, 0, null, 9),
('483', 'Refrigerante, tipo limão', 40, 0, 10.3, 0, null, 9),
('484', 'Omelete, de queijo', 268, 15.6, 0.4, 22, null, 216),
('485', 'Ovo, de codorna, inteiro, cru', 177, 13.7, 0.8, 12.7, null, 129),
('486', 'Ovo, de galinha, clara, cozida/10minutos', 59, 13.4, 0, 0.1, null, 181),
('487', 'Ovo, de galinha, gema, cozida/10minutos', 353, 15.9, 1.6, 30.8, null, 45),
('488', 'Ovo, de galinha, inteiro, cozido/10minutos', 146, 13.3, 0.6, 9.5, null, 146),
('489', 'Ovo, de galinha, inteiro, cru', 143, 13, 1.6, 8.9, null, 168),
('490', 'Ovo, de galinha, inteiro, frito', 240, 15.6, 1.2, 18.6, null, 166),
('491', 'Achocolatado, pó', 401, 4.2, 91.2, 2.2, 3.9, 65),
('492', 'Açúcar, cristal', 387, 0.3, 99.6, 0, null, null),
('493', 'Açúcar, mascavo', 369, 0.8, 94.5, 0.1, null, 25),
('494', 'Açúcar, refinado', 387, 0.3, 99.5, 0, null, 12),
('495', 'Chocolate, ao leite', 540, 7.2, 59.6, 30.3, 2.2, 77),
('496', 'Chocolate, ao leite, com castanha do Pará', 559, 7.4, 55.4, 34.2, 2.5, 64),
('497', 'Chocolate, ao leite, dietético', 557, 6.9, 56.3, 33.8, 2.8, 85),
('498', 'Chocolate, meio amargo', 475, 4.9, 62.4, 29.9, 4.9, 9),
('499', 'Cocada branca', 449, 1.1, 81.4, 13.6, 3.6, 29),
('500', 'Doce, de abóbora, cremoso', 199, 0.9, 54.6, 0.2, 2.3, null),
('501', 'Doce, de leite, cremoso', 306, 5.5, 59.5, 6, null, 120),
('502', 'Geléia, mocotó, natural', 106, 2.1, 24.2, 0.1, null, 43),
('503', 'Glicose de milho', 292, 0, 79.4, 0, null, 59),
('504', 'Maria mole', 301, 3.8, 73.6, 0.2, 0.7, 15),
('505', 'Maria mole, coco queimado', 307, 3.9, 75.1, 0.1, 0.6, 14),
('506', 'Marmelada', 257, 0.4, 70.8, 0.1, 4.1, 11),
('507', 'Mel, de abelha', 309, 0, 84, 0, null, 6),
('508', 'Melado', 297, 0, 76.6, 0, null, 4),
('509', 'Quindim', 411, 4.7, 46.3, 24.4, 3.2, 27),
('510', 'Rapadura', 352, 1, 90.8, 0.1, null, 22),
('511', 'Café, pó, torrado', 419, 14.7, 65.8, 11.9, 51.2, 1),
('512', 'Capuccino, pó', 417, 11.3, 73.6, 8.6, 2.4, 382),
('513', 'Fermento em pó, químico', 90, 0.5, 43.9, 0.1, null, 10052),
('514', 'Fermento, biológico, levedura, tablete', 90, 17, 7.7, 1.5, 4.2, 40),
('515', 'Gelatina, sabores variados, pó', 380, 8.9, 89.2, 0, null, 235),
('518', 'Shoyu', 61, 3.3, 11.6, 0.3, null, 5024),
('519', 'Tempero a base de sal', 21, 2.7, 2.1, 0.3, 0.6, 32560),
('520', 'Azeitona, preta, conserva', 194, 1.2, 5.5, 20.3, 4.6, 1567),
('521', 'Azeitona, verde, conserva', 137, 0.9, 4.1, 14.2, 3.8, 1347),
('522', 'Chantilly, spray, com gordura vegetal', 315, 0.5, 16.9, 27.3, null, 110),
('523', 'Leite, de coco', 166, 1, 2.2, 18.4, 0.7, 44),
('524', 'Maionese, tradicional com ovos', 302, 0.6, 7.9, 30.5, null, 787),
('525', 'Acarajé', 289, 8.3, 19.1, 19.9, 9.4, 305),
('526', 'Arroz carreteiro', 154, 10.8, 11.6, 7.1, 1.5, 1622),
('527', 'Baião de dois, arroz e feijão-de-corda', 136, 6.2, 20.4, 3.2, 5.1, 93),
('528', 'Barreado', 165, 18.3, 0.2, 9.5, 0.1, 48),
('529', 'Bife à cavalo, com contra filé', 291, 23.7, 0, 21.1, null, 83),
('530', 'Bolinho de arroz', 274, 8, 41.7, 8.3, 2.7, 59),
('531', 'Camarão à baiana', 101, 7.9, 3.2, 6, 0.4, 85),
('532', 'Charuto, de repolho', 78, 6.8, 10.1, 1.1, 1.5, 12),
('533', 'Cuscuz, de milho, cozido com sal', 113, 2.2, 25.3, 0.7, 2.1, 248),
('534', 'Cuscuz, paulista', 142, 2.6, 22.5, 4.6, 2.4, 236),
('535', 'Cuxá, molho', 80, 5.6, 5.7, 3.6, 3, 1344),
('536', 'Dobradinha', 125, 19.8, 0, 4.4, null, 29),
('537', 'Estrogonofe de carne', 173, 15, 3, 10.8, null, 123),
('538', 'Estrogonofe de frango', 157, 17.6, 2.6, 8, null, 99),
('539', 'Feijão tropeiro mineiro', 152, 10.2, 19.6, 6.8, 3.6, 365),
('540', 'Feijoada', 117, 8.7, 11.6, 6.5, 5.1, 278),
('541', 'Frango, com açafrão', 113, 9.7, 4.1, 6.2, 0.2, 29),
('542', 'Macarrão, molho bolognesa', 120, 4.9, 22.5, 0.9, 0.8, 9),
('543', 'Maniçoba', 134, 10, 3.4, 8.7, 2.2, 407),
('544', 'Quibebe', 86, 8.6, 6.6, 2.7, 1.7, 247),
('545', 'Salada, de legumes, com maionese', 96, 1.1, 8.9, 7, 2.2, 228),
('546', 'Salada, de legumes, cozida no vapor', 35, 2, 7.1, 0.3, 2.5, 3),
('547', 'Salpicão, de frango', 148, 13.9, 4.6, 7.8, 0.4, 248),
('548', 'Sarapatel', 123, 18.5, 1.1, 4.4, null, 216),
('549', 'Tabule', 57, 2, 10.6, 1.2, 2.1, 1),
('550', 'Tacacá', 47, 7, 3.4, 0.4, 0.2, 1349),
('551', 'Tapioca, com manteiga', 348, 0.1, 63.6, 10.9, null, 158),
('552', 'Tucupi, com pimenta-de-cheiro', 27, 2.1, 4.7, 0.3, 0.2, 5),
('553', 'Vaca atolada', 145, 5.1, 10.1, 9.3, 2.3, 26),
('554', 'Vatapá', 255, 6, 9.7, 23.2, 1.7, 880),
('555', 'Virado à paulista', 307, 10.2, 14.1, 25.6, 2.2, 346),
('556', 'Yakisoba', 113, 7.5, 18.3, 2.6, 1.1, 794),
('557', 'Amendoim, grão, cru', 544, 27.2, 20.3, 43.9, 8, null),
('558', 'Amendoim, torrado, salgado', 606, 22.5, 18.7, 54, 7.8, 376),
('559', 'Ervilha, em vagem', 88, 7.5, 14.2, 0.5, 9.7, null),
('560', 'Ervilha, enlatada, drenada', 74, 4.6, 13.4, 0.4, 5.1, 372),
('561', 'Feijão, carioca, cozido', 76, 4.8, 13.6, 0.5, 8.5, 2),
('562', 'Feijão, carioca, cru', 329, 20, 61.2, 1.3, 18.4, null),
('563', 'Feijão, fradinho, cozido', 78, 5.1, 13.5, 0.6, 7.5, 1),
('564', 'Feijão, fradinho, cru', 339, 20.2, 61.2, 2.4, 23.6, 10),
('565', 'Feijão, jalo, cozido', 93, 6.1, 16.5, 0.5, 13.9, 1),
('566', 'Feijão, jalo, cru', 328, 20.1, 61.5, 0.9, 30.3, 25),
('567', 'Feijão, preto, cozido', 77, 4.5, 14, 0.5, 8.4, 2),
('568', 'Feijão, preto, cru', 324, 21.3, 58.8, 1.2, 21.8, null),
('569', 'Feijão, rajado, cozido', 85, 5.5, 15.3, 0.4, 9.3, 1),
('570', 'Feijão, rajado, cru', 326, 17.3, 62.9, 1.2, 24, 14),
('571', 'Feijão, rosinha, cozido', 68, 4.5, 11.8, 0.5, 4.8, 2),
('572', 'Feijão, rosinha, cru', 337, 20.9, 62.2, 1.3, 20.6, 24),
('573', 'Feijão, roxo, cozido', 77, 5.7, 12.9, 0.5, 11.5, 1),
('574', 'Feijão, roxo, cru', 331, 22.2, 60, 1.2, 33.8, 10),
('575', 'Grão-de-bico, cru', 355, 21.2, 57.9, 5.4, 12.4, 5),
('576', 'Guandu, cru', 344, 19, 64, 2.1, 21.3, 2),
('577', 'Lentilha, cozida', 93, 6.3, 16.3, 0.5, 7.9, 1),
('578', 'Lentilha, crua', 339, 23.2, 62, 0.8, 16.9, null),
('579', 'Paçoca, amendoim', 487, 16, 52.4, 26.1, 7.3, 167),
('580', 'Pé-de-moleque, amendoim', 503, 13.2, 54.7, 28, 3.4, 16),
('581', 'Soja, farinha', 404, 36, 38.4, 14.6, 20.2, 6),
('582', 'Soja, extrato solúvel, natural, fluido', 39, 2.4, 4.3, 1.6, 0.4, 57),
('583', 'Soja, extrato solúvel, pó', 459, 35.7, 28.5, 26.2, 7.3, 83),
('584', 'Soja, queijo (tofu)', 64, 6.6, 2.1, 4, 0.8, 1),
('585', 'Tremoço, cru', 381, 33.6, 43.8, 10.3, 32.3, 3),
('586', 'Tremoço, em conserva', 121, 11.1, 12.4, 3.8, 14.4, 1809),
('587', 'Amêndoa, torrada, salgada', 581, 18.6, 29.5, 47.3, 11.6, 279),
('588', 'Castanha-de-caju, torrada, salgada', 570, 18.5, 29.1, 46.3, 3.7, 125),
('589', 'Castanha-do-Brasil, crua', 643, 14.5, 15.1, 63.5, 7.9, 1),
('590', 'Coco, cru', 406, 3.7, 10.4, 42, 5.4, 15),
('592', 'Farinha, de mesocarpo de babaçu, crua', 329, 1.4, 79.2, 0.2, 17.9, 12),
('593', 'Gergelim, semente', 584, 21.2, 21.6, 50.4, 11.9, 3),
('594', 'Linhaça, semente', 495, 14.1, 43.3, 32.3, 33.5, 9),
('595', 'Pinhão, cozido', 174, 3, 43.9, 0.7, 15.6, 1),
('596', 'Pupunha, cozida', 219, 2.5, 29.6, 12.8, 4.3, 1),
('597', 'Noz, crua', 620, 14, 18.4, 59.4, 7.2, 5)
) as v(id, name, kcal, p, c, f, fi, na)
on conflict (coalesce(user_id, '00000000-0000-0000-0000-000000000000'::uuid), source, external_id) where external_id is not null
do nothing;

-- ============================================================
-- 20261001000002_busca_palavra_inteira.sql
-- ============================================================
-- Relevância da busca: nome que começa pela palavra inteira ("Maçã, crua") vem antes de
-- nome que apenas começa com as mesmas letras ("Macarrão").
create or replace function public.search_foods(q text, lim int default 30)
returns setof public.foods
language sql stable security invoker set search_path = public, extensions
as $$
  with t as (
    select lower(public.f_unaccent(trim(q))) as term,
           regexp_replace(lower(public.f_unaccent(trim(q))), '[^a-z0-9 ]', '', 'g') as safe,
           array(select w from unnest(string_to_array(lower(public.f_unaccent(trim(q))), ' ')) w where w <> '') as words
  )
  select f.*
  from public.foods f, t
  where cardinality(t.words) > 0
    and not exists (
      select 1 from unnest(t.words) w
      where lower(public.f_unaccent(f.name || ' ' || coalesce(f.brand, ''))) not like '%' || replace(replace(w, '%', ''), '_', '') || '%'
    )
  order by
    (f.user_id is not null) desc,
    (lower(public.f_unaccent(f.name)) ~ ('^' || t.safe || '([^a-z0-9]|$)')) desc,
    (lower(public.f_unaccent(f.name)) like t.term || '%') desc,
    (f.source = 'taco') desc,
    char_length(f.name),
    f.name
  limit least(greatest(lim, 1), 60)
$$;
grant execute on function public.search_foods(text, int) to authenticated;
