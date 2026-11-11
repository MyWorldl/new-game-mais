-- NG+ · segurança v1 (aplicada no projeto gjoxrgnkwmjvcfiywtcs em 11/11/2026 como migração "seg_cron_secret_e_cota_ia_atomica")

-- Segredo do cron guardado no Vault (gerado dentro do banco; nunca passa pelo chat nem pelo git)
select vault.create_secret(
  replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  'ng_cron_secret',
  'NG+: segredo que o pg_cron envia no header x-cron-secret para a Edge Function lembretes'
)
where not exists (select 1 from vault.secrets where name = 'ng_cron_secret');

-- A função lembretes só pergunta "esse valor confere?"
create or replace function public.cron_secret_ok(p text)
returns boolean language sql security definer set search_path = public, vault as $$
  select p is not null and length(p) > 20 and exists (
    select 1 from vault.decrypted_secrets where name = 'ng_cron_secret' and decrypted_secret = p
  );
$$;
revoke all on function public.cron_secret_ok(text) from public, anon, authenticated;
grant execute on function public.cron_secret_ok(text) to service_role;

-- Cota diária da IA: uma única instrução atômica (sem corrida entre "ler" e "gravar"); devolve o novo total ou NULL se estourou
create or replace function public.consome_cota_ia(p_user uuid, p_dia date, p_max int)
returns int language sql security definer set search_path = public as $$
  insert into public.llm_uso(user_id, dia, n) values (p_user, p_dia, 1)
  on conflict (user_id, dia) do update set n = public.llm_uso.n + 1 where public.llm_uso.n < p_max
  returning n;
$$;
revoke all on function public.consome_cota_ia(uuid, date, int) from public, anon, authenticated;
grant execute on function public.consome_cota_ia(uuid, date, int) to service_role;

-- O job do cron passa a enviar o segredo (lido do Vault a cada execução). job_id 1 = ng-lembretes-horario
select cron.alter_job(
  job_id := 1,
  command := $cmd$select net.http_post(
      url := 'https://gjoxrgnkwmjvcfiywtcs.supabase.co/functions/v1/lembretes',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'ng_cron_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
  );$cmd$
);
