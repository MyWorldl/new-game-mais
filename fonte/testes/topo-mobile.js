// Topo no celular: a área segura (notch) fica DENTRO do topo (sem vão de outra cor acima), o topo é opaco e a faixa de sub-abas gruda logo abaixo.
// Uso: node topo-mobile.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 430]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', true);
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(600);
    // a troca de aba pode deixar a página rolada e o topo recolhido por um instante (rolagem suave): volta ao início e espera assentar
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForFunction(() => !document.querySelector('.topbar').classList.contains('hide'), null, { timeout: 4000 }).catch(() => {}); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const tb = document.querySelector('.topbar'), sn = document.getElementById('subnav-host');
      const rs = getComputedStyle(document.documentElement), ts = getComputedStyle(tb);
      const rt = tb.getBoundingClientRect(), rn = sn.getBoundingClientRect();
      return { sy: Math.round(scrollY), rootPad: rs.paddingTop, topbarTop: ts.top, topbarY: Math.round(rt.top), tbH: Math.round(rt.height), snY: Math.round(rn.top), bg: ts.backgroundColor, alpha: /rgba/.test(ts.backgroundColor) && !/, 1\)/.test(ts.backgroundColor) };
    });
    t(L + 'topo começa no pixel 0 (sem vão acima)', r.topbarY === 0 && r.rootPad === '0px' && r.topbarTop === '0px', JSON.stringify(r));
    t(L + 'topo opaco no celular', !r.alpha, r.bg);
    t(L + 'faixa de sub-abas gruda logo abaixo do topo', r.snY - r.tbH >= 0 && r.snY - r.tbH <= 12, JSON.stringify(r));
    await p.evaluate(() => window.scrollTo(0, 600)); await p.waitForTimeout(500);
    const y = await p.evaluate(() => Math.round(document.querySelector('.topbar').getBoundingClientRect().top));
    t(L + 'ao rolar, o topo continua preso em 0 ou recolhido por completo (nunca no meio)', y === 0 || y < -20, y);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    t(L + 'sem rolagem lateral', sw <= 0, sw);
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
