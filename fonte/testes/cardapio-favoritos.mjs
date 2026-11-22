// Favoritos (estrela) e atalho "Não quero mais este" do cardápio (fonte/cardapio/engine.js + ui.js), sem navegador.
// Uso: node fonte/testes/cardapio-favoritos.mjs
import * as E from '../cardapio/engine.js';
import { montaPopup, montaPopupMeus, normalizaCfg } from '../cardapio/ui.js';
let ok = 0, falhas = 0;
const t = (nome, cond, extra = '') => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome, extra); } };
const base = { kg: 80, age: 30, kcalMeta: 3043, protG: 134 };
const mk = (o) => Object.assign({}, base, { style: 'omni', rout: 'marmita', trocas: [] }, o);
const h = { num: (v, d) => Number(v).toFixed(d || 0), escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])), menorDeIdade: (i) => i < 18 };
const macros = { proteina: { g: 134, gkg: 1.8 } };
const ui = (cardapio, dia) => ({ kcalAlvo: 3043, macros, cfg: normalizaCfg({ cardapio }), perfil: { idade: 30 }, objetivo: 'superavit', dia: dia == null ? 0 : dia });

// 1) normalização
t('normalizaFavs: não-lista vira []', JSON.stringify(E.normalizaFavs(undefined)) === '[]' && JSON.stringify(E.normalizaFavs('x')) === '[]' && JSON.stringify(E.normalizaFavs({})) === '[]');
t('normalizaFavs: tira inválidos e repetidos', JSON.stringify(E.normalizaFavs(['salmao', 'xyz', 3, 'salmao', 'banana'])) === '["salmao","banana"]');
t('normalizaCfg lê settings.cardapio.favoritos (e aceita config antiga sem o campo)', JSON.stringify(normalizaCfg({ cardapio: { favoritos: ['salmao'] } }).favs) === '["salmao"]' && JSON.stringify(normalizaCfg({ cardapio: {} }).favs) === '[]' && JSON.stringify(normalizaCfg(null).favs) === '[]');

// 2) a estrela só reordena: o favorito vem primeiro nas listas de onde o motor escolhe
const cf = mk({ favs: ['salmao', 'morango', 'cenoura'] });
t('favorito de proteína vem primeiro nas alternativas do almoço', E.alternativasIds('prot', 'almoco', cf)[0] === 'salmao');
t('favorito de fruta vem primeiro', E.alternativasIds('fruit', 'cafe', cf)[0] === 'morango');
t('favorito de vegetal vem primeiro', E.alternativasIds('veg', 'almoco', cf)[0] === 'cenoura');
const semFav = E.alternativasIds('prot', 'almoco', mk({})), comFav = E.alternativasIds('prot', 'almoco', cf);
t('a lista tem os mesmos alimentos, só em outra ordem (variedade intacta)', semFav.length === comFav.length && semFav.slice().sort().join() === comFav.slice().sort().join());
t('sem favoritos nada muda', JSON.stringify(E.buildDay(2, mk({ favs: [] }))) === JSON.stringify(E.buildDay(2, mk({}))));

// 3) favorito nunca vence restrição, Meus alimentos nem regra de menor de idade
t('vegano com favorito "frango": frango continua fora', !E.alternativasIds('prot', 'almoco', mk({ style: 'vegan', favs: ['frango'] })).includes('frango'));
t('sem lactose com favorito "queijo": queijo continua fora', !E.alternativasIds('prot', 'lanche', mk({ nolact: true, favs: ['queijo'] })).includes('queijo'));
t('fora de Meus alimentos, o favorito não entra', !E.alternativasIds('prot', 'almoco', mk({ meus: ['frango', 'patinho', 'arroz'], favs: ['salmao'] })).includes('salmao'));
let proib = 0, dias = 0, defMenorCom = 0, defMenorSem = 0;
for (const st of ['omni', 'pesc', 'veg', 'vegan', 'lowc']) for (const ro of ['tradicional', 'marmita', 'corrido', 'budget', 'fora']) for (const r of [{}, { nolact: 1 }, { nogluten: 1 }, { noegg: 1, nofish: 1 }, { nopork: 1, nored: 1 }]) for (const age of [30, 16]) {
  const favs = ['frango', 'salmao', 'queijo', 'ovo', 'whey', 'pao', 'amendoim', 'lombo', 'banana'];
  const cfg = mk(Object.assign({ style: st, rout: ro, age, favs }, r)), cfg0 = mk(Object.assign({ style: st, rout: ro, age }, r));
  for (let d = 0; d < 7; d++) {
    dias++;
    const day = E.buildDay(d, cfg), day0 = E.buildDay(d, cfg0);
    day.meals.forEach((m) => m.items.forEach((it) => { if (!E.allowed(it.id, cfg)) proib++; }));
    if (age < 18) { if (day.tot.kcal < day.target.kcal * 0.92) defMenorCom++; if (day0.tot.kcal < day0.target.kcal * 0.92) defMenorSem++; }
  }
}
t('simulação com favoritos (' + dias + ' dias): nenhum alimento proibido', proib === 0, proib);
t('menor de idade: favoritos não criam dias com déficit além dos que já existiam sem eles', defMenorCom <= defMenorSem, defMenorCom + ' vs ' + defMenorSem);

// 4) metas: favoritos não pioram o fechamento de calorias e proteína
const conta = (favs) => { let k = 0, p = 0, n = 0; for (const st of ['omni', 'veg', 'vegan', 'lowc']) for (const ro of ['tradicional', 'marmita', 'corrido']) for (const nref of [3, 4, 5, 6]) for (let d = 0; d < 7; d++) {
  const day = E.buildDay(d, mk({ style: st, rout: ro, nref, favs })); n++;
  if (Math.abs(day.tot.kcal / day.target.kcal - 1) > 0.08) k++;
  if (day.tot.P / day.target.P < 0.9) p++;
} return { k, p, n }; };
const A = conta([]), B = conta(['salmao', 'ovo', 'tofu', 'morango', 'cenoura', 'aveia', 'azeite', 'feijaoP']);
console.log('sem favoritos', A, '| com favoritos', B);
t('dias fora de ±8% de kcal: com favoritos não passa de 1% a mais do que sem', B.k <= A.k + Math.ceil(A.n * 0.01), JSON.stringify([A, B]));
t('dias com proteína < 90%: com favoritos não passa de 1% a mais do que sem', B.p <= A.p + Math.ceil(A.n * 0.01), JSON.stringify([A, B]));

// 5) atalho "Não quero mais este": motor
const m0 = mk({});
const r1 = E.retiraAlimento(m0, 'iogurte');
t('retira um alimento: devolve a lista sem ele e com o resto', r1.ok && !r1.meus.includes('iogurte') && r1.meus.includes('frango') && r1.meus.length === E.alimentosDisponiveis(m0).length - 1);
t('retira o que já está fora: recusa', E.retiraAlimento(mk({ meus: ['frango', 'patinho', 'arroz'] }), 'iogurte').motivo === 'ja_fora');
t('alimento desconhecido: recusa', E.retiraAlimento(m0, 'xyz').motivo === 'desconhecido');
t('recusa quando sobraria menos de 2 da categoria (3 proteínas marcadas, retira 2)', (() => { const c = mk({ meus: ['frango', 'patinho', 'ovo', 'arroz', 'banana', 'brocolis'] }); const a = E.retiraAlimento(c, 'ovo'); const c2 = mk({ meus: a.meus }); return a.ok && E.retiraAlimento(c2, 'patinho').motivo === 'categoria'; })());
t('recusa quando só há 1 alimento da categoria', E.retiraAlimento(mk({ meus: ['frango', 'arroz', 'banana', 'brocolis'] }), 'arroz').motivo === 'categoria');
t('usa os filtros: vegano não consegue "retirar" frango (já fora)', E.retiraAlimento(mk({ style: 'vegan' }), 'frango').motivo === 'ja_fora');
const sem = [0, 1, 2, 3, 4, 5, 6].map((d) => E.buildDay(d, mk({ meus: r1.meus })));
t('depois de retirar, o alimento some do cardápio e da lista de compras', !E.shopping(sem).some((s) => s.id === 'iogurte'));

// 6) atalho no pop-up (HTML) e estrela em Meus alimentos
const pop = montaPopup(ui({ jeito: 'omni', rotina: 'marmita', restricoes: {}, trocas: [] }), h, { slot: 'almoco', itemId: 'frango', escopo: 'dia' });
t('pop-up de troca oferece "Não quero mais este" com o nome do alimento', new RegExp('data-pop="naoquero" data-v="' + pop.sel.itemId + '"[^>]*>Não quero mais este<').test(pop.html) && /Tira <b>[^<]+<\/b> do cardápio, das trocas e da lista de compras/.test(pop.html));
const meus = montaPopupMeus(ui({ jeito: 'omni', rotina: 'marmita', restricoes: {}, favoritos: ['salmao'] }), h);
t('Meus alimentos: estrela em cada alimento marcado, ligada só no favorito', (meus.html.match(/data-meus="fav"/g) || []).length === E.alimentosDisponiveis(mk({})).length && /data-meus="fav" data-v="salmao" aria-pressed="true"/.test(meus.html) && /data-meus="fav" data-v="frango" aria-pressed="false"/.test(meus.html));
t('estrela tem nome acessível e a ajuda explica que só reordena', /aria-label="Favorito: Salmão grelhado"/.test(meus.html) && /aparecem primeiro na ordem do cardápio e das trocas, sem tirar a variedade/.test(meus.html));
const meus2 = montaPopupMeus(ui({ jeito: 'omni', rotina: 'marmita', restricoes: {}, meus: ['frango', 'arroz', 'banana', 'brocolis'] }), h);
t('alimento desmarcado não tem estrela', (meus2.html.match(/data-meus="fav"/g) || []).length === 4);

console.log(ok + ' ok, ' + falhas + ' falhas');
process.exit(falhas ? 1 : 0);
