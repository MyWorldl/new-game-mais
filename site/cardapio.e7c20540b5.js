// cardapio/engine.js
var TVP_CHEAP = false;
var FOODS = {
  frango: { n: "Frango grelhado", v: [159, 32, 0, 2.5], role: "prot", veg: false, cheap: true, fast: true },
  patinho: { n: "Patinho grelhado", v: [219, 35.9, 0, 7.3], role: "prot", veg: false, cheap: false, fast: false, red: true },
  acem: { n: "Carne moída (acém)", v: [212, 26.7, 0, 10.9], role: "prot", veg: false, cheap: true, fast: false, red: true },
  sardinha: { n: "Sardinha assada", v: [164, 32.2, 0, 3], role: "prot", veg: false, cheap: true, fast: true, fish: true },
  abadejo: { n: "Abadejo grelhado", v: [130, 27.6, 0, 1.3], role: "prot", veg: false, cheap: false, fast: true, fish: true },
  pintado: { n: "Pintado grelhado", v: [152, 30.8, 0, 2.3], role: "prot", veg: false, cheap: false, fast: false, fish: true },
  tvp: { n: "Soja texturizada hidratada*", v: [117, 18, 6.4, 0.6], role: "prot", veg: true, vegan: true, cheap: TVP_CHEAP, fast: true, soy: true },
  leiteS: { n: "Leite de soja", v: [39, 2.4, 4.3, 1.6], role: "prot", veg: true, vegan: true, cheap: false, fast: true, liq: true, unit: [200, "copo", "copos"], soy: true },
  ovo: { n: "Ovo cozido", v: [146, 13.3, 0.6, 9.5], role: "prot", veg: true, cheap: true, fast: true, unit: [50, "ovo", "ovos"], egg: true },
  queijo: { n: "Queijo minas", v: [264, 17.4, 3.2, 20.2], role: "prot", veg: true, cheap: false, fast: true, lact: true, unit: [25, "fatia", "fatias"] },
  iogurte: { n: "Iogurte natural", v: [51, 4.1, 1.9, 3], role: "prot", veg: true, cheap: true, fast: true, lact: true, unit: [170, "pote", "potes"] },
  tofu: { n: "Tofu", v: [64, 6.6, 2.1, 4], role: "prot", veg: true, vegan: true, cheap: false, fast: true, soy: true },
  whey: { n: "Whey protein*", v: [389, 80, 6, 5], role: "prot", veg: true, cheap: false, fast: true, lact: true, unit: [30, "dose", "doses"] },
  vegpo: { n: "Proteína vegetal em pó*", v: [389, 80, 6, 5], role: "prot", veg: true, vegan: true, cheap: false, fast: true, unit: [30, "dose", "doses"], soy: true },
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
  amendoim: { n: "Amendoim", v: [606, 22.5, 18.7, 54], role: "fat", veg: true, vegan: true, cheap: true, fast: true, nut: true },
  abacate: { n: "Abacate", v: [96, 1.2, 6, 8.4], role: "fat", veg: true, vegan: true, cheap: false, fast: true },
  // — Ampliação (13/11/2026): valores por 100 g da TACO conferidos em tabelatacoonline.com.br; itens com * = rótulo típico.
  salmao: { n: "Salmão grelhado", v: [243, 26.1, 0, 14.5], role: "prot", veg: false, cheap: false, fast: true, fish: true },
  merluza: { n: "Merluza assada", v: [122, 26.6, 0, 0.9], role: "prot", veg: false, cheap: false, fast: true, fish: true },
  corvina: { n: "Corvina assada", v: [147, 26.8, 0, 3.6], role: "prot", veg: false, cheap: false, fast: false, fish: true },
  atum: { n: "Atum em conserva (óleo)", v: [166, 26.2, 0, 6], role: "prot", veg: false, cheap: true, fast: true, fish: true },
  sobrecoxa: { n: "Sobrecoxa de frango assada", v: [233, 29.2, 0, 12], role: "prot", veg: false, cheap: true, fast: false },
  lombo: { n: "Lombo de porco assado", v: [210, 35.7, 0, 6.4], role: "prot", veg: false, cheap: false, fast: false, pork: true, red: true },
  ricota: { n: "Ricota", v: [140, 12.6, 3.8, 8.1], role: "prot", veg: true, cheap: false, fast: true, lact: true },
  mozarela: { n: "Queijo muçarela", v: [330, 22.6, 3, 25.2], role: "prot", veg: true, cheap: false, fast: true, lact: true, unit: [25, "fatia", "fatias"] },
  iogurteD: { n: "Iogurte natural desnatado", v: [41, 3.8, 5.8, 0.3], role: "prot", veg: true, cheap: true, fast: true, lact: true, unit: [170, "pote", "potes"] },
  fradinho: { n: "Feijão-fradinho", v: [78, 5.1, 13.5, 0.6], role: "leg", veg: true, vegan: true, cheap: true, fast: true },
  paoI: { n: "Pão de forma integral", v: [253, 9.4, 49.9, 3.7], role: "carb", veg: true, vegan: true, cheap: true, fast: true, gluten: true, unit: [25, "fatia", "fatias"] },
  abacaxi: { n: "Abacaxi", v: [48, 0.9, 12.3, 0.1], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  melancia: { n: "Melancia", v: [33, 0.9, 8.1, 0], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  manga: { n: "Manga Palmer", v: [72, 0.4, 19.4, 0.2], role: "fruit", veg: true, vegan: true, cheap: false, fast: true },
  morango: { n: "Morango", v: [30, 0.9, 6.8, 0.3], role: "fruit", veg: true, vegan: true, cheap: false, fast: true },
  uva: { n: "Uva Itália", v: [53, 0.7, 13.6, 0.2], role: "fruit", veg: true, vegan: true, cheap: false, fast: true },
  pera: { n: "Pera Williams", v: [53, 0.6, 14, 0.1], role: "fruit", veg: true, vegan: true, cheap: false, fast: true, unit: [150, "pera", "peras"] },
  melao: { n: "Melão", v: [29, 0.7, 7.5, 0], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  goiaba: { n: "Goiaba vermelha", v: [54, 1.1, 13, 0.4], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  kiwi: { n: "Kiwi", v: [51, 1.3, 11.5, 0.6], role: "fruit", veg: true, vegan: true, cheap: false, fast: true },
  tangerina: { n: "Tangerina (ponkan)", v: [38, 0.8, 9.6, 0.1], role: "fruit", veg: true, vegan: true, cheap: true, fast: true },
  cenoura: { n: "Cenoura cozida", v: [30, 0.8, 6.7, 0.2], role: "veg", veg: true, vegan: true, cheap: true, fast: false },
  abobrinha: { n: "Abobrinha italiana cozida", v: [15, 1.1, 3, 0.2], role: "veg", veg: true, vegan: true, cheap: true, fast: true },
  couveflor: { n: "Couve-flor cozida", v: [19, 1.2, 3.9, 0.3], role: "veg", veg: true, vegan: true, cheap: false, fast: false },
  beterraba: { n: "Beterraba cozida", v: [32, 1.3, 7.2, 0.1], role: "veg", veg: true, vegan: true, cheap: true, fast: false },
  alface: { n: "Alface crespa", v: [11, 1.3, 1.7, 0.2], role: "veg", veg: true, vegan: true, cheap: true, fast: true },
  chuchu: { n: "Chuchu cozido", v: [19, 0.4, 4.8, 0], role: "veg", veg: true, vegan: true, cheap: true, fast: false },
  pepino: { n: "Pepino", v: [10, 0.9, 2, 0], role: "veg", veg: true, vegan: true, cheap: true, fast: true },
  abobora: { n: "Abóbora cabotiá cozida", v: [48, 1.4, 10.8, 0.7], role: "veg", veg: true, vegan: true, cheap: true, fast: false },
  castanhaP: { n: "Castanha-do-Brasil", v: [643, 14.5, 15.1, 63.5], role: "fat", veg: true, vegan: true, cheap: false, fast: true, nut: true },
  castanhaC: { n: "Castanha-de-caju torrada", v: [570, 18.5, 29.1, 46.3], role: "fat", veg: true, vegan: true, cheap: false, fast: true, nut: true }
};
var OBJ = {
  cut: { n: "Cutting", k: 0.85, prot: 2.2, fat: 0.25, minor: false },
  bulk: { n: "Bulking limpo", k: 1.1, prot: 1.8, fat: 0.25, minorK: 1.05 },
  maint: { n: "Manutenção/recomposição", k: 1, prot: 2, fat: 0.28 }
};
var STYLE = { omni: "Onívoro", pesc: "Pescetariano", veg: "Vegetariano", vegan: "Vegano", lowc: "Low carb moderado" };
var ROUT = {
  tradicional: { n: "Dia tradicional", meals: ["cafe", "almoco", "lanche", "jantar", "ceia"] },
  // dia a dia brasileiro: arroz e feijão no almoço e no jantar, sem lotes e sem filtro de preço ou pressa
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
  manha: { n: "Lanche da manhã", share: 0.1, prot: 0.12, comp: ["carb", "prot", "fruit"] },
  ceia: { n: "Ceia", share: 0.1, prot: 0.1, comp: ["prot", "fruit", "fat"] }
};
var MEALS_N = {
  3: ["cafe", "almoco", "jantar"],
  4: ["cafe", "almoco", "lanche", "jantar"],
  5: ["cafe", "almoco", "lanche", "jantar", "ceia"],
  6: ["cafe", "manha", "almoco", "lanche", "jantar", "ceia"]
};
var HORARIOS = {
  3: { cafe: "07:00", almoco: "12:30", jantar: "19:30" },
  4: { cafe: "07:00", almoco: "12:00", lanche: "16:00", jantar: "19:30" },
  5: { cafe: "07:00", almoco: "12:00", lanche: "15:30", jantar: "19:00", ceia: "21:30" },
  6: { cafe: "07:00", manha: "09:30", almoco: "12:30", lanche: "15:30", jantar: "19:00", ceia: "21:30" }
};
function nRefeicoes(cfg) {
  if (cfg.rout === "marmita") return 5;
  var n = Number(cfg.nref);
  return n >= 3 && n <= 6 && Math.floor(n) === n ? n : ROUT[cfg.rout].meals.length;
}
function mealsOf(cfg) {
  return cfg.rout === "marmita" ? ROUT.marmita.meals : MEALS_N[nRefeicoes(cfg)];
}
function horarioDe(slot, cfg) {
  var t = HORARIOS[nRefeicoes(cfg)];
  return t && t[slot] || null;
}
var DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
var TRAIN = [1, 1, 0, 1, 1, 1, 0];
var PREF = {
  cafe: ["ovo", "queijo", "iogurte", "iogurteD", "ricota", "mozarela", "leiteS", "tofu", "whey", "vegpo"],
  almoco: ["frango", "patinho", "abadejo", "sobrecoxa", "acem", "merluza", "sardinha", "lombo", "corvina", "atum", "salmao", "ovo", "tofu", "tvp", "queijo", "ricota"],
  jantar: ["sardinha", "frango", "pintado", "merluza", "patinho", "sobrecoxa", "ovo", "acem", "salmao", "lombo", "corvina", "atum", "tofu", "tvp", "queijo", "ricota"],
  lanche: ["iogurte", "iogurteD", "leiteS", "queijo", "ricota", "mozarela", "whey", "vegpo", "ovo", "tofu"],
  ceia: ["iogurte", "iogurteD", "ricota", "leiteS", "whey", "vegpo", "queijo", "ovo", "tofu"]
};
PREF.manha = PREF.lanche;
var PCAP = { salmao: 200, merluza: 220, corvina: 200, atum: 120, sobrecoxa: 200, lombo: 200, ricota: 120, mozarela: 75, iogurteD: 340, abadejo: 200, pintado: 200, tvp: 250, leiteS: 400, frango: 200, patinho: 200, acem: 180, sardinha: 160, ovo: 150, queijo: 75, iogurte: 340, tofu: 250, whey: 60, vegpo: 60 };
var CCAP = { paoI: 100, arroz: 250, arrozI: 250, batataD: 300, batata: 350, mandioca: 250, cuscuz: 220, aveia: 80, pao: 150 };
var POWDER = ["whey", "vegpo"];
function allowed(id, cfg) {
  var f = FOODS[id];
  if (cfg.meus && cfg.meus.indexOf(id) < 0) return false;
  if (cfg.style === "vegan" && !f.vegan) return false;
  if (cfg.style === "veg" && !f.veg) return false;
  if (cfg.style === "pesc" && !(f.veg || f.fish)) return false;
  if (cfg.nolact && f.lact) return false;
  if (cfg.nogluten && f.gluten) return false;
  if (cfg.noegg && f.egg) return false;
  if (cfg.nosoy && f.soy) return false;
  if (cfg.nofish && f.fish) return false;
  if (cfg.nonut && f.nut) return false;
  if (cfg.nopork && f.pork) return false;
  if (cfg.nored && f.red) return false;
  if (cfg.rout === "budget" && !f.cheap) return false;
  if (cfg.rout === "corrido" && !f.fast) return false;
  return true;
}
function normalizaMeus(lista) {
  if (!Array.isArray(lista)) return null;
  var out = [];
  lista.forEach(function(id) {
    if (typeof id === "string" && FOODS[id] && out.indexOf(id) < 0) out.push(id);
  });
  return out.length ? out : null;
}
function alimentosDisponiveis(cfg) {
  var c = Object.assign({}, cfg, { meus: null, rout: "marmita" }), out = [];
  for (var id in FOODS) if (allowed(id, c)) out.push(id);
  return out;
}
function retiraAlimento(cfg, id) {
  var f = FOODS[id];
  if (!f) return { ok: false, motivo: "desconhecido" };
  var disp = alimentosDisponiveis(cfg);
  var marcados = cfg.meus ? disp.filter(function(i) {
    return cfg.meus.indexOf(i) >= 0;
  }) : disp.slice();
  if (marcados.indexOf(id) < 0) return { ok: false, motivo: "ja_fora" };
  var restantes = marcados.filter(function(i) {
    return i !== id;
  });
  if (restantes.filter(function(i) {
    return FOODS[i].role === f.role;
  }).length < 2) return { ok: false, motivo: "categoria", role: f.role };
  if (validaRestricoes(Object.assign({}, cfg, { meus: restantes })).semProteina) return { ok: false, motivo: "proteina", role: f.role };
  return { ok: true, meus: restantes };
}
function normalizaFavs(lista) {
  if (!Array.isArray(lista)) return [];
  var out = [];
  lista.forEach(function(id) {
    if (typeof id === "string" && FOODS[id] && out.indexOf(id) < 0) out.push(id);
  });
  return out;
}
function ordFav(lista, cfg) {
  var f = cfg && cfg.favs;
  if (!f || !f.length) return lista;
  var a = [], b = [];
  lista.forEach(function(id) {
    (f.indexOf(id) >= 0 ? a : b).push(id);
  });
  return a.concat(b);
}
function qty(id, g) {
  var u = FOODS[id].unit;
  if (u) return Math.max(u[0], Math.round(g / u[0]) * u[0]);
  return Math.max(5, Math.round(g / 5) * 5);
}
function prefList(slot, cfg) {
  return ordFav(PREF[slot].filter(function(id) {
    return allowed(id, cfg);
  }), cfg);
}
function rolePool(role, cfg, slot) {
  var out = [];
  for (var id in FOODS) if (FOODS[id].role === role && allowed(id, cfg)) out.push(id);
  if (role === "carb") {
    if (slot === "cafe" || slot === "lanche" || slot === "manha") out = out.filter(function(id2) {
      return ["pao", "paoI", "aveia", "cuscuz", "batataD"].indexOf(id2) >= 0;
    });
    else if (cfg.rout === "tradicional") out = out.filter(function(id2) {
      return ["arroz", "arrozI", "mandioca", "batata", "batataD"].indexOf(id2) >= 0;
    });
    else out = out.filter(function(id2) {
      return ["pao", "paoI", "aveia"].indexOf(id2) < 0;
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
    return ["banana", "manga", "uva"].indexOf(id2) < 0;
  });
  if (role === "veg" && cfg.style === "lowc") out = out.filter(function(id2) {
    return ["beterraba", "abobora"].indexOf(id2) < 0;
  });
  return ordFav(out, cfg);
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
      if ((cfg.style === "veg" || cfg.style === "vegan" || cfg.style === "pesc") && allowed(id, cfg) && used.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id);
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
  var ms = mealsOf(cfg), sS = 0, sP = 0;
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
  var legId = has("leg") && slotKey === "almoco" || cfg.rout === "tradicional" && slotKey === "jantar" ? pick(rolePool("leg", cfg, slotKey), seed + (slotKey === "jantar" ? 1 : 0)) : null;
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
function semRotina(cfg) {
  return Object.assign({}, cfg, { rout: "marmita" });
}
function alternativasIds(role, slot, cfg) {
  var c = semRotina(cfg), out;
  if (role === "prot") {
    var main = slot === "almoco" || slot === "jantar";
    out = (PREF[slot] || []).filter(function(id) {
      return allowed(id, c);
    });
    if (cfg.style === "omni" || cfg.style === "lowc") out = out.filter(function(id) {
      return ["tofu", "tvp", "leiteS"].indexOf(id) < 0;
    });
    if (main && (cfg.style === "veg" || cfg.style === "vegan" || cfg.style === "pesc")) POWDER.forEach(function(id) {
      if (allowed(id, c) && out.indexOf(id) < 0) out.push(id);
    });
    if (main && (cfg.style === "omni" || cfg.style === "lowc")) out = out.filter(function(id) {
      return POWDER.indexOf(id) < 0;
    });
  } else {
    out = rolePool(role, c, slot);
  }
  return ordFav(out, cfg);
}
function podeTrocar(de, para, slot, cfg) {
  var a = FOODS[de], b = FOODS[para];
  if (!a || !b || de === para || !SLOT[slot] || a.role !== b.role) return false;
  return alternativasIds(a.role, slot, cfg).indexOf(para) >= 0;
}
function gramasTroca(it, para) {
  var a = FOODS[it.id].v, b = FOODS[para].v, g = it.g / 100, ng = it.g;
  if (it.role === "prot" && b[1] > 0) ng = a[1] * g / b[1] * 100;
  else if ((it.role === "carb" || it.role === "leg" || it.role === "fruit") && b[2] > 0) ng = a[2] * g / b[2] * 100;
  else if (it.role === "fat" && b[3] > 0) ng = a[3] * g / b[3] * 100;
  var novo = { id: para, role: it.role };
  var cap = capOf(novo), u = FOODS[para].unit ? FOODS[para].unit[0] : 5;
  if (para === "azeite") return Math.max(13, Math.min(Math.round(ng / 13) * 13, 39));
  ng = qty(para, ng);
  if (ng > cap) ng = Math.max(u, cap - cap % u);
  return ng;
}
function trocasDoDia(cfg, d) {
  var t = cfg.trocas || [];
  return t.filter(function(x) {
    return x.d === -1;
  }).concat(t.filter(function(x) {
    return x.d === d;
  }));
}
function aplicaTrocas(meals, d, cfg) {
  trocasDoDia(cfg, d).forEach(function(tr) {
    meals.forEach(function(ml) {
      if (ml.slot !== tr.s) return;
      var it = null;
      for (var i = 0; i < ml.items.length; i++) if (ml.items[i].id === tr.de) {
        it = ml.items[i];
        break;
      }
      if (!it || !podeTrocar(tr.de, tr.para, ml.slot, cfg)) return;
      if (ml.items.some(function(o) {
        return o !== it && o.id === tr.para;
      })) return;
      var ng = gramasTroca(it, tr.para);
      it.orig = it.orig || it.id;
      it.id = tr.para;
      it.g = ng;
      it.troca = true;
    });
  });
}
function normalizaTrocas(lista) {
  if (!Array.isArray(lista)) return [];
  var out = [];
  lista.forEach(function(x) {
    if (out.length >= 120 || !x || typeof x !== "object") return;
    var d = Number(x.d);
    if (!(d === -1 || d >= 0 && d <= 6 && Math.floor(d) === d)) return;
    if (!SLOT[x.s] || !FOODS[x.de] || !FOODS[x.para] || x.de === x.para || FOODS[x.de].role !== FOODS[x.para].role) return;
    out.push({ d, s: x.s, de: x.de, para: x.para });
  });
  return out;
}
function desfazCadeia(trocas, d, s, idAtual, soDia) {
  var out = trocas.slice(), cur = idAtual, g = 0, escopo = { dia: false, todos: false };
  while (g++ < 30) {
    var i = -1, k;
    for (k = out.length - 1; k >= 0; k--) if (out[k].s === s && out[k].d === d && out[k].para === cur) {
      i = k;
      break;
    }
    if (i < 0 && !soDia) {
      for (k = out.length - 1; k >= 0; k--) if (out[k].s === s && out[k].d === -1 && out[k].para === cur) {
        i = k;
        break;
      }
    }
    if (i < 0) break;
    if (out[i].d === -1) escopo.todos = true;
    else escopo.dia = true;
    cur = out[i].de;
    out.splice(i, 1);
  }
  return { trocas: out, id: cur, escopo };
}
function registraTroca(trocas, d, s, atual, para, escopo) {
  if (escopo === "todos") {
    var r = desfazCadeia(trocas, d, s, atual, false);
    if (para === r.id) return r.trocas;
    return r.trocas.concat([{ d: -1, s, de: r.id, para }]);
  }
  var r2 = desfazCadeia(trocas, d, s, atual, true);
  if (para === r2.id) return r2.trocas;
  return r2.trocas.concat([{ d, s, de: r2.id, para }]);
}
function validaRestricoes(cfg) {
  var slots = mealsOf(cfg), todas = {}, avisos = [], semProt = [], semCarb = [];
  slots.forEach(function(sl) {
    var p = alternativasIds("prot", sl, cfg);
    p.forEach(function(id) {
      todas[id] = 1;
    });
    if (!p.length) semProt.push(SLOT[sl].n);
    if ((sl === "almoco" || sl === "jantar") && !rolePool("carb", semRotina(cfg), sl).length) semCarb.push(SLOT[sl].n);
  });
  var fontes = Object.keys(todas).length;
  var leg = rolePool("leg", semRotina(cfg), "almoco").length;
  var semProteina = fontes === 0;
  if (semProteina) avisos.push("Com esta combinação de filtros não sobra nenhum alimento de proteína concentrada" + (leg ? " (só feijão e lentilha, que ajudam, mas não fecham a meta)" : "") + ". Desligue algum filtro ou procure um(a) nutricionista para montar o seu plano.");
  else if (semProt.length) avisos.push("Sem opção de proteína em: " + semProt.join(", ") + ". Essas refeições ficam só com carboidrato, frutas e vegetais; desligue algum filtro para voltar a ter proteína nelas.");
  if (!semProteina && fontes <= 3) avisos.push("Sobraram só " + fontes + " alimentos de proteína: o cardápio vai repetir bastante. Se puder, desligue algum filtro para ganhar variedade.");
  if (semCarb.length) avisos.push("Sem opção de carboidrato no " + semCarb.join(" e no ") + ": o cardápio não consegue fechar as calorias nessas refeições.");
  return { fontes, avisos, semProteina };
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
  var meals = mealsOf(cfg).map(function(k, i) {
    return buildMeal(k, d, cfg, dt, i);
  });
  aplicaTrocas(meals, d, cfg);
  meals.forEach(function(ml) {
    ml.m = macros(ml.items);
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
    var base2 = set.reduce(function(a, it) {
      return a + FOODS[it.id].v[0] * it.g / 100;
    }, 0);
    if (base2 < 1) break;
    var f = Math.min(2.2, Math.max(0.25, 1 + diff / base2));
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

// cardapio/pdf.js
var W = [
  278,
  278,
  355,
  556,
  556,
  889,
  667,
  191,
  333,
  333,
  389,
  584,
  278,
  333,
  278,
  278,
  556,
  556,
  556,
  556,
  556,
  556,
  556,
  556,
  556,
  556,
  278,
  278,
  584,
  584,
  584,
  556,
  1015,
  667,
  667,
  722,
  722,
  667,
  611,
  778,
  722,
  278,
  500,
  667,
  556,
  833,
  722,
  778,
  667,
  778,
  722,
  667,
  611,
  722,
  667,
  944,
  667,
  667,
  611,
  278,
  278,
  278,
  469,
  556,
  333,
  556,
  556,
  500,
  556,
  556,
  278,
  556,
  556,
  222,
  222,
  500,
  222,
  833,
  556,
  556,
  556,
  556,
  333,
  500,
  278,
  556,
  500,
  722,
  500,
  500,
  500,
  334,
  260,
  334,
  584
];
var base = (c) => c.normalize("NFD").replace(/[̀-ͯ]/g, "");
function larguraTexto(s, tam, negrito) {
  let w = 0;
  for (const ch of String(s)) {
    const b = base(ch), code = b.charCodeAt(0);
    w += code >= 32 && code <= 126 ? W[code - 32] : ch === "—" ? 1e3 : ch === "–" ? 556 : 556;
  }
  return w / 1e3 * tam * (negrito ? 1.06 : 1);
}
var ESPECIAIS = { "≈": "~", "—": "", "–": "", "·": "·", "•": "", "’": "", "‘": "", "“": "", "”": "", "…": "", "×": "×", "º": "º", "ª": "ª", "→": "->", "↑": "^", "↓": "v" };
function codifica(s) {
  let out = "";
  for (const ch of String(s).normalize("NFC")) {
    const c = ch.charCodeAt(0);
    let o = ESPECIAIS[ch];
    if (o == null) o = c < 256 ? ch : "?";
    out += o.replace(/[\\()]/g, (m) => "\\" + m);
  }
  return out;
}
var A4 = { w: 595.28, h: 841.89 };
var M = 42;
var num = (n) => (Math.round(n * 100) / 100).toString();
function montaPdf(d) {
  const paginas = [];
  let ops = [], y = 0, pg = null;
  const tx = (x, yy, s, tam, neg, cor) => ops.push("BT /" + (neg ? "F2" : "F1") + " " + tam + " Tf " + (cor || "0.1 0.12 0.16") + " rg " + num(x) + " " + num(yy) + " Td (" + codifica(s) + ") Tj ET");
  const txDir = (xDir, yy, s, tam, neg, cor) => tx(xDir - larguraTexto(s, tam, neg), yy, s, tam, neg, cor);
  const linha = (x1, y1, x2, y2, cor, esp, trac) => ops.push((trac ? "[" + trac + "] 0 d " : "") + num(esp || 0.5) + " w " + (cor || "0.85 G") + " " + num(x1) + " " + num(y1) + " m " + num(x2) + " " + num(y2) + " l S" + (trac ? " [] 0 d" : ""));
  const novaPagina = (primeira) => {
    if (pg) paginas.push(ops.join("\n"));
    ops = [];
    pg = { primeira };
    if (primeira) {
      ops.push("0.043 0.067 0.098 rg 0 " + num(A4.h - 96) + " " + num(A4.w) + " 96 re f");
      ops.push("0.62 0.9 0.14 rg 0 " + num(A4.h - 99) + " " + num(A4.w) + " 3 re f");
      tx(M, A4.h - 46, d.titulo, 21, true, "1 1 1");
      if (d.subtitulo) tx(M, A4.h - 68, d.subtitulo, 10.5, false, "0.72 0.78 0.85");
      y = A4.h - 96 - 30;
    } else y = A4.h - M - 8;
  };
  const rodapeY = M - 8;
  const cabe = (altura) => y - altura >= M + 14;
  novaPagina(true);
  const larguraUtil = A4.w - 2 * M;
  (d.grupos || []).forEach((g) => {
    if (!g.itens.length) return;
    const cab = (cont) => {
      if (!cabe(34)) novaPagina(false);
      y -= 6;
      tx(M, y, String(g.rotulo).toUpperCase() + (cont ? "  (continuação)" : ""), 9.5, true, "0.24 0.5 0.06");
      txDir(A4.w - M, y, g.itens.length + (g.itens.length > 1 ? " itens" : " item"), 8.5, false, "0.5 0.54 0.6");
      linha(M, y - 5, A4.w - M, y - 5, "0.62 0.9 0.14 RG", 1.1);
      y -= 20;
    };
    cab(false);
    g.itens.forEach((it) => {
      const tam = 10.5, qLarg = larguraTexto(it.qtd, tam, true), nomeMax = larguraUtil - 22 - qLarg - 14;
      const palavras = String(it.nome).split(/\s+/), linhas = [];
      let atual = "";
      palavras.forEach((p) => {
        const t = atual ? atual + " " + p : p;
        if (larguraTexto(t, tam) <= nomeMax || !atual) atual = t;
        else {
          linhas.push(atual);
          atual = p;
        }
      });
      if (atual) linhas.push(atual);
      const altura = 7 + linhas.length * 13.5;
      if (!cabe(altura)) {
        novaPagina(false);
        cab(true);
      }
      const topo = y;
      const bx = M + 2, by = y - 9.5;
      ops.push((it.feito ? "0.24 0.5 0.06 rg " : "1 1 1 rg ") + "0.45 0.5 0.56 RG 0.8 w " + num(bx) + " " + num(by) + " 9.5 9.5 re B");
      if (it.feito) ops.push("1 1 1 RG 1.4 w " + num(bx + 2) + " " + num(by + 4.6) + " m " + num(bx + 4) + " " + num(by + 2.4) + " l " + num(bx + 7.6) + " " + num(by + 7.4) + " l S");
      linhas.forEach((l, i) => tx(M + 22, y - 8.5 - i * 13.5, l, tam, false, it.feito ? "0.5 0.54 0.6" : "0.1 0.12 0.16"));
      txDir(A4.w - M - 2, y - 8.5, it.qtd, tam, true, it.feito ? "0.5 0.54 0.6" : "0.1 0.12 0.16");
      y -= altura;
      linha(M + 22, y + 1.5, A4.w - M, y + 1.5, "0.9 G", 0.5, "1.5 2");
      y -= 2;
      void topo;
    });
    y -= 6;
  });
  const notas = (d.notas || []).filter(Boolean);
  if (notas.length) {
    if (!cabe(40)) novaPagina(false);
    y -= 8;
    notas.forEach((n) => {
      const tam = 8.8, palavras = String(n).split(/\s+/), linhas = [];
      let atual = "";
      palavras.forEach((p) => {
        const t = atual ? atual + " " + p : p;
        if (larguraTexto(t, tam) <= larguraUtil) atual = t;
        else {
          linhas.push(atual);
          atual = p;
        }
      });
      if (atual) linhas.push(atual);
      if (!cabe(linhas.length * 11.5 + 6)) novaPagina(false);
      linhas.forEach((l) => {
        tx(M, y - 8, l, tam, false, "0.38 0.42 0.48");
        y -= 11.5;
      });
      y -= 4;
    });
  }
  paginas.push(ops.join("\n"));
  const total = paginas.length;
  const conteudos = paginas.map((c, i) => {
    const r = [];
    r.push("0.88 G 0.5 w " + num(M) + " " + num(rodapeY + 14) + " m " + num(A4.w - M) + " " + num(rodapeY + 14) + " l S");
    r.push("BT /F1 8 Tf 0.5 0.54 0.6 rg " + num(M) + " " + num(rodapeY) + " Td (" + codifica(d.rodape || "") + ") Tj ET");
    const t = "Página " + (i + 1) + " de " + total;
    r.push("BT /F1 8 Tf 0.5 0.54 0.6 rg " + num(A4.w - M - larguraTexto(t, 8)) + " " + num(rodapeY) + " Td (" + codifica(t) + ") Tj ET");
    return c + "\n" + r.join("\n");
  });
  const objs = [];
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = conteudos.map((_, i) => 5 + i * 2 + " 0 R").join(" ");
  objs.push("<< /Type /Pages /Kids [" + kids + "] /Count " + total + " >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  conteudos.forEach((c, i) => {
    objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 " + num(A4.w) + " " + num(A4.h) + "] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (6 + i * 2) + " 0 R >>");
    objs.push("<< /Length " + c.length + " >>\nstream\n" + c + "\nendstream");
  });
  const info = objs.length + 1;
  objs.push("<< /Title (" + codifica(d.titulo) + ") /Subject (" + codifica(d.assunto || "") + ") /Producer (NG+) /Creator (NG+) >>");
  let arq = "%PDF-1.4\n%âãÏÓ\n";
  const pos = [];
  objs.forEach((o, i) => {
    pos.push(arq.length);
    arq += i + 1 + " 0 obj\n" + o + "\nendobj\n";
  });
  const xref = arq.length;
  arq += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + pos.map((p) => String(p).padStart(10, "0") + " 00000 n \n").join("");
  arq += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R /Info " + info + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  const bytes = new Uint8Array(arq.length);
  for (let i = 0; i < arq.length; i++) bytes[i] = arq.charCodeAt(i) & 255;
  return bytes;
}

// cardapio/ui.js
var CDP_JEITOS = [["omni", "Onívoro"], ["pesc", "Pescetariano"], ["veg", "Vegetariano"], ["vegan", "Vegano"], ["lowc", "Low carb"]];
var CDP_ROTINAS = [["tradicional", "Dia tradicional"], ["marmita", "Marmita da semana"], ["corrido", "Dia corrido"], ["budget", "Orçamento enxuto"], ["fora", "Almoço fora"]];
var CDP_RESTR = [["lactose", "Sem lactose"], ["gluten", "Sem glúten"], ["ovo", "Sem ovo"], ["soja", "Sem soja"], ["peixe", "Sem peixe"], ["castanhas", "Sem amendoim e castanhas"], ["porco", "Sem carne de porco"], ["vermelha", "Sem carne vermelha"]];
var CDP_RESTR_MOTOR = { lactose: "nolact", gluten: "nogluten", ovo: "noegg", soja: "nosoy", peixe: "nofish", castanhas: "nonut", porco: "nopork", vermelha: "nored" };
var CDP_NREF = [3, 4, 5, 6];
var CDP_ROT_DESC = {
  tradicional: (n) => n + " refeições do dia a dia, com arroz e feijão no almoço e no jantar; cada dia tem o seu cardápio, sem lotes.",
  marmita: (n) => n + " refeições fixas; cozinhe no domingo e na quinta e use em lotes.",
  corrido: (n) => n + " refeições de preparo rápido, para dias apertados.",
  budget: (n) => n + " refeições só com alimentos de custo menor.",
  fora: (n) => n + " refeições; no almoço, dica de como montar o prato por quilo."
};
var CDP_OBJ_TXT = { deficit: "Emagrecimento", manutencao: "Manutenção", superavit: "Hipertrofia" };
var CDP_ICO = {
  cafe: '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M12 3v2"/>',
  almoco: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  lanche: '<path d="M12 8c-3-2-7 0-7 5 0 4 3 7 5 7 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-3 5-7 0-5-4-7-7-5z"/><path d="M12 8c0-2 1-4 3-5"/>',
  jantar: '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M16 3c-2 2-2.5 5-2.5 8h2.5v10"/>',
  ceia: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  manha: '<circle cx="12" cy="14" r="4"/><path d="M12 5v2.5M5 9l1.8 1.8M19 9l-1.8 1.8M3 19h18"/>'
};
var svg24 = (d) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + "</svg>";
var ICO_TROCA = svg24('<path d="M7 7h11l-3-3M17 17H6l3 3"/>');
var ICO_MEUS = svg24('<path d="M4 7h16l-1.6 11a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7L4 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>');
var ICO_REFAZ = svg24('<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>');
var ICO_PDF = svg24('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 14h5M10 17.5h5"/>');
var ICO_COPIA = svg24('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>');
var ICO_SHARE = svg24('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"/>');
var ICO_CHEV = svg24('<path d="m6 9 6 6 6-6"/>');
var CDP_RELOGIO = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
var cdpIcone = (slot) => '<span class="cdp-ic" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' + (CDP_ICO[slot] || CDP_ICO.almoco) + "</svg></span>";
var CDP_GRUPOS = [["Proteínas", ["prot"]], ["Carboidratos e leguminosas", ["carb", "leg"]], ["Frutas e vegetais", ["fruit", "veg"]], ["Gorduras", ["fat"]]];
var CDP_SEM_META = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';
function normalizaCfg(settings) {
  const c = settings && settings.cardapio || {};
  const r = c.restricoes || {};
  return {
    configurado: c.configurado === true || c.configurado !== false && Object.keys(c).length > 0,
    jeito: STYLE[c.jeito] ? c.jeito : r.vegetariano ? "veg" : "omni",
    // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: Object.fromEntries(CDP_RESTR.map((i) => [i[0], !!r[i[0]]])),
    nref: CDP_NREF.indexOf(Number(c.nref)) >= 0 ? Number(c.nref) : null,
    // null = padrão da rotina
    trocas: normalizaTrocas(c.trocas),
    meus: normalizaMeus(c.meus),
    // null = automático (todos os alimentos); lista = só os que a pessoa marcou
    favs: normalizaFavs(c.favoritos)
    // estrela em Meus alimentos: só muda a ordem em que o motor escolhe (ver engine.js, FAVORITOS)
  };
}
function motorDe(e) {
  const { kcalAlvo, macros: macros2, cfg } = e, p = e.perfil || {};
  return {
    kg: macros2.proteina.g / macros2.proteina.gkg,
    age: Number(p.idade) || 30,
    kcalMeta: kcalAlvo,
    protG: macros2.proteina.g,
    style: cfg.jeito,
    rout: cfg.rotina,
    nref: cfg.nref,
    trocas: cfg.trocas || [],
    meus: cfg.meus || null,
    favs: cfg.favs || [],
    ...Object.fromEntries(CDP_RESTR.map((i) => [CDP_RESTR_MOTOR[i[0]], !!(cfg.restricoes && cfg.restricoes[i[0]])]))
  };
}
var nomeLimpo = (f) => f.n.replace(/\*$/, "");
var rotuloTroca = (n) => n + " troca" + (n > 1 ? "s" : "") + " feita" + (n > 1 ? "s" : "");
function montaVisao(e, h) {
  const { num: num2, escapeHtml, menorDeIdade } = h;
  const { kcalAlvo, macros: macros2, cfg, objetivo } = e, p = e.perfil || {};
  const cdpQtd = (id, g, compras) => {
    const f = FOODS[id], un = f.liq ? "ml" : "g";
    let q = g >= 1e3 ? num2(g / 1e3, 1) + (f.liq ? " L" : " kg") : num2(g, 0) + " " + un;
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
  const motor = motorDe(e);
  const semana = [];
  for (let d = 0; d < 7; d++) semana.push(buildDay(d, motor));
  const dia = e.dia >= 0 && e.dia < 7 ? e.dia : 0;
  const cur = semana[dia];
  const rK = cur.tot.kcal / cur.target.kcal, rP = cur.tot.P / cur.target.P;
  const kOk = Math.abs(rK - 1) <= 0.07, pOk = rP >= 0.9;
  const kcalDia = Math.max(1, cur.tot.kcal);
  const chip = (lbl, val, meta, ok, un, ref) => '<span class="cdp-tchip ' + (ok ? "ok" : "warn") + '"><b>' + lbl + "</b><strong>" + num2(val, 0) + (un ? "<small>" + un + "</small>" : "") + "</strong><i>" + (meta != null ? "meta " + num2(meta, 0) + (un ? " " + un : "") : ref || "") + "</i></span>";
  const total = chip("kcal", cur.tot.kcal, cur.target.kcal, kOk, "") + chip("Prot.", cur.tot.P, cur.target.P, pOk, "g") + chip("Carb.", cur.tot.C, null, true, "g", num2(cur.tot.C * 4 / kcalDia * 100, 0) + "% das kcal") + chip("Gord.", cur.tot.F, null, true, "g", num2(cur.tot.F * 9 / kcalDia * 100, 0) + "% das kcal");
  const media = semana.reduce((a, d) => ({ k: a.k + d.tot.kcal / 7, P: a.P + d.tot.P / 7 }), { k: 0, P: 0 });
  const diasBaixos = semana.filter((d) => d.tot.P / d.target.P < 0.9).length;
  const dicas = { fora: "No por quilo, comece pelas saladas e legumes, escolha uma proteína grelhada e complete com arroz e feijão.", marmita: "Este almoço e jantar se repetem nos dias do mesmo lote (cozinhe no domingo e na quinta)." };
  const refeicoes = cur.meals.map((ml) => {
    const rows = ml.items.map((it) => {
      const f = FOODS[it.id];
      return '<div class="cdp-it"><span class="cdp-n">' + cdpNome(f) + '</span><span class="cdp-q"><b>' + escapeHtml(cdpQtd(it.id, it.g)) + "</b></span></div>";
    }).join("");
    const dica = ml.slot === "almoco" && dicas[cfg.rotina] ? '<div class="cdp-tip">' + escapeHtml(dicas[cfg.rotina]) + "</div>" : "";
    const pct = cur.tot.kcal ? Math.round(ml.m.kcal / cur.tot.kcal * 100) : 0;
    const hr = horarioDe(ml.slot, motor);
    const hrHtml = hr ? '<span class="cdp-hr" title="Horário sugerido">' + CDP_RELOGIO + '<span class="sr-only">Horário sugerido: </span><time>' + hr + "</time></span>" : "";
    return '<section class="cdp-meal" data-slot="' + ml.slot + '"><header class="cdp-mh"><h3>' + cdpIcone(ml.slot) + "<span>" + escapeHtml(ml.name) + "</span>" + hrHtml + '</h3><span class="cdp-mt">' + num2(ml.m.kcal, 0) + " kcal · " + num2(ml.m.P, 0) + ' g prot.</span></header><div class="cdp-share"><div class="cdp-share-bar" aria-hidden="true"><i style="width:' + pct + '%"></i></div><span class="cdp-share-txt">' + pct + "% das calorias do dia</span></div>" + rows + dica + "</section>";
  }).join("");
  const compra = shopping(semana);
  const feitos = new Set(e.comprados || []);
  const listaGrupos = CDP_GRUPOS.map((gd) => ({
    rotulo: gd[0],
    itens: compra.filter((s) => gd[1].indexOf(FOODS[s.id].role) >= 0).sort((a, b) => b.g - a.g).map((s) => ({
      id: s.id,
      nome: nomeLimpo(FOODS[s.id]) + (/\*$/.test(FOODS[s.id].n) ? "*" : ""),
      html: cdpNome(FOODS[s.id]),
      qtd: cdpQtd(s.id, s.g, true),
      feito: feitos.has(s.id)
    }))
  })).filter((g) => g.itens.length);
  const nFeitos = listaGrupos.reduce((a, g) => a + g.itens.filter((i) => i.feito).length, 0);
  const pctFeitos = compra.length ? Math.round(nFeitos / compra.length * 100) : 0;
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const compraHtml = listaGrupos.map(
    (g) => '<h4 class="cdp-gh"><span>' + escapeHtml(g.rotulo) + "</span><small>" + g.itens.length + "</small></h4>" + g.itens.map((i) => '<label class="cdp-it cdp-buy' + (i.feito ? " feito" : "") + '"><input type="checkbox" class="cdp-buy-i" data-cdp-buy="' + i.id + '"' + (i.feito ? " checked" : "") + '><span class="cdp-buy-box" aria-hidden="true">' + CHECK + '</span><span class="cdp-n">' + i.html + '</span><span class="cdp-q"><b>' + escapeHtml(i.qtd) + "</b></span></label>").join("")
  ).join("");
  const resumoCompra = '<div class="cdp-buy-sum"><span class="cdp-buy-txt" data-buy-txt>' + nFeitos + " de " + compra.length + ' comprados</span><div class="cdp-buy-bar" aria-hidden="true"><i data-buy-bar style="--p:' + pctFeitos / 100 + '"></i></div></div>';
  const temRotulo = compra.some((s) => /\*$/.test(FOODS[s.id].n));
  const avisos = validaRestricoes(motor).avisos.slice();
  if (!kOk) avisos.push("Neste dia as calorias ficaram em " + Math.round(rK * 100) + "% da meta: as porções seguem um teto realista (ex.: até 250 g de arroz por refeição). Se quiser chegar mais perto, divida em mais refeições ou some um lanche.");
  if (diasBaixos > 0) avisos.push("Nesta combinação, a proteína fica abaixo de 90% da meta em " + diasBaixos + " dia(s) da semana. Para chegar mais perto: troque a rotina (ex.: Marmita da semana), inclua uma fonte concentrada (" + (cfg.jeito === "vegan" ? "tofu, soja texturizada ou proteína vegetal em pó" : cfg.jeito === "veg" ? "ovos, iogurte ou whey, se fizerem parte da sua dieta" : "ovos, iogurte ou whey") + ") ou converse com um(a) nutricionista.");
  const notaJeito = cfg.jeito === "vegan" ? "No vegano, atenção a proteína, ferro, cálcio, vitamina B12 e vitamina D: o cardápio cuida da proteína; o resto pede acompanhamento profissional." : cfg.jeito === "lowc" ? "Low carb moderado: carboidrato reduzido, sem chegar à cetose; cerca de 40% das calorias vêm de gordura." : "";
  const nTrocas = (cfg.trocas || []).length;
  const ignoradas = (cfg.trocas || []).filter((t) => !podeTrocar(t.de, t.para, t.s, motor)).length;
  const menor = menorDeIdade(p.idade);
  const subt = CDP_OBJ_TXT[objetivo] + " · " + num2(kcalAlvo, 0) + " kcal/dia (média da semana) · " + num2(macros2.proteina.g, 0) + " g de proteína";
  return {
    sub: escapeHtml(subt) + ". O objetivo segue o que você escolheu acima.",
    rotdesc: escapeHtml(CDP_ROT_DESC[cfg.rotina](nRefeicoes(motor))),
    nrefinfo: escapeHtml(cfg.rotina === "marmita" ? "Na Marmita da semana são sempre 5 refeições (os lotes dependem disso). Escolha outra rotina para mudar." : "Escolha de 3 a 6. Com menos refeições, cada uma fica maior e pode bater no teto de porção."),
    trocasinfo: escapeHtml(nTrocas ? rotuloTroca(nTrocas) + "." : "Troque qualquer alimento por uma alternativa recomendada.") + (ignoradas ? " " + escapeHtml(ignoradas + (ignoradas > 1 ? " trocas guardadas não combinam" : " troca guardada não combina") + " com os filtros de agora e não " + (ignoradas > 1 ? "aparecem" : "aparece") + ".") : ""),
    meusinfo: escapeHtml(cfg.meus ? "Cardápio e lista de compras usam só os " + cfg.meus.filter((id) => alimentosDisponiveis(motor).indexOf(id) >= 0).length + " alimentos que você marcou em Meus alimentos." : "Meus alimentos: o app escolhe entre todos os alimentos que combinam com os seus filtros."),
    total,
    lista: { grupos: listaGrupos, n: compra.length, temRotulo, cfg: { jeito: (CDP_JEITOS.find((j) => j[0] === cfg.jeito) || [])[1], rotina: (CDP_ROTINAS.find((r) => r[0] === cfg.rotina) || [])[1] }, meus: !!cfg.meus },
    comprasn: compra.length + (compra.length === 1 ? " item" : " itens"),
    avisos: avisos.map((a) => '<div class="cdp-note cdp-warn">' + escapeHtml(a) + "</div>").join(""),
    refeicoes,
    compras: '<div class="cdp-note">Tudo o que aparece nos 7 dias do seu cardápio, somado: ' + compra.length + " alimento" + (compra.length > 1 ? "s" : "") + ".</div>" + resumoCompra + compraHtml + (temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "") + '<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.' + (cfg.meus ? " Só aparecem alimentos de Meus alimentos." : " Para ver só o que você come, marque em Meus alimentos.") + "</div>",
    rodape: '<div class="cdp-note">Média da semana: ' + num2(media.k, 0) + " kcal e " + num2(media.P, 0) + ' g de proteína por dia. Dias de treino levam ~6% mais calorias e os de descanso ~15% menos, então a média fecha a meta. A proteína fica em 0,25 g/kg (20–40 g) por refeição, como sugere a ISSN.</div><div class="cdp-note">Horários sugeridos como ponto de partida: 3 a 4 horas entre as refeições e o jantar com folga antes de dormir. Ajuste ao seu dia de trabalho e de treino.</div>' + (notaJeito ? '<div class="cdp-note">' + escapeHtml(notaJeito) + "</div>" : "") + (menor ? '<div class="cdp-note">Para menores de 18 anos o cardápio nunca usa déficit calórico e o ganho de massa é moderado.</div>' : "") + '<div class="cdp-note">Exemplo calculado a partir da sua meta, com porções de alimento já preparado e medidas caseiras aproximadas (≈). Não substitui orientação de nutricionista, sobretudo com condições de saúde.</div>',
    ligados: Object.assign(
      { jeito: cfg.jeito, rotina: cfg.rotina, dia: String(dia), nref: String(nRefeicoes(motor)), nrefFixo: cfg.rotina === "marmita" },
      Object.fromEntries(CDP_RESTR.map((i) => [i[0], !!cfg.restricoes[i[0]]]))
    )
  };
}
function montaPopup(e, h, sel) {
  const { num: num2, escapeHtml } = h;
  const { cfg } = e;
  const motor = motorDe(e);
  const dia = e.dia >= 0 && e.dia < 7 ? e.dia : 0;
  const cur = buildDay(dia, motor);
  const escopo = sel && sel.escopo === "todos" ? "todos" : "dia";
  const refeicao = cur.meals.find((m) => sel && m.slot === sel.slot) || cur.meals[0];
  const item = refeicao.items.find((i) => sel && i.id === sel.itemId) || refeicao.items[0];
  const sinal = (v, un) => {
    const r = Math.round(v);
    return (r === 0 ? "±" : r > 0 ? "+" : "−") + num2(Math.abs(r), 0) + " " + un;
  };
  const nomeHtml = (id) => {
    const f = FOODS[id];
    const rot = /\*$/.test(f.n);
    return escapeHtml(nomeLimpo(f)) + (rot ? "*" : "");
  };
  const qtd = (id, g) => {
    const f = FOODS[id], un = f.liq ? "ml" : "g";
    let q = num2(g, 0) + " " + un;
    if (f.unit) {
      const n = Math.max(1, Math.round(g / f.unit[0]));
      q = n + " " + (n > 1 ? f.unit[2] : f.unit[1]) + " (≈ " + q + ")";
    }
    return q;
  };
  const kOk = Math.abs(cur.tot.kcal / cur.target.kcal - 1) <= 0.07, pOk = cur.tot.P / cur.target.P >= 0.9;
  const chipsRef = cur.meals.map((m) => {
    const n = m.items.filter((i) => i.troca).length;
    return '<button type="button" class="cdp-chip' + (m.slot === refeicao.slot ? " on" : "") + '" data-pop="refeicao" data-v="' + m.slot + '" aria-pressed="' + (m.slot === refeicao.slot) + '">' + escapeHtml(m.name) + (n ? " <small>(" + n + ")</small>" : "") + "</button>";
  }).join("");
  const itens = refeicao.items.map((i) => '<button type="button" class="cdp-pop-it' + (i.id === item.id ? " on" : "") + '" data-pop="alimento" data-v="' + i.id + '" aria-pressed="' + (i.id === item.id) + '"><span class="cdp-n">' + nomeHtml(i.id) + (i.troca ? ' <small class="cdp-tag">trocado</small>' : "") + '</span><span class="cdp-q"><b>' + escapeHtml(qtd(i.id, i.g)) + "</b></span></button>").join("");
  const noPrato = refeicao.items.map((i) => i.id);
  const ids = alternativasIds(item.role, refeicao.slot, motor).filter((id) => id === item.id || noPrato.indexOf(id) < 0);
  if (ids.indexOf(item.id) < 0) ids.unshift(item.id);
  const alts = ids.map((id) => {
    if (id === item.id) return { id, atual: true, g: item.g };
    const tr = registraTroca(motor.trocas, dia, refeicao.slot, item.id, id, escopo);
    const d2 = buildDay(dia, Object.assign({}, motor, { trocas: tr }));
    const m2 = d2.meals.find((m) => m.slot === refeicao.slot);
    const it2 = m2 && m2.items.find((x) => x.id === id);
    if (!it2) return null;
    const f = FOODS[id], avisos = [];
    if (cfg.rotina === "budget" && !f.cheap) avisos.push("fora do orçamento enxuto");
    if (cfg.rotina === "corrido" && !f.fast) avisos.push("preparo mais longo");
    if (d2.tot.P / d2.target.P < 0.9) avisos.push("proteína do dia: " + num2(d2.tot.P / d2.target.P * 100, 0) + "% da meta");
    return { id, g: it2.g, dk: d2.tot.kcal - cur.tot.kcal, dp: d2.tot.P - cur.tot.P, avisos };
  }).filter(Boolean);
  const altHtml = alts.map((a) => {
    const ef = a.atual ? "no cardápio agora" : sinal(a.dk, "kcal") + " · " + sinal(a.dp, "g prot.");
    return '<button type="button" class="cdp-pop-alt' + (a.atual ? " on" : "") + '" data-pop="para" data-v="' + a.id + '" aria-pressed="' + !!a.atual + '"><span class="cdp-n">' + nomeHtml(a.id) + '</span><span class="cdp-q"><b>' + escapeHtml(qtd(a.id, a.g)) + "</b><small>" + escapeHtml(ef) + "</small></span>" + (a.avisos && a.avisos.length ? '<span class="cdp-pop-av">' + escapeHtml(a.avisos.join(" · ")) + "</span>" : "") + "</button>";
  }).join("");
  const sugerido = item.troca ? '<div class="cdp-note">Sugestão original: <b>' + nomeHtml(item.orig) + '</b>. <button type="button" class="btn small" data-pop="voltar">Voltar ao sugerido</button></div>' : "";
  const nTodas = motor.trocas.length;
  const total = ["kcal", "Prot."].map((l, i) => '<span class="cdp-tchip ' + ((i ? pOk : kOk) ? "ok" : "warn") + '"><b>' + l + "</b><strong>" + num2(i ? cur.tot.P : cur.tot.kcal, 0) + (i ? "<small>g</small>" : "") + "</strong><i>meta " + num2(i ? cur.target.P : cur.target.kcal, 0) + (i ? " g" : "") + "</i></span>").join("");
  const escopoHtml = [["dia", "Só em " + DAYS[dia]], ["todos", "Todos os dias em que aparece"]].map((o) => '<button type="button" class="cdp-chip' + (escopo === o[0] ? " on" : "") + '" data-pop="escopo" data-v="' + o[0] + '" aria-pressed="' + (escopo === o[0]) + '">' + escapeHtml(o[1]) + "</button>").join("");
  return {
    sel: { slot: refeicao.slot, itemId: item.id, escopo },
    html: '<h2>Trocar alimentos</h2><div class="sub">' + escapeHtml(DAYS[dia]) + " (" + (cur.train ? "dia de treino" : "dia de descanso") + '). Escolha a refeição, toque no alimento e depois na alternativa. A porção se ajusta para manter sua meta.</div><div class="cdp-total" aria-label="Total do dia">' + total + '</div><div class="cdp-pop-sec"><span class="cdp-lbl">1. Refeição</span><div class="cdp-chips" role="group" aria-label="Refeição">' + chipsRef + '</div></div><div class="cdp-pop-sec"><span class="cdp-lbl">2. Alimento que quer trocar</span><div class="cdp-pop-list" role="group" aria-label="Alimentos da refeição">' + itens + "</div>" + sugerido + '</div><div class="cdp-pop-sec"><span class="cdp-lbl">3. Trocar por</span><div class="cdp-pop-list" role="group" aria-label="Alternativas para ' + escapeHtml(nomeLimpo(FOODS[item.id])) + '">' + (altHtml || '<div class="cdp-note">Não há outra alternativa para este alimento com os seus filtros.</div>') + '</div></div><div class="cdp-pop-sec"><span class="cdp-lbl">Vale para</span><div class="cdp-chips" role="group" aria-label="Alcance da troca">' + escopoHtml + '</div></div><div class="cdp-pop-sec"><span class="cdp-lbl">Não quer mais?</span><div class="cdp-note"><button type="button" class="btn small" data-pop="naoquero" data-v="' + item.id + '">Não quero mais este</button> Tira <b>' + nomeHtml(item.id) + '</b> do cardápio, das trocas e da lista de compras. Para voltar, marque o alimento em Meus alimentos.</div></div><div class="cdp-note cdp-pop-msg" role="status" aria-live="polite" data-pop-msg></div><div class="modal-actions">' + (nTodas ? '<button type="button" class="btn" data-pop="restaurar">Restaurar todas (' + nTodas + ")</button>" : "") + '<button type="button" class="btn primary" data-pop="fechar">Pronto</button></div>'
  };
}
var CDP_GRUPOS_MEUS = [["Proteínas", "prot"], ["Carboidratos", "carb"], ["Leguminosas", "leg"], ["Frutas", "fruit"], ["Vegetais", "veg"], ["Gorduras", "fat"]];
function montaPopupMeus(e, h) {
  const { escapeHtml } = h;
  const motor = motorDe(e);
  const disp = alimentosDisponiveis(motor);
  const marcados = e.cfg.meus ? disp.filter((id) => e.cfg.meus.indexOf(id) >= 0) : disp.slice();
  const nomeHtml = (id) => escapeHtml(nomeLimpo(FOODS[id]));
  const grupos = CDP_GRUPOS_MEUS.map((g) => {
    const ids = disp.filter((id) => FOODS[id].role === g[1]);
    if (!ids.length) return "";
    const n = ids.filter((id) => marcados.indexOf(id) >= 0).length;
    const favs = e.cfg.favs || [];
    const chips = ids.map((id) => {
      const on = marcados.indexOf(id) >= 0;
      const chip = '<button type="button" class="cdp-chip' + (on ? " on" : "") + '" data-meus="alimento" data-v="' + id + '" aria-pressed="' + on + '">' + nomeHtml(id) + "</button>";
      if (!on) return chip;
      const fav = favs.indexOf(id) >= 0;
      return '<span class="cdp-chipfav">' + chip + '<button type="button" class="cdp-star' + (fav ? " on" : "") + '" data-meus="fav" data-v="' + id + '" aria-pressed="' + fav + '" aria-label="Favorito: ' + nomeHtml(id) + '"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/></svg></button></span>';
    }).join("");
    return '<div class="cdp-pop-sec"><span class="cdp-lbl">' + g[0] + " <small>(" + n + " de " + ids.length + ')</small></span><div class="cdp-chips" role="group" aria-label="' + g[0] + '">' + chips + '</div><div class="cdp-note"><button type="button" class="btn small" data-meus="grupo-todos" data-v="' + g[1] + '">Marcar todos</button> <button type="button" class="btn small" data-meus="grupo-nenhum" data-v="' + g[1] + '">Limpar</button></div></div>';
  }).join("");
  const avisos = marcados.length ? validaRestricoes(Object.assign({}, motor, { meus: marcados.length === disp.length ? null : marcados })).avisos : [];
  return {
    marcados: marcados.length,
    total: disp.length,
    html: '<h2>Meus alimentos</h2><div class="sub">Marque só o que você come. O cardápio e a lista de compras usam apenas esses alimentos; o que ficar desmarcado não aparece. Os filtros de jeito de comer e restrições continuam valendo. A estrela marca favoritos: eles aparecem primeiro na ordem do cardápio e das trocas, sem tirar a variedade.</div><div class="cdp-note" role="status" aria-live="polite" data-meus-msg>' + marcados.length + " de " + disp.length + " alimentos marcados.</div>" + avisos.map((a) => '<div class="cdp-note cdp-warn">' + escapeHtml(a) + "</div>").join("") + grupos + '<div class="modal-actions"><button type="button" class="btn" data-meus="auto">Voltar ao automático</button><button type="button" class="btn primary" data-meus="fechar">Pronto</button></div>'
  };
}
function montaFormulario(e, h, draft) {
  const { escapeHtml, num: num2 } = h;
  const cfg = Object.assign({}, e.cfg, draft);
  const motor = motorDe(Object.assign({}, e, { cfg }));
  const disp = alimentosDisponiveis(motor);
  const marcados = cfg.meus ? disp.filter((id) => cfg.meus.indexOf(id) >= 0) : disp.slice();
  const fixo = cfg.rotina === "marmita";
  const nref = nRefeicoes(motor);
  const opt = (itens, atual) => itens.map((i) => '<option value="' + i[0] + '"' + (String(i[0]) === String(atual) ? " selected" : "") + ">" + escapeHtml(i[1]) + "</option>").join("");
  const nomeHtml = (id) => escapeHtml(nomeLimpo(FOODS[id]));
  const alimentos = CDP_GRUPOS_MEUS.map((g) => {
    const ids = disp.filter((id) => FOODS[id].role === g[1]);
    if (!ids.length) return "";
    const n = ids.filter((id) => marcados.indexOf(id) >= 0).length;
    return '<div class="cdp-pop-sec"><span class="cdp-lbl">' + g[0] + " <small>(" + n + " de " + ids.length + ')</small></span><div class="cdp-chips" role="group" aria-label="' + g[0] + '">' + ids.map((id) => {
      const on = marcados.indexOf(id) >= 0;
      return '<button type="button" class="cdp-chip' + (on ? " on" : "") + '" data-form="alimento" data-v="' + id + '" aria-pressed="' + on + '">' + nomeHtml(id) + "</button>";
    }).join("") + "</div></div>";
  }).join("");
  const avisos = marcados.length ? validaRestricoes(Object.assign({}, motor, { meus: marcados.length === disp.length ? null : marcados })).avisos : [];
  const restr = CDP_RESTR.map((i) => '<label class="cdp-chk"><input type="checkbox" data-form="restr" data-v="' + i[0] + '"' + (cfg.restricoes[i[0]] ? " checked" : "") + "><span>" + escapeHtml(i[1]) + "</span></label>").join("");
  return {
    marcados: marcados.length,
    total: disp.length,
    avisos,
    html: '<h2>Monte seu cardápio</h2><div class="sub">Conte como você come. O app monta 7 dias que fecham sua meta (' + num2(e.kcalAlvo, 0) + " kcal e " + num2(e.macros.proteina.g, 0) + ' g de proteína por dia) e soma tudo na lista de compras. Dá para mudar quando quiser.</div><div class="cdp-form"><label class="cdp-field"><span class="cdp-lbl">Jeito de comer</span><select class="cdp-sel" data-form="jeito">' + opt(CDP_JEITOS, cfg.jeito) + '</select></label><label class="cdp-field"><span class="cdp-lbl">Rotina</span><select class="cdp-sel" data-form="rotina">' + opt(CDP_ROTINAS, cfg.rotina) + '</select><span class="cdp-note">' + escapeHtml(CDP_ROT_DESC[cfg.rotina](nref)) + '</span></label><label class="cdp-field"><span class="cdp-lbl">Refeições por dia</span><select class="cdp-sel" data-form="nref"' + (fixo ? " disabled" : "") + ">" + opt(CDP_NREF.map((n) => [n, n + " refeições"]), nref) + "</select>" + (fixo ? '<span class="cdp-note">Na Marmita da semana são sempre 5 refeições (os lotes dependem disso).</span>' : "") + '</label><fieldset class="cdp-fs"><legend class="cdp-lbl">Restrições</legend><div class="cdp-chk-list">' + restr + '</div></fieldset><div class="cdp-field"><span class="cdp-lbl">Alimentos que eu como</span><div class="cdp-note" role="status" aria-live="polite" data-form-msg>' + marcados.length + " de " + disp.length + ' alimentos marcados. O cardápio e a lista de compras usam só os marcados.</div><div class="cdp-note"><button type="button" class="btn small" data-form="todos">Marcar todos</button> <button type="button" class="btn small" data-form="nenhum">Limpar</button></div>' + avisos.map((a) => '<div class="cdp-note cdp-warn">' + escapeHtml(a) + "</div>").join("") + alimentos + '</div></div><div class="modal-actions"><button type="button" class="btn" data-form="cancelar">Agora não</button><button type="button" class="btn primary" data-form="salvar">Montar meu cardápio</button></div>'
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
    ctx.salvaSettings(Object.assign({}, ctx.estado().settings, { cardapio: { configurado: true, jeito: cfg.jeito, rotina: cfg.rotina, nref: cfg.nref || null, restricoes: Object.assign({}, cfg.restricoes), trocas: cfg.trocas || [], meus: cfg.meus || null, favoritos: cfg.favs || [] } }));
  }
  const regiao = (el, nome) => el.querySelector('[data-r="' + nome + '"]');
  const botao = (el, rot, v) => el.querySelector('[data-cdp="' + rot + '"][data-v="' + v + '"]');
  const seletor = (rot, itens, titulo) => '<select class="cdp-sel" data-ngselect aria-label="' + titulo + '" data-cdp-sel="' + rot + '">' + itens.map((i) => '<option value="' + i[0] + '">' + i[1] + "</option>").join("") + "</select>";
  function monta(el) {
    const dias = DAYS.map((nome, i) => '<button type="button" class="cdp-day" data-cdp="dia" data-v="' + i + '" aria-pressed="false" aria-label="' + nome + (TRAIN[i] ? ", dia de treino" : ", dia de descanso") + '" data-treino="' + (TRAIN[i] ? "1" : "0") + '"><b>' + nome + "</b><small>" + (TRAIN[i] ? "treino" : "descanso") + "</small></button>").join("");
    el.innerHTML = '<p class="cdp-sub" data-r="sub"></p><div class="cdp-controls"><label class="cdp-field"><span class="cdp-lbl">Jeito de comer</span>' + seletor("jeito", CDP_JEITOS, "Jeito de comer") + '</label><label class="cdp-field"><span class="cdp-lbl">Rotina</span>' + seletor("rotina", CDP_ROTINAS, "Rotina") + '<span class="cdp-note" data-r="rotdesc"></span></label><label class="cdp-field"><span class="cdp-lbl">Refeições por dia</span>' + seletor("nref", CDP_NREF.map((n) => [String(n), n + " refeições"]), "Refeições por dia") + '<span class="cdp-note" data-r="nrefinfo"></span></label><details class="cdp-field cdp-field-restr cdp-multi"><summary><span class="cdp-lbl">Restrições</span><span class="cdp-multi-val" data-r="restrinfo"></span></summary><div class="cdp-chk-list" role="group" aria-label="Restrições">' + CDP_RESTR.map((i) => '<label class="cdp-chk"><input type="checkbox" data-cdp-chk="restr" data-v="' + i[0] + '"><span>' + i[1] + "</span></label>").join("") + '</div></details><div class="cdp-edit"><button type="button" class="btn cdp-edit-btn" data-cdp="editar" aria-haspopup="dialog">' + ICO_TROCA + '<span>Trocar alimentos</span></button><button type="button" class="btn cdp-edit-btn" data-cdp="meus" aria-haspopup="dialog">' + ICO_MEUS + '<span>Meus alimentos</span></button><button type="button" class="btn cdp-edit-btn" data-cdp="montar" aria-haspopup="dialog">' + ICO_REFAZ + '<span>Refazer formulário</span></button><span class="cdp-note" data-r="trocasinfo"></span><span class="cdp-note" data-r="meusinfo"></span></div></div><div class="cdp-days" role="group" aria-label="Dia da semana">' + dias + '</div><div class="cdp-total" aria-label="Total do dia" data-r="total"></div><div data-r="avisos"></div><div class="cdp-meals" data-r="refeicoes"></div><details class="cdp-shop"><summary><span class="cdp-shop-ic">' + ICO_MEUS + '</span><span class="cdp-shop-t">Lista de compras da semana</span><span class="cdp-shop-n" data-r="comprasn"></span><span class="cdp-shop-chev">' + ICO_CHEV + '</span></summary><div class="cdp-shop-tools" role="group" aria-label="Exportar a lista"><button type="button" class="btn small primary" data-cdp="pdf">' + ICO_PDF + '<span>Exportar PDF</span></button><button type="button" class="btn small" data-cdp="compartilhar" hidden>' + ICO_SHARE + '<span>Compartilhar</span></button><button type="button" class="btn small" data-cdp="copiar">' + ICO_COPIA + '<span>Copiar</span></button><button type="button" class="btn small ghost" data-cdp="limpar-compras">Limpar marcações</button></div><div data-r="compras"></div></details><div data-r="rodape"></div>';
    for (const k in ultimo) delete ultimo[k];
    try {
      const t = new File([""], "t.pdf", { type: "application/pdf" });
      const bs = el.querySelector('[data-cdp="compartilhar"]');
      if (bs && navigator.canShare && navigator.canShare({ files: [t] })) bs.hidden = false;
    } catch (e) {
    }
    montado = true;
  }
  function troca(el, nome, html) {
    if (ultimo[nome] === html) return;
    const no = regiao(el, nome);
    if (!no) return;
    no.innerHTML = html;
    ultimo[nome] = html;
  }
  const escapeTxt = (t) => ctx.escapeHtml(t);
  const restrResumo = (cfg) => {
    const n = CDP_RESTR.filter((i) => cfg.restricoes[i[0]]).length;
    return n ? n + (n > 1 ? " selecionadas" : " selecionada") : "nenhuma";
  };
  const defineSel = (el, rot, v) => {
    const x = el.querySelector('[data-cdp-sel="' + rot + '"]');
    if (x && x.value !== String(v)) {
      x.value = String(v);
      if (window.ngSelectSync) window.ngSelectSync(x);
    }
  };
  let pediuForm = false;
  const vazioHtml = (kcalAlvo, macros2) => '<div class="cdp-vazio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" focusable="false"><path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M16 3c-2 2-2.5 5-2.5 8h2.5v10"/></svg><h3>Seu cardápio ainda não foi montado</h3><p>Conte como você come (jeito de comer, rotina, refeições por dia, restrições e os alimentos que você gosta). O app monta 7 dias que fecham sua meta de ' + ctx.num(kcalAlvo, 0) + " kcal e " + ctx.num(macros2.proteina.g, 0) + ' g de proteína por dia e soma tudo na lista de compras.</p><button type="button" class="btn primary" data-cdp="montar" aria-haspopup="dialog">Montar meu cardápio</button></div>';
  function liga(el, rot, v, ligado) {
    const b = botao(el, rot, v);
    if (!b) return;
    if (b.classList.contains("on") !== ligado) b.classList.toggle("on", ligado);
    const val = String(ligado);
    if (b.getAttribute("aria-pressed") !== val) b.setAttribute("aria-pressed", val);
  }
  const CHAVE_COMPRAS = "ng_compras_ok";
  let comprados = /* @__PURE__ */ new Set();
  try {
    const a = JSON.parse(localStorage.getItem(CHAVE_COMPRAS) || "[]");
    if (Array.isArray(a)) comprados = new Set(a.filter((x) => typeof x === "string"));
  } catch (e) {
  }
  const salvaComprados = () => {
    try {
      localStorage.setItem(CHAVE_COMPRAS, JSON.stringify([...comprados]));
    } catch (e) {
    }
  };
  let listaAtual = null;
  const hojeBR = () => {
    const d = /* @__PURE__ */ new Date();
    return String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
  };
  const dadosPdf = () => {
    if (!listaAtual) return null;
    const L = listaAtual, d = hojeBR();
    return {
      titulo: "Lista de compras da semana",
      subtitulo: [L.cfg.jeito, L.cfg.rotina, L.n + (L.n === 1 ? " alimento" : " alimentos"), d].filter(Boolean).join(" · "),
      grupos: L.grupos.map((g) => ({ rotulo: g.rotulo, itens: g.itens.map((i) => ({ nome: i.nome, qtd: i.qtd, feito: comprados.has(i.id) })) })),
      notas: [L.temRotulo ? "* valor típico de rótulo — confira o seu." : "", "Soma dos 7 dias do cardápio, em alimento já preparado" + (L.meus ? ", só com os alimentos de Meus alimentos" : "") + ". Exemplo calculado a partir da sua meta; não substitui orientação de nutricionista, sobretudo com condições de saúde."],
      rodape: "Gerado pelo NG+ em " + d,
      assunto: "Lista de compras da semana"
    };
  };
  const textoLista = () => {
    const d = dadosPdf();
    if (!d) return "";
    return d.titulo + " (" + d.subtitulo + ")\n\n" + d.grupos.map((g) => g.rotulo.toUpperCase() + "\n" + g.itens.map((i) => (i.feito ? "[x] " : "[ ] ") + i.nome + " — " + i.qtd).join("\n")).join("\n\n") + (listaAtual && listaAtual.temRotulo ? "\n\n* valor típico de rótulo — confira o seu." : "");
  };
  const arquivoPdf = () => {
    const d = dadosPdf();
    if (!d) return null;
    const nome = "lista-de-compras-ng-" + (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + ".pdf";
    return { nome, blob: new Blob([montaPdf(d)], { type: "application/pdf" }) };
  };
  const aviso = (m) => {
    if (typeof ctx.toast === "function") ctx.toast(m);
  };
  async function exportaPdf() {
    const a = arquivoPdf();
    if (!a) {
      aviso("Monte o cardápio para gerar a lista.");
      return;
    }
    const url = URL.createObjectURL(a.blob), l = document.createElement("a");
    l.href = url;
    l.download = a.nome;
    document.body.appendChild(l);
    l.click();
    l.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4e3);
    aviso("PDF da lista gerado.");
  }
  async function compartilhaPdf() {
    const a = arquivoPdf();
    if (!a) return;
    const f = new File([a.blob], a.nome, { type: "application/pdf" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [f] })) {
        await navigator.share({ files: [f], title: "Lista de compras da semana" });
        return;
      }
    } catch (e) {
      if (e && e.name === "AbortError") return;
    }
    exportaPdf();
  }
  async function copiaLista() {
    const t = textoLista();
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      aviso("Lista copiada.");
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = t;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        aviso("Lista copiada.");
      } catch (_) {
        aviso("Não consegui copiar agora.");
      }
      ta.remove();
    }
  }
  function atualizaProgresso(el) {
    const n = el.querySelectorAll("[data-cdp-buy]").length, ok = el.querySelectorAll("[data-cdp-buy]:checked").length;
    const t = el.querySelector("[data-buy-txt]"), b = el.querySelector("[data-buy-bar]");
    if (t) t.textContent = ok + " de " + n + " comprados";
    if (b) b.style.setProperty("--p", n ? Math.round(ok / n * 100) / 100 : 0);
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
    const cfg = normalizaCfg(ctx.estado().settings);
    if (!cfg.configurado) {
      montado = false;
      for (const k in ultimo) delete ultimo[k];
      el.innerHTML = vazioHtml(kcalAlvo, macros2);
      if (!pediuForm && el.getClientRects().length > 0 && typeof ctx.abreModal === "function") {
        pediuForm = true;
        setTimeout(abreFormulario, 80);
      }
      return;
    }
    if (!montado) monta(el);
    const v = montaVisao({ kcalAlvo, macros: macros2, cfg, perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia, comprados: [...comprados] }, h);
    troca(el, "sub", v.sub);
    troca(el, "rotdesc", v.rotdesc);
    troca(el, "nrefinfo", v.nrefinfo);
    troca(el, "trocasinfo", v.trocasinfo);
    troca(el, "meusinfo", v.meusinfo);
    troca(el, "total", v.total);
    troca(el, "avisos", v.avisos);
    troca(el, "refeicoes", v.refeicoes);
    troca(el, "comprasn", v.comprasn);
    troca(el, "compras", v.compras);
    listaAtual = v.lista;
    troca(el, "rodape", v.rodape);
    defineSel(el, "jeito", v.ligados.jeito);
    defineSel(el, "rotina", v.ligados.rotina);
    defineSel(el, "nref", v.ligados.nref);
    const selN = el.querySelector('[data-cdp-sel="nref"]');
    if (selN && selN.disabled !== v.ligados.nrefFixo) selN.disabled = v.ligados.nrefFixo;
    CDP_RESTR.forEach((i) => {
      const c = el.querySelector('[data-cdp-chk="restr"][data-v="' + i[0] + '"]');
      if (c && c.checked !== !!v.ligados[i[0]]) c.checked = !!v.ligados[i[0]];
    });
    troca(el, "restrinfo", escapeTxt(restrResumo(cfg)));
    for (let d = 0; d < 7; d++) liga(el, "dia", String(d), v.ligados.dia === String(d));
  }
  function abrePopup() {
    if (typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const sel = { slot: null, itemId: null, escopo: "dia" };
    const contexto = () => ({ kcalAlvo: cdpUltimo.k, macros: cdpUltimo.m, cfg: normalizaCfg(ctx.estado().settings), perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia });
    const nome = (id) => nomeLimpo(FOODS[id]);
    function desenha(foco, msg) {
      const r = montaPopup(contexto(), h, sel);
      Object.assign(sel, r.sel);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-pop-msg]");
      if (m && msg) m.textContent = msg;
      if (foco) {
        const b = corpo.querySelector('[data-pop="' + foco[0] + '"][data-v="' + foco[1] + '"]') || corpo.querySelector('[data-pop="fechar"]');
        if (b) b.focus({ preventScroll: true });
      }
    }
    function grava(trocas) {
      const cfg = normalizaCfg(ctx.estado().settings);
      cfg.trocas = trocas;
      cdpSalvar(cfg);
      ctx.redesenhaDieta();
    }
    corpo.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-pop]");
      if (!b) return;
      const act = b.dataset.pop, v = b.dataset.v, cfg = normalizaCfg(ctx.estado().settings);
      if (act === "fechar") {
        ctx.fechaModal();
        return;
      }
      ctx.tocaSom("tick");
      if (act === "refeicao") {
        sel.slot = v;
        sel.itemId = null;
        desenha(["refeicao", v]);
      } else if (act === "alimento") {
        sel.itemId = v;
        desenha(["alimento", v]);
      } else if (act === "escopo") {
        sel.escopo = v;
        desenha(["escopo", v]);
      } else if (act === "para") {
        if (!v || v === sel.itemId) return;
        const de = sel.itemId;
        grava(registraTroca(cfg.trocas, cdpDia, sel.slot, de, v, sel.escopo));
        sel.itemId = v;
        desenha(["para", v], "Trocado: " + nome(de) + " por " + nome(v) + ".");
      } else if (act === "voltar") {
        const r = desfazCadeia(cfg.trocas, cdpDia, sel.slot, sel.itemId, false);
        grava(r.trocas);
        const msg = "Voltou ao sugerido: " + nome(r.id) + (r.escopo.todos ? " (a troca valia para todos os dias)." : ".");
        sel.itemId = r.id;
        desenha(["alimento", r.id], msg);
      } else if (act === "restaurar") {
        grava([]);
        sel.itemId = null;
        desenha(["refeicao", sel.slot], "Todas as trocas foram desfeitas.");
      } else if (act === "naoquero") {
        const de = sel.itemId, motor = motorDe(contexto());
        const r = retiraAlimento(motor, de);
        if (!r.ok) {
          const plural = { prot: "proteínas", carb: "carboidratos", leg: "leguminosas", fruit: "frutas", veg: "vegetais", fat: "gorduras" }[r.role] || "alimentos";
          const msg = r.motivo === "categoria" ? "Não dá para tirar " + nome(de) + ": sobraria menos de 2 opções de " + plural + " e o cardápio ficaria repetitivo. Marque mais opções em Meus alimentos antes." : r.motivo === "proteina" ? "Sem " + nome(de) + " não sobraria nenhuma proteína concentrada. Marque outra proteína em Meus alimentos antes." : "Este alimento já está fora de Meus alimentos.";
          desenha(["naoquero", de], msg);
          return;
        }
        const antes = buildDay(cdpDia, motor).meals.find((m) => m.slot === sel.slot), papel = (FOODS[de] || {}).role;
        const idsAntes = antes ? antes.items.map((i) => i.id) : [];
        cfg.meus = r.meus;
        cfg.trocas = cfg.trocas.filter((t) => t.de !== de && t.para !== de);
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
        const depois = buildDay(cdpDia, motorDe(contexto())).meals.find((m) => m.slot === sel.slot);
        const novo = depois && (depois.items.find((i) => i.role === papel && idsAntes.indexOf(i.id) < 0) || depois.items.find((i) => i.role === papel));
        sel.itemId = novo ? novo.id : null;
        desenha(novo ? ["alimento", novo.id] : null, "Tirei " + nome(de) + " de Meus alimentos." + (novo ? " Agora aparece " + nome(novo.id) + "." : ""));
      }
    });
    ctx.abreModal(corpo);
    desenha();
  }
  function abrePopupMeus() {
    if (typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const contexto = () => ({ kcalAlvo: cdpUltimo.k, macros: cdpUltimo.m, cfg: normalizaCfg(ctx.estado().settings), perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia });
    function desenha(foco, msg) {
      const y = corpo.scrollTop;
      const r = montaPopupMeus(contexto(), h);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-meus-msg]");
      if (m && msg) m.textContent = msg + " " + r.marcados + " de " + r.total + " alimentos marcados.";
      if (foco) {
        const b = corpo.querySelector('[data-meus="' + foco[0] + '"][data-v="' + foco[1] + '"]') || corpo.querySelector('[data-meus="fechar"]');
        if (b) b.focus({ preventScroll: true });
      }
      corpo.scrollTop = y;
    }
    function grava(lista, disp) {
      const cfg = normalizaCfg(ctx.estado().settings);
      cfg.meus = lista.length === disp.length ? null : lista;
      cdpSalvar(cfg);
      ctx.redesenhaDieta();
    }
    corpo.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-meus]");
      if (!b) return;
      const act = b.dataset.meus, v = b.dataset.v;
      if (act === "fechar") {
        ctx.fechaModal();
        return;
      }
      const ctxo = contexto(), cfg = ctxo.cfg, motor = motorDe(ctxo);
      const disp = alimentosDisponiveis(motor);
      let marcados = cfg.meus ? disp.filter((id) => cfg.meus.indexOf(id) >= 0) : disp.slice();
      ctx.tocaSom("tick");
      if (act === "auto") {
        grava(disp, disp);
        desenha(["auto", ""], "Voltou ao automático.");
        return;
      }
      if (act === "fav") {
        const jaFav = (cfg.favs || []).indexOf(v) >= 0;
        cfg.favs = jaFav ? cfg.favs.filter((id) => id !== v) : (cfg.favs || []).concat([v]);
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
        const f = FOODS[v];
        desenha(["fav", v], f ? (jaFav ? "Tirei dos favoritos: " : "Favorito: ") + nomeLimpo(f) + "." : "");
        return;
      }
      let aviso2 = "";
      if (act === "alimento") {
        marcados = marcados.indexOf(v) >= 0 ? marcados.filter((id) => id !== v) : marcados.concat([v]);
      } else if (act === "grupo-todos") {
        disp.forEach((id) => {
          if (FOODS[id].role === v && marcados.indexOf(id) < 0) marcados.push(id);
        });
      } else if (act === "grupo-nenhum") {
        marcados = marcados.filter((id) => FOODS[id].role !== v);
      }
      if (!marcados.length) {
        aviso2 = "Mantenha pelo menos um alimento marcado.";
        desenha([act, v || ""], aviso2);
        return;
      }
      grava(marcados, disp);
      desenha([act, v || ""], "");
    });
    ctx.abreModal(corpo);
    desenha();
  }
  function abreFormulario() {
    if (typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const base2 = normalizaCfg(ctx.estado().settings);
    const draft = { jeito: base2.jeito, rotina: base2.rotina, nref: base2.nref, restricoes: Object.assign({}, base2.restricoes), meus: base2.meus };
    const contexto = () => ({ kcalAlvo: cdpUltimo.k, macros: cdpUltimo.m, cfg: base2, perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: 0 });
    const disponiveis = () => alimentosDisponiveis(motorDe(Object.assign({}, contexto(), { cfg: Object.assign({}, base2, draft) })));
    function desenha(foco, msg) {
      const y = corpo.scrollTop;
      const r = montaFormulario(contexto(), h, draft);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-form-msg]");
      if (m && msg) m.textContent = msg;
      if (foco) {
        const b = corpo.querySelector('[data-form="' + foco[0] + '"]' + (foco[1] ? '[data-v="' + foco[1] + '"]' : ""));
        if (b) b.focus({ preventScroll: true });
      }
      corpo.scrollTop = y;
    }
    const marcadosAgora = () => {
      const d = disponiveis();
      return draft.meus ? d.filter((id) => draft.meus.indexOf(id) >= 0) : d.slice();
    };
    corpo.addEventListener("change", (ev) => {
      const b = ev.target.closest("[data-form]");
      if (!b) return;
      const act = b.dataset.form;
      if (act === "jeito" || act === "rotina") draft[act] = b.value;
      else if (act === "nref") draft.nref = Number(b.value) || null;
      else if (act === "restr") draft.restricoes[b.dataset.v] = b.checked;
      else return;
      ctx.tocaSom("tick");
      desenha([act, act === "restr" ? b.dataset.v : ""]);
    });
    corpo.addEventListener("click", (ev) => {
      const b = ev.target.closest("button[data-form]");
      if (!b) return;
      const act = b.dataset.form, v = b.dataset.v;
      if (act === "cancelar") {
        ctx.fechaModal();
        return;
      }
      if (act === "salvar") {
        const disp2 = disponiveis(), marcados2 = marcadosAgora();
        if (!marcados2.length) {
          desenha(["salvar", ""], "Mantenha pelo menos um alimento marcado.");
          return;
        }
        const cfg = Object.assign({}, base2, draft, { nref: draft.rotina === "marmita" ? null : draft.nref });
        cfg.meus = marcados2.length === disp2.length ? null : marcados2;
        cdpSalvar(cfg);
        ctx.tocaSom("tick");
        ctx.fechaModal();
        ctx.redesenhaDieta();
        return;
      }
      ctx.tocaSom("tick");
      let marcados = marcadosAgora();
      const disp = disponiveis();
      if (act === "alimento") marcados = marcados.indexOf(v) >= 0 ? marcados.filter((id) => id !== v) : marcados.concat([v]);
      else if (act === "todos") marcados = disp.slice();
      else if (act === "nenhum") marcados = [];
      draft.meus = marcados.length === disp.length ? null : marcados;
      desenha([act, v || ""]);
    });
    ctx.abreModal(corpo);
    desenha();
  }
  function setupCardapio() {
    const el = document.getElementById("cardapio-body");
    if (!el) return;
    el.addEventListener("change", (ev) => {
      const buy = ev.target.closest("[data-cdp-buy]");
      if (buy) {
        const id = buy.dataset.cdpBuy;
        if (buy.checked) comprados.add(id);
        else comprados.delete(id);
        salvaComprados();
        const row = buy.closest(".cdp-buy");
        if (row) row.classList.toggle("feito", buy.checked);
        atualizaProgresso(el);
        return;
      }
      const sel = ev.target.closest("[data-cdp-sel]"), chk = ev.target.closest("[data-cdp-chk]");
      if (!sel && !chk) return;
      const cfg = normalizaCfg(ctx.estado().settings);
      if (sel) {
        const act = sel.dataset.cdpSel;
        if (act === "jeito") cfg.jeito = sel.value;
        else if (act === "rotina") cfg.rotina = sel.value;
        else if (act === "nref") {
          if (cfg.rotina === "marmita" || sel.disabled) return;
          cfg.nref = Number(sel.value) || null;
        }
      } else cfg.restricoes[chk.dataset.v] = chk.checked;
      cdpSalvar(cfg);
      ctx.tocaSom("tick");
      ctx.redesenhaDieta();
    });
    el.addEventListener("click", (ev) => {
      const b = ev.target.closest("[data-cdp]");
      if (!b) return;
      if (b.dataset.cdp === "editar") {
        abrePopup();
        return;
      }
      if (b.dataset.cdp === "meus") {
        abrePopupMeus();
        return;
      }
      if (b.dataset.cdp === "montar") {
        abreFormulario();
        return;
      }
      if (b.dataset.cdp === "pdf") {
        exportaPdf();
        return;
      }
      if (b.dataset.cdp === "compartilhar") {
        compartilhaPdf();
        return;
      }
      if (b.dataset.cdp === "copiar") {
        copiaLista();
        return;
      }
      if (b.dataset.cdp === "limpar-compras") {
        comprados.clear();
        salvaComprados();
        el.querySelectorAll("[data-cdp-buy]").forEach((c) => {
          c.checked = false;
          const r = c.closest(".cdp-buy");
          if (r) r.classList.remove("feito");
        });
        atualizaProgresso(el);
        return;
      }
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
        const reg = el.querySelector('[data-r="refeicoes"]');
        if (reg && reg.classList && typeof reg.classList.remove === "function") {
          reg.classList.remove("cdp-troca");
          void reg.offsetWidth;
          reg.classList.add("cdp-troca");
          setTimeout(() => reg.classList.remove("cdp-troca"), 700);
        }
      } else {
        if (act === "jeito") cfg.jeito = b.dataset.v;
        else if (act === "rotina") cfg.rotina = b.dataset.v;
        else if (act === "nref") {
          if (cfg.rotina === "marmita" || b.disabled) return;
          cfg.nref = Number(b.dataset.v) || null;
        } else if (act === "restr") cfg.restricoes[b.dataset.v] = !cfg.restricoes[b.dataset.v];
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
      }
      ctx.tocaSom("tick");
      requestAnimationFrame(() => {
        if (Math.abs(window.scrollY - yAntes) > 2) (window.ngScrollRestaura || window.scrollTo.bind(window))(0, yAntes);
      });
    });
  }
  setupCardapio();
  return { render: renderCardapio };
}
export {
  criaCardapio,
  montaFormulario,
  montaPopup,
  montaPopupMeus,
  montaVisao,
  normalizaCfg
};
