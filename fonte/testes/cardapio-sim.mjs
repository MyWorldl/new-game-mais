// Simulação do motor do cardápio com as metas do app (calorieTarget + calcMacros).
// Uso: node fonte/testes/cardapio-sim.mjs
import * as e from '../cardapio/engine.js';
const styles = ['omni', 'veg', 'vegan', 'lowc'], routs = ['tradicional', 'marmita', 'corrido', 'budget', 'fora'];
const restr = [[0, 0], [1, 0], [0, 1], [1, 1]];
// perfis (peso kg, TDEE, idade): adultos de portes diferentes e menores de 18
const perfis = [[80, 2600, 27], [60, 2000, 30], [100, 3200, 35], [55, 2300, 16], [70, 2500, 17]];
let n = 0, viol = 0, vazias = 0, worstK = 0, minP = 9;
const badK = [], badP = [];
for (const [kg, tdee, age] of perfis) for (const objApp of ['deficit', 'manutencao', 'superavit']) {
  const menor = age < 18;
  const obj = (menor && objApp === 'deficit') ? 'manutencao' : objApp;           // espelha objetivoParaIdade()
  const kcal = obj === 'deficit' ? tdee * 0.80 : obj === 'superavit' ? tdee * (menor ? 1.05 : 1.10) : tdee;
  const protG = kg * (obj === 'deficit' ? 2.0 : 1.8);
  for (const style of styles) for (const rout of routs) for (const [nl, ng] of restr) {
    const cfg = { kg, age, kcalMeta: kcal, protG, style, rout, nolact: !!nl, nogluten: !!ng };
    if (menor && kcal < tdee - 1) viol++;
    for (let d = 0; d < 7; d++) {
      const day = e.buildDay(d, cfg); n++;
      const dk = (day.tot.kcal - day.target.kcal) / day.target.kcal, pr = day.tot.P / day.target.P;
      worstK = Math.max(worstK, Math.abs(dk)); minP = Math.min(minP, pr);
      const tag = [kg, age, obj, style, rout, nl, ng, d].join(' ');
      if (Math.abs(dk) > 0.08) badK.push(tag + ' ' + (dk * 100).toFixed(1));
      if (pr < 0.9) badP.push({ style, rout, nl, tag });
      day.meals.forEach(m => {
        if (!m.items.length) vazias++;
        m.items.forEach(it => {
          const f = e.FOODS[it.id];
          if ((style === 'vegan' && !f.vegan) || (style === 'veg' && !f.veg) || (nl && f.lact) || (ng && f.gluten) || (rout === 'budget' && !f.cheap)) viol++;
          if ((style === 'omni' || style === 'lowc') && ['tofu', 'tvp', 'leiteS'].includes(it.id)) viol++;
        });
      });
    }
  }
}
const estr = badP.filter(b => (b.style === 'vegan' || b.style === 'veg') && b.rout === 'budget').length;
console.log('dias simulados', n, '| violações', viol, '| refeições vazias', vazias);
console.log('pior desvio de kcal', (worstK * 100).toFixed(1) + '% | dias fora de ±8%:', badK.length);
console.log('menor proteína/meta', (minP * 100).toFixed(0) + '% | dias com proteína <90%:', badP.length, '(dos quais veg/vegano + orçamento:', estr + ')');
const pct = x => (100 * (1 - x / n)).toFixed(1) + '%';
console.log('dias que fecham kcal ±8% e prot ≥90%:', pct(new Set([...badK.map(x => x.split(' ').slice(0, 8).join(' ')), ...badP.map(b => b.tag)]).size));
if (viol) process.exit(1);
