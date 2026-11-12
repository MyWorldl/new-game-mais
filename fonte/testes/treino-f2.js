// Treino Fase 2 — RPE ("Como foi?") + dupla progressão. Uso: node treino-f2.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const D = n => iso(Date.now() - n * 864e5);
const hoje = D(0);
const kD = n => MAP[new Date(D(n) + 'T00:00:00').getDay()];
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] },
             { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
(async () => {
  const b = await chromium.launch();
  const mk = async (perfil) => {
    const c = await b.newContext({ viewport: { width: 400, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([perfil, kH, exs, ds]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set(Object.assign({ nomeCompleto: 'Teste', nomeUsuario: 'teste.f2', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ds[0] }, perfil));
      for (const k of ds[1]) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    }, [perfil, null, exs, [D(10), [0, 1, 2, 3, 4, 5, 6].map(i => MAP[i])]]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
    return { c, p };
  };
  const dump = (p, path) => p.evaluate(async (path) => { const db = await window.claude.use('db'); const d = await db.doc(path).get(); return d.exists ? d.data() : null; }, path);
  const box = (p, i) => p.locator('#week-trail-detail .sl[data-sl="' + i + '"]');
  const fecha = async (p, i, reps) => { for (const r of reps) { await box(p, i).locator('[data-slin]').fill(String(r)); await box(p, i).locator('[data-slok]').click(); await p.waitForTimeout(200); } };

  // ---- A) adulto intermediário
  let { c, p } = await mk({});
  await fecha(p, 0, [10, 9, 8]);
  t('exercício completo mostra a pergunta "Como foi esse exercício?"', (await box(p, 0).locator('.sl-rpe').count()) === 1);
  t('intro com analogia do combustível na 1ª vez', /combust/i.test(await box(p, 0).locator('.sl-rpe-intro').innerText()));
  t('adulto intermediário vê as 4 opções (inclui Falha)', (await box(p, 0).locator('[data-slrpe]').count()) === 4);
  t('exercício incompleto (outro) não mostra a pergunta', (await box(p, 1).locator('.sl-rpe').count()) === 0);
  await box(p, 0).locator('[data-slrpe="8"]').click(); await p.waitForTimeout(400);
  let c0 = await dump(p, 'checkins/' + hoje);
  t('"Bom" grava RPE 8', c0.rpe && Number(c0.rpe[0]) === 8, JSON.stringify(c0.rpe));
  t('pergunta some e aparece resumo "RPE 8" com Alterar', (await box(p, 0).locator('.sl-rpe').count()) === 0 && /RPE 8/.test(await box(p, 0).locator('.sl-rpe-done').innerText()));
  t('foco vai para o botão Alterar', await p.evaluate(() => document.activeElement && document.activeElement.hasAttribute('data-slrpe-edit')));
  await box(p, 0).locator('[data-slrpe-edit]').click(); await p.waitForTimeout(300);
  c0 = await dump(p, 'checkins/' + hoje);
  t('Alterar apaga o RPE e reabre a pergunta', !(c0.rpe && c0.rpe[0] != null) && (await box(p, 0).locator('.sl-rpe').count()) === 1);
  t('intro não reaparece depois da 1ª resposta', (await box(p, 0).locator('.sl-rpe-intro').count()) === 0);
  await box(p, 0).locator('[data-slrpe-skip]').click(); await p.waitForTimeout(250);
  c0 = await dump(p, 'checkins/' + hoje);
  t('"Agora não" não grava nada e esconde a pergunta', !(c0.rpe && c0.rpe[0] != null) && (await box(p, 0).locator('.sl-rpe').count()) === 0);
  await p.locator('#week-trail-detail [data-qtoggle="0"]').first().click(); await p.waitForTimeout(400);
  t('seletor 6–10 do painel continua disponível (adulto: 5 valores)', await p.evaluate(() => document.querySelectorAll('.quest-rpe-seg button').length === 5));
  t('glossário/TIPS explicam RPE com exemplo numérico', await p.evaluate(() => /10 repetições e conseguiria mais 2/.test(__ngTest.TIPS.rpe.d) && __ngTest.GLOSSARIO["Treino"].some(x => /RPE/.test(x.termo) && /conseguiria mais 2/.test(x.def) && x.url)));

  // ---- B) sugestão de progressão (dupla progressão)
  const sug = (hist) => p.evaluate(async ([hist, ds, kk]) => {
    const db = await window.claude.use('db');
    for (const [n, h] of hist.entries()) {
      const iso = ds[n], idx = 0;
      await db.doc('checkins/' + iso).set({ data: iso, dia: kk[n], cargas: { 'Supino reto': h.peso }, sets: { 0: h.sets.map(r => ({ r })), 1: [{ r: 10 }, { r: 10 }, { r: 10 }] }, progresso: { 0: 1 }, rpe: h.rpe == null ? {} : { 0: h.rpe } });
    }
    // recarrega estado
    return 1;
  }, [hist, [D(14), D(7)].map(x => x), [kD(14), kD(7)]]);
  async function rodar(hist) {
    // limpa e grava histórico
    await p.evaluate(async () => { const db = await window.claude.use('db'); for (const k of Object.keys(__ngTest.state().checkins)) { await db.doc('checkins/' + k).delete(); } });
    await sug(hist); await p.reload(); await p.waitForTimeout(1500);
    return p.evaluate(() => { const r = __ngTest.sugestaoProgressao('Supino reto'); return r && { s: r.sugerido, a: r.acao, b: r.base, t: r.texto }; });
  }
  let r = await rodar([{ peso: 20, sets: [12, 12, 12], rpe: null }]);
  t('12/12/12 sem RPE → sobe (22,5)', r && r.a === 'subir' && r.s === 22.5 && r.b === 'series', JSON.stringify(r));
  r = await rodar([{ peso: 20, sets: [12, 12, 12], rpe: 9 }]);
  t('topo da faixa com RPE 9 → mantém', r && r.a === 'manter' && r.s === 20, JSON.stringify(r));
  r = await rodar([{ peso: 20, sets: [10, 9, 9], rpe: null }]);
  t('séries na faixa sem RPE → mantém e busca +1 rep', r && r.a === 'manter' && /\+1 repeti/.test(r.t), JSON.stringify(r));
  r = await rodar([{ peso: 20, sets: [10, 9, 9], rpe: 7 }]);
  t('RPE 7 → sobe mesmo sem topo da faixa', r && r.a === 'subir', JSON.stringify(r));
  r = await rodar([{ peso: 20, sets: [8, 8, 6], rpe: null }]);
  t('uma série abaixo da faixa (1ª vez) → mantém', r && r.a === 'manter' && /abaixo de 8/.test(r.t), JSON.stringify(r));
  r = await rodar([{ peso: 20, sets: [8, 7, 6], rpe: 9 }, { peso: 20, sets: [8, 7, 6], rpe: 9 }]);
  t('abaixo da faixa 2 sessões + RPE 9 → reduz (17,5)', r && r.a === 'reduzir' && r.s === 17.5, JSON.stringify(r));
  // legado: só RPE, sem séries reais
  await p.evaluate(async ([ds, kk]) => { const db = await window.claude.use('db'); for (const k of Object.keys(__ngTest.state().checkins)) await db.doc('checkins/' + k).delete(); await db.doc('checkins/' + ds[0]).set({ data: ds[0], dia: kk[0], cargas: { 'Supino reto': 30 }, progresso: { 0: 30 }, rpe: { 0: 7 } }); }, [[D(7)], [kD(7)]]);
  await p.reload(); await p.waitForTimeout(1500);
  r = await p.evaluate(() => { const x = __ngTest.sugestaoProgressao('Supino reto'); return x && { a: x.acao, b: x.base }; });
  t('check-in antigo (só RPE 7) continua sugerindo subir (regra antiga)', r && r.a === 'subir' && r.b === 'rpe', JSON.stringify(r));
  t('sem erros no console (adulto)', p.errs.length === 0, p.errs.join(' | '));
  await c.close();

  // ---- C) menor de idade e iniciante
  for (const [nome, perfil] of [['menor de 18', { idade: 16 }], ['iniciante', { experiencia: 'iniciante' }]]) {
    ({ c, p } = await mk(perfil));
    await fecha(p, 0, [10, 9, 8]);
    t(nome + ': pergunta NÃO oferece "Falha" (3 opções)', (await box(p, 0).locator('[data-slrpe]').count()) === 3 && (await box(p, 0).locator('[data-slrpe="10"]').count()) === 0);
    if (nome === 'menor de 18') { await p.locator('#week-trail-detail [data-qtoggle="0"]').first().click(); await p.waitForTimeout(400); t('menor: seletor manual tem 6–9 e não tem o 10', await p.evaluate(() => { const v = [...document.querySelectorAll('.quest-rpe-seg button')].map(b => b.dataset.rpeval); return v.length === 4 && !v.includes('10'); })); }
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
