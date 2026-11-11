// cardapio/engine.js
var TVP_CHEAP = false;
var FOODS = {
  frango: { n: "Frango grelhado", v: [159, 32, 0, 2.5], role: "prot", veg: false, cheap: true, fast: true },
  patinho: { n: "Patinho grelhado", v: [219, 35.9, 0, 7.3], role: "prot", veg: false, cheap: false, fast: false },
  acem: { n: "Carne moída (acém)", v: [212, 26.7, 0, 10.9], role: "prot", veg: false, cheap: true, fast: false },
  sardinha: { n: "Sardinha assada", v: [164, 32.2, 0, 3], role: "prot", veg: false, cheap: true, fast: true },
  abadejo: { n: "Abadejo grelhado", v: [130, 27.6, 0, 1.3], role: "prot", veg: false, cheap: false, fast: true },
  pintado: { n: "Pintado grelhado", v: [152, 30.8, 0, 2.3], role: "prot", veg: false, cheap: false, fast: false },
  tvp: { n: "Soja texturizada hidratada*", v: [117, 18, 6.4, 0.6], role: "prot", veg: true, vegan: true, cheap: TVP_CHEAP, fast: true },
  leiteS: { n: "Leite de soja", v: [39, 2.4, 4.3, 1.6], role: "prot", veg: true, vegan: true, cheap: false, fast: true, liq: true, unit: [200, "copo", "copos"] },
  ovo: { n: "Ovo cozido", v: [146, 13.3, 0.6, 9.5], role: "prot", veg: true, cheap: true, fast: true, unit: [50, "ovo", "ovos"] },
  queijo: { n: "Queijo minas", v: [264, 17.4, 3.2, 20.2], role: "prot", veg: true, cheap: false, fast: true, lact: true, unit: [25, "fatia", "fatias"] },
  iogurte: { n: "Iogurte natural", v: [51, 4.1, 1.9, 3], role: "prot", veg: true, cheap: true, fast: true, lact: true, unit: [170, "pote", "potes"] },
  tofu: { n: "Tofu", v: [64, 6.6, 2.1, 4], role: "prot", veg: true, vegan: true, cheap: false, fast: true },
  whey: { n: "Whey protein*", v: [389, 80, 6, 5], role: "prot", veg: true, cheap: false, fast: true, lact: true, unit: [30, "dose", "doses"] },
  vegpo: { n: "Proteína vegetal em pó*", v: [389, 80, 6, 5], role: "prot", veg: true, vegan: true, cheap: false, fast: true, unit: [30, "dose", "doses"] },
  feijaoC: { n: "Feijão carioca", v: [76, 4.8, 13.6, 0.5], role: "leg", veg: true, vegan: true, cheap: true, fast: true },
  feijaoP: { n: "Feijão preto", v: [77, 4.5, 14, 0.5], role: "leg", veg: true, vegan: true, cheap: true, fast: true },
  lentilha: { n: "Lentilha", v: [93, 6.3, 16.3, 0.5], role: "leg", veg: true, vegan: true, cheap: true, fast: false },
  arroz: { n: "Arroz branco", v: [128, 2.5, 28.1, 0.2], role: "carb", veg: true, vegan: true, cheap: true, fast: true },
  arrozI: { n: "Arroz integral", v: [124, 2.6, 25.8, 1], role: "carb", veg: true, vegan: true, cheap: true, fast: true },
  batataD: { n: "Batata-doce", v: [77, 0.6, 18.4, 0.1], role: "carb", veg: true, vegan: true, cheap: true, fast: false },
  batata: { n: "Batata inglesa", v: [52, 1.2, 11.9, 0], role: "carb", veg: true, vegan: true, cheap: true, fast: false },
  mandioca: { n: "Mandioca", v: [125, 0.6, 30.1, 0.3], role: "carb", veg: true, vegan: true, cheap: true, fast: false },
  cuscuz: { n: "Cuscuz", v: [113, 2.2, 25.3, 0.7], role: "carb", veg: true, vegan: true, cheap: true, fast: true },
  pao: { n: "Pão francês", v: [300, 8, 58.6, 3.1], role: "carb", veg: true, vegan: true, cheap: true, fast: true, gluten: true, unit: [50, "pão", "pães"] },
  aveia: { n: "Aveia", v: [394, 13.9, 66.6, 8.5], role: "carb", veg: true, vegan: true, cheap: true, fast: true, gluten: true },
  banana: { n: "Banana prata", v: [98, 1.3, 26, 0.1], role: "fruit", veg: true, vegan: true, cheap: true, fast: true, unit: [70, "banana", "bananas"] },
  maca: { n: "Maçã Fuji", v: [56, 0.3, 15.2, 0], role: "fruit", veg: true, vegan: true, cheap: false, fast: true, unit: [130, "maçã", "maçãs"] },
  mamao: { n: "Mamão", v: [40, 0.5, 10.4, 0.1], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  laranja: { n: "Laranja-pera", v: [37, 1, 8.9, 0.1], role: "fruit", veg: true, vegan: true, cheap: true, fast: true, unit: [150, "laranja", "laranjas"] },
  brocolis: { n: "Brócolis", v: [25, 2.1, 4.4, 0.5], role: "veg", veg: true, vegan: true, cheap: false, fast: false },
  tomate: { n: "Tomate", v: [18, 1.1, 3.1, 0.2], role: "veg", veg: true, vegan: true, cheap: true, fast: true },
  azeite: { n: "Azeite", v: [884, 0, 0, 100], role: "fat", veg: true, vegan: true, cheap: true, fast: true, unit: [13, "colher de sopa", "colheres de sopa"] },
  amendoim: { n: "Amendoim", v: [606, 22.5, 18.7, 54], role: "fat", veg: true, vegan: true, cheap: true, fast: true },
  abacate: { n: "Abacate", v: [96, 1.2, 6, 8.4], role: "fat", veg: true, vegan: true, cheap: false, fast: true }
};
var OBJ = {
  cut: { n: "Cutting", k: 0.85, prot: 2.2, fat: 0.25, minor: false },
  bulk: { n: "Bulking limpo", k: 1.1, prot: 1.8, fat: 0.25, minorK: 1.05 },
  maint: { n: "Manutenção/recomposição", k: 1, prot: 2, fat: 0.28 }
};
var STYLE = { omni: "Onívoro", veg: "Vegetariano", vegan: "Vegano", lowc: "Low carb moderado" };
var ROUT = {
  marmita: { n: "Marmita da semana", meals: ["cafe", "almoco", "lanche", "jantar", "ceia"] },
  corrido: { n: "Dia corrido", meals: ["cafe", "almoco", "lanche", "jantar"] },
  budget: { n: "Orçamento enxuto", meals: ["cafe", "almoco", "lanche", "jantar", "ceia"] },
  fora: { n: "Almoço fora", meals: ["cafe", "almoco", "lanche", "jantar"] }
};
var SLOT = {
  cafe: { n: "Café da manhã", share: 0.22, prot: 0.2, comp: ["carb", "prot", "fruit"] },
  almoco: { n: "Almoço", share: 0.3, prot: 0.28, comp: ["carb", "leg", "prot", "veg", "fat"] },
  lanche: { n: "Lanche", share: 0.14, prot: 0.17, comp: ["carb", "prot", "fruit", "fat"] },
  jantar: { n: "Jantar", share: 0.24, prot: 0.25, comp: ["carb", "prot", "veg", "fat"] },
  ceia: { n: "Ceia", share: 0.1, prot: 0.1, comp: ["prot", "fruit", "fat"] }
};
var DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
var TRAIN = [1, 1, 0, 1, 1, 1, 0];
var PREF = {
  cafe: ["ovo", "queijo", "iogurte", "leiteS", "tofu", "whey", "vegpo"],
  almoco: ["frango", "patinho", "abadejo", "acem", "sardinha", "ovo", "tofu", "tvp", "queijo"],
  jantar: ["sardinha", "frango", "pintado", "patinho", "ovo", "acem", "tofu", "tvp", "queijo"],
  lanche: ["iogurte", "leiteS", "queijo", "whey", "vegpo", "ovo", "tofu"],
  ceia: ["iogurte", "leiteS", "whey", "vegpo", "queijo", "ovo", "tofu"]
};
var PCAP = { abadejo: 200, pintado: 200, tvp: 250, leiteS: 400, frango: 200, patinho: 200, acem: 180, sardinha: 160, ovo: 150, queijo: 75, iogurte: 340, tofu: 250, whey: 60, vegpo: 60 };
var CCAP = { arroz: 250, arrozI: 250, batataD: 300, batata: 350, mandioca: 250, cuscuz: 220, aveia: 80, pao: 150 };
var POWDER = ["whey", "vegpo"];
function allowed(id, cfg) {
  var f = FOODS[id];
  if (cfg.style === "vegan" && !f.vegan) return false;
  if (cfg.style === "veg" && !f.veg) return false;
  if (cfg.nolact && f.lact) return false;
  if (cfg.nogluten && f.gluten) return false;
  if (cfg.rout === "budget" && !f.cheap) return false;
  if (cfg.rout === "corrido" && !f.fast) return false;
  return true;
}
function qty(id, g) {
  var u = FOODS[id].unit;
  if (u) return Math.max(u[0], Math.round(g / u[0]) * u[0]);
  return Math.max(5, Math.round(g / 5) * 5);
}
function prefList(slot, cfg) {
  return PREF[slot].filter(function(id) {
    return allowed(id, cfg);
  });
}
function rolePool(role, cfg, slot) {
  var out = [];
  for (var id in FOODS) if (FOODS[id].role === role && allowed(id, cfg)) out.push(id);
  if (role === "carb") {
    if (slot === "cafe" || slot === "lanche") out = out.filter(function(id2) {
      return ["pao", "aveia", "cuscuz", "batataD"].indexOf(id2) >= 0;
    });
    else out = out.filter(function(id2) {
      return ["pao", "aveia"].indexOf(id2) < 0;
    });
    if (cfg.style === "lowc") out = out.filter(function(id2) {
      return ["batataD", "cuscuz", "aveia"].indexOf(id2) >= 0;
    });
  }
  if (role === "fat") {
    if (slot === "almoco" || slot === "jantar") out = out.filter(function(id2) {
      return id2 === "azeite";
    });
    else out = out.filter(function(id2) {
      return id2 !== "azeite";
    });
  }
  if (role === "fruit" && cfg.style === "lowc") out = out.filter(function(id2) {
    return id2 !== "banana";
  });
  return out;
}
function boosters(cfg, slot, used) {
  var main = slot === "almoco" || slot === "jantar";
  var out = prefList(slot, cfg).filter(function(id) {
    return used.indexOf(id) < 0;
  });
  if (cfg.style === "omni" || cfg.style === "lowc") out = out.filter(function(id) {
    return ["tofu", "tvp", "leiteS"].indexOf(id) < 0;
  });
  if (main) {
    ["whey", "vegpo"].forEach(function(id) {
      if ((cfg.style === "veg" || cfg.style === "vegan") && allowed(id, cfg) && used.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id);
    });
    if (cfg.style === "omni" || cfg.style === "lowc") out = out.filter(function(id) {
      return ["tofu", "tvp", "leiteS"].indexOf(id) < 0 && POWDER.indexOf(id) < 0;
    });
  }
  out.sort(function(a, b) {
    return FOODS[b].v[1] - FOODS[a].v[1];
  });
  return out;
}
function targets(cfg) {
  if (cfg.kcalMeta != null) {
    var Pm = cfg.protG;
    var Fm = cfg.kcalMeta * (cfg.style === "lowc" ? 0.4 : 0.27) / 9;
    var Cm = (cfg.kcalMeta - 4 * Pm - 9 * Fm) / 4;
    return { kcal: cfg.kcalMeta, P: Pm, C: Math.max(Cm, 0), F: Fm };
  }
  var o = OBJ[cfg.obj];
  var minor = cfg.age < 18;
  var k = minor && o.minorK ? o.minorK : o.k;
  if (minor && cfg.obj === "cut") k = 1;
  var kcal = cfg.tdee * k;
  var P = cfg.kg * o.prot;
  if (minor && P > cfg.kg * 2) P = cfg.kg * 2;
  var fatShare = cfg.style === "lowc" ? 0.4 : o.fat;
  var F = kcal * fatShare / 9;
  var C = (kcal - 4 * P - 9 * F) / 4;
  return { kcal, P, C: Math.max(C, 0), F };
}
function dayTargets(t, d) {
  var kcal = t.kcal * (TRAIN[d] ? 1.06 : 0.85);
  var C = Math.max(0, (kcal - 4 * t.P - 9 * t.F) / 4);
  return { kcal, P: t.P, F: t.F, C, train: !!TRAIN[d] };
}
function macros(items) {
  var s = { kcal: 0, P: 0, C: 0, F: 0 };
  items.forEach(function(it) {
    var v = FOODS[it.id].v, g = it.g / 100;
    s.kcal += v[0] * g;
    s.P += v[1] * g;
    s.C += v[2] * g;
    s.F += v[3] * g;
  });
  return s;
}
function pick(list, i) {
  return list.length ? list[(i % list.length + list.length) % list.length] : null;
}
function capOf(it) {
  return it.role === "prot" ? PCAP[it.id] || 250 : it.role === "carb" ? CCAP[it.id] || 300 : it.role === "fat" ? it.id === "azeite" ? 39 : 60 : it.role === "fruit" ? 300 : 9999;
}
function buildMeal(slotKey, d, cfg, dt, mealIdx) {
  var S = SLOT[slotKey];
  var ms = ROUT[cfg.rout].meals, sS = 0, sP = 0;
  ms.forEach(function(k) {
    sS += SLOT[k].share;
    sP += SLOT[k].prot;
  });
  var Kt = dt.kcal * S.share / sS, Pt = dt.P * S.prot / sP, Ft = dt.F * S.share / sS;
  var Ct = Math.max(0, (Kt - 4 * Pt - 9 * Ft) / 4);
  var seed = d + mealIdx;
  if (cfg.rout === "marmita" && (slotKey === "almoco" || slotKey === "jantar")) seed = (d < 4 ? 0 : 1) + mealIdx;
  var items = [];
  var has = function(r) {
    return S.comp.indexOf(r) >= 0;
  };
  var vegId = has("veg") ? pick(rolePool("veg", cfg, slotKey), seed) : null;
  var fruitId = has("fruit") ? pick(rolePool("fruit", cfg, slotKey), seed + 1) : null;
  var legId = has("leg") && slotKey === "almoco" ? pick(rolePool("leg", cfg, slotKey), seed) : null;
  if (vegId) items.push({ id: vegId, g: 90, role: "veg" });
  if (fruitId) items.push({ id: fruitId, g: qty(fruitId, slotKey === "lanche" ? 120 : 100), role: "fruit" });
  if (legId) items.push({ id: legId, g: 100, role: "leg" });
  var prefs = prefList(slotKey, cfg);
  var main = slotKey === "almoco" || slotKey === "jantar";
  if (cfg.style === "omni" || cfg.style === "lowc") prefs = prefs.filter(function(id) {
    return ["tofu", "tvp", "leiteS"].indexOf(id) < 0;
  });
  if (!prefs.length) prefs = prefList(slotKey, cfg);
  var pId = pick(prefs, seed);
  var used = [];
  function addProt(id, need) {
    var pv = FOODS[id].v;
    var cap = PCAP[id] || 250;
    var g = qty(id, Math.min(cap, need / pv[1] * 100));
    if (g > cap + 1) g = Math.floor(cap / (FOODS[id].unit ? FOODS[id].unit[0] : 5)) * (FOODS[id].unit ? FOODS[id].unit[0] : 5);
    items.push({ id, g, role: "prot" });
    used.push(id);
  }
  var carbPool = has("carb") ? rolePool("carb", cfg, slotKey) : [];
  var cur = macros(items);
  var cNeed = Ct - cur.C - (pId ? 0 : 0);
  var carbIds = [];
  if (carbPool.length && cNeed > 8) {
    var c1 = pick(carbPool, seed);
    var gc = qty(c1, Math.min(CCAP[c1], cNeed / FOODS[c1].v[2] * 100));
    items.push({ id: c1, g: gc, role: "carb" });
    carbIds.push(c1);
    var left = cNeed - gc * FOODS[c1].v[2] / 100;
    var rest = carbPool.filter(function(id) {
      return id !== c1;
    });
    if (left > 15 && rest.length && (slotKey === "almoco" || slotKey === "jantar")) {
      var c2 = pick(rest, seed + 1);
      var g2 = qty(c2, Math.min(CCAP[c2], left / FOODS[c2].v[2] * 100));
      items.push({ id: c2, g: g2, role: "carb" });
    }
  }
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
  var fatPool = has("fat") ? rolePool("fat", cfg, slotKey) : [];
  if (fatPool.length) {
    cur = macros(items);
    var fId = pick(fatPool, seed);
    var fneed = Math.max(0, Ft - cur.F);
    var gf = fneed / FOODS[fId].v[3] * 100;
    if (fId === "azeite") gf = Math.min(Math.round(gf / 13) * 13, 39);
    else gf = Math.min(Math.round(gf / 5) * 5, 60);
    var minG = fId === "azeite" ? 13 : 15;
    if (gf >= minG) items.push({ id: fId, g: gf, role: "fat" });
  }
  var m = macros(items);
  return { slot: slotKey, name: S.n, items, m, target: { kcal: Kt, P: Pt } };
}
function dayTotals(meals) {
  var s = { kcal: 0, P: 0, C: 0, F: 0 };
  meals.forEach(function(ml) {
    var m = ml.m || macros(ml.items);
    s.kcal += m.kcal;
    s.P += m.P;
    s.C += m.C;
    s.F += m.F;
  });
  return s;
}
function buildDay(d, cfg) {
  var t = targets(cfg), dt = dayTargets(t, d);
  var meals = ROUT[cfg.rout].meals.map(function(k, i) {
    return buildMeal(k, d, cfg, dt, i);
  });
  for (var pass = 0; pass < 4; pass++) {
    var tot = dayTotals(meals);
    var diff = dt.kcal - tot.kcal;
    if (Math.abs(diff) / dt.kcal < 0.03) break;
    var set = [];
    meals.forEach(function(ml) {
      ml.items.forEach(function(it) {
        if (it.role === "carb" || it.role === "fruit" || it.role === "fat" && (pass >= 1 || cfg.style === "lowc")) set.push(it);
      });
    });
    var base = set.reduce(function(a, it) {
      return a + FOODS[it.id].v[0] * it.g / 100;
    }, 0);
    if (base < 1) break;
    var f = Math.min(2.2, Math.max(0.25, 1 + diff / base));
    set.forEach(function(it) {
      var ng = it.g * f;
      if (it.id === "azeite") ng = Math.round(ng / 13) * 13;
      else ng = qty(it.id, ng);
      if (ng > capOf(it)) ng = capOf(it) - capOf(it) % (FOODS[it.id].unit ? FOODS[it.id].unit[0] : 5);
      it.g = ng;
    });
    meals.forEach(function(ml) {
      ml.items = ml.items.filter(function(it) {
        return it.g > 0;
      });
      ml.m = macros(ml.items);
    });
  }
  return { day: d, label: DAYS[d], train: dt.train, meals, tot: dayTotals(meals), target: dt };
}
function shopping(week) {
  var acc = {};
  week.forEach(function(day) {
    day.meals.forEach(function(ml) {
      ml.items.forEach(function(it) {
        acc[it.id] = (acc[it.id] || 0) + it.g;
      });
    });
  });
  return Object.keys(acc).map(function(id) {
    return { id, g: acc[id] };
  });
}

// cardapio/ui.js
var CDP_JEITOS = [["omni", "Onívoro"], ["veg", "Vegetariano"], ["vegan", "Vegano"], ["lowc", "Low carb"]];
var CDP_ROTINAS = [["marmita", "Marmita da semana"], ["corrido", "Dia corrido"], ["budget", "Orçamento enxuto"], ["fora", "Almoço fora"]];
var CDP_RESTR = [["lactose", "Sem lactose"], ["gluten", "Sem glúten"]];
var CDP_ROT_DESC = {
  marmita: "5 refeições; cozinhe no domingo e na quinta e use em lotes.",
  corrido: "4 refeições de preparo rápido, para dias apertados.",
  budget: "5 refeições só com alimentos de custo menor.",
  fora: "4 refeições; no almoço, dica de como montar o prato por quilo."
};
var CDP_OBJ_TXT = { deficit: "Emagrecimento", manutencao: "Manutenção", superavit: "Hipertrofia" };
var CDP_GRUPOS = [["Proteínas", ["prot"]], ["Carboidratos e leguminosas", ["carb", "leg"]], ["Frutas e vegetais", ["fruit", "veg"]], ["Gorduras", ["fat"]]];
var CDP_SEM_META = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';
function normalizaCfg(settings) {
  const c = settings && settings.cardapio || {};
  const r = c.restricoes || {};
  return {
    jeito: STYLE[c.jeito] ? c.jeito : r.vegetariano ? "veg" : "omni",
    // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: { lactose: !!r.lactose, gluten: !!r.gluten }
  };
}
function montaVisao(e, h) {
  const { num, escapeHtml, menorDeIdade } = h;
  const { kcalAlvo, macros: macros2, cfg, objetivo } = e, p = e.perfil || {};
  const cdpQtd = (id, g, compras) => {
    const f = FOODS[id], un = f.liq ? "ml" : "g";
    let q = g >= 1e3 ? num(g / 1e3, 1) + (f.liq ? " L" : " kg") : num(g, 0) + " " + un;
    if (f.unit && !(compras && id === "azeite")) {
      const n = Math.max(1, Math.round(g / f.unit[0]));
      q = n + " " + (n > 1 ? f.unit[2] : f.unit[1]) + " (≈ " + q + ")";
    }
    return q;
  };
  const cdpNome = (f) => {
    const rot = /\*$/.test(f.n);
    return escapeHtml(rot ? f.n.replace(/\*$/, "") : f.n) + (rot ? '<sup title="valor típico de rótulo — confira o seu">*</sup>' : "");
  };
  const motor = {
    kg: macros2.proteina.g / macros2.proteina.gkg,
    age: Number(p.idade) || 30,
    kcalMeta: kcalAlvo,
    protG: macros2.proteina.g,
    style: cfg.jeito,
    rout: cfg.rotina,
    nolact: cfg.restricoes.lactose,
    nogluten: cfg.restricoes.gluten
  };
  const semana = [];
  for (let d = 0; d < 7; d++) semana.push(buildDay(d, motor));
  const dia = e.dia >= 0 && e.dia < 7 ? e.dia : 0;
  const cur = semana[dia];
  const rK = cur.tot.kcal / cur.target.kcal, rP = cur.tot.P / cur.target.P;
  const kOk = Math.abs(rK - 1) <= 0.07, pOk = rP >= 0.9;
  const chip = (lbl, val, meta, ok, un) => '<span class="cdp-tchip ' + (ok ? "ok" : "warn") + '"><b>' + lbl + "</b> " + num(val, 0) + un + (meta != null ? " <i>/ meta " + num(meta, 0) + "</i>" : "") + "</span>";
  const total = chip("kcal", cur.tot.kcal, cur.target.kcal, kOk, "") + chip("Prot.", cur.tot.P, cur.target.P, pOk, " g") + chip("Carb.", cur.tot.C, null, true, " g") + chip("Gord.", cur.tot.F, null, true, " g");
  const media = semana.reduce((a, d) => ({ k: a.k + d.tot.kcal / 7, P: a.P + d.tot.P / 7 }), { k: 0, P: 0 });
  const diasBaixos = semana.filter((d) => d.tot.P / d.target.P < 0.9).length;
  const dicas = { fora: "No por quilo, comece pelas saladas e legumes, escolha uma proteína grelhada e complete com arroz e feijão.", marmita: "Este almoço e jantar se repetem nos dias do mesmo lote (cozinhe no domingo e na quinta)." };
  const refeicoes = cur.meals.map((ml) => {
    const rows = ml.items.map((it) => {
      const f = FOODS[it.id];
      return '<div class="cdp-it"><span class="cdp-n">' + cdpNome(f) + '</span><span class="cdp-q"><b>' + escapeHtml(cdpQtd(it.id, it.g)) + "</b></span></div>";
    }).join("");
    const dica = ml.slot === "almoco" && dicas[cfg.rotina] ? '<div class="cdp-tip">' + escapeHtml(dicas[cfg.rotina]) + "</div>" : "";
    return '<section class="cdp-meal"><header class="cdp-mh"><h3>' + escapeHtml(ml.name) + '</h3><span class="cdp-mt">' + num(ml.m.kcal, 0) + " kcal · " + num(ml.m.P, 0) + " g prot.</span></header>" + rows + dica + "</section>";
  }).join("");
  const compra = shopping(semana);
  const compraHtml = CDP_GRUPOS.map((gd) => {
    const its = compra.filter((s) => gd[1].indexOf(FOODS[s.id].role) >= 0).sort((a, b) => b.g - a.g);
    if (!its.length) return "";
    return '<h4 class="cdp-gh">' + gd[0] + "</h4>" + its.map((s) => '<div class="cdp-it"><span class="cdp-n">' + cdpNome(FOODS[s.id]) + '</span><span class="cdp-q"><b>' + escapeHtml(cdpQtd(s.id, s.g, true)) + "</b></span></div>").join("");
  }).join("");
  const temRotulo = compra.some((s) => /\*$/.test(FOODS[s.id].n));
  const avisos = [];
  if (!kOk) avisos.push("Neste dia as calorias ficaram em " + Math.round(rK * 100) + "% da meta: as porções seguem um teto realista (ex.: até 250 g de arroz por refeição). Se quiser chegar mais perto, divida em mais refeições ou some um lanche.");
  if (diasBaixos > 0) avisos.push("Nesta combinação, a proteína fica abaixo de 90% da meta em " + diasBaixos + " dia(s) da semana. Para chegar mais perto: troque a rotina (ex.: Marmita da semana), inclua uma fonte concentrada (" + (cfg.jeito === "vegan" ? "tofu, soja texturizada ou proteína vegetal em pó" : cfg.jeito === "veg" ? "ovos, iogurte ou whey, se fizerem parte da sua dieta" : "ovos, iogurte ou whey") + ") ou converse com um(a) nutricionista.");
  const notaJeito = cfg.jeito === "vegan" ? "No vegano, atenção a proteína, ferro, cálcio, vitamina B12 e vitamina D: o cardápio cuida da proteína; o resto pede acompanhamento profissional." : cfg.jeito === "lowc" ? "Low carb moderado: carboidrato reduzido, sem chegar à cetose; cerca de 40% das calorias vêm de gordura." : "";
  const menor = menorDeIdade(p.idade);
  const subt = CDP_OBJ_TXT[objetivo] + " · " + num(kcalAlvo, 0) + " kcal/dia (média da semana) · " + num(macros2.proteina.g, 0) + " g de proteína";
  return {
    sub: escapeHtml(subt) + ". O objetivo segue o que você escolheu acima.",
    rotdesc: escapeHtml(CDP_ROT_DESC[cfg.rotina]),
    total,
    avisos: avisos.map((a) => '<div class="cdp-note cdp-warn">' + escapeHtml(a) + "</div>").join(""),
    refeicoes,
    compras: compraHtml + (temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "") + '<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.</div>',
    rodape: '<div class="cdp-note">Média da semana: ' + num(media.k, 0) + " kcal e " + num(media.P, 0) + " g de proteína por dia. Dias de treino levam ~6% mais calorias e os de descanso ~15% menos, então a média fecha a meta. A proteína fica em 0,25 g/kg (20–40 g) por refeição, como sugere a ISSN.</div>" + (notaJeito ? '<div class="cdp-note">' + escapeHtml(notaJeito) + "</div>" : "") + (menor ? '<div class="cdp-note">Para menores de 18 anos o cardápio nunca usa déficit calórico e o ganho de massa é moderado.</div>' : "") + '<div class="cdp-note">Exemplo calculado a partir da sua meta, com porções de alimento já preparado e medidas caseiras aproximadas (≈). Não substitui orientação de nutricionista, sobretudo com condições de saúde.</div>',
    ligados: { jeito: cfg.jeito, rotina: cfg.rotina, dia: String(dia), lactose: !!cfg.restricoes.lactose, gluten: !!cfg.restricoes.gluten }
  };
}
function criaCardapio(ctx) {
  for (const k of ["estado", "objetivo", "salvaSettings", "redesenhaDieta", "tocaSom", "num", "escapeHtml", "menorDeIdade"]) {
    if (typeof ctx[k] !== "function") throw new Error("cardapio: ctx." + k + " ausente (função esperada)");
  }
  const h = { num: ctx.num, escapeHtml: ctx.escapeHtml, menorDeIdade: ctx.menorDeIdade };
  let cdpDia = 0;
  let cdpUltimo = null;
  let montado = false;
  const ultimo = {};
  function cdpSalvar(cfg) {
    ctx.salvaSettings(Object.assign({}, ctx.estado().settings, { cardapio: { jeito: cfg.jeito, rotina: cfg.rotina, restricoes: { lactose: cfg.restricoes.lactose, gluten: cfg.restricoes.gluten } } }));
  }
  const regiao = (el, nome) => el.querySelector('[data-r="' + nome + '"]');
  const botao = (el, rot, v) => el.querySelector('[data-cdp="' + rot + '"][data-v="' + v + '"]');
  const grupo = (rotulo, itens, rot) => '<div class="cdp-chips" role="group" aria-label="' + rotulo + '">' + itens.map((i) => '<button type="button" class="cdp-chip" data-cdp="' + rot + '" data-v="' + i[0] + '" aria-pressed="false">' + i[1] + "</button>").join("") + "</div>";
  function monta(el) {
    const dias = DAYS.map((nome, i) => '<button type="button" class="cdp-day" data-cdp="dia" data-v="' + i + '" aria-pressed="false" aria-label="' + nome + (TRAIN[i] ? ", dia de treino" : ", dia de descanso") + '">' + nome + "<small>" + (TRAIN[i] ? "treino" : "descanso") + "</small></button>").join("");
    el.innerHTML = '<p class="cdp-sub" data-r="sub"></p><div class="cdp-controls"><div class="cdp-field"><span class="cdp-lbl">Jeito de comer</span>' + grupo("Jeito de comer", CDP_JEITOS, "jeito") + '</div><div class="cdp-field"><span class="cdp-lbl">Rotina</span>' + grupo("Rotina", CDP_ROTINAS, "rotina") + '<span class="cdp-note" data-r="rotdesc"></span></div><div class="cdp-field"><span class="cdp-lbl">Restrições</span>' + grupo("Restrições", CDP_RESTR, "restr") + '</div></div><div class="cdp-days" role="group" aria-label="Dia da semana">' + dias + '</div><div class="cdp-total" aria-label="Total do dia" data-r="total"></div><div data-r="avisos"></div><div class="cdp-meals" data-r="refeicoes"></div><details class="cdp-shop"><summary>Lista de compras da semana</summary><div data-r="compras"></div></details><div data-r="rodape"></div>';
    for (const k in ultimo) delete ultimo[k];
    montado = true;
  }
  function troca(el, nome, html) {
    if (ultimo[nome] === html) return;
    const no = regiao(el, nome);
    if (!no) return;
    no.innerHTML = html;
    ultimo[nome] = html;
  }
  function liga(el, rot, v, ligado) {
    const b = botao(el, rot, v);
    if (!b) return;
    if (b.classList.contains("on") !== ligado) b.classList.toggle("on", ligado);
    const val = String(ligado);
    if (b.getAttribute("aria-pressed") !== val) b.setAttribute("aria-pressed", val);
  }
  function renderCardapio(kcalAlvo, macros2) {
    const el = document.getElementById("cardapio-body");
    if (!el) return;
    if (!kcalAlvo || !macros2) {
      cdpUltimo = null;
      montado = false;
      el.innerHTML = CDP_SEM_META;
      return;
    }
    cdpUltimo = { k: kcalAlvo, m: macros2 };
    if (!montado) monta(el);
    const cfg = normalizaCfg(ctx.estado().settings);
    const v = montaVisao({ kcalAlvo, macros: macros2, cfg, perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia }, h);
    troca(el, "sub", v.sub);
    troca(el, "rotdesc", v.rotdesc);
    troca(el, "total", v.total);
    troca(el, "avisos", v.avisos);
    troca(el, "refeicoes", v.refeicoes);
    troca(el, "compras", v.compras);
    troca(el, "rodape", v.rodape);
    CDP_JEITOS.forEach((i) => liga(el, "jeito", i[0], v.ligados.jeito === i[0]));
    CDP_ROTINAS.forEach((i) => liga(el, "rotina", i[0], v.ligados.rotina === i[0]));
    CDP_RESTR.forEach((i) => liga(el, "restr", i[0], v.ligados[i[0]]));
    for (let d = 0; d < 7; d++) liga(el, "dia", String(d), v.ligados.dia === String(d));
  }
  function setupCardapio() {
    const el = document.getElementById("cardapio-body");
    if (!el) return;
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-cdp]");
      if (!b) return;
      const act = b.dataset.cdp, cfg = normalizaCfg(ctx.estado().settings);
      const yAntes = window.scrollY;
      el.style.minHeight = el.offsetHeight + "px";
      const soltaAltura = () => {
        el.style.minHeight = "";
        ["wheel", "touchmove", "keydown"].forEach((ev2) => removeEventListener(ev2, soltaAltura, true));
      };
      ["wheel", "touchmove", "keydown"].forEach((ev2) => addEventListener(ev2, soltaAltura, { passive: true, capture: true, once: true }));
      if (act === "dia") {
        cdpDia = Number(b.dataset.v) || 0;
        if (cdpUltimo) renderCardapio(cdpUltimo.k, cdpUltimo.m);
      } else {
        if (act === "jeito") cfg.jeito = b.dataset.v;
        else if (act === "rotina") cfg.rotina = b.dataset.v;
        else if (act === "restr") cfg.restricoes[b.dataset.v] = !cfg.restricoes[b.dataset.v];
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
      }
      ctx.tocaSom("tick");
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - yAntes) > 2) window.scrollTo(0, yAntes);
      });
    });
  }
  setupCardapio();
  return { render: renderCardapio };
}
export {
  criaCardapio,
  montaVisao,
  normalizaCfg
};
