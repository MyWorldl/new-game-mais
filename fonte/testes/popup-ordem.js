// Pop-up do exercício (treino ao vivo): carga e RPE ficam ANTES do "Registrar série" (ordem: nome, carga, RPE, séries, descanso, navegação).
// Uso: node popup-ordem.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const hoje = iso(Date.now()), ontem = iso(Date.now() - 864e5);
const kH = MAP[new Date(hoje + 'T00:00:00').getDay()];
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
(async () => {
  const b = await chromium.launch();
  for (const w of [400, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([ontem, kH, exs]) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.po', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: ontem });
      await db.doc('rotina/' + kH).set({ nome: 'Treino ' + kH, ativo: true, exercicios: exs });
    }, [ontem, kH, exs]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => { const bt = document.getElementById('btn-treino-ao-vivo'); bt.dataset.acao = 'treino'; bt.click(); }); await p.waitForTimeout(700);
    const ordem = () => p.evaluate(() => {
      const q = s => document.querySelector('.live-workout ' + s);
      const nomes = ['.lw-name', '#lw-carga-input', '#lw-rpe-seg', '.lw-progress [data-slok]', '.lw-nav'];
      const els = nomes.map(q); if (els.some(e => !e)) return { falta: nomes.filter((n, i) => !els[i]) };
      let certo = true; for (let i = 1; i < els.length; i++) if (!(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING)) certo = false;
      const y = e => Math.round(e.getBoundingClientRect().top + scrollY);
      return { certo, ys: els.map(y) };
    });
    const o = await ordem();
    t(w + ': carga e RPE vêm antes do "Registrar série" e da navegação', !!o.certo, JSON.stringify(o));
    await p.locator('#lw-carga-input').fill('40'); await p.locator('#lw-carga-input').press('Tab'); await p.waitForTimeout(500);
    await p.locator('.lw-progress [data-slok]').click(); await p.waitForTimeout(500);
    const o2 = await ordem();
    t(w + ': depois de registrar uma série a ordem continua e a carga digitada segue no campo', !!o2.certo && (await p.locator('#lw-carga-input').inputValue()) === '40', JSON.stringify(o2));
    const sl = await p.evaluate(() => document.querySelector('.lw-progress .sl-count').textContent.replace(/\s+/g, ' ').trim());
    t(w + ': a série foi registrada (1 de 3)', /1 de 3/.test(sl), sl);
    t(w + ': sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
