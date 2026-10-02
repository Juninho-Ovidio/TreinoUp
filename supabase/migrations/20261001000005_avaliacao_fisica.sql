-- Avaliação física: dobras cutâneas, perímetros e anamnese.
-- Os resultados (gordura, IMC, TMB) são calculados no app a partir destes dados.
create table if not exists public.body_assessments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  assessed_on    date not null,
  sex            text not null check (sex in ('male', 'female')),
  age            int not null check (age between 10 and 120),
  weight_kg      numeric(5,1) not null check (weight_kg between 25 and 400),
  height_cm      numeric(5,1) not null check (height_cm between 100 and 250),
  skinfolds_mm   jsonb not null default '{}'::jsonb,
  perimeters_cm  jsonb not null default '{}'::jsonb,
  anamnesis      jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  unique (user_id, assessed_on)
);

alter table public.body_assessments enable row level security;

drop policy if exists "own assessments" on public.body_assessments;
create policy "own assessments" on public.body_assessments
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

grant select, insert, update, delete on public.body_assessments to authenticated;

create index if not exists body_assessments_user_date on public.body_assessments (user_id, assessed_on desc);
