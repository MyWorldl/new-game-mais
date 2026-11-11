// Dieta: clicar nos botões do cardápio NÃO pode mudar a posição da rolagem. Uso: node scroll-dieta.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [400, 800]]) {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    const hoje = iso(Date.now());
    await p.evaluate(async (hoje) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia', criadoEm: '2026-10-01' }); await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 }); }, hoje);
    await p.reload(); await p.waitForTimeout(1800);
    await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-dieta').click(); }); await p.waitForTimeout(700);
    const sels = ['.cdp-day[data-v="3"]', '[data-cdp="jeito"][data-v="vegan"]', '[data-cdp="rotina"][data-v="fora"]', '[data-cdp="restr"][data-v="lactose"]', '[data-cdp="dia"][data-v="1"]', '[data-cdp="jeito"][data-v="omni"]'];
    for (const dy of [0, 400, 900]) {
      await p.evaluate(() => document.querySelector('#cardapio-card').scrollIntoView({ block: 'start' }));
      await p.evaluate(d => window.scrollBy(0, d), dy - 0); await p.waitForTimeout(300);
      for (const s of sels) {
        const el = p.locator(s).first(); if (!(await el.count())) { t(`[${w}] existe ${s}`, false); continue; }
        await el.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250);
        const y0 = await p.evaluate(() => Math.round(scrollY));
        await el.evaluate(e => e.click()); await p.waitForTimeout(500);   // clique do DOM: sem a rolagem automática do Playwright
        const y1 = await p.evaluate(() => Math.round(scrollY));
        t(`[${w}px] clicar ${s} não muda a rolagem`, Math.abs(y1 - y0) <= 3, y0 + ' -> ' + y1);
      }
    }
    t(`[${w}] sem erros de JS`, p.errs.length === 0, p.errs.join('|')); await c.close();
  }

  // salto brusco para cima logo depois de um clique (Safari): é desfeito; rolar de propósito não é bloqueado
  {
    const c = await b.newContext({ viewport: { width: 1440, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia', criadoEm: '2026-10-01' }); const x = new Date(); const hj = x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); await db.doc('medicoes/' + hj).set({ data: hj, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 }); });
    await p.reload(); await p.waitForTimeout(1800); await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-dieta').click(); }); await p.waitForTimeout(600);
    const alvoY = await p.evaluate(() => { window.scrollTo(0, 700); const b = document.querySelector('#cardapio-body .cdp-day'); b.id = 'bt-salto'; b.addEventListener('click', () => setTimeout(() => window.scrollTo(0, 130), 40)); b.scrollIntoView({ block: 'center' }); return Math.round(scrollY); });
    await p.waitForTimeout(250);
    const y0 = await p.evaluate(() => Math.round(scrollY));
    await p.evaluate(() => document.getElementById('bt-salto').click()); await p.waitForTimeout(500);
    const y1 = await p.evaluate(() => Math.round(scrollY));
    t('salto brusco para cima (a 130px do topo) depois do clique é desfeito', Math.abs(y1 - y0) <= 5 && y0 > 300, y0 + ' -> ' + y1);
    await p.evaluate(() => { window.scrollTo(0, 800); }); await p.waitForTimeout(150);
    await p.evaluate(() => { const b = document.querySelector('#cardapio-body .cdp-day'); b.id = 'bt-salto2'; b.addEventListener('click', () => setTimeout(() => window.scrollTo(0, 130), 40)); });
    await p.evaluate(() => document.getElementById('bt-salto2').click()); await p.mouse.wheel(0, -200); await p.waitForTimeout(500);
    const y2 = await p.evaluate(() => Math.round(scrollY));
    t('se a pessoa rola (roda do mouse) logo depois do clique, nada é desfeito', y2 <= 200, y2);
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
