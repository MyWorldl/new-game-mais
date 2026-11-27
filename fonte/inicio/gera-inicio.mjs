// Gera site/inicio.html (página de apresentação, antes do login) a partir de fonte/inicio/inicio.template.html.
// As atualizações vêm de fonte/inicio/novidades.json, a fonte única: daqui saem a lista da página e a linha "Novidade" da tela de entrada do app (em ng-nuvem.js).
// Saída estática (sem JavaScript para montar a lista), então o texto já está no HTML na primeira resposta. Uso: node gera-inicio.mjs <pasta site>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.argv[2] || path.join(aqui, '../../site'));

// A lista completa de atualizações mora em fonte/inicio/novidades.json (a mais recente primeiro). O app só baixa a versão mais recente,
// gravada aqui por este script entre /*NOV*/ e /*FIM*/ em site/ng-nuvem.js (a tela de entrada mostra só "v61" e o título).
const NOV = JSON.parse(fs.readFileSync(path.join(aqui, 'novidades.json'), 'utf8'));
if (!Array.isArray(NOV) || !NOV.length) throw new Error('novidades.json vazio');
for (const n of NOV) if (!n.v || !n.data || !n.titulo || !Array.isArray(n.itens) || !n.itens.length) throw new Error('versão incompleta em novidades.json: ' + JSON.stringify(n.v));
const arqNuvem = path.join(site, 'ng-nuvem.js');
const nuvem = fs.readFileSync(arqNuvem, 'utf8');
const rx = /\/\*NOV\*\/[\s\S]*?\/\*FIM\*\//;
if (!rx.test(nuvem)) throw new Error('marcas /*NOV*/ ... /*FIM*/ não encontradas em ng-nuvem.js');
const nuvemNova = nuvem.replace(rx, () => '/*NOV*/{ v: ' + JSON.stringify(NOV[0].v) + ', titulo: ' + JSON.stringify(NOV[0].titulo) + ' }/*FIM*/');
if (nuvemNova !== nuvem) fs.writeFileSync(arqNuvem, nuvemNova);

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
