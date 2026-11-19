// Plano personalizado: o app HONRA os dias pedidos (iniciante até 5, os demais até 6; 60+ segue limitado), com aviso e séries enxutas acima do recomendado;
// foco só em pernas/glúteos com 6 dias usa a divisão com ênfase em pernas; e o editor gera o plano pelos dias e focos escolhidos (não só modelos prontos).
// Uso: node plano-personalizado.js http://localhost:8791
const { chromium } = require('playwright');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    const c = await b.newContext({ viewport: { width: w, height: 900 }, colorScheme: 'dark' });
    await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async hoje => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.pp', sexo: 'F', idade: 30, alturaCm: 165, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'iniciante', diasSemana: 5, local: 'academia', focos: ['gluteos'], criadoEm: hoje });
      await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 62 });
    }, iso(Date.now()));
    await p.reload(); await p.waitForTimeout(1600);

    // ---- motor: dias honrados ----
    const m = await p.evaluate(() => {
      const T = __ngTest, DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'], out = {};
      const base = { idade: 30, local: 'academia', objetivo: 'manutencao', focos: [] };
      const ativos = pl => DIAS.filter(k => pl.rotina[k] && pl.rotina[k].ativo && pl.rotina[k].exercicios.length).length;
      for (const exp of ['iniciante', 'intermediario', 'avancado']) for (const d of [2, 3, 4, 5, 6]) { const pl = T.planoInicial(Object.assign({}, base, { experiencia: exp, diasSemana: d })); out[exp + d] = { n: ativos(pl), s: pl.sessoes, maxSeries: Math.max(...DIAS.flatMap(k => (pl.rotina[k].exercicios || []).map(e => e.series)), 0), porque: pl.porque.join(' | '), split: pl.split }; }
      const idoso = T.planoInicial(Object.assign({}, base, { idade: 65, experiencia: 'intermediario', diasSemana: 6 }));
      out.idoso = { n: ativos(idoso), max: T.BASE_PLANOS.idoso.maxSessoes };
      return out;
    });
    t(L + 'iniciante pede 4 e 5 dias: recebe 4 e 5 sessões (não trava em 3)', m.iniciante4.n === 4 && m.iniciante5.n === 5, m.iniciante4.n + ',' + m.iniciante5.n);
    t(L + 'iniciante pede 6: teto de 5 sessões, com explicação', m.iniciante6.n === 5 && /Você escolheu 6 dias/.test(m.iniciante6.porque), m.iniciante6.n);
    t(L + 'intermediário e avançado recebem os 6 dias pedidos', m.intermediario6.n === 6 && m.avancado6.n === 6 && m.intermediario5.n === 5);
    t(L + 'até 3 dias o iniciante continua sem aviso de excesso', !/mais do que os/.test(m.iniciante3.porque) && !/mais do que os/.test(m.intermediario4.porque) && !/mais do que os/.test(m.avancado6.porque));
    t(L + 'acima do recomendado: aviso claro e séries enxutas (máx. 3 por exercício)', /pediu 4 dias, mais do que os 3/.test(m.iniciante4.porque) && /pediu 5 dias/.test(m.iniciante5.porque) && m.iniciante4.maxSeries <= 3 && m.iniciante5.maxSeries <= 3 , m.iniciante4.maxSeries + ',' + m.iniciante5.maxSeries);
    t(L + '60+ continua limitado pelas sessões seguras', m.idoso.n <= m.idoso.max, JSON.stringify(m.idoso));

    // ---- foco só em pernas/glúteos com 6 dias ----
    const f = await p.evaluate(() => {
      const T = __ngTest, DIAS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'];
      const tot = (pl, mu) => DIAS.reduce((s, k) => s + (pl.rotina[k].exercicios || []).reduce((a, e) => a + ((e.musculos || []).indexOf(mu) >= 0 ? e.series : 0), 0), 0);
      const baixo = pl => ['gluteos', 'quadriceps', 'posterior'].reduce((s, mu) => s + tot(pl, mu), 0);
      const base = { idade: 30, experiencia: 'intermediario', diasSemana: 6, local: 'academia', objetivo: 'manutencao' };
      const a = T.planoInicial(Object.assign({}, base, { focos: ['gluteos'] })), z = T.planoInicial(Object.assign({}, base, { focos: [] })), mix = T.planoInicial(Object.assign({}, base, { focos: ['gluteos', 'peito'] }));
      return { a: a.split, z: z.split, mix: mix.split, gA: baixo(a), gZ: baixo(z), pA: tot(a, 'peito'), pZ: tot(z, 'peito'), txt: a.porque[0] };
    });
    t(L + 'foco em glúteos + 6 dias: divisão com ênfase em pernas (mais séries de perna, menos de peito)', /Pernas e glúteos/.test(f.a) && f.gA > f.gZ && f.pA < f.pZ && /Peito, Costas e Pernas/.test(f.z) && /Peito, Costas e Pernas/.test(f.mix), JSON.stringify(f));
    t(L + 'texto explica a divisão para o foco', /pernas e glúteos 3×/.test(f.txt), f.txt);

    // ---- editor: gerar plano pelos dias e focos (além dos modelos prontos) ----
    await p.evaluate(() => { document.getElementById('tab-treino').click(); }); await p.waitForTimeout(700);
    await p.evaluate(() => document.getElementById('btn-edit-rotina').click()); await p.waitForTimeout(500);
    t(L + 'editor tem "Gerar um plano para mim", além dos modelos', await p.locator('#rotina-gen').count() === 1 && await p.locator('#rotina-template-select').count() === 1 && /Gerar um plano para mim/.test(await p.locator('#rotina-gen-t').innerText()));
    const ini = await p.evaluate(() => ({ dias: document.getElementById('rg-dias').value, foc: [...document.querySelectorAll('[data-rg-foco][aria-pressed="true"]')].map(x => x.dataset.rgFoco).join(), n: document.querySelectorAll('[data-rg-foco]').length }));
    t(L + 'começa com os dias e o foco do perfil e lista os 9 focos', ini.dias === '5' && ini.foc === 'gluteos' && ini.n === 9, JSON.stringify(ini));
    // foco: máximo 2; corpo todo é exclusivo
    const cl = sel => p.evaluate(s => document.querySelector(s).click(), sel);
    await cl('[data-rg-foco="costas"]'); await cl('[data-rg-foco="ombros"]');
    const dois = await p.evaluate(() => [...document.querySelectorAll('[data-rg-foco][aria-pressed="true"]')].map(x => x.dataset.rgFoco).join());
    t(L + 'no máximo 2 focos (o mais antigo sai)', dois === 'costas,ombros', dois);
    await cl('[data-rg-foco="corpo_todo"]');
    t(L + 'corpo todo é exclusivo', (await p.evaluate(() => [...document.querySelectorAll('[data-rg-foco][aria-pressed="true"]')].map(x => x.dataset.rgFoco).join())) === 'corpo_todo');
    await cl('[data-rg-foco="corpo_todo"]'); await cl('[data-rg-foco="gluteos"]'); await cl('[data-rg-foco="pernas"]');
    await p.evaluate(() => { const s = document.getElementById('rg-dias'); s.value = '6'; s.dispatchEvent(new Event('change', { bubbles: true })); });
    await cl('#rotina-gerar'); await p.waitForTimeout(500);
    const g = await p.evaluate(() => ({ resumo: document.getElementById('rotina-gen-resumo').textContent, ativos: [...document.querySelectorAll('#rotina-editor-days [data-key] .d-ativo')].filter(x => x.checked).length, nomes: [...document.querySelectorAll('#rotina-editor-days [data-key] .d-nome')].map(x => x.value).join('|') }));
    t(L + 'gerar com 6 dias: iniciante recebe 5 treinos, e o resumo na tela explica o teto', g.ativos === 5 && /5 treinos por semana/.test(g.resumo) && /Você escolheu 6 dias/.test(g.resumo), JSON.stringify(g).slice(0, 260));
    // salvar grava a rotina gerada
    await cl('#rotina-save'); await p.waitForTimeout(1200);
    const salvo = await p.evaluate(() => { const s = __ngTest.state(); return ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom'].filter(k => s.rotina[k] && s.rotina[k].ativo && s.rotina[k].exercicios.length).length; });
    t(L + 'salvar rotina grava o plano gerado (5 dias com exercícios)', salvo === 5, salvo);
    t(L + 'sem erro de script', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  await b.close(); console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
