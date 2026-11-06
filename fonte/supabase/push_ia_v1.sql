-- NG+ — lembretes (push) e treinador por IA. Já aplicado no projeto gjoxrgnkwmjvcfiywtcs em 2026-11-06 (migrations push_lembretes_v1_schema e push_cron_horario).
-- Guardado aqui só como registro; NÃO contém nenhum segredo.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.push_subs (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null check (endpoint like 'https://%' and length(endpoint) < 1000),
  p256dh text not null check (length(p256dh) < 200),
  auth text not null check (length(auth) < 100),
  hora smallint not null default 18 check (hora between 0 and 23),
  tz text not null default 'America/Sao_Paulo' check (length(tz) < 64),
  ativo boolean not null default true,
  ultimo_envio date,
  criado_em timestamptz not null default now(),
  primary key (user_id, endpoint)
);
alter table public.push_subs enable row level security;
create policy push_subs_dono on public.push_subs for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create index if not exists push_subs_ativo_idx on public.push_subs (ativo, hora);

create table if not exists public.llm_uso (
  user_id uuid not null references auth.users(id) on delete cascade,
  dia date not null default current_date,
  n integer not null default 0,
  primary key (user_id, dia)
);
alter table public.llm_uso enable row level security;   -- sem policies: só a Edge Function (service role) lê e escreve

select cron.schedule('ng-lembretes-horario', '0 * * * *', $$select net.http_post(
  url := 'https://gjoxrgnkwmjvcfiywtcs.supabase.co/functions/v1/lembretes',
  headers := '{"Content-Type":"application/json"}'::jsonb, body := '{}'::jsonb, timeout_milliseconds := 20000);$$);
