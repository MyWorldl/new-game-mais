// Exercícios unilaterais: repetições por lado, meta que soma os dois lados, registro e rotinas salvas. Uso: node unilaterais.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  const { c, p } = await abre(b, 390, 'dark', true);
  await p.evaluate(() => localStorage.setItem('ng_test_hooks', '1')); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  const r = await p.evaluate(() => {
    const H = window.__ngTest;
    // 1) todo unilateral listado existe no app (catálogo de fichas, modelos ou alternativas)
    const fichas = new Set(); (H.BASE_EXERCICIOS.exercicios || []).forEach(f => { (f.nomesApp || []).forEach(n => fichas.add(n)); fichas.add(f.nome); });
    const usados = new Set();
    Object.values(H.ROTINA_TEMPLATES).forEach(tp => { const rot = tp.build(); Object.values(rot).forEach(d => (d.exercicios || []).forEach(e => usados.add(e.nome))); });
    const semOrigem = Object.keys(H.UNILATERAL).filter(n => !fichas.has(n) && !usados.has(n));
    // 2) todo exercício unilateral que aparece nos modelos tem "por perna/lado/braço" e meta dobrada
    const ruins = []; const metas = [];
    Object.entries(H.ROTINA_TEMPLATES).forEach(([k, tp]) => { const rot = tp.build(); Object.values(rot).forEach(d => (d.exercicios || []).forEach(e => {
      if (H.ladoDe(e.nome)) { if (!/ por (perna|lado|braço)$/.test(String(e.reps))) ruins.push(k + ':' + e.nome + '=' + e.reps); const f = H.faixaDeReps(e.reps); if (f.unid === 'reps') metas.push([e.nome, e.series, e.reps, e.metaReps, H.metaRepsDe(e.series, e.reps, 0)]); }
      else if (/ por (perna|lado|braço)$/.test(String(e.reps))) ruins.push('bilateral com sufixo ' + k + ':' + e.nome);
    })); });
    const metaErrada = metas.filter(m => m[3] !== m[4]);
    // 3) funções
    const f = {
      a: H.repsComLado('Remada unilateral com halter', '10-12'), b: H.repsComLado('Supino reto', '8-12'), c: H.repsComLado('Prancha lateral', '30-45s'),
      d: H.repsComLado('Avanço (afundo) com halteres', '10-12 por perna'), e: H.repsDoLado('Hip thrust', '10-12 por perna'), g: H.repsDoLado('Avanço reverso', '8-12'),
      fx: H.faixaDeReps('30-45s por lado'), fy: H.faixaDeReps('10-12 por perna'), mm: H.metaRepsDe(3, '10-12', 0), mu: H.metaRepsDe(3, '10-12 por perna', 0)
    };
    // 4) migração de rotinas salvas
    const rot = { seg: { nome: 'A', ativo: true, exercicios: [{ nome: 'Agachamento búlgaro', series: 3, reps: '8-12', metaReps: 30, musculos: [] }, { nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: [] }] } };
    const mudou = H.migrarLadoUnilateral(rot);
    return { semOrigem, ruins, metaErrada, n: Object.keys(H.UNILATERAL).length, f, mudou, mig: rot.seg.exercicios.map(e => e.reps + '|' + e.metaReps) };
  });
  t('todo unilateral listado existe no banco/modelos do app', r.semOrigem.length === 0, JSON.stringify(r.semOrigem));
  t('nos modelos, unilateral sempre com "por perna/lado/braço" e bilateral nunca', r.ruins.length === 0, JSON.stringify(r.ruins));
  t('meta de reps dos unilaterais soma os dois lados', r.metaErrada.length === 0, JSON.stringify(r.metaErrada));
  t('repsComLado: acrescenta, respeita o que já tem e não mexe em bilateral', r.f.a === '10-12 por lado' && r.f.b === '8-12' && r.f.c === '30-45s por lado' && r.f.d === '10-12 por perna', JSON.stringify(r.f));
  t('repsDoLado: tira de quem deixou de ser unilateral e põe em quem passou a ser', r.f.e === '10-12' && r.f.g === '8-12 por perna', JSON.stringify(r.f));
  t('faixaDeReps entende "por perna/lado" e tempo por lado', r.f.fx.unid === 's' && r.f.fx.max === 45 && r.f.fy.max === 12 && r.f.fy.unid === 'reps', JSON.stringify(r.f));
  t('metaRepsDe: 3×10-12 = 33 e 3×10-12 por perna = 66', r.f.mm === 33 && r.f.mu === 66, r.f.mm + ' / ' + r.f.mu);
  t('migração: só o unilateral muda (reps e meta)', JSON.stringify(r.mudou) === '["seg"]' && r.mig[0] === '8-12 por perna|60' && r.mig[1] === '8-12|30', JSON.stringify(r.mig));

  // registro: avanço mostra "por perna", dica, e o total do ranking conta os dois lados
  await p.evaluate(async () => {
    const db = await window.claude.use('db'); const iso = window.__ngTest.todayISO(); const k = window.__ngTest.state().rotina && ['dom','seg','ter','qua','qui','sex','sab'][new Date(iso + 'T12:00:00').getDay()];
    await db.doc('checkins/' + iso).delete().catch(() => {}); /* a semente cria treino hoje (exceto domingo): sem isso o avanço já aparece concluído e some a linha de registro */ await db.doc('rotina/' + k).set({ nome: 'Pernas', ativo: true, exercicios: [{ nome: 'Avanço (afundo) com halteres', series: 2, reps: '10-12', metaReps: 22, musculos: ['quadriceps'] }, { nome: 'Supino reto', series: 2, reps: '8-12', metaReps: 20, musculos: ['peito'] }] });
  });
  await p.reload(); await p.waitForTimeout(1800);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  const rt = await p.evaluate(() => ({ r: JSON.stringify(window.__ngTest.state().rotina[['dom','seg','ter','qua','qui','sex','sab'][new Date().getDay()]].exercicios.map(e => e.nome + ':' + e.reps + ':' + e.metaReps)) }));
  t('rotina salva sem "por perna" foi corrigida ao carregar', /Avanço \(afundo\) com halteres:10-12 por perna:44/.test(rt.r) && /Supino reto:8-12:20/.test(rt.r), rt.r);
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(800);
  const dia = await p.evaluate(() => { const sl = document.querySelector('#week-trail-detail .sl[data-sl="0"]'); return sl ? { lado: (sl.querySelector('.sl-lado') || {}).textContent, faixa: (sl.querySelector('.sl-faixa') || {}).textContent, rot: (sl.querySelector('.sl-lab') || {}).textContent } : null; });
  t('registro do avanço diz "por perna" (meta, rótulo e dica)', dia && /por perna/.test(dia.faixa) && /por perna/.test(dia.rot) && /uma perna/.test(dia.lado) && /soma as duas/.test(dia.lado), JSON.stringify(dia));
  const dia2 = await p.evaluate(() => { const sl = document.querySelector('#week-trail-detail .sl[data-sl="1"]'); return sl ? { lado: !!sl.querySelector('.sl-lado'), rot: (sl.querySelector('.sl-lab') || {}).textContent } : null; });
  t('supino (bilateral) continua sem "por perna" nem dica', dia2 && !dia2.lado && !/por (perna|lado|braço)/.test(dia2.rot), JSON.stringify(dia2));
  t('sem erros de página', p.errs.length === 0, p.errs.join(' | '));
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
