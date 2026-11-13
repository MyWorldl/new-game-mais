// Corpo (Fase 7): KPIs com mini-gráficos + radar de músculos da semana. Uso: node corpo-v3.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const D = n => iso(Date.now() - n * 864e5);
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
const irCorpo = async p => { await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(1500); };
// cenário controlado: 3 dias recentes com séries de vários músculos + 1 treino fora da janela de 7 dias
const mkCtl = async (b, w, comTreino) => {
  const c = await b.newContext({ viewport: { width: w, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const exs = [{ nome: 'Supino reto', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Remada curvada', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }, { nome: 'Agachamento livre', series: 3, reps: '8-12', metaReps: 30, musculos: ['quadriceps', 'gluteos'] }];
  await p.evaluate(async ([exs, MAP, dias, comTreino]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.f7', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: dias[20] });
    for (const k of MAP) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: exs });
    if (comTreino) for (const i of [0, 1, 2, 8]) {
      const d = dias[i], k = MAP[new Date(d + 'T12:00:00').getDay()];
      const c = { data: d, dia: k, concluido: true, cargas: {}, sets: {}, progresso: {} };
      exs.forEach((e, idx) => { c.sets[idx] = [{ r: 10 }, { r: 10 }, { r: 9 }]; c.progresso[idx] = 29; });
      await db.doc('checkins/' + d).set(c);
    }
  }, [exs, MAP, Array.from({ length: 30 }, (_, i) => D(i)), comTreino]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p };
};
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, w, 'dark'); await irCorpo(p);
    const k = await p.evaluate(() => {
      const cards = [...document.querySelectorAll('#corpo-kpis .ck-card')];
      const res = [...document.querySelectorAll('#med-resumo .mr-i b')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const cols = new Set(cards.map(x => Math.round(x.getBoundingClientRect().left))).size;
      return { n: cards.length, rot: cards.map(x => x.querySelector('.ck-rot').textContent.trim()), val: cards.map(x => x.querySelector('.ck-val b').textContent.trim()), res, cols, minH: Math.min(...cards.map(x => x.getBoundingClientRect().height)), spark: cards.map(x => (x.querySelector('.ck-linha') ? x.querySelector('.ck-linha').getAttribute('points').trim().split(' ').length : 0)), lab: cards[0].getAttribute('aria-label'), esc: document.documentElement.scrollWidth <= innerWidth, pto: (() => { const q = cards[0].querySelector('.ck-ponto').getBoundingClientRect(); return Math.abs(q.width - q.height) < 1; })() };
    });
    t(w + ': 4 cartões KPI na ordem Peso, Cintura, % de gordura, IMC', JSON.stringify(k.rot) === JSON.stringify(['Peso', 'Cintura', '% de gordura', 'IMC']), JSON.stringify(k.rot));
    t(w + ': valores iguais aos do resumo do histórico (mesma conta do app)', k.val.join('|') === k.res.map(s => s.replace(/\s*(kg|cm|%)$/, '')).join('|'), k.val.join('|') + ' vs ' + k.res.join('|'));
    t(w + ': mini-gráfico com todos os pontos (9 medições)', k.spark.every(n => n === 9), k.spark.join(','));
    t(w + ': ponto final do mini-gráfico é redondo', k.pto);
    t(w + ': descrição por extenso (valor, variação, quando, últimas medições)', /^Peso: 74,5 kg, ▼ 11,8 kg desde \d\d\/\d\d, medido (hoje|ontem|há \d+ dias)\. Últimas 9 medições: de 86,3 a 74,5\.$/.test(k.lab) || /^Peso: 74,5 kg/.test(k.lab) && /Últimas 9 medições/.test(k.lab), k.lab);
    t(w + ': alvos ≥ 44 px e sem rolagem horizontal', k.minH >= 44 && k.esc, k.minH);
    t(w + ': colunas ' + (w >= 768 ? '4 no desktop' : '2 no celular'), k.cols === (w >= 768 ? 4 : 2), k.cols);
    if (w === 390) {
      await p.evaluate(() => document.querySelector('#corpo-kpis [data-ck="cintura"]').click()); await p.waitForTimeout(500);
      t('390: cartão Cintura abre a aba Cintura da Evolução', await p.evaluate(() => document.querySelector('#evolucao-tabs [data-metric="cintura"]').classList.contains('active')));
      await p.evaluate(() => document.querySelector('#corpo-kpis [data-ck="peso"]').click()); await p.waitForTimeout(500);
      t('390: cartão Peso abre a aba Peso da Evolução', await p.evaluate(() => document.querySelector('#evolucao-tabs [data-metric="peso"]').classList.contains('active')));
      // animação só na 1ª vez
      t('390: acendimento só na primeira abertura da aba (depois não repete)', await (async () => { await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(400); return true; })() && await (async () => { const r = await p.evaluate(async () => { document.getElementById('tab-corpo').click(); await new Promise(r => setTimeout(r, 120)); const a = document.getElementById('corpo-kpis').classList.contains('ck-anim'); await new Promise(r => setTimeout(r, 1300)); const d = document.getElementById('corpo-kpis').classList.contains('ck-anim'); return [a, d]; }); return r[1] === false; })());
    }
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  // nova medição atualiza os cartões
  {
    const { c, p } = await abre(b, 390, 'dark'); await irCorpo(p);
    await p.fill('#m-peso', '73.1'); await p.evaluate(() => document.querySelector('#form-medicao button[type="submit"], #form-medicao .btn.primary').click()); await p.waitForTimeout(1200);
    t('salvar nova medição atualiza o cartão de Peso', await p.evaluate(() => document.querySelector('#corpo-kpis [data-ck="peso"] .ck-val b').textContent.trim() === '73,1'), await p.evaluate(() => document.querySelector('#corpo-kpis [data-ck="peso"]').getAttribute('aria-label')));
    await c.close();
  }
  // estado vazio (sem medições)
  {
    const { c, p } = await mkCtl(b, 390, false); await irCorpo(p);
    t('sem medições: mensagem e botão', await p.evaluate(() => !!document.querySelector('#corpo-kpis .ck-vazio [data-ck="nova"]')));
    await p.evaluate(() => document.querySelector('[data-ck="nova"]').click()); await p.waitForTimeout(300);
    t('sem medições: botão leva o foco ao campo de peso', await p.evaluate(() => document.activeElement && document.activeElement.id === 'm-peso'));
    t('sem séries: radar mostra mensagem acolhedora e nenhum gráfico', await p.evaluate(() => /Nenhuma série registrada/.test(document.getElementById('musculos-body').innerText) && !document.querySelector('#musculos-body svg')));
    await c.close();
  }
  // radar com séries controladas
  {
    const { c, p } = await mkCtl(b, 390, true); await irCorpo(p);
    const r = await p.evaluate(() => {
      const lis = [...document.querySelectorAll('#musculos-body .radar-list li')].map(li => ({ k: li.querySelector('.radar-li-top span').textContent.trim(), tx: li.querySelector('.radar-li-top b').textContent.replace(/\s+/g, ' ').trim(), det: li.querySelector('small').textContent.trim() }));
      return { lis, lbls: [...document.querySelectorAll('#musculos-body .radar-lbl')].length, ins: document.querySelector('#musculos-body .ck-insights').innerText.replace(/\s+/g, ' '), esc: document.documentElement.scrollWidth <= innerWidth };
    });
    const get = k => r.lis.find(x => x.k === k) || {};
    t('radar: 6 grupos no gráfico e na lista', r.lbls === 6 && r.lis.length === 6, r.lbls + '/' + r.lis.length);
    t('radar: peito = 9 séries (treino fora dos 7 dias não conta) e 64%', get('Peito').tx === '9 séries · 64%', get('Peito').tx);
    t('radar: costas = 9 séries e 56%', get('Costas').tx === '9 séries · 56%', get('Costas').tx);
    t('radar: pernas = 18 séries (quadríceps e glúteos) e 39% (média dos 4 músculos)', get('Pernas').tx === '18 séries · 39%', get('Pernas').tx + ' | ' + get('Pernas').det);
    t('radar: ombros, braços e core em 0', ['Ombros', 'Braços', 'Core'].every(k => get(k).tx === '0 séries · 0%'));
    t('radar: texto de cada músculo mostra feito/ideal', /Quadríceps 9\/14/.test(get('Pernas').det) && /Glúteos 9\/10/.test(get('Pernas').det), get('Pernas').det);
    t('insights: mais trabalhado = Pernas (18 séries); ausentes listados sem cobrança', /Mais trabalhado nos últimos 7 dias: Pernas \(18 séries\)/.test(r.ins) && /Sem séries registradas em Ombros, Braços, Core/.test(r.ins) && /Sem cobrança/.test(r.ins), r.ins);
    t('radar: sem rolagem horizontal em 390', r.esc);
    await p.locator('#musculos-card').scrollIntoViewIfNeeded(); await p.waitForTimeout(300);
    await p.screenshot({ path: '/tmp/sp/f7-radar.png' });
    t('sem erro de console (cenário controlado)', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
    for (const w of [320, 1280]) {
      const x = await mkCtl(b, w, true); await irCorpo(x.p);
      t(w + ': radar sem rolagem horizontal', await x.p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await x.c.close();
    }
  }
  // movimento reduzido: sem animação nos cartões
  {
    const c = await b.newContext({ viewport: { width: 390, height: 900 }, reducedMotion: 'reduce' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'T', nomeUsuario: 't.f7', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: '2026-01-01' }); const d = new Date(); const i = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); await db.doc('medicoes/' + i).set({ pesoKg: 80, cinturaCm: 90, quadrilCm: 99, pescocoCm: 38 }); });
    await p.reload(); await p.waitForTimeout(1500); await irCorpo(p);
    t('movimento reduzido: cartões KPI sem animação', await p.evaluate(() => { const e = document.querySelector('#corpo-kpis .ck-card'); return !!e && getComputedStyle(e).animationName === 'none'; }));
    await c.close();
  }
  // contraste (axe)
  if (axeSrc) {
    const { c, p } = await abre(b, 390, 'dark');
    for (const k of ['lima', 'violeta', 'ouro', 'roxo', 'azul']) {
      await p.evaluate(k => { const el = document.documentElement, pastel = k === 'roxo' || k === 'azul'; if (pastel) { el.dataset.game = 'off'; el.dataset.tema = k; el.removeAttribute('data-paleta'); } else { el.dataset.game = 'on'; el.removeAttribute('data-tema'); if (k === 'lima') el.removeAttribute('data-paleta'); else el.setAttribute('data-paleta', k); } }, k);
      await irCorpo(p); await p.waitForTimeout(800);
      if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('view-corpo'), { runOnly: ['color-contrast', 'aria-allowed-attr', 'button-name'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' ') + ' :: ' + ((n.any[0] && n.any[0].message) || ''))); });
      t('axe Corpo em ' + k, v.length === 0, v.slice(0, 3).join(' | '));
    }
    await c.close();
    const m = await mkCtl(b, 390, true); await irCorpo(m.p);
    if (!(await m.p.evaluate(() => typeof axe !== 'undefined'))) await m.p.evaluate(axeSrc);
    const v = await m.p.evaluate(async () => { const r = await axe.run(document.getElementById('musculos-card'), { runOnly: ['color-contrast', 'aria-allowed-attr'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))); });
    t('axe no card de músculos com dados', v.length === 0, v.slice(0, 3).join(' | '));
    await m.c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
