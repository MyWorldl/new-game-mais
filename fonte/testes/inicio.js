// Página de apresentação (antes do login): site/inicio.html. Uso: node inicio.js http://localhost:8791
// Confere: carrega sem erro nem violação de CSP, sem rolagem lateral, botões levam ao app, lista de atualizações vem de NOVIDADES,
// acessibilidade (axe), constelação (canvas) desenha, anima e fica parada com movimento reduzido, tipografia e LCP.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8791';
const URL_ = BASE + '/inicio.html';
const SITE = path.resolve(__dirname, '../../site');
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 260) : '')); };

// a mesma lista que a tela de entrada do app usa (a página é gerada a partir dela)
const nuvem = fs.readFileSync(path.join(SITE, 'ng-nuvem.js'), 'utf8');
const ini = nuvem.indexOf('var NOVIDADES = ['); const fim = nuvem.indexOf('\n  ];', ini);
const NOV = new Function('return ' + nuvem.slice(ini + 'var NOVIDADES = '.length, fim + 4))();

async function abre(b, { w = 390, h = 844, reduz = false, dpr = 1 } = {}) {
  const c = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dpr, reducedMotion: reduz ? 'reduce' : 'no-preference' });
  await c.addInitScript(() => {
    window.__csp = []; window.__lcp = null;
    document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + e.blockedURI));
    try { new PerformanceObserver((l) => { const es = l.getEntries(); const e = es[es.length - 1]; window.__lcp = { tag: e.element ? e.element.tagName : '?', t: Math.round(e.startTime) }; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {}
  });
  const p = await c.newPage(); p.errs = []; p.msgs = [];
  p.on('pageerror', (e) => p.errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') p.msgs.push(m.text()); });
  const r = await p.goto(URL_, { waitUntil: 'load' }); p.status = r.status();
  await p.waitForTimeout(1800);   // a constelação começa quando o navegador fica ocioso
  return { c, p };
}
const pixels = (p) => p.evaluate(() => { const cv = document.getElementById('constelacao'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, soma = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) { n++; soma += d[i] + d[i - 1] + d[i - 2] + d[i - 3]; } return { n, soma, w: cv.width, h: cv.height }; });

(async () => {
  const b = await chromium.launch();

  // 1) carregamento e estrutura (celular)
  let { c, p } = await abre(b);
  t('responde 200 e o título da página tem NG+', p.status === 200 && /NG\+/.test(await p.title()), await p.title());
  t('um único h1 com "New Game+"', (await p.locator('h1').count()) === 1 && /Comece o seu New Game\+/.test(await p.innerText('h1')), await p.innerText('h1'));
  t('lang pt-BR, viewport e descrição presentes', (await p.getAttribute('html', 'lang')) === 'pt-BR' && /width=device-width/.test(await p.getAttribute('meta[name=viewport]', 'content')) && (await p.getAttribute('meta[name=description]', 'content')).length > 40);
  t('sem erros de JS e sem erros/avisos no console', p.errs.length === 0 && p.msgs.length === 0, p.errs.concat(p.msgs).join(' | '));
  t('nenhuma violação da política de segurança (CSP)', (await p.evaluate(() => window.__csp)).length === 0, (await p.evaluate(() => window.__csp)).join(' | '));
  const html = fs.readFileSync(path.join(SITE, 'inicio.html'), 'utf8');
  t('sem <style> nem <script> dentro da página (CSP sem unsafe-inline)', !/<style[\s>]/i.test(html) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(html));
  t('sem atributos style="" nem manipuladores onclick= no HTML', !/\sstyle=/i.test(html) && !/\son[a-z]+=/i.test(html));
  t('pula-para-o-conteúdo existe e aponta para o <main>', (await p.getAttribute('.pular', 'href')) === '#conteudo' && (await p.locator('main#conteudo').count()) === 1);

  // 2) botões e links levam para onde dizem
  const hrefs = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => [a.getAttribute('href'), a.textContent.trim().replace(/\s+/g, ' ')]));
  const entrar = hrefs.filter((h) => /^Entrar/.test(h[1]));
  t('"Entrar" (topo, destaque e rodapé) leva ao app em "./"', entrar.length === 3 && entrar.every((h) => h[0] === './'), JSON.stringify(entrar));
  t('âncoras internas existem (#recursos, #atualizacoes, #conteudo)', ['recursos', 'atualizacoes', 'conteudo'].every((id) => hrefs.some((h) => h[0] === '#' + id) && p.locator('#' + id).count()));
  const dest = [...new Set(hrefs.map((h) => h[0]).filter((h) => !h.startsWith('#')))];
  const resp = {}; for (const h of dest) { const u = new URL(h, URL_).href; const r = await c.request.get(u); resp[h] = r.status(); }
  t('todo destino de link responde 200 (app, instalar.html, inicio.html)', Object.values(resp).every((s) => s === 200), JSON.stringify(resp));
  const alturas = await p.evaluate(() => [...document.querySelectorAll('a.btn, a.fantasma, .novo-link, .rodape-links a, .marca, summary')].map((e) => Math.round(e.getBoundingClientRect().height)));
  t('alvos de toque (botões, links do rodapé, resumos) com pelo menos 44 px de altura', alturas.length >= 10 && alturas.every((a) => a >= 44), alturas.join(','));

  // 3) atualizações vêm de NOVIDADES (fonte única)
  const atu = await p.evaluate(() => ({
    versao: (document.querySelector('.nov-atual .nov-meta') || {}).innerText || '',
    titulo: (document.querySelector('.nov-atual h3') || {}).innerText || '',
    itensAtual: document.querySelectorAll('.nov-atual li').length,
    ant: document.querySelectorAll('details.nov-ant').length,
    semTag: [...document.querySelectorAll('.nov-itens li')].filter((li) => !li.querySelector('.nov-tag') || !li.querySelector('.nov-x').textContent.trim()).length,
    total: document.querySelectorAll('.nov-itens li').length,
    cab: (document.querySelector('.nov-h-ant') || {}).innerText || '',
    link: (document.querySelector('.novo-link .novo-x') || {}).innerText || '',
  }));
  t('versão e título mais recentes = NOVIDADES[0]', atu.versao.toLowerCase().includes(NOV[0].v.replace('ng-modular-', 'versão ')) && atu.versao.includes(NOV[0].data) && atu.titulo === NOV[0].titulo, JSON.stringify([atu.versao, atu.titulo, NOV[0].v, NOV[0].titulo]));
  t('o link "Novidade" do destaque mostra o título mais recente', atu.link === NOV[0].titulo, atu.link);
  t('itens da versão atual = itens de NOVIDADES[0]', atu.itensAtual === NOV[0].itens.length, atu.itensAtual + ' x ' + NOV[0].itens.length);
  t('versões anteriores: um <details> por versão (NOVIDADES.length − 1) e contagem no cabeçalho', atu.ant === NOV.length - 1 && atu.cab.includes('(' + (NOV.length - 1) + ')'), atu.ant + ' / ' + NOV.length + ' / ' + atu.cab);
  t('todo item tem rótulo (Novo/Melhoria/Correção) e texto; total de itens confere', atu.semTag === 0 && atu.total === NOV.reduce((s, n) => s + n.itens.length, 0), atu.semTag + ' sem tag; ' + atu.total);
  t('textos de NOVIDADES entram escapados (nenhum "<" solto no HTML gerado)', !/<(?!\/?(?:a|article|button|canvas|details|div|footer|h[1-3]|head|header|html|body|li|link|main|meta|nav|p|script|section|span|summary|svg|path|title|ul|!)\b)/i.test(html.replace(/<!doctype html>/i, '')));
  const aberto = await p.evaluate(() => document.querySelectorAll('details.nov-ant[open]').length);
  await p.click('details.nov-ant summary'); await p.waitForTimeout(100);
  t('resumo abre/fecha o <details> por toque (começam todos fechados)', aberto === 0 && (await p.evaluate(() => document.querySelectorAll('details.nov-ant[open]').length)) === 1);
  await p.click('details.nov-ant summary');
  await p.keyboard.press('Tab');   // o teclado também chega aos resumos (nativo do <details>)
  t('a página carrega a fonte Work Sans', await p.evaluate(async () => { await document.fonts.ready; return document.fonts.check('300 18px "Work Sans"'); }));

  // 4) sem rolagem lateral em larguras comuns
  for (const w of [320, 390, 768, 1280]) {
    const o = await b.newContext({ viewport: { width: w, height: 800 } }); const q = await o.newPage(); await q.goto(URL_); await q.waitForTimeout(600);
    const sc = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: Math.round(document.querySelector('h1').getBoundingClientRect().right), h1w: document.querySelector('h1').getBoundingClientRect().width }));
    t('sem rolagem lateral a ' + w + ' px', sc.sw <= sc.cw, JSON.stringify(sc));
    if (w === 320) t('título cabe a 320 px sem cortar "New Game+"', sc.h1 <= sc.cw, JSON.stringify(sc));
    await o.close();
  }

  // 5) tipografia calculada
  const ty = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)); return { h1w: g('h1').fontWeight, h1ls: parseFloat(g('h1').letterSpacing), h1fs: parseFloat(g('h1').fontSize), lede: g('.lede').fontWeight, ledeFs: parseFloat(g('.lede').fontSize), acento: g('.acento').color, ws: g('.acento').whiteSpace }; });
  t('celular: título peso 400, corpo peso 300, corpo 18 px', ty.h1w === '400' && ty.lede === '300' && ty.ledeFs === 18, JSON.stringify(ty));
  t('título com espaçamento negativo (−0,04 em) e "New Game+" em âmbar sem quebra', Math.abs(ty.h1ls / ty.h1fs + 0.04) < 0.002 && ty.acento === 'rgb(255, 184, 41)' && ty.ws === 'nowrap', JSON.stringify(ty));

  // 6) constelação (o Tab acima pode ter rolado a página: volta ao topo para ela estar à vista)
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
  const cv = await p.evaluate(() => { const e = document.getElementById('constelacao'); const r = e.getBoundingClientRect(); return { pronto: e.getAttribute('data-pronto'), w: r.width, h: r.height, aria: e.getAttribute('aria-hidden') }; });
  t('canvas decorativo: aria-hidden, com tamanho e marcado como "animando"', cv.aria === 'true' && cv.w > 200 && cv.h > 200 && cv.pronto === 'animando', JSON.stringify(cv));
  const a1 = await pixels(p); await p.waitForTimeout(700); const a2 = await pixels(p);
  t('constelação desenhou formas (pixels não vazios)', a1.n > 1500, a1.n + ' pixels com cor');
  t('constelação anima (quadros diferentes ao longo do tempo)', a1.soma !== a2.soma, a1.soma + ' -> ' + a2.soma);
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await p.waitForTimeout(500);
  const b1 = await pixels(p); await p.waitForTimeout(600); const b2 = await pixels(p);
  t('fora da tela a animação pausa (quadros iguais)', b1.soma === b2.soma, b1.soma + ' x ' + b2.soma);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  const c1 = await pixels(p); await p.waitForTimeout(600); const c2 = await pixels(p);
  t('ao voltar à tela a animação retoma', c1.soma !== c2.soma);
  t('LCP é texto (h1/p), não a decoração', ['H1', 'P', 'SPAN'].includes((await p.evaluate(() => window.__lcp) || {}).tag), JSON.stringify(await p.evaluate(() => window.__lcp)));
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((x) => x.id + ':' + x.nodes.length)); t('axe (celular, com best-practice): 0 violações', v.length === 0, v.join(',')); }
  await c.close();

  // 7) computador
  ({ c, p } = await abre(b, { w: 1280, h: 800 }));
  const ty2 = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)); return { lede: g('.lede').fontWeight, h1fs: parseFloat(g('h1').fontSize), cols: g('.hero').gridTemplateColumns.split(' ').length, rec: g('.recursos').gridTemplateColumns.split(' ').length, atu: g('.atualizacoes').gridTemplateColumns.split(' ').length, menu: g('.menu').display }; });
  t('computador: corpo em peso 200 (assinatura do design) e título grande', ty2.lede === '200' && ty2.h1fs >= 80, JSON.stringify(ty2));
  t('computador: destaque em 2 colunas, recursos em 2, atualizações em 2, menu visível', ty2.cols === 2 && ty2.rec === 2 && ty2.atu === 2 && ty2.menu === 'flex', JSON.stringify(ty2));
  const h1b = await p.evaluate(() => document.querySelector('h1').getClientRects().length && Math.round(document.querySelector('h1').getBoundingClientRect().height / parseFloat(getComputedStyle(document.querySelector('h1')).lineHeight)));
  t('computador: título em no máximo 3 linhas', h1b <= 3, h1b + ' linhas');
  const cvd = await pixels(p); t('computador: constelação com mais partículas (mais pixels que no celular)', cvd.n > 3000, cvd.n);
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((x) => x.id + ':' + x.nodes.length)); t('axe (computador): 0 violações', v.length === 0, v.join(',')); }
  t('sem erros de JS (computador)', p.errs.length === 0, p.errs.join('|'));
  await c.close();

  // 8) movimento reduzido: um quadro parado, nada de animação
  ({ c, p } = await abre(b, { reduz: true }));
  const r1 = await pixels(p); await p.waitForTimeout(900); const r2 = await pixels(p);
  t('movimento reduzido: constelação desenhada UMA vez e parada', r1.n > 1500 && r1.soma === r2.soma && (await p.getAttribute('#constelacao', 'data-pronto')) === 'parado', JSON.stringify([r1.n, r1.soma === r2.soma]));
  const trans = await p.evaluate(() => getComputedStyle(document.querySelector('.btn')).transitionDuration);
  t('movimento reduzido: botões sem transição', /^0s(, 0s)*$/.test(trans), trans);
  await p.emulateMedia({ reducedMotion: 'no-preference' }); await p.waitForTimeout(900);
  const r3 = await pixels(p); await p.waitForTimeout(600); const r4 = await pixels(p);
  t('desligar movimento reduzido na hora volta a animar', (await p.getAttribute('#constelacao', 'data-pronto')) === 'animando' && r3.soma !== r4.soma);
  await c.close();

  // 8b) funciona sem internet. A hospedagem manda /inicio.html para /inicio (307); a cópia guardada vem "redirecionada" e o navegador a recusa
  //     numa navegação, a menos que o service worker a copie para uma resposta nova (defeito real visto em produção na versão 57).
  for (const visitada of [false, true]) {
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage();
    await q.goto(BASE + '/index.html'); await q.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; }); await q.waitForTimeout(2500);
    if (visitada) { await q.goto(URL_); await q.waitForTimeout(800); t('online: /inicio.html redireciona para /inicio e abre', /\/inicio$/.test(q.url()) && /New Game\+/.test(await q.innerText('h1')), q.url()); }
    await c2.setOffline(true); let off = false, tit = ''; try { await q.goto(URL_, { timeout: 8000 }); tit = await q.innerText('h1'); off = /New Game\+/.test(tit); } catch (e) { tit = String(e.message).slice(0, 120); }
    t('sem internet' + (visitada ? ' (já visitada)' : ' (nunca visitada)') + ': inicio.html abre a partir do cache do service worker', off, tit); await c2.close();
  }

  // 9) pré-cache do service worker e orçamento de tamanho
  const sw = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8');
  t('sw.js guarda inicio.html, inicio.css e inicio.js para funcionar sem internet', ['./inicio.html', './inicio.css', './inicio.js'].every((f) => sw.includes('"' + f + '"')));
  const kb = (f) => fs.statSync(path.join(SITE, f)).size / 1024;
  t('peso: html < 45 KB, css < 12 KB, js < 6 KB (sem comprimir)', kb('inicio.html') < 45 && kb('inicio.css') < 12 && kb('inicio.js') < 6, [kb('inicio.html'), kb('inicio.css'), kb('inicio.js')].map((x) => x.toFixed(1)).join(' / '));
  t('HTML gerado está em dia com ng-nuvem.js (rodar fonte/build.sh não muda nada)', html.includes('>' + NOV[0].titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '<'));

  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
