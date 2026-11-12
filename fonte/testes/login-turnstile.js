// Login: o widget Turnstile (Cloudflare) é carregado pela CSP de produção, o token vai ao Supabase em captcha_token,
// e se o widget não carregar o envio ainda é tentado. Usa rotas simuladas (sem rede). Uso: node login-turnstile.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const STUB = `window.__cb=null;window.turnstile={render:function(sel,o){window.__cb=o;window.__renders=(window.__renders||0)+1;setTimeout(function(){o.callback('TOKEN-'+window.__renders)},120);return 'w1'},reset:function(){window.__resets=(window.__resets||0)+1;var o=window.__cb;setTimeout(function(){o.callback('TOKEN-R'+window.__resets)},120)}};`;
async function abre(b, modo, otpResp) {
  const c = await b.newContext({ viewport: { width: 400, height: 800 } });
  const p = await c.newPage(); p.csp = []; p.otp = []; p.errs = [];
  p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) p.csp.push(m.text()); });
  p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/challenges.cloudflare.com/**', r => modo === 'bloqueado' ? r.abort() : r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => {
    const u = r.request().url();
    if (/\/auth\/v1\/otp/.test(u)) { p.otp.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill(otpResp || { status: 200, contentType: 'application/json', body: '{}' }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 });
  return { c, p };
}
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await abre(b, 'ok');
    t('widget carregado e renderizado pela CSP de produção', await p.waitForFunction(() => window.__renders === 1, null, { timeout: 5000 }).then(() => true, () => false));
    await p.fill('#ng-login-e', 'teste@example.com'); await p.click('#ng-login-ok'); await p.waitForTimeout(900);
    t('pedido do e-mail leva o captcha_token do Turnstile', p.otp.length === 1 && p.otp[0].gotrue_meta_security && p.otp[0].gotrue_meta_security.captcha_token === 'TOKEN-1', JSON.stringify(p.otp[0]));
    t('depois do envio o widget é reiniciado (token vale uma vez)', await p.evaluate(() => window.__resets) >= 1);
    t('sem violação de CSP', p.csp.length === 0, p.csp.join('|'));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  { const { c, p } = await abre(b, 'bloqueado');
    await p.fill('#ng-login-e', 'teste@example.com'); await p.waitForTimeout(600); await p.click('#ng-login-ok'); await p.waitForTimeout(900);
    t('widget bloqueado: o envio ainda é tentado (sem token)', p.otp.length === 1 && !(p.otp[0].gotrue_meta_security && p.otp[0].gotrue_meta_security.captcha_token), JSON.stringify(p.otp[0]));
    await c.close(); }
  { const { c, p } = await abre(b, 'ok', { status: 400, contentType: 'application/json', body: JSON.stringify({ code: 400, error_code: 'captcha_failed', msg: 'captcha verification process failed' }) });
    await p.fill('#ng-login-e', 'teste@example.com'); await p.waitForTimeout(600); await p.click('#ng-login-ok'); await p.waitForTimeout(900);
    const m = await p.textContent('#ng-login-m');
    t('captcha recusado pelo Supabase mostra mensagem clara', /verificação de segurança/.test(m), m); await c.close(); }
  { // o widget pede um toque (desafio interativo): a mensagem manda marcar a caixa e nada é enviado até o token chegar
    const c = await b.newContext({ viewport: { width: 400, height: 800 } }); const p = await c.newPage(); p.otp = [];
    await p.route('**/challenges.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: "window.turnstile={render:function(s,o){window.__o=o;setTimeout(function(){o['before-interactive-callback']()},100);return 'w1'},reset:function(){}};" }));
    await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => { if (/\/auth\/v1\/otp/.test(r.request().url())) p.otp.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); });
    await p.goto(URL_); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(500);
    t('widget interativo: aviso para marcar a caixa aparece sozinho', /Marque a caixa/.test(await p.textContent('#ng-login-m')), await p.textContent('#ng-login-m'));
    await p.fill('#ng-login-e', 'teste@example.com'); await p.click('#ng-login-ok'); await p.waitForTimeout(400);
    t('sem token, nada é enviado e o aviso continua', p.otp.length === 0 && /Marque a caixa/.test(await p.textContent('#ng-login-m')));
    await p.evaluate(() => window.__o.callback('TOKEN-X')); await p.waitForTimeout(200);
    t('depois de marcar a caixa, o aviso some', (await p.textContent('#ng-login-m')) === '');
    await p.click('#ng-login-ok'); await p.waitForTimeout(700);
    t('com o token, o e-mail é enviado', p.otp.length === 1 && p.otp[0].gotrue_meta_security.captcha_token === 'TOKEN-X'); await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
