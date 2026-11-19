// Tela Hoje: ordem dos cartões (Quest > aviso de treino perdido > patente > Missões) e Missões unificadas (Hoje | Esta semana | Este mês).
// Uso: node missoes-hoje.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark');
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(900);
    const ordem = await p.evaluate(() => ['today-hero', 'hoje-perdido', 'nivel-mini', 'cc-missoes'].map(id => { const e = document.getElementById(id); return e ? e.getBoundingClientRect().top + scrollY + (e.hidden ? 1e6 : 0) : null; }));
    const dom = await p.evaluate(() => { const ids = ['today-hero', 'hoje-perdido', 'nivel-mini', 'cc-missoes', 'plano-porque-hoje', 'hoje-metricas', 'narrator-card', 'cc-semana', 'quick-stats']; const all = [...document.querySelectorAll('#view-painel > *')].map(e => e.id); return ids.map(i => all.indexOf(i)); });
    t(L + 'ordem no DOM: Quest, perdido, patente, Missões, depois o resto', dom.every((v, i) => v >= 0 && (i === 0 || v > dom[i - 1])), JSON.stringify(dom));
    t(L + 'ordem na tela: Quest acima da patente, patente acima das Missões', ordem[0] < ordem[2] && ordem[2] < ordem[3], JSON.stringify(ordem));
    t(L + 'o cartão antigo "Missões de hoje" separado e o "Missões" de baixo viraram um só', await p.evaluate(() => document.querySelectorAll('#cc-missoes').length === 1 && !document.querySelector('section.hoje-missoes') && document.querySelectorAll('#view-painel h2#missoes-t').length === 1 && !/Missões de hoje/.test(document.getElementById('cc-missoes').querySelector('h2').textContent)));
    const tabs = await p.evaluate(() => [...document.querySelectorAll('#chal-tabs button')].map(b => b.textContent.trim() + ':' + b.dataset.scope + ':' + b.classList.contains('active')));
    t(L + 'seletor: Hoje | Esta semana | Este mês, com "Hoje" ligado', JSON.stringify(tabs) === JSON.stringify(['Hoje:hoje:true', 'Esta semana:semana:false', 'Este mês:mes:false']), JSON.stringify(tabs));
    const vis = () => p.evaluate(() => ({ hoje: !document.getElementById('hoje-missoes').hidden, grid: !document.getElementById('chal-grid').hidden, cntH: !document.getElementById('hmi-count').hidden, cntS: !document.getElementById('challenges-count').hidden, itens: document.querySelectorAll('#hmi-lista .hmi-item').length, cards: document.querySelectorAll('#chal-grid .chal-card').length, txt: (document.getElementById(document.getElementById('hmi-count').hidden ? 'challenges-count' : 'hmi-count').textContent) }));
    let v = await vis();
    t(L + '"Hoje": lista de 3 missões do dia e contador "de 3 feitas"; grade escondida', v.hoje && !v.grid && v.cntH && !v.cntS && v.itens === 3 && /de 3 feitas/.test(v.txt), JSON.stringify(v));
    await p.click('#chal-tabs [data-scope=semana]'); await p.waitForTimeout(250);
    v = await vis();
    t(L + '"Esta semana": grade com as missões da semana e contador "concluídos"', !v.hoje && v.grid && !v.cntH && v.cntS && v.cards >= 3 && /concluídos/.test(v.txt), JSON.stringify(v));
    t(L + 'botão ligado marca aria-pressed', await p.evaluate(() => document.querySelector('#chal-tabs [data-scope=semana]').getAttribute('aria-pressed') === 'true' && document.querySelector('#chal-tabs [data-scope=hoje]').getAttribute('aria-pressed') === 'false'));
    await p.click('#chal-tabs [data-scope=mes]'); await p.waitForTimeout(250);
    v = await vis();
    t(L + '"Este mês": grade do mês', !v.hoje && v.grid && v.cards >= 3, JSON.stringify(v));
    await p.click('#chal-tabs [data-scope=hoje]'); await p.waitForTimeout(250);
    v = await vis();
    t(L + 'voltar para "Hoje" mostra a lista de novo', v.hoje && !v.grid && v.itens === 3, JSON.stringify(v));
    t(L + 'sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    t(L + 'sem erros de script', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
