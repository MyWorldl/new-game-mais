/* Tela do cardápio da semana (aba Dieta). Módulo ES com FRONTEIRA EXPLÍCITA: nada é lido de variáveis globais do app;
   tudo que a tela precisa chega por `ctx` em criaCardapio(ctx). Usa o motor (engine.js) e a meta que o app já calcula (kcalAlvo + macros).
   Escolhas salvas em settings.cardapio = {configurado, jeito, rotina, nref, restricoes:{...}, trocas, meus, favoritos} (entra no backup junto com as configurações).
   `configurado` false/ausente = a pessoa ainda não respondeu o formulário: o card mostra um convite vazio e o formulário abre numa caixa flutuante.
   Quem já tinha escolhas salvas (settings.cardapio existe) conta como configurado.

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
import { montaPdf } from "./pdf.js";
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
const svg24 = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>';
const ICO_TROCA = svg24('<path d="M7 7h11l-3-3M17 17H6l3 3"/>');
const ICO_MEUS = svg24('<path d="M4 7h16l-1.6 11a2 2 0 0 1-2 1.7H7.6a2 2 0 0 1-2-1.7L4 7z"/><path d="M9 7a3 3 0 0 1 6 0"/>');
const ICO_REFAZ = svg24('<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>');
const ICO_PDF = svg24('<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 14h5M10 17.5h5"/>');
const ICO_COPIA = svg24('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>');
const ICO_SHARE = svg24('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.3 10.8 7.4-4.4M8.3 13.2l7.4 4.4"/>');
const ICO_CHEV = svg24('<path d="m6 9 6 6 6-6"/>');
const CDP_RELOGIO = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>';
const cdpIcone = slot => '<span class="cdp-ic" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">'+(CDP_ICO[slot] || CDP_ICO.almoco)+'</svg></span>';
const CDP_GRUPOS = [["Proteínas",["prot"]],["Carboidratos e leguminosas",["carb","leg"]],["Frutas e vegetais",["fruit","veg"]],["Gorduras",["fat"]]];
const CDP_SEM_META = '<div class="empty-note">Complete seu perfil e registre seu peso para ver o cardápio da sua meta.</div>';

/* Escolhas da pessoa -> configuração válida (aceita o formato antigo, com "vegetariano" em restricoes). */
export function normalizaCfg(settings){
  const c = (settings && settings.cardapio) || {};
  const r = c.restricoes || {};
  return {
    configurado: c.configurado === true || (c.configurado !== false && Object.keys(c).length > 0),
    jeito: CDPE.STYLE[c.jeito] ? c.jeito : (r.vegetariano ? "veg" : "omni"),   // quem usava o antigo "Vegetariano" mantém a escolha
    rotina: CDPE.ROUT[c.rotina] ? c.rotina : "marmita",
    restricoes: Object.fromEntries(CDP_RESTR.map(i=> [i[0], !!r[i[0]]])),
    nref: CDP_NREF.indexOf(Number(c.nref)) >= 0 ? Number(c.nref) : null,   // null = padrão da rotina
    trocas: CDPE.normalizaTrocas(c.trocas),
    meus: CDPE.normalizaMeus(c.meus),   // null = automático (todos os alimentos); lista = só os que a pessoa marcou
    favs: CDPE.normalizaFavs(c.favoritos),   // estrela em Meus alimentos: só muda a ordem em que o motor escolhe (ver engine.js, FAVORITOS)
  };
}

/* Configuração do motor a partir da meta do app e das escolhas da pessoa. */
function motorDe(e){
  const {kcalAlvo, macros, cfg} = e, p = e.perfil || {};
  return {kg:macros.proteina.g/macros.proteina.gkg, age:Number(p.idade)||30, kcalMeta:kcalAlvo, protG:macros.proteina.g,
          style:cfg.jeito, rout:cfg.rotina, nref:cfg.nref, trocas:cfg.trocas || [], meus:cfg.meus || null, favs:cfg.favs || [],
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
  const kcalDia = Math.max(1, cur.tot.kcal);
  const chip = (lbl, val, meta, ok, un, ref) => '<span class="cdp-tchip '+(ok?'ok':'warn')+'"><b>'+lbl+'</b><strong>'+num(val,0)+(un ? '<small>'+un+'</small>' : '')+'</strong><i>'+(meta!=null ? 'meta '+num(meta,0)+(un ? ' '+un : '') : (ref || ''))+'</i></span>';
  const total = chip("kcal", cur.tot.kcal, cur.target.kcal, kOk, "")+chip("Prot.", cur.tot.P, cur.target.P, pOk, "g")+chip("Carb.", cur.tot.C, null, true, "g", num(cur.tot.C*4/kcalDia*100,0)+"% das kcal")+chip("Gord.", cur.tot.F, null, true, "g", num(cur.tot.F*9/kcalDia*100,0)+"% das kcal");
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
  const feitos = new Set(e.comprados || []);
  const listaGrupos = CDP_GRUPOS.map(gd=>({
    rotulo: gd[0],
    itens: compra.filter(s=> gd[1].indexOf(CDPE.FOODS[s.id].role) >= 0).sort((a,b)=> b.g-a.g).map(s=>({
      id: s.id, nome: nomeLimpo(CDPE.FOODS[s.id])+(/\*$/.test(CDPE.FOODS[s.id].n) ? "*" : ""), html: cdpNome(CDPE.FOODS[s.id]), qtd: cdpQtd(s.id, s.g, true), feito: feitos.has(s.id)
    }))
  })).filter(g=> g.itens.length);
  const nFeitos = listaGrupos.reduce((a,g)=> a+g.itens.filter(i=> i.feito).length, 0);
  const pctFeitos = compra.length ? Math.round(nFeitos/compra.length*100) : 0;
  const CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const compraHtml = listaGrupos.map(g=>
    '<h4 class="cdp-gh"><span>'+escapeHtml(g.rotulo)+'</span><small>'+g.itens.length+'</small></h4>'+
    g.itens.map(i=> '<label class="cdp-it cdp-buy'+(i.feito ? ' feito' : '')+'"><input type="checkbox" class="cdp-buy-i" data-cdp-buy="'+i.id+'"'+(i.feito ? ' checked' : '')+'><span class="cdp-buy-box" aria-hidden="true">'+CHECK+'</span><span class="cdp-n">'+i.html+'</span><span class="cdp-q"><b>'+escapeHtml(i.qtd)+'</b></span></label>').join("")
  ).join("");
  const resumoCompra = '<div class="cdp-buy-sum"><span class="cdp-buy-txt" data-buy-txt>'+nFeitos+' de '+compra.length+' comprados</span><div class="cdp-buy-bar" aria-hidden="true"><i data-buy-bar style="--p:'+(pctFeitos/100)+'"></i></div></div>';
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
    meusinfo: escapeHtml(cfg.meus ? "Cardápio e lista de compras usam só os "+cfg.meus.filter(id=> CDPE.alimentosDisponiveis(motor).indexOf(id) >= 0).length+" alimentos que você marcou em Meus alimentos." : "Meus alimentos: o app escolhe entre todos os alimentos que combinam com os seus filtros."),
    total: total,
    lista: {grupos: listaGrupos, n: compra.length, temRotulo: temRotulo, cfg: {jeito: (CDP_JEITOS.find(j=> j[0] === cfg.jeito) || [])[1], rotina: (CDP_ROTINAS.find(r=> r[0] === cfg.rotina) || [])[1]}, meus: !!cfg.meus},
    comprasn: compra.length+(compra.length === 1 ? ' item' : ' itens'),
    avisos: avisos.map(a=>'<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join(""),
    refeicoes: refeicoes,
    compras: '<div class="cdp-note">Tudo o que aparece nos 7 dias do seu cardápio, somado: '+compra.length+' alimento'+(compra.length > 1 ? 's' : '')+'.</div>'+resumoCompra+compraHtml+(temRotulo ? '<div class="cdp-note">* valor típico de rótulo — confira o seu.</div>' : "")+'<div class="cdp-note">Quantidades de alimento já preparado, somando os 7 dias.'+(cfg.meus ? ' Só aparecem alimentos de Meus alimentos.' : ' Para ver só o que você come, marque em Meus alimentos.')+'</div>',
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
  const total = ['kcal','Prot.'].map((l,i)=> '<span class="cdp-tchip '+((i ? pOk : kOk) ? 'ok' : 'warn')+'"><b>'+l+'</b><strong>'+num(i ? cur.tot.P : cur.tot.kcal,0)+(i ? '<small>g</small>' : '')+'</strong><i>meta '+num(i ? cur.target.P : cur.target.kcal,0)+(i ? ' g' : '')+'</i></span>').join("");
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
      '<div class="cdp-pop-sec"><span class="cdp-lbl">Não quer mais?</span><div class="cdp-note"><button type="button" class="btn small" data-pop="naoquero" data-v="'+item.id+'">Não quero mais este</button> Tira <b>'+nomeHtml(item.id)+'</b> do cardápio, das trocas e da lista de compras. Para voltar, marque o alimento em Meus alimentos.</div></div>'+
      '<div class="cdp-note cdp-pop-msg" role="status" aria-live="polite" data-pop-msg></div>'+
      '<div class="modal-actions">'+(nTodas ? '<button type="button" class="btn" data-pop="restaurar">Restaurar todas ('+nTodas+')</button>' : '')+'<button type="button" class="btn primary" data-pop="fechar">Pronto</button></div>'
  };
}


/* Pop-up "Meus alimentos" (função pura): dado o estado, devolve o HTML. Cada alimento é um botão ligado/desligado; sem escolha salva, tudo aparece ligado (automático). */
const CDP_GRUPOS_MEUS = [["Proteínas","prot"],["Carboidratos","carb"],["Leguminosas","leg"],["Frutas","fruit"],["Vegetais","veg"],["Gorduras","fat"]];
export function montaPopupMeus(e, h){
  const {escapeHtml} = h;
  const motor = motorDe(e);
  const disp = CDPE.alimentosDisponiveis(motor);
  const marcados = e.cfg.meus ? disp.filter(id=> e.cfg.meus.indexOf(id) >= 0) : disp.slice();
  const nomeHtml = (id)=> escapeHtml(nomeLimpo(CDPE.FOODS[id]));
  const grupos = CDP_GRUPOS_MEUS.map(g=>{
    const ids = disp.filter(id=> CDPE.FOODS[id].role === g[1]);
    if(!ids.length) return "";
    const n = ids.filter(id=> marcados.indexOf(id) >= 0).length;
    const favs = e.cfg.favs || [];
    const chips = ids.map(id=>{ const on = marcados.indexOf(id) >= 0;
      const chip = '<button type="button" class="cdp-chip'+(on ? ' on' : '')+'" data-meus="alimento" data-v="'+id+'" aria-pressed="'+on+'">'+nomeHtml(id)+'</button>';
      if(!on) return chip;
      const fav = favs.indexOf(id) >= 0;   // estrela só nos alimentos marcados
      return '<span class="cdp-chipfav">'+chip+'<button type="button" class="cdp-star'+(fav ? ' on' : '')+'" data-meus="fav" data-v="'+id+'" aria-pressed="'+fav+'" aria-label="Favorito: '+nomeHtml(id)+'"><svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9 6.8 19.7l1-5.9L3.5 9.7l5.9-.8z"/></svg></button></span>'; }).join("");
    return '<div class="cdp-pop-sec"><span class="cdp-lbl">'+g[0]+' <small>('+n+' de '+ids.length+')</small></span>'+
      '<div class="cdp-chips" role="group" aria-label="'+g[0]+'">'+chips+'</div>'+
      '<div class="cdp-note"><button type="button" class="btn small" data-meus="grupo-todos" data-v="'+g[1]+'">Marcar todos</button> <button type="button" class="btn small" data-meus="grupo-nenhum" data-v="'+g[1]+'">Limpar</button></div></div>';
  }).join("");
  const avisos = marcados.length ? CDPE.validaRestricoes(Object.assign({}, motor, {meus: marcados.length === disp.length ? null : marcados})).avisos : [];
  return {
    marcados: marcados.length, total: disp.length,
    html:
      '<h2>Meus alimentos</h2>'+
      '<div class="sub">Marque só o que você come. O cardápio e a lista de compras usam apenas esses alimentos; o que ficar desmarcado não aparece. Os filtros de jeito de comer e restrições continuam valendo. A estrela marca favoritos: eles aparecem primeiro na ordem do cardápio e das trocas, sem tirar a variedade.</div>'+
      '<div class="cdp-note" role="status" aria-live="polite" data-meus-msg>'+marcados.length+' de '+disp.length+' alimentos marcados.</div>'+
      avisos.map(a=> '<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join("")+
      grupos+
      '<div class="modal-actions"><button type="button" class="btn" data-meus="auto">Voltar ao automático</button><button type="button" class="btn primary" data-meus="fechar">Pronto</button></div>'
  };
}

/* Formulário do primeiro uso (caixa flutuante): jeito de comer, rotina, refeições por dia, restrições e alimentos preferidos.
   Função pura (sem DOM): e = {kcalAlvo, macros, cfg, perfil, objetivo}; draft = {jeito, rotina, nref, restricoes, meus}. Devolve {html, marcados, total, avisos}. */
export function montaFormulario(e, h, draft){
  const {escapeHtml, num} = h;
  const cfg = Object.assign({}, e.cfg, draft);
  const motor = motorDe(Object.assign({}, e, {cfg}));
  const disp = CDPE.alimentosDisponiveis(motor);
  const marcados = cfg.meus ? disp.filter(id=> cfg.meus.indexOf(id) >= 0) : disp.slice();
  const fixo = cfg.rotina === "marmita";
  const nref = CDPE.nRefeicoes(motor);
  const opt = (itens, atual)=> itens.map(i=> '<option value="'+i[0]+'"'+(String(i[0]) === String(atual) ? ' selected' : '')+'>'+escapeHtml(i[1])+'</option>').join("");
  const nomeHtml = (id)=> escapeHtml(nomeLimpo(CDPE.FOODS[id]));
  const alimentos = CDP_GRUPOS_MEUS.map(g=>{
    const ids = disp.filter(id=> CDPE.FOODS[id].role === g[1]);
    if(!ids.length) return "";
    const n = ids.filter(id=> marcados.indexOf(id) >= 0).length;
    return '<div class="cdp-pop-sec"><span class="cdp-lbl">'+g[0]+' <small>('+n+' de '+ids.length+')</small></span><div class="cdp-chips" role="group" aria-label="'+g[0]+'">'+
      ids.map(id=>{ const on = marcados.indexOf(id) >= 0; return '<button type="button" class="cdp-chip'+(on ? ' on' : '')+'" data-form="alimento" data-v="'+id+'" aria-pressed="'+on+'">'+nomeHtml(id)+'</button>'; }).join("")+'</div></div>';
  }).join("");
  const avisos = marcados.length ? CDPE.validaRestricoes(Object.assign({}, motor, {meus: marcados.length === disp.length ? null : marcados})).avisos : [];
  const restr = CDP_RESTR.map(i=> '<label class="cdp-chk"><input type="checkbox" data-form="restr" data-v="'+i[0]+'"'+(cfg.restricoes[i[0]] ? ' checked' : '')+'><span>'+escapeHtml(i[1])+'</span></label>').join("");
  return {
    marcados: marcados.length, total: disp.length, avisos: avisos,
    html:
      '<h2>Monte seu cardápio</h2>'+
      '<div class="sub">Conte como você come. O app monta 7 dias que fecham sua meta ('+num(e.kcalAlvo,0)+' kcal e '+num(e.macros.proteina.g,0)+' g de proteína por dia) e soma tudo na lista de compras. Dá para mudar quando quiser.</div>'+
      '<div class="cdp-form">'+
        '<label class="cdp-field"><span class="cdp-lbl">Jeito de comer</span><select class="cdp-sel" data-form="jeito">'+opt(CDP_JEITOS, cfg.jeito)+'</select></label>'+
        '<label class="cdp-field"><span class="cdp-lbl">Rotina</span><select class="cdp-sel" data-form="rotina">'+opt(CDP_ROTINAS, cfg.rotina)+'</select><span class="cdp-note">'+escapeHtml(CDP_ROT_DESC[cfg.rotina](nref))+'</span></label>'+
        '<label class="cdp-field"><span class="cdp-lbl">Refeições por dia</span><select class="cdp-sel" data-form="nref"'+(fixo ? ' disabled' : '')+'>'+opt(CDP_NREF.map(n=> [n, n+" refeições"]), nref)+'</select>'+(fixo ? '<span class="cdp-note">Na Marmita da semana são sempre 5 refeições (os lotes dependem disso).</span>' : '')+'</label>'+
        '<fieldset class="cdp-fs"><legend class="cdp-lbl">Restrições</legend><div class="cdp-chk-list">'+restr+'</div></fieldset>'+
        '<div class="cdp-field"><span class="cdp-lbl">Alimentos que eu como</span><div class="cdp-note" role="status" aria-live="polite" data-form-msg>'+marcados.length+' de '+disp.length+' alimentos marcados. O cardápio e a lista de compras usam só os marcados.</div>'+
          '<div class="cdp-note"><button type="button" class="btn small" data-form="todos">Marcar todos</button> <button type="button" class="btn small" data-form="nenhum">Limpar</button></div>'+
          avisos.map(a=> '<div class="cdp-note cdp-warn">'+escapeHtml(a)+'</div>').join("")+alimentos+'</div>'+
      '</div>'+
      '<div class="modal-actions"><button type="button" class="btn" data-form="cancelar">Agora não</button><button type="button" class="btn primary" data-form="salvar">Montar meu cardápio</button></div>'
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
    ctx.salvaSettings(Object.assign({}, ctx.estado().settings, {cardapio:{configurado:true, jeito:cfg.jeito, rotina:cfg.rotina, nref:cfg.nref || null, restricoes:Object.assign({}, cfg.restricoes), trocas:cfg.trocas || [], meus:cfg.meus || null, favoritos:cfg.favs || []}}));
  }
  const regiao = (el, nome)=> el.querySelector('[data-r="'+nome+'"]');
  const botao = (el, rot, v)=> el.querySelector('[data-cdp="'+rot+'"][data-v="'+v+'"]');
  const seletor = (rot, itens, titulo)=> '<select class="cdp-sel" data-ngselect aria-label="'+titulo+'" data-cdp-sel="'+rot+'">'+itens.map(i=> '<option value="'+i[0]+'">'+i[1]+'</option>').join("")+'</select>';

  /* Esqueleto: montado uma única vez enquanto houver meta. Dias e rótulos são fixos (CDPE.DAYS/TRAIN). */
  function monta(el){
    const dias = CDPE.DAYS.map((nome,i)=> '<button type="button" class="cdp-day" data-cdp="dia" data-v="'+i+'" aria-pressed="false" aria-label="'+nome+(CDPE.TRAIN[i]?', dia de treino':', dia de descanso')+'" data-treino="'+(CDPE.TRAIN[i]?'1':'0')+'"><b>'+nome+'</b><small>'+(CDPE.TRAIN[i]?'treino':'descanso')+'</small></button>').join("");
    el.innerHTML =
      '<p class="cdp-sub" data-r="sub"></p>'+
      '<div class="cdp-controls">'+
        '<label class="cdp-field"><span class="cdp-lbl">Jeito de comer</span>'+seletor("jeito", CDP_JEITOS, "Jeito de comer")+'</label>'+
        '<label class="cdp-field"><span class="cdp-lbl">Rotina</span>'+seletor("rotina", CDP_ROTINAS, "Rotina")+'<span class="cdp-note" data-r="rotdesc"></span></label>'+
        '<label class="cdp-field"><span class="cdp-lbl">Refeições por dia</span>'+seletor("nref", CDP_NREF.map(n=> [String(n), n+" refeições"]), "Refeições por dia")+'<span class="cdp-note" data-r="nrefinfo"></span></label>'+
        '<details class="cdp-field cdp-field-restr cdp-multi"><summary><span class="cdp-lbl">Restrições</span><span class="cdp-multi-val" data-r="restrinfo"></span></summary>'+
          '<div class="cdp-chk-list" role="group" aria-label="Restrições">'+CDP_RESTR.map(i=> '<label class="cdp-chk"><input type="checkbox" data-cdp-chk="restr" data-v="'+i[0]+'"><span>'+i[1]+'</span></label>').join("")+'</div></details>'+
        '<div class="cdp-edit">'+
          '<button type="button" class="btn cdp-edit-btn" data-cdp="editar" aria-haspopup="dialog">'+ICO_TROCA+'<span>Trocar alimentos</span></button>'+
          '<button type="button" class="btn cdp-edit-btn" data-cdp="meus" aria-haspopup="dialog">'+ICO_MEUS+'<span>Meus alimentos</span></button>'+
          '<button type="button" class="btn cdp-edit-btn" data-cdp="montar" aria-haspopup="dialog">'+ICO_REFAZ+'<span>Refazer formulário</span></button>'+
          '<span class="cdp-note" data-r="trocasinfo"></span><span class="cdp-note" data-r="meusinfo"></span></div>'+
      '</div>'+
      '<div class="cdp-days" role="group" aria-label="Dia da semana">'+dias+'</div>'+
      '<div class="cdp-total" aria-label="Total do dia" data-r="total"></div>'+
      '<div data-r="avisos"></div>'+
      '<div class="cdp-meals" data-r="refeicoes"></div>'+
      '<details class="cdp-shop"><summary><span class="cdp-shop-ic">'+ICO_MEUS+'</span><span class="cdp-shop-t">Lista de compras da semana</span><span class="cdp-shop-n" data-r="comprasn"></span><span class="cdp-shop-chev">'+ICO_CHEV+'</span></summary>'+
        '<div class="cdp-shop-tools" role="group" aria-label="Exportar a lista">'+
          '<button type="button" class="btn small primary" data-cdp="pdf">'+ICO_PDF+'<span>Exportar PDF</span></button>'+
          '<button type="button" class="btn small" data-cdp="compartilhar" hidden>'+ICO_SHARE+'<span>Compartilhar</span></button>'+
          '<button type="button" class="btn small" data-cdp="copiar">'+ICO_COPIA+'<span>Copiar</span></button>'+
          '<button type="button" class="btn small ghost" data-cdp="limpar-compras">Limpar marcações</button></div>'+
        '<div data-r="compras"></div></details>'+
      '<div data-r="rodape"></div>';
    for(const k in ultimo) delete ultimo[k];
    try{ const t = new File([""], "t.pdf", {type:"application/pdf"}); const bs = el.querySelector('[data-cdp="compartilhar"]'); if(bs && navigator.canShare && navigator.canShare({files:[t]})) bs.hidden = false; }catch(e){}
    montado = true;
  }
  function troca(el, nome, html){
    if(ultimo[nome] === html) return;          // nada mudou nesta região: o nó fica como está
    const no = regiao(el, nome); if(!no) return;
    no.innerHTML = html; ultimo[nome] = html;
  }
  const escapeTxt = (t)=> ctx.escapeHtml(t);
  const restrResumo = (cfg)=>{ const n = CDP_RESTR.filter(i=> cfg.restricoes[i[0]]).length; return n ? n+(n > 1 ? " selecionadas" : " selecionada") : "nenhuma"; };
  const defineSel = (el, rot, v)=>{ const x = el.querySelector('[data-cdp-sel="'+rot+'"]'); if(x && x.value !== String(v)){ x.value = String(v); if(window.ngSelectSync) window.ngSelectSync(x); } };
  let pediuForm = false;     // o formulário automático já foi oferecido nesta sessão?
  const vazioHtml = (kcalAlvo, macros)=> '<div class="cdp-vazio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true" focusable="false"><path d="M5 3v5a3 3 0 0 0 6 0V3M8 3v18"/><path d="M16 3c-2 2-2.5 5-2.5 8h2.5v10"/></svg>'+
    '<h3>Seu cardápio ainda não foi montado</h3>'+
    '<p>Conte como você come (jeito de comer, rotina, refeições por dia, restrições e os alimentos que você gosta). O app monta 7 dias que fecham sua meta de '+ctx.num(kcalAlvo,0)+' kcal e '+ctx.num(macros.proteina.g,0)+' g de proteína por dia e soma tudo na lista de compras.</p>'+
    '<button type="button" class="btn primary" data-cdp="montar" aria-haspopup="dialog">Montar meu cardápio</button></div>';
  function liga(el, rot, v, ligado){
    const b = botao(el, rot, v); if(!b) return;
    if(b.classList.contains("on") !== ligado) b.classList.toggle("on", ligado);
    const val = String(ligado);
    if(b.getAttribute("aria-pressed") !== val) b.setAttribute("aria-pressed", val);
  }

  /* Lista de compras: marcações (já comprei) ficam só neste aparelho; PDF/cópia saem dos mesmos dados que a tela mostra. */
  const CHAVE_COMPRAS = "ng_compras_ok";
  let comprados = new Set();
  try{ const a = JSON.parse(localStorage.getItem(CHAVE_COMPRAS) || "[]"); if(Array.isArray(a)) comprados = new Set(a.filter(x=> typeof x === "string")); }catch(e){}
  const salvaComprados = ()=>{ try{ localStorage.setItem(CHAVE_COMPRAS, JSON.stringify([...comprados])); }catch(e){} };
  let listaAtual = null;
  const hojeBR = ()=>{ const d = new Date(); return String(d.getDate()).padStart(2,"0")+"/"+String(d.getMonth()+1).padStart(2,"0")+"/"+d.getFullYear(); };
  const dadosPdf = ()=>{
    if(!listaAtual) return null;
    const L = listaAtual, d = hojeBR();
    return {
      titulo: "Lista de compras da semana",
      subtitulo: [L.cfg.jeito, L.cfg.rotina, L.n+(L.n === 1 ? " alimento" : " alimentos"), d].filter(Boolean).join(" · "),
      grupos: L.grupos.map(g=> ({rotulo: g.rotulo, itens: g.itens.map(i=> ({nome: i.nome, qtd: i.qtd, feito: comprados.has(i.id)}))})),
      notas: [L.temRotulo ? "* valor típico de rótulo — confira o seu." : "", "Soma dos 7 dias do cardápio, em alimento já preparado"+(L.meus ? ", só com os alimentos de Meus alimentos" : "")+". Exemplo calculado a partir da sua meta; não substitui orientação de nutricionista, sobretudo com condições de saúde."],
      rodape: "Gerado pelo NG+ em "+d, assunto: "Lista de compras da semana"
    };
  };
  const textoLista = ()=>{
    const d = dadosPdf(); if(!d) return "";
    return d.titulo+" ("+d.subtitulo+")\n\n"+d.grupos.map(g=> g.rotulo.toUpperCase()+"\n"+g.itens.map(i=> (i.feito ? "[x] " : "[ ] ")+i.nome+" — "+i.qtd).join("\n")).join("\n\n")+(listaAtual && listaAtual.temRotulo ? "\n\n* valor típico de rótulo — confira o seu." : "");
  };
  const arquivoPdf = ()=>{
    const d = dadosPdf(); if(!d) return null;
    const nome = "lista-de-compras-ng-"+new Date().toISOString().slice(0,10)+".pdf";
    return {nome, blob: new Blob([montaPdf(d)], {type:"application/pdf"})};
  };
  const aviso = (m)=>{ if(typeof ctx.toast === "function") ctx.toast(m); };
  async function exportaPdf(){
    const a = arquivoPdf(); if(!a){ aviso("Monte o cardápio para gerar a lista."); return; }
    const url = URL.createObjectURL(a.blob), l = document.createElement("a");
    l.href = url; l.download = a.nome; document.body.appendChild(l); l.click(); l.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
    aviso("PDF da lista gerado.");
  }
  async function compartilhaPdf(){
    const a = arquivoPdf(); if(!a) return;
    const f = new File([a.blob], a.nome, {type:"application/pdf"});
    try{ if(navigator.canShare && navigator.canShare({files:[f]})){ await navigator.share({files:[f], title:"Lista de compras da semana"}); return; } }catch(e){ if(e && e.name === "AbortError") return; }
    exportaPdf();
  }
  async function copiaLista(){
    const t = textoLista(); if(!t) return;
    try{ await navigator.clipboard.writeText(t); aviso("Lista copiada."); }
    catch(e){ const ta = document.createElement("textarea"); ta.value = t; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); try{ document.execCommand("copy"); aviso("Lista copiada."); }catch(_){ aviso("Não consegui copiar agora."); } ta.remove(); }
  }
  function atualizaProgresso(el){
    const n = el.querySelectorAll("[data-cdp-buy]").length, ok = el.querySelectorAll("[data-cdp-buy]:checked").length;
    const t = el.querySelector("[data-buy-txt]"), b = el.querySelector("[data-buy-bar]");
    if(t) t.textContent = ok+" de "+n+" comprados";
    if(b) b.style.setProperty("--p", n ? Math.round(ok/n*100)/100 : 0);
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
    const cfg = normalizaCfg(ctx.estado().settings);
    if(!cfg.configurado){
      montado = false; for(const k in ultimo) delete ultimo[k];
      el.innerHTML = vazioHtml(kcalAlvo, macros);
      // primeira vez que a pessoa chega ao Cardápio: o formulário abre sozinho, numa caixa flutuante (uma vez por sessão)
      if(!pediuForm && el.getClientRects().length > 0 && typeof ctx.abreModal === "function"){ pediuForm = true; setTimeout(abreFormulario, 80); }
      return;
    }
    if(!montado) monta(el);
    const v = montaVisao({kcalAlvo, macros, cfg, perfil: ctx.estado().perfil, objetivo: ctx.objetivo(), dia: cdpDia, comprados: [...comprados]}, h);
    troca(el, "sub", v.sub);
    troca(el, "rotdesc", v.rotdesc);
    troca(el, "nrefinfo", v.nrefinfo);
    troca(el, "trocasinfo", v.trocasinfo);
    troca(el, "meusinfo", v.meusinfo);
    troca(el, "total", v.total);
    troca(el, "avisos", v.avisos);
    troca(el, "refeicoes", v.refeicoes);
    troca(el, "comprasn", v.comprasn);
    troca(el, "compras", v.compras);
    listaAtual = v.lista;
    troca(el, "rodape", v.rodape);
    defineSel(el, "jeito", v.ligados.jeito);
    defineSel(el, "rotina", v.ligados.rotina);
    defineSel(el, "nref", v.ligados.nref);
    const selN = el.querySelector('[data-cdp-sel="nref"]'); if(selN && selN.disabled !== v.ligados.nrefFixo) selN.disabled = v.ligados.nrefFixo;
    CDP_RESTR.forEach(i=>{ const c = el.querySelector('[data-cdp-chk="restr"][data-v="'+i[0]+'"]'); if(c && c.checked !== !!v.ligados[i[0]]) c.checked = !!v.ligados[i[0]]; });
    troca(el, "restrinfo", escapeTxt(restrResumo(cfg)));
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
      else if(act === "naoquero"){
        /* "Não quero mais este": tira o alimento de Meus alimentos (vale para cardápio, trocas e lista de compras) e mostra o que entrou no lugar. */
        const de = sel.itemId, motor = motorDe(contexto());
        const r = CDPE.retiraAlimento(motor, de);
        if(!r.ok){
          const plural = {prot:"proteínas", carb:"carboidratos", leg:"leguminosas", fruit:"frutas", veg:"vegetais", fat:"gorduras"}[r.role] || "alimentos";
          const msg = r.motivo === "categoria" ? "Não dá para tirar "+nome(de)+": sobraria menos de 2 opções de "+plural+" e o cardápio ficaria repetitivo. Marque mais opções em Meus alimentos antes."
            : r.motivo === "proteina" ? "Sem "+nome(de)+" não sobraria nenhuma proteína concentrada. Marque outra proteína em Meus alimentos antes."
            : "Este alimento já está fora de Meus alimentos.";
          desenha(["naoquero", de], msg);
          return;
        }
        const antes = CDPE.buildDay(cdpDia, motor).meals.find(m=> m.slot === sel.slot), papel = (CDPE.FOODS[de] || {}).role;
        const idsAntes = antes ? antes.items.map(i=> i.id) : [];
        cfg.meus = r.meus;
        cfg.trocas = cfg.trocas.filter(t=> t.de !== de && t.para !== de);
        cdpSalvar(cfg); ctx.redesenhaDieta();
        const depois = CDPE.buildDay(cdpDia, motorDe(contexto())).meals.find(m=> m.slot === sel.slot);
        const novo = depois && (depois.items.find(i=> i.role === papel && idsAntes.indexOf(i.id) < 0) || depois.items.find(i=> i.role === papel));
        sel.itemId = novo ? novo.id : null;
        desenha(novo ? ["alimento", novo.id] : null, "Tirei "+nome(de)+" de Meus alimentos."+(novo ? " Agora aparece "+nome(novo.id)+"." : ""));
      }
    });
    ctx.abreModal(corpo);
    desenha();
  }


  /* Pop-up "Meus alimentos": a escolha fica salva em settings.cardapio.meus (null = automático). */
  function abrePopupMeus(){
    if(typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const contexto = ()=> ({kcalAlvo:cdpUltimo.k, macros:cdpUltimo.m, cfg:normalizaCfg(ctx.estado().settings), perfil:ctx.estado().perfil, objetivo:ctx.objetivo(), dia:cdpDia});
    function desenha(foco, msg){
      const y = corpo.scrollTop;
      const r = montaPopupMeus(contexto(), h);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-meus-msg]");
      if(m && msg) m.textContent = msg+" "+r.marcados+" de "+r.total+" alimentos marcados.";
      if(foco){ const b = corpo.querySelector('[data-meus="'+foco[0]+'"][data-v="'+foco[1]+'"]') || corpo.querySelector('[data-meus="fechar"]'); if(b) b.focus({preventScroll:true}); }
      corpo.scrollTop = y;
    }
    function grava(lista, disp){
      const cfg = normalizaCfg(ctx.estado().settings);
      cfg.meus = (lista.length === disp.length) ? null : lista;   // tudo marcado = automático
      cdpSalvar(cfg); ctx.redesenhaDieta();
    }
    corpo.addEventListener("click", (ev)=>{
      const b = ev.target.closest("[data-meus]"); if(!b) return;
      const act = b.dataset.meus, v = b.dataset.v;
      if(act === "fechar"){ ctx.fechaModal(); return; }
      const ctxo = contexto(), cfg = ctxo.cfg, motor = motorDe(ctxo);
      const disp = CDPE.alimentosDisponiveis(motor);
      let marcados = cfg.meus ? disp.filter(id=> cfg.meus.indexOf(id) >= 0) : disp.slice();
      ctx.tocaSom("tick");
      if(act === "auto"){ grava(disp, disp); desenha(["auto", ""], "Voltou ao automático."); return; }
      if(act === "fav"){
        const jaFav = (cfg.favs || []).indexOf(v) >= 0;
        cfg.favs = jaFav ? cfg.favs.filter(id=> id !== v) : (cfg.favs || []).concat([v]);
        cdpSalvar(cfg); ctx.redesenhaDieta();
        const f = CDPE.FOODS[v];
        desenha(["fav", v], f ? (jaFav ? "Tirei dos favoritos: " : "Favorito: ")+nomeLimpo(f)+"." : "");
        return;
      }
      let aviso = "";
      if(act === "alimento"){
        marcados = marcados.indexOf(v) >= 0 ? marcados.filter(id=> id !== v) : marcados.concat([v]);
      } else if(act === "grupo-todos"){
        disp.forEach(id=>{ if(CDPE.FOODS[id].role === v && marcados.indexOf(id) < 0) marcados.push(id); });
      } else if(act === "grupo-nenhum"){
        marcados = marcados.filter(id=> CDPE.FOODS[id].role !== v);
      }
      if(!marcados.length){ aviso = "Mantenha pelo menos um alimento marcado."; desenha([act, v || ""], aviso); return; }
      grava(marcados, disp);
      desenha([act, v || ""], "");
    });
    ctx.abreModal(corpo);
    desenha();
  }

  /* Formulário do primeiro uso: caixa flutuante com os campos selecionáveis e os alimentos preferidos. Só grava ao confirmar. */
  function abreFormulario(){
    if(typeof ctx.abreModal !== "function" || !cdpUltimo) return;
    const corpo = document.createElement("div");
    const base = normalizaCfg(ctx.estado().settings);
    const draft = {jeito:base.jeito, rotina:base.rotina, nref:base.nref, restricoes:Object.assign({}, base.restricoes), meus:base.meus};
    const contexto = ()=> ({kcalAlvo:cdpUltimo.k, macros:cdpUltimo.m, cfg:base, perfil:ctx.estado().perfil, objetivo:ctx.objetivo(), dia:0});
    const disponiveis = ()=> CDPE.alimentosDisponiveis(motorDe(Object.assign({}, contexto(), {cfg:Object.assign({}, base, draft)})));
    function desenha(foco, msg){
      const y = corpo.scrollTop;
      const r = montaFormulario(contexto(), h, draft);
      corpo.innerHTML = r.html;
      const m = corpo.querySelector("[data-form-msg]");
      if(m && msg) m.textContent = msg;
      if(foco){ const b = corpo.querySelector('[data-form="'+foco[0]+'"]'+(foco[1] ? '[data-v="'+foco[1]+'"]' : '')); if(b) b.focus({preventScroll:true}); }
      corpo.scrollTop = y;
    }
    const marcadosAgora = ()=>{ const d = disponiveis(); return draft.meus ? d.filter(id=> draft.meus.indexOf(id) >= 0) : d.slice(); };
    corpo.addEventListener("change", (ev)=>{
      const b = ev.target.closest("[data-form]"); if(!b) return;
      const act = b.dataset.form;
      if(act === "jeito" || act === "rotina") draft[act] = b.value;
      else if(act === "nref") draft.nref = Number(b.value) || null;
      else if(act === "restr") draft.restricoes[b.dataset.v] = b.checked;
      else return;
      ctx.tocaSom("tick");
      desenha([act, act === "restr" ? b.dataset.v : ""]);
    });
    corpo.addEventListener("click", (ev)=>{
      const b = ev.target.closest("button[data-form]"); if(!b) return;
      const act = b.dataset.form, v = b.dataset.v;
      if(act === "cancelar"){ ctx.fechaModal(); return; }
      if(act === "salvar"){
        const disp = disponiveis(), marcados = marcadosAgora();
        if(!marcados.length){ desenha(["salvar", ""], "Mantenha pelo menos um alimento marcado."); return; }
        const cfg = Object.assign({}, base, draft, {nref: draft.rotina === "marmita" ? null : draft.nref});
        cfg.meus = marcados.length === disp.length ? null : marcados;   // tudo marcado = automático
        cdpSalvar(cfg); ctx.tocaSom("tick"); ctx.fechaModal(); ctx.redesenhaDieta();
        return;
      }
      ctx.tocaSom("tick");
      let marcados = marcadosAgora();
      const disp = disponiveis();
      if(act === "alimento") marcados = marcados.indexOf(v) >= 0 ? marcados.filter(id=> id !== v) : marcados.concat([v]);
      else if(act === "todos") marcados = disp.slice();
      else if(act === "nenhum") marcados = [];
      draft.meus = marcados.length === disp.length ? null : marcados;
      desenha([act, v || ""]);
    });
    ctx.abreModal(corpo);
    desenha();
  }

  function setupCardapio(){
    const el = document.getElementById("cardapio-body");
    if(!el) return;
    // campos selecionáveis do card: jeito, rotina, refeições por dia (select) e restrições (caixas de marcar)
    el.addEventListener("change", (ev)=>{
      const buy = ev.target.closest("[data-cdp-buy]");
      if(buy){
        const id = buy.dataset.cdpBuy;
        if(buy.checked) comprados.add(id); else comprados.delete(id);
        salvaComprados();
        const row = buy.closest(".cdp-buy"); if(row) row.classList.toggle("feito", buy.checked);
        atualizaProgresso(el);
        return;
      }
      const sel = ev.target.closest("[data-cdp-sel]"), chk = ev.target.closest("[data-cdp-chk]");
      if(!sel && !chk) return;
      const cfg = normalizaCfg(ctx.estado().settings);
      if(sel){
        const act = sel.dataset.cdpSel;
        if(act === "jeito") cfg.jeito = sel.value;
        else if(act === "rotina") cfg.rotina = sel.value;
        else if(act === "nref"){ if(cfg.rotina === "marmita" || sel.disabled) return; cfg.nref = Number(sel.value) || null; }
      } else cfg.restricoes[chk.dataset.v] = chk.checked;
      cdpSalvar(cfg); ctx.tocaSom("tick"); ctx.redesenhaDieta();
    });
    el.addEventListener("click", (ev)=>{
      const b = ev.target.closest("[data-cdp]");
      if(!b) return;
      if(b.dataset.cdp === "editar"){ abrePopup(); return; }
      if(b.dataset.cdp === "meus"){ abrePopupMeus(); return; }
      if(b.dataset.cdp === "montar"){ abreFormulario(); return; }
      if(b.dataset.cdp === "pdf"){ exportaPdf(); return; }
      if(b.dataset.cdp === "compartilhar"){ compartilhaPdf(); return; }
      if(b.dataset.cdp === "copiar"){ copiaLista(); return; }
      if(b.dataset.cdp === "limpar-compras"){ comprados.clear(); salvaComprados(); el.querySelectorAll("[data-cdp-buy]").forEach(c=>{ c.checked = false; const r = c.closest(".cdp-buy"); if(r) r.classList.remove("feito"); }); atualizaProgresso(el); return; }
      const act = b.dataset.cdp, cfg = normalizaCfg(ctx.estado().settings);
      // (A rede de segurança de rolagem — minHeight do card + checagem no quadro seguinte — saiu no passo 3b: os nós são preservados e, no WebKit, a rolagem não muda; ver testes/rolagem-dieta-webkit.js)
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
    });
  }
  setupCardapio();
  return { render: renderCardapio };
}
