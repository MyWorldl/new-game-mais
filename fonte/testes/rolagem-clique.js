// Salto de rolagem no clique (Safari/WebKit): o foco vai para a seção da tela no mousedown e a página pode pular.
// Simula o salto (scrollingElement.scrollTop, que o app não intercepta) e confere que a guarda devolve; e que rolagem
// pedida pelo app, roda do mouse e foco em campo fora da tela continuam funcionando. Uso: node rolagem-clique.js http://localhost:8791 [webkit]
const pw = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const eng = process.argv[3] === 'webkit' ? pw.webkit : pw.chromium;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const Y = p => p.evaluate(() => Math.round(window.scrollY));
(async () => {
  const b = await eng.launch();
  const c = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async (hoje) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', focos: ['costas'], criadoEm: '2026-10-01' }); await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 80 }); }, iso(Date.now()));
  await p.reload(); await p.waitForTimeout(1800);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-perfil').click(); }); await p.waitForTimeout(800);
  const alt = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  t('tela alta o bastante (' + alt + 'px)', alt > 700, alt);
  const rola = async y => { await p.evaluate(y => document.scrollingElement.scrollTop = y, y); await p.waitForTimeout(200); };

  const vazio = async () => p.evaluate(() => { const v = document.querySelector('.view:not([hidden])'); const r = v.getBoundingClientRect(); return Math.round(r.left + 3); });
  // A) espaço entre os cartões: o "foco" joga a página para o topo no mousedown
  await p.evaluate(() => { window.__salta = null; document.addEventListener('mousedown', () => { if (window.__salta != null) document.scrollingElement.scrollTop = window.__salta; }, true); });
  await rola(500); const y0 = await Y(p);
  await p.evaluate(() => window.__salta = 0);
  await p.mouse.click(await vazio(), 400); await p.waitForTimeout(500);   // espaço vazio dentro da tela (entre cartões/margem interna)
  t('A) clique no espaço vazio com salto para o topo: volta', Math.abs(await Y(p) - y0) <= 3, y0 + ' -> ' + await Y(p));
  await p.evaluate(() => window.__salta = 1500);
  await p.mouse.click(await vazio(), 400); await p.waitForTimeout(500);
  t('A2) salto para BAIXO logo após o toque também volta', Math.abs(await Y(p) - y0) <= 3, y0 + ' -> ' + await Y(p));
  await p.evaluate(() => window.__salta = null);

  // B) botão da tela com salto no mousedown
  await p.evaluate(() => window.__salta = 0);
  const btn = await p.$('#btn-edit-perfil'); await btn.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
  const y1 = await Y(p);
  await btn.click(); await p.waitForTimeout(500);
  t('B) botão com salto no mousedown: a página fica onde estava', Math.abs(await Y(p) - y1) <= 3, y1 + ' -> ' + await Y(p));
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const m = document.getElementById('modal-root'); if (m) { try { m.hidePopover(); } catch (e) { } m.innerHTML = ''; } document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); window.__salta = null; });

  // C) a pessoa rola com a roda do mouse: a guarda não atrapalha
  await p.waitForTimeout(2700);   // sai da janela de guarda do clique anterior
  await rola(300); await p.mouse.move(640, 400); await p.mouse.wheel(0, 250); await p.waitForTimeout(500);
  t('C) roda do mouse rola normalmente', await Y(p) >= 520, await Y(p));

  // D) rolagem pedida pelo próprio app logo depois do clique é respeitada
  await rola(500);
  await p.evaluate(() => { const b = document.createElement('button'); b.id = 'zz-topo'; b.textContent = 'ir ao topo'; b.style.cssText = 'position:fixed;top:300px;left:300px;z-index:9999'; b.onclick = () => window.scrollTo(0, 0); document.body.appendChild(b); });
  await p.click('#zz-topo'); await p.waitForTimeout(500);
  t('D) window.scrollTo do app logo após o clique é respeitado', await Y(p) <= 3, await Y(p));

  // E) focus() sem opções não rola; campo fora da tela é levado à vista
  await rola(400);
  await p.evaluate(() => { const b = document.createElement('button'); b.id = 'zz-fora'; b.textContent = 'fora'; b.style.cssText = 'position:absolute;top:' + (document.scrollingElement.scrollTop + 3000) + 'px;left:20px'; document.body.appendChild(b); const i = document.createElement('input'); i.id = 'zz-campo'; i.style.cssText = 'position:absolute;top:' + (document.scrollingElement.scrollTop + 2000) + 'px;left:20px'; document.body.appendChild(i); });
  const y2 = await Y(p);
  await p.evaluate(() => { const v = document.createElement('button'); v.id = 'zz-visivel'; v.textContent = 'visível'; v.style.cssText = 'position:fixed;top:200px;left:20px;z-index:9999'; document.body.appendChild(v); });
  await p.evaluate(() => document.getElementById('zz-visivel').focus()); await p.waitForTimeout(200);
  t('E) focus() em botão JÁ visível não rola a página', Math.abs(await Y(p) - y2) <= 3, y2 + ' -> ' + await Y(p));
  await p.evaluate(() => document.getElementById('zz-fora').focus()); await p.waitForTimeout(300);
  t('E1) focus() em botão fora da tela leva à vista (ex.: foco devolvido depois de fechar um pop-up)', Math.abs(await Y(p) - y2) > 300, y2 + ' -> ' + await Y(p));
  await p.evaluate(y => document.scrollingElement.scrollTop = y, y2); await p.waitForTimeout(200);
  await p.evaluate(() => document.getElementById('zz-campo').focus()); await p.waitForTimeout(300);
  t('E2) focus() em CAMPO fora da tela leva à vista', Math.abs(await Y(p) - y2) > 300, y2 + ' -> ' + await Y(p));
  t('E3) o campo ficou com o foco', await p.evaluate(() => document.activeElement && document.activeElement.id === 'zz-campo'));

  t('sem erros de JS', p.errs.length === 0, p.errs.join('|'));
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
