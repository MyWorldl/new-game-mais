// Fase 4 do redesign v3: grade de hábitos (12 semanas) com células que acendem, % de dias por hábito e semanas seguidas. Uso: node habitos-v3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark');
    await p.setViewportSize({ width: w, height: 800 });
    const L = '[' + w + '] ';
    await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(1500);
    const hg = p.locator('#hab-grade');
    t(L + 'grade: continua com 4 linhas, 12 colunas, semana atual e melhor semana marcadas', (await hg.locator('.hg-row').count()) === 4 && (await hg.locator('.hg-cells').first().locator('.hg-c').count()) === 12 && (await hg.locator('.hg-c.now').count()) === 4 && (await hg.locator('.hg-c.best').count()) === 4);
    // % por hábito
    const pcts = await hg.locator('.hg-pct').evaluateAll(es => es.map(e => ({ t: e.textContent.trim(), a: e.getAttribute('aria-label') })));
    t(L + 'porcentagem: uma por hábito com registro, entre 1% e 100%, com descrição em texto', pcts.length >= 3 && pcts.every(x => /^\d{1,3}%$/.test(x.t) && +x.t.replace('%', '') >= 1 && +x.t.replace('%', '') <= 100 && /Registrou em \d+% dos dias/.test(x.a)), JSON.stringify(pcts));
    // sono é o hábito mais registrado no seed (todos os dias de treino): % maior que o de cárdio
    const mapa = await hg.locator('.hg-row').evaluateAll(es => Object.fromEntries(es.map(e => [e.querySelector('.hg-top b').textContent.trim(), (e.querySelector('.hg-pct') || {}).textContent])));
    t(L + 'porcentagem: faz sentido com os dados (Sono ≥ Cárdio leve)', mapa['Sono'] && mapa['Cárdio leve'] && parseInt(mapa['Sono']) >= parseInt(mapa['Cárdio leve']), JSON.stringify(mapa));
    // semanas seguidas
    const seg = await hg.locator('.hg-st').evaluateAll(es => es.map(e => (e.innerText.match(/Semanas seguidas\s*(\d+)/i) || [])[1]));
    t(L + 'semanas seguidas: aparece em toda linha com registro (número ≥ 1)', seg.length >= 3 && seg.every(n => n && +n >= 1), JSON.stringify(seg));
    // brilho
    const gl = await p.evaluate(() => { const l3 = document.querySelector('#hab-grade .hg-c.l3'), l2 = document.querySelector('#hab-grade .hg-c.l2'), l0 = document.querySelector('#hab-grade .hg-c.l0'); const bs = e => e ? getComputedStyle(e).boxShadow : null; return { l3: bs(l3), l2: bs(l2), l0: bs(l0), n3: !!l3 }; });
    t(L + 'brilho: células com registro (níveis 2 e 3) têm brilho; a vazia não', (!gl.n3 || (gl.l3 && gl.l3 !== 'none')) && (gl.l2 === null || gl.l2 !== 'none') && (gl.l0 === null || gl.l0 === 'none'), JSON.stringify(gl));
    t(L + 'número dentro da célula continua (não depende só do brilho)', await p.evaluate(() => [...document.querySelectorAll('#hab-grade .hg-c.l2, #hab-grade .hg-c.l3')].every(e => /^\d$/.test(e.textContent.trim()))));
    // animação: roda na primeira vez e não repete ao regravar
    const anim1 = await p.evaluate(() => document.getElementById('hab-grade').classList.contains('hg-anim'));
    await p.evaluate(() => { document.getElementById('h-sono').value = '8'; document.getElementById('h-sono').dispatchEvent(new Event('input', { bubbles: true })); document.querySelector('#form-habitos button[type=submit]').click(); }); await p.waitForTimeout(1200);
    const anim2 = await p.evaluate(() => document.getElementById('hab-grade').classList.contains('hg-anim'));
    t(L + 'animação de acender: só na primeira vez (não repete ao salvar)', anim1 === true && anim2 === false, anim1 + '/' + anim2);
    t(L + 'sem rolagem horizontal na grade', await p.evaluate(() => { const e = document.getElementById('hab-grade'); return e.scrollWidth <= e.clientWidth + 1 && document.documentElement.scrollWidth <= innerWidth + 1; }));
    t(L + 'sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  // movimento reduzido: sem animação visível
  {
    const c = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
    const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1500);
    const d = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dur-slow').trim());
    t('movimento reduzido: duração da animação das células cai para ~0', /^(\.01|0\.01)ms$/.test(d) || d === '0ms', d);
    await c.close();
  }
  // contraste da grade em cada paleta e em pastel claro
  if (axeSrc) {
    const cenas = [['Lima', async p => {}], ['Violeta', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-paleta="violeta"]').click()); }], ['Ouro', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-paleta="ouro"]').click()); }], ['roxo pastel claro', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-tema="roxo"]').click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#theme-modo-seg [data-v="claro"]').click()); }], ['azul pastel escuro', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-tema="azul"]').click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#theme-modo-seg [data-v="escuro"]').click()); }]];
    for (const [nome, fn] of cenas) {
      const { c, p } = await abre(b, 390, 'dark');
      await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(600);
      await fn(p); await p.waitForTimeout(1200);
      await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(1800);
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('hab-grade'), { runOnly: ['color-contrast', 'aria-valid-attr-value', 'aria-allowed-role', 'aria-allowed-attr', 'listitem', 'list'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' ') + ' :: ' + (n.any[0] && n.any[0].message || '')).slice(0, 4)); });
      t('axe na grade de hábitos (' + nome + '): sem violações', v.length === 0, v.join(' | '));
      await c.close();
    }
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
