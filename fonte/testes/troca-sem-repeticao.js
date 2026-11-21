// Troca de exercício no dia: um exercício nunca se repete no mesmo treino (as variações já presentes no dia saem da lista).
// Rotina fixa e dia de hoje: não depende do dia da semana. Uso: node troca-sem-repeticao.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const ex = (nome, m) => ({ nome, series: 3, reps: '10-15', metaReps: 39, musculos: m || ['gluteos'] });
async function prepara(b, w, exercicios) {
  const { c, p } = await abre(b, w, 'dark', w < 600);
  const hoje = iso(Date.now()), k = MAP[new Date().getDay()];
  await p.evaluate(async ([hoje, k, exercicios]) => {
    const db = await window.claude.use('db');
    await db.doc('rotina/' + k).set({ nome: 'Pernas', ativo: true, exercicios });
    await db.doc('checkins/' + hoje).set({ data: hoje, dia: k, concluido: false });
  }, [hoje, k, exercicios]);
  await p.evaluate(() => localStorage.setItem('ng_test_hooks', '1'));
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => { document.getElementById('tab-treino').click(); }); await p.waitForTimeout(700);
  await p.evaluate(() => { const e = document.getElementById('subtab-treino-plano'); e && e.click(); }); await p.waitForTimeout(700);
  return { c, p, hoje, k };
}
const chips = async (p, idx) => {
  await p.evaluate(i => { document.querySelectorAll('.qc-btn[aria-expanded="true"]').forEach(b => { if (b.dataset.qtoggle !== String(i)) b.click(); }); }, idx);
  await p.waitForTimeout(300);
  await p.evaluate(i => { const b = document.querySelector('.qc-btn[data-qtoggle="' + i + '"]'); if (b && b.getAttribute('aria-expanded') !== 'true') b.click(); }, idx);
  await p.waitForTimeout(500);
  return p.evaluate(i => [...document.querySelectorAll('[data-qswap="' + i + '"]')].map(e => e.dataset.qalt), idx);
};
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    // 1) Hip thrust + Cadeira abdutora no mesmo dia (caso do áudio): a abdutora não é oferecida como troca do Hip thrust
    let { c, p, hoje } = await prepara(b, w, [ex('Hip thrust'), ex('Cadeira abdutora'), ex('Leg press', ['quadriceps', 'gluteos'])]);
    let a0 = await chips(p, 0), a1 = await chips(p, 1);
    t(L + 'Hip thrust: "Cadeira abdutora" (já no treino) não aparece como variação', a0.length > 0 && !a0.includes('Cadeira abdutora'), a0.join('|'));
    t(L + 'Hip thrust: "Ponte de glúteo" continua disponível', a0.includes('Ponte de glúteo'), a0.join('|'));
    t(L + 'Cadeira abdutora: "Hip thrust" (já no treino) não aparece', !a1.includes('Hip thrust') && a1.length > 0, a1.join('|'));
    await chips(p, 0);
    // 2) trocar o Hip thrust por Ponte de glúteo e conferir que a lista do dia não repete
    await p.evaluate(() => document.querySelector('[data-qswap="0"][data-qalt="Ponte de glúteo"]').click()); await p.waitForTimeout(500);
    const nomes = await p.evaluate(([hoje]) => { const T = __ngTest, s = T.state(); const c = s.checkins[hoje] || {}; const day = s.rotina[Object.keys(s.rotina).find(k => s.rotina[k] && s.rotina[k].nome === 'Pernas')]; return day.exercicios.map((e, i) => (c.trocas && c.trocas[i]) || e.nome); }, [hoje]);
    t(L + 'depois da troca o treino não tem nome repetido', new Set(nomes).size === nomes.length && nomes[0] === 'Ponte de glúteo', nomes.join('|'));
    const a1b = await chips(p, 1);
    t(L + 'com o Hip thrust liberado, ele volta a ser oferecido na abdutora', a1b.includes('Hip thrust'), a1b.join('|'));
    const a0b = await chips(p, 0);
    t(L + 'o exercício trocado oferece voltar ao original', a0b.includes('Hip thrust'), a0b.join('|'));
    await c.close();

    // 3) todas as variações já estão no treino: aviso em vez de lista vazia (o treino é montado com o Hip thrust + todas as variações dele)
    ({ c, p } = await prepara(b, w, [ex('Hip thrust')]));
    const todas = await chips(p, 0);
    await c.close();
    ({ c, p } = await prepara(b, w, [ex('Hip thrust')].concat(todas.map(n => ex(n)))));
    await chips(p, 0);
    const vazio = await p.evaluate(() => ({ chips: document.querySelectorAll('[data-qswap="0"]').length, aviso: [...document.querySelectorAll('.qc-alt-label')].some(e => /Sem variação livre/.test(e.textContent)) }));
    t(L + 'sem variação livre: nenhum chip e aviso explicando', todas.length > 0 && vazio.chips === 0 && vazio.aviso, JSON.stringify(vazio) + ' / ' + todas.length);
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} passaram, ${bad} falharam`);
  process.exit(bad ? 1 : 0);
})();
