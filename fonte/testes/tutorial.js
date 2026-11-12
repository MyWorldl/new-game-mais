// Tutorial (tour guiado logo após o cadastro): balões sobre cada função, Pular, Voltar, Rever em Config, salvo na conta.
// Uso: SP=... node tutorial.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const HOJE = '2026-11-11';
const ex = n => [{ nome: 'Ex ' + n + ' 1', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Ex ' + n + ' 2', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
const R = (nome, ativo = true) => ({ nome, ativo, exercicios: ativo ? ex(nome) : [] });
const ROT = { seg: R('A'), ter: R('B'), qua: R('C'), qui: R('D'), sex: R('E'), sab: R('F'), dom: R('G') };
const PERFIL = { nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', pesoMetaKg: 80, criadoEm: '2026-10-01' };
(async () => {
  const b = await chromium.launch();
  const mk = async ({ settings, w = 390, h = 844 }) => {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.clock.setFixedTime(new Date(HOJE + 'T10:00:00'));
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([rotina, perfil, settings, hoje]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set(perfil);
      for (const [k, d] of Object.entries(rotina)) await db.doc('rotina/' + k).set(d);
      await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
      if (settings) await db.doc('config/settings').set(settings);
    }, [ROT, PERFIL, settings, HOJE]);
    await p.reload(); await p.waitForTimeout(1800);
    return { c, p };
  };
  const tour = p => p.evaluate(() => !!document.getElementById('tour-root'));
  const geo = p => p.evaluate(() => {
    const pop = document.querySelector('.tour-pop'), spot = document.querySelector('.tour-spot');
    const r = pop.getBoundingClientRect(), s = spot.hidden ? null : spot.getBoundingClientRect();
    return { t: document.getElementById('tour-t').textContent, pop: { top: r.top, bottom: r.bottom, left: r.left, right: r.right }, spot: s && { top: s.top, bottom: s.bottom }, vw: document.documentElement.clientWidth, vh: innerHeight };
  });
  const settings = p => p.evaluate(async () => { const db = await window.claude.use('db'); const s = await db.doc('config/settings').get(); return s.exists ? s.data() : null; });

  for (const [w, h] of [[390, 844], [1440, 900]]) {
    const { c, p } = await mk({ settings: { tutorial: { visto: false } }, w, h });
    t(`[${w}] tutorial pendente: o tour abre ao entrar`, await tour(p));
    t(`[${w}] app fica bloqueado durante o tour`, await p.evaluate(() => document.querySelector('.app').inert === true));
    t(`[${w}] o "Como você está hoje?" espera o tour`, (await p.locator('.modal').count()) === 0);
    if (axeSrc && w === 390) {
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => (await axe.run(document.getElementById('tour-root'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
      t('[390] axe sem violações no balão', v.length === 0, v.join(','));
    }
    const n = await p.evaluate(() => document.getElementById('tour-cont').textContent.match(/de (\d+)/)[1] * 1);
    const centro = [], fora = [], sobre = [];
    for (let k = 0; k < n; k++) {
      await p.waitForTimeout(600);
      const g = await geo(p);
      if (g.pop.top < 0 || g.pop.bottom > g.vh + 1 || g.pop.left < 0 || g.pop.right > g.vw + 1) fora.push(g.t);
      if (!g.spot) centro.push(g.t);
      else if (!(g.pop.bottom <= g.spot.top + 1 || g.pop.top >= g.spot.bottom - 1) && g.spot.bottom - g.spot.top < g.vh * 0.6) sobre.push(g.t);
      if (k === 2) { await p.click('[data-tour="voltar"]'); await p.waitForTimeout(600); const g2 = await geo(p); t(`[${w}] Voltar volta um passo`, g2.t !== g.t); await p.click('[data-tour="prox"]'); await p.waitForTimeout(150); }
      if (k < n - 1) await p.click('[data-tour="prox"]');
    }
    t(`[${w}] todos os balões dentro da tela`, fora.length === 0, fora.join(' | '));
    t(`[${w}] balão não cobre a função destacada`, sobre.length === 0, sobre.join(' | '));
    t(`[${w}] só boas-vindas, encerramento e "Seus dados" (sem nuvem no teste) ficam no centro`, centro.every(x => /Bem-vindo|Antes de começar|Seus dados/.test(x)), centro.join(' | '));
    t(`[${w}] último botão diz Concluir`, (await p.locator('[data-tour="prox"]').innerText()) === 'Concluir');
    await p.click('[data-tour="prox"]'); await p.waitForTimeout(700);
    t(`[${w}] concluir fecha o tour e libera o app`, !(await tour(p)) && await p.evaluate(() => !document.querySelector('.app').inert || !!document.querySelector('.modal')));
    t(`[${w}] fica salvo na conta (config/settings)`, await settings(p).then(s => s && s.tutorial && s.tutorial.visto === true), JSON.stringify(await settings(p)));
    t(`[${w}] depois do tour abre o "Como você está hoje?"`, /Como você está hoje\?/.test(await p.evaluate(() => (document.querySelector('.modal') || {}).innerText || '')));
    t(`[${w}] sem erros de JS`, p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  { const { c, p } = await mk({ settings: { tutorial: { visto: true, em: HOJE, v: 1 } } });
    await p.evaluate(() => { localStorage.setItem('ng_recup_pulo', '9999-12-31'); }); await p.reload(); await p.waitForTimeout(1600);
    t('tutorial já visto: não abre de novo', !(await tour(p)));
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(400);
    await p.click('#cfg-tour-btn'); await p.waitForTimeout(400);
    t('"Rever o tutorial" em Config abre o tour', await tour(p));
    await p.click('[data-tour="prox"]'); await p.click('[data-tour="pular"]'); await p.waitForTimeout(500);
    t('"Pular tutorial" fecha na hora e libera o app', !(await tour(p)) && await p.evaluate(() => !document.querySelector('.app').inert));
    await p.click('#tab-config').catch(() => { }); await p.evaluate(() => document.getElementById('tab-config').click()); await p.click('#cfg-tour-btn'); await p.waitForTimeout(300);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    t('Esc também fecha', !(await tour(p))); await c.close(); }
  { const { c, p } = await mk({ settings: null });
    t('conta antiga (sem marcação de tutorial): não abre sozinho', !(await tour(p))); await c.close(); }
  { // cadastro completo de conta nova → tutorial → "Como você está hoje?"
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.clock.setFixedTime(new Date(HOJE + 'T10:00:00'));
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(2000);
    if (await p.locator('#ob-start').count()) { await p.click('#ob-start'); await p.waitForTimeout(300); }
    await p.fill('#ob-idade', '30');
    await p.evaluate(() => ['objetivo', 'experiencia', 'dias', 'local'].forEach(n => { const i = document.querySelector('input[name="ob-' + n + '"]'); if (i) i.closest('label').click(); }));
    await p.click('#ob-next1'); await p.waitForTimeout(400);
    await p.fill('#ob-nome', 'Teste'); await p.fill('#ob-altura', '178'); await p.fill('#ob-peso', '82');
    await p.evaluate(() => { const s = document.getElementById('ob-sexo'); if (!s) return; if (s.tagName === 'SELECT') { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); } else { const r = s.querySelector('input'); if (r) r.closest('label').click(); } });
    await p.click('#ob-next2'); await p.waitForTimeout(500);
    const erroCad = await p.evaluate(() => (document.getElementById('ob-erro') || {}).textContent || '');
    t('cadastro chega ao passo final', await p.locator('#ob-finish').count() === 1, erroCad);
    await p.click('#ob-finish'); await p.waitForTimeout(1200);
    t('logo após o cadastro, o tutorial abre', await tour(p));
    await p.click('[data-tour="pular"]'); await p.waitForTimeout(800);
    const m = await p.evaluate(() => (document.querySelector('.modal') || {}).innerText || '');
    const dia = await p.evaluate(() => { const s = window.__ngTest && window.__ngTest.state(); const k = ['dom','seg','ter','qua','qui','sex','sab'][new Date().getDay()]; return !!(s && s.rotina[k] && s.rotina[k].ativo); });
    t('depois do tutorial: "Como você está hoje?" se hoje for dia de treino', dia ? /Como você está hoje\?/.test(m) : !m, 'treino hoje=' + dia + ' modal=' + m.slice(0, 40));
    t('cadastro + tutorial sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
