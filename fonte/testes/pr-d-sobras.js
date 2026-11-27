// PR D (ng-modular-72): sobras do polimento P3 — Hoje sem sequência/peso repetidos no carrossel, chip da sequência só em risco, toast de salvamento sob a pílula, "Remover foto" discreto.
// (cabeçalho herdado do PR C:) polimento P3 da auditoria — rótulo do vídeo, piso de 12 px, chips no mouse, título do banner no desktop,
// hábitos sem registro compactos, macros sem barras repetidas, resumo da semana sem sequência, série da vez só contorno,
// "Defina a carga", Ficha sem barra de XP repetida, "0" da sequência menor.
// Uso: node pr-d-sobras.js http://localhost:8791
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
  for (const [w, touch] of [[1280, false], [390, true]]) {
    const L = w + ' px · ';
    const { c, p } = await abre(b, w, touch);
    // carrossel da Hoje
    const ey = await p.evaluate(() => [...document.querySelectorAll('#hm-trilho .hm-card .eyebrow')].map(e => e.textContent.trim().toLowerCase()));
    t(L + 'Hoje: o carrossel tem só Treinos da semana e Hábitos de hoje', JSON.stringify(ey) === JSON.stringify(['treinos da semana', 'hábitos de hoje']), JSON.stringify(ey));
    const txt = await p.evaluate(() => document.getElementById('hoje-metricas').innerText);
    t(L + 'Hoje: o carrossel não repete sequência nem peso', !/sequência|peso atual/i.test(txt), txt.replace(/\s+/g, ' '));
    // chip de sequência da faixa de patente: escondido quando não há risco
    const chip = await p.evaluate(() => { const e = document.getElementById('nivel-mini-streak'); return e ? { hidden: e.hidden, vis: e.getClientRects().length > 0 } : null; });
    t(L + 'Hoje: o chip de sequência da faixa de patente fica oculto sem risco', !!chip && chip.hidden && !chip.vis, JSON.stringify(chip));
    // Ferro sem repetir "sequência" quando está zerada
    const fe = await p.evaluate(() => (document.getElementById('narrator-msg') || document.querySelector('#narrator-card p, #narrator-card .narrator-msg') || {}).textContent || '');
    t(L + 'Hoje: a mensagem do Ferro com sequência zerada não repete a palavra', fe.length > 0 && !/sequência/i.test(fe), fe);
    // toast de salvamento sob a pílula
    const pil = await p.evaluate(() => { const r = document.getElementById('sync-pill').getBoundingClientRect(); return { b: r.bottom, r: r.right, vis: r.width > 0 }; });
    if (pil.vis) {
      await p.evaluate(() => document.getElementById('sync-pill').click()); await p.waitForTimeout(700);
      const ts = await p.evaluate(() => { const e = document.getElementById('toast'), r = e.getBoundingClientRect(); return { cls: e.classList.contains('toast-pilula'), show: e.classList.contains('show'), top: r.top, right: r.right, bottom: r.bottom, vh: innerHeight, vw: innerWidth, txt: e.textContent }; });
      t(L + 'Toast do estado de salvamento: aparece logo abaixo da pílula (não no rodapé)', ts.cls && ts.show && ts.top >= pil.b && ts.top - pil.b < 40 && ts.bottom < ts.vh / 2 && ts.right <= ts.vw, JSON.stringify({ ts, pil }));
      t(L + 'Toast do estado de salvamento: diz "Tudo salvo"', /Tudo salvo/.test(ts.txt), ts.txt);
      await p.waitForTimeout(4200);
    } else t(L + 'pílula visível', false, JSON.stringify(pil));
    // pílula fora da tela: o aviso volta ao rodapé
    await aba(p, 'painel');
    await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(500);
    const fora = await p.evaluate(() => { const r = document.getElementById('sync-pill').getBoundingClientRect(); return !(r.width > 0 && r.top >= 0 && r.bottom <= innerHeight); });
    if (fora) {
      await p.evaluate(() => document.getElementById('sync-pill').click()); await p.waitForTimeout(600);
      const tf = await p.evaluate(() => { const e = document.getElementById('toast'); return { cls: e.classList.contains('toast-pilula'), bottomGap: innerHeight - e.getBoundingClientRect().bottom }; });
      t(L + 'Toast com a pílula fora da tela: volta ao rodapé', !tf.cls && tf.bottomGap < 140, JSON.stringify(tf));
      await p.waitForTimeout(4200);
    } else t(L + 'pílula sempre visível (cabeçalho fixo): nada a verificar sobre o rodapé', true);
    await p.evaluate(() => window.scrollTo(0, 0));
    // outro toast volta ao rodapé
    await aba(p, 'perfil');
    await p.evaluate(() => { const bt = [...document.querySelectorAll('#view-perfil button')].find(x => /^\s*Editar\s*$/.test(x.textContent)); if (bt) bt.click(); }); await p.waitForTimeout(900);
    // Editar perfil: Escolher/Remover foto
    const fe2 = await p.evaluate(() => { const r = document.getElementById('p-foto-remover'), e = document.getElementById('p-foto-escolher'); if (!r || !e) return null; return { rem: r.textContent.trim(), cor: getComputedStyle(r).color, bg: getComputedStyle(r).backgroundColor, bd: getComputedStyle(r).borderTopColor, deco: getComputedStyle(r).textDecorationLine }; });
    t(L + 'Editar perfil: botão "Remover foto" existe e é discreto (sem fundo nem borda, sublinhado)', !!fe2 && fe2.rem === 'Remover foto' && /rgba\(0, 0, 0, 0\)|transparent/.test(fe2.bg) && /rgba\(0, 0, 0, 0\)|transparent/.test(fe2.bd) && fe2.deco === 'underline', JSON.stringify(fe2));
    t(L + 'sem erros de JS', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
