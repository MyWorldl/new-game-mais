// Treino · timer de descanso em anel (Fase 5). Uso: node treino-anel.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const D = n => iso(Date.now() - n * 864e5);
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] },
             { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
(async () => {
  const b = await chromium.launch();
  const mk = async (w, opts = {}) => {
    const c = await b.newContext({ viewport: { width: w, height: 844 }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); } catch (e) { } });
    const p = await c.newPage(); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text().slice(0, 200)); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([exs, ds]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.f5', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ds[0] });
      for (const k of ds[1]) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    }, [exs, [D(10), MAP]]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    if (opts.clock) { await p.clock.install(); }
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(600);
    return { c, p };
  };
  const comeca = async (p, secs) => {
    await p.evaluate(() => document.getElementById('btn-treino-ao-vivo').click()); await p.waitForTimeout(800);
    await p.evaluate(s => { const sel = document.querySelector('[data-restsel="0"]'); sel.value = String(s); sel.dispatchEvent(new Event('change', { bubbles: true })); document.querySelector('[data-rest="0"]').click(); }, secs);
    await p.waitForTimeout(300);
  };
  const ring = p => p.evaluate(() => { const r = document.querySelector('.rest-ring'); if (!r) return null; const a = r.querySelector('.rr-arco'); const bx = r.getBoundingClientRect(); return { off: Number(a.getAttribute('stroke-dashoffset')), label: r.getAttribute('aria-label'), role: r.getAttribute('role'), w: bx.width, h: bx.height, txt: document.querySelector('.quest-rest-display').textContent.trim(), fim: r.classList.contains('fim'), anim: getComputedStyle(r).animationName, cancelH: document.querySelector('[data-restcancel]').getBoundingClientRect().height, esc: document.documentElement.scrollWidth <= innerWidth }; });

  for (const w of [320, 390, 1280]) {
    const { c, p } = await mk(w);
    await comeca(p, 60);
    const r1 = await ring(p);
    t(w + ': anel aparece ao iniciar o descanso', !!r1);
    if (!r1) { await c.close(); continue; }
    t(w + ': anel 44×44 e role=img com descrição em texto', r1.w === 44 && r1.h === 44 && r1.role === 'img' && /^Descanso: faltam 0[01]:\d\d de 1 min$/.test(r1.label), r1.label);
    t(w + ': anel cheio no começo e tempo em texto', r1.off < 4 && /^0[01]:\d\d$/.test(r1.txt), JSON.stringify(r1));
    t(w + ': botão Cancelar com alvo de toque ≥ 44 px', r1.cancelH >= 44 || w >= 768, r1.cancelH);
    t(w + ': sem rolagem horizontal', r1.esc);
    if (w === 390) {
      await p.waitForTimeout(3300);
      const r2 = await ring(p);
      t('390: o arco esvazia com o tempo e o rótulo acompanha', r2.off > r1.off + 3 && r2.off < 12 && r2.label !== r1.label, r1.off + ' → ' + r2.off);
      await p.screenshot({ path: '/tmp/sp/f5-390.png' });
    }
    await p.evaluate(() => document.querySelector('[data-restcancel]').click()); await p.waitForTimeout(300);
    t(w + ': cancelar remove o anel e volta o seletor', await p.evaluate(() => !document.querySelector('.rest-ring') && !!document.querySelector('[data-restsel="0"]')));
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }

  // reta final (relógio simulado): pulso nos 5 últimos segundos e fim do descanso
  {
    const { c, p } = await mk(390, { clock: true });
    await comeca(p, 60);
    await p.clock.runFor(52000); await p.waitForTimeout(100);
    const r = await ring(p);
    t('reta final: faltando >5 s não pulsa', r && !r.fim && r.off > 80, JSON.stringify(r));
    await p.clock.runFor(4000); await p.waitForTimeout(100);
    const f = await ring(p);
    t('reta final: nos últimos 5 s o anel pulsa (classe + animação)', f && f.fim && f.anim === 'rest-pulso' && f.off > 90, JSON.stringify(f));
    await p.clock.runFor(5000); await p.waitForTimeout(150);
    t('fim: anel sai, aparece aviso e o seletor volta', await p.evaluate(() => !document.querySelector('.rest-ring') && /Descanso concluído/.test(document.body.innerText) && !!document.querySelector('[data-restsel="0"]')));
    await c.close();
  }
  // movimento reduzido: sem pulso
  {
    const { c, p } = await mk(390, { reduce: true, clock: true });
    await comeca(p, 60); await p.clock.runFor(57000); await p.waitForTimeout(100);
    const f = await ring(p);
    t('movimento reduzido: sem animação de pulso', f && f.fim && f.anim === 'none', JSON.stringify(f));
    await c.close();
  }
  // contraste (axe) com o anel visível em várias paletas
  if (axeSrc) {
    const { c, p } = await mk(390);
    await comeca(p, 120);
    for (const k of ['lima', 'violeta', 'ouro', 'roxo', 'azul']) {
      await p.evaluate(k => {
        const el = document.documentElement; const pastel = k === 'roxo' || k === 'azul';
        if (pastel) { el.dataset.game = 'off'; el.dataset.tema = k; el.removeAttribute('data-paleta'); }
        else { el.dataset.game = 'on'; el.removeAttribute('data-tema'); if (k === 'lima') el.removeAttribute('data-paleta'); else el.setAttribute('data-paleta', k); }
      }, k); await p.waitForTimeout(1400);
      if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document.querySelector('.live-workout') || document, { runOnly: ['color-contrast', 'aria-allowed-attr', 'role-img-alt'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))); });
      t('axe com anel em ' + k, v.length === 0, v.slice(0, 3).join(' | '));
    }
    t('axe: sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
