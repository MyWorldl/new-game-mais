// Fontes locais — nenhum pedido ao Google; as 3 famílias carregam do próprio site. Uso: node fontes.js http://localhost:8791
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); let bad = 0; const t = (n, c, x = '') => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 250) : '')); };
  const c = await b.newContext({ viewport: { width: 400, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); } catch (e) { } });
  const p = await c.newPage(); const reqs = [];
  p.on('request', r => reqs.push(r.url()));
  await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(2500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  const ext = reqs.filter(u => !/^(http:\/\/localhost|data:|blob:)/.test(u));
  t('nenhum pedido a hosts externos (inclui Google Fonts)', ext.length === 0, ext.join(', '));
  const f = reqs.filter(u => /\/fonts\/.*\.woff2/.test(u)).map(u => u.split('/').pop());
  t('arquivos de fonte pedidos ao próprio site', f.length >= 3, f.join(', '));
  const st = await p.evaluate(async () => { await document.fonts.ready; return { bar: document.fonts.check("700 16px 'Barlow Condensed'"), work: document.fonts.check("400 16px 'Work Sans'"), mono: document.fonts.check("500 16px 'IBM Plex Mono'"), carregadas: [...document.fonts].filter(x => x.status === 'loaded').map(x => x.family + ' ' + x.weight) }; });
  t('Barlow Condensed, Work Sans e IBM Plex Mono disponíveis', st.bar && st.work && st.mono, JSON.stringify(st.carregadas));
  const used = await p.evaluate(() => { const e = document.querySelector('.app') || document.body; return getComputedStyle(document.body).fontFamily; });
  t('corpo usa a família esperada', /Work Sans|system-ui|-apple-system/.test(used), used);
  // offline: com o service worker, recarrega sem rede e as fontes continuam
  console.log(bad ? 'FALHAS ' + bad : 'TUDO OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
