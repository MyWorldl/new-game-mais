// Medição de desempenho (Cloudflare Web Analytics): CSP, regras de quando mede e ausência de efeito fora de produção.
// Uso: node medicao.js http://localhost:8791   (o servidor precisa aplicar os cabeçalhos de produção)
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const PROD = 'new-game-mais.sombrasplays.workers.dev';
(async () => {
  const b = await chromium.launch();
  const { c, p } = await abre(b, 390, 'dark', false);
  await p.waitForTimeout(1200);

  // 1) cabeçalho de CSP servido
  const csp = await p.evaluate(async () => (await fetch('/', { cache: 'no-store' })).headers.get('content-security-policy') || '');
  const dir = (nome) => (csp.split(';').map(s => s.trim()).find(s => s.startsWith(nome + ' ')) || '');
  t('CSP: script-src libera só o beacon da Cloudflare além de Turnstile', /^script-src 'self'( https:\/\/(challenges\.cloudflare\.com|static\.cloudflareinsights\.com))+$/.test(dir('script-src')) && dir('script-src').includes('https://static.cloudflareinsights.com'), dir('script-src'));
  t('CSP: connect-src libera cloudflareinsights.com (envio das métricas)', dir('connect-src').split(/\s+/).includes('https://cloudflareinsights.com'), dir('connect-src'));
  t('CSP: continua sem unsafe-inline/unsafe-eval em script-src', !/unsafe-(inline|eval)/.test(dir('script-src')));

  // 2) regras de quando mede (função pura)
  const pode = (...a) => p.evaluate((x) => window.ngMedicaoPode.apply(null, x), a);
  t('regra: produção + token + adulto + sem sinais = mede', await pode(30, PROD, 'tok', null, undefined) === true);
  t('regra: menor de 18 anos nunca mede', await pode(17, PROD, 'tok', null, undefined) === false);
  t('regra: idade desconhecida nunca mede', (await pode(undefined, PROD, 'tok', null, undefined)) === false && (await pode(0, PROD, 'tok', null, undefined)) === false && (await pode('abc', PROD, 'tok', null, undefined)) === false);
  t('regra: 18 anos exatos mede', await pode(18, PROD, 'tok', null, undefined) === true);
  t('regra: sem token não mede', await pode(30, PROD, '', null, undefined) === false);
  t('regra: fora de produção (localhost, preview) não mede', await pode(30, 'localhost', 'tok', null, undefined) === false && await pode(30, 'ng-modular-53-new-game-mais.sombrasplays.workers.dev', 'tok', null, undefined) === false);
  t('regra: "Não rastrear" desliga', await pode(30, PROD, 'tok', '1', undefined) === false && await pode(30, PROD, 'tok', 'yes', undefined) === false);
  t('regra: Global Privacy Control desliga', await pode(30, PROD, 'tok', null, true) === false);

  // 3) em localhost e sem token, o app não injeta nada
  const injetou = await p.evaluate(() => { window.ngMedicao(30); return !!document.querySelector('script[src*="cloudflareinsights"]'); });
  t('fora de produção ngMedicao() não injeta o beacon', injetou === false);

  // 4) a CSP deixa o beacon carregar e enviar (rede interceptada, sem tráfego real)
  await c.route('https://static.cloudflareinsights.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'window.__cfBeacon = 1;' }));
  await c.route('https://cloudflareinsights.com/**', r => r.fulfill({ status: 204, body: '' }));
  await p.evaluate(() => { window.__viol = []; document.addEventListener('securitypolicyviolation', e => window.__viol.push(e.violatedDirective + ' ' + e.blockedURI)); });
  await p.evaluate(() => new Promise(res => { const s = document.createElement('script'); s.type = 'module'; s.src = 'https://static.cloudflareinsights.com/beacon.min.js'; s.setAttribute('data-cf-beacon', '{"token":"x"}'); s.onload = res; s.onerror = res; document.head.appendChild(s); }));
  await p.waitForTimeout(400);
  t('CSP deixa o script do beacon carregar', await p.evaluate(() => window.__cfBeacon === 1));
  const envio = await p.evaluate(async () => { try { await fetch('https://cloudflareinsights.com/cdn-cgi/rum', { method: 'POST', mode: 'no-cors', body: '{}' }); return 'ok'; } catch (e) { return 'erro ' + e.message; } });
  t('CSP deixa o envio das métricas sair', envio === 'ok', envio);
  t('nenhuma violação de CSP durante o teste', (await p.evaluate(() => window.__viol)).length === 0, JSON.stringify(await p.evaluate(() => window.__viol)));
  // outro host externo continua bloqueado
  const bloq = await p.evaluate(() => new Promise(res => { const s = document.createElement('script'); s.src = 'https://exemplo.invalid/x.js'; s.onload = () => res('carregou'); s.onerror = () => res('bloqueado'); document.head.appendChild(s); }));
  t('CSP continua bloqueando script de outro host', bloq === 'bloqueado', bloq);

  t('sem erro de JavaScript na página', !(p.errs && p.errs.length), (p.errs || []).join('|'));
  await c.close(); await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas');
  process.exit(bad ? 1 : 0);
})();
