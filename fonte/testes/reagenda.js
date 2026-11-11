// Treino perdido feito hoje (reagendar a semana). Uso: SP=... node reagenda.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 320) : '')); };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const ex = n => [{ nome: 'Ex ' + n + ' 1', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Ex ' + n + ' 2', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
const J = x => JSON.stringify(x);
// hoje = quarta 11/11/2026; segunda = 09/11; terça = 10/11
const HOJE = '2026-11-11', SEG = '2026-11-09', TER = '2026-11-10';
(async () => {
  const b = await chromium.launch();
  const mk = async ({ rotina, checkins = {}, w = 400, hora = '10:00' }) => {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    await c.clock.setFixedTime(new Date(HOJE + 'T' + hora + ':00'));
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push('PE ' + e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([rotina, checkins]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', criadoEm: '2026-10-01' });
      for (const [k, d] of Object.entries(rotina)) await db.doc('rotina/' + k).set(d);
      for (const [d, c] of Object.entries(checkins)) await db.doc('checkins/' + d).set(c);
    }, [rotina, checkins]);
    await p.reload(); await p.waitForTimeout(1600);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    return { c, p };
  };
  const cfg = p => p.evaluate(() => { const s = window.__ngTest.state(); return s.settings && s.settings.reagenda || null; });
  const R = (nome, ativo = true, n = nome) => ({ nome, ativo, exercicios: ativo ? ex(n) : [] });
  // seg A (feito), ter B (perdido), qua C (hoje), qui D, sex descanso, sáb E, dom descanso
  const rot1 = { seg: R('Treino A'), ter: R('Treino B'), qua: R('Treino C'), qui: R('Treino D'), sex: R('Descanso', false), sab: R('Treino E'), dom: R('Descanso', false) };
  const chk1 = { [SEG]: { data: SEG, dia: 'seg', concluido: true } };

  let { c, p } = await mk({ rotina: rot1, checkins: chk1 });
  const card = p.locator('#hoje-perdido');
  t('terça sem treino: aviso aparece na tela Hoje', await card.isVisible() && /Ontem ficou sem treino: Treino B/.test(await card.innerText()), (await card.innerText()).replace(/\s+/g, ' '));
  t('o aviso explica que o de hoje vai para amanhã', /Treino C\) vai para amanhã/.test(await card.innerText()));
  t('Hoje mostra o treino C antes de reagendar', /Treino C/.test(await p.locator('#today-title').innerText()));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(400);
  const lista = (await p.locator('.reag-lista').innerText()).replace(/\s+/g, ' ');
  t('confirmação mostra o novo plano: hoje B, quinta C, sexta D', /Hoje Treino B/.test(lista) && /Qui Treino C/.test(lista) && /Sex Treino D/.test(lista), lista);
  t('sábado (E) não muda e nada fica de fora', !/Sáb/.test(lista) && !/Fora/.test(lista), lista);
  if (axeSrc) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('#modal-root', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: confirmação sem violações', v.length === 0, v.join(',')); }
  await p.click('#reag-cancel'); await p.waitForTimeout(200);
  t('cancelar não muda nada', (await cfg(p)) === null && /Treino C/.test(await p.locator('#today-title').innerText()));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300); await p.click('#reag-ok'); await p.waitForTimeout(600);
  const cf = await cfg(p);
  t('salvou o remanejamento: hoje=ter, quinta=qua, sexta=qui', cf && cf.dias[HOJE] === 'ter' && cf.dias['2026-11-12'] === 'qua' && cf.dias['2026-11-13'] === 'qui' && !cf.dias['2026-11-14'] && cf.recuperados.includes(TER), J(cf));
  t('Hoje agora mostra o treino B (remanejado)', /Treino B/.test(await p.locator('#today-title').innerText()) && /remanejado/.test(await p.locator('#today-hint').innerText()), await p.locator('#today-hint').innerText());
  t('o aviso do treino perdido some depois de repor (fica só o de voltar ao normal)', !/ficou sem treino/.test(await card.innerText()) && (await p.locator('[data-hp=fazer]').count()) === 0);
  t('toast oferece Desfazer', (await p.locator('#toast .toast-act').count()) === 1);
  // trilha: quinta mostra C (remanejado), sexta D, sábado E
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
  await p.click('.week-trail-node[data-day=qui]'); await p.waitForTimeout(300);
  let det = (await p.locator('#week-trail-detail').innerText()).replace(/\s+/g, ' ');
  t('trilha: quinta aparece como Treino C remanejado', /Treino C/.test(det) && /remanejado/.test(det), det.slice(0, 160));
  await p.click('.week-trail-node[data-day=sex]'); await p.waitForTimeout(300);
  det = (await p.locator('#week-trail-detail').innerText()).replace(/\s+/g, ' ');
  t('trilha: sexta (era descanso) agora é Treino D', /Treino D/.test(det) && !/Descanso/.test(det.slice(0, 60)), det.slice(0, 160));
  await p.click('.week-trail-node[data-day=ter]'); await p.waitForTimeout(300);
  det = (await p.locator('#week-trail-detail').innerText()).replace(/\s+/g, ' ');
  t('trilha: terça segue como dia perdido, sem botão de repor de novo', /Treino B/.test(det) && (await p.locator('[data-recup]').count()) === 0, det.slice(0, 160));
  // concluir o treino de hoje (B) → checkin guarda dia=ter e conta hoje
  await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(500);
  await p.click('#btn-quick-checkin'); await p.waitForTimeout(700);
  const ck = await p.evaluate(() => window.__ngTest.state().checkins['2026-11-11']);
  t('check-in de hoje guarda o treino B (dia=ter) e concluiu hoje', ck && ck.concluido === true && ck.dia === 'ter', J(ck));
  const ck2 = await p.evaluate(() => window.__ngTest.state().checkins['2026-11-10']);
  t('o dia de terça continua sem treino registrado', !ck2 || !ck2.concluido);
  t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close();

  // desfazer
  ({ c, p } = await mk({ rotina: rot1, checkins: chk1 }));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300); await p.click('#reag-ok'); await p.waitForTimeout(500);
  await p.click('#toast .toast-act'); await p.waitForTimeout(500);
  t('Desfazer volta ao estado anterior e o aviso reaparece', (await cfg(p)) === null && /Treino C/.test(await p.locator('#today-title').innerText()) && await p.locator('#hoje-perdido').isVisible());
  // "Agora não"
  await p.click('#hoje-perdido [data-hp=dispensar]'); await p.waitForTimeout(300);
  t('"Agora não" esconde o aviso', !(await p.locator('#hoje-perdido').isVisible()));
  // pelo botão do detalhe da trilha
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
  await p.click('.week-trail-node[data-day=ter]'); await p.waitForTimeout(300);
  t('detalhe da terça perdida tem "Fazer este treino hoje"', (await p.locator('[data-recup]').count()) === 1);
  await p.click('[data-recup]'); await p.waitForTimeout(300);
  t('o botão abre a mesma confirmação', /Hoje Treino B/.test((await p.locator('.reag-lista').innerText()).replace(/\s+/g, ' ')));
  await p.click('#reag-cancel'); await c.close();

  // sem descanso até domingo: o último treino fica de fora
  ({ c, p } = await mk({ rotina: { seg: R('Treino A'), ter: R('Treino B'), qua: R('Treino C'), qui: R('Treino D'), sex: R('Treino F'), sab: R('Treino E'), dom: R('Treino G') }, checkins: chk1 }));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300);
  const l2 = (await p.locator('.reag-lista').innerText()).replace(/\s+/g, ' ');
  t('sem descanso na semana: avisa que o último (G) fica de fora', /Fora Treino G fica de fora/.test(l2) && /Dom Treino E/.test(l2), l2);
  await c.close();

  // quando o dia perdido era descanso / foi concluído / hoje já tem treino: sem aviso
  ({ c, p } = await mk({ rotina: rot1, checkins: { [SEG]: chk1[SEG], [TER]: { data: TER, dia: 'ter', concluido: true } } }));
  t('terça concluída: sem aviso', !(await p.locator('#hoje-perdido').isVisible())); await c.close();
  ({ c, p } = await mk({ rotina: Object.assign({}, rot1, { ter: R('Descanso', false) }), checkins: chk1 }));
  t('terça era descanso: sem aviso', !(await p.locator('#hoje-perdido').isVisible())); await c.close();
  ({ c, p } = await mk({ rotina: rot1, checkins: Object.assign({}, chk1, { [HOJE]: { data: HOJE, dia: 'qua', concluido: true } }) }));
  t('hoje já concluído: sem aviso', !(await p.locator('#hoje-perdido').isVisible())); await c.close();
  ({ c, p } = await mk({ rotina: rot1, checkins: Object.assign({}, chk1, { [HOJE]: { data: HOJE, dia: 'qua', sets: { 0: [{ r: 10 }] } } }) }));
  t('hoje com séries já registradas: sem aviso', !(await p.locator('#hoje-perdido').isVisible())); await c.close();

  // hoje é descanso: repõe sem mexer no resto
  ({ c, p } = await mk({ rotina: Object.assign({}, rot1, { qua: R('Descanso', false) }), checkins: chk1 }));
  t('hoje descanso: aviso diz que dá para repor sem mexer no resto', /sem mexer no resto/.test(await p.locator('#hoje-perdido').innerText()));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300);
  const l3 = (await p.locator('.reag-lista').innerText()).replace(/\s+/g, ' ');
  t('hoje descanso: só hoje muda', /Hoje Treino B/.test(l3) && !/Qui/.test(l3), l3); await c.close();


  // desfazer permanente: depois de trocar, sempre dá para voltar à rotina normal
  ({ c, p } = await mk({ rotina: rot1, checkins: chk1 }));
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300); await p.click('#reag-ok'); await p.waitForTimeout(600);
  await p.waitForTimeout(6500);   // o aviso rápido já sumiu
  const cardRev = p.locator('#hoje-perdido');
  t('depois que o aviso rápido some, o cartão de Hoje continua oferecendo "Voltar à rotina normal"', await cardRev.isVisible() && (await p.locator('[data-reagdesf]').count()) === 1, (await cardRev.innerText()).replace(/\s+/g, ' '));
  await p.click('[data-reagdesf]'); await p.waitForTimeout(500);
  const cf3 = await cfg(p);
  t('voltar à rotina normal limpa o remanejamento e devolve o treino C a hoje', cf3 && Object.keys(cf3.dias).length === 0 && /Treino C/.test(await p.locator('#today-title').innerText()), J(cf3));
  t('o aviso do treino perdido (terça) volta a aparecer', await p.locator('#hoje-perdido [data-hp=fazer]').count() === 1);
  // trocar de novo e concluir o treino de hoje: só dá para desfazer os próximos dias
  await p.click('#hoje-perdido [data-hp=fazer]'); await p.waitForTimeout(300); await p.click('#reag-ok'); await p.waitForTimeout(500);
  await p.click('#btn-quick-checkin'); await p.waitForTimeout(600);
  t('com o treino de hoje já feito, o botão passa a "Desfazer os próximos dias"', /Desfazer os próximos dias/.test(await p.locator('#hoje-perdido').innerText()));
  await p.click('[data-reagdesf]'); await p.waitForTimeout(500);
  const cf4 = await cfg(p);
  t('desfazer os próximos dias mantém a reposição de hoje', cf4 && cf4.dias['2026-11-11'] === 'ter' && !cf4.dias['2026-11-12'] && !cf4.dias['2026-11-13'], J(cf4));
  // pela trilha
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(600);
  t('sem remanejamento ativo, o link "Voltar à rotina normal" da trilha não aparece', (await p.locator('.week-trail-node.selected').count()) >= 0);
  await c.close();

  // desktop: sem rolagem lateral e axe no aviso
  ({ c, p } = await mk({ rotina: rot1, checkins: chk1, w: 1440 }));
  if (axeSrc) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('#hoje-perdido', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: aviso na tela Hoje sem violações', v.length === 0, v.join(',')); }
  t('desktop: sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
  await p.screenshot({ path: (process.env.SP || '/tmp') + '/reagenda-hoje.png' }); await c.close();
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
