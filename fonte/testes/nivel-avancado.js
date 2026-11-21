// Nível no plano inicial: intermediário/avançado recebem versões mais exigentes em TODOS os grupos (academia, casa, menor de 18, 60+, retorno, restrição), cada um pela sua tabela; iniciante não.
// Uso: node nivel-avancado.js http://localhost:8791
const { chromium } = require('playwright');
let bad = 0, ok = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const T = __ngTest, DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
    const nomes = pl => DIAS.flatMap(k => (pl.rotina[k] && pl.rotina[k].ativo ? pl.rotina[k].exercicios : []).map(e => e.nome));
    const base = { idade: 30, diasSemana: 4, local: 'academia', objetivo: 'manutencao' };
    const mk = o => T.planoInicial(Object.assign({}, base, o));
    const ini = mk({ experiencia: 'iniciante' }), inter = mk({ experiencia: 'intermediario' }), adv = mk({ experiencia: 'avancado' });
    const out = {
      ini: ini.nivel.length, inter: inter.nivel, adv: adv.nivel,
      advMais: adv.nivel.length >= inter.nivel.length,
      menor: mk({ experiencia: 'avancado', idade: 17 }),
      idoso: mk({ experiencia: 'avancado', idade: 62, diasSemana: 5 }),
      retorno: mk({ experiencia: 'avancado', retorno: true }),
      restr: mk({ experiencia: 'avancado', restricoes: ['ombro'], diasSemana: 5 }),
      casa: mk({ experiencia: 'avancado', local: 'casa', diasSemana: 5 }),
      pouco: mk({ experiencia: 'intermediario', local: 'pouco', diasSemana: 5 }),
      porqueInter: inter.porque.some(x => /^Nível intermediário/.test(x)), porqueAdv: adv.porque.some(x => /^Nível avançado/.test(x)),
      porqueIni: ini.porque.some(x => /^Nível /.test(x)),
      avancadoRotina: nomes(adv).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin === 'avancado'; }),
      interSemAvancado: inter.nivel.map(x => x.para).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin === 'avancado'; }),
      iniSemAvancado: nomes(ini).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin !== 'iniciante' && !['Barra fixa (ou puxada frente)', 'Remada curvada com barra', 'Crucifixo (voador)', 'Elevação de pernas', 'Levantamento terra'].includes(n); })
    };
    const resumo = pl => ({ n: pl.nivel.length, trocas: pl.nivel, porque: pl.porque.some(x => /^Nível /.test(x)), reps: pl.nivel.map(tr => { const d = pl.rotina[tr.dia]; const e = d.exercicios.find(x => x.nome === tr.para); return e && e.reps; }) });
    ['menor', 'idoso', 'retorno', 'restr', 'casa', 'pouco'].forEach(k => { out[k] = resumo(out[k]); });
    out.fichaNivel = {}; out.fichaLocal = {};
    ['menor', 'idoso', 'retorno', 'restr', 'casa', 'pouco'].forEach(k => out[k].trocas.forEach(tr => { const f = T.fichaDoApp(tr.para); if (f) { out.fichaNivel[tr.para] = f.nivelMin; out.fichaLocal[tr.para] = f.local; } }));
    out.idosoBloqueados = Object.keys(T.BASE_PLANOS.idoso.trocas);
    out.ombroBloqueados = Object.keys(T.BASE_PLANOS.restricoes.ombro.trocas).concat(T.BASE_PLANOS.niveis.situacao.evita.ombro);
    out.idosoEvita = T.BASE_PLANOS.niveis.situacao.evita.idoso;
    // varredura: nunca repete exercício no dia, todo exercício trocado é permitido ao perfil, no máximo N trocas por dia
    let total = 0; const falhas = {};
    const falha = (k, d) => { (falhas[k] = falhas[k] || []).length < 3 && falhas[k].push(d); };
    for (const exp of ['intermediario', 'avancado']) for (const dias of [2, 3, 4, 5, 6]) for (const idade of [14, 18, 30, 45]) for (const sitx of [{}, { idade: 62 }, { retorno: true }, { restricoes: ['joelho'] }, { restricoes: ['ombro', 'lombar'] }]) for (const local of ['academia', 'casa', 'pouco']) for (const focos of [[], ['gluteos'], ['costas', 'ombros']]) {
      total++;
      const perfil = Object.assign({ idade, experiencia: exp, diasSemana: dias, local, objetivo: 'manutencao', focos }, sitx); if (sitx.idade && idade < 60) perfil.idade = sitx.idade;
      const pl = T.planoInicial(perfil), id = [exp, dias, perfil.idade, local, focos.join('+'), JSON.stringify(sitx)].join('/');
      if (sitx.idade || sitx.retorno || sitx.restricoes) { const pd = {}; pl.nivel.forEach(tr => { pd[tr.dia] = (pd[tr.dia] || 0) + 1; }); if (Object.keys(pd).some(k => pd[k] > 1)) falha('situacao-limite', id);
        const B = new Set(); if (sitx.idade) Object.keys(T.BASE_PLANOS.idoso.trocas).concat(T.BASE_PLANOS.niveis.situacao.evita.idoso).forEach(n => B.add(n));
        (sitx.restricoes || []).forEach(k => Object.keys(T.BASE_PLANOS.restricoes[k].trocas).concat(T.BASE_PLANOS.niveis.situacao.evita[k] || []).forEach(n => B.add(n)));
        pl.nivel.forEach(tr => { if (B.has(tr.para) || B.has(tr.de)) falha('situacao-reintroduz', id + ' ' + tr.de + '→' + tr.para); }); }
      DIAS.forEach(k => { const d = pl.rotina[k]; if (!d || !d.ativo) return; const n = d.exercicios.map(e => e.nome); if (new Set(n).size !== n.length) falha('repetido', id + ' ' + k + ' ' + n.join()); });
      pl.nivel.forEach(tr => { if (!T.exercicioAdequadoAoPerfil(tr.para, perfil)) falha('inadequado', id + ' ' + tr.para); });
      const porDia = {}; pl.nivel.forEach(tr => { porDia[tr.dia] = (porDia[tr.dia] || 0) + 1; });
      const max = exp === 'avancado' ? 3 : 2; Object.keys(porDia).forEach(k => { if (porDia[k] > max) falha('limite', id + ' ' + k); });
      pl.nivel.forEach(tr => { const f = T.fichaDoApp(tr.para); if (f && f.local && f.local.indexOf(local) < 0) falha('equipamento', id + ' ' + tr.para); });
      if (idade < 18) { pl.nivel.forEach(tr => { const e = pl.rotina[tr.dia].exercicios.find(x => x.nome === tr.para); if (e && /^(5-8|6-10)$/.test(e.reps)) falha('menor-carga-maxima', id + ' ' + tr.para + ' ' + e.reps); if (Object.keys(porDia).some(k => porDia[k] > 2)) falha('menor-limite', id); }); }
    }
    out.total = total; out.falhas = falhas;
    return out;
  });
  t('iniciante não ganha nenhuma troca de nível nem texto de nível', r.ini === 0 && !r.porqueIni);
  t('intermediário (30 anos, academia, 4 dias) ganha trocas', r.inter.length > 0, JSON.stringify(r.inter));
  t('avançado ganha ao menos tantas trocas quanto o intermediário', r.adv.length > 0 && r.advMais, r.adv.length + ' vs ' + r.inter.length);
  t('avançado recebe exercício de ficha avançada no plano', r.avancadoRotina.length > 0, r.avancadoRotina.join('|'));
  t('intermediário nunca ganha troca para ficha avançada', r.interSemAvancado.length === 0, r.interSemAvancado.join('|'));
  t('texto "por que" explica o nível (intermediário e avançado)', r.porqueInter && r.porqueAdv);
  t('menor de 18 (avançado) também sobe de nível, sem ficha avançada e sem série de carga máxima', r.menor.n > 0 && r.menor.trocas.every(tr => { const f = r.fichaNivel[tr.para]; return f && f !== 'avancado'; }) && r.menor.reps.every(x => !/^(5-8|6-10)$/.test(x)) && r.menor.porque, JSON.stringify(r.menor.trocas) + ' ' + r.menor.reps);
  t('60+ (avançado) sobe de nível com 1 troca por dia no máximo, sem reintroduzir o que a regra do 60+ troca', r.idoso.n > 0 && r.idoso.porque && r.idoso.trocas.every(tr => !r.idosoBloqueados.includes(tr.para) && !r.idosoBloqueados.includes(tr.de) && !r.idosoEvita.includes(tr.para)), JSON.stringify(r.idoso.trocas));
  t('retorno após pausa também sobe de nível', r.retorno.n > 0 && r.retorno.porque, JSON.stringify(r.retorno.trocas));
  t('restrição articular (ombro) também sobe de nível sem tocar no que a restrição evita', r.restr.n > 0 && r.restr.trocas.every(tr => !r.ombroBloqueados.includes(tr.para) && !r.ombroBloqueados.includes(tr.de)), JSON.stringify(r.restr.trocas));
  t('em casa sobe de nível só com exercício de casa', r.casa.n > 0 && r.casa.trocas.every(tr => r.fichaLocal[tr.para] ? r.fichaLocal[tr.para].includes('casa') : true), JSON.stringify(r.casa.trocas));
  t('pouco equipamento sobe de nível só com exercício que não pede equipamento', r.pouco.n > 0 && r.pouco.trocas.every(tr => r.fichaLocal[tr.para] ? r.fichaLocal[tr.para].includes('pouco') : true), JSON.stringify(r.pouco.trocas));
  t('varredura de ' + r.total + ' combinações: sem repetido, sem inadequado, dentro do limite e sem troca proibida', Object.keys(r.falhas).length === 0, JSON.stringify(r.falhas));
  t('sem erro de página', errs.length === 0, errs.join('|'));
  await b.close();
  console.log(`\n${ok} passaram, ${bad} falharam`);
  process.exit(bad ? 1 : 0);
})();
