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
     abreModal(el), fechaModal():  abrem/fecham o pop-up do app (foco preso, Esc, app inerte) — usados só pelo pop-up de troca de alimentos
   }
   TROCAS: settings.cardapio.trocas = [{d: -1|0..6, s: refeição, de: alimento, para: alimento}] (ver engine.js). O pop-up "Trocar alimentos"
   (botão ao lado dos filtros) escolhe refeição, alimento e alternativa; o card principal não ganha nenhum controle por alimento. */
import * as CDPE from "./engine.js";
const CDP_JEITOS = [["omni","Onívoro"],["pesc","Pescetariano"],["veg","Vegetariano"],["vegan","Vegano"],["lowc","Low carb"]];
const CDP_ROTINAS = [["tradicional","Dia tradicional"],["marmita","Marmita da semana"],["corrido","Dia corrido"],["budget","Orçamento enxuto"],["fora","Almoço fora"]];
const CDP_RESTR = [["lactose","Sem lactose"],["gluten","Sem glúten"],["ovo","Sem ovo"],["soja","Sem soja"],["peixe","Sem peixe"],["castanhas","Sem amendoim e castanhas"],["porco","Sem carne de porco"],["vermelha","Sem carne vermelha"]];
/* chave da tela -> chave do motor (engine.js) */
const CDP_RESTR_MOTOR = {lactose:"nolact", gluten:"nogluten", ovo:"noegg", soja:"nosoy", peixe:"nofish", castanhas:"nonut", porco:"nopork", vermelha:"nored"};
const CDP_NREF = [3,4,5,6];
const CDP_ROT_DESC = {
  tradicional: n=> n+" refeições do dia a dia, com arroz e feijão no almoço e no jantar; cada dia tem o seu cardápio, sem lotes.",
  marmita: n=> n+" refeições fixas; cozinhe no domingo e na quinta e use em lotes.",
  corrido: n=> n+" refeições de preparo rápido, para dias apertados.",
  budget: n=> n+" refeições só com alimentos de custo menor.",
  fora: n=> n+" refeições; no almoço, dica de como montar o prato por quilo."
};
const CDP_OBJ_TXT = {deficit:"Emagrecimento", manutencao:"Manutenção", superavit:"Hipertrofia"};
/* ícones de cada refeição (só visual; aria-hidden) */
const CDP_ICO = {
  cafe:   '<path d="M5 8h11v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 3v2M12 3v2"/>',
  almoco: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/>',
  lanche: '<path d="M12 8c-3-2-7 0-7 5 0 4 3 7 5 7 1 0 1.5-.5 2-.5s1 .5 2 .5c2 0 5-3 5-7 0-5-4-7-7-5z"/><path d="M12 8c0-2 1-4 3-5"/>',
  jantar: '<path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M16 3c-2 2-2.5 5-2.5 8h2.5v10"/>',
  ceia:   '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  manha:  '<circle cx="12" cy="14" r="4"/><path d="M12 5v2.5M5 9l1.8 1.8M19 9l-1.8 1.8M3 19h18"/>'
};
const CDP_RELOGIO = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const cdpIcone = slot => '<span class="cdp-ic" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">'+(CDP_ICO[slot] || CDP_ICO.almoco)+'</svg></span>';
const CDP_GRUPOS = [["Proteínas",["prot"]],["Carboidratos e leguminosas",["carb","leg"]],["Frutas e vegetais",["fruit","veg"]],["Gorduras",["fat"]]];
const CDP_SEM_META = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';

/* Escolhas da pessoa -> configuração válida (aceita o formato antigo, com "vegetariano" em restricoes). */
export function normalizaCfg(settings){
  const c = (settings && settings.cardapio) || {};
  const r = c.restricoes || {};
  return {
    jeito: CDPE.STYLE[c.jeito] ? c.jeito : (r.vegetariano ? "veg" : "omni"),   // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: CDPE.ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: Object.fromEntries(CDP_RESTR.map(i=> [i[0], !!r[i[0]]])),
    nref: CDP_NREF.indexOf(Number(c.nref)) >= 0 ? Number(c.nref) : null,   // null = padrão da rotina
    trocas: CDPE.normalizaTrocas(c.trocas),
  };
}

/* Configuração do motor a partir da meta do app e das escolhas da pessoa. */
function motorDe(e){
  const {kcalAlvo, macros, cfg} = e, p = e.perfil || {};
  return {kg:macros.proteina.g/macros.proteina.gkg, age:Number(p.idade)||30, kcalMeta:kcalAlvo, protG:macros.proteina.g,
          style:cfg.jeito, rout:cfg.rotina, nref:cfg.nref, trocas:cfg.trocas || [],
          ...Object.fromEntries(CDP_RESTR.map(i=> [CDP_RESTR_MOTOR[i[0]], !!(cfg.restricoes && cfg.restricoes[i[0]])]))};
}
const nomeLimpo = (f)=> f.n.replace(/\*$/,"");
const rotuloTroca = (n)=> n+" troca"+(n>1 ? "s" : "")+" feita"+(n>1 ? "s" : "");

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
  const motor = motorDe(e);
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
    const pct = cur.tot.kcal ? Math.round(ml.m.kcal/cur.tot.kcal*100) : 0;
    const hr = CDPE.horarioDe(ml.slot, motor);
    const hrHtml = hr ? '<span class="cdp-hr" title="Horário sugerido">'+CDP_RELOGIO+'<span class="sr-only">Horário sugerido: </span><time>'+hr+'</time></span>' : "";
    return '<section class="cdp-meal" data-slot="'+ml.slot+'"><header class="cdp-mh"><h3>'+cdpIcone(ml.slot)+'<span>'+escapeHtml(ml.name)+'</span>'+hrHtml+'</h3><span class="cdp-mt">'+num(ml.m.kcal,0)+' kcal · '+num(ml.m.P,0)+' g prot.</span></header>'+
      '<div class="cdp-share"><div class="cdp-share-bar" aria-hidden="true"><i style="width:'+pct+'%"></i></div><span class="cdp-share-txt">'+pct+'% das calorias do dia</span></div>'+rows+dica+'</section>';
  }).join("");

  const compra = CDPE.shopping(semana);
  const compraHtml = CDP_GRUPOS.map(gd=>{
    const its = compra.filter(s=> gd[1].indexOf(CDPE.FOODS[s.id].role) >= 0).sort((a,b)=> b.g-a.g);
    if(!its.length) return "";
    return '<h4 class="cdp-gh">'+gd[0]+'</h4>'+its.map(s=> '<div class="cdp-it"><span class="cdp-n">'+cdpNome(CDPE.FOODS[s.id])+'</span><span class="cdp-q"><b>'+escapeHtml(cdpQtd(s.id, s.g, true))+'</b></span></div>').join("");
  }).join("");
  const temRotulo = compra.some(s=> /\*$/.test(CDPE.FOODS[s.id].n));

  // avisos (texto sempre orientado ao que fazer, sem culpar a pessoa nem o app)
  const avisos = CDPE.validaRestricoes(motor).avisos.slice();
  if(!kOk) avisos.push("Neste dia as calorias ficaram em "+Math.round(rK*100)+"% da meta: as porções seguem um teto realista (ex.: até 250 g de arroz por refeição). Se quiser chegar mais perto, divida em mais refeições ou some um lanche.");
  if(diasBaixos > 0) avisos.push("Nesta combinação, a proteína fica abaixo de 90% da meta em "+diasBaixos+" dia(s) da semana. Para chegar mais perto: troque a rotina (ex.: Marmita da semana), inclua uma fonte concentrada ("+(cfg.jeito==="vegan" ? "tofu, soja texturizada ou proteína vegetal em pó" : cfg.jeito==="veg" ? "ovos, iogurte ou whey, se fizerem parte da sua dieta" : "ovos, iogurte ou whey")+") ou converse com um(a) nutricionista.");
  const notaJeito = cfg.jeito==="vegan" ? "No vegano, atenção a proteína, ferro, cálcio, vitamina B12 e vitamina D: o cardápio cuida da proteína; o resto pede acompanhamento profissional." :
                    cfg.jeito==="lowc" ? "Low carb moderado: carboidrato reduzido, sem chegar à cetose; cerca de 40% das calorias vêm de gordura." : "";
  const nTrocas = (cfg.trocas || []).length;
  const ignoradas = (cfg.trocas || []).filter(t=> !CDPE.podeTrocar(t.de, t.para, t.s, motor)).length;
  const menor = menorDeIdade(p.idade);
  const subt = CDP_OBJ_TXT[objetivo]+' · '+num(kcalAlvo,0)+' kcal/dia (média da semana) · '+num(macros.proteina.g,0)+' g de proteína';

  return {
    sub: escapeHtml(subt)+'. O objetivo segue o que você escolheu acima.',
    rotdesc: escapeHtml(CDP_ROT_DESC[cfg.rotina](CDPE.nRefeicoes(motor))),
    nrefinfo: escapeHtml(cfg.rotina === "marmita" ? "Na Marmita da semana são sempre 5 refeições (os lotes dependem disso). Escolha outra rotina para mudar." : "Escolha de 3 a 6. Com menos refeições, cada uma fica maior e pode bater no teto de porção."),
    trocasinfo: escapeHtml(nTrocas ? rotuloTroca(nTrocas)+"." : "Troque qualquer alimento por uma alternativa recomendada.")+
                (ignoradas ? " "+escapeHtml(ignoradas+(ignoradas > 1 ? " trocas guardadas não combinam" : " troca guardada não combina")+" com os filtros de agora e não "+(ignoradas > 1 ? "aparecem" : "aparece")+".") : ""),
    total: total,
    avisos: avisos.map(a=>'<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join(""),
    refeicoes: refeicoes,
    compras: compraHtml+(temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "")+'<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.</div>',
    rodape:
      '<div class="cdp-note">Média da semana: '+num(media.k,0)+' kcal e '+num(media.P,0)+' g de proteína por dia. Dias de treino levam ~6% mais calorias e os de descanso ~15% menos, então a média fecha a meta. A proteína fica em 0,25 g/kg (20–40 g) por refeição, como sugere a ISSN.</div>'+
      '<div class="cdp-note">Horários sugeridos como ponto de partida: 3 a 4 horas entre as refeições e o jantar com folga antes de dormir. Ajuste ao seu dia de trabalho e de treino.</div>'+
      (notaJeito ? '<div class="cdp-note">'+escapeHtml(notaJeito)+'</div>' : "")+
      (menor ? '<div class="cdp-note">Para menores de 18 anos o cardápio nunca usa déficit calórico e o ganho de massa é moderado.</div>' : "")+
      '<div class="cdp-note">Exemplo calculado a partir da sua meta, com porções de alimento já preparado e medidas caseiras aproximadas (≈). Não substitui orientação de nutricionista, sobretudo com condições de saúde.</div>',
    ligados: Object.assign({jeito: cfg.jeito, rotina: cfg.rotina, dia: String(dia), nref: String(CDPE.nRefeicoes(motor)), nrefFixo: cfg.rotina === "marmita"},
      Object.fromEntries(CDP_RESTR.map(i=> [i[0], !!cfg.restricoes[i[0]]]))),
  };
}


/* Pop-up "Trocar alimentos" (função pura, sem DOM): dado o estado e a seleção, devolve o HTML do conteúdo.
   sel = {slot, itemId, escopo: "dia" | "todos"}; devolve também a seleção já corrigida (refeição/alimento válidos). */
export function montaPopup(e, h, sel){
  const {num, escapeHtml} = h;
  const {cfg} = e;
  const motor = motorDe(e);
  const dia = (e.dia >= 0 && e.dia < 7) ? e.dia : 0;
  const cur = CDPE.buildDay(dia, motor);
  const escopo = sel && sel.escopo === "todos" ? "todos" : "dia";
  const refeicao = cur.meals.find(m=> sel && m.slot === sel.slot) || cur.meals[0];
  const item = refeicao.items.find(i=> sel && i.id === sel.itemId) || refeicao.items[0];
  const sinal = (v, un)=>{ const r = Math.round(v); return (r === 0 ? "±" : r > 0 ? "+" : "−")+num(Math.abs(r), 0)+" "+un; };
  const nomeHtml = (id)=>{ const f = CDPE.FOODS[id]; const rot = /\*$/.test(f.n); return escapeHtml(nomeLimpo(f))+(rot ? "*" : ""); };
  const qtd = (id, g)=>{ const f = CDPE.FOODS[id], un = f.liq ? "ml" : "g"; let q = num(g,0)+" "+un; if(f.unit){ const n = Math.max(1, Math.round(g/f.unit[0])); q = n+" "+(n>1 ? f.unit[2] : f.unit[1])+" (≈ "+q+")"; } return q; };
  const kOk = Math.abs(cur.tot.kcal/cur.target.kcal-1) <= 0.07, pOk = cur.tot.P/cur.target.P >= 0.9;

  const chipsRef = cur.meals.map(m=>{
    const n = m.items.filter(i=> i.troca).length;
    return '<button type="button" class="cdp-chip'+(m.slot === refeicao.slot ? ' on' : '')+'" data-pop="refeicao" data-v="'+m.slot+'" aria-pressed="'+(m.slot === refeicao.slot)+'">'+escapeHtml(m.name)+(n ? ' <small>('+n+')</small>' : '')+'</button>';
  }).join("");
  const itens = refeicao.items.map(i=>
    '<button type="button" class="cdp-pop-it'+(i.id === item.id ? ' on' : '')+'" data-pop="alimento" data-v="'+i.id+'" aria-pressed="'+(i.id === item.id)+'">'+
      '<span class="cdp-n">'+nomeHtml(i.id)+(i.troca ? ' <small class="cdp-tag">trocado</small>' : '')+'</span><span class="cdp-q"><b>'+escapeHtml(qtd(i.id, i.g))+'</b></span></button>').join("");

  // alternativas da mesma categoria, com o efeito de cada uma no dia
  const noPrato = refeicao.items.map(i=> i.id);
  const ids = CDPE.alternativasIds(item.role, refeicao.slot, motor).filter(id=> id === item.id || noPrato.indexOf(id) < 0);
  if(ids.indexOf(item.id) < 0) ids.unshift(item.id);
  const alts = ids.map(id=>{
    if(id === item.id) return {id, atual:true, g:item.g};
    const tr = CDPE.registraTroca(motor.trocas, dia, refeicao.slot, item.id, id, escopo);
    const d2 = CDPE.buildDay(dia, Object.assign({}, motor, {trocas:tr}));
    const m2 = d2.meals.find(m=> m.slot === refeicao.slot);
    const it2 = m2 && m2.items.find(x=> x.id === id);
    if(!it2) return null;
    const f = CDPE.FOODS[id], avisos = [];
    if(cfg.rotina === "budget" && !f.cheap) avisos.push("fora do orçamento enxuto");
    if(cfg.rotina === "corrido" && !f.fast) avisos.push("preparo mais longo");
    if(d2.tot.P/d2.target.P < 0.9) avisos.push("proteína do dia: "+num(d2.tot.P/d2.target.P*100,0)+"% da meta");
    return {id, g:it2.g, dk:d2.tot.kcal-cur.tot.kcal, dp:d2.tot.P-cur.tot.P, avisos};
  }).filter(Boolean);
  const altHtml = alts.map(a=>{
    const ef = a.atual ? "no cardápio agora" : sinal(a.dk,"kcal")+" · "+sinal(a.dp,"g prot.");
    return '<button type="button" class="cdp-pop-alt'+(a.atual ? ' on' : '')+'" data-pop="para" data-v="'+a.id+'" aria-pressed="'+(!!a.atual)+'">'+
      '<span class="cdp-n">'+nomeHtml(a.id)+'</span><span class="cdp-q"><b>'+escapeHtml(qtd(a.id, a.g))+'</b><small>'+escapeHtml(ef)+'</small></span>'+
      ((a.avisos && a.avisos.length) ? '<span class="cdp-pop-av">'+escapeHtml(a.avisos.join(" · "))+'</span>' : '')+'</button>';
  }).join("");

  const sugerido = item.troca ? '<div class="cdp-note">Sugestão original: <b>'+nomeHtml(item.orig)+'</b>. <button type="button" class="btn small" data-pop="voltar">Voltar ao sugerido</button></div>' : "";
  const nTodas = motor.trocas.length;
  const total = ['kcal','Prot.'].map((l,i)=> '<span class="cdp-tchip '+((i ? pOk : kOk) ? 'ok' : 'warn')+'"><b>'+l+'</b> '+num(i ? cur.tot.P : cur.tot.kcal,0)+(i ? ' g' : '')+' <i>/ meta '+num(i ? cur.target.P : cur.target.kcal,0)+'</i></span>').join("");
  const escopoHtml = [["dia","Só em "+CDPE.DAYS[dia]],["todos","Todos os dias em que aparece"]].map(o=>
    '<button type="button" class="cdp-chip'+(escopo === o[0] ? ' on' : '')+'" data-pop="escopo" data-v="'+o[0]+'" aria-pressed="'+(escopo === o[0])+'">'+escapeHtml(o[1])+'</button>').join("");

  return {
    sel: {slot:refeicao.slot, itemId:item.id, escopo},
    html:
      '<h2>Trocar alimentos</h2>'+
      '<div class="sub">'+escapeHtml(CDPE.DAYS[dia])+' ('+(cur.train ? 'dia de treino' : 'dia de descanso')+'). Escolha a refeição, toque no alimento e depois na alternativa. A porção se ajusta para manter sua meta.</div>'+
      '<div class="cdp-total" aria-label="Total do dia">'+total+'</div>'+
      '<div class="cdp-pop-sec"><span class="cdp-lbl">1. Refeição</span><div class="cdp-chips" role="group" aria-label="Refeição">'+chipsRef+'</div></div>'+
      '<div class="cdp-pop-sec"><span class="cdp-lbl">2. Alimento que quer trocar</span><div class="cdp-pop-list" role="group" aria-label="Alimentos da refeição">'+itens+'</div>'+sugerido+'</div>'+
      '<div class="cdp-pop-sec"><span class="cdp-lbl">3. Trocar por</span><div class="cdp-pop-list" role="group" aria-label="Alternativas para '+escapeHtml(nomeLimpo(CDPE.FOODS[item.id]))+'">'+(altHtml || '<div class="cdp-note">Não há outra alternativa para este alimento com os seus filtros.</div>')+'</div></div>'+
      '<div class="cdp-pop-sec"><span class="cdp-lbl">Vale para</span><div class="cdp-chips" role="group" aria-label="Alcance da troca">'+escopoHtml+'</div></div>'+
      '<div class="cdp-note cdp-pop-msg" role="status" aria-live="polite" data-pop-msg></div>'+
      '<div class="modal-actions">'+(nTodas ? '<button type="button" class="btn" data-pop="restaurar">Restaurar todas ('+nTodas+')</button>' : '')+'<button type="button" class="btn primary" data-pop="fechar">Pronto</button></div>'
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
    ctx.salvaSettings(Object.assign({}, ctx.estado().settings, {cardapio:{jeito:cfg.jeito, rotina:cfg.rotina, nref:cfg.nref || null, restricoes:Object.assign({}, cfg.restricoes), trocas:cfg.trocas || []}}));
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
        '<div class="cdp-field"><span class="cdp-lbl">Refeições por dia</span>'+grupo("Refeições por dia", CDP_NREF.map(n=> [String(n), n+" refeições"]), "nref")+'<span class="cdp-note" data-r="nrefinfo"></span></div>'+
        '<div class="cdp-field cdp-field-restr"><span class="cdp-lbl">Restrições</span>'+grupo("Restrições", CDP_RESTR, "restr")+'</div>'+
        '<div class="cdp-edit"><button type="button" class="btn cdp-edit-btn" data-cdp="editar" aria-haspopup="dialog">Trocar alimentos</button><span class="cdp-note" data-r="trocasinfo"></span></div>'+
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
    troca(el, "nrefinfo", v.nrefinfo);
    troca(el, "trocasinfo", v.trocasinfo);
    troca(el, "total", v.total);
    troca(el, "avisos", v.avisos);
    troca(el, "refeicoes", v.refeicoes);
    troca(el, "compras", v.compras);
    troca(el, "rodape", v.rodape);
    CDP_JEITOS.forEach(i=> liga(el, "jeito", i[0], v.ligados.jeito === i[0]));
    CDP_ROTINAS.forEach(i=> liga(el, "rotina", i[0], v.ligados.rotina === i[0]));
    CDP_RESTR.forEach(i=> liga(el, "restr", i[0], v.ligados[i[0]]));
    CDP_NREF.forEach(n=>{
      liga(el, "nref", String(n), v.ligados.nref === String(n));
      const b = botao(el, "nref", String(n)); if(b && b.disabled !== v.ligados.nrefFixo) b.disabled = v.ligados.nrefFixo;
    });
    for(let d = 0; d < 7; d++) liga(el, "dia", String(d), v.ligados.dia === String(d));
  }

  /* Pop-up de troca de alimentos: o estado da seleção vive só aqui (em memória); as trocas ficam salvas em settings.cardapio.trocas. */
  function abrePopup(){
    if(typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const sel = {slot:null, itemId:null, escopo:"dia"};
    const contexto = ()=> ({kcalAlvo:cdpUltimo.k, macros:cdpUltimo.m, cfg:normalizaCfg(ctx.estado().settings), perfil:ctx.estado().perfil, objetivo:ctx.objetivo(), dia:cdpDia});
    const nome = (id)=> nomeLimpo(CDPE.FOODS[id]);
    function desenha(foco, msg){
      const r = montaPopup(contexto(), h, sel);
      Object.assign(sel, r.sel);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-pop-msg]");
      if(m && msg) m.textContent = msg;
      if(foco){ const b = corpo.querySelector('[data-pop="'+foco[0]+'"][data-v="'+foco[1]+'"]') || corpo.querySelector('[data-pop="fechar"]'); if(b) b.focus({preventScroll:true}); }
    }
    function grava(trocas){
      const cfg = normalizaCfg(ctx.estado().settings); cfg.trocas = trocas;
      cdpSalvar(cfg); ctx.redesenhaDieta();
    }
    corpo.addEventListener("click", (ev)=>{
      const b = ev.target.closest("[data-pop]"); if(!b) return;
      const act = b.dataset.pop, v = b.dataset.v, cfg = normalizaCfg(ctx.estado().settings);
      if(act === "fechar"){ ctx.fechaModal(); return; }
      ctx.tocaSom("tick");
      if(act === "refeicao"){ sel.slot = v; sel.itemId = null; desenha(["refeicao", v]); }
      else if(act === "alimento"){ sel.itemId = v; desenha(["alimento", v]); }
      else if(act === "escopo"){ sel.escopo = v; desenha(["escopo", v]); }
      else if(act === "para"){
        if(!v || v === sel.itemId) return;
        const de = sel.itemId;
        grava(CDPE.registraTroca(cfg.trocas, cdpDia, sel.slot, de, v, sel.escopo));
        sel.itemId = v;
        desenha(["para", v], "Trocado: "+nome(de)+" por "+nome(v)+".");
      }
      else if(act === "voltar"){
        const r = CDPE.desfazCadeia(cfg.trocas, cdpDia, sel.slot, sel.itemId, false);
        grava(r.trocas);
        const msg = "Voltou ao sugerido: "+nome(r.id)+(r.escopo.todos ? " (a troca valia para todos os dias)." : ".");
        sel.itemId = r.id;
        desenha(["alimento", r.id], msg);
      }
      else if(act === "restaurar"){
        grava([]); sel.itemId = null;
        desenha(["refeicao", sel.slot], "Todas as trocas foram desfeitas.");
      }
    });
    ctx.abreModal(corpo);
    desenha();
  }

  function setupCardapio(){
    const el = document.getElementById("cardapio-body");
    if(!el) return;
    el.addEventListener("click", (ev)=>{
      const b = ev.target.closest("[data-cdp]");
      if(!b) return;
      if(b.dataset.cdp === "editar"){ abrePopup(); return; }
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
        const reg = el.querySelector('[data-r="refeicoes"]');   // entrada suave das refeições do novo dia (CSS; desligada com movimento reduzido)
        if(reg && reg.classList && typeof reg.classList.remove === "function"){ reg.classList.remove("cdp-troca"); void reg.offsetWidth; reg.classList.add("cdp-troca"); setTimeout(()=> reg.classList.remove("cdp-troca"), 700); }
      } else {
        if(act === "jeito") cfg.jeito = b.dataset.v;
        else if(act === "rotina") cfg.rotina = b.dataset.v;
        else if(act === "nref"){ if(cfg.rotina === "marmita" || b.disabled) return; cfg.nref = Number(b.dataset.v) || null; }
        else if(act === "restr") cfg.restricoes[b.dataset.v] = !cfg.restricoes[b.dataset.v];
        cdpSalvar(cfg);
        ctx.redesenhaDieta();
      }
      ctx.tocaSom("tick");
      requestAnimationFrame(()=>{ if(Math.abs(window.scrollY - yAntes) > 2) (window.ngScrollRestaura || window.scrollTo.bind(window))(0, yAntes); });
    });
  }
  setupCardapio();
  return { render: renderCardapio };
}
