// Teste unitário do módulo do cardápio (fonte/cardapio/ui.js), sem navegador e sem o app:
// roda em Node com um `ctx` falso e nós de DOM falsos. Se o módulo usar qualquer variável global do app (state, saveDoc, num...),
// dá ReferenceError aqui. Também prova a atualização por nó: o esqueleto é montado uma vez e só as regiões que mudam são reescritas.
// Uso: node fonte/testes/cardapio-modulo.mjs
import { criaCardapio, montaVisao, normalizaCfg } from '../cardapio/ui.js';

let ok = 0, falhas = 0;
const t = (nome, cond) => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome); } };

// ---------- DOM falso: um nó por seletor; conta quantas vezes cada nó foi reescrito
const nos = {};
function no(sel) {
  if (!nos[sel]) {
    const n = { _h: '', sets: 0, cls: new Set(), attrs: {}, toggles: 0, attrSets: 0 };
    n.classList = { contains: (c) => n.cls.has(c), toggle: (c, on) => { on ? n.cls.add(c) : n.cls.delete(c); n.toggles++; } };
    n.getAttribute = (k) => n.attrs[k]; n.setAttribute = (k, v) => { n.attrs[k] = v; n.attrSets++; };
    Object.defineProperty(n, 'innerHTML', { get: () => n._h, set: (v) => { n._h = v; n.sets++; } });
    nos[sel] = n;
  }
  return nos[sel];
}
let clique = null, mudou = null;
const el = { _h: '', montagens: 0, style: {}, offsetHeight: 321, addEventListener: (ev, fn) => { if (ev === 'click') clique = fn; if (ev === 'change') mudou = fn; }, querySelector: no };
Object.defineProperty(el, 'innerHTML', { get: () => el._h, set: (v) => { el._h = v; el.montagens++; } });
globalThis.document = { getElementById: (id) => (id === 'cardapio-body' ? el : null) };
globalThis.window = { scrollY: 120, scrollTo: () => {} };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = (f) => f();
const R = (nome) => no('[data-r="' + nome + '"]');
const B = (rot, v) => no('[data-cdp="' + rot + '"][data-v="' + v + '"]');
const S = (rot) => no('[data-cdp-sel="' + rot + '"]');                                   // campos selecionáveis: jeito, rotina, nref
const C = (v) => no('[data-cdp-chk="restr"][data-v="' + v + '"]');                       // caixas de marcar das restrições
const muda = (sel, chk) => mudou({ target: { closest: (q) => (q === '[data-cdp-sel]' ? sel : chk) } });

// ---------- ctx falso
const chamadas = { salva: [], redesenha: 0, sons: [] };
let settings = { tema: 'x', cardapio: { jeito: 'omni', rotina: 'marmita', restricoes: { lactose: false, gluten: false } } };
let perfil = { idade: 30 };
const h = {
  num: (v, d) => Number(v).toFixed(d || 0),
  escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  menorDeIdade: (i) => Number(i) > 0 && Number(i) < 18,
};
const ctx = Object.assign({
  estado: () => ({ settings, perfil }),
  objetivo: () => 'deficit',
  salvaSettings: (n) => { chamadas.salva.push(n); settings = n; },
  redesenhaDieta: () => { chamadas.redesenha++; },
  tocaSom: (n) => chamadas.sons.push(n),
}, h);
const macros = { proteina: { g: 160, gkg: 2.0 } };

// 1. contrato
try { criaCardapio({}); t('ctx vazio é recusado', false); } catch (e) { t('ctx vazio é recusado com mensagem clara', /ctx\.estado ausente/.test(e.message)); }

// 2. normalização das escolhas (inclui o formato antigo)
t('normalizaCfg: padrão onívoro + marmita', normalizaCfg({}).jeito === 'omni' && normalizaCfg({}).rotina === 'marmita');
t('normalizaCfg: antigo "vegetariano" migra para veg', normalizaCfg({ cardapio: { restricoes: { vegetariano: true } } }).jeito === 'veg');
t('normalizaCfg: valor inválido cai no padrão', normalizaCfg({ cardapio: { jeito: 'xyz', rotina: 'abc' } }).jeito === 'omni');

// 3. visão pura (sem DOM): texto de cada região
const base = { kcalAlvo: 2000, macros, cfg: normalizaCfg(settings), perfil: { idade: 30 }, objetivo: 'deficit', dia: 0 };
const v0 = montaVisao(base, h), v0b = montaVisao(base, h), v2 = montaVisao({ ...base, dia: 2 }, h);
t('visão: determinística (mesma entrada, mesma saída)', JSON.stringify(v0) === JSON.stringify(v0b));
t('visão: marmita tem 5 refeições', (v0.refeicoes.match(/class="cdp-meal"/g) || []).length === 5);
t('visão: 4 chips de total', (v0.total.match(/cdp-tchip/g) || []).length === 4);
t('visão: subtítulo usa o objetivo (Emagrecimento)', /Emagrecimento/.test(v0.sub));
t('visão: ligados refletem as escolhas', v0.ligados.jeito === 'omni' && v0.ligados.rotina === 'marmita' && v0.ligados.dia === '0' && v0.ligados.lactose === false);
t('visão: trocar o dia muda refeições e total, não o subtítulo nem o rodapé', v2.refeicoes !== v0.refeicoes && v2.total !== v0.total && v2.sub === v0.sub && v2.rodape === v0.rodape && v2.ligados.dia === '2');
t('visão: adulto não vê a nota de menores', !/menores de 18/.test(v0.rodape));
t('visão: menor de 18 vê a nota de segurança', /menores de 18 anos/.test(montaVisao({ ...base, perfil: { idade: 16 } }, h).rodape));
t('visão: lista de compras com grupos', /Proteínas/.test(v0.compras) && /Quantidades de alimento já preparado/.test(v0.compras));
t('visão: vegano mostra a nota de nutrientes', /vitamina B12/.test(montaVisao({ ...base, cfg: { ...base.cfg, jeito: 'vegan' } }, h).rodape));

// 4. criação e primeira renderização
const cardapio = criaCardapio(ctx);
t('devolve render()', typeof cardapio.render === 'function');
t('instalou o ouvinte de clique', typeof clique === 'function');
cardapio.render(null, null);
t('sem meta: pede para completar o perfil', /Complete seu perfil/.test(el.innerHTML));
const m0 = el.montagens;
cardapio.render(2000, macros);
t('com meta: esqueleto montado', el.montagens === m0 + 1 && /data-cdp-sel="jeito"/.test(el.innerHTML) && /data-r="refeicoes"/.test(el.innerHTML));
t('esqueleto tem os 7 dias', (el.innerHTML.match(/data-cdp="dia"/g) || []).length === 7);
t('regiões preenchidas', /Emagrecimento/.test(R('sub').innerHTML) && /cdp-meal/.test(R('refeicoes').innerHTML) && /cdp-tchip/.test(R('total').innerHTML));
t('campos e botões: onívoro, marmita, dia 1', S('jeito').value === 'omni' && S('rotina').value === 'marmita' && B('dia', '0').cls.has('on'));
t('aria-pressed dos dias acompanha a classe "on"', B('dia', '0').attrs['aria-pressed'] === 'true' && B('dia', '1').attrs['aria-pressed'] === 'false');

// 5. atualização por nó: render igual não reescreve nada
const m1 = el.montagens;
const setsAntes = ['sub', 'rotdesc', 'total', 'avisos', 'refeicoes', 'compras', 'rodape'].map((r) => R(r).sets);
const togglesAntes = B('dia', '0').toggles + B('dia', '1').toggles, valoresAntes = S('jeito').value + S('rotina').value + S('nref').value;
cardapio.render(2000, macros);
t('render repetido: não remonta o esqueleto', el.montagens === m1);
t('render repetido: nenhuma região reescrita', ['sub', 'rotdesc', 'total', 'avisos', 'refeicoes', 'compras', 'rodape'].every((r, i) => R(r).sets === setsAntes[i]));
t('render repetido: nenhum botão nem campo alterado', B('dia', '0').toggles + B('dia', '1').toggles === togglesAntes && S('jeito').value + S('rotina').value + S('nref').value === valoresAntes);

// 6. clique em "dia": não grava, só troca refeições/total e o botão ligado
const subSets = R('sub').sets, refSets = R('refeicoes').sets, antesSalva = chamadas.salva.length;
clique({ target: { closest: () => ({ dataset: { cdp: 'dia', v: '2' } }) } });
t('clique em dia: não grava', chamadas.salva.length === antesSalva);
t('clique em dia: refeições trocadas, subtítulo intacto', R('refeicoes').sets === refSets + 1 && R('sub').sets === subSets);
t('clique em dia: botão ligado muda sem remontar', B('dia', '2').cls.has('on') && !B('dia', '0').cls.has('on') && el.montagens === m1);
t('clique em dia segura a altura do card (rede de segurança)', el.style.minHeight === '321px');

// 7. mudar o campo "jeito de comer": salva o settings inteiro, redesenha e toca som
muda({ dataset: { cdpSel: 'jeito' }, value: 'vegan' }, null);
const salvo = chamadas.salva[chamadas.salva.length - 1];
t('campo jeito: guarda vegan e preserva o resto de settings', salvo.cardapio.jeito === 'vegan' && salvo.tema === 'x' && salvo.cardapio.rotina === 'marmita');
t('campo jeito: pede redesenho da Dieta e toca "tick"', chamadas.redesenha === 1 && chamadas.sons[chamadas.sons.length - 1] === 'tick');
cardapio.render(2000, macros);   // o app responde ao redesenho
t('depois do redesenho: o campo mostra vegano, sem remontar', S('jeito').value === 'vegan' && el.montagens === m1);

// 8. restrição: caixa de marcar lactose
muda(null, { dataset: { v: 'lactose' }, checked: true });
t('caixa de restrição: lactose marcada e salva', settings.cardapio.restricoes.lactose === true);
cardapio.render(2000, macros);
t('depois do redesenho: a caixa de lactose aparece marcada', C('lactose').checked === true && C('gluten').checked !== true);
muda(null, { dataset: { v: 'lactose' }, checked: false });
t('caixa de restrição: desmarcar salva lactose desligada', settings.cardapio.restricoes.lactose === false);
// refeições por dia: na marmita o campo não muda nada
const salvasAntes = chamadas.salva.length;
muda({ dataset: { cdpSel: 'nref' }, value: '4', disabled: false }, null);
t('refeições por dia na marmita: ignorado', chamadas.salva.length === salvasAntes);

// 9. clique fora dos controles é ignorado; perder a meta e voltar remonta o esqueleto
const n0 = chamadas.sons.length;
clique({ target: { closest: () => null } });
t('clique fora é ignorado', chamadas.sons.length === n0);
cardapio.render(null, null); cardapio.render(2000, macros);
t('perdeu a meta e voltou: esqueleto remontado', el.montagens === m1 + 2);
t('remontado: regiões preenchidas de novo', /cdp-meal/.test(R('refeicoes').innerHTML));

console.log(`${ok} ok / ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
