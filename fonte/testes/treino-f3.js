// Treino Fase 3 — Análise do treino (dados de demonstração). Uso: node treino-f3.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const D = n => iso(Date.now() - n * 864e5), kD = n => MAP[new Date(D(n) + 'T00:00:00').getDay()];
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] },
  { nome: 'Agachamento livre', series: 3, reps: '8-12', metaReps: 30, musculos: ['quadriceps'] },
  { nome: 'Rosca direta', series: 3, reps: '8-12', metaReps: 30, musculos: ['biceps'] }];
const S = (a) => a.map(r => ({ r }));
(async () => {
  const b = await chromium.launch();
  const mk = async (perfil) => {
    const c = await b.newContext({ viewport: { width: 400, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([perfil, exs, ds]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set(Object.assign({ nomeCompleto: 'Teste', nomeUsuario: 'teste.f3', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ds.criado }, perfil));
      for (const k of ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
      for (const h of ds.hist) await db.doc('checkins/' + h.iso).set(h);
    }, [perfil, exs, { criado: D(40), hist: [
      { iso: D(28), dia: kD(28), cargas: { 'Supino reto': 20, 'Agachamento livre': 40 }, sets: { 0: S([10, 10, 9]), 1: S([10, 10, 10]) }, rpe: { 1: 9 }, progresso: { 0: 29, 1: 30 } },
      { iso: D(21), dia: kD(21), cargas: { 'Supino reto': 20, 'Agachamento livre': 40 }, sets: { 0: S([11, 10, 10]), 1: S([10, 10, 10]) }, rpe: { 1: 9 }, progresso: { 0: 31, 1: 30 } },
      { iso: D(14), dia: kD(14), cargas: { 'Supino reto': 22.5, 'Agachamento livre': 40, 'Rosca direta': 10 }, sets: { 0: S([8, 8, 8]), 1: S([10, 10, 10]), 2: S([10, 10, 10]) }, rpe: { 1: 9 }, progresso: { 0: 24, 1: 30, 2: 30 } },
      { iso: D(7), dia: kD(7), cargas: { 'Supino reto': 22.5, 'Agachamento livre': 40 }, sets: { 0: S([9, 8, 8]), 1: S([10, 10, 10]) }, rpe: { 1: 10 }, progresso: { 0: 25, 1: 30 } }] }]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(800);
    return { c, p };
  };
  let { c, p } = await mk({});
  const card = p.locator('#analise-treino-body');
  const txt = async () => (await card.innerText()).replace(/\s+/g, ' ');
  const tx = await txt();
  t('card "Análise do treino" renderiza', /Progredindo · 1/.test(tx) && /Estagnado · 1/.test(tx) && /Sem dados · 1/.test(tx), tx.slice(0, 200));
  const nomes = await p.locator('.an-name').allInnerTexts();
  t('estagnado vem primeiro na lista', nomes[0] === 'Agachamento livre', nomes.join(','));
  t('filtro "Estagnado" vem marcado, mostra só ele e tudo fechado', (await p.locator('[data-anf="estagnado"]').getAttribute('aria-pressed')) === 'true' && (await p.locator('.an-ex').count()) === 1 && (await p.locator('.an-ex[open]').count()) === 0);
  await p.locator('.an-ex').nth(0).locator('summary').click();
  const ag = await p.locator('.an-ex').nth(0).innerText();
  t('estagnado cita RPE alto (2 sessões ≥9) e volume acima do teto', /RPE 9–10/.test(ag) && /acima do teto/.test(ag) && /deload/i.test(ag), ag.replace(/\s+/g, ' ').slice(0, 400));
  await p.click('[data-anf="todos"]'); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelectorAll('.an-ex').forEach(d => d.open = true));
  const sp = await p.locator('.an-ex').nth(1).textContent();
  t('supino: progredindo com +1 repetição na mesma carga (24 → 25)', /Melhorou/.test(sp) && /\+1 repetição/.test(sp) && /24 → 25/.test(sp), sp.replace(/\s+/g, ' ').slice(0, 300));
  t('adulto intermediário vê tendência de força (1RM Epley)', /Força estimada \(1RM/.test(sp), sp.replace(/\s+/g, ' ').slice(0, 300));
  t('tabela das últimas sessões com cabeçalhos', (await p.locator('.an-ex').nth(1).locator('th[scope="col"]').count()) === 4);
  t('rosca (1 sessão) = sem dados com explicação', /Só 1 sessão/.test(await p.locator('.an-ex').nth(2).textContent()));
  t('seção de volume da semana aparece com referências', /Volume desta semana/.test(await txt()) && /mínimo 8 · ideal 14 · teto 22/.test(await txt()));
  // análise do dia ao concluir: registra 3 exercícios hoje
  await p.evaluate(async ([hoje, kh]) => { const db = await window.claude.use('db'); await db.doc('checkins/' + hoje).set({ data: hoje, dia: kh, cargas: { 'Supino reto': 22.5, 'Agachamento livre': 40, 'Rosca direta': 10 }, sets: { 0: S2([10, 9, 9]), 1: S2([10, 10, 10]), 2: S2([10, 10, 10]) }, progresso: { 0: 28, 1: 30, 2: 30 }, concluido: true });
    function S2(a) { return a.map(r => ({ r })); } }, [D(0), kD(0)]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(800);
  const dia = await p.locator('#week-trail-detail .qc-analise').innerText().catch(() => '');
  t('análise do dia aparece ao concluir o treino', /Análise de hoje/.test(dia), dia.replace(/\s+/g, ' ').slice(0, 300));
  t('dia: supino melhorou, agachamento igual', /Supino reto — Melhor/.test(dia.replace(/\s+/g, ' ')) && /Agachamento livre — Igual/.test(dia.replace(/\s+/g, ' ')), dia.replace(/\s+/g, ' '));
  t('sem erros de console (adulto)', p.errs.length === 0, p.errs.join(' | '));
  await c.close();
  for (const [nome, perfil] of [['iniciante', { experiencia: 'iniciante' }], ['menor de 18', { idade: 16 }]]) {
    ({ c, p } = await mk(perfil));
    await p.click('[data-anf="todos"]'); await p.waitForTimeout(300); await p.evaluate(() => document.querySelectorAll('.an-ex').forEach(d => d.open = true));
    const all = (await p.locator('#analise-treino-body').innerText()).replace(/\s+/g, ' ');
    t(nome + ': não mostra 1RM estimado', !/1RM/.test(all) && !/Força estimada/.test(all));
    t(nome + ': mostra repetições na mesma carga e séries concluídas', /Repetições na mesma carga/.test(all) && /Séries concluídas na última sessão: 3 de 3/.test(all), all.slice(0, 300));
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
