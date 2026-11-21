// Volume semanal: barra clara = planejado, barra forte = feito nesta semana. Uso: node volume-feito.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) for (const modo of ['dark', 'light']) {
    const L = '[' + w + ' ' + modo + '] ';
    const { c, p } = await abre(b, w, modo, w < 600);
    await p.evaluate(async () => {
      const db = await window.claude.use('db');
      const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
      const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      const hoje = iso(new Date()), k = MAP[new Date().getDay()];
      const ex = (n, m) => ({ nome: n, series: 4, reps: '8-12', metaReps: 40, musculos: [m] });
      for (const d of MAP) await db.doc('rotina/' + d).set({ nome: 'Treino', ativo: true, exercicios: [] });
      await db.doc('rotina/' + k).set({ nome: 'Hoje', ativo: true, exercicios: [ex('Supino reto', 'peito'), ex('Elevação lateral', 'ombros')] });
      // limpa check-ins da semana da semente e registra só o supino (3 séries)
      for (let i = 0; i < 8; i++) { const d = new Date(Date.now() - i * 864e5); try { await db.doc('checkins/' + iso(d)).delete(); } catch (e) { } }
      await db.doc('checkins/' + hoje).set({ data: hoje, dia: k, concluido: false, sets: { 0: [{ r: 10 }, { r: 10 }, { r: 9 }] }, cargas: { 'Supino reto': 40 }, progresso: { 0: 29 } });
    });
    await p.reload(); await p.waitForTimeout(1800);
    await p.evaluate(() => { document.querySelector('#tab-treino').click(); }); await p.waitForTimeout(400);
    await p.evaluate(() => { document.querySelector('#subtab-treino-progresso').click(); }); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const row = n => [...document.querySelectorAll('.volA-row')].find(x => x.querySelector('.m-name').textContent.startsWith(n));
      const pe = row('Peito'), om = row('Ombros');
      const info = x => x && ({ val: x.querySelector('.volA-val b').textContent, feito: (x.querySelector('.volA-feito') || {}).textContent, done: !!x.querySelector('.volA-done'), plan: !!x.querySelector('.volA-fill.plan'), aria: x.querySelector('.volA-track').getAttribute('aria-label') });
      const fw = x => x.querySelector('.volA-done') ? x.querySelector('.volA-done').getBoundingClientRect().width : 0;
      const pw = x => x.querySelector('.volA-fill').getBoundingClientRect().width;
      return { pe: info(pe), om: info(om), peDoneMenor: fw(pe) > 0 && fw(pe) < pw(pe), hint: document.querySelector('#volume-body').closest('.card').querySelector('.hint').textContent, leg: document.querySelector('#volume-body .vol-legend').textContent, cat: document.querySelector('.volA-cat-h small').textContent, sw: document.documentElement.scrollWidth - innerWidth };
    });
    t(L + 'peito: planejado 4, feito 3, barra forte menor que a clara', r.pe && r.pe.val === '4' && /feito 3 de 4/.test(r.pe.feito) && r.pe.done && r.peDoneMenor, JSON.stringify(r.pe));
    t(L + 'ombros: planejado 4 e "nada feito ainda", sem barra forte', r.om && r.om.val === '4' && /nada feito/.test(r.om.feito) && !r.om.done && r.om.plan, JSON.stringify(r.om));
    t(L + 'leitor de tela ouve planejadas e feitas', /4 séries planejadas e 0 feitas/.test(r.om.aria) && /3 feitas/.test(r.pe.aria), r.pe.aria);
    t(L + 'legenda e título explicam planejado × feito', /Barra forte = feito/.test(r.leg) && /Barra clara = planejado/.test(r.leg) && /feito/.test(r.hint), r.hint);
    t(L + 'cabeçalho da categoria mostra feitas e planejadas', /\d+ feitas · \d+ planejadas/.test(r.cat), r.cat);
    t(L + 'sem rolagem lateral e sem erros', r.sw <= 0 && p.errs.length === 0, r.sw + ' ' + p.errs.join('|'));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
