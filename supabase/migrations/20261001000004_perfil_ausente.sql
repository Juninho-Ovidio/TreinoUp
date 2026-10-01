-- Perfil ausente: o app passa a recriar o próprio perfil quando ele não existe
-- (ex.: linha apagada pelo painel). Para isso o INSERT feito pelo cliente
-- também não pode escolher o plano: só a service role define Premium.
create or replace function public.protect_profile_plan() returns trigger
language plpgsql as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' then
      new.plan := 'free';
    elsif new.plan is distinct from old.plan then
      new.plan := old.plan;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_plan on public.profiles;
create trigger profiles_protect_plan before insert or update on public.profiles
  for each row execute function public.protect_profile_plan();

-- Recria o perfil de quem ficou sem.
insert into public.profiles (id)
select u.id from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
