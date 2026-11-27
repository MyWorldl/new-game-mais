// Gera site/inicio.html (página de apresentação, antes do login) a partir de fonte/inicio/inicio.template.html.
// As atualizações vêm da MESMA lista NOVIDADES de site/ng-nuvem.js que a tela de entrada do app usa: uma fonte só, sem copiar texto à mão.
// Saída estática (sem JavaScript para montar a lista), então o texto já está no HTML na primeira resposta. Uso: node gera-inicio.mjs <pasta site>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.argv[2] || path.join(aqui, '../../site'));

const nuvem = fs.readFileSync(path.join(site, 'ng-nuvem.js'), 'utf8');
const ini = nuvem.indexOf('var NOVIDADES = [');
if (ini < 0) throw new Error('NOVIDADES não encontrada em ng-nuvem.js');
const fim = nuvem.indexOf('\n  ];', ini);
if (fim < 0) throw new Error('fim de NOVIDADES não encontrado em ng-nuvem.js');
const NOV = new Function('return ' + nuvem.slice(ini + 'var NOVIDADES = '.length, fim + 4))();
if (!Array.isArray(NOV) || !NOV.length) throw new Error('NOVIDADES vazia');

const ROTULO = { novo: 'Novo', melhoria: 'Melhoria', correcao: 'Correção' };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const versao = (v) => esc(String(v).replace('ng-modular-', 'Versão '));
const itens = (n) => '<ul class="nov-itens">' + n.itens.map((i) => {
  if (!ROTULO[i.t]) throw new Error('tipo de item desconhecido: ' + i.t);
  return '<li><span class="nov-tag nov-' + i.t + '">' + ROTULO[i.t] + '</span><span class="nov-x">' + esc(i.x) + '</span></li>';
}).join('') + '</ul>';

const n0 = NOV[0];
const atual = '<article class="nov-atual" aria-labelledby="nov-t0">'
  + '<p class="nov-meta"><span class="nov-selo">Mais recente</span> ' + versao(n0.v) + ' · ' + esc(n0.data) + '</p>'
  + '<h3 id="nov-t0">' + esc(n0.titulo) + '</h3>' + itens(n0) + '</article>';
const anteriores = NOV.slice(1).map((n) => '<details class="nov-ant"><summary><span class="nov-sv">' + versao(n.v) + '</span><span class="nov-st">' + esc(n.titulo) + '</span><span class="nov-sd">' + esc(n.data) + '</span></summary>' + itens(n) + '</details>').join('\n');
const link = '<a class="novo-link" href="#atualizacoes"><span class="novo-t">Novidade</span><span class="novo-x">' + esc(n0.titulo) + '</span><span class="novo-seta" aria-hidden="true">›</span></a>';

let html = fs.readFileSync(path.join(aqui, 'inicio.template.html'), 'utf8');
const troca = (marca, valor) => { if (!html.includes(marca)) throw new Error('marca ausente no modelo: ' + marca); html = html.replace(marca, () => valor); };
troca('<!--NOVIDADE_LINK-->', link);
troca('<!--NOVIDADE_ATUAL-->', atual);
troca('<!--NOVIDADES_ANTERIORES-->', anteriores);
troca('<!--ANTERIORES_TOTAL-->', String(NOV.length - 1));
fs.writeFileSync(path.join(site, 'inicio.html'), html);
console.log('ok inicio.html', Buffer.byteLength(html), 'bytes;', NOV.length, 'versões; mais recente', n0.v);
