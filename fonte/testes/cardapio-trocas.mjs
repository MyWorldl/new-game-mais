// Teste do motor de TROCA de alimentos do cardápio (fonte/cardapio/engine.js), sem navegador.
// Uso: node fonte/testes/cardapio-trocas.mjs
import * as E from '../cardapio/engine.js';
import { montaPopup, montaVisao, normalizaCfg } from '../cardapio/ui.js';
let ok = 0, falhas = 0;
const t = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome, extra); } };

const base = { kg: 80, age: 30, kcalMeta: 3043, protG: 134 };
const cfgDe = (style, rout, nolact, nogluten, trocas) => Object.assign({}, base, { style, rout, nolact, nogluten, trocas: trocas || [] });
const ids = (ml) => ml.items.map((i) => i.id);

// 1) trocas só dentro da mesma categoria
t('proteína por carboidrato é recusado', !E.podeTrocar('frango', 'arroz', 'almoco', cfgDe('omni', 'marmita', false, false)));
t('carboidrato por carboidrato é aceito (almoço)', E.podeTrocar('arroz', 'mandioca', 'almoco', cfgDe('omni', 'marmita', false, false)));
t('alimento inexistente é recusado', !E.podeTrocar('arroz', 'xyz', 'almoco', cfgDe('omni', 'marmita', false, false)));
t('trocar por si mesmo é recusado', !E.podeTrocar('arroz', 'arroz', 'almoco', cfgDe('omni', 'marmita', false, false)));
t('vegano não recebe carne', !E.podeTrocar('tofu', 'frango', 'almoco', cfgDe('vegan', 'marmita', false, false)));
t('sem lactose não recebe iogurte', !E.podeTrocar('ovo', 'iogurte', 'cafe', cfgDe('omni', 'marmita', true, false)));
t('sem glúten não recebe pão', !E.podeTrocar('cuscuz', 'pao', 'cafe', cfgDe('omni', 'marmita', false, true)));
t('low carb: carboidrato só entre os permitidos', !E.podeTrocar('batataD', 'arroz', 'almoco', cfgDe('lowc', 'marmita', false, false)));
t('orçamento enxuto NÃO bloqueia a troca (a pessoa decide)', E.podeTrocar('frango', 'patinho', 'almoco', cfgDe('omni', 'budget', false, false)));

// 2) varredura: toda troca possível, em todas as combinações, mantém restrições e números sãos
const estilos = ['omni', 'veg', 'vegan', 'lowc'], rotinas = ['tradicional', 'marmita', 'corrido', 'budget', 'fora'];
let testadas = 0, violacoes = [], fora = 0, piorKcal = 0, duplicados = 0, ruins = 0, pioraMuita = 0;
const proibido = (id, c) => { const f = E.FOODS[id]; return (c.style === 'vegan' && !f.vegan) || (c.style === 'veg' && !f.veg) || (c.nolact && f.lact) || (c.nogluten && f.gluten); };
for (const st of estilos) for (const ro of rotinas) for (const [nl, ng] of [[false, false], [true, true]]) {
  const c0 = cfgDe(st, ro, nl, ng);
  for (const d of [0, 2, 5]) {
    const dia0 = E.buildDay(d, c0); const rk0 = Math.abs(dia0.tot.kcal / dia0.target.kcal - 1);
    for (const ml of dia0.meals) for (const it of ml.items) {
      const alts = E.alternativasIds(it.role, ml.slot, c0).filter((a) => a !== it.id && ids(ml).indexOf(a) < 0);
      for (const a of alts) {
        const tr = E.registraTroca([], d, ml.slot, it.id, a, 'dia');
        const dia = E.buildDay(d, Object.assign({}, c0, { trocas: tr }));
        const m2 = dia.meals.find((m) => m.slot === ml.slot);
        const novo = m2.items.find((x) => x.id === a);
        testadas++;
        if (!novo) { ruins++; continue; }
        dia.meals.forEach((m) => m.items.forEach((x) => { if (proibido(x.id, c0)) violacoes.push([st, ro, nl, x.id]); }));
        if (new Set(ids(m2)).size !== ids(m2).length) duplicados++;
        if (!(novo.g > 0) || !isFinite(dia.tot.kcal) || !isFinite(dia.tot.P)) ruins++;
        const rk = Math.abs(dia.tot.kcal / dia.target.kcal - 1); if (rk > piorKcal) piorKcal = rk;
        if (rk > 0.12) fora++;
        if (rk - rk0 > 0.05) pioraMuita++;   // a troca piorou o fechamento de calorias em mais de 5 pontos
      }
    }
  }
}
console.log('  trocas simuladas:', testadas, '| pior desvio de calorias:', (piorKcal * 100).toFixed(1) + '%', '| acima de 12%:', fora, '| pioraram >5 pontos:', pioraMuita);
t('varredura: houve trocas simuladas', testadas > 1000);
t('varredura: nenhuma restrição violada', violacoes.length === 0, JSON.stringify(violacoes.slice(0, 3)));
t('varredura: nenhum alimento repetido na refeição', duplicados === 0);
t('varredura: nenhuma porção inválida (zero, NaN)', ruins === 0);
// Trocar por um alimento menos denso (ex.: banana por mamão) pode reduzir as calorias, pois as porções têm teto realista. O pop-up mostra o efeito antes de aplicar.
t('varredura: só raras trocas pioram o fechamento de calorias em mais de 5 pontos (≤ 1%)', pioraMuita / testadas <= 0.01, (pioraMuita / testadas * 100).toFixed(2) + '%');
t('varredura: desvio de calorias do dia nunca passa de 25%', piorKcal <= 0.25, (piorKcal * 100).toFixed(1) + '%');

// 3) porção recalculada: proteína equivalente
{
  const c = cfgDe('omni', 'marmita', false, false);
  const d0 = E.buildDay(0, c), a = d0.meals[1].items.find((i) => i.role === 'prot');
  const tr = E.registraTroca([], 0, 'almoco', a.id, a.id === 'frango' ? 'patinho' : 'frango', 'dia');
  const d1 = E.buildDay(0, Object.assign({}, c, { trocas: tr }));
  const n = d1.meals[1].items.find((i) => i.troca);
  const pA = E.FOODS[a.id].v[1] * a.g / 100, pN = E.FOODS[n.id].v[1] * n.g / 100;
  t('proteína da porção nova ≈ a original (±15%)', Math.abs(pN / pA - 1) <= 0.15, pA.toFixed(1) + ' x ' + pN.toFixed(1));
  t('item trocado guarda o original (orig) e a marca (troca)', n.orig === a.id && n.troca === true);
  t('outro dia não muda quando a troca é só de um dia', ids(E.buildDay(1, Object.assign({}, c, { trocas: tr })).meals[1]).join() === ids(E.buildDay(1, c).meals[1]).join());
}

// 4) escopo e cadeia
{
  let tr = E.registraTroca([], 0, 'almoco', 'acem', 'patinho', 'dia');
  t('troca de um dia: 1 registro com d=0', tr.length === 1 && tr[0].d === 0 && tr[0].de === 'acem' && tr[0].para === 'patinho');
  tr = E.registraTroca(tr, 0, 'almoco', 'patinho', 'frango', 'dia');
  t('segunda troca no mesmo dia substitui (não empilha)', tr.length === 1 && tr[0].de === 'acem' && tr[0].para === 'frango');
  tr = E.registraTroca(tr, 0, 'almoco', 'frango', 'acem', 'dia');
  t('voltar ao original apaga o registro', tr.length === 0);
  let g = E.registraTroca([], 3, 'cafe', 'ovo', 'tofu', 'todos');
  t('troca para todos: d=-1 e alimento original', g.length === 1 && g[0].d === -1 && g[0].de === 'ovo');
  g = E.registraTroca(g, 3, 'cafe', 'tofu', 'whey', 'dia');
  t('troca do dia sobre uma geral: empilha só no dia', g.length === 2 && g[1].d === 3 && g[1].de === 'tofu' && g[1].para === 'whey');
  const r = E.desfazCadeia(g, 3, 'cafe', 'whey', false);
  t('desfazer percorre dia e geral até o original', r.id === 'ovo' && r.trocas.length === 0 && r.escopo.dia && r.escopo.todos);
  const r2 = E.desfazCadeia(g, 3, 'cafe', 'whey', true);
  t('desfazer só o dia mantém a troca geral', r2.id === 'tofu' && r2.trocas.length === 1 && r2.trocas[0].d === -1);
  // troca geral aparece em todos os dias em que o alimento existe
  const c = cfgDe('omni', 'marmita', false, false);
  const g2 = E.registraTroca([], 0, 'cafe', 'ovo', 'iogurte', 'todos');
  const com = [0, 1, 2, 3, 4, 5, 6].filter((d) => E.buildDay(d, Object.assign({}, c, { trocas: g2 })).meals[0].items.some((i) => i.troca && i.id === 'iogurte')).length;
  const sem = [0, 1, 2, 3, 4, 5, 6].filter((d) => ids(E.buildDay(d, c).meals[0]).indexOf('ovo') >= 0).length;
  t('troca para todos vale nos dias em que o ovo aparecia no café', com === sem && com > 0, com + ' x ' + sem);
}

// 5) filtros mudaram depois da troca: a troca é ignorada, sem quebrar
{
  const tr = [{ d: 0, s: 'cafe', de: 'ovo', para: 'iogurte' }];
  const cfgLac = cfgDe('omni', 'marmita', true, false, tr);
  const dia = E.buildDay(0, cfgLac);
  t('troca para iogurte é ignorada quando vira "sem lactose"', ids(dia.meals[0]).indexOf('iogurte') < 0 && dia.meals[0].items.every((i) => !i.troca));
  const vg = E.buildDay(0, cfgDe('vegan', 'marmita', false, false, [{ d: 0, s: 'almoco', de: 'tofu', para: 'frango' }]));
  t('troca para carne ignorada no vegano', vg.meals.every((m) => m.items.every((i) => i.id !== 'frango')));
}

// 6) lista salva com lixo é limpa
{
  const lixo = [null, 5, { d: 9, s: 'cafe', de: 'ovo', para: 'iogurte' }, { d: 0, s: 'xx', de: 'ovo', para: 'iogurte' }, { d: 0, s: 'cafe', de: 'ovo', para: 'arroz' }, { d: 0, s: 'cafe', de: 'ovo', para: 'ovo' }, { d: -1, s: 'cafe', de: 'ovo', para: 'iogurte' }, { d: 1.5, s: 'cafe', de: 'ovo', para: 'tofu' }];
  const n = E.normalizaTrocas(lixo);
  t('normalizaTrocas mantém só a entrada válida', n.length === 1 && n[0].para === 'iogurte');
  t('normalizaTrocas aceita não-lista', E.normalizaTrocas(undefined).length === 0 && E.normalizaTrocas('x').length === 0);
  const muitos = []; for (let i = 0; i < 300; i++) muitos.push({ d: -1, s: 'cafe', de: 'ovo', para: 'iogurte' });
  t('normalizaTrocas limita a 120', E.normalizaTrocas(muitos).length === 120);
}


// 7) visão pura do pop-up (sem DOM)
{
  const h = { num: (v, d) => Number(v).toFixed(d || 0), escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), menorDeIdade: (i) => i < 18 };
  const macros = { proteina: { g: 134, gkg: 1.8 } };
  const mk = (cardapio, dia) => ({ kcalAlvo: 3043, macros, cfg: normalizaCfg({ cardapio }), perfil: { idade: 30 }, objetivo: 'superavit', dia: dia == null ? 0 : dia });
  const e = mk({ jeito: 'omni', rotina: 'marmita', restricoes: {}, trocas: [] });
  const r = montaPopup(e, h, { slot: 'almoco', itemId: 'nao-existe', escopo: 'dia' });
  t('pop-up corrige alimento inválido para o primeiro da refeição', r.sel.slot === 'almoco' && !!E.FOODS[r.sel.itemId]);
  const r2 = montaPopup(e, h, { slot: 'xx', itemId: 'frango', escopo: 'qualquer' });
  t('pop-up corrige refeição inválida e escopo desconhecido', r2.sel.slot === 'cafe' && r2.sel.escopo === 'dia');
  t('pop-up mostra o efeito de cada alternativa e o dia', /kcal · [+−±]\d+ g prot/.test(r.html) && /Seg \(dia de treino\)/.test(r.html));
  t('sem trocas: não oferece "Restaurar" nem "Voltar ao sugerido"', r.html.indexOf('data-pop="restaurar"') < 0 && r.html.indexOf('data-pop="voltar"') < 0);
  const e2 = mk({ jeito: 'omni', rotina: 'marmita', restricoes: {}, trocas: [{ d: 0, s: 'almoco', de: 'patinho', para: 'frango' }, { d: 3, s: 'cafe', de: 'ovo', para: 'queijo' }] });
  const r3 = montaPopup(e2, h, { slot: 'almoco', itemId: 'frango', escopo: 'dia' });
  t('com troca: oferece "Voltar ao sugerido" e "Restaurar todas (2)"', r3.html.indexOf('data-pop="voltar"') > 0 && /Restaurar todas \(2\)/.test(r3.html));
  t('com troca: mostra a sugestão original', /Sugestão original: <b>Patinho grelhado/.test(r3.html));
  const ev = mk({ jeito: 'vegan', rotina: 'marmita', restricoes: { lactose: true, gluten: true }, trocas: [] });
  let carne = false;
  for (const sl of ['cafe', 'almoco', 'lanche', 'jantar', 'ceia']) { const rv = montaPopup(ev, h, { slot: sl, itemId: null, escopo: 'dia' }); if (/frango|patinho|acém|sardinha|abadejo|pintado|ovo|queijo|iogurte|whey|pão/i.test(rv.html.split('3. Trocar por')[1] || '')) carne = true; }
  t('vegano sem lactose/glúten: nenhuma alternativa proibida em nenhuma refeição', !carne);
  const vis = montaVisao(e2, h);
  t('card informa "2 trocas feitas."', /2 trocas feitas\./.test(vis.trocasinfo));
  const vis0 = montaVisao(e, h);
  t('card sem trocas convida a trocar', /Troque qualquer alimento/.test(vis0.trocasinfo));
  const eign = mk({ jeito: 'vegan', rotina: 'marmita', restricoes: {}, trocas: [{ d: -1, s: 'almoco', de: 'tofu', para: 'frango' }] });
  t('card avisa troca guardada que não combina mais', /não combina/.test(montaVisao(eign, h).trocasinfo));
  t('orçamento enxuto: alternativa cara recebe aviso no pop-up', /fora do orçamento enxuto/.test(montaPopup(mk({ jeito: 'omni', rotina: 'budget', restricoes: {}, trocas: [] }), h, { slot: 'almoco', itemId: 'acem', escopo: 'dia' }).html));
}

console.log(ok + ' ok, ' + falhas + ' falhas');
process.exit(falhas ? 1 : 0);
