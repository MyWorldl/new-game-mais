// Pop-up sem rolagem vazando para a página de trás + cor da barra do navegador (theme-color) acompanhando o tema.
// Uso: node modal-tema.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const hex = rgb => { const m = /(\d+),\s*(\d+),\s*(\d+)/.exec(rgb); return '#' + [m[1], m[2], m[3]].map(v => Number(v).toString(16).padStart(2, '0')).join(''); };
(async () => {
  const b = await chromium.launch();
  // ---------- cor da barra do navegador ----------
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    const lido = () => p.evaluate(() => ({ meta: document.querySelector('meta[name="theme-color"]').content, bg: getComputedStyle(document.body).backgroundColor }));
    let r = await lido();
    t('theme-color: no modo jogo padrão acompanha o fundo da página', r.meta === hex(r.bg), JSON.stringify(r));
    const fundos = new Set([r.meta]);
    for (const tema of ['rosa', 'roxo', 'azul']) for (const modo of ['claro', 'escuro']) {
      await p.evaluate(([tm, md]) => { const h = document.documentElement; h.setAttribute('data-game', 'off'); h.setAttribute('data-tema', tm); h.setAttribute('data-modo', md); }, [tema, modo]);
      await p.waitForTimeout(150);
      r = await lido(); fundos.add(r.meta);
      t('theme-color: ' + tema + ' ' + modo + ' acompanha o fundo', r.meta === hex(r.bg), JSON.stringify(r));
    }
    t('theme-color: muda de verdade entre temas (7 cores diferentes)', fundos.size >= 7, [...fundos].join(' '));
    // pela interface: escolher o tema pastel azul em Configurações
    await p.evaluate(() => { const h = document.documentElement; h.setAttribute('data-game', 'on'); h.removeAttribute('data-tema'); h.removeAttribute('data-modo'); });
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(700);
    await p.locator('.theme-opt[data-tema="azul"]').first().click(); await p.waitForTimeout(500);
    r = await lido();
    t('theme-color: escolher o tema pelo seletor atualiza a barra', r.meta === hex(r.bg) && r.meta !== '#0b1220', JSON.stringify(r));
    await c.close();
  }
  // ---------- pop-up e rolagem da página ----------
  {
    const { c, p } = await abre(b, 390, 'dark', false);
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(800);
    await p.evaluate(() => window.scrollTo(0, 0));
    const livre = await p.evaluate(() => ({ ov: getComputedStyle(document.documentElement).overflowY, rolavel: document.scrollingElement.scrollHeight > innerHeight }));
    t('página rolável antes de abrir o pop-up', livre.rolavel && livre.ov !== 'hidden', JSON.stringify(livre));
    await p.locator('#btn-edit-perfil').first().click(); await p.waitForTimeout(900);
    const info = await p.evaluate(() => { const m = document.querySelector('.modal'); const r = m.getBoundingClientRect(); const cs = getComputedStyle(m); return { y: r.y, h: r.height, rola: m.scrollHeight > m.clientHeight, ob: cs.overscrollBehaviorY, html: getComputedStyle(document.documentElement).overflowY }; });
    t('pop-up: overscroll-behavior contido', info.ob === 'contain', info.ob);
    t('pop-up aberto: html travado (overflow hidden)', info.html === 'hidden', info.html);
    t('pop-up de Editar perfil tem conteúdo rolável (o teste vale)', info.rola);
    await p.mouse.move(195, info.y + info.h / 2);
    for (let k = 0; k < 10; k++) { await p.mouse.wheel(0, 700); await p.waitForTimeout(120); }
    const fim = await p.evaluate(() => ({ sy: scrollY, mt: Math.round(document.querySelector('.modal').scrollTop), max: document.querySelector('.modal').scrollHeight - document.querySelector('.modal').clientHeight }));
    t('rolar além do fim do pop-up: o pop-up chegou ao fim', Math.abs(fim.mt - fim.max) <= 2, JSON.stringify(fim));
    t('rolar além do fim do pop-up: a página de trás não se mexeu', fim.sy === 0, 'scrollY=' + fim.sy);
    // fechar devolve a rolagem
    await p.keyboard.press('Escape'); await p.waitForTimeout(700);
    const depois = await p.evaluate(() => ({ ov: getComputedStyle(document.documentElement).overflowY, tem: !!document.querySelector('.modal-backdrop') }));
    t('pop-up fechado: html volta a rolar', !depois.tem && depois.ov !== 'hidden', JSON.stringify(depois));
    await p.mouse.move(195, 400); await p.mouse.wheel(0, 500); await p.waitForTimeout(400);
    const sy = await p.evaluate(() => scrollY);
    t('pop-up fechado: a página rola de novo', sy > 0, 'scrollY=' + sy);
    t('sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  console.log(ok + ' ok, ' + bad + ' falhas'); await b.close(); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
