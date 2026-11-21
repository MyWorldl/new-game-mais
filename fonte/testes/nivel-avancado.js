// Nível no plano inicial: intermediário/avançado recebem versões mais exigentes; iniciante, menores, 60+, retorno, restrição e casa não.
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
      menor: mk({ experiencia: 'avancado', idade: 17 }).nivel.length,
      idoso: mk({ experiencia: 'avancado', idade: 62 }).nivel.length,
      retorno: mk({ experiencia: 'avancado', retorno: true }).nivel.length,
      restr: mk({ experiencia: 'avancado', restricoes: ['joelho'] }).nivel.length,
      casa: mk({ experiencia: 'avancado', local: 'casa' }).nivel.length,
      porqueInter: inter.porque.some(x => /^Nível intermediário/.test(x)), porqueAdv: adv.porque.some(x => /^Nível avançado/.test(x)),
      porqueSit: mk({ experiencia: 'avancado', idade: 62 }).porque.some(x => /pede exercícios mais conservadores/.test(x)),
      porqueIni: ini.porque.some(x => /^Nível /.test(x)),
      avancadoRotina: nomes(adv).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin === 'avancado'; }),
      interSemAvancado: inter.nivel.map(x => x.para).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin === 'avancado'; }),
      iniSemAvancado: nomes(ini).filter(n => { const f = T.fichaDoApp(n); return f && f.nivelMin !== 'iniciante' && !['Barra fixa (ou puxada frente)', 'Remada curvada com barra', 'Crucifixo (voador)', 'Elevação de pernas', 'Levantamento terra'].includes(n); })
    };
    // varredura: nunca repete exercício no dia, todo exercício trocado é permitido ao perfil, no máximo N trocas por dia
    let total = 0; const falhas = {};
    const falha = (k, d) => { (falhas[k] = falhas[k] || []).length < 3 && falhas[k].push(d); };
    for (const exp of ['intermediario', 'avancado']) for (const dias of [2, 3, 4, 5, 6]) for (const idade of [14, 18, 30, 45]) for (const local of ['academia', 'casa', 'pouco']) for (const focos of [[], ['gluteos'], ['costas', 'ombros']]) {
      total++;
      const perfil = { idade, experiencia: exp, diasSemana: dias, local, objetivo: 'manutencao', focos };
      const pl = T.planoInicial(perfil), id = [exp, dias, idade, local, focos.join('+')].join('/');
      DIAS.forEach(k => { const d = pl.rotina[k]; if (!d || !d.ativo) return; const n = d.exercicios.map(e => e.nome); if (new Set(n).size !== n.length) falha('repetido', id + ' ' + k + ' ' + n.join()); });
      pl.nivel.forEach(tr => { if (!T.exercicioAdequadoAoPerfil(tr.para, perfil)) falha('inadequado', id + ' ' + tr.para); });
      const porDia = {}; pl.nivel.forEach(tr => { porDia[tr.dia] = (porDia[tr.dia] || 0) + 1; });
      const max = exp === 'avancado' ? 3 : 2; Object.keys(porDia).forEach(k => { if (porDia[k] > max) falha('limite', id + ' ' + k); });
      if ((idade < 18 || local !== 'academia') && pl.nivel.length) falha('proibido', id);
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
  t('menor de 18 avançado: nenhuma troca', r.menor === 0);
  t('60+ avançado: nenhuma troca e texto explica', r.idoso === 0 && r.porqueSit);
  t('retorno após pausa: nenhuma troca', r.retorno === 0);
  t('restrição articular (joelho): nenhuma troca', r.restr === 0);
  t('em casa: nenhuma troca', r.casa === 0);
  t('varredura de ' + r.total + ' combinações: sem repetido, sem inadequado, dentro do limite e sem troca proibida', Object.keys(r.falhas).length === 0, JSON.stringify(r.falhas));
  t('sem erro de página', errs.length === 0, errs.join('|'));
  await b.close();
  console.log(`\n${ok} passaram, ${bad} falharam`);
  process.exit(bad ? 1 : 0);
})();
