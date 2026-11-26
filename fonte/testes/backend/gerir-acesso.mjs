// Edge Function gerir-acesso (só administradores): autenticação, permissão, listar, aprovar e recusar pedidos. Sem rede e sem o Supabase real.
// Uso (na pasta fonte/testes): node --experimental-strip-types --import ./backend/registra.mjs backend/gerir-acesso.mjs
import { carrega, bancoDeMentira, req, lê, placar } from './harness.mjs';
const { t, fim } = placar();
const ID = '123e4567-e89b-12d3-a456-426614174000';
const pedido = (o = {}) => ({ id: ID, nome: 'Maria Souza', email: 'maria@exemplo.com', nascimento: '1990-05-10', menor: false, email_responsavel: null, status: 'pendente', ...o });
const tem = (ops, nome) => ops.some((o) => o[0] === nome);
const eqDe = (ops, col) => ops.find((o) => o[0] === 'eq' && o[1] === col)?.[2];
// regras-base: o chamador é administrador e o pedido existe; `extra` sobrescreve peças.
const base = (extra = {}) => ({
  getUser: () => ({ data: { user: { email: 'Adm@Exemplo.com' } }, error: null }),
  from: (tab, ops) => {
    if (extra.from) { const r = extra.from(tab, ops); if (r) return r; }
    if (tab === 'admins') return { data: { email: 'adm@exemplo.com' } };
    if (tab === 'pedidos_acesso' && tem(ops, 'maybeSingle')) return { data: pedido() };
    return {};
  },
  rpc: extra.rpc, admin: extra.admin,
});
const cab = { Authorization: 'Bearer tok123' };
const roda = async (corpo, regras = base(), opcoes = { headers: cab }, env = {}) => { const h = await carrega('gerir-acesso', env); const b = bancoDeMentira(regras); const r = await lê(await h(req(corpo, opcoes))); return { ...r, b }; };
const tabela = (b, nome) => b.calls.filter((c) => c.tipo === 'from' && c.tabela === nome);
const escreveu = (b) => b.calls.some((c) => (c.tipo === 'from' && c.ops.some((o) => ['insert', 'update', 'delete'].includes(o[0]))) || ['createUser', 'inviteUserByEmail', 'deleteUser'].includes(c.tipo));

// --- forma da chamada e autenticação
{ const h = await carrega('gerir-acesso'); bancoDeMentira();
  const o = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://new-game-mais.sombrasplays.workers.dev' } })));
  t('OPTIONS responde 200 com CORS do site', o.status === 200 && o.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const o2 = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://malvado.example' } })));
  t('origem desconhecida não é refletida no CORS', o2.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const g = await lê(await h(req(null, { metodo: 'GET' }))); t('GET é recusado com 405', g.status === 405); }
{ const r = await roda({ acao: 'listar' }, base(), { headers: {} }); t('sem Authorization: 401 "sem_token" e o banco nem é consultado', r.status === 401 && r.j.error === 'sem_token' && r.b.calls.length === 0); }
{ const r = await roda({ acao: 'listar' }, { getUser: (tk) => tk === 'Bearer' ? { data: { user: null }, error: { message: 'invalid' } } : { data: { user: { email: 'adm@exemplo.com' } }, error: null } }, { headers: { Authorization: 'Bearer ' } });
  t('"Bearer" sem token (o cabeçalho perde o espaço final): 401 e nada gravado', r.status === 401 && !escreveu(r.b), JSON.stringify(r.j)); }
{ const r = await roda({ acao: 'listar' }, { getUser: () => ({ data: { user: null }, error: { message: 'jwt expired' } }) }); t('token inválido/expirado: 401 "token_invalido", nada gravado', r.status === 401 && r.j.error === 'token_invalido' && !escreveu(r.b)); }
{ const r = await roda({ acao: 'listar' }, { getUser: () => ({ data: { user: { id: 'u1' } }, error: null }) }); t('usuário sem e-mail: 401 "token_invalido"', r.status === 401 && r.j.error === 'token_invalido'); }
{ const r = await roda({ acao: 'listar' }, base()); const g = r.b.calls.find((c) => c.tipo === 'getUser'); t('o token enviado é o do cabeçalho, sem o prefixo Bearer', g && g.token === 'tok123', g?.token); }
{ const r = await roda({ acao: 'listar' }, { ...base(), getUser: () => ({ data: { user: { email: 'intruso@exemplo.com' } }, error: null }), from: (tab) => tab === 'admins' ? { data: null } : {} });
  t('quem não está em "admins": 403 "sem_permissao"', r.status === 403 && r.j.error === 'sem_permissao');
  t('o 403 acontece antes de tocar nos pedidos (nenhuma leitura nem escrita em pedidos_acesso)', tabela(r.b, 'pedidos_acesso').length === 0 && !escreveu(r.b)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, { ...base(), getUser: () => ({ data: { user: { email: 'intruso@exemplo.com' } }, error: null }), from: (tab) => tab === 'admins' ? { data: null } : {} });
  t('não-administrador não consegue aprovar (sem convite, sem conta)', r.status === 403 && !escreveu(r.b)); }
{ const r = await roda({ acao: 'listar' }, base()); const a = tabela(r.b, 'admins')[0]; t('a conferência de administrador usa o e-mail em minúsculas', a && eqDe(a.ops, 'email') === 'adm@exemplo.com', JSON.stringify(a?.ops)); }
{ const r = await roda(null, base(), { headers: cab, bruto: '{quebrado' }); t('corpo inválido cai em "acao_invalida" (400) sem gravar nada', r.status === 400 && r.j.error === 'acao_invalida' && !escreveu(r.b)); }
{ const r = await roda({ acao: 'apagar-tudo' }); t('ação desconhecida: 400 "acao_invalida"', r.status === 400 && r.j.error === 'acao_invalida' && !escreveu(r.b)); }

// --- listar
{ const antes = Date.now();
  const r = await roda({ acao: 'listar' }, base({ from: (tab, ops) => {
    if (tab === 'pedidos_acesso' && tem(ops, 'select') && eqDe(ops, 'status') === 'pendente') return { data: [pedido({ nascimento: '2000-01-01', menor: false }), pedido({ id: 'b', nome: 'Pedro', email: 'pedro@exemplo.com', nascimento: '2012-06-15', menor: true, email_responsavel: 'mae@exemplo.com' })] };
    if (tab === 'pedidos_acesso' && tem(ops, 'select')) return { data: [{ id: 'c', nome: 'Ana', email: 'ana@exemplo.com', status: 'aprovado', decidido_em: '2026-11-20T10:00:00Z' }] };
  } }));
  t('listar: 200 com pendentes e recentes', r.status === 200 && r.j.ok === true && r.j.pendentes.length === 2 && r.j.recentes.length === 1, JSON.stringify(r.j).slice(0, 200));
  const p0 = r.j.pendentes[0]; const p1 = r.j.pendentes[1];
  t('cada pendente leva idade calculada e não leva a data de nascimento', typeof p0.idade === 'number' && p0.idade >= 25 && !('nascimento' in p0), JSON.stringify(p0));
  t('menor aparece com o e-mail do responsável', p1.menor === true && p1.email_responsavel === 'mae@exemplo.com' && p1.idade < 18, JSON.stringify(p1));
  const dels = tabela(r.b, 'pedidos_acesso').filter((c) => tem(c.ops, 'delete'));
  t('listar apaga dados antigos: decididos há mais de 30 dias e pendentes com mais de 90', dels.length === 2, dels.length);
  const dDec = dels.find((c) => tem(c.ops, 'neq')); const dPen = dels.find((c) => eqDe(c.ops, 'status') === 'pendente');
  const lt = (c) => c?.ops.find((o) => o[0] === 'lt');
  const dias = (iso) => Math.round((antes - Date.parse(iso)) / 86400_000);
  t('limpeza dos decididos: status ≠ pendente e decidido_em < 30 dias atrás', dDec && lt(dDec)[1] === 'decidido_em' && dias(lt(dDec)[2]) === 30 && dDec.ops.find((o) => o[0] === 'neq')[2] === 'pendente', JSON.stringify(dDec?.ops));
  t('limpeza dos pendentes: criado_em < 90 dias atrás', dPen && lt(dPen)[1] === 'criado_em' && dias(lt(dPen)[2]) === 90, JSON.stringify(dPen?.ops));
  const sel = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'select') && eqDe(c.ops, 'status') === 'pendente');
  t('a lista de pendentes é limitada a 100, do mais antigo ao mais novo', sel && sel.ops.find((o) => o[0] === 'limit')[1] === 100 && sel.ops.find((o) => o[0] === 'order')[2]?.ascending === true, JSON.stringify(sel?.ops));
  t('os campos lidos não incluem nada além do necessário (sem "*")', sel && !String(sel.ops.find((o) => o[0] === 'select')[1]).includes('*')); }
{ const r = await roda({ acao: 'listar' }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'select') && eqDe(ops, 'status') === 'pendente' ? { error: { message: 'detalhe interno' } } : undefined }));
  t('falha ao ler os pendentes: 500 "falha_listar" sem vazar o detalhe', r.status === 500 && r.j.error === 'falha_listar' && !JSON.stringify(r.j).includes('detalhe')); }
{ const r = await roda({ acao: 'listar' }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'select') ? { data: null } : undefined })); t('listas vazias (data nulo): 200 com listas vazias', r.status === 200 && Array.isArray(r.j.pendentes) && r.j.pendentes.length === 0 && Array.isArray(r.j.recentes) && r.j.recentes.length === 0); }

// --- validação do id
for (const [nome, id] of [['sem id', undefined], ['id curto', 'abc'], ['id com letras fora de hex', 'zzze4567-e89b-12d3-a456-426614174000'], ['id em maiúsculas', ID.toUpperCase()], ['id numérico', 123], ['id com SQL', "123e4567-e89b-12d3-a456-4266141740'; --"]]) {
  const r = await roda({ acao: 'aprovar', id }); t('aprovar com ' + nome + ': 400 "acao_invalida", nada gravado', r.status === 400 && r.j.error === 'acao_invalida' && !escreveu(r.b) && tabela(r.b, 'pedidos_acesso').length === 0, JSON.stringify(r.j)); }

// --- pedido que não existe / já decidido
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'maybeSingle') ? { data: null } : undefined }));
  t('pedido inexistente (ou já decidido): 404', r.status === 404 && r.j.error === 'pedido_nao_encontrado' && !escreveu(r.b));
  const l = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'maybeSingle'));
  t('a busca do pedido filtra por id e por status "pendente" (não decide duas vezes)', l && eqDe(l.ops, 'id') === ID && eqDe(l.ops, 'status') === 'pendente', JSON.stringify(l?.ops)); }
{ const r = await roda({ acao: 'recusar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'maybeSingle') ? { data: null } : undefined })); t('recusar um pedido já decidido: 404', r.status === 404 && !escreveu(r.b)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'maybeSingle') ? { error: { message: 'x' } } : undefined })); t('falha ao ler o pedido: 500 "falha_ler"', r.status === 500 && r.j.error === 'falha_ler' && !escreveu(r.b)); }

// --- recusar
{ const r = await roda({ acao: 'recusar', id: ID });
  const up = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'update')); const campos = up?.ops.find((o) => o[0] === 'update')[1];
  t('recusar: 200 e marca o pedido como "recusado", por quem decidiu (e-mail em minúsculas)', r.status === 200 && r.j.ok === true && campos?.status === 'recusado' && campos?.decidido_por === 'adm@exemplo.com' && !!campos?.decidido_em, JSON.stringify(campos));
  t('a atualização é só deste pedido (eq id)', up && eqDe(up.ops, 'id') === ID);
  t('recusar não cria conta nem convida ninguém', r.b.calls.every((c) => !['createUser', 'inviteUserByEmail'].includes(c.tipo)) && !r.b.calls.some((c) => c.tipo === 'rpc')); }
{ const r = await roda({ acao: 'recusar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'update') ? { error: { message: 'x' } } : undefined })); t('recusar com falha ao gravar: 500 "falha_gravar"', r.status === 500 && r.j.error === 'falha_gravar'); }

// --- aprovar
{ const r = await roda({ acao: 'aprovar', id: ID });
  const inv = r.b.calls.find((c) => c.tipo === 'inviteUserByEmail'); const up = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'update')); const campos = up?.ops.find((o) => o[0] === 'update')[1];
  t('aprovar (e-mail novo): convida por e-mail e responde email_enviado=true', r.status === 200 && r.j.ok === true && r.j.email_enviado === true && r.j.ja_existia === false && inv && inv.e === 'maria@exemplo.com', JSON.stringify(r.j));
  t('o convite leva o nome e a marca de menor como metadados, e volta para o site', inv && inv.o.data.nome === 'Maria Souza' && inv.o.data.menor === false && inv.o.redirectTo === 'https://new-game-mais.sombrasplays.workers.dev/', JSON.stringify(inv?.o));
  t('depois do convite, o pedido fica "aprovado" com quem decidiu', campos?.status === 'aprovado' && campos?.decidido_por === 'adm@exemplo.com' && !!campos?.decidido_em, JSON.stringify(campos));
  t('nesse caminho não cria a conta à mão', r.b.calls.every((c) => c.tipo !== 'createUser'));
  const rp = r.b.calls.find((c) => c.tipo === 'rpc'); t('antes de convidar, consulta se a conta já existe (usuario_existe)', rp && rp.nome === 'usuario_existe' && rp.args.p_email === 'maria@exemplo.com', JSON.stringify(rp)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'maybeSingle') ? { data: pedido({ nome: 'Pedro', email: 'pedro@exemplo.com', menor: true, email_responsavel: 'mae@exemplo.com' }) } : undefined }));
  const inv = r.b.calls.find((c) => c.tipo === 'inviteUserByEmail'); t('aprovar menor: o convite leva menor=true nos metadados', inv && inv.o.data.menor === true && inv.o.data.nome === 'Pedro', JSON.stringify(inv?.o)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ rpc: () => ({ data: true }) }));
  const up = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'update'));
  t('conta já existe: não convida nem cria; responde ja_existia=true e ainda marca aprovado', r.status === 200 && r.j.ja_existia === true && r.j.email_enviado === false && r.b.calls.every((c) => !['createUser', 'inviteUserByEmail'].includes(c.tipo)) && up?.ops.find((o) => o[0] === 'update')[1].status === 'aprovado', JSON.stringify(r.j)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ admin: { inviteUserByEmail: () => ({ error: { message: 'smtp fora do ar' } }) } }));
  const cu = r.b.calls.find((c) => c.tipo === 'createUser'); const up = tabela(r.b, 'pedidos_acesso').find((c) => tem(c.ops, 'update'));
  t('e-mail de convite falhou: cria a conta mesmo assim (confirmada, com metadados) e responde email_enviado=false', r.status === 200 && r.j.ok === true && r.j.email_enviado === false && cu && cu.a.email === 'maria@exemplo.com' && cu.a.email_confirm === true && cu.a.user_metadata.nome === 'Maria Souza', JSON.stringify(r.j));
  t('mesmo assim o pedido vira "aprovado"', up?.ops.find((o) => o[0] === 'update')[1].status === 'aprovado'); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ admin: { inviteUserByEmail: () => ({ error: { message: 'x' } }), createUser: () => ({ error: { message: 'duplicado' } }) } }));
  t('convite e criação falharam: 500 "falha_criar_conta" e o pedido continua pendente', r.status === 500 && r.j.error === 'falha_criar_conta' && !tabela(r.b, 'pedidos_acesso').some((c) => tem(c.ops, 'update')), JSON.stringify(r.j)); }
{ const r = await roda({ acao: 'aprovar', id: ID }, base({ from: (tab, ops) => tab === 'pedidos_acesso' && tem(ops, 'update') ? { error: { message: 'x' } } : undefined })); t('aprovar com falha ao gravar a decisão: 500 "falha_gravar"', r.status === 500 && r.j.error === 'falha_gravar'); }

// --- chave do servidor
{ const h = await carrega('gerir-acesso', { SUPABASE_SERVICE_ROLE_KEY: undefined, SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_x' }) }); bancoDeMentira(base()); const r = await lê(await h(req({ acao: 'listar' }, { headers: cab }))); t('funciona com a chave nova (SUPABASE_SECRET_KEYS)', r.status === 200); }
fim();
