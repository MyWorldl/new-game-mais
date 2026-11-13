// Dieta (Fase 6): anel de calorias/macros, refeições com ícone e fatia do dia, troca de dia suave. Uso: node dieta-v3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const irDieta = async p => { await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(2200); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark'); await irDieta(p);
    const r = await p.evaluate(() => {
      const a = document.getElementById('dieta-anel');
      const arcos = [...a.querySelectorAll('.da-arco')].map(e => parseFloat(e.getAttribute('stroke-dasharray')));
      const g = [...a.querySelectorAll('.da-lista li')].map(li => ({ n: li.querySelector('.da-n').textContent, g: parseInt(li.querySelector('b').textContent, 10), pc: parseInt(li.querySelector('.da-pc').textContent, 10) }));
      const centro = a.querySelector('.da-centro b').textContent.replace(/\D/g, '');
      const sw = [...a.querySelectorAll('.da-sw')].map(e => getComputedStyle(e).backgroundColor);
      const meals = [...document.querySelectorAll('.cdp-meal')];
      const ic = meals.map(m => !!m.querySelector('.cdp-ic svg[aria-hidden], .cdp-ic[aria-hidden="true"]'));
      const pct = meals.map(m => parseInt(m.querySelector('.cdp-share-txt').textContent, 10));
      const barras = meals.map(m => parseFloat(m.querySelector('.cdp-share-bar i').style.width));
      const r = a.getBoundingClientRect();
      return { vis: getComputedStyle(a).display !== 'none', arcos, g, centro, sw, nM: meals.length, ic, pct, barras, h2: a.querySelector('h2').textContent.trim(), esc: document.documentElement.scrollWidth <= innerWidth, w: r.width, anelW: a.querySelector('.da-anel').getBoundingClientRect().width };
    });
    t(w + ': cartão do anel visível com meta em kcal', r.vis && r.centro.length >= 3, r.centro);
    t(w + ': 3 arcos somam ~100% (com folgas entre eles)', Math.abs(r.arcos.reduce((s, x) => s + x, 0) - 100) < 4.5, r.arcos.join(','));
    t(w + ': legenda tem proteína, carboidrato e gordura em g + %', r.g.length === 3 && r.g.map(x => x.n).join() === 'Proteína,Carboidrato,Gordura' && r.g.every(x => x.g > 0 && x.pc > 0), JSON.stringify(r.g));
    t(w + ': percentuais da legenda somam 100 (±1)', Math.abs(r.g.reduce((s, x) => s + x.pc, 0) - 100) <= 1, r.g.map(x => x.pc).join('+'));
    t(w + ': 3 cores de legenda distintas (nunca só cor: há nome e valor)', new Set(r.sw).size === 3 && !r.sw.includes('rgba(0, 0, 0, 0)'), r.sw.join('|'));
    t(w + ': 5 refeições, todas com ícone decorativo', r.nM === 5 && r.ic.every(Boolean), r.ic.join());
    t(w + ': fatias das refeições somam 100% (±2) e barra = texto', Math.abs(r.pct.reduce((s, x) => s + x, 0) - 100) <= 2 && r.pct.every((x, i) => x === Math.round(r.barras[i])), r.pct.join('+'));
    t(w + ': sem rolagem horizontal e anel ≥ 120 px', r.esc && r.anelW >= 120, r.anelW);
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    if (w === 390) {
      // meta do anel = kcal do app (mesmo valor exibido no cartão de objetivo)
      const alvo = await p.evaluate(() => (document.body.innerText.match(/2\.954/g) || []).length);
      t('390: meta exibida no anel aparece também no cartão de objetivo (mesma conta)', alvo >= 2, alvo);
      // troca de dia: classe cdp-troca aplicada e removida
      const f = await p.evaluate(async () => {
        const btns = [...document.querySelectorAll('[data-cdp="dia"]')];
        const alvoBtn = btns.find(x => x.getAttribute('aria-pressed') !== 'true') || btns[0];
        alvoBtn.click();
        const reg = document.querySelector('[data-r="refeicoes"]');
        const durante = reg.classList.contains('cdp-troca');
        const anim = getComputedStyle(reg.querySelector('.cdp-meal')).animationName;
        await new Promise(r => setTimeout(r, 900));
        return { n: btns.length, durante, anim, depois: reg.classList.contains('cdp-troca'), pressed: alvoBtn.getAttribute('aria-pressed'), nM: document.querySelectorAll('.cdp-meal').length };
      });
      t('390: 7 botões de dia', f.n === 7, f.n);
      t('390: trocar o dia anima as refeições (cdp-entra) e limpa a classe depois', f.durante && /cdp-entra/.test(f.anim) && !f.depois, JSON.stringify(f));
      t('390: refeições continuam 5 após a troca e o botão do dia fica pressionado', f.nM === 5 && f.pressed === 'true', JSON.stringify(f));
      // anel não repete animação ao voltar à aba
      const rep = await p.evaluate(async () => {
        document.getElementById('tab-painel').click(); await new Promise(r => setTimeout(r, 300));
        document.getElementById('tab-dieta').click(); await new Promise(r => setTimeout(r, 150));
        return document.getElementById('dieta-anel').classList.contains('da-anim');
      });
      t('390: animação do anel não repete ao voltar à aba', rep === false, rep);
      await p.screenshot({ path: process.env.SP + '/f6-dieta-390.png' });
      await p.evaluate(() => document.getElementById('dieta-anel').scrollIntoView());
    }
    await c.close();
  }
  // movimento reduzido: sem animação
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1200);
    await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'T', nomeUsuario: 't.f6', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: new Date().toISOString().slice(0, 10) }); await db.doc('medicoes/' + new Date().toISOString().slice(0, 10)).set({ pesoKg: 80, cinturaCm: 85 }); });
    await p.reload(); await p.waitForTimeout(1500); await irDieta(p);
    const m = await p.evaluate(async () => {
      const svg = document.querySelector('#dieta-anel .da-anel svg'); const an = svg ? getComputedStyle(svg).animationName : 'x';
      document.querySelector('[data-cdp="dia"]:not([aria-pressed="true"])').click();
      const mm = getComputedStyle(document.querySelector('.cdp-meal')).animationName;
      return { an, mm };
    });
    t('movimento reduzido: anel e refeições sem animação', m.an === 'none' && m.mm === 'none', JSON.stringify(m));
    t('movimento reduzido: sem erro de console', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  // estado vazio: sem perfil/peso o anel fica oculto
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto((process.argv[2] || 'http://localhost:8791') + '/index.html'); await p.waitForTimeout(1500); await irDieta(p);
    const v = await p.evaluate(() => { const a = document.getElementById('dieta-anel'); return { disp: getComputedStyle(a).display, vazio: a.innerHTML.trim() === '' }; });
    t('sem dados: anel oculto e sem conteúdo (não mostra números inventados)', v.disp === 'none' && v.vazio, JSON.stringify(v));
    t('sem dados: sem erro de console', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  // axe nas 5 paletas/modos
  if (axeSrc) {
    const { c, p } = await abre(b, 390, 'dark');
    for (const k of ['lima', 'violeta', 'ouro', 'roxo', 'azul']) {
      await p.evaluate(k => { const el = document.documentElement, pastel = k === 'roxo' || k === 'azul'; if (pastel) { el.dataset.game = 'off'; el.dataset.tema = k; el.removeAttribute('data-paleta'); } else { el.dataset.game = 'on'; el.removeAttribute('data-tema'); if (k === 'lima') el.removeAttribute('data-paleta'); else el.setAttribute('data-paleta', k); } }, k);
      await irDieta(p); await p.waitForTimeout(800);
      if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
      const res = await p.evaluate(async () => { const r = await axe.run(document.getElementById('view-dieta'), { runOnly: ['color-contrast', 'aria-allowed-attr', 'button-name', 'aria-valid-attr-value'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))); });
      t('axe AA na Dieta em ' + k, res.length === 0, res.slice(0, 3).join(' | '));
    }
    await c.close();
  } else t('axe disponível', false, 'axe-core não encontrado em $SP/axe');
  await b.close();
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
