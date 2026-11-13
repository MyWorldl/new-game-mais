// Motor de cardápio NG+ (semana completa). Módulo ES, FONTE ÚNICA do motor: o esbuild o empacota junto com ui.js (fonte/build.sh) e o fonte/testes/cardapio-sim.js o testa direto por import. Sem dependência do app nem do navegador. Valores por 100 g de alimento preparado: [kcal, P, C, G]
// TACO (NEPA/UNICAMP) conforme tabelatacoonline.com.br; itens com * = valor típico de rótulo.
var TVP_CHEAP = false; // preço de referência ainda não confirmado
var FOODS = {
  frango:   { n: 'Frango grelhado',        v: [159, 32, 0, 2.5],      role: 'prot', veg: false, cheap: true,  fast: true },
  patinho:  { n: 'Patinho grelhado',       v: [219, 35.9, 0, 7.3],    role: 'prot', veg: false, cheap: false, fast: false, red: true },
  acem:     { n: 'Carne moída (acém)',     v: [212, 26.7, 0, 10.9],   role: 'prot', veg: false, cheap: true,  fast: false, red: true },
  sardinha: { n: 'Sardinha assada',        v: [164, 32.2, 0, 3.0],    role: 'prot', veg: false, cheap: true,  fast: true, fish: true },
  abadejo:  { n: 'Abadejo grelhado',      v: [130, 27.6, 0, 1.3],    role: 'prot', veg: false, cheap: false, fast: true, fish: true },
  pintado:  { n: 'Pintado grelhado',       v: [152, 30.8, 0, 2.3],    role: 'prot', veg: false, cheap: false, fast: false, fish: true },
  tvp:      { n: 'Soja texturizada hidratada*', v: [117, 18, 6.4, 0.6], role: 'prot', veg: true, vegan: true, cheap: TVP_CHEAP, fast: true, soy: true },
  leiteS:   { n: 'Leite de soja',          v: [39, 2.4, 4.3, 1.6],    role: 'prot', veg: true,  vegan: true, cheap: false, fast: true, liq: true, unit: [200, 'copo', 'copos'], soy: true },
  ovo:      { n: 'Ovo cozido',             v: [146, 13.3, 0.6, 9.5],  role: 'prot', veg: true,  cheap: true,  fast: true, unit: [50, 'ovo', 'ovos'], egg: true },
  queijo:   { n: 'Queijo minas',           v: [264, 17.4, 3.2, 20.2], role: 'prot', veg: true,  cheap: false, fast: true, lact: true, unit: [25, 'fatia', 'fatias'] },
  iogurte:  { n: 'Iogurte natural',        v: [51, 4.1, 1.9, 3.0],    role: 'prot', veg: true,  cheap: true,  fast: true, lact: true, unit: [170, 'pote', 'potes'] },
  tofu:     { n: 'Tofu',                   v: [64, 6.6, 2.1, 4.0],    role: 'prot', veg: true,  vegan: true, cheap: false, fast: true, soy: true },
  whey:     { n: 'Whey protein*',          v: [389, 80, 6, 5],        role: 'prot', veg: true,  cheap: false, fast: true, lact: true, unit: [30, 'dose', 'doses'] },
  vegpo:    { n: 'Proteína vegetal em pó*',v: [389, 80, 6, 5],        role: 'prot', veg: true,  vegan: true, cheap: false, fast: true, unit: [30, 'dose', 'doses'], soy: true },
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
  amendoim: { n: 'Amendoim',               v: [606, 22.5, 18.7, 54],  role: 'fat',  veg: true,  vegan: true, cheap: true,  fast: true, nut: true },
  abacate:  { n: 'Abacate',                v: [96, 1.2, 6, 8.4],      role: 'fat',  veg: true,  vegan: true, cheap: false, fast: true },
  // — Ampliação (13/11/2026): valores por 100 g da TACO conferidos em tabelatacoonline.com.br; itens com * = rótulo típico.
  salmao:   { n: 'Salmão grelhado',         v: [243, 26.1, 0, 14.5],   role: 'prot', veg: false, cheap: false, fast: true,  fish: true },
  merluza:  { n: 'Merluza assada',          v: [122, 26.6, 0, 0.9],    role: 'prot', veg: false, cheap: false, fast: true,  fish: true },
  corvina:  { n: 'Corvina assada',          v: [147, 26.8, 0, 3.6],    role: 'prot', veg: false, cheap: false, fast: false, fish: true },
  atum:     { n: 'Atum em conserva (óleo)', v: [166, 26.2, 0, 6.0],    role: 'prot', veg: false, cheap: true,  fast: true,  fish: true },
  sobrecoxa:{ n: 'Sobrecoxa de frango assada', v: [233, 29.2, 0, 12.0], role: 'prot', veg: false, cheap: true,  fast: false },
  lombo:    { n: 'Lombo de porco assado',   v: [210, 35.7, 0, 6.4],    role: 'prot', veg: false, cheap: false, fast: false, pork: true, red: true },
  ricota:   { n: 'Ricota',                  v: [140, 12.6, 3.8, 8.1],  role: 'prot', veg: true,  cheap: false, fast: true,  lact: true },
  mozarela: { n: 'Queijo muçarela',         v: [330, 22.6, 3.0, 25.2], role: 'prot', veg: true,  cheap: false, fast: true,  lact: true, unit: [25, 'fatia', 'fatias'] },
  iogurteD: { n: 'Iogurte natural desnatado', v: [41, 3.8, 5.8, 0.3],  role: 'prot', veg: true,  cheap: true,  fast: true,  lact: true, unit: [170, 'pote', 'potes'] },
  fradinho: { n: 'Feijão-fradinho',         v: [78, 5.1, 13.5, 0.6],   role: 'leg',  veg: true,  vegan: true, cheap: true,  fast: true },
  paoI:     { n: 'Pão de forma integral',   v: [253, 9.4, 49.9, 3.7],  role: 'carb', veg: true,  vegan: true, cheap: true,  fast: true, gluten: true, unit: [25, 'fatia', 'fatias'] },
  abacaxi:  { n: 'Abacaxi',                 v: [48, 0.9, 12.3, 0.1],   role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  melancia: { n: 'Melancia',                v: [33, 0.9, 8.1, 0],      role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  manga:    { n: 'Manga Palmer',            v: [72, 0.4, 19.4, 0.2],   role: 'fruit', veg: true, vegan: true, cheap: false, fast: true },
  morango:  { n: 'Morango',                 v: [30, 0.9, 6.8, 0.3],    role: 'fruit', veg: true, vegan: true, cheap: false, fast: true },
  uva:      { n: 'Uva Itália',              v: [53, 0.7, 13.6, 0.2],   role: 'fruit', veg: true, vegan: true, cheap: false, fast: true },
  pera:     { n: 'Pera Williams',           v: [53, 0.6, 14.0, 0.1],   role: 'fruit', veg: true, vegan: true, cheap: false, fast: true, unit: [150, 'pera', 'peras'] },
  melao:    { n: 'Melão',                   v: [29, 0.7, 7.5, 0],      role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  goiaba:   { n: 'Goiaba vermelha',         v: [54, 1.1, 13.0, 0.4],   role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  kiwi:     { n: 'Kiwi',                    v: [51, 1.3, 11.5, 0.6],   role: 'fruit', veg: true, vegan: true, cheap: false, fast: true },
  tangerina:{ n: 'Tangerina (ponkan)',      v: [38, 0.8, 9.6, 0.1],    role: 'fruit', veg: true, vegan: true, cheap: true,  fast: true },
  cenoura:  { n: 'Cenoura cozida',          v: [30, 0.8, 6.7, 0.2],    role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: false },
  abobrinha:{ n: 'Abobrinha italiana cozida', v: [15, 1.1, 3.0, 0.2],  role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: true },
  couveflor:{ n: 'Couve-flor cozida',       v: [19, 1.2, 3.9, 0.3],    role: 'veg',  veg: true,  vegan: true, cheap: false, fast: false },
  beterraba:{ n: 'Beterraba cozida',        v: [32, 1.3, 7.2, 0.1],    role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: false },
  alface:   { n: 'Alface crespa',           v: [11, 1.3, 1.7, 0.2],    role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: true },
  chuchu:   { n: 'Chuchu cozido',           v: [19, 0.4, 4.8, 0],      role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: false },
  pepino:   { n: 'Pepino',                  v: [10, 0.9, 2.0, 0],      role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: true },
  abobora:  { n: 'Abóbora cabotiá cozida',  v: [48, 1.4, 10.8, 0.7],   role: 'veg',  veg: true,  vegan: true, cheap: true,  fast: false },
  castanhaP:{ n: 'Castanha-do-Brasil',      v: [643, 14.5, 15.1, 63.5], role: 'fat', veg: true,  vegan: true, cheap: false, fast: true, nut: true },
  castanhaC:{ n: 'Castanha-de-caju torrada', v: [570, 18.5, 29.1, 46.3], role: 'fat', veg: true, vegan: true, cheap: false, fast: true, nut: true }
};
// Ordem de v: [kcal, proteína, carboidrato, gordura] por 100 g.
var OBJ = {
  cut:   { n: 'Cutting',               k: 0.85, prot: 2.2, fat: 0.25, minor: false },
  bulk:  { n: 'Bulking limpo',         k: 1.10, prot: 1.8, fat: 0.25, minorK: 1.05 },
  maint: { n: 'Manutenção/recomposição', k: 1.00, prot: 2.0, fat: 0.28 }
};
var STYLE = { omni: 'Onívoro', pesc: 'Pescetariano', veg: 'Vegetariano', vegan: 'Vegano', lowc: 'Low carb moderado' };
var ROUT = {
  tradicional: { n: 'Dia tradicional', meals: ['cafe', 'almoco', 'lanche', 'jantar', 'ceia'] },   // dia a dia brasileiro: arroz e feijão no almoço e no jantar, sem lotes e sem filtro de preço ou pressa
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
  manha:  { n: 'Lanche da manhã', share: 0.10, prot: 0.12, comp: ['carb', 'prot', 'fruit'] },
  ceia:   { n: 'Ceia',          share: 0.10, prot: 0.10, comp: ['prot', 'fruit', 'fat'] }
};
/* Número de refeições por dia (3 a 6). A Marmita da semana é sempre de 5; nas demais rotinas a pessoa escolhe (cfg.nref) e, sem escolha, vale o padrão da rotina. */
var MEALS_N = {
  3: ['cafe', 'almoco', 'jantar'],
  4: ['cafe', 'almoco', 'lanche', 'jantar'],
  5: ['cafe', 'almoco', 'lanche', 'jantar', 'ceia'],
  6: ['cafe', 'manha', 'almoco', 'lanche', 'jantar', 'ceia']
};
/* Horários sugeridos: ~3 a 4 h entre as refeições (a ISSN sugere uma dose de proteína a cada 3–4 h) e jantar com folga antes de dormir. Servem de ponto de partida: a pessoa ajusta ao seu dia. */
var HORARIOS = {
  3: { cafe: '07:00', almoco: '12:30', jantar: '19:30' },
  4: { cafe: '07:00', almoco: '12:00', lanche: '16:00', jantar: '19:30' },
  5: { cafe: '07:00', almoco: '12:00', lanche: '15:30', jantar: '19:00', ceia: '21:30' },
  6: { cafe: '07:00', manha: '09:30', almoco: '12:30', lanche: '15:30', jantar: '19:00', ceia: '21:30' }
};
function nRefeicoes(cfg) {
  if (cfg.rout === 'marmita') return 5;
  var n = Number(cfg.nref);
  return (n >= 3 && n <= 6 && Math.floor(n) === n) ? n : ROUT[cfg.rout].meals.length;
}
function mealsOf(cfg) { return cfg.rout === 'marmita' ? ROUT.marmita.meals : MEALS_N[nRefeicoes(cfg)]; }
function horarioDe(slot, cfg) { var t = HORARIOS[nRefeicoes(cfg)]; return (t && t[slot]) || null; }
var DAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
var TRAIN = [1, 1, 0, 1, 1, 1, 0]; // 5 dias de treino, 2 de descanso


var PREF = {
  cafe:   ['ovo', 'queijo', 'iogurte', 'iogurteD', 'ricota', 'mozarela', 'leiteS', 'tofu', 'whey', 'vegpo'],
  almoco: ['frango', 'patinho', 'abadejo', 'sobrecoxa', 'acem', 'merluza', 'sardinha', 'lombo', 'corvina', 'atum', 'salmao', 'ovo', 'tofu', 'tvp', 'queijo', 'ricota'],
  jantar: ['sardinha', 'frango', 'pintado', 'merluza', 'patinho', 'sobrecoxa', 'ovo', 'acem', 'salmao', 'lombo', 'corvina', 'atum', 'tofu', 'tvp', 'queijo', 'ricota'],
  lanche: ['iogurte', 'iogurteD', 'leiteS', 'queijo', 'ricota', 'mozarela', 'whey', 'vegpo', 'ovo', 'tofu'],
  ceia:   ['iogurte', 'iogurteD', 'ricota', 'leiteS', 'whey', 'vegpo', 'queijo', 'ovo', 'tofu']
};
PREF.manha = PREF.lanche;
var PCAP = { salmao: 200, merluza: 220, corvina: 200, atum: 120, sobrecoxa: 200, lombo: 200, ricota: 120, mozarela: 75, iogurteD: 340, abadejo: 200, pintado: 200, tvp: 250, leiteS: 400, frango: 200, patinho: 200, acem: 180, sardinha: 160, ovo: 150, queijo: 75, iogurte: 340, tofu: 250, whey: 60, vegpo: 60 };
var CCAP = { paoI: 100, arroz: 250, arrozI: 250, batataD: 300, batata: 350, mandioca: 250, cuscuz: 220, aveia: 80, pao: 150 };
var POWDER = ['whey', 'vegpo'];

function allowed(id, cfg) {
  var f = FOODS[id];
  if (cfg.style === 'vegan' && !f.vegan) return false;
  if (cfg.style === 'veg' && !f.veg) return false;
  if (cfg.style === 'pesc' && !(f.veg || f.fish)) return false;   // pescetariano: sem carne, com peixe, ovo e laticínios
  if (cfg.nolact && f.lact) return false;
  if (cfg.nogluten && f.gluten) return false;
  if (cfg.noegg && f.egg) return false;
  if (cfg.nosoy && f.soy) return false;
  if (cfg.nofish && f.fish) return false;
  if (cfg.nonut && f.nut) return false;
  if (cfg.nopork && f.pork) return false;
  if (cfg.nored && f.red) return false;
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
    if (slot === 'cafe' || slot === 'lanche' || slot === 'manha') out = out.filter(function (id) { return ['pao', 'paoI', 'aveia', 'cuscuz', 'batataD'].indexOf(id) >= 0; });
    else if (cfg.rout === 'tradicional') out = out.filter(function (id) { return ['arroz', 'arrozI', 'mandioca', 'batata', 'batataD'].indexOf(id) >= 0; });   // prato tradicional: arroz, mandioca ou batata
    else out = out.filter(function (id) { return ['pao', 'paoI', 'aveia'].indexOf(id) < 0; });
    if (cfg.style === 'lowc') out = out.filter(function (id) { return ['batataD', 'cuscuz', 'aveia'].indexOf(id) >= 0; });
  }
  if (role === 'fat') {
    if (slot === 'almoco' || slot === 'jantar') out = out.filter(function (id) { return id === 'azeite'; });
    else out = out.filter(function (id) { return id !== 'azeite'; });
  }
  if (role === 'fruit' && cfg.style === 'lowc') out = out.filter(function (id) { return ['banana', 'manga', 'uva'].indexOf(id) < 0; });
  if (role === 'veg' && cfg.style === 'lowc') out = out.filter(function (id) { return ['beterraba', 'abobora'].indexOf(id) < 0; });
  return out;
}
function boosters(cfg, slot, used) {
  var main = slot === 'almoco' || slot === 'jantar';
  var out = prefList(slot, cfg).filter(function (id) { return used.indexOf(id) < 0; });
  if (cfg.style === 'omni' || cfg.style === 'lowc') out = out.filter(function (id) { return ['tofu', 'tvp', 'leiteS'].indexOf(id) < 0; });
  // pó entra no prato principal só se for vegetariano/vegano (onívoro reforça com outra fonte inteira)
  if (main) {
    ['whey', 'vegpo'].forEach(function (id) { if ((cfg.style === 'veg' || cfg.style === 'vegan' || cfg.style === 'pesc') && allowed(id, cfg) && used.indexOf(id) < 0 && out.indexOf(id) < 0) out.push(id); });
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
  var ms = mealsOf(cfg), sS = 0, sP = 0;
  ms.forEach(function (k) { sS += SLOT[k].share; sP += SLOT[k].prot; });
  var Kt = dt.kcal * S.share / sS, Pt = dt.P * S.prot / sP, Ft = dt.F * S.share / sS;
  var Ct = Math.max(0, (Kt - 4 * Pt - 9 * Ft) / 4);
  var seed = d + mealIdx;
  if (cfg.rout === 'marmita' && (slotKey === 'almoco' || slotKey === 'jantar')) seed = (d < 4 ? 0 : 1) + mealIdx; // 2 lotes por semana
  var items = [];
  var has = function (r) { return S.comp.indexOf(r) >= 0; };
  var vegId = has('veg') ? pick(rolePool('veg', cfg, slotKey), seed) : null;
  var fruitId = has('fruit') ? pick(rolePool('fruit', cfg, slotKey), seed + 1) : null;
  var legId = (has('leg') && slotKey === 'almoco') || (cfg.rout === 'tradicional' && slotKey === 'jantar') ? pick(rolePool('leg', cfg, slotKey), seed + (slotKey === 'jantar' ? 1 : 0)) : null;   // no dia tradicional o feijão também vai no jantar
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


/* ---------- TROCAS DE ALIMENTO (escolhas da pessoa) ----------
   cfg.trocas = [{ d: -1 (todos os dias) | 0..6, s: refeição, de: alimento, para: alimento }]. Valem só entre alimentos da MESMA categoria
   (proteína por proteína, carboidrato por carboidrato...). A porção é recalculada para manter o que o alimento original entregava
   (proteína, carboidrato ou gordura, conforme a categoria), respeitando os tetos de porção. Restrições de saúde e de jeito de comer
   (vegano, vegetariano, sem lactose, sem glúten, low carb) continuam valendo: uma troca que deixou de combinar com os filtros é ignorada.
   Os filtros de ROTINA (orçamento enxuto, preparo rápido) não bloqueiam a troca: a pessoa decidiu, o app só avisa. */
function semRotina(cfg) { return Object.assign({}, cfg, { rout: 'marmita' }); }
function alternativasIds(role, slot, cfg) {
  var c = semRotina(cfg), out;
  if (role === 'prot') {
    var main = slot === 'almoco' || slot === 'jantar';
    out = (PREF[slot] || []).filter(function (id) { return allowed(id, c); });
    if (cfg.style === 'omni' || cfg.style === 'lowc') out = out.filter(function (id) { return ['tofu', 'tvp', 'leiteS'].indexOf(id) < 0; });
    if (main && (cfg.style === 'veg' || cfg.style === 'vegan' || cfg.style === 'pesc')) POWDER.forEach(function (id) { if (allowed(id, c) && out.indexOf(id) < 0) out.push(id); });
    if (main && (cfg.style === 'omni' || cfg.style === 'lowc')) out = out.filter(function (id) { return POWDER.indexOf(id) < 0; });
  } else {
    out = rolePool(role, c, slot);
  }
  return out;
}
function podeTrocar(de, para, slot, cfg) {
  var a = FOODS[de], b = FOODS[para];
  if (!a || !b || de === para || !SLOT[slot] || a.role !== b.role) return false;
  return alternativasIds(a.role, slot, cfg).indexOf(para) >= 0;
}
function gramasTroca(it, para) {
  var a = FOODS[it.id].v, b = FOODS[para].v, g = it.g / 100, ng = it.g;
  if (it.role === 'prot' && b[1] > 0) ng = (a[1] * g / b[1]) * 100;
  else if ((it.role === 'carb' || it.role === 'leg' || it.role === 'fruit') && b[2] > 0) ng = (a[2] * g / b[2]) * 100;
  else if (it.role === 'fat' && b[3] > 0) ng = (a[3] * g / b[3]) * 100;
  var novo = { id: para, role: it.role };
  var cap = capOf(novo), u = FOODS[para].unit ? FOODS[para].unit[0] : 5;
  if (para === 'azeite') return Math.max(13, Math.min(Math.round(ng / 13) * 13, 39));
  ng = qty(para, ng);
  if (ng > cap) ng = Math.max(u, cap - (cap % u));
  return ng;
}
function trocasDoDia(cfg, d) {
  var t = cfg.trocas || [];
  return t.filter(function (x) { return x.d === -1; }).concat(t.filter(function (x) { return x.d === d; }));
}
function aplicaTrocas(meals, d, cfg) {
  trocasDoDia(cfg, d).forEach(function (tr) {
    meals.forEach(function (ml) {
      if (ml.slot !== tr.s) return;
      var it = null;
      for (var i = 0; i < ml.items.length; i++) if (ml.items[i].id === tr.de) { it = ml.items[i]; break; }
      if (!it || !podeTrocar(tr.de, tr.para, ml.slot, cfg)) return;
      if (ml.items.some(function (o) { return o !== it && o.id === tr.para; })) return;   // não repete o mesmo alimento na refeição
      var ng = gramasTroca(it, tr.para);
      it.orig = it.orig || it.id; it.id = tr.para; it.g = ng; it.troca = true;
    });
  });
}
/* Lê o que veio salvo e devolve só trocas bem formadas (no máximo 120). */
function normalizaTrocas(lista) {
  if (!Array.isArray(lista)) return [];
  var out = [];
  lista.forEach(function (x) {
    if (out.length >= 120 || !x || typeof x !== 'object') return;
    var d = Number(x.d);
    if (!(d === -1 || (d >= 0 && d <= 6 && Math.floor(d) === d))) return;
    if (!SLOT[x.s] || !FOODS[x.de] || !FOODS[x.para] || x.de === x.para || FOODS[x.de].role !== FOODS[x.para].role) return;
    out.push({ d: d, s: x.s, de: x.de, para: x.para });
  });
  return out;
}
/* Volta pela cadeia de trocas que levou ao alimento atual. soDia = só desfaz as trocas daquele dia (para nas "todos os dias"). */
function desfazCadeia(trocas, d, s, idAtual, soDia) {
  var out = trocas.slice(), cur = idAtual, g = 0, escopo = { dia: false, todos: false };
  while (g++ < 30) {
    var i = -1, k;
    for (k = out.length - 1; k >= 0; k--) if (out[k].s === s && out[k].d === d && out[k].para === cur) { i = k; break; }
    if (i < 0 && !soDia) for (k = out.length - 1; k >= 0; k--) if (out[k].s === s && out[k].d === -1 && out[k].para === cur) { i = k; break; }
    if (i < 0) break;
    if (out[i].d === -1) escopo.todos = true; else escopo.dia = true;
    cur = out[i].de; out.splice(i, 1);
  }
  return { trocas: out, id: cur, escopo: escopo };
}
/* Registra "trocar o alimento que aparece agora (atual) por `para`" e devolve a nova lista. escopo: 'dia' | 'todos'. */
function registraTroca(trocas, d, s, atual, para, escopo) {
  if (escopo === 'todos') {
    var r = desfazCadeia(trocas, d, s, atual, false);
    if (para === r.id) return r.trocas;
    return r.trocas.concat([{ d: -1, s: s, de: r.id, para: para }]);
  }
  var r2 = desfazCadeia(trocas, d, s, atual, true);
  if (para === r2.id) return r2.trocas;
  return r2.trocas.concat([{ d: d, s: s, de: r2.id, para: para }]);
}

/* ---------- VALIDAÇÃO DAS RESTRIÇÕES ----------
   Antes de montar a semana, confere se as escolhas deixam alimento suficiente em cada refeição. Devolve {fontes, avisos[], semProteina}:
   fontes = quantos alimentos de proteína concentrada sobraram; avisos = frases orientadas ao que fazer. Não bloqueia nada: o app mostra o aviso. */
function validaRestricoes(cfg) {
  var slots = mealsOf(cfg), todas = {}, avisos = [], semProt = [], semCarb = [];
  slots.forEach(function (sl) {
    var p = alternativasIds('prot', sl, cfg);
    p.forEach(function (id) { todas[id] = 1; });
    if (!p.length) semProt.push(SLOT[sl].n);
    if ((sl === 'almoco' || sl === 'jantar') && !rolePool('carb', semRotina(cfg), sl).length) semCarb.push(SLOT[sl].n);
  });
  var fontes = Object.keys(todas).length;
  var leg = rolePool('leg', semRotina(cfg), 'almoco').length;
  var semProteina = fontes === 0;
  if (semProteina) avisos.push('Com esta combinação de filtros não sobra nenhum alimento de proteína concentrada' + (leg ? ' (só feijão e lentilha, que ajudam, mas não fecham a meta)' : '') + '. Desligue algum filtro ou procure um(a) nutricionista para montar o seu plano.');
  else if (semProt.length) avisos.push('Sem opção de proteína em: ' + semProt.join(', ') + '. Essas refeições ficam só com carboidrato, frutas e vegetais; desligue algum filtro para voltar a ter proteína nelas.');
  if (!semProteina && fontes <= 3) avisos.push('Sobraram só ' + fontes + ' alimentos de proteína: o cardápio vai repetir bastante. Se puder, desligue algum filtro para ganhar variedade.');
  if (semCarb.length) avisos.push('Sem opção de carboidrato no ' + semCarb.join(' e no ') + ': o cardápio não consegue fechar as calorias nessas refeições.');
  return { fontes: fontes, avisos: avisos, semProteina: semProteina };
}

function dayTotals(meals) {
  var s = { kcal: 0, P: 0, C: 0, F: 0 };
  meals.forEach(function (ml) { var m = ml.m || macros(ml.items); s.kcal += m.kcal; s.P += m.P; s.C += m.C; s.F += m.F; });
  return s;
}
function buildDay(d, cfg) {
  var t = targets(cfg), dt = dayTargets(t, d);
  var meals = mealsOf(cfg).map(function (k, i) { return buildMeal(k, d, cfg, dt, i); });
  aplicaTrocas(meals, d, cfg);
  meals.forEach(function (ml) { ml.m = macros(ml.items); });
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
export { FOODS, OBJ, STYLE, ROUT, SLOT, DAYS, TRAIN, MEALS_N, HORARIOS, nRefeicoes, mealsOf, horarioDe, validaRestricoes, targets, dayTargets, buildDay, shopping, fmtQty, allowed, alternativasIds, podeTrocar, normalizaTrocas, desfazCadeia, registraTroca };
