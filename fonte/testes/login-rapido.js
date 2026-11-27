// Tela de entrada rápida: ela não espera o app.js (o maior arquivo), dados/app carregam com defer, o app fica oculto atrás da entrada
// (o que ele desenha ali não conta como deslocamento de layout) e a entrada aparece sem fade de opacidade (LCP). Uso: node login-rapido.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const BASE = process.argv[2] || 'http://localhost:8791';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  // 1) HTML: dados e app com defer; o que monta a entrada continua síncrono
  const c0 = await b.newContext(); const p0 = await c0.newPage(); const html = await (await p0.request.get(BASE + '/index.html')).text(); await c0.close();
  const tags = html.match(/<script[^>]*src=[^>]*>/g) || [];
  const por = n => tags.find(x => x.includes(n)) || '';
  t('app.<hash>.js e dados.<hash>.js carregam com defer', /\bdefer\b/.test(por('app.')) && /\bdefer\b/.test(por('dados.')), tags.join(' '));
  t('vendor-supabase, ng-nuvem e bff-runtime continuam síncronos (sem defer/async)', ['vendor-supabase', 'ng-nuvem', 'bff-runtime'].every(n => por(n) && !/\b(defer|async)\b/.test(por(n))), tags.join(' '));
  const css = await (await (await b.newContext()).request.get(BASE + '/ng-nuvem.css')).text();
  const kf = (css.match(/@keyframes ng-lc-in\{[^]*?\}\}?/) || [''])[0];
  t('a animação de entrada não usa opacidade (LCP conta o elemento já no primeiro quadro)', kf && !/opacity/.test(kf), kf);
  // 2) a entrada aparece mesmo com o app.js demorando (atraso de 4 s só para o app.js)
  const c = await b.newContext({ viewport: { width: 390, height: 800 } }); const p = await c.newPage(); p.errs = []; p.csp = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) p.csp.push(m.text()); });
  let appChegou = false;
  await p.route('**/app.*.js', async r => { await new Promise(res => setTimeout(res, 4000)); appChegou = true; r.continue(); });
  await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  await p.route('**/challenges.cloudflare.com/**', r => r.abort());
  await p.goto(BASE + '/index.html', { waitUntil: 'commit' });
  await p.waitForSelector('#ng-login-ok', { timeout: 3500 }).catch(() => { });
  const cedo = await p.evaluate(() => { const e = document.querySelector('#ng-login-ok'); const h = document.querySelector('.ng-lc-inicio'); return { botao: !!e, opac: h ? getComputedStyle(h).opacity : null, cls: document.documentElement.classList.contains('ng-entrando'), appVis: (document.querySelector('.app') ? getComputedStyle(document.querySelector('.app')).visibility : null) }; });
  t('a tela de entrada aparece antes de o app.js chegar', cedo.botao && !appChegou, JSON.stringify(cedo) + ' appChegou=' + appChegou);
  t('o <html> ganha ng-entrando e o app fica oculto atrás da entrada', cedo.cls && cedo.appVis === 'hidden', JSON.stringify(cedo));
  t('o conteúdo da entrada já está opaco quando aparece (sem fade)', cedo.opac === '1', cedo.opac);
  await p.waitForFunction(() => window.__ngTest !== undefined || true, null, { timeout: 100 }).catch(() => { });
  await p.waitForTimeout(4800);
  t('depois do app.js chegar, a entrada continua e nada quebrou', appChegou && await p.evaluate(() => !!document.querySelector('#ng-login-ok')) && p.errs.length === 0, p.errs.join('|'));
  t('sem violação de CSP', p.csp.length === 0, p.csp.join('|'));
  await c.close();
  // 3) já logado: o app aparece normalmente e não sobra a marca de entrada
  const { c: c2, p: p2 } = await abre(b, 390, 'dark', true);
  const logado = await p2.evaluate(() => ({ cls: document.documentElement.classList.contains('ng-entrando'), vis: getComputedStyle(document.querySelector('.app')).visibility, login: !!document.querySelector('.ng-login') }));
  t('logado: sem ng-entrando, app visível e sem tela de entrada', !logado.cls && logado.vis === 'visible' && !logado.login, JSON.stringify(logado));
  await c2.close();
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
