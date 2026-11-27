// PR B (ng-modular-70): nome acessível do pop-up, descanso (barra fixa + aviso de fim), Editar rotina por dia,
// contadores da semana/mês desde o cadastro, estados vazios compactos, rodapé da barra de navegação (guarda do P2.4).
// Uso: node pr-b-ajustes.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const hoje = iso(Date.now()), kH = MAP[new Date(hoje + 'T00:00:00').getDay()];
const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
async function abre(b, w, diasDeConta, touch) {
  const c = await b.newContext({ viewport: { width: w, height: 800 }, hasTouch: !!touch, isMobile: !!touch, reducedMotion: 'reduce' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('bff_rest_auto', '0'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const criado = iso(Date.now() - diasDeConta * 864e5);
  await p.evaluate(async ([criado, exs, DIAS]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.pb', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: criado });
    for (const k of DIAS) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
  }, [criado, exs, DIAS]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p, criado };
}
(async () => {
  const b = await chromium.launch();
  // 1) pop-up do exercício: nome acessível + descanso
  { const { c, p } = await abre(b, 390, 1, true);
    await p.evaluate(() => { const bt = document.getElementById('btn-treino-ao-vivo'); bt.dataset.acao = 'treino'; bt.click(); }); await p.waitForTimeout(700);
    const nome = () => p.evaluate(() => { const m = document.querySelector('.modal-backdrop [role=dialog], .modal[role=dialog]'); if (!m) return null; const id = m.getAttribute('aria-labelledby'); const el = id && document.getElementById(id); return { label: m.getAttribute('aria-label'), lab: el ? el.textContent.trim() : null }; });
    const n1 = await nome();
    const lido1 = n1 && (n1.lab || n1.label) || '';
    t('pop-up: o nome acessível é o do exercício, não "Janela"', /Supino reto/.test(lido1) && !/^Janela$/.test(lido1), JSON.stringify(n1));
    await p.locator('.live-workout .lw-nav button').last().click(); await p.waitForTimeout(600);
    const n2 = await nome(); const lido2 = n2 && (n2.lab || n2.label) || '';
    t('pop-up: ao ir para o próximo exercício o nome acessível acompanha', /Remada curvada/.test(lido2), JSON.stringify(n2));
    // descanso: barra fixa enquanto roda e aviso quando termina
    await p.clock.install(); await p.locator('[data-rest]').first().click(); await p.waitForTimeout(100);
    const pos = await p.evaluate(() => { const r = document.querySelector('.live-workout .quest-rest-row.running'); return r ? getComputedStyle(r).position : null; });
    t('descanso: a barra do cronômetro fica fixa (sticky) enquanto roda', pos === 'sticky', pos);
    await p.clock.runFor(125000); await p.waitForTimeout(200);
    const fim = await p.evaluate(() => { const e = document.querySelector('.live-workout .rest-fim'); return e ? e.textContent.trim() : null; });
    t('descanso: ao terminar aparece "Descanso concluído: pode fazer a próxima série"', !!fim && /Descanso conclu/.test(fim), fim);
    t('pop-up: sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  // 2) Editar rotina por dia
  for (const w of [390, 1280]) { const { c, p } = await abre(b, w, 90, w < 600);
    await p.evaluate(() => document.getElementById('btn-edit-rotina').click()); await p.waitForTimeout(700);
    const est = () => p.evaluate(() => ({ abas: document.querySelectorAll('#re-tabs .re-tab').length, vis: [...document.querySelectorAll('#rotina-editor-days .re-day')].filter(s => !s.hidden).map(s => s.dataset.key), sel: (document.querySelector('#re-tabs .re-tab[aria-pressed=true]') || {}).dataset && document.querySelector('#re-tabs .re-tab[aria-pressed=true]').dataset.dia }));
    let e = await est();
    t(w + ': Editar rotina tem 7 abas e mostra só o dia de hoje', e.abas === 7 && e.vis.length === 1 && e.vis[0] === kH && e.sel === kH, JSON.stringify(e));
    const outro = DIAS.find(k => k !== kH);
    await p.locator('#re-tabs .re-tab[data-dia="' + outro + '"]').click(); await p.waitForTimeout(300);
    e = await est();
    t(w + ': tocar em outra aba troca o dia visível', e.vis.length === 1 && e.vis[0] === outro && e.sel === outro, JSON.stringify(e));
    const acoes = await p.evaluate(() => { const r = document.getElementById('rotina-save').getBoundingClientRect(); return { b: Math.round(r.bottom), h: innerHeight, pos: getComputedStyle(document.querySelector('.re-actions')).position }; });
    t(w + ': "Salvar rotina" fica à vista sem rolar até o fim', acoes.b <= acoes.h && acoes.pos === 'sticky', JSON.stringify(acoes));
    await p.evaluate(outro => { const s = document.querySelector('#rotina-editor-days .re-day[data-key="' + outro + '"] .d-ativo'); s.click(); }, outro); await p.waitForTimeout(200);
    const marca = await p.evaluate(outro => document.querySelector('#re-tabs .re-tab[data-dia="' + outro + '"]').textContent.trim(), outro);
    t(w + ': desligar "Dia de treino" marca a aba como folga', /folga/.test(marca), marca);
    await p.locator('#rotina-save').click(); await p.waitForTimeout(900);
    await p.evaluate(() => document.getElementById('btn-edit-rotina').click()); await p.waitForTimeout(700);   // reabre e lê o que ficou gravado
    const salvo = await p.evaluate(() => [...document.querySelectorAll('#rotina-editor-days .re-day')].map(s => [s.dataset.key, s.querySelector('.d-ativo').checked, s.querySelectorAll('.ex-entry').length]));
    t(w + ': salvar grava os 7 dias (todos com exercícios) e só o dia desligado vira folga', salvo.length === 7 && salvo.every(([k, a, n]) => n === 2 && a === (k !== outro)), JSON.stringify(salvo));
    t(w + ': sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  // 3) contadores da semana/mês desde o cadastro
  for (const dias of [0, 90]) { const { c, p, criado } = await abre(b, 390, dias, true);
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ w: document.getElementById('week-label').textContent, m: document.getElementById('month-label').textContent, wt: document.getElementById('week-label').title }));
    const seg = new Date(hoje + 'T00:00:00'); seg.setDate(seg.getDate() - ((seg.getDay() + 6) % 7));
    let esperaS = 0; for (let i = 0; i < 7; i++) { const d = new Date(seg); d.setDate(seg.getDate() + i); if (iso(d) >= criado) esperaS++; }
    let esperaM = 0; const [y, m] = hoje.split('-'); for (let d = 1; d <= Number(hoje.split('-')[2]); d++) { const di = y + '-' + m + '-' + String(d).padStart(2, '0'); if (di >= criado) esperaM++; }
    t('conta de ' + dias + ' dias: total da semana = ' + esperaS + ' e do mês = ' + esperaM + ' (desde o cadastro)', new RegExp('de ' + esperaS + ' treinos').test(r.w) && new RegExp('de ' + esperaM + ' treinos').test(r.m), JSON.stringify(r));
    t('conta de ' + dias + ' dias: o rótulo da semana explica a diferença para a meta', /meta da semana/i.test(r.wt), r.wt);
    await c.close(); }
  // 4) estados vazios compactos (gráfico de peso + Meta de peso + Ajuste pelo resultado, sem medições)
  { const { c, p } = await abre(b, 390, 3, true);
    await p.evaluate(async hoje => { const db = await window.claude.use('db'); await db.doc('medicoes/' + hoje).set({ pesoKg: 80, cinturaCm: 90, quadrilCm: 100, pescocoCm: 38 }); }, hoje);   // 1 medição: já há "peso considerado", mas ainda não há curva (<2) nem meta
    await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(900);
    const r = await p.evaluate(() => {
      const graf = document.querySelector('#weight-chart').closest('.chart-wrap');
      const vaz = document.getElementById('weight-chart-empty');
      const meta = document.getElementById('meta-peso-body'), aj = document.getElementById('ajuste-body');
      return { grafOculto: graf.hidden, cartaoNaoOculto: !vaz.hidden, view: (document.getElementById('cc-peso').closest('[id^=view-]') || {}).id,
        metaCompacta: !!meta.querySelector('.empty-state.compact [data-empty-go="perfil"]'), metaTxt: meta.textContent.trim().slice(0, 80),
        ajusteCompacto: !!aj.querySelector('.empty-state.compact [data-empty-go="medir"]'), ajTxt: aj.textContent.trim().slice(0, 80) };
    });
    t('sem medições: a área em branco do gráfico de peso some e o cartão com botão fica ativo', r.grafOculto && r.cartaoNaoOculto, JSON.stringify(r));
    t('sem medições: "Meta de peso" usa cartão compacto com botão "Definir meta"', r.metaCompacta, JSON.stringify(r));
    t('sem medições: "Ajuste pelo resultado" usa cartão compacto com botão "Registrar peso"', r.ajusteCompacto, JSON.stringify(r));
    const alt = await p.evaluate(() => { const e = document.querySelector('#meta-peso-body .empty-state.compact'); return e ? Math.round(e.getBoundingClientRect().height) : null; });
    t('o cartão compacto da meta de peso é baixo (até 190 px a 390 px; antes passava de 350 px)', alt !== null && alt <= 190, 'alt=' + alt);
    const ico = await p.evaluate(() => { const u = document.querySelector('#meta-peso-body .empty-ill use'); const id = u && u.getAttribute('href').slice(1); return { id, existe: !!(id && document.getElementById(id)) }; });
    t('o ícone do cartão da meta de peso existe no conjunto de ícones (não fica círculo vazio)', ico.existe, JSON.stringify(ico));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  // 5) guarda do P2.4: o fim do conteúdo nunca fica atrás da barra de baixo (390 px, toque)
  { const { c, p } = await abre(b, 390, 30, true);
    for (const aba of ['painel', 'treino', 'dieta', 'corpo', 'perfil']) {
      await p.evaluate(a => document.getElementById('tab-' + a).click(), aba); await p.waitForTimeout(600);
      await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(300);
      const r = await p.evaluate(() => { const nav = document.querySelector('.tabs, #bottomnav, nav.tabbar, .bottomnav') || document.getElementById('tab-painel').parentElement; const m = document.getElementById('main'); const filhos = [...m.querySelectorAll(':scope > section:not([hidden]), :scope > div:not([hidden])')].filter(e => e.getBoundingClientRect().height > 0); const fim = Math.max(...filhos.map(e => e.getBoundingClientRect().bottom)); return { fim: Math.round(fim), topoNav: Math.round(nav.getBoundingClientRect().top) }; });
      t('barra de baixo: o fim do conteúdo da aba ' + aba + ' fica acima dela', r.fim <= r.topoNav + 1, JSON.stringify(r));
    }
    await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
