// Movimento dos controles de uso frequente: sem overshoot (bounce) no repouso, spring só nas comemorações, movimento reduzido respeitado.
// Uso: node movimento-toque.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const ABAS = ['painel', 'treino', 'dieta', 'corpo', 'perfil', 'config'];
const irAba = async (p, a) => { await p.evaluate(a => document.getElementById('tab-' + a).click(), a); await p.waitForTimeout(700); };
// controles tocados com frequência: nenhum pode ter curva com overshoot (y > 1 ou y < 0) em propriedade que anima
const SEL = '.btn, .tab-btn, .biblio-ex-chip, .metric-tab, .seg button, .qc-swap, .cdp-chip, .chip-btn, .carga-row, .bottomnav .more-btn, .btn svg, .bottomnav .tab-btn svg, .bottomnav .more-btn svg';
const varre = (sel) => {
  const ruins = []; let n = 0;
  document.querySelectorAll(sel).forEach(x => {
    const r = x.getBoundingClientRect(); if (!r.width || !r.height) return; n++;
    const cs = getComputedStyle(x);
    const durs = cs.transitionDuration.split(',').map(s => parseFloat(s) * (s.includes('ms') ? 1 : 1000));
    const fns = cs.transitionTimingFunction.match(/cubic-bezier\([^)]+\)|ease-in-out|ease-in|ease-out|ease|linear/g) || [];
    fns.forEach((f, i) => {
      const m = f.match(/cubic-bezier\(([^)]+)\)/); if (!m) return;
      const y = m[1].split(',').map(Number); const d = durs[i % durs.length];
      if (d > 1 && (y[1] > 1 || y[3] > 1 || y[1] < 0 || y[3] < 0)) ruins.push((x.className.baseVal !== undefined ? x.tagName : x.tagName.toLowerCase() + '.' + String(x.className).split(' ').slice(0, 2).join('.')) + ' ' + f);
    });
  });
  return { n, ruins: [...new Set(ruins)].slice(0, 6) };
};
(async () => {
  const b = await chromium.launch();
  // 1) 6 abas: nenhum controle de uso frequente com overshoot
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    let total = 0; const ruins = [];
    for (const a of ABAS) { await irAba(p, a); const r = await p.evaluate(varre, SEL); total += r.n; r.ruins.forEach(x => ruins.push(a + ': ' + x)); }
    t('6 abas: nenhum botão, aba, chip ou ícone de uso frequente com overshoot (' + total + ' controles medidos)', ruins.length === 0 && total > 40, ruins.join(' | '));
    // folha de registro do treino ao vivo
    await irAba(p, 'treino');
    await p.evaluate(() => { const bt = document.querySelector('[data-qtoggle]'); bt && bt.click(); }); await p.waitForTimeout(900);
    const f = await p.evaluate(varre, '.qc-panel button, .qc-panel .btn');
    if (f.n === 0 && new Date().getDay() === 0) console.log('SKIP folha de registro: domingo sem treino no seed'); else t('folha de registro: controles sem overshoot', f.n > 5 && f.ruins.length === 0, f.n + ' medidos; ' + f.ruins.join(' | '));
    await c.close();
  }
  // 2) o spring continua onde comemora: amostras de tema mantêm o overshoot (decisão: bounce só em celebração/entrada em cena)
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    await irAba(p, 'config');
    const sw = await p.evaluate(() => { const e = document.querySelector('.skin-swatch'); return e ? getComputedStyle(e).transitionTimingFunction : ''; });
    t('amostras de tema mantêm o spring (identidade de jogo)', /1\.56/.test(sw), sw);
    await c.close();
  }
  // 3) movimento reduzido: esses controles ficam sem transição
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1500);
    await irAba(p, 'config');
    const r = await p.evaluate(sel => { let n = 0, longas = []; document.querySelectorAll(sel).forEach(x => { const r = x.getBoundingClientRect(); if (!r.width) return; n++; const cs = getComputedStyle(x); cs.transitionDuration.split(',').forEach(s => { const ms = parseFloat(s) * (s.includes('ms') ? 1 : 1000); if (ms > 1) longas.push(x.className + ' ' + s); }); }); return { n, longas: longas.slice(0, 4) }; }, SEL);
    t('movimento reduzido: controles sem transição (' + r.n + ' medidos)', r.n > 3 && r.longas.length === 0, r.longas.join(' | '));
    await c.close();
  }
  // 4) foco por teclado na trilha da semana: o anel fica no círculo (o nó em si tem outline:none de propósito)
  {
    const { c, p } = await abre(b, 390, 'dark', false);
    await irAba(p, 'treino'); await p.keyboard.press('Tab');
    const r = await p.evaluate(() => { const n = document.querySelector('.week-trail-node'); n.focus(); const cs = getComputedStyle(n.querySelector('.week-trail-circle')); return { fv: n.matches(':focus-visible'), w: parseFloat(cs.outlineWidth), s: cs.outlineStyle }; });
    t('trilha da semana: anel de foco visível no círculo', r.fv && r.w >= 2 && r.s !== 'none', JSON.stringify(r));
    await c.close();
  }

  // 5) barras que o JS atualiza animam por transform (não por width) e a escala bate com a fração gravada em --p
  {
    const { c, p } = await abre(b, 390, 'dark');
    const ler = () => {
      const alvos = [['#nivel-xp-fill', '.nivel-xp-track'], ['#nivel-mini-fill', '.nivel-xp-track'], ['#streak-milestone-fill', '.streak-milestone-track'], ['#wk-bar-w', '.wk-bar'], ['#wk-bar-m', '.wk-bar'], ['.hm-bar i', '.hm-bar']];
      return alvos.map(([s, ts]) => {
        const e = document.querySelector(s); if (!e) return { s, ausente: true };
        const tr = e.closest(ts), cs = getComputedStyle(e), p = parseFloat(e.style.getPropertyValue('--p'));
        const r = e.getBoundingClientRect(), tw = tr.getBoundingClientRect().width;
        return { s, vis: r.width > 0 || p === 0 || tw === 0, prop: cs.transitionProperty, p, razao: tw ? r.width / tw : 0, w: cs.width, tw };
      });
    };
    let lidos = [];
    for (const a of ['painel', 'perfil']) { await irAba(p, a); await p.waitForTimeout(1000); (await p.evaluate(ler)).filter(x => !x.ausente && x.tw > 0).forEach(x => { if (!lidos.some(y => y.s === x.s)) lidos.push(x); }); }
    const naoTransform = lidos.filter(x => x.prop !== 'transform');
    t('barras animadas: transição só em transform (' + lidos.length + ' encontradas)', lidos.length >= 3 && naoTransform.length === 0, JSON.stringify(naoTransform));
    const desvio = lidos.filter(x => !isNaN(x.p) && Math.abs(x.razao - x.p) > 0.03);
    t('barras animadas: largura visível = fração gravada em --p', desvio.length === 0, JSON.stringify(desvio));
    await c.close();
  }
  // 6) pulso e chama: no máximo 2 ciclos (WCAG 2.2.2: movimento automático com mais de 5 s precisa poder parar)
  {
    const { c, p } = await abre(b, 390, 'dark');
    const r = await p.evaluate(() => {
      const mk = cls => { const d = document.createElement('div'); d.className = cls; document.body.appendChild(d); const cs = getComputedStyle(d); const o = { it: cs.animationIterationCount, du: cs.animationDuration }; d.remove(); return o; };
      return { risco: mk('streak-card at-risk'), chama: mk('flame hot'), dourada: mk('flame hot perfect') };
    });
    const total = o => o.it.split(',').map((x, i) => parseFloat(x) * parseFloat(o.du.split(',')[i % o.du.split(',').length])).reduce((a, b) => Math.max(a, b), 0);
    t('pulso do streak em risco e chama: finitos e com no máximo 5 s de movimento', [r.risco, r.chama, r.dourada].every(o => !/infinite/.test(o.it) && total(o) <= 5), JSON.stringify(r));
    await c.close();
  }
  // 7) trilha da semana: sem rolagem lateral escondida e com folga para o anel de foco (3 px + 3 px de afastamento) nos dois extremos
  for (const w of [360, 390, 768, 1280]) {
    const { c, p } = await abre(b, w, 'dark');
    await irAba(p, 'treino'); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const wrap = document.querySelector('.week-trail-wrap'), wr = wrap.getBoundingClientRect();
      const folga = [...document.querySelectorAll('.week-trail-node')].map(n => { const ci = n.querySelector('.week-trail-circle').getBoundingClientRect(); return Math.min(ci.left - wr.left, wr.right - ci.right, ci.top - wr.top); });
      return { excesso: wrap.scrollWidth - wrap.clientWidth, folga: Math.min(...folga) };
    });
    t(w + ' px: trilha sem excesso lateral e com folga ≥ 6 px para o anel de foco', r.excesso <= 0 && r.folga >= 6, JSON.stringify(r));
    await c.close();
  }

  // 8) hover só onde existe mouse: nenhuma regra com :hover fora de @media (hover:hover) (no toque o navegador mantém o último :hover até o próximo toque)
  {
    const { c, p } = await abre(b, 390, 'dark', true);
    const fora = await p.evaluate(() => {
      const achados = [];
      const visita = (regras, dentroHover, ctx) => {
        for (const r of regras) {
          if (r.type === 1) { // CSSStyleRule
            const sel = r.selectorText || '';
            if (/:hover/.test(sel.replace(/:not\([^)]*:hover[^)]*\)/g, '')) && !dentroHover) achados.push(sel.slice(0, 80));
          } else if (r.type === 4) { visita(r.cssRules, dentroHover || /hover\s*:\s*hover/.test(r.conditionText || r.media.mediaText), ctx); } // @media
          else if (r.cssRules && r.type !== 7) visita(r.cssRules, dentroHover, ctx); // @layer, @supports, @container
        }
      };
      for (const sh of document.styleSheets) { try { visita(sh.cssRules, false, ''); } catch (e) { } }
      return achados;
    });
    t('nenhuma regra :hover fora de @media (hover:hover)', fora.length === 0, fora.slice(0, 6).join(' | '));
    // com :hover forçado em aparelho de toque, os controles não mudam de aparência
    const cdp = await c.newCDPSession(p); await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const mq = await p.evaluate(() => ({ none: matchMedia('(hover:none)').matches, coarse: matchMedia('(pointer:coarse)').matches }));
    t('contexto de toque: hover:none e pointer:coarse', mq.none && mq.coarse, JSON.stringify(mq));
    const mudou = [];
    for (const a of ['painel', 'treino', 'corpo', 'config']) {
      await irAba(p, a); await p.waitForTimeout(500);
      for (const s of ['button.btn', 'button.btn.primary', '.bottomnav .tab-btn:not([aria-selected="true"])', '.subtabs-wrap .tab-btn:not([aria-selected="true"])', '.top-icon', '.ck-card', '.hm-card', '.theme-opt']) {
        const h = await p.evaluateHandle(s => [...document.querySelectorAll(s)].find(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && e.offsetParent; }), s);
        const el = h.asElement(); if (!el) continue;
        const get = () => p.evaluate(e => { const cs = getComputedStyle(e); return [cs.transform, cs.backgroundColor, cs.borderColor, cs.color, cs.boxShadow, cs.filter].join('|'); }, el);
        await p.evaluate(e => { e.style.transition = 'none'; e.setAttribute('data-hv', '1'); }, el);
        const antes = await get(); const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
        const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-hv="1"]' });
        await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['hover'] });
        const depois = await get(); await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: [] });
        await p.evaluate(e => e.removeAttribute('data-hv'), el);
        if (antes !== depois) mudou.push(a + ': ' + s);
      }
    }
    t('toque: :hover forçado não muda botões, abas, ícones nem cartões', mudou.length === 0, mudou.slice(0, 6).join(' | '));
    await c.close();
  }
  // no computador (mouse) o realce de passar o mouse continua
  {
    const { c, p } = await abre(b, 1280, 'dark', false);
    await irAba(p, 'config');
    const r = await p.evaluate(() => { const e = [...document.querySelectorAll('button.btn')].find(x => x.getBoundingClientRect().width && x.offsetParent && !x.disabled); e.setAttribute('data-alvo', '1'); e.style.transition = 'none'; const cs = getComputedStyle(e); return { bg: cs.backgroundColor, hover: matchMedia('(hover:hover)').matches }; });
    await p.hover('[data-alvo]'); await p.waitForTimeout(150);
    const dep = await p.evaluate(() => getComputedStyle(document.querySelector('[data-alvo]')).backgroundColor);
    t('computador: o realce de :hover continua funcionando com mouse', r.hover && dep !== r.bg, r.bg + ' -> ' + dep);
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
