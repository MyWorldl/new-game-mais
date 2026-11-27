// PR C (ng-modular-71): polimento P3 da auditoria — rótulo do vídeo, piso de 12 px, chips no mouse, título do banner no desktop,
// hábitos sem registro compactos, macros sem barras repetidas, resumo da semana sem sequência, série da vez só contorno,
// "Defina a carga", Ficha sem barra de XP repetida, "0" da sequência menor.
// Uso: node pr-c-polimento.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
const hoje = iso(Date.now());
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }];
async function abre(b, w, touch) {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, hasTouch: !!touch, isMobile: !!touch, reducedMotion: 'reduce' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async ([cr, h, exs, DIAS]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.pc', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: cr });
    await db.doc('medicoes/' + h).set({ pesoKg: 80, cinturaCm: 90, quadrilCm: 100, pescocoCm: 38 });
    await db.doc('checkins/' + h).set({ hab: { sono: 7 } });
    for (const k of DIAS) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
  }, [iso(Date.now() - 3 * 864e5), hoje, exs, DIAS]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p };
}
const aba = async (p, n) => { await p.evaluate(a => document.getElementById('tab-' + a).click(), n); await p.waitForTimeout(800); };
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await abre(b, 1280, false);
    // Hoje
    const hj = await p.evaluate(() => ({ resumo: (document.getElementById('semana-resumo') || {}).textContent || '', zero: document.getElementById('streak-card').classList.contains('zero'), fs: parseFloat(getComputedStyle(document.querySelector('#streak-card .value')).fontSize) }));
    t('Hoje: o resumo da semana não repete a sequência', !/sequência/i.test(hj.resumo) && /treinos/.test(hj.resumo), hj.resumo);
    t('Hoje: sem sequência, o número do cartão é menor que 74 px', hj.zero && hj.fs < 60, JSON.stringify(hj));
    // Dieta
    await aba(p, 'dieta');
    const di = await p.evaluate(() => ({ barras: !!document.getElementById('macro-bars') || !!document.querySelector('.macro-bar-row'), linhas: document.querySelectorAll('#macro-table tr').length }));
    t('Dieta: as barras de macros repetidas saíram e a tabela g/kg e kcal ficou (3 linhas)', !di.barras && di.linhas === 3, JSON.stringify(di));
    // Perfil
    await aba(p, 'perfil');
    const pf = await p.evaluate(() => ({ xp: !!document.querySelector('.attrs-radar .fi-xp'), pat: !!document.querySelector('.attrs-radar .fi-pat'), marco: [...document.querySelectorAll('.marco-sub')].map(e => e.textContent).join(' | ') }));
    t('Perfil: a Ficha mostra a patente sem a barra de XP repetida', !pf.xp && pf.pat, JSON.stringify(pf));
    // Corpo: hábitos
    await aba(p, 'corpo');
    const hg = await p.evaluate(() => [...document.querySelectorAll('#hab-grade .hg-row')].map(r => ({ v: r.classList.contains('vazio'), h: Math.round(r.getBoundingClientRect().height), c: r.querySelectorAll('.hg-c').length })));
    t('Corpo: 4 hábitos, 12 semanas cada; os 3 sem registro ficam baixos (≤ 100 px) e o com registro continua completo', hg.length === 4 && hg.every(x => x.c === 12) && hg.filter(x => x.v).length === 3 && hg.filter(x => x.v).every(x => x.h <= 100) && hg.filter(x => !x.v).every(x => x.h > 150), JSON.stringify(hg));
    const f12 = await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#hab-grade .hg-st, #hab-grade .hg-top span')).fontSize));
    t('texto pequeno: piso de 12 px nos rótulos da grade', f12 >= 12, 'fs=' + f12);
    // Treino: pill e série da vez
    await aba(p, 'treino');
    const tr = await p.evaluate(() => { const pill = [...document.querySelectorAll('.qc-pill.muted')].map(e => e.textContent.trim()); return { pill }; });
    t('Treino: sem carga o chip diz "Defina a carga"', tr.pill.some(x => /Defina a carga/.test(x)) && !tr.pill.some(x => x === 'Sem carga'), JSON.stringify(tr));
    await p.evaluate(() => { const bt = document.querySelector('.qc [data-qtoggle]'); if (bt) bt.click(); }); await p.waitForTimeout(600);
    const sg = await p.evaluate(() => { const n = document.querySelector('.sl-segs i.next'); if (!n) return null; const cs = getComputedStyle(n); return { bg: cs.backgroundColor, sh: cs.boxShadow }; });
    t('Treino: a série da vez é só contorno (fundo transparente, borda), não verde cheio', !!sg && /rgba\(0, 0, 0, 0\)|transparent/.test(sg.bg) && sg.sh !== 'none', JSON.stringify(sg));
    // Pop-up do exercício: rótulo do vídeo
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await aba(p, 'painel');
    await p.evaluate(() => { const bt = document.getElementById('btn-treino-ao-vivo'); bt.dataset.acao = 'treino'; bt.click(); }); await p.waitForTimeout(700);
    const vd = await p.evaluate(() => { const a = document.querySelector('.live-workout .ex-video-link'); return a ? a.textContent.trim() : null; });
    t('Pop-up: o link diz que busca no YouTube', vd === 'Buscar vídeo no YouTube', vd);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    // Editar perfil: chips e botões ≥ 32 px no mouse
    await aba(p, 'perfil');
    await p.evaluate(() => { const bt = [...document.querySelectorAll('#view-perfil button')].find(x => /^\s*Editar\s*$/.test(x.textContent)); if (bt) bt.click(); }); await p.waitForTimeout(800);
    const ch = await p.evaluate(() => [...document.querySelectorAll('.modal .muscle-chip, .modal .btn.small')].filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height)));
    t('Editar perfil (mouse): chips e botões pequenos com pelo menos 32 px', ch.length > 0 && Math.min(...ch) >= 32, 'n=' + ch.length + ' min=' + Math.min(...ch));
    t('sem erros de JS (desktop)', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  { // banner de instalar no desktop com aviso do navegador: título não diz "celular"
    const { c, p } = await abre(b, 1280, false);
    await p.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = async () => { }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); window.dispatchEvent(e); }); await p.waitForTimeout(400);
    const tt = await p.evaluate(() => { const h = document.querySelector('#ng-install-banner h2'); return h ? h.textContent.trim() : null; });
    t('banner de instalar no desktop diz "no computador"', tt === 'Instale o NG+ no computador', tt);
    await c.close(); }
  { // celular: banner mantém "no celular"; fonte pequena e toque
    const c = await b.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); await p.goto(URL_); await p.waitForTimeout(1800);
    const tt = await p.evaluate(() => { const h = document.querySelector('#ng-install-banner h2'); return h ? h.textContent.trim() : null; });
    t('banner de instalar no Android diz "no celular"', tt === 'Instale o NG+ no celular', tt);
    await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
