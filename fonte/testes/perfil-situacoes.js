// Perfil → situações: o pop-up grava tempo/retorno/restrição e "Refazer minha rotina" gera o plano adaptado.
// Uso: node perfil-situacoes.js http://localhost:8791
const { chromium } = require('playwright');
let bad = 0; const t = (n, c, x = '') => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1200);
  await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.sit', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', diasSemana: 4, local: 'academia', criadoEm: '2026-11-01', focos: ['costas'] }); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-perfil').click(); }); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('btn-edit-perfil').click()); await p.waitForTimeout(600);
  const ini = await p.evaluate(() => ({ btns: [...document.querySelectorAll('#p-restr button')].map(b => b.textContent), tempo: !!document.getElementById('p-tempo'), ret: !!document.getElementById('p-retorno') }));
  t('pop-up mostra tempo, retorno e as 3 restrições', ini.tempo && ini.ret && ini.btns.join() === 'Ombro,Joelho,Lombar', JSON.stringify(ini));
  await p.evaluate(() => { const s = document.getElementById('p-tempo'); s.value = '30'; s.dispatchEvent(new Event('change')); document.querySelector('#p-restr button[data-k="joelho"]').click(); document.getElementById('p-refazer').click(); });
  const pres = await p.evaluate(() => ({ j: document.querySelector('#p-restr button[data-k="joelho"]').getAttribute('aria-pressed'), r: document.getElementById('p-refazer').getAttribute('aria-pressed') }));
  t('botões de restrição e refazer ficam marcados (aria-pressed)', pres.j === 'true' && pres.r === 'true', JSON.stringify(pres));
  await p.evaluate(() => document.getElementById('p-save').click()); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const T = __ngTest, s = T.state(); const ex = []; ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].forEach(k => { const d = s.rotina[k]; if (d && d.ativo) ex.push(d.exercicios); }); return { perfil: s.perfil, maxEx: Math.max(...ex.map(e => e.length)), nomes: ex.flat().map(e => e.nome), porque: (s.settings.planoInicial || {}).porque || [], sk: Object.keys(s.settings), ex: s.rotinaIsExample }; });
  t('perfil gravou tempo 30 e restrição joelho', r.perfil.tempoMin === 30 && JSON.stringify(r.perfil.restricoes) === '["joelho"]', JSON.stringify([r.perfil.tempoMin, r.perfil.restricoes]));
  t('rotina refeita: no máximo 4 exercícios por dia', r.maxEx <= 4, r.maxEx);
  t('rotina refeita: sem agachamento/extensora/leg press (joelho)', !r.nomes.some(n => /Agachamento livre|Cadeira extensora|^Leg press$|búlgaro/.test(n)), r.nomes.join('|'));
  t('texto "por que" traz o aviso do joelho e o de tempo', r.porque.some(x => /joelho/i.test(x)) && r.porque.some(x => /30 min/.test(x)), JSON.stringify([r.porque, r.sk, r.ex]));
  t('sem erro de página', errs.length === 0, errs.join('|'));
  await b.close(); process.exit(bad ? 1 : 0);
})();
