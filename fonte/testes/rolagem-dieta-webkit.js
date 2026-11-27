const { chromium, webkit } = require('playwright');
// Dieta no Safari/WebKit: trocar rotina, jeito de comer ou restrição redesenha a Dieta e a página NÃO pode pular (o WebKit não ancora a rolagem).
// Reproduzido na versão 58: rotina trocada com a página rolada 144 px voltava ao topo (144 -> 0) no WebKit, nunca no Chromium.
// Uso: node rolagem-dieta-webkit.js http://localhost:8791
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 260) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  for (const [nome, tipo] of [['webkit', webkit], ['chromium', chromium]]) {
  const b = await tipo.launch();
  for (const [w, h] of [[1440, 900], [400, 800]]) {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    const hoje = iso(Date.now());
    await p.evaluate(async (hoje) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia', criadoEm: '2026-10-01' }); await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 }); }, hoje);
    await p.reload(); await p.waitForTimeout(1800);
    await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-dieta').click(); }); await p.waitForTimeout(700);
    await p.evaluate(() => document.getElementById('subtab-dieta-cardapio').click()); await p.waitForTimeout(1200);
    { const f = p.locator('[data-form="salvar"]'); if (await f.count()) { await f.evaluate(e => e.click()); await p.waitForTimeout(900); } }
    await p.waitForSelector('[data-cdp-sel="rotina"]', { timeout: 25000 }); await p.waitForTimeout(500);   // com a máquina carregada (CI em fatias) o cardápio demora a montar
    for (const rot of ['corrido', 'marmita', 'budget', 'fora', 'tradicional']) {
      for (const dy of [0, 400, 900]) {
        await p.evaluate(() => document.querySelector('#cardapio-card').scrollIntoView({ block: 'start' }));
        await p.evaluate(d => window.scrollBy(0, d), dy); await p.waitForTimeout(300);
        const el = p.locator('[data-cdp-sel="rotina"]').first();
        await el.evaluate((e, d) => { window.scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 140 + d * 0.3)); }, dy); await p.waitForTimeout(250);
        const y0 = await p.evaluate(() => Math.round(scrollY)); const h0 = await p.evaluate(() => document.documentElement.scrollHeight);
        await el.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, rot); await p.waitForTimeout(600);
        const y1 = await p.evaluate(() => Math.round(scrollY)); const h1 = await p.evaluate(() => document.documentElement.scrollHeight);
        t(`[${nome} ${w}px] rotina "${rot}" com a página rolada ${y0}px: não pula`, Math.abs(y1 - y0) <= 3, y0 + ' -> ' + y1 + ' (altura ' + h0 + ' -> ' + h1 + ')');
      }
    }
    for (const jeito of ['vegan', 'omni']) {
      const el = p.locator('[data-cdp-sel="jeito"]').first();
      await el.evaluate((e) => { window.scrollTo(0, Math.max(0, e.getBoundingClientRect().top + scrollY - 140)); }); await p.waitForTimeout(250);
      const y0 = await p.evaluate(() => Math.round(scrollY));
      await el.evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, jeito); await p.waitForTimeout(600);
      const y1 = await p.evaluate(() => Math.round(scrollY));
      t(`[${nome} ${w}px] jeito "${jeito}" com a página rolada ${y0}px: não pula`, Math.abs(y1 - y0) <= 3, y0 + ' -> ' + y1);
    }
    t(`[${nome} ${w}px] sem erros de JS`, p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  await b.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
