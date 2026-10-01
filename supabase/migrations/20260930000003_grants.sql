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
