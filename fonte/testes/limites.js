// Limites de leitura — o pull traz TODO o histórico mesmo que o servidor corte as páginas. Usuário descartável com 2.300 medições.
// Uso: node limites.js http://localhost:8791   (cria/remove o usuário por SQL fora deste script)
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const U = { e: 'limites-teste@example.test', p: 'TesteLimites#2026x' }, ESPERADO = 2300;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
async function rodada(b, nome, cap) {
  const c = await b.newContext({ viewport: { width: 400, height: 850 } });
  const p = await c.newPage(); const reqs = []; const errs = [];
  p.on('pageerror', e => errs.push('PE ' + e.message));
  if (cap) await p.route('**/rest/v1/user_docs*', async r => {
    const q = r.request(); if (q.method() !== 'GET') return r.continue();
    const res = await r.fetch(); let body = await res.json(); if (Array.isArray(body)) body = body.slice(0, cap);
    reqs.push(body.length);
    await r.fulfill({ status: res.status(), headers: { ...res.headers(), 'content-length': undefined }, body: JSON.stringify(body) });
  });
  else p.on('response', async r => { if (/rest\/v1\/user_docs/.test(r.url()) && r.request().method() === 'GET') { try { reqs.push((await r.json()).length); } catch (e) {} } });
  await p.goto(URL_); await p.waitForSelector('.ng-login', { timeout: 8000 });
  await p.evaluate(async (u) => { const r = await window.ngNuvem.client.auth.signInWithPassword({ email: u.e, password: u.p }); if (r.error) throw new Error(r.error.message); }, U);
  await p.waitForSelector('.ng-login', { state: 'detached', timeout: 20000 });
  let n = 0;
  for (let i = 0; i < 60 && n < ESPERADO; i++) { await p.waitForTimeout(1000); n = await p.evaluate(async () => { const db = await window.claude.use('db'); const s = await db.collection('medicoes').get(); return s.docs ? s.docs.length : (s.size || 0); }); }
  t(nome + ': todas as ' + ESPERADO + ' medições chegaram ao aparelho', n === ESPERADO, 'recebidas=' + n + ' | páginas=' + JSON.stringify(reqs));
  t(nome + ': usou várias páginas', reqs.length >= 3, reqs.length);
  t(nome + ': sem erros de JS', errs.length === 0, errs.join(' | '));
  await c.close();
}
(async () => {
  const b = await chromium.launch();
  await rodada(b, 'limite real do projeto', 0);
  await rodada(b, 'servidor cortando em 400 linhas', 400);
  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
