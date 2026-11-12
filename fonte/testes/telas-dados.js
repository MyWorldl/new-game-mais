// Telas de dados v4: exercícios, hábitos 12 semanas, medições, ficha de personagem, conta e "Esta semana". Uso: node telas-dados.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 1280]) {
    const { c, p } = await abre(b, w, 'dark');
    const L = '[' + w + '] ';
    const ir = async id => { await p.evaluate(i => document.getElementById(i).click(), id); await p.waitForTimeout(700); };
    // ---- exercícios ----
    await ir('tab-treino');
    await p.evaluate(() => document.querySelectorAll('[data-cargadia]').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
    await p.waitForTimeout(300);
    const sup = p.locator('.carga-row[data-ex="Supino reto"]');
    t(L + 'exercício: mostra % do recorde quando a última carga está abaixo do pico', /46% do recorde/.test(await sup.innerText()));
    t(L + 'exercício: sparkline com ponto da última carga e do recorde', (await sup.locator('.carga-spark circle.last').count()) === 1 && (await sup.locator('.carga-spark circle.pr').count()) === 1);
    t(L + 'exercício: última sessão com séries coloridas pelo ranking', (await sup.locator('.carga-sets .cs').count()) >= 2 && (await sup.locator('.carga-sets .cs.sl-ouro').count()) >= 1);
    t(L + 'exercício: queda não vira alarme (sem classe de alerta, texto "recorde" aparece)', (await sup.locator('.carga-pr').count()) === 0);
    t(L + 'exercício: selo "Recorde" quando a última carga é o recorde', (await p.locator('.carga-row.is-pr .carga-pr').count()) >= 1);
    t(L + 'exercício: data da última carga em texto ("há N dias"/"ontem"/"hoje")', /Última · (há \d+ dias|ontem|hoje)/.test(await sup.innerText()));
    t(L + 'exercício: sem rolagem horizontal na lista', await p.evaluate(() => { const e = document.querySelector('.carga-cat'); return e.scrollWidth <= e.clientWidth + 1; }));
    // ---- hábitos ----
    await ir('tab-corpo');
    const hg = p.locator('#hab-grade');
    t(L + 'hábitos: 4 linhas com resumo (esta semana, média, melhor)', (await hg.locator('.hg-row').count()) === 4 && (await hg.locator('.hg-st').count()) === 4);
    t(L + 'hábitos: semana atual marcada em todas as linhas', (await hg.locator('.hg-c.now').count()) === 4);
    t(L + 'hábitos: rótulos de mês e legenda de cores', (await hg.locator('.hg-meses span:not(:empty)').count()) >= 2 && (await hg.locator('.hg-leg .hg-lg').count()) === 6);
    t(L + 'hábitos: melhor semana marcada por linha', (await hg.locator('.hg-c.best').count()) === 4);
    t(L + 'hábitos: grade com 12 colunas', (await hg.locator('.hg-cells').first().locator('.hg-c').count()) === 12);
    // ---- medições ----
    const res = p.locator('#med-resumo');
    t(L + 'medições: resumo do período com 4 indicadores', (await res.locator('.mr-i').count()) === 4 && /74,5/.test(await res.innerText()), await res.innerText());
    t(L + 'medições: variação desde a 1ª medição do período', (await res.locator('.mr-d.down').count()) >= 1);
    t(L + 'medições: aviso de variação grande (74,5 depois de 86,3)', (await p.locator('#tabela-medicoes .hist-flag').count()) === 1);
    t(L + 'medições: cintura/quadril/gordura mostram variação', (await p.locator('#tabela-medicoes tbody tr:first-child td:nth-child(3) .hist-delta').count()) === 1);
    await p.click('#med-periodo [data-p="30"]'); await p.waitForTimeout(300);
    t(L + 'medições: filtro de 30 dias recalcula o resumo', (await res.locator('.mr-i').count()) >= 1);
    await p.click('#med-periodo [data-p="all"]'); await p.waitForTimeout(200);
    // ---- ficha ----
    await ir('tab-perfil');
    const rd = p.locator('#attrs-radar');
    const lis = rd.locator('.radar-list li');
    t(L + 'ficha: 5 atributos de RPG com nível', (await lis.count()) === 5 && (await rd.locator('.nv').count()) === 5);
    const txt = (await rd.innerText()).replace(/\s+/g, ' ');
    t(L + 'ficha: atributos FOR, RES, DIS, VIT, FOC', ['FOR', 'RES', 'DIS', 'VIT', 'FOC'].every(a => txt.includes(a)), txt.slice(0, 200));
    t(L + 'ficha: patente com XP e atributo dominante', (await rd.locator('.fi-head').count()) === 1 && /Atributo dominante/i.test(txt));
    t(L + 'ficha: hall de cargas com 3 posições (ouro, prata, bronze), Leg press em 1º', (await rd.locator('.radar-hall li').count()) === 3 && /^1º lugar:\s*Leg press/.test((await rd.locator('.radar-hall li .hn').first().innerText()).trim()));
    const tiles = (await p.locator('#attrs-grid').innerText()).replace(/\s+/g, ' ');
    t(L + 'ficha: tiles Maior carga, Recordes em 30 dias, Séries de ouro', /Maior carga/i.test(tiles) && /Recordes em 30 dias/i.test(tiles) && /Séries de ouro/i.test(tiles), tiles);
    t(L + 'ficha: sem rolagem horizontal', await p.evaluate(() => { const e = document.getElementById('attrs-radar').closest('.card'); return e.scrollWidth <= e.clientWidth + 1; }));
    // ---- conta ----
    await ir('tab-config');
    await p.evaluate(() => { document.getElementById('cfg-conta').hidden = false; });
    const ordem = await p.evaluate(() => [...document.querySelectorAll('#cfg-conta button, #cfg-conta select')].map(e => e.id));
    t(L + 'conta: ordem por risco (sincronizar, política, sessão, sair, resetar, excluir)', JSON.stringify(ordem) === JSON.stringify(['cfg-conta-sync', 'cfg-conta-politica', 'cfg-relogin', 'cfg-conta-sair', 'cfg-conta-resetar', 'cfg-conta-excluir']), JSON.stringify(ordem));
    t(L + 'conta: resetar e excluir ficam só na zona de perigo', await p.evaluate(() => ['cfg-conta-resetar', 'cfg-conta-excluir'].every(i => document.getElementById(i).closest('.conta-perigo')) && ['cfg-conta-sync', 'cfg-conta-politica', 'cfg-conta-sair'].every(i => !document.getElementById(i).closest('.conta-perigo'))));
    t(L + 'conta: botões do mesmo grupo com a mesma largura', await p.evaluate(() => { const a = document.getElementById('cfg-conta-resetar').getBoundingClientRect().width, b = document.getElementById('cfg-conta-excluir').getBoundingClientRect().width; return Math.abs(a - b) < 2; }));
    t(L + 'conta: sem rolagem horizontal', await p.evaluate(() => { const e = document.getElementById('cfg-conta'); return e.scrollWidth <= e.clientWidth + 1; }));
    // ---- esta semana ----
    await ir('tab-painel');
    const dots = await p.evaluate(() => [...document.querySelectorAll('#week-dots .dot .d-n')].map(e => e.textContent));
    t(L + 'semana: 7 dias com nome de 3 letras', dots.length === 7 && dots.every(d => d.length === 3), dots.join(','));
    t(L + 'semana: cartão do próximo treino', await p.evaluate(() => { const e = document.getElementById('wk-next'); return !e.hidden && /Treino de hoje|Próximo treino/i.test(e.innerText); }));
    t(L + 'semana: intervalo da semana e contador da meta', await p.evaluate(() => /\d\d\/\d\d – \d\d\/\d\d/.test(document.getElementById('wk-range').textContent) && /^\d+\/\d+$/.test(document.getElementById('wg-count').textContent)));
    t(L + 'semana: barras de progresso coerentes com os rótulos', await p.evaluate(() => { const m = document.getElementById('week-label').textContent.match(/(\d+) de (\d+)/); const w = parseFloat(document.getElementById('wk-bar-w').style.width); return m && Math.abs(w - Math.round(m[1] / m[2] * 100)) <= 1; }));
    t(L + 'semana: sem rolagem horizontal', await p.evaluate(() => { const e = document.querySelector('.week-progress'); return e.scrollWidth <= e.clientWidth + 1; }));
    t(L + 'sem erros de página', p.errs.length === 0, p.errs.join(' | '));
    // ---- acessibilidade nos 7 temas ----
    if (axeSrc && w === 360) {
      await p.evaluate(axeSrc);
      const temas = [['game'], ['rosa', 'claro'], ['rosa', 'escuro'], ['roxo', 'claro'], ['roxo', 'escuro'], ['azul', 'claro'], ['azul', 'escuro']];
      const ap = (tm) => p.evaluate(([a, m]) => { const r = document.documentElement; if (a === 'game') { r.setAttribute('data-game', 'on'); r.removeAttribute('data-tema'); r.removeAttribute('data-modo'); } else { r.setAttribute('data-game', 'off'); r.setAttribute('data-tema', a); r.setAttribute('data-modo', m); } }, tm);
      const alvos = [['tab-treino', '.carga-cat'], ['tab-corpo', '#hab-grade'], ['tab-corpo', '#med-resumo'], ['tab-perfil', '#attrs-radar'], ['tab-config', '#cfg-conta'], ['tab-painel', '.week-progress']];
      for (const tm of temas) {
        await ap(tm); await p.waitForTimeout(120);
        const vs = [];
        for (const [tab, sel] of alvos) {
          await ir(tab);
          const v = await p.evaluate(async (s) => (await axe.run(document.querySelector(s), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length + ' ' + x.nodes[0].html.slice(0, 70) + ' ' + ((x.nodes[0].any[0] || {}).message || '').slice(0, 90)), sel);
          if (v.length) vs.push(sel + '=' + v.join(','));
        }
        t('[axe] 6 telas sem violações no tema ' + tm.join('/'), vs.length === 0, vs.join(' ; '));
      }
    }
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
