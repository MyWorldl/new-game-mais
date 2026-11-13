// Fase 2 do redesign v3: barra inferior de 4 itens + botão central com menu de ações rápidas. Uso: node nav-acoes.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const sel = async (p, id) => p.evaluate(i => document.getElementById(i).getAttribute('aria-selected'), id);
(async () => {
  const b = await chromium.launch();
  // ---------- celular ----------
  for (const w of [320, 390]) {
    const { c, p } = await abre(b, w, 'dark');
    await p.setViewportSize({ width: w, height: 760 });
    const L = '[' + w + '] ';
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(800);
    const vis = await p.evaluate(() => [...document.querySelectorAll('#main-tabs .tab-btn')].filter(e => e.offsetParent !== null).map(e => e.dataset.tab));
    t(L + 'barra: 4 itens visíveis (Hoje, Treino, Dieta, Corpo), sem Perfil', JSON.stringify(vis) === JSON.stringify(['painel', 'treino', 'dieta', 'corpo']), JSON.stringify(vis));
    const g = await p.evaluate(() => { const f = document.getElementById('nav-fab').getBoundingClientRect(), n = document.getElementById('bottomnav').getBoundingClientRect(); return { cx: f.left + f.width / 2, vw: innerWidth, w: f.width, h: f.height, topo: f.top < n.top, tabs: [...document.querySelectorAll('#main-tabs .tab-btn')].filter(e => e.offsetParent).map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right), Math.round(r.height)]; }) }; });
    t(L + 'botão central: centralizado e com alvo de toque ≥ 44 px', Math.abs(g.cx - g.vw / 2) <= 1.5 && g.w >= 44 && g.h >= 44, JSON.stringify(g));
    const f = g.tabs; const cx = g.cx;
    t(L + 'botão central não cobre nenhum item da barra', f.every(([l, r]) => r <= cx - 28 || l >= cx + 28), JSON.stringify(f));
    t(L + 'itens da barra com altura ≥ 44 px', f.every(x => x[2] >= 44));
    t(L + 'sem rolagem horizontal', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    // avatar abre o Perfil
    await p.click('#top-avatar'); await p.waitForTimeout(700);
    t(L + 'avatar abre o Perfil e fica marcado (aria-current)', (await sel(p, 'tab-perfil')) === 'true' && await p.evaluate(() => document.getElementById('top-avatar').getAttribute('aria-current') === 'page' && document.getElementById('top-avatar').classList.contains('on')));
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(600);
    t(L + 'avatar perde a marca ao sair do Perfil', await p.evaluate(() => !document.getElementById('top-avatar').hasAttribute('aria-current')));
    if (w === 390) {
      const fab = p.locator('#nav-fab'), menu = p.locator('#nav-acoes');
      t(L + 'menu fechado por padrão (aria-expanded=false, oculto)', (await fab.getAttribute('aria-expanded')) === 'false' && !(await menu.isVisible()));
      await fab.click(); await p.waitForTimeout(400);
      t(L + 'abrir: menu visível com 4 itens e aria-expanded=true', (await menu.isVisible()) && (await fab.getAttribute('aria-expanded')) === 'true' && (await menu.locator('[role=menuitem]').count()) === 4);
      t(L + 'abrir: foco vai para o 1º item', await p.evaluate(() => document.activeElement === document.querySelector('#nav-acoes .na-item')));
      const rot = (await menu.locator('.na-tx b').allInnerTexts()).map(s => s.trim());
      t(L + 'rótulos das ações', /treino/i.test(rot[0]) && rot[1] === 'Registrar medição' && rot[2] === 'Hábitos do dia' && rot[3] === 'Marcar treino como feito', JSON.stringify(rot));
      const alt = await menu.locator('.na-item').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
      t(L + 'itens do menu com altura ≥ 44 px', alt.every(h => h >= 44), JSON.stringify(alt));
      t(L + 'menu dentro da tela', await p.evaluate(() => { const r = document.getElementById('nav-acoes').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0; }));
      await p.keyboard.press('ArrowDown');
      t(L + 'seta para baixo move o foco para o 2º item', await p.evaluate(() => document.activeElement === document.querySelectorAll('#nav-acoes .na-item')[1]));
      await p.keyboard.press('End');
      t(L + 'End vai ao último, Home ao primeiro', await p.evaluate(() => document.activeElement === document.querySelectorAll('#nav-acoes .na-item')[3]));
      await p.keyboard.press('Home');
      if (axeSrc) {
        await p.evaluate(axeSrc);
        const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('bottomnav'), {}); return r.violations.map(x => x.id + ': ' + x.nodes.map(n => n.target.join(' ')).join(', ')); });
        t(L + 'axe: barra + menu aberto sem violações', v.length === 0, v.join(' | '));
      }
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      t(L + 'Esc fecha e devolve o foco ao botão', !(await menu.isVisible()) && await p.evaluate(() => document.activeElement === document.getElementById('nav-fab')));
      await fab.click(); await p.waitForTimeout(300);
      await p.mouse.click(195, 200); await p.waitForTimeout(400);
      t(L + 'clicar fora fecha o menu', !(await menu.isVisible()));
      // ação: registrar medição
      await fab.click(); await p.waitForTimeout(300);
      await p.locator('#nav-acoes .na-item').nth(1).click(); await p.waitForTimeout(1200);
      t(L + 'Registrar medição: abre Corpo e foca o campo de peso', (await sel(p, 'tab-corpo')) === 'true' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'm-peso'));
      t(L + 'menu fecha depois da ação', !(await menu.isVisible()));
      // ação: hábitos
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(500);
      await fab.click(); await p.waitForTimeout(300);
      await p.locator('#nav-acoes .na-item').nth(2).click(); await p.waitForTimeout(1200);
      t(L + 'Hábitos do dia: abre Corpo e foca o campo de sono', (await sel(p, 'tab-corpo')) === 'true' && await p.evaluate(() => document.activeElement && document.activeElement.id === 'h-sono'));
      // ação: treino
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(500);
      await fab.click(); await p.waitForTimeout(300);
      await p.locator('#nav-acoes .na-item').nth(0).click(); await p.waitForTimeout(1200);
      const ao = await p.evaluate(() => { const m = document.getElementById('modal-root'); return !!(m && m.children.length && m.matches(':popover-open')); });
      t(L + 'Continuar treino: abre o treino ao vivo, como o botão grande do Hoje', ao);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await p.evaluate(() => { const m = document.getElementById('modal-root'); if (m) { try { m.hidePopover(); } catch (e) {} m.textContent = ''; } });
      // ação: marcar feito (usa o mesmo botão do Hoje) e depois fica desligada
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(600);
      const antes = await p.evaluate(() => !document.getElementById('btn-quick-checkin').hidden);
      await fab.click(); await p.waitForTimeout(300);
      const dis0 = await p.locator('#nav-acoes .na-item').nth(3).getAttribute('aria-disabled');
      t(L + 'Marcar como feito: habilitado quando há treino em aberto', antes && dis0 === null, 'antes=' + antes + ' dis=' + dis0);
      await p.locator('#nav-acoes .na-item').nth(3).click(); await p.waitForTimeout(1500);
      await p.evaluate(() => document.querySelectorAll('.modal-backdrop, dialog[open]').forEach(x => { try { x.close ? x.close() : x.remove(); } catch (e) { x.remove(); } }));
      await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(900);
      t(L + 'Marcar como feito: registra o treino de hoje (o Hoje passa a mostrar "Treino concluído")', /conclu[ií]do/i.test(await p.locator('#today-primary-label').innerText()), await p.locator('#today-primary-label').innerText());
      await fab.click(); await p.waitForTimeout(300);
      t(L + 'Marcar como feito: depois de registrado fica desligado (aria-disabled) com explicação em texto', (await p.locator('#nav-acoes .na-item').nth(3).getAttribute('aria-disabled')) === 'true' && /Já registrado hoje/.test(await p.locator('#nav-acoes .na-item').nth(3).innerText()));
      await p.keyboard.press('Escape');
    }
    t(L + 'sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  // ---------- movimento reduzido ----------
  {
    const c = await b.newContext({ viewport: { width: 390, height: 760 }, reducedMotion: 'reduce', colorScheme: 'dark' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
    const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    const dur = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--dur-base').trim());
    t('movimento reduzido: tokens de duração ficam ~0', /^(\.01|0\.01)ms$/.test(dur) || dur === '0ms', dur);
    await c.close();
  }
  // ---------- desktop ----------
  {
    const { c, p } = await abre(b, 1280, 'dark');
    const v = await p.evaluate(() => ({ fab: getComputedStyle(document.getElementById('nav-fab')).display, perfil: document.getElementById('tab-perfil').offsetParent !== null, extras: ['tab-glossario', 'tab-config'].every(i => document.getElementById(i).offsetParent !== null) }));
    t('[1280] menu lateral completo: Perfil, Glossário e Config visíveis; sem botão central', v.fab === 'none' && v.perfil && v.extras, JSON.stringify(v));
    await c.close();
  }
  // ---------- tema pastel claro ----------
  if (axeSrc) {
    const { c, p } = await abre(b, 390, 'light');
    await p.setViewportSize({ width: 390, height: 760 });
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#theme-row [data-tema="rosa"]').click()); await p.waitForTimeout(500);
    await p.evaluate(() => document.querySelector('#theme-modo-seg [data-v="claro"]').click()); await p.waitForTimeout(1200);
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(1200);
    await p.click('#nav-fab'); await p.waitForTimeout(700);
    await p.evaluate(axeSrc);
    const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('bottomnav'), {}); return r.violations.map(x => x.id + ': ' + x.nodes.map(n => n.target.join(' ') + ' ' + (n.any[0] && n.any[0].message || '')).join(', ')); });
    t('pastel rosa claro: barra + menu aberto sem violações (axe)', v.length === 0, v.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
