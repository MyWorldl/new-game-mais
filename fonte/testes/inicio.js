// Página de apresentação (antes do login): site/inicio.html. Uso: node inicio.js http://localhost:8791
// Confere: carrega sem erro nem violação de CSP, sem rolagem lateral, botões levam ao app, lista de atualizações vem de NOVIDADES,
// acessibilidade (axe), constelação (canvas) desenha, anima e fica parada com movimento reduzido, tipografia e LCP.
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8791';
const URL_ = BASE + '/inicio.html';
const SITE = path.resolve(__dirname, '../../site');
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 260) : '')); };

// a lista completa (fonte única: fonte/inicio/novidades.json); o app só carrega a versão mais recente, gravada em ng-nuvem.js pelo gerador
const NOV = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'inicio', 'novidades.json'), 'utf8'));
const nuvem = fs.readFileSync(path.join(SITE, 'ng-nuvem.js'), 'utf8');

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
  t('"Entrar" (topo, destaque, chamada final e rodapé) leva ao app em "./"', entrar.length === 4 && entrar.every((h) => h[0] === './'), JSON.stringify(entrar));
  t('âncoras internas existem (#recursos, #como-comecar, #atualizacoes, #conteudo)', ['recursos', 'como-comecar', 'atualizacoes', 'conteudo'].every((id) => hrefs.some((h) => h[0] === '#' + id) && p.locator('#' + id).count()));
  const dest = [...new Set(hrefs.map((h) => h[0]).filter((h) => !h.startsWith('#')))];
  const resp = {}; for (const h of dest) { const u = new URL(h, URL_).href; const r = await c.request.get(u); resp[h] = r.status(); }
  t('todo destino de link responde 200 (app, instalar.html, inicio.html)', Object.values(resp).every((s) => s === 200), JSON.stringify(resp));
  const alturas = await p.evaluate(() => [...document.querySelectorAll('a.btn, a.fantasma, .novo-link, .rodape-links a, .marca, summary')].filter((e) => e.checkVisibility()).map((e) => Math.round(e.getBoundingClientRect().height)));
  t('alvos de toque visíveis (botões, links do rodapé, resumos) com pelo menos 44 px de altura', alturas.length >= 10 && alturas.every((a) => a >= 44), alturas.join(','));

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
  t('textos de NOVIDADES entram escapados (nenhum "<" solto no HTML gerado)', !/<(?!\/?(?:a|article|button|canvas|details|div|footer|h[1-3]|head|header|html|body|li|link|main|meta|nav|ol|p|script|section|span|summary|svg|path|title|ul|!)\b)/i.test(html.replace(/<!doctype html>/i, '')));
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
  t('celular: título peso 600 (firme), corpo peso 300, corpo 18 px', ty.h1w === '600' && ty.lede === '300' && ty.ledeFs === 18, JSON.stringify(ty));
  t('título com espaçamento negativo (−0,035 em) e "New Game+" em verde-limão sem quebra', Math.abs(ty.h1ls / ty.h1fs + 0.035) < 0.002 && ty.acento === 'rgb(163, 230, 53)' && ty.ws === 'nowrap', JSON.stringify(ty));
  const pesos = await p.evaluate(() => { const w = (s) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e).fontWeight); return { h2: w('h2'), h3: w('.cartao h3, .passo h3, .nov-atual h3') }; });
  t('títulos das seções e dos cartões em peso 600 (nada de 300/400 fino em título)', [...pesos.h2, ...pesos.h3].length >= 8 && [...pesos.h2, ...pesos.h3].every((x) => x === '600'), JSON.stringify(pesos));

  // 5b) paleta e estrutura: verde-limão + preto do app, nada de violeta/âmbar/verde-água, seções separadas e alinhadas
  const css = fs.readFileSync(path.join(SITE, 'inicio.css'), 'utf8'), js = fs.readFileSync(path.join(SITE, 'inicio.js'), 'utf8');
  const antigas = ['#8052ff', '#6a3fe0', '#ffb829', '#15846e', '#1fb596', '#d65cff', '#4f8cff'].filter((c) => (css + js + html).toLowerCase().includes(c));
  t('paleta: sem as cores antigas (violeta, âmbar, verde-água, rosa, azul) em CSS, JS e HTML', antigas.length === 0, antigas.join(','));
  t('paleta: o limão é o do app (#a3e635) e o fundo é o grafite do app (#06080a)', /--lime:\s*#a3e635/i.test(css) && /--void:\s*#06080a/i.test(css));
  const lum = (rgb) => { const [r, g, b] = rgb.match(/\d+/g).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const cores = await p.evaluate(() => { const g = (s, k) => getComputedStyle(document.querySelector(s))[k]; return { btnBg: g('.btn', 'backgroundColor'), btnFg: g('.btn', 'color'), kick: g('.hero .kick', 'color'), fundo: g('body', 'backgroundColor'), corpo: g('.cartao .corpo', 'color'), cartao: g('.cartao', 'backgroundColor') }; });
  t('o botão principal é limão com texto escuro (contraste ≥ 7:1)', cores.btnBg === 'rgb(163, 230, 53)' && razao(cores.btnBg, cores.btnFg) >= 7, JSON.stringify(cores) + ' ' + razao(cores.btnBg, cores.btnFg).toFixed(1));
  t('rótulos neutros (não limão) com contraste ≥ 7:1 sobre o fundo e texto de apoio nos cartões ≥ 7:1', cores.kick !== 'rgb(163, 230, 53)' && razao(cores.kick, cores.fundo) >= 7 && razao(cores.corpo, cores.cartao) >= 7, razao(cores.kick, cores.fundo).toFixed(1) + ' / ' + razao(cores.corpo, cores.cartao).toFixed(1));
  const est = await p.evaluate(() => {
    const secs = [...document.querySelectorAll('main section.sec')];
    return {
      n: secs.length, ids: secs.map((s) => s.id || s.className),
      h2: secs.every((s) => s.querySelector('h2')),
      linhas: secs.every((s) => parseFloat(getComputedStyle(s).borderTopWidth) === 1),
      folga: secs.every((s) => parseFloat(getComputedStyle(s).paddingTop) >= 40 && parseFloat(getComputedStyle(s).paddingBottom) >= 40),
      cartoes: document.querySelectorAll('.cartoes > .cartao').length, passos: document.querySelectorAll('ol.passos > li.passo').length,
      cartaoH3: [...document.querySelectorAll('.cartao')].every((c) => c.querySelector('h3') && c.querySelector('.corpo')),
      todosH: document.querySelectorAll('h1').length === 1 && [...document.querySelectorAll('h3')].every((h) => h.closest('section')),
      marcadores: getComputedStyle(document.querySelector('ol.passos')).listStyleType, padE: getComputedStyle(document.querySelector('ol.passos')).paddingLeft,
    };
  });
  t('estrutura: 4 seções separadas (recursos, como começar, chamada, atualizações), cada uma com h2, linha de topo e folga ≥ 40 px', est.n === 4 && est.h2 && est.linhas && est.folga, JSON.stringify(est));
  t('4 cartões de recursos (rótulo, título h3 e texto) e 3 passos numerados, sem marcadores soltos da lista', est.cartoes === 4 && est.passos === 3 && est.cartaoH3 && est.todosH && est.marcadores === 'none' && est.padE === '0px', JSON.stringify(est));
  const caixas = await p.evaluate(() => [...document.querySelectorAll('.cartao, .passo, .nov-atual, .chamada-caixa')].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.right)]; }));
  t('estrutura (celular): cartões, passos e chamada ocupam a mesma coluna, alinhados à mesma margem', new Set(caixas.map((c) => c[0])).size === 1 && new Set(caixas.map((c) => c[1])).size === 1, JSON.stringify(caixas.slice(0, 4)));

  // 5c) reforma de novembro/2026 (ng-modular-66): limão contido, ícones nos cartões, "Pedir acesso", lista de versões recolhida, política no rodapé
  const lim = 'rgb(163, 230, 53)';
  const lm = await p.evaluate(() => { const c = (s, k) => [...document.querySelectorAll(s)].map((e) => getComputedStyle(e)[k]); return { kick: c('.kick', 'color'), ic: c('.cartao-ic', 'color'), passoBg: c('.passo-n', 'backgroundColor'), passoFg: c('.passo-n', 'color'), sv: c('.nov-sv', 'color'), novoT: c('.novo-t', 'color'), selo: c('.nov-selo', 'color') }; });
  t('limão contido: rótulos, ícones dos cartões, círculos dos passos, "Versão N", "Novidade" e "Mais recente" são neutros', Object.values(lm).every((l) => l.length && l.every((x) => x !== lim)), JSON.stringify(lm).slice(0, 200));
  const ic4 = await p.evaluate(() => [...document.querySelectorAll('.cartao')].map((c) => { const i = c.querySelector('.cartao-ic'); const s = i && i.querySelector('svg path'); return !!s && s.getAttribute('d').length > 20 && i.getAttribute('aria-hidden') === 'true' && i.getBoundingClientRect().width >= 40; }));
  t('os 4 cartões de recursos têm ícone (decorativo, aria-hidden) no lugar dos números 01–04', ic4.length === 4 && ic4.every(Boolean) && (await p.locator('.cartao-n').count()) === 0, JSON.stringify(ic4));
  const pedir = await p.evaluate(() => ({ btn: (document.querySelector('.passo-btn') || {}).getAttribute && document.querySelector('.passo-btn').getAttribute('href'), txt: (document.querySelector('.passo-btn') || {}).textContent, nota: (document.querySelector('.nota a') || {}).getAttribute && document.querySelector('.nota a').getAttribute('href'), h: Math.round((document.querySelector('.passo-btn') || { getBoundingClientRect: () => ({ height: 0 }) }).getBoundingClientRect().height) }));
  t('"Pedir acesso": botão no passo 1 e link na nota do destaque levam a "./#pedir-acesso" (abre o formulário na tela de entrada)', pedir.btn === './#pedir-acesso' && pedir.nota === './#pedir-acesso' && /Pedir acesso/.test(pedir.txt) && pedir.h >= 44, JSON.stringify(pedir));
  const vs = await p.evaluate(() => ({ fora: document.querySelectorAll('.nov-anteriores > details.nov-ant').length, todas: document.querySelectorAll('details.nov-todas').length, aberta: document.querySelector('details.nov-todas').open, rot: (document.querySelector('details.nov-todas > summary') || {}).textContent, dentro: document.querySelectorAll('details.nov-todas details.nov-ant').length, visiveis: [...document.querySelectorAll('details.nov-ant')].filter((e) => e.checkVisibility()).length }));
  t('lista de atualizações: 5 versões anteriores à vista e o resto atrás de "Ver as outras N versões" (fechado)', vs.fora === 5 && vs.todas === 1 && !vs.aberta && vs.rot === 'Ver as outras ' + (NOV.length - 6) + ' versões' && vs.dentro === NOV.length - 6 && vs.visiveis === 5, JSON.stringify(vs));
  await p.click('details.nov-todas > summary'); await p.waitForTimeout(100);
  const vs2 = await p.evaluate(() => [...document.querySelectorAll('details.nov-ant')].filter((e) => e.checkVisibility()).length);
  t('"Ver as outras" abre e mostra todas as versões anteriores', vs2 === NOV.length - 1, vs2 + ' x ' + (NOV.length - 1));
  await p.click('details.nov-todas > summary');
  const rod = await p.evaluate(() => [...document.querySelectorAll('.rodape-links a')].map((a) => [a.getAttribute('href'), a.textContent.trim()]));
  t('rodapé tem "Política de privacidade" levando a politica.html', rod.some((r) => r[0] === 'politica.html' && r[1] === 'Política de privacidade'), JSON.stringify(rod));

  // 6) constelação (o Tab acima pode ter rolado a página: volta ao topo para ela estar à vista)
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
  const cv = await p.evaluate(() => { const e = document.getElementById('constelacao'); const r = e.getBoundingClientRect(); return { pronto: e.getAttribute('data-pronto'), w: r.width, h: r.height, aria: e.getAttribute('aria-hidden') }; });
  t('canvas decorativo: aria-hidden, com tamanho e marcado como "animando"', cv.aria === 'true' && cv.w > 200 && cv.h > 200 && cv.pronto === 'animando', JSON.stringify(cv));
  const a1 = await pixels(p); await p.waitForTimeout(700); const a2 = await pixels(p);
  t('constelação desenhou formas (pixels não vazios)', a1.n > 1500, a1.n + ' pixels com cor');
  const matiz = await p.evaluate(() => { const cv = document.getElementById('constelacao'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let n = 0, ruim = 0; for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 40) { n++; if (!(d[i + 1] >= d[i] && d[i + 1] >= d[i + 2])) ruim++; } return { n, ruim }; });
  t('constelação só em tons de limão/cinza-esverdeado (nenhum pixel com violeta, rosa, azul ou âmbar)', matiz.n > 500 && matiz.ruim / matiz.n < 0.02, JSON.stringify(matiz));
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
  const ty2 = await p.evaluate(() => { const g = (s) => getComputedStyle(document.querySelector(s)); return { lede: g('.lede').fontWeight, h1fs: parseFloat(g('h1').fontSize), cols: g('.hero').gridTemplateColumns.split(' ').length, rec: g('.cartoes').gridTemplateColumns.split(' ').length, pas: g('.passos').gridTemplateColumns.split(' ').length, atu: g('.atualizacoes').gridTemplateColumns.split(' ').length, menu: g('.menu').display }; });
  t('computador: corpo em peso 300 e título grande', ty2.lede === '300' && ty2.h1fs >= 80, JSON.stringify(ty2));
  t('computador: destaque em 2 colunas, 4 cartões de recursos, 3 passos, atualizações em 2, menu visível', ty2.cols === 2 && ty2.rec === 4 && ty2.pas === 3 && ty2.atu === 2 && ty2.menu === 'flex', JSON.stringify(ty2));
  const h1b = await p.evaluate(() => document.querySelector('h1').getClientRects().length && Math.round(document.querySelector('h1').getBoundingClientRect().height / parseFloat(getComputedStyle(document.querySelector('h1')).lineHeight)));
  t('computador: título em no máximo 3 linhas', h1b <= 3, h1b + ' linhas');
  const compacto = await p.evaluate(() => ({ pad: [...document.querySelectorAll('main section.sec')].map((s) => parseFloat(getComputedStyle(s).paddingTop)), h: [...document.querySelectorAll('.cartao')].map((c) => Math.round(c.getBoundingClientRect().height)), hp: [...document.querySelectorAll('.passo')].map((c) => Math.round(c.getBoundingClientRect().height)) }));
  t('computador: espaço entre seções enxuto (≤ 60 px em cima e embaixo de cada seção)', compacto.pad.every((x) => x >= 40 && x <= 60), JSON.stringify(compacto.pad));
  t('computador: cartões de recursos e passos com alturas iguais na mesma linha', new Set(compacto.h).size === 1 && new Set(compacto.hp).size === 1, JSON.stringify(compacto));
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
  // fonte única das novidades: a linha da tela de entrada (ng-nuvem.js) é a versão mais recente do JSON e o app não baixa a lista inteira
  const marca = (nuvem.match(/\/\*NOV\*\/([\s\S]*?)\/\*FIM\*\//) || [])[1] || '';
  const noApp = new Function('return ' + marca)();
  t('ng-nuvem.js tem só a versão mais recente (v e título iguais ao topo de novidades.json)', noApp.v === NOV[0].v && noApp.titulo === NOV[0].titulo, marca.slice(0, 120));
  t('ng-nuvem.js não carrega a lista completa (nenhum "itens:" nem versão antiga)', !/itens\s*:/.test(nuvem) && !nuvem.includes(NOV[NOV.length - 1].titulo));
  const versaoSw = (fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8').match(/VERSAO = "([^"]+)"/) || [])[1];
  t('versão mais recente das novidades = VERSAO do sw.js (publicar versão sem novidade, ou o contrário, é erro)', NOV[0].v === versaoSw, NOV[0].v + ' x ' + versaoSw);
  t('novidades.json: versões sem repetição e tipos válidos', new Set(NOV.map((n) => n.v)).size === NOV.length && NOV.every((n) => n.itens.every((i) => ['novo', 'melhoria', 'correcao'].includes(i.t) && i.x)));
  t('sw.js guarda inicio.html, inicio.css e inicio.js para funcionar sem internet', ['./inicio.html', './inicio.css', './inicio.js'].every((f) => sw.includes('"' + f + '"')));
  const kb = (f) => fs.statSync(path.join(SITE, f)).size / 1024;
  t('peso: html < 45 KB, css < 16 KB, js < 6 KB (sem comprimir)', kb('inicio.html') < 45 && kb('inicio.css') < 16 && kb('inicio.js') < 6, [kb('inicio.html'), kb('inicio.css'), kb('inicio.js')].map((x) => x.toFixed(1)).join(' / '));
  t('HTML gerado está em dia com novidades.json (rodar fonte/build.sh não muda nada)', html.includes('>' + NOV[0].titulo.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '<'));

  // 10) ícone novo (triângulo) em todos os lugares + página de política igual ao texto do app
  const sw0 = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8');
  t('sw.js guarda politica.html e icon.svg para funcionar sem internet', sw0.includes('"./politica.html"') && sw0.includes('"./icon.svg"'));
  const svg = fs.readFileSync(path.join(SITE, 'icon.svg'), 'utf8');
  t('icon.svg: triângulo (mesmo caminho da marca) em limão #a3e635 sobre #06080a, sem raio antigo', /M12 3 21 20H3z/.test(svg) && /#a3e635/i.test(svg) && /#06080a/i.test(svg) && !/#0b1220/i.test(svg), svg.slice(0, 120));
  const man = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.webmanifest'), 'utf8'));
  t('manifesto: cores #06080a (as do app) e ícones 192 e 512 (any e maskable)', man.theme_color === '#06080a' && man.background_color === '#06080a' && ['192x192', '512x512'].every((s) => ['any', 'maskable'].every((pp) => man.icons.some((i) => i.sizes === s && i.purpose === pp))), JSON.stringify([man.theme_color, man.background_color]));
  for (const pg of ['index.html', 'inicio.html', 'instalar.html', 'politica.html']) {
    const h = fs.readFileSync(path.join(SITE, pg), 'utf8');
    t('ícone da aba em ' + pg + ': SVG (triângulo) com PNG de reserva e apple-touch-icon', /<link rel="icon"[^>]*href="icon\.svg"[^>]*type="image\/svg\+xml"|<link rel="icon"[^>]*type="image\/svg\+xml"[^>]*href="icon\.svg"/.test(h) && /rel="icon"[^>]*icon-192\.png/.test(h) && /rel="apple-touch-icon"/.test(h));
  }
  { const c = await b.newContext({ viewport: { width: 400, height: 400 } }); const q = await c.newPage(); await q.goto(BASE + '/inicio.html');
    const lista = [['icon-192.png', 192, 192, true], ['icon-512.png', 512, 512, true], ['apple-touch-icon.png', 180, 180, true]].concat(fs.readdirSync(path.join(SITE, 'splash')).map((f) => { const m = f.match(/ios-(\d+)x(\d+)\.png/); return ['splash/' + f, +m[1], +m[2], false]; }));
    const out = await q.evaluate(async (lista) => {
      const res = [];
      for (const [f, w, h, quadrado] of lista) {
        const blob = await (await fetch('/' + f)).blob(); const bm = await createImageBitmap(blob); const cv = document.createElement('canvas'); cv.width = bm.width; cv.height = bm.height;
        const x = cv.getContext('2d'); x.drawImage(bm, 0, 0); const d = x.getImageData(0, 0, bm.width, bm.height).data;
        let n = 0, sx = 0, sy = 0, minx = 1e9, maxx = -1, maxr = 0, ruim = 0; const cx = bm.width / 2, cy = bm.height / 2;
        for (let i = 0, k = 0; i < d.length; i += 4, k++) { const px = k % bm.width, py = (k / bm.width) | 0; const lim = d[i] > 120 && d[i + 1] > 180 && d[i + 2] < 120; if (lim) { n++; sx += px; sy += py; minx = Math.min(minx, px); maxx = Math.max(maxx, px); maxr = Math.max(maxr, Math.hypot(px - cx, py - cy)); } else if (Math.abs(d[i] - 6) + Math.abs(d[i + 1] - 8) + Math.abs(d[i + 2] - 10) > 60 && !(d[i] > 60)) ruim++; }
        res.push({ f, w: bm.width, h: bm.height, okTam: bm.width === w && bm.height === h, fundo: [d[0], d[1], d[2]].join(','), n, mx: n ? sx / n / bm.width : 0, my: n ? sy / n / bm.height : 0, larg: (maxx - minx) / bm.width, rmax: maxr / Math.min(bm.width, bm.height), quadrado });
      }
      return res;
    }, lista);
    t('ícones PNG (app 192/512, iPhone 180 e 12 telas de abertura): tamanho certo, fundo #06080a e triângulo limão no centro', out.length === 15 && out.every((o) => o.okTam && o.fundo === '6,8,10' && o.n > 60 && Math.abs(o.mx - 0.5) < 0.03 && Math.abs(o.my - 0.5) < 0.06), JSON.stringify(out.filter((o) => !(o.okTam && o.fundo === '6,8,10' && o.n > 60 && Math.abs(o.mx - 0.5) < 0.03 && Math.abs(o.my - 0.5) < 0.06))));
    t('ícones do app dentro da área segura "maskable" (raio ≤ 40 % do lado), para o recorte redondo não cortar o triângulo', out.filter((o) => o.quadrado).every((o) => o.rmax <= 0.4), JSON.stringify(out.filter((o) => o.quadrado).map((o) => [o.f, o.rmax.toFixed(3)])));
    t('telas de abertura: triângulo com cerca de 20 % da largura da tela (entre 15 % e 25 %)', out.filter((o) => !o.quadrado).every((o) => o.larg > 0.15 && o.larg < 0.25), JSON.stringify(out.filter((o) => !o.quadrado).map((o) => o.larg.toFixed(3))));
    await c.close(); }
  { // página de política: estrutura e igualdade com o texto que o app mostra na tela de entrada
    const pol = fs.readFileSync(path.join(SITE, 'politica.html'), 'utf8');
    t('politica.html: sem <script>/<style>/style="" (CSP), lang pt-BR, um h1 e seções em h2', !/<style[\s>]/i.test(pol) && !/<script/i.test(pol) && !/\sstyle=/i.test(pol) && /<html lang="pt-BR">/.test(pol) && (pol.match(/<h1>/g) || []).length === 1 && (pol.match(/<h2>/g) || []).length >= 10);
    const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c.newPage(); const erros = []; q.on('pageerror', (e) => erros.push(e.message)); q.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') erros.push(m.text()); });
    await q.goto(BASE + '/politica.html'); await q.waitForTimeout(500);
    const sc = await q.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, h1: document.querySelectorAll('h1').length, texto: document.querySelector('main').textContent.replace(/\s+/g, '') }));
    t('politica.html abre sem erro, sem rolagem lateral no celular e com a fonte da página', erros.length === 0 && sc.sw <= sc.cw && sc.h1 === 1, erros.join('|') + ' ' + JSON.stringify([sc.sw, sc.cw]));
    if (axeSrc) { await q.evaluate(axeSrc); const v = await q.evaluate(async () => (await axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa', 'best-practice'] })).violations.map((x) => x.id + ':' + x.nodes.length)); t('axe (política, celular): 0 violações', v.length === 0, v.join(',')); }
    await c.close();
    const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const a = await c2.newPage();
    await a.route('**/challenges.cloudflare.com/**', (r) => r.abort()); await a.route('**/supabase.co/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await a.goto(BASE + '/index.html'); await a.waitForSelector('#ng-login-pol'); await a.click('#ng-login-pol'); await a.waitForSelector('.ng-dlg-box');
    const doApp = await a.evaluate(() => { const bx = document.querySelector('.ng-dlg-box').cloneNode(true); const ac = bx.querySelector('.ng-dlg-act'); if (ac) ac.remove(); return bx.textContent.replace(/\s+/g, ''); });
    t('a política do site é IGUAL à do app (mesmas palavras, na mesma ordem): quem mudar um lado tem de mudar o outro', sc.texto === doApp && doApp.length > 3000, sc.texto.length + ' x ' + doApp.length + (sc.texto === doApp ? '' : ' primeira diferença em ' + [...sc.texto].findIndex((ch, i) => ch !== doApp[i]) + ': ' + sc.texto.slice(0, 0)));
    await c2.close(); }

  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
