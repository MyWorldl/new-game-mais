// Regra única de "dia de treino" (ligado + com exercícios), texto do plano coerente com perfil/rotina e rótulos do objetivo sem sobreposição.
// Uso: node regra-dia-treino.js http://localhost:8791
const { chromium } = require('playwright');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
async function abre(b, w, seed) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'dark' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async (s) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set(s.perfil);
    await db.doc('config/settings').set(s.settings);
    const ex = n => ({ nome: n, series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] });
    for (const k of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']) {
      const r = s.rotina[k] || { ativo: false, ex: [] };
      await db.doc('rotina/' + k).set({ nome: r.ativo ? 'Treino ' + k : 'Descanso', ativo: r.ativo, exercicios: r.ex.map(ex) });
    }
    await db.doc('medicoes/' + s.perfil.criadoEm).set({ pesoKg: 74.5 });
  }, seed);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p };
}
const hoje = iso(Date.now()), cadastro = iso(Date.now() - 2 * 864e5);
const perfil = { nomeCompleto: 'Teste', nomeUsuario: 'teste.regra', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', diasSemana: 6, local: 'academia', criadoEm: cadastro, focos: ['costas'] };
const settings = { metaSemanal: 6, planoInicial: { split: 'Full Body', sessoes: 3, exp: 'iniciante', local: 'academia', criadoEm: cadastro, visto: false, porque: ['Você está começando: treinar o corpo todo 3× por semana dá prática em cada movimento e deixa dias de descanso entre as sessões.', 'Você escolheu 6 dias, mas para o seu nível o plano usa 3 sessões: é o que dá para recuperar bem.'] } };
const E = ['Supino', 'Remada'];
const rotina6x1 = { seg: { ativo: true, ex: E }, ter: { ativo: true, ex: [] }, qua: { ativo: true, ex: E }, qui: { ativo: true, ex: [] }, sex: { ativo: true, ex: E }, sab: { ativo: true, ex: [] } };
(async () => {
  const b = await chromium.launch();
  const { p } = await abre(b, 390, { perfil, settings, rotina: rotina6x1 });
  const f = await p.evaluate(() => ({ dias: __ngTest.diasAtivos().length, ligados: __ngTest.diasLigados().length, vazios: __ngTest.diasLigadosVazios().join(','), meta: __ngTest.metaSemanalMin(), sem: __ngTest.statsSemana(__ngTest.mondayOfISO(__ngTest.todayISO())), semana: __ngTest.computeWeeklyChallenges().map(c => c.total) }));
  t('regra única: 6 dias ligados, 3 com exercícios → 3 dias de treino', f.dias === 3 && f.ligados === 6 && f.vazios === 'ter,qui,sab', JSON.stringify(f));
  t('regra única: a meta semanal nunca passa dos dias de treino (6 salvo → 3)', f.meta === 3, f.meta);
  t('regra única: estatística da semana e missões usam os mesmos 3 dias', f.semana[0] <= 3 && f.semana[1] === 3, JSON.stringify(f));
  // semana passada: só conta dias desde o cadastro e usa a mesma conta da meta
  const rec = await p.evaluate(() => { __ngTest.renderLastWeekRecap(); const el = document.getElementById('last-week-recap'); const lm = __ngTest.addDaysISO(__ngTest.mondayOfISO(__ngTest.todayISO()), -7); return { hidden: el.hidden, txt: document.getElementById('last-week-recap-text').textContent, cap: __ngTest.statsSemana(lm).cap }; });
  const m = /Semana passada: (\d+) de (\d+)/.exec(rec.txt);
  t('semana passada: o "de N" é o mesmo da conta da meta (nada antes do cadastro)', rec.hidden || (m && Number(m[2]) === rec.cap), JSON.stringify(rec));
  {
    const lastMon = new Date(); lastMon.setDate(lastMon.getDate() - ((lastMon.getDay() + 6) % 7) - 7);
    const sexta = iso(lastMon.getTime() + 4 * 864e5);
    const rot6 = {}; for (const k of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab']) rot6[k] = { ativo: true, ex: E };
    const { p: q } = await abre(b, 390, { perfil: Object.assign({}, perfil, { criadoEm: sexta }), settings: { metaSemanal: 6 }, rotina: rot6 });
    const r2 = await q.evaluate(() => { __ngTest.renderLastWeekRecap(); const lm = __ngTest.addDaysISO(__ngTest.mondayOfISO(__ngTest.todayISO()), -7); return { hidden: document.getElementById('last-week-recap').hidden, txt: document.getElementById('last-week-recap-text').textContent, cap: __ngTest.statsSemana(lm).cap }; });
    const m2 = /Semana passada: (\d+) de (\d+) treinos? concluídos?\. A meta era (\d+)/.exec(r2.txt);
    t('semana passada (conta criada na sexta anterior): "0 de 2", não "de 6", e a meta bate com o "de"', !r2.hidden && m2 && m2[2] === '2' && r2.cap === 2 && Number(m2[3]) <= 2, JSON.stringify(r2));
    await q.context().close();
  }
  // formato: mostra 3×4 e avisa dos dias vazios
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(900);
  const fm = await p.evaluate(() => ({ now: document.getElementById('formato-now').textContent, vz: document.getElementById('formato-vazios').textContent, vzHidden: document.getElementById('formato-vazios').hidden }));
  t('formato: "Hoje: 3×4" (só dias com exercícios)', fm.now === 'Hoje: 3×4', fm.now);
  t('formato: avisa os 3 dias ligados sem exercícios, que contam como descanso', !fm.vzHidden && /3 dias ligados sem exercícios \(Ter, Qui, Sáb\)/.test(fm.vz) && /contam como descanso/.test(fm.vz), fm.vz);
  // texto do plano acompanha o perfil (Intermediário) e a rotina real
  const pl = await p.evaluate(() => { const el = document.getElementById('plano-porque-treino'); return { hidden: el.hidden, h: el.querySelector('h3') && el.querySelector('h3').textContent, txt: el.innerText }; });
  t('plano: título com 3 treinos por semana', !pl.hidden && /3 treinos por semana/.test(pl.h), pl.h);
  t('plano: sem "Você está começando" para quem é Intermediário', !/Você está começando/.test(pl.txt), pl.txt);
  t('plano: sem a frase velha "para o seu nível o plano usa 3" (intermediário sustenta 4)', !/para o seu nível o plano usa/.test(pl.txt), pl.txt);
  t('plano: explica que a rotina tem 3 dos 6 dias escolhidos', /Você escolheu 6 dias e a rotina tem 3 com exercícios/.test(pl.txt), pl.txt);
  // preenchendo os dias vazios, tudo passa a 6 e a explicação some
  await p.evaluate(async () => { const db = await window.claude.use('db'); for (const k of ['ter', 'qui', 'sab']) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: [{ nome: 'Agachamento', series: 3, reps: '8-12', metaReps: 30, musculos: ['quadriceps'] }] }); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(900);
  const f2 = await p.evaluate(() => { return { dias: __ngTest.diasAtivos().length, meta: __ngTest.metaSemanalMin(), now: document.getElementById('formato-now').textContent, vzHidden: document.getElementById('formato-vazios').hidden, txt: document.getElementById('plano-porque-treino').innerText, h: document.querySelector('#plano-porque-treino h3').textContent }; });
  t('preenchido: 6 dias de treino, meta 6 e formato 6×1', f2.dias === 6 && f2.meta === 6 && f2.now === 'Hoje: 6×1' && f2.vzHidden, JSON.stringify(f2));
  t('preenchido: texto do plano sem aviso de dias faltando, título 6 treinos', !/Você escolheu/.test(f2.txt) && /Rotina|rotina/.test(f2.h) && /6 treinos por semana/.test(f2.h), f2.h + ' | ' + f2.txt);
  // o texto gerado para o mesmo perfil/rotina do plano inicial é idêntico ao do plano inicial (nada muda para quem não mexeu)
  const igual = await p.evaluate(() => {
    const casos = [{ experiencia: 'iniciante', diasSemana: 3, local: 'academia', objetivo: 'manutencao', idade: 30 }, { experiencia: 'iniciante', diasSemana: 6, local: 'casa', objetivo: 'superavit', idade: 25 }, { experiencia: 'intermediario', diasSemana: 4, local: 'pouco', objetivo: 'deficit', idade: 40 }, { experiencia: 'avancado', diasSemana: 6, local: 'academia', objetivo: 'superavit', idade: 28 }, { experiencia: 'avancado', diasSemana: 5, local: 'academia', objetivo: 'manutencao', idade: 17 }];
    return casos.map(c => { const pl = __ngTest.planoInicial(c); const o = { exp: pl.exp, split: pl.split, n: pl.sessoes, pedidos: Math.max(2, Math.min(6, c.diasSemana)), local: pl.local, menor: c.idade < 18, objetivo: c.objetivo === 'superavit' || (c.objetivo === 'deficit' && c.idade >= 18) ? c.objetivo : 'manutencao', nivel: { trocas: pl.nivel, grupo: pl.nivelGrupo } }; return JSON.stringify(__ngTest.montaPorque(o)) === JSON.stringify(pl.porque); });
  });
  t('plano: montaPorque reproduz exatamente o texto do plano inicial (5 perfis)', igual.every(Boolean), JSON.stringify(igual));
  t('sem erros de página', p.errs.length === 0, p.errs.join(' | '));
  // rótulos do objetivo: nunca se sobrepõem (320, 360, 390 px)
  for (const w of [320, 360, 390]) {
    const { p: q } = await abre(b, w, { perfil, settings, rotina: rotina6x1 });
    await q.evaluate(() => document.getElementById('tab-dieta').click()); await q.waitForTimeout(900);
    const r = await q.evaluate(() => [...document.querySelectorAll('#seg-objetivo button')].filter(x => !x.hidden).map(x => { const b = x.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, bt: b.bottom, over: x.scrollWidth > x.clientWidth + 1 }; }));
    const cruza = r.some((a, i) => r.some((c, j) => j > i && a.l < c.r - 0.5 && c.l < a.r - 0.5 && a.t < c.bt - 0.5 && c.t < a.bt - 0.5));
    t('[' + w + '] objetivo: 3 rótulos, sem sobreposição e sem texto cortado', r.length === 3 && !cruza && !r.some(x => x.over), JSON.stringify(r));
    t('[' + w + '] objetivo: sem rolagem lateral na página', await q.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    await q.context().close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
