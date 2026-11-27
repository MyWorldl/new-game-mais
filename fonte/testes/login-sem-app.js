// Tela de entrada leve: sem sessão guardada, o app não é montado atrás da tela de entrada (nem baixa as fontes dele); com sessão, nada muda.
// Mediu-se no Lighthouse (celular, rede lenta): LCP da tela de entrada 4,9 s -> 2,9 s. Uso: node login-sem-app.js http://localhost:8791
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8791';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const REF = 'gjoxrgnkwmjvcfiywtcs';
async function abre(b, { token = false, url = '/index.html', bloqueiaNuvem = false } = {}) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 } });
  if (token) await c.addInitScript(([ref]) => { try { localStorage.setItem('sb-' + ref + '-auth-token', JSON.stringify({ access_token: 'x', refresh_token: 'y', expires_at: 9999999999, user: { id: 'u1', email: 'a@b.co' } })); localStorage.setItem('ng_recup_pulo', '9999-12-31'); } catch (e) { } }, [REF]);
  const p = await c.newPage(); p.errs = []; p.reqs = [];
  p.on('pageerror', e => p.errs.push(e.message)); p.on('request', r => p.reqs.push(r.url()));
  await p.route('**/challenges.cloudflare.com/**', r => r.abort());
  await p.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  if (bloqueiaNuvem) await p.route('**/ng-nuvem.js', r => r.abort());
  await p.goto(BASE + url); return { c, p };
}
const classe = p => p.evaluate(() => document.documentElement.classList.contains('ng-sem-sessao'));
const appVisivel = p => p.evaluate(() => { const a = document.querySelector('.app'); return !!a && getComputedStyle(a).display !== 'none'; });
// a tela de entrada usa Work Sans e Barlow Condensed 700; o resto (Barlow 500/600, IBM Plex Mono) só o app usa
const fontesDoApp = p => p.reqs.filter(u => /ibm-plex-mono|barlow-condensed-latin-(500|600)/.test(u));
(async () => {
  const b = await chromium.launch();

  // 1) sem sessão: marcado antes do primeiro desenho, app fora do layout, fontes do app não baixadas, tela de entrada à vista
  let { c, p } = await abre(b);
  await p.waitForSelector('#ng-login-e', { timeout: 8000 }); await p.waitForTimeout(1500);
  t('sem sessão: <html> tem ng-sem-sessao e o app não entra no layout (display: none)', (await classe(p)) && !(await appVisivel(p)));
  t('sem sessão: a tela de entrada aparece e o app continua travado (inert)', await p.evaluate(() => !!document.querySelector('.ng-lc') && document.querySelector('.app').hasAttribute('inert')));
  t('sem sessão: as fontes que só o app usa (Barlow 500/600, IBM Plex Mono) não são baixadas', fontesDoApp(p).length === 0, fontesDoApp(p).join(' '));
  t('sem sessão: a fonte da tela de entrada (Work Sans) é baixada', p.reqs.some(u => /work-sans/.test(u)));
  t('sem sessão: ng-cedo.js é um script do <head> (roda antes do primeiro desenho)', await p.evaluate(() => { const s = document.querySelector('script[src="ng-cedo.js"]'); return !!s && s.parentElement === document.head && !s.defer && !s.async; }));
  t('sem sessão: sem erro de página', p.errs.length === 0, p.errs.join(' | '));
  await c.close();

  // 2) com sessão guardada (mesmo vencida): nada muda, o app aparece como sempre
  ({ c, p } = await abre(b, { token: true }));
  await p.waitForTimeout(2500);
  t('com sessão guardada: sem ng-sem-sessao e o app é montado (display normal)', !(await classe(p)) && (await appVisivel(p)));
  t('com sessão guardada: as fontes do app são baixadas como antes', fontesDoApp(p).length > 0);
  await c.close();

  // 3) voltando do link do e-mail (?code=): a sessão sai logo em seguida, então o app não é escondido
  ({ c, p } = await abre(b, { url: '/index.html?code=abc123' }));
  t('voltando do link do e-mail (?code=): sem ng-sem-sessao', !(await classe(p)));
  await c.close();
  ({ c, p } = await abre(b, { url: '/index.html#access_token=abc&type=magiclink' }));
  t('voltando do link do e-mail (#access_token): sem ng-sem-sessao', !(await classe(p)));
  await c.close();

  // 4) rede ruim ou script bloqueado: em até 8 s o app aparece, nunca fica tela em branco
  ({ c, p } = await abre(b, { bloqueiaNuvem: true }));
  t('ng-nuvem.js bloqueado: logo depois do carregamento o app ainda está oculto', (await classe(p)) && !(await appVisivel(p)));
  await p.waitForTimeout(8600);
  t('ng-nuvem.js bloqueado: depois de 8 s a classe sai e o app aparece (nunca tela em branco)', !(await classe(p)) && (await appVisivel(p)));
  await c.close();

  // 5) a sessão aparece depois que ng-cedo.js já marcou a página (ng-nuvem.js a encontra): o app é liberado e as medidas são refeitas (resize)
  {
    const c5 = await b.newContext({ viewport: { width: 390, height: 844 } });
    await c5.addInitScript(() => { window.__resizes = 0; window.addEventListener('resize', () => window.__resizes++); try { localStorage.setItem('ng_recup_pulo', '9999-12-31'); } catch (e) { } });
    const p5 = await c5.newPage(); p5.errs = []; p5.on('pageerror', e => p5.errs.push(e.message));
    await p5.route('**/challenges.cloudflare.com/**', r => r.abort());
    await p5.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await p5.route('**/ng-nuvem.js', async (r) => {
      const orig = await r.fetch(); const corpo = await orig.text();
      await r.fulfill({ response: orig, body: "try{localStorage.setItem('sb-" + REF + "-auth-token',JSON.stringify({access_token:'x',refresh_token:'y',expires_at:9999999999,user:{id:'u1',email:'a@b.co'}}));}catch(e){}\n" + corpo });
    });
    await p5.goto(BASE + '/index.html'); await p5.waitForTimeout(2500);
    t('sessão encontrada pelo ng-nuvem.js: a classe sai, o app aparece e a tela de entrada não abre', !(await classe(p5)) && (await appVisivel(p5)) && (await p5.locator('.ng-lc').count()) === 0);
    t('ao liberar o app, a janela recebe um resize (o app foi montado com tamanho zero)', (await p5.evaluate(() => window.__resizes)) >= 1);
    t('sem erro de página ao liberar o app', p5.errs.length === 0, p5.errs.join(' | '));
    await c5.close();
  }

  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
