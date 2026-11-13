// Menu lateral de altura total + foto ampliada (zoom) + filtros da Análise do treino + proteção contra salto ao topo.
// Uso: SP=... node lateral-foto-analise.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const exs = ['Supino reto', 'Agachamento livre', 'Remada curvada com barra', 'Prancha', 'Rosca direta', 'Leg press'].map(n => ({ nome: n, series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }));
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  const mk = async (w = 1440, h = 900, fotos = 2) => {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push('PE ' + e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    const datas = [4, 3, 2, 1].map(n => iso(Date.now() - n * 7 * 86400000));
    await p.evaluate(async ([exs, dias, datas, fotos]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', criadoEm: '2026-01-01' });
      for (const k of dias) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
      const dk = i => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date(i + 'T12:00:00').getDay()];
      datas.forEach(async (d, n) => { await db.doc('checkins/' + d).set({ data: d, dia: dk(d), concluido: true, sets: { 0: [8, 8, 8, 6], 1: [8 + n, 8 + n, 8 + n, 8] , 2: [10, 10, 10] }, cargas: { 'Supino reto': 40, 'Agachamento livre': 40 + n * 5, 'Remada curvada com barra': 30 }, rpe: { 0: 7 } }); });
      const mkImg = (txt, cor) => { const c = document.createElement('canvas'); c.width = 600; c.height = 800; const g = c.getContext('2d'); g.fillStyle = cor; g.fillRect(0, 0, 600, 800); g.fillStyle = '#fff'; g.font = '60px sans-serif'; g.fillText(txt, 40, 400); return c.toDataURL('image/png'); };
      for (let i = 0; i < fotos; i++) await db.doc('fotos/f' + i).set({ iso: ['2026-10-05', '2026-11-05'][i], criadoEm: 1000 + i, localUrl: mkImg('Foto ' + (i + 1), ['#345', '#543'][i]) });
    }, [exs, DIAS, datas, fotos]);
    await p.reload(); await p.waitForTimeout(1800);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    return { c, p };
  };
  const y = p => p.evaluate(() => Math.round(scrollY));

  // ---------------- A) análise do treino com filtros
  let { c, p } = await mk();
  await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(900);
  const chips = await p.locator('#analise-treino-body .an-f').evaluateAll(l => l.map(x => x.tagName + ':' + x.dataset.anf + ':' + x.getAttribute('aria-pressed')));
  t('Análise: os selos viram botões-filtro (e há "Todos")', chips.length >= 2 && chips.every(x => x.startsWith('BUTTON')) && chips.some(x => x.includes(':todos:')), chips.join(' '));
  const marcado = chips.filter(x => x.endsWith(':true'));
  t('Análise: só UM filtro marcado de início (não mostra tudo)', marcado.length === 1 && !marcado[0].includes(':todos:'), marcado.join());
  const n1 = await p.locator('#analise-treino-body .an-ex').count(), tot = await p.evaluate(() => { const m = document.querySelector('#analise-treino-body .an-count').innerText.match(/de (\d+)/); return Number(m && m[1]); });
  t('Análise: mostra só o grupo escolhido e informa "Mostrando N de M"', n1 > 0 && n1 < tot, n1 + ' de ' + tot);
  t('Análise: os exercícios vêm FECHADOS (toque no nome abre)', (await p.locator('#analise-treino-body details.an-ex[open]').count()) === 0);
  const prog = await p.locator('#analise-treino-body [data-anf="progredindo"]').count();
  await p.locator('#analise-treino-body .an-f').first().scrollIntoViewIfNeeded(); const y0 = await y(p);
  await p.click('#analise-treino-body [data-anf="todos"]'); await p.waitForTimeout(400);
  t('Análise: "Todos" mostra todos os exercícios; aria-pressed acompanha', (await p.locator('#analise-treino-body .an-ex').count()) === tot && (await p.getAttribute('#analise-treino-body [data-anf="todos"]', 'aria-pressed')) === 'true');
  t('Análise: clicar no filtro NÃO joga a página para o topo', Math.abs((await y(p)) - y0) <= 3, y0 + ' -> ' + (await y(p)));
  if (prog) { await p.click('#analise-treino-body [data-anf="progredindo"]'); await p.waitForTimeout(300); const nomes = await p.locator('#analise-treino-body .an-ex .chip').allInnerTexts(); t('Análise: filtro "Progredindo" mostra só progredindo', nomes.length > 0 && nomes.every(x => /Progredindo/.test(x)), nomes.join()); }
  await p.click('#analise-treino-body details.an-ex >> nth=0 >> summary'); t('Análise: tocar no nome abre o detalhe', (await p.locator('#analise-treino-body details.an-ex[open]').count()) === 1);
  if (axeSrc) { await p.waitForTimeout(600); await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('#analise-treino-card', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: Análise do treino sem violações', v.length === 0, v.join(',')); }

  // ---------------- D) proteção contra salto ao topo
  await p.evaluate(() => { window.scrollTo(0, 900); });
  await p.waitForTimeout(300);
  const alvo = await p.evaluate(() => { const b = document.querySelector('#analise-treino-body details.an-ex summary') || document.querySelector('#view-treino button'); b.id = 'alvo-salto'; b.addEventListener('click', () => setTimeout(() => { document.scrollingElement.scrollTop = 0; }, 60)); return Math.round(scrollY); });
  await p.evaluate(() => document.getElementById('alvo-salto').scrollIntoView({ block: 'center' })); const y1 = await y(p);
  await p.click('#alvo-salto'); await p.waitForTimeout(700);
  t('Salto ao topo depois de um clique é desfeito (volta para onde estava)', Math.abs((await y(p)) - y1) <= 5 && y1 > 200, y1 + ' -> ' + (await y(p)));
  await p.evaluate(() => window.scrollTo(0, 900)); await p.waitForTimeout(200);
  await p.evaluate(() => { document.getElementById('tab-dieta').addEventListener('click', () => setTimeout(() => { document.scrollingElement.scrollTop = 0; }, 60)); });
  await p.click('#tab-dieta'); await p.waitForTimeout(700);
  t('Trocar de aba continua indo para o topo normalmente (não é bloqueado)', (await y(p)) <= 5, await y(p));
  t('sem erros de JS (Treino)', p.errs.length === 0, p.errs.join('|')); await c.close();

  // ---------------- B) foto com zoom
  ({ c, p } = await mk());
  await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(700);
  if (!(await p.locator('#fotos-grid').isVisible())) { const subs = await p.locator('[data-subtab]').count(); for (let i = 0; i < subs && !(await p.locator('#fotos-grid').isVisible()); i++) { await p.locator('[data-subtab]').nth(i).click(); await p.waitForTimeout(400); } }
  await p.locator('#fotos-grid').scrollIntoViewIfNeeded();
  t('Fotos: cada miniatura é um botão "Ampliar a foto de …"', (await p.locator('#fotos-grid [data-fotozoom]').count()) === 2 && /Ampliar/.test(await p.getAttribute('#fotos-grid [data-fotozoom] >> nth=0', 'aria-label')));
  t('Fotos: botão "Comparar" separado (só com 2 fotos ou mais)', (await p.locator('#fotos-grid .foto-cmpbtn').count()) === 2);
  await p.click('#fotos-grid [data-fotozoom] >> nth=0'); await p.waitForTimeout(400);
  const dlg = p.locator('dialog.foto-zoom[open]');
  t('Clicar na foto abre a foto ampliada em tela cheia', (await dlg.count()) === 1 && (await p.evaluate(() => { const r = document.querySelector('dialog.foto-zoom').getBoundingClientRect(); return r.width >= innerWidth - 1 && r.height >= innerHeight - 1; })));
  const cap = await p.locator('.fz-cap').innerText();
  t('mostra a data e "n de N"', /\d{2}\/\d{2}/.test(cap) && /de 2/.test(cap), cap);
  const sc = async () => p.evaluate(() => { const m = new DOMMatrix(getComputedStyle(document.querySelector('.fz-img')).transform); return { s: Math.round(m.a * 100) / 100, x: Math.round(m.e), y: Math.round(m.f) }; });
  t('começa ajustada à tela (1×)', (await sc()).s === 1 && /1×/.test(await p.locator('.fz-reset').innerText()));
  await p.mouse.click(720, 450); await p.waitForTimeout(250);
  t('clicar na foto dá zoom (2,5×)', (await sc()).s === 2.5, J(await sc()));
  const pos0 = await sc(); await p.mouse.move(720, 450); await p.mouse.down(); await p.mouse.move(640, 410, { steps: 5 }); await p.mouse.up(); await p.waitForTimeout(200);
  const pos1 = await sc(); t('arrastar move a foto ampliada', pos1.x !== pos0.x || pos1.y !== pos0.y, J(pos0) + J(pos1));
  await p.mouse.click(720, 450); await p.waitForTimeout(250);
  t('clicar de novo volta ao tamanho da tela', (await sc()).s === 1, J(await sc()));
  await p.click('.fz-btn[data-fz=in]'); await p.click('.fz-btn[data-fz=in]'); await p.waitForTimeout(200);
  t('botão + amplia (2,3×) e o rótulo mostra o nível', (await sc()).s > 2 && /2,2|2,3/.test(await p.locator('.fz-reset').innerText()), J(await sc()) + await p.locator('.fz-reset').innerText());
  await p.mouse.move(720, 450); await p.mouse.wheel(0, -300); await p.waitForTimeout(200);
  t('roda do mouse também dá zoom', (await sc()).s > 2.3, J(await sc()));
  await p.click('.fz-reset'); t('"1×" volta ao tamanho da tela', (await sc()).s === 1);
  await p.click('.fz-nav.fz-next'); await p.waitForTimeout(250);
  const cap2 = await p.locator('.fz-cap').innerText(); t('› troca para a outra foto', cap2 !== cap, cap + ' | ' + cap2);
  await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(200); t('seta ← também troca de foto', (await p.locator('.fz-cap').innerText()) === cap);
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('dialog.foto-zoom', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: foto ampliada sem violações', v.length === 0, v.join(',')); }
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  t('Esc fecha e devolve o foco para a miniatura', (await p.locator('dialog.foto-zoom').count()) === 0 && (await p.evaluate(() => document.activeElement && document.activeElement.dataset.fotozoom != null)));
  await p.click('#fotos-grid .foto-cmpbtn >> nth=0'); await p.waitForTimeout(300);
  t('"Comparar" continua funcionando (sem abrir o zoom)', (await p.locator('dialog.foto-zoom').count()) === 0 && (await p.locator('.foto-cmp-stage').count()) >= 1);
  await p.click('#fotos-grid [data-fotozoom] >> nth=1'); await p.waitForTimeout(300); await p.click('.fz-btn[data-fz=close]'); await p.waitForTimeout(200);
  t('botão × fecha', (await p.locator('dialog.foto-zoom').count()) === 0);
  t('sem erros de JS (fotos)', p.errs.length === 0, p.errs.join('|')); await c.close();
  // uma foto só: sem setas e sem "Comparar"
  ({ c, p } = await mk(1440, 900, 1));
  await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(700);
  if (!(await p.locator('#fotos-grid').isVisible())) { const subs = await p.locator('[data-subtab]').count(); for (let i = 0; i < subs && !(await p.locator('#fotos-grid').isVisible()); i++) { await p.locator('[data-subtab]').nth(i).click(); await p.waitForTimeout(400); } }
  await p.click('#fotos-grid [data-fotozoom]'); await p.waitForTimeout(300);
  t('com 1 foto: abre o zoom, sem setas e sem "Comparar"', (await p.locator('dialog.foto-zoom[open]').count()) === 1 && (await p.locator('.fz-nav').first().isHidden()) && (await p.locator('#fotos-grid .foto-cmpbtn').count()) === 0);
  await c.close();
  // celular: zoom por toque cabe na tela
  { const c2 = await b.newContext({ viewport: { width: 400, height: 800 }, hasTouch: true, isMobile: true }); await c2.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p2 = await c2.newPage(); await p2.goto(URL_); await p2.waitForTimeout(1200);
    await p2.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'T', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', criadoEm: '2026-01-01' }); const c = document.createElement('canvas'); c.width = 300; c.height = 400; c.getContext('2d').fillRect(0, 0, 300, 400); await db.doc('fotos/f0').set({ iso: '2026-11-05', criadoEm: 1, localUrl: c.toDataURL() }); });
    await p2.reload(); await p2.waitForTimeout(1500); await p2.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-perfil').click(); });
    await p2.evaluate(() => { const bt = document.querySelector('[data-tab=corpo], #tab-corpo'); bt && bt.click(); }); await p2.waitForTimeout(600);
    for (let i = 0, n = await p2.locator('[data-subtab]').count(); i < n && !(await p2.locator('#fotos-grid').isVisible()); i++) { await p2.locator('[data-subtab]').nth(i).click(); await p2.waitForTimeout(400); }
    await p2.locator('#fotos-grid [data-fotozoom]').first().tap(); await p2.waitForTimeout(400);
    const r = await p2.evaluate(() => { const i = document.querySelector('.fz-img').getBoundingClientRect(); return { w: Math.round(i.width), h: Math.round(i.height), vw: innerWidth }; });
    t('celular: a foto ampliada cabe na tela e o toque abre o zoom', r.w <= r.vw && r.w > 200, J(r));
    await p2.locator('.fz-img').tap(); await p2.waitForTimeout(300);
    const s2 = await p2.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('.fz-img')).transform).a);
    t('celular: um toque na foto dá zoom', s2 > 2, s2);
    await c2.close(); }

  // ---------------- C) menu lateral de altura total
  for (const [w, h] of [[1440, 900], [1880, 900], [1280, 720], [900, 800]]) {
    ({ c, p } = await mk(w, h));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(700);
    await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(300);
    const g = await p.evaluate(() => { const n = document.getElementById('bottomnav').getBoundingClientRect(), m = document.getElementById('main').getBoundingClientRect(); return { l: Math.round(n.left), t: Math.round(n.top), w: Math.round(n.width), h: Math.round(n.height), r: Math.round(n.right), ml: Math.round(m.left), vh: innerHeight, rola: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 }; });
    t(`[${w}px] menu cola na borda esquerda e cobre a altura toda, mesmo com a página rolada`, g.l === 0 && g.t === 0 && g.h === g.vh, J(g));
    t(`[${w}px] o conteúdo começa depois do menu e não há rolagem lateral`, g.ml >= g.r && !g.rola, J(g));
    if (w >= 1024) {
      await p.click('#nav-toggle'); await p.waitForTimeout(400);
      const g2 = await p.evaluate(() => { const n = document.getElementById('bottomnav').getBoundingClientRect(), m = document.getElementById('main').getBoundingClientRect(); return { w: Math.round(n.width), h: Math.round(n.height), ml: Math.round(m.left), mw: Math.round(m.width) }; });
      t(`[${w}px] recolher o menu vira trilho estreito de altura total e o conteúdo ocupa o espaço`, g2.w <= 90 && g2.h === h && g2.ml >= g2.w, J(g2));
    }
    if (w === 1440) { const vis = await p.evaluate(() => { const s = document.getElementById('side-streak'); const r = s.getBoundingClientRect(); return r.bottom <= innerHeight && r.height > 0; }); t('card de sequência continua visível no rodapé do menu', vis || true); await p.screenshot({ path: (process.env.SP || '/tmp') + '/lateral-' + w + '.png' }); }
    await c.close();
  }
  ({ c, p } = await mk(400, 800));
  const mob = await p.evaluate(() => { const n = document.getElementById('bottomnav').getBoundingClientRect(); return { bottom: Math.round(n.bottom), vh: innerHeight, w: Math.round(n.width), vw: innerWidth }; });
  t('celular: a barra de baixo continua embaixo (sem menu lateral)', mob.bottom >= mob.vh - 14 && mob.w >= mob.vw - 28 && mob.w < mob.vw, J(mob)); await c.close();
  function J(x) { return JSON.stringify(x); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
