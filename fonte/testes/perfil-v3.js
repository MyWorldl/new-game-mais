// Perfil (Fases 8 e 9): moldura do avatar, caminho em etapas, vitrine de conquistas, radar. Uso: node perfil-v3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const irPerfil = async (p, ms = 1500) => { await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(ms); };
const novo = async (b, w, { perfil = true, reduce = false } = {}) => {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, reducedMotion: reduce ? 'reduce' : 'no-preference' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text().slice(0, 160)); });
  await p.goto(URL_); await p.waitForTimeout(1200);
  if (perfil) {
    await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste Novo', nomeUsuario: 't.f8', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })() }); });
    await p.reload(); await p.waitForTimeout(1500);
  }
  return { c, p };
};
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark'); await irPerfil(p);
    const r = await p.evaluate(() => {
      const wrap = document.getElementById('perfil-avatar-wrap'), top = document.getElementById('top-avatar');
      const fill = document.getElementById('nivel-xp-fill').style.width;
      const li = [...document.querySelectorAll('#marcos-list li')];
      const bi = [...document.querySelectorAll('#achievements-grid .badge-item')];
      const sec = [...document.querySelectorAll('#achievements-grid .vit-sec')].map(s => ({ h: s.querySelector('.vit-h').textContent.replace(/\s+/g, ' ').trim(), n: s.querySelectorAll('.badge-item').length, lockedAll: [...s.querySelectorAll('.badge-item')].every(x => x.classList.contains('locked')), unlockedAll: [...s.querySelectorAll('.badge-item')].every(x => !x.classList.contains('locked')) }));
      return {
        role: wrap.getAttribute('role'), label: wrap.getAttribute('aria-label'), m: wrap.dataset.moldura, xp: wrap.style.getPropertyValue('--xp'), mc: wrap.style.getPropertyValue('--mc'),
        shield: document.getElementById('nivel-shield-num').textContent.trim(), tier: document.getElementById('nivel-tier-name').textContent.trim(), fill, lv: wrap.querySelector('.pa-lv').textContent.trim(),
        topM: top.dataset.moldura, topAfter: getComputedStyle(top, '::after').content, wrapBox: wrap.getBoundingClientRect().width, avBox: document.getElementById('perfil-avatar-initials').getBoundingClientRect().width,
        marcos: li.map(x => ({ cls: x.className, cur: x.getAttribute('aria-current'), num: getComputedStyle(x, '::before').content, tx: x.innerText.replace(/\s+/g, ' ').trim() })),
        xpTotal: document.getElementById('nivel-xp-total').textContent.trim(),
        sec, total: bi.length, count: document.getElementById('achievements-count').textContent.trim(), minH: Math.min(...bi.map(x => x.getBoundingClientRect().height)),
        esc: document.documentElement.scrollWidth <= innerWidth
      };
    });
    t(w + ': moldura do avatar com role=img e descrição (patente, nível, % do caminho)', r.role === 'img' && /^Moldura do avatar: patente \w+, nível \d+ de 10, \d+% do caminho até a próxima patente\.$/.test(r.label) && r.label.includes(r.tier.charAt(0) + r.tier.slice(1).toLowerCase()), r.label + ' / ' + r.tier);
    t(w + ': nível da moldura = número do escudo do card de patente', r.m === r.shield && r.lv === r.shield && r.mc === 'var(--t' + r.shield + ')', r.m + '/' + r.shield + '/' + r.lv);
    t(w + ': anel de XP = barra de XP do card de patente', r.xp + '%' === r.fill, r.xp + ' vs ' + r.fill);
    t(w + ': avatar do topo recebe o anel (mesmo nível e ::after desenhado)', r.topM === r.shield && r.topAfter !== 'none' && r.topAfter !== 'normal', r.topM + ' ' + r.topAfter);
    t(w + ': moldura 80 px com avatar 52 px dentro', r.wrapBox === (w <= 360 ? 72 : 80) && r.avBox === (w <= 360 ? 46 : 52), r.wrapBox + '/' + r.avBox);
    t(w + ': caminho com 4 etapas numeradas 1–4 e a 1ª marcada como atual', r.marcos.length === 4 && r.marcos.every(x => /counter\(etapa\)/.test(x.num)) && r.marcos[0].cur === 'step' && /atual/.test(r.marcos[0].cls) && r.marcos.slice(1).every(x => /prox/.test(x.cls) && !x.cur), JSON.stringify(r.marcos.map(x => x.num + x.cur)));
    t(w + ': etapa 1 mostra a patente atual e o XP total do card', /^Você está aqui: patente /.test(r.marcos[0].tx) && r.marcos[0].tx.includes(r.xpTotal.replace(/\s/g, '')) || r.marcos[0].tx.replace(/\./g, '').includes(r.xpTotal.replace(/\./g, '')), r.marcos[0].tx + ' | ' + r.xpTotal);
    t(w + ': vitrine separa desbloqueadas e em progresso sem perder nenhuma conquista', r.sec.length === 2 && /^Na vitrine/.test(r.sec[0].h) && r.sec[0].unlockedAll && /^Em progresso/.test(r.sec[1].h) && r.sec[1].lockedAll && r.total === 10 && r.sec[0].n + r.sec[1].n === 10, JSON.stringify(r.sec) + r.total);
    t(w + ': contador "x de 10 desbloqueadas" bate com a vitrine', r.count.startsWith(r.sec[0].n + ' de 10'), r.count + ' / ' + r.sec[0].n);
    t(w + ': conquistas com alvo ≥ 44 px e sem rolagem horizontal', r.minH >= 44 && r.esc, r.minH);
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    if (w === 390) {
      await p.evaluate(() => document.querySelector('#achievements-grid .vit-shelf .badge-item').click()); await p.waitForTimeout(500);
      t('390: tocar numa conquista da vitrine ainda abre o detalhe', await p.evaluate(() => /Conquista desbloqueada/.test(document.body.innerText) && !!document.getElementById('ach-close')));
      await p.evaluate(() => document.getElementById('ach-close').click()); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('#achievements-grid .vit-grid .badge-item').click()); await p.waitForTimeout(500);
      t('390: conquista em progresso mostra o quanto falta', await p.evaluate(() => /\d+ de \d+/.test(document.querySelector('.ach-det-top') ? document.querySelector('.ach-det-top').innerText : '')));
      await p.evaluate(() => document.getElementById('ach-close').click()); await p.waitForTimeout(300);
    }
    await c.close();
  }
  // ornamentos por patente
  {
    const { c, p } = await abre(b, 390, 'dark'); await irPerfil(p);
    const res = await p.evaluate(() => {
      const w = document.getElementById('perfil-avatar-wrap'); const o = [];
      for (let n = 1; n <= 10; n++) {
        w.dataset.moldura = String(n);
        const orn = getComputedStyle(w.querySelector('.pa-orn')), gem = getComputedStyle(w.querySelector('.pa-gems'));
        o.push({ n, borda: parseFloat(orn.borderTopWidth) || 0, marcas: /repeating-conic-gradient/.test(orn.backgroundImage), gemas: gem.display === 'block', gira: gem.animationName === 'pa-gira', brilho: getComputedStyle(w).filter !== 'none' });
      }
      return o;
    });
    const g = n => res[n - 1];
    t('molduras 1–2: anel simples (sem borda extra, marcas ou gemas)', [1, 2].every(n => g(n).borda === 0 && !g(n).marcas && !g(n).gemas));
    t('molduras 3–4: anel duplo', [3, 4].every(n => g(n).borda === 1 && !g(n).marcas && !g(n).gemas));
    t('molduras 5–6: marcas ao redor', [5, 6].every(n => g(n).marcas && !g(n).gemas));
    t('molduras 7–8: marcas e quatro gemas', [7, 8].every(n => g(n).marcas && g(n).gemas && !g(n).gira && !g(n).brilho));
    t('molduras 9–10: marcas, gemas, brilho e giro lento', [9, 10].every(n => g(n).marcas && g(n).gemas && g(n).gira && g(n).brilho), JSON.stringify(res.slice(8)));
    await c.close();
    const r2 = await novo(b, 390, { reduce: true }); await irPerfil(r2.p);
    const gi = await r2.p.evaluate(() => { const w = document.getElementById('perfil-avatar-wrap'); w.dataset.moldura = '10'; return getComputedStyle(w.querySelector('.pa-gems')).animationName; });
    t('movimento reduzido: gemas não giram', gi === 'none', gi);
    await r2.c.close();
  }
  // radar: abre com animação só na primeira vez
  {
    const { c, p } = await abre(b, 390, 'dark');
    const r = await p.evaluate(async () => { document.getElementById('tab-perfil').click(); await new Promise(r => setTimeout(r, 150)); const el = document.getElementById('attrs-radar'); const a = el.classList.contains('rd-anim'); const an = getComputedStyle(el.querySelector('.radar-area')).animationName; await new Promise(r => setTimeout(r, 1500)); const d = el.classList.contains('rd-anim'); document.getElementById('tab-painel').click(); await new Promise(r => setTimeout(r, 400)); document.getElementById('tab-perfil').click(); await new Promise(r => setTimeout(r, 200)); return { a, an, d, volta: el.classList.contains('rd-anim') }; });
    t('radar: abre animado na 1ª vez, a classe sai depois e não volta ao reabrir a aba', r.a === true && r.an === 'rd-abre' && r.d === false && r.volta === false, JSON.stringify(r));
    await c.close();
    const r2 = await novo(b, 390, { reduce: true }); await r2.p.evaluate(() => document.getElementById('tab-perfil').click()); await r2.p.waitForTimeout(200);
    t('movimento reduzido: radar sem animação', await r2.p.evaluate(() => getComputedStyle(document.querySelector('#attrs-radar .radar-area')).animationName === 'none'));
    await r2.c.close();
  }
  // usuário novo (sem treinos) e sem cadastro
  {
    const { c, p } = await novo(b, 390); await irPerfil(p);
    await p.evaluate(async () => { const db = await window.claude.use('db'); for (const k of ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }] }); });
    await p.reload(); await p.waitForTimeout(1500); await irPerfil(p);
    const r = await p.evaluate(() => {
      const el = document.getElementById('achievements-grid');
      return { m: document.getElementById('perfil-avatar-wrap').dataset.moldura, vazia: !!el.querySelector('.vit-vazia'), emProg: el.querySelectorAll('.vit-grid .badge-item').length, naVitrine: el.querySelectorAll('.vit-shelf .badge-item').length, total: el.querySelectorAll('.badge-item').length, marcos: document.querySelectorAll('#marcos-list li').length, ini: document.getElementById('perfil-avatar-initials').textContent.trim() };
    });
    t('usuário novo (rotina, nenhum treino feito): moldura no nível 1, vitrine vazia acolhedora e as 10 conquistas em progresso', r.m === '1' && r.vazia && r.emProg === 10 && r.naVitrine === 0 && r.total === 10 && r.marcos >= 3 && r.ini.length > 0, JSON.stringify(r));
    t('usuário novo: sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
    const s = await novo(b, 390, { perfil: false }); await irPerfil(s.p);
    t('sem cadastro: perfil abre sem erro e a moldura existe', await s.p.evaluate(() => !!document.getElementById('perfil-avatar-wrap')) && s.p.errs.length === 0, s.p.errs.join(' | '));
    await s.c.close();
  }
  // contraste (axe) em 5 paletas, Perfil + topo
  if (axeSrc) {
    const { c, p } = await abre(b, 390, 'dark');
    for (const k of ['lima', 'violeta', 'ouro', 'roxo', 'azul']) {
      await p.evaluate(k => { const el = document.documentElement, pastel = k === 'roxo' || k === 'azul'; if (pastel) { el.dataset.game = 'off'; el.dataset.tema = k; el.removeAttribute('data-paleta'); } else { el.dataset.game = 'on'; el.removeAttribute('data-tema'); if (k === 'lima') el.removeAttribute('data-paleta'); else el.setAttribute('data-paleta', k); } }, k);
      await irPerfil(p, 1500); await p.waitForTimeout(800);
      if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ['color-contrast', 'aria-allowed-attr', 'aria-allowed-role', 'role-img-alt', 'button-name'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' ') + ' :: ' + ((n.any[0] && n.any[0].message) || ''))); });
      t('axe Perfil em ' + k, v.length === 0, v.slice(0, 3).join(' | '));
    }
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
