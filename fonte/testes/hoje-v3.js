// Fase 3 do redesign v3: tela Hoje — anel duplo, carrossel de métricas e missões de hoje. Uso: node hoje-v3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const sel = (p, id) => p.evaluate(i => document.getElementById(i).getAttribute('aria-selected'), id);
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark');
    await p.setViewportSize({ width: w, height: 800 });
    const L = '[' + w + '] ';
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(1200);
    // ---- anel duplo ----
    const an = await p.evaluate(() => { const o = document.getElementById('today-ring'), i = document.getElementById('today-ring-semana'); const f = e => { const c = +e.getAttribute('stroke-dasharray'); return c ? 1 - (+e.getAttribute('stroke-dashoffset')) / c : null; }; return { o: o && f(o), i: i && f(i), aria: document.getElementById('today-ring-box').getAttribute('aria-label'), role: document.getElementById('today-ring-box').getAttribute('role') }; });
    t(L + 'anel duplo: anel de fora = hoje (1/1 → 100%)', an.o !== null && Math.abs(an.o - 1) < 0.01, JSON.stringify(an));
    t(L + 'anel duplo: anel de dentro = semana (3 de 4 da meta → 75%)', an.i !== null && Math.abs(an.i - 0.75) < 0.02, JSON.stringify(an));
    t(L + 'anel duplo: descrição em texto para leitor de tela (hoje e semana)', an.role === 'img' && /hoje: 1 de 1 exercícios/i.test(an.aria) && /semana: 3 de 4 treinos/i.test(an.aria), an.aria);
    // ---- carrossel ----
    const cards = p.locator('#hm-trilho .hm-card');
    t(L + 'carrossel: 4 cartões (Sequência, Treinos da semana, Peso atual, Hábitos de hoje)', (await cards.count()) === 4 && JSON.stringify((await cards.locator('.eyebrow').allInnerTexts()).map(s => s.trim().toLowerCase())) === JSON.stringify(['sequência', 'treinos da semana', 'peso atual', 'hábitos de hoje']), (await cards.locator('.eyebrow').allInnerTexts()).join('|'));
    const txt = (await cards.allInnerTexts()).map(s => s.replace(/\s+/g, ' '));
    t(L + 'carrossel: valores reais (43 dias, 3/4, 74,5 kg, 3/3)', /43/.test(txt[0]) && /3\/4/.test(txt[1]) && /74,5/.test(txt[2]) && /3\/3/.test(txt[3]), JSON.stringify(txt));
    t(L + 'carrossel: cada cartão descreve nome, valor e detalhe para leitor de tela', await cards.evaluateAll(es => es.every(e => /^\d de 4: /.test(e.getAttribute('aria-label')))));
    const g = await p.evaluate(() => { const tr = document.getElementById('hm-trilho'), cs = [...tr.querySelectorAll('.hm-card')], s = getComputedStyle(tr); return { sw: tr.scrollWidth, cw: tr.clientWidth, snap: s.scrollSnapType, disp: s.display, dots: getComputedStyle(document.getElementById('hm-dots')).display, h: cs.map(e => Math.round(e.getBoundingClientRect().height)), page: document.documentElement.scrollWidth <= innerWidth + 1 }; });
    if (w < 768) {
      t(L + 'carrossel (celular): rola de lado com encaixe e sem estourar a página', g.sw > g.cw && /x/.test(g.snap) && g.page, JSON.stringify(g));
      t(L + 'carrossel (celular): 4 pontos, o 1º marcado', (await p.locator('#hm-dots .hm-dot').count()) === 4 && (await p.locator('#hm-dots .hm-dot.on').count()) === 1 && await p.evaluate(() => document.querySelector('#hm-dots .hm-dot').classList.contains('on')));
      await p.evaluate(() => { const tr = document.getElementById('hm-trilho'); tr.scrollTo({ left: tr.scrollWidth, behavior: 'instant' }); }); await p.waitForTimeout(500);
      t(L + 'carrossel (celular): ao chegar ao fim o último ponto fica marcado', await p.evaluate(() => { const d = [...document.querySelectorAll('#hm-dots .hm-dot')]; return d[3].classList.contains('on') && !d[0].classList.contains('on'); }));
      await p.evaluate(() => { document.getElementById('hm-trilho').scrollTo({ left: 0, behavior: 'instant' }); });
    } else {
      t(L + 'carrossel (desktop): vira grade de 4 colunas, sem pontos e sem rolagem lateral', g.disp === 'grid' && g.sw <= g.cw + 1 && g.dots === 'none', JSON.stringify(g));
    }
    t(L + 'carrossel: cartões com alvo de toque ≥ 44 px', g.h.every(h => h >= 44), JSON.stringify(g.h));
    // ---- missões ----
    const mi = p.locator('#hoje-missoes .hmi-item');
    t(L + 'missões: 3 missões e contador "2 de 3 feitas"', (await mi.count()) === 3 && /2 de 3 feitas/.test(await p.locator('#hmi-count').innerText()), await p.locator('#hmi-count').innerText());
    const est = (await mi.locator('.hmi-estado').allTextContents()).map(s => s.trim());
    t(L + 'missões: estado em texto (Em aberto, Feita, Feita), não só por cor', JSON.stringify(est) === JSON.stringify(['Em aberto', 'Feita', 'Feita']), JSON.stringify(est));
    t(L + 'missões: botão só nas missões em aberto, com alvo ≥ 44 px', (await p.locator('#hoje-missoes .hmi-go').count()) === 1 && (await p.locator('#hoje-missoes .hmi-go').evaluate(e => e.getBoundingClientRect().height)) >= 44);
    t(L + 'missões: sem rolagem lateral', await p.evaluate(() => { const e = document.getElementById('hoje-missoes'); return e.scrollWidth <= e.clientWidth + 1; }));
    if (w === 390) {
      // cartões e missões acionam o que o app já tem
      await p.locator('#hm-trilho [data-hm="peso"]').click(); await p.waitForTimeout(1200);
      t(L + 'cartão Peso: abre Corpo e foca o campo de peso', (await sel(p, 'tab-corpo')) === 'true' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'm-peso'));
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(700);
      await p.locator('#hm-trilho [data-hm="hab"]').evaluate(e => e.click()); await p.waitForTimeout(1200);
      t(L + 'cartão Hábitos: abre Corpo e foca o campo de sono', (await sel(p, 'tab-corpo')) === 'true' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'h-sono'));
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(700);
      await p.locator('#hm-trilho [data-hm="sem"]').evaluate(e => e.click()); await p.waitForTimeout(1000);
      t(L + 'cartão Treinos da semana: leva ao Treino', (await sel(p, 'tab-treino')) === 'true');
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(700);
      await p.locator('#hoje-missoes .hmi-go').evaluate(e => e.click()); await p.waitForTimeout(900);
      t(L + 'missão do treino: abre o treino ao vivo, como o botão grande', await p.evaluate(() => { const m = document.getElementById('modal-root'); return !!(m && m.children.length && m.matches(':popover-open')); }));
      await p.keyboard.press('Escape'); await p.waitForTimeout(300);
      await p.evaluate(() => { const m = document.getElementById('modal-root'); if (m) { try { m.hidePopover(); } catch (e) {} m.textContent = ''; } });
      // marcar como feito atualiza cartões e missões
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(700);
      await p.evaluate(() => document.getElementById('btn-quick-checkin').click()); await p.waitForTimeout(1500);
      await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
      t(L + 'depois de concluir: missões mostram "3 de 3 feitas" e a semana vira 4/4', /3 de 3 feitas/.test(await p.locator('#hmi-count').innerText()) && /4\/4/.test((await p.locator('#hm-trilho .hm-card').nth(1).innerText()).replace(/\s+/g, '')), await p.locator('#hmi-count').innerText());
      t(L + 'depois de concluir: anel de dentro vai a 100%', await p.evaluate(() => { const i = document.getElementById('today-ring-semana'), c = +i.getAttribute('stroke-dasharray'); return Math.abs(1 - (+i.getAttribute('stroke-dashoffset')) / c - 1) < 0.01; }));
    }
    t(L + 'sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  // ---- sem cadastro (primeira vez): nada quebra ----
  {
    const c = await b.newContext({ viewport: { width: 390, height: 800 }, colorScheme: 'dark' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1800);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(800);
    t('sem cadastro: carrossel com 4 cartões e missão "Fazer o seu cadastro"', (await p.locator('#hm-trilho .hm-card').count()) === 4 && /cadastro/i.test(await p.locator('#hoje-missoes').innerText()), await p.locator('#hoje-missoes').innerText());
    t('sem cadastro: sem erro de console', errs.length === 0, errs.join(' | '));
    await c.close();
  }
  // ---- contraste (axe) em três temas ----
  if (axeSrc) {
    const cenas = [['padrão (Lima)', async p => {}], ['Violeta', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-paleta="violeta"]').click()); }], ['rosa pastel claro', async p => { await p.evaluate(() => document.querySelector('#theme-row [data-tema="rosa"]').click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#theme-modo-seg [data-v="claro"]').click()); }]];
    for (const [nome, fn] of cenas) {
      const { c, p } = await abre(b, 390, 'dark');
      await p.setViewportSize({ width: 390, height: 800 });
      await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(600);
      await fn(p); await p.waitForTimeout(1200);
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(1500);
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('view-painel'), {}); return r.violations.filter(x => !['region'].includes(x.id)).flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' ') + ' :: ' + (n.any[0] && n.any[0].message || n.failureSummary || '')).slice(0, 4)); });
      t('axe na Hoje (' + nome + '): sem violações', v.length === 0, v.join(' | '));
      await c.close();
    }
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
