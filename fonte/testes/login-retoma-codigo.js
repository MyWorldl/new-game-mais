// Login: ao voltar do app de e-mail a página recarrega; a tela do código tem de voltar pronta (sem pedir o e-mail de novo).
// Usa rotas simuladas (sem rede). Uso: node login-retoma-codigo.js http://localhost:8791
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8791';
const URL_ = BASE + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const STUB = `window.turnstile={render:function(sel,o){window.__opts=o;setTimeout(function(){o.callback('TOKEN-X')},100);return 'w1'},reset:function(){setTimeout(function(){window.__opts.callback('TOKEN-R')},100)}};`;
async function contexto(b) {
  const c = await b.newContext({ viewport: { width: 400, height: 800 } });
  const p = await c.newPage(); p.otp = []; p.verify = []; p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/challenges.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => {
    const u = r.request().url();
    if (/\/auth\/v1\/otp/.test(u)) { p.otp.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    if (/\/auth\/v1\/verify/.test(u)) { p.verify.push(JSON.parse(r.request().postData() || '{}')); return r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }) }); }
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  return { c, p };
}
const estado = p => p.evaluate(() => ({
  email: document.getElementById('ng-login-e').value, ro: document.getElementById('ng-login-e').readOnly,
  codVisivel: !document.getElementById('ng-login-cod').hidden, botao: document.getElementById('ng-login-ok').textContent.trim(),
  msg: document.getElementById('ng-login-m').textContent, pedirAviso: !document.getElementById('ng-pedir-aviso').hidden,
  outro: !document.getElementById('ng-login-outro').hidden, guardado: localStorage.getItem('ng_otp_envio')
}));
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await contexto(b);
    await p.goto(URL_); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(500);
    await p.fill('#ng-login-e', 'Teste@Example.com'); await p.click('#ng-login-ok'); await p.waitForTimeout(900);
    const a = await estado(p);
    t('e-mail enviado: a tela do código aparece e o pedido fica guardado no aparelho', a.codVisivel && a.ro && /teste@example.com/.test(a.guardado || ''), JSON.stringify(a));
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(500);
    const r = await estado(p);
    t('depois de recarregar a página, a tela do código volta pronta (e-mail travado, campo do código aberto)', r.codVisivel && r.ro && r.email === 'teste@example.com' && r.botao === 'Entrar com o código' && r.outro, JSON.stringify(r));
    t('depois de recarregar: aviso explica que é para continuar e o convite "Pedir acesso" não aparece', /Continue de onde parou/.test(r.msg) && !r.pedirAviso, JSON.stringify(r));
    t('depois de recarregar o foco já está no campo do código', await p.evaluate(() => document.activeElement && document.activeElement.id) === 'ng-login-c');
    t('depois de recarregar nenhum e-mail novo é pedido', p.otp.length === 1, p.otp.length);
    await p.fill('#ng-login-c', '123456'); await p.click('#ng-login-ok'); await p.waitForTimeout(700);
    t('o código digitado depois de recarregar é conferido com o e-mail certo (type=email)', p.verify.length === 1 && p.verify[0].email === 'teste@example.com' && p.verify[0].token === '123456' && p.verify[0].type === 'email', JSON.stringify(p.verify[0]));
    await p.click('#ng-login-outro'); await p.waitForTimeout(200);
    const o = await estado(p);
    t('"Usar outro e-mail" limpa o guardado e esvazia o formulário', o.guardado === null && o.email === '' && !o.codVisivel, JSON.stringify(o));
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(400);
    const f = await estado(p);
    t('depois de "usar outro e-mail", recarregar mostra o formulário limpo', !f.codVisivel && !f.ro && f.email === '' && f.pedirAviso, JSON.stringify(f));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  { // pedido antigo (passou da validade do código): formulário limpo e guardado apagado
    const { c, p } = await contexto(b);
    await p.goto(URL_); await p.waitForSelector('#ng-login-e');
    await p.evaluate(() => localStorage.setItem('ng_otp_envio', JSON.stringify({ e: 'velho@example.com', t: Date.now() - 51 * 60000 })));
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(400);
    const e = await estado(p);
    t('pedido de mais de 50 minutos não é retomado (o código já não vale) e o guardado é apagado', !e.codVisivel && e.email === '' && e.guardado === null, JSON.stringify(e));
    await p.evaluate(() => localStorage.setItem('ng_otp_envio', 'lixo{'));
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(400);
    const g = await estado(p);
    t('valor guardado corrompido é ignorado sem quebrar a tela', !g.codVisivel && p.errs.length === 0 && g.guardado === null, JSON.stringify(g) + p.errs.join('|'));
    await c.close(); }
  { // login pedido de novo por inatividade: não retoma código antigo
    const { c, p } = await contexto(b);
    await p.goto(URL_); await p.waitForSelector('#ng-login-e');
    await p.evaluate(() => { localStorage.setItem('ng_otp_envio', JSON.stringify({ e: 'a@example.com', t: Date.now() })); localStorage.setItem('ng_motivo_relogin', 'a@example.com'); });
    await p.reload(); await p.waitForSelector('#ng-login-e'); await p.waitForTimeout(400);
    const e = await estado(p);
    t('relogin por inatividade pede um código novo (não retoma o antigo)', !e.codVisivel && e.guardado === null, JSON.stringify(e));
    await c.close(); }
  { // "Pedir acesso" tem prioridade sobre retomar
    const { c, p } = await contexto(b);
    await p.goto(URL_); await p.waitForSelector('#ng-login-e');
    await p.evaluate(() => localStorage.setItem('ng_otp_envio', JSON.stringify({ e: 'a@example.com', t: Date.now() })));
    await p.goto('about:blank'); await p.goto(URL_ + '#pedir-acesso'); await p.waitForSelector('#ng-login-e', { state: 'attached' }); await p.waitForTimeout(500);
    const v = await p.evaluate(() => ({ ped: !document.getElementById('ng-pedir-f').hidden, ent: !document.getElementById('ng-login-f').hidden, t: document.getElementById('ng-login-t').textContent }));
    t('"Pedir acesso" da /inicio abre o formulário de pedido mesmo com código guardado', v.ped && !v.ent && /Pedir acesso/.test(v.t), JSON.stringify(v));
    await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
