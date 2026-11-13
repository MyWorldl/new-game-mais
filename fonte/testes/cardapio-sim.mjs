// Simulação do motor do cardápio com as metas do app (calorieTarget + calcMacros).
// Cobre 5 jeitos de comer × 5 rotinas × 10 combinações de restrição × nº de refeições (padrão, 3, 4, 5, 6).
// Uso: node fonte/testes/cardapio-sim.mjs
import * as e from '../cardapio/engine.js';
const styles = ['omni', 'pesc', 'veg', 'vegan', 'lowc'], routs = ['tradicional', 'marmita', 'corrido', 'budget', 'fora'];
const RESTR = [
  {}, { nolact: 1 }, { nogluten: 1 }, { nolact: 1, nogluten: 1 },
  { noegg: 1 }, { nosoy: 1 }, { nofish: 1 }, { nonut: 1 }, { nopork: 1, nored: 1 },
  { noegg: 1, nolact: 1, nofish: 1 },   // combinação apertada: quase só carne, soja e feijão
];
const NREF = [undefined, 3, 4, 5, 6];
// perfis (peso kg, TDEE, idade): adultos de portes diferentes e menores de 18
const perfis = [[80, 2600, 27], [60, 2000, 30], [100, 3200, 35], [55, 2300, 16], [70, 2500, 17]];
let n = 0, viol = 0, vazias = 0, worstK = 0, minP = 9, vazSemAviso = 0, nrefErr = 0;
const badK = [], badP = [];
const viola = (f, id, c) => (c.style === 'vegan' && !f.vegan) || (c.style === 'veg' && !f.veg) || (c.style === 'pesc' && !(f.veg || f.fish)) ||
  (c.nolact && f.lact) || (c.nogluten && f.gluten) || (c.noegg && f.egg) || (c.nosoy && f.soy) || (c.nofish && f.fish) || (c.nonut && f.nut) ||
  (c.nopork && f.pork) || (c.nored && f.red) || (c.rout === 'budget' && !f.cheap) || ((c.style === 'omni' || c.style === 'lowc') && ['tofu', 'tvp', 'leiteS'].includes(id));
for (const [kg, tdee, age] of perfis) for (const objApp of ['deficit', 'manutencao', 'superavit']) {
  const menor = age < 18;
  const obj = (menor && objApp === 'deficit') ? 'manutencao' : objApp;           // espelha objetivoParaIdade()
  const kcal = obj === 'deficit' ? tdee * 0.80 : obj === 'superavit' ? tdee * (menor ? 1.05 : 1.10) : tdee;
  const protG = kg * (obj === 'deficit' ? 2.0 : 1.8);
  for (const style of styles) for (const rout of routs) for (const r of RESTR) for (const nref of NREF) {
    const cfg = { kg, age, kcalMeta: kcal, protG, style, rout, nref, ...r };
    if (menor && kcal < tdee - 1) viol++;
    const val = e.validaRestricoes(cfg);
    const esperado = rout === 'marmita' ? 5 : (nref || e.ROUT[rout].meals.length);
    for (let d = 0; d < 7; d++) {
      const day = e.buildDay(d, cfg); n++;
      if (day.meals.length !== esperado) nrefErr++;
      const dk = (day.tot.kcal - day.target.kcal) / day.target.kcal, pr = day.tot.P / day.target.P;
      worstK = Math.max(worstK, Math.abs(dk)); minP = Math.min(minP, pr);
      const tag = [kg, age, obj, style, rout, JSON.stringify(r), nref, d].join(' ');
      const semAviso = !val.avisos.length;
      if (Math.abs(dk) > 0.08) badK.push(tag + ' ' + (dk * 100).toFixed(1));
      if (pr < 0.9) badP.push({ style, rout, tag, semAviso });
      day.meals.forEach(m => {
        if (!m.items.length) { vazias++; if (semAviso) vazSemAviso++; }
        if (!e.horarioDe(m.slot, cfg)) nrefErr++;
        m.items.forEach(it => { if (viola(e.FOODS[it.id], it.id, cfg)) viol++; });
      });
    }
  }
}
// proteína abaixo de 90% só é aceitável quando a combinação é apertada (avisada pela tela) ou é veg/vegano em rotina barata ou com 3 refeições
const inesp = badP.filter(b => b.semAviso && !((b.style === 'vegan' || b.style === 'veg' || b.style === 'pesc') || b.rout === 'budget' || /,(3|4),/.test(b.tag.replace(/ /g, ',')) || /\{"no/.test(b.tag)));
console.log('dias simulados', n, '| violações', viol, '| refeições vazias', vazias, '(sem aviso na tela:', vazSemAviso + ') | erros de nº de refeições/horário', nrefErr);
console.log('pior desvio de kcal', (worstK * 100).toFixed(1) + '% | dias fora de ±8%:', badK.length);
console.log('menor proteína/meta', (minP * 100).toFixed(0) + '% | dias com proteína <90%:', badP.length, '| inesperados (onívoro sem filtro, 5+ refeições):', inesp.length);
const pct = x => (100 * (1 - x / n)).toFixed(1) + '%';
console.log('dias que fecham kcal ±8% e prot ≥90%:', pct(new Set([...badK.map(x => x.split(' ').slice(0, 8).join(' ')), ...badP.map(b => b.tag)]).size));
// base de alimentos: tamanho, nomes únicos e coerência energética (kcal ≈ 4P + 4C + 9G, com folga para fibra)
const ids = Object.keys(e.FOODS);
const incoerentes = ids.filter(id => { const [k, p, c, g] = e.FOODS[id].v; return !(k > 0) || Math.abs((4 * p + 4 * c + 9 * g - k) / k) > 0.30; });
const semPapel = ids.filter(id => !['prot', 'leg', 'carb', 'fruit', 'veg', 'fat'].includes(e.FOODS[id].role));
console.log('alimentos:', ids.length, '| nomes únicos:', new Set(ids.map(i => e.FOODS[i].n)).size, '| incoerentes:', incoerentes.join(',') || 'nenhum');
const baseRuim = ids.length < 60 || new Set(ids.map(i => e.FOODS[i].n)).size !== ids.length || incoerentes.length || semPapel.length;
// cada restrição nova realmente elimina os alimentos marcados e deixa algum alimento de proteína nas combinações viáveis
const checks = [['noegg', 'ovo'], ['nosoy', 'tofu'], ['nofish', 'salmao'], ['nonut', 'amendoim'], ['nopork', 'lombo'], ['nored', 'patinho'], ['nored', 'lombo']];
const restrErr = checks.filter(([k, id]) => e.allowed(id, { style: 'omni', rout: 'tradicional', [k]: true })).length;
if (restrErr) console.log('restrição que não elimina o alimento marcado:', restrErr);
if (viol || vazSemAviso || nrefErr || baseRuim || restrErr) process.exit(1);
