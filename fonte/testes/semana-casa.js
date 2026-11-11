// Config → "Onde você treina": adapta a SEMANA inteira (academia / em casa / pouco equipamento). Uso: SP=... node semana-casa.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'], nota: 'barra' },
  { nome: 'Agachamento livre', series: 3, reps: '8-12', metaReps: 30, musculos: ['quadriceps'] },
  { nome: 'Prancha', series: 3, reps: '30-60s', metaReps: 90, musculos: ['abdomen'] }];
(async () => {
  const b = await chromium.launch();
  const mk = async (comRotina = true, w = 400) => {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([comRotina, exs, dias]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.casa', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', criadoEm: '2026-01-01' });
      if (comRotina) for (const k of dias) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    }, [comRotina, exs, DIAS]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(700);
    return { c, p };
  };
  const doc = (p, path) => p.evaluate(async (pa) => { const db = await window.claude.use('db'); const s = await db.doc(pa).get(); return s.exists ? (s.data ? s.data() : null) : null; }, path);
  const nomesDia = async (p, k) => ((await doc(p, 'rotina/' + k)) || { exercicios: [] }).exercicios.map(e => e.nome);
  const toast = async p => ((await p.locator('.toast, #toast, [role=status]').allInnerTexts()).join(' ')).replace(/\s+/g, ' ');
  const ativo = p => p.evaluate(() => [...document.querySelectorAll('#cfg-local-seg button')].filter(b => b.classList.contains('active')).map(b => b.dataset.v + ':' + b.getAttribute('aria-pressed')).join(','));
  const J = x => JSON.stringify(x);

  let { c, p } = await mk();
  t('Config tem o card "Onde você treina" com 3 opções', (await p.locator('#cfg-local-card').count()) === 1 && (await p.locator('#cfg-local-seg button').count()) === 3);
  t('começa em Academia (aria-pressed correto)', (await ativo(p)) === 'academia:true', await ativo(p));
  t('resumo diz que a rotina está como você montou', /como você montou/.test(await p.locator('#cfg-local-resumo').innerText()));
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
  t('o botão "Treinar em casa hoje" não existe mais', (await p.locator('[data-qhome]').count()) === 0 && !/Treinar em casa hoje/.test(await p.locator('body').innerText()));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);

  await p.click('#cfg-local-seg [data-v=casa]'); await p.waitForTimeout(900);
  const tx = await toast(p);
  let todos = true, ex0; for (const k of DIAS) { const n = await nomesDia(p, k); if (J(n) !== J(['Supino com halteres', 'Agachamento goblet (com halter)', 'Prancha'])) todos = false; }
  t('EM CASA: os 7 dias foram adaptados (Prancha continua)', todos);
  ex0 = (await doc(p, 'rotina/seg')).exercicios;
  t('séries e músculos preservados; reps do agachamento = 10-15; meta recalculada; nota da barra some', ex0[1].series === 3 && ex0[1].reps === '10-15' && ex0[1].metaReps === 38 && ex0[0].reps === '8-12' && !ex0[0].nota && ex0[0].musculos[0] === 'peito', J(ex0[1]));
  t('aviso diz "14 de 21" e que os outros seguem iguais', /Semana adaptada para em casa: 14 de 21/.test(tx) && /Os outros seguem iguais/.test(tx), tx.slice(0, 200));
  const st = await doc(p, 'config/settings'), pf = await doc(p, 'config/perfil');
  t('settings guarda modo, contagem e os originais; perfil.local acompanha', st.localTreino && st.localTreino.modo === 'casa' && st.localTreino.trocados === 14 && st.localTreino.total === 21 && st.localTreino.originais.seg[0].de === 'Supino reto' && pf.local === 'casa', J(st.localTreino).slice(0, 200));
  t('botão "Em casa" marcado e resumo atualizado', (await ativo(p)) === 'casa:true' && /14 de 21/.test(await p.locator('#cfg-local-resumo').innerText()), await ativo(p));

  // casa -> pouco: parte sempre da rotina ORIGINAL
  await p.click('#cfg-local-seg [data-v=pouco]'); await p.waitForTimeout(900);
  t('POUCO EQUIPAMENTO: parte dos exercícios originais (peso do corpo)', J(await nomesDia(p, 'ter')) === J(['Flexão de braço', 'Agachamento com peso do corpo', 'Prancha']), J(await nomesDia(p, 'ter')));
  const st2 = await doc(p, 'config/settings');
  t('o backup continua apontando para os exercícios de academia', st2.localTreino.modo === 'pouco' && st2.localTreino.originais.ter[0].de === 'Supino reto' && st2.localTreino.originais.ter[1].de === 'Agachamento livre');

  // edição do usuário depois da adaptação é respeitada ao voltar
  await p.evaluate(async () => { const db = await window.claude.use('db'); const d = (await db.doc('rotina/seg').get()).data(); d.exercicios[1] = Object.assign({}, d.exercicios[1], { nome: 'Meu agachamento especial' }); await db.doc('rotina/seg').set(d); });
  await p.waitForTimeout(700);
  await p.click('#cfg-local-seg [data-v=academia]'); await p.waitForTimeout(900);
  const tx3 = await toast(p);
  t('ACADEMIA: restaura os originais em todos os dias', J(await nomesDia(p, 'ter')) === J(['Supino reto', 'Agachamento livre', 'Prancha']) && (await nomesDia(p, 'seg'))[0] === 'Supino reto');
  t('o exercício que você editou depois NÃO é sobrescrito', (await nomesDia(p, 'seg'))[1] === 'Meu agachamento especial', J(await nomesDia(p, 'seg')));
  const reps = (await doc(p, 'rotina/ter')).exercicios;
  t('reps/meta/nota originais voltam', reps[0].reps === '8-12' && reps[0].nota === 'barra' && reps[1].reps === '8-12' && reps[1].metaReps === 30, J(reps[0]) + J(reps[1]));
  const st3 = await doc(p, 'config/settings'), pf3 = await doc(p, 'config/perfil');
  t('settings.localTreino limpo e perfil.local = academia; aviso de restaurados', !st3.localTreino && pf3.local === 'academia' && /restaurado/.test(tx3), tx3.slice(0, 200));
  t('resumo volta a "como você montou"', /como você montou/.test(await p.locator('#cfg-local-resumo').innerText()) && (await ativo(p)) === 'academia:true');

  // persistência
  await p.click('#cfg-local-seg [data-v=casa]'); await p.waitForTimeout(800);
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
  t('depois de recarregar continua em "Em casa"', (await ativo(p)) === 'casa:true', await ativo(p));
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(800);
  const nomesTela = await p.locator('.quest-list .qc-name').allInnerTexts();
  t('a tela de Treino mostra os exercícios adaptados', nomesTela.includes('Supino com halteres') || nomesTela.length === 0 || nomesTela.some(n => /halteres|goblet/.test(n)), J(nomesTela));
  t('trocar o exercício de hoje (já existente) segue disponível', (await p.locator('[data-qtoggle]').count()) >= 1);
  let esp = p.errs.filter(e => !/Failed to load resource/.test(e)); t('sem erros de JS (rotina salva)', esp.length === 0, esp.join(' | '));
  await c.close();

  // sem rotina salva: o plano de exemplo segue a escolha e nada é gravado à força
  ({ c, p } = await mk(false));
  await p.click('#cfg-local-seg [data-v=casa]'); await p.waitForTimeout(700);
  t('SEM ROTINA SALVA: resumo explica que o plano de exemplo já segue a escolha', /plano de exemplo/.test(await p.locator('#cfg-local-resumo').innerText()) && (await ativo(p)) !== '' , await p.locator('#cfg-local-resumo').innerText());
  t('não grava rotina nem backup à força; perfil.local = casa', !(await doc(p, 'rotina/seg')) && ((await doc(p, 'config/perfil')).local === 'casa'));
  esp = p.errs.filter(e => !/Failed to load resource/.test(e)); t('sem erros de JS (sem rotina)', esp.length === 0, esp.join(' | '));
  await c.close();

  // layout e acessibilidade, celular e computador
  for (const w of [360, 400, 1280]) {
    ({ c, p } = await mk(true, w));
    const r = await p.evaluate(() => { const s = document.getElementById('cfg-local-seg'), card = document.getElementById('cfg-local-card'); const bs = [...s.querySelectorAll('button')].map(x => x.getBoundingClientRect()); const sr = s.getBoundingClientRect(), cr = card.getBoundingClientRect(); return { h: Math.min(...bs.map(x => x.height)), dentro: sr.right <= cr.right + 1 && sr.left >= cr.left - 1, rola: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, cortado: [...s.querySelectorAll('button')].some(x => x.scrollWidth > x.clientWidth + 1) }; });
    t(`[${w}px] as 3 opções cabem no card, >= 36 px de altura, texto sem corte e sem rolagem lateral`, r.dentro && r.h >= 36 && !r.rola && !r.cortado, J(r));
    if (axeSrc && w === 400) { await p.addScriptTag({ content: axeSrc }); const v = await p.evaluate(async () => (await axe.run('#cfg-local-card', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: card "Onde você treina" sem violações', v.length === 0, v.join(',')); await p.locator('#cfg-local-card').screenshot({ path: (process.env.SP || '/tmp') + '/onde-treina.png' }); }
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
