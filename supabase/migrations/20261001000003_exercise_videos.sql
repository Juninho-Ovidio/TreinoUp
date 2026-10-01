-- Vídeo de demonstração por exercício (gerado por IA e enviado com a service role).
alter table public.exercises add column if not exists video_url text;

-- Leitura pública pelo link; sem políticas de escrita, só a service role envia arquivos.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exercise-videos', 'exercise-videos', true, 52428800, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;
