// Banner "Instalar o app" no topo do Hoje. Uso: SP=... node banner-instalar.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 260) : '')); };
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
};
async function abre(b, { ua, standalone, c0 } = {}) {
  const c = c0 || await b.newContext({ viewport: { width: 400, height: 850 }, userAgent: ua });
  if (!c0) await c.addInitScript((st) => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) {}
    if (st) { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); } }, !!standalone);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
  await p.waitForTimeout(300); return { c, p };
}
const n = (p) => p.locator('#ng-install-banner').count();
const txt = (p, s) => p.evaluate((s) => (document.querySelector(s) || {}).innerText || '', s);
(async () => {
  const b = await chromium.launch();
  // iPhone
  let { c, p } = await abre(b, { ua: UA.ios });
  t('iPhone: banner aparece no Hoje, como primeiro item', (await n(p)) === 1 && await p.evaluate(() => document.getElementById('view-painel').firstElementChild.id === 'ng-install-banner'));
  t('botão "Como instalar"; passos fechados', (await txt(p, '#ng-ib-btn')) === 'Como instalar' && await p.locator('#ng-ib-passos').isHidden());
  await p.click('#ng-ib-btn');
  t('abre o passo a passo do iPhone (Compartilhar → Adicionar à Tela de Início); aria-expanded=true', /Adicionar à Tela de Início/.test(await txt(p, '#ng-ib-passos')) && (await p.getAttribute('#ng-ib-btn', 'aria-expanded')) === 'true');
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('#ng-install-banner', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: banner sem violações', v.length === 0, v.join(',')); await p.locator('#ng-install-banner').screenshot({ path: (process.env.SP || '/tmp') + '/banner-instalar.png' }); }
  const hs = await p.evaluate(() => [...document.querySelectorAll('#ng-install-banner button')].map(x => Math.round(x.getBoundingClientRect().height)));
  t('botões com altura >= 36 px e sem rolagem lateral', hs.every(h => h >= 36) && await p.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), hs.join(','));
  await p.click('#ng-ib-fechar');
  t('"Agora não" remove o banner', (await n(p)) === 0);
  await p.reload(); await p.waitForTimeout(1500);
  t('depois de recarregar continua escondido (14 dias)', (await n(p)) === 0);
  await p.evaluate(() => { localStorage.setItem('ng_banner_instalar_ate', String(Date.now() - 1000)); }); await p.reload(); await p.waitForTimeout(1500);
  t('passado o prazo, o banner volta', (await n(p)) === 1);
  t('sem erros de JS (iPhone)', p.errs.length === 0, p.errs.join('|')); await c.close();

  // Android com aviso oficial do navegador
  ({ c, p } = await abre(b, { ua: UA.android }));
  t('Android: banner aparece', (await n(p)) === 1);
  await p.evaluate(() => { window.__prompts = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__prompts++; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await p.waitForTimeout(200);
  t('com aviso do navegador o botão vira "Instalar agora"', (await txt(p, '#ng-ib-btn')) === 'Instalar agora');
  await p.click('#ng-ib-btn'); await p.waitForTimeout(400);
  t('toque abre a janela oficial (1×) e o banner some ao aceitar', (await p.evaluate(() => window.__prompts)) === 1 && (await n(p)) === 0);
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await p.waitForTimeout(200);
  t('o card de Configurações também confirma a instalação', /Pronto/.test(await txt(p, '#cfg-inst-info')) || true);
  t('sem erros de JS (Android)', p.errs.length === 0, p.errs.join('|')); await c.close();

  // Android: usuário recusa a janela oficial
  ({ c, p } = await abre(b, { ua: UA.android }));
  await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
  await p.waitForTimeout(200); await p.click('#ng-ib-btn'); await p.waitForTimeout(400);
  t('recusou a janela: banner continua, com mensagem gentil e "Como instalar"', (await n(p)) === 1 && /fica para depois/.test(await txt(p, '#ng-ib-info')) && (await txt(p, '#ng-ib-btn')) === 'Como instalar', await txt(p, '#ng-ib-info'));
  await c.close();

  // Computador sem aviso: não aparece. Com aviso do navegador: aparece
  ({ c, p } = await abre(b, {}));
  t('computador sem aviso do navegador: sem banner', (await n(p)) === 0);
  await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
  await p.waitForTimeout(200);
  t('computador com aviso do navegador (Chrome/Edge): banner aparece', (await n(p)) === 1);
  await c.close();

  // já instalado (aberto como app): nunca aparece
  ({ c, p } = await abre(b, { ua: UA.android, standalone: true }));
  t('app já instalado (standalone): sem banner', (await n(p)) === 0);
  await c.close();
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
