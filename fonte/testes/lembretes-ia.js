// Lembretes (push) + Treinador IA, contra o Supabase real com usuário descartável (ia-teste@example.test).
// Uso: SP=<pasta com axe> node lembretes-ia.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8791', URL_ = BASE + '/index.html';
const U = { e: 'ia-teste@example.test', p: 'TesteIA#2026x' };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 280) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const D = n => iso(Date.now() - n * 864e5), kD = n => MAP[new Date(D(n) + 'T00:00:00').getDay()];
const S = a => a.map(r => ({ r }));
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Agachamento livre', series: 3, reps: '8-12', metaReps: 30, musculos: ['quadriceps'] }];
const FAKE_PUSH = () => { // simula o serviço de notificações do navegador (o headless não tem acesso ao FCM)
  const fake = { endpoint: 'https://fcm.example.test/send/teste-' + Math.random().toString(36).slice(2), toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' } }; }, unsubscribe: async () => { window.__sub = null; return true; } };
  window.__sub = null; PushManager.prototype.getSubscription = async function () { return window.__sub; }; PushManager.prototype.subscribe = async function () { window.__sub = fake; return fake; };
};
async function abre(b, { perm = true, ua, semPush } = {}) {
  const c = await b.newContext({ viewport: { width: 400, height: 900 }, userAgent: ua });
  await c.addInitScript(([f, sem, perm]) => { try { localStorage.setItem('ng_test_hooks', '1'); } catch (e) {}
    // permissão de notificações simulada (o headless não mostra o pedido): concede ou nega ao tocar em Ativar
    window.__perm = 'default'; try { Object.defineProperty(Notification, 'permission', { get: () => window.__perm }); } catch (e) {} Notification.requestPermission = async () => (window.__perm = perm ? 'granted' : 'denied');
    if (sem) { try { delete window.PushManager; } catch (e) { window.PushManager = undefined; } } else (new Function('return ' + f)())(); }, [FAKE_PUSH.toString(), !!semPush, perm]);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push('PE ' + e.message));
  await p.goto(URL_); await p.waitForSelector('.ng-login', { timeout: 10000 });
  await p.evaluate(async (u) => { const r = await window.ngNuvem.client.auth.signInWithPassword({ email: u.e, password: u.p }); if (r.error) throw new Error(r.error.message); }, U);
  await p.waitForSelector('.ng-login', { state: 'detached', timeout: 20000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
  return { c, p };
}
async function semeia(p, idade) {
  await p.evaluate(async ([idade, exs, hist]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste IA', nomeUsuario: 'ia.teste', sexo: 'M', idade, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: hist[0].iso });
    for (const k of ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    for (const h of hist) await db.doc('checkins/' + h.iso).set(h);
  }, [idade, exs, [
    { iso: D(21), dia: kD(21), cargas: { 'Supino reto': 20, 'Agachamento livre': 40 }, sets: { 0: S([10, 10, 9]), 1: S([10, 10, 10]) }, rpe: { 1: 9 }, progresso: { 0: 29, 1: 30 }, concluido: true },
    { iso: D(14), dia: kD(14), cargas: { 'Supino reto': 22.5, 'Agachamento livre': 40 }, sets: { 0: S([8, 8, 8]), 1: S([10, 10, 10]) }, rpe: { 1: 9 }, progresso: { 0: 24, 1: 30 }, concluido: true },
    { iso: D(7), dia: kD(7), cargas: { 'Supino reto': 22.5, 'Agachamento livre': 40 }, sets: { 0: S([9, 8, 8]), 1: S([10, 10, 10]) }, rpe: { 1: 10 }, progresso: { 0: 25, 1: 30 }, concluido: true }]]);
  await p.waitForTimeout(3000); await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
}
const txt = (p, s) => p.evaluate((s) => (document.querySelector(s) || {}).innerText || '', s);
const cfg = async p => { await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(700); };
const treino = async p => { await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(2200); };
const linhas = p => p.evaluate(async () => { const r = await window.ngNuvem.client.from('push_subs').select('hora,tz,ativo,endpoint'); return r.data || []; });
const meta = p => p.evaluate(async () => { const r = await window.ngNuvem.client.auth.getUser(); return r.data.user.user_metadata; });
(async () => {
  const b = await chromium.launch();
  // ===== A) LEMBRETES =====
  let { c, p } = await abre(b); await semeia(p, 30); await cfg(p);
  t('card "Lembretes de treino" aparece após o login', await p.locator('#cfg-lembretes').isVisible() && /Lembretes de treino/.test(await txt(p, '#cfg-lembretes h2')));
  t('começa desligado: botão "Ativar lembretes"', (await txt(p, '#lem-btn')) === 'Ativar lembretes' && !(await p.locator('#lem-teste').isVisible()));
  await p.selectOption('#lem-hora', '19'); await p.click('#lem-btn'); await p.waitForTimeout(2500);
  let rows = await linhas(p);
  t('ativar grava a inscrição na conta (hora 19, fuso, ativo)', rows.length === 1 && rows[0].hora === 19 && rows[0].ativo === true && /\//.test(rows[0].tz) && /^https:\/\//.test(rows[0].endpoint), JSON.stringify(rows));
  t('botão vira "Desligar lembretes" e aparece o teste', (await txt(p, '#lem-btn')) === 'Desligar lembretes' && await p.locator('#lem-teste').isVisible(), await txt(p, '#lem-info'));
  t('mensagem informa o horário', /19:00/.test(await txt(p, '#lem-info')));
  if (axeSrc) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('#cfg-lembretes', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: card de lembretes sem violações', v.length === 0, v.join(',')); }
  await p.selectOption('#lem-hora', '7'); await p.waitForTimeout(1800); rows = await linhas(p);
  t('trocar o horário atualiza a inscrição', rows.length === 1 && rows[0].hora === 7, JSON.stringify(rows));
  await p.click('#lem-teste'); await p.waitForTimeout(3500);
  t('teste de lembrete responde sem quebrar (chaves ainda não configuradas ou envio feito)', /Ainda não deu|Teste enviado|não chegou|Não consegui/.test(await txt(p, '#lem-info')), await txt(p, '#lem-info'));
  await p.click('#lem-btn'); await p.waitForTimeout(2000); rows = await linhas(p);
  t('desligar remove a inscrição', rows.length === 0 && (await txt(p, '#lem-btn')) === 'Ativar lembretes', JSON.stringify(rows));
  t('sem erros de JS (lembretes)', p.errs.length === 0, p.errs.join('|'));
  // RLS: sem login ninguém lê inscrições
  const anon = await p.evaluate(async () => { const r = await fetch('https://gjoxrgnkwmjvcfiywtcs.supabase.co/rest/v1/push_subs?select=endpoint', { headers: { apikey: 'sb_publishable_vIVq8zRxpaB1FrWGi4U18w_2W3WmAq2' } }); return { s: r.status, b: (await r.text()).slice(0, 80) }; });
  t('RLS: visitante anônimo não lê push_subs', anon.s === 200 && anon.b === '[]' || anon.s >= 400, JSON.stringify(anon));
  // sair remove a inscrição deste aparelho
  await p.selectOption('#lem-hora', '18'); await p.click('#lem-btn'); await p.waitForTimeout(2200);
  rows = await linhas(p); t('(preparo) religou para testar "sair"', rows.length === 1);
  await p.click('#cfg-conta-sair'); await p.waitForSelector('.ng-dlg-box'); await p.click('.ng-dlg [data-r=sair]'); await p.waitForTimeout(3500);
  await c.close();
  ({ c, p } = await abre(b)); rows = await linhas(p); t('"Sair da conta" apagou a inscrição deste aparelho', rows.length === 0, JSON.stringify(rows)); await c.close();
  // permissão negada
  ({ c, p } = await abre(b, { perm: false })); await cfg(p); await p.click('#lem-btn'); await p.waitForTimeout(1500);
  t('sem permissão: mensagem clara e nada gravado', /permiss|bloquead/i.test(await txt(p, '#lem-info')) && (await linhas(p)).length === 0, await txt(p, '#lem-info')); await c.close();
  // iPhone sem app instalado (sem PushManager)
  ({ c, p } = await abre(b, { ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1', semPush: true })); await cfg(p);
  t('iPhone sem app instalado: orienta a instalar e esconde o botão', /instalad|Instalar no celular/.test(await txt(p, '#lem-info')) && await p.locator('#lem-btn').isHidden(), await txt(p, '#lem-info')); await c.close();

  // ===== B) TREINADOR IA =====
  ({ c, p } = await abre(b)); await semeia(p, 30); await treino(p);
  t('bloco "Resumo do treinador (IA)" aparece para adulto com perfil', await p.locator('#treinador-ia').isVisible() && /opcional/.test(await txt(p, '#treinador-ia')));
  t('sem consentimento: botão "Ativar resumo por IA" e nada enviado antes', (await txt(p, '#trn-btn')) === 'Ativar resumo por IA' && !(await p.locator('#trn-revoga').isVisible()));
  let enviados = 0; await p.route('**/functions/v1/treinador', async r => { enviados++; r.fallback(); });
  await p.click('#trn-btn'); await p.waitForSelector('.ng-dlg-box');
  const dl = (await txt(p, '.ng-dlg-box')).replace(/\s+/g, ' ');
  t('diálogo de consentimento: o que é/não é enviado, quem recebe, 30 dias, LGPD, menores', /O que é enviado/.test(dl) && /não é enviado/.test(dl) && /Anthropic/.test(dl) && /30 dias/.test(dl) && /LGPD/.test(dl) && /18 anos/.test(dl));
  if (axeSrc) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: diálogo de consentimento sem violações', v.length === 0, v.join(',')); }
  t('diálogo tem rótulo próprio (não "Política")', (await p.getAttribute('.ng-dlg-box', 'aria-label')) === 'Ativar resumo do treinador por IA');
  await p.click('.ng-dlg [data-r=nao]'); await p.waitForTimeout(800);
  t('"Agora não" não grava consentimento', !((await meta(p)).ia_consent) && (await txt(p, '#trn-btn')) === 'Ativar resumo por IA' && enviados === 0);
  await p.click('#trn-btn'); await p.waitForSelector('.ng-dlg-box'); await p.click('.ng-dlg [data-r=ok]'); await p.waitForTimeout(1800);
  const m1 = await meta(p); t('"Concordo" grava o consentimento v1 na conta', m1.ia_consent && m1.ia_consent.v === 1 && m1.ia_consent.treinador === true && !!m1.ia_consent.em, JSON.stringify(m1.ia_consent));
  t('botão vira "Gerar resumo" e aparece "Desativar IA"', (await txt(p, '#trn-btn')) === 'Gerar resumo' && await p.locator('#trn-revoga').isVisible());
  // servidor real: sem chave ainda -> 503 gracioso (as travas anteriores já passaram)
  await p.unroute('**/functions/v1/treinador');
  await p.click('#trn-btn'); await p.waitForTimeout(4500);
  t('servidor real (sem chave Anthropic ainda): mensagem amigável', /configurado|Tente|Resumo pronto/.test(await txt(p, '#trn-info')), await txt(p, '#trn-info'));
  // resposta simulada: texto puro, sem interpretar HTML
  await p.route('**/functions/v1/treinador', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ texto: 'Bom trabalho no supino. <img src=x onerror=window.__xss=1> Foque em +1 repetição.', restantes: 3 }) }));
  await p.click('#trn-btn'); await p.waitForTimeout(1500);
  t('resposta aparece como texto puro (sem XSS) e mostra restantes', /<img src=x/.test(await txt(p, '#trn-saida')) && !(await p.evaluate(() => window.__xss)) && await p.locator('#trn-saida img').count() === 0 && /restantes hoje: 3/.test(await txt(p, '#trn-info')), await txt(p, '#trn-info'));
  t('aviso "gerado por IA, pode errar" visível ao lado do resultado', await p.locator('#trn-aviso').isVisible());
  if (axeSrc) { const v = await p.evaluate(async () => (await axe.run('#treinador-ia', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: bloco do treinador (com resultado) sem violações', v.length === 0, v.join(',')); }
  let corpo = null; await p.unroute('**/functions/v1/treinador');
  await p.route('**/functions/v1/treinador', async r => { corpo = JSON.parse(r.request().postData() || '{}'); r.fulfill({ status: 429, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ erro: 'limite', codigo: 'limite' }) }); });
  await p.click('#trn-btn'); await p.waitForTimeout(1500);
  t('limite diário (429): mensagem clara', /5 resumos hoje/.test(await txt(p, '#trn-info')), await txt(p, '#trn-info'));
  const js = JSON.stringify(corpo);
  t('o que sai do aparelho NÃO tem nome, e-mail, idade, peso nem fotos', corpo && corpo.resumo && !/Teste IA|ia\.teste|example\.test|nomeCompleto|idade|alturaCm|pesoKg|foto/i.test(js), js.slice(0, 200));
  t('o que sai tem exercícios, volume e sequência', corpo.resumo.exercicios.length >= 2 && corpo.resumo.volume.length >= 1 && typeof corpo.resumo.sequenciaDias === 'number');
  await p.unroute('**/functions/v1/treinador');
  // travas no servidor (HTTP direto)
  const tok = await p.evaluate(async () => (await window.ngNuvem.client.auth.getSession()).data.session.access_token);
  const chama = (body, auth) => p.evaluate(async ([body, auth]) => { const r = await fetch('https://gjoxrgnkwmjvcfiywtcs.supabase.co/functions/v1/treinador', { method: 'POST', headers: Object.assign({ 'content-type': 'application/json', apikey: 'sb_publishable_vIVq8zRxpaB1FrWGi4U18w_2W3WmAq2' }, auth ? { authorization: 'Bearer ' + auth } : {}), body: JSON.stringify(body) }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }, [body, auth]);
  const rSem = await chama({ resumo: {} }, null); t('servidor: sem login → 401', rSem.s === 401, JSON.stringify(rSem));
  const rVazio = await chama({ resumo: { exercicios: [] } }, tok); t('servidor: sem treinos → 422', rVazio.s === 422 && rVazio.j.codigo === 'sem-dados', JSON.stringify(rVazio));
  const rOk = await chama({ resumo: { exercicios: [{ nome: 'Supino', estado: 'estavel', resumo: 'x', sessoes: [] }] } }, tok); t('servidor: com consentimento e adulto passa as travas (sem chave → 503)', rOk.s === 503 && rOk.j.codigo === 'sem-chave', JSON.stringify(rOk));
  // revogar
  await p.click('#trn-revoga'); await p.waitForTimeout(1500);
  const m2 = await meta(p); t('"Desativar IA" revoga o consentimento', m2.ia_consent && m2.ia_consent.v === 0 && m2.ia_consent.treinador === false && (await txt(p, '#trn-btn')) === 'Ativar resumo por IA');
  const tok2 = await p.evaluate(async () => (await window.ngNuvem.client.auth.getSession()).data.session.access_token);
  const rRev = await chama({ resumo: { exercicios: [{ nome: 'Supino', sessoes: [] }] } }, tok2); t('servidor: depois de revogar → 403 sem-consentimento', rRev.s === 403 && rRev.j.codigo === 'sem-consentimento', JSON.stringify(rRev));
  // menor de idade
  await p.evaluate(async () => { const db = await window.claude.use('db'); const cur = (await db.doc('config/perfil').get()).data(); await db.doc('config/perfil').set(Object.assign({}, cur, { idade: 15 })); });
  await p.waitForTimeout(3500); await p.reload(); await p.waitForTimeout(2500); await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); }); await treino(p);
  t('menor de 18: bloco informa indisponibilidade e esconde botões', /menores de 18/.test(await txt(p, '#trn-info')) && await p.locator('#trn-btn').isHidden(), await txt(p, '#trn-info'));
  await p.evaluate(async () => { await window.ngNuvem.client.auth.updateUser({ data: { ia_consent: { v: 1, treinador: true, em: new Date().toISOString() } } }); });
  const tok3 = await p.evaluate(async () => (await window.ngNuvem.client.auth.getSession()).data.session.access_token);
  const rMenor = await chama({ resumo: { exercicios: [{ nome: 'Supino', sessoes: [] }] } }, tok3); t('servidor: menor de 18 com consentimento forjado → 403 idade', rMenor.s === 403 && rMenor.j.codigo === 'idade', JSON.stringify(rMenor));
  t('sem erros de JS (treinador)', p.errs.length === 0, p.errs.join('|'));
  await c.close(); await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
