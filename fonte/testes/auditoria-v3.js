// Auditoria final do redesign v3 (Fase 10): 7 abas × paletas × larguras × tamanhos de texto, movimento reduzido, offline e desempenho.
// Uso: node auditoria-v3.js http://localhost:8791   (precisa de $SP/axe com axe-core)
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const BASE = process.argv[2] || 'http://localhost:8791';
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const ABAS = ['painel', 'treino', 'dieta', 'corpo', 'perfil', 'config', 'sobre'];
const irAba = async (p, a) => { await p.evaluate(a => { if (a === 'sobre') { document.getElementById('tab-perfil').click(); document.getElementById('subtab-sobre').click(); } else document.getElementById('tab-' + a).click(); }, a); await p.waitForTimeout(900); };
// troca de tema pelos botões do próprio app (Config): paletas do jogo, ou pastel em modo claro/escuro
const tema = async (p, k, modo) => {
  await irAba(p, 'config');
  await p.evaluate(k => { const b = document.querySelector('#theme-row [data-paleta="' + k + '"], #theme-row [data-tema="' + k + '"]'); b.click(); }, k);
  await p.waitForTimeout(400);
  if (modo) { await p.evaluate(m => document.querySelector('#theme-modo-seg [data-v="' + m + '"]').click(), modo); await p.waitForTimeout(400); }
};
(async () => {
  const b = await chromium.launch();

  // 1) sem rolagem horizontal: 7 abas × 6 larguras (escuro e claro nas extremidades)
  for (const w of [320, 390, 768, 1024, 1280, 1440]) {
    const { c, p } = await abre(b, w, 'dark');
    const ruins = [];
    for (const a of ABAS) { await irAba(p, a); const r = await p.evaluate(() => ({ s: document.documentElement.scrollWidth, i: innerWidth })); if (r.s > r.i) ruins.push(a + ':' + r.s + '>' + r.i); }
    t(w + ' px: nenhuma das 7 abas rola na horizontal', ruins.length === 0, ruins.join(', '));
    t(w + ' px: sem erro de console nas 7 abas', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }

  // 2) texto maior (100/125/150% no tamanho-base): sem rolagem horizontal em 390 px
  {
    const { c, p } = await abre(b, 390, 'dark');
    for (const pct of [100, 125, 150]) {
      await p.evaluate(pct => { document.documentElement.style.fontSize = pct + '%'; }, pct); await p.waitForTimeout(300);
      const ruins = [];
      for (const a of ABAS) { await irAba(p, a); const r = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (r > 0) ruins.push(a + '+' + r); }
      t('texto ' + pct + '%: 7 abas sem rolagem horizontal em 390 px', ruins.length === 0, ruins.join(', '));
    }
    await c.close();
  }

  // 3) contraste AA (axe) nas 7 abas: 3 paletas do jogo + 3 pastéis em modo escuro e claro
  if (axeSrc) {
    const combos = [['lima'], ['violeta'], ['ouro'], ['rosa', 'escuro'], ['rosa', 'claro'], ['roxo', 'escuro'], ['roxo', 'claro'], ['azul', 'escuro'], ['azul', 'claro']];
    for (const [k, modo] of combos) {
      const { c, p } = await abre(b, 390, 'dark');
      await tema(p, k, modo); await p.waitForTimeout(700);
      await p.evaluate(axeSrc);
      const ruins = [];
      for (const a of ABAS) {
        await irAba(p, a); await p.waitForTimeout(500);
        const v = await p.evaluate(async a => { const el = document.getElementById('view-' + a); if (!el) return ['sem view']; const r = await axe.run(el, { runOnly: ['color-contrast', 'button-name', 'aria-allowed-attr', 'aria-valid-attr-value', 'label', 'image-alt'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))); }, a);
        if (v.length) ruins.push(a + ': ' + v.slice(0, 2).join('; '));
      }
      t('axe (contraste, nomes, ARIA) nas 7 abas em ' + k + (modo ? ' ' + modo : ''), ruins.length === 0, ruins.join(' | '));
      await c.close();
    }
  } else t('axe disponível', false, 'axe-core ausente em $SP/axe');

  // 4) alvos de toque ≥ 44 px em aparelho de toque (pointer:coarse), 320 e 390 px
  for (const w of [320, 390]) {
    const { c, p } = await abre(b, w, 'dark', true);
    for (const a of ABAS) {
      await irAba(p, a);
      const peq = await p.evaluate(a => {
        const el = document.getElementById('view-' + a); const out = [];
        el.querySelectorAll('button, a[href], [role="button"], input:not([type="hidden"]), select, summary').forEach(x => {
          const r = x.getBoundingClientRect(); if (r.width === 0 || r.height === 0 || getComputedStyle(x).visibility === 'hidden') return;
          if (x.closest('[hidden]') || x.closest('[aria-hidden="true"]')) return;
          if (Math.min(r.width, r.height) < 44 - 0.5 && !x.closest('.skip-link') && !(x.tagName === 'A' && getComputedStyle(x).display === 'inline')) out.push((x.id || x.className || x.tagName).toString().slice(0, 30) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
        });
        return out.slice(0, 6);
      }, a);
      t('alvos de toque ≥ 44 px na aba ' + a + ' (' + w + ' px, toque)', peq.length === 0, peq.join(' | '));
    }
    await c.close();
  }

  // 5) movimento reduzido: nenhuma animação CSS em execução em nenhuma aba
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(1500);
    const ruins = [];
    for (const a of ABAS) {
      await irAba(p, a);
      const anim = await p.evaluate(() => document.getAnimations().filter(an => { const e = an.effect; const dur = e && e.getTiming ? e.getTiming().duration : 0; const nome = an.animationName || an.transitionProperty || ''; return an.playState === 'running' && dur > 50 && !/spin|skeleton|shimmer/.test(nome) ? true : false; }).map(an => (an.animationName || an.transitionProperty) + ':' + Math.round(an.effect.getTiming().duration)).slice(0, 5));
      if (anim.length) ruins.push(a + ' → ' + anim.join(','));
    }
    t('movimento reduzido: nenhuma animação em execução (7 abas)', ruins.length === 0, ruins.join(' | '));
    t('movimento reduzido: sem erro de console', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }

  // 6) offline: com o service worker ativo, o app recarrega sem rede e mostra a interface
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'allow' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(BASE + '/index.html'); await p.waitForTimeout(2500);
    const sw = await p.evaluate(async () => { await navigator.serviceWorker.ready; const ks = await caches.keys(); const ch = ks.length ? (await (await caches.open(ks[ks.length - 1])).keys()).length : 0; return { ativo: !!(await navigator.serviceWorker.getRegistration()).active, caches: ks.join(','), n: ch }; });
    t('offline: service worker ativo com arquivos guardados', sw.ativo && sw.n >= 8, JSON.stringify(sw));
    await p.reload(); await p.waitForTimeout(1000);
    await c.setOffline(true);
    await p.reload(); await p.waitForTimeout(2000);
    const o = await p.evaluate(() => ({ nav: !!document.querySelector('#tab-painel'), css: getComputedStyle(document.body).backgroundColor, f: document.fonts.check("700 16px 'Barlow Condensed'") }));
    t('offline: recarrega com a barra de abas e o tema aplicado', o.nav && o.css !== 'rgba(0, 0, 0, 0)' && o.f, JSON.stringify(o));
    for (const a of ['dieta', 'corpo', 'perfil']) { await irAba(p, a); t('offline: aba ' + a + ' abre', await p.evaluate(a => !document.getElementById('view-' + a).hidden, a)); }
    t('offline: sem erro de script', p.errs.length === 0, p.errs.join('|'));
    await c.setOffline(false); await c.close();
  }

  // 7) desempenho: peso dos arquivos e carga inicial
  {
    const c = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); const reqs = []; p.on('response', r => reqs.push({ u: r.url(), n: r.headers()['content-length'] }));
    await p.goto(BASE + '/index.html', { waitUntil: 'load' }); await p.waitForTimeout(1500);
    const m = await p.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const lt = performance.getEntriesByType('longtask').length; const fcp = (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime; return { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd), fcp: Math.round(fcp || 0), lt }; });
    t('desempenho: carga em < 3 s e primeira pintura em < 2 s (CPU da nuvem, sem throttling)', m.load < 3000 && (m.fcp === 0 || m.fcp < 2000), JSON.stringify(m));
    // orçamento de tamanho: o que o usuário baixa (gzip) + alarme bruto; números em fonte/orcamento-tamanho.json (mesmo arquivo do fonte/tamanho.mjs, que roda no build)
    const orc = JSON.parse(fs.readFileSync('../orcamento-tamanho.json', 'utf8')), zlib = require('zlib');
    const med = re => { const f = fs.readdirSync('../../site').filter(x => re.test(x))[0]; const b = fs.readFileSync('../../site/' + f); return { bruto: b.length, gz: zlib.gzipSync(b, { level: 9 }).length }; };
    const cssM = med(/^app\..*\.css$/), jsM = med(/^app\..*\.js$/), dadosM = med(/^dados\..*\.js$/);
    const dentro = (m, l) => m.gz <= l.gzipKB * 1024 && m.bruto <= l.brutoKB * 1024;
    const rel = (m, l) => 'bruto=' + Math.round(m.bruto / 1024) + '/' + l.brutoKB + 'KB gzip=' + Math.round(m.gz / 1024) + '/' + l.gzipKB + 'KB';
    t('desempenho: CSS do app dentro do orçamento (gzip e bruto)', dentro(cssM, orc['app.css']), rel(cssM, orc['app.css']));
    t('desempenho: JS do app dentro do orçamento (gzip e bruto)', dentro(jsM, orc['app.js']), rel(jsM, orc['app.js']));
    t('desempenho: dados de exercícios dentro do orçamento (gzip e bruto)', dentro(dadosM, orc['dados.js']), rel(dadosM, orc['dados.js']));
    t('desempenho: nenhuma requisição a host externo', reqs.every(r => /^(http:\/\/localhost|data:|blob:)/.test(r.u)), reqs.filter(r => !/^(http:\/\/localhost|data:|blob:)/.test(r.u)).map(r => r.u).join(','));
    await c.close();
  }
  // deslocamento de layout (CLS) ao trocar de aba com toques reais (os toques do usuário não contam como "inesperados"), com dados semeados
  {
    const { c, p } = await abre(b, 390, 'dark');
    await p.evaluate(() => { window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: false }); });
    for (const a of ['treino', 'dieta', 'corpo', 'painel', 'corpo', 'dieta', 'treino', 'painel']) { await p.locator('#tab-' + a).click(); await p.waitForTimeout(1800); }
    const cls = await p.evaluate(() => window.__cls);
    t('desempenho: deslocamento de layout inesperado (CLS) ao trocar de aba < 0,1', cls < 0.1, cls.toFixed(3));
    await c.close();
  }

  await b.close();
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
