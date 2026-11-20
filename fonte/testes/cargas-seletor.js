// Cargas — progressão: seletor de exercício do app (folha no celular / painel no computador), dias da semana em abas e cartões por exercício.
// Uso: node cargas-seletor.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 768);
    const erros = []; p.on('pageerror', e => erros.push(String(e)));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('subtab-treino-progresso').click()); await p.waitForTimeout(700);

    // ---- seletor ----
    t(L + 'o <select> nativo fica escondido e o botão do app aparece', await p.evaluate(() => { const s = document.getElementById('carga-chart-select'), bt = document.querySelector('.ngs-btn'); return !!bt && bt.getClientRects().length > 0 && getComputedStyle(s).opacity === '0' && s.getBoundingClientRect().width <= 2; }));
    const antes = await p.evaluate(() => document.getElementById('carga-chart-select').value);
    await p.click('.ngs-btn'); await p.waitForTimeout(450);
    const ab = await p.evaluate(() => ({ camada: !!document.querySelector('.ngs-layer.in'), folha: !!document.querySelector('.ngs-layer.is-sheet'), exp: document.querySelector('.ngs-btn').getAttribute('aria-expanded'), grupos: document.querySelectorAll('.ngs-grupo').length, ops: document.querySelectorAll('.ngs-op').length, busca: !!document.querySelector('.ngs-q'), selMarcada: document.querySelectorAll('.ngs-op[aria-selected="true"]').length, dentro: (() => { const r = document.querySelector('.ngs-panel').getBoundingClientRect(); return r.left >= -1 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1 && r.top >= -1; })() }));
    t(L + 'abre ' + (w < 768 ? 'como folha de baixo' : 'como painel ao lado do botão') + ', com grupos por dia e uma opção marcada', ab.camada && ab.exp === 'true' && ab.grupos >= 1 && ab.ops >= 2 && ab.selMarcada === 1 && (w < 768 ? ab.folha : !ab.folha), JSON.stringify(ab));
    t(L + 'painel cabe na tela', ab.dentro, JSON.stringify(ab));
    // escolhe outro exercício
    const alvo = await p.evaluate(() => { const o = [...document.querySelectorAll('.ngs-op:not([aria-selected="true"])')][0]; return o ? o.dataset.v : null; });
    await p.click('.ngs-op[data-v="' + alvo.replace(/"/g, '\\"') + '"]'); await p.waitForTimeout(450);
    const dep = await p.evaluate(() => ({ v: document.getElementById('carga-chart-select').value, fechou: !document.querySelector('.ngs-layer'), rot: document.querySelector('.ngs-val').textContent.trim(), row: !!document.querySelector('.carga-row.selected') }));
    t(L + 'escolher uma opção grava no <select>, fecha o painel e atualiza o botão e a lista', dep.v === alvo && dep.fechou && dep.rot === alvo && dep.v !== antes && dep.row, JSON.stringify(dep));
    // teclado
    await p.focus('.ngs-btn'); await p.keyboard.press('ArrowDown'); await p.waitForTimeout(400);
    t(L + 'seta para baixo no botão abre o painel', await p.evaluate(() => !!document.querySelector('.ngs-layer.in')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    t(L + 'Esc fecha e devolve o foco ao botão', await p.evaluate(() => !document.querySelector('.ngs-layer') && document.activeElement === document.querySelector('.ngs-btn')));
    // busca (só aparece com muitas opções)
    await p.click('.ngs-btn'); await p.waitForTimeout(400);
    const temBusca = await p.evaluate(() => !!document.querySelector('.ngs-q'));
    if (temBusca) {
      await p.fill('.ngs-q', 'zzzz-nao-existe'); await p.waitForTimeout(150);
      t(L + 'busca sem resultado mostra aviso', await p.evaluate(() => /Nada encontrado/.test(document.querySelector('.ngs-lista').textContent)));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    // fundo escuro clicável fecha (celular)
    if (w < 768) { await p.click('.ngs-btn'); await p.waitForTimeout(400); await p.mouse.click(190, 60); await p.waitForTimeout(400); t(L + 'tocar fora fecha a folha', await p.evaluate(() => !document.querySelector('.ngs-layer'))); }

    // ---- dias da semana ----
    const d = await p.evaluate(() => { const chips = [...document.querySelectorAll('.carga-day')]; const vis = [...document.querySelectorAll('.carga-cat')].filter(x => !x.hidden); return { n: chips.length, sel: chips.filter(x => x.getAttribute('aria-selected') === 'true').length, pain: vis.length, ativos: chips.filter(x => !x.disabled).length, semScroll: document.documentElement.scrollWidth <= innerWidth, w: Math.min(...chips.map(x => Math.round(x.getBoundingClientRect().width))) }; });
    t(L + 'sete abas de dia, uma marcada e um único painel visível', d.n === 7 && d.sel === 1 && d.pain === 1 && d.ativos >= 2, JSON.stringify(d));
    t(L + 'sem rolagem lateral', d.semScroll);
    const outro = await p.evaluate(() => { const c = [...document.querySelectorAll('.carga-day:not(:disabled)')].find(x => x.getAttribute('aria-selected') !== 'true'); c.click(); return c.dataset.cargadia; });
    await p.waitForTimeout(400);
    t(L + 'tocar noutro dia mostra só o painel dele', await p.evaluate(o => { const vis = [...document.querySelectorAll('.carga-cat')].filter(x => !x.hidden); return vis.length === 1 && vis[0].dataset.dia === o; }, outro));
    // texto do chip não estoura
    t(L + 'textos das abas de dia cabem (sem corte)', await p.evaluate(() => [...document.querySelectorAll('.carga-day')].every(x => x.scrollWidth <= x.clientWidth + 1)));
    t(L + 'sem erros de script', erros.length === 0, erros.join(' | '));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
