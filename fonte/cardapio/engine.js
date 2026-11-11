// Motor de cardápio NG+ (semana completa). Módulo ES, FONTE ÚNICA do motor: o esbuild o empacota junto com ui.js (fonte/build.sh) e o fonte/testes/cardapio-sim.js o testa direto por import. Sem dependência do app nem do navegador. Valores por 100 g de alimento preparado: [kcal, P, C, G]
// TACO (NEPA/UNICAMP) conforme tabelatacoonline.com.br; itens com * = valor típico de rótulo.
var TVP_CHEAP = false; // preço de referência ainda não confirmado
var FOODS = {
  frango:   { n: 'Frango grelhado',        v: [159, 32, 0, 2.5],      role: 'prot', veg: false, cheap: true,  fast: true },
  patinho:  { n: 'Patinho grelhado',       v: [219, 35.9, 0, 7.3],    role: 'prot', veg: false, cheap: false, fast: false },
  acem:     { n: 'Carne moída (acém)',     v: [212, 26.7, 0, 10.9],   role: 'prot', veg: false, cheap: true,  fast: false },
  sardinha: { n: 'Sardinha assada',        v: [164, 32.2, 0, 3.0],    role: 'prot', veg: false, cheap: true,  fast: true },
  abadejo:  { n: 'Abadejo grelhado',      v: [130, 27.6, 0, 1.3],    role: 'prot', veg: false, cheap: false, fast: true },
  pintado:  { n: 'Pintado grelhado',       v: [152, 30.8, 0, 2.3],    role: 'prot', veg: false, cheap: false, fast: false },
  tvp:      { n: 'Soja texturizada hidratada*', v: [117, 18, 6.4, 0.6], role: 'prot', veg: true, vegan: true, cheap: TVP_CHEAP, fast: true },
  leiteS:   { n: 'Leite de soja',          v: [39, 2.4, 4.3, 1.6],    role: 'prot', veg: true,  vegan: true, cheap: false, fast: true, liq: true, unit: [200, 'copo', 'copos'] },
  ovo:      { n: 'Ovo cozido',             v: [146, 13.3, 0.6, 9.5],  role: 'prot', veg: true,  cheap: true,  fast: true, unit: [50, 'ovo', 'ovos'] },
  queijo:   { n: 'Queijo minas',           v: [264, 17.4, 3.2, 20.2], role: 'prot', veg: true,  cheap: false, fast: true, lact: true, unit: [25, 'fatia', 'fatias'] },
  iogurte:  { n: 'Iogurte natural',        v: [51, 4.1, 1.9, 3.0],    role: 'prot', veg: true,  cheap: true,  fast: true, lact: true, unit: [170, 'pote', 'potes'] },
  tofu:     { n: 'Tofu',                   v: [64, 6.6, 2.1, 4.0],    role: 'prot', veg: true,  vegan: true, cheap: false, fast: true },
  whey:     { n: 'Whey protein*',          v: [389, 80, 6, 5],        role: 'prot', veg: true,  cheap: false, fast: true, lact: true, unit: [30, 'dose', 'doses'] },
  vegpo:    { n: 'Proteína vegetal em pó*',v: [389, 80, 6, 5],        role: 'prot', veg: true,  vegan: true, cheap: false, fast: true, unit: [30, 'dose', 'doses'] },
  feijaoC:  { n: 'Feijão carioca',         v: [76, 4.8, 13.6, 0.5],   role: 'leg',  veg: true,  vegan: true, cheap: true,  fast: true },
  feijaoP:  { n: 'Feijão preto',           v: [77, 4.5, 14.0, 0.5],   role: 'leg',  veg: true,  vegan: true, cheap: true,  fast: true },
  lentilha: { n: 'Lentilha',               v: [93, 6.3, 16.3, 0.5],   role: 'leg',  veg: true,  vegan: true, cheap: true,  fast: false },
  arroz:    { n: 'Arroz branco',           v: [128, 2.5, 28.1, 0.2],  role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true },
  arrozI:   { n: 'Arroz integral',         v: [124, 2.6, 25.8, 1.0],  role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true },
  batataD:  { n: 'Batata-doce',            v: [77, 0.6, 18.4, 0.1],   role: 'carb', veg: true,  vegan: true, cheap: true,  fast: false },
  batata:   { n: 'Batata inglesa',         v: [52, 1.2, 11.9, 0],     role: 'carb', veg: true,  vegan: true, cheap: true,  fast: false },
  mandioca: { n: 'Mandioca',               v: [125, 0.6, 30.1, 0.3],  role: 'carb', veg: true,  vegan: true, cheap: true,  fast: false },
  cuscuz:   { n: 'Cuscuz',                 v: [113, 2.2, 25.3, 0.7],  role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true },
  pao:      { n: 'Pão francês',            v: [300, 8, 58.6, 3.1],    role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true, gluten: true, unit: [50, 'pão', 'pães'] },
  aveia:    { n: 'Aveia',                  v: [394, 13.9, 66.6, 8.5], role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true, gluten: true },
  banana:   { n: 'Banana prata',           v: [98, 1.3, 26, 0.1],     role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true, unit: [70, 'banana', 'bananas'] },
  maca:     { n: 'Maçã Fuji',              v: [56, 0.3, 15.2, 0],     role: 'fruit', veg: true, vegan: true, cheap: false, fast: true, unit: [130, 'maçã', 'maçãs'] },
  mamao:    { n: 'Mamão',                  v: [40, 0.5, 10.4, 0.1],   role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  laranja:  { n: 'Laranja-pera',           v: [37, 1, 8.9, 0.1],      role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true, unit: [150, 'laranja', 'laranjas'] },
  brocolis: { n: 'Brócolis',               v: [25, 2.1, 4.4, 0.5],    role: 'veg',  veg: true,  vegan: true, cheap: false, fast: false },
  tomate:   { n: 'Tomate',                 v: [18, 1.1, 3.1, 0.2],    role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: true },
  azeite:   { n: 'Azeite',                 v: [884, 0, 0, 100],       role: 'fat',  veg: true,  vegan: true, cheap: true,  fast: true, unit: [13, 'colher de sopa', 'colheres de sopa'] },
  amendoim: { n: 'Amendoim',               v: [606, 22.5, 18.7, 54],  role: 'fat',  veg: true,  vegan: true, cheap: true,  fast: true },
  abacate:  { n: 'Abacate',                v: [96, 1.2, 6, 8.4],      role: 'fat',  veg: true,  vegan: true, cheap: false, fast: true }
};
// Ordem de v: [kcal, proteína, carboidrato, gordura] por 100 g.
var OBJ = {
  cut:   { n: 'Cutting',               k: 0.85, prot: 2.2, fat: 0.25, minor: false },
  bulk:  { n: 'Bulking limpo',         k: 1.10, prot: 1.8, fat: 0.25, minorK: 1.05 },
  maint: { n: 'Manutenção/recomposição', k: 1.00, prot: 2.0, fat: 0.28 }
};
var STYLE = { omni: 'Onívoro', veg: 'Vegetariano', vegan: 'Vegano', lowc: 'Low carb moderado' };
var ROUT = {
  marmita: { n: 'Marmita da semana', meals: ['cafe', 'almoco', 'lanche', 'jantar', 'ceia'] },
  corrido: { n: 'Dia corrido',       meals: ['cafe', 'almoco', 'lanche', 'jantar'] },
  budget:  { n: 'Orçamento enxuto',  meals: ['cafe', 'almoco', 'lanche', 'jantar', 'ceia'] },
  fora:    { n: 'Almoço fora',       meals: ['cafe', 'almoco', 'lanche', 'jantar'] }
};
var SLOT = {
  cafe:   { n: 'Café da manhã', share: 0.22, prot: 0.20, comp: ['carb', 'prot', 'fruit'] },
  almoco: { n: 'Almoço',        share: 0.30, prot: 0.28, comp: ['carb', 'leg', 'prot', 'veg', 'fat'] },
  lanche: { n: 'Lanche',        share: 0.14, prot: 0.17, comp: ['carb', 'prot', 'fruit', 'fat'] },
  jantar: { n: 'Jantar',        share: 0.24, prot: 0.25, comp: ['carb', 'prot', 'veg', 'fat'] },
  ceia:   { n: 'Ceia',          share: 0.10, prot: 0.10, comp: ['prot', 'fruit', 'fat'] }
};
var DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
var TRAIN = [1, 1, 0, 1, 1, 1, 0]; // 5 dias de treino, 2 de descanso


var PREF = {
  cafe:   ['ovo', 'queijo', 'iogurte', 'leiteS', 'tofu', 'whey', 'vegpo'],
  almoco: ['frango', 'patinho', 'abadejo', 'acem', 'sardinha', 'ovo', 'tofu', 'tvp', 'queijo'],
  jantar: ['sardinha', 'frango', 'pintado', 'patinho', 'ovo', 'acem', 'tofu', 'tvp', 'queijo'],
  lanche: ['iogurte', 'leiteS', 'queijo', 'whey', 'vegpo', 'ovo', 'tofu'],
  ceia:   ['iogurte', 'leiteS', 'whey', 'vegpo', 'queijo', 'ovo', 'tofu']
};
var PCAP = { abadejo: 200, pintado: 200, tvp: 250, leiteS: 400, frango: 200, patinho: 200, acem: 180, sardinha: 160, ovo: 150, queijo: 75, iogurte: 340, tofu: 250, whey: 60, vegpo: 60 };
var CCAP = { arroz: 250, arrozI: 250, batataD: 300, batata: 350, mandioca: 250, cuscuz: 220, aveia: 80, pao: 150 };
var POWDER = ['whey', 'vegpo'];

function allowed(id, cfg) {
  var f = FOODS[id];
  if (cfg.style === 'vegan' && !f.vegan) return false;
  if (cfg.style === 'veg' && !f.veg) return false;
  if (cfg.nolact && f.lact) return false;
  if (cfg.nogluten && f.gluten) return false;
  if (cfg.rout === 'budget' && !f.cheap) return false;
  if (cfg.rout === 'corrido' && !f.fast) return false;
  return true;
}
function qty(id, g) {
  var u = FOODS[id].unit;
  if (u) return Math.max(u[0], Math.round(g / u[0]) * u[0]);
  return Math.max(5, Math.round(g / 5) * 5);
}
function prefList(slot, cfg) {
  return PREF[slot].filter(function (id) { return allowed(id, cfg); });
}
function rolePool(role, cfg, slot) {
  var out = [];
  for (var id in FOODS) if (FOODS[id].role === role && allowed(id, cfg)) out.push(id);
  if (role === 'carb') {
    if (slot === 'cafe' || slot === 'lanche') out = out.filter(function (id) { return ['pao', 'aveia', 'cuscuz', 'batataD'].indexOf(id) >= 0; });
    else out = out.filter(function (id) { return ['pao', 'aveia'].indexOf(id) < 0; });
    if (cfg.style === 'lowc') out = out.filter(function (id) { return ['batataD', 'cuscuz', 'aveia'].indexOf(id) >= 0; });
  }
  if (role === 'fat') {
    if (slot === 'almoco' || slot === 'jantar') out = out.filter(function (id) { return id === 'azeite'; });
    else out = out.filter(function (id) { return id !== 'azeite'; });
  }
  if (role === 'fruit' && cfg.style === 'lowc') out = out.filter(function (id) { return id !== 'banana'; });
  return out;
}
function boosters(cfg, slot, used) {
  var main = slot === 'almoco' || slot === 'jantar';
  var out = prefList(slot, cfg).filter(function (id) { return used.indexOf(id) < 0; });
  if (cfg.style === 'omni' || cfg.style === 'lowc') out = out.filter(function (id) { return ['tofu', 'tvp', 'leiteS'].indexOf(id) < 0; });
  // pó entra no prato principal só se for vegetariano/vegano (onívoro reforça com outra fonte inteira)
  if (main) {
    ['whey', 'vegpo'].forEach(function (id) { if ((cfg.style === 'veg' || cfg.style === 'vegan') && allowed(id, cfg) && used.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id); });
    if (cfg.style === 'omni' || cfg.style === 'lowc') out = out.filter(function (id) { return ['tofu', 'tvp', 'leiteS'].indexOf(id) < 0 && POWDER.indexOf(id) < 0; });
  }
  out.sort(function (a, b) { return FOODS[b].v[1] - FOODS[a].v[1]; });
  return out;
}
function targets(cfg) {
  // No app, a meta vem da aba Dieta (calorias e proteína já calculadas): cfg.kcalMeta e cfg.protG.
  if (cfg.kcalMeta != null) {
    var Pm = cfg.protG;
    var Fm = (cfg.kcalMeta * (cfg.style === 'lowc' ? 0.40 : 0.27)) / 9;
    var Cm = (cfg.kcalMeta - 4 * Pm - 9 * Fm) / 4;
    return { kcal: cfg.kcalMeta, P: Pm, C: Math.max(Cm, 0), F: Fm };
  }
  var o = OBJ[cfg.obj];
  var minor = cfg.age < 18;
  var k = minor && o.minorK ? o.minorK : o.k;
  if (minor && cfg.obj === 'cut') k = 1.0; // trava: menor nunca recebe déficit
  var kcal = cfg.tdee * k;
  var P = cfg.kg * o.prot;
  if (minor && P > cfg.kg * 2.0) P = cfg.kg * 2.0;
  var fatShare = cfg.style === 'lowc' ? 0.40 : o.fat;
  var F = (kcal * fatShare) / 9;
  var C = (kcal - 4 * P - 9 * F) / 4;
  return { kcal: kcal, P: P, C: Math.max(C, 0), F: F };
}
function dayTargets(t, d) {
  var kcal = t.kcal * (TRAIN[d] ? 1.06 : 0.85);
  var C = Math.max(0, (kcal - 4 * t.P - 9 * t.F) / 4);
  return { kcal: kcal, P: t.P, F: t.F, C: C, train: !!TRAIN[d] };
}
function macros(items) {
  var s = { kcal: 0, P: 0, C: 0, F: 0 };
  items.forEach(function (it) {
    var v = FOODS[it.id].v, g = it.g / 100;
    s.kcal += v[0] * g; s.P += v[1] * g; s.C += v[2] * g; s.F += v[3] * g;
  });
  return s;
}
function pick(list, i) { return list.length ? list[((i % list.length) + list.length) % list.length] : null; }
function capOf(it) { return it.role === 'prot' ? (PCAP[it.id] || 250) : it.role === 'carb' ? (CCAP[it.id] || 300) : it.role === 'fat' ? (it.id === 'azeite' ? 39 : 60) : it.role === 'fruit' ? 300 : 9999; }

function buildMeal(slotKey, d, cfg, dt, mealIdx) {
  var S = SLOT[slotKey];
  var ms = ROUT[cfg.rout].meals, sS = 0, sP = 0;
  ms.forEach(function (k) { sS += SLOT[k].share; sP += SLOT[k].prot; });
  var Kt = dt.kcal * S.share / sS, Pt = dt.P * S.prot / sP, Ft = dt.F * S.share / sS;
  var Ct = Math.max(0, (Kt - 4 * Pt - 9 * Ft) / 4);
  var seed = d + mealIdx;
  if (cfg.rout === 'marmita' && (slotKey === 'almoco' || slotKey === 'jantar')) seed = (d < 4 ? 0 : 1) + mealIdx; // 2 lotes por semana
  var items = [];
  var has = function (r) { return S.comp.indexOf(r) >= 0; };
  var vegId = has('veg') ? pick(rolePool('veg', cfg, slotKey), seed) : null;
  var fruitId = has('fruit') ? pick(rolePool('fruit', cfg, slotKey), seed + 1) : null;
  var legId = has('leg') && slotKey === 'almoco' ? pick(rolePool('leg', cfg, slotKey), seed) : null;
  if (vegId) items.push({ id: vegId, g: 90, role: 'veg' });
  if (fruitId) items.push({ id: fruitId, g: qty(fruitId, slotKey === 'lanche' ? 120 : 100), role: 'fruit' });
  if (legId) items.push({ id: legId, g: 100, role: 'leg' });
  // proteína principal
  var prefs = prefList(slotKey, cfg);
  var main = slotKey === 'almoco' || slotKey === 'jantar';
  if (cfg.style === 'omni' || cfg.style === 'lowc') prefs = prefs.filter(function (id) { return ['tofu', 'tvp', 'leiteS'].indexOf(id) < 0; });
  if (!prefs.length) prefs = prefList(slotKey, cfg);
  var pId = pick(prefs, seed);
  var used = [];
  function addProt(id, need) {
    var pv = FOODS[id].v;
    var cap = PCAP[id] || 250;
    var g = qty(id, Math.min(cap, (need / pv[1]) * 100));
    if (g > cap + 1) g = Math.floor(cap / (FOODS[id].unit ? FOODS[id].unit[0] : 5)) * (FOODS[id].unit ? FOODS[id].unit[0] : 5);
    items.push({ id: id, g: g, role: 'prot' });
    used.push(id);
  }
  // carbo (até 2 itens) — calculado antes da proteína, que depois cobre o que faltar
  var carbPool = has('carb') ? rolePool('carb', cfg, slotKey) : [];
  var cur = macros(items);
  var cNeed = Ct - cur.C - (pId ? 0 : 0);
  var carbIds = [];
  if (carbPool.length && cNeed > 8) {
    var c1 = pick(carbPool, seed);
    var gc = qty(c1, Math.min(CCAP[c1], (cNeed / FOODS[c1].v[2]) * 100));
    items.push({ id: c1, g: gc, role: 'carb' }); carbIds.push(c1);
    var left = cNeed - gc * FOODS[c1].v[2] / 100;
    var rest = carbPool.filter(function (id) { return id !== c1; });
    if (left > 15 && rest.length && (slotKey === 'almoco' || slotKey === 'jantar')) {
      var c2 = pick(rest, seed + 1);
      var g2 = qty(c2, Math.min(CCAP[c2], (left / FOODS[c2].v[2]) * 100));
      items.push({ id: c2, g: g2, role: 'carb' });
    }
  }
  // proteína principal + reforços
  if (pId) {
    cur = macros(items);
    addProt(pId, Math.max(0, Pt - cur.P));
    for (var b = 0; b < 2; b++) {
      cur = macros(items);
      var gap = Pt - cur.P;
      if (gap < 5) break;
      var cands = boosters(cfg, slotKey, used);
      var bId = pick(cands.slice(0, 2), seed + b);
      if (!bId) break;
      addProt(bId, gap);
    }
  }
  // gordura
  var fatPool = has('fat') ? rolePool('fat', cfg, slotKey) : [];
  if (fatPool.length) {
    cur = macros(items);
    var fId = pick(fatPool, seed);
    var fneed = Math.max(0, Ft - cur.F);
    var gf = (fneed / FOODS[fId].v[3]) * 100;
    if (fId === 'azeite') gf = Math.min(Math.round(gf / 13) * 13, 39);
    else gf = Math.min(Math.round(gf / 5) * 5, 60);
    var minG = fId === 'azeite' ? 13 : 15;
    if (gf >= minG) items.push({ id: fId, g: gf, role: 'fat' });
  }
  var m = macros(items);
  return { slot: slotKey, name: S.n, items: items, m: m, target: { kcal: Kt, P: Pt } };
}

function dayTotals(meals) {
  var s = { kcal: 0, P: 0, C: 0, F: 0 };
  meals.forEach(function (ml) { var m = ml.m || macros(ml.items); s.kcal += m.kcal; s.P += m.P; s.C += m.C; s.F += m.F; });
  return s;
}
function buildDay(d, cfg) {
  var t = targets(cfg), dt = dayTargets(t, d);
  var meals = ROUT[cfg.rout].meals.map(function (k, i) { return buildMeal(k, d, cfg, dt, i); });
  // fecha as calorias do dia escalando carboidrato/fruta (e gordura quando preciso), respeitando tetos
  for (var pass = 0; pass < 4; pass++) {
    var tot = dayTotals(meals);
    var diff = dt.kcal - tot.kcal;
    if (Math.abs(diff) / dt.kcal < 0.03) break;
    var set = [];
    meals.forEach(function (ml) { ml.items.forEach(function (it) { if (it.role === 'carb' || it.role === 'fruit' || (it.role === 'fat' && (pass >= 1 || cfg.style === 'lowc'))) set.push(it); }); });
    var base = set.reduce(function (a, it) { return a + FOODS[it.id].v[0] * it.g / 100; }, 0);
    if (base < 1) break;
    var f = Math.min(2.2, Math.max(0.25, 1 + diff / base));
    set.forEach(function (it) {
      var ng = it.g * f;
      if (it.id === 'azeite') ng = Math.round(ng / 13) * 13; else ng = qty(it.id, ng);
      if (ng > capOf(it)) ng = capOf(it) - (capOf(it) % (FOODS[it.id].unit ? FOODS[it.id].unit[0] : 5));
      it.g = ng;
    });
    meals.forEach(function (ml) { ml.items = ml.items.filter(function (it) { return it.g > 0; }); ml.m = macros(ml.items); });
  }
  return { day: d, label: DAYS[d], train: dt.train, meals: meals, tot: dayTotals(meals), target: dt };
}
function shopping(week) {
  var acc = {};
  week.forEach(function (day) { day.meals.forEach(function (ml) { ml.items.forEach(function (it) { acc[it.id] = (acc[it.id] || 0) + it.g; }); }); });
  return Object.keys(acc).map(function (id) { return { id: id, g: acc[id] }; });
}
function fmtQty(it) {
  var f = FOODS[it.id];
  if (f.unit) {
    var n = Math.round(it.g / f.unit[0]);
    return n + ' ' + (n > 1 ? f.unit[2] : f.unit[1]) + ' (≈ ' + it.g + (f.liq ? ' ml' : ' g') + ')';
  }
  return it.g + (f.liq ? ' ml' : ' g');
}
export { FOODS, OBJ, STYLE, ROUT, SLOT, DAYS, TRAIN, targets, dayTargets, buildDay, shopping, fmtQty, allowed };
