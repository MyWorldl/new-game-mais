// Plano por situação: 60+, tempo curto, retorno após pausa e restrição articular, em todas as combinações de idade × nível × dias × local.
// Uso: node planos-situacoes.js http://localhost:8791
const { chromium } = require('playwright');
let bad = 0; const t = (n, c, x = '') => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const T = __ngTest, cfg = T.BASE_PLANOS, falhas = {}; let total = 0;
    const falha = (k, d) => { (falhas[k] = falhas[k] || []).length < 3 && falhas[k].push(d); };
    const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const trocasDe = k => k === 'idoso' ? cfg.idoso.trocas : cfg.restricoes[k].trocas;
    for (const idade of [15, 30, 65]) for (const exp of ['iniciante', 'intermediario', 'avancado']) for (const dias of [2, 3, 4, 5, 6])
      for (const local of ['academia', 'casa', 'pouco']) for (const tempo of [60, 45, 30]) for (const retorno of [false, true])
        for (const rs of [[], ['ombro'], ['joelho'], ['lombar'], ['ombro', 'joelho', 'lombar']]) for (const focos of [[], ['gluteos'], ['pernas', 'panturrilha'], ['costas', 'ombros'], ['bracos', 'abdomen']]) {
          total++;
          const perfil = { idade, experiencia: exp, diasSemana: dias, local, tempoMin: tempo, retorno, restricoes: rs, objetivo: 'manutencao', focos };
          const id = [idade, exp, dias, local, tempo, retorno, rs.join('+'), focos.join('+')].join('/');
          let plano; try { plano = T.planoInicial(perfil); } catch (e) { falha('erro', id + ' ' + e.message); continue; }
          const ativos = DIAS.filter(k => plano.rotina[k] && plano.rotina[k].ativo);
          if (!ativos.length) falha('sem dia ativo', id);
          if (idade >= 60 && ativos.length > cfg.idoso.maxSessoes) falha('60+ com mais de 4 sessões', id);
          const tot = {};
          ativos.forEach(k => {
            const exs = plano.rotina[k].exercicios;
            if (!exs.length) falha('dia vazio', id + ' ' + k);
            if (tempo === 30 && exs.length > 4) falha('30 min com mais de 4 exercícios', id + ' ' + k + ' ' + exs.length);
            if (tempo === 45 && exs.length > 5) falha('45 min com mais de 5 exercícios', id + ' ' + k);
            exs.forEach(e => {
              if (!T.fichaDoApp(e.nome)) falha('exercício sem ficha/guia', id + ' ' + e.nome);
              if (idade < 18 && (T.fichaDoApp(e.nome) || { idadeMin: 0 }).idadeMin > idade) falha('menor recebeu exercício acima do perfil', id + ' ' + e.nome);
              const m = /^(\d+)-(\d+)$/.exec(e.reps || '');
              if ((idade < 18 || exp === 'iniciante' || idade >= 60) && m && Number(m[1]) < 8) falha('reps abaixo de 8 para menor/iniciante/60+', id + ' ' + e.nome + ' ' + e.reps);
              if (idade < 18 && e.nome === 'Levantamento terra') falha('menor com terra', id);
              if (idade >= 60 && e.series > cfg.idoso.maxSeries) falha('60+ com mais de 3 séries', id + ' ' + e.nome);
              if (tempo === 30 && e.series > 3) falha('30 min com mais de 3 séries', id + ' ' + e.nome);
              if (retorno && e.series > 3) falha('retorno com séries altas', id + ' ' + e.nome + ' ' + e.series);
              (e.musculos || []).forEach(mu => { tot[mu] = (tot[mu] || 0) + e.series; });
              rs.forEach(rk => { if (Object.prototype.hasOwnProperty.call(trocasDe(rk), e.nome)) falha('restrição ' + rk + ' manteve ' + e.nome, id); });
              if (idade >= 60 && Object.prototype.hasOwnProperty.call(trocasDe('idoso'), e.nome)) falha('60+ manteve ' + e.nome, id);
            });
          });
          Object.keys(tot).forEach(mu => { if (T.MUSCLE_LANDMARKS[mu] && tot[mu] > T.MUSCLE_LANDMARKS[mu].mrv) falha('volume acima do MRV', id + ' ' + mu + ' ' + tot[mu]); });
          if (rs.length && !rs.every(rk => plano.porque.some(x => x === cfg.restricoes[rk].aviso))) falha('falta o aviso da restrição no texto', id);
        }
    // foco: mais séries/exercício no grupo escolhido; texto explica; 60+, retorno e 30 min ficam como antes
    const tot = (pl, mu) => { let s = 0; ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].forEach(k => { const d = pl.rotina[k]; if (d && d.ativo) d.exercicios.forEach(e => { if ((e.musculos || []).indexOf(mu) >= 0) s += e.series; }); }); return s; };
    const base = { idade: 30, experiencia: 'intermediario', diasSemana: 4, local: 'academia', objetivo: 'manutencao' };
    const f0 = T.planoInicial(base), f1 = T.planoInicial(Object.assign({}, base, { focos: ['gluteos'] }));
    const musDe = { gluteos: 'gluteos', ombros: 'ombros', panturrilha: 'panturrilha', bracos: 'biceps', abdomen: 'abdomen' }; const subiu = [], caiu = [];
    Object.keys(musDe).forEach(fk => { const a = tot(f0, musDe[fk]), b = tot(T.planoInicial(Object.assign({}, base, { focos: [fk] })), musDe[fk]); if (b > a) subiu.push(fk); if (b < a) caiu.push(fk); });
    const foco = { gluteosSobe: subiu.length > 0 && caiu.length === 0, subiu, caiu, texto: f1.porque.some(x => /^Foco em Glúteos/.test(x)), semTexto: !f0.porque.some(x => /^Foco em/.test(x)),
      idoso: !T.planoInicial(Object.assign({}, base, { idade: 65, focos: ['gluteos'] })).porque.some(x => /^Foco em/.test(x)),
      curto: tot(T.planoInicial(Object.assign({}, base, { tempoMin: 30, focos: ['gluteos'] })), 'gluteos') === tot(T.planoInicial(Object.assign({}, base, { tempoMin: 30 })), 'gluteos'),
      adicionados: f1.foco.adicionados };
    const sem = T.planoInicial({ idade: 30, experiencia: 'intermediario', diasSemana: 4, local: 'academia', objetivo: 'manutencao' });
    return { total, falhas, foco, semSit: sem.situacoes && sem.situacoes.ativa, porqueSem: sem.porque.length };
  });
  t('matriz de situações rodou sem erro', r.total === 3 * 3 * 5 * 3 * 3 * 2 * 5 * 5, r.total);
  Object.keys(r.falhas).forEach(k => t('invariante: ' + k, false, JSON.stringify(r.falhas[k])));
  t('nenhuma violação de invariante na matriz', Object.keys(r.falhas).length === 0, JSON.stringify(Object.keys(r.falhas)));
  t('foco soma séries no grupo escolhido e nunca reduz', r.foco.gluteosSobe, JSON.stringify({ subiu: r.foco.subiu, caiu: r.foco.caiu, add: r.foco.adicionados }));
  t('texto "por que" cita o foco; sem foco não cita', r.foco.texto && r.foco.semTexto);
  t('60+ e treino de 30 min não recebem séries extras de foco', r.foco.idoso && r.foco.curto);
  t('sem situação, o plano continua o de sempre (sem texto extra)', r.semSit === false);
  t('sem erro de página', errs.length === 0, errs.join('|'));
  await b.close(); process.exit(bad ? 1 : 0);
})();
