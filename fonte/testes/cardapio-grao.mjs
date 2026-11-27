// Grão-de-bico cozido no motor do cardápio: valor da TBCA (código 159T), entra onde faz sentido e fica fora do dia tradicional (feijão).
// Uso: node fonte/testes/cardapio-grao.mjs
import * as E from '../cardapio/engine.js';
let ok = 0, falhas = 0;
const t = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome, extra); } };
const base = { kg: 80, age: 30, kcalMeta: 3043, protG: 134 };
const cfgDe = (style, rout, nolact = false, nogluten = false) => Object.assign({}, base, { style, rout, nolact, nogluten, trocas: [] });
const g = E.FOODS.grao;
t('existe, é leguminosa e é vegano', !!g && g.role === 'leg' && g.veg && g.vegan, JSON.stringify(g));
t('valores por 100 g = TBCA 159T (118 kcal, 8,5 g proteína, 20,3 g carboidrato, 2,1 g gordura)', g && g.v[0] === 118 && g.v[1] === 8.5 && g.v[2] === 20.3 && g.v[3] === 2.1, JSON.stringify(g && g.v));
t('o nome diz "cozido" (o valor é do cozido, não do cru)', g && /cozido/i.test(g.n), g && g.n);
// onde aparece
const usa = (cfg) => { let n = 0; for (let d = 0; d < 7; d++) for (const ml of E.buildDay(d, cfg).meals) for (const it of ml.items) if (it.id === 'grao') n++; return n; };
let tradicional = 0; for (const style of ['omni', 'veg', 'vegan', 'lowc']) for (const nl of [false, true]) for (const ng of [false, true]) tradicional += usa(cfgDe(style, 'tradicional', nl, ng));
t('dia tradicional nunca usa grão-de-bico (é feijão ou lentilha)', tradicional === 0, tradicional);
let outras = 0; for (const rout of ['marmita', 'corrido', 'fora']) for (const style of ['omni', 'veg', 'vegan']) outras += usa(cfgDe(style, rout));
t('nas outras rotinas ele aparece em algum dia (não é código morto)', outras > 0, outras);
t('troca feijão → grão-de-bico é aceita no almoço (marmita)', E.podeTrocar('feijaoC', 'grao', 'almoco', cfgDe('omni', 'marmita')));
t('no dia tradicional ele não é sugerido, mas a pessoa ainda pode escolher a troca (a decisão é dela)', E.podeTrocar('feijaoC', 'grao', 'almoco', cfgDe('omni', 'tradicional')));
t('vegano, sem lactose e sem glúten podem usar', ['vegan'].every(s => E.allowed('grao', cfgDe(s, 'marmita', true, true))));
console.log('\n' + ok + ' ok, ' + falhas + ' falhas'); process.exit(falhas ? 1 : 0);
