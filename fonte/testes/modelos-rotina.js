// Modelos de rotina do editor: todos montam uma semana válida (dias certos, exercícios que existem na base, sem repetir no dia),
// os de casa não pedem equipamento de academia, e retorno/60+ respeitam os limites do planos.json.
// Uso: node modelos-rotina.js http://localhost:8791
const { chromium } = require('playwright');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const ESPERA = { fullBody2: 2, fullBody: 3, fullBodyCasa: 3, fullBodySemEquip: 3, upperLower: 4, upperLowerCasa: 4, pernasGluteos4: 4, superior4: 4, cinco: 5, ppl: 6, pernasGluteos: 6, retorno: 3, idoso: 3 };
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: 'dark' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1500);
  const R = await p.evaluate(() => {
    const T = __ngTest, out = {};
    Object.keys(T.ROTINA_TEMPLATES).forEach(k => {
      const rot = T.ROTINA_TEMPLATES[k].build();
      const dias = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
      const ativos = dias.filter(d => rot[d] && rot[d].ativo && rot[d].exercicios.length);
      const ligadosVazios = dias.filter(d => rot[d] && rot[d].ativo && !rot[d].exercicios.length);
      const semFicha = [], repetidos = [], semMusculo = [], tamanhos = [], series = [], freq = {};
      ativos.forEach(d => {
        const nomes = new Set(); tamanhos.push(rot[d].exercicios.length);
        const musc = new Set();
        rot[d].exercicios.forEach(e => {
          if (!T.fichaDoApp(e.nome)) semFicha.push(e.nome);
          if (nomes.has(e.nome)) repetidos.push(d + ':' + e.nome); nomes.add(e.nome);
          if (!e.musculos || !e.musculos.length) semMusculo.push(e.nome);
          series.push(e.series); (e.musculos || []).forEach(m => musc.add(m));
        });
        musc.forEach(m => { freq[m] = (freq[m] || 0) + 1; });
      });
      out[k] = { n: ativos.length, ligadosVazios, semFicha, repetidos, semMusculo, min: Math.min(...tamanhos), max: Math.max(...tamanhos), maxSeries: Math.max(...series), minSeries: Math.min(...series), freq,
        nomes: ativos.flatMap(d => rot[d].exercicios.map(e => e.nome)), reps: ativos.flatMap(d => rot[d].exercicios.map(e => e.reps)) };
    });
    return { out, grupos: T.ROTINA_GRUPOS.length, planos: { idoso: T.BASE_PLANOS.idoso, retorno: T.BASE_PLANOS.retorno } };
  });
  const O = R.out;
  Object.keys(ESPERA).forEach(k => {
    const m = O[k];
    t(k + ': existe', !!m);
    if (!m) return;
    t(k + ': ' + ESPERA[k] + ' dias de treino e nenhum dia ligado vazio', m.n === ESPERA[k] && m.ligadosVazios.length === 0, JSON.stringify({ n: m.n, v: m.ligadosVazios }));
    t(k + ': todo exercício existe na base do app', m.semFicha.length === 0, m.semFicha.join(', '));
    t(k + ': sem exercício repetido no mesmo dia, todos com músculo', m.repetidos.length === 0 && m.semMusculo.length === 0, m.repetidos.concat(m.semMusculo).join(', '));
    t(k + ': de 3 a 8 exercícios por dia', m.min >= 3 && m.max <= 8, m.min + '-' + m.max);
  });
  t('há ' + Object.keys(ESPERA).length + ' modelos, sem modelo fora da lista dos testes', Object.keys(O).length === Object.keys(ESPERA).length, Object.keys(O).join(','));
  // frequência por músculo (o que a descrição promete)
  t('fullBody2: todo músculo treina 2×', ['peito', 'costas', 'quadriceps', 'posterior', 'ombros'].every(m => O.fullBody2.freq[m] === 2), JSON.stringify(O.fullBody2.freq));
  t('pernasGluteos4: pernas e glúteos 2× e superior 2×', ['quadriceps', 'gluteos', 'posterior'].every(m => O.pernasGluteos4.freq[m] >= 2) && ['peito', 'costas', 'ombros'].every(m => O.pernasGluteos4.freq[m] >= 2), JSON.stringify(O.pernasGluteos4.freq));
  t('superior4: peito, costas, ombros e braços 2×, pernas 1×', ['peito', 'costas', 'ombros', 'biceps', 'triceps'].every(m => O.superior4.freq[m] >= 2) && O.superior4.freq.quadriceps === 1, JSON.stringify(O.superior4.freq));
  // casa / sem equipamento
  const academia = /smith|leg press|cadeira|mesa flexora|polia|cabo|\bbarra\b(?! fixa)|máquina|face pull|cavalinho/i;
  t('fullBodyCasa: sem equipamento de academia', !O.fullBodyCasa.nomes.some(n => academia.test(n)), O.fullBodyCasa.nomes.filter(n => academia.test(n)).join(', '));
  t('upperLowerCasa: sem equipamento de academia', !O.upperLowerCasa.nomes.some(n => academia.test(n)), O.upperLowerCasa.nomes.filter(n => academia.test(n)).join(', '));
  t('fullBodySemEquip: nada de halter, barra ou máquina', !O.fullBodySemEquip.nomes.some(n => academia.test(n) || /halter/i.test(n)), O.fullBodySemEquip.nomes.filter(n => academia.test(n) || /halter/i.test(n)).join(', '));
  // situações
  t('retorno: séries reduzidas (no máx. 2) e 10-15 repetições', O.retorno.maxSeries <= 2 && O.retorno.reps.filter(r => /^\d+-\d+$/.test(r)).every(r => r === R.planos.retorno.reps), JSON.stringify({ s: O.retorno.maxSeries, r: [...new Set(O.retorno.reps)] }));
  t('60+: no máximo ' + R.planos.idoso.maxSeries + ' séries, sem levantamento terra nem agachamento búlgaro', O.idoso.maxSeries <= R.planos.idoso.maxSeries && !O.idoso.nomes.some(n => /^Levantamento terra$|búlgaro/i.test(n)), JSON.stringify({ s: O.idoso.maxSeries, n: O.idoso.nomes.filter(n => /^Levantamento terra$|búlgaro/i.test(n)) }));
  // interface: select agrupado e aplicar
  await p.evaluate(async () => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.modelos', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', diasSemana: 4, local: 'academia', criadoEm: new Date(Date.now() - 2 * 864e5).toISOString().slice(0, 10) });
  });
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => { document.getElementById('tab-treino').click(); const s = document.getElementById('subtab-treino-plano'); if (s) s.click(); });
  await p.waitForTimeout(400);
  const abriu = await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /Editar rotina/.test(x.textContent)); if (bt) { bt.click(); return true; } return false; });
  await p.waitForTimeout(700);
  const ui = await p.evaluate(() => { const s = document.getElementById('rotina-template-select'); return s ? { grupos: s.querySelectorAll('optgroup').length, opcoes: s.querySelectorAll('option[value]:not([value=""])').length, labels: [...s.querySelectorAll('optgroup')].map(g => g.label) } : null; });
  t('editor aberto', abriu && !!ui);
  t('select do editor com ' + R.grupos + ' grupos e ' + Object.keys(ESPERA).length + ' modelos', ui && ui.grupos === R.grupos && ui.opcoes === Object.keys(ESPERA).length, JSON.stringify(ui));
  await p.selectOption('#rotina-template-select', 'superior4'); await p.waitForTimeout(200);
  const desc = await p.locator('#rotina-template-desc').innerText();
  t('descrição do modelo aparece', /ombros|braços/i.test(desc), desc.slice(0, 120));
  await p.click('#rotina-template-apply'); await p.waitForTimeout(500);
  const dias = await p.evaluate(() => [...document.querySelectorAll('#rotina-editor-days [data-key]')].filter(s => s.querySelector('.d-ativo').checked).length);
  t('aplicar o modelo coloca 4 dias de treino no rascunho', dias === 4, dias);
  t('sem erros de JavaScript', p.errs.length === 0, p.errs.join(' | '));
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
