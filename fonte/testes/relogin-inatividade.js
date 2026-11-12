// "Pedir e-mail e código de novo" depois de um tempo fora do app (Config → Conta). Supabase simulado (sem rede).
// Uso: node relogin-inatividade.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const REF = 'gjoxrgnkwmjvcfiywtcs', UID = '11111111-1111-4111-8111-111111111111', MAIL = 'gabriel@example.com';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
async function abre(b, { limite, ativ, offline }) {
  const c = await b.newContext({ viewport: { width: 400, height: 800 } });
  await c.addInitScript(([REF, UID, MAIL, limite, ativ]) => {
    try {
      if (sessionStorage.getItem('semeado')) return; sessionStorage.setItem('semeado', '1');
      const exp = Math.floor(Date.now() / 1000) + 3600;
      localStorage.setItem('sb-' + REF + '-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'r', user: { id: UID, email: MAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
      if (limite !== null) localStorage.setItem('ng_relogin_min', String(limite));
      if (ativ !== null) localStorage.setItem('ng_atividade', String(Date.now() - ativ * 60000));
    } catch (e) { }
  }, [REF, UID, MAIL, limite, ativ]);
  const p = await c.newPage(); p.logout = 0; p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/challenges.cloudflare.com/**', r => r.abort());
  await p.route('**/' + REF + '.supabase.co/**', r => {
    const u = r.request().url();
    if (/\/auth\/v1\/logout/.test(u)) { p.logout++; return r.fulfill({ status: 204, body: '' }); }
    if (/\/rest\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    return r.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  if (offline) await c.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'onLine', { get: () => false }); });
  await p.goto(URL_); await p.waitForTimeout(2500);
  return { c, p };
}
const temLogin = p => p.evaluate(() => !!document.getElementById('ng-login-e'));
const token = p => p.evaluate(k => localStorage.getItem(k), 'sb-' + REF + '-auth-token');
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await abre(b, { limite: 30, ativ: 31 });
    t('fora 31 min com limite de 30: pede o login de novo', await temLogin(p));
    t('mensagem de segurança aparece', /Por segurança/.test(await p.textContent('#ng-login-p')));
    t('e-mail anterior vem preenchido', (await p.inputValue('#ng-login-e')) === MAIL);
    t('sessão local foi encerrada', (await token(p)) === null);
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  { const { c, p } = await abre(b, { limite: 30, ativ: 5 });
    t('fora só 5 min com limite de 30: continua conectado', !(await temLogin(p)) && (await token(p)) !== null);
    t('campo da Config mostra o limite escolhido', await p.evaluate(() => document.getElementById('cfg-relogin') && document.getElementById('cfg-relogin').value) === '30');
    t('texto explicativo da Config', /30 minutos/.test(await p.textContent('#cfg-relogin-info')), await p.textContent('#cfg-relogin-info'));
    await p.evaluate(() => { const s = document.getElementById('cfg-relogin'); s.value = '480'; s.dispatchEvent(new Event('change')); });
    t('trocar o limite grava no aparelho', await p.evaluate(() => localStorage.getItem('ng_relogin_min')) === '480');
    // voltar ao app depois de muito tempo: tranca e recarrega
    await p.evaluate(() => { localStorage.setItem('ng_atividade', String(Date.now() - 9 * 3600 * 1000)); document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForSelector('#ng-login-e', { timeout: 9000 }).catch(() => { });
    t('voltou ao app depois de 9 h (limite 8 h): tranca e pede login', await temLogin(p));
    t('sessão local encerrada na trava', (await token(p)) === null); await c.close(); }
  { const { c, p } = await abre(b, { limite: null, ativ: 99999 });
    t('limite "Nunca" (padrão): mesmo fora por muito tempo continua conectado', !(await temLogin(p)) && (await token(p)) !== null); await c.close(); }
  { const { c, p } = await abre(b, { limite: 30, ativ: 60, offline: true });
    t('sem internet e tempo vencido: bloqueia e avisa', (await temLogin(p)) && /sem internet/i.test(await p.textContent('#ng-login-p')), await p.textContent('#ng-login-p'));
    await p.fill('#ng-login-e', MAIL); await p.click('#ng-login-ok'); await p.waitForTimeout(500);
    t('tentar entrar offline mostra aviso de rede', /Sem internet|Sem conexão/i.test(await p.textContent('#ng-login-m')), await p.textContent('#ng-login-m')); await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
