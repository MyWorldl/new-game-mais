// Tela de entrada estilo launcher: formulário de entrada sempre à vista, link para a página de apresentação (inicio.html) e faixa "Novidade" que leva às atualizações.
// Uso: node login-launcher.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[320, 640], [390, 844], [820, 1000], [1280, 800]]) {
    const L = '[' + w + '] ';
    const c = await b.newContext({ viewport: { width: w, height: h }, colorScheme: 'dark' }); const p = await c.newPage(); const errs = [], csp = [];
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) csp.push(m.text()); });
    await p.route('**/challenges.cloudflare.com/**', r => r.abort());
    await p.route('**/supabase.co/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 }); await p.waitForTimeout(500);
    const v = id => p.evaluate(i => { const e = document.getElementById(i); return !!e && !e.closest('[hidden]') && e.offsetParent !== null; }, id);
    t(L + 'abre direto no formulário de entrada (sem abas)', await v('ng-login-e') && await v('ng-login-ok') && (await p.$$('.ng-lc [role=tab], .ng-lc [role=tablist]')).length === 0);
    t(L + 'um único h1 na tela de entrada', (await p.$$('.ng-lc h1')).length === 1);
    t(L + 'sem rolagem lateral', (await p.evaluate(() => document.querySelector('.ng-lc').scrollWidth - document.querySelector('.ng-lc').clientWidth)) <= 0);
    if (axeSrc) { await p.evaluate(axeSrc); const r = await p.evaluate(async () => (await axe.run('.ng-lc', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t(L + 'axe: tela de entrada sem violações', r.length === 0, r.join(',')); }
    const conh = await p.evaluate(() => { const a = document.querySelector('.ng-lc-conhecer'); return a && { href: a.getAttribute('href'), alt: Math.round(a.getBoundingClientRect().height), txt: a.textContent }; });
    t(L + 'link "Conhecer o NG+" no topo leva à página de apresentação (inicio.html), sem número de versão e com 44 px de altura', !!conh && conh.href === 'inicio.html' && conh.txt === 'Conhecer o NG+' && conh.alt >= 44, JSON.stringify(conh));
    const nov = await p.evaluate(() => { const a = document.querySelector('.ng-lc-novo'); return a && { tag: a.tagName, href: a.getAttribute('href'), txt: a.textContent, alt: Math.round(a.getBoundingClientRect().height) }; });
    t(L + 'faixa "Novidade" é link para inicio.html#atualizacoes e mostra o título mais recente', !!nov && nov.tag === 'A' && nov.href === 'inicio.html#atualizacoes' && /Novidade/.test(nov.txt) && nov.txt.length > 12 && nov.alt >= 44, JSON.stringify(nov));
    t(L + 'não sobrou nenhum código da lista de atualizações dentro do app', (await p.$$('.ng-nov, #ng-nov-mais, #ng-pn-novid')).length === 0);
    // ---- melhorias de leitura e hierarquia (tela de entrada) ----
    const lum = (rgb) => { const n = rgb.match(/[\d.]+/g).map(Number).slice(0, 3).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * n[0] + 0.7152 * n[1] + 0.0722 * n[2]; };
    const razao = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const m = await p.evaluate(() => {
      const cs = (s) => getComputedStyle(document.querySelector(s)), r = (s) => document.querySelector(s).getBoundingClientRect();
      const acc = (() => { const e = document.createElement('i'); e.style.color = 'var(--accent)'; document.body.appendChild(e); const c = getComputedStyle(e).color; e.remove(); return c; })();
      const ped = document.querySelector('#ng-login-pedir'), lg = document.querySelector('.ng-legal'), pol = document.querySelector('#ng-login-pol');
      const inp = document.querySelector('#ng-login-e');
      return {
        acc, kick: cs('.ng-lc-kick').color, novoB: cs('.ng-lc-novo').borderTopColor, seta: cs('.ng-lc-seta').color, fi: cs('.ng-lc-fi').color,
        top: { pos: cs('.ng-lc-top').position, bg: cs('.ng-lc-top').backgroundColor, sh: cs('.ng-lc-top').boxShadow },
        pedTag: ped.tagName, pedCls: ped.className, pedH: Math.round(ped.getBoundingClientRect().height), pedW: Math.round(ped.getBoundingClientRect().width), boxW: Math.round(r('.ng-pedir-aviso').width),
        legH: Math.round(lg.getBoundingClientRect().height), polH: Math.round(pol.getBoundingClientRect().height), legFs: parseFloat(getComputedStyle(lg).fontSize), polDisp: getComputedStyle(pol).display,
        ph: inp.getAttribute('placeholder'), phColor: getComputedStyle(inp, '::placeholder').color, inBg: getComputedStyle(inp).backgroundColor,
        h1f: cs('.ng-lc h1').fontFamily, hf: cs('.ng-lc-titulo').fontFamily, h1w: cs('.ng-lc h1').fontWeight,
        heroTop: Math.round(r('.ng-lc-hero').top), boxTop: Math.round(r('.ng-login-box').top),
        kickBg: getComputedStyle(document.querySelector('.ng-login-box')).backgroundColor, lblColor: cs('.ng-lc label').color,
        mark: cs('.ng-lc-mark').backgroundColor, btn: cs('#ng-login-ok').backgroundColor, em: cs('.ng-lc-titulo em').color
      };
    });
    t(L + 'limão só onde importa: eyebrow, borda da faixa Novidade, seta e ícones não usam a cor de destaque', [m.kick, m.novoB, m.seta, m.fi].every((c) => c !== m.acc), JSON.stringify([m.kick, m.novoB, m.seta, m.fi, m.acc]));
    t(L + 'o destaque forte continua no logo, no "New Game+" do título e no botão de entrar', m.mark === m.acc && m.btn === m.acc, JSON.stringify([m.mark, m.btn, m.acc]));
    t(L + 'cabeçalho sem faixa sólida: não gruda, fundo transparente e sem sombra de preenchimento', m.top.pos !== 'sticky' && /rgba\(0, 0, 0, 0\)|transparent/.test(m.top.bg) && m.top.sh === 'none', JSON.stringify(m.top));
    t(L + '"Pedir acesso" é um botão secundário (contorno) de largura total, com 44 px de altura', m.pedTag === 'BUTTON' && /ghost/.test(m.pedCls) && m.pedH >= 44 && Math.abs(m.pedW - m.boxW) <= 2, JSON.stringify([m.pedTag, m.pedCls, m.pedH, m.pedW, m.boxW]));
    t(L + 'texto da política: link dentro da frase e entrelinha firme (no máximo 3 linhas de 13 px × 1,6)', /^inline/.test(m.polDisp) && m.polH <= 24 && m.legH <= Math.ceil(m.legFs * 1.6 * 3) + 2, JSON.stringify([m.polDisp, m.polH, m.legH, m.legFs]));
    t(L + 'campo de e-mail mostra um exemplo (placeholder) com contraste de pelo menos 4,5:1', m.ph === 'voce@email.com' && razao(m.phColor, m.inBg) >= 4.5, JSON.stringify([m.ph, m.phColor, m.inBg, razao(m.phColor, m.inBg).toFixed(2)]));
    t(L + 'rótulo "E-mail" com contraste de pelo menos 4,5:1 sobre o cartão', razao(m.lblColor, m.kickBg) >= 4.5, JSON.stringify([m.lblColor, m.kickBg, razao(m.lblColor, m.kickBg).toFixed(2)]));
    t(L + 'o título do cartão usa a mesma família de letra e peso forte, como o título da página', m.h1f === m.hf && Number(m.h1w) >= 700, JSON.stringify([m.h1f, m.hf, m.h1w]));
    if (w >= 1000) t(L + 'herói e cartão começam na mesma linha do topo', Math.abs(m.heroTop - m.boxTop) <= 2, m.heroTop + ' x ' + m.boxTop);
    const alvo = await Promise.all([p.waitForURL(/\/inicio(\.html)?#atualizacoes/, { timeout: 8000 }).then(() => true, () => false), p.click('.ng-lc-novo')]);
    await p.waitForSelector('#atualizacoes', { timeout: 8000 }).catch(() => {});
    t(L + 'tocar na faixa abre a página de apresentação já nas atualizações', alvo[0] && (await p.locator('.nov-atual').count()) === 1 && /Mais recente/i.test(await p.innerText('.nov-meta')), p.url());
    t(L + 'a página de apresentação tem "Entrar" que volta ao app', (await p.getAttribute('.topo .btn', 'href')) === './');
    await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 }); await p.waitForTimeout(300);
    // o fluxo de pedir acesso continua na própria tela de entrada
    await p.click('#ng-login-pedir'); await p.waitForTimeout(300);
    t(L + 'Pedir acesso abre o formulário e troca o título', await v('ng-ped-n') && /Pedir acesso/.test(await p.textContent('#ng-login-t')));
    t(L + 'sem erros de JS nem violação de CSP', errs.length === 0 && csp.length === 0, errs.concat(csp).join('|'));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
