// Tela de entrada estilo launcher: abas Início/Atualizações, só a última atualização à vista, anteriores sob pedido, login sempre alcançável.
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
    t(L + 'abre na aba Início com o formulário de entrada visível', await v('ng-login-e') && await v('ng-login-ok') && (await p.getAttribute('#ng-tab-inicio', 'aria-selected')) === 'true');
    t(L + 'Atualizações fica escondida', !(await v('ng-pn-novid')));
    t(L + 'um único h1 na tela de entrada', (await p.$$('.ng-lc h1')).length === 1);
    t(L + 'sem rolagem lateral', (await p.evaluate(() => document.querySelector('.ng-lc').scrollWidth - document.querySelector('.ng-lc').clientWidth)) <= 0);
    if (axeSrc) { await p.evaluate(axeSrc); const r = await p.evaluate(async () => (await axe.run('.ng-lc', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t(L + 'axe: Início sem violações', r.length === 0, r.join(',')); }
    await p.click('#ng-tab-novid'); await p.waitForTimeout(450);
    t(L + 'aba Atualizações abre e Início some', await v('ng-pn-novid') && !(await v('ng-login-e')) && (await p.getAttribute('#ng-tab-novid', 'aria-selected')) === 'true');
    const atual = await p.textContent('.ng-nov-atual');
    t(L + 'mostra a atualização mais recente (versão mais nova) com etiquetas', /Mais recente/.test(atual) && /Versão \d+/.test(atual) && (await p.$$('.ng-nov-atual .ng-nov-tag')).length >= 3, atual.slice(0, 80));
    t(L + 'atualizações anteriores começam recolhidas', !(await v('ng-nov-ant')) && (await p.getAttribute('#ng-nov-mais', 'aria-expanded')) === 'false' && /Ver atualizações anteriores \(\d+\)/.test(await p.textContent('#ng-nov-mais')));
    await p.click('#ng-nov-mais'); await p.waitForTimeout(250);
    const n = await p.evaluate(() => document.querySelectorAll('#ng-nov-ant details').length);
    t(L + 'botão mostra as versões anteriores (cada uma recolhível)', await v('ng-nov-ant') && n >= 2 && (await p.getAttribute('#ng-nov-mais', 'aria-expanded')) === 'true', n);
    await p.click('#ng-nov-ant details:first-child summary'); await p.waitForTimeout(200);
    t(L + 'versão anterior abre ao tocar', await p.evaluate(() => document.querySelector('#ng-nov-ant details').open && document.querySelector('#ng-nov-ant details .ng-nov-tag').offsetParent !== null));
    t(L + 'sem rolagem lateral nas atualizações', (await p.evaluate(() => document.querySelector('.ng-lc').scrollWidth - document.querySelector('.ng-lc').clientWidth)) <= 0);
    if (axeSrc) { const r = await p.evaluate(async () => (await axe.run('.ng-lc', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t(L + 'axe: Atualizações sem violações', r.length === 0, r.join(',')); }
    await p.click('#ng-nov-mais'); await p.waitForTimeout(150);
    t(L + 'botão esconde as anteriores de novo', !(await v('ng-nov-ant')));
    await p.focus('#ng-tab-novid'); await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    t(L + 'teclado: seta para a esquerda volta ao Início', await v('ng-login-e') && (await p.evaluate(() => document.activeElement.id)) === 'ng-tab-inicio');
    await p.click('.ng-lc-novo'); await p.waitForTimeout(300);
    t(L + 'faixa "Novidade" do Início leva às Atualizações', await v('ng-pn-novid'));
    await p.click('.ng-nov-entrar'); await p.waitForTimeout(300);
    t(L + '"Voltar para entrar" volta ao formulário', await v('ng-login-e'));
    // o fluxo de pedir acesso continua dentro da aba Início
    await p.click('#ng-login-pedir'); await p.waitForTimeout(300);
    t(L + 'Pedir acesso abre o formulário e troca o título', await v('ng-ped-n') && /Pedir acesso/.test(await p.textContent('#ng-login-t')));
    t(L + 'sem erros de JS nem violação de CSP', errs.length === 0 && csp.length === 0, errs.concat(csp).join('|'));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
