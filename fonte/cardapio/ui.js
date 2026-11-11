/* Tela do cardápio da semana (aba Dieta). Módulo ES com FRONTEIRA EXPLÍCITA: nada é lido de variáveis globais do app;
   tudo que a tela precisa chega por `ctx` em criaCardapio(ctx). Usa o motor (engine.js) e a meta que o app já calcula (kcalAlvo + macros).
   Escolhas salvas em settings.cardapio = {jeito, rotina, restricoes:{lactose, gluten}} (entra no backup junto com as configurações).

   ATUALIZAÇÃO POR NÓ (UX-03): o card é montado UMA vez (esqueleto fixo: botões de jeito/rotina/restrição, 7 dias e regiões).
   Depois, cada clique só liga/desliga o estado dos botões (classe "on" + aria-pressed) e troca o conteúdo das regiões cujo HTML mudou.
   O botão clicado nunca é recriado: o foco, a posição de rolagem e a lista de compras aberta se mantêm sem remendo.
   A função pura montaVisao() calcula o texto de cada região e é testável em Node, sem DOM.

   ctx = {
     estado():            devolve {settings, perfil}                        (leitura do estado do app)
     objetivo():          "deficit" | "manutencao" | "superavit"            (objetivo atual da aba Dieta)
     salvaSettings(next): guarda o objeto settings inteiro (o app grava)    (única escrita)
     redesenhaDieta():    pede ao app para redesenhar a aba Dieta
     tocaSom(nome), num(v, casas), escapeHtml(s), menorDeIdade(idade)       (utilitários do app)
   } */
import * as CDPE from "./engine.js";
const CDP_JEITOS = [["omni","Onívoro"],["veg","Vegetariano"],["vegan","Vegano"],["lowc","Low carb"]];
const CDP_ROTINAS = [["marmita","Marmita da semana"],["corrido","Dia corrido"],["budget","Orçamento enxuto"],["fora","Almoço fora"]];
const CDP_RESTR = [["lactose","Sem lactose"],["gluten","Sem glúten"]];
const CDP_ROT_DESC = {
  marmita:"5 refeições; cozinhe no domingo e na quinta e use em lotes.",
  corrido:"4 refeições de preparo rápido, para dias apertados.",
  budget:"5 refeições só com alimentos de custo menor.",
  fora:"4 refeições; no almoço, dica de como montar o prato por quilo."
};
const CDP_OBJ_TXT = {deficit:"Emagrecimento", manutencao:"Manutenção", superavit:"Hipertrofia"};
const CDP_GRUPOS = [["Proteínas",["prot"]],["Carboidratos e leguminosas",["carb","leg"]],["Frutas e vegetais",["fruit","veg"]],["Gorduras",["fat"]]];
const CDP_SEM_META = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';

/* Escolhas da pessoa -> configuração válida (aceita o formato antigo, com "vegetariano" em restricoes). */
export function normalizaCfg(settings){
  const c = (settings && settings.cardapio) || {};
  const r = c.restricoes || {};
  return {
    jeito: CDPE.STYLE[c.jeito] ? c.jeito : (r.vegetariano ? "veg" : "omni"),   // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: CDPE.ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: {lactose:!!r.lactose, gluten:!!r.gluten},
  };
}

/* Visão pura: dado a meta, as escolhas e o dia, devolve o texto de cada região e quais botões estão ligados.
   e = {kcalAlvo, macros, cfg, perfil, objetivo, dia}; h = {num, escapeHtml, menorDeIdade}. Sem DOM, sem estado. */
export function montaVisao(e, h){
  const {num, escapeHtml, menorDeIdade} = h;
  const {kcalAlvo, macros, cfg, objetivo} = e, p = e.perfil || {};
  const cdpQtd = (id, g, compras)=>{
    const f = CDPE.FOODS[id], un = f.liq ? "ml" : "g";
    let q = g >= 1000 ? num(g/1000,1)+(f.liq ? " L" : " kg") : num(g,0)+" "+un;
    if(f.unit && !(compras && id === "azeite")){ const n = Math.max(1, Math.round(g/f.unit[0])); q = n+" "+(n>1 ? f.unit[2] : f.unit[1])+" (≈ "+q+")"; }
    return q;
  };
  const cdpNome = (f)=>{
    const rot = /\*$/.test(f.n);
    return escapeHtml(rot ? f.n.replace(/\*$/,"") : f.n)+(rot ? '<sup title="valor típico de rótulo — confira o seu">*</sup>' : "");
  };
  const motor = {kg:macros.proteina.g/macros.proteina.gkg, age:Number(p.idade)||30, kcalMeta:kcalAlvo, protG:macros.proteina.g,
                 style:cfg.jeito, rout:cfg.rotina, nolact:cfg.restricoes.lactose, nogluten:cfg.restricoes.gluten};
  const semana = [];
  for(let d = 0; d < 7; d++) semana.push(CDPE.buildDay(d, motor));
  const dia = (e.dia >= 0 && e.dia < 7) ? e.dia : 0;
  const cur = semana[dia];
  const rK = cur.tot.kcal/cur.target.kcal, rP = cur.tot.P/cur.target.P;
  const kOk = Math.abs(rK-1) <= 0.07, pOk = rP >= 0.9;
  const chip = (lbl, val, meta, ok, un) => '<span class="cdp-tchip '+(ok?'ok':'warn')+'"><b>'+lbl+'</b> '+num(val,0)+un+(meta!=null ? ' <i>/ meta '+num(meta,0)+'</i>' : '')+'</span>';
  const total = chip("kcal", cur.tot.kcal, cur.target.kcal, kOk, "")+chip("Prot.", cur.tot.P, cur.target.P, pOk, " g")+chip("Carb.", cur.tot.C, null, true, " g")+chip("Gord.", cur.tot.F, null, true, " g");
  const media = semana.reduce((a,d)=>({k:a.k+d.tot.kcal/7, P:a.P+d.tot.P/7}), {k:0, P:0});
  const diasBaixos = semana.filter(d=> d.tot.P/d.target.P < 0.9).length;

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
  const subt = CDP_OBJ_TXT[objetivo]+' · '+num(kcalAlvo,0)+' kcal/dia (média da semana) · '+num(macros.proteina.g,0)+' g de proteína';

  return {
    sub: escapeHtml(subt)+'. O objetivo segue o que você escolheu acima.',
    rotdesc: escapeHtml(CDP_ROT_DESC[cfg.rotina]),
    total: total,
    avisos: avisos.map(a=>'<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join(""),
    refeicoes: refeicoes,
    compras: compraHtml+(temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "")+'<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.</div>',
    rodape:
      '<div class="cdp-note">Média da semana: '+num(media.k,0)+' kcal e '+num(media.P,0)+' g de proteína por dia. Dias de treino levam ~6% mais calorias e os de descanso ~15% menos, então a média fecha a meta. A proteína fica em 0,25 g/kg (20–40 g) por refeição, como sugere a ISSN.</div>'+
      (notaJeito ? '<div class="cdp-note">'+escapeHtml(notaJeito)+'</div>' : "")+
      (menor ? '<div class="cdp-note">Para menores de 18 anos o cardápio nunca usa déficit calórico e o ganho de massa é moderado.</div>' : "")+
      '<div class="cdp-note">Exemplo calculado a partir da sua meta, com porções de alimento já preparado e medidas caseiras aproximadas (≈). Não substitui orientação de nutricionista, sobretudo com condições de saúde.</div>',
    ligados: {jeito: cfg.jeito, rotina: cfg.rotina, dia: String(dia), lactose: !!cfg.restricoes.lactose, gluten: !!cfg.restricoes.gluten},
  };
}

export function criaCardapio(ctx){
  for(const k of ["estado","objetivo","salvaSettings","redesenhaDieta","tocaSom","num","escapeHtml","menorDeIdade"]){
    if(typeof ctx[k] !== "function") throw new Error("cardapio: ctx."+k+" ausente (função esperada)");
  }
  const h = { num: ctx.num, escapeHtml: ctx.escapeHtml, menorDeIdade: ctx.menorDeIdade };
  let cdpDia = 0;          // dia da semana selecionado (só em memória)
  let cdpUltimo = null;    // última meta usada, para trocar de dia sem refazer a aba inteira
  let montado = false;     // o esqueleto do card já existe?
  const ultimo = {};       // último HTML aplicado em cada região (só troca o nó quando mudou)

  function cdpSalvar(cfg){
    ctx.salvaSettings(Object.assign({}, ctx.estado().settings, {cardapio:{jeito:cfg.jeito, rotina:cfg.rotina, restricoes:{lactose:cfg.restricoes.lactose, gluten:cfg.restricoes.gluten}}}));
  }
  const regiao = (el, nome)=> el.querySelector('[data-r="'+nome+'"]');
  const botao = (el, rot, v)=> el.querySelector('[data-cdp="'+rot+'"][data-v="'+v+'"]');
  const grupo = (rotulo, itens, rot)=> '<div class="cdp-chips" role="group" aria-label="'+rotulo+'">'+itens.map(i=>
    '<button type="button" class="cdp-chip" data-cdp="'+rot+'" data-v="'+i[0]+'" aria-pressed="false">'+i[1]+'</button>').join("")+'</div>';

  /* Esqueleto: montado uma única vez enquanto houver meta. Dias e rótulos são fixos (CDPE.DAYS/TRAIN). */
  function monta(el){
    const dias = CDPE.DAYS.map((nome,i)=> '<button type="button" class="cdp-day" data-cdp="dia" data-v="'+i+'" aria-pressed="false" aria-label="'+nome+(CDPE.TRAIN[i]?', dia de treino':', dia de descanso')+'">'+nome+'<small>'+(CDPE.TRAIN[i]?'treino':'descanso')+'</small></button>').join("");
    el.innerHTML =
      '<p class="cdp-sub" data-r="sub"></p>'+
      '<div class="cdp-controls">'+
        '<div class="cdp-field"><span class="cdp-lbl">Jeito de comer</span>'+grupo("Jeito de comer", CDP_JEITOS, "jeito")+'</div>'+
        '<div class="cdp-field"><span class="cdp-lbl">Rotina</span>'+grupo("Rotina", CDP_ROTINAS, "rotina")+'<span class="cdp-note" data-r="rotdesc"></span></div>'+
        '<div class="cdp-field"><span class="cdp-lbl">Restrições</span>'+grupo("Restrições", CDP_RESTR, "restr")+'</div>'+
      '</div>'+
      '<div class="cdp-days" role="group" aria-label="Dia da semana">'+dias+'</div>'+
      '<div class="cdp-total" aria-label="Total do dia" data-r="total"></div>'+
      '<div data-r="avisos"></div>'+
      '<div class="cdp-meals" data-r="refeicoes"></div>'+
      '<details class="cdp-shop"><summary>Lista de compras da semana</summary><div data-r="compras"></div></details>'+
      '<div data-r="rodape"></div>';
    for(const k in ultimo) delete ultimo[k];
    montado = true;
  }
  function troca(el, nome, html){
    if(ultimo[nome] === html) return;          // nada mudou nesta região: o nó fica como está
    const no = regiao(el, nome); if(!no) return;
    no.innerHTML = html; ultimo[nome] = html;
  }
  function liga(el, rot, v, ligado){
    const b = botao(el, rot, v); if(!b) return;
    if(b.classList.contains("on") !== ligado) b.classList.toggle("on", ligado);
    const val = String(ligado);
    if(b.getAttribute("aria-pressed") !== val) b.setAttribute("aria-pressed", val);
  }

  function renderCardapio(kcalAlvo, macros){
    const el = document.getElementById("cardapio-body");
    if(!el) return;
    if(!kcalAlvo || !macros){
      cdpUltimo = null; montado = false;
      el.innerHTML = CDP_SEM_META;
      return;
    }
    cdpUltimo = {k:kcalAlvo, m:macros};
    if(!montado) monta(el);
    const cfg = normalizaCfg(ctx.estado().settings);
    const v = montaVisao({kcalAlvo, macros, cfg, perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia}, h);
    troca(el, "sub", v.sub);
    troca(el, "rotdesc", v.rotdesc);
    troca(el, "total", v.total);
    troca(el, "avisos", v.avisos);
    troca(el, "refeicoes", v.refeicoes);
    troca(el, "compras", v.compras);
    troca(el, "rodape", v.rodape);
    CDP_JEITOS.forEach(i=> liga(el, "jeito", i[0], v.ligados.jeito === i[0]));
    CDP_ROTINAS.forEach(i=> liga(el, "rotina", i[0], v.ligados.rotina === i[0]));
    CDP_RESTR.forEach(i=> liga(el, "restr", i[0], v.ligados[i[0]]));
    for(let d = 0; d < 7; d++) liga(el, "dia", String(d), v.ligados.dia === String(d));
  }

  function setupCardapio(){
    const el = document.getElementById("cardapio-body");
    if(!el) return;
    el.addEventListener("click", (ev)=>{
      const b = ev.target.closest("[data-cdp]");
      if(!b) return;
      const act = b.dataset.cdp, cfg = normalizaCfg(ctx.estado().settings);
      // Rede de segurança (herdada): como os nós agora são preservados, estes remendos não deveriam ter efeito.
      // Ficam até a validação em Safari/iOS real (Safari não ancora a rolagem); depois serão removidos.
      const yAntes = window.scrollY;
      el.style.minHeight = el.offsetHeight+"px";
      const soltaAltura = ()=>{ el.style.minHeight = ""; ["wheel","touchmove","keydown"].forEach(ev=> removeEventListener(ev, soltaAltura, true)); };
      ["wheel","touchmove","keydown"].forEach(ev=> addEventListener(ev, soltaAltura, {passive:true, capture:true, once:true}));
      if(act === "dia"){
        cdpDia = Number(b.dataset.v) || 0;
        if(cdpUltimo) renderCardapio(cdpUltimo.k, cdpUltimo.m);
      } else {
        if(act === "jeito") cfg.jeito = b.dataset.v;
        else if(act === "rotina") cfg.rotina = b.dataset.v;
        else if(act === "restr") cfg.restricoes[b.dataset.v] = !cfg.restricoes[b.dataset.v];
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
      }
      ctx.tocaSom("tick");
      requestAnimationFrame(()=>{ if(Math.abs(window.scrollY - yAntes) > 2) window.scrollTo(0, yAntes); });
    });
  }
  setupCardapio();
  return { render: renderCardapio };
}
