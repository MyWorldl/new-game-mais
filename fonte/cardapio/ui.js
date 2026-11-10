/* Tela do cardápio da semana (aba Dieta). Usa o motor CDPE e a meta que o app já calcula (kcalAlvo + macros).
   Escolhas salvas em settings.cardapio = {jeito, rotina, restricoes:{lactose, gluten}} (entra no backup junto com as configurações). */
const CDP_JEITOS = [["omni","Onívoro"],["veg","Vegetariano"],["vegan","Vegano"],["lowc","Low carb"]];
const CDP_ROTINAS = [["marmita","Marmita da semana"],["corrido","Dia corrido"],["budget","Orçamento enxuto"],["fora","Almoço fora"]];
const CDP_ROT_DESC = {
  marmita:"5 refeições; cozinhe no domingo e na quinta e use em lotes.",
  corrido:"4 refeições de preparo rápido, para dias apertados.",
  budget:"5 refeições só com alimentos de custo menor.",
  fora:"4 refeições; no almoço, dica de como montar o prato por quilo."
};
const CDP_OBJ_TXT = {deficit:"Emagrecimento", manutencao:"Manutenção", superavit:"Hipertrofia"};
const CDP_GRUPOS = [["Proteínas",["prot"]],["Carboidratos e leguminosas",["carb","leg"]],["Frutas e vegetais",["fruit","veg"]],["Gorduras",["fat"]]];
let cdpDia = 0;          // dia da semana selecionado (só em memória)
let cdpUltimo = null;    // última meta usada, para trocar de dia sem refazer a aba inteira

function cdpCfg(){
  const c = (state.settings && state.settings.cardapio) || {};
  const r = c.restricoes || {};
  return {
    jeito: CDPE.STYLE[c.jeito] ? c.jeito : (r.vegetariano ? "veg" : "omni"),   // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: CDPE.ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: {lactose:!!r.lactose, gluten:!!r.gluten},
  };
}
function cdpSalvar(cfg){
  state.settings = Object.assign({}, state.settings, {cardapio:{jeito:cfg.jeito, rotina:cfg.rotina, restricoes:{lactose:cfg.restricoes.lactose, gluten:cfg.restricoes.gluten}}});
  saveDoc("config/settings", state.settings);
}
function cdpQtd(id, g, compras){
  const f = CDPE.FOODS[id], un = f.liq ? "ml" : "g";
  let q = g >= 1000 ? num(g/1000,1)+(f.liq ? " L" : " kg") : num(g,0)+" "+un;
  if(f.unit && !(compras && id === "azeite")){ const n = Math.max(1, Math.round(g/f.unit[0])); q = n+" "+(n>1 ? f.unit[2] : f.unit[1])+" (≈ "+q+")"; }
  return q;
}
function cdpNome(f){
  const rot = /\*$/.test(f.n);
  return escapeHtml(rot ? f.n.replace(/\*$/,"") : f.n)+(rot ? '<sup title="valor típico de rótulo — confira o seu">*</sup>' : "");
}
function cdpSemana(motor){
  const w = [];
  for(let d = 0; d < 7; d++) w.push(CDPE.buildDay(d, motor));
  return w;
}
function renderCardapio(kcalAlvo, macros){
  const el = document.getElementById("cardapio-body");
  if(!el) return;
  if(!kcalAlvo || !macros){
    cdpUltimo = null;
    el.innerHTML = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';
    return;
  }
  cdpUltimo = {k:kcalAlvo, m:macros};
  const cfg = cdpCfg(), p = state.perfil || {};
  const motor = {kg:macros.proteina.g/macros.proteina.gkg, age:Number(p.idade)||30, kcalMeta:kcalAlvo, protG:macros.proteina.g,
                 style:cfg.jeito, rout:cfg.rotina, nolact:cfg.restricoes.lactose, nogluten:cfg.restricoes.gluten};
  const semana = cdpSemana(motor);
  const cur = semana[cdpDia] || semana[0];
  const rK = cur.tot.kcal/cur.target.kcal, rP = cur.tot.P/cur.target.P;
  const kOk = Math.abs(rK-1) <= 0.07, pOk = rP >= 0.9;
  const chip = (lbl, val, meta, ok, un) => '<span class="cdp-tchip '+(ok?'ok':'warn')+'"><b>'+lbl+'</b> '+num(val,0)+un+(meta!=null ? ' <i>/ meta '+num(meta,0)+'</i>' : '')+'</span>';
  const chipsHtml = chip("kcal", cur.tot.kcal, cur.target.kcal, kOk, "")+chip("Prot.", cur.tot.P, cur.target.P, pOk, " g")+chip("Carb.", cur.tot.C, null, true, " g")+chip("Gord.", cur.tot.F, null, true, " g");
  const media = semana.reduce((a,d)=>({k:a.k+d.tot.kcal/7, P:a.P+d.tot.P/7}), {k:0, P:0});
  const diasBaixos = semana.filter(d=> d.tot.P/d.target.P < 0.9).length;

  const grupo = (id, itens, rot, atual) => '<div class="cdp-chips" role="group" aria-label="'+id+'">'+itens.map(e=>
    '<button type="button" class="cdp-chip'+(atual===e[0]?' on':'')+'" data-cdp="'+rot+'" data-v="'+e[0]+'" aria-pressed="'+(atual===e[0])+'">'+e[1]+'</button>').join("")+'</div>';
  const dias = semana.map((d,i)=> '<button type="button" class="cdp-day'+(i===cdpDia?' on':'')+'" data-cdp="dia" data-v="'+i+'" aria-pressed="'+(i===cdpDia)+'" aria-label="'+d.label+(d.train?', dia de treino':', dia de descanso')+'">'+d.label+'<small>'+(d.train?'treino':'descanso')+'</small></button>').join("");

  const dicas = {fora:"No por quilo, comece pelas saladas e legumes, escolha uma proteína grelhada e complete com arroz e feijão.", marmita:"Este almoço e jantar se repetem nos dias do mesmo lote (cozinhe no domingo e na quinta)."};
  const refeicoes = cur.meals.map(ml=>{
    const rows = ml.items.map(it=>{
      const f = CDPE.FOODS[it.id];
      return '<div class="cdp-it"><span class="cdp-n">'+cdpNome(f)+'</span><span class="cdp-q"><b>'+escapeHtml(cdpQtd(it.id, it.g))+'</b></span></div>';
    }).join("");
    const dica = (ml.slot === "almoco" && dicas[cfg.rotina]) ? '<div class="cdp-tip">'+escapeHtml(dicas[cfg.rotina])+'</div>' : "";
    return '<section class="cdp-meal"><header class="cdp-mh"><h3>'+escapeHtml(ml.name)+'</h3><span class="cdp-mt">'+num(ml.m.kcal,0)+' kcal · '+num(ml.m.P,0)+' g prot.</span></header>'+rows+dica+'</section>';
  }).join("");

  const compra = CDPE.shopping(semana);
  const compraHtml = CDP_GRUPOS.map(gd=>{
    const its = compra.filter(s=> gd[1].indexOf(CDPE.FOODS[s.id].role) >= 0).sort((a,b)=> b.g-a.g);
    if(!its.length) return "";
    return '<h4 class="cdp-gh">'+gd[0]+'</h4>'+its.map(s=> '<div class="cdp-it"><span class="cdp-n">'+cdpNome(CDPE.FOODS[s.id])+'</span><span class="cdp-q"><b>'+escapeHtml(cdpQtd(s.id, s.g, true))+'</b></span></div>').join("");
  }).join("");
  const temRotulo = compra.some(s=> /\*$/.test(CDPE.FOODS[s.id].n));

  // avisos (texto sempre orientado ao que fazer, sem culpar a pessoa nem o app)
  const avisos = [];
  if(!kOk) avisos.push("Neste dia as calorias ficaram em "+Math.round(rK*100)+"% da meta: as porções seguem um teto realista (ex.: até 250 g de arroz por refeição). Se quiser chegar mais perto, divida em mais refeições ou some um lanche.");
  if(diasBaixos > 0) avisos.push("Nesta combinação, a proteína fica abaixo de 90% da meta em "+diasBaixos+" dia(s) da semana. Para chegar mais perto: troque a rotina (ex.: Marmita da semana), inclua uma fonte concentrada ("+(cfg.jeito==="vegan" ? "tofu, soja texturizada ou proteína vegetal em pó" : cfg.jeito==="veg" ? "ovos, iogurte ou whey, se fizerem parte da sua dieta" : "ovos, iogurte ou whey")+") ou converse com um(a) nutricionista.");
  const notaJeito = cfg.jeito==="vegan" ? "No vegano, atenção a proteína, ferro, cálcio, vitamina B12 e vitamina D: o cardápio cuida da proteína; o resto pede acompanhamento profissional." :
                    cfg.jeito==="lowc" ? "Low carb moderado: carboidrato reduzido, sem chegar à cetose; cerca de 40% das calorias vêm de gordura." : "";
  const menor = menorDeIdade(p.idade);
  const subt = CDP_OBJ_TXT[objetivoAtual]+' · '+num(kcalAlvo,0)+' kcal/dia (média da semana) · '+num(macros.proteina.g,0)+' g de proteína';
  const restr = cfg.restricoes;

  el.innerHTML =
    '<p class="cdp-sub">'+escapeHtml(subt)+'. O objetivo segue o que você escolheu acima.</p>'+
    '<div class="cdp-controls">'+
      '<div class="cdp-field"><span class="cdp-lbl">Jeito de comer</span>'+grupo("Jeito de comer", CDP_JEITOS, "jeito", cfg.jeito)+'</div>'+
      '<div class="cdp-field"><span class="cdp-lbl">Rotina</span>'+grupo("Rotina", CDP_ROTINAS, "rotina", cfg.rotina)+'<span class="cdp-note">'+escapeHtml(CDP_ROT_DESC[cfg.rotina])+'</span></div>'+
      '<div class="cdp-field"><span class="cdp-lbl">Restrições</span><div class="cdp-chips" role="group" aria-label="Restrições">'+
        [["lactose","Sem lactose"],["gluten","Sem glúten"]].map(e=>'<button type="button" class="cdp-chip'+(restr[e[0]]?' on':'')+'" data-cdp="restr" data-v="'+e[0]+'" aria-pressed="'+!!restr[e[0]]+'">'+e[1]+'</button>').join("")+'</div></div>'+
    '</div>'+
    '<div class="cdp-days" role="group" aria-label="Dia da semana">'+dias+'</div>'+
    '<div class="cdp-total" aria-label="Total do dia">'+chipsHtml+'</div>'+
    avisos.map(a=>'<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join("")+
    '<div class="cdp-meals">'+refeicoes+'</div>'+
    '<details class="cdp-shop"><summary>Lista de compras da semana</summary>'+compraHtml+(temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "")+'<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.</div></details>'+
    '<div class="cdp-note">Média da semana: '+num(media.k,0)+' kcal e '+num(media.P,0)+' g de proteína por dia. Dias de treino levam ~6% mais calorias e os de descanso ~15% menos, então a média fecha a meta. A proteína fica em 0,25 g/kg (20–40 g) por refeição, como sugere a ISSN.</div>'+
    (notaJeito ? '<div class="cdp-note">'+escapeHtml(notaJeito)+'</div>' : "")+
    (menor ? '<div class="cdp-note">Para menores de 18 anos o cardápio nunca usa déficit calórico e o ganho de massa é moderado.</div>' : "")+
    '<div class="cdp-note">Exemplo calculado a partir da sua meta, com porções de alimento já preparado e medidas caseiras aproximadas (≈). Não substitui orientação de nutricionista, sobretudo com condições de saúde.</div>';
}
(function setupCardapio(){
  const el = document.getElementById("cardapio-body");
  if(!el) return;
  el.addEventListener("click", (ev)=>{
    const b = ev.target.closest("[data-cdp]");
    if(!b) return;
    const act = b.dataset.cdp, cfg = cdpCfg();
    if(act === "dia"){
      cdpDia = Number(b.dataset.v) || 0;
      if(cdpUltimo) renderCardapio(cdpUltimo.k, cdpUltimo.m);
    } else {
      if(act === "jeito") cfg.jeito = b.dataset.v;
      else if(act === "rotina") cfg.rotina = b.dataset.v;
      else if(act === "restr") cfg.restricoes[b.dataset.v] = !cfg.restricoes[b.dataset.v];
      cdpSalvar(cfg);
      renderDieta();
    }
    playSound("tick");
    const f = el.querySelector('[data-cdp="'+act+'"][data-v="'+b.dataset.v+'"]'); if(f) f.focus();
  });
})();
