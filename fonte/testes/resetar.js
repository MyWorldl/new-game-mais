// Resetar meus dados (mantém a conta) — contra o Supabase real, com usuário descartável. Uso: node resetar.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const U = { e: 'reset-teste@example.test', p: 'TesteReset#2026x' };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 400, height: 850 }, acceptDownloads: true });
  const p = await c.newPage(); p.errs = [];
  p.on('response', r => { if (r.status() >= 400) p.errs.push('HTTP ' + r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/\?.*/, '').slice(-70)); }); p.on('pageerror', e => p.errs.push('PE ' + e.message));
  await p.goto(URL_); await p.waitForSelector('.ng-login', { timeout: 8000 });
  await p.evaluate(async (u) => { const r = await window.ngNuvem.client.auth.signInWithPassword({ email: u.e, password: u.p }); if (r.error) throw new Error(r.error.message); }, U);
  await p.waitForSelector('.ng-login', { state: 'detached', timeout: 15000 }); await p.waitForTimeout(2500);
  if (axeSrc) await p.addScriptTag({ content: axeSrc });
  const liberaTela = () => p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
  await liberaTela();

  const semear = async (comPerfil = true) => p.evaluate(async (cp) => {
    const db = await window.claude.use('db');
    if (cp) await db.doc('config/perfil').set({ nomeCompleto: 'Teste Reset', nomeUsuario: 'reset.teste', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao' });
    await db.doc('medicoes/2026-11-01').set({ data: '2026-11-01', pesoKg: 80 });
    await db.doc('medicoes/2026-11-02').set({ data: '2026-11-02', pesoKg: 79.5 });
    await db.doc('checkins/2026-11-03').set({ data: '2026-11-03', concluido: true });
    const sess = (await window.ngNuvem.client.auth.getSession()).data.session;
    for (const n of ['rst-foto-1', 'rst-foto-2', 'rst-foto-3']) {
      const r = await window.ngNuvem.client.storage.from('fotos-progresso').upload(sess.user.id + '/' + n, new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true });
      if (r.error) throw new Error(r.error.message);
    }
  }, comPerfil);
  const nuvem = () => p.evaluate(async () => {
    const cl = window.ngNuvem.client, s = (await cl.auth.getSession()).data.session;
    const r = await cl.from('user_docs').select('path'); const l = await cl.storage.from('fotos-progresso').list(s.user.id, { limit: 100 });
    return { paths: (r.data || []).map(x => x.path).sort(), fotos: (l.data || []).filter(o => o.name && o.name[0] !== '.').length, logado: !!s };
  });

  await semear(); await p.waitForTimeout(3500);
  let n0 = await nuvem();
  t('antes: nuvem tem perfil + medições + check-in e 3 fotos', n0.paths.length >= 4 && n0.fotos === 3, JSON.stringify(n0));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(600);
  const btn = p.locator('#cfg-conta-resetar');
  t('Config mostra "Resetar meus dados" (visível) ao lado de política e antes de excluir', (await btn.isVisible()) && /Resetar meus dados/.test(await btn.innerText()) && (await p.locator('#cfg-conta-excluir').isVisible()));
  t('há texto explicando a diferença entre resetar e excluir', /mantém a conta/.test(await p.locator('#cfg-conta').innerText()));

  // 1ª tela
  await btn.click(); await p.waitForSelector('.ng-dlg-box');
  const tx1 = (await p.locator('.ng-dlg-box').innerText()).replace(/\s+/g, ' ');
  t('1ª tela explica o que apaga, que a conta continua e que não dá para desfazer', /apaga para sempre/.test(tx1) && /conta continua/i.test(tx1) && /Não dá para desfazer/.test(tx1) && /XP/.test(tx1), tx1.slice(0, 120));
  if (axeSrc) { const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: 1ª tela sem violações', v.length === 0, v.join(',')); }
  t('checkbox "Manter meu perfil" começa desmarcado', !(await p.locator('.ng-dlg-box input[type=checkbox]').isChecked()));
  // marca "manter" e baixa o backup: a tela volta com a escolha preservada
  await p.locator('.ng-dlg-box input[type=checkbox]').check();
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 10000 }), p.click('.ng-dlg [data-r=backup]')]);
  t('"Baixar backup antes" baixa o .json do app', /^ng-mais-dados-.*\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  await p.waitForSelector('.ng-dlg-box'); await p.waitForTimeout(300);
  t('depois do backup a tela volta e a escolha "manter perfil" foi preservada', await p.locator('.ng-dlg-box input[type=checkbox]').isChecked());
  // cancelar não apaga
  await p.click('.ng-dlg [data-r=cancela]');
  n0 = await nuvem(); t('cancelar não apaga nada', n0.paths.length >= 4 && n0.fotos === 3, JSON.stringify(n0));

  // 2ª tela: precisa digitar RESETAR
  await btn.click(); await p.locator('.ng-dlg-box input[type=checkbox]').check(); await p.click('.ng-dlg [data-r=seguir]'); await p.waitForSelector('#ng-rst-in');
  t('botão "Resetar tudo" começa desativado', await p.locator('[data-r=resetar]').isDisabled());
  await p.fill('#ng-rst-in', 'resetar depois'); t('texto errado mantém desativado', await p.locator('[data-r=resetar]').isDisabled());
  await p.fill('#ng-rst-in', 'resetar'); t('"resetar" (qualquer caixa) ativa o botão', !(await p.locator('[data-r=resetar]').isDisabled()));
  if (axeSrc) { const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: 2ª tela sem violações', v.length === 0, v.join(',')); }
  await p.click('[data-r=resetar]');
  await p.waitForFunction(() => /Dados resetados/.test(document.body.innerText), null, { timeout: 30000 });
  t('mostra "Dados resetados" (menos o perfil)', /menos o seu perfil/.test(await p.locator('.ng-dlg-box').innerText()));
  const n1 = await nuvem();
  t('MANTER PERFIL — nuvem: só sobrou config/perfil e 0 fotos; sessão intacta', n1.paths.length === 1 && n1.paths[0] === 'config/perfil' && n1.fotos === 0 && n1.logado, JSON.stringify(n1));
  const loc1 = await p.evaluate(async () => ({ dbs: indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : [], ls: Object.keys(localStorage) }));
  t('aparelho: banco local da conta e o banco antigo "bff" apagados; chave de login mantida', !loc1.dbs.some(n => /^bff/.test(n)) && loc1.ls.some(k => /^sb-/.test(k)), JSON.stringify(loc1));
  await p.click('.ng-dlg [data-r=ok]'); await p.waitForLoadState('load'); await p.waitForTimeout(4000);
  t('depois de recarregar: continua logado (sem tela de login)', (await p.locator('.ng-login').count()) === 0);
  const pf = await p.evaluate(() => window.ngApp && window.ngApp.perfilCarregado());
  t('perfil mantido voltou da nuvem e histórico começou vazio', pf === true && (await p.evaluate(async () => { const db = await window.claude.use('db'); const s = await db.collection('medicoes').get(); return s.size === 0 || (s.docs || []).length === 0; })));

  // reset completo (sem manter perfil)
  await liberaTela(); await semear(false); await p.waitForTimeout(3500);
  const n2 = await nuvem(); t('antes do reset completo: há medições/check-in e 3 fotos', n2.paths.length >= 4 && n2.fotos === 3, JSON.stringify(n2));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(600);
  await p.click('#cfg-conta-resetar'); await p.click('.ng-dlg [data-r=seguir]'); await p.waitForSelector('#ng-rst-in'); await p.fill('#ng-rst-in', 'RESETAR'); await p.click('[data-r=resetar]');
  await p.waitForFunction(() => /Dados resetados/.test(document.body.innerText), null, { timeout: 30000 });
  const n3 = await nuvem();
  t('RESET COMPLETO — nuvem: 0 registros e 0 fotos; sessão intacta', n3.paths.length === 0 && n3.fotos === 0 && n3.logado, JSON.stringify(n3));
  await p.click('.ng-dlg [data-r=ok]'); await p.waitForLoadState('load'); await p.waitForTimeout(4000);
  t('depois de recarregar: logado e app volta ao cadastro inicial (sem perfil)', (await p.locator('.ng-login').count()) === 0 && (await p.evaluate(() => window.ngApp && window.ngApp.perfilCarregado())) === false);
  const conta = await p.evaluate(async () => { const r = await window.ngNuvem.client.auth.getUser(); return r.data && r.data.user && r.data.user.email; });
  t('a conta continua existindo', conta === U.e, conta);
  const nf = await nuvem(); t('nada ressuscitou na nuvem depois de recarregar', nf.paths.length === 0 && nf.fotos === 0, JSON.stringify(nf));
  const esp = p.errs.filter(e => !/^CE Failed to load resource/.test(e)); t('sem erros inesperados de rede/JS', esp.length === 0, esp.join(' | '));
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
