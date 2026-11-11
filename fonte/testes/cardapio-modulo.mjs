// Teste unitário da FRONTEIRA do módulo do cardápio (fonte/cardapio/ui.js), sem navegador e sem o app:
// o módulo roda em Node com um `ctx` falso. Se ele usar qualquer variável global do app (state, saveDoc, num...), dá ReferenceError aqui.
// Uso: node fonte/testes/cardapio-modulo.mjs
import { criaCardapio } from '../cardapio/ui.js';

let ok = 0, falhas = 0;
const t = (nome, cond) => { if (cond) { ok++; console.log('PASS', nome); } else { falhas++; console.log('FAIL', nome); } };

// DOM e janela mínimos
let clique = null;
const el = { innerHTML: '', style: {}, offsetHeight: 321, addEventListener: (ev, fn) => { if (ev === 'click') clique = fn; }, querySelector: () => null };
globalThis.document = { getElementById: (id) => (id === 'cardapio-body' ? el : null) };
globalThis.window = { scrollY: 120, scrollTo: () => {} };
globalThis.addEventListener = () => {}; globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = (f) => f();

// ctx falso
const chamadas = { salva: [], redesenha: 0, sons: [] };
let settings = { tema: 'x', cardapio: { jeito: 'omni', rotina: 'marmita', restricoes: { lactose: false, gluten: false } } };
let perfil = { idade: 30 };
const ctx = {
  estado: () => ({ settings, perfil }),
  objetivo: () => 'deficit',
  salvaSettings: (n) => { chamadas.salva.push(n); settings = n; },
  redesenhaDieta: () => { chamadas.redesenha++; },
  tocaSom: (n) => chamadas.sons.push(n),
  num: (v, d) => Number(v).toFixed(d || 0),
  escapeHtml: (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
  menorDeIdade: (i) => Number(i) > 0 && Number(i) < 18,
};

// 1. contrato: ctx incompleto falha com mensagem clara
try { criaCardapio({}); t('ctx vazio é recusado', false); } catch (e) { t('ctx vazio é recusado com mensagem clara', /ctx\.estado ausente/.test(e.message)); }

// 2. criação instala o clique e devolve render
const cardapio = criaCardapio(ctx);
t('devolve render()', typeof cardapio.render === 'function');
t('instalou o ouvinte de clique', typeof clique === 'function');

// 3. sem meta: mensagem de perfil incompleto
cardapio.render(null, null);
t('sem meta: pede para completar o perfil', /Complete seu perfil/.test(el.innerHTML));

// 4. com meta: semana completa (80 kg, 2000 kcal, 160 g de proteína)
const macros = { proteina: { g: 160, gkg: 2.0 } };
cardapio.render(2000, macros);
t('renderiza controles de jeito e rotina', /data-cdp="jeito" data-v="omni"[^>]*aria-pressed="true"/.test(el.innerHTML) && /data-cdp="rotina" data-v="marmita"/.test(el.innerHTML));
t('mostra os 7 dias', (el.innerHTML.match(/data-cdp="dia"/g) || []).length === 7);
t('subtítulo usa o objetivo do ctx (Emagrecimento)', /Emagrecimento/.test(el.innerHTML));
t('lista de compras presente', /Lista de compras da semana/.test(el.innerHTML));
t('adulto não vê a nota de menores', !/menores de 18/.test(el.innerHTML));

// 5. menor de idade: a nota aparece (regra de segurança)
perfil = { idade: 16 };
cardapio.render(2000, macros);
t('menor de 18: nota de segurança aparece', /menores de 18 anos/.test(el.innerHTML));
perfil = { idade: 30 };

// 6. clique em "jeito" salva o objeto settings inteiro, redesenha a Dieta, toca som e segura a altura/rolagem
const botao = { dataset: { cdp: 'jeito', v: 'vegan' } };
clique({ target: { closest: () => botao } });
const salvo = chamadas.salva[0];
t('clique em jeito: salvaSettings chamado uma vez', chamadas.salva.length === 1);
t('clique em jeito: guarda vegan e preserva o resto de settings', salvo && salvo.cardapio.jeito === 'vegan' && salvo.tema === 'x' && salvo.cardapio.rotina === 'marmita');
t('clique em jeito: pede redesenho da Dieta', chamadas.redesenha === 1);
t('clique em jeito: som "tick"', chamadas.sons[0] === 'tick');
t('clique segura a altura do card (minHeight)', el.style.minHeight === '321px');

// 7. clique em restrição alterna lactose
clique({ target: { closest: () => ({ dataset: { cdp: 'restr', v: 'lactose' } }) } });
t('clique em restrição: lactose ligada', settings.cardapio.restricoes.lactose === true && chamadas.salva.length === 2);

// 8. clique em dia NÃO grava nada e usa a última meta
const antes = chamadas.salva.length;
cardapio.render(2000, macros);
clique({ target: { closest: () => ({ dataset: { cdp: 'dia', v: '3' } }) } });
t('clique em dia: não grava', chamadas.salva.length === antes);
t('clique em dia: dia 3 selecionado', /class="cdp-day on" data-cdp="dia" data-v="3"/.test(el.innerHTML));

// 9. clique fora dos controles é ignorado
const n0 = chamadas.sons.length;
clique({ target: { closest: () => null } });
t('clique fora é ignorado', chamadas.sons.length === n0);

console.log(`${ok} ok / ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
