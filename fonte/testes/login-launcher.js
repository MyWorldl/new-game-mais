// Tela de entrada estilo launcher: formulário de entrada sempre à vista, link para a página de apresentação (inicio.html) e faixa "Novidade" que leva às atualizações.
// Uso: node login-launcher.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[320, 640], [390, 844], [820, 1000], [1280, 800]]) {
    const L = '[' + w + '] ';
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }); const p = await c.newPage(); const errs = [], csp = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) csp.push(m.text()); });
    await p.route('**/challenges.cloudflare.com/**', r => r.abort());
    await p.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 }); await p.waitForTimeout(500);
    const v = id => p.evaluate(i => { const e = document.getElementById(i); return !!e && !e.closest('[hidden]') && e.offsetParent !== null; }, id);
    t(L + 'abre direto no formulário de entrada (sem abas)', await v('ng-login-e') && await v('ng-login-ok') && (await p.$$('.ng-lc [role=tab], .ng-lc [role=tablist]')).length === 0);
    t(L + 'um único h1 na tela de entrada', (await p.$$('.ng-lc h1')).length === 1);
    t(L + 'sem rolagem lateral', (await p.evaluate(() => document.querySelector('.ng-lc').scrollWidth - document.querySelector('.ng-lc').clientWidth)) <= 0);
    if (axeSrc) { await p.evaluate(axeSrc); const r = await p.evaluate(async () => (await axe.run('.ng-lc', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t(L + 'axe: tela de entrada sem violações', r.length === 0, r.join(',')); }
    const conh = await p.evaluate(() => { const a = document.querySelector('.ng-lc-conhecer'); return a && { href: a.getAttribute('href'), alt: Math.round(a.getBoundingClientRect().height), txt: a.textContent }; });
    t(L + 'link "Conhecer o NG+" no topo leva à página de apresentação (inicio.html), com versão e 44 px de altura', !!conh && conh.href === 'inicio.html' && /Conhecer o NG\+/.test(conh.txt) && /v\d+/.test(conh.txt) && conh.alt >= 44, JSON.stringify(conh));
    const nov = await p.evaluate(() => { const a = document.querySelector('.ng-lc-novo'); return a && { tag: a.tagName, href: a.getAttribute('href'), txt: a.textContent, alt: Math.round(a.getBoundingClientRect().height) }; });
    t(L + 'faixa "Novidade" é link para inicio.html#atualizacoes e mostra o título mais recente', !!nov && nov.tag === 'A' && nov.href === 'inicio.html#atualizacoes' && /Novidade/.test(nov.txt) && nov.txt.length > 12 && nov.alt >= 44, JSON.stringify(nov));
    t(L + 'não sobrou nenhum código da lista de atualizações dentro do app', (await p.$$('.ng-nov, #ng-nov-mais, #ng-pn-novid')).length === 0);
    const alvo = await Promise.all([p.waitForURL(/inicio\.html#atualizacoes/, { timeout: 8000 }).then(() => true, () => false), p.click('.ng-lc-novo')]);
    await p.waitForSelector('#atualizacoes', { timeout: 8000 }).catch(() => {});
    t(L + 'tocar na faixa abre a página de apresentação já nas atualizações', alvo[0] && (await p.locator('.nov-atual').count()) === 1 && /Mais recente/i.test(await p.innerText('.nov-meta')), p.url());
    t(L + 'a página de apresentação tem "Entrar" que volta ao app', (await p.getAttribute('.topo .btn', 'href')) === './');
    await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 }); await p.waitForTimeout(300);
    // o fluxo de pedir acesso continua na própria tela de entrada
    await p.click('#ng-login-pedir'); await p.waitForTimeout(300);
    t(L + 'Pedir acesso abre o formulário e troca o título', await v('ng-ped-n') && /Pedir acesso/.test(await p.textContent('#ng-login-t')));
    t(L + 'sem erros de JS nem violação de CSP', errs.length === 0 && csp.length === 0, errs.concat(csp).join('|'));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
