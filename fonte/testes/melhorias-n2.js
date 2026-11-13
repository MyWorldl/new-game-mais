// Melhorias da noite 2: página de instalação (instalar.html) e novo widget de exercício. Uso: node melhorias-n2.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const BASE = process.argv[2] || 'http://localhost:8791';
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
};
async function pagina(b, { ua, w = 390, scheme = 'dark', standalone } = {}) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, userAgent: ua, colorScheme: scheme });
  if (standalone) await c.addInitScript(() => { const mm = window.matchMedia.bind(window); window.matchMedia = q => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() { }, removeEventListener() { }, addListener() { }, removeListener() { } } : mm(q); });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/service-?worker|sw\.js|favicon/i.test(m.text())) p.errs.push(m.text()); });
  await p.goto(BASE + '/instalar.html'); await p.waitForTimeout(700); return { c, p };
}
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }, s);
(async () => {
  const b = await chromium.launch();
  // ---- página de instalação ----
  for (const [nome, ua, esperado] of [['iPhone (Safari)', UA.ios, 'ios'], ['Android', UA.android, 'android'], ['computador', undefined, 'pc']]) {
    const { c, p } = await pagina(b, { ua });
    const sel = await p.evaluate(() => document.querySelector('[role=tab][aria-selected=true]').dataset.p);
    t(nome + ': aba certa já selecionada', sel === esperado, sel);
    const paineis = await p.evaluate(() => [...document.querySelectorAll('[role=tabpanel]')].filter(x => !x.hidden).map(x => x.id));
    t(nome + ': só um painel visível (' + esperado + ')', paineis.length === 1 && paineis[0] === 'p-' + esperado, paineis.join());
    if (esperado === 'pc') {
      const qr = await p.evaluate(() => { const i = document.querySelector('.qr img'); return { w: i.naturalWidth, ok: i.complete }; });
      t('computador: QR code carregou', qr.ok && qr.w > 0, JSON.stringify(qr));
    }
    t(nome + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  {
    const { c, p } = await pagina(b, { ua: UA.iosChrome });
    t('iPhone fora do Safari: mostra o aviso para abrir no Safari', await vis(p, '#ios-aviso'));
    await c.close();
  }
  {
    const { c, p } = await pagina(b, { ua: UA.ios });
    t('iPhone no Safari: sem aviso', !(await vis(p, '#ios-aviso')));
    await c.close();
  }
  {
    // navegação por teclado entre as abas + aria
    const { c, p } = await pagina(b, { ua: UA.android });
    await p.focus('#tab-android'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
    const s = await p.evaluate(() => ({ sel: document.querySelector('[role=tab][aria-selected=true]').dataset.p, foco: document.activeElement.id, ph: document.getElementById('p-pc').hidden, pa: document.getElementById('p-android').hidden }));
    t('teclado: seta → muda para a aba seguinte com foco e painel', s.sel === 'pc' && s.foco === 'tab-pc' && !s.ph && s.pa, JSON.stringify(s));
    // Instalar agora aparece só com o aviso do navegador e chama prompt() uma vez
    t('sem aviso do navegador: não mostra "Instalar agora"', !(await vis(p, '#ins-agora')));
    await p.evaluate(() => { window.__pr = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__pr++; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
    await p.waitForTimeout(150);
    t('com aviso do navegador: botão "Instalar agora" aparece', await vis(p, '#ins-agora'));
    await p.click('#ins-btn'); await p.waitForTimeout(250);
    t('toque chama prompt() uma vez', (await p.evaluate(() => window.__pr)) === 1);
    // copiar link
    await c.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(BASE).origin }).catch(() => { });
    await p.click('#ins-copiar'); await p.waitForTimeout(250);
    const msg = await p.evaluate(() => document.getElementById('ins-copiado').textContent);
    t('copiar link dá retorno ao usuário', /copiado|Selecionei/.test(msg), msg);
    const url = await p.evaluate(() => document.getElementById('ins-url').value);
    t('endereço do link termina em /instalar.html', /\/instalar\.html$/.test(url), url);
    t('sem erro de console (interações)', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  {
    const { c, p } = await pagina(b, { ua: UA.android, standalone: true });
    const s = await p.evaluate(() => ({ st: !document.getElementById('ins-status').hidden, tx: document.getElementById('ins-status').textContent }));
    t('app já instalado: mostra "Pronto" e não oferece instalar', s.st && /Pronto/.test(s.tx) && !(await vis(p, '#ins-agora')), s.tx.slice(0, 60));
    await c.close();
  }
  for (const w of [320, 390, 768, 1280]) for (const scheme of ['dark', 'light']) {
    const { c, p } = await pagina(b, { w, scheme });
    const r = await p.evaluate(() => ({ esc: document.documentElement.scrollWidth <= innerWidth, h1: !!document.querySelector('h1'), alvos: [...document.querySelectorAll('button, a.btn, summary, input')].filter(e => e.getBoundingClientRect().width > 0).map(e => Math.round(e.getBoundingClientRect().height)) }));
    t(w + ' ' + scheme + ': sem rolagem horizontal e alvos ≥ 44 px', r.esc && Math.min(...r.alvos) >= 44, r.esc + ' / min ' + Math.min(...r.alvos));
    if (axeSrc) {
      for (const tab of ['ios', 'android', 'pc']) {
        await p.click('#tab-' + tab); await p.waitForTimeout(80);
        if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
        const v = await p.evaluate(async () => { const x = await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }); return x.violations.map(y => y.id + ' ' + y.nodes.map(n => n.target.join(' ')).slice(0, 2).join(',')); });
        t(w + ' ' + scheme + ' axe (' + tab + ')', v.length === 0, v.join(' | '));
      }
    }
    await c.close();
  }
  {
    // link na tela de Configurações do app
    const { c, p } = await abre(b, 390, 'dark', true);
    await p.evaluate(() => document.getElementById('tab-config') && document.getElementById('tab-config').click()); await p.waitForTimeout(900);
    const l = await p.evaluate(() => { const a = document.getElementById('cfg-inst-pagina'); return a ? { h: a.getAttribute('href'), rel: a.rel, alvo: a.target } : null; });
    t('Configurações → link "Página de instalação (QR)" presente', !!l && l.h === 'instalar.html' && /noopener/.test(l.rel), JSON.stringify(l));
    await c.close();
  }
  // ---- widget do exercício ----
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark', w < 800);
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(1500);
    const r = await p.evaluate(() => {
      const q = document.querySelector('.qc'); if (!q) return null;
      const segs = [...q.querySelectorAll('.sl-segs i')]; const cnt = q.querySelector('.qc-count').textContent.replace(/\s/g, '');
      const [feitas, prev] = cnt.split('/').map(Number);
      const sp = [...q.querySelectorAll('.qc-sp')].map(x => x.textContent.trim());
      const r = q.getBoundingClientRect(); const fora = [];
      q.querySelectorAll('*').forEach(x => { const b = x.getBoundingClientRect(); if (b.width > 0 && (b.right > r.right + 1 || b.left < r.left - 1)) fora.push(x.className || x.tagName); });
      return { nSeg: segs.length, on: segs.filter(s => s.classList.contains('on')).length, feitas, prev, sp, fora: fora.slice(0, 3), esc: document.documentElement.scrollWidth <= innerWidth };
    });
    t(w + ': widget com segmentos = séries previstas', !!r && r.nSeg === r.prev && r.on === Math.min(r.feitas, r.prev), JSON.stringify(r));
    t(w + ': séries × reps aparecem como pílula', !!r && r.sp.length >= 1 && /×/.test(r.sp.join(' ')), r && r.sp.join('|'));
    t(w + ': nada vaza para fora do cartão e sem rolagem horizontal', !!r && r.fora.length === 0 && r.esc, r && JSON.stringify(r.fora));
    // estado "registrar": remove 2 séries e confere botão/alvos
    await p.click('.qc [data-slchip="3"]'); await p.waitForTimeout(150); await p.click('.qc [data-slrm]'); await p.waitForTimeout(300);
    const e = await p.evaluate(() => { const ok = document.querySelector('.qc .sl-ok'); const st = [...document.querySelectorAll('.qc .sl-step, .qc .sl-in')].map(x => Math.round(x.getBoundingClientRect().height)); return { ok: ok ? Math.round(ok.getBoundingClientRect().height) : 0, st, next: document.querySelectorAll('.qc .sl-segs i.next').length }; });
    t(w + ': "Registrar série" e passos ≥ 48 px, próximo segmento marcado', e.ok >= 48 && Math.min(...e.st) >= 48 && e.next === 1, JSON.stringify(e));
    if (axeSrc) {
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const x = await axe.run(document.querySelector('#view-treino'), { runOnly: ['color-contrast', 'button-name', 'aria-allowed-attr', 'aria-valid-attr-value'] }); return x.violations.flatMap(y => y.nodes.map(n => y.id + ' ' + n.target.join(' '))); });
      t(w + ': axe no Treino (widget)', v.length === 0, v.slice(0, 3).join(' | '));
    }
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
