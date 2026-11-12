// Registro de série em ranking (ouro/prata/bronze/cinza). Uso: node ranking-series.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const hoje = iso(Date.now()), ontem = iso(Date.now() - 864e5);
const kH = MAP[new Date(hoje + 'T00:00:00').getDay()], kO = MAP[new Date(ontem + 'T00:00:00').getDay()];
const exs = [
  { nome: 'Agachamento livre', series: 4, reps: '6-10', metaReps: 32, musculos: ['quadriceps'] },
  { nome: 'Supino reto', series: 4, reps: '6-10', metaReps: 32, musculos: ['peito'] },
  { nome: 'Remada curvada', series: 5, reps: '6-12', metaReps: 40, musculos: ['costas'] },
  { nome: 'Prancha', series: 3, reps: '30-45s', metaReps: 3, musculos: ['core'] },
];
(async () => {
  const b = await chromium.launch();
  for (const modo of ['claro', 'escuro']) {
    const c = await b.newContext({ viewport: { width: 400, height: 900 }, colorScheme: modo === 'escuro' ? 'dark' : 'light' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); } catch (e) { } });
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('PE ' + e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([hoje, ontem, kH, kO, exs]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.rk', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ontem });
      for (const k of new Set([kH, kO])) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    }, [hoje, ontem, kH, kO, exs]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
    const box = i => p.locator('#week-trail-detail .sl[data-sl="' + i + '"]');
    const reg = async (i, vals) => { for (const v of vals) { await box(i).locator('[data-slin]').fill(String(v)); await box(i).locator('[data-slok]').click(); await p.waitForTimeout(220); } };
    const medalhas = async i => box(i).locator('.sl-chip').evaluateAll(els => els.map(e => e.dataset.medalha));
    const cor = async (i, k) => box(i).locator('.sl-chip').nth(k).evaluate(e => getComputedStyle(e).borderTopColor);
    const R = '[' + modo + '] ';
    await reg(0, [12, 12, 10, 10]);
    const m0 = await medalhas(0);
    t(R + '12,12,10,10 → ouro, ouro, prata, prata', JSON.stringify(m0) === '["ouro","ouro","prata","prata"]', JSON.stringify(m0));
    t(R + 'empatados têm exatamente a mesma cor', (await cor(0, 0)) === (await cor(0, 1)) && (await cor(0, 2)) === (await cor(0, 3)));
    t(R + 'ouro, prata e cinza têm cores diferentes entre si', (await cor(0, 0)) !== (await cor(0, 2)));
    await reg(1, [8, 8, 8, 8]);
    const m1 = await medalhas(1);
    t(R + '8,8,8,8 → todas ouro', JSON.stringify(m1) === '["ouro","ouro","ouro","ouro"]', JSON.stringify(m1));
    await reg(2, [12, 11, 10, 9, 8]);
    const m2 = await medalhas(2);
    t(R + '12,11,10,9,8 → ouro, prata, bronze, cinza, cinza', JSON.stringify(m2) === '["ouro","prata","bronze","cinza","cinza"]', JSON.stringify(m2));
    t(R + 'aria-label cita a medalha', /ouro/.test(await box(0).locator('.sl-chip').nth(0).getAttribute('aria-label')) && /bronze/.test(await box(2).locator('.sl-chip').nth(2).getAttribute('aria-label')));
    t(R + 'legenda explica ouro/prata/bronze/demais em texto', /melhor.*2º.*3º.*demais/.test((await box(0).locator('.sl-leg').innerText()).replace(/\s+/g, ' ')));
    // ordem desordenada, série menor primeiro: 8, 12, 10 (+ extra)
    await reg(3, [30, 40, 35]);
    const m3 = await medalhas(3);
    t(R + 'tempo (30,40,35 s) → prata, ouro, bronze', JSON.stringify(m3) === '["bronze","ouro","prata"]', JSON.stringify(m3));
    // editar uma série reordena o ranking
    await box(0).locator('.sl-chip').nth(2).click(); await p.waitForTimeout(250);
    await box(0).locator('[data-slin]').fill('14'); await box(0).locator('[data-slok]').click(); await p.waitForTimeout(300);
    const m0b = await medalhas(0);
    t(R + 'editar 10→14 recalcula: 14 ouro, 12 prata, 10 bronze', JSON.stringify(m0b) === '["prata","prata","ouro","bronze"]', JSON.stringify(m0b));
    if (modo === 'claro') await box(0).scrollIntoViewIfNeeded().catch(() => { });
    await p.screenshot({ path: '/tmp/rank-' + modo + '.png' });
    t(R + 'sem erros de página', errs.length === 0, errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
