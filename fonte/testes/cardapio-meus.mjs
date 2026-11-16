// Teste do "Meus alimentos" (fonte/cardapio/engine.js + ui.js), sem navegador. Uso: node fonte/testes/cardapio-meus.mjs
import * as E from '../cardapio/engine.js';
import { montaPopupMeus, montaVisao, normalizaCfg } from '../cardapio/ui.js';
let ok = 0, falhas = 0;
const t = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome, extra); } };
const base = { kg: 80, age: 30, kcalMeta: 3043, protG: 134 };
const mk = (o) => Object.assign({}, base, { style: 'omni', rout: 'marmita', trocas: [] }, o);
const porPapel = (r) => Object.keys(E.FOODS).filter((id) => E.FOODS[id].role === r);

// 1) normalização
t('normalizaMeus: não-lista vira null', E.normalizaMeus(undefined) === null && E.normalizaMeus('x') === null && E.normalizaMeus({}) === null);
t('normalizaMeus: lista vazia ou só inválidos vira null', E.normalizaMeus([]) === null && E.normalizaMeus(['xyz', 3, null]) === null);
t('normalizaMeus: tira inválidos e repetidos', JSON.stringify(E.normalizaMeus(['frango', 'xyz', 'frango', 'arroz'])) === '["frango","arroz"]');
t('normalizaCfg guarda meus e aceita configuração antiga sem meus', JSON.stringify(normalizaCfg({ cardapio: { meus: ['frango', 'arroz'] } }).meus) === '["frango","arroz"]' && normalizaCfg({ cardapio: {} }).meus === null && normalizaCfg(null).meus === null);

// 2) sem escolha = igual a antes
for (const st of ['omni', 'veg', 'vegan', 'lowc']) for (const ro of ['tradicional', 'marmita', 'corrido', 'budget', 'fora']) {
  const a = JSON.stringify(E.buildDay(2, mk({ style: st, rout: ro }))), b = JSON.stringify(E.buildDay(2, mk({ style: st, rout: ro, meus: null })));
  t('meus=null não muda o cardápio (' + st + '/' + ro + ')', a === b);
}

// 3) a lista de compras só traz o que foi marcado, em todas as combinações
const escolha = ['frango', 'patinho', 'ovo', 'iogurteD', 'tofu', 'arroz', 'batataD', 'aveia', 'pao', 'feijao', 'banana', 'maca', 'brocolis', 'tomate', 'azeite', 'castanha']
  .filter((id) => E.FOODS[id]);
let violou = [], itens = 0;
for (const st of ['omni', 'veg', 'vegan', 'lowc', 'pesc']) for (const ro of ['tradicional', 'marmita', 'corrido', 'budget', 'fora']) for (const n of [3, 4, 5, 6]) {
  const c = mk({ style: st, rout: ro, nref: n, meus: escolha });
  const sem = [0, 1, 2, 3, 4, 5, 6].map((d) => E.buildDay(d, c));
  const lista = E.shopping(sem); itens += lista.length;
  lista.forEach((s) => { if (escolha.indexOf(s.id) < 0) violou.push(st + '/' + ro + '/' + n + ':' + s.id); });
}
t('lista de compras só tem alimentos marcados (' + itens + ' itens em 100 combinações)', violou.length === 0, violou.slice(0, 5).join(' '));
t('o exemplo do print: iogurte natural e desnatado somem quando não marcados', (() => {
  const c = mk({ meus: ['frango', 'arroz', 'ovo', 'banana', 'brocolis'].filter((i) => E.FOODS[i]) });
  const ids = E.shopping([0, 1, 2, 3, 4, 5, 6].map((d) => E.buildDay(d, c))).map((s) => s.id);
  return ids.indexOf('iogurte') < 0 && ids.indexOf('iogurteD') < 0 && ids.indexOf('frango') >= 0;
})());
t('marcar só o iogurte natural: aparece ele e não o desnatado', (() => {
  const c = mk({ meus: ['iogurte', 'ovo', 'frango', 'arroz'] });
  const ids = E.shopping([0, 1, 2, 3, 4, 5, 6].map((d) => E.buildDay(d, c))).map((s) => s.id);
  return ids.indexOf('iogurte') >= 0 && ids.indexOf('iogurteD') < 0;
})());

// 4) filtros continuam mandando; trocas respeitam a escolha
t('vegano com frango marcado: frango continua proibido', !E.allowed('frango', mk({ style: 'vegan', meus: ['frango', 'tofu'] })) && E.allowed('tofu', mk({ style: 'vegan', meus: ['frango', 'tofu'] })));
t('alimentosDisponiveis ignora a própria lista e a rotina', E.alimentosDisponiveis(mk({ meus: ['frango'], rout: 'budget' })).length === E.alimentosDisponiveis(mk({})).length);
t('alimentosDisponiveis respeita jeito e restrições', E.alimentosDisponiveis(mk({ style: 'vegan' })).indexOf('frango') < 0 && E.alimentosDisponiveis(mk({ nolact: true })).indexOf('iogurte') < 0);
t('troca para alimento fora da lista é recusada', !E.podeTrocar('frango', 'patinho', 'almoco', mk({ meus: ['frango', 'arroz'] })) && E.podeTrocar('frango', 'patinho', 'almoco', mk({ meus: ['frango', 'patinho', 'arroz'] })));

// 5) escolhas apertadas não quebram nada e avisam
let quebrou = 0;
for (const meus of [['arroz'], ['frango'], ['banana'], ['frango', 'banana'], ['azeite'], ['tofu']]) for (const ro of ['tradicional', 'marmita', 'corrido', 'budget', 'fora']) {
  try { const c = mk({ meus, rout: ro }); [0, 1, 2, 3, 4, 5, 6].forEach((d) => { const dia = E.buildDay(d, c); if (!isFinite(dia.tot.kcal)) quebrou++; }); E.validaRestricoes(c); } catch (e) { quebrou++; }
}
t('escolhas muito apertadas não quebram o motor', quebrou === 0, quebrou);
t('sem nenhuma proteína marcada, o motor avisa', E.validaRestricoes(mk({ meus: ['arroz', 'banana'] })).semProteina === true);

// 6) tela (funções puras)
const h = { num: (v, d) => Number(v).toFixed(d == null ? 0 : d), escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), menorDeIdade: () => false };
const ctx = (cfg) => ({ kcalAlvo: 3043, macros: { proteina: { g: 134, gkg: 1.675 } }, cfg: Object.assign({ jeito: 'omni', rotina: 'marmita', restricoes: {}, nref: null, trocas: [], meus: null }, cfg), perfil: { idade: 30 }, objetivo: 'manutencao', dia: 0 });
const p0 = montaPopupMeus(ctx({}), h);
t('pop-up sem escolha: tudo marcado, 6 grupos', p0.marcados === p0.total && /Proteínas/.test(p0.html) && /Fruta/.test(p0.html) && /Gorduras/.test(p0.html) && (p0.html.match(/data-meus="alimento"/g) || []).length === p0.total);
t('pop-up: botões de alimento têm aria-pressed e nome', /data-v="iogurte" aria-pressed="true">Iogurte natural</.test(p0.html));
const p1 = montaPopupMeus(ctx({ meus: ['frango', 'arroz'] }), h);
t('pop-up com escolha: só os marcados ficam ligados', p1.marcados === 2 && /data-v="frango" aria-pressed="true"/.test(p1.html) && /data-v="iogurte" aria-pressed="false"/.test(p1.html));
t('pop-up vegano não lista carne', !/data-v="frango"/.test(montaPopupMeus(ctx({ jeito: 'vegan' }), h).html));
const v0 = montaVisao(ctx({}), h), v1 = montaVisao(ctx({ meus: ['frango', 'ovo', 'arroz', 'banana', 'brocolis'] }), h);
t('card: frase do automático e da escolha', /o app escolhe entre todos/.test(v0.meusinfo) && /só os 5 alimentos/.test(v1.meusinfo), v1.meusinfo);
t('lista de compras no card: sem iogurte quando não marcado', !/Iogurte/.test(v1.compras) && /Frango grelhado/.test(v1.compras));
t('lista de compras avisa a origem', /Só aparecem alimentos de Meus alimentos/.test(v1.compras) && /marque em Meus alimentos/.test(v0.compras));

console.log(ok + ' ok, ' + falhas + ' falhas');
process.exit(falhas ? 1 : 0);
