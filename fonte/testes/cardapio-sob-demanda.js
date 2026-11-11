// Teste do CARREGAMENTO SOB DEMANDA do cardápio (item 10, passo 4). Uso: node cardapio-sob-demanda.js http://localhost:8791
// O módulo cardapio.<hash>.js só deve ser baixado quando a aba Dieta o desenha; deve vir com cache immutable, estar no pré-cache
// do service worker (funciona offline) e, se o download falhar, a Dieta mostra um aviso com botão "Tentar de novo".
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8765';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const errs = [], reqs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CE ' + m.text()); });
  p.on('response', r => { if (/\/cardapio\.[0-9a-f]+\.js$/.test(r.url())) reqs.push({ url: r.url(), status: r.status(), cc: r.headers()['cache-control'], ct: r.headers()['content-type'] }); });
  await p.goto(BASE + '/index.html'); await p.waitForTimeout(1200);
  const hoje = iso(Date.now());
  await p.evaluate(async (hoje) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.cd', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, criadoEm: hoje });
    await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
  }, hoje);
  await p.reload(); await p.waitForTimeout(1800);

  // 1) fora da Dieta o módulo não é baixado
  const baixou = () => p.evaluate(() => performance.getEntriesByType('resource').some(r => /\/cardapio\.[0-9a-f]+\.js/.test(r.name)));
  t('abertura do app: módulo do cardápio NÃO foi baixado', !(await baixou()) && reqs.length === 0);
  await p.click('#tab-treino'); await p.waitForTimeout(500);
  t('outra aba (Treino): continua sem baixar', !(await baixou()));

  // 2) abrir a Dieta baixa o módulo uma vez e mostra o cardápio
  await p.click('#tab-dieta'); await p.waitForSelector('.cdp-day', { timeout: 6000 });
  t('Dieta: cardápio apareceu (7 dias)', await p.locator('.cdp-day').count() === 7);
  t('Dieta: módulo baixado (status 200)', reqs.length >= 1 && reqs[0].status === 200, JSON.stringify(reqs[0] || {}));
  t('módulo com cache immutable de 1 ano', !!reqs[0] && /immutable/.test(reqs[0].cc || '') && /max-age=31536000/.test(reqs[0].cc || ''));
  t('módulo servido como JavaScript', !!reqs[0] && /javascript/.test(reqs[0].ct || ''));
  const n1 = reqs.length;
  await p.click('#tab-painel'); await p.waitForTimeout(300); await p.click('#tab-dieta'); await p.waitForTimeout(500);
  t('voltar à Dieta não baixa de novo', reqs.length === n1);
  await p.click('.cdp-day[data-v="3"]'); await p.waitForTimeout(250);
  t('cardápio funciona depois de carregado (dia 4)', await p.locator('.cdp-day.on').getAttribute('data-v') === '3');

  // 3) o service worker guardou o módulo na instalação (offline)
  await p.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || true, null, { timeout: 3000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const emCache = await p.evaluate(async () => { const nomes = await caches.keys(); for (const n of nomes) { const c = await caches.open(n); const ks = await c.keys(); if (ks.some(k => /\/cardapio\.[0-9a-f]+\.js$/.test(k.url))) return true; } return false; });
  t('módulo está no cache do service worker', emCache);

  // 4) falha de download: aviso claro, sem erro de JS, e nova tentativa ao reabrir a Dieta
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx2.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); } catch (e) {} });
  const q = await ctx2.newPage(); q.setDefaultTimeout(8000);
  const errs2 = []; q.on('pageerror', e => errs2.push('PE ' + e.message));
  let bloquear = true;
  await q.route(/\/cardapio\.[0-9a-f]+\.js$/, r => bloquear ? r.abort('failed') : r.continue());
  await q.goto(BASE + '/index.html'); await q.waitForTimeout(1200);
  await q.evaluate(async (hoje) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.cd', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, criadoEm: hoje });
    await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
  }, hoje);
  await q.reload(); await q.waitForTimeout(1800);
  await q.click('#tab-dieta'); await q.waitForTimeout(1500);
  const msg = await q.evaluate(() => (document.getElementById('cardapio-body') || {}).innerText || '');
  t('falha de rede: aviso claro no lugar do cardápio, com botão "Tentar de novo"', /Não foi possível carregar o cardápio/.test(msg) && await q.locator('[data-cdp-retry]').count() === 1);
  t('falha de rede: o resto da Dieta segue funcionando', await q.locator('#cardapio-card').count() === 1 && await q.locator('#tab-dieta').count() === 1);
  t('falha de rede: nenhum erro de JS não tratado', errs2.length === 0, errs2.slice(0, 2).join(' | '));
  bloquear = false;
  await q.click('[data-cdp-retry]'); await q.waitForSelector('.cdp-day', { timeout: 6000 }).catch(() => {});
  t('rede de volta: "Tentar de novo" carrega o cardápio', await q.locator('.cdp-day').count() === 7);
  t('depois de recuperar o cardápio funciona (dia 3)', await q.locator('.cdp-day[data-v="2"]').click().then(() => true).catch(() => false) && await q.locator('.cdp-day.on').getAttribute('data-v') === '2');

  t('sem erros de JS/CSP no fluxo normal', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`${ok} ok, ${bad} falhas`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
