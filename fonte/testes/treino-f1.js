// Treino Fase 1 — lançamento série a série. Uso: node treino-f1.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const hoje = iso(Date.now()), ontem = iso(Date.now() - 864e5);
const kH = MAP[new Date(hoje + 'T00:00:00').getDay()], kO = MAP[new Date(ontem + 'T00:00:00').getDay()];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const exs = [
  { nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] },
  { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] },
  { nome: 'Prancha', series: 3, reps: '30-45s', metaReps: 3, musculos: ['core'] },
];
(async () => {
  const b = await chromium.launch();
  const mk = async (w = 400) => {
    const c = await b.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); } catch (e) { } });
    const p = await c.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
    return { c, p };
  };
  const dump = (p, path) => p.evaluate(async (path) => { const db = await window.claude.use('db'); const d = await db.doc(path).get(); return d.exists ? d.data() : null; }, path);
  let { c, p } = await mk();
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async ([hoje, ontem, kH, kO, exs]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.f1', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ontem });
    for (const k of new Set([kH, kO])) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    await db.doc('checkins/' + hoje).set({ data: hoje, dia: kH, progresso: { 0: 20 } });   // check-in ANTIGO (só total de repetições)
  }, [hoje, ontem, kH, kO, exs]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
  const box = i => p.locator('#week-trail-detail .sl[data-sl="' + i + '"]');
  const txt = async i => (await box(i).innerText()).replace(/\s+/g, ' ');
  t('check-in antigo (20 reps) aparece como 2 de 3 séries', /2 de 3 séries/.test(await txt(0)), await txt(0));
  // registra a 3ª série com 15 (acima da faixa 8-12)
  await box(0).locator('[data-slin]').fill('15'); await box(0).locator('[data-slok]').click(); await p.waitForTimeout(400);
  let c0 = await dump(p, 'checkins/' + hoje);
  t('3ª série com 15 reps gravada (sem teto de repetições)', c0.sets && c0.sets[0] && c0.sets[0].length === 3 && c0.sets[0][2].r === 15, JSON.stringify(c0.sets));
  t('progresso derivado = soma (35, acima de 30)', c0.progresso[0] === 35, c0.progresso[0]);
  t('séries antigas viraram 10+10 (implícitas)', c0.sets[0][0].r === 10 && c0.sets[0][1].r === 10);
  t('exercício 1 fechou (3 de 3) e mostra rótulo "acima da faixa"', /3 de 3 séries/.test(await txt(0)) && /acima/.test(await box(0).locator('.sl-chip').nth(2).getAttribute('aria-label')));
  t('exercício completo mostra só "+ Série extra" (sem campo grande)', (await box(0).locator('[data-slextra]').count()) === 1 && (await box(0).locator('[data-slin]').count()) === 0);
  await box(0).locator('[data-slextra]').click(); await p.waitForTimeout(250);
  t('"Série extra" abre o campo de repetições', (await box(0).locator('[data-slin]').count()) === 1);
  await box(0).locator('[data-slextraoff]').click(); await p.waitForTimeout(250);
  // 3x8 no exercício 2: fecha
  for (let k = 0; k < 3; k++) { await box(1).locator('[data-slin]').fill('8'); await box(1).locator('[data-slok]').click(); await p.waitForTimeout(250); }
  let c1 = await dump(p, 'checkins/' + hoje);
  t('3×8 (24 reps, abaixo da meta antiga de 30) fecha o exercício', c1.sets[1].length === 3 && c1.progresso[1] === 24);
  t('dia ainda não concluído (exercício 3 sem resolver)', !c1.concluido);
  // exercício 3: uma série de 40 s, encerrar aqui
  await box(2).locator('[data-slin]').fill('40'); await box(2).locator('[data-slok]').click(); await p.waitForTimeout(250);
  t('exercício de tempo mostra segundos (40 s)', /40 s/.test(await txt(2)), await txt(2));
  await box(2).locator('[data-slend]').click(); await p.waitForTimeout(400);
  let c2 = await dump(p, 'checkins/' + hoje);
  t('"Encerrar aqui" grava status=parcial e conclui o dia (todos resolvidos)', c2.status && c2.status[2] === 'parcial' && c2.concluido === true, JSON.stringify(c2.status) + ' concluido=' + c2.concluido);
  // XP: (1 + 1 + max(.5,1/3)) / 3 = 0.8333 → 50 XP
  await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(600);
  let nv = await p.evaluate(() => (document.getElementById('nivel-src') || {}).innerText || '');
  t('XP do treino parcial = 50 (83%)', /50 XP/.test(nv), nv.replace(/\s+/g, ' '));
  // pular o exercício 3: retoma, remove a série, pula
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(500);
  await box(2).locator('[data-slresume]').click(); await p.waitForTimeout(300);
  c2 = await dump(p, 'checkins/' + hoje);
  t('Retomar remove o status e reabre o dia', !(c2.status && c2.status[2]) && c2.concluido === false);
  await box(2).locator('[data-slchip="0"]').click(); await p.waitForTimeout(250);
  t('tocar na série abre a edição com o valor atual', (await box(2).locator('[data-slin]').inputValue()) === '40');
  await box(2).locator('[data-slrm]').click(); await p.waitForTimeout(300);
  c2 = await dump(p, 'checkins/' + hoje);
  t('Remover série apaga a série (sem séries restantes)', !(c2.sets && c2.sets[2]));
  await box(2).locator('[data-slskip]').click(); await p.waitForTimeout(300);
  c2 = await dump(p, 'checkins/' + hoje);
  t('"Pular exercício" grava status=pulado e conclui o dia', c2.status && c2.status[2] === 'pulado' && c2.concluido === true);
  await box(2).locator('[data-slmot="cansaco"]').click(); await p.waitForTimeout(250);
  c2 = await dump(p, 'checkins/' + hoje);
  t('motivo opcional gravado', c2.motivo && c2.motivo[2] === 'cansaco');
  // XP: (1+1+0)/3 = .6667 → 40
  await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(600);
  nv = await p.evaluate(() => (document.getElementById('nivel-src') || {}).innerText || '');
  t('XP com 1 exercício pulado = 40 (67%)', /40 XP/.test(nv), nv.replace(/\s+/g, ' '));
  // dia anterior no formato antigo: vale 60
  await p.evaluate(async ([ontem, kO]) => { const db = await window.claude.use('db'); await db.doc('checkins/' + ontem).set({ data: ontem, dia: kO, concluido: true, progresso: { 0: 30, 1: 30, 2: 3 } }); }, [ontem, kO]);
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(600);
  nv = await p.evaluate(() => (document.getElementById('nivel-src') || {}).innerText || '');
  t('check-in antigo concluído continua valendo 60 (total 100 XP)', /100 XP/.test(nv), nv.replace(/\s+/g, ' '));
  // treino ao vivo
  await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(400);
  await p.evaluate(async ([hoje, kH]) => { const db = await window.claude.use('db'); await db.doc('checkins/' + hoje).delete(); }, [hoje, kH]);
  await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p.evaluate(() => { const bt = document.getElementById('btn-treino-ao-vivo'); bt.dataset.acao = 'treino'; bt.click(); }); await p.waitForTimeout(600);
  const lw = p.locator('.live-workout .sl[data-pfx="lw"]');
  t('treino ao vivo mostra o lançamento série a série', (await lw.count()) === 1);
  t('valor sugerido = meio da faixa (10)', (await lw.locator('[data-slin]').inputValue()) === '10');
  await lw.locator('[data-slok]').click(); await p.waitForTimeout(300);
  await lw.locator('[data-slstep="1"]').click(); await lw.locator('[data-slok]').click(); await p.waitForTimeout(300);
  const cl = await dump(p, 'checkins/' + hoje);
  t('ao vivo: séries 10 e 11 gravadas', cl.sets && cl.sets[0] && cl.sets[0].map(s => s.r).join() === '10,11', JSON.stringify(cl.sets));
  await p.evaluate(() => document.querySelector('.modal-backdrop [data-lwclose], .live-workout [data-lwnext]') && document.querySelector('.live-workout [data-lwnext]').click());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  // backup leva sets/status e restaura
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.evaluate(() => document.getElementById('cfg-export-btn').click())]);
  const fs = require('fs'); const path = await dl.path(); const bk = JSON.parse(fs.readFileSync(path, 'utf8'));
  t('backup leva sets e status do check-in', bk.checkins[hoje] && bk.checkins[hoje].sets && bk.checkins[hoje].sets[0].length === 2, JSON.stringify(bk.checkins[hoje] && bk.checkins[hoje].sets));
  const { c: c2c, p: p2 } = await mk(); await p2.goto(URL_); await p2.waitForTimeout(1200);
  await p2.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p2.evaluate(() => document.getElementById('tab-config').click()); await p2.waitForTimeout(400);
  await p2.setInputFiles('#cfg-import-file', path); await p2.waitForSelector('#import-confirm', { timeout: 5000 });
  await p2.evaluate(() => document.getElementById('import-confirm').click()); await p2.waitForTimeout(2000);
  const rest = await dump(p2, 'checkins/' + hoje);
  t('importação restaura as séries lançadas', rest && rest.sets && rest.sets[0].map(s => s.r).join() === '10,11', JSON.stringify(rest && rest.sets));
  // largura 320: sem rolagem horizontal
  const { c: c3, p: p3 } = await mk(320); await p3.goto(URL_); await p3.waitForTimeout(1000);
  await p3.evaluate(async ([hoje, ontem, kH, kO, exs]) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'T', nomeUsuario: 't.t', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', criadoEm: ontem }); await db.doc('rotina/' + kH).set({ nome: 'T', ativo: true, exercicios: exs }); await db.doc('checkins/' + hoje).set({ data: hoje, dia: kH, sets: { 0: [{ r: 10 }, { r: 9 }], 1: [{ r: 12 }] }, status: { 1: 'parcial', 2: 'pulado' }, motivo: { 1: 'dor' } }); }, [hoje, ontem, kH, kO, exs]);
  await p3.reload(); await p3.waitForTimeout(1500); await p3.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  await p3.evaluate(() => document.getElementById('tab-treino').click()); await p3.waitForTimeout(600);
  const ov = await p3.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  t('320 px: sem rolagem horizontal', ov <= 0, 'overflow=' + ov);
  const erros = p.errs.concat(p2.errs, p3.errs);
  t('sem erros de JS/console', erros.length === 0, erros.join(' | '));
  console.log(`\n${ok} ok, ${bad} falhas`);
  await b.close();
  process.exit(bad ? 1 : 0);
})().catch(e => { console.error('ERRO', e); process.exit(1); });
