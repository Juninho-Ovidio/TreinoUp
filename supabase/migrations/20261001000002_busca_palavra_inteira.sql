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
