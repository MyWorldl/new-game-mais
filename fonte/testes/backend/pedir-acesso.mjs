// Edge Function pedir-acesso (pública): validação, idade, responsável, anti-robô, limites e o que ela grava. Sem rede e sem o Supabase real.
// Uso (na pasta fonte/testes): node --experimental-strip-types --import ./backend/registra.mjs backend/pedir-acesso.mjs
import { carrega, bancoDeMentira, req, lê, placar, ENV } from './harness.mjs';
const { t, fim } = placar();
const hoje = new Date(); const anos = (n, dias = 0) => { const d = new Date(Date.UTC(hoje.getUTCFullYear() - n, hoje.getUTCMonth(), hoje.getUTCDate() - dias)); return d.toISOString().slice(0, 10); };
const valido = (o = {}) => ({ nome: 'Maria Souza', email: 'Maria@Exemplo.com', nascimento: anos(30), aceite: true, ...o });
const roda = async (corpo, regras = {}, env = {}, opcoes) => { const h = await carrega('pedir-acesso', env); const b = bancoDeMentira(regras); const r = await lê(await h(req(corpo, opcoes))); return { ...r, b }; };
const inseriu = (b) => b.calls.filter((c) => c.tipo === 'from' && c.tabela === 'pedidos_acesso' && c.ops.some((o) => o[0] === 'insert'));
const linhaInserida = (b) => inseriu(b)[0]?.ops.find((o) => o[0] === 'insert')[1];

// --- forma da chamada
{ const h = await carrega('pedir-acesso'); bancoDeMentira();
  const o = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://new-game-mais.sombrasplays.workers.dev' } })));
  t('OPTIONS responde 200 com CORS do site', o.status === 200 && o.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const o2 = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'https://malvado.example' } })));
  t('origem desconhecida não é refletida no CORS', o2.h.get('Access-Control-Allow-Origin') === 'https://new-game-mais.sombrasplays.workers.dev');
  const o3 = await lê(await h(req(null, { metodo: 'OPTIONS', headers: { Origin: 'http://localhost:8791' } })));
  t('localhost (desenvolvimento) é aceito no CORS', o3.h.get('Access-Control-Allow-Origin') === 'http://localhost:8791');
  const g = await lê(await h(req(null, { metodo: 'GET' })));
  t('GET é recusado com 405', g.status === 405 && g.j.error === 'method_not_allowed'); }
{ const r = await roda(null, {}, {}, { bruto: 'x'.repeat(4001) }); t('corpo acima de 4000 caracteres: 413', r.status === 413 && r.j.error === 'corpo_grande');
  const j = await roda(null, {}, {}, { bruto: '{nao é json' }); t('JSON inválido: 400', j.status === 400 && j.j.error === 'json_invalido'); }
{ const r = await roda(valido({ site: 'http://spam.example' }));
  t('campo-isca preenchido: finge sucesso e não toca no banco', r.status === 200 && r.j.estado === 'enviado' && r.b.calls.length === 0, JSON.stringify(r.b.calls)); }

// --- validação dos dados
for (const [nome, o, campo] of [['nome curto', { nome: 'A' }, 'nome'], ['nome com < >', { nome: 'Maria <b>' }, 'nome'], ['nome gigante', { nome: 'a'.repeat(81) }, 'nome'], ['nome com quebra de linha', { nome: 'Maria\u0001X' }, 'nome'],
  ['e-mail sem arroba', { email: 'mariaexemplo.com' }, 'email'], ['e-mail com espaço', { email: 'ma ria@exemplo.com' }, 'email'], ['e-mail sem domínio', { email: 'maria@x' }, 'email'], ['e-mail não é texto', { email: 123 }, 'email'],
  ['nascimento em branco', { nascimento: '' }, 'nascimento'], ['nascimento 31/02', { nascimento: '2000-02-31' }, 'nascimento'], ['nascimento no futuro', { nascimento: anos(-1) }, 'nascimento'], ['nascimento com 121 anos', { nascimento: anos(121, 1) }, 'nascimento'], ['nascimento em outro formato', { nascimento: '10/05/2000' }, 'nascimento']]) {
  const r = await roda(valido(o)); t('recusa ' + nome, r.status === 400 && r.j.error === 'dados_invalidos' && r.j.campo === campo && inseriu(r.b).length === 0, JSON.stringify(r.j)); }
{ const r = await roda(valido({ nascimento: anos(12, 0) })); t('12 anos: idade mínima (13)', r.status === 400 && r.j.error === 'idade_minima'); }
{ const r = await roda(valido({ aceite: false })); t('sem aceite da política: recusa', r.status === 400 && r.j.error === 'aceite_obrigatorio'); }
{ const r = await roda(valido({ aceite: 'true' })); t('aceite precisa ser booleano true (texto não vale)', r.status === 400 && r.j.error === 'aceite_obrigatorio'); }

// --- menores de 18
const menor = (o = {}) => valido({ nascimento: anos(15), email_responsavel: 'mae@exemplo.com', aceite_responsavel: true, ...o });
{ const r = await roda(menor({ email_responsavel: '' })); t('menor sem e-mail do responsável: recusa', r.status === 400 && r.j.error === 'responsavel_obrigatorio'); }
{ const r = await roda(menor({ email_responsavel: 'MARIA@exemplo.com' })); t('menor com responsável igual ao próprio e-mail: recusa', r.status === 400 && r.j.error === 'responsavel_obrigatorio'); }
{ const r = await roda(menor({ aceite_responsavel: false })); t('menor sem aceite do responsável: recusa', r.status === 400 && r.j.error === 'aceite_responsavel_obrigatorio'); }
{ const r = await roda(menor()); const l = linhaInserida(r.b);
  t('menor válido: pedido gravado como menor, com o responsável (em minúsculas)', r.status === 200 && r.j.estado === 'enviado' && l && l.menor === true && l.email_responsavel === 'mae@exemplo.com', JSON.stringify(l)); }
{ const r = await roda(valido({ nascimento: anos(18, 0) })); const l = linhaInserida(r.b); t('exatamente 18 anos hoje: adulto (sem responsável)', r.status === 200 && l && l.menor === false && l.email_responsavel === null, JSON.stringify(l)); }
{ const r = await roda(valido({ nascimento: anos(18, -1), email_responsavel: undefined })); t('falta 1 dia para os 18: ainda é menor', r.status === 400 && r.j.error === 'responsavel_obrigatorio', JSON.stringify(r.j)); }

// --- caminho feliz e normalização
{ const r = await roda(valido({ nome: '  Maria   de   Souza  ' })); const l = linhaInserida(r.b);
  t('adulto válido: 200 "enviado"; e-mail em minúsculas, nome com espaços normalizados, sem responsável', r.status === 200 && r.j.estado === 'enviado' && l.email === 'maria@exemplo.com' && l.nome === 'Maria de Souza' && l.menor === false && l.email_responsavel === null, JSON.stringify(l));
  t('a linha gravada não leva campos a mais (só nome, e-mail, nascimento, menor, responsável)', JSON.stringify(Object.keys(l).sort()) === JSON.stringify(['email', 'email_responsavel', 'menor', 'nascimento', 'nome']), Object.keys(l)); }
{ const r = await roda(valido({ status: 'aprovado', decidido_por: 'eu', menor: false })); const l = linhaInserida(r.b); t('o cliente não consegue forçar status/decidido_por/menor no pedido', l && !('status' in l) && !('decidido_por' in l), JSON.stringify(l)); }

// --- já tem conta, duplicado, limite
{ const r = await roda(valido(), { rpc: () => ({ data: true }) }); t('e-mail que já tem conta: "ja_tem_conta" e nada é gravado', r.j.estado === 'ja_tem_conta' && inseriu(r.b).length === 0); }
{ const r = await roda(valido(), { rpc: () => ({ error: { message: 'x' } }) }); t('falha ao consultar a conta: 500 genérico (sem vazar detalhe)', r.status === 500 && r.j.error === 'falha_interna' && !JSON.stringify(r.j).includes('x"')); }
{ const r = await roda(valido(), { from: (tab, ops) => tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'insert') ? { error: { code: '23505' } } : {} }); t('já existe pedido pendente (23505): "ja_pendente"', r.status === 200 && r.j.estado === 'ja_pendente'); }
{ const r = await roda(valido(), { from: (tab, ops) => tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'insert') ? { error: { code: '99999', message: 'segredo interno' } } : {} }); t('outra falha ao gravar: 500 sem detalhe interno', r.status === 500 && r.j.error === 'falha_gravar' && !JSON.stringify(r.j).includes('segredo')); }
{ const r = await roda(valido(), { from: (tab, ops) => tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'select') ? { count: 30 } : {} }); t('30 pedidos na última hora: 429 e nada gravado', r.status === 429 && r.j.error === 'muitos_pedidos' && inseriu(r.b).length === 0); }
{ const r = await roda(valido(), { from: (tab, ops) => tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'select') ? { count: 29 } : {} }); t('29 pedidos na última hora: ainda passa', r.status === 200 && r.j.estado === 'enviado'); }
{ const r = await roda(valido(), { from: (tab, ops) => tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'select') ? { count: 1 } : {} });
  const consulta = r.b.calls.find((c) => c.tabela === 'pedidos_acesso' && c.ops.some((o) => o[0] === 'gte')); const desde = consulta?.ops.find((o) => o[0] === 'gte')[2];
  t('o limite olha só a última hora', desde && Math.abs(Date.now() - 3600_000 - Date.parse(desde)) < 5000, desde); }

// --- administrador: cria a conta direto, sem limite
{ const r = await roda(valido({ email: 'adm@exemplo.com' }), { from: (tab, ops) => tab === 'admins' ? { data: { email: 'adm@exemplo.com' } } : tab === 'pedidos_acesso' && ops.some((o) => o[0] === 'select') ? { count: 999 } : {} });
  const cu = r.b.calls.find((c) => c.tipo === 'createUser'); const l = linhaInserida(r.b);
  t('e-mail de administrador: conta criada direto ("aprovado_auto"), mesmo acima do limite', r.status === 200 && r.j.estado === 'aprovado_auto' && cu && cu.a.email === 'adm@exemplo.com' && cu.a.email_confirm === true, JSON.stringify(r.j));
  t('o pedido do administrador fica registrado como aprovado por "auto-admin"', l && l.status === 'aprovado' && l.decidido_por === 'auto-admin', JSON.stringify(l)); }
{ const r = await roda(valido({ email: 'adm@exemplo.com' }), { from: (tab) => tab === 'admins' ? { data: { email: 'adm@exemplo.com' } } : {}, admin: { createUser: () => ({ error: { message: 'duplicado' } }) } }); t('administrador: falha ao criar a conta vira 500 e não registra aprovação', r.status === 500 && r.j.error === 'falha_criar_conta' && inseriu(r.b).length === 0); }
{ const r = await roda(valido()); t('quem não é administrador nunca cria conta por aqui', r.b.calls.every((c) => c.tipo !== 'createUser' && c.tipo !== 'inviteUserByEmail')); }

// --- anti-robô (Turnstile), quando existe o segredo
const fetchReal = globalThis.fetch;
{ const r = await roda(valido(), {}, { TURNSTILE_SECRET: 's' }); t('com segredo do Turnstile e sem token: 400 "captcha"', r.status === 400 && r.j.error === 'captcha' && r.b.calls.length === 0); }
{ let visto = null; globalThis.fetch = async (u, o) => { visto = { u: String(u), corpo: String(o.body) }; return new Response(JSON.stringify({ success: false })); };
  const r = await roda(valido({ captcha: 'tok' }), {}, { TURNSTILE_SECRET: 's' }); t('token recusado pelo Turnstile: 400 "captcha" e nada é gravado', r.status === 400 && r.j.error === 'captcha' && inseriu(r.b).length === 0);
  t('a conferência vai ao endereço oficial e leva segredo + token', visto && visto.u === 'https://challenges.cloudflare.com/turnstile/v0/siteverify' && /secret=s/.test(visto.corpo) && /response=tok/.test(visto.corpo), JSON.stringify(visto)); }
{ globalThis.fetch = async () => new Response(JSON.stringify({ success: true })); const r = await roda(valido({ captcha: 'tok' }), {}, { TURNSTILE_SECRET: 's' }); t('token aceito: segue o fluxo normal', r.status === 200 && r.j.estado === 'enviado'); }
{ globalThis.fetch = async () => { throw new Error('rede'); }; const r = await roda(valido({ captcha: 'tok' }), {}, { TURNSTILE_SECRET: 's' }); t('Turnstile fora do ar: 503 "captcha_indisponivel" (não deixa passar sem conferir)', r.status === 503 && r.j.error === 'captcha_indisponivel' && inseriu(r.b).length === 0); }
globalThis.fetch = fetchReal;
{ const r = await roda(valido()); t('sem segredo do Turnstile, o captcha não é exigido', r.status === 200); }

// --- chave do servidor
{ const h = await carrega('pedir-acesso', { SUPABASE_SERVICE_ROLE_KEY: undefined, SUPABASE_SECRET_KEYS: JSON.stringify({ default: 'sb_secret_x' }) }); bancoDeMentira(); const r = await lê(await h(req(valido()))); t('funciona com a chave nova (SUPABASE_SECRET_KEYS)', r.status === 200); }
fim();
