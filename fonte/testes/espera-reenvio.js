// Login: barra de espera de 60 s entre pedidos de código (o Supabase recusa outro envio ao mesmo e-mail antes disso).
// Supabase e Turnstile simulados; relógio controlado. Uso: SP=<axe> node espera-reenvio.js http://localhost:8791
const { chromium } = require('playwright');
const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const STUB = `window.turnstile={render:function(s,o){window.__o=o;setTimeout(function(){o.callback('T')},50);return 'w'},reset:function(){var o=window.__o;setTimeout(function(){o.callback('T2')},50)}};`;
const OK200 = { status: 200, contentType: 'application/json', body: '{}' };
const R429 = s => ({ status: 429, contentType: 'application/json', body: JSON.stringify({ code: 429, error_code: 'over_email_send_rate_limit', msg: 'For security purposes, you can only request this after ' + s + ' seconds.' }) });
async function abre(b, resp, { w = 400, ctx } = {}) {
  const c = ctx || await b.newContext({ viewport: { width: w, height: 800 } });
  const p = await c.newPage(); p.otp = 0; p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/challenges.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => { if (/\/auth\/v1\/otp/.test(r.request().url())) { p.otp++; return r.fulfill(typeof resp === 'function' ? resp(p.otp) : resp); } return r.fulfill(OK200); });
  await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 });
  return { c, p };
}
const txt = (p, s) => p.textContent(s);
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await abre(b, OK200);
    t('sem espera ativa, a barra fica oculta', !(await p.isVisible('#ng-espera')));
    await p.fill('#ng-login-e', 'a@example.com'); await p.waitForTimeout(200); await p.click('#ng-login-ok'); await p.waitForTimeout(700);
    t('depois de enviar, a barra aparece com a contagem', (await p.isVisible('#ng-espera')) && /Aguarde (59|60) s/.test(await txt(p, '#ng-espera-txt')), await txt(p, '#ng-espera-txt'));
    t('"Reenviar e-mail" fica desativado durante a espera', await p.isDisabled('#ng-login-reenv'));
    t('o botão "Entrar com o código" continua ativo', !(await p.isDisabled('#ng-login-ok')));
    t('a barra é um progressbar com nome acessível', (await p.getAttribute('#ng-espera', 'role')) === 'progressbar' && /espera/i.test(await p.getAttribute('#ng-espera', 'aria-label')));
    await p.click('#ng-login-reenv', { force: true, timeout: 800 }).catch(() => {}); await p.waitForTimeout(200);
    t('tocar no botão desativado não envia outro pedido', p.otp === 1, p.otp);
    const larg = async () => parseFloat(await p.evaluate(() => document.getElementById('ng-espera-fill').style.width) || '0');
    const w1 = await larg(); await p.waitForTimeout(2300); const w2 = await larg();
    t('a barra enche com o tempo', w2 > w1, w1 + ' -> ' + w2);
    t('o prazo fica salvo no aparelho', await p.evaluate(() => !!localStorage.getItem('ng_otp_espera')));
    if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('.ng-login', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe com a barra visível: sem violações', v.length === 0, v.join(',')); }
    // relógio: passa o tempo e libera
    await p.evaluate(() => { const o = JSON.parse(localStorage.getItem('ng_otp_espera')); o.ate = Date.now() + 1200; localStorage.setItem('ng_otp_espera', JSON.stringify(o)); }); await p.waitForTimeout(2200);
    t('ao terminar, a barra some e "Reenviar" libera', !(await p.isVisible('#ng-espera')) && !(await p.isDisabled('#ng-login-reenv')));
    t('aparece o aviso de que já pode pedir outro', /já pode pedir outro código/.test(await txt(p, '#ng-login-m')), await txt(p, '#ng-login-m'));
    await p.click('#ng-login-reenv'); await p.waitForTimeout(600);
    t('depois de liberar, o reenvio funciona e a espera recomeça', p.otp === 2 && (await p.isVisible('#ng-espera')));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  { // servidor recusa (429) com tempo restante: a barra usa o tempo pedido e o botão fica travado
    const { c, p } = await abre(b, R429(47));
    await p.fill('#ng-login-e', 'b@example.com'); await p.waitForTimeout(200); await p.click('#ng-login-ok'); await p.waitForTimeout(700);
    t('429: a barra usa o tempo do servidor (47 s)', (await p.isVisible('#ng-espera')) && /Aguarde (46|47) s/.test(await txt(p, '#ng-espera-txt')), await txt(p, '#ng-espera-txt'));
    t('429: "Enviar link e código" fica travado', await p.isDisabled('#ng-login-ok'));
    t('429: mensagem calma, sem culpa', /acabou de sair/.test(await txt(p, '#ng-login-m')), await txt(p, '#ng-login-m'));
    await p.click('#ng-login-ok', { force: true, timeout: 800 }).catch(() => {}); await p.waitForTimeout(200);
    t('429: toques repetidos não geram novos pedidos', p.otp === 1, p.otp);
    // recarregar não zera a espera para o mesmo e-mail; e-mail diferente não é bloqueado
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.fill('#ng-login-e', 'b@example.com'); await p.waitForTimeout(300);
    t('recarregar a página mantém a espera do mesmo e-mail', (await p.isVisible('#ng-espera')) && (await p.isDisabled('#ng-login-ok')));
    await p.fill('#ng-login-e', 'outro@example.com'); await p.waitForTimeout(300);
    t('outro e-mail não é bloqueado', !(await p.isVisible('#ng-espera')) && !(await p.isDisabled('#ng-login-ok')));
    await p.fill('#ng-login-e', 'B@Example.com'); await p.waitForTimeout(300);
    t('maiúsculas no mesmo e-mail continuam bloqueadas', await p.isDisabled('#ng-login-ok'));
    await c.close(); }

  { // 429 sem número no texto: usa 60 s
    const { c, p } = await abre(b, { status: 429, contentType: 'application/json', body: JSON.stringify({ code: 429, msg: 'email rate limit exceeded' }) });
    await p.fill('#ng-login-e', 'c@example.com'); await p.waitForTimeout(200); await p.click('#ng-login-ok'); await p.waitForTimeout(700);
    t('429 sem tempo informado: assume 60 s', /Aguarde (59|60) s/.test(await txt(p, '#ng-espera-txt')), await txt(p, '#ng-espera-txt'));
    await c.close(); }

  { // "Usar outro e-mail" volta ao passo 1 e respeita a espera do e-mail antigo
    const { c, p } = await abre(b, OK200);
    await p.fill('#ng-login-e', 'd@example.com'); await p.waitForTimeout(200); await p.click('#ng-login-ok'); await p.waitForTimeout(600);
    await p.click('#ng-login-outro'); await p.waitForTimeout(200);
    t('"Usar outro e-mail": campo vazio, sem barra, botão livre', !(await p.isVisible('#ng-espera')) && !(await p.isDisabled('#ng-login-ok')));
    await p.fill('#ng-login-e', 'd@example.com'); await p.waitForTimeout(300);
    t('voltar ao mesmo e-mail dentro de 60 s: barra e botão travado', (await p.isVisible('#ng-espera')) && (await p.isDisabled('#ng-login-ok')));
    await c.close(); }

  if (axeSrc) for (const w of [320, 1280]) {
    const { c, p } = await abre(b, OK200, { w }); await p.fill('#ng-login-e', 'e@example.com'); await p.waitForTimeout(200); await p.click('#ng-login-ok'); await p.waitForTimeout(600);
    t(`@${w}: sem rolagem horizontal com a barra`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
