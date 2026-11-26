// Edge Function delete-account (LGPD): só apaga a conta de quem chamou, só com a confirmação certa, e na ordem certa. Sem rede e sem o Supabase real.
// Uso (na pasta fonte/testes): node --experimental-strip-types --import ./backend/registra.mjs backend/delete-account.mjs
import { carrega, bancoDeMentira, req, lê, placar } from './harness.mjs';
const { t, fim } = placar();
const UID = 'aaaaaaaa-0000-4000-8000-000000000001';
const tem = (ops, n) => ops.some((o) => o[0] === n);
const eqDe = (ops, col) => ops.find((o) => o[0] === 'eq' && o[1] === col)?.[2];
const cab = { Authorization: 'Bearer tok123' };
const base = (extra = {}) => ({ getUser: () => ({ data: { user: { id: UID, email: 'Maria@Exemplo.com' } }, error: null }), ...extra });
const roda = async (corpo, regras = base(), opcoes = { headers: cab }, env = {}) => { const h = await carrega('delete-account', env); const b = bancoDeMentira(regras); const r = await lê(await h(req(corpo, opcoes))); return { ...r, b }; };
const destrutivo = (b) => b.calls.some((c) => (c.tipo === 'from' && tem(c.ops, 'delete')) || ['storage.remove', 'deleteUser'].includes(c.tipo));
const ordem = (b) => b.calls.filter((c) => (c.tipo === 'from' && tem(c.ops, 'delete')) || ['storage.list', 'storage.remove', 'deleteUser'].includes(c.tipo)).map((c) => c.tipo === 'from' ? 'tabela:' + c.tabela : c.tipo);

// --- forma da chamada
{ const h = await carrega('delete-account'); bancoDeMentira();
  const o = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://new-game-mais.sombrasplays.workers.dev' } }))); t('OPTIONS responde 200 com CORS do site', o.status === 200 && o.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const o2 = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://malvado.example' } }))); t('origem desconhecida não é refletida no CORS', o2.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const g = await lê(await h(req(null, { metodo: 'GET' }))); t('GET é recusado com 405', g.status === 405); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base(), { headers: {} }); t('sem Authorization: 401 "sem_token" e nada é tocado', r.status === 401 && r.j.error === 'sem_token' && r.b.calls.length === 0); }
for (const [nome, corpo, bruto] of [['sem corpo', null, ''], ['corpo inválido', null, '{x'], ['confirmação em minúsculas', { confirmar: 'excluir' }], ['confirmação com espaço', { confirmar: 'EXCLUIR ' }], ['confirmação errada', { confirmar: 'SIM' }], ['confirmação booleana', { confirmar: true }], ['sem o campo', {}]]) {
  const r = await roda(corpo, base(), { headers: cab, ...(bruto !== undefined ? { bruto } : {}) }); t('confirmação: ' + nome + ' → 400 "confirmacao_ausente", nada é apagado nem consultado', r.status === 400 && r.j.error === 'confirmacao_ausente' && !destrutivo(r.b) && r.b.calls.length === 0, JSON.stringify(r.j)); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, { getUser: () => ({ data: { user: null }, error: { message: 'jwt expired' } }) }); t('token inválido: 401 "token_invalido" e nada é apagado', r.status === 401 && r.j.error === 'token_invalido' && !destrutivo(r.b)); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, { getUser: () => ({ data: { user: null }, error: null }) }); t('token sem usuário: 401 "token_invalido"', r.status === 401 && !destrutivo(r.b)); }

// --- caminho feliz
{ let rodada = 0;
  const r = await roda({ confirmar: 'EXCLUIR', user_id: 'outro-usuario', id: 'outro-usuario' }, base({
    from: (tab, ops) => tab === 'user_docs' ? { count: 7 } : {},
    storage: { list: () => (rodada++ === 0 ? { data: [{ name: 'a.jpg' }, { name: 'b.jpg' }] } : { data: [] }) },
  }));
  t('exclusão completa: 200 com o total de documentos e fotos apagados', r.status === 200 && r.j.ok === true && r.j.docs === 7 && r.j.fotos === 2, JSON.stringify(r.j));
  t('ordem: pedidos de acesso → lista fotos → remove fotos → lista de novo → documentos → usuário', JSON.stringify(ordem(r.b)) === JSON.stringify(['tabela:pedidos_acesso', 'storage.list', 'storage.remove', 'storage.list', 'tabela:user_docs', 'deleteUser']), ordem(r.b).join(' > '));
  t('o usuário só é apagado por último (depois de fotos e documentos)', ordem(r.b).at(-1) === 'deleteUser');
  const ped = r.b.calls.find((c) => c.tipo === 'from' && c.tabela === 'pedidos_acesso'); t('apaga os pedidos de acesso do e-mail da conta, em minúsculas', ped && tem(ped.ops, 'delete') && eqDe(ped.ops, 'email') === 'maria@exemplo.com', JSON.stringify(ped?.ops));
  const l = r.b.calls.find((c) => c.tipo === 'storage.list'); t('lista a pasta do próprio usuário no bucket de fotos de progresso', l && l.bucket === 'fotos-progresso' && l.pasta === UID, JSON.stringify(l));
  const rm = r.b.calls.find((c) => c.tipo === 'storage.remove'); t('remove as fotos com o caminho <uid>/<arquivo>', rm && JSON.stringify(rm.l) === JSON.stringify([UID + '/a.jpg', UID + '/b.jpg']), JSON.stringify(rm?.l));
  const docs = r.b.calls.find((c) => c.tipo === 'from' && c.tabela === 'user_docs'); t('apaga os documentos só do usuário que chamou', docs && tem(docs.ops, 'delete') && eqDe(docs.ops, 'user_id') === UID, JSON.stringify(docs?.ops));
  const du = r.b.calls.find((c) => c.tipo === 'deleteUser'); t('apaga o usuário de autenticação do token, nunca um id vindo do corpo', du && du.id === UID, du?.id);
  t('nenhuma chamada usa o id de outro usuário enviado no corpo', !JSON.stringify(r.b.calls).includes('outro-usuario')); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ from: (tab) => tab === 'user_docs' ? { count: null } : {} })); t('sem fotos e sem contagem: 200 com docs=0 e fotos=0', r.status === 200 && r.j.docs === 0 && r.j.fotos === 0, JSON.stringify(r.j)); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, { getUser: () => ({ data: { user: { id: UID } }, error: null }) });
  t('conta sem e-mail: pula a remoção de pedidos e segue o resto', r.status === 200 && !r.b.calls.some((c) => c.tipo === 'from' && c.tabela === 'pedidos_acesso') && ordem(r.b).at(-1) === 'deleteUser', ordem(r.b).join(' > ')); }
{ let n = 0; const r = await roda({ confirmar: 'EXCLUIR' }, base({ storage: { list: () => (n++ < 2 ? { data: [{ name: 'f' + n + '.jpg' }] } : { data: [] }) } })); t('muitas fotos: repete a listagem em lotes até esvaziar', r.status === 200 && r.j.fotos === 2 && r.b.calls.filter((c) => c.tipo === 'storage.remove').length === 2, JSON.stringify(r.j)); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ storage: { list: () => ({ data: [{ name: 'preso.jpg' }] }) } }));
  const listas = r.b.calls.filter((c) => c.tipo === 'storage.list').length;
  t('proteção contra laço infinito: no máximo 50 voltas na listagem de fotos', listas === 50 && r.status === 200, listas); }

// --- falhas: cada etapa interrompe, não vaza e não apaga a seguinte
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ from: (tab) => tab === 'pedidos_acesso' ? { error: { message: 'segredo' } } : {} }));
  t('falha nos pedidos: 500 "falha_remover_pedidos" e nada além disso é apagado', r.status === 500 && r.j.error === 'falha_remover_pedidos' && ordem(r.b).join() === 'tabela:pedidos_acesso'); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ storage: { list: () => ({ data: null, error: { message: 'x' } }) } }));
  t('falha ao listar fotos: 500 "falha_listar_fotos"; documentos e usuário continuam intactos', r.status === 500 && r.j.error === 'falha_listar_fotos' && !ordem(r.b).includes('deleteUser') && !ordem(r.b).includes('tabela:user_docs')); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ storage: { list: () => ({ data: [{ name: 'a.jpg' }] }), remove: () => ({ error: { message: 'x' } }) } }));
  t('falha ao remover fotos: 500 "falha_remover_fotos"; o usuário NÃO é apagado (dá para tentar de novo)', r.status === 500 && r.j.error === 'falha_remover_fotos' && !ordem(r.b).includes('deleteUser')); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ from: (tab) => tab === 'user_docs' ? { error: { message: 'x' } } : {} }));
  t('falha ao apagar documentos: 500 "falha_remover_docs"; o usuário NÃO é apagado', r.status === 500 && r.j.error === 'falha_remover_docs' && !ordem(r.b).includes('deleteUser')); }
{ const r = await roda({ confirmar: 'EXCLUIR' }, base({ from: (tab) => tab === 'user_docs' ? { count: 3 } : {}, admin: { deleteUser: () => ({ error: { message: 'x' } }) } }));
  t('falha ao apagar o usuário: 500 "falha_remover_usuario" e informa o que já foi apagado (docs, fotos)', r.status === 500 && r.j.error === 'falha_remover_usuario' && r.j.docs === 3 && r.j.fotos === 0, JSON.stringify(r.j)); }

// --- chave do servidor
{ const h = await carrega('delete-account', { SUPABASE_SERVICE_ROLE_KEY: undefined, SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_x' }) }); bancoDeMentira(base()); const r = await lê(await h(req({ confirmar: 'EXCLUIR' }, { headers: cab }))); t('funciona com a chave nova (SUPABASE_SECRET_KEYS)', r.status === 200); }
fim();
