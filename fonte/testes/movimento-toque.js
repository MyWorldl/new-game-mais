// Movimento dos controles de uso frequente: sem overshoot (bounce) no repouso, spring só nas comemorações, movimento reduzido respeitado.
// Uso: node movimento-toque.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const ABAS = ['painel', 'treino', 'dieta', 'corpo', 'perfil', 'config'];
const irAba = async (p, a) => { await p.evaluate(a => document.getElementById('tab-' + a).click(), a); await p.waitForTimeout(700); };
// controles tocados com frequência: nenhum pode ter curva com overshoot (y > 1 ou y < 0) em propriedade que anima
const SEL = '.btn, .tab-btn, .biblio-ex-chip, .metric-tab, .seg button, .qc-swap, .cdp-chip, .chip-btn, .carga-row, .bottomnav .more-btn, .btn svg, .bottomnav .tab-btn svg, .bottomnav .more-btn svg';
const varre = (sel) => {
  const ruins = []; let n = 0;
  document.querySelectorAll(sel).forEach(x => {
    const r = x.getBoundingClientRect(); if (!r.width || !r.height) return; n++;
    const cs = getComputedStyle(x);
    const durs = cs.transitionDuration.split(',').map(s => parseFloat(s) * (s.includes('ms') ? 1 : 1000));
    const fns = cs.transitionTimingFunction.match(/cubic-bezier\([^)]+\)|ease-in-out|ease-in|ease-out|ease|linear/g) || [];
    fns.forEach((f, i) => {
      const m = f.match(/cubic-bezier\(([^)]+)\)/); if (!m) return;
      const y = m[1].split(',').map(Number); const d = durs[i % durs.length];
      if (d > 1 && (y[1] > 1 || y[3] > 1 || y[1] < 0 || y[3] < 0)) ruins.push((x.className.baseVal !== undefined ? x.tagName : x.tagName.toLowerCase() + '.' + String(x.className).split(' ').slice(0, 2).join('.')) + ' ' + f);
    });
  });
  return { n, ruins: [...new Set(ruins)].slice(0, 6) };
};
(async () => {
  const b = await chromium.launch();
  // 1) 6 abas: nenhum controle de uso frequente com overshoot
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    let total = 0; const ruins = [];
    for (const a of ABAS) { await irAba(p, a); const r = await p.evaluate(varre, SEL); total += r.n; r.ruins.forEach(x => ruins.push(a + ': ' + x)); }
    t('6 abas: nenhum botão, aba, chip ou ícone de uso frequente com overshoot (' + total + ' controles medidos)', ruins.length === 0 && total > 40, ruins.join(' | '));
    // folha de registro do treino ao vivo
    await irAba(p, 'treino');
    await p.evaluate(() => { const bt = document.querySelector('[data-qtoggle]'); bt && bt.click(); }); await p.waitForTimeout(900);
    const f = await p.evaluate(varre, '.qc-panel button, .qc-panel .btn');
    t('folha de registro: controles sem overshoot', f.n > 5 && f.ruins.length === 0, f.n + ' medidos; ' + f.ruins.join(' | '));
    await c.close();
  }
  // 2) o spring continua onde comemora: amostras de tema mantêm o overshoot (decisão: bounce só em celebração/entrada em cena)
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    await irAba(p, 'config');
    const sw = await p.evaluate(() => { const e = document.querySelector('.skin-swatch'); return e ? getComputedStyle(e).transitionTimingFunction : ''; });
    t('amostras de tema mantêm o spring (identidade de jogo)', /1\.56/.test(sw), sw);
    await c.close();
  }
  // 3) movimento reduzido: esses controles ficam sem transição
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1500);
    await irAba(p, 'config');
    const r = await p.evaluate(sel => { let n = 0, longas = []; document.querySelectorAll(sel).forEach(x => { const r = x.getBoundingClientRect(); if (!r.width) return; n++; const cs = getComputedStyle(x); cs.transitionDuration.split(',').forEach(s => { const ms = parseFloat(s) * (s.includes('ms') ? 1 : 1000); if (ms > 1) longas.push(x.className + ' ' + s); }); }); return { n, longas: longas.slice(0, 4) }; }, SEL);
    t('movimento reduzido: controles sem transição (' + r.n + ' medidos)', r.n > 3 && r.longas.length === 0, r.longas.join(' | '));
    await c.close();
  }
  // 4) foco por teclado na trilha da semana: o anel fica no círculo (o nó em si tem outline:none de propósito)
  {
    const { c, p } = await abre(b, 390, 'dark', false);
    await irAba(p, 'treino'); await p.keyboard.press('Tab');
    const r = await p.evaluate(() => { const n = document.querySelector('.week-trail-node'); n.focus(); const cs = getComputedStyle(n.querySelector('.week-trail-circle')); return { fv: n.matches(':focus-visible'), w: parseFloat(cs.outlineWidth), s: cs.outlineStyle }; });
    t('trilha da semana: anel de foco visível no círculo', r.fv && r.w >= 2 && r.s !== 'none', JSON.stringify(r));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
