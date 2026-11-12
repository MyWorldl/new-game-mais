// Botão "Instalar no celular" (Configurações). Uso: node instalar.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 260) : '')); };
const UA = {
  ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  iosChrome: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0 Mobile/15E148 Safari/604.1',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36',
  insta: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0',
};
async function abre(b, { ua, standalone } = {}) {
  const c = await b.newContext({ viewport: { width: 400, height: 850 }, userAgent: ua });
  await c.addInitScript((st) => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) {}
    if (st) { const mm = window.matchMedia.bind(window); window.matchMedia = (q) => /display-mode:\s*standalone/.test(q) ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} } : mm(q); } }, !!standalone);
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1500);
  await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); document.getElementById('tab-config').click(); });
  await p.waitForTimeout(500); return { c, p };
}
const txt = (p, s) => p.evaluate((s) => (document.querySelector(s) || {}).innerText || '', s);
(async () => {
  const b = await chromium.launch();
  // 1) computador, sem aviso do navegador
  let { c, p } = await abre(b);
  t('card "Instalar no celular" existe em Configurações', (await p.locator('#cfg-instalar').count()) === 1 && /Instalar no celular/.test(await txt(p, '#cfg-instalar h2')));
  t('sem aviso do navegador: botão "Como instalar" e passos fechados', (await txt(p, '#cfg-inst-btn')) === 'Como instalar' && await p.locator('#cfg-inst-passos').isHidden());
  await p.click('#cfg-inst-btn');
  t('passos abrem; aria-expanded=true; texto de computador', (await p.getAttribute('#cfg-inst-btn', 'aria-expanded')) === 'true' && /computador/i.test(await txt(p, '#cfg-inst-passos')), await txt(p, '#cfg-inst-passos'));
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('#cfg-instalar', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: card sem violações (passos abertos)', v.length === 0, v.join(',')); }
  await p.click('#cfg-inst-btn'); t('segundo toque fecha os passos', await p.locator('#cfg-inst-passos').isHidden() && (await p.getAttribute('#cfg-inst-btn', 'aria-expanded')) === 'false');
  // 2) navegador oferece instalação (Android/Chrome): botão "Instalar agora" usa a janela oficial
  await p.evaluate(() => { window.__prompts = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { window.__prompts++; }; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
  await p.waitForTimeout(200);
  t('com aviso do navegador: botão vira "Instalar agora"', (await txt(p, '#cfg-inst-btn')) === 'Instalar agora');
  await p.click('#cfg-inst-btn'); await p.waitForTimeout(300);
  t('toque chama prompt() uma vez e mostra "Instalando"', (await p.evaluate(() => window.__prompts)) === 1 && /Instalando/.test(await txt(p, '#cfg-inst-info')), await txt(p, '#cfg-inst-info'));
  await p.evaluate(() => window.dispatchEvent(new Event('appinstalled'))); await p.waitForTimeout(200);
  t('depois de instalado: mostra "Pronto" e esconde o botão', /Pronto/.test(await txt(p, '#cfg-inst-info')) && await p.locator('#cfg-inst-btn').isHidden());
  t('sem erros de JS (computador)', p.errs.length === 0, p.errs.join('|')); await c.close();
  // 3) usuário recusa a janela
  ({ c, p } = await abre(b));
  await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => {}; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); });
  await p.waitForTimeout(200); await p.click('#cfg-inst-btn'); await p.waitForTimeout(300);
  t('recusou: mensagem amigável e volta para "Como instalar"', /fica para depois/.test(await txt(p, '#cfg-inst-info')) && (await txt(p, '#cfg-inst-btn')) === 'Como instalar' && !(await p.locator('#cfg-inst-btn').isDisabled())); await c.close();
  // 4) iPhone/Safari
  ({ c, p } = await abre(b, { ua: UA.ios })); await p.click('#cfg-inst-btn');
  let s = await txt(p, '#cfg-inst-passos'); t('iPhone Safari: Compartilhar → Adicionar à Tela de Início', /Compartilhar/.test(s) && /Adicionar à Tela de Início/.test(s) && /Safari/.test(await txt(p, '#cfg-inst-info')), s);
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('#cfg-instalar', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id)); t('axe iPhone: sem violações', v.length === 0, v.join(',')); } await c.close();
  // 5) iPhone com Chrome: manda abrir no Safari
  ({ c, p } = await abre(b, { ua: UA.iosChrome })); await p.click('#cfg-inst-btn'); s = await txt(p, '#cfg-inst-passos'); t('iPhone fora do Safari: pede para abrir no Safari', /Abra este endereço no\s+Safari/i.test(s), s); await c.close();
  // 6) Android sem aviso
  ({ c, p } = await abre(b, { ua: UA.android })); await p.click('#cfg-inst-btn'); s = await txt(p, '#cfg-inst-passos'); t('Android: ⋮ → Instalar app', /Instalar app/.test(s) && /Android/.test(s), s); await c.close();
  // 7) navegador embutido (Instagram)
  ({ c, p } = await abre(b, { ua: UA.insta })); await p.click('#cfg-inst-btn'); s = await txt(p, '#cfg-inst-passos'); t('app embutido: pede para abrir no navegador', /Abrir no navegador/i.test(s), s); await c.close();
  // 8) já aberto como app
  ({ c, p } = await abre(b, { standalone: true })); t('aberto como app: "Pronto" e sem botão', /Pronto/.test(await txt(p, '#cfg-inst-info')) && await p.locator('#cfg-inst-btn').isHidden()); await c.close();
  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
