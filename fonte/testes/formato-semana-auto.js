// Formato da semana: ao escolher 4x3 / 5x2 / 6x1, o APP monta o plano nos dias vazios (a pessoa não preenche nada);
// dias que já têm treino não são trocados; Desfazer devolve a rotina anterior.
// Uso: node formato-semana-auto.js http://localhost:8791
const { chromium } = require('playwright');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
async function abre(b, seed) {
  const c = await b.newContext({ viewport: { width: 1200, height: 900 }, colorScheme: 'dark' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async (s) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set(s.perfil);
    await db.doc('config/settings').set(s.settings);
    for (const k of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']) {
      const r = s.rotina[k] || { ativo: false, ex: [] };
      await db.doc('rotina/' + k).set({ nome: r.ativo ? 'Meu treino ' + k : 'Descanso', ativo: r.ativo, exercicios: r.ex.map(n => ({ nome: n, series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] })) });
    }
    await db.doc('medicoes/' + s.perfil.criadoEm).set({ pesoKg: 74.5 });
  }, seed);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => { document.getElementById('tab-treino').click(); const s = document.getElementById('subtab-treino-plano'); if (s) s.click(); });
  await p.waitForTimeout(500);
  return p;
}
const cadastro = iso(Date.now() - 2 * 864e5);
const perfil = { nomeCompleto: 'Teste', nomeUsuario: 'teste.formato', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', diasSemana: 3, local: 'academia', criadoEm: cadastro, focos: ['costas'] };
const settings = { metaSemanal: 3 };
const E = ['Supino', 'Remada'];
const estado = p => p.evaluate(() => { const T = __ngTest; return { dias: T.diasAtivos(), ligados: T.diasLigados(), vazios: T.diasLigadosVazios(), nomes: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(k => (T.state().rotina[k] || {}).nome), ex: ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].map(k => ((T.state().rotina[k] || {}).exercicios || []).map(e => e.nome).join('|')) }; });
async function usaFormato(p, n) {
  await p.evaluate((n) => { const b = document.querySelector('[data-formato="' + n + '"]'); b.click(); }, n);
  await p.waitForTimeout(300);
  const nota = await p.evaluate(() => document.getElementById('formato-panel').textContent);
  await p.evaluate(() => document.getElementById('fp-apply').click());
  await p.waitForTimeout(900);
  return nota;
}
(async () => {
  const b = await chromium.launch();
  // 1) 3 dias com treino (Seg/Qua/Sex) → 6x1: o app monta os 6 dias sozinho
  const rot3 = { seg: { ativo: true, ex: E }, qua: { ativo: true, ex: E }, sex: { ativo: true, ex: E } };
  let p = await abre(b, { perfil, settings, rotina: rot3 });
  let a = await estado(p);
  t('antes: 3 dias de treino', a.dias.length === 3, JSON.stringify(a.dias));
  const nota = await usaFormato(p, 6);
  a = await estado(p);
  t('6x1: os 6 dias ficam com treino (nada de dia ligado vazio)', a.dias.length === 6 && a.vazios.length === 0, JSON.stringify({ d: a.dias, v: a.vazios }));
  t('6x1: a nota do painel avisa que o app monta o plano', /o app monta o plano completo/.test(nota), nota.slice(0, 200));
  const toast = await p.evaluate(() => (document.body.innerText.match(/Formato [^\n]*aplicado[^\n]*/) || [''])[0]);
  t('6x1: o aviso diz que o plano foi montado', /montei o plano/.test(toast), toast.slice(0, 200));
  t('6x1: cada dia tem pelo menos 3 exercícios e os treinos são diferentes entre si', a.ex.slice(0, 6).every(e => e.split('|').length >= 3) && new Set(a.nomes.slice(0, 6)).size >= 3, JSON.stringify(a.nomes));
  t('6x1: o treino antigo dos dias escolhidos foi substituído pelo plano montado', !a.ex.slice(0, 6).some(e => e === 'Supino|Remada'), JSON.stringify(a.ex[0]));
  // Desfazer
  await p.evaluate(() => { const bt = [...document.querySelectorAll('button')].find(x => /Desfazer/.test(x.textContent)); if (bt) bt.click(); });
  await p.waitForTimeout(900);
  a = await estado(p);
  t('Desfazer: volta aos 3 dias e aos treinos de antes', a.dias.length === 3 && a.ex[0] === 'Supino|Remada' && a.ex[2] === 'Supino|Remada', JSON.stringify(a.ex));
  t('sem erros de JavaScript', p.errs.length === 0, p.errs.join(' | '));
  await p.context().close();

  // 2) todos os dias escolhidos já têm treino → só liga/desliga, nada é trocado
  const rot6 = {}; ['seg', 'ter', 'qua', 'qui', 'sex', 'sab'].forEach(k => { rot6[k] = { ativo: true, ex: ['Supino ' + k, 'Remada ' + k] }; });
  p = await abre(b, { perfil: Object.assign({}, perfil, { diasSemana: 6 }), settings, rotina: rot6 });
  await usaFormato(p, 4);
  a = await estado(p);
  t('4x3 com todos os dias escolhidos já preenchidos: 4 treinos e os exercícios continuam os mesmos', a.dias.length === 4 && a.ex[0].startsWith('Supino seg') && a.ex[1].startsWith('Supino ter'), JSON.stringify({ d: a.dias, e: a.ex.slice(0, 4) }));
  await p.context().close();

  // 3) 5x2 a partir de 3 dias
  p = await abre(b, { perfil, settings, rotina: rot3 });
  await usaFormato(p, 5);
  a = await estado(p);
  t('5x2: 5 dias de treino montados pelo app', a.dias.length === 5 && a.vazios.length === 0, JSON.stringify({ d: a.dias, v: a.vazios }));
  await p.context().close();

  // 4) 4x3 a partir de 3 dias
  p = await abre(b, { perfil, settings, rotina: rot3 });
  await usaFormato(p, 4);
  a = await estado(p);
  t('4x3: 4 dias de treino montados pelo app', a.dias.length === 4 && a.vazios.length === 0, JSON.stringify({ d: a.dias, v: a.vazios }));
  await p.context().close();
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
