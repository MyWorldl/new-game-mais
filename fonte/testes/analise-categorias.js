// Análise do treino segmentada por categorias (como a Biblioteca de exercícios). Uso: node analise-categorias.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 600);
    const go = async s => { await p.evaluate(x => { const e = document.querySelector(x); e && e.click(); }, s); await p.waitForTimeout(600); };
    await p.evaluate(async () => {
      const db = await window.claude.use('db');
      const ex = (n, m) => ({ nome: n, series: 4, reps: '6-10', metaReps: 32, musculos: [m] });
      await db.doc('rotina/seg').set({ nome: 'Seg', ativo: true, exercicios: [ex('Supino reto', 'peito'), ex('Desenvolvimento militar com barra', 'ombros')] });
      await db.doc('rotina/ter').set({ nome: 'Ter', ativo: true, exercicios: [ex('Leg press', 'quadriceps'), ex('Agachamento livre', 'quadriceps')] });
      await db.doc('rotina/qua').set({ nome: 'Qua', ativo: true, exercicios: [ex('Remada curvada', 'costas')] });
      await db.doc('rotina/qui').set({ nome: 'Qui', ativo: true, exercicios: [ex('Supino inclinado com halteres', 'peito')] });
      await db.doc('rotina/sex').set({ nome: 'Sex', ativo: true, exercicios: [ex('Elevação lateral', 'ombros'), ex('Abdominal infra', 'abdomen')] });
    });
    await p.reload(); await p.waitForTimeout(1800);
    await go('#tab-treino'); await go('#subtab-treino-progresso');
    const r = await p.evaluate(() => {
      const cats = [...document.querySelectorAll('#analise-treino-body details.an-cat')];
      const nomes = cats.map(d => d.querySelector('.biblio-cat-name').textContent);
      const itens = cats.map(d => d.querySelectorAll('li > details.an-ex').length);
      const todos = document.querySelectorAll('#analise-treino-body li > details.an-ex').length;
      const contagemOk = cats.every((d, i) => d.querySelector('.biblio-cat-count').textContent.startsWith(String(itens[i])));
      const ordem = ['Peito, ombros e tríceps', 'Costas e bíceps', 'Pernas', 'Core'];
      const ordenado = nomes.every((n, i) => i === 0 || ordem.indexOf(nomes[i - 1]) < ordem.indexOf(n));
      const abertas = cats.filter(d => d.open).length;
      const resumo = cats.every(d => d.querySelector('.an-cat-resumo .chip'));
      const iconSvg = cats.every(d => d.querySelector('.biblio-cat-ic svg'));
      return { nomes, itens, todos, contagemOk, ordenado, abertas, resumo, iconSvg, sw: document.documentElement.scrollWidth - innerWidth, msg: (document.querySelector('#analise-treino-body .an-count') || {}).textContent };
    });
    t(L + 'Análise agrupada por categorias da Biblioteca (≥ 3 categorias, na ordem da Biblioteca)', r.nomes.length >= 3 && r.ordenado, JSON.stringify(r.nomes));
    t(L + 'cada categoria mostra a contagem certa e todos os exercícios aparecem uma vez', r.contagemOk && r.itens.reduce((a, b) => a + b, 0) === r.todos && r.todos > 0, JSON.stringify(r.itens));
    t(L + 'categorias abertas por padrão, com ícone e resumo de situação', r.abertas === r.nomes.length && r.resumo && r.iconSvg, JSON.stringify({ a: r.abertas, rs: r.resumo, ic: r.iconSvg }));
    t(L + 'sem rolagem lateral', r.sw <= 0, r.sw);
    // recolher uma categoria sobrevive ao filtro (redesenho)
    await p.evaluate(() => { const d = document.querySelector('#analise-treino-body details.an-cat'); d.querySelector('summary').click(); });
    await p.waitForTimeout(300);
    await p.evaluate(() => { const f = document.querySelector('#analise-treino-body [data-anf="todos"]'); f && f.click(); });
    await p.waitForTimeout(400);
    const rec = await p.evaluate(() => { const ds = [...document.querySelectorAll('#analise-treino-body details.an-cat')]; return { primeiraFechada: !ds[0].open, outrasAbertas: ds.slice(1).every(d => d.open) }; });
    t(L + 'categoria recolhida continua recolhida depois de filtrar', rec.primeiraFechada && rec.outrasAbertas, JSON.stringify(rec));
    // filtro por situação mantém só as categorias que têm itens
    const fil = await p.evaluate(() => { const bt = [...document.querySelectorAll('#analise-treino-body [data-anf]')].find(x => x.dataset.anf !== 'todos'); if (!bt) return null; bt.click(); return bt.dataset.anf; });
    await p.waitForTimeout(400);
    const aposFiltro = await p.evaluate(() => ({ cats: document.querySelectorAll('#analise-treino-body details.an-cat').length, vazias: [...document.querySelectorAll('#analise-treino-body details.an-cat')].filter(d => !d.querySelector('li')).length }));
    t(L + 'filtro por situação não deixa categoria vazia', fil && aposFiltro.vazias === 0 && aposFiltro.cats >= 1, JSON.stringify(aposFiltro));
    t(L + 'sem erros de página', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
