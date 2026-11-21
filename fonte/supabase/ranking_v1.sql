-- Ranking entre cadastrados do NG+ (aplicada no Supabase em 21/11/2026 como migração "ranking_amigos").
-- Só agregados + apelido. A escrita é SOMENTE pelas funções abaixo (SECURITY DEFINER): o servidor lê apelido (config/perfil.nomeUsuario) e idade
-- do próprio perfil da pessoa; menor de 18 anos (ou sem idade) nunca entra e a linha é apagada. Todo usuário logado lê; ninguém grava direto na tabela.
-- O aviso "authenticated pode executar função SECURITY DEFINER" do advisor é intencional: é o único caminho de escrita.
create table public.ranking (
  user_id uuid primary key references auth.users(id) on delete cascade,
  apelido text not null check (char_length(apelido) between 2 and 24),
  xp integer not null default 0 check (xp between 0 and 1000000),
  nivel smallint not null default 1 check (nivel between 1 and 10),
  sequencia integer not null default 0 check (sequencia between 0 and 5000),
  volume_kg bigint not null default 0 check (volume_kg between 0 and 100000000),
  atualizado_em timestamptz not null default now()
);
alter table public.ranking enable row level security;
revoke all on public.ranking from anon, authenticated;
grant select on public.ranking to authenticated;
create policy ranking_le_todos on public.ranking for select to authenticated using (true);

create function public.publicar_ranking(p_xp integer, p_nivel integer, p_sequencia integer, p_volume_kg bigint)
returns text language plpgsql security definer set search_path = public, pg_temp as $$
declare uid uuid := auth.uid(); perfil jsonb; idade numeric; nome text;
begin
  if uid is null then return 'sem_login'; end if;
  select data into perfil from public.user_docs where user_id = uid and path = 'config/perfil';
  if perfil is null then return 'sem_perfil'; end if;
  begin idade := (perfil->>'idade')::numeric; exception when others then idade := null; end;
  if idade is null or idade < 18 then delete from public.ranking where user_id = uid; return 'menor_ou_sem_idade'; end if;
  nome := btrim(regexp_replace(coalesce(perfil->>'nomeUsuario', ''), '^@+', ''));
  nome := left(regexp_replace(nome, '[[:cntrl:]]', '', 'g'), 24);
  if char_length(nome) < 2 then nome := 'Atleta ' || substr(replace(uid::text, '-', ''), 1, 4); end if;
  insert into public.ranking as r (user_id, apelido, xp, nivel, sequencia, volume_kg, atualizado_em)
  values (uid, nome, greatest(0, least(coalesce(p_xp, 0), 1000000)), greatest(1, least(coalesce(p_nivel, 1), 10)),
          greatest(0, least(coalesce(p_sequencia, 0), 5000)), greatest(0, least(coalesce(p_volume_kg, 0), 100000000)), now())
  on conflict (user_id) do update set apelido = excluded.apelido, xp = excluded.xp, nivel = excluded.nivel,
    sequencia = excluded.sequencia, volume_kg = excluded.volume_kg, atualizado_em = now();
  return 'ok';
end; $$;

create function public.sair_do_ranking() returns void language sql security definer set search_path = public, pg_temp
as $$ delete from public.ranking where user_id = auth.uid(); $$;

revoke all on function public.publicar_ranking(integer, integer, integer, bigint) from public, anon;
revoke all on function public.sair_do_ranking() from public, anon;
grant execute on function public.publicar_ranking(integer, integer, integer, bigint) to authenticated;
grant execute on function public.sair_do_ranking() to authenticated;
