// Orçamento de tamanho do site: roda no fim do build.sh (segundos) e mostra, antes do CI, se algo está perto do limite.
// Uso: node fonte/tamanho.mjs [pasta-do-site]   (padrão: ../site)   | NG_TAMANHO_SO_AVISO=1 transforma falhas em avisos
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const site = path.resolve(process.argv[2] || path.join(aqui, '..', 'site'));
const orc = JSON.parse(fs.readFileSync(path.join(aqui, 'orcamento-tamanho.json'), 'utf8'));
const KB = (n) => (n / 1024).toFixed(0).padStart(4) + ' KB';
const so_aviso = process.env.NG_TAMANHO_SO_AVISO === '1';
const arquivos = fs.readdirSync(site);
const acha = (re) => arquivos.filter((f) => re.test(f));
const alvos = [
  ['app.js', acha(/^app\.[0-9a-f]+\.js$/)],
  ['app.css', acha(/^app\.[0-9a-f]+\.css$/)],
  ['dados.js', acha(/^dados\.[0-9a-f]+\.js$/)],
  ['cardapio.js', acha(/^cardapio\.[0-9a-f]+\.js$/)],
];
let falhas = 0, avisos = 0;
const linhas = [];
for (const [chave, lista] of alvos) {
  if (lista.length !== 1) { linhas.push(`${chave.padEnd(12)} FALHA: esperado 1 arquivo em ${site}, achei ${lista.length} (${lista.join(', ')})`); falhas++; continue; }
  const buf = fs.readFileSync(path.join(site, lista[0]));
  const bruto = buf.length, gz = zlib.gzipSync(buf, { level: 9 }).length;
  const lim = orc[chave], pg = gz / (lim.gzipKB * 1024) * 100, pb = bruto / (lim.brutoKB * 1024) * 100;
  const pior = Math.max(pg, pb);
  const estado = pior >= 100 ? 'FALHA' : pior >= orc.avisoPercentual ? 'AVISO' : 'ok';
  if (estado === 'FALHA') falhas++; else if (estado === 'AVISO') avisos++;
  linhas.push(`${chave.padEnd(12)} bruto ${KB(bruto)} (${pb.toFixed(0).padStart(3)}% de ${lim.brutoKB})  gzip ${KB(gz)} (${pg.toFixed(0).padStart(3)}% de ${lim.gzipKB})  ${estado}`);
  if (chave === 'app.js' && bruto >= orc.carregarSobDemandaAcimaBrutoKB * 1024) {
    linhas.push(`  -> app.js passou de ${orc.carregarSobDemandaAcimaBrutoKB} KB: carregar sob demanda as telas pouco usadas (cadastro/openOnboarding, openPerfilEditor, iniciarTutorial), como o cardápio. Plano em claude/orcamento-tamanho-v1.md.`);
  }
}
// Conteúdo não pode morar no app.js: procura tabelas grandes (const X = [..] / {..}) em fonte/app.html
try {
  const html = fs.readFileSync(path.join(aqui, 'app.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const js = scripts.sort((a, b) => b.length - a.length)[0] || '';
  const ls = js.split('\n');
  const ini = [];
  ls.forEach((l, i) => { if (/^(const|let|var|function|async function|class)\s/.test(l) || l.startsWith('/* ')) ini.push(i); });
  const tabelas = [];
  ini.forEach((i, k) => {
    const m = /^(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*=\s*[\[{]/.exec(ls[i]);
    if (!m) return;
    const fim = k + 1 < ini.length ? ini[k + 1] : ls.length;
    tabelas.push([m[1], Buffer.byteLength(ls.slice(i, fim).join('\n'))]);
  });
  tabelas.sort((a, b) => b[1] - a[1]);
  for (const [nome, bytes] of tabelas.slice(0, 3)) {
    const kb = bytes / 1024, e = kb >= orc.dadosNoApp.falhaKB ? 'FALHA' : kb >= orc.dadosNoApp.avisoKB ? 'AVISO' : 'ok';
    if (e === 'FALHA') falhas++; else if (e === 'AVISO') avisos++;
    linhas.push(`tabela no app: ${nome.padEnd(22)} ${KB(bytes)}  ${e}${e !== 'ok' ? '  -> mover para fonte/dados/*.json' : ''}`);
  }
} catch (e) { linhas.push('(não consegui analisar fonte/app.html: ' + e.message + ')'); }
console.log('Orçamento de tamanho (' + site + ')');
linhas.forEach((l) => console.log('  ' + l));
if (falhas) {
  console.log(`\n${falhas} item(ns) acima do orçamento. Conteúdo novo vai em fonte/dados/*.json (não no app.js); mudar o orçamento é decisão consciente em fonte/orcamento-tamanho.json.`);
  if (!so_aviso) process.exit(1);
} else console.log(avisos ? `\nok, com ${avisos} aviso(s): perto do limite.` : '\nok.');
