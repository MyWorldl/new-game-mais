#!/usr/bin/env python3
"""Gera site/mapa-demo.html + site/mapa-demo.js: página de PROTÓTIPO (sem login) que monta o mesmo módulo do mapa corporal
com dados de exemplo, usando o CSS real do app (app.<hash>.css). Serve para ver o desenho nos temas e na Cloudflare (preview) sem entrar no app.
Uso: python3 demo.py <pasta site>. NÃO é parte do produto: não mesclar na main."""
import sys, re, glob, os
site = sys.argv[1]
css = os.path.basename(sorted(glob.glob(os.path.join(site, 'app.*.css')))[0])
mod = os.path.basename(sorted(glob.glob(os.path.join(site, 'mapa.*.js')))[0])
html = '''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Protótipo: mapa corporal</title>
<link rel="stylesheet" href="%s"></head><body>
<main style="max-width:520px;margin:0 auto;padding:16px">
<div class="card">
  <div class="card-head"><h2>Protótipo: mapa corporal (React + TypeScript)</h2><span class="hint">dados de exemplo, sem login</span></div>
  <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px">
    <label>Silhueta<select id="d-perfil"><option value="M">Masculina</option><option value="F">Feminina</option><option value="N">Neutra</option></select></label>
    <label>Cenário<select id="d-cen"><option value="meio">Semana em andamento</option><option value="zero">Nada feito</option><option value="cheio">Tudo feito</option><option value="foco">Com foco em glúteos</option></select></label>
    <label>Tema<select id="d-tema"><option value="">Padrão</option><option value="azul">Azul</option><option value="rosa">Rosa</option><option value="roxo">Roxo</option></select></label>
    <label>Modo<select id="d-modo"><option value="escuro">Escuro</option><option value="claro">Claro</option></select></label>
  </div>
  <div id="host"></div>
</div></main>
<script type="module" src="mapa-demo.js"></script></body></html>
''' % css
js = '''import { atualizar } from "./%s";
const L = { peito:[10,22], costas:[10,25], ombros:[8,22], biceps:[8,20], triceps:[6,18], quadriceps:[8,20], posterior:[6,20], gluteos:[0,16], panturrilha:[8,20], abdomen:[0,16] };
const NOMES = { peito:"Peito", costas:"Costas", ombros:"Ombros", biceps:"Bíceps", triceps:"Tríceps", quadriceps:"Quadríceps", posterior:"Posterior de coxa", gluteos:"Glúteos", panturrilha:"Panturrilha", abdomen:"Abdômen" };
const CAT = { peito:"Peito, ombros e tríceps", ombros:"Peito, ombros e tríceps", triceps:"Peito, ombros e tríceps", costas:"Costas e bíceps", biceps:"Costas e bíceps", quadriceps:"Pernas", posterior:"Pernas", gluteos:"Pernas", panturrilha:"Pernas", abdomen:"Core" };
const PLAN = { meio:{peito:12,costas:14,ombros:6,biceps:9,triceps:4,quadriceps:18,posterior:4,gluteos:12,panturrilha:0,abdomen:3}, zero:{peito:12,costas:14,ombros:10,biceps:9,triceps:8,quadriceps:14,posterior:8,gluteos:10,panturrilha:9,abdomen:8}, cheio:{peito:14,costas:16,ombros:12,biceps:10,triceps:9,quadriceps:16,posterior:10,gluteos:12,panturrilha:10,abdomen:9}, foco:{peito:10,costas:12,ombros:8,biceps:8,triceps:6,quadriceps:14,posterior:10,gluteos:18,panturrilha:8,abdomen:6} };
const FEITO = { meio:{peito:12,costas:7,ombros:3,biceps:2,triceps:4,quadriceps:6,posterior:0,gluteos:4,panturrilha:0,abdomen:0}, zero:{}, cheio:null, foco:{gluteos:9,quadriceps:7,posterior:5} };
const $ = (id) => document.getElementById(id);
function dados() {
  const cen = $("d-cen").value, plan = PLAN[cen], feito = FEITO[cen] || plan;
  return { perfil: $("d-perfil").value, musculos: Object.keys(L).map((id) => ({ id, nome: NOMES[id], categoria: CAT[id], planejado: plan[id], feito: feito[id] || 0, mev: L[id][0], mrv: L[id][1], foco: cen === "foco" && id === "gluteos", alvo: 18 })) };
}
function tema() { const r = document.documentElement; r.removeAttribute("data-tema"); if ($("d-tema").value) r.setAttribute("data-tema", $("d-tema").value); r.setAttribute("data-modo", $("d-modo").value); r.setAttribute("data-theme", $("d-modo").value === "claro" ? "light" : "dark"); }
function render() { tema(); atualizar($("host"), dados()); }
["d-perfil", "d-cen", "d-tema", "d-modo"].forEach((id) => $(id).addEventListener("change", render));
render();
''' % mod
open(os.path.join(site, 'mapa-demo.html'), 'w', encoding='utf-8').write(html)
open(os.path.join(site, 'mapa-demo.js'), 'w', encoding='utf-8').write(js)
print('demo ok', css, mod)
