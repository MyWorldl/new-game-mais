// Alinhamentos: rótulos que quebram em 2 linhas não desalinham valores (Indicadores) nem caixas (Calculadoras rápidas).
// Uso: node alinhamentos.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 360, 390]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', true);
    await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(700);
    const ind = await p.evaluate(() => {
      const itens = [...document.querySelectorAll('.indic-grid .indic-item')];
      const linhas = {}; itens.forEach(i => { const r = i.getBoundingClientRect(); (linhas[Math.round(r.top)] = linhas[Math.round(r.top)] || []).push(i); });
      return Object.values(linhas).filter(l => l.length > 1).map(l => l.map(i => Math.round(i.querySelector('b').getBoundingClientRect().bottom)));
    });
    t(L + 'Indicadores: valores da mesma linha na mesma altura', ind.every(l => Math.max(...l) - Math.min(...l) <= 1), JSON.stringify(ind));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('subtab-treino-calculadoras').click()); await p.waitForTimeout(600);
    const cal = await p.evaluate(() => [...document.querySelectorAll('.calc-block .field-row')].map(r => { const inp = [...r.querySelectorAll('input')].map(i => Math.round(i.getBoundingClientRect().top)); return inp; }));
    t(L + 'Calculadoras: caixas lado a lado na mesma altura', cal.every(l => Math.max(...l) - Math.min(...l) <= 1), JSON.stringify(cal));
    t(L + 'Calculadoras: sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
