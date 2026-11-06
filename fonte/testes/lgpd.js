// LGPD — política + exclusão de conta, contra o Supabase real, com usuário descartável. Uso: node lgpd.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const U = { e: 'lgpd-teste@example.test', p: 'TesteLGPD#2026x' };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 400, height: 850 } });
  const p = await c.newPage(); p.errs = [];
  p.on('response', r => { if (r.status() >= 400) p.errs.push('HTTP ' + r.status() + ' ' + r.request().method() + ' ' + r.url().replace(/\?.*/, '').slice(-70)); }); p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
  await p.goto(URL_); await p.waitForSelector('.ng-login', { timeout: 8000 });
  // política a partir do login
  await p.click('#ng-login-pol'); await p.waitForSelector('.ng-dlg-box.longo');
  const pol = (await p.locator('.ng-dlg-box.longo').innerText()).replace(/\s+/g, ' ');
  t('política abre sobre o login e cita LGPD, direitos, Supabase/Cloudflare/Google', /LGPD/.test(pol) && /art\. 18/.test(pol) && /Supabase/.test(pol) && /Cloudflare/.test(pol) && /Gmail/.test(pol));
  t('política tem contato do responsável', /@/.test(pol));
  if (axeSrc) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box.longo', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: política sem violações', v.length === 0, v.join(',')); }
  await p.click('.ng-dlg-box.longo [data-r=fecha]'); t('fechar volta ao login', (await p.locator('.ng-dlg').count()) === 0 && (await p.locator('.ng-login').count()) === 1);
  // login real
  await p.evaluate(async (u) => { const r = await window.ngNuvem.client.auth.signInWithPassword({ email: u.e, password: u.p }); if (r.error) throw new Error(r.error.message); }, U);
  await p.waitForSelector('.ng-login', { state: 'detached', timeout: 15000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
  await p.evaluate(async () => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste LGPD', nomeUsuario: 'lgpd.teste', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao' });
    await db.doc('medicoes/2026-11-01').set({ data: '2026-11-01', pesoKg: 80 });
    // uma foto de verdade no bucket privado
    const sess = (await window.ngNuvem.client.auth.getSession()).data.session;
    const r = await window.ngNuvem.client.storage.from('fotos-progresso').upload(sess.user.id + '/lgpd-foto-1', new Blob(['x'], { type: 'image/jpeg' }), { contentType: 'image/jpeg', upsert: true });
    if (r.error) throw new Error(r.error.message);
  });
  await p.waitForTimeout(3500);
  const antes = await p.evaluate(async () => { const r = await window.ngNuvem.client.from('user_docs').select('path'); const s = (await window.ngNuvem.client.auth.getSession()).data.session; const l = await window.ngNuvem.client.storage.from('fotos-progresso').list(s.user.id); return { docs: r.data.length, fotos: l.data.length }; });
  t('antes: conta tem documentos e 1 foto na nuvem', antes.docs >= 2 && antes.fotos === 1, JSON.stringify(antes));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(600);
  t('Config mostra "Política de privacidade" e "Excluir minha conta e dados"', (await p.locator('#cfg-conta-politica').count()) === 1 && (await p.locator('#cfg-conta-excluir').isVisible()));
  await p.click('#cfg-conta-politica'); await p.waitForSelector('.ng-dlg-box.longo'); await p.click('.ng-dlg-box.longo [data-r=fecha]');
  // exclusão: cancelar na 1ª tela não apaga nada
  await p.click('#cfg-conta-excluir'); await p.waitForSelector('.ng-dlg-box');
  if (axeSrc) { const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: 1ª confirmação sem violações', v.length === 0, v.join(',')); }
  t('foco inicial em "Cancelar" (ação segura)', await p.evaluate(() => /Cancelar/.test(document.activeElement.textContent)));
  await p.click('.ng-dlg [data-r=cancela]');
  t('cancelar não apaga: ainda logado e com dados', (await p.evaluate(async () => (await window.ngNuvem.client.from('user_docs').select('path')).data.length)) >= 2);
  // 2ª confirmação exige digitar EXCLUIR
  await p.click('#cfg-conta-excluir'); await p.click('.ng-dlg [data-r=seguir]'); await p.waitForSelector('#ng-exc-in');
  t('botão "Excluir tudo" começa desativado', await p.locator('[data-r=excluir]').isDisabled());
  await p.fill('#ng-exc-in', 'excluir ontem'); t('texto errado mantém desativado', await p.locator('[data-r=excluir]').isDisabled());
  await p.fill('#ng-exc-in', 'excluir'); t('"excluir" (qualquer caixa) ativa o botão', !(await p.locator('[data-r=excluir]').isDisabled()));
  if (axeSrc) { const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: 2ª confirmação sem violações', v.length === 0, v.join(',')); }
  await p.click('[data-r=excluir]');
  await p.waitForFunction(() => /Conta excluída/.test(document.body.innerText), null, { timeout: 30000 });
  t('mostra "Conta excluída"', true);
  const loc = await p.evaluate(async () => { const dbs = indexedDB.databases ? (await indexedDB.databases()).map(d => d.name) : []; return { dbs, ls: Object.keys(localStorage) }; });
  t('aparelho limpo: sem bancos bff* e sem chaves de sessão', !loc.dbs.some(n => /^bff/.test(n)) && !loc.ls.some(k => /^sb-/.test(k)), JSON.stringify(loc));
  await p.click('.ng-dlg [data-r=ok]'); await p.waitForSelector('.ng-login', { timeout: 15000 });
  t('depois de excluir, volta para a tela de login', true);
  // tentar entrar de novo falha
  const re = await p.evaluate(async (u) => { const r = await window.ngNuvem.client.auth.signInWithPassword({ email: u.e, password: u.p }); return r.error ? r.error.message : 'LOGOU'; }, U);
  t('a conta não existe mais (login falha)', /invalid|credentials/i.test(re), re);
  const esp = p.errs.filter(e => !/^CE Failed to load resource/.test(e) && !/POST .*auth\/v1\/token/.test(e)); t('sem erros inesperados (ignora o login inválido de propósito)', esp.length === 0, esp.join(' | '));
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
