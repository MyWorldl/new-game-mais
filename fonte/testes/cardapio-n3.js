// Cardápio (noite 3): nº de refeições por dia, horários sugeridos, mais restrições e base de alimentos maior. Uso: node cardapio-n3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const irDieta = async p => { await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(2200); };
const clica = async (p, rot, v) => { await p.evaluate(([r, v]) => document.querySelector('[data-cdp="' + r + '"][data-v="' + v + '"]').click(), [rot, v]); await p.waitForTimeout(450); };
const nomes = p => p.evaluate(() => [...document.querySelectorAll('.cdp-meal .cdp-n')].map(x => x.innerText));
const semana = async p => { const out = []; for (let d = 0; d < 7; d++) { await clica(p, 'dia', d); out.push(...(await nomes(p))); } return out; };
const hm = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
const PROIBIDOS = {
  ovo: /\bovo/i, soja: /soja|tofu/i, peixe: /sardinha|abadejo|pintado|salm[ãa]o|merluza|corvina|atum/i,
  castanhas: /amendoim|castanha/i, porco: /porco/i, vermelha: /patinho|acém|porco/i, lactose: /queijo|iogurte|ricota|muçarela|whey/i, gluten: /p[ãa]o|aveia/i,
};
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark', w < 800); await irDieta(p);
    // ---- nº de refeições por dia ----
    for (const rot of ['tradicional', 'corrido', 'budget', 'fora']) {
      await clica(p, 'rotina', rot);
      const r = {};
      for (const n of [3, 4, 5, 6]) { await clica(p, 'nref', n); r[n] = await p.evaluate(() => ({ m: document.querySelectorAll('.cdp-meal').length, on: document.querySelector('[data-cdp="nref"].on').dataset.v, desc: document.querySelector('[data-r="rotdesc"]').innerText })); }
      t(w + ' ' + rot + ': 3, 4, 5 e 6 refeições mudam o cardápio e o botão ligado', [3, 4, 5, 6].every(n => r[n].m === n && r[n].on === String(n)), JSON.stringify(Object.values(r).map(x => x.m)));
      t(w + ' ' + rot + ': descrição da rotina acompanha o nº de refeições', /^6 refeições/.test(r[6].desc) && /^3 refeições/.test(r[3].desc), r[6].desc.slice(0, 30));
    }
    await clica(p, 'rotina', 'marmita');
    const mm = await p.evaluate(() => ({ dis: [...document.querySelectorAll('[data-cdp="nref"]')].every(x => x.disabled), meals: document.querySelectorAll('.cdp-meal').length, on: document.querySelector('[data-cdp="nref"].on').dataset.v, nota: document.querySelector('[data-r="nrefinfo"]').innerText }));
    t(w + ' marmita: botões de refeições desligados, sempre 5 refeições, com explicação', mm.dis && mm.meals === 5 && mm.on === '5' && /Marmita da semana/.test(mm.nota), JSON.stringify(mm));
    t(w + ': sem rolagem horizontal na Dieta', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    // ---- horários sugeridos ----
    for (const [rot, n] of [['tradicional', 6], ['corrido', 3], ['fora', 4]]) {
      await clica(p, 'rotina', rot); await clica(p, 'nref', n);
      const h = await p.evaluate(() => [...document.querySelectorAll('.cdp-meal')].map(m => ({ slot: m.dataset.slot, hr: (m.querySelector('.cdp-hr time') || {}).textContent, ac: (m.querySelector('.cdp-hr .sr-only') || {}).textContent })));
      const mins = h.map(x => hm(x.hr || '0:0'));
      const gaps = mins.slice(1).map((v, i) => v - mins[i]);
      t(w + ' ' + rot + '/' + n + ': toda refeição tem horário HH:MM em ordem crescente', h.length === n && h.every(x => /^\d\d:\d\d$/.test(x.hr || '')) && gaps.every(g => g > 0), h.map(x => x.hr).join(' '));
      t(w + ' ' + rot + '/' + n + ': intervalos entre 2 h 30 e 7 h 30 e café entre 06:00 e 09:00', gaps.every(g => g >= 150 && g <= 450) && mins[0] >= 360 && mins[0] <= 540, gaps.join(','));
      t(w + ' ' + rot + '/' + n + ': leitor de tela ouve "Horário sugerido"', h.every(x => /Horário sugerido/.test(x.ac || '')));
    }
    t(w + ': café, almoço e jantar sempre nos mesmos horários base (07:00 / 12:xx / 19:xx)', await p.evaluate(() => { const m = [...document.querySelectorAll('.cdp-meal')]; const g = s => (m.find(x => x.dataset.slot === s) || { querySelector: () => null }).querySelector('time'); return /^07:00/.test((g('cafe') || {}).textContent || '') && /^12:/.test((g('almoco') || {}).textContent || '') && /^19:/.test((g('jantar') || {}).textContent || ''); }));
    // ---- restrições novas ----
    await clica(p, 'rotina', 'tradicional'); await clica(p, 'nref', 5);
    t(w + ': 8 restrições disponíveis', (await p.evaluate(() => document.querySelectorAll('[data-cdp="restr"]').length)) === 8);
    for (const r of ['ovo', 'soja', 'peixe', 'castanhas', 'porco', 'vermelha', 'lactose', 'gluten']) {
      await clica(p, 'restr', r);
      const lig = await p.evaluate(r => document.querySelector('[data-cdp="restr"][data-v="' + r + '"]').getAttribute('aria-pressed'), r);
      const todos = (await semana(p)).join(' | ');
      const compras = await p.evaluate(() => { document.querySelector('.cdp-shop').open = true; return document.querySelector('[data-r="compras"]').innerText; });
      t(w + ' sem ' + r + ': botão ligado e nenhum alimento proibido na semana nem na lista de compras', lig === 'true' && !PROIBIDOS[r].test(todos) && !PROIBIDOS[r].test(compras), (todos.match(PROIBIDOS[r]) || compras.match(PROIBIDOS[r]) || [''])[0]);
      await clica(p, 'restr', r);
    }
    // ---- pescetariano ----
    await clica(p, 'jeito', 'pesc');
    const pesc = (await semana(p)).join(' | ');
    t(w + ' pescetariano: sem carne, com peixe', !/frango|patinho|acém|porco|sobrecoxa/i.test(pesc) && /sardinha|abadejo|pintado|salm[ãa]o|merluza|corvina|atum/i.test(pesc), (pesc.match(/frango|patinho|acém|porco|sobrecoxa/i) || [''])[0]);
    await clica(p, 'restr', 'peixe');
    t(w + ' pescetariano + sem peixe: vira vegetariano com ovos e laticínios (sem carne nem peixe)', !/frango|patinho|acém|porco|sobrecoxa|sardinha|abadejo|pintado|salm[ãa]o|merluza|corvina|atum/i.test((await semana(p)).join(' | ')));
    await clica(p, 'restr', 'peixe'); await clica(p, 'jeito', 'omni');
    // ---- combinação impossível: aviso claro, sem quebrar ----
    await clica(p, 'jeito', 'vegan'); await clica(p, 'restr', 'soja'); await clica(p, 'restr', 'castanhas');
    const av = await p.evaluate(() => [...document.querySelectorAll('.cdp-warn')].map(x => x.innerText).join(' || '));
    t(w + ' vegano sem soja: avisa que falta proteína concentrada e o que fazer', /não sobra nenhum alimento de proteína/.test(av) && /Desligue algum filtro/.test(av), av.slice(0, 120));
    t(w + ' combinação apertada não quebra a tela (refeições e total aparecem)', (await p.evaluate(() => document.querySelectorAll('.cdp-meal').length)) === 5 && (await p.evaluate(() => document.querySelectorAll('.cdp-tchip').length)) >= 4);
    await clica(p, 'restr', 'soja'); await clica(p, 'restr', 'castanhas'); await clica(p, 'jeito', 'omni');
    // ---- persistência ----
    await clica(p, 'rotina', 'corrido'); await clica(p, 'nref', 6); await clica(p, 'restr', 'ovo'); await clica(p, 'restr', 'vermelha');
    await p.reload(); await p.waitForTimeout(1800); await irDieta(p);
    const per = await p.evaluate(() => ({ n: document.querySelector('[data-cdp="nref"].on').dataset.v, rot: document.querySelector('[data-cdp="rotina"].on').dataset.v, restr: [...document.querySelectorAll('[data-cdp="restr"].on')].map(x => x.dataset.v).sort().join(), meals: document.querySelectorAll('.cdp-meal').length }));
    t(w + ': escolhas (rotina, 6 refeições, sem ovo e sem carne vermelha) persistem após recarregar', per.n === '6' && per.rot === 'corrido' && per.restr === 'ovo,vermelha' && per.meals === 6, JSON.stringify(per));
    // pop-up de troca respeita as novas restrições
    await p.evaluate(() => document.querySelector('[data-cdp="editar"]').click()); await p.waitForTimeout(400);
    await p.evaluate(() => document.querySelector('[data-pop="refeicao"][data-v="almoco"]').click()); await p.waitForTimeout(200);
    const alts = await p.evaluate(() => [...document.querySelectorAll('[data-pop="para"] .cdp-n')].map(x => x.innerText).join('|'));
    t(w + ': pop-up de trocas não oferece ovo nem carne vermelha quando filtrados', !/\bovo|patinho|acém|porco/i.test(alts), alts.slice(0, 160));
    await p.keyboard.press('Escape'); await p.waitForTimeout(250);
    if (axeSrc) {
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => (await axe.run(document.getElementById('cardapio-card'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))));
      t(w + ': axe no card do cardápio', v.length === 0, v.slice(0, 3).join(' | '));
    }
    if (w < 800) {
      const al = await p.evaluate(() => [...document.querySelectorAll('.cdp-chip')].filter(e => e.getBoundingClientRect().width > 0 && !e.disabled).map(e => Math.round(e.getBoundingClientRect().height)));
      t(w + ': botões de filtro com alvo ≥ 44 px no toque', Math.min(...al) >= 44, 'min ' + Math.min(...al));
    }
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
