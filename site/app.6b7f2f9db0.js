(function(){
"use strict";
document.documentElement.lang = "pt-BR";
/* Safari/WebKit (inclui todos os navegadores do iPhone): marca o <html> para o CSS manter o menu NATIVO nos <select> (ver C3) */
try{ const ua = navigator.userAgent; if(/AppleWebKit/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|Android|Firefox|FxiOS/.test(ua)) document.documentElement.setAttribute("data-wk",""); }catch(e){}

/* v88 U2: mede as barras fixas para o scroll-padding do <html>. */
(function medeBarrasFixas(){
  const root = document.documentElement;
  const tb = document.querySelector(".topbar"), bn = document.getElementById("bottomnav");
  function fixa(el){ if(!el) return 0; const pos = getComputedStyle(el).position; return (pos === "fixed" || pos === "sticky") ? Math.round(el.getBoundingClientRect().height) : 0; }
  function mede(){
    // no desktop a navegação vira menu lateral (sticky na coluna) — não cobre o rodapé
    const bnBaixo = bn && getComputedStyle(bn).position === "fixed" ? Math.round(bn.getBoundingClientRect().height) : 0;
    root.style.setProperty("--tb-h", fixa(tb)+"px");
    root.style.setProperty("--bn-h", bnBaixo+"px");
  }
  mede();
  addEventListener("resize", mede, {passive:true});
  if(window.ResizeObserver){ const ro = new ResizeObserver(mede); if(tb) ro.observe(tb); if(bn) ro.observe(bn); }
})();

/* v98 Fase 6 — teclado do celular.
   1) quando o teclado abre sobre um campo de texto/número em tela de toque: a barra inferior some (html.kb-open) e as folhas/modais
      passam a caber na área REALMENTE visível (--vvh, --vvt, --kb-h vêm da visualViewport; no iOS o teclado não redimensiona a página);
   2) o campo focado é rolado para dentro da área visível;
   3) campos numéricos ganham inputmode (teclado numérico) e Enter/OK vai ao próximo campo — ou fecha o teclado no último.
   Só age em ponteiro "coarse" (celular/tablet); no desktop nada muda. */
(function tecladoMovel(){
  const root = document.documentElement, vv = window.visualViewport;
  const toque = window.matchMedia ? window.matchMedia("(hover:none) and (pointer:coarse)") : {matches:false};
  const SEL_EDIT = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=button]):not([type=submit]):not([type=file]):not([type=color]):not([type=date]):not([type=time]):not([type=hidden]), textarea';
  const editavel = el => !!(el && el.matches && el.matches(SEL_EDIT) && !el.disabled && !el.readOnly);
  let ultimaMedida = "";
  function medeVV(){
    const h = vv ? Math.round(vv.height) : innerHeight, topo = vv ? Math.round(vv.offsetTop) : 0;
    const k = h+"|"+topo+"|"+innerHeight;
    if(k === ultimaMedida) return;   // propriedades na raiz refazem o estilo da página inteira: só escreve quando muda
    ultimaMedida = k;
    root.style.setProperty("--vvh", h+"px");
    root.style.setProperty("--vvt", topo+"px");
    root.style.setProperty("--kb-h", Math.max(0, Math.round(innerHeight - h - topo))+"px");
  }
  function mostra(el){
    if(!el || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const t = vv ? vv.offsetTop : 0, b = vv ? vv.offsetTop + vv.height : innerHeight;
    if(r.bottom > b - 8 || r.top < t + 8) el.scrollIntoView({block:"center", behavior:"smooth"});
  }
  /* O teclado só conta como aberto se a área visível encolheu de verdade (no Android, fechar o teclado com "voltar"
     NÃO tira o foco do campo — sem essa checagem a barra inferior ficaria escondida sem teclado nenhum). */
  let base = innerHeight, fim = 0, esp = 0;
  const LIMITE = 140;
  function atualiza(){
    const editando = editavel(document.activeElement);
    const aberto = toque.matches && editando && (vv ? (base - vv.height) > LIMITE : true);
    root.classList.toggle("kb-open", aberto);
    medeVV();
    if(aberto){ clearTimeout(esp); esp = setTimeout(()=>mostra(document.activeElement), 120); }
  }
  addEventListener("focusin", e=>{
    if(!toque.matches || !editavel(e.target)) return;
    clearTimeout(fim);
    afina(e.target);
    atualiza();
    clearTimeout(esp); esp = setTimeout(()=>mostra(e.target), 320);   // espera a animação do teclado
  });
  addEventListener("focusout", ()=>{
    clearTimeout(fim);
    fim = setTimeout(()=>{ if(!editavel(document.activeElement)) base = innerHeight; atualiza(); }, 140);
  });
  addEventListener("resize", ()=>{ if(!editavel(document.activeElement)) base = innerHeight; atualiza(); }, {passive:true});
  addEventListener("orientationchange", ()=>setTimeout(()=>{ base = innerHeight; atualiza(); }, 400));
  if(vv){
    vv.addEventListener("resize", atualiza);
    vv.addEventListener("scroll", medeVV);
  }
  /* próximo campo do mesmo bloco (modal, folha, formulário ou cartão) */
  function proximo(el, soVisiveis){
    const esc = el.closest(".modal, .qc-sheet, form, .card, section, main") || document.body;
    const lista = [...esc.querySelectorAll(SEL_EDIT + ", select")].filter(x=>!x.disabled && (soVisiveis === false || (x.checkVisibility && x.checkVisibility())));
    const i = lista.indexOf(el);
    return i >= 0 ? (lista[i+1] || null) : null;
  }
  function afina(el){
    if(!(el instanceof HTMLInputElement)) return;
    if(el.type === "number" && !el.hasAttribute("inputmode")){
      const st = el.getAttribute("step");
      el.setAttribute("inputmode", (!st || /^\d+$/.test(st)) ? "numeric" : "decimal");
    }
    if(!el.form && !el.hasAttribute("data-eh") && ["text","number","tel","email"].includes(el.type)){
      el.setAttribute("enterkeyhint", proximo(el, el.checkVisibility && el.checkVisibility()) ? "next" : "done");   // oculto (aba fechada): conta os vizinhos mesmo ocultos; no foco recalcula só com os visíveis
    }
  }
  function afinaTudo(no){ (no.matches && no.matches("input") ? [no] : [...no.querySelectorAll("input")]).forEach(afina); }
  afinaTudo(document);
  if(window.MutationObserver){
    let fila = [], agendado = false;
    new MutationObserver(ms=>{
      ms.forEach(m=>m.addedNodes.forEach(n=>{ if(n.nodeType === 1) fila.push(n); }));
      if(fila.length && !agendado){ agendado = true; requestAnimationFrame(()=>{ const f = fila; fila = []; agendado = false; f.forEach(n=>{ if(n.isConnected) afinaTudo(n); }); }); }
    }).observe(document.body, {childList:true, subtree:true});
  }
  addEventListener("keydown", e=>{
    if(e.key !== "Enter" || e.defaultPrevented || e.isComposing || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) return;
    const el = e.target;
    if(!toque.matches || !(el instanceof HTMLInputElement) || el.form || !["text","number","tel","email"].includes(el.type)) return;
    if(el.closest('[role="combobox"], #cmdk')) return;
    e.preventDefault();
    const nx = proximo(el);
    if(nx){ nx.focus(); if(nx.select && nx.tagName === "INPUT") try{ nx.select(); }catch(_){} } else el.blur();
  });
})();

/* ÍCONES (v88): fonte única para o sprite SVG (<use>) e para o cartão em canvas (Path2D).
   Traço de 24×24 no estilo Lucide (ISC). Troca os emojis, que mudam de aparência a cada sistema. */
const ICONS = {
  bulb:     ["M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5","M9 18h6","M10 22h4"],
  snow:     ["M12 2v20","M4.93 7l14.14 10","M4.93 17 19.07 7","M9 4l3 2 3-2","M9 20l3-2 3 2"],
  flame:    ["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"],
  trophy:   ["M6 9H4.5a2.5 2.5 0 0 1 0-5H6","M18 9h1.5a2.5 2.5 0 0 0 0-5H18","M4 22h16","M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22","M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22","M18 2H6v7a6 6 0 0 0 12 0V2z"],
  sparkles: ["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z","M20 3v4","M22 5h-4","M4 17v2","M5 18H3"],
  star:     ["M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"],
  medal:    ["M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15","M11 12 5.12 2.2","m13 12 5.88-9.8","M8 7h8","M17 17a5 5 0 1 0-10 0 5 5 0 0 0 10 0z","M12 18v-2h-.5"],
  zap:      ["M13 2 3 14h9l-1 8 10-12h-9l1-8z"],
  gift:     ["M20 12v10H4V12","M2 7h20v5H2z","M12 22V7","M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z","M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"],
  bot:      ["M12 8V4H8","M6 8h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z","M2 14h2","M20 14h2","M15 13v2","M9 13v2"],
  timer:    ["M10 2h4","M12 14l3-3","M20 14a8 8 0 1 1-16 0 8 8 0 0 1 16 0z"],
  cloud:    ["M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"],
  ruler:    ["M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.4 2.4 0 0 1 0-3.4l2.6-2.6a2.4 2.4 0 0 1 3.4 0Z","m14.5 12.5 2-2","m11.5 9.5 2-2","m8.5 6.5 2-2","m17.5 15.5 2-2"],
  camera:   ["M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z","M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  user:     ["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2","M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  "line-chart": ["M3 3v16a2 2 0 0 0 2 2h16","m19 9-5 5-4-4-3 3"],
  "cloud-check": ["M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z","m9 13 2 2 4-4"],
  "cloud-off":   ["m2 2 20 20","M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193","M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"],
  refresh:  ["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8","M21 3v5h-5","M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16","M8 16H3v5"],
  search:   ["m21 21-4.34-4.34","M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16z"],
  x:        ["M18 6 6 18","m6 6 12 12"],
  alert:    ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3","M12 9v4","M12 17h.01"]
};
const ic = (name, cls)=> '<svg class="ic'+(cls?' '+cls:'')+'" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#i-'+name+'"/></svg>';
/* v93 C6: estado vazio com ilustração e uma ação. Ações: medir | perfil | foto | treino */
function emptyState(icon, title, text, act){
  return '<div class="empty-state">'+
    '<div class="empty-ill" aria-hidden="true"><svg viewBox="0 0 24 24" class="ic"><use href="#i-'+icon+'"/></svg></div>'+
    '<div class="empty-title">'+title+'</div>'+
    '<div class="empty-text">'+text+'</div>'+
    (act ? '<button type="button" class="btn small primary" data-empty-go="'+act.go+'">'+act.label+'</button>' : '')+
  '</div>';
}
(function montaSprite(){
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("id","icon-sprite"); svg.setAttribute("width","0"); svg.setAttribute("height","0");
  svg.setAttribute("aria-hidden","true"); svg.setAttribute("focusable","false");
  svg.style.cssText = "position:absolute; width:0; height:0; overflow:hidden;";
  Object.keys(ICONS).forEach(k=>{
    const sym = document.createElementNS(ns, "symbol");
    sym.setAttribute("id","i-"+k); sym.setAttribute("viewBox","0 0 24 24");
    ICONS[k].forEach(d=>{ const pth = document.createElementNS(ns, "path"); pth.setAttribute("d", d); sym.appendChild(pth); });
    svg.appendChild(sym);
  });
  document.body.insertBefore(svg, document.body.firstChild);
})();

/* Abas: setas esquerda/direita (e Home/End) movem entre as abas de qualquer tablist (padrão WAI-ARIA). */
document.addEventListener("keydown", (e)=>{
  const tab = e.target && e.target.closest && e.target.closest('[role="tab"]');
  if(!tab || !["ArrowLeft","ArrowRight","Home","End"].includes(e.key)) return;
  const list = tab.closest('[role="tablist"]');
  if(!list) return;
  const tabs = Array.from(list.querySelectorAll('[role="tab"]')).filter(t=> t.offsetParent !== null);
  const i = tabs.indexOf(tab);
  if(i < 0) return;
  let n = i;
  if(e.key === "ArrowRight") n = (i+1) % tabs.length;
  else if(e.key === "ArrowLeft") n = (i-1+tabs.length) % tabs.length;
  else if(e.key === "Home") n = 0; else n = tabs.length-1;
  e.preventDefault();
  tabs[n].focus();
  tabs[n].click();
});

/* Roving tabindex (v73): em cada tablist só a aba ativa entra na ordem do Tab;
   as demais ficam acessíveis pelas setas (handler acima). Se a aba ativa estiver
   escondida (ex.: Glossário/Config no celular, onde vivem na folha "Mais"),
   a primeira aba visível assume o papel. */
(function setupRovingTabs(){
  const lists = Array.from(document.querySelectorAll('[role="tablist"]'));
  function sync(list){
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const vis = tabs.filter(t=> t.offsetParent !== null);
    if(!vis.length) return;
    const cur = vis.find(t=> t.getAttribute("aria-selected") === "true") || vis[0];
    tabs.forEach(t=> t.setAttribute("tabindex", t === cur ? "0" : "-1"));
  }
  const syncAll = ()=> lists.forEach(sync);
  const mo = new MutationObserver(syncAll);
  lists.forEach(l=> mo.observe(l, {subtree:true, attributes:true, attributeFilter:["aria-selected","hidden"]}));
  let t = null;
  window.addEventListener("resize", ()=>{ clearTimeout(t); t = setTimeout(syncAll, 120); });
  syncAll();
  // o subnav do Corpo fica oculto até o grupo abrir; reavalia quando a tela troca
  document.addEventListener("click", ()=> setTimeout(syncAll, 0));
})();

/* ============================================================
   FORMULAS & FONTES (ver seções "fontes" na UI para os links)
   - IMC: OMS/CDC — classificação padrão de faixas kg/m².
   - RCQ: OMS, "Waist Circumference and Waist-Hip Ratio: report of a
     WHO expert consultation" (2008) — corte de risco 0.90 (homens) / 0.85 (mulheres).
   - % Gordura: método da Marinha dos EUA (circunferências), Hodgdon & Beckett,
     Naval Health Research Center.
   - TMB/TDEE: equação de Mifflin-St Jeor (1990) + multiplicadores de atividade padrão.
   - Proteína: International Society of Sports Nutrition (ISSN) Position Stand,
     Jäger et al. 2017 — 1.4–2.0 g/kg/dia.
   - Gordura/Carboidrato: Acceptable Macronutrient Distribution Range (AMDR),
     Institute of Medicine / National Academies.
   ============================================================ */

const DAYS = ["seg","ter","qua","qui","sex","sab","dom"];
const DAY_LABEL = {seg:"Seg",ter:"Ter",qua:"Qua",qui:"Qui",sex:"Sex",sab:"Sáb",dom:"Dom"};
const DAY_FULL = {seg:"Segunda",ter:"Terça",qua:"Quarta",qui:"Quinta",sex:"Sexta",sab:"Sábado",dom:"Domingo"};
const MS_DAY = 86400000;

function pad2(n){ return String(n).padStart(2,"0"); }
function fmtDateISO(d){ return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
function todayISO(){ return fmtDateISO(new Date()); }
function dayKeyFromISO(iso){
  const d = new Date(iso+"T00:00:00");
  const jsDay = d.getDay(); // 0=domingo
  const map = ["dom","seg","ter","qua","qui","sex","sab"];
  return map[jsDay];
}
/* ---- Reagendar: treino perdido feito hoje ----
   settings.reagenda = {dias:{ "AAAA-MM-DD": "<chave do treino>" }, recuperados:["AAAA-MM-DD"]}
   treinoKey(iso) = qual treino da rotina vale NAQUELA data (o dia da semana, salvo remanejamento). */
function treinoKey(iso){
  const r = state.settings && state.settings.reagenda;
  const k = r && r.dias && r.dias[iso];
  return (k && DAYS.indexOf(k) >= 0) ? k : dayKeyFromISO(iso);
}
function addDaysISO(iso, n){
  const d = new Date(iso+"T00:00:00");
  d.setDate(d.getDate()+n);
  return fmtDateISO(d);
}
function fmtDateBR(iso){
  const [y,m,d] = iso.split("-");
  return d+"/"+m;
}
function num(v, digits){
  if(v===null||v===undefined||isNaN(v)) return "—";
  return v.toLocaleString("pt-BR",{minimumFractionDigits:digits||0, maximumFractionDigits:digits||0});
}
// Registra um erro no diagnóstico local (Config → Diagnóstico) e, se houver, no RUM. Nunca lança.
function ngReporta(e, ctx){ try{ if(window.reportar) window.reportar(e, ctx); }catch(_){} }
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

// Rotina padrão: Push/Pull/Legs (hoje nomeada A–F: Peito e Ombros / Costas e Bíceps / Pernas) 2x por semana — 6 dias
// de treino + 1 de descanso. Estrutura usada por treinadores renomados (ex.:
// o PPL "Science Based" de Jeff Nippard, boostcamp.app/users/5BJfdr) e alinhada
// à meta-análise de frequência de Schoenfeld, Ogborn & Krieger (2016): treinar
// cada grupo muscular 2x+/semana gera mais hipertrofia que 1x/semana com o
// mesmo volume. Os nomes dos dias (A · Peito e Ombros, B · Costas e Bíceps, C · Pernas…) seguem a
// mesma linguagem do painel de "Volume semanal por grupo muscular", pra
// ficar óbvio qual categoria cada treino alimenta. Ver seção "A ciência por
// trás da sua rotina" (aba Treino) para as fontes completas.
function buildPPLRotina(){
  return {
    seg:{nome:"A · Peito e Ombros", ativo:true, exercicios:[
      {nome:"Supino reto", series:4, reps:"6-10", metaReps:32, musculos:["peito","triceps"]},
      {nome:"Desenvolvimento militar com barra", series:4, reps:"6-10", metaReps:32, musculos:["ombros","triceps"]},
      {nome:"Supino inclinado com halteres", series:3, reps:"8-12", metaReps:30, musculos:["peito","triceps"]},
      {nome:"Elevação lateral", series:3, reps:"12-15", metaReps:42, musculos:["ombros"]},
      {nome:"Tríceps na polia (corda)", series:3, reps:"10-15", metaReps:39, musculos:["triceps"]}]},
    ter:{nome:"B · Costas e Bíceps", ativo:true, exercicios:[
      {nome:"Levantamento terra", series:3, reps:"5-8", metaReps:21, musculos:["costas","posterior","gluteos"]},
      {nome:"Barra fixa (ou puxada frente)", series:4, reps:"6-10", metaReps:32, musculos:["costas","biceps"]},
      {nome:"Remada curvada com barra", series:3, reps:"8-12", metaReps:30, musculos:["costas","biceps"]},
      {nome:"Face pull", series:3, reps:"12-15", metaReps:42, musculos:["ombros","costas"], nota:"Cabo na altura do rosto, cotovelos altos, puxe separando as mãos — foco no deltoide posterior, não em levantar peso."},
      {nome:"Rosca direta", series:3, reps:"10-12", metaReps:33, musculos:["biceps"]}]},
    qua:{nome:"C · Pernas", ativo:true, exercicios:[
      {nome:"Agachamento livre", series:4, reps:"6-10", metaReps:32, musculos:["quadriceps","gluteos"]},
      {nome:"Leg press", series:3, reps:"10-15", metaReps:39, musculos:["quadriceps","gluteos"]},
      {nome:"Cadeira extensora", series:3, reps:"12-15", metaReps:42, musculos:["quadriceps"]},
      {nome:"Mesa flexora", series:3, reps:"10-12", metaReps:33, musculos:["posterior"]},
      {nome:"Elevação de panturrilha em pé", series:4, reps:"12-15", metaReps:56, musculos:["panturrilha"]},
      {nome:"Prancha", series:3, reps:"30-45s", metaReps:3, musculos:["abdomen"]}]},
    qui:{nome:"D · Peito e Ombros", ativo:true, exercicios:[
      {nome:"Desenvolvimento com halteres", series:4, reps:"8-12", metaReps:40, musculos:["ombros","triceps"]},
      {nome:"Supino na smith (ou máquina)", series:3, reps:"8-12", metaReps:30, musculos:["peito","triceps"]},
      {nome:"Crucifixo (voador)", series:3, reps:"12-15", metaReps:42, musculos:["peito"]},
      {nome:"Elevação lateral no cabo", series:3, reps:"15-20", metaReps:54, musculos:["ombros"]},
      {nome:"Tríceps francês", series:3, reps:"10-12", metaReps:33, musculos:["triceps"]}]},
    sex:{nome:"E · Costas e Bíceps", ativo:true, exercicios:[
      {nome:"Puxada na polia (pegada aberta)", series:4, reps:"8-12", metaReps:40, musculos:["costas","biceps"]},
      {nome:"Remada cavalinho (T-bar)", series:3, reps:"8-12", metaReps:30, musculos:["costas","biceps"], nota:"Peito apoiado ou tronco firme, puxe com os cotovelos (não com os braços) — evita compensar com a lombar."},
      {nome:"Remada unilateral com halter", series:3, reps:"10-12 por lado", metaReps:66, musculos:["costas"]},
      {nome:"Rosca alternada com halteres", series:3, reps:"10-12", metaReps:33, musculos:["biceps"]},
      {nome:"Elevação de pernas", series:3, reps:"12-15", metaReps:42, musculos:["abdomen"]}]},
    sab:{nome:"F · Pernas", ativo:true, exercicios:[
      {nome:"Stiff (levantamento terra romeno)", series:4, reps:"8-12", metaReps:40, musculos:["posterior","gluteos"], nota:"Joelhos quase retos (leve flexão), empurre o quadril pra trás — a barra desliza perto das pernas, sem arredondar as costas."},
      {nome:"Hip thrust", series:3, reps:"10-15", metaReps:39, musculos:["gluteos"], nota:"Apoie a escápula no banco, queixo levemente recolhido, suba até o quadril alinhar com joelho e ombro — aperte o glúteo no topo."},
      {nome:"Avanço (afundo) com halteres", series:3, reps:"10-12 por perna", metaReps:66, musculos:["quadriceps","gluteos"]},
      {nome:"Cadeira abdutora", series:3, reps:"15-20", metaReps:54, musculos:["gluteos"]},
      {nome:"Elevação de panturrilha sentado", series:4, reps:"12-15", metaReps:56, musculos:["panturrilha"]},
      {nome:"Abdominal supra (crunch)", series:3, reps:"15-20", metaReps:54, musculos:["abdomen"]}]},
    dom:{nome:"Descanso", ativo:false, exercicios:[]}
  };
}

/* v97: rotina com ênfase em pernas e glúteos (6 dias). Sugestão inicial do perfil feminino; sempre editável.
   Glúteos 15 séries/semana (3 dias), quadríceps 14, posterior 10, costas 16, ombros 15, bíceps 16, tríceps 12, peito 9: tudo dentro de MEV–MRV. */
function mkEx(nome, series, reps, musculos, nota){
  const m = String(reps).match(/^(\d+)-(\d+)$/);
  const e = {nome, series, reps, metaReps: m ? Math.ceil(series * (Number(m[1]) + Number(m[2])) / 2) : series, musculos};
  if(nota) e.nota = nota;
  return e;
}
function buildPernasGluteosRotina(){
  return {
    seg:{nome:"A · Pernas e Glúteos", ativo:true, exercicios:[
      mkEx("Agachamento livre",4,"6-10",["quadriceps","gluteos"]),
      mkEx("Mesa flexora",3,"10-12",["posterior"]),
      mkEx("Cadeira extensora",3,"12-15",["quadriceps"]),
      mkEx("Elevação de panturrilha em pé",3,"12-15",["panturrilha"]),
      mkEx("Prancha",3,"30-45s",["abdomen"])]},
    ter:{nome:"B · Costas e Ombros", ativo:true, exercicios:[
      mkEx("Puxada na polia (pegada aberta)",4,"8-12",["costas","biceps"]),
      mkEx("Remada unilateral com halter",3,"10-12 por lado",["costas"]),
      mkEx("Desenvolvimento com halteres",3,"8-12",["ombros","triceps"]),
      mkEx("Elevação lateral",3,"12-15",["ombros"]),
      mkEx("Face pull",3,"12-15",["ombros","costas"])]},
    qua:{nome:"C · Glúteos e Posterior", ativo:true, exercicios:[
      mkEx("Stiff (levantamento terra romeno)",4,"8-12",["posterior","gluteos"]),
      mkEx("Hip thrust",4,"10-15",["gluteos"]),
      mkEx("Cadeira abdutora",3,"15-20",["gluteos"]),
      mkEx("Elevação de panturrilha sentado",3,"12-15",["panturrilha"])]},
    qui:{nome:"D · Peito e Braços", ativo:true, exercicios:[
      mkEx("Supino inclinado com halteres",3,"8-12",["peito","triceps"]),
      mkEx("Supino na smith (ou máquina)",3,"8-12",["peito","triceps"]),
      mkEx("Crucifixo (voador)",3,"12-15",["peito"]),
      mkEx("Rosca direta",3,"10-12",["biceps"]),
      mkEx("Tríceps na polia (corda)",3,"10-15",["triceps"])]},
    sex:{nome:"E · Pernas e Glúteos", ativo:true, exercicios:[
      mkEx("Leg press",4,"10-15",["quadriceps","gluteos"]),
      mkEx("Mesa flexora",3,"10-12",["posterior"]),
      mkEx("Cadeira extensora",3,"12-15",["quadriceps"]),
      mkEx("Elevação de panturrilha em pé",3,"12-15",["panturrilha"]),
      mkEx("Elevação de pernas",3,"12-15",["abdomen"])]},
    sab:{nome:"F · Costas e Ombros", ativo:true, exercicios:[
      mkEx("Remada curvada com barra",3,"8-12",["costas","biceps"]),
      mkEx("Puxada na polia (pegada aberta)",3,"8-12",["costas","biceps"]),
      mkEx("Elevação lateral no cabo",3,"15-20",["ombros"]),
      mkEx("Crucifixo invertido",3,"12-15",["ombros"]),
      mkEx("Rosca alternada com halteres",3,"10-12",["biceps"])]},
    dom:{nome:"Descanso", ativo:false, exercicios:[]}
  };
}

/* ============================================================
   TEMPLATES DE ROTINA — pontos de partida alternativos ao PPL padrão,
   aplicáveis de dentro de "Editar rotina" (substitui o rascunho em
   edição, nunca a rotina salva direto — só confirma ao clicar em
   "Salvar rotina"). Reaproveita nomes de exercício já conhecidos do
   app (cargas/alternativas/notas técnicas funcionam igual).
   ============================================================ */
function buildUpperLowerRotina(){
  return {
    seg:{nome:"Upper A", ativo:true, exercicios:[
      {nome:"Supino reto", series:4, reps:"6-10", metaReps:32, musculos:["peito","triceps"]},
      {nome:"Remada curvada com barra", series:4, reps:"6-10", metaReps:32, musculos:["costas","biceps"]},
      {nome:"Desenvolvimento com halteres", series:3, reps:"8-12", metaReps:40, musculos:["ombros","triceps"]},
      {nome:"Puxada na polia (pegada aberta)", series:3, reps:"8-12", metaReps:30, musculos:["costas","biceps"]},
      {nome:"Rosca direta", series:3, reps:"10-12", metaReps:33, musculos:["biceps"]},
      {nome:"Tríceps na polia (corda)", series:3, reps:"10-15", metaReps:39, musculos:["triceps"]}]},
    ter:{nome:"Lower A", ativo:true, exercicios:[
      {nome:"Agachamento livre", series:4, reps:"6-10", metaReps:32, musculos:["quadriceps","gluteos"]},
      {nome:"Stiff (levantamento terra romeno)", series:3, reps:"8-12", metaReps:30, musculos:["posterior","gluteos"]},
      {nome:"Leg press", series:3, reps:"10-15", metaReps:39, musculos:["quadriceps","gluteos"]},
      {nome:"Mesa flexora", series:3, reps:"10-12", metaReps:33, musculos:["posterior"]},
      {nome:"Elevação de panturrilha em pé", series:4, reps:"12-15", metaReps:56, musculos:["panturrilha"]},
      {nome:"Prancha", series:3, reps:"30-45s", metaReps:3, musculos:["abdomen"]}]},
    qua:{nome:"Descanso", ativo:false, exercicios:[]},
    qui:{nome:"Upper B", ativo:true, exercicios:[
      {nome:"Supino inclinado com halteres", series:4, reps:"8-12", metaReps:40, musculos:["peito","triceps"]},
      {nome:"Remada unilateral com halter", series:3, reps:"10-12 por lado", metaReps:66, musculos:["costas"]},
      {nome:"Elevação lateral", series:3, reps:"12-15", metaReps:42, musculos:["ombros"]},
      {nome:"Barra fixa (ou puxada frente)", series:3, reps:"6-10", metaReps:24, musculos:["costas","biceps"]},
      {nome:"Rosca alternada com halteres", series:3, reps:"10-12", metaReps:33, musculos:["biceps"]},
      {nome:"Tríceps francês", series:3, reps:"10-12", metaReps:33, musculos:["triceps"]}]},
    sex:{nome:"Lower B", ativo:true, exercicios:[
      {nome:"Levantamento terra", series:3, reps:"5-8", metaReps:21, musculos:["costas","posterior","gluteos"]},
      {nome:"Hip thrust", series:3, reps:"10-15", metaReps:39, musculos:["gluteos"]},
      {nome:"Cadeira extensora", series:3, reps:"12-15", metaReps:42, musculos:["quadriceps"]},
      {nome:"Avanço (afundo) com halteres", series:3, reps:"10-12 por perna", metaReps:66, musculos:["quadriceps","gluteos"]},
      {nome:"Elevação de panturrilha sentado", series:4, reps:"12-15", metaReps:56, musculos:["panturrilha"]},
      {nome:"Abdominal supra (crunch)", series:3, reps:"15-20", metaReps:54, musculos:["abdomen"]}]},
    sab:{nome:"Descanso", ativo:false, exercicios:[]},
    dom:{nome:"Descanso", ativo:false, exercicios:[]},
  };
}
function buildFullBodyRotina(){
  return {
    seg:{nome:"Full Body A", ativo:true, exercicios:[
      {nome:"Agachamento livre", series:3, reps:"8-12", metaReps:30, musculos:["quadriceps","gluteos"]},
      {nome:"Supino reto", series:3, reps:"8-12", metaReps:30, musculos:["peito","triceps"]},
      {nome:"Remada curvada com barra", series:3, reps:"8-12", metaReps:30, musculos:["costas","biceps"]},
      {nome:"Desenvolvimento com halteres", series:2, reps:"10-12", metaReps:22, musculos:["ombros","triceps"]},
      {nome:"Rosca direta", series:2, reps:"10-12", metaReps:22, musculos:["biceps"]},
      {nome:"Elevação de panturrilha em pé", series:3, reps:"12-15", metaReps:42, musculos:["panturrilha"]}]},
    ter:{nome:"Descanso", ativo:false, exercicios:[]},
    qua:{nome:"Full Body B", ativo:true, exercicios:[
      {nome:"Levantamento terra", series:3, reps:"5-8", metaReps:21, musculos:["costas","posterior","gluteos"]},
      {nome:"Supino inclinado com halteres", series:3, reps:"8-12", metaReps:30, musculos:["peito","triceps"]},
      {nome:"Puxada na polia (pegada aberta)", series:3, reps:"8-12", metaReps:30, musculos:["costas","biceps"]},
      {nome:"Elevação lateral", series:3, reps:"12-15", metaReps:42, musculos:["ombros"]},
      {nome:"Tríceps na polia (corda)", series:2, reps:"10-15", metaReps:26, musculos:["triceps"]},
      {nome:"Prancha", series:3, reps:"30-45s", metaReps:3, musculos:["abdomen"]}]},
    qui:{nome:"Descanso", ativo:false, exercicios:[]},
    sex:{nome:"Full Body C", ativo:true, exercicios:[
      {nome:"Leg press", series:3, reps:"10-15", metaReps:39, musculos:["quadriceps","gluteos"]},
      {nome:"Supino na smith (ou máquina)", series:3, reps:"8-12", metaReps:30, musculos:["peito","triceps"]},
      {nome:"Remada unilateral com halter", series:3, reps:"10-12 por lado", metaReps:66, musculos:["costas"]},
      {nome:"Stiff (levantamento terra romeno)", series:3, reps:"8-12", metaReps:30, musculos:["posterior","gluteos"]},
      {nome:"Rosca alternada com halteres", series:2, reps:"10-12", metaReps:22, musculos:["biceps"]},
      {nome:"Abdominal supra (crunch)", series:3, reps:"15-20", metaReps:54, musculos:["abdomen"]}]},
    sab:{nome:"Descanso", ativo:false, exercicios:[]},
    dom:{nome:"Descanso", ativo:false, exercicios:[]},
  };
}

/* ============================================================
   v98 — Fase 2: plano inicial por perfil (experiência, dias, equipamento, objetivo e idade; nunca por sexo)
   planoInicial(perfil) → {rotina, split, sessoes, porque:[...]}. É só a SUGESTÃO inicial: a pessoa edita tudo em Editar rotina.
   ============================================================ */
const EXP_SESSOES_MAX = {iniciante:3, intermediario:4, avancado:6};   // sessões por semana que o nível sustenta com boa recuperação
const SUBST_LOCAL = {
  casa: {   // halteres, elásticos e um banco: troca barras, máquinas e cabos
    "Agachamento livre":["Agachamento goblet (com halter)","10-15"],
    "Supino reto":["Supino com halteres"],
    "Remada curvada com barra":["Remada curvada com halteres"],
    "Levantamento terra":["Stiff (levantamento terra romeno)","8-12"],
    "Hip thrust":["Hip thrust com halter"],
    "Puxada na polia (pegada aberta)":["Remada com elástico","10-15"],
    "Barra fixa (ou puxada frente)":["Puxada com elástico","10-15"],
    "Tríceps na polia (corda)":["Tríceps francês"],
    "Leg press":["Agachamento búlgaro","8-12 por perna"],
    "Supino na smith (ou máquina)":["Supino com halteres"],
    "Cadeira extensora":["Avanço (afundo) com halteres","10-12 por perna"],
    "Mesa flexora":["Stiff unilateral com halter","8-12 por perna"],
    "Cadeira abdutora":["Abdução de quadril com elástico","15-20"],
    "Desenvolvimento militar com barra":["Desenvolvimento com halteres"],
    "Face pull":["Crucifixo invertido com halteres","12-15"],
    "Remada cavalinho (T-bar)":["Remada unilateral com halter","10-12 por lado"],
    "Crucifixo (voador)":["Crucifixo com halteres"],
    "Elevação lateral no cabo":["Elevação lateral"],
    "Rosca direta":["Rosca alternada com halteres"],
  },
  pouco: {  // peso do corpo e, no máximo, um elástico
    "Agachamento livre":["Agachamento com peso do corpo","12-20"],
    "Supino reto":["Flexão de braço","8-15"],
    "Supino inclinado com halteres":["Flexão com pés elevados","8-15"],
    "Supino na smith (ou máquina)":["Flexão de braço","8-15"],
    "Remada curvada com barra":["Remada com elástico","10-15"],
    "Remada unilateral com halter":["Remada com elástico (unilateral)","10-15 por lado"],
    "Remada cavalinho (T-bar)":["Remada com elástico (unilateral)","10-15 por lado"],
    "Puxada na polia (pegada aberta)":["Remada com elástico","10-15"],
    "Barra fixa (ou puxada frente)":["Remada com elástico","10-15"],
    "Levantamento terra":["Stiff unilateral sem peso","10-12 por perna"],
    "Stiff (levantamento terra romeno)":["Stiff unilateral sem peso","10-12 por perna"],
    "Desenvolvimento com halteres":["Flexão pike (quadril alto)","8-12"],
    "Desenvolvimento militar com barra":["Flexão pike (quadril alto)","8-12"],
    "Elevação lateral":["Elevação lateral com elástico","12-20"],
    "Elevação lateral no cabo":["Elevação lateral com elástico","12-20"],
    "Rosca direta":["Rosca com elástico","10-15"],
    "Rosca alternada com halteres":["Rosca com elástico","10-15"],
    "Tríceps na polia (corda)":["Mergulho (dips) no banco","8-15"],
    "Tríceps francês":["Mergulho (dips) no banco","8-15"],
    "Leg press":["Avanço (afundo) com peso do corpo","10-15 por perna"],
    "Avanço (afundo) com halteres":["Avanço (afundo) com peso do corpo","10-15 por perna"],
    "Cadeira extensora":["Agachamento búlgaro","8-12 por perna"],
    "Mesa flexora":["Ponte de glúteo","12-20"],
    "Hip thrust":["Ponte de glúteo","12-20"],
    "Cadeira abdutora":["Abdução de quadril com elástico","15-20"],
    "Elevação de panturrilha em pé":["Elevação de panturrilha em degrau","12-20"],
    "Elevação de panturrilha sentado":["Elevação de panturrilha em degrau","12-20"],
    "Crucifixo (voador)":["Crucifixo com elástico","12-15"],
    "Face pull":["Crucifixo invertido com elástico","12-15"],
  },
};
function metaRepsDe(series, reps, antigo){
  const r = String(reps || "");
  let m = r.match(/^(\d+)-(\d+)$/);
  if(m) return Math.ceil(series * (Number(m[1]) + Number(m[2])) / 2);
  m = r.match(/^(\d+)-(\d+) por (lado|perna)$/);
  if(m) return Math.ceil(series * (Number(m[1]) + Number(m[2])) / 2) * 2;
  if(/^\d+-\d+s$/.test(r)) return series;
  return antigo || series;
}
/* adapta um modelo de rotina ao perfil: equipamento, iniciante/menor de idade (sem carga máxima) e exercícios repetidos */
function adaptarRotinaAoPerfil(base, o){
  const rotina = JSON.parse(JSON.stringify(base));
  const suave = o.menor || o.exp === "iniciante";   // sem séries de 5 a 8 repetições (carga próxima do máximo)
  DAYS.forEach(k=>{
    const d = rotina[k]; if(!d || !d.ativo) return;
    const vistos = {}, saida = [];
    d.exercicios.forEach(ex0=>{
      const ex = Object.assign({}, ex0);
      if(suave && ex.nome === "Levantamento terra"){ ex.nome = "Stiff (levantamento terra romeno)"; ex.reps = "8-12"; delete ex.nota; }
      if(suave && (ex.reps === "5-8" || ex.reps === "6-10")) ex.reps = "8-12";
      const sub = o.local !== "academia" && SUBST_LOCAL[o.local] && SUBST_LOCAL[o.local][ex.nome];
      if(sub){ ex.nome = sub[0]; if(sub[1]) ex.reps = sub[1]; delete ex.nota; }
      if(vistos[ex.nome]){ const keep = vistos[ex.nome]; keep.series = Math.min(5, keep.series + ex.series); keep.metaReps = metaRepsDe(keep.series, keep.reps, keep.metaReps); return; }
      ex.metaReps = metaRepsDe(ex.series, ex.reps, ex.metaReps);
      vistos[ex.nome] = ex; saida.push(ex);
    });
    d.exercicios = saida;
  });
  return rotina;
}
/* mantém cada músculo dentro da faixa de volume do app: sobe até o MEV (só quem não é iniciante) e nunca passa do MRV */
function equilibrarVolumeInicial(rotina, exp){
  const lista = ()=>{ const a=[]; DAYS.forEach(k=>{ const d=rotina[k]; if(d && d.ativo) d.exercicios.forEach(e=> a.push(e)); }); return a; };
  const totais = ()=>{ const t={}; lista().forEach(e=> (e.musculos||[]).forEach(m=>{ t[m] = (t[m]||0) + (Number(e.series)||0); })); return t; };
  const muda = (e, delta)=>{ e.series += delta; e.metaReps = metaRepsDe(e.series, e.reps, e.metaReps); };
  const limitar = ()=>{
    for(let guard=0; guard<30; guard++){
      const t = totais();
      const m = Object.keys(t).find(k=> MUSCLE_LANDMARKS[k] && t[k] > MUSCLE_LANDMARKS[k].mrv);
      if(!m) return;
      const cand = lista().filter(e=> (e.musculos||[]).indexOf(m) >= 0 && e.series > 2)
        .sort((a,b)=> (b.musculos.indexOf(m) - a.musculos.indexOf(m)) || (b.series - a.series));   // tira primeiro de quem usa o músculo como apoio
      if(!cand.length) return;
      muda(cand[0], -1);
    }
  };
  if(exp !== "iniciante"){
    ["peito","costas","ombros","quadriceps","posterior"].forEach(m=>{
      for(let guard=0; guard<6; guard++){
        if((totais()[m]||0) >= MUSCLE_LANDMARKS[m].mev) break;
        const cand = lista().filter(e=> (e.musculos||[])[0] === m && e.series < 4).sort((a,b)=> a.series - b.series);
        if(!cand.length) break;
        muda(cand[0], 1);
      }
    });
  }
  limitar();
  return rotina;
}
function planoInicial(p){
  const exp = p && EXP_SESSOES_MAX[p.experiencia] ? p.experiencia : "iniciante";
  const local = p && (p.local === "casa" || p.local === "pouco") ? p.local : "academia";
  const menor = !!(p && menorDeIdade(p.idade));
  const objetivo = p && (p.objetivo === "superavit" || (p.objetivo === "deficit" && !menor)) ? p.objetivo : "manutencao";   // F3: menor de 18 nunca recebe texto de emagrecimento
  const pedidos = Math.max(2, Math.min(6, Math.round(Number(p && p.diasSemana)) || EXP_SESSOES_MAX[exp]));
  const n = Math.min(pedidos, EXP_SESSOES_MAX[exp]);
  let base, split;
  if(n <= 3){
    split = "Full Body";
    base = buildFullBodyRotina();
    if(n === 2){   // 2 sessões: A na segunda e B na quinta, mantendo 2 dias de folga entre elas
      base = Object.assign({}, base, {qua:{nome:"Descanso", ativo:false, exercicios:[]}, qui:base.qua, sex:{nome:"Descanso", ativo:false, exercicios:[]}});
    }
  } else if(n === 4){
    split = "Upper/Lower";
    base = buildUpperLowerRotina();
  } else if(n === 5){
    split = "A, B, C + Upper e Lower";
    const ppl = buildPPLRotina(), ul = buildUpperLowerRotina(), rest = {nome:"Descanso", ativo:false, exercicios:[]};
    base = {seg:ppl.seg, ter:ppl.ter, qua:ppl.qua, qui:rest, sex:ul.qui, sab:ul.sex, dom:rest};
  } else {
    split = "A–F (Peito, Costas e Pernas 2×)";
    base = buildPPLRotina();
  }
  const rotina = equilibrarVolumeInicial(adaptarRotinaAoPerfil(base, {local, menor, exp}), exp);
  const porque = [];
  porque.push(exp === "iniciante"
    ? "Você está começando: treinar o corpo todo "+n+"× por semana dá prática em cada movimento e deixa dias de descanso entre as sessões."
    : split === "Full Body"
      ? "Com "+n+" dias por semana, treinar o corpo todo em cada sessão faz cada músculo trabalhar 2× ou mais por semana, que é o que mais rende."
      : n === 4
        ? "Upper/Lower em 4 dias: parte de cima e parte de baixo, cada uma 2× por semana, com descanso entre os dias parecidos."
        : "Com "+n+" sessões por semana, cada grupo principal (peito e ombros, costas e pernas) é treinado 2×, com mais volume por sessão.");
  if(pedidos > n) porque.push("Você escolheu "+pedidos+" dias, mas para o seu nível o plano usa "+n+" sessões: é o que dá para recuperar bem. Nos outros dias, caminhe ou faça uma atividade leve. Dá para adicionar sessões em Editar rotina quando quiser.");
  if(local === "casa") porque.push("Os exercícios foram adaptados para o que você tem em casa (halteres, elásticos e banco).");
  if(local === "pouco") porque.push("Os exercícios foram adaptados para pouco equipamento: peso do corpo e, se tiver, um elástico.");
  if(menor) porque.push("Como você tem menos de 18 anos, o plano evita carga máxima: sem levantamento terra pesado e sempre com 8 ou mais repetições por série. Técnica antes de peso.");
  else if(exp === "iniciante") porque.push("Nas primeiras semanas, use cargas que deixem 2 a 3 repetições sobrando no fim da série e troque o terra pelo stiff, que é mais fácil de aprender.");
  porque.push(objetivo === "superavit" ? "Objetivo ganhar massa: aumente a carga aos poucos quando passar do topo da faixa de repetições e cuide da alimentação na aba Dieta."
    : objetivo === "deficit" ? "Objetivo emagrecer: o treino de força segue sendo a base; a diferença está na alimentação (aba Dieta) e em caminhar nos dias de descanso."
    : "Objetivo manter e ficar ativo: o foco é criar o hábito. Treinou, está valendo. Ajuste as cargas aos poucos.");
  return {rotina, split, sessoes:n, exp, local, porque};
}

/* v98: a rotina inicial vem do perfil (experiência, dias, equipamento, objetivo e idade). Sem perfil: Full Body 3× (o que o app recomenda para iniciantes). */
function defaultRotina(perfil){ return planoInicial(perfil || null).rotina; }
const ROTINA_TEMPLATES = {
  ppl: {label:"A–F — Peito, Costas e Pernas 2× (PPL)", desc:"6 dias de treino (Peito e Ombros, Costas e Bíceps e Pernas, 2× cada), 1 de descanso. Pra quem já tem mais experiência e tempo disponível.", build: ()=> buildPPLRotina()},
  pernasGluteos: {label:"A–F — Ênfase em pernas e glúteos", desc:"6 dias de treino: pernas e glúteos 3× por semana, costas e ombros 2×, peito e braços 1×; 1 de descanso. Para quem quer mais volume em pernas e glúteos (opção, não sugestão automática).", build: buildPernasGluteosRotina},
  upperLower: {label:"Upper/Lower (4×/semana)", desc:"4 dias de treino (Superior/Inferior 2×), 3 de descanso. Bom equilíbrio entre frequência e recuperação — indicado pra nível intermediário.", build: buildUpperLowerRotina},
  fullBody: {label:"Full Body (3×/semana)", desc:"3 dias de treino com o corpo inteiro, 4 de descanso. Ideal pra quem está começando ou tem pouco tempo disponível por semana.", build: buildFullBodyRotina},
};

// Faixas de referência gerais MEV/MAV/MRV (séries/semana), com base no
// framework de volume da Renaissance Periodization — valores de partida,
// não regras fixas; ajuste conforme sua experiência e recuperação.
const MUSCLE_LANDMARKS = {
  peito:        {label:"Peito",             mev:8,  mav:14, mrv:22},
  costas:       {label:"Costas",            mev:10, mav:16, mrv:25},
  ombros:       {label:"Ombros",            mev:8,  mav:16, mrv:26},
  biceps:       {label:"Bíceps",            mev:6,  mav:14, mrv:26},
  triceps:      {label:"Tríceps",           mev:6,  mav:12, mrv:18},
  quadriceps:   {label:"Quadríceps",        mev:8,  mav:14, mrv:20},
  posterior:    {label:"Posterior de coxa", mev:6,  mav:12, mrv:20},
  gluteos:      {label:"Glúteos",           mev:4,  mav:10, mrv:16},
  panturrilha:  {label:"Panturrilha",       mev:8,  mav:12, mrv:20},
  abdomen:      {label:"Abdômen",           mev:0,  mav:16, mrv:25},
};
const MUSCLE_ORDER = ["peito","costas","ombros","biceps","triceps","quadriceps","posterior","gluteos","panturrilha","abdomen"];
const MUSCLE_CATEGORY = {
  peito:"Peito, ombros e tríceps", ombros:"Peito, ombros e tríceps", triceps:"Peito, ombros e tríceps",
  costas:"Costas e bíceps", biceps:"Costas e bíceps",
  quadriceps:"Pernas", posterior:"Pernas", gluteos:"Pernas", panturrilha:"Pernas",
  abdomen:"Core",
};
/* v96: renomeia os dias que ainda têm o nome padrão antigo (Empurrar A, Puxar A…). Nomes personalizados não são tocados. */
const NOMES_DIAS_ANTIGOS = {seg:["Empurrar A","A · Peito e Ombros"], ter:["Puxar A","B · Costas e Bíceps"], qua:["Pernas A","C · Pernas"],
  qui:["Empurrar B","D · Peito e Ombros"], sex:["Puxar B","E · Costas e Bíceps"], sab:["Pernas B","F · Pernas"]};
function migrarNomesDias(r){
  const mudou = [];
  Object.keys(NOMES_DIAS_ANTIGOS).forEach(k=>{
    const d = r && r[k]; const m = NOMES_DIAS_ANTIGOS[k];
    if(d && d.nome === m[0]){ r[k] = Object.assign({}, d, {nome:m[1]}); mudou.push(k); }
  });
  return mudou;
}
const CATEGORY_ORDER = ["Peito, ombros e tríceps","Costas e bíceps","Pernas","Core"];

/* ============================================================
   v97 — FOCO CORPORAL (até 2 grupos): meta de séries maior no grupo escolhido, dica e missão semanal.
   O foco muda ONDE você coloca mais volume de treino. Não escolhe onde o corpo perde gordura.
   ============================================================ */
const FOCOS = [
  {id:"corpo_todo",  label:"Corpo todo (full body)", musc:[]},   // sem grupo extra: o volume segue equilibrado em todos os músculos
  {id:"gluteos",     label:"Glúteos",        musc:["gluteos"]},
  {id:"pernas",      label:"Pernas (coxas)", musc:["quadriceps","posterior"]},
  {id:"panturrilha", label:"Panturrilhas",   musc:["panturrilha"]},
  {id:"costas",      label:"Costas",         musc:["costas"]},
  {id:"peito",       label:"Peito",          musc:["peito"]},
  {id:"ombros",      label:"Ombros",         musc:["ombros"]},
  {id:"bracos",      label:"Braços",         musc:["biceps","triceps"]},
  {id:"abdomen",     label:"Abdômen",        musc:["abdomen"]},
];
const FOCO_DICAS = {
  corpo_todo:"Treino de corpo inteiro: o app mantém o volume equilibrado entre todos os grupos, sem meta extra em nenhum. Combine empurrar, puxar, pernas e core ao longo da semana.",
  gluteos:"Hip thrust e avanço pegam o glúteo em posições diferentes; use os dois ao longo da semana. No hip thrust, suba até alinhar quadril, joelho e ombro e aperte o glúteo no topo.",
  pernas:"Combine um exercício de quadríceps (agachamento, leg press, extensora) com um de posterior (stiff, flexora) para manter a coxa equilibrada.",
  panturrilha:"Faça em pé e sentado: o exercício em pé e o sentado exigem partes diferentes da panturrilha (gastrocnêmio e sóleo).",
  costas:"Puxe levando os cotovelos para baixo e para trás, não só com as mãos, e alterne puxadas (vertical) com remadas (horizontal).",
  peito:"Varie o ângulo ao longo da semana (reto e inclinado) e desça o peso com controle até sentir o peito alongar.",
  ombros:"A elevação lateral trabalha a parte do meio do ombro: use uma carga que você controle, sem balançar o tronco.",
  bracos:"Bíceps e tríceps já trabalham nos dias de costas e de peito. Só some séries diretas se o cartão de volume ainda estiver abaixo da meta.",
  abdomen:"Prancha e elevação de pernas pedem controle e respiração, mais que velocidade.",
};
function focosDoPerfil(p){
  if(p === undefined) p = state.perfil;
  return (p && Array.isArray(p.focos)) ? p.focos.filter(id=> FOCOS.some(f=> f.id === id)).slice(0,2) : [];
}
function focoMusculos(p){
  const set = new Set();
  focosDoPerfil(p).forEach(id=>{ FOCOS.find(f=> f.id === id).musc.forEach(m=> set.add(m)); });
  return set;
}
function focoAlvo(m){ const lm = MUSCLE_LANDMARKS[m]; return Math.min(lm.mrv, Math.round((lm.mav + lm.mrv) / 2)); }
function focoNomes(p){ return focosDoPerfil(p).map(id=> FOCOS.find(f=> f.id === id).label); }
function diasComFoco(musSet){
  return DAYS.filter(k=>{
    const d = state.rotina[k];
    return d && d.ativo && (d.exercicios||[]).some(e=> (e.musculos||[]).some(m=> musSet.has(m)));
  });
}
function focoChipsHtml(sel){
  const todo = FOCOS[0], on0 = sel.indexOf(todo.id) >= 0;
  return '<div class="foco-chips" role="group" aria-label="Foco corporal: até 2 grupos, ou Corpo todo">'+
    '<button type="button" class="muscle-chip foco-chip foco-todo'+(on0?' on':'')+'" data-foco="'+todo.id+'" aria-pressed="'+on0+'"><b>Corpo todo (full body)</b><span>Treino equilibrado, sem prioridade em um grupo</span></button>'+
    '<div class="foco-sep" aria-hidden="true">ou escolha até 2 grupos para dar mais atenção</div>'+
    FOCOS.slice(1).map(f=>{
      const on = sel.indexOf(f.id) >= 0;
      return '<button type="button" class="muscle-chip foco-chip'+(on?' on':'')+'" data-foco="'+f.id+'" aria-pressed="'+on+'">'+f.label+'</button>';
    }).join("")+'</div>';
}
function wireFocoChips(root, sel, onMsg, onTouch){
  root.querySelectorAll(".foco-chip").forEach(b=> b.addEventListener("click", ()=>{
    const id = b.dataset.foco, i = sel.indexOf(id);
    if(i >= 0) sel.splice(i, 1);
    else if(id === "corpo_todo"){ sel.length = 0; sel.push(id); }   // "corpo todo" é exclusivo: tira os grupos
    else {
      const t = sel.indexOf("corpo_todo"); if(t >= 0) sel.splice(t, 1);   // escolher um grupo tira o "corpo todo"
      if(sel.length >= 2){ if(onMsg) onMsg("Escolha até 2 focos. Toque em um escolhido para trocar."); return; }
      sel.push(id);
    }
    root.querySelectorAll(".foco-chip").forEach(x=>{ const on = sel.indexOf(x.dataset.foco) >= 0; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); });
    if(onMsg) onMsg("");
    if(onTouch) onTouch();
  }));
}
function focoBoxHtml(){
  const ids = focosDoPerfil();
  if(!ids.length){
    return '<div class="foco-box" id="foco-box"><div class="foco-top"><div><b>Foco corporal'+tipBtn("foco")+'</b><span>Escolha o seu foco: até 2 grupos (glúteos, pernas, costas…) para o app subir a meta de séries neles, mostrar uma dica e criar uma missão semanal, ou Corpo todo.</span></div>'+
      '<button type="button" class="btn small" data-foco-edit>Escolher foco</button></div></div>';
  }
  if(ids.indexOf("corpo_todo") >= 0){
    return '<div class="foco-box" id="foco-box"><div class="foco-top"><div><b>Foco: Corpo todo (full body)'+tipBtn("foco")+'</b><span>O volume fica equilibrado entre todos os grupos, sem meta extra em nenhum.</span></div>'+
      '<button type="button" class="btn small ghost" data-foco-edit>Mudar foco</button></div></div>';
  }
  const itens = ids.map(id=>{
    const f = FOCOS.find(x=> x.id === id);
    const n = diasComFoco(new Set(f.musc)).length;
    const freq = n >= 2 ? 'Treinado em '+n+' dias por semana: boa frequência.'
      : n === 1 ? 'Só 1 dia por semana na rotina: com 2 ou mais dias o músculo costuma crescer melhor com o mesmo volume (Schoenfeld et al., 2016).'
      : 'Nenhum dia da rotina treina esse grupo ainda: adicione um exercício em Editar rotina.';
    return '<div class="foco-item"><b>'+f.label+'</b><span>'+freq+'</span><span>'+FOCO_DICAS[id]+'</span></div>';
  }).join("");
  return '<div class="foco-box" id="foco-box"><div class="foco-top"><div><b>Foco: '+focoNomes().join(" e ")+tipBtn("foco")+'</b><span>A meta de séries destes grupos está maior. O foco muda onde você coloca mais treino, não onde o corpo perde gordura.</span></div>'+
    '<button type="button" class="btn small ghost" data-foco-edit>Mudar foco</button></div>'+itens+'</div>';
}
/* escolha rápida do foco (conta antiga sem foco, ou "Mudar foco" no Treino): salva só o foco no perfil */
function openFocoEscolha(){
  if(!state.perfil) return;
  const sel = focosDoPerfil().slice();
  const body = document.createElement("div");
  body.innerHTML = '<h2>Qual é o seu foco corporal?</h2>'+
    '<div class="sub">Escolha até 2 grupos para dar mais atenção, ou Corpo todo (full body) para treinar tudo por igual. Dá para mudar quando quiser.</div>'+
    focoChipsHtml(sel)+'<div class="foco-msg" id="foco-esc-msg" aria-live="polite"></div>'+
    '<div class="foot-note u-err" id="foco-esc-erro" role="alert"></div>'+
    '<div class="modal-actions"><button class="btn" id="foco-esc-cancel">Agora não</button><button class="btn primary" id="foco-esc-ok">Salvar foco</button></div>';
  openModal(body);
  wireFocoChips(body, sel, msg=>{ body.querySelector("#foco-esc-msg").textContent = msg; body.querySelector("#foco-esc-erro").textContent = ""; });
  body.querySelector("#foco-esc-cancel").addEventListener("click", closeModal);
  body.querySelector("#foco-esc-ok").addEventListener("click", ()=>{
    if(!sel.length){ body.querySelector("#foco-esc-erro").textContent = "Escolha até 2 grupos ou Corpo todo."; return; }
    const data = Object.assign({}, state.perfil, {focos: sel.slice(0,2)});
    state.perfil = data;
    closeModal(); render();
    saveDoc("config/perfil", data);
    showToast("Foco salvo.");
  });
}
function missaoFoco(days){
  const ids = focosDoPerfil();
  if(!ids.length) return null;
  const hit = diasComFoco(focoMusculos());
  if(!hit.length) return null;
  const hitSet = new Set(hit);
  const feitos = days.filter(iso=>{ const c = state.checkins[iso]; return hitSet.has(treinoKey(iso)) && c && c.concluido && !c.leve; }).length;
  const tot = Math.min(2, hit.length);
  return {
    nome:"Foco: "+focoNomes().join(" e "),
    desc:"Treine o foco em "+(tot === 1 ? "1 dia" : "2 dias")+" nesta semana (os dias da rotina que trabalham esse grupo).",
    progress:Math.min(feitos, tot), total:tot, done:feitos >= tot,
  };
}
let CHART_GRAD_SEQ = 0;

document.getElementById("btn-toggle-ciencia").addEventListener("click", ()=>{
  const body = document.getElementById("ciencia-body");
  const label = document.getElementById("ciencia-toggle-label");
  const hidden = !body.hidden;
  body.hidden = hidden;
  label.textContent = hidden ? "Mostrar" : "Ocultar";
});

function computeVolumeTotals(){
  const totals = {};
  MUSCLE_ORDER.forEach(m=> totals[m]=0);
  DAYS.forEach(key=>{
    const day = state.rotina[key];
    if(!day || !day.ativo) return;
    (day.exercicios||[]).forEach(ex=>{
      (ex.musculos||[]).forEach(m=>{
        if(totals[m]!=null) totals[m] += Number(ex.series)||0;
      });
    });
  });
  return totals;
}
function renderVolume(){
  const el = document.getElementById("volume-body");
  if(!el) return;
  const totals = computeVolumeTotals();
  const focoSet = focoMusculos();
  const byCat = {};
  CATEGORY_ORDER.forEach(c=> byCat[c]=[]);
  MUSCLE_ORDER.forEach(m=>{
    const cat = MUSCLE_CATEGORY[m];
    if(byCat[cat]) byCat[cat].push(m);
  });

  const catsHtml = CATEGORY_ORDER.map(cat=>{
    const muscles = byCat[cat];
    if(!muscles.length) return "";
    const rows = muscles.map(m=>{
      const lm = MUSCLE_LANDMARKS[m];
      const vol = totals[m]||0;
      const scaleMax = Math.max(lm.mrv * 1.2, vol * 1.05);
      const pct = v => Math.max(0, Math.min(100, (v/scaleMax)*100));
      let fillClass = "";
      if(vol < lm.mev) fillClass = "warn";
      else if(vol > lm.mrv) fillClass = "crit";
      const foco = focoSet.has(m), alvo = focoAlvo(m);
      return '<div class="volA-row'+(foco?' foco':'')+'"><span class="m-name">'+lm.label+(foco?'<span class="foco-tag">foco</span>':'')+'</span>'+
        '<div class="volA-track">'+
          '<div class="volA-zone" style="left:'+pct(lm.mev).toFixed(1)+'%; width:'+(pct(lm.mrv)-pct(lm.mev)).toFixed(1)+'%;"></div>'+
          '<div class="volA-fill '+fillClass+'" style="width:'+pct(vol).toFixed(1)+'%;"></div>'+
          (foco ? '<div class="volA-goal" style="left:calc('+pct(alvo).toFixed(1)+'% - 1px);" title="Meta do foco: '+alvo+' séries"></div>' : '')+
        '</div>'+
        '<span class="volA-val">'+vol+'/'+lm.mrv+'</span>'+
        (foco ? '<div class="volA-foco-note">Meta do foco: '+alvo+' séries por semana · '+(vol >= alvo ? 'meta atingida' : 'faltam '+(alvo - vol))+'</div>' : '')+
        '</div>';
    }).join("");
    return '<div class="volA-cat"><div class="volA-cat-h">'+cat+'</div>'+rows+'</div>';
  }).join("");

  // v95 (T4): balanço quadríceps × posterior — referência suave, não regra
  const qd = totals.quadriceps || 0, ps = totals.posterior || 0;
  let balHtml = '';
  if(qd > 0 || ps > 0){
    let aviso = '';
    if(qd >= 4 && ps < qd * 0.5) aviso = ' O posterior está com bem menos séries que o quadríceps — se quiser equilibrar, uma flexora ou um stiff a mais ajuda.';
    else if(ps >= 4 && qd < ps * 0.5) aviso = ' O quadríceps está com bem menos séries que o posterior — se quiser equilibrar, uma extensora ou um agachamento a mais ajuda.';
    balHtml = '<div class="vol-bal'+(aviso?' warn':'')+'" id="vol-bal">Pernas: quadríceps <b>'+qd+'</b> séries × posterior <b>'+ps+'</b>.'+aviso+' <span class="vol-bal-note">É uma referência, não uma regra.</span></div>';
  }
  el.innerHTML = focoBoxHtml() + catsHtml + balHtml +
    '<div class="heat-legend">'+
      '<div class="li"><span class="sw u-bg-teal"></span>Dentro da faixa ideal (entre MEV e MRV)'+tipBtn("mav")+'</div>'+
      '<div class="li"><span class="sw u-bg-warn"></span>Abaixo do MEV (pouco volume pra estimular ganho)'+tipBtn("mev")+'</div>'+
      '<div class="li"><span class="sw u-bg-crit"></span>Acima do MRV (risco de overtraining)'+tipBtn("mrv")+'</div>'+
      '<div class="li"><span class="sw" style="background:color-mix(in srgb, var(--good) 20%, var(--surface-2));"></span>Faixa recomendada (MEV–MRV)</div>'+
    '</div>';
  renderVolumeAdjust();
}

/* ============================================================
   AJUSTE DE VOLUME (v79) — quando um grupo passa do MRV, propõe cortar
   séries dos exercícios onde o músculo é secundário/acessório. Regras:
   nunca abaixo de 2 séries por exercício, nunca derruba outro músculo
   abaixo do MEV, metaReps proporcional. Mostra prévia, só grava ao
   confirmar e oferece "Desfazer" na sessão.
   ============================================================ */
let volAdjOpen = false, volAdjMode = "teto", volAdjUndo = null;
function volTarget(m, mode){
  const lm = MUSCLE_LANDMARKS[m];
  return mode === "folga" ? Math.max(lm.mev, Math.floor((lm.mav + lm.mrv) / 2)) : lm.mrv;
}
function planVolumeAdjust(mode){
  const totals = {}; MUSCLE_ORDER.forEach(m=> totals[m] = 0);
  const items = [];
  DAYS.forEach(k=>{
    const d = state.rotina[k];
    if(!d || !d.ativo) return;
    (d.exercicios||[]).forEach((e,i)=>{
      const sr = Number(e.series) || 0;
      const it = {dia:k, i, nome:e.nome, de:sr, para:sr, meta:Number(e.metaReps)||0,
                  mus:(e.musculos||[]).filter(m=> totals[m] != null)};
      items.push(it);
      it.mus.forEach(m=> totals[m] += sr);
    });
  });
  const antes = Object.assign({}, totals);
  const over = MUSCLE_ORDER.filter(m=> totals[m] > MUSCLE_LANDMARKS[m].mrv);
  const alvo = {}; over.forEach(m=> alvo[m] = volTarget(m, mode));
  const piso = m => over.indexOf(m) >= 0 ? alvo[m] : MUSCLE_LANDMARKS[m].mev;
  for(let guard = 0; guard < 400; guard++){
    const falta = over.filter(m=> totals[m] > alvo[m]);
    if(!falta.length) break;
    let best = null, bestScore = null;
    items.forEach(it=>{
      if(it.para <= 2) return;
      const hit = it.mus.filter(m=> falta.indexOf(m) >= 0);
      if(!hit.length) return;
      if(it.mus.some(m=> totals[m] - 1 < piso(m))) return;
      const score = [hit.length, -(it.mus.length - hit.length), it.mus.indexOf(hit[0]) > 0 ? 1 : 0, it.para];
      let better = false;
      if(!bestScore) better = true;
      else for(let j = 0; j < score.length; j++){ if(score[j] !== bestScore[j]){ better = score[j] > bestScore[j]; break; } }
      if(better){ best = it; bestScore = score; }
    });
    if(!best) break;
    best.para -= 1;
    best.mus.forEach(m=> totals[m] -= 1);
  }
  const changes = items.filter(it=> it.para !== it.de).map(it=> Object.assign(it, {
    metaNova: it.meta ? Math.max(1, Math.round(it.meta * it.para / it.de)) : 0
  }));
  const pendentes = over.filter(m=> totals[m] > MUSCLE_LANDMARKS[m].mrv);
  return {mode, over, antes, depois:totals, alvo, changes, pendentes};
}
function volAdjPreviewHtml(plan){
  if(!plan.changes.length){
    return '<div class="vadj-note">Não achei um corte seguro: qualquer redução deixaria algum exercício abaixo de 2 séries ou outro grupo abaixo do MEV. Ajuste manualmente em <b>Editar rotina</b>.</div>';
  }
  const dias = {};
  plan.changes.forEach(c=> (dias[c.dia] = dias[c.dia] || []).push(c));
  const diasHtml = DAYS.filter(k=> dias[k]).map(k=>
    '<div class="vadj-day"><div class="vadj-day-h">'+DAY_ABBR[k]+' · '+escapeHtml((state.rotina[k]||{}).nome||"")+'</div>'+
    dias[k].map(c=> '<div class="vadj-row"><span>'+escapeHtml(c.nome)+'</span><span class="to"><s>'+c.de+'</s> → '+c.para+' séries</span></div>').join("")+'</div>'
  ).join("");
  const chips = plan.over.map(m=>{
    const lm = MUSCLE_LANDMARKS[m], ok = plan.depois[m] <= lm.mrv;
    return '<span class="vadj-chip '+(ok?'ok':'bad')+'">'+lm.label+' '+plan.antes[m]+' → '+plan.depois[m]+' <span style="opacity:.7">(teto '+lm.mrv+')</span></span>';
  }).join("");
  const colat = MUSCLE_ORDER.filter(m=> plan.over.indexOf(m) < 0 && plan.depois[m] !== plan.antes[m]).map(m=>
    '<span class="vadj-chip">'+MUSCLE_LANDMARKS[m].label+' '+plan.antes[m]+' → '+plan.depois[m]+'</span>').join("");
  return '<div class="vadj-sum">'+chips+'</div>'+
    (colat ? '<div class="vadj-note">Também diminui (exercícios compostos): </div><div class="vadj-sum">'+colat+'</div>' : '')+diasHtml+
    (plan.pendentes.length ? '<div class="vadj-note">Mesmo com o corte, '+plan.pendentes.map(m=> MUSCLE_LANDMARKS[m].label).join(" e ")+' ainda ficam acima do teto — chegar lá exigiria cortar exercício inteiro ou derrubar outro grupo abaixo do MEV. Revise em <b>Editar rotina</b>.</div>' : '')+
    '<div class="vadj-note">Reps-alvo (metaReps) são reduzidas na mesma proporção. Check-ins já feitos não mudam.</div>';
}
(function setupFocoEdit(){
  const el = document.getElementById("volume-body");
  if(el) el.addEventListener("click", e=>{ if(e.target.closest("[data-foco-edit]")) openFocoEscolha(); });
})();
function renderVolumeAdjust(){
  const el = document.getElementById("volume-adjust");
  if(!el) return;
  const totals = computeVolumeTotals();
  const over = MUSCLE_ORDER.filter(m=> totals[m] > MUSCLE_LANDMARKS[m].mrv);
  let html = "";
  if(volAdjUndo){
    html += '<div class="vadj ok"><div class="vadj-h">'+ICON_CHECK_CIRCLE+'<div><b>Volume ajustado</b><span>'+volAdjUndo.n+' '+pl(volAdjUndo.n,'exercício','exercícios')+' em '+volAdjUndo.dias+' '+pl(volAdjUndo.dias,'dia','dias')+' '+pl(volAdjUndo.n,'foi atualizado','foram atualizados')+' na sua rotina.</span></div></div>'+
      '<div class="vadj-actions"><button type="button" class="btn small ghost" data-vadj="undo">'+ICON_UNDO.replace('<svg ','<svg width="16" height="16" ')+' Desfazer</button></div></div>';
  }
  if(over.length){
    const lista = over.map(m=> MUSCLE_LANDMARKS[m].label+' '+totals[m]+'/'+MUSCLE_LANDMARKS[m].mrv).join(' · ');
    let corpo = "";
    if(volAdjOpen){
      const plan = planVolumeAdjust(volAdjMode);
      corpo =
        '<div class="vadj-mode"><span class="vadj-note">Até onde reduzir?</span><div class="seg" role="group" aria-label="Meta do ajuste">'+
          '<button type="button" data-vadj="mode-teto" class="'+(volAdjMode==="teto"?'active':'')+'" aria-pressed="'+(volAdjMode==="teto")+'">Até o teto (MRV)</button>'+
          '<button type="button" data-vadj="mode-folga" class="'+(volAdjMode==="folga"?'active':'')+'" aria-pressed="'+(volAdjMode==="folga")+'">Com folga (meio MAV–MRV)</button>'+
        '</div></div>'+
        volAdjPreviewHtml(plan)+
        '<div class="vadj-actions">'+
          (plan.changes.length ? '<button type="button" class="btn primary small" data-vadj="apply">Aplicar ajuste</button>' : '')+
          '<button type="button" class="btn small ghost" data-vadj="toggle">Cancelar</button></div>';
    } else {
      corpo = '<div class="vadj-actions"><button type="button" class="btn primary small" data-vadj="toggle">Ajustar volume</button></div>';
    }
    html += '<div class="vadj"><div class="vadj-h">'+ICON_ALERT+'<div><b>Acima do teto semanal: '+escapeHtml(lista)+'</b>'+
      '<span>Acima do MRV o volume extra tende a render mais fadiga que ganho. Posso reduzir séries nos exercícios secundários — você vê a prévia antes de aplicar.</span></div></div>'+corpo+'</div>';
  }
  el.innerHTML = html;
  el.hidden = !html;
}
async function aplicarVolumeAdjust(){
  const plan = planVolumeAdjust(volAdjMode);
  if(!plan.changes.length) return;
  const porDia = {};
  plan.changes.forEach(c=> (porDia[c.dia] = porDia[c.dia] || []).push(c));
  const snap = {};
  const jobs = [];
  const salvarTodos = state.rotinaIsExample;
  DAYS.forEach(k=>{
    const d = state.rotina[k] || {nome:DAY_FULL[k], ativo:false, exercicios:[]};
    if(porDia[k]){
      snap[k] = d;
      const exs = (d.exercicios||[]).map((e,i)=>{
        const c = porDia[k].find(x=> x.i === i);
        if(!c) return e;
        const ne = Object.assign({}, e, {series:c.para});
        if(c.metaNova) ne.metaReps = c.metaNova;
        return ne;
      });
      state.rotina[k] = Object.assign({}, d, {exercicios:exs});
      jobs.push(saveDoc("rotina/"+k, state.rotina[k]));
    } else if(salvarTodos){
      state.rotina[k] = d;
      jobs.push(saveDoc("rotina/"+k, d));
    }
  });
  state.rotinaIsExample = false;
  volAdjUndo = {snap, n:plan.changes.length, dias:Object.keys(porDia).length};
  volAdjOpen = false;
  render();
  microReward();
  await Promise.all(jobs);
  showToast("Volume ajustado em "+plan.changes.length+" "+pl(plan.changes.length,"exercício","exercícios")+".", {action:{label:"Desfazer", fn:()=> desfazerVolumeAdjust()}});
  const b = document.querySelector('#volume-adjust [data-vadj="undo"]');
  if(b) b.focus();
}
async function desfazerVolumeAdjust(){
  if(!volAdjUndo) return;
  const jobs = [];
  Object.entries(volAdjUndo.snap).forEach(([k,d])=>{ state.rotina[k] = d; jobs.push(saveDoc("rotina/"+k, d)); });
  volAdjUndo = null;
  render();
  await Promise.all(jobs);
  showToast("Ajuste desfeito.");
}
(function setupVolumeAdjust(){
  const el = document.getElementById("volume-adjust");
  if(!el) return;
  el.addEventListener("click", (ev)=>{
    const b = ev.target.closest("[data-vadj]");
    if(!b) return;
    const act = b.dataset.vadj;
    if(act === "toggle"){ volAdjOpen = !volAdjOpen; renderVolumeAdjust(); const f = el.querySelector('[data-vadj="toggle"]'); if(f) f.focus(); }
    else if(act === "mode-teto" || act === "mode-folga"){ volAdjMode = act.slice(5); renderVolumeAdjust(); const f = el.querySelector('[data-vadj="'+act+'"]'); if(f) f.focus(); }
    else if(act === "apply") aplicarVolumeAdjust();
    else if(act === "undo") desfazerVolumeAdjust();
  });
})();

/* ============================================================
   ESTADO
   ============================================================ */
const SCHEMA_VERSION = 2;   // 1 = exports antigos (sem o campo), 2 = atual (v73)
/* v98: enquanto você ainda não salvou nenhuma rotina, o exemplo mostrado segue o plano do perfil (experiência, dias, equipamento, objetivo e idade; nunca o sexo). Rotina já salva nunca é trocada. */
function ajustarRotinaExemplo(){
  if(state.rotinaIsExample) state.rotina = defaultRotina(state.perfil);
}
const state = {
  db: null,
  dbReady: false,
  perfil: null,       // {sexo, idade, alturaCm, nivelAtividade, objetivo, pesoMetaKg}
  rotina: defaultRotina(),
  rotinaIsExample: true,
  checkins: {},        // iso -> {concluido:bool}
  medicoes: {},         // iso -> {pesoKg,cinturaCm,quadrilCm,pescocoCm}
  fotos: {},            // id (timestamp) -> {iso, assetId, criadoEm} — assetId vem da capability "assets"
  settings: {accentSkin: null, idioma: "pt", ultimoDeload: null, periodizacao: {ativo:false, inicioISO:null, blocos:[{tipo:"volume",semanas:4},{tipo:"forca",semanas:4}]}},   // accentSkin: índice de patente (0-9) usado como cor de destaque, ou null = padrão. idioma: "pt"|"en" — hoje é só preferência salva (placeholder), tradução completa é futura. ultimoDeload: ISO (segunda-feira) da última semana marcada como deload, ou null = nunca marcado (conta desde o início do uso). periodizacao: modo extra opcional (3.5) — alterna blocos de volume/força/deload só como guia de RPE/séries, nunca reescreve a rotina. Sons do app e Modo Jogo são sempre ativos por padrão do artifact (não são configuráveis).
};

/* v98 — cadastro: constantes e utilitários (ficam no topo porque o cadastro pode abrir assim que o app carrega) */
const IDADE_MIN = 13, IDADE_MAX = 100;
const OB_OBJETIVOS = [
  {v:"ganhar",    dieta:"superavit",  t:"Ganhar massa",        d:"Aumentar músculo e força."},
  {v:"emagrecer", dieta:"deficit",    t:"Emagrecer",           d:"Perder gordura com calma, sem pressa."},
  {v:"manter",    dieta:"manutencao", t:"Manter e ficar ativo", d:"Criar o hábito, ter energia e cuidar da saúde."},
];
const OB_EXPERIENCIA = [
  {v:"iniciante",     t:"Iniciante",     d:"Estou começando ou voltando agora (menos de 6 meses de treino regular)."},
  {v:"intermediario", t:"Intermediário", d:"Treino há mais de 6 meses e conheço os principais exercícios."},
  {v:"avancado",      t:"Avançado",      d:"Treino com regularidade há mais de 2 anos e domino a técnica."},
];
const OB_DIAS = [2,3,4,5,6].map(n=>({v:String(n), t:String(n), d:"dias"}));
const OB_LOCAL = [
  {v:"academia", t:"Academia",          d:"Tenho máquinas, barras e halteres."},
  {v:"casa",     t:"Em casa",           d:"Tenho alguns equipamentos (halteres, elásticos, banco)."},
  {v:"pouco",    t:"Pouco equipamento", d:"Só o peso do corpo ou quase nada."},
];
function parseNumPt(v){ const s = String(v == null ? "" : v).trim().replace(",", "."); return s === "" ? NaN : Number(s); }
function menorDeIdade(idade){ const n = Number(idade); return isFinite(n) && n > 0 && n < 18; }
/* sexo opcional: "F" | "M" | null ("prefiro não informar"). Só as fórmulas usam; sem sexo valem os valores médios. */
function sexoValido(s){ return s === "F" || s === "M"; }
function labelDe(lista, v){ const o = lista.find(x=> x.v === v); return o ? o.t : ""; }
function sexoLabel(s){ return s === "F" ? "Feminino" : s === "M" ? "Masculino" : "Gênero não informado"; }

const ACTIVITY_LEVELS = [
  {v:"sedentario", label:"Sedentário", desc:"Pouco ou nenhum exercício, trabalho sentado", mult:1.2},
  {v:"leve", label:"Levemente ativo", desc:"Exercício leve 1–2 dias/semana", mult:1.375},
  {v:"moderado", label:"Moderadamente ativo", desc:"Exercício moderado 3–5 dias/semana", mult:1.55},
  {v:"ativo", label:"Muito ativo", desc:"Exercício intenso 6–7 dias/semana", mult:1.725},
  {v:"extra", label:"Extremamente ativo", desc:"Treino intenso diário + trabalho físico", mult:1.9},
];

/* ============================================================
   CÁLCULOS
   ============================================================ */
function calcIMC(pesoKg, alturaCm){
  const h = alturaCm/100;
  return pesoKg / (h*h);
}
/* v97: altura é em CENTÍMETROS. "1,52" (metros) vira 152; valores fora de 100–230 cm são recusados no cadastro. */
function comoMedirCurto(sexo){
  const f = sexo === "F", m = sexo === "M";
  const cint = f ? 'na parte <b>mais estreita do tronco</b>, entre as costelas e o umbigo (sem parte mais estreita: no umbigo)'
    : m ? 'na altura do <b>umbigo</b>'
    : 'homens: na altura do <b>umbigo</b>; mulheres: na parte <b>mais estreita do tronco</b>';
  return '<strong>Cintura:</strong> '+cint+', depois de soltar o ar normalmente, sem prender a respiração.<br>'+
    '<strong>Quadril:</strong> na parte mais larga do bumbum, pés juntos.<br>'+
    '<strong>Pescoço:</strong> logo abaixo do gogó (laringe), fita levemente inclinada para baixo na frente.<br>'+
    'Fita rente à pele, sem apertar, paralela ao chão. Sempre no mesmo ponto e no mesmo horário.';
}
function comoMedirHtml(sexo){
  const f = sexo === "F", m = sexo === "M";
  const cint = f ? 'na parte <b>mais estreita do tronco</b>, entre as costelas e o umbigo. Se não houver uma parte mais estreita, meça na altura do umbigo.'
    : m ? 'na altura do <b>umbigo</b>, que é o ponto usado pelo método da Marinha dos EUA para homens.'
    : 'homens: na altura do <b>umbigo</b>. Mulheres: na parte <b>mais estreita do tronco</b>, entre as costelas e o umbigo.';
  return '<div class="cm-body">'+
    '<div><b>Antes de começar:</b> use fita flexível e não elástica (a de costura serve), pele nua ou roupa fina, em pé, com o corpo relaxado e os braços soltos. A fita fica rente à pele, sem apertar, e paralela ao chão. Pense em uma faixa ao redor do corpo: firme, mas sem marcar a pele.</div>'+
    '<ul>'+
      '<li><b>Peso:</b> de manhã, depois de ir ao banheiro, sem roupa pesada. Compare a média da semana, não um dia isolado.</li>'+
      '<li><b>Cintura:</b> '+cint+' Respire normalmente 2 ou 3 vezes e meça logo depois de soltar o ar, sem encolher a barriga.</li>'+
      '<li><b>Quadril:</b> na parte mais larga do bumbum, com os pés juntos.'+(m ? ' No homem, o quadril entra no RCQ, mas não no cálculo do % de gordura.' : '')+'</li>'+
      '<li><b>Pescoço:</b> logo abaixo do gogó (laringe), com a fita inclinada levemente para baixo na frente. Olhe para frente e não force o pescoço.</li>'+
    '</ul>'+
    '<div>Meça duas vezes; se os valores diferirem mais de 5 mm, meça de novo e use a média. De preferência antes do treino, no mesmo horário e nas mesmas condições.</div>'+
    '<div><b>O ponto da cintura importa.</b> A OMS mede em outro lugar (meio caminho entre a última costela e o topo do osso do quadril), então números de fontes diferentes não se comparam. Escolha um ponto e repita sempre o mesmo.</div>'+
    '<div class="cm-fontes">Fontes: <a href="https://apps.dtic.mil/sti/pdfs/ADA143890.pdf" target="_blank" rel="noopener">Hodgdon &amp; Beckett (1984), Marinha dos EUA</a> · <a href="https://contentcdn.eacefitness.com/assets/certification/ace-answers/forms/pt/45_Circumference_Measurements_Protocol.pdf" target="_blank" rel="noopener">ACE — protocolo de circunferências</a> · <a href="https://www.who.int/publications/i/item/9789241501491" target="_blank" rel="noopener">OMS — cintura e relação cintura-quadril</a></div>'+
  '</div>';
}
function renderComoMedir(){
  const el = document.getElementById("como-medir-body");
  if(el) el.innerHTML = comoMedirHtml(state.perfil && state.perfil.sexo);
}
function normalizarAlturaCm(v){
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  if(!isFinite(n) || n <= 0) return {cm:null, convertida:false};
  if(n >= 0.9 && n <= 2.5) return {cm:Math.round(n * 100), convertida:true};
  return {cm:Math.round(n * 10) / 10, convertida:false};
}
function corrigirPerfilAltura(p){
  if(!p || !(p.alturaCm > 0) || p.alturaCm >= 3) return null;
  const n = normalizarAlturaCm(p.alturaCm);
  return n.convertida ? Object.assign({}, p, {alturaCm:n.cm}) : null;
}
/* IMC por idade (OMS 2007, 5–19 anos): IMC nos escores z −3, −2, +1 e +2, na idade "x:6" (meio do ano). Fonte: tabelas z da OMS (meninas e meninos). */
const OMS_IMC = {
  F:{10:[12.5,13.7,19.4,23.1],11:[12.9,14.1,20.3,24.3],12:[13.4,14.7,21.3,25.6],13:[13.8,15.2,22.3,26.8],14:[14.2,15.7,23.1,27.8],15:[14.5,16.0,23.8,28.6],16:[14.7,16.3,24.3,29.1],17:[14.7,16.4,24.6,29.4],18:[14.7,16.5,24.9,29.6]},
  M:{10:[12.9,13.9,18.8,21.9],11:[13.2,14.2,19.5,23.0],12:[13.6,14.7,20.4,24.2],13:[14.0,15.2,21.3,25.3],14:[14.5,15.7,22.2,26.5],15:[14.9,16.3,23.1,27.4],16:[15.3,16.7,23.9,28.3],17:[15.6,17.1,24.6,29.0],18:[15.8,17.4,25.2,29.5]},
};
function classIMC(imc, p){
  const idade = p ? Math.floor(Number(p.idade)) : 0;
  if(idade >= 10 && idade < 19){
    const i18 = Math.min(18, idade);
    const t = sexoValido(p.sexo) ? OMS_IMC[p.sexo][i18] : OMS_IMC.F[i18].map((v,k)=> Math.round((v + OMS_IMC.M[i18][k]) * 5) / 10);   // v98: sem sexo informado, média das duas curvas
    if(imc < t[0]) return {label:"Magreza acentuada (curva da OMS)", tone:"crit"};
    if(imc < t[1]) return {label:"Magreza (curva da OMS)", tone:"warn"};
    if(imc <= t[2]) return {label:"Peso adequado para a idade", tone:"good"};
    if(imc <= t[3]) return {label:"Sobrepeso (curva da OMS)", tone:"warn"};
    return {label:"Obesidade (curva da OMS)", tone:"crit"};
  }
  if(imc < 18.5) return {label:"Abaixo do peso", tone:"warn"};
  if(imc < 25) return {label:"Peso saudável", tone:"good"};
  if(imc < 30) return {label:"Sobrepeso", tone:"warn"};
  if(imc < 35) return {label:"Obesidade grau I", tone:"crit"};
  if(imc < 40) return {label:"Obesidade grau II", tone:"crit"};
  return {label:"Obesidade grau III", tone:"crit"};
}
function calcRCQ(cinturaCm, quadrilCm){
  /* v98: cintura e quadril são opcionais — sem os dois não há RCQ (null, nunca NaN) */
  const c = Number(cinturaCm), q = Number(quadrilCm);
  if(!(c > 0) || !(q > 0)) return null;
  return c / q;
}
function classRCQ(rcq, sexo){
  const corte = sexo === "F" ? 0.85 : sexo === "M" ? 0.90 : 0.875;   // v98: sem sexo informado, média dos dois cortes
  if(rcq <= corte) return {label:"Dentro da faixa recomendada", tone:"good", corte};
  return {label:"Acima do limite recomendado", tone:"warn", corte};
}
// Método US Navy (métrico, cm) — Hodgdon & Beckett / Naval Health Research Center
function calcBFNavy(sexo, cinturaCm, quadrilCm, pescocoCm, alturaCm){
  /* v98: só calcula com sexo informado e as medidas que a fórmula usa (homem: cintura e pescoço; mulher: cintura, quadril e pescoço).
     A fórmula da Marinha é diferente para cada sexo; uma "média" dos dois resultados não tem base científica, por isso devolvemos null. */
  const ok = x=> isFinite(x) && x > 0;
  const c = Number(cinturaCm), q = Number(quadrilCm), n = Number(pescocoCm), h = Number(alturaCm);
  let pct;
  if(sexo === "F"){
    if(!(ok(c) && ok(q) && ok(n) && ok(h)) || c + q - n <= 0) return null;
    pct = 495/(1.29579 - 0.35004*Math.log10(c+q-n) + 0.22100*Math.log10(h)) - 450;
  } else if(sexo === "M"){
    if(!(ok(c) && ok(n) && ok(h)) || c - n <= 0) return null;
    pct = 495/(1.0324 - 0.19077*Math.log10(c-n) + 0.15456*Math.log10(h)) - 450;
  } else return null;
  return (isFinite(pct) && pct > 0) ? pct : null;   // NG+: <= 0% é medida inconsistente; a tela pede para conferir
}
function classBF(pct, sexo){
  const t = sexo === "F"
    ? [{max:13,label:"Gordura essencial"},{max:20,label:"Atleta"},{max:24,label:"Fitness"},{max:31,label:"Média"},{max:999,label:"Acima da média"}]
    : [{max:5,label:"Gordura essencial"},{max:13,label:"Atleta"},{max:17,label:"Fitness"},{max:24,label:"Média"},{max:999,label:"Acima da média"}];
  for(const r of t) if(pct <= r.max) return r.label;
  return t[t.length-1].label;
}
function calcTMB(sexo, pesoKg, alturaCm, idade){
  const base = 10*pesoKg + 6.25*alturaCm - 5*idade;
  return sexo === "F" ? base - 161 : sexo === "M" ? base + 5 : base - 78;   // v98: sem sexo informado, média das duas constantes ((+5 − 161) / 2)
}
function calcTDEE(tmb, nivelAtividade){
  const lvl = ACTIVITY_LEVELS.find(l => l.v === nivelAtividade) || ACTIVITY_LEVELS[1];
  return tmb * lvl.mult;
}
/* v98 F3: abaixo de 18 anos nunca há déficit calórico; ganho de massa é moderado (+5%, no lugar de +10%).
   objetivoParaIdade() é a única porta: qualquer objetivo salvo (inclusive de backups antigos) passa por ela antes de virar número. */
function objetivoParaIdade(objetivo, idade){
  if(menorDeIdade(idade) && objetivo === "deficit") return "manutencao";
  return objetivo;
}
function calorieTarget(tdee, objetivo, idade){
  const obj = objetivoParaIdade(objetivo, idade);
  if(obj === "deficit") return tdee * 0.80;
  if(obj === "superavit") return tdee * (menorDeIdade(idade) ? 1.05 : 1.10);
  return tdee;
}
function calcMacros(pesoKg, kcalAlvo, proteinaGKg){
  const proteinaG = pesoKg * proteinaGKg;
  const proteinaKcal = proteinaG * 4;
  const gorduraKcal = kcalAlvo * 0.27;
  const gorduraG = gorduraKcal / 9;
  const carboKcal = Math.max(kcalAlvo - proteinaKcal - gorduraKcal, 0);
  const carboG = carboKcal / 4;
  return {
    proteina:{g:proteinaG, kcal:proteinaKcal, gkg:proteinaGKg},
    gordura:{g:gorduraG, kcal:gorduraKcal, gkg:gorduraG/pesoKg},
    carbo:{g:carboG, kcal:carboKcal, gkg:carboG/pesoKg},
  };
}

/* ============================================================
   PERSISTÊNCIA (capability db, com fallback em memória)
   ============================================================ */
let unsubs = [];
/* v92 C7: enquanto o banco não respondeu (perfil, ajustes, rotina, check-ins, medições, fotos), os cards mostram
   esqueleto em vez de "0/0", rotina de exemplo e tela vazia. Sai quando as 6 coleções responderam (ou erro), ou em 6 s.
   O assistente de primeiro uso só abre depois disso — antes ele podia abrir por engano numa conexão lenta. */
let carregando = false, _carregTimer = null, perfilRecebido = false;
/* só pergunta "é a primeira vez?" depois de o banco ter respondido sobre o perfil (ou de não haver banco) */
function verificaOnboarding(){
  if(perfilRecebido && !state.perfil && !document.querySelector(".modal-backdrop")) openOnboarding();
  else if(perfilRecebido && state.perfil){
    if(tutorialPendente() && !tourAtivo && !document.querySelector(".modal-backdrop")) iniciarTutorial(verificaComoEstou);
    else verificaComoEstou();
  }
}
function iniciaCarregamento(){
  carregando = true;
  document.documentElement.dataset.loading = "1";
  const m = document.getElementById("main"); if(m) m.setAttribute("aria-busy","true");
  const live = document.getElementById("sync-live"); if(live) live.textContent = "Carregando seus dados…";
  clearTimeout(_carregTimer);
  const espera = window.ngNuvem ? 25000 : 6000;   // B1: com conta, o 1º acesso baixa os dados da nuvem
  _carregTimer = setTimeout(function avisoLento(){   // v98 F7: passou de 6 s sem resposta — diz o que está acontecendo em vez de mostrar tela "vazia" calada
    if(!carregando) return;
    if(document.querySelector(".ng-login")){ _carregTimer = setTimeout(avisoLento, 3000); return; }   // B1: pessoa ainda está na tela de entrada
    showToast("A conexão está lenta. Seus dados aparecem assim que chegarem.");
    fimCarregamento();
  }, espera);
}
function fimCarregamento(){
  if(!carregando) return;
  carregando = false;
  clearTimeout(_carregTimer);
  delete document.documentElement.dataset.loading;
  const m = document.getElementById("main"); if(m) m.removeAttribute("aria-busy");
  const live = document.getElementById("sync-live"); if(live && live.textContent === "Carregando seus dados…") live.textContent = "Dados carregados.";
  render();
  setTimeout(verificaOnboarding, 350);
}
async function initStore(){
  iniciaCarregamento();
  let db = null;
  try{
    db = await window.claude?.use?.("db");
  }catch(e){ db = null; }
  state.db = db;
  state.dbReady = !!db;
  storeIniciada = true;
  loadPending();
  updateSyncPill();
  if(db) scheduleFlush(true);

  if(!db){
    showToast(window.bffRuntime ? "Este navegador bloqueou o armazenamento: o que registrar vale só até fechar o app. Saia do modo anônimo para salvar." : "Você está no modo local: o que registrar vale só até fechar o app.");
    perfilRecebido = true;
    fimCarregamento();
    return;
  }
  const faltam = new Set(["perfil","settings","rotina","checkins","medicoes","fotos"]);
  const marca = k=>{ faltam.delete(k); if(!faltam.size) fimCarregamento(); };
  let falhaAvisada = false;   // v98 F7: erro de leitura não passa em silêncio (avisa uma vez por abertura)
  const falha = k=>{ if(!falhaAvisada){ falhaAvisada = true; showToast("Não consegui carregar todos os seus dados. Confira a conexão e abra o app de novo."); } marca(k); };

  unsubs.push(db.doc("config/perfil").onSnapshot(snap=>{
    state.perfil = snap.exists ? snap.data() : null;
    { const fx = corrigirPerfilAltura(state.perfil);   // v97: altura salva em metros (1,52) vira 152 cm
      if(fx){ state.perfil = fx; try{ if(state.db) Promise.resolve(state.db.doc("config/perfil").set(fx)).catch(e=>ngReporta(e,"perfil:gravar")); }catch(e){ ngReporta(e,"perfil:gravar"); } } }
    ajustarRotinaExemplo();
    perfilRecebido = true;
    render(); marca("perfil");
    if(!carregando) setTimeout(verificaOnboarding, 350);   // resposta tardia (depois dos 6 s do esqueleto)
  }, ()=> falha("perfil")));

  unsubs.push(db.doc("config/settings").onSnapshot(snap=>{
    state.settingsCarregado = true;
    state.settings = snap.exists ? snap.data() : {accentSkin:null, idioma:"pt", ultimoDeload:null, periodizacao:{ativo:false, inicioISO:null, blocos:[{tipo:"volume",semanas:4},{tipo:"forca",semanas:4}]}};
    render(); marca("settings");
  }, ()=> falha("settings")));

  unsubs.push(db.collection("rotina").onSnapshot(qsnap=>{
    if(qsnap.empty){
      state.rotinaIsExample = true;
      ajustarRotinaExemplo();
      render(); marca("rotina");
      return;
    }
    const r = {};
    qsnap.docs.forEach(d=>{ r[d.id] = d.data(); });
    for(const k of DAYS){ if(!r[k]) r[k] = state.rotina[k] || {nome:DAY_FULL[k], ativo:false, exercicios:[]}; }
    migrarNomesDias(r).forEach(k=>{ try{ if(state.db) Promise.resolve(state.db.doc("rotina/"+k).set(r[k])).catch(e=>ngReporta(e,"rotina:migrar")); }catch(e){ ngReporta(e,"rotina:migrar"); } });   // v96: grava só os dias renomeados (sem aviso: quem só lê, vê o nome novo e nada quebra)
    state.rotina = r;
    state.rotinaIsExample = false;
    render(); marca("rotina");
  }, ()=> falha("rotina")));

  unsubs.push(db.collection("checkins").limit(1000).onSnapshot(qsnap=>{
    const c = {};
    qsnap.docs.forEach(d=>{ c[d.id] = d.data(); });
    state.checkins = c;
    render(); marca("checkins");
  }, ()=> falha("checkins")));

  unsubs.push(db.collection("medicoes").limit(500).onSnapshot(qsnap=>{
    const m = {};
    qsnap.docs.forEach(d=>{ m[d.id] = d.data(); });
    state.medicoes = m;
    render(); marca("medicoes");
  }, ()=> falha("medicoes")));

  unsubs.push(db.collection("fotos").limit(200).onSnapshot(qsnap=>{
    const f = {};
    qsnap.docs.forEach(d=>{ f[d.id] = d.data(); });
    state.fotos = f;
    render(); marca("fotos");
  }, ()=> falha("fotos")));
}

/* Fila de gravação (v71): se o set()/delete() falhar (sinal ruim na academia),
   a alteração fica guardada (memória + localStorage, quando disponível) e é
   reenviada com espera crescente (2s, 5s, 15s, 30s, 60s), ao voltar a conexão
   ("online") e ao reabrir a aba. Para um mesmo caminho vale a última alteração. */
const PENDING_KEY = "bff_pending_writes_v1";
const FLUSH_DELAYS = [2000, 5000, 15000, 30000, 60000];
let pendingWrites = {}, flushTimer = null, flushAttempt = 0, flushing = false;
function loadPending(){
  try{ pendingWrites = JSON.parse(localStorage.getItem(PENDING_KEY) || "{}") || {}; }
  catch(e){ pendingWrites = {}; }
}
function persistPending(){
  try{
    if(Object.keys(pendingWrites).length) localStorage.setItem(PENDING_KEY, JSON.stringify(pendingWrites));
    else localStorage.removeItem(PENDING_KEY);
  }catch(e){ /* sem armazenamento: a fila continua só em memória */ }
  updateSyncPill();
}
function queueWrite(path, op, data){
  pendingWrites[path] = {op, data: data || null};
  persistPending();
  scheduleFlush(false);
}
function scheduleFlush(immediate){
  clearTimeout(flushTimer);
  if(!Object.keys(pendingWrites).length || !state.db) return;
  const delay = immediate ? 0 : FLUSH_DELAYS[Math.min(flushAttempt, FLUSH_DELAYS.length-1)];
  flushTimer = setTimeout(flushPending, delay);
}
async function flushPending(){
  if(flushing || !state.db) return;
  flushing = true;
  updateSyncPill();
  const paths = Object.keys(pendingWrites);
  let failed = false;
  for(const path of paths){
    const w = pendingWrites[path];
    try{
      if(w.op === "delete") await state.db.doc(path).delete();
      else await state.db.doc(path).set(w.data);
      delete pendingWrites[path];
      persistPending();
    }catch(e){ failed = true; break; }
  }
  flushing = false;
  if(!failed) lastSaveAt = Date.now();
  updateSyncPill();
  if(failed){ flushAttempt++; scheduleFlush(false); }
  else { flushAttempt = 0; if(paths.length) showToast("Tudo salvo. As alterações pendentes foram enviadas."); }
}
window.addEventListener("online", ()=>{ updateSyncPill(); scheduleFlush(true); });
window.addEventListener("offline", updateSyncPill);
window.addEventListener("ng-sync", ()=>{ try{ updateSyncPill(); }catch(e){} });   // B1

/* v91 U5: indicador de sincronização (salvo / pendente / sem conexão / modo local).
   Lê o que a fila de gravação já sabe; só mostra, não muda o comportamento dela. */
let lastSaveAt = null, storeIniciada = false;
function syncEstado(){
  const n = Object.keys(pendingWrites).length;
  if(!storeIniciada) return {k:"loading", n};
  if(!state.db) return {k:"local", n};
  if(window.ngNuvem){ const e = window.ngNuvem.estado(); return {k:e.k, n:e.n||0}; }   // B1: estado real da sincronização com a conta
  if(window.bffRuntime) return {k:"saved", n:0};   // A1: gravação local no aparelho, não depende de internet
  if(navigator.onLine === false) return {k:"offline", n};
  if(n > 0) return {k:"pending", n};
  return {k:"saved", n};
}
function syncHora(){
  return lastSaveAt ? new Date(lastSaveAt).toLocaleTimeString("pt-BR", {hour:"2-digit", minute:"2-digit"}) : null;
}
function syncTextos(k, n){
  const hora = syncHora();
  const alt = n===1 ? "1 alteração" : n+" alterações";
  return ({
    loading: {ic:"refresh", txt:"Conectando", full:"Conectando para buscar seus dados…"},
    syncing: {ic:"refresh", txt:"Sincronizando", full:"Sincronizando com a sua conta…"},
    erro:    {ic:"cloud-off", txt: n===1 ? "1 pendente" : n+" pendentes", full: alt+" ainda não chegaram à nuvem. Estão guardadas neste aparelho e o app tenta de novo sozinho. Toque para tentar agora."},
    saved:   {ic:"cloud-check", txt:"Salvo", full:"Tudo salvo"+(window.bffRuntime ? " neste aparelho" : "")+(hora ? " — última gravação às "+hora : "")+"."},
    pending: {ic: flushing ? "refresh" : "cloud", txt: n===1 ? "1 pendente" : n+" pendentes", full: alt+" aguardando para salvar. Toque para tentar agora."},
    offline: {ic:"cloud-off", txt:"Sem conexão", full:"Sem conexão"+(n ? ". "+(n===1 ? "1 alteração está guardada neste aparelho e será enviada" : n+" alterações estão guardadas neste aparelho e serão enviadas")+" ao reconectar." : ". O que você registrar fica guardado e é enviado ao reconectar.")},
    local:   {ic:"cloud-off", txt:"Modo local", full:"Modo local: o que você registrar vale só até fechar o app."}
  })[k];
}
function updateSyncPill(){
  const b = document.getElementById("sync-pill");
  if(!b) return;
  const {k, n} = syncEstado();
  const L = syncTextos(k, n);
  b.dataset.state = k;
  if(flushing || k === "loading" || k === "syncing") b.dataset.busy = "1"; else delete b.dataset.busy;
  b.innerHTML = ic(L.ic)+'<span class="sync-txt">'+L.txt+'</span>';
  b.setAttribute("aria-label", L.full);
  b.title = L.full;
  const live = document.getElementById("sync-live");
  if(live && updateSyncPill._k !== undefined && updateSyncPill._k !== "loading" && updateSyncPill._k !== k) live.textContent = L.full;
  updateSyncPill._k = k;
}
(function setupSyncPill(){
  const b = document.getElementById("sync-pill");
  if(!b) return;
  b.addEventListener("click", ()=>{
    const {k, n} = syncEstado();
    if(window.ngNuvem && (k === "pending" || k === "erro" || k === "offline")){ window.ngNuvem.sincronizar(); showToast(k === "offline" ? syncTextos(k, n).full : "Tentando sincronizar agora…"); }
    else if(k === "pending"){ flushAttempt = 0; scheduleFlush(true); showToast("Tentando salvar agora…"); }
    else showToast(syncTextos(k, n).full);
  });
  updateSyncPill();
})();
document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState === "visible") scheduleFlush(true); });

async function saveDoc(path, data){
  if(!state.db){
    // fallback local update so UI still works this session
    return applyLocalFallback(path, data);
  }
  try{
    await state.db.doc(path).set(data);
    if(pendingWrites[path]){ delete pendingWrites[path]; persistPending(); }
    lastSaveAt = Date.now(); updateSyncPill();
  }catch(e){
    queueWrite(path, "set", data);
    applyLocalFallback(path, data);   // a tela já mostra o que você acabou de registrar
    showToast("Conexão instável. Guardei sua alteração e tento salvar de novo sozinho.");
  }
}
async function deleteDocRemote(path){
  if(!state.db) return;
  try{
    await state.db.doc(path).delete();
    if(pendingWrites[path]){ delete pendingWrites[path]; persistPending(); }
  }catch(e){
    queueWrite(path, "delete", null);
    showToast("Conexão instável. Tento remover de novo sozinho.");
  }
}
function applyLocalFallback(path, data){
  const parts = path.split("/");
  if(parts[0] === "config" && parts[1] === "perfil"){ state.perfil = data; }
  else if(parts[0] === "config" && parts[1] === "settings"){ state.settings = data; }
  else if(parts[0] === "rotina"){ state.rotina[parts[1]] = data; state.rotinaIsExample = false; }
  else if(parts[0] === "checkins"){ state.checkins[parts[1]] = data; }
  else if(parts[0] === "medicoes"){ state.medicoes[parts[1]] = data; }
  else if(parts[0] === "fotos"){ state.fotos[parts[1]] = data; }
  render();
}

/* ============================================================
   NAVEGAÇÃO
   ============================================================ */
// Corpo, Dieta e Dicas viviam como 3 abas no mesmo nível — viraram sub-abas
// dentro de "Corpo" (pedido do Gabriel, pra reduzir a navegação principal).
// Continuam sendo 3 <section class="view"> separadas no HTML (nada mudou
// de lugar, menor risco), só que agora são tratadas como um grupo: a nav
// principal só tem o botão "Corpo", e uma segunda barrinha (corpo-subnav)
// aparece só quando esse grupo está ativo, pra escolher qual das 3 mostrar.
const CORPO_GROUP = ["corpo","recomendacoes"];   // v98 F3: Dieta virou item próprio da barra; Corpo ficou só com Corpo e Dicas
let corpoSubTab = "corpo";
const dirtyViews = new Set();   // v94 P1: seções que precisam ser redesenhadas ao abrir
function showTab(name){
  let mainName = name;
  if(CORPO_GROUP.includes(name)){
    corpoSubTab = name;
    mainName = "corpo";
  }
  document.querySelectorAll(".view").forEach(v=>{
    const id = v.id.replace("view-","");
    v.hidden = CORPO_GROUP.includes(id) ? !(mainName === "corpo" && id === corpoSubTab) : id !== mainName;
  });
  document.querySelectorAll(".tab-btn:not(.subtab-btn)").forEach(b=>{
    b.setAttribute("aria-selected", String(b.dataset.tab === mainName));
  });
  // v98 F3: no celular, Glossário e Config não têm botão na barra — o Perfil fica marcado enquanto elas estão abertas
  if(mainName === "glossario" || mainName === "config"){
    const pf = document.getElementById("tab-perfil");
    if(pf && getComputedStyle(document.getElementById("tab-"+mainName)).display === "none") pf.setAttribute("aria-selected","true");
  }
  const subnav = document.getElementById("corpo-subnav");
  if(subnav){
    subnav.hidden = mainName !== "corpo";
    subnav.querySelectorAll(".subtab-btn").forEach(b=>{
      b.setAttribute("aria-selected", String(b.dataset.subtab === corpoSubTab));
    });
  }
  // a trilha semanal é medida pela largura real do card (clientWidth), que é 0
  // enquanto a aba Treino está oculta — ao trocar pra essa aba, refaz o cálculo
  // agora que o card está visível de verdade, senão ela fica com a largura
  // (errada) que tinha na primeira renderização, com a página ainda no Painel.
  navTitulo(name);
  if(mainName === "treino") renderWeekTrail();
  // v94 P1: seção que ficou "suja" enquanto estava oculta é desenhada agora, já visível (também resolve medidas de largura)
  const visId = mainName === "corpo" ? corpoSubTab : mainName;
  if(dirtyViews.has(visId)) renderSection(visId);
}
/* v85 (I1): troca de aba com View Transition — desliza na direção da aba (esq./dir.); sub-abas do Corpo só esmaecem */
function showTabAnimated(name){
  const curView = document.querySelector(".view:not([hidden])");
  const norm = n => CORPO_GROUP.includes(n) ? "corpo" : n;
  const cur = curView ? curView.id.replace("view-","") : "";
  if(!cur || (cur === name)) { showTab(name); return Promise.resolve(); }
  const a = TAB_ORDER.indexOf(norm(cur)), b = TAB_ORDER.indexOf(norm(name));
  const dir = (a === b || a < 0 || b < 0) ? null : (b > a ? "fwd" : "back");
  return withTransition(()=> showTab(name), {nav:true, dir});
}
document.querySelectorAll(".tab-btn:not(.subtab-btn)").forEach(b=>{
  b.addEventListener("click", ()=> showTabAnimated(b.dataset.tab));
});
document.querySelectorAll(".subtab-btn").forEach(b=>{
  b.addEventListener("click", ()=> showTabAnimated(b.dataset.subtab));
});
/* v98 F3: a folha "Mais" foi removida (Glossário e Config ficam no card "Mais do app" do Perfil) */
document.querySelectorAll("[data-goto]").forEach(b=>{
  b.addEventListener("click", ()=> showTabAnimated(b.dataset.goto));
});

/* gesto: arrastar (swipe) o dedo pra esquerda/direita troca de aba, do jeito
   que se navega entre telas num app nativo. Só reage a arrastões bem
   horizontais (senão atrapalharia o scroll vertical normal da página) e
   ignora o toque quando ele começa dentro de algo que já rola na horizontal
   (a trilha semanal, a própria barra de abas, gráficos) — aí o gesto nativo
   daquele elemento tem prioridade. Não usa preventDefault em nenhum momento,
   então o scroll da página nunca é bloqueado por engano. */
const TAB_ORDER = ["painel","treino","dieta","corpo","perfil","glossario","config"];
(function setupSwipeTabs(){
  const app = document.querySelector(".app");
  if(!app) return;
  let touchStartX = null, touchStartY = null, swipeBlocked = false;
  app.addEventListener("touchstart", (e)=>{
    if(e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartX = t.clientX; touchStartY = t.clientY;
    swipeBlocked = false;
    let el = e.target;
    while(el && el !== app){
      if((el.hasAttribute && el.hasAttribute("data-noswipe")) || el.scrollWidth > el.clientWidth + 4){ swipeBlocked = true; break; }
      el = el.parentElement;
    }
  }, {passive:true});
  app.addEventListener("touchend", (e)=>{
    if(touchStartX==null){ return; }
    const blocked = swipeBlocked;
    const startX = touchStartX, startY = touchStartY;
    touchStartX = null;
    if(blocked) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if(Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy)*2) return;
    const activeBtn = document.querySelector('.tab-btn[aria-selected="true"]');
    const current = activeBtn ? activeBtn.dataset.tab : "painel";
    const idx = TAB_ORDER.indexOf(current);
    if(idx<0) return;
    const nextIdx = dx < 0 ? idx+1 : idx-1; // arrastar pra esquerda = próxima aba
    if(nextIdx<0 || nextIdx>=TAB_ORDER.length) return;
    hapticPulse(15);
    showTab(TAB_ORDER[nextIdx]);
  }, {passive:true});
})();

/* gesto: toque e segure no selo de patente mostra um resumo rápido, sem
   precisar abrir nada — o mesmo tipo de atalho que segurar um ícone num
   app nativo pra ver uma pré-visualização. */
(function setupPatenteHold(){
  const shield = document.getElementById("nivel-shield");
  if(!shield) return;
  shield.style.cursor = "pointer";
  shield.title = "Toque e segure para ver um resumo rápido";
  let holdTimer = null;
  function startHold(){
    clearTimeout(holdTimer);
    holdTimer = setTimeout(()=>{
      const info = computeNivelInfo();
      const engine = computeStreakEngine();
      hapticPulse([15,30,15]);
      showToast("Patente "+info.tierName+" há "+info.diasNaPatente+" dia"+(info.diasNaPatente===1?"":"s")+" · XP total: "+num(info.xp)+" · recorde de sequência: "+Math.max(engine.best, engine.streak)+" dias");
    }, 480);
  }
  function cancelHold(){ clearTimeout(holdTimer); }
  shield.addEventListener("pointerdown", startHold);
  ["pointerup","pointerleave","pointercancel"].forEach(ev=> shield.addEventListener(ev, cancelHold));
})();

/* v85 (I4): toast simples ou com ação ("Desfazer"). opts: {action:{label, fn}, ms, onExpire}.
   onExpire roda quando o aviso some sozinho OU é substituído por outro — é o "ponto de
   não retorno" das ações adiáveis (ex.: apagar foto de verdade). Clicar na ação cancela o onExpire. */
/* v94 C4: o aviso (toast) fica na camada superior, sempre acima da folha de registro (popover) e de qualquer outra folha */
function toastNoTopo(t){ try{ if(t.matches(":popover-open")) t.hidePopover(); t.showPopover(); }catch(e){} }
/* v94 C4: modais e celebrações também sobem para a camada superior quando têm conteúdo (senão a folha de registro ficaria por cima deles);
   a ordem original é mantida: modal < aviso < celebração */
(function setupCamadaSuperior(){
  if(typeof HTMLElement.prototype.showPopover !== "function") return;
  ["modal-root","celebration-root"].forEach(id=>{
    const r = document.getElementById(id); if(!r) return;
    r.setAttribute("popover","manual");
    const sync = ()=>{
      try{
        if(r.childElementCount){
          if(r.matches(":popover-open")) r.hidePopover();
          r.showPopover();
          const t = document.getElementById("toast");
          if(id === "modal-root" && t && t.classList.contains("show")) toastNoTopo(t);
          const cr = document.getElementById("celebration-root");
          if(id === "modal-root" && cr && cr.matches(":popover-open")){ cr.hidePopover(); cr.showPopover(); }
        } else if(r.matches(":popover-open")) r.hidePopover();
      }catch(e){}
    };
    new MutationObserver(sync).observe(r, {childList:true});
  });
})();
/* v98 Fase 7 — microcopy. Voz: "você", frases curtas, verbo primeiro, sem culpar e sem jargão técnico.
   Sucesso confirma o que aconteceu (e o próximo passo, se houver); "!" só em conquistas. Erro diz o que houve + o que fazer.
   Vazio diz o que aparece ali + como preencher. Carregando diz o que está acontecendo. */
function pl(n, um, varios){ return n === 1 ? um : varios; }   // declaração (içada): pode ser usada antes desta linha
const MSG = {
  semArquivos: "Salvar arquivos não está disponível aqui agora. Tente de novo mais tarde.",
  tenteDeNovo: " Tente de novo."
};
function showToast(msg, opts){
  const t = document.getElementById("toast");
  clearTimeout(showToast._t);
  if(showToast._expire){ const f = showToast._expire; showToast._expire = null; try{ f(); }catch(e){} }
  const act = opts && opts.action;
  if(!act){
    t.textContent = msg;
    t.classList.remove("has-action");
  } else {
    t.textContent = "";
    const s = document.createElement("span"); s.className = "toast-msg"; s.textContent = msg;
    const b = document.createElement("button"); b.type = "button"; b.className = "toast-act"; b.textContent = act.label || "Desfazer";
    b.addEventListener("click", ()=>{
      clearTimeout(showToast._t);
      showToast._expire = null;
      t.classList.remove("show");
      setTimeout(()=>{ if(!t.classList.contains("show")){ t.replaceChildren(); t.classList.remove("has-action"); } }, 320);
      if(typeof act.fn === "function") act.fn();
    });
    t.append(s, b);
    t.classList.add("has-action");
    if(opts.onExpire) showToast._expire = opts.onExpire;
  }
  toastNoTopo(t);
  t.classList.add("show");
  showToast._t = setTimeout(()=>{
    t.classList.remove("show");
    if(showToast._expire){ const f = showToast._expire; showToast._expire = null; try{ f(); }catch(e){} }
    if(act) setTimeout(()=>{ if(!t.classList.contains("show")){ t.replaceChildren(); t.classList.remove("has-action"); } }, 320);
  }, (opts && opts.ms) || (act ? 6500 : 2600));
}

/* v85 (I1): View Transitions (mesmo documento). Devolve uma Promise que resolve DEPOIS que o DOM
   foi atualizado — com ou sem animação (navegador sem suporte ou "reduzir movimento" = atualiza direto). */
function withTransition(update, opts){
  opts = opts || {};
  return new Promise(resolve=>{
    let ran = false;
    const run = ()=>{ if(ran) return; ran = true; try{ update(); } finally { resolve(); } };
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if(!document.startViewTransition || reduce || document.visibilityState === "hidden"){ run(); if(opts.after) opts.after(); return; }
    const root = document.documentElement;
    if(opts.nav) root.classList.add("vt-nav");
    if(opts.dir) root.dataset.vt = opts.dir;
    const limpa = ()=>{ root.classList.remove("vt-nav"); delete root.dataset.vt; if(opts.after) opts.after(); };
    try{
      const vt = document.startViewTransition(run);
      vt.ready.catch(()=>{});
      vt.updateCallbackDone.catch(()=>{});
      vt.finished.then(limpa, limpa);
    }catch(e){ limpa(); run(); }
  });
}


/* v85 (I2): dicas "?" — Popover API (abre/fecha, Esc e toque fora grátis) + CSS Anchor Positioning
   (o balão gruda no botão e vira pro outro lado se faltar espaço). Um único popover compartilhado. */
const TIPS = {
  mev:{a:"MEV", t:"MEV · volume mínimo efetivo", g:"Treino",
    d:"O menor número de séries por semana, por músculo, que ainda estimula crescimento. É a dose mínima do remédio: abaixo dela o treino quase só mantém o que você já tem.",
    src:"RP Strength — Training Volume Landmarks", url:"https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth"},
  mav:{a:"MAV", t:"MAV · volume máximo adaptativo", g:"Treino",
    d:"A faixa entre o MEV e o MRV em que o músculo mais responde. Pense na temperatura ideal do chuveiro: nem fria demais, nem queimando.",
    src:"RP Strength — Training Volume Landmarks", url:"https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth"},
  mrv:{a:"MRV", t:"MRV · volume máximo recuperável", g:"Treino",
    d:"O teto de séries por semana que você ainda consegue recuperar. Passou disso, acumula mais cansaço do que músculo — como encher o copo além da borda.",
    src:"RP Strength — Training Volume Landmarks", url:"https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth"},
  rpe:{a:"RPE", t:"RPE · esforço percebido", g:"Treino",
    d:"É o marcador de combustível do esforço: não mede quanto você levantou, mede quanto ainda tinha no tanque ao parar. 10 = esvaziou (nenhuma repetição a mais); 9 = sobrava 1; 8 = sobravam 2; 7 = sobravam 3; 6 = 4 ou mais. Exemplo: você fez 10 repetições e conseguiria mais 2 → RPE 8. Não precisa ser exato. O app usa a nota, junto com as repetições de cada série, para sugerir quando subir a carga.",
    src:"Zourdos et al., 2016 — J Strength Cond Res", url:"https://pubmed.ncbi.nlm.nih.gov/26049792/"},
  xp:{a:"XP", t:"XP e patente", g:"Jogo",
    d:"Pontos ganhos ao concluir treinos. Acumular XP sobe seu nível e sua patente, até a Titã. Igual à barra de experiência de um jogo — só que o desafio aqui é a constância. Exercício completo vale 100%; se você encerrar um exercício antes do fim, ele vale proporcional às séries feitas (no mínimo metade); exercício pulado não vale XP, mas o dia continua contando para a sua sequência."},
  freeze:{a:"proteções", t:"Proteções (freeze)", g:"Jogo",
    d:"Se você perder um dia de treino, uma proteção impede que a sequência zere — um colete salva-vidas: usado só quando precisa. Você ganha uma a cada 7 dias de sequência e guarda no máximo 2."},
  meta:{a:"meta da semana", t:"Meta da semana", g:"Jogo",
    d:"O mínimo de treinos que você combina consigo para a semana. Os dias a mais viram bônus. É como a meta de um mês no trabalho: bateu o mínimo, está tudo certo; o resto é lucro. Dia leve conta."},
  leve:{a:"dia leve", t:"Dia leve", g:"Jogo",
    d:"Um dia de recuperação ativa (caminhada, cárdio leve, mobilidade) que mantém a sequência e rende metade do XP. Pense no modo economia de bateria: o aparelho continua ligado, só gasta menos."},
  rce:{a:"Cintura ÷ altura", t:"Cintura ÷ altura (RCE)", g:"Corpo",
    d:"Divide a cintura pela altura (na mesma unidade). Estudos usam 0,5 como referência: manter a cintura abaixo da metade da altura. É um indicador de atenção, não um diagnóstico. Meça sempre no mesmo ponto e no mesmo horário para comparar.",
    src:"Ashwell & Gibson — BMJ Open (2016)", url:"https://pmc.ncbi.nlm.nih.gov/articles/PMC4800150/"},
  foco:{a:"foco corporal", t:"Foco corporal", g:"Treino",
    d:"Escolha até 2 grupos para dar mais atenção. O app sobe a meta de séries por semana neles, mostra uma dica e cria uma missão semanal. Pense em regar mais um canteiro da horta: você escolhe onde vai mais água, mas isso não decide onde o corpo perde gordura (treino localizado não reduz a gordura da região).",
    src:"Revisão sistemática com meta-análise sobre redução localizada de gordura (Human Movement, 2022)", url:"https://doi.org/10.5114/HM.2022.110373"},
  hab:{a:"Hábitos", t:"Hábitos · sono, passos, água e cárdio leve", g:"Corpo",
    d:"Registro opcional, sem XP e fora da sequência. Referências gerais: adultos costumam precisar de 7 h ou mais de sono; estudos observacionais associam 7.000 a 10.000 passos por dia a menor mortalidade; no cárdio leve, a intensidade certa é aquela em que você ainda consegue conversar. A água é só um registro opcional: o app não define meta.",
    src:"AASM/SRS (2015) · Paluch et al. (2022)", url:"https://pubmed.ncbi.nlm.nih.gov/35247352/"},
  imc:{a:"IMC", t:"IMC · índice de massa corporal", g:"Corpo",
    d:"Peso dividido pela altura ao quadrado. Estimativa rápida de faixa de peso, mas não separa músculo de gordura — por isso o app também mostra o % de gordura. Até os 19 anos o app compara com a curva de IMC por idade e gênero da OMS, e não com o corte de adultos.",
    src:"OMS — circunferência da cintura e relação cintura-quadril", url:"https://www.who.int/publications/i/item/9789241501491"},
  rcq:{a:"RCQ", t:"RCQ · relação cintura-quadril", g:"Corpo",
    d:"Cintura dividida pelo quadril. Mostra onde a gordura se concentra: mais na barriga pesa mais no risco cardiovascular, e é por isso que a OMS usa essa razão.",
    src:"OMS — Waist circumference and waist-hip ratio (2011)", url:"https://www.who.int/publications/i/item/9789241501491"}
};
function tipBtn(k){
  const x = TIPS[k]; if(!x) return "";
  return '<button type="button" class="info-tip" popovertarget="tip-pop" data-tip="'+k+'" aria-label="O que é '+x.a+'?" aria-expanded="false">?</button>';
}
(function setupTips(){
  const pop = document.getElementById("tip-pop");
  const temPopover = !!(pop && typeof pop.showPopover === "function");
  if(!temPopover){
    // navegador sem Popover API: esconde os botões "?" (o Glossário continua explicando tudo)
    document.documentElement.classList.add("ng-sem-popover");   // esconde os "?" via CSS (sem criar <style>: compatível com CSP)
    return;
  }
  const temAncora = !!(window.CSS && CSS.supports && CSS.supports("position-area","top"));
  let atual = null;
  /* Horizontal: sempre em JS (o "?" pode estar dentro de uma tabela rolável, e o ajuste de rolagem da
     ancoragem deslocaria um clamp() feito em CSS). Vertical: CSS anchor() com flip-block; só sem suporte a
     âncora o JS também calcula o topo. */
  function posicionaManual(btn){
    if(!btn) return;
    const r = btn.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const pw = Math.min(320, vw - 32);
    pop.style.left = Math.min(Math.max(16, r.left), vw - pw - 16)+"px";
    if(!temAncora){
      const ph = pop.offsetHeight || 120;
      let top = r.top - ph - 8; if(top < 8) top = r.bottom + 8;
      pop.style.top = top+"px";
    }
  }
  document.addEventListener("click", (e)=>{
    const b = e.target.closest(".info-tip");
    if(!b) return;
    const x = TIPS[b.dataset.tip]; if(!x) return;
    // outro "?" tocado com o balão aberto: em vez de fechar, o balão troca de conteúdo e muda de âncora
    const trocando = pop.matches(":popover-open") && atual && atual !== b;
    if(trocando) e.preventDefault();
    if(atual && atual !== b){ atual.style.anchorName = ""; atual.setAttribute("aria-expanded","false"); }
    atual = b;
    b.style.anchorName = "--tip-anchor";
    posicionaManual(b);
    pop.innerHTML = '<b>'+escapeHtml(x.t)+'</b><p>'+escapeHtml(x.d)+'</p>'+
      (x.src ? '<span class="tip-src">Fonte: <a href="'+x.url+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(x.src)+'</a></span>' : '')+
      '<button type="button" class="tip-more" data-tipgo="'+x.g+'">Ver no Glossário</button>';
    if(trocando){ b.setAttribute("aria-expanded","true"); posicionaManual(b); }
  });
  pop.addEventListener("beforetoggle", (e)=>{ if(e.newState === "open" && !temAncora) requestAnimationFrame(()=> posicionaManual(atual)); });
  pop.addEventListener("toggle", (e)=>{
    if(atual) atual.setAttribute("aria-expanded", String(e.newState === "open"));
    if(e.newState === "open" && !temAncora) posicionaManual(atual);
    if(e.newState === "closed" && atual){ atual.style.anchorName = ""; }
  });
  pop.addEventListener("click", (e)=>{
    const go = e.target.closest("[data-tipgo]");
    if(!go) return;
    glossarioCat = go.dataset.tipgo;
    pop.hidePopover();
    showTabAnimated("glossario").then(()=> renderGlossario());
  });
})();

/* ============================================================
   v86 (I8) — ATALHOS DE TECLADO + PALETA DE COMANDOS
   <dialog> nativo com showModal(): foco preso, Esc, ::backdrop e inert
   do resto da página vêm do navegador; closedby="any" fecha com toque fora.
   ============================================================ */
(function setupCmdk(){
  const dlg = document.getElementById("cmdk"), help = document.getElementById("keyshelp");
  const inp = document.getElementById("cmdk-input"), list = document.getElementById("cmdk-list");
  if(!dlg || typeof dlg.showModal !== "function"){   // sem <dialog>: o app segue normal, só sem a paleta
    document.documentElement.classList.add("ng-sem-dialog");   // esconde o atalho da paleta via CSS (sem criar <style>)
    return;
  }
  const norm = t => String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
  const irPara = (aba)=> ()=> showTabAnimated(aba);
  const COMANDOS = [
    {t:"Ir para Hoje", k:"painel inicio home quest", h:"g h", run:irPara("painel")},
    {t:"Ir para Treino", k:"rotina cargas exercicios semana", h:"g t", run:irPara("treino")},
    {t:"Ir para Corpo", k:"medicoes peso graficos historico", h:"g c", run:irPara("corpo")},
    {t:"Ir para Dieta", k:"calorias macros cardapio refeicoes", h:"g d", run:irPara("dieta")},
    {t:"Ir para Dicas", k:"recomendacoes", h:"", run:irPara("recomendacoes")},
    {t:"Ir para Perfil", k:"nivel patente xp conquistas fotos", h:"g p", run:irPara("perfil")},
    {t:"Ir para Glossário", k:"termos significado ajuda", h:"g l", run:irPara("glossario")},
    {t:"Ir para Configurações", k:"config backup exportar importar som", h:"g o", run:irPara("config")},
    {t:"Começar treino de hoje", k:"comecar treinar quest iniciar ao vivo", h:"", run:()=>{
      showTab("painel");
      const b = document.getElementById("btn-treino-ao-vivo");
      if(b && !b.hidden && b.offsetParent !== null && b.dataset.acao === "treino") b.click(); else showToast("Sem treino para começar agora: hoje é descanso ou o treino já foi concluído.");
    }},
    {t:"Marcar treino de hoje como concluído", k:"checkin concluir registrar", h:"", run:()=>{
      showTab("painel");
      const b = document.getElementById("btn-quick-checkin");
      if(b && !b.hidden && b.offsetParent !== null && !b.disabled) b.click(); else showToast("Sem treino para marcar: hoje é descanso ou ele já está concluído.");
    }},
    {t:"Registrar peso e medidas", k:"medicao pesar cintura quadril", h:"", run:()=>{
      showTab("corpo");
      const f = document.getElementById("m-peso");
      if(f){ f.scrollIntoView({block:"center", behavior:"auto"}); f.focus({preventScroll:true}); }
    }},
    {t:"Mostrar atalhos de teclado", k:"ajuda teclas", h:"?", run:()=>{ if(help) help.showModal(); }},
  ];
  let filtrados = COMANDOS, ativo = 0;
  function desenha(){
    if(!filtrados.length){ list.innerHTML = '<li class="cmdk-empty" role="presentation">Nenhum comando encontrado.</li>'; inp.removeAttribute("aria-activedescendant"); return; }
    list.innerHTML = filtrados.map((c,i)=>
      '<li class="cmdk-item" role="option" id="cmdk-o'+i+'" data-i="'+i+'" aria-selected="'+(i===ativo)+'">'+escapeHtml(c.t)+(c.h?'<small>'+c.h.split(" ").map(x=>'<kbd>'+escapeHtml(x)+'</kbd>').join(" ")+'</small>':'')+'</li>').join("");
    inp.setAttribute("aria-activedescendant", "cmdk-o"+ativo);
    const el = document.getElementById("cmdk-o"+ativo); if(el && el.scrollIntoView) el.scrollIntoView({block:"nearest"});
  }
  function filtra(){
    const termos = norm(inp.value).split(/\s+/).filter(Boolean);
    filtrados = COMANDOS.filter(c=>{ const alvo = norm(c.t+" "+c.k); return termos.every(t=> alvo.includes(t)); });
    ativo = 0; desenha();
  }
  function executa(i){
    const c = filtrados[i]; if(!c) return;
    dlg.close();
    setTimeout(()=>{ try{ c.run(); }catch(e){} }, 30);   // depois de fechar: o modal nativo deixa o resto inert
  }
  function abre(){
    if(dlg.open) return;
    if(document.querySelector("#modal-root .modal") || document.querySelector("dialog[open]")) return;
    inp.value = ""; filtra();
    dlg.showModal(); inp.focus(); inp.select();
  }
  inp.addEventListener("input", filtra);
  inp.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowDown"){ e.preventDefault(); if(filtrados.length){ ativo = (ativo+1) % filtrados.length; desenha(); } }
    else if(e.key === "ArrowUp"){ e.preventDefault(); if(filtrados.length){ ativo = (ativo-1+filtrados.length) % filtrados.length; desenha(); } }
    else if(e.key === "Home"){ e.preventDefault(); ativo = 0; desenha(); }
    else if(e.key === "End"){ e.preventDefault(); ativo = Math.max(0, filtrados.length-1); desenha(); }
    else if(e.key === "Enter"){ e.preventDefault(); executa(ativo); }
  });
  list.addEventListener("click", (e)=>{ const li = e.target.closest("[data-i]"); if(li) executa(Number(li.dataset.i)); });
  list.addEventListener("pointermove", (e)=>{
    const li = e.target.closest("[data-i]");
    if(li && Number(li.dataset.i) !== ativo){
      ativo = Number(li.dataset.i);
      list.querySelectorAll(".cmdk-item").forEach((x,i)=> x.setAttribute("aria-selected", String(i===ativo)));
      inp.setAttribute("aria-activedescendant","cmdk-o"+ativo);
    }
  });
  // navegadores sem closedby: clicar no ::backdrop dispara click no próprio <dialog>
  [dlg, help].forEach(d=>{ if(d) d.addEventListener("click", (e)=>{ if(e.target === d) d.close(); }); });
  const hc = document.getElementById("keyshelp-close"); if(hc) hc.addEventListener("click", ()=> help.close());
  const chip = document.getElementById("cmdk-open"); if(chip) chip.addEventListener("click", abre);

  // atalhos: só fora de campos de texto e sem modal aberto
  let gPendente = false, gTimer = null;
  const digitando = (t)=> t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
  const MAPA_G = {h:"painel", t:"treino", c:"corpo", d:"dieta", p:"perfil", l:"glossario", o:"config"};
  document.addEventListener("keydown", (e)=>{
    if((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && String(e.key).toLowerCase() === "k"){ e.preventDefault(); abre(); return; }
    if(e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
    if(digitando(e.target) || document.querySelector("dialog[open]") || document.querySelector("#modal-root .modal")) return;
    if(gPendente){
      clearTimeout(gTimer); gPendente = false;
      const aba = MAPA_G[String(e.key).toLowerCase()];
      if(aba){ e.preventDefault(); showTabAnimated(aba); }
      return;
    }
    if(e.key === "g"){ gPendente = true; gTimer = setTimeout(()=>{ gPendente = false; }, 1200); return; }
    if(e.key === "?"){ e.preventDefault(); if(help) help.showModal(); }
  });
})();

/* ============================================================
   RENDER: PAINEL
   ============================================================ */
function sortedMedicoes(){
  return Object.keys(state.medicoes).sort().map(iso=>({iso, ...state.medicoes[iso]}));
}
function latestMedicao(){
  const arr = sortedMedicoes();
  return arr.length ? arr[arr.length-1] : null;
}
/* v98: cintura/quadril/pescoço são opcionais. RCQ e % de gordura usam a medição mais recente que tenha o que a conta precisa. */
function ultimaMedicaoCom(fn){
  const arr = sortedMedicoes();
  for(let i = arr.length - 1; i >= 0; i--) if(fn(arr[i])) return arr[i];
  return null;
}
function ultimaComRCQ(){ return ultimaMedicaoCom(m=> calcRCQ(m.cinturaCm, m.quadrilCm) != null); }
function ultimaComBF(p){ return ultimaMedicaoCom(m=> calcBFNavy(p && p.sexo, m.cinturaCm, m.quadrilCm, m.pescocoCm, p && p.alturaCm) != null); }
function faltaMedidasCorpo(){ const m = latestMedicao(); return !m || !(m.cinturaCm > 0 && m.quadrilCm > 0 && m.pescocoCm > 0); }
/* atalho: leva para a aba Corpo e coloca o foco no primeiro campo de medida que falta */
function irParaMedidas(){
  showTab("corpo");
  setTimeout(()=>{
    const m = latestMedicao() || {};
    const alvo = document.getElementById(!(m.cinturaCm > 0) ? "m-cintura" : !(m.quadrilCm > 0) ? "m-quadril" : "m-pescoco");
    if(alvo){ alvo.scrollIntoView({block:"center"}); alvo.focus({preventScroll:true}); }
  }, 60);
}
document.addEventListener("click", e=>{ if(e.target.closest && e.target.closest("[data-goto-medidas], #btn-medidas-agora")) irParaMedidas(); });
function renderAtalhoMedidas(){
  const el = document.getElementById("medidas-atalho"); if(!el) return;
  el.hidden = !(state.perfil && latestMedicao() && faltaMedidasCorpo());
}

function getTrackingStartISO(){
  // data em que o usuário começou a usar o app: usa a data de cadastro (criadoEm) quando existir;
  // como fallback (perfis criados antes desse campo existir), usa o registro mais antigo salvo.
  if(state.perfil?.criadoEm) return state.perfil.criadoEm;
  const dates = [...Object.keys(state.medicoes||{}), ...Object.keys(state.checkins||{})].sort();
  return dates[0] || todayISO();
}

/* ============================================================
   REAGENDAR — treino perdido feito hoje
   O usuário perde um dia (imprevisto) e quer fazer o treino que ficou para trás
   sem perder a ordem da semana. Fazendo-o hoje, o treino de hoje vai para amanhã
   e os dias seguintes andam 1 dia; o primeiro descanso absorve o deslocamento.
   Se não houver descanso até domingo, o último treino fica de fora da semana.
   Vale só para a semana atual (seg–dom). Os dias passados não mudam: o dia perdido
   continua perdido (usa congelamento, se houver) e o treino conta no dia em que foi feito.
   ============================================================ */
function reagendaCfg(){
  const r = state.settings && state.settings.reagenda;
  return {dias:(r && r.dias) || {}, recuperados:(r && r.recuperados) || []};
}
function treinoAtivoKey(k){ const d = state.rotina && state.rotina[k]; return !!(d && d.ativo && (d.exercicios||[]).length); }
function rotuloTreino(k){ return treinoAtivoKey(k) ? (state.rotina[k].nome || DAY_FULL[k]) : "Descanso"; }
function treinosPerdidos(){
  if(!state.rotina || state.rotinaIsExample || !state.perfil) return [];
  const hoje = todayISO(), ini = getTrackingStartISO(), rec = new Set(reagendaCfg().recuperados);
  const out = [];
  for(let d = mondayOfISO(hoje); d < hoje; d = addDaysISO(d, 1)){
    if(d < ini) continue;
    const k = treinoKey(d);
    if(!treinoAtivoKey(k)) continue;
    if(state.checkins[d]?.concluido || rec.has(d)) continue;
    out.push({iso:d, key:k, nome:state.rotina[k].nome || DAY_FULL[k]});
  }
  return out;
}
function hojeLivreParaReagendar(){
  const hoje = todayISO(), c = state.checkins[hoje];
  if(!c) return true;
  if(c.concluido) return false;
  const day = state.rotina[treinoKey(hoje)];
  try{ return !(day && resumoDia(c, day).algumRegistro); }catch(e){ return true; }
}
function planoReagenda(missIso, hoje){
  hoje = hoje || todayISO();
  const fim = addDaysISO(mondayOfISO(hoje), 6);
  const datas = []; for(let d = hoje; d <= fim; d = addDaysISO(d, 1)) datas.push(d);
  const orig = datas.map(d=> treinoKey(d));
  const novo = orig.slice();
  const missKey = treinoKey(missIso);
  novo[0] = missKey;
  let carry = treinoAtivoKey(orig[0]) ? orig[0] : null;
  for(let i = 1; i < datas.length && carry; i++){
    const o = orig[i];
    novo[i] = carry;
    carry = treinoAtivoKey(o) ? o : null;     // um dia de descanso absorve o deslocamento
  }
  return {datas, orig, novo, missKey, missIso, fora: carry};
}
function aplicaReagenda(plano){
  const antes = state.settings && state.settings.reagenda ? JSON.parse(JSON.stringify(state.settings.reagenda)) : null;
  const cfg = reagendaCfg(), hoje = todayISO(), corte = addDaysISO(hoje, -21), corteRec = addDaysISO(hoje, -60);
  const dias = {};
  Object.keys(cfg.dias).forEach(d=>{ if(d >= corte && plano.datas.indexOf(d) < 0) dias[d] = cfg.dias[d]; });
  plano.datas.forEach((d, i)=>{ if(plano.novo[i] !== dayKeyFromISO(d)) dias[d] = plano.novo[i]; });
  const recuperados = cfg.recuperados.filter(d=> d >= corteRec).concat(plano.missIso);
  state.settings = Object.assign({}, state.settings, {reagenda:{dias, recuperados}});
  saveDoc("config/settings", state.settings);
  selectedTrailDay = null;
  render();
  showToast("Treino de hoje trocado. A semana foi reorganizada.", {action:{label:"Desfazer", fn:()=>{
    state.settings = Object.assign({}, state.settings, {reagenda: antes});
    saveDoc("config/settings", state.settings);
    selectedTrailDay = null; render();
  }}});
}
function abrirReagenda(missIso){
  if(!treinosPerdidos().some(p=> p.iso === missIso)){ showToast("Esse treino já foi reposto ou não está mais disponível."); return; }
  if(!hojeLivreParaReagendar()){ showToast("Hoje já tem treino registrado. Conclua ou desfaça o de hoje antes de repor o de outro dia."); return; }
  const plano = planoReagenda(missIso);
  const hoje = todayISO();
  const wdNome = (d)=> d === hoje ? "Hoje" : DAY_LABEL[dayKeyFromISO(d)];
  const linhas = [];
  plano.datas.forEach((d, i)=>{
    if(plano.novo[i] === plano.orig[i]) return;
    const quem = rotuloTreino(plano.novo[i]);
    const nota = (i === 0) ? " · treino de "+DAY_FULL[plano.missKey]+" que ficou para trás" : (treinoAtivoKey(plano.novo[i]) ? " · empurrado" : "");
    linhas.push('<li><b>'+escapeHtml(wdNome(d))+'</b><span>'+escapeHtml(quem)+nota+'</span></li>');
  });
  if(plano.fora) linhas.push('<li class="fora"><b>Fora</b><span>'+escapeHtml(rotuloTreino(plano.fora))+' fica de fora desta semana (não há descanso para absorver).</span></li>');
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>Fazer o treino que ficou para trás?</h2>'+
    '<p class="hint">Você vai fazer <b>'+escapeHtml(rotuloTreino(plano.missKey))+'</b> hoje, para manter a ordem da semana. Veja como fica:</p>'+
    '<ul class="reag-lista">'+linhas.join("")+'</ul>'+
    '<p class="hint">Vale só para esta semana. O treino conta no dia em que você o faz; o dia que passou continua sem treino (usa um congelamento, se houver). Dá para desfazer logo depois.</p>'+
    '<div class="modal-actions"><button class="btn" id="reag-cancel" type="button">Cancelar</button><button class="btn primary" id="reag-ok" type="button">Trocar o treino de hoje</button></div>';
  openModal(body);
  body.querySelector("#reag-cancel").addEventListener("click", closeModal);
  body.querySelector("#reag-ok").addEventListener("click", ()=>{ closeModal(); aplicaReagenda(plano); });
}
function reagendaAtiva(){
  const hoje = todayISO(), dias = reagendaCfg().dias;
  return Object.keys(dias).some(d=> d >= hoje && dias[d] !== dayKeyFromISO(d));
}
function desfazerReagenda(){
  const hoje = todayISO(), cfg = reagendaCfg();
  const livre = hojeLivreParaReagendar();
  const de = livre ? hoje : addDaysISO(hoje, 1);
  const dias = {};
  Object.keys(cfg.dias).forEach(d=>{ if(d < de) dias[d] = cfg.dias[d]; });
  const seg = mondayOfISO(hoje);
  // só devolve o aviso do treino perdido se hoje voltou ao normal (senão o treino de hoje já foi a reposição)
  const recuperados = livre ? cfg.recuperados.filter(d=> d < seg || d >= hoje) : cfg.recuperados;
  state.settings = Object.assign({}, state.settings, {reagenda:{dias, recuperados}});
  saveDoc("config/settings", state.settings);
  selectedTrailDay = null;
  render();
  showToast(livre ? "Pronto: a semana voltou à rotina normal." : "Pronto: os próximos dias voltaram à rotina normal.");
}
function renderPerdidoCard(){
  const el = document.getElementById("hoje-perdido");
  if(!el) return;
  const hoje = todayISO();
  const livre = hojeLivreParaReagendar();
  const lista = treinosPerdidos().filter(p=> p.iso >= addDaysISO(hoje, -3));
  const p = lista[lista.length - 1];
  let dispensado = null; try{ dispensado = localStorage.getItem("ng_perdido_dispensado"); }catch(e){}
  let html = "";
  if(p && livre && dispensado !== p.iso+"|"+hoje){
    const ontem = p.iso === addDaysISO(hoje, -1);
    const quando = ontem ? "Ontem" : DAY_FULL[dayKeyFromISO(p.iso)];
    const plano = planoReagenda(p.iso);
    const hojeKey = plano.orig[0];
    const nota = treinoAtivoKey(hojeKey) ? "O treino de hoje ("+rotuloTreino(hojeKey)+") vai para amanhã e a semana segue na ordem." : "Hoje seria descanso: dá para repor sem mexer no resto.";
    html += '<div class="hp-row"><div class="hp-body"><b id="hp-t">'+quando+' ficou sem treino: '+escapeHtml(p.nome)+'</b><span>Imprevistos acontecem. Quer fazer esse treino hoje? '+escapeHtml(nota)+'</span></div>'+
      '<div class="hp-act"><button type="button" class="btn small primary" data-hp="fazer" data-iso="'+p.iso+'">Fazer hoje</button>'+
      '<button type="button" class="link-btn" data-hp="dispensar" data-iso="'+p.iso+'">Agora não</button></div></div>';
  }
  if(reagendaAtiva()){
    const k = treinoKey(hoje);
    const hojeTxt = (k !== dayKeyFromISO(hoje) && treinoAtivoKey(k)) ? "Hoje: "+rotuloTreino(k)+" (treino de "+DAY_FULL[k]+")." : (treinoAtivoKey(k) ? "Hoje: "+rotuloTreino(k)+"." : "Hoje é descanso.");
    html += '<div class="hp-row"><div class="hp-body"'+(html ? '' : ' id="hp-t"')+'><b>Esta semana foi reorganizada</b><span>'+escapeHtml(hojeTxt)+(livre ? '' : ' O treino de hoje já foi feito; dá para desfazer só os próximos dias.')+'</span></div>'+
      '<div class="hp-act"><button type="button" class="btn small" data-reagdesf="1">'+(livre ? 'Voltar à rotina normal' : 'Desfazer os próximos dias')+'</button></div></div>';
  }
  if(!html){ el.hidden = true; el.innerHTML = ""; return; }
  el.innerHTML = html;
  el.hidden = false;
}
document.addEventListener("click", (e)=>{
  const r = e.target.closest && e.target.closest("[data-recup]");
  if(r){ abrirReagenda(r.dataset.recup); return; }
  if(e.target.closest && e.target.closest("[data-reagdesf]")){ desfazerReagenda(); return; }
  const h = e.target.closest && e.target.closest("[data-hp]");
  if(!h) return;
  if(h.dataset.hp === "fazer") abrirReagenda(h.dataset.iso);
  else { try{ localStorage.setItem("ng_perdido_dispensado", h.dataset.iso+"|"+todayISO()); }catch(_){} renderPerdidoCard(); }
});

/* ============================================================
   CONGELAMENTO DE SEQUÊNCIA (streak freeze)
   Ganha-se 1 congelamento a cada FREEZE_EARN_DAYS dias corridos de uso
   do app (teto de FREEZE_MAX guardados). Quando um dia de treino
   agendado é perdido e há congelamento disponível, ele é consumido
   automaticamente e a sequência não é zerada — só não avança naquele
   dia. Tudo derivado de checkins/rotina, sem campo novo persistido.
   ============================================================ */
const FREEZE_MAX = 2;
const FREEZE_EARN_DAYS = 7;

function computeStreakEngine(){
  const start = getTrackingStartISO();
  const today = todayISO();
  const todayKey = treinoKey(today);
  const todayAtivo = state.rotina[todayKey]?.ativo;
  const todayDone = state.checkins[today]?.concluido;
  // se hoje é dia de treino e ainda não concluído, a contagem "oficial" pára em ontem —
  // hoje ainda está em aberto, não é tratado como perdido.
  const end = (todayAtivo && !todayDone) ? addDaysISO(today, -1) : today;

  let iso = start;
  let cur = 0, best = 0, freezeBalance = 0, freezesUsedTotal = 0;
  const freezeUsedDates = [];
  let daysElapsed = 0;
  let streakStartIso = null;
  while(iso <= end){
    daysElapsed++;
    if(daysElapsed % FREEZE_EARN_DAYS === 0 && freezeBalance < FREEZE_MAX) freezeBalance++;
    const key = treinoKey(iso);
    if(state.rotina[key]?.ativo){
      if(state.checkins[iso]?.concluido){
        cur++;
        if(cur === 1) streakStartIso = iso;
      } else if(freezeBalance > 0){
        freezeBalance--; freezesUsedTotal++; freezeUsedDates.push(iso);
        // sequência protegida: não soma nem zera neste dia
      } else {
        cur = 0;
        streakStartIso = null;
      }
    }
    if(cur > best) best = cur;
    iso = addDaysISO(iso, 1);
  }
  // "sequência perfeita": a sequência atual, do dia em que começou até hoje, nunca usou congelamento
  const perfect = cur > 0 && streakStartIso!=null && !freezeUsedDates.some(d => d >= streakStartIso);
  return {streak:cur, best, freezeBalance, freezesUsedTotal, freezeUsedDates, end, streakStartIso, perfect};
}

function computeStreak(){ return computeStreakEngine().streak; }
function computeBestStreak(){ return computeStreakEngine().best; }

function countTotalTreinos(){
  return Object.values(state.checkins||{}).filter(c=>c && c.concluido && !c.leve).length;   // v95: dia leve não entra em "treinos"
}

/* ============================================================
   v95 — CONSTÂNCIA SEM CULPA (base: vídeos do Laércio Refundini, V9 e V15)
   Meta semanal (mínimo + bônus), dia leve, check-in de recuperação e
   sessão rápida. Tudo é camada ADITIVA: o motor da sequência e do XP
   continua contando dia a dia. O "dia leve" é um check-in concluído com
   leve:true (mantém a sequência e vale NIVEL_XP_POR_LEVE); a "sessão
   rápida" é um check-in concluído com rapido:true (vale como treino).
   ============================================================ */
function metaSemanalMin(){
  const n = diasAtivos().length;
  if(!n) return 0;
  const v = Number(state.settings && state.settings.metaSemanal);
  if(Number.isInteger(v) && v >= 1) return Math.min(v, n);
  return Math.min(n, Math.max(2, n-1));      // padrão: um dia a menos que o agendado (mínimo 2)
}
function setMetaSemanal(v){
  state.settings = Object.assign({}, state.settings, {metaSemanal: v});
  saveDoc("config/settings", state.settings);
}
// estatística de uma semana (segunda a domingo): capacidade = dias ativos desde o início do uso;
// feitos = dias concluídos (leve conta); bônus = o que passou da meta
function statsSemana(mondayIso){
  const today = todayISO(), start = getTrackingStartISO(), fim = addDaysISO(mondayIso, 6);
  let cap = 0, feitos = 0, leves = 0;
  for(let i=0; i<7; i++){
    const iso = addDaysISO(mondayIso, i);
    if(iso < start) continue;
    if(!state.rotina[treinoKey(iso)]?.ativo) continue;
    cap++;
    if(iso <= today && state.checkins[iso]?.concluido){ feitos++; if(state.checkins[iso].leve) leves++; }
  }
  const meta = cap ? Math.min(metaSemanalMin(), cap) : 0;
  return {cap, feitos, leves, meta, bonus: Math.max(0, feitos - meta), ok: cap > 0 && feitos >= meta, fechada: fim < today};
}
// semanas seguidas com a meta cumprida. A semana em andamento nunca zera a contagem:
// se já bateu a meta, soma; se ainda não, a contagem das semanas anteriores fica de pé.
function semanasSeguidas(){
  const start = getTrackingStartISO(), curMonday = mondayOfISO(todayISO());
  let monday = mondayOfISO(start), run = 0, best = 0;
  while(monday < curMonday){
    const s = statsSemana(monday);
    if(s.cap > 0){ if(s.ok){ run++; if(run > best) best = run; } else run = 0; }
    monday = addDaysISO(monday, 7);
  }
  const atual = statsSemana(curMonday);
  let cur = run;
  if(atual.cap > 0 && atual.ok){ cur = run + 1; if(cur > best) best = cur; }
  return {atual: cur, melhor: best, semana: atual};
}
function renderMetaSemana(){
  const box = document.getElementById("week-goal");
  if(!box) return;
  const sm = statsSemana(mondayOfISO(todayISO()));
  box.hidden = sm.cap === 0;
  if(sm.cap === 0) return;
  document.getElementById("wg-val").textContent = sm.meta;
  const wc = document.getElementById("wg-count"); if(wc) wc.textContent = sm.feitos+"/"+sm.meta;
  document.getElementById("wg-minus").disabled = sm.meta <= 1;
  document.getElementById("wg-plus").disabled = sm.meta >= diasAtivos().length;
  let pips = "";
  for(let i=0; i<sm.cap; i++){
    pips += '<span class="wg-pip '+(i < sm.meta ? "meta" : "bonus")+(i < sm.feitos ? " on" : "")+'"></span>';
  }
  const pe = document.getElementById("wg-pips");
  pe.innerHTML = pips;
  pe.setAttribute("aria-label", sm.feitos+" de "+sm.meta+" treinos da meta"+(sm.bonus ? ", mais "+sm.bonus+" de bônus" : "")+(sm.leves ? " ("+sm.leves+" dia"+(sm.leves===1?"":"s")+" leve"+(sm.leves===1?"":"s")+")" : ""));
  const seq = semanasSeguidas();
  const seqEl = document.getElementById("wg-seq");
  if(seq.atual > 0) seqEl.textContent = "Semanas seguidas com a meta cumprida: "+seq.atual+(seq.melhor > seq.atual ? " · recorde "+seq.melhor : "");
  else if(seq.melhor > 0) seqEl.textContent = "Recorde: "+seq.melhor+" semana"+(seq.melhor===1?"":"s")+" seguida"+(seq.melhor===1?"":"s")+". Bata a meta desta semana para recomeçar a contagem.";
  else seqEl.textContent = "Bata a meta desta semana para começar a contar semanas seguidas.";
}
function ajustarMeta(d){
  const n = diasAtivos().length;
  if(!n) return;
  setMetaSemanal(Math.max(1, Math.min(n, metaSemanalMin() + d)));
  renderWeekDots(); renderChallenges(); renderLastWeekRecap();
  const el = document.getElementById(d < 0 ? "wg-minus" : "wg-plus");
  const outro = document.getElementById(d < 0 ? "wg-plus" : "wg-minus");
  const alvo = (el && !el.disabled) ? el : outro;   // se o botão tocado chegou ao limite e desabilitou, o foco vai para o oposto
  if(alvo && !alvo.disabled) alvo.focus({preventScroll:true});
}

/* ---- check-in de recuperação (opcional): sono, energia e dor articular ---- */
const RECUP_CAMPOS = [
  {k:"sono",    rot:"Sono",          ops:["Ruim","Ok","Bom"]},
  {k:"energia", rot:"Energia",       ops:["Baixa","Média","Alta"]},
  {k:"dor",     rot:"Dor articular", ops:["Nenhuma","Leve","Forte"]},
];
function saveRecup(iso, campo, v){
  const cur = state.checkins[iso] || {};
  const rec = Object.assign({}, cur.recup);
  if(rec[campo] === v) delete rec[campo]; else rec[campo] = v;
  const data = Object.assign({}, cur, {data:iso, dia:treinoKey(iso), recup:rec});
  if(!Object.keys(rec).length) delete data.recup;
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
}
// devolve a orientação do dia a partir das respostas (sem diagnóstico: só ajuste de esforço)
function recupFeedback(r){
  const n = ["sono","energia","dor"].filter(k=> r[k] != null).length;
  if(!n) return {tom:"info", txt:"Opcional e rápido: 3 toques para ajustar o dia ao seu corpo. Não é cobrança."};
  if(r.dor === 2) return {tom:"warn", leve:true, txt:"Dor articular forte: não force o treino. Se ela persistir, procure um profissional de saúde. Um dia leve mantém sua sequência."};
  const baixos = (r.sono === 0 ? 1 : 0) + (r.energia === 0 ? 1 : 0);
  if(baixos >= 2) return {tom:"warn", leve:true, txt:"Sono e energia baixos: um dia leve mantém a sequência e ajuda a recuperar. Se preferir treinar, vá com menos carga."};
  if(r.dor === 1) return {tom:"warn", txt:"Dor articular leve: ajuste carga e amplitude e observe. Se ela voltar sempre, procure um profissional."};
  if(baixos === 1) return {tom:"info", txt:"Um sinal baixo hoje: treine normalmente, mas use o RPE para não passar do ponto."};
  if(n === 3) return {tom:"ok", txt:"Tudo certo para treinar hoje."};
  return {tom:"info", txt:"Anotado. Responda o resto se quiser."};
}
/* ---- "Como você está hoje?" (sono, energia, dor articular) ----
   Aparece como uma tela rápida na 1ª abertura de cada dia de treino (depois do cadastro) e fica sempre disponível em
   Configurações → "Ajustar como estou hoje", para corrigir se a pessoa respondeu errado. Não fica mais no Painel. */
const K_RECUP_PULO = "ng_recup_pulo";   // por aparelho: último dia em que a tela de abertura já foi mostrada
function recupDia(iso){ return (state.checkins[iso] && state.checkins[iso].recup) || {}; }
function recupContagem(r){ return ["sono","energia","dor"].filter(k=> r[k] != null).length; }
function recupResumo(r){
  if(!recupContagem(r)) return "Ainda não respondido hoje.";
  return "Hoje: "+RECUP_CAMPOS.filter(c=> r[c.k] != null).map(c=> c.rot.toLowerCase()+" "+c.ops[r[c.k]].toLowerCase()).join(" · ")+".";
}
function recupDeveAbrir(){
  const iso = todayISO(), day = state.rotina[treinoKey(iso)];
  if(!(day && day.ativo)) return false;                       // só em dia de treino
  if(state.checkins[iso] && state.checkins[iso].concluido) return false;
  if(recupContagem(recupDia(iso))) return false;              // já respondeu hoje
  try{ if((localStorage.getItem(K_RECUP_PULO) || "") >= iso) return false; }catch(e){}
  return true;
}
function verificaComoEstou(){
  if(carregando || !state.perfil || tourAtivo || document.querySelector(".modal-backdrop")) return;
  if(!recupDeveAbrir()) return;
  try{ localStorage.setItem(K_RECUP_PULO, todayISO()); }catch(e){}   // no máximo uma vez por dia neste aparelho
  abrirComoEstou("abertura");
}
// depois do cadastro: tutorial (uma vez por conta) → "Como você está hoje?"
function aposCadastro(){
  setTimeout(()=>{
    if(tutorialVisto()){ verificaComoEstou(); return; }
    marcarTutorial(false);   // pendente: se o app fechar no meio, o tour volta na próxima abertura
    iniciarTutorial(verificaComoEstou);
  }, 400);
}
function abrirComoEstou(modo){
  const iso = todayISO(), key = treinoKey(iso);
  const planos = !!(state.rotina[key] && state.rotina[key].ativo) && !(state.checkins[iso] && state.checkins[iso].concluido);
  const body = document.createElement("div");
  body.innerHTML = '<h2>Como você está hoje?</h2>'+
    '<div class="sub">'+(modo === "abertura" ? 'Antes de treinar, 3 toques ajustam o dia ao seu corpo. ' : '')+'É opcional e sem cobrança. Você pode mudar quando quiser em Configurações.</div>'+
    '<div class="recup-rows" id="recup-rows"></div>'+
    '<div class="recup-msg info" id="recup-msg" aria-live="polite"></div>'+
    (planos
      ? '<div class="recup-plans">'+
          '<button type="button" class="recup-plan" data-plano="leve"><b>Dia leve</b><span>Caminhada, cárdio leve ou mobilidade. Mantém a sequência e rende metade do XP.</span></button>'+
          '<button type="button" class="recup-plan" data-plano="rapida"><b>Sessão rápida</b><span>Full Body curto: 1 exercício por grupo, 3 séries. Conta como o treino de hoje.</span></button>'+
        '</div>'
      : '')+
    '<div class="modal-actions"><button class="btn primary" id="recup-fechar" type="button"></button></div>';
  function desenha(){
    const r = recupDia(iso);
    body.querySelector("#recup-rows").innerHTML = RECUP_CAMPOS.map(c=>
      '<div class="recup-row"><span class="recup-lbl" id="recup-l-'+c.k+'">'+c.rot+'</span>'+
      '<div class="seg" role="group" aria-labelledby="recup-l-'+c.k+'">'+
        c.ops.map((o,i)=> '<button type="button" data-rec="'+c.k+'" data-v="'+i+'" aria-pressed="'+(r[c.k] === i)+'"'+(r[c.k] === i ? ' class="active"' : '')+'>'+o+'</button>').join("")+
      '</div></div>').join("");
    const fb = recupFeedback(r);
    const msg = body.querySelector("#recup-msg");
    msg.className = "recup-msg "+fb.tom;
    msg.innerHTML = escapeHtml(fb.txt)+((fb.leve && planos) ? ' <button type="button" class="btn small" data-recup-leve>Registrar dia leve</button>' : '');
    body.querySelector("#recup-fechar").textContent = recupContagem(r) ? "Pronto" : (modo === "abertura" ? "Agora não" : "Fechar");
  }
  body.addEventListener("click", (e)=>{
    const b = e.target.closest("button[data-rec]");
    if(b){
      saveRecup(iso, b.dataset.rec, Number(b.dataset.v));
      desenha();
      const nb = body.querySelector('button[data-rec="'+b.dataset.rec+'"][data-v="'+b.dataset.v+'"]');
      if(nb) nb.focus({preventScroll:true});
      return;
    }
    if(e.target.closest("[data-recup-leve]")){ closeModal(); registrarDiaLeve(); return; }
    const pl = e.target.closest("button[data-plano]");
    if(pl){ closeModal(); if(pl.dataset.plano === "leve") registrarDiaLeve(); else abrirSessaoRapida(); return; }
    if(e.target.closest("#recup-fechar")){ closeModal(); renderRecupConfig(); }
  });
  openModal(body);
  desenha();
}
function renderRecupConfig(){
  const el = document.getElementById("cfg-recup-info");
  if(el) el.textContent = recupResumo(recupDia(todayISO()));
}

/* ---- hábitos opcionais (v95 C2): sono, passos e cárdio leve em checkins/<iso>.hab — sem XP, fora da sequência ---- */
function habDe(iso){ return (state.checkins[iso] && state.checkins[iso].hab) || null; }
function habMsg(txt){
  const b = document.getElementById("hab-aviso"); if(!b) return;
  b.hidden = !txt; b.textContent = txt || "";
}
function habPreencher(iso){
  const h = habDe(iso) || {};
  const set = (id, v)=>{ const e = document.getElementById(id); if(e) e.value = v == null ? "" : String(v); };
  set("h-sono", h.sono); set("h-passos", h.passos); set("h-cardio", h.cardio); set("h-agua", h.agua);
}
function salvarHabitos(){
  const dEl = document.getElementById("h-data");
  const iso = (dEl && dEl.value) || todayISO();
  if(iso > todayISO()){ habMsg("Escolha o dia de hoje ou um dia anterior."); return; }
  const rd = (id)=>{ const e = document.getElementById(id); const t = e ? e.value.trim().replace(",", ".") : ""; return t === "" ? null : Number(t); };
  const sono = rd("h-sono"), passos = rd("h-passos"), cardio = rd("h-cardio"), agua = rd("h-agua");
  if(sono != null && !(sono >= 0 && sono <= 16)){ habMsg("Sono: informe entre 0 e 16 horas."); return; }
  if(passos != null && !(passos >= 0 && passos <= 100000)){ habMsg("Passos: informe entre 0 e 100.000."); return; }
  if(cardio != null && !(cardio >= 0 && cardio <= 600)){ habMsg("Cárdio: informe entre 0 e 600 minutos."); return; }
  if(agua != null && !(agua >= 0 && agua <= 10)){ habMsg("Água: informe entre 0 e 10 litros."); return; }
  const hab = {};
  if(sono != null) hab.sono = Math.round(sono*2)/2;
  if(passos != null) hab.passos = Math.round(passos);
  if(cardio != null) hab.cardio = Math.round(cardio);
  if(agua != null) hab.agua = Math.round(agua*100)/100;
  const cur = state.checkins[iso] || {};
  if(!Object.keys(hab).length && !cur.hab){ habMsg("Preencha ao menos um campo para salvar."); return; }
  habMsg(null);
  const data = Object.assign({}, cur, {data:iso, dia:treinoKey(iso)});
  if(Object.keys(hab).length) data.hab = hab; else delete data.hab;
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
  render();
  showToast(Object.keys(hab).length ? "Hábitos de "+fmtDateBR(iso)+" salvos." : "Hábitos de "+fmtDateBR(iso)+" removidos.");
}
/* NG+ — grade de hábitos das últimas 12 semanas. Só leitura de checkins/<iso>.hab (inclui o campo opcional "agua").
   Cada quadradinho é uma semana; o número é quantos dias daquela semana tiveram o hábito registrado (sem meta, sem culpa). */
const HAB_GRADE = [
  {k:"sono",   nome:"Sono"},
  {k:"passos", nome:"Passos"},
  {k:"cardio", nome:"Cárdio leve"},
  {k:"agua",   nome:"Água"}
];
const HAB_MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
let hgJaAnimou = false;   // o "acender" das células roda só na primeira vez; depois não repete a cada gravação
function renderGradeHabitos(){
  const box = document.getElementById("hab-grade");
  if(!box) return;
  const hoje = todayISO();
  const seg0 = addDaysISO(mondayOfISO(hoje), -7*11);
  const semanas = [];
  for(let w = 0; w < 12; w++) semanas.push(addDaysISO(seg0, w*7));
  const nvDe = c => c === 0 ? 0 : c <= 2 ? 1 : c <= 4 ? 2 : 3;
  const dias = c => c+(c === 1 ? " dia" : " dias");
  const dados = HAB_GRADE.map(h=>{
    let primeiroIso = null;
    const cont = semanas.map(ini=>{
      let c = 0;
      for(let i = 0; i < 7; i++){
        const iso = addDaysISO(ini, i);
        if(iso > hoje) break;
        const x = habDe(iso);
        if(x && x[h.k] != null){ c++; if(primeiroIso === null) primeiroIso = iso; }
      }
      return c;
    });
    const total = cont.reduce((t,c)=> t+c, 0);
    const max = Math.max.apply(null, cont);
    let iBest = -1;
    if(max > 0) for(let i = cont.length-1; i >= 0; i--) if(cont[i] === max){ iBest = i; break; }
    const primeira = cont.findIndex(c=> c > 0);
    const media = primeira >= 0 ? total/(12-primeira) : 0;
    // % dos dias com registro desde o primeiro registro (só descreve; não é meta)
    let pct = null;
    if(primeiroIso !== null){
      const nDias = Math.round((new Date(hoje+"T12:00:00") - new Date(primeiroIso+"T12:00:00")) / 864e5) + 1;
      pct = Math.min(100, Math.round(total / Math.max(1, nDias) * 100));
    }
    // semanas seguidas com registro; a semana em andamento nunca zera a conta (como a sequência de treinos)
    let seg = 0, k = cont[11] > 0 ? 11 : 10;
    while(k >= 0 && cont[k] > 0){ seg++; k--; }
    return {h, cont, total, max, iBest, media, pct, seg};
  });
  const lider = dados.slice().sort((a,b)=> b.total - a.total)[0];
  const html = dados.map(d=>{
    const cels = d.cont.map((c,w)=>{
      const ini = semanas[w];
      const rot = "Semana de "+fmtDateBR(ini)+": "+dias(c)+" com registro"+(w === 11 ? " (semana atual, em andamento)" : "")+(w === d.iBest ? " — sua semana mais constante" : "");
      return '<span class="hg-c l'+nvDe(c)+(w === 11 ? ' now' : '')+(w === d.iBest ? ' best' : '')+'" role="listitem" aria-label="'+rot+'" title="'+rot+'">'+(c ? c : "")+'</span>';
    }).join("");
    const st = d.total
      ? '<div class="hg-st"><span>Esta semana <b>'+d.cont[11]+'</b></span><span>Média <b>'+num(d.media, 1)+'</b>/semana</span><span>Melhor <b>'+d.max+'</b> dias</span><span>Semanas seguidas <b>'+d.seg+'</b></span></div>'
      : '';
    return '<div class="hg-row">'+
      '<div class="hg-top"><b>'+d.h.nome+'</b><span>'+(d.total ? dias(d.total)+" registrados" : "sem registros ainda")+'</span>'+
        (d.pct !== null ? '<span class="hg-pct" role="img" aria-label="Registrou em '+d.pct+'% dos dias desde o primeiro registro" title="Dias com registro desde o primeiro registro">'+d.pct+'%</span>' : '')+'</div>'+
      '<div class="hg-cells" role="list" aria-label="'+d.h.nome+": dias com registro por semana, das últimas 12 semanas"+'">'+cels+'</div>'+st+
    '</div>';
  }).join("");
  let mesAnt = -1;
  const meses = semanas.map(ini=>{ const m = Number(ini.slice(5,7)) - 1; const novo = m !== mesAnt; mesAnt = m; return '<span>'+(novo ? HAB_MES[m] : '')+'</span>'; }).join("");
  const hgAnimar = !hgJaAnimou;
  box.classList.toggle("hg-anim", hgAnimar);
  hgJaAnimou = true;
  if(hgAnimar) setTimeout(()=> box.classList.remove("hg-anim"), 1500);   // não repete ao voltar para a aba
  box.innerHTML =
    '<h3 class="hg-h">Últimas 12 semanas</h3>'+
    '<p class="hg-sub">Cada quadradinho é uma semana; o número mostra em quantos dias você registrou. Registrar já conta, não há meta.'+
      (lider && lider.total ? ' Hábito que você mais registrou: <b>'+lider.h.nome+'</b>.' : '')+'</p>'+
    html+
    '<div class="hg-meses" aria-hidden="true">'+meses+'</div>'+
    '<div class="hg-leg" aria-hidden="true"><span>Dias por semana:</span>'+
      '<span class="hg-lg"><i class="hg-sw l0"></i>0</span><span class="hg-lg"><i class="hg-sw l1"></i>1–2</span><span class="hg-lg"><i class="hg-sw l2"></i>3–4</span><span class="hg-lg"><i class="hg-sw l3"></i>5–7</span>'+
      '<span class="hg-lg"><i class="hg-sw now"></i>semana atual</span><span class="hg-lg"><i class="hg-sw best"></i>melhor semana</span></div>';
}
function renderHabitos(){
  const box = document.getElementById("hab-resumo");
  if(!box) return;
  const dEl = document.getElementById("h-data");
  if(dEl && !dEl.value){ dEl.value = todayISO(); dEl.max = todayISO(); habPreencher(dEl.value); }
  const hoje = todayISO();
  const dias = [];
  for(let i = 0; i < 7; i++) dias.push(addDaysISO(hoje, -i));
  const reg = dias.map(iso=> ({iso, h:habDe(iso)})).filter(x=> x.h);
  if(!reg.length){
    box.innerHTML = '<p class="hab-vazio">Nenhum hábito registrado nos últimos 7 dias. Sem pressa: comece pelo que for mais fácil de anotar.</p>';
    return;
  }
  const med = (k)=>{ const v = reg.map(x=> x.h[k]).filter(x=> x != null); return v.length ? v.reduce((a,b)=> a+b, 0) / v.length : null; };
  const sono = med("sono"), passos = med("passos"), agua = med("agua");
  const cardioTot = reg.reduce((a,x)=> a + (x.h.cardio || 0), 0);
  const linhas = [];
  if(sono != null) linhas.push('<li><b>Sono médio: '+num(sono,1)+' h</b> — '+(sono >= 7 ? 'dentro da referência de 7 h ou mais.' : 'abaixo de 7 h, referência para adultos. Sem culpa: se puder, antecipe a hora de dormir aos poucos.')+'</li>');
  if(passos != null) linhas.push('<li><b>Passos médios: '+num(Math.round(passos),0)+'/dia</b> — '+(passos >= 7000 ? 'na faixa que estudos observacionais associam a menor mortalidade (7.000 a 10.000).' : 'abaixo de 7.000. Qualquer aumento já conta; tente uma caminhada curta a mais.')+'</li>');
  if(agua != null) linhas.push('<li><b>Água média: '+String(Math.round(agua*100)/100).replace('.', ',')+' L/dia</b> — só um registro; o app não define meta de água.</li>');
  if(cardioTot > 0) linhas.push('<li><b>Cárdio leve: '+cardioTot+' min em 7 dias</b> — no ritmo em que você ainda consegue conversar (teste da fala).</li>');
  const lista = reg.map(x=>{
    const partes = [];
    if(x.h.sono != null) partes.push(num(x.h.sono,1)+' h de sono');
    if(x.h.passos != null) partes.push(num(x.h.passos,0)+' passos');
    if(x.h.cardio != null) partes.push(x.h.cardio+' min de cárdio');
    if(x.h.agua != null) partes.push(String(x.h.agua).replace('.', ',')+' L de água');
    return '<li><span class="hab-d">'+fmtDateBR(x.iso)+'</span><span class="hab-v">'+partes.join(' · ')+'</span></li>';
  }).join("");
  /* v98 F9 — a lista dia a dia vem ACIMA do resumo "Últimos 7 dias" */
  box.innerHTML = '<ul class="hab-list" aria-label="Registro por dia">'+lista+'</ul>'+
    '<div class="hab-sum"><div class="hab-sum-h">Últimos 7 dias · '+reg.length+(reg.length === 1 ? ' dia registrado' : ' dias registrados')+'</div><ul class="hab-notes">'+linhas.join("")+'</ul></div>';
}
(function setupHabitos(){
  const f = document.getElementById("form-habitos");
  if(!f) return;
  f.addEventListener("submit", (e)=>{ e.preventDefault(); salvarHabitos(); });
  f.addEventListener("input", ()=> habMsg(null));
  const d = document.getElementById("h-data");
  if(d) d.addEventListener("change", ()=>{ if(d.value) habPreencher(d.value); });
})();

/* ---- dia leve ---- */
function registrarDiaLeve(){
  const iso = todayISO(), key = treinoKey(iso);
  if(!state.rotina[key]?.ativo) return;
  const existing = state.checkins[iso] || {};
  if(existing.concluido) return;
  const prevSnap = snapCheckin(iso);
  const before = captureCelebrationBaseline();
  const data = Object.assign({}, existing, {data:iso, dia:key, concluido:true, leve:true});
  delete data.rapido; delete data.rapidoEx;
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
  render();
  playSound("checkin");
  const anchor = document.getElementById("today-hero");
  const celebrated = celebrateProgress(before, anchor, {xp:NIVEL_XP_POR_LEVE});
  if(!celebrated) toastCheckinDesfazer("Dia leve registrado — sequência mantida. Descansar também é treinar.", iso, prevSnap);
}

/* ---- descanso sugerido por tipo de exercício (V12: ~2 min estabiliza o efeito; livre também vale) ---- */
const REST_COMPOSTO = /agachamento|terra|supino|remada curvada|remada cavalinho|desenvolvimento|barra fixa|puxada|leg press|hack|hip thrust|stiff|avan[cç]o/i;
function restSugerido(nome){
  return REST_COMPOSTO.test(nome || "") ? {txt:"2 a 3 min", presets:[120,180]} : {txt:"1 a 2 min", presets:[60,90,120]};
}

/* ---- sessão rápida (Full Body curto): 1 exercício por grande grupo, 3 séries, perto da falha ---- */
const SR_NUCLEO = ["peito","costas","ombros","quadriceps","posterior"];
const SR_EXTRAS = ["biceps","triceps","panturrilha"];
function sessaoRapidaItens(extras){
  const grupos = SR_NUCLEO.concat(extras ? SR_EXTRAS : []);
  const todos = [];
  DAYS.forEach(k=>{ const d = state.rotina[k]; if(d && Array.isArray(d.exercicios)) d.exercicios.forEach(ex=> todos.push(ex)); });
  const out = [];
  grupos.forEach(g=>{
    const c = todos.filter(ex=> Array.isArray(ex.musculos) && ex.musculos[0] === g);
    if(!c.length) return;
    out.push(c.reduce((a,b)=> (Number(b.series)||0) > (Number(a.series)||0) ? b : a));   // empate: o primeiro
  });
  return out;
}
function abrirSessaoRapida(){
  const iso = todayISO(), key = treinoKey(iso);
  if(!state.rotina[key]?.ativo || state.checkins[iso]?.concluido) return;
  const body = document.createElement("div");
  body.innerHTML = '<h2>Sessão rápida</h2><div id="sr-dyn"></div>';
  const marcados = new Set();
  let extras = false;
  const MIN_FEITOS = 3;
  function desenhar(){
    const itens = sessaoRapidaItens(extras);
    const dyn = body.querySelector("#sr-dyn");
    dyn.innerHTML =
      '<div class="sub">Semana apertada? Faça 1 exercício por grande grupo, 3 séries cada, parando com 1 a 2 repetições na reserva. Leva cerca de '+(itens.length*6)+' min e conta como o treino de hoje.</div>'+
      (itens.length
        ? '<ul class="sr-list">'+itens.map((ex,i)=>
            '<li><label class="sr-item"><input type="checkbox" data-sr="'+i+'"'+(marcados.has(ex.nome) ? ' checked' : '')+'>'+
            '<span class="sr-name">'+escapeHtml(ex.nome)+'</span>'+
            '<small>'+escapeHtml(MUSCLE_LANDMARKS[ex.musculos[0]].label)+' · 3 séries · descanso '+restSugerido(ex.nome).txt+'</small></label></li>').join("")+'</ul>'
        : '<div class="empty-note">Não achei exercícios suficientes na sua rotina para montar a sessão. Use o dia leve.</div>')+
      '<label class="rest-auto sr-extra"><input type="checkbox" id="sr-extra"'+(extras ? ' checked' : '')+'><span>Incluir braço e panturrilha</span></label>'+
      '<div class="hint" id="sr-hint" aria-live="polite"></div>'+
      '<div class="modal-actions"><button class="btn" id="sr-cancel" type="button">Cancelar</button><button class="btn primary" id="sr-ok" type="button" disabled>Concluir sessão rápida</button></div>';
    const atualiza = ()=>{
      const n = itens.filter(ex=> marcados.has(ex.nome)).length;
      const ok = body.querySelector("#sr-ok");
      ok.disabled = n < MIN_FEITOS;
      body.querySelector("#sr-hint").textContent = n < MIN_FEITOS
        ? "Marque o que você fez ("+n+" de "+itens.length+"). Com menos de "+MIN_FEITOS+", prefira registrar um dia leve."
        : n+" de "+itens.length+" exercícios marcados.";
    };
    dyn.querySelectorAll("input[data-sr]").forEach(inp=>{
      inp.addEventListener("change", ()=>{
        const ex = itens[Number(inp.dataset.sr)];
        if(inp.checked) marcados.add(ex.nome); else marcados.delete(ex.nome);
        atualiza();
      });
    });
    dyn.querySelector("#sr-extra").addEventListener("change", (e)=>{ extras = e.target.checked; desenhar(); const x = body.querySelector("#sr-extra"); if(x) x.focus(); });
    dyn.querySelector("#sr-cancel").addEventListener("click", closeModal);
    dyn.querySelector("#sr-ok").addEventListener("click", ()=>{
      const feitos = itens.filter(ex=> marcados.has(ex.nome)).map(ex=> ex.nome);
      if(feitos.length < MIN_FEITOS) return;
      const existing = state.checkins[iso] || {};
      const prevSnap = snapCheckin(iso);
      const before = captureCelebrationBaseline();
      const data = Object.assign({}, existing, {data:iso, dia:key, concluido:true, rapido:true, rapidoEx:feitos});
      delete data.leve;
      state.checkins[iso] = data;
      saveDoc("checkins/"+iso, data);
      closeModal();
      render();
      playSound("checkin");
      const celebrated = celebrateProgress(before, document.getElementById("today-hero"), {xp:NIVEL_XP_POR_TREINO});
      if(!celebrated) toastCheckinDesfazer("Sessão rápida registrada — treino de hoje concluído.", iso, prevSnap);
    });
    atualiza();
  }
  desenhar();
  openModal(body);
}

(function setupConstanciaV95(){
  const on = (id, ev, fn)=>{ const el = document.getElementById(id); if(el) el.addEventListener(ev, fn); };
  on("wg-minus", "click", ()=> ajustarMeta(-1));
  on("wg-plus", "click", ()=> ajustarMeta(1));
  on("cfg-recup-btn", "click", ()=> abrirComoEstou("config"));
  on("cfg-tour-btn", "click", ()=> iniciarTutorial(null));
})();

/* ============================================================
   NÍVEL / PATENTE (selo + XP) — Novato → Titã
   XP vem de treinos concluídos (60 XP cada) + bônus por marco de
   sequência batido (150 XP em cada marco de STREAK_MILESTONES).
   O histórico é recalculado a cada render varrendo dia a dia desde
   o início do uso do app, então nenhuma migração de dado é
   necessária — funciona com o que já está salvo em checkins/rotina.
   ============================================================ */
const NIVEL_TIERS = [
  {name:"Novato",     need:300},
  {name:"Aprendiz",   need:400},
  {name:"Praticante", need:500},
  {name:"Disciplinado",need:700},
  {name:"Resistente",  need:900},
  {name:"Atleta",     need:1100},
  {name:"Veterano",    need:1300},
  {name:"Campeão",    need:1500},
  {name:"Lenda",       need:1700},
  {name:"Titã",        need:2000},
];
const NIVEL_XP_POR_TREINO = 60;
const NIVEL_XP_POR_MARCO = 150;
const NIVEL_XP_POR_LEVE = 30;   // v95: dia leve = metade de um treino completo

function computeNivelInfo(){
  const boundaries = [0];
  NIVEL_TIERS.forEach(t=>boundaries.push(boundaries[boundaries.length-1]+t.need));
  // boundaries[i] = XP necessário pra começar a patente i (0-indexed); boundaries[N] = XP pra completar a última

  let iso = getTrackingStartISO();
  const end = todayISO();
  let cur = 0, treinos = 0, leves = 0, xp = 0, tierIndex = 0, freezeBalance = 0, xpTreinos = 0;
  let tierStartDate = iso;
  const milestonesHit = new Set();
  let daysElapsed = 0;

  while(iso <= end){
    daysElapsed++;
    if(daysElapsed % FREEZE_EARN_DAYS === 0 && freezeBalance < FREEZE_MAX) freezeBalance++;
    const key = treinoKey(iso);
    if(state.rotina[key]?.ativo){
      if(state.checkins[iso]?.concluido){
        cur++;
        if(state.checkins[iso].leve) leves++; else { treinos++; xpTreinos += xpDoTreino(state.checkins[iso], state.rotina[key]); }   // v95: dia leve mantém a sequência, mas vale metade do XP · NG+: exercícios parciais/pulados valem menos
        STREAK_MILESTONES.forEach(m=>{ if(cur>=m) milestonesHit.add(m); });
      } else if(freezeBalance > 0){
        freezeBalance--; // sequência protegida: mantém cur, não gera XP de treino
      } else {
        cur = 0;
      }
    }
    const newXp = xpTreinos + leves*NIVEL_XP_POR_LEVE + milestonesHit.size*NIVEL_XP_POR_MARCO;
    if(newXp > xp){
      xp = newXp;
      while(tierIndex < NIVEL_TIERS.length-1 && xp >= boundaries[tierIndex+1]){
        tierIndex++;
        tierStartDate = iso;
      }
    }
    iso = addDaysISO(iso, 1);
  }

  const isMax = tierIndex === NIVEL_TIERS.length-1 && xp >= boundaries[boundaries.length-1];
  const xpInTier = xp - boundaries[tierIndex];
  const tierNeed = NIVEL_TIERS[tierIndex].need;
  const diasNaPatente = Math.max(0, Math.round((new Date(end+"T00:00:00")-new Date(tierStartDate+"T00:00:00"))/MS_DAY)) + 1;

  return {
    tierIndex, tierName: NIVEL_TIERS[tierIndex].name, xp, xpInTier, tierNeed, isMax, diasNaPatente,
    proximaTier: NIVEL_TIERS[tierIndex+1]?.name || null,
    treinos, leves, marcos: milestonesHit.size, xpTreinos, xpLeves: leves*NIVEL_XP_POR_LEVE, xpMarcos: milestonesHit.size*NIVEL_XP_POR_MARCO,
    streakAtual: cur, proximoMarco: STREAK_MILESTONES.find(m=>!milestonesHit.has(m)) || null,
    treinosParaProxima: isMax ? 0 : Math.max(1, Math.ceil((tierNeed-xpInTier)/NIVEL_XP_POR_TREINO)),
  };
}

/* NG+ — topo e menu lateral (referência Kinora): título da seção + saudação, avatar, card de sequência no menu e
   botão de recolher o menu. Só leitura dos dados que o app já calcula; a única preferência guardada é a do menu
   (recolhido/expandido), no navegador (localStorage, com try/catch). */
const NAV_TITULOS = {painel:"Hoje", treino:"Treino", dieta:"Dieta", corpo:"Corpo", recomendacoes:"Dicas", perfil:"Perfil", glossario:"Glossário", config:"Configurações"};
function navTitulo(id){
  const el = document.getElementById("top-sec");
  if(el) el.textContent = NAV_TITULOS[id] || "NG+";
}
function navPrimeiroNome(){
  const p = state.perfil;
  return (p && p.nomeCompleto) ? String(p.nomeCompleto).trim().split(/\s+/)[0] : "";
}
function navSaudacao(){
  const h = new Date().getHours();
  const g = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const n = navPrimeiroNome();
  return n ? g+", "+n : g;
}
const SS_FLAME = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-1.7.8-3 1.7-4.2.3 1.2 1 1.9 1.8 2C11 7.5 11 4.5 12 2Z"/></svg>';
function renderSideStreak(){
  const box = document.getElementById("side-streak");
  if(!box) return;
  const eng = computeStreakEngine();
  const hoje = todayISO(), seg = mondayOfISO(hoje), start = getTrackingStartISO();
  const NOMES = {feito:"treino feito", hoje:"hoje", falta:"sem registro", descanso:"descanso", futuro:"ainda vai chegar"};
  const dots = [], falas = [];
  for(let i = 0; i < 7; i++){
    const iso = addDaysISO(seg, i), key = dayKeyFromISO(iso);
    const ativo = !!(state.rotina[key] && state.rotina[key].ativo);
    const c = state.checkins[iso];
    let st;
    if(c && c.concluido) st = "feito";
    else if(iso === hoje) st = "hoje";
    else if(iso > hoje) st = ativo ? "futuro" : "descanso";
    else if(iso < start || !ativo) st = "descanso";
    else st = "falta";
    dots.push('<span class="ss-d"><i class="ss-l">'+DAY_LABEL[key].charAt(0)+'</i><i class="ss-dot st-'+st+(st === "hoje" && c && c.concluido ? " feito" : "")+'"></i></span>');
    falas.push(DAY_LABEL[key]+": "+(iso === hoje && st !== "feito" ? "hoje, "+(ativo ? "treino em aberto" : "descanso") : NOMES[st]));
  }
  box.setAttribute("aria-label", "Sequência atual: "+eng.streak+(eng.streak === 1 ? " dia" : " dias")+". Esta semana, "+falas.join("; ")+".");
  box.innerHTML =
    '<span class="ss-head">'+SS_FLAME+'<span class="ss-eyebrow">Sequência atual</span></span>'+
    '<span class="ss-num"><b>'+eng.streak+'</b><span class="ss-unit">'+(eng.streak === 1 ? "dia" : "dias")+'</span></span>'+
    '<span class="ss-dots" aria-hidden="true">'+dots.join("")+'</span>';
}
function renderNavExtras(){
  const g = document.getElementById("top-greet");
  if(g) g.textContent = navSaudacao();
  const av = document.getElementById("top-avatar"), ini = document.getElementById("top-avatar-ini");
  const p = state.perfil, n = navPrimeiroNome();
  if(ini){
    const foto = p ? fotoPerfilValida(p.fotoPerfil) : null;
    ini.textContent = "";
    if(foto) ini.appendChild(fotoPerfilImg(foto)); else ini.textContent = p ? perfilInitials(p.nomeCompleto) : "?";
    if(av) av.classList.toggle("has-foto", !!foto);
  }
  if(av) av.setAttribute("aria-label", n ? "Abrir o perfil de "+n : "Abrir o perfil");
  navTitulo(visibleViewId());
  renderSideStreak();
}
function navAplicar(modo){
  document.documentElement.setAttribute("data-nav", modo);
  const b = document.getElementById("nav-toggle");
  if(b) b.setAttribute("aria-pressed", modo === "rail" ? "true" : "false");
}
(function setupNavExtras(){
  let modo = "wide";
  try{ if(localStorage.getItem("ng-nav") === "rail") modo = "rail"; }catch(e){}
  navAplicar(modo);
  const t = document.getElementById("nav-toggle");
  if(t) t.addEventListener("click", ()=>{
    modo = document.documentElement.getAttribute("data-nav") === "rail" ? "wide" : "rail";
    navAplicar(modo);
    try{ localStorage.setItem("ng-nav", modo); }catch(e){}
  });
  const s = document.getElementById("top-search");
  if(s) s.addEventListener("click", ()=>{ const c = document.getElementById("cmdk-open"); if(c) c.click(); });
})();
/* NG+ v3 · Fase 2 — botão central e menu de ações rápidas (celular).
   Não cria regra nova: cada ação reaproveita um botão ou função que o app já tem (iniciar/continuar treino,
   peso e medidas, hábitos do dia, marcar treino como feito). Teclado: Esc fecha, setas/Home/End movem, Tab fecha. */
(function setupAcoesRapidas(){
  const fab = document.getElementById("nav-fab"), menu = document.getElementById("nav-acoes");
  if(!fab || !menu) return;
  const IC = {
    treino:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5 3 10l4 4M17.5 17.5 21 14l-4-4M14 4l6 6M4 14l6 6M8.5 15.5l7-7"/></svg>',
    medida:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2"/></svg>',
    habito:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>',
    feito:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.8 2.8L16 9.6"/></svg>'
  };
  const reduz = ()=> !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  function foca(id){ const i = document.getElementById(id); if(i){ i.scrollIntoView({block:"center"}); i.focus({preventScroll:true}); } }
  function itens(){
    const live = document.getElementById("btn-treino-ao-vivo"), quick = document.getElementById("btn-quick-checkin");
    const rot = document.getElementById("today-primary-label");
    const ac = live ? live.dataset.acao : "";
    const dirTreino = (ac === "treino" || ac === "cadastro") && rot;
    const feitoHoje = ac === "concluido";
    const podeFeito = !!(quick && !quick.hidden);
    return [
      {ic:"treino", rotulo: dirTreino ? rot.textContent.trim() : "Abrir o treino", dica: dirTreino ? "Quest de hoje" : "Ver o treino da semana",
       run(){ if(dirTreino) live.click(); else showTab("treino"); }},
      {ic:"medida", rotulo:"Registrar medição", dica:"Peso e medidas do corpo",
       run(){ irParaPeso(); }},
      {ic:"habito", rotulo:"Hábitos do dia", dica:"Sono, passos e cárdio leve",
       run(){ Promise.resolve(showTabAnimated("corpo")).then(()=> setTimeout(()=> foca("h-sono"), 60)); }},
      {ic:"feito", rotulo:"Marcar treino como feito", dica: podeFeito ? "Registra a quest de hoje" : (feitoHoje ? "Já registrado hoje" : "Sem treino em aberto hoje"),
       desligado: !podeFeito, run(){ quick.click(); }}
    ];
  }
  let lista = [], fechaTimer = null;
  const aberto = ()=> fab.getAttribute("aria-expanded") === "true";
  function monta(){
    lista = itens();
    menu.textContent = "";
    lista.forEach((it, i)=>{
      const b = document.createElement("button");
      b.type = "button"; b.className = "na-item"; b.setAttribute("role", "menuitem"); b.tabIndex = -1; b.dataset.i = String(i);
      if(it.desligado) b.setAttribute("aria-disabled", "true");
      const ic = document.createElement("span"); ic.className = "na-ic"; ic.innerHTML = IC[it.ic];
      const tx = document.createElement("span"); tx.className = "na-tx";
      const a = document.createElement("b"); a.textContent = it.rotulo;
      const d = document.createElement("small"); d.textContent = it.dica;
      tx.append(a, d); b.append(ic, tx); menu.append(b);
    });
  }
  function abre(){
    clearTimeout(fechaTimer);
    monta();
    menu.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    requestAnimationFrame(()=> menu.classList.add("on"));
    const p = menu.querySelector(".na-item"); if(p) p.focus();
  }
  function fecha(volta){
    if(!aberto()) return;
    fab.setAttribute("aria-expanded", "false");
    menu.classList.remove("on");
    clearTimeout(fechaTimer);
    fechaTimer = setTimeout(()=>{ menu.hidden = true; }, reduz() ? 0 : 200);
    if(volta) fab.focus();
  }
  fab.addEventListener("click", ()=>{ aberto() ? fecha(true) : abre(); });
  menu.addEventListener("click", (e)=>{
    const b = e.target.closest(".na-item"); if(!b) return;
    const it = lista[+b.dataset.i];
    if(!it || it.desligado){ return; }
    fecha(false);
    it.run();
  });
  menu.addEventListener("keydown", (e)=>{
    const bs = Array.from(menu.querySelectorAll(".na-item")), i = bs.indexOf(document.activeElement);
    if(e.key === "Escape"){ e.preventDefault(); fecha(true); return; }
    if(e.key === "Tab"){ fecha(false); return; }
    if(!["ArrowDown","ArrowUp","Home","End"].includes(e.key)) return;
    e.preventDefault();
    const n = e.key === "Home" ? 0 : e.key === "End" ? bs.length-1 : e.key === "ArrowDown" ? (i+1) % bs.length : (i-1+bs.length) % bs.length;
    bs[n].focus();
  });
  fab.addEventListener("keydown", (e)=>{ if(e.key === "ArrowUp" && !aberto()){ e.preventDefault(); abre(); } else if(e.key === "Escape") fecha(true); });
  document.addEventListener("pointerdown", (e)=>{ if(aberto() && !menu.contains(e.target) && !fab.contains(e.target)) fecha(false); });
  // trocar de tela por outro caminho (barra, avatar, atalho de teclado) também fecha o menu
  document.addEventListener("click", (e)=>{ if(aberto() && e.target.closest && e.target.closest(".tab-btn, .top-avatar, .cmdk-chip, .top-search")) fecha(false); });
  // o avatar do topo é a porta do Perfil no celular: marca quando o Perfil está aberto
  const tp = document.getElementById("tab-perfil"), av = document.getElementById("top-avatar");
  function marcaAvatar(){
    if(!av || !tp) return;
    const on = tp.getAttribute("aria-selected") === "true";
    av.classList.toggle("on", on);
    if(on) av.setAttribute("aria-current", "page"); else av.removeAttribute("aria-current");
  }
  if(tp) new MutationObserver(marcaAvatar).observe(tp, {attributes:true, attributeFilter:["aria-selected"]});
  marcaAvatar();
})();
/* NG+ v3 · Fase 3 — tela Hoje: anel duplo, carrossel de métricas e missões de hoje.
   Só LÊ o que o app já calcula (computeStreakEngine, statsSemana, medições, check-in de hoje); nenhum dado novo é gravado.
   As ações reaproveitam botões e funções que já existem (iniciar treino, peso, hábitos). */
function hojeAtualizaAnelSemana(cur, total){
  const r = document.getElementById("today-ring-semana"), box = document.getElementById("today-ring-box");
  if(!r) return;
  const s = statsSemana(mondayOfISO(todayISO())), alvo = s.meta || s.cap;
  const frac = alvo ? Math.max(0, Math.min(1, s.feitos / alvo)) : 0, c = 2*Math.PI*25;
  r.setAttribute("stroke-dasharray", c.toFixed(1));
  r.setAttribute("stroke-dashoffset", (c*(1-frac)).toFixed(1));
  if(box) box.setAttribute("aria-label", "Anel de fora, hoje: "+(total > 0 ? cur+" de "+total+" exercícios" : "dia sem treino")+". Anel de dentro, semana: "+(alvo ? s.feitos+" de "+alvo+" treinos da meta" : "sem treinos agendados")+".");
}
function hojeIrHabitos(){
  Promise.resolve(showTabAnimated("corpo")).then(()=> setTimeout(()=>{ const i = document.getElementById("h-sono"); if(i){ i.scrollIntoView({block:"center"}); i.focus({preventScroll:true}); } }, 60));
}
function hojeDiasDesde(iso){
  const a = new Date(iso+"T12:00:00"), b = new Date(todayISO()+"T12:00:00");
  return Math.max(0, Math.round((b - a) / 864e5));
}
function hojeHabitosHoje(){
  const c = state.checkins[todayISO()], h = (c && c.hab) || {};
  const tem = v => v !== undefined && v !== null && v !== "" && Number(v) > 0;
  const itens = [];
  if(tem(h.sono)) itens.push(num(Number(h.sono), 1)+" h de sono");
  if(tem(h.passos)) itens.push(Number(h.passos).toLocaleString("pt-BR")+" passos");
  if(tem(h.cardio)) itens.push(h.cardio+" min de cárdio");
  return itens;
}
function hojeMetricas(){
  const hoje = todayISO(), out = [];
  // 1) sequência
  const eng = computeStreakEngine();
  out.push({id:"seq", rot:"Sequência", valor:String(eng.streak), unid: eng.streak === 1 ? "dia" : "dias",
    sub:"Recorde: "+eng.best+(eng.best === 1 ? " dia" : " dias"), ic:SS_FLAME, barra:null});
  // 2) treinos da semana (meta)
  const s = statsSemana(mondayOfISO(hoje)), alvo = s.meta || s.cap;
  out.push({id:"sem", rot:"Treinos da semana", valor: alvo ? s.feitos+"/"+alvo : "—", unid: alvo ? "da meta" : "",
    sub: !alvo ? "Sem treinos agendados" : s.ok ? "Meta da semana batida" : "Falta"+(alvo-s.feitos === 1 ? "" : "m")+" "+(alvo-s.feitos)+" para a meta",
    ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5 3 10l4 4M17.5 17.5 21 14l-4-4M14 4l6 6M4 14l6 6M8.5 15.5l7-7"/></svg>',
    barra: alvo ? Math.min(100, Math.round(s.feitos / alvo * 100)) : 0});
  // 3) peso
  const med = latestMedicao(), ms = sortedMedicoes().filter(m=> m.pesoKg != null);
  let subP = "Registre seu peso", valP = "—";
  if(med && med.pesoKg != null){
    valP = num(med.pesoKg, 1);
    const ant = ms.length >= 2 ? ms[ms.length-2] : null, d = ms.length >= 2 ? hojeDiasDesde(ms[ms.length-1].iso) : hojeDiasDesde(med.iso);
    const quando = d === 0 ? "hoje" : d === 1 ? "ontem" : "há "+d+" dias";
    if(ant){ const dl = ms[ms.length-1].pesoKg - ant.pesoKg; subP = (Math.abs(dl) < 0.05 ? "Estável" : (dl > 0 ? "+" : "−")+num(Math.abs(dl), 1)+" kg")+" desde a anterior · "+quando; }
    else subP = "Medido "+quando;
  }
  out.push({id:"peso", rot:"Peso atual", valor:valP, unid: valP === "—" ? "" : "kg", sub:subP,
    ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2"/></svg>', barra:null});
  // 4) hábitos de hoje
  const hb = hojeHabitosHoje();
  out.push({id:"hab", rot:"Hábitos de hoje", valor:hb.length+"/3", unid:"registros", sub: hb.length ? hb.join(" · ") : "Nada registrado hoje (opcional)",
    ic:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>', barra: Math.round(hb.length/3*100)});
  return out;
}
function renderHojeMetricas(){
  const tr = document.getElementById("hm-trilho"), dots = document.getElementById("hm-dots");
  if(!tr) return;
  const ms = hojeMetricas();
  tr.innerHTML = ms.map((m, i)=>
    '<button type="button" class="hm-card" data-hm="'+m.id+'" aria-label="'+(i+1)+' de '+ms.length+': '+escapeHtml(m.rot)+', '+escapeHtml(m.valor+(m.unid ? ' '+m.unid : ''))+'. '+escapeHtml(m.sub)+'">'+
      '<span class="hm-top"><span class="hm-ic" aria-hidden="true">'+m.ic+'</span><span class="eyebrow">'+escapeHtml(m.rot)+'</span></span>'+
      '<span class="hm-val"><b>'+escapeHtml(m.valor)+'</b>'+(m.unid ? '<small>'+escapeHtml(m.unid)+'</small>' : '')+'</span>'+
      '<span class="hm-sub">'+escapeHtml(m.sub)+'</span>'+
      (m.barra != null ? '<span class="hm-bar" aria-hidden="true"><i data-w="'+m.barra+'"></i></span>' : '')+
    '</button>').join("");
  tr.querySelectorAll(".hm-bar i").forEach(i=>{ i.style.width = i.dataset.w+"%"; });
  if(dots) dots.innerHTML = ms.map((m, i)=> '<span class="hm-dot'+(i === 0 ? ' on' : '')+'"></span>').join("");
}
function hojeMissoes(){
  const hoje = todayISO(), day = state.rotina[treinoKey(hoje)], c = state.checkins[hoje];
  const live = document.getElementById("btn-treino-ao-vivo");
  const lista = [];
  if(!state.perfil) lista.push({id:"cadastro", txt:"Fazer o seu cadastro", sub:"Leva 1 minuto e libera o treino e a dieta", feita:false, acao:"Começar"});
  else if(!day || !day.ativo) lista.push({id:"descanso", txt:"Descansar hoje", sub:"Dia sem treino: sono, proteína e uma caminhada leve contam", feita:true, descanso:true});
  else lista.push({id:"treino", txt: c && c.concluido ? "Treino de hoje concluído" : "Concluir o treino de hoje", sub: day.nome, feita: !!(c && c.concluido), acao: live && !live.disabled ? "Abrir" : ""});
  const hb = hojeHabitosHoje();
  lista.push({id:"hab", txt: hb.length ? "Hábitos de hoje registrados" : "Registrar sono, passos e cárdio", sub: hb.length ? hb.join(" · ") : "Opcional · não vale XP e não entra na sequência", feita: hb.length > 0, acao: hb.length ? "" : "Registrar"});
  const rec = pesoRecente();
  lista.push({id:"peso", txt: rec ? "Peso registrado esta semana" : "Registrar o seu peso", sub: rec ? "Última medição nos últimos 7 dias" : "Faz mais de 7 dias da última medição", feita: rec, acao: rec ? "" : "Registrar"});
  return lista;
}
const HOJE_IC_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const HOJE_IC_LUA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg>';
function renderHojeMissoes(){
  const ul = document.getElementById("hmi-lista"), cnt = document.getElementById("hmi-count");
  if(!ul) return;
  const ms = hojeMissoes(), feitas = ms.filter(m=> m.feita).length;
  if(cnt) cnt.textContent = feitas+" de "+ms.length+" feitas";
  ul.innerHTML = ms.map(m=>
    '<li class="hmi-item'+(m.feita ? ' feita' : '')+'" data-hmi="'+m.id+'">'+
      '<span class="hmi-st" aria-hidden="true">'+(m.descanso ? HOJE_IC_LUA : m.feita ? HOJE_IC_OK : '')+'</span>'+
      '<span class="hmi-tx"><b>'+escapeHtml(m.txt)+'</b><small>'+escapeHtml(m.sub)+'</small></span>'+
      '<span class="hmi-estado">'+(m.descanso ? 'Descanso' : m.feita ? 'Feita' : 'Em aberto')+'</span>'+
      (m.acao ? '<button type="button" class="btn small ghost hmi-go" data-hmi-go="'+m.id+'">'+m.acao+'</button>' : '')+
    '</li>').join("");
}
(function setupHoje(){
  const tr = document.getElementById("hm-trilho"), dots = document.getElementById("hm-dots"), mis = document.getElementById("hoje-missoes");
  if(tr){
    tr.addEventListener("click", (e)=>{
      const b = e.target.closest(".hm-card"); if(!b) return;
      const id = b.dataset.hm;
      if(id === "peso") irParaPeso();
      else if(id === "hab") hojeIrHabitos();
      else if(id === "sem") showTab("treino");
      else { const s = document.getElementById("cc-semana"); if(s) s.scrollIntoView({block:"start"}); }
    });
    let raf = 0;
    tr.addEventListener("scroll", ()=>{
      if(raf) return;
      raf = requestAnimationFrame(()=>{
        raf = 0;
        const cards = tr.querySelectorAll(".hm-card"); if(!cards.length || !dots) return;
        const w = cards[0].getBoundingClientRect().width + 10;
        const fim = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 2;
        const i = fim ? cards.length - 1 : Math.min(cards.length - 1, Math.round(tr.scrollLeft / w));
        dots.querySelectorAll(".hm-dot").forEach((d, k)=> d.classList.toggle("on", k === i));
      });
    }, {passive:true});
  }
  if(mis) mis.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-hmi-go]"); if(!b) return;
    const id = b.dataset.hmiGo;
    if(id === "peso") irParaPeso();
    else if(id === "hab") hojeIrHabitos();
    else { const live = document.getElementById("btn-treino-ao-vivo"); if(live && !live.disabled) live.click(); }
  });
})();
/* ---- NG+ visual v3 · Fase 7 · Corpo: KPIs com mini-gráficos e radar de músculos da semana.
        Tudo calculado de dados que o app já tem (nenhum dado novo é salvo). ---- */
let ckJaAnimou = false;
const CK_CAMPOS = [
  {k:"peso",    rot:"Peso",         un:"kg", dec:1, val:l=> l.peso},
  {k:"cintura", rot:"Cintura",      un:"cm", dec:1, val:l=> l.cintura},
  {k:"bf",      rot:"% de gordura", un:"%",  dec:1, val:l=> l.bf},
  {k:"imc",     rot:"IMC",          un:"",   dec:1, val:l=> l.imc}
];
function corpoLinhas(){
  const p = state.perfil;
  return sortedMedicoes().map(m=>({
    iso:m.iso, peso:m.pesoKg, cintura:m.cinturaCm,
    imc: p ? calcIMC(m.pesoKg, p.alturaCm) : null,
    bf: p ? calcBFNavy(p.sexo, m.cinturaCm, m.quadrilCm, m.pescocoCm, p.alturaCm) : null
  }));
}
function corpoDiasDesde(iso){
  const a = new Date(iso+"T12:00:00"), b = new Date(todayISO()+"T12:00:00");
  return Math.max(0, Math.round((b - a) / 864e5));
}
function corpoSparkSvg(vals){
  const W = 120, H = 36, px = 5, py = 6, n = vals.length;
  const mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals), span = mx - mn;
  const fx = v => Math.round(v*10)/10;
  const pts = vals.map((v,i)=>[
    n === 1 ? W/2 : px + i*(W-2*px)/(n-1),
    span === 0 ? H/2 : H - py - (v-mn)/span*(H-2*py)
  ]);
  const last = pts[n-1];
  return '<svg class="ck-spark" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">'+
    (n > 1 ? '<polyline class="ck-linha" points="'+pts.map(p=> fx(p[0])+","+fx(p[1])).join(" ")+'"/>' : '')+
    '<circle class="ck-ponto" cx="'+fx(last[0])+'" cy="'+fx(last[1])+'" r="3.2"/></svg>';
}
function renderCorpoKpis(){
  const box = document.getElementById("corpo-kpis");
  if(!box) return;
  const linhas = corpoLinhas();
  if(!linhas.length){
    box.classList.remove("ck-anim");
    box.innerHTML = '<div class="ck-vazio"><p>Sua primeira medição acende este resumo: peso, cintura, % de gordura e IMC, cada um com um mini-gráfico da sua evolução.</p>'+
      '<button type="button" class="btn small" data-ck="nova">Fazer a primeira medição</button></div>';
    return;
  }
  const html = CK_CAMPOS.map(c=>{
    const serie = linhas.filter(l=> { const v = c.val(l); return v != null && isFinite(v); });
    if(!serie.length){
      return '<button type="button" class="ck-card" data-ck="'+c.k+'"><span class="ck-rot">'+c.rot+'</span>'+
        '<span class="ck-val"><b>—</b></span><small class="ck-sub">sem dados ainda</small></button>';
    }
    const ult = serie[serie.length-1], ant = serie[serie.length-2];
    const v = c.val(ult), vs = serie.slice(-12).map(c.val);
    let delta;
    if(ant){
      const x = v - c.val(ant);
      delta = Math.abs(x) < Math.pow(10, -c.dec)/2
        ? 'igual desde '+fmtDateBR(ant.iso)
        : (x < 0 ? "▼ " : "▲ ")+num(Math.abs(x), c.dec)+(c.un ? " "+c.un : "")+' desde '+fmtDateBR(ant.iso);
    } else delta = "sua 1ª medição";
    const d = corpoDiasDesde(ult.iso);
    const quando = d === 0 ? "hoje" : d === 1 ? "ontem" : "há "+d+" dias";
    const lab = c.rot+": "+num(v, c.dec)+(c.un ? " "+c.un : "")+", "+delta+", medido "+quando+".";
    const seq = vs.length > 1 ? " Últimas "+vs.length+" medições: de "+num(vs[0], c.dec)+" a "+num(vs[vs.length-1], c.dec)+"." : "";
    return '<button type="button" class="ck-card" data-ck="'+c.k+'" aria-label="'+escapeHtml(lab+seq)+'">'+
      '<span class="ck-rot" aria-hidden="true">'+c.rot+'</span>'+
      '<span class="ck-val" aria-hidden="true"><b>'+num(v, c.dec)+'</b>'+(c.un ? '<small>'+c.un+'</small>' : '')+'</span>'+
      corpoSparkSvg(vs)+
      '<small class="ck-sub" aria-hidden="true">'+delta+' · '+quando+'</small></button>';
  }).join("");
  box.classList.toggle("ck-anim", !ckJaAnimou); ckJaAnimou = true;
  box.innerHTML = html;
  if(box.classList.contains("ck-anim")) setTimeout(()=> box.classList.remove("ck-anim"), 900);   // o acendimento não repete ao voltar para a aba
}

/* ---- Músculos da semana (últimos 7 dias) ---- */
const CK_GRUPOS = [
  {k:"Peito",  ms:["peito"]}, {k:"Costas", ms:["costas"]}, {k:"Ombros", ms:["ombros"]},
  {k:"Braços", ms:["biceps","triceps"]}, {k:"Pernas", ms:["quadriceps","posterior","gluteos","panturrilha"]}, {k:"Core", ms:["abdomen"]}
];
function corpoMusculos(){
  const hoje = todayISO();
  const tot = semanaRealizadaPorMusculo(addDaysISO(hoje, -6));
  return CK_GRUPOS.map(g=>{
    const itens = g.ms.map(m=>{ const lm = MUSCLE_LANDMARKS[m]; return {m, label:lm.label, mav:lm.mav, n:tot[m]||0}; });
    const series = itens.reduce((t,i)=> t + i.n, 0);
    const v = Math.round(100*itens.reduce((t,i)=> t + Math.min(1, i.n/i.mav), 0)/itens.length);
    return {k:g.k, v, series, itens};
  });
}
function corpoRadarSvg(axes){
  const W = 360, H = 270, cx = 180, cy = 138, R = 88, n = axes.length;
  const ang = i => (-90 + i*360/n) * Math.PI/180;
  const pt = (i, r) => [cx + r*Math.cos(ang(i)), cy + r*Math.sin(ang(i))];
  const fx = v => (Math.round(v*10)/10);
  const ring = f => axes.map((_,i)=>{ const p = pt(i, R*f); return fx(p[0])+","+fx(p[1]); }).join(" ");
  let s = '<svg class="radar-svg ck-radar-svg" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">';
  [0.25,0.5,0.75,1].forEach(f=>{ s += '<polygon class="radar-ring'+(f===1?' outer':'')+'" points="'+ring(f)+'"/>'; });
  axes.forEach((_,i)=>{ const p = pt(i, R); s += '<line class="radar-spoke" x1="'+cx+'" y1="'+cy+'" x2="'+fx(p[0])+'" y2="'+fx(p[1])+'"/>'; });
  const poly = axes.map((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); return fx(p[0])+","+fx(p[1]); }).join(" ");
  s += '<polygon class="radar-area" points="'+poly+'"/>';
  axes.forEach((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); s += '<circle class="radar-dot" cx="'+fx(p[0])+'" cy="'+fx(p[1])+'" r="4"/>'; });
  axes.forEach((a,i)=>{
    const p = pt(i, R+14), c = Math.cos(ang(i));
    const anchor = Math.abs(c) < 0.2 ? "middle" : (c > 0 ? "start" : "end");
    const dy = (i===0) ? -14 : (Math.sin(ang(i)) > 0.5 ? 6 : -4);
    s += '<text class="radar-lbl" x="'+fx(p[0])+'" y="'+fx(p[1]+dy)+'" text-anchor="'+anchor+'">'+escapeHtml(a.k)+'<tspan class="radar-val" x="'+fx(p[0])+'" dy="14">'+a.v+'%</tspan></text>';
  });
  return s + '</svg>';
}
function corpoInsights(axes){
  const out = [];
  const total = axes.reduce((t,a)=> t + a.series, 0);
  const top = axes.slice().sort((a,b)=> b.series - a.series)[0];
  out.push('Mais trabalhado nos últimos 7 dias: <b>'+escapeHtml(top.k)+'</b> ('+top.series+' série'+(top.series===1?'':'s')+').');
  const zero = axes.filter(a=> a.series === 0).map(a=> a.k);
  if(zero.length && zero.length < axes.length) out.push('Sem séries registradas em <b>'+zero.map(escapeHtml).join(", ")+'</b>: pode ser descanso planejado ou um treino que ainda está por vir. Sem cobrança.');
  const pernas = axes.filter(a=> a.k === "Pernas")[0];
  if(pernas && total >= 12){
    const pct = Math.round(100*pernas.series/total);
    if(pct < 20) out.push('Pernas ficaram com <b>'+pct+'%</b> das séries da semana. Se isso é o plano, tudo certo; se não, dá para encaixar um treino de pernas quando fizer sentido.');
  }
  return out;
}
function renderMusculosSemana(){
  const box = document.getElementById("musculos-body");
  if(!box) return;
  const axes = corpoMusculos();
  const total = axes.reduce((t,a)=> t + a.series, 0);
  if(!total){
    box.classList.add("ck-sem-dados");
    box.innerHTML = '<p class="hint ck-vazio-txt">Nenhuma série registrada nos últimos 7 dias. Quando você registrar um treino, o radar dos seus músculos aparece aqui.</p>';
    return;
  }
  box.classList.remove("ck-sem-dados");
  const lista = '<ul class="radar-list" aria-label="Músculos trabalhados nos últimos 7 dias">'+axes.map(a=>
    '<li><div class="radar-li-top"><span>'+escapeHtml(a.k)+'</span><b>'+a.series+' série'+(a.series===1?'':'s')+' · '+a.v+'%</b></div>'+
    '<div class="radar-li-bar" aria-hidden="true"><i style="width:'+a.v+'%"></i></div>'+
    '<small>'+a.itens.map(i=> escapeHtml(i.label)+' '+i.n+'/'+i.mav).join(' · ')+'</small></li>').join("")+'</ul>';
  const ins = '<div class="ck-insights"><h3>O que o radar diz</h3><ul>'+corpoInsights(axes).map(t=> '<li>'+t+'</li>').join("")+'</ul>'+
    '<p class="ck-nota">100% de um grupo = todos os músculos dele na faixa ideal de séries por semana (MAV), em média. É um retrato de 7 dias, não uma meta.</p></div>';
  box.innerHTML = corpoRadarSvg(axes) + lista + ins;
}
(function setupCorpoV3(){
  document.addEventListener("click", (e)=>{
    const b = e.target.closest && e.target.closest("[data-ck]");
    if(!b) return;
    const k = b.dataset.ck;
    const tab = (k === "peso" || k === "cintura") ? document.querySelector('#evolucao-tabs [data-metric="'+k+'"]') : null;
    if(k === "nova"){ const i = document.getElementById("m-peso"); if(i){ i.scrollIntoView({block:"center"}); i.focus({preventScroll:true}); } return; }
    if(tab){ tab.click(); const g = document.getElementById("evolucao-chart"); if(g) g.scrollIntoView({block:"center"}); return; }
    const t = document.getElementById("tabela-medicoes") || document.getElementById("med-resumo");
    if(t) t.scrollIntoView({block:"start"});
  });
})();
/* ---- NG+ visual v3 · Fases 8 e 9 · Perfil: moldura do avatar em CSS puro (anel de XP + ornamentos por patente).
        Tudo derivado de computeNivelInfo(); nada novo é salvo. ---- */
function renderMolduras(){
  let info;
  try{ info = computeNivelInfo(); }catch(e){ return; }
  const n = info.tierIndex + 1;
  const pct = info.isMax ? 100 : Math.max(0, Math.min(100, Math.round((info.xpInTier / info.tierNeed) * 100)));
  const aplica = el=>{
    if(!el) return;
    el.dataset.moldura = String(n);
    el.style.setProperty("--mc", "var(--t"+n+")");
    el.style.setProperty("--xp", String(pct));
  };
  const wrap = document.getElementById("perfil-avatar-wrap");
  aplica(wrap);
  if(wrap){
    wrap.setAttribute("aria-label", "Moldura do avatar: patente "+info.tierName+", nível "+n+" de "+NIVEL_TIERS.length+(info.isMax ? ", patente máxima." : ", "+pct+"% do caminho até a próxima patente."));
    const lv = wrap.querySelector(".pa-lv");
    if(lv) lv.textContent = String(n);
  }
  aplica(document.getElementById("top-avatar"));
}
/* ---- NG+ visual v3 · Fase 6 · Dieta: anel de calorias e macros (só visual; usa a meta e os macros que o app já calcula) ---- */
let daJaAnimou = false;
function renderDietaAnel(kcalAlvo, macros){
  const box = document.getElementById("dieta-anel");
  if(!box) return;
  if(!kcalAlvo || !macros){ box.innerHTML = ""; box.classList.add("is-vazio"); return; }
  box.classList.remove("is-vazio");
  const itens = [
    {nome:"Proteína",     cls:"p", d:macros.proteina},
    {nome:"Carboidrato",  cls:"c", d:macros.carbo},
    {nome:"Gordura",      cls:"g", d:macros.gordura}
  ];
  const tot = itens.reduce((t,i)=> t + i.d.kcal, 0) || 1;
  let ini = 0;
  const arcos = itens.map(i=>{
    const f = i.d.kcal / tot * 100, gap = f > 3 ? 1 : 0;
    const el = '<circle class="da-arco da-'+i.cls+'" cx="60" cy="60" r="48" pathLength="100" stroke-dasharray="'+(f - gap).toFixed(2)+' '+(100 - f + gap).toFixed(2)+'" stroke-dashoffset="'+(-ini).toFixed(2)+'" transform="rotate(-90 60 60)"/>';
    ini += f;
    return el;
  }).join("");
  const pressed = document.querySelector('#seg-objetivo [aria-pressed="true"]');
  const obj = pressed ? pressed.textContent.trim() : "";
  const lista = itens.map(i=>
    '<li><i class="da-sw da-'+i.cls+'" aria-hidden="true"></i><span class="da-n">'+i.nome+'</span><b>'+num(i.d.g,0)+' g</b><span class="da-pc">'+Math.round(i.d.kcal/tot*100)+'% das calorias</span></li>').join("");
  const animar = !daJaAnimou; daJaAnimou = true;
  box.classList.toggle("da-anim", animar);
  box.innerHTML =
    '<div class="da-anel"><svg viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle class="da-trilho" cx="60" cy="60" r="48"/>'+arcos+'</svg>'+
      '<div class="da-centro"><b>'+num(kcalAlvo,0)+'</b><small>kcal/dia</small></div></div>'+
    '<div class="da-info"><h2 class="da-t">Sua meta diária'+(obj ? ' <span>'+escapeHtml(obj)+'</span>' : '')+'</h2>'+
      '<ul class="da-lista" aria-label="Macronutrientes da meta diária">'+lista+'</ul></div>';
  if(animar) setTimeout(()=> box.classList.remove("da-anim"), 1200);   // não repete ao voltar para a aba
}
function renderNivel(){
  const info = computeNivelInfo();
  const n = info.tierIndex+1;
  const tc = "var(--t"+n+")";
  const card = document.getElementById("nivel-card");
  const sub = info.isMax
    ? "Nível "+n+" de "+NIVEL_TIERS.length+" · patente máxima"
    : "Nível "+n+" de "+NIVEL_TIERS.length+(info.proximaTier ? " · rumo a "+info.proximaTier : " · última patente");   // v98: na última patente não existe "próxima" (antes aparecia "rumo a null")
  const pct = info.isMax ? 100 : Math.min(100, Math.round((info.xpInTier/info.tierNeed)*100));
  const remain = info.isMax ? "patente máxima atingida" : "faltam "+num(info.tierNeed-info.xpInTier)+" XP";
  const setTxt = (id,t)=>{ const el=document.getElementById(id); if(el) el.textContent=t; };
  // Perfil — card completo
  if(card){
    card.style.setProperty("--tier-color", tc);
    setTxt("nivel-tier-name", info.tierName);
    setTxt("nivel-shield-num", n);
    setTxt("nivel-tier-sub", sub);
    document.getElementById("nivel-xp-fill").style.width = pct+"%";
    animateNumberEl(document.getElementById("nivel-xp-frac"), info.xpInTier, {suffix:" XP"});
    setTxt("nivel-xp-remain", remain);
    animateNumberEl(document.getElementById("nivel-xp-total"), info.xp);
    setTxt("nivel-dias-patente", info.diasNaPatente);
    setTxt("nivel-posicao", n+"ª");
    const next = document.getElementById("nivel-next");
    if(next){
      next.innerHTML = info.isMax
        ? "Você chegou ao topo. Continue treinando para manter a sequência."
        : "Ainda <b>"+info.treinosParaProxima+" treino"+(info.treinosParaProxima===1?"":"s")+"</b> para "+(info.proximaTier ? "<b>"+escapeHtml(info.proximaTier)+"</b> — e a cor de destaque dessa patente é liberada." : "concluir a patente <b>"+escapeHtml(info.tierName)+"</b>.")
          + (info.proximoMarco ? " Marco de sequência a "+info.proximoMarco+" dias vale <b>+"+NIVEL_XP_POR_MARCO+" XP</b>." : "");
    }
    const lad = document.getElementById("nivel-ladder");
    if(lad){
      lad.innerHTML = NIVEL_TIERS.map((t,i)=>
        '<li class="nivel-step'+(i<info.tierIndex?' done':(i===info.tierIndex?' now':''))+'" style="--sc:var(--t'+(i+1)+')"'+(i===info.tierIndex?' aria-current="step"':'')+' title="'+escapeHtml(t.name)+(i>info.tierIndex?' (bloqueada)':'')+'">'+
          '<i>'+(i+1)+'</i><small>'+escapeHtml(t.name.slice(0,4))+'</small></li>').join("");
    }
    const src = document.getElementById("nivel-src");
    if(src){
      src.innerHTML =
        '<span>Treinos concluídos <b>'+info.treinos+(info.xpTreinos === info.treinos*NIVEL_XP_POR_TREINO ? ' × '+NIVEL_XP_POR_TREINO+' = ' : ' · ')+num(info.xpTreinos)+' XP</b>'+(info.xpTreinos < info.treinos*NIVEL_XP_POR_TREINO ? ' <small>(exercícios encerrados antes ou pulados valem menos)</small>' : '')+'</span>'+
        '<span>Marcos de sequência <b>'+info.marcos+' × '+NIVEL_XP_POR_MARCO+' = '+num(info.xpMarcos)+' XP</b></span>'+
        (info.leves ? '<span>Dias leves <b>'+info.leves+' × '+NIVEL_XP_POR_LEVE+' = '+num(info.xpLeves)+' XP</b></span>' : '');
    }
  }
  // Painel — mini-card
  const mini = document.getElementById("nivel-mini");
  if(mini){
    mini.style.setProperty("--tier-color", tc);
    setTxt("nivel-mini-num", n);
    setTxt("nivel-mini-name", info.tierName);
    setTxt("nivel-mini-xp", info.isMax ? num(info.xp)+" XP" : num(info.xpInTier)+" / "+num(info.tierNeed)+" XP");
    document.getElementById("nivel-mini-fill").style.width = pct+"%";
    setTxt("nivel-mini-sub", info.isMax ? "Patente máxima" : !info.proximaTier ? "Faltam "+num(Math.max(0, info.tierNeed - info.xpInTier))+" XP para concluir a patente "+info.tierName : info.treinosParaProxima+" treino"+(info.treinosParaProxima===1?"":"s")+" para "+info.proximaTier);
  }
}

/* ============================================================
   SKINS — cor de destaque (--accent) desbloqueável por patente.
   Recompensa cosmética: reaproveita as cores --t1..--t10 já usadas
   nas patentes, sem precisar de arte nova. Persistida em
   config/settings (accentSkin: índice 0-9, ou null = padrão do app).
   ============================================================ */
// tintas fixas para texto sobre cor de destaque (espelham --ink-on-light / --on-color; canvas e setProperty precisam do valor literal)
const INK_DARK = "#12100c", INK_LIGHT = "#ffffff";
const TIER_HEX = ["#9c7a4d","#9a9a9a","#c1793a","#c3ccd4","#e0b23e","#3fd6c4","#4fa3f7","#39d17e","#ea4fb0","#ffe38a"];
const SKIN_LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
const SKIN_RESET_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 5l14 14M19 5 5 19"/></svg>';
function relLuminance(hex){
  const c = hex.replace('#','');
  const r = parseInt(c.substr(0,2),16)/255, g = parseInt(c.substr(2,2),16)/255, b = parseInt(c.substr(4,2),16)/255;
  const lin = v => v<=0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
}
const SUP_REL_COLOR = !!(window.CSS && CSS.supports && CSS.supports("color","oklch(from red l c h)"));
const SUP_CONTRAST_COLOR = !!(window.CSS && CSS.supports && CSS.supports("color","contrast-color(red)"));
function razaoContraste(h1,h2){ const a = relLuminance(h1), b = relLuminance(h2); return (Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); }
function melhorTinta(hex){ return razaoContraste(hex, INK_DARK) >= razaoContraste(hex, INK_LIGHT) ? INK_DARK : INK_LIGHT; }
function applyAccentSkin(){
  const root = document.documentElement;
  if(temaAtual()){   // v97: no tema pastel a cor de destaque é a do tema
    root.style.removeProperty('--accent'); root.style.removeProperty('--accent-soft'); root.style.removeProperty('--accent-ink');
    root.removeAttribute("data-skin-cc");
    return;
  }
  const idx = (state.settings && state.settings.accentSkin!=null) ? state.settings.accentSkin : null;
  if(idx==null || !TIER_HEX[idx]){
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-soft');
    root.style.removeProperty('--accent-ink');
    root.removeAttribute("data-skin-cc");
    return;
  }
  const hex = TIER_HEX[idx];
  root.style.setProperty('--accent', hex);
  // v94 V2: o texto sobre a cor de destaque é o de MAIOR contraste (razão WCAG real, não um corte de luminância);
  // com contrast-color() nativo o navegador decide sozinho. O fundo suave sai da própria cor via sintaxe de cor relativa.
  if(SUP_CONTRAST_COLOR){ root.style.removeProperty('--accent-ink'); root.setAttribute("data-skin-cc","1"); }
  else{ root.style.setProperty('--accent-ink', melhorTinta(hex)); root.removeAttribute("data-skin-cc"); }
  root.style.setProperty('--accent-soft', SUP_REL_COLOR ? 'oklch(from '+hex+' 0.29 calc(c * 0.3) h)' : 'color-mix(in srgb, '+hex+' 18%, var(--surface-2))');
}
/* v97 — TEMAS: o modo jogo (escuro, HUD) é o padrão; rosa, roxo e azul pastel (claro e escuro) são escolhas livres em Config. */
const TEMAS = {
  rosa:{nome:"Rosa pastel", sw:{claro:["#fdf1f5","#fbe6ee","#f08fb4"], escuro:["#1d1218","#342129","#f4a6c4"]}},
  roxo:{nome:"Roxo pastel", sw:{claro:["#f6f2fd","#ece4fa","#b79cf0"], escuro:["#17131f","#2b2339","#c3acf2"]}},
  azul:{nome:"Azul pastel", sw:{claro:["#eff6fd","#e1eefb","#7fbcf0"], escuro:["#111820","#1f2d3b","#8cc4f2"]}},
};
/* v3 — PALETAS do modo jogo (HUD escuro): Lima é a padrão; Violeta e Ouro só trocam variáveis de cor (data-paleta em <html>).
   Os temas pastel acima continuam como estavam. A cor de patente (skin) segue valendo por cima de qualquer paleta. */
const PALETAS = {
  lima:{nome:"Lima", sub:"padrão", sw:["#06080a","#151b1f","#a3e635"]},
  violeta:{nome:"Violeta", sub:"escuro", sw:["#0b0813","#1d1730","#a78bfa"]},
  ouro:{nome:"Ouro", sub:"escuro", sw:["#0a0804","#1d1910","#e5b83d"]},
};
function paletaAtual(){
  let p = state.settings && state.settings.paleta;
  if(p === undefined && !state.settingsCarregado){ try{ p = localStorage.getItem("ng-paleta"); }catch(e){} }
  return (p && PALETAS[p]) ? p : "lima";
}
function setPaleta(p){
  const novo = Object.assign({}, state.settings, {tema:"padrao", paleta:p});
  state.settings = novo;
  try{ localStorage.setItem("bff-tema", "padrao|"+(novo.temaModo || "claro")); localStorage.setItem("ng-paleta", p); }catch(e){}
  applyAccentSkin(); applyGameMode();
  saveDoc("config/settings", state.settings);
  renderTemas(); renderSkins();
}
function temaBotoesHtml(atual, modo){
  const sw = a => '<span class="theme-sw" aria-hidden="true">'+a.map(c=>'<i style="background:'+c+'"></i>').join("")+'</span>';
  const pal = paletaAtual();
  return Object.keys(PALETAS).map(k=>'<button type="button" class="theme-opt" role="radio" aria-checked="'+(atual==="padrao" && pal===k)+'" data-tema="padrao" data-paleta="'+k+'">'+sw(PALETAS[k].sw)+'<span>'+PALETAS[k].nome+'<br><small>'+PALETAS[k].sub+'</small></span></button>').join("")+
    Object.keys(TEMAS).map(k=>'<button type="button" class="theme-opt" role="radio" aria-checked="'+(atual===k)+'" data-tema="'+k+'">'+sw(TEMAS[k].sw[modo])+'<span>'+TEMAS[k].nome+'</span></button>').join("");
}
function temaJaAtivo(b, atual){ return b.dataset.tema === "padrao" ? (atual === "padrao" && paletaAtual() === (b.dataset.paleta || "lima")) : b.dataset.tema === atual; }
function temaEscolhe(b){ if(b.dataset.tema === "padrao") setPaleta(b.dataset.paleta || "lima"); else setTema(b.dataset.tema); }
function temaSeletor(b){ return '[data-tema="'+b.dataset.tema+'"]'+(b.dataset.paleta ? '[data-paleta="'+b.dataset.paleta+'"]' : ''); }
function temaGuardado(){
  try{ const v = (localStorage.getItem("bff-tema") || "").split("|"); return {tema:v[0], modo:v[1]}; }catch(e){ return {}; }
}
function temaAtual(){
  let t = state.settings && state.settings.tema;
  if(t === undefined && !state.settingsCarregado) t = temaGuardado().tema;   // evita o "piscar" escuro antes de o banco responder
  return (t && TEMAS[t]) ? t : null;
}
function temaModo(){
  let m = state.settings && state.settings.temaModo;
  if(m === undefined && !state.settingsCarregado) m = temaGuardado().modo;
  return m === "escuro" ? "escuro" : "claro";
}
function setTema(t, modo){
  const novo = Object.assign({}, state.settings, {tema:t});
  if(modo) novo.temaModo = modo; else if(t !== "padrao" && !novo.temaModo) novo.temaModo = "claro";
  state.settings = novo;
  try{ localStorage.setItem("bff-tema", t+"|"+(novo.temaModo || "claro")); }catch(e){}
  applyAccentSkin(); applyGameMode();
  saveDoc("config/settings", state.settings);
  renderTemas(); renderSkins();
}
function renderTemas(){
  const row = document.getElementById("theme-row");
  if(!row) return;
  const atual = temaAtual() || "padrao", modo = temaModo();
  const sw = a => '<span class="theme-sw" aria-hidden="true">'+a.map(c=>'<i style="background:'+c+'"></i>').join("")+'</span>';
  row.innerHTML = temaBotoesHtml(atual, modo);
  row.querySelectorAll(".theme-opt").forEach(b=> b.addEventListener("click", ()=>{
    if(temaJaAtivo(b, atual)) return;
    const sel = temaSeletor(b), t = b.dataset.tema;
    temaEscolhe(b);
    showToast(t === "padrao" ? "Paleta "+PALETAS[b.dataset.paleta || "lima"].nome+" ativada." : TEMAS[t].nome+" ativado.");
    const nb = document.querySelector('#theme-row '+sel); if(nb) nb.focus();
  }));
  const wrap = document.getElementById("theme-modo-wrap");
  if(wrap) wrap.hidden = atual === "padrao";
  document.querySelectorAll("#theme-modo-seg button").forEach(b=>{
    const on = b.dataset.v === modo;
    b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
    b.onclick = ()=>{ setTema(atual, b.dataset.v); const nb = document.querySelector('#theme-modo-seg [data-v="'+b.dataset.v+'"]'); if(nb) nb.focus(); };
  });
  const hint = document.getElementById("theme-hint");
  if(hint) hint.textContent = atual === "padrao"
    ? "Escolha uma paleta do modo jogo (Lima, Violeta ou Ouro) ou um tema pastel. Dá para trocar quando quiser."
    : "No tema pastel a cor de destaque vem do tema. Para usar as cores de patente, volte ao modo jogo.";
}
function applyGameMode(){
  const root = document.documentElement, t = temaAtual();
  if(!t){
    root.setAttribute("data-game", "on"); root.removeAttribute("data-tema"); root.removeAttribute("data-modo");
    const pa = paletaAtual(); if(pa === "lima") root.removeAttribute("data-paleta"); else root.setAttribute("data-paleta", pa);
    return;
  }
  root.removeAttribute("data-paleta");
  root.setAttribute("data-game", "off");
  root.setAttribute("data-tema", t);
  root.setAttribute("data-modo", temaModo());
}
/* ============================================================
   FICHA DE PERSONAGEM — "atributos" de RPG derivados de dados reais
   que o app já calcula (nunca números inventados): consistência (%
   de treinos feitos nos últimos 30 dias), força (maior carga já
   registrada) e evolução (variação de cintura desde a 1ª medição).
   ============================================================ */
function getBestCargaGlobal(){
  let best = null;
  Object.keys(state.checkins||{}).forEach(iso=>{
    const c = state.checkins[iso];
    if(c && c.cargas){
      Object.keys(c.cargas).forEach(nome=>{
        const peso = Number(c.cargas[nome]);
        if(!isNaN(peso) && peso>0 && (!best || peso > best.peso)) best = {nome, peso};
      });
    }
  });
  return best;
}
function getCinturaEvolucao(){
  const isos = Object.keys(state.medicoes||{}).sort();
  if(isos.length < 2) return null;
  const first = state.medicoes[isos[0]], last = state.medicoes[isos[isos.length-1]];
  if(first.cinturaCm==null || last.cinturaCm==null) return null;
  return last.cinturaCm - first.cinturaCm;
}
/* ---- NG+ visual v4 · Ficha de personagem: atributos de RPG calculados só de dados reais (nenhum dado novo é salvo) ---- */
function fichaDados(){
  const hoje = todayISO(), ini30 = addDaysISO(hoje, -29);
  const porEx = {};
  Object.keys(state.checkins||{}).sort().forEach(iso=>{
    const c = state.checkins[iso]; if(!c || !c.cargas) return;
    Object.keys(c.cargas).forEach(nome=>{
      const peso = Number(c.cargas[nome]); if(!(peso > 0)) return;
      (porEx[nome] = porEx[nome] || []).push({iso, peso});
    });
  });
  const exs = Object.keys(porEx).map(nome=>{
    const h = porEx[nome], pr = Math.max.apply(null, h.map(x=>x.peso));
    const prIso = h.filter(x=>x.peso === pr)[0].iso;
    return {nome, n:h.length, pr, prIso, last:h[h.length-1].peso, novo: prIso >= ini30 && h.some(x=>x.iso < prIso)};
  });
  const comHist = exs.filter(e=> e.n >= 2);
  const forca = comHist.length ? Math.round(100*comHist.reduce((t,e)=> t + Math.min(1, e.last/e.pr), 0)/comHist.length) : 0;
  const top = exs.slice().sort((a,b)=> b.pr - a.pr || (a.nome < b.nome ? -1 : 1));
  // séries: feitas x previstas (treinos agendados dos últimos 30 dias, com a rotina atual) e séries de ouro
  let sPrev = 0, sFeito = 0, ouros = 0, exSess = 0;
  activeDaysInRange(ini30, hoje).filter(iso=> iso < hoje || state.checkins[iso]).forEach(iso=>{
    const c = state.checkins[iso];
    const dia = state.rotina[(c && c.dia) || dayKeyFromISO(iso)];
    ((dia && dia.exercicios) || []).forEach((ex,i)=>{
      sPrev += Math.max(1, Number(ex.series)||1);
      if(c){ const e = estadoEx(c, i, ex); sFeito += Math.min(e.n, Math.max(1, Number(ex.series)||1)); }
    });
  });
  Object.keys(state.checkins||{}).forEach(iso=>{
    if(iso < ini30 || iso > hoje) return;
    const c = state.checkins[iso]; if(!c) return;
    const dia = state.rotina[c.dia || treinoKey(iso)];
    ((dia && dia.exercicios) || []).forEach((ex,i)=>{
      const sets = setsDe(c, i, ex); if(!sets.length) return;
      exSess++; ouros += rankSeries(sets).filter(m=> m.k === "ouro").length;
    });
  });
  return {exs, top, maiorCarga: top[0] || null, forca, nComHist: comHist.length, recordes30: exs.filter(e=> e.novo).sort((a,b)=> b.prIso < a.prIso ? -1 : 1), sPrev, sFeito, ouros, exSess};
}
function radarAxes(){
  const today = todayISO(), f = fichaDados();
  const sched30 = activeDaysInRange(addDaysISO(today, -29), today);
  const done30 = sched30.filter(iso=> state.checkins[iso]?.concluido).length;
  let habDias = 0;
  for(let i=0;i<14;i++){ if(habDe(addDaysISO(today, -i))) habDias++; }
  const medIsos = Object.keys(state.medicoes||{});
  let medSem = 0;
  for(let w=0; w<4; w++){
    const a = addDaysISO(today, -(7*w+6)), b = addDaysISO(today, -7*w);
    if(medIsos.some(iso=> iso>=a && iso<=b)) medSem++;
  }
  const pct = (a,b)=> b>0 ? Math.round(Math.min(1, a/b)*100) : 0;
  return [
    {k:"Força", ab:"FOR", v:f.forca, sub: f.nComHist ? "carga atual em "+f.forca+"% do seu pico (média de "+f.nComHist+" exercício"+(f.nComHist===1?"":"s")+")" : "registre cargas em 2 ou mais treinos"},
    {k:"Resistência", ab:"RES", v:pct(f.sFeito, f.sPrev), sub: f.sPrev ? f.sFeito+" de "+f.sPrev+" séries previstas em 30 dias" : "sem treinos agendados ainda"},
    {k:"Disciplina", ab:"DIS", v:pct(done30, sched30.length), sub: sched30.length ? done30+" de "+sched30.length+" treinos em 30 dias" : "sem treinos agendados ainda"},
    {k:"Vitalidade", ab:"VIT", v:pct(habDias, 14), sub: habDias+" de 14 dias com hábitos registrados"},
    {k:"Foco", ab:"FOC", v:pct(medSem, 4), sub: medSem+" de 4 semanas com medição"}
  ];
}
let rdJaAnimou = false;
function renderRadar(){
  const el = document.getElementById("attrs-radar");
  if(!el) return;
  const axes = radarAxes(), f = fichaDados();
  const W = 360, H = 270, cx = 180, cy = 142, R = 88, n = axes.length;
  const ang = i => (-90 + i*360/n) * Math.PI/180;
  const pt = (i, r) => [cx + r*Math.cos(ang(i)), cy + r*Math.sin(ang(i))];
  const fx = v => (Math.round(v*10)/10);
  const ring = frac => axes.map((_,i)=>{ const p = pt(i, R*frac); return fx(p[0])+","+fx(p[1]); }).join(" ");
  let svg = '<svg class="radar-svg" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">';
  [0.25,0.5,0.75,1].forEach(fr=>{ svg += '<polygon class="radar-ring'+(fr===1?' outer':'')+'" points="'+ring(fr)+'"/>'; });
  axes.forEach((_,i)=>{ const p = pt(i, R); svg += '<line class="radar-spoke" x1="'+cx+'" y1="'+cy+'" x2="'+fx(p[0])+'" y2="'+fx(p[1])+'"/>'; });
  const poly = axes.map((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); return fx(p[0])+","+fx(p[1]); }).join(" ");
  svg += '<polygon class="radar-area" points="'+poly+'"/>';
  axes.forEach((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); svg += '<circle class="radar-dot" cx="'+fx(p[0])+'" cy="'+fx(p[1])+'" r="4"/>'; });
  axes.forEach((a,i)=>{
    const p = pt(i, R+14), c = Math.cos(ang(i));
    const anchor = Math.abs(c) < 0.2 ? "middle" : (c > 0 ? "start" : "end");
    const dy = (i===0) ? -14 : (Math.sin(ang(i)) > 0.5 ? 6 : -4);
    svg += '<text class="radar-lbl" x="'+fx(p[0])+'" y="'+fx(p[1]+dy)+'" text-anchor="'+anchor+'">'+a.ab+'<tspan class="radar-val" x="'+fx(p[0])+'" dy="14">'+a.v+'%</tspan></text>';
  });
  svg += '</svg>';
  const dom = axes.slice().sort((a,b)=> b.v - a.v)[0];
  const info = computeNivelInfo();
  const patPct = info.isMax ? 100 : Math.min(100, Math.round((info.xpInTier/info.tierNeed)*100));
  const head = '<div class="fi-head"><div class="fi-pat"><span class="fi-eb">Patente</span><b>'+escapeHtml(info.tierName)+'</b></div>'+
    '<div class="fi-xp"><div class="radar-li-bar" role="img" aria-label="Progresso na patente: '+patPct+'%"><i style="width:'+patPct+'%"></i></div><small>'+(info.isMax ? "patente máxima atingida" : num(info.xpInTier)+" de "+num(info.tierNeed)+" XP")+'</small></div>'+
    (dom && dom.v > 0 ? '<div class="fi-dom"><span class="fi-eb">Atributo dominante</span><b>'+escapeHtml(dom.k)+'</b></div>' : '')+'</div>';
  const list = '<ul class="radar-list" aria-label="Atributos da ficha de personagem">'+axes.map(a=>
    '<li><div class="radar-li-top"><span><em class="ab">'+a.ab+'</em>'+escapeHtml(a.k)+'</span><b><i class="nv">Nv '+Math.max(1, Math.ceil(a.v/20))+'</i>'+a.v+'%</b></div>'+
    '<div class="radar-li-bar" aria-hidden="true"><i style="width:'+a.v+'%"></i></div>'+
    '<small>'+escapeHtml(a.sub)+'</small></li>').join("")+'</ul>';
  const hall = f.top.length
    ? '<div class="radar-hall"><h3>Hall de cargas</h3><ol>'+f.top.slice(0,3).map((e,i)=>
        '<li><i class="sl-dot sl-'+MEDALHAS[i].k+'" aria-hidden="true"></i><span class="hn"><span class="sr-only">'+(i+1)+'º lugar: </span>'+escapeHtml(e.nome)+'</span><b>'+fmtKg(e.pr)+' kg</b><small>'+fmtDateBR(e.prIso)+'</small></li>').join("")+'</ol></div>'
    : '<div class="radar-hall"><h3>Hall de cargas</h3><p class="hint">Registre cargas nos treinos para montar o seu Hall.</p></div>';
  const rdAnimar = !rdJaAnimou; rdJaAnimou = true;
  el.classList.toggle("rd-anim", rdAnimar);
  el.innerHTML = head + svg + list + hall;
  if(rdAnimar) setTimeout(()=> el.classList.remove("rd-anim"), 1200);   // não repete ao voltar para a aba
}
function renderAttrs(){
  const el = document.getElementById("attrs-grid");
  if(!el) return;
  const f = fichaDados(), m = f.maiorCarga;
  const tile = (ic, val, lab, sub) => '<div class="attr-tile"><span class="attr-ic" aria-hidden="true">'+ic+'</span><span class="attr-val">'+val+'</span><span class="attr-label">'+lab+'</span><span class="attr-sub">'+sub+'</span></div>';
  const rec = f.recordes30;
  el.innerHTML =
    tile(ICON_DUMBBELL, m ? fmtKg(m.pr)+" kg" : "—", "Maior carga", m ? escapeHtml(m.nome) : "registre uma carga no treino") +
    tile(ICON_TROPHY, String(rec.length), "Recordes em 30 dias", rec.length ? escapeHtml(rec.slice(0,2).map(r=>r.nome).join(", "))+(rec.length > 2 ? " e +"+(rec.length-2) : "") : "bata uma carga nova e ela aparece aqui") +
    tile(ICON_BOLT, String(f.ouros), "Séries de ouro em 30 dias", f.exSess ? "em "+f.exSess+" exercício"+(f.exSess===1?"":"s")+" registrado"+(f.exSess===1?"":"s") : "registre séries no treino");
}

/* ============================================================
   NARRADOR — "Ferro", o companheiro que comenta seu progresso.
   Mensagem contextual e priorizada, recalculada a cada render a
   partir de dados já existentes (sem estado próprio para salvar).
   ============================================================ */
function renderNarrator(){
  const card = document.getElementById("narrator-card");
  const msgEl = document.getElementById("narrator-msg");
  if(!card || !msgEl) return;

  const today = todayISO();
  const todayKey = treinoKey(today);
  const todayDay = state.rotina ? state.rotina[todayKey] : null;
  const todayAtivo = !!(todayDay && todayDay.ativo);
  const todayDone = !!state.checkins[today]?.concluido;
  const engine = computeStreakEngine();
  const info = computeNivelInfo();
  const streak = engine.streak;

  const atRisk = streak > 0 && todayAtivo && !todayDone && new Date().getHours() >= 20;
  const isPerfect = engine.perfect && streak >= 7;
  const lastDoneIso = Object.keys(state.checkins).filter(iso=> state.checkins[iso]?.concluido).sort().pop() || null;
  const diasSemCheckin = lastDoneIso ? Math.round((new Date(today+"T00:00:00") - new Date(lastDoneIso+"T00:00:00"))/MS_DAY) : null;
  const ausenciaLonga = diasSemCheckin!=null && diasSemCheckin >= 3 && todayAtivo && !todayDone;

  let msg = null;

  if(atRisk){
    msg = "Ainda dá tempo de manter seus "+streak+" dia"+(streak===1?"":"s")+" seguido"+(streak===1?"":"s")+". Um treino curto ou um dia leve resolvem.";
  } else if(ausenciaLonga){
    msg = "Já faz "+diasSemCheckin+" dias desde seu último treino registrado. Sem culpa — só retomar: hoje é "+todayDay.nome+".";
  } else if(info.diasNaPatente === 0 && info.tierIndex > 0){
    msg = "Parabéns, você acabou de subir pra patente "+info.tierName+"! Continue assim.";
  } else if(todayDone && todayAtivo && state.checkins[today]?.leve){
    msg = "Dia leve registrado — sequência mantida. Descansar também é treinar.";
  } else if(todayDone && todayAtivo){
    msg = "Quest de hoje concluída — já pode relaxar. Mandou bem!";
  } else if(!todayAtivo){
    msg = "Hoje é dia de descanso. Aproveite pra recuperar, seu corpo agradece.";
  } else if(isPerfect){
    msg = "Sequência perfeita de "+streak+" dias, sem nenhum congelamento usado. Isso é disciplina de verdade.";
  } else if(streak === 0 && engine.best > 0){
    msg = "Recomeçar faz parte: seu recorde de "+engine.best+" dia"+(engine.best===1?"":"s")+" segue de pé. Hoje é um novo começo, sem compensar o que passou.";
  } else if(streak >= 30){
    msg = streak+" dias seguidos. Você já não depende mais de motivação — isso virou hábito.";
  } else if(streak >= 7){
    msg = "Sequência sólida de "+streak+" dias. É exatamente assim que resultado se constrói.";
  } else if(streak > 0){
    msg = "Você está em "+streak+" dia"+(streak===1?"":"s")+" seguido"+(streak===1?"":"s")+". Bora manter o ritmo até completar 1 semana.";
  } else {
    msg = "Conclua a quest de hoje pra começar sua sequência. Eu tô aqui torcendo por você.";
  }

  card.hidden = false;
  msgEl.textContent = msg;
}

function renderSkins(){
  const row = document.getElementById("skins-row");
  if(!row) return;
  const pastel = !!temaAtual();
  row.classList.toggle("is-off", pastel);
  const skHint = document.getElementById("skins-hint");
  if(skHint) skHint.textContent = pastel ? "— no tema pastel a cor vem do tema" : "— desbloqueada por patente";
  const tierIndex = computeNivelInfo().tierIndex;
  const current = (state.settings && state.settings.accentSkin!=null) ? state.settings.accentSkin : null;
  let html = '<button type="button" class="skin-swatch'+(current==null?' active':'')+'" data-skin="default" title="Cor padrão do app" style="background:var(--surface-2); border-color:var(--line-strong); color:var(--muted);">'+SKIN_RESET_SVG+'</button>';
  NIVEL_TIERS.forEach((t,i)=>{
    const locked = i > tierIndex;
    html += '<button type="button" class="skin-swatch'+(locked?' locked':'')+(current===i?' active':'')+'" data-skin="'+i+'" title="'+(locked?("Desbloqueia na patente "+t.name):("Usar a cor da patente "+t.name))+'" style="background:'+TIER_HEX[i]+'; --swatch-glow:color-mix(in srgb, '+TIER_HEX[i]+' 60%, transparent);">'+(locked?SKIN_LOCK_SVG:'')+'</button>';
  });
  row.innerHTML = html;
  row.querySelectorAll(".skin-swatch").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      if(temaAtual()){ showToast("As cores de patente só funcionam no modo jogo. Ative-o em Config › Personalização."); return; }
      if(btn.classList.contains("locked")){ showToast("Essa cor ainda está bloqueada. Alcance a patente para liberar."); return; }
      const val = btn.dataset.skin;
      const idx = val==="default" ? null : Number(val);
      state.settings = Object.assign({}, state.settings, {accentSkin: idx});
      applyAccentSkin();
      saveDoc("config/settings", state.settings);
      renderSkins();
    });
  });
}

/* ============================================================
   CONFIG — conta (apelido) e idioma (placeholder)
   ============================================================ */
function renderConfigExtras(){
  const usuarioInput = document.getElementById("cfg-usuario");
  if(usuarioInput && document.activeElement !== usuarioInput){
    usuarioInput.value = (state.perfil && state.perfil.nomeUsuario) || "";
  }
  const idioma = (state.settings && state.settings.idioma) || "pt";
  const seg = document.getElementById("cfg-idioma-seg");
  if(seg){
    seg.querySelectorAll("button").forEach(b=> b.classList.toggle("active", b.dataset.v === idioma));
  }

  const lt = localTreinoAtual();
  const modoLocal = lt ? lt.modo : "academia";
  document.querySelectorAll("#cfg-local-seg button").forEach(b=>{ const on = b.dataset.v === modoLocal; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
  const localResumo = document.getElementById("cfg-local-resumo");
  if(localResumo){
    localResumo.textContent = state.rotinaIsExample
      ? "Você ainda não salvou uma rotina: o plano de exemplo já segue a sua escolha."
      : (lt ? "Semana adaptada para "+LOCAL_TREINO_NOMES[lt.modo].toLowerCase()+": "+lt.trocados+" de "+lt.total+" exercícios trocados. Os outros seguem iguais." : "Sua rotina está como você montou (academia).");
  }
  const periodizacao = (state.settings && state.settings.periodizacao) || {ativo:false, blocos:[]};
  const periodSeg = document.getElementById("cfg-periodizacao-seg");
  if(periodSeg){
    periodSeg.querySelectorAll("button").forEach(b=> b.classList.toggle("active", b.dataset.v === (periodizacao.ativo ? "on" : "off")));
  }
  const resumoEl = document.getElementById("periodizacao-resumo");
  if(resumoEl){
    const blocos = periodizacao.blocos || [];
    if(!blocos.length){
      resumoEl.textContent = "Nenhum bloco configurado ainda.";
    } else {
      const seq = blocos.map(b=> (PERIODIZACAO_TIPOS[b.tipo]||PERIODIZACAO_TIPOS.volume).label+" ("+(Number(b.semanas)||0)+" sem)").join(" → ");
      resumoEl.textContent = (periodizacao.ativo ? "Ativo — " : "Inativo (configurado, mas não aplicado) — ") + seq + " → repete";
    }
  }
}
document.getElementById("cfg-usuario-save").addEventListener("click", ()=>{
  const val = document.getElementById("cfg-usuario").value.trim();
  if(!val){ showToast("Escreva um apelido para salvar."); return; }
  const novoPerfil = Object.assign({}, state.perfil, {nomeUsuario: val});
  state.perfil = novoPerfil;
  saveDoc("config/perfil", novoPerfil);
  showToast("Apelido atualizado.");
  render();
});
document.querySelectorAll("#cfg-idioma-seg button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const val = btn.dataset.v;
    state.settings = Object.assign({}, state.settings, {idioma: val});
    saveDoc("config/settings", state.settings);
    if(val === "en") showToast("Preferência salva. A tradução completa ainda não está pronta e chega numa próxima versão.");
    renderConfigExtras();
  });
});
document.querySelectorAll("#cfg-local-seg button").forEach(btn=>{
  btn.addEventListener("click", ()=> aplicarLocalTreino(btn.dataset.v));
});
document.querySelectorAll("#cfg-periodizacao-seg button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const ligando = btn.dataset.v === "on";
    const cur = (state.settings && state.settings.periodizacao) || {ativo:false, inicioISO:null, blocos:[{tipo:"volume",semanas:4},{tipo:"forca",semanas:4}]};
    if(ligando && !(cur.blocos||[]).length){
      showToast("Adicione ao menos um bloco para ativar a periodização.");
      return;
    }
    const periodizacao = Object.assign({}, cur, {ativo: ligando, inicioISO: (ligando && !cur.inicioISO) ? mondayOfISO(todayISO()) : cur.inicioISO});
    state.settings = Object.assign({}, state.settings, {periodizacao});
    saveDoc("config/settings", state.settings);
    showToast(ligando ? "Periodização ativada." : "Periodização desativada.");
    renderConfigExtras();
    renderPeriodizacaoStatus();
  });
});
document.getElementById("periodizacao-edit-btn").addEventListener("click", openPeriodizacaoEditor);
function openPeriodizacaoEditor(){
  const cur = (state.settings && state.settings.periodizacao) || {ativo:false, inicioISO:null, blocos:[]};
  const draftBlocos = JSON.parse(JSON.stringify(cur.blocos||[]));
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>Editar blocos de periodização</h2>'+
    '<div class="sub">A sequência se repete em ciclo. Isso é só um guia de RPE/séries — sua rotina de exercícios não é alterada.</div>'+
    '<div class="periodizacao-bloco-rows u-col8-mt8"></div>'+
    '<button class="btn small ghost u-mt8" type="button" id="periodizacao-add-bloco">+ Adicionar bloco</button>'+
    '<div class="modal-actions"><button class="btn" id="periodizacao-cancel">Cancelar</button><button class="btn primary" id="periodizacao-save">Salvar blocos</button></div>';
  openModal(body);

  const rowsWrap = body.querySelector(".periodizacao-bloco-rows");
  function addBlocoRow(b){
    b = b || {tipo:"volume", semanas:4};
    const row = document.createElement("div");
    row.className = "periodizacao-bloco-row";
    row.innerHTML =
      '<select class="pb-tipo">'+Object.keys(PERIODIZACAO_TIPOS).map(t=>'<option value="'+t+'"'+(t===b.tipo?' selected':'')+'>'+PERIODIZACAO_TIPOS[t].label+'</option>').join("")+'</select>'+
      '<input type="number" min="1" max="12" class="pb-semanas" value="'+(Number(b.semanas)||4)+'" title="semanas">'+
      '<button type="button" class="icon-btn pb-remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    row.querySelector(".pb-remove").addEventListener("click", ()=> row.remove());
    rowsWrap.appendChild(row);
  }
  if(draftBlocos.length) draftBlocos.forEach(addBlocoRow); else addBlocoRow();
  body.querySelector("#periodizacao-add-bloco").addEventListener("click", ()=> addBlocoRow());
  body.querySelector("#periodizacao-cancel").addEventListener("click", closeModal);
  body.querySelector("#periodizacao-save").addEventListener("click", ()=>{
    const blocos = [...rowsWrap.querySelectorAll(".periodizacao-bloco-row")].map(row=>({
      tipo: row.querySelector(".pb-tipo").value,
      semanas: Math.max(1, Number(row.querySelector(".pb-semanas").value) || 4),
    }));
    if(!blocos.length){ showToast("Adicione ao menos um bloco para salvar."); return; }
    const periodizacao = Object.assign({}, cur, {blocos});
    state.settings = Object.assign({}, state.settings, {periodizacao});
    saveDoc("config/settings", state.settings);
    closeModal();
    renderConfigExtras();
    renderPeriodizacaoStatus();
    showToast("Blocos de periodização salvos.");
  });
}

/* ============================================================
   CONQUISTAS (badges permanentes) — uma vez desbloqueada, fica
   desbloqueada pra sempre. Tudo derivado do histórico já salvo
   (checkins/rotina), sem novo campo persistido nem migração.
   ============================================================ */
function hasCargaRegistrada(){
  return Object.values(state.checkins||{}).some(c=> c && c.cargas && Object.keys(c.cargas).length>0);
}
function hasPerfectWeekEver(){
  const start = getTrackingStartISO();
  const today = todayISO();
  let monday = mondayOfISO(start);
  const todayMonday = mondayOfISO(today);
  while(monday <= todayMonday){
    let total=0, done=0;
    for(let i=0;i<7;i++){
      const iso = addDaysISO(monday, i);
      if(iso > today) break;
      if(iso < start) continue;
      const key = treinoKey(iso);
      if(state.rotina[key]?.ativo){
        total++;
        if(state.checkins[iso]?.concluido) done++;
      }
    }
    if(total>0 && done===total) return true;
    monday = addDaysISO(monday, 7);
  }
  return false;
}

/* contagens derivadas dos dados que o app já guarda (nada novo é gravado) para as conquistas extras */
function countMedicoesRegistradas(){ return Object.keys(state.medicoes||{}).length; }
/* medição COMPLETA = peso + cintura + quadril + pescoço (só o peso, como no cadastro, não conta) */
function medicaoCompleta(m){ return !!m && m.pesoKg > 0 && m.cinturaCm > 0 && m.quadrilCm > 0 && m.pescocoCm > 0; }
function countMedicoesCompletas(){ return Object.values(state.medicoes||{}).filter(medicaoCompleta).length; }
function countFotosRegistradas(){ return Object.keys(state.fotos||{}).length; }
function countDiasComHabito(){ return Object.values(state.checkins||{}).filter(c=> c && c.hab && Object.keys(c.hab).length>0).length; }
function countDiasComCarga(){ return Object.values(state.checkins||{}).filter(c=> c && c.cargas && Object.keys(c.cargas).length>0).length; }
function countExerciciosComCarga(){ const n = new Set(); Object.values(state.checkins||{}).forEach(c=>{ if(c && c.cargas) Object.keys(c.cargas).forEach(k=>n.add(k)); }); return n.size; }
function diasDeJornada(){ try{ const ini = getTrackingStartISO(), hoje = todayISO(); return Math.max(0, Math.round((Date.parse(hoje+"T12:00:00")-Date.parse(ini+"T12:00:00"))/864e5)); }catch(e){ return 0; } }
function countSemanasPerfeitas(){
  const start = getTrackingStartISO(), today = todayISO();
  let monday = mondayOfISO(start), n = 0;
  const todayMonday = mondayOfISO(today);
  while(monday <= todayMonday){
    let total=0, done=0;
    for(let i=0;i<7;i++){
      const iso = addDaysISO(monday, i);
      if(iso > today) break;
      if(iso < start) continue;
      if(state.rotina[treinoKey(iso)]?.ativo){ total++; if(state.checkins[iso]?.concluido) done++; }
    }
    if(total>0 && done===total) n++;
    monday = addDaysISO(monday, 7);
  }
  return n;
}
const ACHIEVEMENTS = [
  {nome:"Primeiro Passo",     desc:"Complete seu primeiro treino.",                          check: ()=> countTotalTreinos()>=1},
  {nome:"Semana de Ferro",    desc:"Bata uma sequência de 7 dias seguidos.",                  check: ()=> computeStreakEngine().best>=7},
  {nome:"Guerreiro do Mês",   desc:"Bata uma sequência de 30 dias seguidos.",                 check: ()=> computeStreakEngine().best>=30},
  {nome:"Inabalável",         desc:"Bata uma sequência de 90 dias seguidos.",                 check: ()=> computeStreakEngine().best>=90},
  {nome:"Centurião",          desc:"Complete 100 treinos no total.",                          check: ()=> countTotalTreinos()>=100},
  {nome:"Patente Resistente", desc:"Alcance a patente Resistente ou superior.",               check: ()=> computeNivelInfo().tierIndex>=4},
  {nome:"Patente Titã",       desc:"Alcance a patente máxima: Titã.",                         check: ()=> computeNivelInfo().tierIndex>=9},
  {nome:"Recorde Pessoal",    desc:"Registre a carga de um exercício pela primeira vez.",     check: ()=> hasCargaRegistrada()},
  {nome:"Congelado no Tempo", desc:"Use um congelamento para proteger sua sequência.",        check: ()=> computeStreakEngine().freezesUsedTotal>=1},
  {nome:"Regularidade Total", desc:"Complete 100% dos treinos agendados em uma semana.",      check: ()=> hasPerfectWeekEver()},
  // — biblioteca ampliada —
  {nome:"Aquecendo",          desc:"Complete 10 treinos no total.",                           check: ()=> countTotalTreinos()>=10},
  {nome:"Pegando Ritmo",      desc:"Complete 25 treinos no total.",                           check: ()=> countTotalTreinos()>=25},
  {nome:"Meio Século",        desc:"Complete 50 treinos no total.",                           check: ()=> countTotalTreinos()>=50},
  {nome:"Maratonista",        desc:"Complete 250 treinos no total.",                          check: ()=> countTotalTreinos()>=250},
  {nome:"Lenda da Academia",  desc:"Complete 500 treinos no total.",                          check: ()=> countTotalTreinos()>=500},
  {nome:"Quinzena Firme",     desc:"Bata uma sequência de 14 dias seguidos.",                 check: ()=> computeStreakEngine().best>=14},
  {nome:"Dois Meses de Fogo", desc:"Bata uma sequência de 60 dias seguidos.",                 check: ()=> computeStreakEngine().best>=60},
  {nome:"Meio Ano de Constância", desc:"Bata uma sequência de 180 dias seguidos.",            check: ()=> computeStreakEngine().best>=180},
  {nome:"Ano Inteiro",        desc:"Bata uma sequência de 365 dias seguidos.",                check: ()=> computeStreakEngine().best>=365},
  {nome:"Patente Praticante", desc:"Alcance a patente Praticante ou superior.",               check: ()=> computeNivelInfo().tierIndex>=2},
  {nome:"Patente Atleta",     desc:"Alcance a patente Atleta ou superior.",                   check: ()=> computeNivelInfo().tierIndex>=5},
  {nome:"Patente Campeão",    desc:"Alcance a patente Campeão ou superior.",                  check: ()=> computeNivelInfo().tierIndex>=7},
  {nome:"Primeira Medida",    desc:"Registre sua primeira medição completa: peso e todas as medidas (cintura, quadril e pescoço).", check: ()=> countMedicoesCompletas()>=1},
  {nome:"Olho no Progresso",  desc:"Registre 10 medições ao longo da jornada.",               check: ()=> countMedicoesRegistradas()>=10},
  {nome:"Registro Visual",    desc:"Adicione sua primeira foto de progresso.",                check: ()=> countFotosRegistradas()>=1},
  {nome:"Álbum do Progresso", desc:"Guarde 5 fotos de progresso.",                            check: ()=> countFotosRegistradas()>=5},
  {nome:"Mês Perfeito",       desc:"Complete 100% dos treinos agendados em 4 semanas diferentes.", check: ()=> countSemanasPerfeitas()>=4},
  {nome:"Trimestre Impecável",desc:"Complete 100% dos treinos agendados em 12 semanas diferentes.", check: ()=> countSemanasPerfeitas()>=12},
  {nome:"Hábitos em Dia",     desc:"Registre sono, passos, cárdio ou água em 7 dias diferentes.", check: ()=> countDiasComHabito()>=7},
  {nome:"Mês de Hábitos",     desc:"Registre hábitos em 30 dias diferentes.",                 check: ()=> countDiasComHabito()>=30},
  {nome:"Cargas na Mão",      desc:"Registre cargas em 10 dias de treino diferentes.",        check: ()=> countDiasComCarga()>=10},
  {nome:"Explorador de Exercícios", desc:"Registre carga em 10 exercícios diferentes.",       check: ()=> countExerciciosComCarga()>=10},
  {nome:"Um Mês de Jornada",  desc:"Complete 30 dias desde o início do seu acompanhamento.",  check: ()=> diasDeJornada()>=30},
  {nome:"Três Meses de Jornada", desc:"Complete 90 dias desde o início do seu acompanhamento.", check: ()=> diasDeJornada()>=90},
];
const ACHIEVEMENT_COLORS = ["var(--s-blue)","var(--teal)","var(--s-orange)","var(--good)","var(--s-yellow)","var(--accent)","var(--s-aqua)","var(--s-violet)","var(--s-magenta)","var(--warn)"];
const BADGE_SHIELD_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z"/></svg>';
const BADGE_LOCK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

/* NG+ — progresso das conquistas + "Próximos marcos".
   Tudo é DERIVADO dos dados que o app já guarda (nada novo é gravado, o formato do backup não muda). */
function achProgressList(){
  const eng = computeStreakEngine(), ni = computeNivelInfo(), tr = countTotalTreinos();
  const sem = statsSemana(mondayOfISO(todayISO()));
  const P = (cur, max, un, extra)=> ({cur:Math.max(0, Math.min(cur, max)), max:max, un:un, extra:extra||""});
  return {
    "Primeiro Passo":     P(tr, 1, "treino"),
    "Semana de Ferro":    P(eng.best, 7, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Guerreiro do Mês":   P(eng.best, 30, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Inabalável":         P(eng.best, 90, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Centurião":          P(tr, 100, "treinos", "Dia leve não entra nesta conta."),
    "Patente Resistente": P(ni.tierIndex, 4, "degraus de patente", "Você está na patente "+ni.tierName+"."),
    "Patente Titã":       P(ni.tierIndex, 9, "degraus de patente", "Você está na patente "+ni.tierName+"."),
    "Recorde Pessoal":    P(hasCargaRegistrada() ? 1 : 0, 1, "registro de carga"),
    "Congelado no Tempo": P(eng.freezesUsedTotal, 1, "congelamento usado", "O congelamento entra sozinho quando você falta e ainda tem saldo."),
    "Aquecendo": P(tr, 10, "treinos"), "Pegando Ritmo": P(tr, 25, "treinos"), "Meio Século": P(tr, 50, "treinos"), "Maratonista": P(tr, 250, "treinos"), "Lenda da Academia": P(tr, 500, "treinos"),
    "Quinzena Firme": P(eng.best, 14, "dias de sequência", "Conta a sua melhor sequência até hoje."), "Dois Meses de Fogo": P(eng.best, 60, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Meio Ano de Constância": P(eng.best, 180, "dias de sequência", "Conta a sua melhor sequência até hoje."), "Ano Inteiro": P(eng.best, 365, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Patente Praticante": P(ni.tierIndex, 2, "degraus de patente", "Você está na patente "+ni.tierName+"."), "Patente Atleta": P(ni.tierIndex, 5, "degraus de patente", "Você está na patente "+ni.tierName+"."), "Patente Campeão": P(ni.tierIndex, 7, "degraus de patente", "Você está na patente "+ni.tierName+"."),
    "Primeira Medida": P(countMedicoesCompletas(), 1, "medição completa", "Conta só quando peso, cintura, quadril e pescoço estão preenchidos na mesma medição."), "Olho no Progresso": P(countMedicoesRegistradas(), 10, "medições"),
    "Registro Visual": P(countFotosRegistradas(), 1, "foto"), "Álbum do Progresso": P(countFotosRegistradas(), 5, "fotos"),
    "Mês Perfeito": P(countSemanasPerfeitas(), 4, "semanas perfeitas"), "Trimestre Impecável": P(countSemanasPerfeitas(), 12, "semanas perfeitas"),
    "Hábitos em Dia": P(countDiasComHabito(), 7, "dias com hábitos"), "Mês de Hábitos": P(countDiasComHabito(), 30, "dias com hábitos"),
    "Cargas na Mão": P(countDiasComCarga(), 10, "dias com carga"), "Explorador de Exercícios": P(countExerciciosComCarga(), 10, "exercícios com carga"),
    "Um Mês de Jornada": P(diasDeJornada(), 30, "dias de jornada"), "Três Meses de Jornada": P(diasDeJornada(), 90, "dias de jornada"),
    "Regularidade Total": sem.cap > 0
      ? P(sem.feitos, sem.cap, "treinos desta semana", "Vale também uma semana perfeita no passado: aqui mostramos a semana atual.")
      : P(0, 1, "semana", "Sem treinos agendados nesta semana.")
  };
}
function achProgTxt(p){ return p.cur+" de "+p.max; }

function abrirConquista(i){
  const a = ACHIEVEMENTS[i]; if(!a) return;
  const p = achProgressList()[a.nome] || {cur:0, max:1, un:"", extra:""};
  const feita = a.check();
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>'+escapeHtml(a.nome)+'</h2>'+
    '<div class="sub">'+escapeHtml(a.desc)+'</div>'+
    '<div class="ach-det">'+
      (feita
        ? '<p class="ach-det-ok"><b>Conquista desbloqueada.</b> Ela fica com você, mesmo se a sequência quebrar.</p>'
        : '<div class="ach-det-top"><b>'+achProgTxt(p)+'</b><span>'+escapeHtml(p.un)+'</span></div>'+
          '<div class="ach-bar" aria-hidden="true"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></div>'+
          (p.extra ? '<p class="ach-det-extra">'+escapeHtml(p.extra)+'</p>' : ''))+
    '</div>'+
    '<div class="modal-actions"><button class="btn primary" type="button" id="ach-close">Fechar</button></div>';
  openModal(body);
  body.querySelector("#ach-close").addEventListener("click", closeModal);
}

function renderAchievements(){
  const el = document.getElementById("achievements-grid");
  const countEl = document.getElementById("achievements-count");
  if(!el) return;
  const flags = ACHIEVEMENTS.map(a=>a.check());
  const prog = achProgressList();
  const unlockedCount = flags.filter(Boolean).length;
  if(countEl) countEl.textContent = unlockedCount+" de "+ACHIEVEMENTS.length+" desbloqueadas";
  const htmls = ACHIEVEMENTS.map((a,i)=>{
    const unlocked = flags[i];
    const p = prog[a.nome] || {cur:0, max:1, un:""};
    const color = ACHIEVEMENT_COLORS[i % ACHIEVEMENT_COLORS.length];
    const lbl = a.nome+": "+(unlocked ? "desbloqueada" : "bloqueada, "+achProgTxt(p)+" "+p.un)+". Toque para ver detalhes.";
    return '<button type="button" class="badge-item'+(unlocked?'':' locked')+'" data-ach="'+i+'" aria-label="'+escapeHtml(lbl)+'">'+
      '<span class="badge-ic" style="'+(unlocked?('background:color-mix(in srgb, '+color+' 20%, transparent); border-color:color-mix(in srgb, '+color+' 45%, transparent); color:'+color+'; box-shadow:0 0 12px 1px color-mix(in srgb, '+color+' 40%, transparent);'):'')+'">'+
        BADGE_SHIELD_SVG +
        (unlocked?'':'<span class="badge-lock">'+BADGE_LOCK_SVG+'</span>')+
      '</span>'+
      '<span class="badge-name">'+escapeHtml(a.nome)+'</span>'+
      (unlocked
        ? '<span class="badge-prog done" aria-hidden="true">Feita</span>'
        : '<span class="badge-bar" aria-hidden="true"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></span><span class="badge-prog" aria-hidden="true">'+achProgTxt(p)+'</span>')+
    '</button>';
  });
  const secao = (titulo, lista, cls, nota)=> lista.length
    ? '<section class="vit-sec"><h3 class="vit-h">'+titulo+' <span>'+lista.length+'</span></h3>'+(nota ? '<p class="vit-nota">'+nota+'</p>' : '')+'<div class="vit-lista '+cls+'">'+lista.join("")+'</div></section>' : '';
  const ganhas = htmls.filter((_,i)=> flags[i]), faltam = htmls.filter((_,i)=> !flags[i]);
  el.innerHTML = secao("Na vitrine", ganhas, "vit-shelf") +
    (ganhas.length ? '' : '<p class="vit-vazia">A vitrine começa vazia: a primeira conquista aparece aqui assim que sair.</p>') +
    secao("Em progresso", faltam, "vit-grid", "Toque para ver o quanto falta.");
  el.onclick = function(ev){
    const b = ev.target.closest && ev.target.closest("[data-ach]");
    if(b) abrirConquista(Number(b.dataset.ach));
  };
}

function renderMarcos(){
  const ul = document.getElementById("marcos-list");
  if(!ul) return;
  const ni = computeNivelInfo(), eng = computeStreakEngine();
  const prog = achProgressList();
  const rows = [];
  const row = (titulo, texto, ratio, sub)=>
    '<li class="marco prox"><div class="marco-top"><b>'+escapeHtml(titulo)+'</b><span>'+escapeHtml(texto)+'</span></div>'+
    '<div class="ach-bar" aria-hidden="true"><i style="width:'+Math.round(Math.max(0, Math.min(1, ratio))*100)+'%"></i></div>'+
    (sub ? '<div class="marco-sub">'+escapeHtml(sub)+'</div>' : '')+'</li>';
  // 0) você está aqui (etapa 1 do caminho)
  rows.push('<li class="marco atual" aria-current="step"><div class="marco-top"><b>Você está aqui: patente '+escapeHtml(ni.tierName)+'</b><span>nível '+(ni.tierIndex+1)+' de '+NIVEL_TIERS.length+'</span></div>'+
    '<div class="marco-sub">'+num(ni.xp)+' XP no total'+(eng.streak ? ' · sequência de '+eng.streak+(eng.streak === 1 ? ' dia' : ' dias') : '')+'.</div></li>');
  // 1) próxima patente
  if(ni.isMax){
    rows.push('<li class="marco"><div class="marco-top"><b>Patente máxima</b><span>'+escapeHtml(ni.tierName)+'</span></div><div class="marco-sub">Você chegou ao topo. Agora é manter o ritmo.</div></li>');
  } else {
    const falta = Math.max(0, ni.tierNeed - ni.xpInTier);
    rows.push(row(ni.proximaTier ? "Próxima patente: "+ni.proximaTier : "Concluir a patente "+ni.tierName, ni.xpInTier+" de "+ni.tierNeed+" XP", ni.xpInTier/ni.tierNeed,
      "Faltam "+falta+" XP, o equivalente a cerca de "+ni.treinosParaProxima+(ni.treinosParaProxima === 1 ? " treino." : " treinos.")));
  }
  // 2) próximo marco de sequência que ainda rende XP
  if(ni.proximoMarco){
    rows.push(row("Próximo marco de sequência", eng.streak+" de "+ni.proximoMarco+" dias", eng.streak/ni.proximoMarco,
      "Ao chegar lá você ganha +"+NIVEL_XP_POR_MARCO+" XP (uma vez só)."));
  } else {
    rows.push('<li class="marco"><div class="marco-top"><b>Marcos de sequência</b><span>todos alcançados</span></div></li>');
  }
  // 3) a conquista bloqueada mais perto de sair
  let melhor = null;
  ACHIEVEMENTS.forEach((a,i)=>{
    if(a.check()) return;
    const p = prog[a.nome]; if(!p) return;
    const r = p.cur / p.max;
    if(!melhor || r > melhor.r) melhor = {a:a, p:p, r:r};
  });
  if(melhor) rows.push(row("Conquista mais perto: "+melhor.a.nome, achProgTxt(melhor.p)+" "+melhor.p.un, melhor.r, melhor.a.desc));
  else rows.push('<li class="marco"><div class="marco-top"><b>Conquistas</b><span>todas desbloqueadas</span></div></li>');
  ul.innerHTML = rows.join("");
}
function renderAchievementsLegado(){
  const el = document.getElementById("achievements-grid");
  const countEl = document.getElementById("achievements-count");
  if(!el) return;
  const flags = ACHIEVEMENTS.map(a=>a.check());
  const unlockedCount = flags.filter(Boolean).length;
  if(countEl) countEl.textContent = unlockedCount+" de "+ACHIEVEMENTS.length+" desbloqueadas";
  el.innerHTML = ACHIEVEMENTS.map((a,i)=>{
    const unlocked = flags[i];
    const color = ACHIEVEMENT_COLORS[i % ACHIEVEMENT_COLORS.length];
    return '<div class="badge-item'+(unlocked?'':' locked')+'" title="'+escapeHtml(a.desc)+(unlocked?'':' (bloqueada)')+'">'+
      '<div class="badge-ic" style="'+(unlocked?('background:color-mix(in srgb, '+color+' 20%, transparent); border-color:color-mix(in srgb, '+color+' 45%, transparent); color:'+color+'; box-shadow:0 0 12px 1px color-mix(in srgb, '+color+' 40%, transparent);'):'')+'">'+
        BADGE_SHIELD_SVG +
        (unlocked?'':'<span class="badge-lock">'+BADGE_LOCK_SVG+'</span>')+
      '</div>'+
      '<span class="badge-name">'+escapeHtml(a.nome)+'</span>'+
    '</div>';
  }).join("");
}

/* ============================================================
   JUICE (rodada 3) — camada sensorial: números que "contam" em vez
   de trocar direto, e efeitos sonoros curtos e opcionais sintetizados
   via Web Audio API (sem precisar de nenhum arquivo de áudio).
   ============================================================ */

// animação de contagem: só anima quando o valor de verdade muda entre uma
// renderização e outra (guarda o último alvo em data-anim-target), então
// trocar de aba e voltar não faz o número "recontar" à toa.
function animateNumberEl(el, to, opts){
  if(!el) return;
  opts = opts || {};
  const digits = opts.digits || 0;
  const suffix = opts.suffix || "";
  const duration = opts.duration || 550;
  to = Number(to);
  if(isNaN(to)) return;
  const prevTarget = el.dataset.animTarget!=null ? Number(el.dataset.animTarget) : null;
  el.dataset.animTarget = to;
  const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if(prevTarget===null || prevTarget===to || reduceMotion || document.hidden){
    el.textContent = num(to, digits)+suffix;
    return;
  }
  const from = prevTarget;
  const startTime = performance.now();
  const animId = (el._animId = (el._animId||0)+1);
  function tick(now){
    if(el._animId !== animId) return; // uma animação mais nova assumiu este elemento
    const t = Math.min(1, (now-startTime)/duration);
    const eased = 1 - Math.pow(1-t, 3);
    const val = from + (to-from)*eased;
    el.textContent = num(val, digits)+suffix;
    if(t<1) requestAnimationFrame(tick);
    else el.textContent = num(to, digits)+suffix;
  }
  requestAnimationFrame(tick);
}

// sons — contexto de áudio só é criado no primeiro toque do usuário (as
// políticas de autoplay dos navegadores exigem um gesto), e reaproveitado
// depois. Cada som é um ou mais "bipes" com envelope de ganho (ataque rápido
// + decaimento exponencial) pra soar como um efeito limpo, sem estalo —
// prática recomendada pela própria documentação da Web Audio API (MDN).
let _audioCtx = null;
function getAudioCtx(){
  try{
    if(!_audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return null;
      _audioCtx = new Ctx();
    }
    if(_audioCtx.state === "suspended") _audioCtx.resume().catch(()=>{});
    return _audioCtx;
  }catch(e){ return null; }
}
function soundsEnabled(){
  // Sons do app são o padrão do artifact — sempre ativos, sem opção de desligar.
  return true;
}
const SOUND_PRESETS = {
  tick:        [{freq:740, dur:.05, type:"sine",     gain:.09}],
  checkin:     [{freq:520, dur:.09, type:"sine",     gain:.14}, {freq:780, dur:.12, type:"sine",     gain:.12, delay:.06}],
  xp:          [{freq:660, dur:.07, type:"triangle", gain:.11}],
  tierup:      [{freq:440, dur:.10, type:"triangle", gain:.13}, {freq:554, dur:.10, type:"triangle", gain:.13, delay:.09}, {freq:659, dur:.22, type:"triangle", gain:.14, delay:.18}],
  achievement: [{freq:587, dur:.09, type:"square",   gain:.09}, {freq:880, dur:.18, type:"square",   gain:.10, delay:.09}],
  pr:          [{freq:392, dur:.08, type:"sawtooth", gain:.08}, {freq:523, dur:.08, type:"sawtooth", gain:.09, delay:.07}, {freq:659, dur:.24, type:"sawtooth", gain:.10, delay:.14}],
  resttimer:   [{freq:880, dur:.10, type:"square",   gain:.12}, {freq:880, dur:.14, type:"square",   gain:.12, delay:.18}],
};
function playSound(kind){
  if(!soundsEnabled()) return;
  const ctx = getAudioCtx();
  if(!ctx) return;
  const notes = SOUND_PRESETS[kind];
  if(!notes) return;
  try{
    notes.forEach(n=>{
      const t0 = ctx.currentTime + (n.delay||0);
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = n.type || "sine";
      osc.frequency.setValueAtTime(n.freq, t0);
      gainNode.gain.setValueAtTime(0, t0);
      gainNode.gain.linearRampToValueAtTime(n.gain||.1, t0+.01);
      gainNode.gain.exponentialRampToValueAtTime(.0001, t0+n.dur);
      osc.connect(gainNode).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0+n.dur+.02);
    });
  }catch(e){}
}
// micro-recompensa para ações menores (registrar medição, salvar rotina, trocar
// objetivo de dieta): um "tick" sonoro/tátil e, quando um elemento é passado,
// um pulso de brilho rápido — reforço leve, sem confete nem +XP, pra ações
// que não são marcos mas ainda merecem uma resposta física ao toque.
function microReward(el){
  hapticPulse(12);
  playSound("tick");
  if(el){
    el.classList.remove("micro-pulse");
    void el.offsetWidth; // força reinício da animação se disparada em sequência rápida
    el.classList.add("micro-pulse");
    setTimeout(()=> el.classList.remove("micro-pulse"), 650);
  }
}

/* ============================================================
   CELEBRAÇÃO — feedback imediato (+XP flutuante) e modal com
   confete para marcos: subir de patente, desbloquear conquista
   ou bater recorde (PR) de carga. captureCelebrationBaseline()
   tira uma "foto" do estado antes da ação; celebrateProgress()
   compara com o estado depois e decide o que comemorar
   (prioridade: patente > conquista > recorde > nada).
   ============================================================ */
function captureCelebrationBaseline(){
  const nv = computeNivelInfo();
  return {
    tierIndex: nv.tierIndex,
    xp: nv.xp,
    achievementFlags: ACHIEVEMENTS.map(a=>a.check()),
    streak: computeStreakEngine().streak,
  };
}
function hapticPulse(pattern){
  try{ if(navigator.vibrate) navigator.vibrate(pattern || 25); }catch(e){}
}
function showFloatingXP(anchorEl, amount){
  if(!anchorEl || !amount) return;
  hapticPulse(20);
  playSound("xp");
  const rect = anchorEl.getBoundingClientRect();
  const el = document.createElement("div");
  el.className = "xp-float";
  el.textContent = "+"+amount+" XP";
  el.style.left = (rect.left + rect.width/2)+"px";
  el.style.top = rect.top+"px";
  document.body.appendChild(el);
  setTimeout(()=> el.remove(), 1300);
}
const CONFETTI_COLORS = ["var(--s-blue)","var(--s-orange)","var(--s-aqua)","var(--s-yellow)","var(--s-magenta)","var(--s-violet)","var(--good)"];
function spawnConfetti(container, count){
  count = count || 26;
  for(let i=0;i<count;i++){
    const p = document.createElement("div");
    p.className = "confetti-piece";
    p.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    p.style.left = (Math.random()*100)+"%";
    p.style.animationDuration = (0.9 + Math.random()*0.9).toFixed(2)+"s";
    p.style.animationDelay = (Math.random()*0.25).toFixed(2)+"s";
    p.style.transform = "rotate("+Math.floor(Math.random()*360)+"deg)";
    container.appendChild(p);
  }
}
/* cartão de compartilhamento — desenha em <canvas> um resumo do marco atingido,
   pra baixar/guardar/postar (não há backend, então isso substitui o "share card"
   viral do Duolingo por uma lembrança pessoal exportável) */
function shadeHex(hex, percent){
  const c = hex.replace('#','');
  let r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
  const t = percent<0 ? 0 : 255, p = Math.abs(percent);
  r = Math.round((t-r)*p)+r; g = Math.round((t-g)*p)+g; b = Math.round((t-b)*p)+b;
  return "#"+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');
}
function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight){
  const words = String(text).split(" ");
  let line = "", lines = [];
  words.forEach(w=>{
    const test = line ? line+" "+w : w;
    if(ctx.measureText(test).width > maxWidth && line){ lines.push(line); line = w; }
    else line = test;
  });
  if(line) lines.push(line);
  const startY = y - ((lines.length-1)*lineHeight)/2;
  lines.forEach((l,i)=> ctx.fillText(l, x, startY + i*lineHeight));
}
function drawCelebrationCard(opts){
  const W = 1080, H = 1080;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");

  let accentHex = (getComputedStyle(document.documentElement).getPropertyValue('--accent')||"#0E7490").trim();
  if(!/^#[0-9a-fA-F]{6}$/.test(accentHex)) accentHex = "#0E7490";

  const grad = ctx.createLinearGradient(0, 0, W, H);
  if(opts.big){
    grad.addColorStop(0, "#fff3c4");
    grad.addColorStop(0.55, "#ffd76a");
    grad.addColorStop(1, "#e2a200");
  } else {
    grad.addColorStop(0, shadeHex(accentHex, 0.35));
    grad.addColorStop(0.55, accentHex);
    grad.addColorStop(1, shadeHex(accentHex, -0.35));
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const inkColor = opts.big ? "#3a2c02" : (relLuminance(accentHex) > 0.55 ? INK_DARK : INK_LIGHT);
  ctx.fillStyle = inkColor;
  ctx.textAlign = "center";

  ctx.globalAlpha = .75;
  ctx.font = "600 30px 'IBM Plex Mono', monospace";
  ctx.fillText("RITMO DE FERRO", W/2, 110);
  ctx.globalAlpha = 1;

  // ícone grande desenhado com os mesmos caminhos do sprite (Path2D), em vez de um emoji
  const iconPaths = ICONS[opts.icon] || ICONS.sparkles;
  ctx.save();
  ctx.translate(W/2 - 125, 250); ctx.scale(250/24, 250/24);
  ctx.strokeStyle = inkColor; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.lineJoin = "round";
  iconPaths.forEach(d=> ctx.stroke(new Path2D(d)));
  ctx.restore();

  ctx.font = "700 64px 'Work Sans', sans-serif";
  wrapCanvasText(ctx, opts.title || "Muito bem!", W/2, 610, W-160, 72);

  if(opts.sub){
    ctx.font = "500 32px 'Work Sans', sans-serif";
    ctx.globalAlpha = .9;
    wrapCanvasText(ctx, opts.sub, W/2, 710, W-220, 42);
    ctx.globalAlpha = 1;
  }

  const nome = (state.perfil && state.perfil.nomeCompleto) ? state.perfil.nomeCompleto.split(" ")[0] : "";
  const rodape = (nome ? nome+" · " : "") + fmtDateBR(todayISO());
  ctx.globalAlpha = .7;
  ctx.font = "600 26px 'IBM Plex Mono', monospace";
  ctx.fillText(rodape, W/2, H-70);
  ctx.globalAlpha = 1;

  return canvas;
}
async function downloadCelebrationCard(opts){
  const canvas = drawCelebrationCard(opts);
  const filename = "ng-mais-"+todayISO()+".png";

  // Dentro do artifact publicado: só a capability "downloads" consegue
  // realmente entregar o arquivo ao visitante (o iframe sandboxed bloqueia
  // o truque clássico de <a download>).
  if(window.claude && window.claude.use){
    let downloads = null;
    try{ downloads = await window.claude.use("downloads"); }catch(e){ downloads = null; }
    if(!downloads){
      showToast(MSG.semArquivos);
      return;
    }
    canvas.toBlob(async (blob)=>{
      if(!blob){ showToast("Não consegui criar a imagem do cartão."+MSG.tenteDeNovo); return; }
      try{
        await downloads.save({filename, data: blob});
        showToast("Cartão salvo!");
      }catch(err){
        const code = err && err.code;
        if(code === "declined" || code === "rate_limited"){
          // Visitante recusou ou já há um prompt aberto — nada a fazer.
        } else {
          showToast("Não consegui salvar o cartão agora."+MSG.tenteDeNovo);
        }
      }
    }, "image/png");
    return;
  }

  // Fora do runtime de artifact (ex.: arquivo HTML avulso enviado por download):
  // o navegador comum permite o download direto normalmente.
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function showCelebration(opts){
  const root = document.getElementById("celebration-root");
  if(!root) return;
  root.innerHTML = "";
  const backdrop = document.createElement("div");
  backdrop.className = "celeb-backdrop";
  const card = document.createElement("div");
  const isChest = !!opts.chest;   // conquistas e subidas de patente: "abre" como um presente
  const isBoss = !!opts.boss;     // recorde pessoal (PR): "barra de poder" antes do impacto
  card.className = "celeb-card"+(opts.big?" big":"");

  const hideText = isChest || isBoss;
  const meterHtml = isBoss ? '<div class="boss-meter-wrap" id="boss-meter"><div class="boss-meter-fill" id="boss-meter-fill"></div><span class="boss-meter-label">NOVO RECORDE</span></div>' : '';
  card.innerHTML =
    '<div class="celeb-icon'+(isChest?' chest-shake':'')+'" id="celeb-icon">'+ic(isChest?"gift":(opts.icon||"sparkles"))+'</div>'+
    meterHtml+
    '<div class="celeb-title" id="celeb-title"'+(hideText?' style="opacity:0"':'')+'>'+escapeHtml(opts.title||"Muito bem!")+'</div>'+
    (opts.sub ? '<div class="celeb-sub" id="celeb-sub"'+(hideText?' style="opacity:0"':'')+'>'+escapeHtml(opts.sub)+'</div>' : '')+
    '<div class="celeb-actions">'+
      '<button class="btn small ghost" id="celeb-download" title="Baixar uma imagem para guardar ou compartilhar">Baixar cartão</button>'+
      '<button class="btn primary" id="celeb-close">Bora continuar</button>'+
    '</div>';
  backdrop.appendChild(card);
  root.appendChild(backdrop);

  function reveal(){
    spawnConfetti(card, opts.confetti===false ? 0 : (isBoss ? 55 : (opts.big ? 42 : 26)));
    hapticPulse(isBoss ? [40,30,40,30,80] : [30,40,30]);
    playSound(opts.sound || "achievement");
  }
  function revealText(){
    const titleEl = card.querySelector("#celeb-title"); if(titleEl) titleEl.style.opacity = 1;
    const subEl = card.querySelector("#celeb-sub"); if(subEl) subEl.style.opacity = 1;
  }

  let extraDelay = 0;
  if(isChest){
    extraDelay = 560;
    setTimeout(()=>{
      const iconEl = card.querySelector("#celeb-icon");
      if(iconEl){ iconEl.classList.remove("chest-shake"); iconEl.classList.add("chest-reveal"); iconEl.innerHTML = ic(opts.icon||"medal"); }
      revealText();
      reveal();
    }, extraDelay);
  } else if(isBoss){
    extraDelay = 700;
    const fillEl = card.querySelector("#boss-meter-fill");
    // dois rAF encadeados garantem que o navegador já pintou width:0% antes de
    // animar pra 100% — senão a transição de width não dispara.
    requestAnimationFrame(()=> requestAnimationFrame(()=>{ if(fillEl) fillEl.style.width = "100%"; }));
    setTimeout(()=>{
      const meterEl = card.querySelector("#boss-meter"); if(meterEl) meterEl.remove();
      const iconEl = card.querySelector("#celeb-icon"); if(iconEl) iconEl.classList.add("boss-pop");
      card.classList.add("boss-impact");
      revealText();
      reveal();
    }, extraDelay);
  } else {
    reveal();
  }

  requestAnimationFrame(()=> backdrop.classList.add("show"));
  function dismiss(){
    backdrop.classList.remove("show");
    setTimeout(()=>{ if(root.contains(backdrop)) root.innerHTML = ""; }, 250);
  }
  backdrop.addEventListener("click", (e)=>{ if(e.target===backdrop) dismiss(); });
  card.querySelector("#celeb-close").addEventListener("click", dismiss);
  card.querySelector("#celeb-download").addEventListener("click", ()=> downloadCelebrationCard(opts));
  clearTimeout(showCelebration._t);
  showCelebration._t = setTimeout(dismiss, extraDelay + (opts.autoCloseMs || 5000));
}
function celebrateProgress(before, anchorEl, opts){
  opts = opts || {};
  if(opts.xp) showFloatingXP(anchorEl, opts.xp);
  const afterTier = computeNivelInfo().tierIndex;
  if(afterTier > before.tierIndex){
    showCelebration({icon:"star", title:"Subiu de patente!", sub:"Você alcançou a patente "+NIVEL_TIERS[afterTier].name+" — e desbloqueou uma nova cor de destaque!", sound:"tierup", chest:true});
    return true;
  }
  const afterStreak = computeStreakEngine().streak;
  const hitMilestone = STREAK_MILESTONES.find(m => before.streak < m && afterStreak >= m);
  if(hitMilestone){
    showCelebration({icon:"flame", title:hitMilestone+" dias seguidos!", sub:"Sequência de "+hitMilestone+" dias — continue com tudo!", big:true, sound:"tierup"});
    return true;
  }
  const afterFlags = ACHIEVEMENTS.map(a=>a.check());
  const newly = ACHIEVEMENTS.filter((a,i)=> afterFlags[i] && !before.achievementFlags[i]);
  if(newly.length){
    showCelebration({icon:"medal", title:"Conquista desbloqueada!", sub:newly[0].nome+" — "+newly[0].desc, chest:true});
    return true;
  }
  if(opts.isPR){
    showCelebration({icon:"zap", title:"Novo recorde!", sub:opts.prLabel||"", sound:"pr", boss:true});
    return true;
  }
  return false;
}

function weekRange(refIso){
  // segunda a domingo
  const d = new Date(refIso+"T00:00:00");
  const jsDay = d.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1-jsDay;
  const monday = addDaysISO(refIso, diffToMonday);
  const days = [];
  for(let i=0;i<7;i++) days.push(addDaysISO(monday, i));
  return days;
}

/* ============================================================
   DESAFIOS (semanais e mensais) — checklist derivado de checkins,
   rotina e cargas, sem persistir estado novo. Reseta sozinho a cada
   semana (segunda) e mês (calendário), pois é recalculado a cada
   render a partir da janela de datas correspondente.
   ============================================================ */
function activeDaysInRange(startIso, endIso){
  // dias ativos da rotina entre startIso e endIso (inclusive), sem passar de hoje
  const today = todayISO();
  const realEnd = endIso > today ? today : endIso;
  const list = [];
  let iso = startIso;
  while(iso <= realEnd){
    const key = treinoKey(iso);
    if(state.rotina[key]?.ativo) list.push(iso);
    iso = addDaysISO(iso, 1);
  }
  return list;
}
function hasCargaLoggedInRange(startIso, endIso){
  const today = todayISO();
  const realEnd = endIso > today ? today : endIso;
  let iso = startIso;
  while(iso <= realEnd){
    const c = state.checkins[iso];
    if(c && c.cargas && Object.keys(c.cargas).length>0) return true;
    iso = addDaysISO(iso, 1);
  }
  return false;
}
function hasPRInRange(startIso, endIso){
  // percorre todo exercício com histórico de carga e verifica se o recorde
  // (maior carga já registrada) foi alcançado dentro do intervalo informado
  const exNames = new Set();
  Object.values(state.rotina||{}).forEach(day=>{
    (day.exercicios||[]).forEach(ex=> exNames.add(ex.nome));
  });
  for(const nome of exNames){
    const hist = getCargaHistory(nome);
    if(!hist.length) continue;
    const pr = Math.max(...hist.map(h=>h.peso));
    const prEntry = hist.find(h=>h.peso===pr);
    if(prEntry && prEntry.iso>=startIso && prEntry.iso<=endIso) return true;
  }
  return false;
}
function monthRangeISO(iso){
  const [y,m] = iso.split("-");
  const start = y+"-"+m+"-01";
  const lastDay = new Date(Number(y), Number(m), 0).getDate();
  const end = y+"-"+m+"-"+pad2(lastDay);
  return [start, end];
}

function computeWeeklyChallenges(){
  const days = weekRange(todayISO());
  const weekStart = days[0], weekEnd = days[days.length-1];
  const ativos = activeDaysInRange(weekStart, weekEnd);
  const freezeUsedSet = new Set(computeStreakEngine().freezeUsedDates);
  const doneCount = ativos.filter(iso=> state.checkins[iso]?.concluido).length;
  const lostCount = ativos.filter(iso=> !state.checkins[iso]?.concluido && !freezeUsedSet.has(iso)).length;
  const metaTreinos = metaSemanalMin() || 3;   // v95: a missão usa a meta semanal escolhida em "Esta semana"
  const cargaOk = hasCargaLoggedInRange(weekStart, weekEnd);

  const lista = [
    {
      nome:"Semana completa",
      desc:"Complete ou proteja (com congelamento) todos os treinos agendados desta semana.",
      progress: ativos.length ? (ativos.length-lostCount) : 0,
      total: ativos.length,
      done: ativos.length>0 && lostCount===0,
    },
    {
      nome:"Treinos da semana",
      desc:"Complete pelo menos "+metaTreinos+" "+pl(metaTreinos,"treino agendado","treinos agendados")+" nesta semana (sua meta semanal; dia leve conta).",
      progress: Math.min(doneCount, metaTreinos),
      total: metaTreinos,
      done: doneCount>=metaTreinos,
    },
    {
      nome:"Registrar uma carga",
      desc:"Anote o peso (kg) de pelo menos um exercício nesta semana.",
      progress: cargaOk ? 1 : 0,
      total: 1,
      done: cargaOk,
    },
  ];
  const mf = missaoFoco(days);   // v97: só aparece quando você escolheu um foco
  if(mf) lista.push(mf);
  return lista;
}

function computeMonthlyChallenges(){
  const [monthStart, monthEnd] = monthRangeISO(todayISO());
  const ativos = activeDaysInRange(monthStart, monthEnd);
  const freezeUsedSet = new Set(computeStreakEngine().freezeUsedDates);
  const doneCount = ativos.filter(iso=> state.checkins[iso]?.concluido).length;
  const lostCount = ativos.filter(iso=> !state.checkins[iso]?.concluido && !freezeUsedSet.has(iso)).length;
  const pct = ativos.length ? Math.round((doneCount/ativos.length)*100) : 0;
  const prOk = hasPRInRange(monthStart, monthEnd);

  return [
    {
      nome:"80% de constância no mês",
      desc:"Complete pelo menos 80% dos treinos agendados neste mês.",
      progress: Math.min(pct, 80),
      total: 80,
      done: ativos.length>0 && pct>=80,
      metaLabel: pct+"%",
    },
    {
      nome:"Bater um recorde (PR)",
      desc:"Registre uma nova carga máxima em qualquer exercício neste mês.",
      progress: prOk ? 1 : 0,
      total: 1,
      done: prOk,
    },
    {
      nome:"Mês completo",
      desc:"Complete ou proteja (com congelamento) todos os treinos agendados neste mês.",
      progress: ativos.length ? (ativos.length-lostCount) : 0,
      total: ativos.length,
      done: ativos.length>0 && lostCount===0,
    },
  ];
}

const CHAL_CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>';
function chalRingHtml(pct, done){
  const r = 26, c = 2*Math.PI*r;
  const off = c*(1-pct/100);
  return '<div class="chal-ring"><svg viewBox="0 0 64 64">'+
      '<circle class="chal-ring-track" cx="32" cy="32" r="'+r+'"/>'+
      '<circle class="chal-ring-fill" cx="32" cy="32" r="'+r+'" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>'+
    '</svg><div class="chal-ring-label">'+(done?CHAL_CHECK_SVG:pct+'%')+'</div></div>';
}
function renderChallengeGrid(elId, items){
  const el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = items.map(it=>{
    const pct = it.total>0 ? Math.min(100, Math.round((it.progress/it.total)*100)) : 0;
    const metaLabel = it.metaLabel || (it.total>1 ? it.progress+"/"+it.total : (it.done?"Concluído":"Pendente"));
    return '<div class="chal-card'+(it.done?' done':'')+'">'+
      '<div class="chal-card-top">'+
        chalRingHtml(pct, it.done) +
        '<div class="chal-card-txt"><div class="chal-card-name">'+escapeHtml(it.nome)+'</div><div class="chal-card-meta">'+metaLabel+'</div></div>'+
      '</div>'+
      '<div class="chal-desc">'+escapeHtml(it.desc)+'</div>'+
    '</div>';
  }).join("");
}

let challengeScope = "semana";
document.querySelectorAll("#chal-tabs button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    challengeScope = btn.dataset.scope;
    document.querySelectorAll("#chal-tabs button").forEach(b=> b.classList.toggle("active", b===btn));
    renderChallenges();
  });
});

function renderChallenges(){
  const weekly = computeWeeklyChallenges();
  const monthly = computeMonthlyChallenges();
  renderChallengeGrid("chal-grid", challengeScope === "mes" ? monthly : weekly);
  const countEl = document.getElementById("challenges-count");
  if(countEl){
    const total = weekly.length + monthly.length;
    const done = weekly.filter(i=>i.done).length + monthly.filter(i=>i.done).length;
    countEl.textContent = done+" de "+total+" concluídos";
  }
}

/* resumo da semana passada — reforça o padrão de constância (não só o dia de hoje),
   reaproveitando activeDaysInRange/hasPRInRange já usados nos desafios mensais */
function renderLastWeekRecap(){
  const el = document.getElementById("last-week-recap");
  const textEl = document.getElementById("last-week-recap-text");
  if(!el || !textEl) return;
  const today = todayISO();
  const trackStart = getTrackingStartISO();
  const thisMonday = mondayOfISO(today);
  const lastMonday = addDaysISO(thisMonday, -7);
  const lastSunday = addDaysISO(thisMonday, -1);
  if(lastSunday < trackStart){ el.hidden = true; return; }
  const ativos = activeDaysInRange(lastMonday, lastSunday);
  if(!ativos.length){ el.hidden = true; return; }
  const done = ativos.filter(iso=> state.checkins[iso]?.concluido).length;
  const prHit = hasPRInRange(lastMonday, lastSunday);
  let txt = "Semana passada: "+done+" de "+ativos.length+" treino"+(ativos.length===1?"":"s")+" concluído"+(done===1?"":"s")+".";
  const swL = statsSemana(lastMonday);
  if(swL.cap > 0) txt += swL.ok ? " Meta de "+swL.meta+" batida"+(swL.bonus ? " (+"+swL.bonus+" de bônus)" : "")+"." : " A meta era "+swL.meta+"; segue o jogo.";
  if(prHit) txt += " Você também bateu um recorde de carga — mandou bem!";
  el.hidden = false;
  textEl.textContent = txt;
}

const STREAK_MILESTONES = [7, 14, 30, 60, 90, 180, 365];
function renderStreak(){
  const engine = computeStreakEngine();
  const streak = engine.streak;
  const streakValueEl = document.getElementById("streak-value");
  if(!streakValueEl.querySelector(".num-big")) streakValueEl.innerHTML = '<span class="num-big">0</span><small></small>';
  animateNumberEl(streakValueEl.querySelector(".num-big"), streak, {duration:600});
  streakValueEl.querySelector("small").textContent = "dia"+(streak===1?"":"s")+" seguido"+(streak===1?"":"s")+"";
  const flame = document.querySelector("#streak-card .flame");
  if(flame) flame.classList.toggle("hot", streak >= 3);
  const isPerfect = engine.perfect && streak >= 7;
  if(flame) flame.classList.toggle("perfect", isPerfect);
  const perfectBadge = document.getElementById("streak-perfect-badge");
  if(perfectBadge) perfectBadge.hidden = !isPerfect;
  const msg = document.getElementById("streak-msg");
  const usedYesterday = engine.freezeUsedDates.includes(addDaysISO(todayISO(), -1));

  // streak em risco: hoje é dia de treino ativo, ainda não concluído, e já está tarde
  const todayKeyRisk = treinoKey(todayISO());
  const todayAtivoRisk = state.rotina[todayKeyRisk]?.ativo;
  const todayDoneRisk = !!state.checkins[todayISO()]?.concluido;
  const atRisk = streak > 0 && todayAtivoRisk && !todayDoneRisk && new Date().getHours() >= 20;
  const streakCardEl = document.getElementById("streak-card");
  if(streakCardEl) streakCardEl.classList.toggle("at-risk", atRisk);
  { const mini = document.getElementById("nivel-mini"), n = document.getElementById("nivel-mini-streak-n"), sm = document.querySelector("#nivel-mini-streak small");   // v98 F4: faixa compacta do topo
    if(n) n.textContent = streak;
    if(sm) sm.textContent = atRisk ? "em risco" : (streak === 1 ? "dia" : "dias");
    if(mini){ mini.classList.toggle("at-risk", atRisk); mini.setAttribute("aria-label", "Ver sua patente no Perfil. Sequência de "+streak+" dia"+(streak===1?"":"s")+(atRisk?", em risco hoje":"")); } }

  if(atRisk){
    msg.innerHTML = '<span class="risk-note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>Ainda dá tempo de manter sua sequência de '+streak+' dia'+(streak===1?"":"s")+'. Sem energia? Um dia leve também conta.</span>';
  } else if(usedYesterday){
    msg.textContent = "Sua sequência foi protegida por um congelamento ontem — bora treinar hoje pra manter o ritmo.";
  } else if(streak === 0){
    msg.textContent = engine.best > 0
      ? "Você já chegou a "+engine.best+" dia"+(engine.best===1?"":"s")+" seguido"+(engine.best===1?"":"s")+" — hoje é um novo ponto de partida."
      : "Conclua a quest de hoje para começar sua sequência.";
  } else if(streak < 7){
    msg.textContent = "Bom ritmo — continue firme até completar 1 semana.";
  } else if(streak < 30){
    msg.textContent = "Sequência sólida. A consistência é o que constrói resultado.";
  } else {
    msg.textContent = "Sequência excelente — hábito consolidado!";
  }

  // barra até a próxima meta
  const next = STREAK_MILESTONES.find(m=>m>streak) || (Math.ceil((streak+1)/30)*30);
  const milestonePct = Math.min(100, Math.round((streak/next)*100));
  document.getElementById("streak-milestone-label").textContent = "Próxima meta: "+next+" dias";
  document.getElementById("streak-milestone-frac").textContent = streak+"/"+next;
  document.getElementById("streak-milestone-fill").style.width = milestonePct+"%";

  // recorde, total e congelamentos disponíveis
  animateNumberEl(document.getElementById("streak-best"), Math.max(engine.best, streak));
  animateNumberEl(document.getElementById("streak-total"), countTotalTreinos());
  const freezeEl = document.getElementById("streak-freezes");
  if(freezeEl){
    freezeEl.textContent = engine.freezeBalance;
    const freezeStat = freezeEl.closest(".streak-stat");
    if(freezeStat) freezeStat.title = "Ganhe 1 congelamento a cada "+FREEZE_EARN_DAYS+" dias de uso (máx. "+FREEZE_MAX+"). Ele protege sua sequência automaticamente se você perder um dia de treino agendado.";
  }
}
document.getElementById("btn-share-streak").addEventListener("click", ()=>{
  const engine = computeStreakEngine();
  const streak = engine.streak;
  downloadCelebrationCard({
    icon: "flame",
    title: streak>0 ? streak+" dia"+(streak===1?"":"s")+" seguido"+(streak===1?"":"s")+"!" : "Bora começar a sequência!",
    sub: streak>0 ? "Sequência atual no NG+" : "Conclua a quest de hoje pra começar.",
  });
});

/* "Treino de hoje" ou "Próximo treino" no cartão Esta semana */
function renderProximoTreino(){
  const el = document.getElementById("wk-next");
  if(!el) return;
  const hoje = todayISO();
  let achou = null;
  for(let i = 0; i < 14 && !achou; i++){
    const iso = addDaysISO(hoje, i), dia = state.rotina[treinoKey(iso)];
    if(!dia || !dia.ativo) continue;
    if(i === 0 && state.checkins[iso] && state.checkins[iso].concluido) continue;
    achou = {iso, dia, i};
  }
  if(!achou){ el.hidden = true; el.innerHTML = ""; return; }
  const wd = dayKeyFromISO(achou.iso), nEx = (achou.dia.exercicios || []).length;
  const rot = achou.i === 0 ? "Treino de hoje" : (achou.i === 1 ? "Próximo treino · amanhã" : "Próximo treino");
  el.innerHTML = '<span class="wk-next-l">'+rot+'</span><b>'+DAY_FULL[wd]+' — '+escapeHtml(achou.dia.nome || "")+'</b><small>'+nEx+' exercício'+(nEx === 1 ? '' : 's')+'</small>';
  el.hidden = false;
}
function renderWeekDots(){
  const days = weekRange(todayISO());
  const wrap = document.getElementById("week-dots");
  wrap.innerHTML = "";
  const freezeUsedSet = new Set(computeStreakEngine().freezeUsedDates);
  let done=0, total=0;
  days.forEach(iso=>{
    const key = treinoKey(iso);
    const ativo = state.rotina[key]?.ativo;
    const isDone = !!state.checkins[iso]?.concluido;
    const isToday = iso === todayISO();
    const isFrozen = freezeUsedSet.has(iso);
    if(ativo){ total++; if(isDone) done++; }
    const el = document.createElement("div");
    el.className = "dot" + (isDone?" done":"") + (isDone && state.checkins[iso].leve ? " leve" : "") + (!ativo?" rest":"") + (isToday?" today":"") + (isFrozen?" frozen":"");
    const wd = dayKeyFromISO(iso);
    const glifo = isFrozen ? ic("snow") : (isDone ? "✓" : (ativo ? "·" : ""));
    el.innerHTML = '<span class="d-n">'+DAY_LABEL[wd]+'</span><span class="d-s" aria-hidden="true">'+glifo+'</span>';
    el.title = DAY_FULL[wd] + (isFrozen ? " — protegido por congelamento" : (ativo ? (isDone ? (state.checkins[iso].leve ? " — dia leve" : " — concluído") : " — pendente") : " — descanso"));
    wrap.appendChild(el);
  });
  document.getElementById("week-label").textContent = done+" de "+total+" treinos concluídos";
  const pct = total ? Math.round(done/total*100) : 0;
  document.getElementById("week-pct").textContent = pct+"%";

  // mês
  const iso = todayISO();
  const [y,m] = iso.split("-");
  const lastDayNum = new Date(Number(y), Number(m), 0).getDate();
  let mdone=0, mtotal=0;
  for(let d=1; d<=lastDayNum; d++){
    const dIso = y+"-"+m+"-"+pad2(d);
    if(dIso > iso) break;
    const key = treinoKey(dIso);
    if(state.rotina[key]?.ativo){
      mtotal++;
      if(state.checkins[dIso]?.concluido) mdone++;
    }
  }
  document.getElementById("month-label").textContent = mdone+" de "+mtotal+" treinos concluídos (mês)";
  const mpct = mtotal ? Math.round(mdone/mtotal*100) : 0;

  // anéis concêntricos: semana (externo) e mês (interno)
  setRing("ring-week", 88, pct);
  setRing("ring-month", 64, mpct);
  const bw = document.getElementById("wk-bar-w"); if(bw) bw.style.width = pct+"%";
  const bm = document.getElementById("wk-bar-m"); if(bm) bm.style.width = mpct+"%";
  const rg = document.getElementById("wk-range"); if(rg) rg.textContent = fmtDateBR(days[0])+" – "+fmtDateBR(days[6]);
  renderProximoTreino();

  // mensagem de status da semana (preenche o rodapé do card)
  const statusEl = document.getElementById("week-status");
  if(statusEl){
    const smW = statsSemana(mondayOfISO(todayISO()));
    if(total === 0){
      statusEl.textContent = "Nenhum treino agendado para esta semana ainda.";
    } else if(done >= total){
      statusEl.textContent = "Meta da semana batida! Todos os "+total+" treinos concluídos.";
    } else if(smW.ok){
      statusEl.textContent = "Meta da semana batida ("+smW.meta+")"+(smW.bonus ? " e +"+smW.bonus+" de bônus!" : "!");
    } else {
      const falta = smW.meta - smW.feitos;
      statusEl.textContent = "Falta"+(falta===1?"":"m")+" "+falta+" treino"+(falta===1?"":"s")+" para a meta de "+smW.meta+" da semana.";
    }
  }
  renderMetaSemana();
}
function setRing(id, r, pct){
  const el = document.getElementById(id);
  if(!el) return;
  const c = 2*Math.PI*r;
  el.setAttribute("stroke-dasharray", c.toFixed(1));
  el.setAttribute("stroke-dashoffset", (c*(1-Math.min(100,Math.max(0,pct))/100)).toFixed(1));
}

function statTile(eyebrow, value, unit, chip){
  return '<div class="card stat">'+
    '<div class="eyebrow">'+eyebrow+'</div>'+
    '<div class="value">'+value+(unit?'<small>'+unit+'</small>':'')+'</div>'+
    (chip ? '<span class="chip '+chip.tone+'">'+chip.label+'</span>' : '')+
    '</div>';
}

/* --- stat tiles v2 (Painel: Peso atual / IMC / RCQ / % Gordura) --- */
const ICON_SCALE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M12 8v4l3 2"/></svg>';
const ICON_BODY  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2.4"/><path d="M12 8v6M8 21l2.5-7M16 21l-2.5-7M8 12h8"/></svg>';
const ICON_RULER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>';
const ICON_BOLT  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M6 9l6 6 6-6"/></svg>';
const ARROW_UP   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M18 15l-6-6-6 6"/></svg>';
const TONE_VAR = {good:"var(--good)", warn:"var(--warn)", crit:"var(--crit)", info:"var(--accent)"};

/* --- ícones vetoriais (biblioteca de exercícios, recomendações, suplementos) ---
   SVG stroke, mesmo estilo dos ícones dos cards do Painel — evita depender de
   fontes de emoji do sistema, que renderizam de forma inconsistente (ou até
   como caixa/quadrado) em alguns navegadores/SOs. */
const ICON_PUSH  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 4l6 8-6 8"/><path d="M14 4l6 8-6 8" opacity=".45"/></svg>';
const ICON_PULL  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 4l-6 8 6 8"/><path d="M10 4l-6 8 6 8" opacity=".45"/></svg>';
const ICON_LEGS  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4.2" r="1.7"/><path d="M12 7.5v3.5l-3 3-1 6.8M12 11l3 3-1 6.8"/></svg>';
const ICON_CORE  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3.4v5c0 5-3 8.3-7 9.6-4-1.3-7-4.6-7-9.6v-5L12 3z"/><path d="M9 12h6"/></svg>';
const ICON_SWAP  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h13l-3-3"/><path d="M20 17H7l3 3"/></svg>';
const ICON_TIP   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M7 10a5 5 0 1 1 8.6 3.5c-.8.8-1.3 1.4-1.4 2.5H9.8c-.1-1.1-.6-1.7-1.4-2.5A5 5 0 0 1 7 10z"/></svg>';
const ICON_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const ICON_TIMER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/></svg>';
const ICON_PLAY  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M10.3 8.3v7.4l6-3.7z" fill="currentColor" stroke="none"/></svg>';

// link de busca no YouTube pra ver a execução do exercício — não embeda vídeo
// (artifacts não carregam hosts externos de vídeo), só abre uma busca em nova aba
function youtubeSearchUrl(nomeExercicio){
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(nomeExercicio + " exercício execução técnica correta");
}
const ICON_TREND_DOWN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v14"/><path d="M7 13l5 5 5-5"/></svg>';
const ICON_ALERT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3.5 21 19H3L12 3.5z"/><path d="M12 10v4"/><path d="M12 17h.01"/></svg>';
const ICON_BATTERY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="8" width="17" height="8" rx="2"/><path d="M22 10.5v3"/><path d="M6 11v2"/></svg>';
const ICON_TROPHY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 5H5a1 1 0 0 0-1 1 4 4 0 0 0 4 4M16 5h3a1 1 0 0 1 1 1 4 4 0 0 1-4 4"/><path d="M12 13v3M9 20h6M10 20v-1.3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20"/></svg>';
const ICON_CHECK_CIRCLE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>';
const ICON_DUMBBELL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/></svg>';
const ICON_TREND_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>';
const ICON_TREND_DN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/></svg>';
const ICON_CALENDAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="m9.5 15 2 2 3.5-3.5"/></svg>';
const ICON_WEIGHT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8h12l2 12H4L6 8z"/><circle cx="12" cy="5" r="2"/><path d="M10 14h4"/></svg>';
const ICON_TAPE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2.5" y="8" width="19" height="8" rx="2"/><path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4"/></svg>';
const ICON_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg>';
const ICON_PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6z"/><path d="M12 13v7"/></svg>';
const ICON_PILL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="8" rx="4"/><line x1="12" y1="8" x2="12" y2="16"/></svg>';
const ICON_SHAKER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3h7l-.8 4h-5.4L8.5 3z"/><path d="M9.3 7h5.4l1.1 11.8a2 2 0 0 1-2 2.2h-3.6a2 2 0 0 1-2-2.2L9.3 7z"/><path d="M8 13h8"/></svg>';
const ICON_HOME = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v9a1 1 0 0 0 1 1h3v-5h4v5h3a1 1 0 0 0 1-1v-9"/></svg>';
const ICON_TAG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.6 3.5 20 10.9a2 2 0 0 1 0 2.8l-6.3 6.3a2 2 0 0 1-2.8 0L3.5 12.6V5a1.5 1.5 0 0 1 1.5-1.5h7.6z"/><circle cx="8.2" cy="8.2" r="1.3"/></svg>';
const CATEGORY_ICON = {"Peito, ombros e tríceps":ICON_PUSH, "Costas e bíceps":ICON_PULL, "Pernas":ICON_LEGS, "Core":ICON_CORE};

function statTileV2(o){
  return '<div class="card stat-v2" style="border-left-color:'+o.accent+';">'+
    '<div class="stat-v2-top">'+
      '<div class="stat-v2-ic" style="background:'+o.iconBg+'; color:'+o.iconColor+';">'+o.icon+'</div>'+
      '<div><div class="eyebrow">'+o.eyebrow+'</div><div class="value">'+o.value+(o.unit?'<small>'+o.unit+'</small>':'')+'</div></div>'+
    '</div>'+
    '<div class="stat-v2-trend'+(o.trendClass?(' '+o.trendClass):'')+'">'+o.trendHtml+'</div>'+
    '</div>';
}

function renderQuickStats(){
  const el = document.getElementById("quick-stats");
  const med = latestMedicao();
  const perfil = state.perfil;
  if(!med || !perfil){
    el.innerHTML =
      statTileV2({eyebrow:"Peso atual", value:"—", unit:"kg", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_SCALE, trendHtml:"Registre uma medição para começar."}) +
      statTileV2({eyebrow:"IMC", value:"—", unit:"", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_BODY, trendHtml:"—"}) +
      statTileV2({eyebrow:"RCQ", value:"—", unit:"", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_RULER, trendHtml:"—"}) +
      statTileV2({eyebrow:"% Gordura", value:"—", unit:"", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_BOLT, trendHtml:"—"});
    return;
  }
  const imc = calcIMC(med.pesoKg, perfil.alturaCm);
  const cImc = classIMC(imc, perfil);
  const medRcq = ultimaComRCQ(), medBf = ultimaComBF(perfil);
  const rcq = medRcq ? calcRCQ(medRcq.cinturaCm, medRcq.quadrilCm) : null;
  const cRcq = rcq != null ? classRCQ(rcq, perfil.sexo) : null;
  const bf = medBf ? calcBFNavy(perfil.sexo, medBf.cinturaCm, medBf.quadrilCm, medBf.pescocoCm, perfil.alturaCm) : null;
  const ateData = m=> (m && m.iso !== med.iso) ? " · medido em "+fmtDateBR(m.iso) : "";
  const pedeMedidas = '<button type="button" class="link-btn" data-goto-medidas>Preencher medidas</button>';

  // tendência de peso — mesma janela do gráfico (últimos 90 dias)
  const cutoff90 = addDaysISO(todayISO(), -90);
  const pesoSerie = sortedMedicoes().filter(m=>m.iso>=cutoff90 && m.pesoKg!=null);
  let pesoTrendHtml, pesoTrendClass = "";
  if(pesoSerie.length >= 2){
    const delta = pesoSerie[pesoSerie.length-1].pesoKg - pesoSerie[0].pesoKg;
    if(Math.abs(delta) >= 0.05){
      pesoTrendClass = delta < 0 ? "down" : "up";
      pesoTrendHtml = (delta<0?ARROW_DOWN:ARROW_UP)+'<span>'+(delta>=0?"+":"−")+num(Math.abs(delta),1)+' kg nos últimos 90 dias</span>';
    } else {
      pesoTrendHtml = "Peso estável nos últimos 90 dias";
    }
  } else {
    pesoTrendHtml = "Registre mais medições para ver a tendência.";
  }

  // tendência de IMC — compara com a medição anterior, se houver
  const todasMed = sortedMedicoes();
  const prevMed = todasMed.length>=2 ? todasMed[todasMed.length-2] : null;
  let imcTrendHtml, imcTrendClass = "";
  if(prevMed){
    const deltaImc = imc - calcIMC(prevMed.pesoKg, perfil.alturaCm);
    if(Math.abs(deltaImc) >= 0.05){
      imcTrendClass = deltaImc < 0 ? "down" : "up";
      imcTrendHtml = (deltaImc<0?ARROW_DOWN:ARROW_UP)+'<span>'+cImc.label+'</span>';
    } else {
      imcTrendHtml = cImc.label+" · estável";
    }
  } else {
    imcTrendHtml = cImc.label;
  }

  el.innerHTML =
    statTileV2({eyebrow:"Peso atual", value:num(med.pesoKg,1), unit:"kg", accent:"var(--viz-1)", iconBg:"color-mix(in srgb, var(--viz-1) 18%, transparent)", iconColor:"var(--viz-1)", icon:ICON_SCALE, trendHtml:pesoTrendHtml, trendClass:pesoTrendClass}) +
    statTileV2({eyebrow:"IMC", value:num(imc,1), unit:"", accent:TONE_VAR[cImc.tone], iconBg:"color-mix(in srgb, "+TONE_VAR[cImc.tone]+" 18%, transparent)", iconColor:TONE_VAR[cImc.tone], icon:ICON_BODY, trendHtml:imcTrendHtml, trendClass:imcTrendClass}) +
    (cRcq
      ? statTileV2({eyebrow:"RCQ", value:num(rcq,2), unit:"", accent:TONE_VAR[cRcq.tone], iconBg:"color-mix(in srgb, "+TONE_VAR[cRcq.tone]+" 18%, transparent)", iconColor:TONE_VAR[cRcq.tone], icon:ICON_RULER, trendHtml:cRcq.label+((Number(perfil.idade) < 18) ? " · ref. de adultos" : "")+(sexoValido(perfil.sexo) ? "" : " · corte médio")+ateData(medRcq)})
      : statTileV2({eyebrow:"RCQ", value:"—", unit:"", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_RULER, trendHtml:"Precisa de cintura e quadril. "+pedeMedidas})) +
    (bf != null
      ? statTileV2({eyebrow:"% Gordura", value:num(bf,1), unit:"%", accent:"var(--accent)", iconBg:"var(--accent-soft)", iconColor:"var(--accent)", icon:ICON_BOLT, trendHtml:((Number(perfil.idade) < 18) ? "Estimativa aproximada: acompanhe a tendência" : "Classificação: "+classBF(bf,perfil.sexo))+ateData(medBf)})
      : statTileV2({eyebrow:"% Gordura", value:"—", unit:"", accent:"var(--line-strong)", iconBg:"var(--surface-2)", iconColor:"var(--muted)", icon:ICON_BOLT, trendHtml:sexoValido(perfil.sexo) ? "Precisa de cintura, pescoço"+(perfil.sexo === "F" ? " e quadril" : "")+". "+pedeMedidas : "Precisa do gênero para cálculo (Perfil) e das medidas. "+'<button type="button" class="link-btn" data-empty-go="perfil">Abrir perfil</button>'}));
}

setupBuscas();
/* v94 C4: folha inferior de registro — fechar por Esc, toque fora e arrastando a alça para baixo */
(function setupFolhas(){
  const fechar = (sh)=>{ const b = sh && sh.querySelector("[data-qtoggle]"); if(b) b.click(); };
  document.addEventListener("keydown", e=>{
    if(e.key !== "Escape") return;
    if(document.querySelector("#modal-root .modal, .celeb-backdrop.show")) return;   // o modal/celebração por cima fecha primeiro
    const sh = document.querySelector(".qc-sheet:popover-open"); if(sh){ e.preventDefault(); fechar(sh); }
  });
  // o ::backdrop de um popover "manual" não recebe cliques (vão para a página): fecha qualquer toque fora da folha, sem acionar o que está por baixo
  document.addEventListener("click", e=>{
    const sh = document.querySelector(".qc-sheet:popover-open");
    if(!sh || sh.contains(e.target)) return;
    if(e.target.closest && e.target.closest("#toast, #modal-root, #celebration-root")) return;   // toques no aviso, modal ou celebração valem para eles
    e.preventDefault(); e.stopPropagation(); fechar(sh);
  }, true);
  let st = null;
  document.addEventListener("pointerdown", e=>{
    const h = e.target.closest && e.target.closest(".qc-grip, .qc-sheet-head");
    if(!h || (e.target.closest && e.target.closest("button"))) return;
    const sh = h.closest(".qc-sheet"); if(!sh) return;
    st = {sh, y0:e.clientY, t0:performance.now(), dy:0, id:e.pointerId};
    h.setPointerCapture(e.pointerId); sh.style.transition = "none";
  });
  document.addEventListener("pointermove", e=>{
    if(!st || e.pointerId !== st.id) return;
    st.dy = Math.max(0, e.clientY - st.y0);
    st.sh.style.transform = "translateY("+st.dy+"px)";
  });
  const fim = (e)=>{
    if(!st || e.pointerId !== st.id) return;
    const {sh, dy, t0} = st; st = null;
    const veloc = dy / Math.max(1, performance.now() - t0);
    sh.style.transition = "";
    if(dy > 90 || (dy > 30 && veloc > 0.6)) fechar(sh);
    else sh.style.transform = "";
  };
  document.addEventListener("pointerup", fim);
  document.addEventListener("pointercancel", fim);
})();
/* v93 C6: ações dos estados vazios */
document.addEventListener("click", e=>{
  const b = e.target.closest("[data-empty-go]");
  if(!b) return;
  const go = b.dataset.emptyGo;
  if(go === "perfil") openPerfilEditor();
  else if(go === "cadastro") openOnboarding();
  else if(go === "foto"){ const f = document.getElementById("btn-add-foto"); if(f) f.click(); }
  else if(go === "treino") showTabAnimated("treino");
  else if(go === "medir"){
    const foco = ()=>{ const i = document.getElementById("m-peso"); if(i){ i.scrollIntoView({block:"center", behavior:"smooth"}); i.focus({preventScroll:true}); } };
    const corpoVisivel = !document.getElementById("view-corpo").hidden;
    if(corpoVisivel) foco(); else Promise.resolve(showTabAnimated("corpo")).then(()=> setTimeout(foco, 60));
  }
});
document.querySelectorAll("#main-tabs .tab-btn").forEach(b=>{ b.title = b.textContent.trim(); });   // v92 L5: no trilho só de ícones o nome aparece ao passar o mouse

/* v89 L1: lembra quais camadas do "Hoje" o usuário abriu/fechou (preferência por aparelho) */
(function setupCamadasHoje(){
  const KEY = "bff_hoje_cc_v98";   // v98 F4: chave nova — o padrão do Hoje agora é tudo recolhido, e a escolha antiga não deve reabrir blocos sem a pessoa pedir
  let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }catch(e){ saved = {}; }
  document.querySelectorAll("details.cc[data-cc]").forEach(d=>{
    const id = d.dataset.cc;
    if(Object.prototype.hasOwnProperty.call(saved, id)) d.open = !!saved[id];
    d.addEventListener("toggle", ()=>{
      saved[id] = d.open;
      try{ localStorage.setItem(KEY, JSON.stringify(saved)); }catch(e){}
      if(d.open && (id === "peso" || id === "vermais")){ try{ renderWeightChart(); }catch(e){} }   // fechado, o SVG mede 0 px: redesenha na largura real
    });
  });
})();
let pesoPeriodo = (()=>{ try{ const v = localStorage.getItem("bff_peso_periodo"); return ["30","90","all"].includes(v) ? v : "90"; }catch(e){ return "90"; } })();
document.getElementById("weight-period").addEventListener("click", (ev)=>{
  const b = ev.target.closest("button[data-p]"); if(!b || b.dataset.p === pesoPeriodo) return;
  pesoPeriodo = b.dataset.p; playSound("tick");
  try{ localStorage.setItem("bff_peso_periodo", pesoPeriodo); }catch(e){}
  renderWeightChart();
  renderResumoMes();   // F9: o resumo logo abaixo do gráfico acompanha o período
});
function renderWeightChart(){
  const svg = document.getElementById("weight-chart");
  const empty = document.getElementById("weight-chart-empty");
  const hint = document.getElementById("weight-trend-hint");
  const cutoff = pesoPeriodo === "all" ? null : addDaysISO(todayISO(), -Number(pesoPeriodo));
  const titleEl = document.getElementById("weight-title");
  if(titleEl) titleEl.textContent = pesoPeriodo === "all" ? "Peso — histórico completo" : "Peso — últimos "+pesoPeriodo+" dias";
  document.querySelectorAll("#weight-period button").forEach(b=>{ const on = b.dataset.p === pesoPeriodo; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on?"true":"false"); });
  const data = sortedMedicoes().filter(m=>(!cutoff || m.iso>=cutoff) && m.pesoKg!=null);
  if(data.length < 2){
    svg.innerHTML = "";
    empty.hidden = false;
    hint.textContent = "—";
    return;
  }
  empty.hidden = true;
  const delta = data[data.length-1].pesoKg - data[0].pesoKg;
  hint.textContent = num(data[data.length-1].pesoKg,1)+" kg atual · "+(delta>=0?"+":"")+num(delta,1)+" kg no período";
  drawLineChart(svg, [{
    label:"Peso", color:"var(--viz-1)",
    points: data.map(d=>({x:d.iso, y:d.pesoKg}))
  }], "kg", {digits:1});
}

const EVOLUCAO_METRICS = {
  peso:    {label:"Peso",    unit:"kg", color:"var(--viz-1)", dash:"",       digits:1, get:m=>m.pesoKg},
  cintura: {label:"Cintura", unit:"cm", color:"var(--viz-2)", dash:"7 4",  digits:1, get:m=>m.cinturaCm},
  quadril: {label:"Quadril", unit:"cm", color:"var(--viz-3)", dash:"1.5 4", digits:1, get:m=>m.quadrilCm},
  rcq:     {label:"RCQ",     unit:"",   color:"var(--accent)",   digits:2, get:m=>calcRCQ(m.cinturaCm, m.quadrilCm)},
};
let evolucaoMetric = "peso";
document.querySelectorAll("#evolucao-tabs .metric-tab").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    evolucaoMetric = btn.dataset.metric;
    document.querySelectorAll("#evolucao-tabs .metric-tab").forEach(b=> b.classList.toggle("active", b===btn));
    renderEvolucaoChart();
  });
});

let evolucaoPeriodo = "all";
document.querySelectorAll("#evolucao-period button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    evolucaoPeriodo = btn.dataset.period;
    document.querySelectorAll("#evolucao-period button").forEach(b=> b.classList.toggle("active", b===btn));
    renderEvolucaoChart();
  });
});

function renderEvolucaoChart(){
  const svg = document.getElementById("evolucao-chart");
  const empty = document.getElementById("evolucao-chart-empty");
  const callout = document.getElementById("evolucao-callout");
  const legend = document.getElementById("evolucao-legend");
  const cutoff = evolucaoPeriodo==="all" ? null : addDaysISO(todayISO(), -31*Number(evolucaoPeriodo));
  if(evolucaoMetric === "comparar"){
    // v89 C2: três métricas na mesma escala — % de variação desde a primeira medição do período
    const series = ["peso","cintura","quadril"].map(k=>{
      const c = EVOLUCAO_METRICS[k];
      const d = sortedMedicoes().filter(m=> !cutoff || m.iso>=cutoff).map(m=>({iso:m.iso, v:c.get(m)})).filter(x=> x.v!=null && !isNaN(x.v));
      if(d.length < 2) return null;
      const base = d[0].v;
      return {label:c.label, color:c.color, dash:c.dash, points:d.map(x=>({x:x.iso, y:(x.v/base-1)*100})), last:(d[d.length-1].v/base-1)*100};
    }).filter(Boolean);
    if(!series.length){ svg.innerHTML = ""; empty.hidden = false; callout.innerHTML = ""; legend.hidden = true; return; }
    empty.hidden = true;
    callout.innerHTML = series.map(s=>'<span class="trend-txt '+(Math.abs(s.last)<0.05?'flat':(s.last<0?'down':'up'))+'">'+s.label+' '+(s.last>0?'+':'')+num(s.last,1)+'%</span>').join(" ");
    legend.hidden = false;
    legend.innerHTML = series.map(s=>'<span><i class="lg-line'+(s.dash ? (s.dash.indexOf("1.5")===0 ? ' dotted' : ' dashed') : '')+'" style="--c:'+s.color+'"></i>'+s.label+'</span>').join("")+'<span class="hint">0% = primeira medição do período</span>';
    drawLineChart(svg, series, "%", {digits:1, signed:true, endLabels:true});
    return;
  }
  legend.hidden = true;
  const cfg = EVOLUCAO_METRICS[evolucaoMetric];
  const data = sortedMedicoes().filter(m=> !cutoff || m.iso>=cutoff).map(m=>({iso:m.iso, y:cfg.get(m)})).filter(d=> d.y!=null && !isNaN(d.y));
  if(data.length < 2){
    svg.innerHTML = "";
    empty.hidden = false;
    callout.innerHTML = "";
    return;
  }
  empty.hidden = true;
  const last = data[data.length-1].y;
  const delta = last - data[0].y;
  const threshold = cfg.digits===2 ? 0.005 : 0.05;
  let trendHtml;
  if(Math.abs(delta) >= threshold){
    const cls = delta<0 ? "down" : "up";
    trendHtml = '<span class="trend-txt '+cls+'">'+(delta<0?"↓":"↑")+' '+(delta<0?"":"+")+num(Math.abs(delta),cfg.digits)+(cfg.unit?" "+cfg.unit:"")+' no período</span>';
  } else {
    trendHtml = '<span class="trend-txt flat">Estável no período</span>';
  }
  callout.innerHTML = '<b>'+num(last,cfg.digits)+(cfg.unit?" "+cfg.unit:"")+'</b>'+trendHtml;
  drawLineChart(svg, [{label:cfg.label, color:cfg.color, points:data.map(d=>({x:d.iso,y:d.y}))}], cfg.unit, {digits:cfg.digits});
}

// desenha um line chart responsivo (viewBox 640x200) com crosshair + tooltip no hover/foco
let _chartResizeT = null, _chartLastW = window.innerWidth;
window.addEventListener("resize", ()=>{
  clearTimeout(_chartResizeT);
  _chartResizeT = setTimeout(()=>{
    if(Math.abs(window.innerWidth-_chartLastW) < 40) return;
    _chartLastW = window.innerWidth;
    try{ renderWeightChart(); renderEvolucaoChart(); renderCargaChart(); }catch(e){ ngReporta(e,"graficos"); }
  }, 250);
});
document.addEventListener("pointerdown", (e)=>{
  document.querySelectorAll("svg.chart").forEach(sv=>{ if(sv._cxHide && e.target !== sv._cxCapture) sv._cxHide(); });
}, true);
function drawLineChart(svg, series, unit, opts){
  opts = opts || {};
  const digits = opts.digits == null ? 1 : opts.digits;
  const fmtV = v => (opts.signed && v > 0 ? "+" : "") + num(v, digits);
  // v78: o SVG é desenhado num viewBox 640 de largura e encolhe no celular — sem compensar,
  // texto de 10px vira ~5px. Escala fontes/traços pela largura real e usa mais altura em telas estreitas.
  const cw = (svg.getBoundingClientRect().width) || 640;
  const sc = Math.max(1, 640/cw);
  const k = Math.min(sc, 1.7);
  const fs = Math.round(10.5*sc*10)/10;
  const W = 640, H = sc>1.15 ? Math.round(Math.min(380, 175*sc)) : 200;
  const endL = opts.endLabels && series.length >= 2 && series.length <= 4;
  const padL = Math.round(fs*2.6)+6, padR = endL ? Math.round(fs*4.6)+10 : 14, padT = Math.round(14*k), padB = Math.round(fs*1.9);
  const plotW = W-padL-padR, plotH = H-padT-padB;
  const allPts = series.flatMap(s=>s.points);
  const xs = [...new Set(allPts.map(p=>p.x))].sort();
  const ys = allPts.filter(p=>p.y!=null).map(p=>p.y);
  let minY = Math.min(...ys), maxY = Math.max(...ys);
  if(minY===maxY){ minY -= 1; maxY += 1; }
  const pad = (maxY-minY)*0.15 || 1;
  minY -= pad; maxY += pad;
  const xIdx = x => xs.indexOf(x)/(Math.max(xs.length-1,1));
  const xPix = x => padL + xIdx(x)*plotW;
  const yPix = y => padT + (1-(y-minY)/(maxY-minY))*plotH;

  let svgHtml = "";
  // gridlines
  const ticks = sc>1.5 ? 3 : 4;
  const stepY = (maxY-minY)/ticks, tickD = stepY < 0.1 ? 2 : (stepY < 1 ? 1 : 0);   // v89: RCQ/percentuais não repetem o mesmo rótulo
  for(let i=0;i<=ticks;i++){
    const yVal = minY + (maxY-minY)*i/ticks;
    const yy = yPix(yVal);
    svgHtml += '<line x1="'+padL+'" y1="'+yy+'" x2="'+(W-padR)+'" y2="'+yy+'" stroke="var(--line)" stroke-width="1"/>';
    svgHtml += '<text x="'+(padL-8)+'" y="'+(yy+fs*0.34)+'" font-size="'+fs+'" text-anchor="end" fill="var(--muted)" font-family="IBM Plex Mono, monospace">'+num(yVal,tickD)+'</text>';
  }
  // x labels (primeiro, meio, último)
  [0, Math.floor((xs.length-1)/2), xs.length-1].forEach(i=>{
    if(i<0) return;
    const xIso = xs[i];
    svgHtml += '<text x="'+xPix(xIso)+'" y="'+(H-padB*0.28)+'" font-size="'+fs+'" text-anchor="'+(i===0?'start':(i===xs.length-1?'end':'middle'))+'" fill="var(--muted)">'+fmtDateBR(xIso)+'</text>';
  });

  // v89 C2: faixas de contexto (ex.: semanas de deload) desenhadas atrás da linha
  let bandsDrawn = 0;
  (opts.bands || []).forEach(b=>{
    const posOf = (iso)=>{
      if(iso <= xs[0]) return xPix(xs[0]);
      if(iso >= xs[xs.length-1]) return xPix(xs[xs.length-1]);
      let i = 0; while(i < xs.length-2 && xs[i+1] <= iso) i++;
      const d0 = new Date(xs[i]+"T12:00:00"), d1 = new Date(xs[i+1]+"T12:00:00"), dd = new Date(iso+"T12:00:00");
      const f = d1 > d0 ? (dd-d0)/(d1-d0) : 0;
      return xPix(xs[i]) + f*(xPix(xs[i+1])-xPix(xs[i]));
    };
    if(b.to < xs[0] || b.from > xs[xs.length-1]) return;
    const x0 = posOf(b.from), x1 = Math.max(posOf(b.to), x0+3);
    svgHtml += '<rect class="chart-band" x="'+x0.toFixed(1)+'" y="'+padT+'" width="'+(x1-x0).toFixed(1)+'" height="'+(H-padB-padT)+'" fill="var(--accent)" opacity="0.14"/>';
    bandsDrawn++;
  });

  // série única: área em degradê sob a linha, do primeiro ao último ponto até a base do eixo
  const gradId = "chartGrad"+(CHART_GRAD_SEQ++);
  if(series.length === 1){
    const pts0 = series[0].points.filter(p=>p.y!=null);
    if(pts0.length){
      const baseline = H-padB;
      const areaPath = pts0.map((p,i)=> (i===0?"M":"L")+xPix(p.x).toFixed(1)+","+yPix(p.y).toFixed(1)).join(" ")+
        " L"+xPix(pts0[pts0.length-1].x).toFixed(1)+","+baseline+
        " L"+xPix(pts0[0].x).toFixed(1)+","+baseline+" Z";
      svgHtml += '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1">'+
        '<stop offset="0%" stop-color="'+series[0].color+'" stop-opacity="0.35"/>'+
        '<stop offset="100%" stop-color="'+series[0].color+'" stop-opacity="0"/>'+
        '</linearGradient></defs>';
      svgHtml += '<path d="'+areaPath+'" fill="url(#'+gradId+')" stroke="none"/>';
    }
  }

  // linhas + pontos discretos (sem rótulo fixo — valor exato fica no hover/tooltip e na tabela)
  series.forEach(s=>{
    const pts = s.points.filter(p=>p.y!=null);
    const path = pts.map((p,i)=> (i===0?"M":"L")+xPix(p.x).toFixed(1)+","+yPix(p.y).toFixed(1)).join(" ");
    svgHtml += '<path d="'+path+'" fill="none" stroke="'+s.color+'" stroke-width="'+(2*k).toFixed(1)+'" stroke-linecap="round" stroke-linejoin="round"'+(s.dash ? ' stroke-dasharray="'+s.dash.split(" ").map(n=>(parseFloat(n)*k).toFixed(1)).join(" ")+'"' : '')+'/>';
    pts.forEach(p=>{
      const hi = !!p.highlight;
      svgHtml += '<circle cx="'+xPix(p.x).toFixed(1)+'" cy="'+yPix(p.y).toFixed(1)+'" r="'+((hi?4.5:3)*k).toFixed(1)+'" fill="'+(hi?"var(--good)":s.color)+'" stroke="var(--surface)" stroke-width="1.5"/>';
    });
  });

  // v93 V7: rótulo direto no fim de cada linha (a identidade não depende só da cor); evita sobreposição entre rótulos vizinhos
  if(endL){
    const lh = fs + 3;
    const ends = series.map((s,si)=>{ const pts = s.points.filter(p=>p.y!=null); const p = pts[pts.length-1]; return {si, y:yPix(p.y), label:s.label}; }).sort((a,b)=>a.y-b.y);
    for(let i=1;i<ends.length;i++) if(ends[i].y - ends[i-1].y < lh) ends[i].y = ends[i-1].y + lh;
    const over = ends[ends.length-1].y - (H - padB - 2);
    if(over > 0) ends.forEach(e=> e.y -= over);
    ends.forEach(e=>{ svgHtml += '<text class="chart-endlabel" x="'+(W-padR+6)+'" y="'+(e.y+fs*0.34).toFixed(1)+'" font-size="'+fs+'" font-weight="600" fill="var(--ink-soft)" aria-hidden="true">'+escapeHtml(e.label)+'</text>'; });
  }

  // camada de interação: crosshair + ponto ativo por série, ocultos até hover/foco
  svgHtml += '<line class="cx-line" x1="0" y1="'+padT+'" x2="0" y2="'+(H-padB)+'" stroke="var(--muted)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>';
  series.forEach((s,si)=>{
    svgHtml += '<circle class="cx-dot" data-si="'+si+'" r="'+(5.5*k).toFixed(1)+'" fill="'+s.color+'" stroke="var(--surface)" stroke-width="2" opacity="0"/>';
  });
  svgHtml += '<rect class="cx-capture" x="'+padL+'" y="0" width="'+plotW+'" height="'+H+'" fill="transparent" tabindex="0" role="img" aria-label="Gráfico de '+series.map(s=>s.label).join(" e ")+'. Use as setas do teclado para navegar pelos pontos; Home e End vão ao primeiro e ao último."/>';

  svg.setAttribute("viewBox","0 0 "+W+" "+H);
  svg.innerHTML = svgHtml;

  // tooltip HTML (um por chart-wrap, reaproveitado a cada render)
  const wrap = svg.parentElement;
  let tip = wrap.querySelector(".chart-tooltip");
  if(!tip){ tip = document.createElement("div"); tip.className = "chart-tooltip"; wrap.appendChild(tip); }

  // chip fixo com o valor atual (só quando há uma única série, ex.: gráfico de peso)
  let currentChip = wrap.querySelector(".chart-current-chip");
  if(series.length === 1 && series[0].points.some(p=>p.y!=null)){
    if(!currentChip){ currentChip = document.createElement("div"); currentChip.className = "chart-current-chip"; wrap.appendChild(currentChip); }
    const ptsChip = series[0].points.filter(p=>p.y!=null);
    const lastPt = ptsChip[ptsChip.length-1];
    currentChip.innerHTML = '<strong>'+fmtV(lastPt.y)+' '+unit+'</strong><span>atual</span>';
    currentChip.style.display = "block";
  } else if(currentChip){
    currentChip.style.display = "none";
  }

  // v89 C2: região "ao vivo" para leitor de tela (só fala ao navegar por teclado)
  let live = wrap.querySelector(".chart-live");
  if(!live){ live = document.createElement("div"); live.className = "sr-only chart-live"; live.setAttribute("aria-live","polite"); wrap.appendChild(live); }
  live.textContent = "";
  const crosshair = svg.querySelector(".cx-line");
  const dots = [...svg.querySelectorAll(".cx-dot")];
  const capture = svg.querySelector(".cx-capture");

  function showAt(idx, fromKeyboard){
    if(idx<0 || idx>=xs.length) return;
    const xIso = xs[idx];
    const px = xPix(xIso);
    crosshair.setAttribute("x1", px); crosshair.setAttribute("x2", px); crosshair.setAttribute("opacity","1");
    let tipHtml = '<div class="ct-date">'+fmtDateBR(xIso)+'</div>';
    let any = false, liveTxt = '';
    series.forEach((s,si)=>{
      const pt = s.points.find(p=>p.x===xIso);
      const dot = dots[si];
      if(pt && pt.y!=null){
        const hiColor = pt.highlight ? "var(--good)" : s.color;
        dot.setAttribute("cx", px); dot.setAttribute("cy", yPix(pt.y)); dot.setAttribute("opacity","1");
        dot.setAttribute("fill", hiColor);
        tipHtml += '<div class="ct-row"><span class="ct-key" style="background:'+hiColor+'"></span><span class="ct-label">'+s.label+(pt.highlight?' · recorde':'')+'</span><span class="ct-val">'+fmtV(pt.y)+(unit?' '+unit:'')+'</span></div>';
        // variação contra o ponto anterior da própria série (cor neutra: subir pode ser bom ou ruim, depende da métrica)
        const ptsS = s.points.filter(q=>q.y!=null), ix = ptsS.indexOf(pt);
        if(ix > 0){
          const dlt = pt.y - ptsS[ix-1].y;
          if(Math.abs(dlt) >= Math.pow(10,-digits)/2) tipHtml += '<span class="ct-delta">'+(dlt>0?'▲':'▼')+' '+num(Math.abs(dlt),digits)+(unit?' '+unit:'')+' vs. anterior</span>';
        }
        liveTxt += (liveTxt?'; ':'')+s.label+' '+fmtV(pt.y)+(unit?' '+unit:'');
        any = true;
      } else {
        dot.setAttribute("opacity","0");
      }
    });
    tip.innerHTML = tipHtml;
    tip.classList.toggle("show", any);
    if(live && fromKeyboard) live.textContent = fmtDateBR(xIso)+': '+liveTxt+' (ponto '+(idx+1)+' de '+xs.length+')';
    const wrapRect = wrap.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const scale = svgRect.width / W || 1;
    const tipW = tip.offsetWidth || 130;
    let left = (svgRect.left - wrapRect.left) + px*scale + 12;
    if(left + tipW > wrapRect.width - 4){ left = (svgRect.left - wrapRect.left) + px*scale - tipW - 12; }
    tip.style.left = Math.max(4, left)+"px";
    tip.style.top = "6px";
  }
  function hide(){
    crosshair.setAttribute("opacity","0");
    dots.forEach(d=> d.setAttribute("opacity","0"));
    tip.classList.remove("show");
  }
  function nearestIdx(clientX){
    const rect = svg.getBoundingClientRect();
    const scale = W/rect.width || 1;
    const localX = (clientX - rect.left)*scale;
    let best=0, bestD=Infinity;
    xs.forEach((x,i)=>{ const d=Math.abs(xPix(x)-localX); if(d<bestD){ bestD=d; best=i; } });
    return best;
  }
  let focusIdx = xs.length-1;
  // v89: no toque, arrastar o dedo na horizontal "varre" os pontos (a rolagem vertical segue livre: touch-action:pan-y)
  // e o valor fica na tela depois de soltar; toque fora (ou Esc) esconde.
  capture.addEventListener("pointermove", e=>{ if(e.pointerType==="touch" && !capture._down) return; showAt(nearestIdx(e.clientX)); });
  capture.addEventListener("pointerdown", e=>{
    capture._down = true;
    if(e.pointerType !== "mouse"){ try{ capture.setPointerCapture(e.pointerId); }catch(_){} }
    showAt(nearestIdx(e.clientX));
  });
  const solta = ()=>{ capture._down = false; };
  capture.addEventListener("pointerup", solta); capture.addEventListener("pointercancel", solta);
  capture.addEventListener("pointerleave", e=>{ if(e.pointerType !== "touch") hide(); });
  capture.addEventListener("focus", ()=> showAt(focusIdx, true));
  capture.addEventListener("blur", hide);
  svg._cxHide = hide; svg._cxCapture = capture;
  capture.addEventListener("keydown", e=>{
    const go = (i)=>{ focusIdx = Math.max(0, Math.min(xs.length-1, i)); showAt(focusIdx, true); e.preventDefault(); };
    if(e.key==="ArrowLeft") go(focusIdx-1);
    else if(e.key==="ArrowRight") go(focusIdx+1);
    else if(e.key==="Home") go(0);
    else if(e.key==="End") go(xs.length-1);
    else if(e.key==="PageUp") go(focusIdx-5);
    else if(e.key==="PageDown") go(focusIdx+5);
    else if(e.key==="Escape"){ hide(); }
  });
}

function renderTodayDots(day, checkin){
  const dotsEl = document.getElementById("today-dots");
  if(!dotsEl) return;
  if(!day || !day.exercicios || !day.exercicios.length){ dotsEl.innerHTML = ""; return; }
  dotsEl.innerHTML = day.exercicios.map((ex,i)=>{
    const e = estadoEx(checkin, i, ex);
    const done = e.feito;
    const nomeHoje = (checkin && checkin.trocas && checkin.trocas[i]) || ex.nome;
    const rot = e.status === "ok" ? " — concluído" : e.status === "parcial" ? " — encerrado antes do fim" : e.status === "pulado" ? " — pulado" : " — pendente";
    return '<span class="'+(done?"on":"")+(e.status==="parcial"?" part":"")+(e.status==="pulado"?" skip":"")+'" title="'+escapeHtml(nomeHoje)+rot+'"></span>';
  }).join("");
}
function setTodayRing(cur, total, done){
  const ring = document.getElementById("today-ring"), lab = document.getElementById("today-ring-label"), hero = document.getElementById("today-hero");
  if(!ring) return;
  const c = 2*Math.PI*34;
  const frac = total>0 ? Math.max(0, Math.min(1, cur/total)) : 0;
  ring.setAttribute("stroke-dasharray", c.toFixed(1));
  ring.setAttribute("stroke-dashoffset", (c*(1-frac)).toFixed(1));
  if(lab) lab.textContent = total>0 ? cur+"/"+total : "—";
  if(hero) hero.classList.toggle("is-done", !!done);
  hojeAtualizaAnelSemana(cur, total);
}
/* v98 Fase 4: UM botão principal que muda com o estado do dia; o resto vira link de texto */
const ICON_HOJE_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5Z"/></svg>';
const ICON_HOJE_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
const ICON_HOJE_PESO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M8 9a4 4 0 0 1 8 0M12 9l2-2"/></svg>';
function pesoRecente(){
  const lim = addDaysISO(todayISO(), -7);
  return sortedMedicoes().some(m=> m.iso >= lim && m.pesoKg != null);
}
function aplicaAcaoHoje(estado, nDone, total, leve){
  const live = document.getElementById("btn-treino-ao-vivo"), quick = document.getElementById("btn-quick-checkin"), extra = document.getElementById("btn-hoje-extra");
  if(!live) return;
  const set = (label, acao, icone, desligado)=>{
    live.dataset.acao = acao; live.disabled = !!desligado;
    live.classList.toggle("is-done", acao === "concluido");
    live.innerHTML = icone+'<span id="today-primary-label">'+label+'</span>';
  };
  const semPeso = !pesoRecente();
  quick.hidden = !(estado === "pendente" || estado === "andamento");
  extra.hidden = true;
  if(estado === "cadastro") set("Fazer meu cadastro", "cadastro", ICON_HOJE_PLAY, false);
  else if(estado === "pendente") set("Começar treino", "treino", ICON_HOJE_PLAY, false);
  else if(estado === "andamento") set("Continuar treino ("+nDone+"/"+total+")", "treino", ICON_HOJE_PLAY, false);
  else if(estado === "concluido"){ set(leve ? "Dia leve concluído" : "Treino concluído", "concluido", ICON_HOJE_CHECK, true); extra.hidden = !semPeso; }
  else if(semPeso) set("Registrar meu peso", "peso", ICON_HOJE_PESO, false);
  else set("Ver a semana", "semana", ICON_HOJE_PLAY, false);
}
function renderSemanaResumo(){
  const el = document.getElementById("semana-resumo"), lab = document.getElementById("week-label");
  if(!el) return;
  let streak = 0; try{ streak = computeStreakEngine().streak; }catch(e){ ngReporta(e,"streak"); }
  const base = lab ? lab.textContent.replace(" concluídos","").replace(" concluído","") : "";
  el.textContent = (base ? base+" · " : "")+"sequência "+streak;
}
function renderTodayCard(){
  try{ renderPerdidoCard(); }catch(e){ ngReporta(e,"cartao-perdido"); }
  const iso = todayISO();
  const key = treinoKey(iso);
  const day = state.rotina[key];
  const hint = document.getElementById("today-hint");
  const title = document.getElementById("today-title");
  if(!day || !day.ativo){
    if(title) title.textContent = "Dia de descanso";
    hint.textContent = DAY_FULL[dayKeyFromISO(iso)]+" — recupere: sono, proteína e uma caminhada leve contam.";
    aplicaAcaoHoje(state.perfil ? "descanso" : "cadastro", 0, 0, false);
    renderTodayDots(null, null);
    setTodayRing(0, 0, false);
    return;
  }
  const checkin = state.checkins[iso];
  const done = !!checkin?.concluido;
  if(title) title.textContent = day.nome;
  hint.textContent = DAY_FULL[dayKeyFromISO(iso)]+" — "+day.exercicios.length+" exercícios"+(key !== dayKeyFromISO(iso) ? " · treino de "+DAY_FULL[key]+" (remanejado)" : "")+(checkin && checkin.leve ? " · dia leve: sequência mantida" : (checkin && checkin.rapido ? " · sessão rápida" : ""));
  renderTodayDots(day, checkin);
  const rd = resumoDia(checkin, day);
  let nDone = rd.resolvidos, algum = rd.algumRegistro;
  if(done) nDone = day.exercicios.length;
  aplicaAcaoHoje(!state.perfil ? "cadastro" : done ? "concluido" : (algum || nDone > 0) ? "andamento" : "pendente", nDone, day.exercicios.length, !!(checkin && checkin.leve));
  setTodayRing(nDone, day.exercicios.length, done);
}
const FORMATOS_SEMANA = [
  {t:4, r:3, nome:"Mais descanso", d:"Ex.: Superior/Inferior, 2× cada. Sessões mais longas e mais recuperação entre elas — bom para começar ou com agenda apertada."},
  {t:5, r:2, nome:"Equilíbrio", d:"Ex.: Peito-Costas-Pernas (PPL) + Superior/Inferior. Frequência de 2× por músculo com 2 dias livres — ponto de partida versátil."},
  {t:6, r:1, nome:"Alta frequência", d:"Ex.: PPL 2× (padrão deste app). Sessões mais curtas, mais disciplina e atenção à fadiga e ao sono."}
];
const FORMATO_SUGESTAO = {
  4:["seg","ter","qui","sex"],
  5:["seg","ter","qua","qui","sex"],
  6:["seg","ter","qua","qui","sex","sab"]
};
const DAY_ABBR = {seg:"Seg",ter:"Ter",qua:"Qua",qui:"Qui",sex:"Sex",sab:"Sáb",dom:"Dom"};
function diasAtivos(){ return DAYS.filter(k=> state.rotina[k] && state.rotina[k].ativo); }
function renderFormatoCard(){
  const box = document.getElementById("formato-opts"), now = document.getElementById("formato-now");
  if(!box) return;
  const n = diasAtivos().length;
  const cur = FORMATOS_SEMANA.find(f=> f.t === n);
  if(now) now.textContent = "Hoje: "+n+"×"+(7-n);
  box.innerHTML = FORMATOS_SEMANA.map(f=>
    '<div class="formato-opt'+(cur===f?" on":"")+'" role="listitem">'+
      '<div class="fx">'+f.t+'×'+f.r+'<small>'+f.t+' treino · '+f.r+' descanso</small></div>'+
      '<div class="ft">'+f.nome+(cur===f?" · seu formato":"")+'</div>'+
      '<div class="fd">'+f.d+'</div>'+
      '<button class="btn small fa" type="button" data-formato="'+f.t+'">'+(cur===f?"Ajustar dias":"Usar "+f.t+"×"+f.r)+'</button>'+
    '</div>').join("");
}
let formatoSel = null;
function abrirFormatoPanel(t){
  const pn = document.getElementById("formato-panel"); if(!pn) return;
  const fd = document.getElementById("formato-details"); if(fd) fd.open = true;
  const atuais = diasAtivos();
  formatoSel = new Set(atuais.length === t ? atuais : FORMATO_SUGESTAO[t]);
  pn.hidden = false;
  desenharFormatoPanel(t);
  pn.focus();
}
function desenharFormatoPanel(t){
  const pn = document.getElementById("formato-panel"); if(!pn) return;
  const n = formatoSel.size, r = 7-n;
  const vazios = DAYS.filter(k=> formatoSel.has(k) && !((state.rotina[k]||{}).exercicios||[]).length);
  pn.innerHTML =
    '<h3>Formato '+t+'×'+(7-t)+': escolha os dias de treino</h3>'+
    '<div class="fp-days" role="group" aria-label="Dias de treino">'+
      DAYS.map(k=>{
        const sem = !((state.rotina[k]||{}).exercicios||[]).length;
        return '<button type="button" class="fp-day" data-dia="'+k+'" aria-pressed="'+formatoSel.has(k)+'"><b>'+DAY_ABBR[k]+'</b>'+(sem?'<small>vazio</small>':'<small>'+escapeHtml(((state.rotina[k]||{}).nome||"").slice(0,8))+'</small>')+'</button>';
      }).join("")+
    '</div>'+
    '<div class="fp-note">Resultado: <strong>'+n+'×'+r+'</strong> ('+n+' treino · '+r+' descanso).'+
      (n===0?' Escolha ao menos 1 dia.':'')+
      (vazios.length?' Sem exercícios em '+vazios.map(k=>DAY_ABBR[k]).join(", ")+': preencha depois em "Editar rotina".':'')+
      ' Nada é apagado: os dias desligados mantêm seus exercícios.</div>'+
    '<div class="fp-actions"><button class="btn primary small" type="button" id="fp-apply"'+(n===0?' disabled':'')+'>Aplicar '+n+'×'+r+'</button><button class="btn small ghost" type="button" id="fp-cancel">Cancelar</button></div>';
}
async function aplicarFormato(){
  const jobs = [];
  const snapRotina = {}; DAYS.forEach(k=>{ snapRotina[k] = state.rotina[k]; });
  const eraExemplo = state.rotinaIsExample;
  DAYS.forEach(k=>{
    const d = state.rotina[k] || {nome:DAY_FULL[k], ativo:false, exercicios:[]};
    const nd = Object.assign({}, d, {ativo: formatoSel.has(k)});
    state.rotina[k] = nd;
    jobs.push(saveDoc("rotina/"+k, nd));   // salva os 7 dias (como o editor), senão a rotina de exemplo ficaria incompleta
  });
  state.rotinaIsExample = false;
  const pn = document.getElementById("formato-panel");
  pn.hidden = true; pn.innerHTML = "";
  render();
  microReward();
  await Promise.all(jobs);
  showToast("Formato "+formatoSel.size+"×"+(7-formatoSel.size)+" aplicado.", {action:{label:"Desfazer", fn:async ()=>{
    const js = [];
    DAYS.forEach(k=>{
      const d = snapRotina[k];
      if(d){ state.rotina[k] = d; js.push(saveDoc("rotina/"+k, d)); }
    });
    state.rotinaIsExample = eraExemplo;
    render();
    await Promise.all(js);
    showToast("Formato anterior restaurado.");
  }}});
  const b = document.querySelector("#formato-opts .formato-opt.on .fa") || document.querySelector("#formato-opts .fa");
  if(b) b.focus();
}
(function setupFormato(){
  const opts = document.getElementById("formato-opts"), pn = document.getElementById("formato-panel");
  if(!opts || !pn) return;
  opts.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-formato]"); if(b) abrirFormatoPanel(Number(b.dataset.formato));
  });
  pn.addEventListener("click", (e)=>{
    const dia = e.target.closest(".fp-day");
    if(dia){
      const k = dia.dataset.dia;
      if(formatoSel.has(k)) formatoSel.delete(k); else formatoSel.add(k);
      const t = Number(pn.querySelector("h3").textContent.match(/Formato (\d)/)[1]);
      desenharFormatoPanel(t);
      const again = pn.querySelector('.fp-day[data-dia="'+k+'"]'); if(again) again.focus();
      return;
    }
    if(e.target.closest("#fp-apply")) aplicarFormato();
    else if(e.target.closest("#fp-cancel")){ pn.hidden = true; pn.innerHTML = ""; const b = opts.querySelector(".fa"); if(b) b.focus(); }
  });
})();
document.getElementById("btn-quick-checkin").addEventListener("click", (e)=>{
  const iso = todayISO();
  const key = treinoKey(iso);
  const existing = state.checkins[iso] || {};
  const wasConcluido = !!existing.concluido;
  const prevSnap = snapCheckin(iso);
  const before = captureCelebrationBaseline();
  const data = Object.assign({}, existing, {data:iso, dia:key, concluido:true});
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
  renderNivel();
  renderAchievements();
  if(!wasConcluido){
    const celebrated = celebrateProgress(before, e.currentTarget, {xp:Math.max(0, computeNivelInfo().xp - before.xp)});
    if(!celebrated) toastCheckinDesfazer("Quest de hoje registrada. Continue assim!", iso, prevSnap);
  } else {
    showToast("Quest de hoje registrada. Continue assim!");
  }
});
function irParaPeso(){
  const foco = ()=>{ const i = document.getElementById("m-peso"); if(i){ i.scrollIntoView({block:"center", behavior:"smooth"}); i.focus({preventScroll:true}); } };
  Promise.resolve(showTabAnimated("corpo")).then(()=> setTimeout(foco, 60));
}
document.getElementById("btn-treino-ao-vivo").addEventListener("click", ()=>{
  const a = document.getElementById("btn-treino-ao-vivo").dataset.acao;
  if(a === "cadastro") openOnboarding();
  else if(a === "peso") irParaPeso();
  else if(a === "semana") showTabAnimated("treino");
  else if(a === "treino") openTreinoAoVivo();
});
document.getElementById("btn-hoje-extra").addEventListener("click", irParaPeso);

/* ============================================================
   RENDER: TREINO
   ============================================================ */
function isoWeekDateForKey(key){
  // data (dentro da semana seg-dom que contém hoje) correspondente a este dia da semana
  const iso = todayISO();
  const todayKey = dayKeyFromISO(iso);
  const diff = DAYS.indexOf(key) - DAYS.indexOf(todayKey);
  return addDaysISO(iso, diff);
}

function fmtKg(n){
  // pt-BR: vírgula decimal ("62,5"), sem casa decimal quando inteiro ("95")
  const r = Math.round(n*10)/10;
  return r.toLocaleString("pt-BR",{minimumFractionDigits:0, maximumFractionDigits:1});
}

/* v85 (I4): devolve o check-in do dia ao estado anterior (XP, sequência e conquistas são derivados, então voltam sozinhos) */
/* v86 (I6): deslizar o card do exercício com o dedo — → soma uma série (≈ metaReps/séries repetições),
   ← tira uma. Só toque, só gesto bem horizontal (o scroll vertical segue livre via touch-action:pan-y),
   precisa passar de 80 px; botões/campos dentro do card continuam funcionando normalmente. */
function bindQuestSwipe(root, act){
  root.querySelectorAll(".qc[data-qper]").forEach(card=>{
    const idx = Number(card.dataset.qi), per = Number(card.dataset.qper) || 1;
    let sx = null, sy = null, id = null, dx = 0, lock = null;
    const reset = ()=>{
      card.classList.remove("sw-on","sw-right","sw-left","sw-go");
      card.classList.add("sw-back"); card.style.transform = "";
      setTimeout(()=> card.classList.remove("sw-back"), 260);
      sx = sy = id = null; dx = 0; lock = null;
    };
    card.addEventListener("pointerdown", (e)=>{
      if(e.pointerType !== "touch" || e.target.closest("button,a,input,select,summary,label")) return;
      sx = e.clientX; sy = e.clientY; id = e.pointerId; dx = 0; lock = null;
    });
    card.addEventListener("pointermove", (e)=>{
      if(sx == null || e.pointerId !== id) return;
      const mx = e.clientX - sx, my = e.clientY - sy;
      if(lock === null && (Math.abs(mx) > 10 || Math.abs(my) > 10)) lock = Math.abs(mx) > Math.abs(my) * 1.6;
      if(lock === false){ sx = null; return; }
      if(!lock) return;
      dx = Math.max(-120, Math.min(120, mx));
      card.classList.add("sw-on");
      card.classList.toggle("sw-right", dx > 0); card.classList.toggle("sw-left", dx < 0);
      card.classList.toggle("sw-go", Math.abs(dx) >= 80);
      card.style.transform = "translateX("+Math.round(dx*0.5)+"px)";
    });
    const fim = (e)=>{
      if(sx == null || e.pointerId !== id) return;
      const go = lock && Math.abs(dx) >= 80, dir = dx > 0 ? 1 : -1;
      reset();
      if(go) act(idx, dir * per, card, true);
    };
    card.addEventListener("pointerup", fim);
    card.addEventListener("pointercancel", (e)=>{ if(sx != null && e.pointerId === id) reset(); });
  });
}
function snapCheckin(iso){ return state.checkins[iso] ? JSON.parse(JSON.stringify(state.checkins[iso])) : null; }
function desfazerCheckin(iso, prev){
  if(prev){ state.checkins[iso] = prev; saveDoc("checkins/"+iso, prev); }
  else { delete state.checkins[iso]; deleteDocRemote("checkins/"+iso); }
  render();
  showToast("Treino de hoje desmarcado.");
}
function toastCheckinDesfazer(msg, iso, prev){
  showToast(msg, {action:{label:"Desfazer", fn:()=> desfazerCheckin(iso, prev)}});
}

/* v85 (I3): ajuste rápido de carga — −/+ (2,5 kg em barras/máquinas, 1 kg em halteres e isolados) e
   "Repetir última carga". Cada toque salva na hora; a celebração de PR espera o fim da rajada de toques. */
function cargaStepFor(nome){
  return /halter|rosca|eleva[cç][aã]o|tr[ií]ceps|polia|cabo|crucifixo|panturrilha|abdominal|extensora|flexora|face pull|fly|pull-?over/i.test(nome||"") ? 1 : 2.5;
}
function cargaQuickHtml(idx, exNome, cargaAtual, lastPeso){
  const st = cargaStepFor(exNome), stTxt = fmtKg(st);
  const base = lastPeso!=null ? lastPeso : 0;
  const cur = cargaAtual==="" ? null : Number(cargaAtual);
  let h = '<div class="cq" role="group" aria-label="Ajuste rápido de carga">'+
    '<button type="button" class="cq-btn" data-cq="'+idx+'" data-cqd="-'+st+'" data-cqbase="'+base+'" aria-label="Diminuir '+stTxt+' quilos">−'+stTxt+'</button>'+
    '<button type="button" class="cq-btn" data-cq="'+idx+'" data-cqd="'+st+'" data-cqbase="'+base+'" aria-label="Aumentar '+stTxt+' quilos">+'+stTxt+'</button>';
  if(lastPeso!=null && cur!==lastPeso){
    h += '<button type="button" class="cq-btn cq-rep" data-cq="'+idx+'" data-cqset="'+lastPeso+'" aria-label="Repetir a última carga, '+fmtKg(lastPeso)+' quilos">Repetir '+fmtKg(lastPeso)+' kg</button>';
  }
  return h+'</div>';
}
function bindCargaQuick(root, inputFor, rerender){
  root.querySelectorAll("[data-cq]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const inp = inputFor(btn.dataset.cq); if(!inp) return;
      const raw = inp.value.trim();
      const cur = raw==="" ? null : Number(raw.replace(",","."));
      let v;
      if(btn.dataset.cqset != null) v = Number(btn.dataset.cqset);
      else v = (cur!=null && isFinite(cur) ? cur : Number(btn.dataset.cqbase)||0) + Number(btn.dataset.cqd);
      v = Math.min(1000, Math.max(0, Math.round(v*10)/10));
      inp.value = v>0 ? String(v) : "";
      inp.dataset.quick = "1";
      inp.dispatchEvent(new Event("change", {bubbles:true}));
      hapticPulse(8); playSound("tick");
      rerender();
      const sel = btn.dataset.cqset != null ? '[data-cqset]' : '[data-cqd="'+btn.dataset.cqd+'"]';
      const again = root.querySelector('[data-cq="'+btn.dataset.cq+'"]'+sel) || root.querySelector('[data-cq="'+btn.dataset.cq+'"]');
      if(again) again.focus();
    });
  });
}
function cargaCelebrate(before, el, opts, quick){
  if(!quick) return celebrateProgress(before, el, opts);
  cargaCelebrate._b = cargaCelebrate._b || before;
  cargaCelebrate._o = opts; cargaCelebrate._e = el;
  clearTimeout(cargaCelebrate._t);
  cargaCelebrate._t = setTimeout(()=>{
    const b = cargaCelebrate._b; cargaCelebrate._b = null;
    const anchor = (cargaCelebrate._e && document.body.contains(cargaCelebrate._e)) ? cargaCelebrate._e : document.body;
    celebrateProgress(b, anchor, cargaCelebrate._o);
  }, 900);
  return false;
}

/* v91 U6 — carga "fora da curva": parece erro de digitação (ex.: 500 em vez de 50). Não salva sozinho:
   devolve o valor anterior no campo e pergunta (toast com ação). Os botões −/+ e "repetir" não passam por aqui. */
function cargaForaDaCurva(exNome, iso, peso){
  if(!isFinite(peso) || peso <= 0) return null;
  const hist = getCargaHistory(exNome).filter(h=> h.iso !== iso);
  const prevMax = hist.length ? Math.max(...hist.map(h=> h.peso)) : null;
  if(peso > 400) return fmtKg(peso)+" kg passa do que costuma ser possível (400 kg). Foi erro de digitação?";
  if(prevMax && prevMax >= 10 && peso >= prevMax*2.5 && peso - prevMax >= 20)
    return fmtKg(peso)+" kg é "+num(peso/prevMax,1)+"× o seu recorde em "+exNome+" ("+fmtKg(prevMax)+" kg). Foi erro de digitação?";
  if(prevMax && prevMax >= 20 && peso <= prevMax*0.2)
    return fmtKg(peso)+" kg é bem menos que o seu recorde em "+exNome+" ("+fmtKg(prevMax)+" kg). Foi erro de digitação?";
  return null;
}
/* devolve true se pode salvar; false se perguntou ao usuário (e voltou o campo ao valor salvo) */
function guardaCarga(inp, finder, exNome, iso, quick){
  if(quick) return true;
  if(inp.dataset.ok === "1"){ delete inp.dataset.ok; return true; }
  const raw = inp.value.trim();
  if(raw === "") return true;
  const peso = Number(raw);
  const msg = cargaForaDaCurva(exNome, iso, peso);
  if(!msg) return true;
  const salvo = state.checkins[iso] && state.checkins[iso].cargas && state.checkins[iso].cargas[exNome];
  inp.value = salvo != null ? String(salvo) : "";
  showToast(msg, {ms:9000, action:{label:"Manter "+fmtKg(peso), fn:()=>{
    const alvo = finder();
    if(!alvo) return;
    alvo.value = String(peso); alvo.dataset.ok = "1";
    alvo.dispatchEvent(new Event("change", {bubbles:true}));
  }}});
  return false;
}
function saveCarga(iso, exNome, pesoKg){
  const cur = state.checkins[iso] || {};
  const cargas = Object.assign({}, cur.cargas);
  if(pesoKg==null || isNaN(pesoKg) || pesoKg<=0){
    delete cargas[exNome];
  } else {
    cargas[exNome] = pesoKg;
  }
  const data = Object.assign({}, cur, {data:iso, dia:treinoKey(iso), cargas});
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
}

/* ============================================================
   VARIAÇÕES/SUBSTITUIÇÕES — alternativas de equipamento pro mesmo
   padrão de movimento/músculo-alvo. Lookup estático por nome exato
   do exercício (cobre os exercícios da rotina padrão; exercícios
   renomeados ou customizados simplesmente não mostram alternativa).
   ============================================================ */
const EXERCISE_ALTERNATIVES = {
  "Supino reto": ["Supino com halteres", "Supino na máquina"],
  "Desenvolvimento militar com barra": ["Desenvolvimento com halteres", "Desenvolvimento na máquina"],
  "Supino inclinado com halteres": ["Supino inclinado na barra", "Supino inclinado na máquina"],
  "Elevação lateral": ["Elevação lateral no cabo", "Elevação lateral na máquina"],
  "Tríceps na polia (corda)": ["Tríceps francês", "Mergulho (dips) no banco"],
  "Levantamento terra": ["Stiff (levantamento terra romeno)", "Terra sumô"],
  "Barra fixa (ou puxada frente)": ["Puxada na polia (pegada aberta)", "Puxada na máquina assistida"],
  "Remada curvada com barra": ["Remada cavalinho (T-bar)", "Remada unilateral com halter", "Remada sentada pronada (pegada aberta)"],
  "Face pull": ["Crucifixo invertido", "Remada alta no cabo"],
  "Rosca direta": ["Rosca alternada com halteres", "Rosca no cabo", "Rosca inclinada com halteres (45°)"],
  "Agachamento livre": ["Leg press", "Agachamento na smith"],
  "Leg press": ["Agachamento livre", "Hack squat"],
  "Cadeira extensora": ["Agachamento livre (mais séries)", "Leg press (pés baixos)"],
  "Mesa flexora": ["Stiff (levantamento terra romeno)", "Flexora em pé", "Flexora sentada"],
  "Elevação de panturrilha em pé": ["Elevação de panturrilha sentado", "Panturrilha no leg press"],
  "Prancha": ["Abdominal supra (crunch)", "Elevação de pernas"],
  "Desenvolvimento com halteres": ["Desenvolvimento militar com barra", "Desenvolvimento na máquina"],
  "Supino na smith (ou máquina)": ["Supino reto", "Supino com halteres"],
  "Crucifixo (voador)": ["Crucifixo no cabo (cross-over)", "Voador na máquina (peck deck)"],
  "Elevação lateral no cabo": ["Elevação lateral com halteres", "Elevação lateral na máquina"],
  "Tríceps francês": ["Tríceps na polia (corda)", "Mergulho (dips) no banco"],
  "Puxada na polia (pegada aberta)": ["Barra fixa (ou puxada frente)", "Puxada na máquina assistida"],
  "Remada cavalinho (T-bar)": ["Remada curvada com barra", "Remada unilateral com halter"],
  "Remada unilateral com halter": ["Remada curvada com barra", "Remada no cabo"],
  "Rosca alternada com halteres": ["Rosca direta", "Rosca no cabo"],
  "Elevação de pernas": ["Prancha", "Abdominal supra (crunch)"],
  "Stiff (levantamento terra romeno)": ["Mesa flexora", "Levantamento terra"],
  "Hip thrust": ["Ponte de glúteo", "Cadeira abdutora"],
  "Avanço (afundo) com halteres": ["Agachamento búlgaro", "Leg press (unilateral)"],
  "Cadeira abdutora": ["Hip thrust", "Ponte de glúteo unilateral"],
  "Elevação de panturrilha sentado": ["Elevação de panturrilha em pé", "Panturrilha no leg press"],
  "Abdominal supra (crunch)": ["Prancha", "Elevação de pernas", "Abdominal na máquina"],
};

/* ============================================================
   COMO EXECUTAR — guia curto por exercício (posição inicial,
   movimento e erro comum). Lookup por nome exato, cobrindo a rotina
   padrão e todas as alternativas de EXERCISE_ALTERNATIVES. Texto de
   orientação geral; o botão "Vídeo" abre a busca no YouTube pra ver
   o movimento em ação.
   ============================================================ */
/* v95 (T2): dicas curtas de técnica (base do Laércio Refundini) — orientação geral, sem "melhor" nem "pior" */
const EXERCISE_TREINADOR = {
  "Supino reto": "Se o ombro incomodar, tente o supino com halteres usando pegada neutra (palmas de frente uma para a outra).",
  "Elevação lateral": "Mantenha o halter um pouco afastado da coxa e suba com o cotovelo levemente à frente do tronco.",
  "Tríceps na polia (corda)": "Deixe o cotovelo colado ao tronco: só o antebraço se move.",
  "Barra fixa (ou puxada frente)": "Pense em levar os cotovelos em direção ao chão, em vez de puxar só com as mãos.",
  "Puxada na polia (pegada aberta)": "Pense em levar os cotovelos em direção ao chão, em vez de puxar só com as mãos.",
  "Remada unilateral com halter": "Mantenha o ombro baixo e puxe em arco, em direção ao quadril.",
  "Elevação de panturrilha em pé": "Faça uma pausa de cerca de 0,5 s embaixo, com o músculo alongado, antes de subir.",
  "Elevação de panturrilha sentado": "Faça uma pausa de cerca de 0,5 s embaixo, com o músculo alongado, antes de subir.",
  "Rosca direta": "Quando houver, uma rosca com o braço apoiado (ex.: Scott na máquina) reduz o balanço do corpo."
};
const EXERCISE_GUIDE = {};
(function(){
  const G = (n,p,e,c)=>{ EXERCISE_GUIDE[n] = {p,e,c}; };
  G("Supino reto","Deitado no banco, pés firmes no chão, escápulas juntas e para baixo, mãos um pouco mais abertas que os ombros.","Desça a barra controlada até tocar de leve o meio do peito, cotovelos a ~45–60° do tronco, e empurre até estender os braços.","Quicar a barra no peito, tirar o quadril do banco ou abrir os cotovelos a 90°.");
  G("Supino com halteres","Deitado, halteres na altura do peito, punhos alinhados com os cotovelos.","Empurre para cima aproximando os halteres sem bater um no outro; desça até sentir o peito alongar, com controle.","Descer além do conforto do ombro ou perder o controle dos halteres na descida.");
  G("Supino na máquina","Ajuste o banco para que as pegadas fiquem na altura do meio do peito; costas e cabeça apoiadas.","Empurre sem travar os cotovelos e volte devagar até o peito alongar, sem deixar a pilha de pesos descansar.","Tirar as costas do encosto ou subir os ombros em direção às orelhas.");
  G("Supino na smith (ou máquina)","Banco alinhado para a barra descer no meio do peito; pés firmes, escápulas juntas.","Destrave a barra, desça controlado até quase tocar o peito e empurre sem travar os cotovelos no topo.","Posicionar o banco muito à frente/atrás, fazendo a barra descer perto do pescoço ou do abdômen.");
  G("Supino inclinado com halteres","Banco a 30–45°, halteres na linha do peito alto, escápulas fixas no encosto.","Empurre os halteres para cima e levemente para dentro; desça até o peito alongar, com os cotovelos ligeiramente à frente do tronco.","Inclinar demais o banco (vira ombro) ou arquear a lombar para ajudar a subir.");
  G("Supino inclinado na barra","Banco inclinado 30–45°, mãos um pouco mais abertas que os ombros, escápulas juntas.","Desça a barra até a parte alta do peito e empurre em linha levemente curva até acima dos ombros.","Descer a barra no pescoço ou levantar o quadril do banco.");
  G("Supino inclinado na máquina","Ajuste o assento para as pegadas ficarem na altura do peito alto; costas apoiadas.","Empurre até quase estender e retorne devagar, mantendo o peito aberto.","Usar impulso do corpo ou travar os cotovelos com força.");
  G("Desenvolvimento militar com barra","Em pé, barra na altura da clavícula, glúteos e abdômen contraídos, punhos retos.","Empurre a barra para cima passando rente ao rosto até travar acima da cabeça; desça controlado até a clavícula.","Arquear a lombar para ajudar ou empurrar a barra para frente em vez de em linha reta.");
  G("Desenvolvimento com halteres","Sentado com encosto (ou em pé), halteres na altura das orelhas, antebraços verticais.","Empurre para cima até quase juntar os halteres acima da cabeça e desça até a altura das orelhas.","Deixar os cotovelos muito para trás ou arquear a lombar.");
  G("Desenvolvimento na máquina","Ajuste o assento para as pegadas ficarem na altura dos ombros; costas apoiadas.","Empurre até estender sem travar e volte lentamente ao ponto inicial.","Subir os ombros junto com o peso ou tirar as costas do encosto.");
  G("Elevação lateral","Em pé, halteres ao lado do corpo, leve flexão nos cotovelos, tronco firme.","Eleve os braços pelos lados até a altura dos ombros, 'derramando' a água de uma jarra com o dedo mínimo mais alto; desça devagar.","Balançar o tronco, subir acima dos ombros ou usar carga demais.");
  G("Elevação lateral com halteres","Em pé, halteres ao lado do corpo, leve flexão nos cotovelos, tronco firme.","Eleve os braços pelos lados até a altura dos ombros, 'derramando' a água de uma jarra com o dedo mínimo mais alto; desça devagar.","Balançar o tronco, subir acima dos ombros ou usar carga demais.");
  G("Elevação lateral no cabo","Polia baixa, em pé de lado para ela, pegada na mão mais distante do cabo.","Eleve o braço lateralmente até a altura do ombro e desça devagar, mantendo tensão contínua.","Impulsionar com o tronco ou dar um tranco para iniciar o movimento.");
  G("Elevação lateral na máquina","Ajuste o assento para os ombros ficarem alinhados ao eixo da máquina; antebraços nos apoios.","Abra os braços até a altura dos ombros e retorne devagar sem descansar os pesos.","Elevar os ombros em direção às orelhas.");
  G("Tríceps na polia (corda)","Em pé frente à polia alta, cotovelos colados ao tronco, tronco levemente inclinado.","Estenda os cotovelos puxando a corda para baixo e abrindo as pontas no final; volte devagar até 90°.","Mexer os cotovelos para frente e para trás ou usar o peso do corpo para empurrar.");
  G("Tríceps francês","Em pé ou sentado, segure um halter (ou barra) acima da cabeça, cotovelos apontando para cima e fechados.","Flexione só os cotovelos descendo o peso atrás da cabeça e estenda de volta sem abrir os cotovelos.","Abrir os cotovelos, arquear a lombar ou descer o peso rápido demais.");
  G("Mergulho (dips) no banco","Mãos no banco atrás do corpo, pernas à frente (dobre os joelhos para facilitar), ombros longe das orelhas.","Desça flexionando os cotovelos até cerca de 90° e empurre de volta até estender.","Descer demais (sobrecarrega o ombro) ou deixar o quadril longe do banco.");
  G("Levantamento terra","Pés na largura do quadril, barra sobre o meio do pé, mãos logo fora das pernas, coluna neutra, peito aberto.","Empurre o chão com as pernas e estenda o quadril junto, mantendo a barra rente às pernas; termine em pé, sem inclinar para trás.","Arredondar a lombar, afastar a barra do corpo ou puxar com os braços.");
  G("Terra sumô","Pés bem afastados (além dos ombros), pontas dos pés viradas a 30–45°, barra sobre o meio do pé, mãos por dentro das pernas, quadril mais baixo e tronco mais vertical que no terra convencional.","Empurre o chão afastando os joelhos na direção dos pés, mantenha a barra rente às pernas e finalize em pé estendendo o quadril.","Joelhos caindo para dentro, perder a coluna neutra ou deixar a barra se afastar das canelas.");
  G("Stiff (levantamento terra romeno)","Em pé, barra à frente das coxas, joelhos levemente flexionados, coluna neutra.","Empurre o quadril para trás deslizando a barra rente às pernas até sentir os posteriores alongarem; volte contraindo glúteos.","Flexionar demais os joelhos (vira agachamento) ou curvar a coluna para descer mais.");
  G("Barra fixa (ou puxada frente)","Pegada pronada um pouco mais aberta que os ombros, ombros longe das orelhas, abdômen firme.","Puxe o peito em direção à barra levando os cotovelos para baixo e para trás; desça controlado até quase esticar.","Balançar o corpo, puxar só com os braços ou não descer o suficiente.");
  G("Puxada na polia (pegada aberta)","Sentado com as coxas travadas, barra com pegada um pouco mais aberta que os ombros, tronco levemente inclinado para trás.","Puxe a barra até a altura do queixo/clavícula levando os cotovelos para baixo; volte devagar alongando as costas.","Puxar atrás da nuca ou jogar o tronco para trás para ganhar impulso.");
  G("Puxada na máquina assistida","Ajuste o apoio de joelhos e o contrapeso; mãos na pegada aberta, peito aberto.","Puxe o corpo para cima levando os cotovelos para baixo e desça controlado.","Usar assistência demais por muito tempo ou balançar o corpo.");
  G("Remada curvada com barra","Pés na largura do quadril, quadril para trás, tronco inclinado ~45° com a coluna neutra, barra pendendo à frente.","Puxe a barra em direção ao umbigo levando os cotovelos para trás, segure 1 segundo e desça controlado.","Subir e descer o tronco a cada repetição ou arredondar as costas.");
  G("Remada cavalinho (T-bar)","Posicione-se sobre a barra com os pés firmes, joelhos levemente flexionados e coluna neutra.","Puxe a barra em direção ao peito baixo/abdômen levando os cotovelos para trás e retorne controlado.","Usar impulso do quadril ou deixar as costas arredondarem.");
  G("Remada unilateral com halter","Apoie uma mão e o joelho no banco, coluna neutra, halter pendendo sob o ombro.","Puxe o halter em direção ao quadril levando o cotovelo para trás e para cima; desça alongando as costas.","Girar o tronco para levantar o peso ou puxar só com o bíceps.");
  G("Remada no cabo","Sentado com os pés apoiados, joelhos levemente flexionados, tronco ereto, pegada neutra.","Puxe a pegada em direção ao abdômen aproximando as escápulas; retorne devagar sem arredondar as costas.","Balançar o tronco para frente e para trás ou encolher os ombros.");
  G("Face pull","Polia na altura do rosto com corda; pegada neutra, passos para trás até tensionar o cabo.","Puxe a corda em direção ao rosto abrindo os cotovelos para os lados, até as mãos ficarem ao lado das orelhas; volte controlado.","Usar carga demais e puxar com o corpo, ou subir os ombros.");
  G("Crucifixo invertido","Inclinado à frente com coluna neutra (ou na máquina peck deck de costas), halteres leves pendendo.","Abra os braços para os lados com leve flexão nos cotovelos até a altura dos ombros e retorne devagar.","Balançar o tronco ou usar carga alta que tira o foco do ombro posterior.");
  G("Remada alta no cabo","Polia baixa, pegada na largura dos ombros, tronco ereto.","Puxe levando os cotovelos para cima e para os lados até a altura do peito; desça devagar.","Subir a pegada acima do peito ou encolher os ombros demais.");
  G("Rosca direta","Em pé, cotovelos colados ao tronco, pegada supinada na largura dos ombros.","Flexione os cotovelos levando a barra até a altura do peito e desça devagar até estender quase por completo.","Balançar o tronco ou tirar os cotovelos do lugar.");
  G("Rosca alternada com halteres","Em pé ou sentado, halteres ao lado do corpo, cotovelos fixos.","Flexione um braço de cada vez girando a palma para cima ao subir; desça controlado antes de trocar.","Usar impulso do corpo ou girar os punhos de forma brusca.");
  G("Rosca no cabo","Polia baixa com barra ou corda, cotovelos junto ao corpo.","Flexione os cotovelos até a contração máxima e desça devagar mantendo tensão no cabo.","Inclinar o tronco para trás ou afastar os cotovelos.");
  G("Agachamento livre","Pés na largura dos ombros (pontas levemente abertas), barra apoiada no trapézio, abdômen firme.","Desça levando o quadril para trás e para baixo com os joelhos na direção dos pés, até pelo menos paralelo; suba empurrando o chão.","Joelhos caindo para dentro, calcanhares saindo do chão ou arredondar a lombar no fundo.");
  G("Agachamento na smith","Pés um pouco à frente da barra, barra no trapézio, costas retas.","Desça controlado até a profundidade confortável e suba empurrando os calcanhares.","Colocar os pés muito para trás, sobrecarregando joelhos e lombar.");
  G("Agachamento livre (mais séries)","Mesma posição do agachamento livre: pés na largura dos ombros, barra no trapézio, abdômen firme.","Faça mais séries com carga moderada e técnica limpa; desça até pelo menos paralelo e suba com controle.","Aumentar a carga e perder a profundidade ou a postura ao longo das séries.");
  G("Leg press","Costas e quadril totalmente apoiados, pés na largura dos ombros no meio da plataforma.","Desça até os joelhos formarem ~90° (sem o quadril descolar) e empurre sem travar os joelhos no topo.","Tirar o quadril do encosto, travar os joelhos ou descer só um pedaço.");
  G("Leg press (pés baixos)","Pés na parte mais baixa da plataforma, na largura dos ombros, costas apoiadas.","Desça com os joelhos à frente dos pés até ~90° e empurre sem travar; ênfase no quadríceps.","Calcanhares saindo da plataforma ou joelhos entrando.");
  G("Leg press (unilateral)","Um pé no centro da plataforma, o outro relaxado; quadril nivelado e apoiado.","Desça e suba com uma perna só, mantendo o joelho alinhado ao pé; troque de lado.","Deixar o quadril girar ou o joelho cair para dentro.");
  G("Hack squat","Costas no encosto, ombros sob os apoios, pés na largura dos ombros na plataforma.","Desça flexionando joelhos e quadril até ~90° ou mais e suba empurrando a plataforma sem travar os joelhos.","Descolar calcanhares ou o quadril do encosto.");
  G("Cadeira extensora","Ajuste o encosto para o joelho alinhar com o eixo; apoio do tornozelo logo acima do pé.","Estenda os joelhos até quase travar, segure 1 segundo e desça controlado.","Dar tranco na subida ou levantar o quadril do banco.");
  G("Mesa flexora","Deitado de bruços, joelhos alinhados com o eixo, apoio logo acima dos calcanhares.","Flexione os joelhos levando os calcanhares em direção ao glúteo e desça devagar.","Levantar o quadril ou usar impulso.");
  G("Flexora em pé","Em pé apoiado na máquina, joelho alinhado com o eixo, quadril estável.","Flexione um joelho levando o calcanhar em direção ao glúteo e volte controlado; troque de perna.","Inclinar o tronco ou balançar o corpo.");
  G("Elevação de panturrilha em pé","Ponta dos pés na borda do degrau/aparelho, joelhos quase estendidos, calcanhares livres.","Suba o máximo que conseguir, segure 1 segundo no topo e desça até alongar bem a panturrilha.","Fazer movimentos curtos e rápidos, sem amplitude completa.");
  G("Elevação de panturrilha sentado","Joelhos a 90° sob o apoio, pontas dos pés na plataforma.","Suba nos dedos, segure 1 segundo e desça alongando bem os calcanhares.","Quicar no fundo do movimento sem controle.");
  G("Panturrilha no leg press","Sentado no leg press, apenas a ponta dos pés na plataforma, joelhos estendidos (sem travar).","Empurre a plataforma apenas com os tornozelos até o topo e volte alongando a panturrilha.","Flexionar os joelhos durante o movimento.");
  G("Prancha","Antebraços no chão com cotovelos sob os ombros, corpo em linha reta da cabeça aos calcanhares.","Contraia abdômen e glúteos e mantenha a posição respirando normalmente.","Deixar o quadril cair ou subir demais, ou prender a respiração.");
  G("Abdominal supra (crunch)","Deitado, joelhos flexionados, mãos ao lado da cabeça (sem puxar o pescoço).","Eleve só a parte superior das costas, contraindo o abdômen; desça devagar sem relaxar totalmente.","Puxar o pescoço com as mãos ou subir o tronco inteiro.");
  G("Elevação de pernas","Deitado (ou pendurado), lombar colada ao chão, pernas estendidas ou levemente flexionadas.","Eleve as pernas até ~90° controlando a descida sem deixar a lombar arquear.","Usar impulso ou deixar a lombar sair do chão.");
  G("Crucifixo (voador)","Banco reto, halteres acima do peito com cotovelos levemente flexionados.","Abra os braços em arco até sentir o peito alongar e feche voltando ao ponto inicial, sem alterar a flexão dos cotovelos.","Descer demais (sobrecarga no ombro) ou transformar em supino dobrando os cotovelos.");
  G("Crucifixo no cabo (cross-over)","Polias altas, um passo à frente, tronco levemente inclinado, cotovelos levemente flexionados.","Traga as mãos em arco até se encontrarem à frente do peito e volte devagar mantendo tensão.","Balançar o tronco ou dobrar os cotovelos a cada repetição.");
  G("Voador na máquina (peck deck)","Ajuste o assento para os cotovelos ficarem na altura do peito; costas apoiadas.","Feche os braços contraindo o peito e volte devagar sem deixar a pilha de pesos descansar.","Subir os ombros ou usar impulso.");
  G("Hip thrust","Costas altas apoiadas no banco, pés no chão na largura do quadril, barra sobre o quadril (use almofada).","Empurre o chão e estenda o quadril até o tronco ficar alinhado com as coxas, contraindo os glúteos; desça controlado.","Hiperestender a lombar no topo ou empurrar com a ponta dos pés.");
  G("Ponte de glúteo","Deitado de costas, joelhos flexionados, pés no chão na largura do quadril.","Eleve o quadril contraindo os glúteos até alinhar ombros, quadril e joelhos; desça devagar.","Arquear demais a lombar ou empurrar com a ponta dos pés.");
  G("Ponte de glúteo unilateral","Deitado, uma perna estendida no ar e o pé da outra no chão.","Eleve o quadril empurrando o pé de apoio, mantendo o quadril nivelado; desça controlado e troque de lado.","Deixar o quadril girar ou cair para um lado.");
  G("Cadeira abdutora","Sentado com as costas apoiadas, joelhos por dentro dos apoios.","Abra as pernas até a amplitude confortável e retorne devagar sem deixar os pesos encostarem.","Balançar o tronco ou usar impulso.");
  G("Avanço (afundo) com halteres","Em pé com um halter em cada mão, tronco ereto, passo longo à frente.","Desça até ambos os joelhos formarem ~90° e suba empurrando o pé da frente; alterne as pernas.","Joelho da frente passando muito dos pés ou tronco inclinado demais.");
  G("Agachamento búlgaro","Pé de trás apoiado em um banco, pé da frente a um passo e meio; tronco ereto.","Desça flexionando o joelho da frente até a coxa ficar próxima do paralelo e suba empurrando o calcanhar.","Pé da frente muito perto do banco ou joelho entrando.");
  G("Flexora sentada","Sentado com o encosto ajustado, joelhos alinhados ao eixo da máquina e a almofada logo acima do calcanhar.","Flexione os joelhos levando os calcanhares em direção ao glúteo e volte devagar, controlando a subida da carga.","Tirar o quadril do assento ou usar impulso.");
  G("Rosca inclinada com halteres (45°)","Banco inclinado a ~45°, costas apoiadas, braços soltos para trás do tronco e halteres com a palma para frente.","Flexione os cotovelos sem levar os ombros à frente e desça até quase estender, sentindo o bíceps alongar.","Jogar os ombros à frente ou balançar o tronco.");
  G("Abdominal na máquina","Sentado com o eixo da máquina na altura do abdômen, pés firmes e mãos na pegada.","Enrole o tronco aproximando as costelas do quadril e volte devagar, sem deixar a pilha de pesos descansar.","Puxar com os braços ou usar impulso do quadril.");
  G("Remada sentada pronada (pegada aberta)","Sentado com o tronco firme (ou o peito apoiado), pegada pronada um pouco mais aberta que os ombros.","Leve os cotovelos para trás e para os lados, juntando as escápulas no final, e volte com controle.","Balançar o tronco ou encolher os ombros.");
  G("Agachamento goblet (com halter)","Em pé, pés um pouco mais abertos que os ombros, halter segurado junto ao peito com as duas mãos.","Desça flexionando joelhos e quadril, com o tronco ereto e os joelhos acompanhando os pés, e suba empurrando o chão.","Deixar os joelhos caírem para dentro ou o halter se afastar do peito.");
  G("Remada curvada com halteres","Em pé, joelhos levemente flexionados, tronco inclinado com a coluna reta, um halter em cada mão.","Puxe os halteres em direção ao quadril levando os cotovelos para trás e desça controlando.","Arredondar as costas ou usar impulso do corpo.");
  G("Remada com elástico","Sentado ou em pé, elástico preso à frente na altura do peito, braços estendidos.","Puxe levando os cotovelos para trás, aproximando as escápulas, e volte devagar.","Subir os ombros ou inclinar o tronco para trás.");
  G("Remada com elástico (unilateral)","Elástico preso à frente na altura do peito; uma mão puxa de cada vez, tronco firme.","Puxe o cotovelo para trás junto ao corpo e volte controlando; troque de lado.","Girar o tronco para ajudar na puxada.");
  G("Puxada com elástico","Elástico preso no alto (porta ou barra firme), sentado ou ajoelhado, braços estendidos acima da cabeça.","Puxe o elástico em direção ao peito levando os cotovelos para baixo e volte devagar.","Puxar com as mãos e esquecer dos cotovelos, ou arquear a lombar.");
  G("Agachamento com peso do corpo","Pés na largura dos ombros, pontas levemente para fora, braços à frente para equilíbrio.","Desça até onde mantiver o tronco firme e os calcanhares no chão, e suba empurrando o chão.","Tirar os calcanhares do chão ou deixar os joelhos irem para dentro.");
  G("Flexão de braço","Mãos um pouco mais abertas que os ombros, corpo em linha reta da cabeça aos calcanhares (pode apoiar os joelhos ou as mãos em um banco).","Desça o peito em direção ao chão com cotovelos a ~45° do tronco e empurre até estender os braços.","Deixar o quadril cair ou abrir demais os cotovelos.");
  G("Flexão com pés elevados","Pés sobre um banco ou degrau, mãos no chão um pouco mais abertas que os ombros, corpo em linha reta.","Desça o peito controlando e empurre até estender os braços.","Deixar o quadril cair ou elevar demais os pés no começo.");
  G("Flexão pike (quadril alto)","Em posição de V invertido: quadril alto, mãos no chão na largura dos ombros, pés afastados.","Flexione os cotovelos levando a cabeça em direção ao chão entre as mãos e empurre de volta.","Dobrar os joelhos demais ou apoiar o peso só nas costas.");
  G("Rosca com elástico","Em pé sobre o elástico, mãos segurando a outra ponta com as palmas para frente.","Flexione os cotovelos trazendo as mãos aos ombros e desça devagar.","Balançar o tronco ou afastar os cotovelos do corpo.");
  G("Elevação lateral com elástico","Em pé sobre o elástico, mãos ao lado do corpo.","Eleve os braços de lado até a altura dos ombros, cotovelos levemente flexionados, e desça devagar.","Subir os ombros em direção às orelhas ou usar impulso.");
  G("Elevação de panturrilha em degrau","Ponta dos pés em um degrau, calcanhares no ar, mão apoiada na parede para equilíbrio.","Suba o máximo que conseguir, pause em cima e desça até alongar a panturrilha.","Fazer rápido, sem amplitude.");
  G("Stiff unilateral sem peso","Em pé numa perna, joelho levemente flexionado, mão livre à frente para equilíbrio.","Incline o tronco empurrando o quadril para trás e a outra perna para o ar, coluna reta, e volte contraindo o glúteo.","Arredondar as costas ou girar o quadril.");
  G("Stiff unilateral com halter","Em pé numa perna, halter na mão oposta à perna de apoio, joelho levemente flexionado.","Empurre o quadril para trás, incline o tronco com a coluna reta e volte contraindo o glúteo.","Arredondar as costas ou girar o quadril.");
  G("Avanço (afundo) com peso do corpo","Em pé, mãos na cintura, tronco ereto, passo longo à frente.","Desça até ambos os joelhos formarem ~90° e suba empurrando o pé da frente.","Joelho da frente passar muito dos pés ou inclinar o tronco.");
  G("Mergulho (dips) no banco","Mãos apoiadas na borda de um banco firme, pernas à frente (joelhos flexionados é mais fácil), quadril perto do banco.","Flexione os cotovelos descendo o quadril até ~90° e empurre de volta sem travar.","Afastar o quadril do banco ou descer além do conforto do ombro.");
  G("Crucifixo invertido com halteres","Em pé, tronco inclinado com a coluna reta, halteres pendurados à frente, cotovelos levemente flexionados.","Abra os braços para os lados até a altura dos ombros, apertando as escápulas, e desça devagar.","Usar peso demais e puxar com impulso.");
  G("Crucifixo invertido com elástico","Elástico preso à frente na altura do peito, braços estendidos, uma mão em cada ponta.","Abra os braços para os lados, apertando as escápulas, e volte devagar.","Subir os ombros ou arquear a lombar.");
  G("Crucifixo com halteres","Deitado no banco (ou no chão), halteres acima do peito, cotovelos levemente flexionados.","Abra os braços em arco até sentir o peito alongar e feche trazendo os halteres juntos.","Descer demais, forçando o ombro, ou transformar em supino.");
  G("Crucifixo com elástico","Em pé de costas para o ponto de fixação do elástico, braços abertos na altura do peito.","Feche os braços à frente em arco, cotovelos levemente flexionados, e volte devagar.","Dar um passo à frente e perder a postura.");
  G("Abdução de quadril com elástico","Elástico logo acima dos joelhos, em pé ou deitado de lado.","Afaste a perna para o lado sem girar o quadril e volte devagar.","Inclinar o tronco ou usar impulso.");
  G("Hip thrust com halter","Costas altas apoiadas em um banco, pés no chão na largura do quadril, halter apoiado sobre o quadril (use uma toalha).","Empurre o chão e estenda o quadril contraindo os glúteos, pausando em cima, e desça controlando.","Arquear a lombar no topo ou empurrar com os dedos dos pés.");
})();
function guiaCorpoHtml(nome){
  const g = EXERCISE_GUIDE[nome]; if(!g) return '';
  const dica = EXERCISE_TREINADOR[nome];
  return '<div class="qc-guide-body">'+
      '<p><b>Posição</b>'+escapeHtml(g.p)+'</p>'+
      '<p><b>Movimento</b>'+escapeHtml(g.e)+'</p>'+
      '<p><b>Evite</b>'+escapeHtml(g.c)+'</p>'+
      (dica ? '<p class="qc-trein"><b>Dica de treinador</b>'+escapeHtml(dica)+'</p>' : '')+
    '</div>';
}
function guiaExecucaoHtml(nome, cls){
  if(!EXERCISE_GUIDE[nome]) return '';
  return '<details class="qc-guide '+(cls||'')+'"><summary>Como executar</summary>'+guiaCorpoHtml(nome)+'</details>';
}

/* ============================================================
   TROCA DE EXERCÍCIO NO DIA — toque numa variação e o exercício de
   hoje muda só nessa sessão (a rotina continua igual). A troca fica
   salva no check-in do dia (trocas[índice] = nome), então carga e
   histórico passam a valer para o exercício novo.
   ============================================================ */
function exTrocado(iso, idx){
  const c = state.checkins[iso];
  return (c && c.trocas && c.trocas[idx]) || null;
}
function exDoDia(ex, iso, idx){
  const t = exTrocado(iso, idx);
  return t ? Object.assign({}, ex, {nome:t, original:ex.nome, trocado:true, nota:""})
           : Object.assign({}, ex, {original:ex.nome, trocado:false});
}
function alternativasDoDia(ex){
  if(ex.trocado){
    return [ex.original].concat((EXERCISE_ALTERNATIVES[ex.original]||[]).filter(a=>a!==ex.nome));
  }
  if(EXERCISE_ALTERNATIVES[ex.nome]) return EXERCISE_ALTERNATIVES[ex.nome];
  // v79: exercício que entrou na rotina como alternativa (ex.: Terra sumô) ainda oferece o original e as irmãs
  for(const k of Object.keys(EXERCISE_ALTERNATIVES)){
    const l = EXERCISE_ALTERNATIVES[k];
    if(l.indexOf(ex.nome) >= 0) return [k].concat(l.filter(a=> a !== ex.nome));
  }
  return [];
}
function saveTroca(iso, idx, nome){
  const cur = state.checkins[iso] || {};
  const trocas = Object.assign({}, cur.trocas);
  if(nome==null) delete trocas[idx]; else trocas[idx] = nome;
  const data = Object.assign({}, cur, {data:iso, dia:treinoKey(iso), trocas});
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
}
/* Onde você treina (Config): adapta a SEMANA INTEIRA de uma vez. Troca, em todos os dias da rotina, os exercícios que têm
   equivalente sem academia (mesma tabela do plano inicial: SUBST_LOCAL). É como trocar o "cardápio" da semana: o que tem versão
   muda, o que não tem (prancha, abdominal) fica. Guardamos os exercícios originais em config/settings.localTreino para
   "Academia" desfazer tudo — sem apagar o que você editou depois (só volta o que ainda é a troca). */
const LOCAL_TREINO_NOMES = {academia:"Academia", casa:"Em casa", pouco:"Pouco equipamento"};
function localTreinoAtual(){
  const l = state.settings && state.settings.localTreino;
  return l && SUBST_LOCAL[l.modo] ? l : null;   // null = rotina original (academia)
}
function adaptarSemanaLocal(rotinaBase, modo){
  const tab = SUBST_LOCAL[modo];
  const rotina = {}, originais = {};
  let trocados = 0, total = 0;
  DAYS.forEach(k=>{
    const d = rotinaBase[k];
    if(!d){ return; }
    const exs = d.exercicios || [];
    total += exs.length;
    const nomes = new Set(exs.map(e=> e.nome));
    const bk = [];
    const novos = exs.map((e, i)=>{
      const sub = tab[e.nome];
      if(!sub || sub[0] === e.nome || nomes.has(sub[0])) return e;   // sem versão, ou já existe o mesmo exercício no dia
      nomes.add(sub[0]);
      const ne = Object.assign({}, e, {nome: sub[0]});
      if(sub[1]) ne.reps = sub[1];
      delete ne.nota;
      ne.metaReps = metaRepsDe(ne.series, ne.reps, e.metaReps);
      bk.push({i, de:e.nome, para:ne.nome, reps:e.reps == null ? null : e.reps, nota:e.nota == null ? null : e.nota, metaReps:e.metaReps == null ? null : e.metaReps, repsNovo:ne.reps, metaNovo:ne.metaReps});
      trocados++;
      return ne;
    });
    if(bk.length){ originais[k] = bk; rotina[k] = Object.assign({}, d, {exercicios: novos}); } else rotina[k] = d;
  });
  return {rotina, originais, trocados, total};
}
function restaurarSemanaLocal(rotinaAtual, originais){
  const rotina = {};
  let restaurados = 0;
  DAYS.forEach(k=>{
    const d = rotinaAtual[k];
    if(!d){ return; }
    const bk = (originais && originais[k]) || [];
    if(!bk.length){ rotina[k] = d; return; }
    const exs = (d.exercicios || []).slice();
    bk.forEach(o=>{
      let j = exs[o.i] && exs[o.i].nome === o.para ? o.i : exs.findIndex(e=> e.nome === o.para);
      if(j < 0) return;   // você mudou esse exercício depois: respeitamos a sua edição
      const ex = exs[j], ne = Object.assign({}, ex, {nome: o.de});
      if(o.nota == null) delete ne.nota; else ne.nota = o.nota;
      if(ex.reps === o.repsNovo){ if(o.reps != null) ne.reps = o.reps; if(ex.metaReps === o.metaNovo && o.metaReps != null) ne.metaReps = o.metaReps; }
      exs[j] = ne;
      restaurados++;
    });
    rotina[k] = Object.assign({}, d, {exercicios: exs});
  });
  return {rotina, restaurados};
}
function aplicarLocalTreino(modo){
  if(!LOCAL_TREINO_NOMES[modo]) return;
  const atual = localTreinoAtual();
  if(modo === (atual ? atual.modo : "academia")) return;
  const jobs = [];
  if(state.perfil){   // mantém o cadastro em sintonia (o plano exemplo e o "Onde você treina" do Perfil seguem esta escolha)
    state.perfil = Object.assign({}, state.perfil, {local: modo});
    jobs.push(saveDoc("config/perfil", state.perfil));
  }
  if(state.rotinaIsExample){   // ainda não há rotina salva: o plano de exemplo já nasce do local escolhido
    ajustarRotinaExemplo();
    render();
    showToast("Pronto: o plano de exemplo já usa "+LOCAL_TREINO_NOMES[modo].toLowerCase()+".");
    return;
  }
  let base = {}, restaurados = 0;
  DAYS.forEach(k=>{ base[k] = state.rotina[k]; });
  if(atual){ const r = restaurarSemanaLocal(base, atual.originais); base = r.rotina; restaurados = r.restaurados; }
  let res = {rotina: base, originais: null, trocados: 0, total: 0};
  if(modo !== "academia") res = adaptarSemanaLocal(base, modo);
  DAYS.forEach(k=>{
    if(res.rotina[k] && res.rotina[k] !== state.rotina[k]){ state.rotina[k] = res.rotina[k]; jobs.push(saveDoc("rotina/"+k, res.rotina[k])); }
  });
  state.settings = Object.assign({}, state.settings, {localTreino: modo === "academia" ? null : {modo, aplicadoEm: todayISO(), originais: res.originais, trocados: res.trocados, total: res.total}});
  jobs.push(saveDoc("config/settings", state.settings));
  hapticPulse(12);
  playSound("tick");
  render();
  if(modo === "academia") showToast("Semana de volta à academia: "+restaurados+" exercício"+(restaurados===1?"":"s")+" original"+(restaurados===1?"":"is")+" restaurado"+(restaurados===1?"":"s")+".");
  else showToast("Semana adaptada para "+LOCAL_TREINO_NOMES[modo].toLowerCase()+": "+res.trocados+" de "+res.total+" exercício"+(res.total===1?"":"s")+" trocado"+(res.trocados===1?"":"s")+"."+(res.trocados < res.total ? " Os outros seguem iguais." : ""));
  return Promise.all(jobs);
}
async function tornarTrocaPermanente(iso, idx, after){
  const key = treinoKey(iso);
  const day = state.rotina[key];
  const novo = exTrocado(iso, idx);
  if(!day || !novo || !(day.exercicios||[])[idx]) return;
  const velho = day.exercicios[idx].nome;
  const exs = day.exercicios.map((e,j)=> j===idx ? Object.assign({}, e, {nome:novo, nota:""}) : e);
  const jobs = [];
  state.rotina[key] = Object.assign({}, day, {exercicios:exs});
  jobs.push(saveDoc("rotina/"+key, state.rotina[key]));
  if(state.rotinaIsExample){
    DAYS.forEach(k=>{ if(k!==key && state.rotina[k]) jobs.push(saveDoc("rotina/"+k, state.rotina[k])); });
    state.rotinaIsExample = false;
  }
  saveTroca(iso, idx, null);   // a troca de hoje vira o próprio exercício da rotina
  hapticPulse(12);
  playSound("tick");
  render();
  if(after) after();
  await Promise.all(jobs);
  showToast("Rotina atualizada: "+velho+" → "+novo+".");
}
function permBtnHtml(idx, ex){
  return ex.trocado ? '<div class="qc-perm-row"><button type="button" class="btn small ghost qc-perm" data-qperm="'+idx+'" title="Usar '+escapeHtml(ex.nome)+' no lugar de '+escapeHtml(ex.original)+' em todas as semanas">'+ICON_PIN+'Tornar permanente na rotina</button></div>' : '';
}
function altChipsHtml(alts, idx, ex){
  return alts.map(a=>{
    const volta = ex.trocado && a===ex.original;
    return '<button type="button" class="qc-swap'+(volta?' back':'')+'" data-qswap="'+idx+'" data-qalt="'+escapeHtml(a)+'" title="'+(volta?'Voltar para ':'Trocar hoje por ')+escapeHtml(a)+'">'+(volta?'↩ ':'')+escapeHtml(a)+'</button>';
  }).join("");
}

/* ============================================================
   PROGRESSÃO SUGERIDA — usa o RPE/RIR da última sessão registrada
   pra sugerir se sobe, mantém ou reduz a carga na próxima vez.
   Melhor esforço: localiza o índice do exercício no dia em que foi
   registrado (mesma limitação que "progresso", que já é por índice).
   ============================================================ */
/* v95 (T1): RPE 8–9 (1–2 repetições na reserva) é a zona boa de hipertrofia — não pede redução.
   Sobe com RPE ≤ 7; mantém com 8 e 9 (busque mais repetições); só reduz após RPE 10 duas sessões seguidas.
   O app registra o total de repetições (não por série), então a regra usa o esforço (RPE), não a dupla progressão. */
function rpeDoExercicio(exNome, iso){
  const c = state.checkins[iso];
  if(!c || !c.rpe) return null;
  const day = state.rotina[treinoKey(iso)];
  const exs = (day && day.exercicios) || [];
  let idx = -1;
  exs.forEach((e,i)=>{ const n = (c.trocas && c.trocas[i]) || e.nome; if(idx < 0 && n === exNome) idx = i; });
  return (idx >= 0 && c.rpe[idx] != null) ? Number(c.rpe[idx]) : null;
}
/* registro do exercício num dia: séries reais (só as lançadas série a série), faixa de repetições e RPE */
function registroDoExercicio(exNome, iso){
  const c = state.checkins[iso];
  if(!c) return null;
  const day = state.rotina[treinoKey(iso)];
  const exs = (day && day.exercicios) || [];
  let idx = -1, ex = null;
  exs.forEach((e,i)=>{ if(idx >= 0) return; const x = exDoDia(e, iso, i); if(x.nome === exNome){ idx = i; ex = x; } });
  if(idx < 0) return null;
  const reais = (c.sets && Array.isArray(c.sets[idx])) ? c.sets[idx].map(s=> Number(s && s.r)||0).filter(r=> r > 0) : [];
  const e = estadoEx(c, idx, ex);
  return {idx, ex, sets: reais, completo: e.status === "ok" && reais.length >= e.prev, faixa: faixaDeReps(ex.reps),
          rpe: (c.rpe && c.rpe[idx] != null) ? Number(c.rpe[idx]) : null};
}
/* NG+ · Treino Fase 2 — dupla progressão: primeiro sobe as repetições até o topo da faixa em todas as séries, depois sobe a carga.
   O RPE ajusta a decisão, mas não é obrigatório. Sem séries lançadas (check-in antigo), cai na regra antiga baseada só no RPE. */
function sugestaoProgressao(exNome){
  const hist = getCargaHistory(exNome);
  if(!hist.length) return null;
  const last = hist[hist.length-1];
  const step = cargaStepFor(exNome);
  const rec = registroDoExercicio(exNome, last.iso);
  const rpe = rec ? rec.rpe : rpeDoExercicio(exNome, last.iso);
  const prevHist = hist.length > 1 ? hist[hist.length-2] : null;
  const prevRec = prevHist ? registroDoExercicio(exNome, prevHist.iso) : null;
  const prevRpe = prevHist ? (prevRec ? prevRec.rpe : rpeDoExercicio(exNome, prevHist.iso)) : null;
  const usaSeries = !!(rec && rec.completo && rec.faixa.max && rec.faixa.unid === "reps");
  const out = (delta, acao, texto, base)=> ({sugerido: Math.max(0, last.peso + delta), texto, acao, rpe, base});
  if(usaSeries){
    const f = rec.faixa, r = rec.sets;
    const topoTodas = r.every(x=> x >= f.max);
    const abaixo = r.some(x=> x < f.min);
    const prevAbaixo = !!(prevRec && prevRec.completo && prevRec.faixa.max && prevRec.sets.some(x=> x < prevRec.faixa.min));
    const lista = r.join(", ");
    if(rpe != null && rpe <= 7) return out(step, "subir", "RPE "+rpe+" na última vez ("+lista+" reps) — sobrou fôlego, tente subir a carga", "series");
    if(topoTodas && (rpe == null || rpe <= 8)) return out(step, "subir", "você chegou ao topo da faixa ("+f.max+" reps) em todas as séries ("+lista+") — hora de subir a carga e recomeçar em "+f.min+" reps", "series");
    if(topoTodas) return out(0, "manter", "topo da faixa em todas as séries, mas com esforço alto (RPE "+rpe+") — mantenha a carga mais uma vez e suba quando ficar mais folgado", "series");
    if(rpe === 10 && prevRpe === 10) return out(-step, "reduzir", "RPE 10 duas vezes seguidas — reduza um degrau e deixe 1–2 repetições na reserva", "series");
    if(abaixo){
      if(prevAbaixo && rpe != null && rpe >= 9) return out(-step, "reduzir", "alguma série ficou abaixo de "+f.min+" reps duas sessões seguidas, com esforço alto — reduza um degrau e reconstrua as repetições", "series");
      return out(0, "manter", "alguma série ficou abaixo de "+f.min+" reps ("+lista+") — mantenha a carga e busque chegar a "+f.min+" em todas", "series");
    }
    return out(0, "manter", "séries na faixa ("+lista+") — mantenha a carga e tente +1 repetição em alguma série; ao chegar a "+f.max+" em todas, suba", "series");
  }
  if(rpe == null) return null;
  const prev = prevRpe;
  let delta = 0, texto, acao = "manter";
  if(rpe <= 7){ delta = step; acao = "subir"; texto = "RPE "+rpe+" na última vez — sobrou fôlego, tente subir"; }
  else if(rpe === 8){ texto = "RPE 8 na última vez — zona boa (1–2 repetições na reserva): mantenha e tente mais uma repetição"; }
  else if(rpe === 9){ texto = "RPE 9 na última vez — também é zona boa: mantenha e busque o topo da faixa de repetições"; }
  else if(prev === 10){ delta = -step; acao = "reduzir"; texto = "RPE 10 duas vezes seguidas — reduza um degrau e deixe 1–2 repetições na reserva"; }
  else { texto = "RPE 10 (até a falha) na última vez — mantenha e, na próxima, pare com 1–2 repetições na reserva"; }
  return {sugerido: Math.max(0, last.peso + delta), texto, acao, rpe, base:"rpe"};
}

/* ============================================================
   ANÁLISE DO TREINO (NG+ · Treino Fase 3) — regras locais, sem IA.
   Por exercício: olha as últimas 4 sessões e diz se está progredindo, estável ou estagnado; cruza com RPE e volume semanal.
   Iniciantes e menores de 18 anos não veem 1RM estimado: veem repetições na mesma carga e séries concluídas.
   ============================================================ */
const ANALISE_JANELA = 4;
function sessoesDoExercicio(nome, ateISO){
  const out = [];
  Object.keys(state.checkins).sort().forEach(iso=>{
    if(ateISO && iso > ateISO) return;
    const c = state.checkins[iso]; if(!c) return;
    const day = state.rotina[c.dia || treinoKey(iso)];
    const exs = (day && day.exercicios) || [];
    let idx = -1, ex = null;
    exs.forEach((e,i)=>{ if(idx >= 0) return; const x = exDoDia(e, iso, i); if(x.nome === nome){ idx = i; ex = x; } });
    if(idx < 0) return;
    const est = estadoEx(c, idx, ex);
    if(est.status === "pulado" || !est.n) return;
    const sets = est.sets.map(x=> x.r);
    out.push({iso, idx, peso: (c.cargas && c.cargas[nome] != null) ? Number(c.cargas[nome]) : null,
      sets, total: sets.reduce((a,b)=> a+b, 0), n: sets.length, prev: est.prev, completo: est.status === "ok",
      real: !!(c.sets && Array.isArray(c.sets[idx])), rpe: (c.rpe && c.rpe[idx] != null) ? Number(c.rpe[idx]) : null,
      unid: faixaDeReps(ex.reps).unid, musculos: ex.musculos || []});
  });
  return out;
}
/* 1 = a é melhor que b; -1 = pior; 0 = igual. Mais carga vale mais; na mesma carga, mais repetições no total. */
function cmpSessao(a, b){
  const pa = a.peso || 0, pb = b.peso || 0;
  if(Math.abs(pa - pb) >= 0.01) return pa > pb ? 1 : -1;
  const d = a.total - b.total;
  return Math.abs(d) >= 1 ? (d > 0 ? 1 : -1) : 0;
}
function classificarExercicio(sess){
  const w = sess.slice(-ANALISE_JANELA);
  if(w.length < 2) return {estado:"sem-dados", w, ups:0, downs:0, last:0};
  const t = []; for(let k=1; k<w.length; k++) t.push(cmpSessao(w[k], w[k-1]));
  const ups = t.filter(x=> x > 0).length, downs = t.filter(x=> x < 0).length, last = t[t.length-1];
  let estado;
  if(w.length === 2) estado = last > 0 ? "progredindo" : "estavel";
  else if(last > 0) estado = "progredindo";
  else if(ups === 0) estado = "estagnado";
  else estado = "estavel";
  return {estado, w, ups, downs, last};
}
function descMudanca(a, b){
  if(Math.abs((a.peso||0) - (b.peso||0)) >= 0.01) return "carga de "+fmtKg(b.peso||0)+" → "+fmtKg(a.peso||0)+" kg";
  const d = a.total - b.total, ad = Math.abs(d);
  const un = a.unid === "s" ? " s" : (ad === 1 ? " repetição" : " repetições");
  return (d > 0 ? "+" : "−")+ad+un+(a.unid==="s" ? "" : " no total")+(a.peso ? " com "+fmtKg(a.peso)+" kg" : "")+" ("+b.total+" → "+a.total+")";
}
function semanaRealizadaPorMusculo(mondayISO){
  const tot = {}; MUSCLE_ORDER.forEach(m=> tot[m] = 0);
  for(let k=0; k<7; k++){
    const iso = addDaysISO(mondayISO, k), c = state.checkins[iso]; if(!c) continue;
    const day = state.rotina[c.dia || treinoKey(iso)]; const exs = (day && day.exercicios) || [];
    exs.forEach((e,i)=>{
      const x = exDoDia(e, iso, i), est = estadoEx(c, i, x);
      if(est.status === "pulado") return;
      const n = est.n || ((c.concluido && !(c.sets || c.status)) ? est.prev : 0);   // check-in rápido sem séries: conta as séries previstas
      (x.musculos || []).forEach(m=>{ if(tot[m] != null) tot[m] += n; });
    });
  }
  return tot;
}
function analiseExercicio(nome, musculos, totaisPlan){
  const sess = sessoesDoExercicio(nome), cls = classificarExercicio(sess);
  const adulto = !menorDeIdade((state.perfil||{}).idade) && (state.perfil||{}).experiencia !== "iniciante";
  const last = sess[sess.length-1], prev = sess[sess.length-2];
  const linhas = [];
  let resumo = "";
  if(cls.estado === "sem-dados"){
    resumo = sess.length ? "Só 1 sessão registrada — com a próxima já dá para comparar." : "Ainda sem registros.";
  } else if(cls.estado === "progredindo"){
    resumo = "Melhorou desde a última vez: "+descMudanca(last, prev)+".";
  } else if(cls.estado === "estavel"){
    resumo = cls.last < 0 ? "Oscilou para baixo na última sessão ("+descMudanca(last, prev)+") — um dia ruim ou uma semana de deload explicam isso." : "Mesmos números nas últimas sessões. Normal: progressão não é linear.";
  } else {
    resumo = cls.w.length+" sessões seguidas sem melhora.";
    const rpes = cls.w.map(x=> x.rpe).filter(x=> x != null);
    const altos = rpes.filter(x=> x >= 9).length;
    if(rpes.length && altos >= 2) linhas.push("O esforço já está alto (RPE 9–10 em "+altos+" sessões): pode faltar recuperação — sono, alimentação ou uma semana de deload.");
    else linhas.push("O esforço não está no limite: tente +1 repetição por série ou subir a carga um degrau (dupla progressão).");
    const ms = (musculos||[]).filter(m=> MUSCLE_LANDMARKS[m]);
    ms.forEach(m=>{
      const lm = MUSCLE_LANDMARKS[m], v = totaisPlan[m] || 0;
      if(lm.mev && v > 0 && v < lm.mev) linhas.push("O volume planejado de "+lm.label.toLowerCase()+" ("+v+" séries/semana) está abaixo do mínimo "+lm.mev+": pode ser pouco estímulo.");
      else if(v > lm.mrv) linhas.push("O volume planejado de "+lm.label.toLowerCase()+" ("+v+" séries/semana) está acima do teto "+lm.mrv+": pode ser excesso para recuperar.");
    });
    linhas.push("Se a última semana foi deload, ignore este alerta.");
  }
  // tendência de força: só adulto não iniciante, ≥3 sessões com séries reais e carga
  let tendencia = "";
  if(adulto){
    const e1 = sess.filter(x=> x.real && x.peso > 0 && x.unid === "reps").map(x=>{
      const m = Math.max.apply(null, x.sets.filter(r=> r > 0 && r <= 12).map(r=> x.peso * (1 + r/30)).concat([0])); return m > 0 ? {iso:x.iso, v:m} : null; }).filter(Boolean);
    if(e1.length >= 3){
      const a = e1[0].v, b = e1[e1.length-1].v, pct = (b - a) / a * 100;
      tendencia = "Força estimada (1RM, fórmula de Epley): "+fmtKg(Math.round(a*2)/2)+" → "+fmtKg(Math.round(b*2)/2)+" kg ("+(pct >= 0 ? "+" : "−")+Math.abs(pct).toFixed(1).replace(".", ",")+"%). É uma estimativa, não um teste de carga máxima.";
    }
  } else if(last){
    const mesma = sess.filter(x=> x.peso === last.peso).slice(-4);
    if(mesma.length >= 2) linhas.push("Repetições na mesma carga ("+fmtKg(last.peso||0)+" kg): "+mesma.map(x=> x.total).join(" → ")+" no total.");
    linhas.push("Séries concluídas na última sessão: "+last.n+" de "+last.prev+".");
  }
  return {nome, cls, sess, resumo, linhas, tendencia};
}
const ANALISE_ESTADO = {
  progredindo:{t:"↑ Progredindo", c:"good"}, estavel:{t:"→ Estável", c:"info"}, estagnado:{t:"⚠ Estagnado", c:"warn"}, "sem-dados":{t:"… Sem dados", c:"neutral"}
};
/* Análise do treino: os selos de resumo viram filtros. Só aparece o grupo escolhido (padrão: o que pede atenção primeiro) —
   "Todos" mostra tudo. Cada exercício vem fechado; toque no nome para abrir o detalhe. */
let analiseFiltro = null;
function renderAnaliseTreino(){
  const el = document.getElementById("analise-treino-body"); if(!el) return;
  const exList = allActiveExercises();
  if(!exList.length){ el.innerHTML = '<div class="empty-note">Monte sua rotina para ver a análise.</div>'; return; }
  const plan = computeVolumeTotals();
  const musc = {}; DAYS.forEach(k=>{ const d = state.rotina[k]; if(d && d.ativo) (d.exercicios||[]).forEach(e=>{ if(!musc[e.nome]) musc[e.nome] = e.musculos || []; }); });
  const itens = exList.map(x=> analiseExercicio(x.nome, musc[x.nome], plan));
  const ordem = {estagnado:0, progredindo:1, estavel:2, "sem-dados":3};
  itens.sort((a,b)=> ordem[a.cls.estado] - ordem[b.cls.estado]);
  const cont = {}; itens.forEach(i=> cont[i.cls.estado] = (cont[i.cls.estado]||0) + 1);
  const comDados = itens.filter(i=> i.sess.length).length;
  let h = '';
  if(!comDados){
    h += '<div class="empty-note">Assim que você registrar séries nos treinos, aparece aqui o que está progredindo, o que está parado e por quê.</div>';
  } else {
    const ORD_F = ["estagnado","progredindo","estavel","sem-dados"];
    let filtro = analiseFiltro;
    if(filtro !== "todos" && !(filtro && cont[filtro])) filtro = ORD_F.find(k=> cont[k]) || "todos";
    const vis = filtro === "todos" ? itens : itens.filter(i=> i.cls.estado === filtro);
    h += '<div class="an-sum" role="group" aria-label="Filtrar a análise por situação">'+
      ["estagnado","progredindo","estavel","sem-dados"].filter(k=> cont[k]).map(k=>'<button type="button" class="chip an-f '+ANALISE_ESTADO[k].c+'" data-anf="'+k+'" aria-pressed="'+(filtro === k)+'">'+ANALISE_ESTADO[k].t+' · '+cont[k]+'</button>').join("")+
      '<button type="button" class="chip an-f neutral" data-anf="todos" aria-pressed="'+(filtro === "todos")+'">Todos · '+itens.length+'</button></div>';
    h += '<div class="an-count" role="status" aria-live="polite">Mostrando '+vis.length+' de '+itens.length+' exercícios — toque em um nome para ver o detalhe.</div>';
    h += '<ul class="an-list">'+vis.map(i=>{
      const st = ANALISE_ESTADO[i.cls.estado];
      const tab = i.sess.length ? '<div class="an-tabw" tabindex="0" role="region" aria-label="Últimas sessões de '+escapeHtml(i.nome)+'"><table class="an-tab"><thead><tr><th scope="col">Data</th><th scope="col">Carga</th><th scope="col">Reps por série</th><th scope="col">RPE</th></tr></thead><tbody>'+
        i.sess.slice(-ANALISE_JANELA).reverse().map(x=>'<tr><td>'+escapeHtml(fmtDateBR(x.iso))+'</td><td>'+(x.peso != null ? fmtKg(x.peso)+' kg' : '—')+'</td><td>'+x.sets.join(" · ")+(x.unid==="s" ? " s" : "")+'</td><td>'+(x.rpe != null ? x.rpe : '—')+'</td></tr>').join("")+'</tbody></table></div>' : '';
      return '<li><details class="an-ex"><summary><span class="an-name">'+escapeHtml(i.nome)+'</span><span class="chip '+st.c+'">'+st.t+'</span></summary>'+
        '<div class="an-body"><p class="an-resumo">'+escapeHtml(i.resumo)+'</p>'+
        (i.tendencia ? '<p class="an-tend">'+escapeHtml(i.tendencia)+'</p>' : '')+
        (i.linhas.length ? '<ul class="an-linhas">'+i.linhas.map(l=>'<li>'+escapeHtml(l)+'</li>').join("")+'</ul>' : '')+tab+'</div></details></li>';
    }).join("")+'</ul>';
  }
  // volume da semana: realizado x planejado, e a semana passada contra o mínimo
  const seg = mondayOfISO(todayISO()), segAnt = addDaysISO(seg, -7);
  const real = semanaRealizadaPorMusculo(seg), ant = semanaRealizadaPorMusculo(segAnt);
  const linhasVol = MUSCLE_ORDER.filter(m=> (plan[m]||0) > 0).map(m=>{
    const lm = MUSCLE_LANDMARKS[m], pl = plan[m], rl = real[m]||0, pct = Math.min(100, Math.round(rl / pl * 100));
    const nota = (lm.mev && ant[m] > 0 && ant[m] < lm.mev) ? ' <span class="an-nota">Semana passada: '+ant[m]+' séries, abaixo do mínimo ('+lm.mev+').</span>' : '';
    return '<div class="an-vol"><div class="an-vol-top"><span>'+escapeHtml(lm.label)+'</span><span><b>'+rl+'</b> de '+pl+' séries</span></div>'+
      '<div class="quest-track" aria-hidden="true"><div class="quest-fill" style="width:'+pct+'%;"></div></div>'+
      '<div class="an-vol-sub">Referência semanal: mínimo '+lm.mev+' · ideal '+lm.mav+' · teto '+lm.mrv+nota+'</div></div>';
  }).join("");
  if(linhasVol) h += '<h3 class="an-h3">Volume desta semana (realizado × planejado)</h3><div class="an-volwrap">'+linhasVol+'</div>';
  el.innerHTML = h;
}
document.addEventListener("click", (e)=>{
  const b = e.target.closest && e.target.closest("[data-anf]");
  if(!b || !b.closest("#analise-treino-body")) return;
  analiseFiltro = b.dataset.anf;
  const y = window.scrollY;
  renderAnaliseTreino();
  const nb = document.querySelector('#analise-treino-body [data-anf="'+analiseFiltro+'"]');
  if(nb) nb.focus({preventScroll:true});
  window.scrollTo(0, y);
});
/* análise rápida ao concluir o dia: compara cada exercício de hoje com a última vez */
function analiseDoDiaHtml(iso, day){
  const exs = (day && day.exercicios) || [];
  const itens = [];
  exs.forEach((e,i)=>{
    const x = exDoDia(e, iso, i), sess = sessoesDoExercicio(x.nome, iso);
    const hoje = sess[sess.length-1];
    if(!hoje || hoje.iso !== iso) return;
    const ant = sess.length > 1 ? sess[sess.length-2] : null;
    if(!ant){ itens.push({n:x.nome, s:"Primeira vez registrado — vira a sua referência.", c:"neutral", i:"•"}); return; }
    const r = cmpSessao(hoje, ant);
    itens.push(r > 0 ? {n:x.nome, s:"Melhor que a última vez: "+descMudanca(hoje, ant)+".", c:"good", i:"↑"}
             : r < 0 ? {n:x.nome, s:"Um pouco abaixo da última vez ("+descMudanca(hoje, ant)+"). Acontece.", c:"info", i:"↓"}
             : {n:x.nome, s:"Igual à última vez. Constância também é progresso.", c:"info", i:"→"});
  });
  if(!itens.length) return "";
  return '<div class="qc-analise" role="region" aria-label="Análise do treino de hoje"><div class="qc-analise-t">Análise de hoje</div><ul>'+
    itens.map(t=>'<li><span class="chip '+t.c+'" aria-hidden="true">'+t.i+'</span><span><b>'+escapeHtml(t.n)+'</b> — '+escapeHtml(t.s)+'</span></li>').join("")+'</ul></div>';
}

const RPE_HINTS = {6:"≈4 reps na reserva",7:"≈3 reps na reserva",8:"≈2 reps na reserva",9:"≈1 rep na reserva",10:"até a falha"};
/* NG+ · Treino Fase 2 — "Como foi?" ao fechar o exercício. Menor de idade nunca vê "Falha"; iniciante também não (aprende a margem primeiro). */
const RPE_PERGUNTA = [
  {v:7,  t:"Sobrou bastante", d:"dava pra fazer 3 ou mais"},
  {v:8,  t:"Bom",             d:"dava pra fazer mais 2"},
  {v:9,  t:"Quase na falha",  d:"só mais 1"},
  {v:10, t:"Falha",           d:"nenhuma a mais", falha:true}
];
const rpeSkip = {};   // idx -> true quando a pessoa pulou a pergunta (só nesta sessão da tela)
function rpeEscondeFalha(){ const p = state.perfil || {}; return menorDeIdade(p.idade) || p.experiencia === "iniciante"; }
function rpeValoresManuais(){ return menorDeIdade((state.perfil||{}).idade) ? [6,7,8,9] : [6,7,8,9,10]; }
function rpeIntroVista(){ try{ return localStorage.getItem("ng_rpe_intro") === "1"; }catch(e){ return false; } }
function rpeMarcaIntro(){ try{ localStorage.setItem("ng_rpe_intro", "1"); }catch(e){} }
function rpePerguntaHtml(i, c, est){
  if(est.status !== "ok") return "";
  const atual = (c && c.rpe && c.rpe[i] != null) ? Number(c.rpe[i]) : null;
  if(atual != null){
    const q = RPE_PERGUNTA.find(o=> o.v === atual);
    return '<div class="sl-rpe-done"><span>Esforço: <b>RPE '+atual+'</b>'+(q ? ' — '+q.t.toLowerCase() : '')+' ('+RPE_HINTS[atual]+')</span> <button type="button" class="btn small ghost" data-slrpe-edit>Alterar</button></div>';
  }
  if(rpeSkip[i]) return '';
  const opts = RPE_PERGUNTA.filter(o=> !(o.falha && rpeEscondeFalha()));
  const intro = rpeIntroVista() ? '' :
    '<p class="sl-rpe-intro">Pense no <b>marcador de combustível</b> do carro: ele não mostra quanto você andou, mostra quanto ainda tinha no tanque. Aqui é igual — não importa o peso, importa <b>quantas repetições ainda sobravam</b> quando você parou.</p>';
  return '<div class="sl-rpe" role="group" aria-label="Como foi esse exercício?">'+
    '<div class="sl-rpe-q">Como foi esse exercício?'+tipBtn("rpe")+'</div>'+intro+
    '<div class="sl-rpe-opts">'+opts.map(o=>
      '<button type="button" class="sl-rpe-opt" data-slrpe="'+o.v+'"><b>'+o.t+'</b><small>'+o.d+'</small></button>').join("")+'</div>'+
    '<div class="sl-rpe-foot"><span>Não precisa ser exato — é só uma noção.</span> <button type="button" class="btn small ghost" data-slrpe-skip>Agora não</button></div>'+
  '</div>';
}
function saveRPE(iso, idx, value){
  const cur = state.checkins[iso] || {};
  const rpe = Object.assign({}, cur.rpe);
  if(value == null) delete rpe[idx]; else rpe[idx] = value;
  const data = Object.assign({}, cur, {data:iso, dia:treinoKey(iso), rpe});
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
}
function getCargaHistory(exNome){
  return Object.keys(state.checkins)
    .filter(iso => state.checkins[iso] && state.checkins[iso].cargas && state.checkins[iso].cargas[exNome]!=null)
    .sort()
    .map(iso => ({iso, peso: Number(state.checkins[iso].cargas[exNome])}));
}

/* ============================================================
   LANÇAMENTO SÉRIE A SÉRIE (NG+ · Treino Fase 1)
   checkins/<iso>.sets[idx]   = [{r}]  uma entrada por série, com as repetições (ou segundos) que a pessoa fez de verdade
   checkins/<iso>.status[idx] = "parcial" | "pulado"   (ausente = normal)
   checkins/<iso>.motivo[idx] = "cansaco" | "dor" | "tempo" | "equipamento" | "outro"   (opcional)
   checkins/<iso>.progresso[idx] = soma das repetições — derivado, só para manter backups e telas antigas válidos.
   Check-in antigo (só com "progresso") continua valendo: vira séries "implícitas" ao ser lido.
   ============================================================ */
const XP_PARCIAL_PISO = 0.5;   // exercício encerrado antes do fim vale, no mínimo, metade; acima disso, proporcional às séries feitas
const MOTIVOS_ENCERRAR = {cansaco:"Cansaço", dor:"Dor ou desconforto", tempo:"Falta de tempo", equipamento:"Equipamento ocupado", outro:"Outro motivo"};
function faixaDeReps(reps){
  const r = String(reps||"");
  let m = r.match(/^(\d+)-(\d+)s$/); if(m) return {min:+m[1], max:+m[2], unid:"s"};
  m = r.match(/^(\d+)-(\d+)/); if(m) return {min:+m[1], max:+m[2], unid:"reps"};
  m = r.match(/^(\d+)$/); if(m) return {min:+m[1], max:+m[1], unid:"reps"};
  return {min:0, max:0, unid:"reps"};
}
function setsDe(c, idx, ex){
  if(c && c.sets && Array.isArray(c.sets[idx])) return c.sets[idx].map(s=>({r: Math.max(0, Number(s && s.r)||0)}));
  const prog = Number(c && c.progresso && c.progresso[idx])||0;
  if(prog <= 0) return [];
  const prev = Math.max(1, Number(ex && ex.series)||1);
  const meta = Number(ex && ex.metaReps)||0;
  const por = meta ? Math.max(1, Math.round(meta/prev)) : Math.max(1, faixaDeReps(ex && ex.reps).max || 1);
  const n = Math.min(prev, Math.ceil(prog/por));
  const out = []; let resto = prog;
  for(let k=0; k<n; k++){ const v = Math.min(por, resto); out.push({r:v}); resto -= v; }
  return out;
}
function statusDe(c, idx){
  const s = c && c.status && c.status[idx];
  return (s === "parcial" || s === "pulado") ? s : null;
}
function estadoEx(c, idx, ex){
  const prev = Math.max(1, Number(ex && ex.series)||1);
  const sets = setsDe(c, idx, ex), n = sets.length;
  const st = statusDe(c, idx);
  let s;
  if(st === "pulado") s = "pulado";
  else if(st === "parcial") s = n > 0 ? "parcial" : "pulado";   // "encerrar aqui" sem nenhuma série registrada equivale a pular
  else if(n >= prev) s = "ok";
  else s = n > 0 ? "andamento" : "pendente";
  return {n, prev, sets, status:s, resolvido: s==="ok"||s==="parcial"||s==="pulado", feito: s==="ok"||s==="parcial"};
}
function resumoDia(c, day){
  const exs = (day && day.exercicios) || [];
  const r = {total:exs.length, ok:0, parcial:0, pulado:0, resolvidos:0, algumFeito:false, algumRegistro:false};
  exs.forEach((ex,i)=>{
    const e = estadoEx(c, i, ex);
    if(e.status === "ok") r.ok++; else if(e.status === "parcial") r.parcial++; else if(e.status === "pulado") r.pulado++;
    if(e.resolvido) r.resolvidos++;
    if(e.feito) r.algumFeito = true;
    if(e.n > 0 || e.status === "pulado") r.algumRegistro = true;
  });
  r.completo = r.total > 0 && r.resolvidos === r.total && r.algumFeito;   // o dia conclui quando todos os exercícios foram resolvidos (feitos, encerrados ou pulados) e ao menos um foi feito
  return r;
}
/* fração do treino que vale XP: completo 100%, parcial proporcional às séries feitas (piso de 50%), pulado 0% */
function fatorXpDoTreino(c, day){
  const exs = (day && day.exercicios) || [];
  if(!c || !exs.length) return 1;
  const temRegistro = (c.sets && Object.keys(c.sets).length) || (c.status && Object.keys(c.status).length);
  if(!temRegistro) return 1;   // check-in antigo, sessão rápida ou "concluir treino inteiro" sem séries lançadas: vale o treino completo
  let soma = 0;
  exs.forEach((ex,i)=>{
    const e = estadoEx(c, i, ex);
    if(e.status === "pulado") return;
    if(e.status === "parcial" || e.status === "andamento") soma += Math.max(XP_PARCIAL_PISO, Math.min(1, e.n/e.prev));
    else soma += 1;
  });
  return soma / exs.length;
}
function xpDoTreino(c, day){ return Math.round(NIVEL_XP_POR_TREINO * fatorXpDoTreino(c, day)); }

/* grava uma mudança de séries/status: materializa séries implícitas, recalcula o progresso derivado e se o dia está concluído */
function mudarSeries(iso, key, mut){
  const cur = state.checkins[iso] || {};
  const day = state.rotina[key];
  const exs = (day && day.exercicios) || [];
  const sets = {}; Object.keys(cur.sets||{}).forEach(k=>{ sets[k] = (cur.sets[k]||[]).map(s=>({r:Number(s && s.r)||0})); });
  const status = Object.assign({}, cur.status), motivo = Object.assign({}, cur.motivo), progresso = Object.assign({}, cur.progresso);
  exs.forEach((ex,i)=>{ if(!sets[i] && Number(progresso[i]) > 0) sets[i] = setsDe(cur, i, ex); });
  mut({sets, status, motivo, exs});
  Object.keys(sets).forEach(k=>{
    if(!sets[k].length){ delete sets[k]; delete progresso[k]; }
    else progresso[k] = sets[k].reduce((a,s)=> a + (Number(s.r)||0), 0);
  });
  const data = Object.assign({}, cur, {data:iso, dia:key, sets, status, motivo, progresso});
  if(!Object.keys(sets).length) delete data.sets;
  if(!Object.keys(status).length) delete data.status;
  if(!Object.keys(motivo).length) delete data.motivo;
  if(!Object.keys(progresso).length) delete data.progresso;
  data.concluido = resumoDia(data, day).completo;
  delete data.leve; delete data.rapido; delete data.rapidoEx;   // lançar séries = treino completo
  state.checkins[iso] = data;
  saveDoc("checkins/"+iso, data);
}
function registrarSerie(iso, key, idx, reps){
  mudarSeries(iso, key, o=>{
    const prev = Math.max(1, Number(o.exs[idx] && o.exs[idx].series)||1);
    const lista = o.sets[idx] || (o.sets[idx] = []);
    if(lista.length < 20) lista.push({r: Math.max(1, Math.min(999, Math.round(reps)))});
    if(lista.length >= prev){ delete o.status[idx]; delete o.motivo[idx]; }   // completou as séries previstas: deixa de ser parcial
  });
}
function editarSerie(iso, key, idx, k, reps){
  mudarSeries(iso, key, o=>{ if(o.sets[idx] && o.sets[idx][k]) o.sets[idx][k].r = Math.max(1, Math.min(999, Math.round(reps))); });
}
function removerSerie(iso, key, idx, k){
  mudarSeries(iso, key, o=>{
    if(!o.sets[idx]) return;
    o.sets[idx].splice(k, 1);
    if(!o.sets[idx].length){ delete o.status[idx]; delete o.motivo[idx]; }
  });
}
function encerrarExercicio(iso, key, idx, tipo){
  mudarSeries(iso, key, o=>{ o.status[idx] = tipo; });
}
function retomarExercicio(iso, key, idx){
  mudarSeries(iso, key, o=>{ delete o.status[idx]; delete o.motivo[idx]; });
}
function definirMotivo(iso, key, idx, m){
  mudarSeries(iso, key, o=>{ if(o.motivo[idx] === m) delete o.motivo[idx]; else if(MOTIVOS_ENCERRAR[m]) o.motivo[idx] = m; });
}
function restaurarCheckin(iso, prev){
  if(prev){ state.checkins[iso] = prev; saveDoc("checkins/"+iso, prev); }
  else { delete state.checkins[iso]; deleteDocRemote("checkins/"+iso); }
  render();
  showToast("Desfeito.");
}

/* estado efêmero da tela (o cronômetro de descanso redesenha a lista a cada segundo; sem isso o número digitado se perderia) */
const setDraft = {};   // idx -> texto digitado
const setEdit = {};    // idx -> índice da série em edição
const setExtra = {};   // idx -> true quando a pessoa abriu "série extra" depois de completar as previstas
function alvoReps(ex, sets){
  if(sets && sets.length) return sets[sets.length-1].r || 1;
  const f = faixaDeReps(ex.reps);
  return f.max ? Math.max(1, Math.ceil((f.min + f.max)/2)) : 10;
}
function rotuloFaixa(r, ex){
  const f = faixaDeReps(ex.reps);
  if(!f.max) return null;
  if(r < f.min) return {t:"abaixo da faixa", s:"▼"};
  if(r > f.max) return {t:"acima da faixa", s:"▲"};
  return {t:"na faixa", s:"●"};
}
function semFocoEmCampo(fn){
  return ()=>{ const a = document.activeElement; if(a && a.matches && a.matches("input,select,textarea") && a.closest("#week-trail-detail, .live-workout")) return; fn(); };
}
/* ranking das séries do exercício: maior desempenho = ouro, 2º = prata, 3º = bronze, 4º em diante = cinza; valores iguais dividem a mesma posição */
const MEDALHAS = [{k:'ouro', t:'melhor desempenho (ouro)'}, {k:'prata', t:'2º melhor (prata)'}, {k:'bronze', t:'3º melhor (bronze)'}, {k:'cinza', t:'demais séries (cinza)'}];
function rankSeries(sets){
  const vals = Array.from(new Set((sets||[]).map(s=>s.r))).sort((a,b)=>b-a);
  return (sets||[]).map(s=>MEDALHAS[Math.min(vals.indexOf(s.r), 3)]);
}
function serieLogHtml(i, ex, c, pfx){
  const e = estadoEx(c, i, ex), f = faixaDeReps(ex.reps);
  const un = f.unid === "s" ? " s" : "", unLong = f.unid === "s" ? "segundos" : "repetições";
  const editK = (setEdit[i] != null && setEdit[i] < e.n) ? setEdit[i] : null;
  if(setEdit[i] != null && editK == null) delete setEdit[i];
  const alvo = alvoReps(ex, e.sets);
  const draft = setDraft[i] != null ? setDraft[i] : String(editK != null ? e.sets[editK].r : alvo);
  const pct = Math.min(100, Math.round(e.n/e.prev*100));
  const faixaTxt = f.max ? "meta "+(f.min === f.max ? f.min : f.min+"–"+f.max)+(f.unid === "s" ? " s" : " reps")+" por série" : "";
  const ranks = rankSeries(e.sets);
  const chips = e.sets.map((s,k)=>{
    const rf = rotuloFaixa(s.r, ex), md = ranks[k];
    return '<li><button type="button" class="sl-chip sl-'+md.k+(editK===k?' on':'')+'" data-medalha="'+md.k+'" data-slchip="'+k+'" aria-pressed="'+(editK===k)+'" aria-label="Série '+(k+1)+': '+s.r+' '+unLong+(rf ? ', '+rf.t : '')+', '+md.t+'. Toque para editar.">'+
      '<span class="sl-chip-n">'+(k+1)+'ª</span><b>'+s.r+un+'</b>'+(rf ? '<small aria-hidden="true">'+rf.s+'</small>' : '')+'</button></li>';
  }).join("");
  let h = '<div class="sl" data-sl="'+i+'" data-pfx="'+pfx+'">'+
    '<div class="sl-top"><span class="sl-count" tabindex="-1"><b>'+e.n+'</b> de '+e.prev+' série'+(e.prev===1?'':'s')+'</span>'+(faixaTxt ? '<span class="sl-faixa">'+faixaTxt+'</span>' : '')+'</div>'+
    '<div class="sl-segs" aria-hidden="true" style="--n:'+Math.max(1,e.prev)+';">'+Array.from({length:Math.max(1,e.prev)},(_,k)=>'<i class="'+(k<e.n?'on':(k===e.n?'next':''))+'"></i>').join("")+'</div>'+
    (e.n ? '<ul class="sl-sets" aria-label="Séries registradas">'+chips+'</ul>' : '');
  if(e.n && f.max) h += '<div class="sl-leg"><span class="sl-rk"><i class="sl-dot sl-ouro"></i>melhor</span><span class="sl-rk"><i class="sl-dot sl-prata"></i>2º</span><span class="sl-rk"><i class="sl-dot sl-bronze"></i>3º</span><span class="sl-rk"><i class="sl-dot sl-cinza"></i>demais</span><span class="sl-rg">▼ abaixo · ● na faixa · ▲ acima da faixa — sem certo ou errado</span></div>';
  if(e.status === "parcial" || e.status === "pulado"){
    const m = (c && c.motivo && c.motivo[i]) || null;
    h += '<div class="sl-status '+e.status+'" role="status"><b>'+(e.status === "parcial" ? 'Encerrado aqui' : 'Exercício pulado')+'</b> — '+
      (e.status === "parcial" ? e.n+' série'+(e.n===1?'':'s')+' registrada'+(e.n===1?'':'s')+'. Vale XP proporcional ao que você fez.' : 'Não conta XP e não atrapalha a sua sequência.')+
      ' <button type="button" class="btn small" data-slresume>Retomar</button></div>'+
      '<div class="sl-motivos" role="group" aria-label="Motivo (opcional)"><span class="sl-mlab">Motivo (opcional):</span>'+
      Object.keys(MOTIVOS_ENCERRAR).map(k=>'<button type="button" class="sl-mot'+(m===k?' on':'')+'" data-slmot="'+k+'" aria-pressed="'+(m===k)+'">'+MOTIVOS_ENCERRAR[k]+'</button>').join("")+'</div>';
  } else if(e.n >= e.prev && editK == null && !setExtra[i]){
    h += rpePerguntaHtml(i, c, e);
    h += '<div class="sl-acoes"><button type="button" class="btn small ghost" data-slextra>+ Série extra</button></div>';
  } else {
    const rotulo = editK != null ? 'Editando a série '+(editK+1) : (e.n >= e.prev ? 'Série extra (a '+(e.n+1)+'ª)' : 'Série '+(e.n+1)+' de '+e.prev);
    h += '<div class="sl-row"><label class="sl-lab" for="sl-in-'+pfx+i+'">'+rotulo+' · '+unLong+' feitas</label>'+
      '<div class="sl-inwrap">'+
        '<button type="button" class="sl-step" data-slstep="-1" aria-label="Uma a menos">−</button>'+
        '<input id="sl-in-'+pfx+i+'" class="sl-in" data-slin type="number" inputmode="numeric" min="1" max="999" step="1" value="'+escapeHtml(draft)+'">'+
        '<button type="button" class="sl-step" data-slstep="1" aria-label="Uma a mais">+</button>'+
      '</div>';
    if(editK != null){
      h += '<div class="sl-btns"><button type="button" class="btn primary" data-slok>Salvar série</button><button type="button" class="btn" data-slrm>Remover série</button><button type="button" class="btn ghost" data-slcancel>Cancelar</button></div>';
    } else {
      h += '<button type="button" class="btn primary sl-ok" data-slok>✓ Registrar série</button>';
    }
    h += '</div>';
    if(editK == null && e.n >= e.prev){
      h += '<div class="sl-acoes"><button type="button" class="btn small ghost" data-slextraoff>Fechar série extra</button></div>';
    } else if(editK == null){
      h += '<div class="sl-acoes">'+
        (e.n > 0 && e.n < e.prev ? '<button type="button" class="btn small ghost" data-slend>Encerrar aqui</button>' : '')+
        (e.n === 0 ? '<button type="button" class="btn small ghost" data-slskip>Pular exercício</button>' : '')+
      '</div>';
    }
  }
  return h+'</div>';
}
function atualizaPaineisTreino(){
  renderWeekGrid(); renderTodayCard(); renderStreak(); renderWeekDots(); renderHeatmap();
}
function acaoSerie(tipo, iso, key, idx, arg, anchorEl, rerender, tick){
  const dayObj = state.rotina[key];
  if(!dayObj || !dayObj.exercicios || !dayObj.exercicios[idx]) return;
  const wasConcluido = !!(state.checkins[iso] && state.checkins[iso].concluido);
  const prevSnap = snapCheckin(iso);
  const before = captureCelebrationBaseline();
  let desfazerMsg = null;
  if(tipo === "registrar") registrarSerie(iso, key, idx, arg);
  else if(tipo === "editar") editarSerie(iso, key, idx, arg.k, arg.r);
  else if(tipo === "remover"){ removerSerie(iso, key, idx, arg); desfazerMsg = "Série removida."; }
  else if(tipo === "encerrar"){ encerrarExercicio(iso, key, idx, "parcial"); cancelRestTimer(idx); }
  else if(tipo === "pular"){ encerrarExercicio(iso, key, idx, "pulado"); cancelRestTimer(idx); }
  else if(tipo === "retomar") retomarExercicio(iso, key, idx);
  else if(tipo === "motivo") definirMotivo(iso, key, idx, arg);
  if(tipo !== "motivo"){ hapticPulse(10); playSound("tick"); }
  atualizaPaineisTreino();
  if(rerender) rerender();
  const agora = state.checkins[iso];
  const nowConcluido = !!(agora && agora.concluido);
  if(wasConcluido || nowConcluido){ renderNivel(); renderAchievements(); }
  const ex = exDoDia(dayObj.exercicios[idx], iso, idx);
  const est = estadoEx(agora, idx, ex);
  if(!wasConcluido && nowConcluido){
    playSound("checkin");
    const ganho = Math.max(0, computeNivelInfo().xp - before.xp);
    const celebrated = celebrateProgress(before, anchorEl, {xp:ganho});
    if(!celebrated) toastCheckinDesfazer("Treino de hoje concluído"+(ganho ? " (+"+ganho+" XP)" : "")+". Bom trabalho!", iso, prevSnap);
  } else if(tipo === "registrar"){
    if(est.status === "ok"){ cancelRestTimer(idx); showToast("Exercício completo: "+est.n+" série"+(est.n===1?"":"s")+" registrada"+(est.n===1?"":"s")+"."); }
    else if(restAutoOn() && !restTimers[idx]){ const secs = restPref(); startRestTimer(idx, secs, tick); showToast("Série "+est.n+" registrada — descanso de "+secs+" s."); }
  } else if(desfazerMsg){
    showToast(desfazerMsg, {action:{label:"Desfazer", fn:()=> restaurarCheckin(iso, prevSnap)}});
  } else if(tipo === "encerrar"){
    showToast("Exercício encerrado aqui. Vale XP proporcional às séries feitas.");
  } else if(tipo === "pular"){
    showToast("Exercício pulado. Sem problema — o treino segue.");
  }
}
/* depois de responder à pergunta de esforço o botão some; o foco vai para o próximo controle útil, mesmo que o app redesenhe a tela em seguida */
let focoPendente = null;
function aplicaFocoPendente(){
  const f = focoPendente; if(!f) return;
  if(Date.now() > f.ate){ focoPendente = null; return; }
  const el = document.querySelector('.sl[data-pfx="'+f.pfx+'"][data-sl="'+f.i+'"] '+f.sel);
  if(el && document.activeElement !== el){ try{ el.focus({preventScroll:true}); }catch(e){} }
}
function bindSerieLog(root, pfx, iso, key, rerender, tick){
  root.querySelectorAll('.sl[data-pfx="'+pfx+'"]').forEach(box=>{
    const i = Number(box.dataset.sl);
    const dayObj = state.rotina[key];
    const base = dayObj && dayObj.exercicios && dayObj.exercicios[i];
    if(!base) return;
    const ex = exDoDia(base, iso, i);
    const inp = box.querySelector("[data-slin]");
    const lerValor = ()=> Math.round(Number(String(inp ? inp.value : "").replace(",", ".")));
    const act = (tipo, arg, anchor)=> acaoSerie(tipo, iso, key, i, arg, anchor || box, rerender, tick);
    if(inp){
      inp.addEventListener("input", ()=>{ setDraft[i] = inp.value; });
      inp.addEventListener("keydown", (ev)=>{ if(ev.key === "Enter"){ ev.preventDefault(); const ok = box.querySelector("[data-slok]"); if(ok) ok.click(); } });
    }
    box.querySelectorAll("[data-slstep]").forEach(b=> b.addEventListener("click", ()=>{
      if(!inp) return;
      const atual = lerValor();
      const ponto = isFinite(atual) && atual > 0 ? atual : alvoReps(ex, estadoEx(state.checkins[iso], i, ex).sets);
      const v = Math.max(1, Math.min(999, ponto + Number(b.dataset.slstep)));
      inp.value = String(v); setDraft[i] = String(v); hapticPulse(6);
    }));
    const ok = box.querySelector("[data-slok]");
    if(ok) ok.addEventListener("click", ()=>{
      const n = lerValor();
      if(!(n >= 1 && n <= 999)){ showToast("Digite quantas você fez (de 1 a 999)."); if(inp) inp.focus(); return; }
      const k = setEdit[i];
      delete setDraft[i]; delete setExtra[i];
      if(k != null){ delete setEdit[i]; act("editar", {k, r:n}, ok); }
      else act("registrar", n, ok);
    });
    box.querySelectorAll("[data-slchip]").forEach(b=> b.addEventListener("click", ()=>{
      const k = Number(b.dataset.slchip);
      if(setEdit[i] === k){ delete setEdit[i]; delete setDraft[i]; }
      else { setEdit[i] = k; delete setDraft[i]; }
      if(rerender) rerender(); else renderWeekTrailDetail();
      const campo = document.getElementById("sl-in-"+pfx+i); if(campo){ try{ campo.focus({preventScroll:true}); campo.select(); }catch(e){} }
    }));
    const rm = box.querySelector("[data-slrm]");
    if(rm) rm.addEventListener("click", ()=>{ const k = setEdit[i]; delete setEdit[i]; delete setDraft[i]; if(k != null) act("remover", k, rm); });
    const cn = box.querySelector("[data-slcancel]");
    if(cn) cn.addEventListener("click", ()=>{ delete setEdit[i]; delete setDraft[i]; if(rerender) rerender(); else renderWeekTrailDetail(); });
    const ex1 = box.querySelector("[data-slextra]"); if(ex1) ex1.addEventListener("click", ()=>{ setExtra[i] = true; delete setDraft[i]; if(rerender) rerender(); else renderWeekTrailDetail(); const campo = document.getElementById("sl-in-"+pfx+i); if(campo){ try{ campo.focus({preventScroll:true}); campo.select(); }catch(e){} } });
    const ex0 = box.querySelector("[data-slextraoff]"); if(ex0) ex0.addEventListener("click", ()=>{ delete setExtra[i]; delete setDraft[i]; if(rerender) rerender(); else renderWeekTrailDetail(); });
    const refresh = ()=>{ if(rerender) rerender(); else renderWeekTrailDetail(); };
    const focaApos = (sel)=>{ focoPendente = {pfx, i, sel, ate: Date.now()+1500}; aplicaFocoPendente(); };
    box.querySelectorAll("[data-slrpe]").forEach(b=> b.addEventListener("click", ()=>{
      const v = Number(b.dataset.slrpe);
      saveRPE(iso, i, v); rpeMarcaIntro(); hapticPulse(8);
      refresh(); focaApos("[data-slrpe-edit]");
      showToast("Esforço anotado: RPE "+v+" ("+RPE_HINTS[v]+").");
    }));
    const rpeSk = box.querySelector("[data-slrpe-skip]"); if(rpeSk) rpeSk.addEventListener("click", ()=>{ rpeSkip[i] = true; rpeMarcaIntro(); refresh(); focaApos(".sl-count"); });
    const rpeEd = box.querySelector("[data-slrpe-edit]"); if(rpeEd) rpeEd.addEventListener("click", ()=>{ delete rpeSkip[i]; saveRPE(iso, i, null); refresh(); focaApos("[data-slrpe]"); });
    const fim = box.querySelector("[data-slend]"); if(fim) fim.addEventListener("click", ()=> act("encerrar", null, fim));
    const pula = box.querySelector("[data-slskip]"); if(pula) pula.addEventListener("click", ()=> act("pular", null, pula));
    const ret = box.querySelector("[data-slresume]"); if(ret) ret.addEventListener("click", ()=> act("retomar", null, ret));
    box.querySelectorAll("[data-slmot]").forEach(b=> b.addEventListener("click", ()=> act("motivo", b.dataset.slmot, b)));
  });
}

/* ============================================================
   TIMER DE DESCANSO ENTRE SÉRIES — estado efêmero (não persiste),
   indexado por índice do exercício no dia de hoje. A cada "tick" o
   próprio renderWeekTrailDetail() é chamado de novo: ele lê
   restTimers[idx] pra decidir o que desenhar, então qualquer outro
   render() que aconteça no meio do caminho (ex.: registrar carga de
   outro exercício) não "perde" a contagem — ela volta certa na
   próxima vez que a célula for desenhada.
   ============================================================ */
const restTimers = {};
// índices dos exercícios de hoje com o painel de registro aberto (Rotina semanal)
const questExpanded = new Set();
let sheetFresh = -1;   // v94 C4: índice do exercício cuja folha acabou de abrir (anima só nessa vez)
const modoFolha = ()=> !!(window.matchMedia && matchMedia("(max-width:767px)").matches && typeof HTMLElement.prototype.showPopover === "function");
const REST_PRESETS = [60, 90, 120, 180];
/* v87 (I3): preferências de descanso — por aparelho (localStorage), com try/catch porque o navegador pode bloquear */
function restPref(){ try{ const n = Number(localStorage.getItem("bff_rest_secs")); return REST_PRESETS.includes(n) ? n : 90; }catch(e){ return 90; } }
function restAutoOn(){ try{ return localStorage.getItem("bff_rest_auto") !== "0"; }catch(e){ return true; } }
function setRestPref(n){ try{ localStorage.setItem("bff_rest_secs", String(n)); }catch(e){} }
function setRestAuto(on){ try{ localStorage.setItem("bff_rest_auto", on ? "1" : "0"); }catch(e){} }
document.addEventListener("change", (e)=>{
  const t = e.target;
  if(t && t.matches && t.matches("[data-restsel]")) setRestPref(Number(t.value));
  if(t && t.matches && t.matches("[data-restauto]")){ setRestAuto(t.checked); document.querySelectorAll("[data-restauto]").forEach(c=>{ c.checked = t.checked; }); }
});
function restAutoHtml(){
  return '<label class="rest-auto"><input type="checkbox" data-restauto'+(restAutoOn()?' checked':'')+'><span>Descanso automático ao concluir uma série</span></label>';
}
function restTimerCellHtml(idx, exNome){
  const t = restTimers[idx];
  if(t){
    const mm = String(Math.floor(t.remaining/60)).padStart(2,"0");
    const ss = String(t.remaining%60).padStart(2,"0");
    const tot = t.total || t.remaining || 1;
    const frac = Math.max(0, Math.min(1, t.remaining/tot));
    const totTxt = Math.floor(tot/60)+" min"+(tot%60 ? " "+(tot%60)+" s" : "");
    return '<div class="quest-rest-row running">'+
      '<span class="rest-ring'+(t.remaining <= 5 ? ' fim' : '')+'" role="img" aria-label="Descanso: faltam '+mm+':'+ss+' de '+totTxt+'">'+
        '<svg viewBox="0 0 44 44" aria-hidden="true" focusable="false"><circle class="rr-trilho" cx="22" cy="22" r="18" pathLength="100"/><circle class="rr-arco" cx="22" cy="22" r="18" pathLength="100" stroke-dasharray="100" stroke-dashoffset="'+(100*(1-frac)).toFixed(1)+'" transform="rotate(-90 22 22)"/></svg>'+
        '<span class="rr-ic">'+ic('timer')+'</span>'+
      '</span>'+
      '<span class="quest-rest-display">'+mm+':'+ss+'</span>'+
      '<button class="btn small ghost quest-rest-cancel" type="button" data-restcancel="'+idx+'">Cancelar</button>'+
    '</div>'+restAutoHtml();
  }
  const pref = restPref();
  const sg = exNome ? restSugerido(exNome) : null;   // v95 (T3)
  return '<div class="quest-rest-row">'+
    '<select class="quest-rest-select" data-restsel="'+idx+'" aria-label="Duração do descanso">'+
      REST_PRESETS.map(s=>'<option value="'+s+'"'+(s===pref?' selected':'')+'>'+s+'s'+(sg && sg.presets.indexOf(s)>=0 ? ' · sugerido' : '')+'</option>').join("")+
    '</select>'+
    '<button class="btn small ghost quest-rest-btn" type="button" data-rest="'+idx+'">'+ic('timer')+' Descanso</button>'+
  '</div>'+
  (sg ? '<div class="rest-sug">Sugerido para este exercício: <b>'+sg.txt+'</b> · descanso livre também vale</div>' : '')+restAutoHtml();
}
function startRestTimer(idx, seconds, onTick){
  cancelRestTimer(idx);
  const tick = onTick || semFocoEmCampo(renderWeekTrailDetail);   // NG+: não redesenha enquanto a pessoa digita as repetições
  restTimers[idx] = {remaining: seconds, total: seconds, intervalId: null};
  restTimers[idx].intervalId = setInterval(()=>{
    const t = restTimers[idx];
    if(!t) return;
    t.remaining--;
    if(t.remaining <= 0){
      clearInterval(t.intervalId);
      delete restTimers[idx];
      hapticPulse([40,60,40]);
      playSound("resttimer");
      showToast("Descanso concluído — próxima série!");
      tick();
      return;
    }
    tick();
  }, 1000);
  tick();
}
function cancelRestTimer(idx){
  const t = restTimers[idx];
  if(t && t.intervalId) clearInterval(t.intervalId);
  delete restTimers[idx];
}

/* ============================================================
   TREINO AO VIVO — modo de sessão em tela cheia (modal), um
   exercício por vez, números grandes. Não duplica lógica: reaproveita
   bumpQuestProgress, saveCarga, saveRPE, restTimerCellHtml/startRestTimer,
   sugestaoProgressao e EXERCISE_ALTERNATIVES — só muda a apresentação
   pra foco total durante a série.
   ============================================================ */
let liveWorkoutIdx = 0;
function openTreinoAoVivo(){
  const iso = todayISO();
  const key = treinoKey(iso);
  const day = state.rotina[key];
  if(!day || !day.ativo || !(day.exercicios||[]).length){
    showToast("Hoje é dia de descanso: sem treino para começar. Aproveite para recuperar.");
    return;
  }
  liveWorkoutIdx = 0;
  const body = document.createElement("div");
  body.className = "live-workout";
  openModal(body, {dismissible:true});
  renderLiveWorkout(body);
}

function renderLiveWorkout(body){
  const iso = todayISO();
  const key = treinoKey(iso);
  const day = state.rotina[key];
  if(!day){ closeModal(); return; }
  const exercicios = day.exercicios || [];
  const n = exercicios.length;

  if(liveWorkoutIdx >= n){
    body.innerHTML =
      '<div class="lw-head">'+escapeHtml(day.nome)+'</div>'+
      '<h2 class="lw-name">Treino concluído!</h2>'+
      '<p class="empty-note">Todos os '+n+' exercícios de hoje foram revisados. Bom treino!</p>'+
      '<div class="lw-nav"><button class="btn primary" type="button" data-lwclose>Fechar</button></div>';
    body.querySelector("[data-lwclose]").addEventListener("click", closeModal);
    return;
  }

  const i = liveWorkoutIdx;
  const ex = exDoDia(exercicios[i], iso, i);
  const checkin = state.checkins[iso];
  const cargaAtual = (checkin && checkin.cargas && checkin.cargas[ex.nome]!=null) ? checkin.cargas[ex.nome] : "";
  const histAntes = getCargaHistory(ex.nome).filter(h=>h.iso!==iso);
  let cargaHint = "Primeiro registro";
  if(histAntes.length){
    const last = histAntes[histAntes.length-1].peso;
    const pr = Math.max(...histAntes.map(h=>h.peso));
    cargaHint = "Última: "+fmtKg(last)+" kg"+(pr>last ? " · PR: "+fmtKg(pr)+" kg" : "");
  }
  const rpeAtual = (checkin && checkin.rpe && checkin.rpe[i]!=null) ? Number(checkin.rpe[i]) : null;
  const sug = (!cargaAtual) ? sugestaoProgressao(ex.nome) : null;
  const alt = alternativasDoDia(ex);

  body.innerHTML =
    '<div class="lw-head">'+escapeHtml(day.nome)+' · Exercício '+(i+1)+' de '+n+'</div>'+
    '<h2 class="lw-name">'+escapeHtml(ex.nome)+'</h2>'+
    (ex.nota ? '<div class="quest-nota">'+ic('bulb')+' '+escapeHtml(ex.nota)+'</div>' : '')+
    (ex.trocado ? '<div class="qc-swapped lw-swapped">Trocado hoje · original: '+escapeHtml(ex.original)+'</div>' : '')+
    guiaExecucaoHtml(ex.nome, 'lw')+
    (alt.length ? '<div class="qc-alt lw-alt"><span class="qc-alt-label">'+ICON_SWAP+(ex.trocado?'Trocar por':'Variações — toque para trocar hoje')+'</span>'+altChipsHtml(alt, i, ex)+'</div>' : '')+
    permBtnHtml(i, ex)+
    '<div class="lw-video-row"><a class="ex-video-link" href="'+youtubeSearchUrl(ex.nome)+'" target="_blank" rel="noopener noreferrer">'+ICON_PLAY+'<span>Ver vídeo de execução</span></a></div>'+
    '<div class="lw-progress">'+serieLogHtml(i, ex, checkin, 'lw')+'</div>'+
    '<div class="quest-carga-row"><label>Carga</label><input type="number" step="0.5" min="0" class="quest-carga-input" id="lw-carga-input" value="'+cargaAtual+'" placeholder="kg"><span class="quest-carga-hint">'+cargaHint+'</span></div>'+
    cargaQuickHtml(i, ex.nome, cargaAtual, histAntes.length ? histAntes[histAntes.length-1].peso : null)+
    (sug ? '<div class="quest-sugestao">'+ic('bulb')+' Sugestão: '+fmtKg(sug.sugerido)+' kg — '+escapeHtml(sug.texto)+'</div>' : '')+
    '<div class="quest-rpe-row"><label>RPE</label>'+tipBtn("rpe")+'<div class="seg quest-rpe-seg" id="lw-rpe-seg">'+rpeValoresManuais().map(v=>'<button type="button" data-rpeval="'+v+'" class="'+(rpeAtual===v?'active':'')+'">'+v+'</button>').join("")+'</div><span class="quest-rpe-hint">'+(rpeAtual?RPE_HINTS[rpeAtual]:"")+'</span></div>'+
    restTimerCellHtml(i, ex.nome)+
    '<div class="lw-nav">'+
      '<button class="btn" type="button" data-lwprev '+(i<=0?'disabled':'')+'>← Anterior</button>'+
      '<button class="btn primary" type="button" data-lwnext>'+(i>=n-1?'Concluir':'Próximo →')+'</button>'+
    '</div>';

  bindSerieLog(body, 'lw', iso, key, ()=>renderLiveWorkout(body), semFocoEmCampo(()=>renderLiveWorkout(body)));
  aplicaFocoPendente();
  body.querySelectorAll("[data-qswap]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const base = exercicios[i];
      const novo = btn.dataset.qalt === base.nome ? null : btn.dataset.qalt;
      saveTroca(iso, i, novo);
      hapticPulse(10);
      playSound("tick");
      renderLiveWorkout(body);
      renderWeekGrid();
      renderTodayCard();
      renderCargas();
      showToast(novo ? "Exercício trocado hoje: "+novo+"." : "Voltou para "+base.nome+".");
    });
  });
  body.querySelectorAll("[data-qperm]").forEach(btn=>{
    btn.addEventListener("click", ()=> tornarTrocaPermanente(iso, i, ()=> renderLiveWorkout(body)));
  });
  bindCargaQuick(body, ()=> body.querySelector("#lw-carga-input"), ()=> renderLiveWorkout(body));
  body.querySelector("#lw-carga-input").addEventListener("change", (e)=>{
    const quick = e.target.dataset.quick === "1"; delete e.target.dataset.quick;
    if(!guardaCarga(e.target, ()=> body.querySelector("#lw-carga-input"), ex.nome, iso, quick)) return;
    const val = e.target.value.trim();
    const pesoVal = val===""? null : Number(val);
    const histBefore = getCargaHistory(ex.nome).filter(h=>h.iso!==iso);
    const prevMax = histBefore.length ? Math.max(...histBefore.map(h=>h.peso)) : null;
    const before = captureCelebrationBaseline();
    saveCarga(iso, ex.nome, pesoVal);
    renderWeekGrid();
    renderCargas();
    renderAchievements();
    const isPR = pesoVal!=null && pesoVal>0 && prevMax!=null && pesoVal>prevMax;
    cargaCelebrate(before, e.target, {isPR, prLabel: isPR ? (ex.nome+" — "+fmtKg(pesoVal)+" kg (antes: "+fmtKg(prevMax)+" kg)") : ""}, quick);
    renderLiveWorkout(body);
  });
  body.querySelector("#lw-rpe-seg").querySelectorAll("button").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const val = Number(btn.dataset.rpeval);
      const cur2 = state.checkins[iso] && state.checkins[iso].rpe && state.checkins[iso].rpe[i];
      const newVal = (Number(cur2) === val) ? null : val;
      saveRPE(iso, i, newVal);
      renderLiveWorkout(body);
    });
  });
  body.querySelectorAll("[data-rest]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.rest);
      const sel = body.querySelector('[data-restsel="'+idx+'"]');
      startRestTimer(idx, sel ? Number(sel.value) : 90, ()=>renderLiveWorkout(body));
    });
  });
  body.querySelectorAll("[data-restcancel]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      cancelRestTimer(Number(btn.dataset.restcancel));
      renderLiveWorkout(body);
    });
  });
  const prevBtn = body.querySelector("[data-lwprev]");
  if(prevBtn) prevBtn.addEventListener("click", ()=>{
    cancelRestTimer(i);
    liveWorkoutIdx = Math.max(0, i-1);
    renderLiveWorkout(body);
  });
  body.querySelector("[data-lwnext]").addEventListener("click", ()=>{
    cancelRestTimer(i);
    liveWorkoutIdx = i+1;
    renderLiveWorkout(body);
  });
}

const TRAIL_ICONS = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 14.2A8.5 8.5 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z"/></svg>',
  dumbbell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.5 6.5 3 10l4 4M17.5 17.5 21 14l-4-4M14 4l6 6M4 14l6 6M8.5 15.5l7-7"/></svg>',
};

let selectedTrailDay = null;

/* mapa de fases — geometria da trilha sinuosa (coordenadas de design fixas,
   independentes do zoom/tela; o wrapper rola horizontalmente se precisar) */
const TRAIL_MARGIN_X = 26, TRAIL_AMP = 15, TRAIL_CENTER_Y = 46, TRAIL_CIRCLE_D = 40, TRAIL_MIN_W = 240;
function trailNodeCenter(i, n, trailW){
  const x = TRAIL_MARGIN_X + (i/(n-1)) * (trailW - TRAIL_MARGIN_X*2);
  const y = TRAIL_CENTER_Y - Math.sin((i/(n-1)) * Math.PI*2) * TRAIL_AMP;
  return {x, y};
}

function trailDayStatus(key, todayKey, iso, freezeUsedSet){
  const dateForKey = isoWeekDateForKey(key);
  const day = state.rotina[treinoKey(dateForKey)] || {nome:"—", ativo:false, exercicios:[]};
  const isToday = key === todayKey;
  const isPast = !isToday && dateForKey < iso;
  const checkin = isToday ? state.checkins[iso] : (isPast ? state.checkins[dateForKey] : null);
  const done = !!checkin?.concluido;
  const frozen = isPast && freezeUsedSet.has(dateForKey);
  let status;
  if(!day.ativo) status = "rest";
  else if(done) status = "done";
  else if(frozen) status = "frozen";
  else if(isPast) status = "lost";
  else if(isToday) status = "today";
  else status = "future";
  return {day, isToday, isPast, dateForKey, checkin, done, frozen, status};
}

function renderWeekTrail(){
  const wrap = document.getElementById("week-trail");
  if(!wrap) return;
  const outerWrap = wrap.parentElement; // .week-trail-wrap — largura real disponível no card
  const iso = todayISO();
  const todayKey = dayKeyFromISO(iso);
  if(!selectedTrailDay) selectedTrailDay = todayKey;
  const freezeUsedSet = new Set(computeStreakEngine().freezeUsedDates);
  const iconByStatus = {done:TRAIL_ICONS.check, frozen:ic("snow"), lost:TRAIL_ICONS.x, rest:TRAIL_ICONS.moon, today:TRAIL_ICONS.dumbbell, future:TRAIL_ICONS.dumbbell};

  const n = DAYS.length;
  // a trilha preenche toda a largura disponível do card (nunca fica "encolhida" num canto);
  // só usa uma largura mínima de design (e passa a rolar horizontalmente) em telas bem estreitas
  const availableW = outerWrap ? outerWrap.clientWidth : TRAIL_MIN_W;
  const trailW = Math.max(TRAIL_MIN_W, availableW);
  wrap.style.width = trailW+"px";
  // em telas estreitas (320–375px) os 7 círculos encolhem em vez de empurrar o
  // domingo pra fora da tela: o diâmetro acompanha o espaço entre os nós
  const trailSpacing = (trailW - TRAIL_MARGIN_X*2) / (n-1);
  const circleD = Math.max(28, Math.min(TRAIL_CIRCLE_D, Math.floor(trailSpacing - 3)));
  // alvo de toque: em aparelho de toque a área do nó tem ao menos 44 px de largura (o círculo visível continua encolhendo; áreas vizinhas se sobrepõem só nas bordas)
  const toqueMin = (window.matchMedia && matchMedia('(pointer:coarse)').matches) ? 44 : 0;
  const nodeW = Math.min(60, Math.max(toqueMin, Math.floor(trailSpacing)));
  wrap.style.setProperty("--tc", circleD+"px");
  const centers = DAYS.map((_,i)=> trailNodeCenter(i, n, trailW));

  let connectorsHtml = "", nodesHtml = "";
  DAYS.forEach((key,i)=>{
    const info = trailDayStatus(key, todayKey, iso, freezeUsedSet);
    const isSelected = key === selectedTrailDay;
    const pastRestClass = (info.status==="rest" && info.isPast) ? " past" : "";
    const c = centers[i];
    const rotuloSt = {done:"concluído", frozen:"congelado", lost:"perdido", today:"hoje", rest:"descanso", future:"ainda por vir"}[info.status] || info.status;
    nodesHtml += '<div class="week-trail-node '+info.status+pastRestClass+(isSelected?' selected':'')+'" data-day="'+key+'" role="button" tabindex="0" aria-pressed="'+(isSelected?'true':'false')+'" aria-label="'+escapeHtml(DAY_FULL[key]+" — "+rotuloSt)+'" title="'+escapeHtml("Fase "+(i+1)+" · "+DAY_FULL[key])+'" style="left:'+(c.x-nodeW/2)+'px; width:'+nodeW+'px; top:'+(c.y-(circleD/2))+'px;">'+
      '<div class="week-trail-circle">'+iconByStatus[info.status]+'</div>'+
      '<span class="week-trail-lbl">'+DAY_LABEL[key]+'</span>'+
    '</div>';
    if(i < n-1){
      const c2 = centers[i+1];
      const dx = c2.x-c.x, dy = c2.y-c.y;
      const len = Math.sqrt(dx*dx+dy*dy);
      const ang = Math.atan2(dy,dx)*180/Math.PI;
      let connClass = "";
      if(info.status==="done" || info.status==="frozen") connClass = " lit";
      else if(info.status==="rest" && info.isPast) connClass = " rest-lit-past";
      else if(info.status==="rest") connClass = " rest-lit";
      connectorsHtml += '<div class="week-trail-connector'+connClass+'" style="left:'+c.x+'px; top:'+c.y+'px; width:'+len.toFixed(1)+'px; transform:rotate('+ang.toFixed(2)+'deg);"></div>';
    }
  });
  const maxY = Math.max(...centers.map(c=>c.y)) + (circleD/2) + 26; // círculo + rótulo abaixo
  wrap.style.height = maxY+"px";
  wrap.innerHTML = connectorsHtml + nodesHtml;
  // clique ou Enter/Espaço; a trilha é redesenhada, então devolvemos o foco ao mesmo dia (sem rolar a tela)
  const escolheDia = (node, viaTeclado)=>{
    const k = node.dataset.day;
    selectedTrailDay = k;
    renderWeekTrail();
    renderWeekTrailDetail();
    if(viaTeclado){ const n2 = document.querySelector('#week-trail .week-trail-node[data-day="'+k+'"]'); if(n2) n2.focus({preventScroll:true}); }
  };
  wrap.querySelectorAll(".week-trail-node").forEach(node=>{
    node.addEventListener("click", ()=>escolheDia(node, false));
    node.addEventListener("keydown", ev=>{ if(ev.key==="Enter" || ev.key===" "){ ev.preventDefault(); escolheDia(node, true); } });
  });
}

function renderWeekTrailDetail(){
  const el = document.getElementById("week-trail-detail");
  if(!el) return;
  const iso = todayISO();
  const wdKey = dayKeyFromISO(iso);       // dia da semana de hoje (a trilha é por dia da semana)
  const todayKey = treinoKey(iso);        // treino que vale hoje (pode ter sido remanejado)
  const key = selectedTrailDay || wdKey;
  const freezeUsedSet = new Set(computeStreakEngine().freezeUsedDates);
  const info = trailDayStatus(key, wdKey, iso, freezeUsedSet);
  const day = info.day, isToday = info.isToday, done = info.done, status = info.status;

  const statusChipHtml = {
    done:'<span class="chip good">✓ Concluído</span>',
    frozen:'<span class="chip info">'+ic('snow')+' Protegido</span>',
    lost:'<span class="chip warn">Sem treino nesse dia</span>',
    rest:'<span class="chip neutral">Descanso</span>',
    today:'',
    future:'<span class="chip neutral">Ainda não chegou</span>',
  }[status] || "";

  let bodyHtml = "";
  if(status === "rest"){
    bodyHtml = '<div class="empty-note">Dia de descanso. Aproveite para recuperar!</div>';
  } else if(isToday && (day.exercicios||[]).length){
    const checkin = state.checkins[iso];
    const resDia = resumoDia(checkin, day);
    const questItems = day.exercicios.map((exBase,i)=>{
      const ex = exDoDia(exBase, iso, i);
      const est = estadoEx(checkin, i, ex);
      const exDone = est.status === "ok";
      const histAntes = getCargaHistory(ex.nome).filter(h=>h.iso!==iso);
      const cargaRaw = (checkin && checkin.cargas && checkin.cargas[ex.nome]!=null) ? checkin.cargas[ex.nome] : "";
      const cargaAtual = cargaRaw==="" ? "" : cargaRaw;
      const lastPeso = histAntes.length ? histAntes[histAntes.length-1].peso : null;
      const prPeso = histAntes.length ? Math.max(...histAntes.map(h=>h.peso)) : null;
      const cargaHint = lastPeso==null ? "Primeiro registro desse exercício" :
        "Última: "+fmtKg(lastPeso)+" kg"+(prPeso>lastPeso ? " · Recorde: "+fmtKg(prPeso)+" kg" : "");
      const rpeAtual = (checkin && checkin.rpe && checkin.rpe[i]!=null) ? Number(checkin.rpe[i]) : null;
      const sug = (cargaAtual==="") ? sugestaoProgressao(ex.nome) : null;
      const alt = alternativasDoDia(ex);
      const open = questExpanded.has(i);
      const timer = restTimers[i];

      // resumo em pílulas (sempre visível, mesmo com o painel fechado)
      const pills = [];
      if(cargaAtual!==""){
        pills.push('<span class="qc-pill"><b>'+fmtKg(Number(cargaAtual))+'</b> kg</span>');
      } else if(sug){
        pills.push('<span class="qc-pill muted">Sugestão '+fmtKg(sug.sugerido)+' kg</span>');
      } else {
        pills.push('<span class="qc-pill muted">Sem carga</span>');
      }
      if(rpeAtual) pills.push('<span class="qc-pill">RPE <b>'+rpeAtual+'</b></span>');
      if(timer && !open){
        const mm = String(Math.floor(timer.remaining/60)).padStart(2,"0");
        const ss = String(timer.remaining%60).padStart(2,"0");
        pills.push('<span class="qc-pill timer">'+ICON_TIMER+mm+':'+ss+'</span>');
      }

      const subParts = [ex.series+' × '+escapeHtml(String(ex.reps))];
      if(ex.trocado) subParts.unshift('<span class="qc-swapped">trocado hoje</span>');
      if(lastPeso!=null) subParts.push('última '+fmtKg(lastPeso)+' kg');
      if(est.status === "parcial") subParts.push('<span class="qc-st">encerrado aqui</span>');
      if(est.status === "pulado") subParts.push('<span class="qc-st">pulado</span>');

      const folha = modoFolha();
      const panelHtml = !open ? '' :
        (folha
          ? '<div class="qc-panel qc-sheet" popover="manual" role="dialog" aria-label="Registrar '+escapeHtml(ex.nome)+'" tabindex="-1"'+(sheetFresh===i?' data-fresh':'')+'>'+
              '<div class="qc-grip" aria-hidden="true"></div>'+
              '<div class="qc-sheet-head"><strong>'+escapeHtml(ex.nome)+'</strong><button type="button" class="btn small" data-qtoggle="'+i+'">Fechar</button></div>'
          : '<div class="qc-panel">')+
          '<div class="qc-field"><span class="qc-label">Carga</span>'+
            '<label class="qc-input"><input type="number" inputmode="decimal" step="0.5" min="0" class="quest-carga-input" data-carga="'+i+'" value="'+cargaAtual+'" placeholder="0" aria-label="Carga em kg de '+escapeHtml(ex.nome)+'"><span>kg</span></label>'+
            '<span class="qc-hint">'+cargaHint+'</span>'+
            cargaQuickHtml(i, ex.nome, cargaAtual, lastPeso)+
          '</div>'+
          (sug ? '<div class="qc-sug">'+ICON_TIP+'<span>Sugestão: '+fmtKg(sug.sugerido)+' kg — '+escapeHtml(sug.texto)+'</span></div>' : '')+
          '<div class="qc-field"><span class="qc-label">RPE'+tipBtn("rpe")+'</span>'+
            '<div class="seg quest-rpe-seg" data-rpeidx="'+i+'">'+rpeValoresManuais().map(v=>'<button type="button" data-rpeval="'+v+'" class="'+(rpeAtual===v?'active':'')+'">'+v+'</button>').join("")+'</div>'+
            '<span class="qc-hint">'+(rpeAtual?RPE_HINTS[rpeAtual]:"Esforço da última série (opcional)")+'</span>'+
          '</div>'+
          '<div class="qc-field"><span class="qc-label">Descanso</span>'+restTimerCellHtml(i, ex.nome)+'</div>'+
          (ex.nota ? '<div class="qc-note">'+ICON_TIP+'<span>'+escapeHtml(ex.nota)+'</span></div>' : '')+
          guiaExecucaoHtml(ex.nome)+
          (alt.length ? '<div class="qc-alt"><span class="qc-alt-label">'+ICON_SWAP+(ex.trocado?'Trocar por':'Variações — toque para trocar hoje')+'</span>'+altChipsHtml(alt, i, ex)+'</div>' : '')+
          permBtnHtml(i, ex)+
        '</div>';

      return '<li class="qc'+(exDone?' done':'')+(est.status==="parcial"?' part':'')+(est.status==="pulado"?' skip':'')+(open?' open':'')+(ex.nome===cargaChartExercise?' sel':'')+'" data-qi="'+i+'" data-qper="1" data-noswipe>'+
        '<div class="qc-head">'+
          '<span class="qc-badge" aria-hidden="true">'+(exDone ? ICON_CHECK : est.status==="parcial" ? "½" : est.status==="pulado" ? "–" : (i+1))+'</span>'+
          '<div class="qc-title"><span class="qc-name" title="'+escapeHtml(ex.nome)+'">'+escapeHtml(ex.nome)+'</span><span class="qc-sub">'+subParts.map(x=>'<span class="qc-sp">'+x+'</span>').join('')+'</span></div>'+
          '<span class="qc-count" title="séries registradas"><b>'+est.n+'</b>/'+est.prev+'</span>'+
        '</div>'+
        serieLogHtml(i, ex, checkin, 'qc')+
        '<div class="qc-foot">'+
          '<div class="qc-pills">'+pills.join("")+'</div>'+
          '<div class="qc-actions">'+
            '<a class="qc-btn video" href="'+youtubeSearchUrl(ex.nome)+'" target="_blank" rel="noopener noreferrer" title="Buscar vídeo de execução no YouTube">'+ICON_PLAY+'Vídeo</a>'+
            '<button class="qc-btn" type="button" data-qtoggle="'+i+'" aria-expanded="'+open+'">'+(open?'Fechar':'Registrar')+'<span class="qc-chev">'+ICON_CHEVRON+'</span></button>'+
          '</div>'+
        '</div>'+
        panelHtml+
      '</li>';
    }).join("");
    bodyHtml = '<div class="wtd-actions qc-dayhead"><button class="btn small '+(done?'':'primary')+'" data-checkin="'+todayKey+'">'+(done?'✓ Concluído hoje':'Concluir treino inteiro')+'</button>'+
        (resDia.total ? '<span class="qc-daycount"><b>'+resDia.ok+'</b> de <b>'+resDia.total+'</b> completos'+(resDia.parcial ? ' · '+resDia.parcial+' encerrado'+(resDia.parcial===1?'':'s')+' antes' : '')+(resDia.pulado ? ' · '+resDia.pulado+' pulado'+(resDia.pulado===1?'':'s') : '')+'</span>' : '')+
      '</div>'+
      '<ul class="quest-list">'+questItems+'</ul>'+
      (resDia.completo ? analiseDoDiaHtml(iso, day) : '');
  } else if(isToday){
    bodyHtml = '<div class="wtd-actions"><button class="btn small '+(done?'':'primary')+'" data-checkin="'+todayKey+'">'+(done?'✓ Concluído hoje':'Concluir hoje')+'</button></div>';
  } else if(status === "lost"){
    const chips = (day.exercicios||[]).map(ex=>'<span class="ex-chip"><b>'+escapeHtml(ex.nome)+'</b> '+ex.series+'×'+escapeHtml(String(ex.reps))+'</span>').join("");
    bodyHtml = '<div class="empty-note u-mb8">Sem treino registrado nesse dia — sem problema, foco no próximo!</div>'+
      '<div class="trow-chips">'+(chips || '<span class="empty-note">Dia sem exercícios. Adicione em Editar rotina.</span>')+'</div>';
  } else {
    const chips = (day.exercicios||[]).map(ex=>'<span class="ex-chip"><b>'+escapeHtml(ex.nome)+'</b> '+ex.series+'×'+escapeHtml(String(ex.reps))+'</span>').join("");
    bodyHtml = '<div class="trow-chips">'+(chips || '<span class="empty-note">Dia sem exercícios. Adicione em Editar rotina.</span>')+'</div>';
  }

  if(info.isPast && (status === "lost" || status === "frozen") && treinosPerdidos().some(p=> p.iso === info.dateForKey)){
    bodyHtml += '<div class="wtd-actions u-mt8"><button type="button" class="btn small primary" data-recup="'+info.dateForKey+'">Fazer este treino hoje</button></div>'+
      '<div class="empty-note">Você faz '+escapeHtml(day.nome||"este treino")+' hoje e o treino de hoje vai para amanhã, seguindo a ordem da semana.</div>';
  }
  if(isToday && reagendaAtiva()){
    bodyHtml += '<div class="wtd-actions u-mt8"><button type="button" class="link-btn" data-reagdesf="1">Voltar à rotina normal da semana</button></div>';
  }
  const faseNum = DAYS.indexOf(key) + 1;
  const remanej = (info.dateForKey && treinoKey(info.dateForKey) !== key) ? ' · remanejado' : '';
  const subLabel = "Fase "+faseNum+" · " + (isToday ? (DAY_FULL[key]+" · hoje") : fmtDateBR(info.dateForKey)) + remanej;
  el.innerHTML =
    '<div class="wtd-head">'+
      '<div><div class="wtd-title">'+escapeHtml(day.nome||DAY_FULL[key])+'</div><div class="wtd-sub">'+subLabel+'</div></div>'+
      statusChipHtml+
    '</div>'+
    bodyHtml;

  // v94 C4: no celular o painel "Registrar" vira uma folha inferior (Popover API, camada superior: nenhum ancestral a corta)
  el.querySelectorAll(".qc-sheet").forEach(sh=>{ try{ sh.showPopover(); }catch(e){} });
  if(sheetFresh >= 0){
    const f = el.querySelector(".qc-sheet[data-fresh]");
    if(f) f.focus({preventScroll:true});
    sheetFresh = -1;
  }
  // v94 L2: no desktop em 2 painéis, tocar num exercício da lista mostra a progressão dele no painel da direita
  el.querySelectorAll(".qc .qc-head").forEach(h=>{
    h.addEventListener("click", ()=>{
      if(!(window.matchMedia && matchMedia("(min-width:1180px)").matches)) return;
      const nm = h.querySelector(".qc-name"); const nome = nm ? nm.getAttribute("title") : null;
      const sel = document.getElementById("carga-chart-select");
      if(!nome || !sel || ![...sel.options].some(o=>o.value===nome)) return;
      cargaChartExercise = nome; renderCargas(); renderWeekTrailDetail();
    });
  });

  el.querySelectorAll("[data-checkin]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const existing = state.checkins[iso] || {};
      const wasConcluido = !!existing.concluido;
      const prevSnap = snapCheckin(iso);
      const before = captureCelebrationBaseline();
      const data = Object.assign({}, existing, {data:iso, dia:todayKey, concluido:true});
      state.checkins[iso] = data;
      saveDoc("checkins/"+iso, data);
      renderWeekGrid();
      renderTodayCard();
      renderStreak();
      renderWeekDots();
      renderHeatmap();
      renderNivel();
      renderAchievements();
      if(!wasConcluido){
        playSound("checkin");
        const celebrated = celebrateProgress(before, btn, {xp:Math.max(0, computeNivelInfo().xp - before.xp)});
        if(!celebrated) toastCheckinDesfazer("Quest de hoje marcada como concluída.", iso, prevSnap);
      } else {
        showToast("Quest de hoje marcada como concluída.");
      }
    });
  });
  // gesto de deslizar o card: direita = registra uma série com o valor sugerido; esquerda = remove a última série
  const doQuestStep = (idx, step, anchorEl)=>{
    const dayObj = state.rotina[todayKey];
    const ex0 = dayObj && dayObj.exercicios && dayObj.exercicios[idx];
    if(!ex0) return;
    const ex = exDoDia(ex0, iso, idx);
    const e = estadoEx(state.checkins[iso], idx, ex);
    if(e.status === "parcial" || e.status === "pulado"){ showToast("Este exercício foi encerrado. Toque em Retomar para continuar."); return; }
    if(step > 0) acaoSerie("registrar", iso, todayKey, idx, alvoReps(ex, e.sets), anchorEl, null);
    else if(e.n > 0) acaoSerie("remover", iso, todayKey, idx, e.n-1, anchorEl, null);
  };
  bindSerieLog(el, 'qc', iso, todayKey, null);
  aplicaFocoPendente();
  bindQuestSwipe(el, doQuestStep);
  bindCargaQuick(el, idx=> el.querySelector('[data-carga="'+idx+'"]'), ()=> renderWeekTrailDetail());
  el.querySelectorAll("[data-carga]").forEach(inp=>{
    inp.addEventListener("change", ()=>{
      const quick = inp.dataset.quick === "1"; delete inp.dataset.quick;
      const idx = Number(inp.dataset.carga);
      const dayObj = state.rotina[todayKey];
      const ex0 = dayObj && dayObj.exercicios && dayObj.exercicios[idx];
      if(!ex0) return;
      const ex = exDoDia(ex0, iso, idx);
      if(!guardaCarga(inp, ()=> el.querySelector('[data-carga="'+idx+'"]'), ex.nome, iso, quick)) return;
      const val = inp.value.trim();
      const pesoVal = val===""? null : Number(val);
      const histBefore = getCargaHistory(ex.nome).filter(h=>h.iso!==iso);
      const prevMax = histBefore.length ? Math.max(...histBefore.map(h=>h.peso)) : null;
      const before = captureCelebrationBaseline();
      saveCarga(iso, ex.nome, pesoVal);
      renderWeekGrid();
      renderCargas();
      renderAchievements();
      const isPR = pesoVal!=null && pesoVal>0 && prevMax!=null && pesoVal>prevMax;
      cargaCelebrate(before, inp, {isPR, prLabel: isPR ? (ex.nome+" — "+fmtKg(pesoVal)+" kg (antes: "+fmtKg(prevMax)+" kg)") : ""}, quick);
    });
  });
  el.querySelectorAll(".quest-rpe-seg").forEach(seg=>{
    const idx = Number(seg.dataset.rpeidx);
    seg.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const val = Number(btn.dataset.rpeval);
        const cur = state.checkins[iso] && state.checkins[iso].rpe && state.checkins[iso].rpe[idx];
        const newVal = (Number(cur) === val) ? null : val;
        saveRPE(iso, idx, newVal);
        renderWeekTrailDetail();
      });
    });
  });
  el.querySelectorAll("[data-qswap]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.qswap);
      const base = state.rotina[todayKey] && state.rotina[todayKey].exercicios[idx];
      if(!base) return;
      const novo = btn.dataset.qalt === base.nome ? null : btn.dataset.qalt;
      saveTroca(iso, idx, novo);
      questExpanded.add(idx);
      hapticPulse(10);
      playSound("tick");
      renderWeekGrid();
      renderTodayCard();
      renderCargas();
      showToast(novo ? "Exercício trocado hoje: "+novo+"." : "Voltou para "+base.nome+".");
    });
  });
  el.querySelectorAll("[data-qperm]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.qperm);
      questExpanded.add(idx);
      tornarTrocaPermanente(iso, idx);
    });
  });
  el.querySelectorAll("[data-qtoggle]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.qtoggle);
      if(questExpanded.has(idx)) questExpanded.delete(idx); else { if(modoFolha()) questExpanded.clear(); questExpanded.add(idx); sheetFresh = idx; }   // na folha, só um exercício por vez
      renderWeekTrailDetail();
      if(questExpanded.has(idx)){
        const inp = el.querySelector('[data-carga="'+idx+'"]');
        if(inp && !inp.value && window.matchMedia("(hover:hover)").matches) inp.focus();
      } else if(modoFolha()){
        const f = el.querySelector('.qc-foot [data-qtoggle="'+idx+'"]'); if(f) f.focus({preventScroll:true});   // devolve o foco ao botão que abriu a folha
      }
    });
  });
  el.querySelectorAll("[data-rest]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const idx = Number(btn.dataset.rest);
      const sel = el.querySelector('[data-restsel="'+idx+'"]');
      startRestTimer(idx, sel ? Number(sel.value) : 90);
    });
  });
  el.querySelectorAll("[data-restcancel]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      cancelRestTimer(Number(btn.dataset.restcancel));
      renderWeekTrailDetail();
    });
  });
}

function renderWeekGrid(){
  renderWeekTrail();
  renderWeekTrailDetail();
}

let cargaChartExercise = null;
const cargasAbertos = new Set();   // v80: dias (seg..dom) expandidos na lista de cargas

function allActiveExercises(){
  const list = [];
  DAYS.forEach(key=>{
    const day = state.rotina[key];
    if(!day || !day.ativo) return;
    (day.exercicios||[]).forEach(ex=>{
      if(ex.nome && !list.some(l=>l.nome===ex.nome)) list.push({nome:ex.nome, dia:key});
    });
  });
  return list;
}

/* "há 3 dias" / "ontem" / "hoje" para a data da última carga */
function cargaQuando(iso){
  const d = Math.round((new Date(todayISO()+"T12:00:00") - new Date(iso+"T12:00:00"))/864e5);
  if(d <= 0) return "hoje";
  if(d === 1) return "ontem";
  if(d < 31) return "há "+d+" dias";
  return fmtDateBR(iso);
}
/* séries da última sessão do exercício, coloridas pelo ranking (ouro, prata, bronze, cinza) */
function cargaMedalhasHtml(ex, iso){
  const c = state.checkins[iso]; if(!c) return "";
  const dia = state.rotina[c.dia || treinoKey(iso)];
  const lista = (dia && dia.exercicios) || [];
  const idx = lista.findIndex(e=> e.nome === ex.nome);
  if(idx < 0) return "";
  const sets = setsDe(c, idx, lista[idx]);
  if(!sets.length) return "";
  const rk = rankSeries(sets), seg = faixaDeReps(lista[idx].reps).unid === "s";
  return '<div class="carga-sets" role="group" aria-label="Séries da última sessão, coloridas pelo ranking: ouro, prata, bronze e cinza"><span class="carga-sets-t">Última sessão</span>'+
    sets.map((s,k)=>'<span class="cs sl-'+rk[k].k+'" title="'+(k+1)+'ª série: '+s.r+(seg?' s':' reps')+' — '+rk[k].t+'">'+s.r+(seg?' s':'')+'</span>').join("")+'</div>';
}
function cargaSparklineHtml(hist){
  const w = 104, h = 32, padX = 5, padY = 6;
  const dados = hist.slice(-8), n = dados.length;
  if(n < 2){
    const base = '<line class="no-data" x1="'+padX+'" y1="'+(h/2)+'" x2="'+(w-padX)+'" y2="'+(h/2)+'"/>';
    return '<svg viewBox="0 0 '+w+' '+h+'">'+base+(n === 1 ? '<circle class="last" cx="'+(w-padX)+'" cy="'+(h/2)+'" r="3"/>' : '')+'</svg>';
  }
  const pesos = dados.map(d=>d.peso);
  const min = Math.min(...pesos), max = Math.max(...pesos), range = (max-min) || 1;
  const X = i => padX + (i/(n-1))*(w-padX*2);
  const Y = p => h-padY - ((p-min)/range)*(h-padY*2);
  const pts = pesos.map((p,i)=> X(i).toFixed(1)+","+Y(p).toFixed(1));
  const area = 'M'+X(0).toFixed(1)+','+(h-1)+' L'+pts.join(' L')+' L'+X(n-1).toFixed(1)+','+(h-1)+' Z';
  let iPr = -1; pesos.forEach((p,i)=>{ if(p === max) iPr = i; });
  return '<svg viewBox="0 0 '+w+' '+h+'"><path class="area" d="'+area+'"/><polyline points="'+pts.join(" ")+'"/>'+
    (iPr !== n-1 ? '<circle class="pr" cx="'+X(iPr).toFixed(1)+'" cy="'+Y(max).toFixed(1)+'" r="3.2"/>' : '')+
    '<circle class="last" cx="'+X(n-1).toFixed(1)+'" cy="'+Y(pesos[n-1]).toFixed(1)+'" r="3.2"/></svg>';
}

function updateCargaChartExercise(exList){
  if(!exList.length){ cargaChartExercise = null; return; }
  if(cargaChartExercise && exList.some(e=>e.nome===cargaChartExercise)) return;
  const withHist = exList.find(e=> getCargaHistory(e.nome).length>0);
  cargaChartExercise = (withHist || exList[0]).nome;
}

function populateCargaSelect(exList){
  const sel = document.getElementById("carga-chart-select");
  if(!sel) return;
  if(!exList.length){
    sel.innerHTML = '<option value="">Nenhum exercício ativo</option>';
    return;
  }
  sel.innerHTML = exList.map(e=> '<option value="'+escapeHtml(e.nome)+'">'+escapeHtml(e.nome)+' ('+DAY_FULL[e.dia].slice(0,3)+')</option>').join("");
  if(cargaChartExercise) sel.value = cargaChartExercise;
}

let cargaPeriodo = (()=>{ try{ const v = localStorage.getItem("bff_carga_periodo"); return ["90","180","all"].includes(v) ? v : "all"; }catch(e){ return "all"; } })();
document.getElementById("carga-period").addEventListener("click", (ev)=>{
  const b = ev.target.closest("button[data-p]"); if(!b || b.dataset.p === cargaPeriodo) return;
  cargaPeriodo = b.dataset.p; playSound("tick");
  try{ localStorage.setItem("bff_carga_periodo", cargaPeriodo); }catch(e){}
  renderCargaChart();
});
/* v89 C2: semanas de deload (periodização ativa + último deload aplicado) como faixas no gráfico */
function deloadBandas(deIso, ateIso){
  const out = [];
  const st = state.settings || {};
  if(st.ultimoDeload) out.push({from:st.ultimoDeload, to:addDaysISO(st.ultimoDeload, 6)});
  const per = st.periodizacao;
  if(per && per.ativo && per.inicioISO && (per.blocos||[]).length){
    let monday = per.inicioISO, guard = 0;
    const total = per.blocos.reduce((a,b)=> a + (Number(b.semanas)||0), 0);
    if(total > 0){
      while(monday <= ateIso && guard++ < 400){
        let w = 0;
        for(const b of per.blocos){
          const n = Number(b.semanas)||0;
          for(let i=0;i<n;i++){
            const ini = addDaysISO(monday, 7*w);
            if(b.tipo === "deload" && addDaysISO(ini,6) >= deIso && ini <= ateIso) out.push({from:ini, to:addDaysISO(ini,6)});
            w++;
          }
        }
        monday = addDaysISO(monday, 7*total);
      }
    }
  }
  return out;
}
function renderCargaChart(){
  const svg = document.getElementById("carga-chart-svg");
  const emptyEl = document.getElementById("carga-chart-empty");
  const statsEl = document.getElementById("carga-chart-stats");
  if(!svg || !emptyEl || !statsEl) return;
  const hist = cargaChartExercise ? getCargaHistory(cargaChartExercise) : [];

  function showEmpty(msg){
    svg.style.display = "none";
    emptyEl.hidden = false;
    emptyEl.textContent = msg;
  }

  if(!cargaChartExercise){
    showEmpty("Nenhum exercício ativo na rotina ainda.");
    statsEl.innerHTML = "";
    return;
  }
  if(!hist.length){
    showEmpty('Ainda sem cargas registradas para "'+cargaChartExercise+'". Registre a carga ao concluir um treino pra ver o gráfico aqui.');
    statsEl.innerHTML = "";
    return;
  }

  const pesos = hist.map(h=>h.peso);
  const last = pesos[pesos.length-1];
  const pr = Math.max(...pesos);
  const first = pesos[0];
  const variacao = first>0 ? Math.round(((last-first)/first)*100) : 0;

  statsEl.innerHTML =
    '<div class="carga-chart-stat"><b>'+fmtKg(last)+' kg</b><span>Última</span></div>'+
    '<div class="carga-chart-stat"><b>'+fmtKg(pr)+' kg</b><span>Recorde</span></div>'+
    '<div class="carga-chart-stat"><b>'+(variacao>0?'+':'')+variacao+'%</b><span>Desde o início</span></div>'+
    '<div class="carga-chart-stat"><b>'+hist.length+'</b><span>Registros</span></div>';

  if(hist.length<2){
    showEmpty('Só há um registro ('+fmtKg(pesos[0])+' kg em '+fmtDateBR(hist[0].iso)+'). Registre mais treinos pra ver a curva de evolução.');
    return;
  }

  emptyEl.hidden = true;
  svg.style.display = "";
  const cutoffC = cargaPeriodo === "all" ? null : addDaysISO(todayISO(), -Number(cargaPeriodo));
  const vis = hist.filter(h=> !cutoffC || h.iso >= cutoffC);
  document.querySelectorAll("#carga-period button").forEach(b=>{ const on = b.dataset.p === cargaPeriodo; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on?"true":"false"); });
  const legendC = document.getElementById("carga-legend");
  if(vis.length < 2){
    showEmpty("Poucos registros neste período ("+vis.length+"). Escolha um período maior.");
    legendC.hidden = true;
    return;
  }
  const prVis = Math.max(...vis.map(h=>h.peso));
  const prIdx = vis.map(h=>h.peso).lastIndexOf(prVis);
  const bandas = deloadBandas(vis[0].iso, vis[vis.length-1].iso);
  drawLineChart(svg, [{
    label: "Carga", color: "var(--accent)",
    points: vis.map((pt,i)=> ({x:pt.iso, y:pt.peso, highlight: i===prIdx}))
  }], "kg", {digits:1, bands:bandas});
  legendC.hidden = !bandas.length;
  legendC.innerHTML = bandas.length ? '<span><i class="lg-band"></i>Semana de deload</span><span><i style="background:var(--good); height:8px; width:8px; border-radius:50%"></i>Recorde</span>' : "";
}

document.getElementById("carga-chart-select").addEventListener("change", (e)=>{
  cargaChartExercise = e.target.value || null;
  const it = allActiveExercises().find(x=> x.nome === cargaChartExercise);
  if(it) cargasAbertos.add(it.dia);   // v80: ao escolher no seletor, abre o dia do exercício
  renderCargas();
});

function renderCargas(){
  const el = document.getElementById("cargas-body");
  if(!el) return;
  const exList = allActiveExercises();
  updateCargaChartExercise(exList);
  populateCargaSelect(exList);
  renderCargaChart();

  const catsHtml = DAYS.map(key=>{
    const day = state.rotina[key];
    if(!day || !day.ativo || !(day.exercicios||[]).length) return "";
    const rows = day.exercicios.map(ex=>{
      const hist = getCargaHistory(ex.nome);
      const isSelected = ex.nome === cargaChartExercise;
      const nomeH = '<span class="carga-name">'+escapeHtml(ex.nome)+'</span>';
      if(!hist.length){
        return '<div class="carga-row sem-reg'+(isSelected?' selected':'')+'" data-ex="'+escapeHtml(ex.nome)+'"><div class="carga-head">'+nomeH+'</div>'+
          '<div class="carga-stats"><span class="hint">Sem registro ainda — a 1ª carga vira a sua referência.</span></div></div>';
      }
      const lastH = hist[hist.length-1], last = lastH.peso;
      const pr = Math.max(...hist.map(h=>h.peso));
      const prH = hist.filter(h=>h.peso===pr)[0];
      const ehPr = hist.length >= 2 && last >= pr;
      let trendHtml = hist.length >= 2 ? '<span class="carga-trend flat" title="Igual à sessão anterior">— estável</span>' : '';
      if(hist.length>=2){
        const prev = hist[hist.length-2].peso;
        if(last>prev) trendHtml = '<span class="carga-trend up" title="Em relação à sessão anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 19V5M5 12l7-7 7 7"/></svg>+'+fmtKg(last-prev)+' kg</span>';
        else if(last<prev) trendHtml = '<span class="carga-trend down" title="Em relação à sessão anterior"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>'+fmtKg(last-prev)+' kg</span>';
      }
      const pctPr = pr > 0 ? Math.min(100, Math.round(last/pr*100)) : 100;
      const barHtml = (hist.length >= 2 && !ehPr)
        ? '<div class="carga-pctr"><div class="carga-pctr-bar" role="img" aria-label="Última carga: '+pctPr+'% do recorde"><i style="width:'+pctPr+'%"></i></div><small>'+pctPr+'% do recorde</small></div>' : '';
      return '<div class="carga-row'+(isSelected?' selected':'')+(ehPr?' is-pr':'')+'" data-ex="'+escapeHtml(ex.nome)+'">'+
        '<div class="carga-head">'+nomeH+(ehPr?'<span class="carga-pr">'+ICON_TROPHY+'Recorde</span>':'')+trendHtml+'</div>'+
        '<div class="carga-body"><div class="carga-spark" aria-hidden="true">'+cargaSparklineHtml(hist)+'</div>'+
        '<div class="carga-stats">'+
          '<div class="carga-stat"><b>'+fmtKg(last)+' kg</b><span>Última · '+cargaQuando(lastH.iso)+'</span></div>'+
          '<div class="carga-stat"><b>'+fmtKg(pr)+' kg</b><span>Recorde · '+fmtDateBR(prH.iso)+'</span></div>'+
        '</div></div>'+barHtml+cargaMedalhasHtml(ex, lastH.iso)+'</div>';
    }).join("");
    const aberto = cargasAbertos.has(key);
    const nEx = day.exercicios.length;
    const nReg = day.exercicios.filter(ex=> getCargaHistory(ex.nome).length).length;
    return '<div class="carga-cat'+(aberto?' open':'')+'" data-dia="'+key+'">'+
      '<button type="button" class="carga-cat-btn" data-cargadia="'+key+'" aria-expanded="'+aberto+'" aria-controls="carga-rows-'+key+'">'+
        '<span class="carga-cat-txt"><span class="carga-cat-h">'+DAY_FULL[key]+' — '+escapeHtml(day.nome||"")+'</span>'+
        '<span class="carga-cat-sub">'+nEx+' exercício'+(nEx===1?'':'s')+' · '+nReg+' com carga registrada</span></span>'+
        '<span class="carga-cat-chev" aria-hidden="true">'+ICON_CHEVRON+'</span></button>'+
      '<div class="carga-cat-rows" id="carga-rows-'+key+'"'+(aberto?'':' hidden')+'>'+rows+'</div></div>';
  }).join("");
  const diasAtivos = DAYS.filter(k=> state.rotina[k] && state.rotina[k].ativo && (state.rotina[k].exercicios||[]).length);
  const todosAbertos = diasAtivos.length && diasAtivos.every(k=> cargasAbertos.has(k));
  el.innerHTML = catsHtml
    ? '<div class="carga-tools"><button type="button" class="btn small ghost" data-cargatudo="'+(todosAbertos?'fechar':'abrir')+'">'+(todosAbertos?'Recolher tudo':'Expandir tudo')+'</button></div>'+catsHtml
    : '<div class="hint">Nenhum exercício ativo na rotina ainda.</div>';
  el.querySelectorAll("[data-cargadia]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const k = btn.dataset.cargadia;
      const abre = !cargasAbertos.has(k);
      if(abre) cargasAbertos.add(k); else cargasAbertos.delete(k);
      const cat = btn.closest(".carga-cat");
      cat.classList.toggle("open", abre);
      btn.setAttribute("aria-expanded", String(abre));
      cat.querySelector(".carga-cat-rows").hidden = !abre;
      const tudo = el.querySelector("[data-cargatudo]");
      if(tudo){
        const todos = diasAtivos.every(d=> cargasAbertos.has(d));
        tudo.dataset.cargatudo = todos ? "fechar" : "abrir";
        tudo.textContent = todos ? "Recolher tudo" : "Expandir tudo";
      }
    });
  });
  const tudoBtn = el.querySelector("[data-cargatudo]");
  if(tudoBtn) tudoBtn.addEventListener("click", ()=>{
    if(tudoBtn.dataset.cargatudo === "abrir") diasAtivos.forEach(k=> cargasAbertos.add(k)); else cargasAbertos.clear();
    renderCargas();
    const nb = el.querySelector("[data-cargatudo]"); if(nb) nb.focus();
  });
  el.querySelectorAll(".carga-row[data-ex]").forEach(row=>{
    row.addEventListener("click", ()=>{
      cargaChartExercise = row.dataset.ex;
      renderCargas();
    });
  });
}

function mondayOfISO(iso){
  const idx = DAYS.indexOf(dayKeyFromISO(iso));
  return addDaysISO(iso, -idx);
}

let constanciaWeeks = 8;
document.querySelectorAll("#constancia-period button").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    constanciaWeeks = Number(btn.dataset.weeks);
    document.querySelectorAll("#constancia-period button").forEach(b=> b.classList.toggle("active", b===btn));
    renderHeatmap();
  });
});

/* NG+ — Constância em visão de MÊS (calendário). Só leitura: usa rotina, check-ins e congelamentos que o app já calcula. */
let constanciaModo = "semanas";     // "semanas" | "mes"
let calMesIso = null;                // 1º dia do mês exibido (AAAA-MM-01)
let calDiaSel = null;
const CAL_MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
function calPrimeiroDiaDoMes(iso){ return iso.slice(0,7)+"-01"; }
function calMesMais(iso, n){
  const d = new Date(iso.slice(0,7)+"-01T00:00:00");
  d.setMonth(d.getMonth()+n);
  return fmtDateISO(d);
}
function calDiasNoMes(iso){
  const d = new Date(iso.slice(0,7)+"-01T00:00:00");
  return new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
}
// estado de um dia: feito | leve | gelo | pulou | descanso | hoje | futuro | antes
function calEstado(iso, ctx){
  if(iso < ctx.start) return "antes";
  const key = dayKeyFromISO(iso);
  const ativo = !!(state.rotina[key] && state.rotina[key].ativo);
  const c = state.checkins[iso];
  if(c && c.concluido) return c.leve ? "leve" : "feito";
  if(iso > ctx.today) return ativo ? "futuro" : "descanso";
  if(ctx.gelo.indexOf(iso) >= 0) return "gelo";
  if(iso === ctx.today) return ativo ? "hoje" : "descanso";
  return ativo ? "pulou" : "descanso";
}
const CAL_GLIFO = {feito:"✓", leve:"½", gelo:"❄", pulou:"–", hoje:"○", descanso:"", futuro:"", antes:""};
const CAL_TXT = {feito:"treino concluído", leve:"dia leve (mantém a sequência)", gelo:"congelamento protegeu a sequência", pulou:"treino não registrado", hoje:"hoje, treino ainda em aberto", descanso:"dia de descanso", futuro:"treino agendado", antes:"antes do seu cadastro"};
function calDescricao(iso, est){
  const key = dayKeyFromISO(iso);
  const d = state.rotina[key];
  const nome = d && d.ativo && d.nome ? " · "+d.nome : "";
  const hab = habDe(iso);
  const hp = [];
  if(hab){
    if(hab.sono != null) hp.push(String(hab.sono).replace(".", ",")+" h de sono");
    if(hab.passos != null) hp.push(num(hab.passos,0)+" passos");
    if(hab.cardio != null) hp.push(hab.cardio+" min de cárdio");
    if(hab.agua != null) hp.push(String(hab.agua).replace(".", ",")+" L de água");
  }
  return DAY_FULL[key]+", "+fmtDateBR(iso)+": "+CAL_TXT[est]+nome+(hp.length ? ". Hábitos: "+hp.join(", ")+"." : ".");
}
function renderCalendario(){
  const box = document.getElementById("constancia-mes");
  const title = document.getElementById("constancia-title");
  if(!box) return;
  const today = todayISO(), start = getTrackingStartISO();
  const mesAtual = calPrimeiroDiaDoMes(today);
  const mesInicio = calPrimeiroDiaDoMes(start);
  if(!calMesIso) calMesIso = mesAtual;
  if(calMesIso > mesAtual) calMesIso = mesAtual;
  if(calMesIso < mesInicio) calMesIso = mesInicio;
  const ctx = {today:today, start:start, gelo:computeStreakEngine().freezeUsedDates};
  const nomeMes = CAL_MESES[Number(calMesIso.slice(5,7))-1]+" de "+calMesIso.slice(0,4);
  if(title) title.textContent = "Constância — "+nomeMes;
  const hint = document.getElementById("constancia-hint");
  if(hint) hint.textContent = "Toque num dia para ver detalhes";
  const n = calDiasNoMes(calMesIso);
  const lead = DAYS.indexOf(dayKeyFromISO(calMesIso));
  let feitos = 0, agend = 0;
  const cells = [];
  for(let i = 0; i < lead; i++) cells.push('<span class="cal-vazio" aria-hidden="true"></span>');
  for(let dia = 1; dia <= n; dia++){
    const iso = calMesIso.slice(0,8)+pad2(dia);
    const est = calEstado(iso, ctx);
    if(iso >= start && iso <= today){
      const ativo = !!(state.rotina[dayKeyFromISO(iso)] && state.rotina[dayKeyFromISO(iso)].ativo);
      const c = state.checkins[iso];
      if(ativo || (c && c.concluido)){ agend++; if(c && c.concluido) feitos++; }
    }
    cells.push('<button type="button" class="cal-d st-'+est+(iso === today ? ' hoje' : '')+(iso === calDiaSel ? ' sel' : '')+'" data-iso="'+iso+'" aria-label="'+escapeHtml(calDescricao(iso, est))+'" aria-pressed="'+(iso === calDiaSel ? "true" : "false")+'">'+
      '<span class="cal-n">'+dia+'</span><span class="cal-g" aria-hidden="true">'+CAL_GLIFO[est]+'</span></button>');
  }
  const pct = agend ? Math.round(feitos/agend*100) : null;
  box.innerHTML =
    '<div class="cal-nav">'+
      '<button type="button" class="cal-nav-btn" data-cal="-1" aria-label="Mês anterior"'+(calMesIso <= mesInicio ? ' disabled' : '')+'>‹</button>'+
      '<strong class="cal-titulo" aria-live="polite">'+nomeMes+'</strong>'+
      '<button type="button" class="cal-nav-btn" data-cal="1" aria-label="Próximo mês"'+(calMesIso >= mesAtual ? ' disabled' : '')+'>›</button>'+
    '</div>'+
    '<div class="cal-sem" aria-hidden="true">'+DAYS.map(k=>'<span>'+DAY_LABEL[k]+'</span>').join("")+'</div>'+
    '<div class="cal-grid">'+cells.join("")+'</div>'+
    '<div class="cal-resumo">'+(pct == null ? 'Sem treinos agendados neste mês até hoje.' : '<b>'+feitos+' de '+agend+'</b> treinos concluídos neste mês ('+pct+'%).')+'</div>'+
    '<div class="cal-det" id="cal-det" role="status" aria-live="polite">'+(calDiaSel && calDiaSel.slice(0,7) === calMesIso.slice(0,7) ? escapeHtml(calDescricao(calDiaSel, calEstado(calDiaSel, ctx))) : 'Toque num dia para ver o que aconteceu nele.')+'</div>'+
    '<ul class="cal-leg">'+
      ['feito','leve','gelo','pulou','hoje','descanso'].map(k=>'<li><span class="cal-key st-'+k+'" aria-hidden="true">'+CAL_GLIFO[k]+'</span>'+({feito:"Concluído",leve:"Dia leve",gelo:"Congelamento",pulou:"Sem registro",hoje:"Hoje (em aberto)",descanso:"Descanso"})[k]+'</li>').join("")+
    '</ul>';
}
function renderHeatmap(){
  if(constanciaModo === "mes") renderCalendario(); else renderHeatmapSemanas();
}
(function setupCalendario(){
  const modo = document.getElementById("constancia-modo");
  const mes = document.getElementById("constancia-mes");
  const sems = document.getElementById("constancia-semanas");
  if(!modo || !mes || !sems) return;
  modo.addEventListener("click", (ev)=>{
    const b = ev.target.closest("button[data-modo]"); if(!b) return;
    constanciaModo = b.dataset.modo;
    modo.querySelectorAll("button").forEach(x=>{ const on = x === b; x.classList.toggle("active", on); x.setAttribute("aria-pressed", on ? "true" : "false"); });
    sems.hidden = constanciaModo === "mes";
    mes.hidden = constanciaModo !== "mes";
    const hint = document.getElementById("constancia-hint");
    if(constanciaModo !== "mes" && hint) hint.textContent = "Cada barra é uma semana";
    renderHeatmap();
  });
  mes.addEventListener("click", (ev)=>{
    const nav = ev.target.closest("button[data-cal]");
    if(nav){ if(nav.disabled) return; calMesIso = calMesMais(calMesIso || calPrimeiroDiaDoMes(todayISO()), Number(nav.dataset.cal)); calDiaSel = null; renderCalendario(); return; }
    const d = ev.target.closest("button[data-iso]");
    if(d){ calDiaSel = d.dataset.iso; renderCalendario(); const again = mes.querySelector('button[data-iso="'+calDiaSel+'"]'); if(again) again.focus({preventScroll:true}); }
  });
})();
function renderHeatmapSemanas(){
  const wrap = document.getElementById("heatmap");
  const title = document.getElementById("constancia-title");
  const weeks = constanciaWeeks;
  wrap.classList.toggle("dense", weeks>8);
  if(title) title.textContent = "Constância — últimas "+weeks+" semanas";
  wrap.innerHTML = "";
  const today = todayISO();
  const trackStart = getTrackingStartISO();
  const thisMonday = mondayOfISO(today);
  const gridStart = addDaysISO(thisMonday, -7*(weeks-1)); // (weeks-1) semanas antes da semana atual = `weeks` colunas no total

  for(let w=0; w<weeks; w++){
    const weekStart = addDaysISO(gridStart, w*7);
    const weekEnd = addDaysISO(weekStart, 6);
    const effStart = weekStart < trackStart ? trackStart : weekStart;
    const effEnd = weekEnd > today ? today : weekEnd;

    let pct = null, done = 0, total = 0;
    if(effStart <= effEnd){
      let iso = effStart;
      while(iso <= effEnd){
        const key = treinoKey(iso);
        if(state.rotina[key]?.ativo){
          total++;
          if(state.checkins[iso]?.concluido) done++;
        }
        iso = addDaysISO(iso, 1);
      }
      if(total>0) pct = Math.round((done/total)*100);
    }

    const wrapCol = document.createElement("div");
    wrapCol.className = "heatc-bar-wrap";
    if(pct==null){
      wrapCol.title = weekStart < trackStart ? "Semana de "+fmtDateBR(weekStart)+" — antes do seu cadastro" : "Semana de "+fmtDateBR(weekStart)+" — sem treinos planejados ainda";
      wrapCol.innerHTML = '<div class="heatc-bar na" style="height:100%;"></div><span class="heatc-lbl">S'+(w+1)+'</span>';
    } else {
      const cls = pct<70 ? "heatc-bar low" : "heatc-bar";
      wrapCol.title = "Semana de "+fmtDateBR(weekStart)+" — "+done+"/"+total+" treinos concluídos ("+pct+"%)";
      wrapCol.innerHTML = '<span class="heatc-pct">'+pct+'%</span><div class="'+cls+'" style="height:'+Math.max(pct,4)+'%;"></div><span class="heatc-lbl">S'+(w+1)+'</span>';
    }
    wrap.appendChild(wrapCol);
  }
}

/* ---- editor de rotina ---- */
document.getElementById("btn-edit-rotina").addEventListener("click", openRotinaEditor);
function openRotinaEditor(){
  let draft = JSON.parse(JSON.stringify(state.rotina));
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>Editar rotina</h2>'+
    '<div class="sub">Personalize o treino e os exercícios de cada dia da semana.</div>'+
    '<div class="rotina-template-row">'+
      '<select id="rotina-template-select">'+
        '<option value="">Começar de um modelo…</option>'+
        Object.keys(ROTINA_TEMPLATES).map(k=>'<option value="'+k+'">'+escapeHtml(ROTINA_TEMPLATES[k].label)+'</option>').join("")+
      '</select>'+
      '<button class="btn small ghost" type="button" id="rotina-template-apply">Aplicar modelo</button>'+
    '</div>'+
    '<div class="hint u-mb12" id="rotina-template-desc"></div>'+
    '<div id="rotina-editor-days" class="u-col14"></div>'+
    '<div class="modal-actions"><button class="btn" id="rotina-cancel">Cancelar</button><button class="btn primary" id="rotina-save">Salvar rotina</button></div>';
  openModal(body);

  const daysWrap = body.querySelector("#rotina-editor-days");

  function buildDaySection(key, d){
    const section = document.createElement("div");
    section.style.cssText = "border:1px solid var(--line); border-radius:10px; padding:10px;";
    section.dataset.key = key;
    section.innerHTML =
      '<div style="display:flex; gap:var(--sp-2); align-items:center; margin-bottom:var(--sp-2); flex-wrap:wrap;">'+
        '<strong style="font-family:Barlow Condensed; font-size:var(--fs-base); width:70px;">'+DAY_FULL[key]+'</strong>'+
        '<input type="text" class="d-nome" value="'+escapeHtml(d.nome||"")+'" placeholder="Nome do treino" style="flex:1; min-width:120px;">'+
        '<label style="flex-direction:row; align-items:center; gap:5px; font-weight:500;"><input type="checkbox" class="d-ativo" '+(d.ativo?"checked":"")+' style="width:auto;"> Dia de treino</label>'+
      '</div>'+
      '<div class="ex-rows u-col8"></div>'+
      '<button class="btn small ghost add-ex u-mt6" type="button">+ exercício</button>';
    daysWrap.appendChild(section);
    const rowsWrap = section.querySelector(".ex-rows");
    function addExRow(ex){
      ex = ex || {nome:"",series:3,reps:"",metaReps:0,musculos:[],nota:""};
      const entry = document.createElement("div");
      entry.className = "ex-entry";
      const row = document.createElement("div");
      row.className = "ex-row";
      row.innerHTML =
        '<input type="text" class="ex-nome" value="'+escapeHtml(ex.nome)+'" placeholder="Exercício">'+
        '<input type="number" min="1" max="20" class="ex-series" value="'+ex.series+'" title="séries">'+
        '<input type="text" class="ex-reps" value="'+escapeHtml(String(ex.reps))+'" placeholder="reps">'+
        '<input type="number" min="0" max="300" class="ex-meta" value="'+(ex.metaReps||0)+'" title="meta de reps totais (quest)" placeholder="meta">'+
        '<button type="button" class="icon-btn ex-remove"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
      const chipsWrap = document.createElement("div");
      chipsWrap.className = "muscle-chips";
      const musculosSet = new Set(ex.musculos||[]);
      MUSCLE_ORDER.forEach(m=>{
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "muscle-chip" + (musculosSet.has(m)?" on":"");
        chip.textContent = MUSCLE_LANDMARKS[m].label;
        chip.dataset.muscle = m;
        chip.addEventListener("click", ()=> chip.classList.toggle("on"));
        chipsWrap.appendChild(chip);
      });
      const notaInput = document.createElement("input");
      notaInput.type = "text";
      notaInput.className = "ex-nota";
      notaInput.placeholder = "Dica técnica (opcional) — ex.: cotovelos a 45°, não trancar no topo";
      notaInput.value = ex.nota || "";
      notaInput.style.cssText = "width:100%; font-size:var(--fs-xs); margin-top:2px;";
      entry.appendChild(row);
      entry.appendChild(chipsWrap);
      entry.appendChild(notaInput);
      row.querySelector(".ex-remove").addEventListener("click", ()=> entry.remove());
      rowsWrap.appendChild(entry);
    }
    (d.exercicios||[]).forEach(addExRow);
    section.querySelector(".add-ex").addEventListener("click", ()=> addExRow());
  }

  function renderDays(){
    daysWrap.innerHTML = "";
    DAYS.forEach(key=> buildDaySection(key, draft[key]));
  }
  renderDays();

  const templateSelect = body.querySelector("#rotina-template-select");
  const templateDesc = body.querySelector("#rotina-template-desc");
  templateSelect.addEventListener("change", ()=>{
    const t = ROTINA_TEMPLATES[templateSelect.value];
    templateDesc.textContent = t ? t.desc : "";
  });
  body.querySelector("#rotina-template-apply").addEventListener("click", ()=>{
    const t = ROTINA_TEMPLATES[templateSelect.value];
    if(!t){ showToast("Escolha um modelo para aplicar."); return; }
    draft = t.build();
    renderDays();
    showToast('Modelo "'+t.label+'" aplicado. Revise os exercícios e confirme em "Salvar rotina".');
  });

  body.querySelector("#rotina-cancel").addEventListener("click", closeModal);
  body.querySelector("#rotina-save").addEventListener("click", async ()=>{
    const sections = daysWrap.querySelectorAll("[data-key]");
    const promises = [];
    sections.forEach(sec=>{
      const key = sec.dataset.key;
      const nome = sec.querySelector(".d-nome").value.trim() || DAY_FULL[key];
      const ativo = sec.querySelector(".d-ativo").checked;
      const exercicios = [...sec.querySelectorAll(".ex-entry")].map(entry=>{
        const row = entry.querySelector(".ex-row");
        const musculos = [...entry.querySelectorAll(".muscle-chip.on")].map(c=>c.dataset.muscle);
        const nota = entry.querySelector(".ex-nota").value.trim();
        return {
          nome: row.querySelector(".ex-nome").value.trim(),
          series: Number(row.querySelector(".ex-series").value) || 1,
          reps: row.querySelector(".ex-reps").value.trim(),
          metaReps: Number(row.querySelector(".ex-meta").value) || 0,
          musculos,
          nota
        };
      }).filter(e=>e.nome);
      const dayData = {nome, ativo, exercicios};
      state.rotina[key] = dayData;
      promises.push(saveDoc("rotina/"+key, dayData));
    });
    state.rotinaIsExample = false;
    closeModal();
    render();
    microReward();
    await Promise.all(promises);
    showToast("Rotina salva.");
  });
}

/* ============================================================
   RENDER: CORPO
   ============================================================ */
const PERFIL_ICONS = {
  genero: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/></svg>',
  idade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  altura: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/></svg>',
  atividade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>',
  meta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".5" fill="currentColor"/></svg>',
};
// legado, sem uso — mantido por segurança (linhas em grid com ícone grande)
function perfilIconRow(icon, label, value, unit){
  return '<div class="perfil-icon-row"><div class="perfil-ic">'+icon+'</div><div class="perfil-txt"><span>'+label+'</span><b>'+value+(unit?" "+unit:"")+'</b></div></div>';
}
function perfilRow(icon, label, value, accent){
  return '<div class="perfil-row"><span class="k">'+icon+label+'</span><span class="v'+(accent?' accent':'')+'">'+value+'</span></div>';
}
function perfilInitials(nome){
  const parts = String(nome||"").trim().split(/\s+/).filter(Boolean);
  if(!parts.length) return "—";
  const first = parts[0][0]||"";
  const last = parts.length>1 ? parts[parts.length-1][0] : "";
  return (first+last).toUpperCase();
}
/* ---- foto de perfil: reduzida no próprio aparelho (quadrado 256 px, JPEG) e guardada no documento config/perfil (campo fotoPerfil) ---- */
const FOTO_PERFIL_RE = /^data:image\/jpeg;base64,[A-Za-z0-9+\/=]{20,200000}$/;
function fotoPerfilValida(v){ return typeof v === "string" && FOTO_PERFIL_RE.test(v) ? v : null; }
function fotoPerfilImg(src){
  const img = document.createElement("img");
  img.src = src; img.alt = ""; img.decoding = "async"; img.draggable = false;
  img.className = "foto-perfil-img";
  return img;
}
/* mostra a foto (ou as iniciais) dentro de um avatar */
function pintaAvatar(el, p, iniciais){
  if(!el) return;
  const foto = p ? fotoPerfilValida(p.fotoPerfil) : null;
  el.classList.toggle("has-foto", !!foto);
  el.textContent = "";
  if(foto) el.appendChild(fotoPerfilImg(foto));
  else el.textContent = iniciais;
}
function reduzFotoPerfil(file){
  return new Promise((ok, falha)=>{
    if(!file || !/^image\//.test(file.type || "")){ falha(new Error("tipo")); return; }
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = ()=>{
      try{
        const lado = Math.min(img.naturalWidth, img.naturalHeight);
        if(!lado){ throw new Error("vazia"); }
        const T = 256, cv = document.createElement("canvas"); cv.width = T; cv.height = T;
        const cx = cv.getContext("2d");
        cx.fillStyle = "#fff"; cx.fillRect(0, 0, T, T);
        cx.drawImage(img, (img.naturalWidth - lado)/2, (img.naturalHeight - lado)/2, lado, lado, 0, 0, T, T);   // recorte quadrado centralizado
        let q = .85, out = cv.toDataURL("image/jpeg", q);
        while(out.length > 60000 && q > .4){ q -= .1; out = cv.toDataURL("image/jpeg", q); }
        URL.revokeObjectURL(url);
        out.length > 100000 || !fotoPerfilValida(out) ? falha(new Error("grande")) : ok(out);
      }catch(e){ URL.revokeObjectURL(url); falha(e); }
    };
    img.onerror = ()=>{ URL.revokeObjectURL(url); falha(new Error("decodifica")); };
    img.src = url;
  });
}
function renderPerfilSummary(){
  const el = document.getElementById("perfil-summary");
  const header = document.getElementById("perfil-header-name");
  const metaEl = document.getElementById("perfil-hero-meta");
  const avatarEl = document.getElementById("perfil-avatar-initials");
  const createdEl = document.getElementById("perfil-created");
  const p = state.perfil;
  if(!p){
    el.innerHTML = emptyState("user","Complete seu cadastro","Com altura, peso e objetivo o app calcula metas, dieta e composição corporal.",{go:"perfil",label:"Completar perfil"});
    if(header) header.textContent = "Seu perfil";
    if(metaEl) metaEl.textContent = "Complete seu cadastro para começar.";
    if(avatarEl){ avatarEl.textContent = "—"; avatarEl.removeAttribute("style"); }
    if(createdEl) createdEl.hidden = true;
    return;
  }
  if(header) header.textContent = p.nomeCompleto || "Seu perfil";
  const lvl = ACTIVITY_LEVELS.find(l=>l.v===p.nivelAtividade);
  if(metaEl){
    metaEl.textContent = (p.nomeUsuario?("@"+p.nomeUsuario+" · "):"") + sexoLabel(p.sexo) + " · " + (lvl?lvl.label:"Sedentário");
  }
  if(avatarEl){
    pintaAvatar(avatarEl, p, perfilInitials(p.nomeCompleto));
    const tierColor = "var(--t"+(computeNivelInfo().tierIndex+1)+")";
    avatarEl.style.borderColor = tierColor;
    avatarEl.style.color = tierColor;
    avatarEl.style.background = "color-mix(in srgb, "+tierColor+" 16%, var(--surface-2))";
    avatarEl.style.boxShadow = "0 0 0 3px color-mix(in srgb, "+tierColor+" 25%, transparent), 0 0 12px 1px color-mix(in srgb, "+tierColor+" 45%, transparent)";
  }
  el.innerHTML =
    perfilRow(PERFIL_ICONS.genero, "Gênero para cálculo", sexoLabel(p.sexo)) +
    perfilRow(PERFIL_ICONS.idade, "Idade", p.idade+" anos") +
    perfilRow(PERFIL_ICONS.altura, "Altura", num(p.alturaCm,0)+" cm") +
    perfilRow(PERFIL_ICONS.atividade, "Nível de atividade", lvl?lvl.label:"Sedentário") +
    perfilRow(PERFIL_ICONS.meta, "Foco corporal", focoNomes(p).join(" e ") || "—") +
    (p.experiencia || p.diasSemana || p.local ? perfilRow(PERFIL_ICONS.meta, "Treino", [labelDe(OB_EXPERIENCIA,p.experiencia), p.diasSemana ? p.diasSemana+"×/semana" : "", labelDe(OB_LOCAL,p.local)].filter(Boolean).join(" · ")) : "") +
    perfilRow(PERFIL_ICONS.meta, "Meta de peso", p.pesoMetaKg?(num(p.pesoMetaKg,1)+" kg"):"—", true);
  if(createdEl){
    if(p.criadoEm){ createdEl.hidden = false; createdEl.textContent = "cadastro criado em "+p.criadoEm; }
    else createdEl.hidden = true;
  }
}
document.getElementById("btn-edit-perfil").addEventListener("click", openPerfilEditor);

function openPerfilEditor(){
  const p = state.perfil || {nomeCompleto:"", nomeUsuario:"", sexo:null, idade:"", alturaCm:175, ativo:true, nivelAtividade:"moderado", objetivo:"manutencao", pesoMetaKg:null};
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>Editar perfil</h2>'+
    '<div class="sub">Usado nos cálculos de IMC, RCQ, % de gordura e necessidades calóricas.</div>'+
    '<div class="grid u-gap12">'+
      '<div class="foto-edit" id="p-foto-box"><div class="perfil-avatar foto-edit-prev" id="p-foto-prev" aria-hidden="true"></div>'+
        '<div class="foto-edit-txt"><b>Foto de perfil <span class="skins-hint">— opcional</span></b>'+
          '<span class="field-hint">Aparece no seu perfil e no topo do app. A foto é reduzida no seu aparelho e guardada só na sua conta.</span>'+
          '<div class="foto-edit-acoes"><button type="button" class="btn small" id="p-foto-escolher">Escolher foto</button><button type="button" class="btn small ghost" id="p-foto-remover" hidden>Remover</button></div>'+
          '<input type="file" id="p-foto-arq" accept="image/*" hidden>'+
          '<div class="foco-msg" id="p-foto-msg" role="status" aria-live="polite"></div></div></div>'+
      '<label>Nome completo<input type="text" id="p-nome"></label>'+
      '<label>Nome de usuário<input type="text" id="p-usuario"></label>'+
      '<div class="field-row">'+
        '<label>Gênero para cálculo<select id="p-sexo"><option value="M">Masculino</option><option value="F">Feminino</option><option value="N">Prefiro não informar</option></select></label>'+
        '<label>Idade<input type="number" id="p-idade" inputmode="numeric" min="'+IDADE_MIN+'" max="'+IDADE_MAX+'" step="1"></label>'+
      '</div>'+
      '<label>Altura (em centímetros)<input type="number" id="p-altura" min="100" max="230" step="any" inputmode="decimal" placeholder="ex.: 152"></label>'+
      '<div class="field-row">'+
        '<label>Experiência<select id="p-exp"><option value="">Não informado</option>'+OB_EXPERIENCIA.map(o=>'<option value="'+o.v+'">'+o.t+'</option>').join("")+'</select></label>'+
        '<label>Dias de treino<select id="p-dias"><option value="">Não informado</option>'+OB_DIAS.map(o=>'<option value="'+o.v+'">'+o.t+' por semana</option>').join("")+'</select></label>'+
      '</div>'+
      '<label>Onde treina<select id="p-local"><option value="">Não informado</option>'+OB_LOCAL.map(o=>'<option value="'+o.v+'">'+o.t+'</option>').join("")+'</select></label>'+
      '<label>Você é fisicamente ativo?<div class="seg u-mt2" id="p-seg-ativo"><button type="button" data-v="sim">Sim</button><button type="button" data-v="nao">Não</button></div></label>'+
      '<label id="p-nivel-wrap">Nível de atividade<select id="p-atividade"></select><span class="field-hint" id="p-atividade-desc" aria-live="polite"></span></label>'+
      '<label>Peso meta (kg) — opcional<input type="number" step="0.1" id="p-meta"></label>'+
      '<div><div class="skins-label">Foco corporal <span class="skins-hint">— obrigatório: até 2, ou Corpo todo'+tipBtn("foco")+'</span></div><div id="p-foco"></div><div class="foco-msg" id="p-foco-msg" aria-live="polite"></div></div>'+
    '</div>'+
    '<div class="foot-note u-err" id="p-erro" role="alert"></div>'+
    '<div class="modal-actions"><button class="btn" id="p-cancel">Cancelar</button><button class="btn primary" id="p-save">Salvar perfil</button></div>';
  openModal(body);
  body.querySelector("#p-nome").value = p.nomeCompleto || "";
  body.querySelector("#p-usuario").value = p.nomeUsuario || "";
  body.querySelector("#p-sexo").value = sexoValido(p.sexo) ? p.sexo : "N";
  body.querySelector("#p-idade").value = p.idade;
  body.querySelector("#p-exp").value = p.experiencia || "";
  body.querySelector("#p-dias").value = p.diasSemana ? String(p.diasSemana) : "";
  body.querySelector("#p-local").value = p.local || "";
  body.querySelector("#p-altura").value = p.alturaCm;
  body.querySelector("#p-meta").value = p.pesoMetaKg || "";
  const sel = body.querySelector("#p-atividade");
  sel.innerHTML = ACTIVITY_LEVELS.filter(l=>l.v!=="sedentario").map(l=>'<option value="'+l.v+'">'+l.label+'</option>').join("");   // só o nome na lista (a descrição longa aparece abaixo e quebra linha, sem alargar o formulário)
  sel.value = (p.nivelAtividade && p.nivelAtividade!=="sedentario") ? p.nivelAtividade : "leve";
  const descAtv = body.querySelector("#p-atividade-desc");
  const syncDescAtv = ()=>{ const l = ACTIVITY_LEVELS.find(x=>x.v===sel.value); descAtv.textContent = l ? l.desc : ""; };
  sel.addEventListener("change", syncDescAtv); syncDescAtv();
  const segAtivo = body.querySelector("#p-seg-ativo");
  const nivelWrap = body.querySelector("#p-nivel-wrap");
  let ativoVal = p.ativo !== false && p.nivelAtividade !== "sedentario";
  function syncAtivoUI(){
    segAtivo.querySelectorAll("button").forEach(b=> b.classList.toggle("active", (b.dataset.v==="sim")===ativoVal));
    nivelWrap.hidden = !ativoVal;
  }
  segAtivo.querySelectorAll("button").forEach(b=>{
    b.addEventListener("click", ()=>{ ativoVal = b.dataset.v==="sim"; syncAtivoUI(); });
  });
  syncAtivoUI();
  let fotoSel = fotoPerfilValida(p.fotoPerfil);
  const fotoPrev = body.querySelector("#p-foto-prev"), fotoRem = body.querySelector("#p-foto-remover"), fotoMsg = body.querySelector("#p-foto-msg"), fotoArq = body.querySelector("#p-foto-arq");
  function syncFoto(){
    pintaAvatar(fotoPrev, {fotoPerfil:fotoSel}, perfilInitials(body.querySelector("#p-nome").value || p.nomeCompleto));
    fotoRem.hidden = !fotoSel;
    body.querySelector("#p-foto-escolher").textContent = fotoSel ? "Trocar foto" : "Escolher foto";
  }
  body.querySelector("#p-foto-escolher").addEventListener("click", ()=> fotoArq.click());
  fotoRem.addEventListener("click", ()=>{ fotoSel = null; fotoMsg.textContent = "Foto removida. Salve o perfil para confirmar."; syncFoto(); });
  fotoArq.addEventListener("change", async ()=>{
    const f = fotoArq.files && fotoArq.files[0]; fotoArq.value = "";
    if(!f) return;
    fotoMsg.textContent = "Preparando a foto…";
    try{ fotoSel = await reduzFotoPerfil(f); fotoMsg.textContent = "Foto pronta. Salve o perfil para confirmar."; }
    catch(e){ fotoMsg.textContent = "Não consegui usar esse arquivo. Tente uma foto JPG, PNG ou WebP."; }
    syncFoto();
  });
  body.querySelector("#p-nome").addEventListener("input", ()=>{ if(!fotoSel) syncFoto(); });
  syncFoto();
  const focoSel = focosDoPerfil(p).slice();
  const pFoco = body.querySelector("#p-foco");
  pFoco.innerHTML = focoChipsHtml(focoSel);
  wireFocoChips(pFoco, focoSel, msg=>{ body.querySelector("#p-foco-msg").textContent = msg; body.querySelector("#p-erro").textContent = ""; });

  body.querySelector("#p-cancel").addEventListener("click", closeModal);
  body.querySelector("#p-save").addEventListener("click", ()=>{
    const idadeN = parseNumPt(body.querySelector("#p-idade").value);
    const idadeOk = isFinite(idadeN) && idadeN === Math.floor(idadeN) && idadeN <= IDADE_MAX && (idadeN >= IDADE_MIN || idadeN === Number(p.idade));   // perfil antigo com idade menor que o mínimo continua salvável sem mexer na idade
    if(!idadeOk){
      body.querySelector("#p-erro").textContent = !isFinite(idadeN) ? "Informe sua idade, só com números." : idadeN < IDADE_MIN ? "O app é para quem tem "+IDADE_MIN+" anos ou mais." : "Informe uma idade inteira entre "+IDADE_MIN+" e "+IDADE_MAX+" anos.";
      body.querySelector("#p-idade").setAttribute("aria-invalid","true"); body.querySelector("#p-idade").focus();
      return;
    }
    body.querySelector("#p-idade").removeAttribute("aria-invalid");
    const altN = normalizarAlturaCm(body.querySelector("#p-altura").value);
    if(!altN.cm || altN.cm < 100 || altN.cm > 230){
      body.querySelector("#p-erro").textContent = "Altura em centímetros, entre 100 e 230 (por exemplo, 152).";
      body.querySelector("#p-altura").focus();
      return;
    }
    if(!focoSel.length){
      body.querySelector("#p-erro").textContent = "Escolha o seu foco corporal: até 2 grupos ou Corpo todo.";
      const alvoF = body.querySelector("#p-foco .foco-chip"); if(alvoF){ alvoF.focus({preventScroll:true}); alvoF.scrollIntoView({block:"center", behavior:"auto"}); }
      return;
    }
    const data = {
      nomeCompleto: body.querySelector("#p-nome").value.trim() || (p.nomeCompleto||""),
      nomeUsuario: body.querySelector("#p-usuario").value.trim() || (p.nomeUsuario||""),
      sexo: sexoValido(body.querySelector("#p-sexo").value) ? body.querySelector("#p-sexo").value : null,
      idade: idadeN,
      alturaCm: altN.cm,
      ativo: ativoVal,
      nivelAtividade: ativoVal ? sel.value : "sedentario",
      objetivo: objetivoParaIdade(p.objetivo || "manutencao", idadeN),   // v98 F3: ao salvar com menos de 18 anos, emagrecimento vira manutenção
      pesoMetaKg: body.querySelector("#p-meta").value ? Number(body.querySelector("#p-meta").value) : null,
      criadoEm: p.criadoEm || todayISO(),
      focos: focoSel.slice(0,2),
    };
    if(fotoSel) data.fotoPerfil = fotoSel;
    const expV = body.querySelector("#p-exp").value, diasV = body.querySelector("#p-dias").value, locV = body.querySelector("#p-local").value;
    if(expV) data.experiencia = expV;
    if(diasV) data.diasSemana = Number(diasV);
    if(locV) data.local = locV;
    state.perfil = data;
    ajustarRotinaExemplo();
    closeModal();
    render();
    saveDoc("config/perfil", data);
    showToast("Perfil salvo.");
  });
}

/* v91 U6 — validação das medições. Duas camadas:
   1) faixa possível (erro, bloqueia): mensagem em português ao lado do campo, sem o balão nativo do navegador;
   2) valor fora da curva (aviso, o usuário decide): salto grande contra a última medição recente. */
const MED_CAMPOS = [
  {id:"m-peso",    nome:"Peso",     un:"kg", min:20, max:400, key:"pesoKg",    salto:4},
  {id:"m-cintura", nome:"Cintura",  un:"cm", min:30, max:250, key:"cinturaCm", salto:8, opt:true},
  {id:"m-quadril", nome:"Quadril",  un:"cm", min:30, max:250, key:"quadrilCm", salto:8, opt:true},
  {id:"m-pescoco", nome:"Pescoço",  un:"cm", min:15, max:100, key:"pescocoCm", salto:4, opt:true},
];
let medConfirmSig = null;
function campoErro(inp, msg){
  const wrap = inp.closest(".field-ic-group") || inp.parentElement;
  let err = document.getElementById(inp.id+"-err");
  if(!err){ err = document.createElement("div"); err.className = "field-err"; err.id = inp.id+"-err"; err.hidden = true; wrap.appendChild(err); }
  if(msg){
    err.textContent = msg; err.hidden = false;
    inp.setAttribute("aria-invalid","true"); inp.setAttribute("aria-describedby", err.id);
  } else {
    err.textContent = ""; err.hidden = true;
    inp.removeAttribute("aria-invalid"); inp.removeAttribute("aria-describedby");
  }
}
function medAviso(msgs, onForcar, onCorrigir){
  const box = document.getElementById("medicao-aviso");
  if(!box) return;
  if(!msgs){ box.hidden = true; box.innerHTML = ""; return; }
  box.innerHTML = '<div class="med-aviso-head">'+ic("alert")+'<span>Confira antes de salvar</span></div>'+
    '<ul>'+msgs.map(m=>'<li>'+escapeHtml(m)+'</li>').join("")+'</ul>'+
    '<div class="med-aviso-act"><button type="button" class="btn small" data-med-corrigir>Corrigir</button><button type="button" class="btn small primary" data-med-forcar>Salvar mesmo assim</button></div>';
  box.hidden = false;
  box.querySelector("[data-med-corrigir]").addEventListener("click", onCorrigir);
  box.querySelector("[data-med-forcar]").addEventListener("click", onForcar);
}
document.getElementById("form-medicao").addEventListener("input", (ev)=>{
  if(ev.target && ev.target.id && ev.target.id.indexOf("m-") === 0){
    campoErro(ev.target, null);
    medConfirmSig = null; medAviso(null);
  }
});

document.getElementById("form-medicao").addEventListener("submit", (e)=>{
  e.preventDefault();
  if(!state.perfil){
    showToast("Complete seu perfil primeiro para registrar medições.");
    openPerfilEditor();
    return;
  }
  // 1) faixa possível
  let primeiroErro = null;
  const vals = {};
  MED_CAMPOS.forEach(c=>{
    const inp = document.getElementById(c.id);
    const raw = inp.value.trim();
    const v = raw === "" ? NaN : Number(raw);
    let msg = null;
    if(raw === "" && c.opt){ campoErro(inp, null); return; }   // v98: cintura, quadril e pescoço são opcionais
    if(raw === "" || !isFinite(v)) msg = "Informe o "+c.nome.toLowerCase()+" em "+c.un+".";
    else if(v < c.min || v > c.max) msg = c.nome+" de "+num(v,1)+" "+c.un+" parece fora do possível — use um valor entre "+c.min+" e "+c.max+" "+c.un+".";
    campoErro(inp, msg);
    if(msg && !primeiroErro) primeiroErro = inp;
    vals[c.key] = v;
  });
  if(primeiroErro){ medAviso(null); primeiroErro.focus(); return; }
  const peso = vals.pesoKg, cintura = vals.cinturaCm, quadril = vals.quadrilCm, pescoco = vals.pescocoCm;
  const iso = todayISO();
  // 2) fora da curva (só compara com medição recente, até 45 dias)
  const sig = JSON.stringify(vals);
  if(sig !== medConfirmSig){
    const prev = sortedMedicoes().filter(m=> m.iso < iso).pop();
    const dias = prev ? Math.round((Date.parse(iso) - Date.parse(prev.iso)) / 864e5) : null;
    const avisos = [];
    if(prev && dias <= 45){
      MED_CAMPOS.forEach(c=>{
        const antes = Number(prev[c.key]);
        if(!isFinite(antes) || antes <= 0 || !isFinite(vals[c.key])) return;
        const d = vals[c.key] - antes;
        if(Math.abs(d) >= c.salto) avisos.push(c.nome+" "+num(vals[c.key],1)+" "+c.un+" é "+num(Math.abs(d),1)+" "+c.un+(d>0?" a mais":" a menos")+" que em "+fmtDateBR(prev.iso)+" ("+num(antes,1)+" "+c.un+").");
      });
    }
    if(avisos.length){
      medAviso(avisos,
        ()=>{ medConfirmSig = sig; document.getElementById("form-medicao").requestSubmit(); },
        ()=>{ const alvo = MED_CAMPOS.find(c=> avisos.some(a=> a.indexOf(c.nome+" ") === 0)); const el = alvo && document.getElementById(alvo.id); medAviso(null); if(el){ el.focus(); el.select && el.select(); } }
      );
      document.getElementById("medicao-aviso").scrollIntoView({block:"nearest", behavior:"smooth"});
      return;
    }
  }
  medConfirmSig = null; medAviso(null);
  const data = {data:iso, pesoKg:peso};
  if(isFinite(cintura)) data.cinturaCm = cintura;
  if(isFinite(quadril)) data.quadrilCm = quadril;
  if(isFinite(pescoco)) data.pescocoCm = pescoco;
  state.medicoes[iso] = data;
  saveDoc("medicoes/"+iso, data);
  e.target.reset();
  document.getElementById("medicao-status").textContent = "Medição de "+fmtDateBR(iso)+" salva.";
  microReward(e.target.querySelector('button[type="submit"]'));
  render();
  showToast("Medição registrada.");
});

function renderComposicao(){
  const el = document.getElementById("comp-body");
  const med = latestMedicao();
  const p = state.perfil;
  if(!med || !p){
    el.innerHTML = !p
      ? emptyState("user","Falta o seu perfil","Para estimar o % de gordura o app precisa do gênero e da altura.",{go:"perfil",label:"Completar perfil"})
      : emptyState("ruler","Falta uma medição","Cintura, quadril e pescoço permitem estimar o % de gordura (método da Marinha dos EUA).",{go:"medir",label:"Registrar medição"});
    return;
  }
  const medB = ultimaComBF(p);
  const bfForaDoPossivel = !medB && sexoValido(p.sexo) && med.cinturaCm > 0 && med.pescocoCm > 0 && (p.sexo !== "F" || med.quadrilCm > 0);   // NG+
  if(!medB && bfForaDoPossivel){
    el.innerHTML = emptyState("ruler","Confira as medidas","Com a cintura e o pescoço informados, a fórmula dá um resultado fora do possível (0% ou menos). Confira se a cintura foi medida na altura do umbigo e o pescoço logo abaixo do pomo de adão.",{go:"medir",label:"Corrigir medição"});
    return;
  }
  if(!medB){
    el.innerHTML = !sexoValido(p.sexo)
      ? emptyState("user","Falta o gênero para essa estimativa","A fórmula do % de gordura é diferente para cada gênero. Se quiser essa estimativa, informe o gênero para cálculo no Perfil.",{go:"perfil",label:"Abrir perfil"})
      : emptyState("ruler","Falta medir cintura e pescoço"+(p.sexo === "F" ? " e quadril" : ""),"Quando você medir, o app estima o % de gordura (método da Marinha dos EUA). É opcional: faça quando quiser.",{go:"medir",label:"Medir agora"});
    return;
  }
  const bf = calcBFNavy(p.sexo, medB.cinturaCm, medB.quadrilCm, medB.pescocoCm, p.alturaCm);
  const bfClamped = Math.max(3, Math.min(bf, 60));
  const massaGorda = medB.pesoKg * bfClamped/100;
  const massaMagra = medB.pesoKg - massaGorda;
  const r = 50, c = 2*Math.PI*r;
  const off = c*(1-bfClamped/100);
  el.innerHTML =
    '<div class="bodyring-wrap">'+
      '<div class="bodyring-svg"><svg viewBox="0 0 120 120">'+
        '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="var(--line-strong)" stroke-width="12"/>'+
        '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="var(--s-blue)" stroke-width="12" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>'+
      '</svg><div class="bodyring-label"><b>'+num(bfClamped,1)+'%</b><span>gordura</span></div></div>'+
      '<div class="bodyring-legend">'+
        '<div class="bodyring-li"><span class="bodyring-sw u-bg-teal"></span><div><b>'+num(massaMagra,1)+' kg</b><span>Massa magra</span></div></div>'+
        '<div class="bodyring-li"><span class="bodyring-sw u-bg-blue"></span><div><b>'+num(massaGorda,1)+' kg</b><span>Massa gorda</span></div></div>'+
      '</div>'+
    '</div>'+
    '<div class="foot-note" style="text-align:left; margin-top:var(--sp-3);">'+((Number(p.idade) < 18)
      ? 'Estimativa pelo método da Marinha dos EUA (circunferências). Ele foi feito com adultos: abaixo de 18 anos é só uma referência aproximada, então acompanhe a tendência e não o número isolado.'
      : 'Estimativa pelo método da Marinha dos EUA (circunferências) — classificação: <strong>'+classBF(bf,p.sexo)+'</strong>')+'</div>'+
    (medB.iso !== med.iso ? '<div class="foot-note" style="text-align:left;">Baseado na medição de '+fmtDateBR(medB.iso)+' (peso e medidas daquele dia).</div>' : '')+
    rceHtml(ultimaMedicaoCom(m=> m.cinturaCm > 0) || med, p);
}
/* v95 (C1): cintura ÷ altura — referência 0,5, indicador e não diagnóstico */
function rceHtml(med, p){
  if(!med || !p || !med.cinturaCm || !p.alturaCm) return '';
  const rce = med.cinturaCm / p.alturaCm;
  const ok = rce < 0.5;
  return '<div class="rce-row" id="rce-row"><span class="rce-k">Cintura ÷ altura'+tipBtn("rce")+'</span>'+
    '<b class="rce-v">'+num(rce,2)+'</b>'+
    '<span class="rce-l '+(ok?'good':'warn')+'">'+(ok ? 'Abaixo de 0,5 (referência)' : 'A partir de 0,5 — vale acompanhar')+'</span>'+
    '<span class="rce-n">Indicador, não diagnóstico. Meça sempre no mesmo ponto e no mesmo horário.</span></div>';
}

/* v84: histórico ordenável — toque no cabeçalho alterna maior→menor / menor→maior.
   A variação de peso (▲▼) é sempre contra a medição ANTERIOR NO TEMPO, não contra a
   linha de cima, então continua correta em qualquer ordenação. Vazios vão pro fim. */
let medSort = {col:"data", dir:"desc"};
let medPeriodo = "all";   // v88 C1: "30" | "90" | "365" | "all"
let medLinhasVisiveis = [];   // v88 C1: o que está na tela agora (base do CSV)
let medVtNames = false;   // v85: true só durante a transição de ordenação (nomes de view-transition nas linhas)
const MED_SORT_LABEL = {data:"Data", peso:"Peso", cintura:"Cintura", quadril:"Quadril", imc:"IMC", rcq:"RCQ", bf:"% Gordura"};
/* resumo do período (acima da tabela): valor mais recente e variação desde a 1ª medição do período */
function renderMedResumo(linhas){
  const box = document.getElementById("med-resumo");
  if(!box) return;
  if(!linhas.length){ box.hidden = true; box.innerHTML = ""; return; }
  const a = linhas[0], b = linhas[linhas.length-1], varias = linhas.length > 1;
  const item = (rot, v, v0, un, dec) => {
    if(v == null || !isFinite(v)) return "";
    let d;
    if(varias && v0 != null && isFinite(v0)){
      const x = v - v0;
      if(Math.abs(x) < Math.pow(10, -dec)/2) d = '<small class="mr-d flat">igual desde '+fmtDateBR(a.iso)+'</small>';
      else d = '<small class="mr-d '+(x < 0 ? "down" : "up")+'">'+(x < 0 ? "▼ " : "▲ ")+num(Math.abs(x), dec)+(un ? " "+un : "")+' desde '+fmtDateBR(a.iso)+'</small>';
    } else d = '<small class="mr-d flat">'+(varias ? "sem base para comparar" : "sua 1ª medição")+'</small>';
    return '<div class="mr-i"><span class="mr-l">'+rot+'</span><b>'+num(v, dec)+(un ? '<i> '+un+'</i>' : '')+'</b>'+d+'</div>';
  };
  const html = item("Peso", b.peso, a.peso, "kg", 1) + item("Cintura", b.cintura, a.cintura, "cm", 1) +
    item("% de gordura", b.bf, a.bf, "%", 1) + item("IMC", b.imc, a.imc, "", 1);
  box.innerHTML = html;
  box.hidden = !html;
}
function renderTabelaMedicoes(){
  const tbody = document.querySelector("#tabela-medicoes tbody");
  const empty = document.getElementById("tabela-empty");
  const crono = sortedMedicoes();   // mais antiga → mais recente
  const vazioFiltro = document.getElementById("tabela-filtro-vazio");
  const scrollBox = document.getElementById("med-scroll");
  const toolsBox = document.getElementById("med-tools");
  const countEl = document.getElementById("med-count");
  if(!crono.length){ tbody.innerHTML=""; empty.hidden=false; if(vazioFiltro) vazioFiltro.hidden=true; if(toolsBox) toolsBox.hidden=true; if(countEl) countEl.textContent=""; if(scrollBox) scrollBox.hidden=true; medLinhasVisiveis=[]; return; }
  empty.hidden = true;
  if(toolsBox) toolsBox.hidden = false;
  if(scrollBox) scrollBox.hidden = false;
  const p = state.perfil;
  const linhas = crono.map((m,i)=>{
    const prev = crono[i-1];
    return {
      m, iso:m.iso,
      peso:m.pesoKg, cintura:m.cinturaCm, quadril:m.quadrilCm,
      imc: p ? calcIMC(m.pesoKg, p.alturaCm) : null,
      rcq: calcRCQ(m.cinturaCm, m.quadrilCm),
      bf: p ? calcBFNavy(p.sexo, m.cinturaCm, m.quadrilCm, m.pescocoCm, p.alturaCm) : null,
      diff: (prev && prev.pesoKg!=null && m.pesoKg!=null) ? m.pesoKg - prev.pesoKg : null,
      gap: prev ? Math.round((new Date(m.iso+"T12:00:00") - new Date(prev.iso+"T12:00:00"))/864e5) : null,
    };
  });
  linhas.forEach((l,i)=>{ const a = linhas[i-1]; const d = (x,y)=> (a && x!=null && y!=null && isFinite(x) && isFinite(y)) ? x-y : null; l.dC = d(l.cintura, a && a.cintura); l.dQ = d(l.quadril, a && a.quadril); l.dB = d(l.bf, a && a.bf); });
  // v88 C1: filtro de período (a variação ▲▼ acima já foi calculada contra a medição anterior de verdade, então não muda)
  const totalLinhas = linhas.length;
  if(medPeriodo !== "all"){
    const corte = new Date(todayISO()+"T12:00:00"); corte.setDate(corte.getDate() - Number(medPeriodo));
    const corteISO = corte.getFullYear()+"-"+String(corte.getMonth()+1).padStart(2,"0")+"-"+String(corte.getDate()).padStart(2,"0");
    for(let i = linhas.length-1; i >= 0; i--) if(linhas[i].iso < corteISO) linhas.splice(i,1);
  }
  document.querySelectorAll("#med-periodo button").forEach(b=>{
    const on = b.dataset.p === medPeriodo;
    b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false");
  });
  if(countEl) countEl.textContent = linhas.length === totalLinhas ? totalLinhas+" mediç"+(totalLinhas===1?"ão":"ões") : linhas.length+" de "+totalLinhas+" medições";
  if(vazioFiltro) vazioFiltro.hidden = linhas.length > 0;
  if(scrollBox) scrollBox.hidden = linhas.length === 0;
  renderMedResumo(linhas.slice());
  const col = medSort.col, mult = medSort.dir === "asc" ? 1 : -1;
  const valOf = l => col === "data" ? l.iso : l[col];
  const vazio = v => v == null || v === "" || (typeof v === "number" && !isFinite(v));
  linhas.sort((a,b)=>{
    const va = valOf(a), vb = valOf(b);
    if(vazio(va) && vazio(vb)) return b.iso < a.iso ? -1 : 1;
    if(vazio(va)) return 1;
    if(vazio(vb)) return -1;
    if(va === vb) return b.iso < a.iso ? -1 : 1;           // empate: mais recente primeiro
    return (va < vb ? -1 : 1) * mult;
  });
  medLinhasVisiveis = linhas;
  if(scrollBox) scrollBox.classList.toggle("is-tall", linhas.length > 8);
  const anoAtual = todayISO().slice(0,4);
  tbody.innerHTML = linhas.map(l=>{
    let delta = "";
    if(l.diff != null && Math.abs(l.diff) >= 0.05){
      const cls = l.diff<0 ? "down" : "up";
      delta = '<span class="hist-delta '+cls+'">'+(l.diff<0?"▼":"▲")+num(Math.abs(l.diff),1)+'</span>';
    }
    const mini = (x, dec, neutro) => (x == null || Math.abs(x) < 0.05) ? '' : '<span class="hist-delta '+(neutro ? 'flat' : (x<0 ? 'down' : 'up'))+'">'+(x<0?'▼':'▲')+num(Math.abs(x),dec)+'</span>';
    const flag = (l.diff != null && Math.abs(l.diff) >= 3 && l.gap != null && l.gap <= 14) ? '<span class="hist-flag" tabindex="0" role="img" aria-label="Variação grande desde a medição anterior; confira se digitou certo" title="Variação grande desde a medição anterior. Confira se digitou certo.">!</span>' : '';
    const td = (k, html) => '<td class="num'+(col===k?' is-sorted':'')+'">'+html+'</td>';
    const ano = l.iso.slice(0,4) !== anoAtual ? '/'+l.iso.slice(2,4) : '';   // ordenando por valor, linhas de anos diferentes se misturam
    return '<tr data-iso="'+l.iso+'"'+(medVtNames?' style="view-transition-name:mrow-'+l.iso+'"':'')+'><td'+(col==="data"?' class="is-sorted"':'')+'>'+fmtDateBR(l.iso)+ano+'</td>'+
      td("peso", num(l.peso,1)+delta+flag)+td("cintura", num(l.cintura,1)+mini(l.dC,1))+td("quadril", num(l.quadril,1)+mini(l.dQ,1,true))+
      td("imc", l.imc?num(l.imc,1):"—")+td("rcq", num(l.rcq,2))+td("bf", l.bf!=null?num(l.bf,1)+"%"+mini(l.dB,1):"—")+'</tr>';
  }).join("");
  document.querySelectorAll("#tabela-medicoes th").forEach(th=>{
    const b = th.querySelector("[data-sort]");
    if(!b) return;
    const on = b.dataset.sort === col;
    th.setAttribute("aria-sort", on ? (medSort.dir === "asc" ? "ascending" : "descending") : "none");
    th.classList.toggle("is-sorted", on);
  });
  const hint = document.getElementById("tabela-sort-hint");
  if(hint){
    const ordem = col === "data" ? (medSort.dir === "desc" ? "mais recente primeiro" : "mais antiga primeiro")
                                 : (medSort.dir === "desc" ? "maior → menor" : "menor → maior");
    hint.textContent = "Ordenado por "+MED_SORT_LABEL[col]+" · "+ordem;
  }
}
/* v88 C1: filtro de período + exportação CSV (pt-BR: ponto e vírgula, vírgula decimal, BOM para o Excel acentuar certo) */
function medCsvTexto(){
  const n = (v, d)=> (v == null || !isFinite(v)) ? "" : Number(v).toFixed(d).replace(".", ",");
  const dataBR = iso => iso.slice(8,10)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4);
  const cab = ["Data","Peso (kg)","Cintura (cm)","Quadril (cm)","IMC","RCQ","% Gordura"];
  const lin = medLinhasVisiveis.map(l=> [dataBR(l.iso), n(l.peso,1), n(l.cintura,1), n(l.quadril,1), n(l.imc,1), n(l.rcq,2), n(l.bf,1)]);
  return "\uFEFF" + [cab].concat(lin).map(r=> r.join(";")).join("\r\n") + "\r\n";
}
async function exportarMedicoesCsv(){
  if(!medLinhasVisiveis.length){ showToast("Nenhuma medição neste período para exportar. Mude o filtro ou registre uma medição."); return; }
  const filename = "ng-mais-medicoes-"+todayISO()+".csv";
  const blob = new Blob([medCsvTexto()], {type:"text/csv;charset=utf-8"});
  if(window.claude && window.claude.use){
    let downloads = null;
    try{ downloads = await window.claude.use("downloads"); }catch(e){ downloads = null; }
    if(!downloads){ showToast(MSG.semArquivos); return; }
    try{
      await downloads.save({filename, data: blob});
      showToast("Arquivo CSV salvo com "+medLinhasVisiveis.length+" "+pl(medLinhasVisiveis.length,"linha","linhas")+".");
    }catch(err){
      const code = err && err.code;
      if(code !== "declined" && code !== "rate_limited") showToast("Não consegui exportar agora."+MSG.tenteDeNovo);
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1500);
}
(function setupMedFiltro(){
  const card = document.getElementById("med-tools");
  if(!card) return;
  const set = (p)=>{
    if(medPeriodo === p) return;
    medPeriodo = p; playSound("tick");
    withTransition(()=>{ renderTabelaMedicoes(); });
  };
  card.addEventListener("click", (ev)=>{
    const b = ev.target.closest("#med-periodo button");
    if(b) set(b.dataset.p);
  });
  document.getElementById("med-csv").addEventListener("click", exportarMedicoesCsv);
  document.getElementById("tabela-filtro-vazio").addEventListener("click", (ev)=>{
    if(ev.target.closest("[data-medperiodo]")) set("all");
  });
})();
(function setupMedSort(){
  const thead = document.querySelector("#tabela-medicoes thead");
  if(!thead) return;
  thead.addEventListener("click", (ev)=>{
    const b = ev.target.closest("[data-sort]");
    if(!b) return;
    const c = b.dataset.sort;
    medSort = (medSort.col === c) ? {col:c, dir: medSort.dir === "desc" ? "asc" : "desc"} : {col:c, dir:"desc"};
    playSound("tick");
    // v85 (I1): as linhas "deslizam" até a nova posição (nomes únicos por data, só durante a transição)
    const rows = [...document.querySelectorAll("#tabela-medicoes tbody tr")];
    const animar = rows.length > 0 && rows.length <= 90;
    if(animar) rows.forEach(r=>{ if(r.dataset.iso) r.style.viewTransitionName = "mrow-"+r.dataset.iso; });
    medVtNames = animar;
    withTransition(()=>{ renderTabelaMedicoes(); }, {after:()=>{
      medVtNames = false;
      document.querySelectorAll("#tabela-medicoes tbody tr").forEach(r=>{ r.style.viewTransitionName = ""; });
    }}).then(()=>{ const f = thead.querySelector('[data-sort="'+c+'"]'); if(f) f.focus(); });
  });
})();

/* ============================================================
   RENDER: DIETA
   ============================================================ */
let objetivoAtual = "manutencao";
let objetivoPendente = false;   // v81: escolha feita e ainda não confirmada pelo banco — impede que um snapshot antigo desfaça o clique
document.querySelectorAll("#seg-objetivo button").forEach(b=>{
  b.addEventListener("click", async ()=>{
    const novo = b.dataset.v;
    if(state.perfil && objetivoParaIdade(novo, state.perfil.idade) !== novo) return;   // v98 F3: menor de 18 não escolhe emagrecimento
    if(novo === objetivoAtual && !objetivoPendente) return;
    objetivoAtual = novo;
    playSound("tick");
    if(state.perfil){
      // v81: nunca altera o objeto do banco no lugar (pode vir congelado/somente leitura e o clique morria em silêncio):
      // cria uma cópia, mostra na hora e só então grava.
      state.perfil = Object.assign({}, state.perfil, {objetivo: novo});
      objetivoPendente = true;
      render();
      try{ await saveDoc("config/perfil", state.perfil); }
      finally{ if(objetivoAtual === novo) objetivoPendente = false; render(); }
    } else {
      renderDieta();
    }
  });
});

const OBJETIVO_TXT = {
  deficit: "Déficit calórico de ~20% sobre o gasto total (TDEE), faixa comumente usada para perda de gordura preservando massa magra quando combinada a treino de força e proteína adequada.",
  manutencao: "Calorias próximas ao gasto total estimado (TDEE), para manter o peso atual.",
  superavit: "Superávit calórico de ~10% sobre o TDEE — abordagem de \"lean bulk\" para minimizar ganho de gordura durante a hipertrofia."
};
const OBJETIVO_TXT_MENOR = {
  manutencao: "Calorias próximas ao gasto total estimado (TDEE). Na fase de crescimento, manter é um ótimo ponto de partida: o peso sobe sozinho com o crescimento e o treino rende mais.",
  superavit: "Ganho moderado: ~5% acima do gasto total estimado (TDEE), bem mais suave que o dos adultos. Sem pressa: o corpo ainda está crescendo, e um(a) nutricionista pode ajustar isso para você."
};

/* v98 F3: estado vazio da Dieta — diz o que falta e leva direto ao passo seguinte */
function renderDietaVazio(p, med){
  const el = document.getElementById("dieta-vazio");
  const semDados = !p || !med;
  document.querySelectorAll("#view-dieta [data-dieta-dados]").forEach(c=>{ c.hidden = semDados; });
  const aviso = document.getElementById("dieta-menor");
  if(aviso) aviso.hidden = !(p && menorDeIdade(p.idade));
  if(!el) return;
  el.hidden = !semDados;
  if(!semDados){ el.innerHTML = ""; return; }
  el.innerHTML = !p
    ? emptyState("flame", "Vamos montar a sua dieta", "Com seu cadastro (idade, altura, peso e objetivo) o app calcula calorias, macros e um cardápio de exemplo.", {go:"cadastro", label:"Fazer meu cadastro"})
    : emptyState("ruler", "Falta só o seu peso", "Registre seu peso de hoje na aba Corpo e a dieta aparece aqui, com calorias, macros e cardápio.", {go:"medir", label:"Registrar meu peso"});
}

function indicField(eyebrow, value, unit){
  return '<div class="indic-item"><span class="eyebrow">'+eyebrow+'</span><b>'+value+(unit?'<small> '+unit+'</small>':'')+'</b></div>';
}

/* v98 F3: botões e texto do objetivo seguem a idade (menor de 18: sem "Emagrecimento"; ganho moderado) */
function pintaObjetivo(p){
  const seg = document.getElementById("seg-objetivo");
  const menor = !!(p && menorDeIdade(p.idade));
  if(!objetivoPendente && p) objetivoAtual = objetivoParaIdade(p.objetivo || objetivoAtual, p.idade);
  else objetivoAtual = objetivoParaIdade(objetivoAtual, p && p.idade);
  seg.querySelectorAll("button").forEach(b=>{
    const v = b.dataset.v;
    b.hidden = menor && v === "deficit";
    if(v === "superavit") b.textContent = menor ? "Ganho moderado" : "Hipertrofia";
    b.classList.toggle("active", v === objetivoAtual);
    b.setAttribute("aria-pressed", String(v === objetivoAtual));
  });
  document.getElementById("objetivo-explicacao").innerHTML = "<div>"+((menor ? OBJETIVO_TXT_MENOR : OBJETIVO_TXT)[objetivoAtual] || OBJETIVO_TXT[objetivoAtual])+"</div>";   // v94: o texto acompanha o objetivo já resolvido
}

function renderDieta(){
  const p = state.perfil;
  const med = latestMedicao();
  pintaObjetivo(p);
  renderDietaVazio(p, med);
  const stats = document.getElementById("dieta-stats");
  if(!p || !med){
    stats.innerHTML = indicField("TMB","—","kcal")+indicField("TDEE","—","kcal")+indicField("Meta calórica","—","kcal")+indicField("Peso considerado","—","kg");
    document.getElementById("macro-bars").innerHTML = "";
    document.getElementById("macro-table").innerHTML = "";
    const ajEl = document.getElementById("ajuste-body"); if(ajEl) ajEl.innerHTML = "";
    document.getElementById("meta-peso-body").innerHTML = "";
    renderDietaAnel(null, null);
    renderCardapio(null, null);
    return;
  }

  const tmb = calcTMB(p.sexo, med.pesoKg, p.alturaCm, p.idade);
  const tdee = calcTDEE(tmb, p.nivelAtividade);
  const kcalAlvo = calorieTarget(tdee, objetivoAtual, p.idade);
  const proteinaGKg = objetivoAtual === "deficit" ? 2.0 : 1.8;
  const macros = calcMacros(med.pesoKg, kcalAlvo, proteinaGKg);

  stats.innerHTML =
    indicField("TMB (basal)", num(tmb,0),"kcal") +
    indicField("TDEE (gasto total)", num(tdee,0),"kcal") +
    indicField("Meta calórica", num(kcalAlvo,0),"kcal") +
    indicField("Peso considerado", num(med.pesoKg,1),"kg");

  document.getElementById("macro-hint").textContent = num(kcalAlvo,0)+" kcal/dia";
  const rows = [
    {nome:"proteína", color:"var(--s-aqua)", d:macros.proteina},
    {nome:"carboidrato", color:"var(--s-yellow)", d:macros.carbo},
    {nome:"gordura", color:"var(--s-magenta)", d:macros.gordura},
  ];
  const totalKcal = macros.proteina.kcal+macros.carbo.kcal+macros.gordura.kcal || 1;
  document.getElementById("macro-bars").innerHTML = rows.map(r=>{
    const pct = Math.round(r.d.kcal/totalKcal*100);
    return '<div class="macro-bar-row"><span>'+r.nome+'</span>'+
      '<div class="macro-bar-track"><div class="macro-bar-fill" style="width:'+pct+'%; background:'+r.color+';"></div></div>'+
      '<span class="macro-bar-val">'+num(r.d.g,0)+'g · '+pct+'%</span></div>';
  }).join("");
  document.getElementById("macro-table").innerHTML = rows.map(r=>{
    return '<tr><td class="u-lower">'+r.nome+'</td><td class="num">'+num(r.d.gkg,2)+'</td><td class="num">'+num(r.d.kcal,0)+'</td></tr>';
  }).join("");

  renderAjusteResultado(med, p, kcalAlvo, tdee);
  renderMetaPeso(med, p, kcalAlvo, tdee);
  renderDietaAnel(kcalAlvo, macros);
  renderCardapio(kcalAlvo, macros);
}

/* ============================================================
   CARDÁPIO DA SEMANA — 7 dias + lista de compras, por jeito de comer (onívoro, vegetariano, vegano, low carb),
   rotina (marmita, dia corrido, orçamento enxuto, almoço fora) e restrições. A meta (kcal e proteína) vem da
   aba Dieta. Valores por 100 g da TACO (NEPA/UNICAMP, via Tabela TACO Online); itens com * usam valor típico
   de rótulo. FONTE ÚNICA: o motor está em fonte/cardapio/engine.js e a tela em fonte/cardapio/ui.js (módulos ES); o build empacota os dois com esbuild em um módulo separado carregado sob demanda (abaixo) — NÃO existe cópia dentro deste arquivo (testes: cardapio-sim.mjs, cardapio-modulo.mjs, cardapio-nos.js e cardapio-sob-demanda.js).
   É um exemplo, não prescrição individual.
   ============================================================ */
/* Carregamento sob demanda: o cardápio é um módulo ES separado (cardapio.<hash>.js, gerado pelo esbuild em fonte/build.sh).
   Só é baixado e executado na primeira vez que a aba Dieta o desenha; o app não paga esse custo na abertura. O build troca
   o nome do arquivo na constante CARDAPIO_URL pelo nome com hash (fonte/externaliza.py) e o service worker guarda o arquivo na instalação (funciona offline). */
const CARDAPIO_URL = "./cardapio.323baba56e.js";
let CARDAPIO = null, cardapioPromessa = null, cardapioMeta = null, cardapioFalhas = 0;
function renderCardapio(kcalAlvo, macros){
  cardapioMeta = [kcalAlvo, macros];                       // sempre a meta mais recente (a Dieta pode redesenhar durante o carregamento)
  if(CARDAPIO){ CARDAPIO.render(kcalAlvo, macros); return; }
  const el = document.getElementById("cardapio-body");
  if(el && !el.firstChild) el.innerHTML = '<div class="empty-note" role="status">Carregando o cardápio…</div>';
  if(cardapioPromessa) return;
  // depois de uma falha, o navegador pode guardar o erro do endereço; o sufixo ?r= força uma nova tentativa de verdade
  cardapioPromessa = import(cardapioFalhas ? CARDAPIO_URL+"?r="+cardapioFalhas : CARDAPIO_URL).then(mod=>{
    CARDAPIO = mod.criaCardapio({   // fronteira do módulo: a tela do cardápio só enxerga o app por aqui
      estado: ()=> state,
      objetivo: ()=> objetivoAtual,
      salvaSettings: (next)=>{ state.settings = next; saveDoc("config/settings", state.settings); },
      redesenhaDieta: ()=> renderDieta(),
      tocaSom: (nome)=> playSound(nome),
      abreModal: (el)=> openModal(el), fechaModal: ()=> closeModal(),   // só para o pop-up "Trocar alimentos"
      num, escapeHtml, menorDeIdade
    });
    if(cardapioMeta) CARDAPIO.render(cardapioMeta[0], cardapioMeta[1]);
  }).catch(e=>{
    cardapioPromessa = null; cardapioFalhas++;
    ngReporta(e, "cardapio:carregar");
    const el2 = document.getElementById("cardapio-body");
    if(!el2) return;
    el2.innerHTML = '<div class="empty-note" role="status">Não foi possível carregar o cardápio agora. Verifique a conexão e tente de novo. <button type="button" class="btn" data-cdp-retry>Tentar de novo</button></div>';
    el2.querySelector("[data-cdp-retry]").addEventListener("click", ()=>{ el2.innerHTML = ""; if(cardapioMeta) renderCardapio(cardapioMeta[0], cardapioMeta[1]); });
  });
}

/* ============================================================
   AJUSTE PELO RESULTADO — em vez de presumir "biotipo", compara a
   tendência real do peso (regressão linear das medições dos últimos
   ~5 semanas) com a faixa de ganho recomendada pra hipertrofia
   (Iraki et al., 2019: ~0,25–0,5% do peso/semana, superávit ~10–20%).
   Só informa e sugere — nunca altera o objetivo sozinho.
   ============================================================ */
function computeTendenciaPeso(){
  const cutoff = addDaysISO(todayISO(), -35);
  const pts = sortedMedicoes().filter(m=> m.iso>=cutoff && m.pesoKg!=null);
  if(pts.length < 3) return {ok:false, motivo:"poucas"};
  const t0 = new Date(pts[0].iso+"T00:00:00").getTime();
  const xs = pts.map(m=> (new Date(m.iso+"T00:00:00").getTime()-t0)/86400000);
  const spanDias = xs[xs.length-1];
  if(spanDias < 14) return {ok:false, motivo:"curto", spanDias:Math.round(spanDias)};
  const ys = pts.map(m=>m.pesoKg);
  const n = xs.length, mx = xs.reduce((a,b)=>a+b,0)/n, my = ys.reduce((a,b)=>a+b,0)/n;
  let sxy=0, sxx=0;
  xs.forEach((x,i)=>{ sxy += (x-mx)*(ys[i]-my); sxx += (x-mx)*(x-mx); });
  const kgPorDia = sxx ? sxy/sxx : 0;
  const kgSemana = kgPorDia*7;
  const pesoAtual = ys[ys.length-1];
  return {ok:true, kgSemana, pctSemana:(kgSemana/pesoAtual)*100, pesoAtual, n, spanDias:Math.round(spanDias)};
}
function renderAjusteResultado(med, p, kcalAlvo, tdee){
  const el = document.getElementById("ajuste-body");
  if(!el) return;
  if(menorDeIdade(p && p.idade)){   // v98 F3: na fase de crescimento o peso muda também por crescer; o app não sugere cortar ou somar calorias pelo ritmo do peso
    el.innerHTML = '<div class="empty-note">Na adolescência o peso muda também por causa do crescimento, então o app não sugere ajustes de calorias pelo ritmo do peso. Se o peso parecer parado ou mudar rápido demais, converse com um(a) nutricionista ou médico(a).</div>';
    return;
  }
  const t = computeTendenciaPeso();
  if(!t.ok){
    el.innerHTML = '<div class="empty-note">'+(t.motivo==="curto"
      ? 'Suas medições cobrem só '+t.spanDias+' dias. Com pelo menos 2 semanas de dados, o app compara o ritmo real do seu peso com a faixa recomendada.'
      : 'Registre pelo menos 3 medições de peso nas últimas 5 semanas (aba Corpo) pra o app comparar o ritmo real do seu peso com a faixa recomendada.')+'</div>';
    return;
  }
  const sinal = t.kgSemana>0?"+":"";
  const topo = '<div class="ajuste-top"><span class="ajuste-rate">'+sinal+num(t.kgSemana,2)+'<small>kg/semana</small></span>'+
    '<span class="ajuste-pct">'+sinal+num(t.pctSemana,2)+'% do peso por semana · '+t.n+' medições em '+t.spanDias+' dias</span></div>';

  let corpo = "";
  if(objetivoAtual === "superavit"){
    // escala de -0,25% a +0,75%; faixa verde = 0,25–0,5%
    const lo=-0.25, hi=0.75, pos = v=> Math.max(0,Math.min(100,((v-lo)/(hi-lo))*100));
    const escala = '<div class="ajuste-scale"><div class="ajuste-band" style="left:'+pos(0.25)+'%; width:'+(pos(0.5)-pos(0.25))+'%;"></div><div class="ajuste-mark" style="left:'+pos(t.pctSemana)+'%;"></div></div>'+
      '<div class="ajuste-scale-lbl"><span>−0,25%</span><span>faixa 0,25–0,5%</span><span>+0,75%</span></div>';
    const r = t.pctSemana;
    let tone, msg;
    if(r < 0.1){
      const novo = Math.round((kcalAlvo+200)/10)*10;
      tone="warn";
      msg = 'Seu peso está '+(r<=-0.05?'caindo':'praticamente parado')+' mesmo no objetivo de hipertrofia — comum em quem come menos do que imagina ou tem apetite baixo. Antes de culpar o "metabolismo", experimente subir cerca de 200 kcal/dia (≈ '+num(novo,0)+' kcal), mantenha 2 a 3 semanas e reavalie aqui.';
    } else if(r < 0.25){
      const novo = Math.round((kcalAlvo+100)/10)*10;
      tone="info";
      msg = 'Você está ganhando, mas abaixo da faixa recomendada. Um ajuste pequeno de ~100 kcal/dia (≈ '+num(novo,0)+' kcal) deve te levar pra dentro dela. Reavalie em 2 a 3 semanas.';
    } else if(r <= 0.5){
      tone="good";
      msg = 'Ritmo dentro da faixa recomendada. Mantenha a meta calórica e a regularidade dos treinos — nada a ajustar agora.';
    } else {
      const novo = Math.round((kcalAlvo-150)/10)*10;
      tone="warn";
      msg = 'Ganho acima da faixa. Parte do excesso tende a virar gordura, principalmente com mais tempo de treino. Considere reduzir ~150 kcal/dia (≈ '+num(novo,0)+' kcal) e reavaliar em 2 a 3 semanas.';
    }
    corpo = escala+'<div class="ajuste-box '+tone+'">'+msg+'</div>'+
      '<div class="ajuste-src">Faixa: ~0,25–0,5% do peso/semana pra iniciante/intermediário, com superávit de ~10–20% (<a href="https://www.mdpi.com/2075-4663/7/7/154" target="_blank" rel="noopener">Iraki et al., 2019</a>). Seu superávit atual é de 10%. Avançados devem ser mais conservadores.</div>';
  } else if(objetivoAtual === "deficit"){
    corpo = '<div class="ajuste-msg">Esse é o ritmo real do seu peso no objetivo de emagrecimento. Se ele ficou parado por 3 ou mais semanas apesar de seguir a meta, o mais provável é que a ingestão real esteja acima da registrada — revise porções e fins de semana antes de cortar mais calorias.</div>';
  } else {
    corpo = '<div class="ajuste-msg">Esse é o ritmo real do seu peso na manutenção. Variações pequenas semana a semana são normais (água, sal, ciclo hormonal); olhe a tendência de 3 a 4 semanas, não um dia isolado.</div>';
  }
  el.innerHTML = topo+corpo;
}

function renderMetaPeso(med, p, kcalAlvo, tdee){
  const el = document.getElementById("meta-peso-body");
  if(!p.pesoMetaKg){
    el.innerHTML = '<div class="empty-note">Defina um peso meta na aba Perfil → Editar para acompanhar o progresso aqui.</div>';
    return;
  }
  const arr = sortedMedicoes();
  const inicial = arr[0].pesoKg;
  const atual = med.pesoKg;
  const meta = p.pesoMetaKg;
  const totalDist = Math.abs(meta - inicial) || 1;
  const dist = Math.abs(atual - inicial);
  const pct = Math.max(0, Math.min(100, Math.round(dist/totalDist*100)));
  const restante = Math.abs(meta - atual);
  const deltaDiario = kcalAlvo - tdee; // negativo = déficit
  let etaTxt = "";
  if(menorDeIdade(p.idade) && meta < atual){   // v98 F3: menor de 18 não recebe prazo nem caminho para perder peso
    etaTxt = "Sua meta é menor que o seu peso atual. Antes dos 18 anos o app não calcula prazo para perder peso: converse com um(a) nutricionista ou médico(a) para definir uma meta segura.";
  } else if(Math.abs(deltaDiario) > 20){
    const kcalPorKg = 7700; // aproximação padrão de kcal por kg de tecido adiposo
    const diasEstimados = Math.round((restante*kcalPorKg) / Math.abs(deltaDiario));
    const semanas = Math.round(diasEstimados/7);
    etaTxt = "Nesse ritmo calórico, faltam aproximadamente "+semanas+" semana"+(semanas===1?"":"s")+" para atingir a meta (estimativa aproximada).";
  } else {
    etaTxt = "Ajuste o objetivo (déficit/superávit) para estimar um prazo até a meta.";
  }
  const r = 42, c = 2*Math.PI*r;
  const off = c*(1-pct/100);
  el.innerHTML =
    '<div class="metaring-wrap">'+
      '<div class="metaring-svg"><svg viewBox="0 0 100 100">'+
        '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="var(--surface-2)" stroke-width="10"/>'+
        '<circle cx="50" cy="50" r="'+r+'" fill="none" stroke="var(--teal)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+c.toFixed(1)+'" stroke-dashoffset="'+off.toFixed(1)+'"/>'+
      '</svg><div class="metaring-label">'+pct+'%</div></div>'+
      '<div class="metaring-info">'+
        '<div><b>'+num(atual,1)+'<small> kg</small></b> <span style="font-size:var(--fs-14); color:var(--muted); font-weight:600;">atual</span></div>'+
        '<div class="metaring-sub">De '+num(inicial,1)+' kg → meta '+num(meta,1)+' kg · faltam '+num(restante,1)+' kg</div>'+
        '<div class="metaring-eta">'+etaTxt+'</div>'+
      '</div>'+
    '</div>';
}

/* ============================================================
   TUTORIAL — tour guiado logo após o cadastro
   Analogia: o instrutor que te mostra a academia no 1º dia — passa em cada aparelho, aponta e explica em uma frase.
   Cada passo abre a aba certa, destaca a função e mostra um balão acima dela (abaixo, se faltar espaço).
   "Pular tutorial" em todo balão; "Rever o tutorial" em Configurações. O que já foi visto fica na conta
   (config/settings.tutorial), então trocar de aparelho não repete. Ao terminar, abre o "Como você está hoje?".
   ============================================================ */
const TOUR_PASSOS = [
  {aba:"painel", alvo:null, t:"Bem-vindo(a) ao NG+", x:"Em cerca de 1 minuto mostramos onde fica cada coisa. Você pode pular quando quiser e rever depois em Configurações."},
  {aba:"painel", alvo:"#today-hero", t:"Treino de hoje", x:"Aqui aparece o treino do dia. Abra para ver os exercícios e, ao terminar, marque como concluído: isso soma XP e mantém sua sequência."},
  {aba:"painel", alvo:"#cc-semana", t:"Sua semana", x:"Os dias de treino da semana: feitos, perdidos e os que vêm. Perdeu um? O app oferece fazer o treino em outro dia."},
  {aba:"painel", alvo:"#cc-missoes", t:"Missões", x:"Desafios curtos que rendem XP extra. São opcionais: ajudam a manter o ritmo, não são cobrança."},
  {aba:"painel", alvo:"#main-tabs", t:"Navegação", x:"Use esta barra para trocar entre Hoje, Treino, Dieta, Corpo e Perfil."},
  {aba:"treino", alvo:{h2:"Rotina semanal"}, t:"Sua rotina", x:"Os treinos de cada dia da semana. Dá para editar exercícios, séries e repetições, ou trocar um exercício de vez."},
  {aba:"treino", alvo:{h2:"Cargas"}, t:"Carga, repetições e RPE", x:"Registre o peso e as repetições de cada série. RPE é o quanto a série foi difícil, de 1 a 10: perto de 8 (sobram umas 2 repetições) é o ponto certo. Suba a carga aos poucos, só quando completar as repetições com boa técnica."},
  {aba:"treino", alvo:"#analise-treino-card", t:"Análise do treino", x:"Mostra se o volume de cada músculo está na faixa recomendada e como suas cargas evoluem com o tempo."},
  {aba:"dieta", alvo:{h2:"Objetivo calórico"}, t:"Dieta", x:"Calorias e macronutrientes calculados pelo seu perfil e objetivo. É uma estimativa: o app ajusta pelo seu resultado. Para menores de 18 anos não há sugestão de déficit calórico."},
  {aba:"dieta", alvo:"#cardapio-card", t:"Cardápio da semana", x:"Ideias de refeições que batem com a sua meta, com lista de compras. Use Trocar alimentos para escolher outro alimento da mesma categoria; a porção se ajusta sozinha."},
  {aba:"corpo", alvo:{h2:"Nova medição"}, t:"Medidas e fotos", x:"Registre peso e medidas, de preferência sempre no mesmo horário, para ver a evolução nos gráficos. As fotos de progresso ficam só na sua conta."},
  {aba:"perfil", alvo:{h2:"Ficha de personagem"}, t:"Seu personagem", x:"Nível, XP e atributos sobem com a constância. As conquistas desbloqueiam quando você bate marcos."},
  {aba:"perfil", alvo:"#perfil-mais", t:"Mais do app", x:"No celular, o Glossário (termos de treino explicados) e as Configurações ficam aqui."},
  {aba:"config", alvo:"#cfg-conta", t:"Seus dados", x:"Tudo é salvo primeiro no aparelho, por isso o app funciona sem internet, e vai para a nuvem quando houver conexão. Aqui você sincroniza, sai da conta e pode pedir o código de novo depois de um tempo fora do app."},
  {aba:"config", alvo:"#cfg-instalar", t:"Instalar no celular", x:"Instale na tela inicial para abrir em tela cheia e usar sem internet. No iPhone: Compartilhar → Adicionar à Tela de Início."},
  {aba:"painel", alvo:null, t:"Antes de começar", x:"O NG+ orienta, mas não substitui profissional de educação física, nutrição ou saúde. Sentiu dor forte? Não force: faça um dia leve e procure um profissional. Bom treino!"}
];
let tourAtivo = false;
function tutorialVisto(){ return !!(state.settings && state.settings.tutorial && state.settings.tutorial.visto); }
function tutorialPendente(){ return !!(state.settings && state.settings.tutorial && state.settings.tutorial.visto === false); }
function marcarTutorial(visto){
  state.settings = Object.assign({}, state.settings, {tutorial: visto ? {visto:true, em:todayISO(), v:1} : {visto:false}});
  saveDoc("config/settings", state.settings);
}
function tourAlvo(p){
  if(!p.alvo) return null;
  let el = null;
  if(p.alvo.h2){
    const v = document.getElementById("view-"+p.aba);
    const h = v && Array.from(v.querySelectorAll("h2")).find(x=> x.textContent.trim().indexOf(p.alvo.h2) === 0);
    el = h && (h.closest(".card") || h.closest("details") || h);
  } else el = document.querySelector(p.alvo);
  if(!el || el.closest("[hidden]") || !el.getClientRects().length) return null;   // função não aparece agora: balão no centro
  return el;
}
function iniciarTutorial(depois){
  if(tourAtivo) return;
  tourAtivo = true;
  let i = 0, alvo = null, tPos1 = 0, tPos2 = 0;
  const root = document.createElement("div");
  root.id = "tour-root"; root.className = "tour-root";
  root.innerHTML = '<div class="tour-spot" aria-hidden="true"></div>'+
    '<div class="tour-pop" role="dialog" aria-modal="true" aria-labelledby="tour-t" aria-describedby="tour-x" tabindex="-1">'+
      '<div class="tour-cont" id="tour-cont"></div><h2 id="tour-t"></h2><p id="tour-x"></p>'+
      '<div class="tour-act"><button type="button" class="btn ghost small" data-tour="pular">Pular tutorial</button><span class="tour-sp"></span>'+
      '<button type="button" class="btn small" data-tour="voltar">Voltar</button><button type="button" class="btn primary small" data-tour="prox">Próximo</button></div>'+
    '</div>';
  document.body.appendChild(root);
  const app = document.querySelector(".app"); if(app) app.inert = true;
  const spot = root.querySelector(".tour-spot"), pop = root.querySelector(".tour-pop");
  function posiciona(){
    const vw = document.documentElement.clientWidth, vh = window.innerHeight, M = 12;
    if(!alvo){ spot.hidden = true; root.classList.add("sem-alvo"); pop.classList.add("centro"); pop.style.top = ""; pop.style.left = ""; return; }
    spot.hidden = false; root.classList.remove("sem-alvo"); pop.classList.remove("centro");
    const r = alvo.getBoundingClientRect();
    const t = Math.max(r.top - 6, 4), l = Math.max(r.left - 6, 4), d = Math.min(r.right + 6, vw - 4);
    let b = Math.min(r.bottom + 6, vh - 4);
    const ph = pop.offsetHeight, pw = pop.offsetWidth;
    let y, x = Math.min(Math.max(8, r.left + r.width/2 - pw/2), vw - pw - 8);
    if(t - ph - M >= 8) y = t - ph - M;                    // acima da função (preferido)
    else if(b + M + ph <= vh - 8) y = b + M;               // abaixo, se faltar espaço em cima
    else if(d + M + pw <= vw - 8){ x = d + M; y = Math.min(Math.max(8, t), vh - ph - 8); }   // ao lado (ex.: menu lateral do computador)
    else if(vh - ph - M - 8 - t >= 80){ b = vh - ph - M - 8; y = b + M; }   // cartão alto: destaca só o começo dele e o balão vem logo abaixo
    else y = Math.max(8, vh - ph - 8);                     // sem espaço nenhum: balão no rodapé, por cima
    spot.style.top = t+"px"; spot.style.left = l+"px"; spot.style.width = Math.max(d - l, 0)+"px"; spot.style.height = Math.max(b - t, 0)+"px";
    pop.style.top = Math.round(y)+"px"; pop.style.left = Math.round(Math.max(8, x))+"px";
  }
  function fixoNaTela(el){
    for(let n = el; n && n !== document.body; n = n.parentElement){ const ps = getComputedStyle(n).position; if(ps === "fixed" || ps === "sticky") return true; }
    return false;
  }
  function rola(){
    if(!alvo){ window.scrollTo({top:0, behavior:"instant"}); return; }
    if(fixoNaTela(alvo)) return;   // barra de navegação fixa: rolar não muda nada (e pode escondê-la no celular)
    // deixa espaço para o balão acima: o topo da função fica logo abaixo da altura do balão
    const r = alvo.getBoundingClientRect(), vh = window.innerHeight;
    const desejado = Math.min(vh * 0.45, pop.offsetHeight + 28);
    window.scrollTo({top: Math.max(0, window.scrollY + r.top - desejado), behavior:"instant"});
  }
  function mostra(){
    const p = TOUR_PASSOS[i];
    if(p.aba) showTab(p.aba);
    alvo = tourAlvo(p);
    root.querySelector("#tour-cont").textContent = "Passo "+(i+1)+" de "+TOUR_PASSOS.length;
    root.querySelector("#tour-t").textContent = p.t;
    root.querySelector("#tour-x").textContent = p.x;
    root.querySelector('[data-tour="voltar"]').hidden = i === 0;
    root.querySelector('[data-tour="prox"]').textContent = i === TOUR_PASSOS.length - 1 ? "Concluir" : "Próximo";
    pop.classList.toggle("centro", !alvo);
    rola();
    posiciona();
    // novas passadas: a aba recém-aberta e a barra do topo/rodapé terminam de se acomodar depois da rolagem
    requestAnimationFrame(posiciona);
    clearTimeout(tPos1); clearTimeout(tPos2);
    tPos1 = setTimeout(posiciona, 180); tPos2 = setTimeout(posiciona, 480);
    pop.focus({preventScroll:true});
  }
  function fim(){
    clearTimeout(tPos1); clearTimeout(tPos2);
    window.removeEventListener("resize", posiciona); window.removeEventListener("scroll", posiciona);
    document.removeEventListener("keydown", tecla, true);
    root.remove();
    if(app) app.inert = false;
    tourAtivo = false;
    marcarTutorial(true);   // concluído ou pulado: não repete (dá para rever em Configurações)
    showTab("painel"); window.scrollTo({top:0, behavior:"instant"});
    const tb = document.getElementById("tab-painel"); if(tb) tb.focus({preventScroll:true});
    if(typeof depois === "function") setTimeout(depois, 300);
  }
  function tecla(e){
    if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); fim(); return; }
    if(e.key === "ArrowRight" && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)){ e.preventDefault(); root.querySelector('[data-tour="prox"]').click(); return; }
    if(e.key === "ArrowLeft" && i > 0){ e.preventDefault(); i--; mostra(); return; }
    if(e.key === "Tab"){   // foco preso no balão
      const it = Array.from(pop.querySelectorAll("button")).filter(x=> !x.hidden);
      if(!it.length) return;
      const a = it[0], z = it[it.length - 1];
      if(e.shiftKey && (document.activeElement === a || document.activeElement === pop)){ e.preventDefault(); z.focus(); }
      else if(!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
      else if(!pop.contains(document.activeElement)){ e.preventDefault(); a.focus(); }
    }
  }
  root.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-tour]"); if(!b) return;
    if(b.dataset.tour === "pular") fim();
    else if(b.dataset.tour === "voltar"){ if(i > 0){ i--; mostra(); } }
    else if(i < TOUR_PASSOS.length - 1){ i++; mostra(); }
    else fim();
  });
  window.addEventListener("resize", posiciona); window.addEventListener("scroll", posiciona, {passive:true});
  document.addEventListener("keydown", tecla, true);
  mostra();
}

/* ============================================================
   MODAL
   ============================================================ */
let modalOpener = null, modalDismissible = true;
const MODAL_FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';
function modalKeydown(e){
  const root = document.getElementById("modal-root");
  const modal = root && root.querySelector(".modal");
  if(!modal) return;
  if(e.key === "Escape" && modalDismissible){ e.preventDefault(); closeModal(); return; }
  if(e.key !== "Tab") return;
  const items = Array.from(modal.querySelectorAll(MODAL_FOCUSABLE)).filter(el=> el.offsetParent !== null || el === document.activeElement);
  if(!items.length){ e.preventDefault(); modal.focus(); return; }
  const first = items[0], last = items[items.length-1];
  if(!modal.contains(document.activeElement)){ e.preventDefault(); first.focus(); }
  else if(e.shiftKey && (document.activeElement === first || document.activeElement === modal)){ e.preventDefault(); last.focus(); }
  else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}
function openModal(contentEl, opts){
  const dismissible = !opts || opts.dismissible !== false;
  const root = document.getElementById("modal-root");
  const wasOpen = !!root.querySelector(".modal");
  if(!wasOpen) modalOpener = document.activeElement;
  modalDismissible = dismissible;
  root.innerHTML = "";
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const modal = document.createElement("div");
  modal.className = "modal";
  // semântica de diálogo: leitores de tela anunciam o título e ignoram o resto da página
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.tabIndex = -1;
  modal.appendChild(contentEl);
  const heading = modal.querySelector("h1,h2,h3,.modal-title");
  if(heading){
    if(!heading.id) heading.id = "modal-title";
    modal.setAttribute("aria-labelledby", heading.id);
  } else {
    modal.setAttribute("aria-label", "Janela");
  }
  backdrop.appendChild(modal);
  if(dismissible){
    backdrop.addEventListener("click", (e)=>{ if(e.target===backdrop) closeModal(); });
  }
  root.appendChild(backdrop);
  const app = document.querySelector(".app");
  if(app) app.inert = true;   // foco e leitor de tela ficam só no modal
  if(!wasOpen) document.addEventListener("keydown", modalKeydown);
  // foco inicial no próprio diálogo (não num campo: evita abrir o teclado do celular sozinho)
  modal.focus({preventScroll:true});
}
function closeModal(){
  const root = document.getElementById("modal-root");
  const wasOpen = !!root.querySelector(".modal");
  root.innerHTML = "";
  const app = document.querySelector(".app");
  if(app) app.inert = false;
  document.removeEventListener("keydown", modalKeydown);
  if(wasOpen && modalOpener && document.contains(modalOpener) && typeof modalOpener.focus === "function"){
    modalOpener.focus({preventScroll:true});
  }
  modalOpener = null;
}

/* ============================================================
   CADASTRO INICIAL (pop-up de boas-vindas, primeira vez apenas)
   v98 — 2 passos: (1) idade, objetivo, experiência, dias e local de treino; (2) nome, altura, peso, sexo para cálculo e tema.
   Cintura, quadril e pescoço são opcionais (podem ser preenchidos depois na aba Corpo).
   ============================================================ */
const INFO_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>';

/* Validação pura (sem DOM): devolve [{campo, msg}] na ordem em que os campos aparecem na tela. */
function validarCadastroPasso(passo, d){
  const er = [];
  if(passo === 1){
    const idade = parseNumPt(d.idade);
    if(!isFinite(idade)) er.push({campo:"idade", msg:"Informe sua idade, só com números."});
    else if(idade !== Math.floor(idade)) er.push({campo:"idade", msg:"Use só números inteiros, por exemplo 16."});
    else if(idade < IDADE_MIN) er.push({campo:"idade", msg:"O app é para quem tem "+IDADE_MIN+" anos ou mais."});
    else if(idade > IDADE_MAX) er.push({campo:"idade", msg:"Informe uma idade entre "+IDADE_MIN+" e "+IDADE_MAX+" anos."});
    if(!d.objetivo) er.push({campo:"objetivo", msg:"Escolha o que você quer com o treino."});
    else if(d.objetivo === "emagrecer" && menorDeIdade(idade)) er.push({campo:"objetivo", msg:"Até os 17 anos o app não sugere emagrecimento. Escolha outro objetivo."});
    if(!d.experiencia) er.push({campo:"experiencia", msg:"Escolha sua experiência com treino."});
    if(!d.dias) er.push({campo:"dias", msg:"Escolha quantos dias por semana você quer treinar."});
    if(!d.local) er.push({campo:"local", msg:"Escolha onde você vai treinar."});
    if(!Array.isArray(d.focos) || !d.focos.length) er.push({campo:"foco", msg:"Escolha o seu foco: até 2 grupos ou Corpo todo (full body)."});
  } else {
    const nome = String(d.nome || "").trim();
    if(!nome) er.push({campo:"nome", msg:"Diga como quer ser chamado(a)."});
    else if(nome.length < 2 || nome.length > 30) er.push({campo:"nome", msg:"Use entre 2 e 30 letras."});
    const alturaTxt = String(d.alturaCm == null ? "" : d.alturaCm).trim();
    const altura = normalizarAlturaCm(alturaTxt).cm;
    if(!alturaTxt) er.push({campo:"altura", msg:"Informe sua altura em centímetros (por exemplo, 165)."});
    else if(!altura || altura < 100 || altura > 230) er.push({campo:"altura", msg:"Altura em centímetros, entre 100 e 230 (por exemplo, 152)."});
    const pesoTxt = String(d.pesoKg == null ? "" : d.pesoKg).trim();
    const peso = parseNumPt(pesoTxt);
    if(!pesoTxt) er.push({campo:"peso", msg:"Informe seu peso em kg (por exemplo, 62,5)."});
    else if(!isFinite(peso) || peso < 20 || peso > 400) er.push({campo:"peso", msg:"Peso entre 20 e 400 kg."});
    if(!d.sexo) er.push({campo:"sexo", msg:"Escolha uma opção. Pode ser “Prefiro não informar”."});
    [["cintura","cinturaCm","Cintura",30,250],["quadril","quadrilCm","Quadril",30,250],["pescoco","pescocoCm","Pescoço",15,100]].forEach(([id,k,nome2,mn,mx])=>{
      const t = String(d[k] == null ? "" : d[k]).trim();
      if(!t) return;
      const v = parseNumPt(t);
      if(!isFinite(v) || v < mn || v > mx) er.push({campo:id, msg:nome2+" entre "+mn+" e "+mx+" cm, ou deixe em branco."});
    });
  }
  return er;
}

function openOnboarding(){
  const draft = {
    nome:"", idade:"", objetivo:"", experiencia:"", dias:"", local:"",
    alturaCm:"", pesoKg:"", sexo:"", nivelAtividade:"leve",
    cinturaCm:"", quadrilCm:"", pescocoCm:"", focos:[]
  };
  let step = 0;

  function renderStep(){
    const body = document.createElement("div");
    if(step === 0) body.innerHTML = stepWelcome();
    else if(step === 1) body.innerHTML = stepTreino();
    else if(step === 2) body.innerHTML = stepSobreVoce();
    else body.innerHTML = stepObrigado();
    openModal(body, {dismissible:false});
    wireStep(body);
  }

  function stepWelcome(){
    return '<div style="text-align:center; padding:10px var(--sp-1) var(--sp-1);">'+
      '<div style="font-size:var(--fs-num-xl); margin-bottom:var(--sp-2); color:var(--accent-fg,var(--accent));">'+ic('zap')+'</div>'+
      '<h2 class="u-fs24">Bem-vindo(a) ao NG+!</h2>'+
      '<div class="sub u-mb20">Seu parceiro de treino, dieta e evolução corporal. São só 2 passos rápidos para montar o seu plano.</div>'+
      '<button class="btn primary block" id="ob-start">Bora começar os treinos?</button>'+
      '</div>';
  }

  function cartoes(nome, lista, sel, cols){
    return '<div class="ob-cards'+(cols?' '+cols:'')+'">'+lista.map(o=>
      '<label class="ob-card" data-v="'+o.v+'"><input type="radio" name="ob-'+nome+'" value="'+o.v+'"'+(sel===o.v?' checked':'')+'><b>'+o.t+'</b>'+(o.d?'<span>'+o.d+'</span>':'')+'</label>').join("")+'</div>';
  }
  function grupo(id, titulo, dica, cartoesHtml, extra){
    return '<fieldset class="ob-grupo" id="ob-g-'+id+'" aria-describedby="ob-err-'+id+'"><legend>'+titulo+(dica?' <span class="ob-dica">'+dica+'</span>':'')+'</legend>'+(extra||'')+cartoesHtml+
      '<div class="field-err" id="ob-err-'+id+'" role="alert" hidden></div></fieldset>';
  }

  function stepTreino(){
    return '<h2>Vamos montar o seu plano</h2>'+
      '<div class="sub">Passo 1 de 2 · leva menos de 1 minuto.</div>'+
      '<div class="grid u-gap16">'+
        '<label>Sua idade<input type="number" id="ob-idade" inputmode="numeric" min="'+IDADE_MIN+'" max="'+IDADE_MAX+'" step="1" autocomplete="off" placeholder="ex.: 16" value="'+escapeHtml(draft.idade)+'"><div class="field-err" id="ob-err-idade" role="alert" hidden></div></label>'+
        grupo("objetivo", "O que você quer com o treino?", "", cartoes("objetivo", OB_OBJETIVOS, draft.objetivo),
          '<div class="ob-aviso" id="ob-aviso-menor" role="note" hidden>Até os 17 anos o corpo ainda está crescendo, por isso o app não sugere dieta para emagrecer nem metas agressivas. Se quiser perder peso, converse antes com um médico ou nutricionista.</div>')+
        grupo("experiencia", "Sua experiência com treino", "", cartoes("experiencia", OB_EXPERIENCIA, draft.experiencia))+
        grupo("dias", "Dias de treino por semana", "— quantos você realmente consegue", cartoes("dias", OB_DIAS, draft.dias, "cols5"))+
        grupo("local", "Onde você treina", "", cartoes("local", OB_LOCAL, draft.local))+
        grupo("foco", "Qual é o seu foco corporal?", "— obrigatório", '<div id="ob-foco">'+focoChipsHtml(draft.focos)+'</div><div class="foco-msg" id="ob-foco-msg" aria-live="polite"></div>')+
      '</div>'+
      '<div class="foot-note u-err" id="ob-erro" role="alert"></div>'+
      '<div class="modal-actions"><button class="btn primary block" id="ob-next1">Continuar</button></div>';
  }

  function stepSobreVoce(){
    const niveis = ACTIVITY_LEVELS.map(l=>'<option value="'+l.v+'">'+l.label+' — '+l.desc+'</option>').join("");
    return '<h2>Sobre você</h2>'+
      '<div class="sub">Passo 2 de 2 · esses dados servem só para os cálculos de gasto calórico e composição corporal.</div>'+
      '<div class="grid u-gap12">'+
        '<label>Como quer ser chamado(a)?<input type="text" id="ob-nome" maxlength="30" autocomplete="nickname" value="'+escapeHtml(draft.nome)+'"><div class="field-err" id="ob-err-nome" role="alert" hidden></div></label>'+
        '<div class="field-row">'+
          '<label>Altura (cm)<input type="number" id="ob-altura" inputmode="decimal" step="any" placeholder="ex.: 165" value="'+escapeHtml(draft.alturaCm)+'"><div class="field-err" id="ob-err-altura" role="alert" hidden></div></label>'+
          '<label>Peso (kg)<input type="number" id="ob-peso" inputmode="decimal" step="any" placeholder="ex.: 62,5" value="'+escapeHtml(draft.pesoKg)+'"><div class="field-err" id="ob-err-peso" role="alert" hidden></div></label>'+
        '</div>'+
        '<label>Gênero para cálculo<select id="ob-sexo"><option value="">Selecione</option><option value="M">Masculino</option><option value="F">Feminino</option><option value="N">Prefiro não informar</option></select>'+
          '<span class="ob-dica">Muda só as fórmulas (gasto calórico, % de gordura). Sem informar, o app usa valores médios e não estima o % de gordura.</span>'+
          '<div class="field-err" id="ob-err-sexo" role="alert" hidden></div></label>'+
        '<label>Rotina no dia a dia (fora do treino)<select id="ob-nivel">'+niveis+'</select></label>'+
        '<details class="ob-opc"><summary>Já tem as medidas? Preencher agora (opcional)</summary>'+
          '<div class="callout u-mb14">'+INFO_ICON+'<div><strong>Como medir rapidinho:</strong><br>'+comoMedirCurto(draft.sexo === "M" || draft.sexo === "F" ? draft.sexo : null)+'</div></div>'+
          '<div class="field-row">'+
            '<label>Cintura (cm)<input type="number" step="any" inputmode="decimal" id="ob-cintura" value="'+escapeHtml(draft.cinturaCm)+'"><div class="field-err" id="ob-err-cintura" role="alert" hidden></div></label>'+
            '<label>Quadril (cm)<input type="number" step="any" inputmode="decimal" id="ob-quadril" value="'+escapeHtml(draft.quadrilCm)+'"><div class="field-err" id="ob-err-quadril" role="alert" hidden></div></label>'+
          '</div>'+
          '<label>Pescoço (cm)<input type="number" step="any" inputmode="decimal" id="ob-pescoco" value="'+escapeHtml(draft.pescocoCm)+'"><div class="field-err" id="ob-err-pescoco" role="alert" hidden></div></label>'+
        '</details>'+
        '<fieldset class="ob-grupo"><legend>Aparência <span class="ob-dica">— você muda quando quiser em Configurações</span></legend>'+
          '<div class="theme-row" id="ob-theme-row" role="radiogroup" aria-label="Tema do app"></div>'+
          '<div id="ob-theme-modo-wrap" hidden><div class="seg" id="ob-theme-modo" role="group" aria-label="Claro ou escuro"><button type="button" data-v="claro" aria-pressed="false">Claro</button><button type="button" data-v="escuro" aria-pressed="false">Escuro</button></div></div>'+
        '</fieldset>'+
      '</div>'+
      '<div class="foot-note u-err" id="ob-erro" role="alert"></div>'+
      '<div class="modal-actions"><button class="btn" id="ob-back2">Voltar</button><button class="btn primary" id="ob-next2">Concluir cadastro</button></div>';
  }

  function stepObrigado(){
    const primeiroNome = (draft.nome||"").trim().split(" ")[0] || "";
    return '<div style="text-align:center; padding:10px var(--sp-1) var(--sp-1);">'+
      '<div style="font-size:var(--fs-num-xl); margin-bottom:var(--sp-2); color:var(--accent-fg,var(--accent));">'+ic('sparkles')+'</div>'+
      '<h2>Cadastro concluído!</h2>'+
      '<div class="sub u-mb20">'+(primeiroNome?('Tudo pronto, '+escapeHtml(primeiroNome)+'! '):'Tudo pronto! ')+'Seu perfil está salvo. Agora é só treinar — bons treinos!</div>'+
      '<button class="btn primary block" id="ob-finish">Ir para o Painel</button>'+
      '</div>';
  }

  /* erros por campo: mensagem embaixo do campo, aria-invalid + aria-describedby, e foco no primeiro com problema */
  function mostrarErros(body, erros){
    body.querySelectorAll(".field-err").forEach(e=>{ e.hidden = true; e.textContent = ""; });
    body.querySelectorAll("[aria-invalid]").forEach(x=> x.removeAttribute("aria-invalid"));
    body.querySelectorAll(".ob-grupo.is-invalid").forEach(g=> g.classList.remove("is-invalid"));
    erros.forEach(({campo, msg})=>{
      const e = body.querySelector("#ob-err-"+campo); if(e){ e.textContent = msg; e.hidden = false; }
      const inp = body.querySelector("#ob-"+campo);
      if(inp){ inp.setAttribute("aria-invalid","true"); inp.setAttribute("aria-describedby","ob-err-"+campo); }
      const g = body.querySelector("#ob-g-"+campo); if(g) g.classList.add("is-invalid");
    });
    const resumo = body.querySelector("#ob-erro");
    if(resumo) resumo.textContent = erros.length ? (erros.length === 1 ? "Falta ajustar 1 campo, marcado acima." : "Faltam ajustes em "+erros.length+" campos, marcados acima.") : "";
    if(erros.length){
      const c = erros[0].campo;
      const alvo = body.querySelector("#ob-"+c) || body.querySelector("#ob-g-"+c+" input:checked") || body.querySelector("#ob-g-"+c+" input") || body.querySelector("#ob-g-"+c+" .foco-chip");
      if(c === "cintura" || c === "quadril" || c === "pescoco"){ const d = body.querySelector(".ob-opc"); if(d) d.open = true; }
      if(alvo){ alvo.focus({preventScroll:true}); alvo.scrollIntoView({block:"center", behavior:"auto"}); }
    }
  }
  function limpaErro(body, campo){
    const e = body.querySelector("#ob-err-"+campo); if(e){ e.hidden = true; e.textContent = ""; }
    const inp = body.querySelector("#ob-"+campo); if(inp){ inp.removeAttribute("aria-invalid"); inp.removeAttribute("aria-describedby"); }
    const g = body.querySelector("#ob-g-"+campo); if(g) g.classList.remove("is-invalid");
    const resumo = body.querySelector("#ob-erro");
    if(resumo){ const n = body.querySelectorAll(".field-err:not([hidden])").length; resumo.textContent = n ? (n === 1 ? "Falta ajustar 1 campo, marcado acima." : "Faltam ajustes em "+n+" campos, marcados acima.") : ""; }
  }

  function wireStep(body){
    if(step === 0){
      body.querySelector("#ob-start").addEventListener("click", ()=>{ step = 1; renderStep(); });
      return;
    }
    if(step === 1){
      const aviso = body.querySelector("#ob-aviso-menor");
      const cardEmagrecer = body.querySelector('.ob-card[data-v="emagrecer"]');
      function syncMenor(){
        const menor = menorDeIdade(parseNumPt(draft.idade)) && parseNumPt(draft.idade) >= IDADE_MIN;
        cardEmagrecer.hidden = menor; aviso.hidden = !menor;
        if(menor && draft.objetivo === "emagrecer"){
          draft.objetivo = "";
          body.querySelectorAll('input[name="ob-objetivo"]').forEach(r=> r.checked = false);
        }
      }
      body.querySelector("#ob-idade").addEventListener("input", e=>{ draft.idade = e.target.value; limpaErro(body, "idade"); syncMenor(); });
      [["objetivo","objetivo"],["experiencia","experiencia"],["dias","dias"],["local","local"]].forEach(([nome, campo])=>{
        body.querySelectorAll('input[name="ob-'+nome+'"]').forEach(r=> r.addEventListener("change", ()=>{ draft[campo] = r.value; limpaErro(body, campo); }));
      });
      syncMenor();
      wireFocoChips(body.querySelector("#ob-foco"), draft.focos, msg=>{ body.querySelector("#ob-foco-msg").textContent = msg; }, ()=> limpaErro(body, "foco"));
      body.querySelector("#ob-next1").addEventListener("click", ()=>{
        const erros = validarCadastroPasso(1, draft);
        mostrarErros(body, erros);
        if(erros.length) return;
        step = 2; renderStep();
      });
      return;
    }
    if(step === 2){
      body.querySelector("#ob-sexo").value = draft.sexo;
      body.querySelector("#ob-nivel").value = draft.nivelAtividade;
      [["nome","nome"],["altura","alturaCm"],["peso","pesoKg"],["cintura","cinturaCm"],["quadril","quadrilCm"],["pescoco","pescocoCm"]].forEach(([id,k])=>{
        body.querySelector("#ob-"+id).addEventListener("input", e=>{ draft[k] = e.target.value; limpaErro(body, id); });
      });
      body.querySelector("#ob-sexo").addEventListener("change", e=>{ draft.sexo = e.target.value; limpaErro(body, "sexo"); });
      body.querySelector("#ob-nivel").addEventListener("change", e=>{ draft.nivelAtividade = e.target.value; });
      // tema: aplica na hora (a pessoa vê o resultado) e pode trocar depois em Configurações
      const sw = a => '<span class="theme-sw" aria-hidden="true">'+a.map(c=>'<i style="background:'+c+'"></i>').join("")+'</span>';
      const row = body.querySelector("#ob-theme-row");
      function pintaTemas(){
        const atual = temaAtual() || "padrao", modo = temaModo();
        row.innerHTML = temaBotoesHtml(atual, modo);
        row.querySelectorAll(".theme-opt").forEach(b=> b.addEventListener("click", ()=>{ const sel = temaSeletor(b); temaEscolhe(b); pintaTemas(); const nb = row.querySelector(sel); if(nb) nb.focus(); }));
        body.querySelector("#ob-theme-modo-wrap").hidden = atual === "padrao";
        body.querySelectorAll("#ob-theme-modo button").forEach(b=>{
          const on = b.dataset.v === modo; b.classList.toggle("active", on); b.setAttribute("aria-pressed", String(on));
          b.onclick = ()=>{ setTema(atual, b.dataset.v); pintaTemas(); const nb = body.querySelector('#ob-theme-modo [data-v="'+b.dataset.v+'"]'); if(nb) nb.focus(); };
        });
      }
      pintaTemas();
      body.querySelector("#ob-back2").addEventListener("click", ()=>{ step = 1; renderStep(); });
      body.querySelector("#ob-next2").addEventListener("click", ()=>{
        const erros = validarCadastroPasso(2, draft);
        mostrarErros(body, erros);
        if(erros.length) return;
        finalizeOnboarding(draft);
        step = 3; renderStep();
      });
      return;
    }
    // step 3
    body.querySelector("#ob-finish").addEventListener("click", ()=>{
      closeModal();
      showTab("painel");
      render();
      aposCadastro();
    });
  }

  renderStep();
}

function finalizeOnboarding(draft){
  const iso = todayISO();
  const nome = String(draft.nome).trim();
  const obj = OB_OBJETIVOS.find(o=> o.v === draft.objetivo);
  const perfilData = {
    nomeCompleto: nome,
    nomeUsuario: nome,
    sexo: sexoValido(draft.sexo) ? draft.sexo : null,   // null = "prefiro não informar" (fórmulas usam valores médios)
    idade: parseNumPt(draft.idade),
    alturaCm: normalizarAlturaCm(draft.alturaCm).cm,
    ativo: draft.nivelAtividade !== "sedentario",
    nivelAtividade: draft.nivelAtividade,
    objetivo: obj ? obj.dieta : "manutencao",            // mesmos valores que a Dieta já usa: superavit | deficit | manutencao
    experiencia: draft.experiencia,
    diasSemana: Number(draft.dias),
    local: draft.local,
    pesoMetaKg: null,
    criadoEm: iso,
    focos: Array.isArray(draft.focos) ? draft.focos.slice(0,2) : [],
  };
  const medicaoData = { data: iso, pesoKg: parseNumPt(draft.pesoKg) };
  [["cinturaCm","cinturaCm"],["quadrilCm","quadrilCm"],["pescocoCm","pescocoCm"]].forEach(([k])=>{
    const v = parseNumPt(draft[k]);
    if(isFinite(v) && v > 0) medicaoData[k] = v;
  });
  state.perfil = perfilData;
  state.medicoes[iso] = medicaoData;
  saveDoc("config/perfil", perfilData);
  saveDoc("medicoes/"+iso, medicaoData);
  aplicarPlanoInicial(perfilData, iso);
  render();
}
/* v98 (Fase 2): grava o plano inicial só quando ainda não existe rotina salva; quem já tem rotina nunca tem os treinos trocados */
function aplicarPlanoInicial(perfilData, iso){
  if(!state.rotinaIsExample){ ajustarRotinaExemplo(); return null; }
  const plano = planoInicial(perfilData);
  state.rotina = plano.rotina;
  state.rotinaIsExample = false;
  DAYS.forEach(k=> saveDoc("rotina/"+k, plano.rotina[k]));
  state.settings = Object.assign({}, state.settings, {planoInicial:{split:plano.split, sessoes:plano.sessoes, exp:plano.exp, local:plano.local, porque:plano.porque, criadoEm:iso, visto:false}});
  saveDoc("config/settings", state.settings);
  return plano;
}
/* "Por que este plano": aparece no Hoje até o primeiro treino concluído (ou até "Entendi") e fica sempre no Treino */
function treinoConcluidoDesde(iso){
  return Object.keys(state.checkins).some(k=> k >= iso && state.checkins[k] && state.checkins[k].concluido);
}
function renderPlanoPorque(){
  const hoje = document.getElementById("plano-porque-hoje"), treino = document.getElementById("plano-porque-treino");
  const pi = state.settings && state.settings.planoInicial;
  const ok = pi && Array.isArray(pi.porque) && pi.porque.length;
  /* conta antiga sem foco corporal: o foco é obrigatório, então o Hoje pede a escolha até ela acontecer */
  const semFoco = !!(state.perfil && !carregando && focosDoPerfil().length === 0);
  const titulo = ok ? "Seu plano: "+escapeHtml(pi.split)+" · "+pi.sessoes+" treino"+(pi.sessoes>1?"s":"")+" por semana" : "";
  if(hoje){
    const mostrar = ok && !pi.visto && !treinoConcluidoDesde(pi.criadoEm || "0000");
    hoje.hidden = !(mostrar || semFoco);
    if(semFoco){
      hoje.innerHTML = '<div class="eyebrow">Falta um passo</div>'+
        '<h3 id="ppq-hoje-t">Escolha o seu foco corporal</h3>'+
        '<p class="ppq-txt">Diga onde quer dar mais atenção (até 2 grupos) ou escolha Corpo todo (full body). Leva 10 segundos e ajusta as metas do seu treino.</p>'+
        '<div class="ppq-acoes"><button type="button" class="btn small primary" data-ppq="foco">Escolher foco</button></div>';
    } else if(mostrar){
      hoje.innerHTML = '<div class="eyebrow">Por que este plano</div>'+
        '<h3 id="ppq-hoje-t">'+titulo+'</h3>'+
        '<p class="ppq-txt">'+escapeHtml(pi.porque[0])+'</p>'+
        '<div class="ppq-acoes"><button type="button" class="btn small" data-ppq="ver">Ver o plano completo</button>'+
        '<button type="button" class="btn small ghost" data-ppq="ok">Entendi</button></div>';
    } else hoje.innerHTML = "";
  }
  if(treino){
    treino.hidden = !ok;
    if(ok){
      treino.innerHTML = '<div class="eyebrow">Por que este plano</div>'+
        '<h3 id="ppq-treino-t">'+titulo+'</h3>'+
        '<ul class="ppq-lista">'+pi.porque.map(t=>'<li>'+escapeHtml(t)+'</li>').join("")+'</ul>'+
        '<p class="hint">É só o ponto de partida: troque exercícios, dias e séries em Editar rotina quando quiser.</p>';
    } else treino.innerHTML = "";
  }
}
document.addEventListener("click", (ev)=>{
  const b = ev.target.closest && ev.target.closest("[data-ppq]");
  if(!b) return;
  if(b.dataset.ppq === "ver"){ showTabAnimated("treino"); return; }
  if(b.dataset.ppq === "foco"){ openFocoEscolha(); return; }
  if(b.dataset.ppq === "ok" && state.settings.planoInicial){
    state.settings = Object.assign({}, state.settings, {planoInicial:Object.assign({}, state.settings.planoInicial, {visto:true})});
    saveDoc("config/settings", state.settings);
    render();
    const alvo = document.getElementById("btn-treino-ao-vivo"); if(alvo && !alvo.disabled) alvo.focus();
  }
});

/* ============================================================
   CALCULADORAS RÁPIDAS (1RM, anilhas, aquecimento) — ferramentas
   isoladas, sem estado persistido: recalculam direto a cada input.
   ============================================================ */
function renderCalc1RM(){
  const peso = Number(document.getElementById("calc-1rm-peso").value);
  const reps = Number(document.getElementById("calc-1rm-reps").value);
  const out = document.getElementById("calc-1rm-result");
  if(!peso || !reps || reps<1){ out.innerHTML = ""; return; }
  if(reps === 1){ out.innerHTML = "1RM estimado: <strong>"+fmtKg(peso)+" kg</strong>"; return; }
  const oneRM = peso * (1 + reps/30);
  out.innerHTML = "1RM estimado: <strong>"+fmtKg(oneRM)+" kg</strong> <span class=\"calc-hint\">(estimativa — não substitui um teste real de carga máxima)</span>";
}
const PLATE_SET_KG = [25,20,15,10,5,2.5,1.25];
function renderCalcPlate(){
  const total = Number(document.getElementById("calc-plate-total").value);
  const bar = Number(document.getElementById("calc-plate-bar").value) || 20;
  const out = document.getElementById("calc-plate-result");
  if(!total || total<=bar){ out.innerHTML = ""; return; }
  let perSide = (total-bar)/2;
  const used = [];
  PLATE_SET_KG.forEach(p=>{
    while(perSide >= p - 0.001){ used.push(p); perSide -= p; }
  });
  if(!used.length){ out.innerHTML = "Peso igual ou menor que a barra."; return; }
  out.innerHTML = "Por lado: <strong>"+used.map(p=>fmtKg(p)).join(" + ")+"</strong> kg"+
    (perSide>0.01 ? ' <span class="calc-hint">(sobra '+fmtKg(perSide)+' kg — sem anilha padrão pra esse valor)</span>' : "");
}
function renderCalcWarmup(){
  const peso = Number(document.getElementById("calc-warmup-peso").value);
  const out = document.getElementById("calc-warmup-result");
  if(!peso){ out.innerHTML = ""; return; }
  const steps = [{pct:.4,reps:"8-10"},{pct:.6,reps:"5-6"},{pct:.8,reps:"3-4"}];
  out.innerHTML = steps.map(s=>fmtKg(peso*s.pct)+" kg × "+s.reps).join(" → ")+
    ' → <strong>'+fmtKg(peso)+' kg</strong> <span class="calc-hint">(carga de trabalho)</span>';
}
["calc-1rm-peso","calc-1rm-reps"].forEach(id=> document.getElementById(id).addEventListener("input", renderCalc1RM));
["calc-plate-total","calc-plate-bar"].forEach(id=> document.getElementById(id).addEventListener("input", renderCalcPlate));
document.getElementById("calc-warmup-peso").addEventListener("input", renderCalcWarmup);

/* ============================================================
   EXPORTAR RESUMO DO MÊS (PDF) — sem biblioteca externa (artifacts
   não carregam scripts de terceiros): usa a janela de impressão
   nativa do navegador, que no Chrome/Edge/Firefox tem "Salvar como
   PDF" como opção de destino. #print-report fica oculto na tela e só
   aparece no layout de impressão (ver @media print no CSS).
   ============================================================ */
function buildPrintReportHtml(){
  const r = computeResumoMes();
  const cfg = r.cfg;
  const a = r.anterior;
  const pct = r.scheduled ? Math.round((r.done/r.scheduled)*100) : null;
  const pctAnt = a.scheduled ? Math.round((a.done/a.scheduled)*100) : null;
  const nome = (state.perfil && state.perfil.nomeCompleto) || "";
  const records = computeRecordesPessoais();

  const tile = (val, label, cmp) =>
    '<div class="pr-tile"><b>'+val+'</b><span>'+label+'</span>'+(cmp?'<span class="pr-cmp">'+cmp+'</span>':'')+'</div>';

  const prsHtml = r.prs.length
    ? '<table class="pr-table"><thead><tr><th>Exercício</th><th>Novo recorde</th></tr></thead><tbody>'+
        r.prs.map(p=>'<tr><td>'+escapeHtml(p.nome)+'</td><td>'+fmtKg(p.peso)+' kg</td></tr>').join("")+
      '</tbody></table>'
    : '<div class="u-sm-muted">Nenhum recorde batido nesse período.</div>';

  const recordesHtml = records.length
    ? '<table class="pr-table"><thead><tr><th>Exercício</th><th>Recorde atual</th><th>Data</th></tr></thead><tbody>'+
        records.slice(0,20).map(rec=>'<tr><td>'+escapeHtml(rec.nome)+'</td><td>'+fmtKg(rec.peso)+' kg</td><td>'+fmtDateBR(rec.iso)+'</td></tr>').join("")+
      '</tbody></table>'
    : '<div class="u-sm-muted">Sem recordes registrados ainda.</div>';

  return (
    '<div class="pr-head"><h1>NG+ — '+r.cfg.rel+'</h1><span>'+(nome?escapeHtml(nome)+" · ":"")+fmtDateBR(r.start)+' a '+fmtDateBR(r.end)+'</span></div>'+
    '<div class="pr-section"><h2>Resumo do período</h2><div class="pr-grid">'+
      tile(pct==null?"—":pct+"%", "Treinos concluídos", (cfg.ant && pct!=null && pctAnt!=null)?((pct>=pctAnt?"↑":"↓")+" vs. "+pctAnt+"% "+cfg.antNo):"")+
      tile(r.prs.length, "Recordes no período", (cfg.ant && (a.prs.length||r.prs.length))?(cfg.ant+": "+a.prs.length):"")+
      tile(r.pesoDelta==null?"—":(r.pesoDelta>0?"+":"")+num(r.pesoDelta,1)+" kg", "Variação de peso", (cfg.ant && r.pesoDelta!=null&&a.pesoDelta!=null)?(cfg.ant+": "+(a.pesoDelta>0?"+":"")+num(a.pesoDelta,1)+" kg"):"")+
      tile(r.cinturaDelta==null?"—":(r.cinturaDelta>0?"+":"")+num(r.cinturaDelta,1)+" cm", "Variação de cintura", (cfg.ant && r.cinturaDelta!=null&&a.cinturaDelta!=null)?(cfg.ant+": "+(a.cinturaDelta>0?"+":"")+num(a.cinturaDelta,1)+" cm"):"")+
    '</div></div>'+
    '<div class="pr-section"><h2>Recordes batidos no período</h2>'+prsHtml+'</div>'+
    '<div class="pr-section"><h2>Hall de recordes (recorde atual por exercício)</h2>'+recordesHtml+'</div>'+
    '<div class="pr-foot">Gerado pelo NG+ em '+fmtDateBR(todayISO())+'. Dados autodeclarados pelo usuário — não substitui acompanhamento profissional.</div>'
  );
}
function exportarResumoMesPDF(){
  const el = document.getElementById("print-report");
  if(!el) return;
  el.innerHTML = buildPrintReportHtml();
  window.print();
}
document.getElementById("btn-export-resumo-pdf").addEventListener("click", exportarResumoMesPDF);

/* ============================================================
   EXPORTAR DADOS (JSON) — capability "downloads", com fallback
   <a download> fora do runtime de artifact (ex.: arquivo avulso).
   ============================================================ */
// v79: o backup guarda só o PONTEIRO das fotos (id do arquivo no armazenamento do artifact), não a imagem.
// Restaurando neste mesmo artifact, as fotos reaparecem; em outro artifact o arquivo não existe lá.
function fotosParaBackup(){
  const out = {};
  Object.entries(state.fotos||{}).forEach(([id,f])=>{
    if(f && typeof f.assetId === "string") out[id] = {iso:f.iso, assetId:f.assetId, criadoEm:f.criadoEm||0};
  });
  return out;
}
async function exportarDadosJSON(){
  let fotosArquivos = null;   // A1: fora do Claude o backup leva as imagens (reduzidas) junto
  if(window.bffRuntime){ try{ fotosArquivos = await window.bffRuntime.exportarFotos(Object.values(fotosParaBackup()).map(f=>f.assetId)); }catch(e){ fotosArquivos = null; } }
  const payload = {
    app: "ritmo-de-ferro",
    schemaVersion: SCHEMA_VERSION,
    exportadoEm: new Date().toISOString(),
    perfil: state.perfil,
    settings: state.settings,
    rotina: state.rotina,
    checkins: state.checkins,
    medicoes: state.medicoes,
    fotos: fotosParaBackup(),
  };
  if(fotosArquivos && Object.keys(fotosArquivos).length) payload.fotosArquivos = fotosArquivos;
  const json = JSON.stringify(payload, null, 2);
  const filename = "ng-mais-dados-"+todayISO()+".json";

  if(window.claude && window.claude.use){
    let downloads = null;
    try{ downloads = await window.claude.use("downloads"); }catch(e){ downloads = null; }
    if(!downloads){
      showToast(MSG.semArquivos);
      return;
    }
    const blob = new Blob([json], {type:"application/json"});
    try{
      await downloads.save({filename, data: blob});
      showToast("Backup salvo! Guarde o arquivo em um lugar seguro.");
    }catch(err){
      const code = err && err.code;
      if(code === "declined" || code === "rate_limited"){
        // usuário recusou ou já há um prompt aberto — nada a fazer.
      } else {
        showToast("Não consegui salvar o backup agora."+MSG.tenteDeNovo);
      }
    }
    return;
  }

  const blob = new Blob([json], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
document.getElementById("cfg-export-btn").addEventListener("click", exportarDadosJSON);
if(window.bffRuntime){ const av = document.getElementById("cfg-aviso-local"); if(av){ av.hidden = false; const h = av.previousElementSibling; if(h) h.innerHTML = h.innerHTML.replace("a referência das fotos", "as fotos de progresso"); } }   // A1
// ---- Diagnóstico local: erros ficam só neste aparelho (nada é enviado); o relatório não leva treinos nem dados pessoais
(function setupDiagnostico(){
  const card = document.getElementById("cfg-diag-card"), res = document.getElementById("cfg-diag-resumo");
  const cp = document.getElementById("cfg-diag-copiar"), lp = document.getElementById("cfg-diag-limpar");
  const wrap = document.getElementById("cfg-diag-wrap"), area = document.getElementById("cfg-diag-texto");
  if(!card || !res || !window.ngErros){ if(card) card.hidden = true; return; }
  const atualiza = ()=>{
    const n = window.ngErros.listar().length;
    res.textContent = (n ? n+" tipo(s) de erro registrado(s) neste aparelho." : "Nenhum erro registrado neste aparelho.")+" Os erros ficam só aqui; nada é enviado automaticamente.";
    lp.disabled = !n;
  };
  atualiza();
  const aba = document.getElementById("tab-config"); if(aba) aba.addEventListener("click", atualiza);
  cp.addEventListener("click", async ()=>{
    const t = window.ngErros.texto();
    try{ await navigator.clipboard.writeText(t); showToast("Relatório copiado."); }
    catch(e){ area.value = t; wrap.hidden = false; area.focus(); area.select(); }
  });
  lp.addEventListener("click", ()=>{ window.ngErros.limpar(); wrap.hidden = true; atualiza(); showToast("Diagnóstico limpo."); });
})();

/* ============================================================
   IMPORTAR BACKUP (.json) — v73
   - schemaVersion: 1 = exports antigos (sem o campo); 2 = atual. Se o arquivo
     vier de uma versão mais nova que esta, recusa com aviso (não adivinha).
   - Valida cada pedaço (nunca confia no arquivo): rotina só nos 7 dias,
     check-ins/medições só com chave AAAA-MM-DD e valor objeto.
   - Mescla, nunca apaga. Confirmação dentro da página (confirm() não existe
     no viewer), com opção de baixar o backup atual antes.
   ============================================================ */
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const IMPORT_MAX_BYTES = (window.bffRuntime ? 80 : 5) * 1024 * 1024;   // A1: backup com fotos embutidas é maior
function isObj(x){ return !!x && typeof x === "object" && !Array.isArray(x); }
function migrarBackup(raw){
  const v = Number(raw.schemaVersion) || 1;
  if(v > SCHEMA_VERSION) throw new Error("Esse backup foi feito numa versão mais nova do app. Atualize o app e tente importar de novo.");
  // v1 → v2: só ganhou "app" e "schemaVersion"; o formato dos dados é o mesmo.
  return Object.assign({}, raw, {schemaVersion: SCHEMA_VERSION});
}
function validarBackup(raw){
  if(!isObj(raw)) throw new Error("Esse arquivo não parece um backup do NG+.");
  if(raw.app && raw.app !== "ritmo-de-ferro") throw new Error("Esse backup é de outro aplicativo, então não dá para importar aqui.");
  const b = migrarBackup(raw);
  const out = {perfil:null, settings:null, rotina:{}, checkins:{}, medicoes:{}, fotos:{}, fotosArquivos:{}, exportadoEm:null, ignorados:0};
  if(typeof b.exportadoEm === "string" && !isNaN(Date.parse(b.exportadoEm))) out.exportadoEm = b.exportadoEm;
  if(isObj(b.perfil)) out.perfil = b.perfil; else if(b.perfil != null) out.ignorados++;
  if(isObj(b.settings)) out.settings = b.settings; else if(b.settings != null) out.ignorados++;
  if(isObj(b.rotina)){
    for(const k of DAYS){
      const d = b.rotina[k];
      if(isObj(d) && Array.isArray(d.exercicios) && d.exercicios.every(e=> isObj(e) && typeof e.nome === "string")) out.rotina[k] = d;
      else if(d !== undefined) out.ignorados++;
    }
  }
  migrarNomesDias(out.rotina);   // v96: backups antigos trazem "Empurrar A", "Puxar A"…
  for(const col of ["checkins","medicoes"]){
    if(!isObj(b[col])) continue;
    for(const [id, v] of Object.entries(b[col])){
      if(ISO_RE.test(id) && isObj(v)) out[col][id] = v; else out.ignorados++;
    }
  }
  if(isObj(b.fotos)){
    for(const [id, v] of Object.entries(b.fotos)){
      if(/^\d{6,16}$/.test(id) && isObj(v) && typeof v.assetId === "string" && /^[0-9a-f]{32}$/.test(v.assetId) && ISO_RE.test(String(v.iso||"")))
        out.fotos[id] = {iso:v.iso, assetId:v.assetId, criadoEm:Number(v.criadoEm)||0};
      else out.ignorados++;
    }
  }
  if(isObj(b.fotosArquivos)){   // A1: imagens embutidas no backup (só são gravadas fora do Claude)
    for(const [aid, du] of Object.entries(b.fotosArquivos)){
      if(/^[0-9a-f]{32}$/.test(aid) && typeof du === "string" && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(du)) out.fotosArquivos[aid] = du;
    }
  }
  out.total = Object.keys(out.fotos).length + (out.perfil?1:0) + (out.settings?1:0) + Object.keys(out.rotina).length + Object.keys(out.checkins).length + Object.keys(out.medicoes).length;
  if(!out.total) throw new Error("Não encontrei dados reconhecíveis (perfil, rotina, check-ins, medições ou fotos) neste arquivo.");
  return out;
}
function importPanel(){ return document.getElementById("import-panel"); }
function mostrarImportErro(msg){
  const pn = importPanel(); if(!pn) return;
  pn.hidden = false;
  pn.innerHTML = '<div class="import-err" role="alert">'+escapeHtml(msg)+'</div><div class="import-actions"><button class="btn small" type="button" id="import-cancel">Fechar</button></div>';
  document.getElementById("import-cancel").addEventListener("click", ()=>{ pn.hidden = true; pn.innerHTML = ""; });
  pn.focus();
}
function mostrarImportConfirmacao(d){
  const pn = importPanel();
  const quando = d.exportadoEm ? new Date(d.exportadoEm).toLocaleString("pt-BR") : "data desconhecida";
  const nRot = Object.keys(d.rotina).length, nChk = Object.keys(d.checkins).length, nMed = Object.keys(d.medicoes).length;
  pn.hidden = false;
  pn.innerHTML =
    '<h3>Importar este backup?</h3>'+
    '<ul>'+
      '<li>Gerado em '+escapeHtml(quando)+'</li>'+
      '<li>'+(d.perfil?"Perfil":"Sem perfil")+' · '+(d.settings?"configurações":"sem configurações")+' · '+nRot+' dia(s) de rotina</li>'+
      '<li>'+nChk+' check-in(s) · '+nMed+' medição(ões)'+(Object.keys(d.fotos||{}).length ? ' · '+Object.keys(d.fotos).length+' foto(s)' : '')+'</li>'+
      (Object.keys(d.fotos||{}).length ? (Object.keys(d.fotosArquivos||{}).length ? '<li>Fotos: o backup traz as imagens e elas serão restauradas neste aparelho.</li>' : '<li>Fotos: o backup guarda só a referência — elas reaparecem se este aparelho ainda tiver os arquivos.</li>') : '')+
      (d.ignorados ? '<li>'+d.ignorados+' item(ns) fora do formato foram ignorados</li>' : '')+
      '<li>Nada será apagado: dias iguais serão atualizados com os do arquivo.</li>'+
    '</ul>'+
    '<div class="import-actions">'+
      '<button class="btn primary small" type="button" id="import-confirm">Importar e mesclar</button>'+
      '<button class="btn small" type="button" id="import-backup">Baixar backup atual antes</button>'+
      '<button class="btn small ghost" type="button" id="import-cancel">Cancelar</button>'+
    '</div>';
  document.getElementById("import-cancel").addEventListener("click", ()=>{ pn.hidden = true; pn.innerHTML = ""; });
  document.getElementById("import-backup").addEventListener("click", exportarDadosJSON);
  document.getElementById("import-confirm").addEventListener("click", ()=> aplicarImportacao(d));
  pn.focus();
}
async function aplicarImportacao(d){
  const pn = importPanel();
  const jobs = [];
  if(window.bffRuntime && d.fotosArquivos && Object.keys(d.fotosArquivos).length){ try{ await window.bffRuntime.importarFotos(d.fotosArquivos); }catch(e){} }   // A1: restaura as imagens antes dos registros
  if(d.perfil){ const fx = corrigirPerfilAltura(d.perfil); if(fx) d.perfil = fx; }   // v97
  if(d.perfil) jobs.push(["config/perfil", d.perfil]);
  if(d.settings) jobs.push(["config/settings", d.settings]);
  Object.entries(d.rotina).forEach(([k,v])=> jobs.push(["rotina/"+k, v]));
  Object.entries(d.checkins).forEach(([k,v])=> jobs.push(["checkins/"+k, v]));
  Object.entries(d.medicoes).forEach(([k,v])=> jobs.push(["medicoes/"+k, v]));
  Object.entries(d.fotos||{}).forEach(([k,v])=> jobs.push(["fotos/"+k, v]));
  pn.innerHTML = '<h3>Importando…</h3><div class="import-bar" aria-hidden="true"><i id="import-bar-i"></i></div><div class="hint" id="import-prog">0 de '+jobs.length+'</div>';
  const prog = document.getElementById("import-prog"), bar = document.getElementById("import-bar-i");
  if(!state.db){
    // modo local: grava direto no estado, uma única renderização no fim
    if(d.perfil) state.perfil = d.perfil;
    if(d.settings) state.settings = d.settings;
    if(Object.keys(d.rotina).length){ Object.assign(state.rotina, d.rotina); state.rotinaIsExample = false; }
    Object.assign(state.checkins, d.checkins);
    Object.assign(state.medicoes, d.medicoes);
    Object.assign(state.fotos, d.fotos||{});
    render();
  } else {
    let feitos = 0;
    for(let i = 0; i < jobs.length; i += 8){
      await Promise.all(jobs.slice(i, i+8).map(([path,data])=> saveDoc(path, data)));
      feitos = Math.min(jobs.length, i+8);
      prog.textContent = feitos+" de "+jobs.length;
      bar.style.width = Math.round(feitos/jobs.length*100)+"%";
    }
  }
  pn.innerHTML = '<h3>Backup importado</h3><div class="hint">'+jobs.length+' registro(s) mesclados aos seus dados.</div><div class="import-actions"><button class="btn small" type="button" id="import-cancel">Fechar</button></div>';
  document.getElementById("import-cancel").addEventListener("click", ()=>{ pn.hidden = true; pn.innerHTML = ""; });
  pn.focus();
  showToast("Backup importado.");
}
(function setupImport(){
  const btn = document.getElementById("cfg-import-btn"), inp = document.getElementById("cfg-import-file");
  if(!btn || !inp) return;
  btn.addEventListener("click", ()=> inp.click());
  inp.addEventListener("change", async ()=>{
    const f = inp.files && inp.files[0];
    inp.value = "";
    if(!f) return;
    if(f.size > IMPORT_MAX_BYTES){ mostrarImportErro("Arquivo grande demais: o limite é "+Math.round(IMPORT_MAX_BYTES/1048576)+" MB."); return; }
    let raw;
    try{ raw = JSON.parse(await f.text()); }
    catch(e){ mostrarImportErro("Não consegui ler o arquivo. Use o backup (.json) que o app salvou."); return; }
    try{ mostrarImportConfirmacao(validarBackup(raw)); }
    catch(e){ mostrarImportErro(e.message || "Arquivo inválido. Use um backup (.json) gerado pelo app."); }
  });
})();

/* ============================================================
   FOTOS DE PROGRESSO — capability "assets" (nova). O id retornado
   é o ponteiro durável, salvo em "fotos/<id>"; a URL de exibição é
   sempre reconstruída como "/_blob/"+assetId (nunca guardada), como
   a própria documentação da capability recomenda.
   ============================================================ */
async function uploadFotoProgresso(file){
  if(!file || !String(file.type||"").startsWith("image/")){
    showToast("Esse arquivo não é uma imagem. Escolha uma foto.");
    return;
  }
  const id = String(Date.now());
  const iso = todayISO();
  if(window.claude && window.claude.use){
    let assets = null;
    try{ assets = await window.claude.use("assets"); }catch(e){ assets = null; }
    if(!assets){
      showToast("Salvar fotos não está disponível aqui agora. Tente de novo mais tarde.");
      return;
    }
    try{
      const res = await assets.upload(file);
      const data = {iso, assetId: res.id, criadoEm: Date.now()};
      state.fotos[id] = data;
      renderFotosProgresso();
      await saveDoc("fotos/"+id, data);
      showToast("Foto adicionada!");
    }catch(err){
      showToast("Não consegui salvar a foto agora."+MSG.tenteDeNovo);
    }
    return;
  }
  // fora do runtime de artifact: guarda só em memória, não sobrevive a um reload
  const localUrl = URL.createObjectURL(file);
  state.fotos[id] = {iso, localUrl, criadoEm: Date.now()};
  renderFotosProgresso();
  showToast("Foto adicionada, mas só vale até fechar o app (modo local).");
}
async function apagarFotoDeVez(id, foto){
  if(foto.assetId && window.claude && window.claude.use){
    try{
      const assets = await window.claude.use("assets");
      if(assets) await assets.delete(foto.assetId);
    }catch(e){}
    await deleteDocRemote("fotos/"+id);
  }
}
/* v85 (I4): a foto some da tela na hora, mas só é apagada de verdade (asset + registro) quando o aviso
   "Desfazer" expira ou é substituído — assim o desfazer é real e não depende de re-upload. */
function removeFotoProgresso(id){
  const foto = state.fotos[id];
  if(!foto) return;
  delete state.fotos[id];
  renderFotosProgresso();
  showToast("Foto removida.", {
    ms: 6500,
    action: {label:"Desfazer", fn:()=>{ state.fotos[id] = foto; renderFotosProgresso(); }},
    onExpire: ()=>{ if(!state.fotos[id]) apagarFotoDeVez(id, foto); }
  });
}
let fotoCmp = {a:null, b:null, pos:50};   // v94 V5: ids "antes"/"depois" e posição da divisão (0–100)
function fotoSrc(f){ return f.assetId ? ((window.bffRuntime && window.bffRuntime.blobUrl(f.assetId)) || ("/_blob/"+f.assetId)) : (f.localUrl||""); }   // A1: fora do Claude, o adaptador devolve a URL local da foto
function renderFotoComparador(idsRecentes){
  const box = document.getElementById("foto-cmp");
  if(!box) return;
  if(idsRecentes.length < 2){ box.hidden = true; box.innerHTML = ""; return; }
  const asc = idsRecentes.slice().sort((x,y)=> String(state.fotos[x].iso).localeCompare(String(state.fotos[y].iso)) || (state.fotos[x].criadoEm||0)-(state.fotos[y].criadoEm||0));
  if(!asc.includes(fotoCmp.a)) fotoCmp.a = asc[0];
  if(!asc.includes(fotoCmp.b) || fotoCmp.b === fotoCmp.a) fotoCmp.b = asc[asc.length-1];
  const A = state.fotos[fotoCmp.a], B = state.fotos[fotoCmp.b];
  const opts = (sel)=> asc.map(id=>'<option value="'+id+'"'+(id===sel?' selected':'')+'>'+fmtDateBR(state.fotos[id].iso)+'</option>').join("");
  const dias = Math.round((new Date(B.iso+"T12:00:00") - new Date(A.iso+"T12:00:00"))/86400000);
  box.hidden = false;
  box.innerHTML =
    '<div class="foto-cmp-head"><h3>Antes e depois</h3><span class="hint">'+(dias>0 ? dias+(dias===1?' dia':' dias')+' entre as fotos' : 'mesma data')+'</span></div>'+
    '<div class="foto-cmp-pick">'+
      '<label>Antes<select id="fc-a" aria-label="Foto de antes">'+opts(fotoCmp.a)+'</select></label>'+
      '<label>Depois<select id="fc-b" aria-label="Foto de depois">'+opts(fotoCmp.b)+'</select></label>'+
    '</div>'+
    '<div class="foto-cmp-stage" id="fc-stage" style="--pos:'+fotoCmp.pos+'%">'+
      '<img class="fc-b" src="'+fotoSrc(B)+'" alt="Depois: foto de '+fmtDateBR(B.iso)+'" draggable="false">'+
      '<img class="fc-a" src="'+fotoSrc(A)+'" alt="Antes: foto de '+fmtDateBR(A.iso)+'" draggable="false">'+
      '<span class="fc-line" aria-hidden="true"></span>'+
      '<span class="fc-tag a" aria-hidden="true">Antes · '+fmtDateBR(A.iso)+'</span><span class="fc-tag b" aria-hidden="true">Depois · '+fmtDateBR(B.iso)+'</span>'+
    '</div>'+
    '<label class="foto-cmp-range">Divisão<input type="range" id="fc-range" min="0" max="100" step="1" value="'+fotoCmp.pos+'" aria-label="Posição da divisão entre as fotos de antes e depois"></label>';
  box.querySelector("#fc-a").addEventListener("change", e=>{ fotoCmp.a = e.target.value; renderFotoComparador(idsRecentes); });
  box.querySelector("#fc-b").addEventListener("change", e=>{ fotoCmp.b = e.target.value; renderFotoComparador(idsRecentes); });
  const stage = box.querySelector("#fc-stage"), rg = box.querySelector("#fc-range");
  rg.addEventListener("input", ()=>{ fotoCmp.pos = Number(rg.value); stage.style.setProperty("--pos", fotoCmp.pos+"%"); });
  // arrastar direto na imagem também move a divisão
  let drag = false;
  const mover = (e)=>{ const r = stage.getBoundingClientRect(); const v = Math.max(0, Math.min(100, Math.round((e.clientX - r.left)/r.width*100))); rg.value = v; rg.dispatchEvent(new Event("input")); };
  stage.addEventListener("pointerdown", e=>{ drag = true; stage.setPointerCapture(e.pointerId); mover(e); });
  stage.addEventListener("pointermove", e=>{ if(drag) mover(e); });
  stage.addEventListener("pointerup", ()=>{ drag = false; });
  stage.addEventListener("pointercancel", ()=>{ drag = false; });
}
/* Foto ampliada (lightbox): toque/clique alterna 1× ↔ 2,5× no ponto tocado; arraste para mover; pinça ou roda do mouse para zoom;
   ‹ › trocam de foto; Esc ou toque fora fecha. Usa <dialog> (foco preso e Esc nativos). */
function abrirFotoZoom(ids, idx, opener){
  const velho = document.querySelector("dialog.foto-zoom"); if(velho) velho.remove();
  if(!ids || !ids.length || idx < 0) return;
  const dlg = document.createElement("dialog");
  dlg.className = "foto-zoom";
  dlg.setAttribute("aria-label", "Foto de progresso ampliada");
  dlg.innerHTML =
    '<div class="fz-top"><span class="fz-cap" role="status" aria-live="polite"></span><div class="fz-tools">'+
      '<button type="button" class="fz-btn" data-fz="out" aria-label="Diminuir zoom">−</button>'+
      '<button type="button" class="fz-btn fz-reset" data-fz="reset" aria-label="Voltar ao tamanho da tela">1×</button>'+
      '<button type="button" class="fz-btn" data-fz="in" aria-label="Aumentar zoom">+</button>'+
      '<button type="button" class="fz-btn" data-fz="close" aria-label="Fechar foto">×</button></div></div>'+
    '<div class="fz-stage"><img class="fz-img" alt="" draggable="false"></div>'+
    '<button type="button" class="fz-nav fz-prev" data-fz="prev" aria-label="Foto anterior">‹</button>'+
    '<button type="button" class="fz-nav fz-next" data-fz="next" aria-label="Próxima foto">›</button>'+
    '<div class="fz-hint">Toque na foto para ampliar · arraste para mover · pinça ou roda do mouse para zoom</div>';
  document.body.appendChild(dlg);
  const st = dlg.querySelector(".fz-stage"), im = dlg.querySelector(".fz-img"), cap = dlg.querySelector(".fz-cap"), rs = dlg.querySelector(".fz-reset");
  let i = idx, sc = 1, tx = 0, ty = 0, moved = false, drag = null, pinch0 = null;
  const MAX = 6, ptrs = new Map();
  const rel = (x, y)=>{ const r = st.getBoundingClientRect(); return {x: x - (r.left + r.width/2), y: y - (r.top + r.height/2)}; };
  function aplica(){
    const mx = Math.max(0, (im.clientWidth*sc - st.clientWidth)/2), my = Math.max(0, (im.clientHeight*sc - st.clientHeight)/2);
    tx = Math.min(mx, Math.max(-mx, tx)); ty = Math.min(my, Math.max(-my, ty));
    im.style.transform = "translate("+tx+"px,"+ty+"px) scale("+sc+")";
    st.classList.toggle("zoomed", sc > 1.01);
    rs.textContent = (Math.round(sc*10)/10).toString().replace(".", ",")+"×";
  }
  function zoomEm(ns, cx, cy){
    ns = Math.min(MAX, Math.max(1, ns));
    const k = ns/sc; tx = cx - (cx - tx)*k; ty = cy - (cy - ty)*k; sc = ns;
    if(sc <= 1.001){ sc = 1; tx = 0; ty = 0; }
    aplica();
  }
  function mostra(n){
    i = (n + ids.length) % ids.length;
    const f = state.fotos[ids[i]]; if(!f) return;
    im.src = fotoSrc(f);
    im.alt = "Foto de progresso de "+fmtDateBR(f.iso);
    cap.textContent = fmtDateBR(f.iso)+(ids.length > 1 ? " · "+(i+1)+" de "+ids.length : "");
    sc = 1; tx = 0; ty = 0; aplica();
  }
  function fecha(){ try{ dlg.close(); }catch(_){ dlg.remove(); } }
  dlg.querySelectorAll(".fz-nav").forEach(b=>{ b.hidden = ids.length < 2; });
  dlg.addEventListener("click", (e)=>{
    const b = e.target.closest("[data-fz]"); if(!b) return;
    const a = b.dataset.fz;
    if(a === "close") fecha();
    else if(a === "prev") mostra(i-1);
    else if(a === "next") mostra(i+1);
    else if(a === "in") zoomEm(sc*1.5, 0, 0);
    else if(a === "out") zoomEm(sc/1.5, 0, 0);
    else if(a === "reset") zoomEm(1, 0, 0);
  });
  st.addEventListener("pointerdown", (e)=>{
    try{ st.setPointerCapture(e.pointerId); }catch(_){}
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY}); moved = false;
    if(ptrs.size === 2){ const [a, b] = [...ptrs.values()]; pinch0 = {d: Math.hypot(a.x-b.x, a.y-b.y) || 1, s: sc}; drag = null; }
    else if(ptrs.size === 1) drag = {x:e.clientX, y:e.clientY, tx, ty};
  });
  st.addEventListener("pointermove", (e)=>{
    if(!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
    if(ptrs.size === 2 && pinch0){
      const [a, b] = [...ptrs.values()], c = rel((a.x+b.x)/2, (a.y+b.y)/2);
      zoomEm(pinch0.s * (Math.hypot(a.x-b.x, a.y-b.y) / pinch0.d), c.x, c.y); moved = true;
    } else if(drag && ptrs.size === 1){
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if(Math.abs(dx) + Math.abs(dy) > 5) moved = true;
      if(sc > 1){ tx = drag.tx + dx; ty = drag.ty + dy; aplica(); }
    }
  });
  const solta = (e)=>{
    ptrs.delete(e.pointerId);
    if(ptrs.size < 2) pinch0 = null;
    if(ptrs.size === 1){ const r = [...ptrs.values()][0]; drag = {x:r.x, y:r.y, tx, ty}; } else drag = null;
  };
  st.addEventListener("pointerup", solta); st.addEventListener("pointercancel", solta);
  st.addEventListener("click", (e)=>{
    if(moved){ moved = false; return; }
    // pointer capture redireciona o "click" para o palco: decide pela posição, não pelo alvo
    const r = im.getBoundingClientRect();
    const dentro = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    if(dentro){ const c = rel(e.clientX, e.clientY); zoomEm(sc > 1.05 ? 1 : 2.5, c.x, c.y); }
    else fecha();   // toque fora da foto fecha
  });
  st.addEventListener("wheel", (e)=>{ e.preventDefault(); const c = rel(e.clientX, e.clientY); zoomEm(sc * Math.exp(-e.deltaY * 0.0015), c.x, c.y); }, {passive:false});
  dlg.addEventListener("keydown", (e)=>{
    if(e.key === "ArrowLeft"){ mostra(i-1); e.preventDefault(); }
    else if(e.key === "ArrowRight"){ mostra(i+1); e.preventDefault(); }
    else if(e.key === "+" || e.key === "="){ zoomEm(sc*1.5, 0, 0); e.preventDefault(); }
    else if(e.key === "-"){ zoomEm(sc/1.5, 0, 0); e.preventDefault(); }
    else if(e.key === "0"){ zoomEm(1, 0, 0); e.preventDefault(); }
  });
  dlg.addEventListener("close", ()=>{ dlg.remove(); if(opener && opener.isConnected) opener.focus({preventScroll:true}); });
  window.addEventListener("resize", aplica, {passive:true});
  dlg.showModal();
  mostra(i);
  im.addEventListener("load", aplica);
}
function renderFotosProgresso(){
  const el = document.getElementById("fotos-grid");
  if(!el) return;
  const ids = Object.keys(state.fotos).sort((a,b)=> (state.fotos[b].criadoEm||0)-(state.fotos[a].criadoEm||0));
  renderFotoComparador(ids);
  if(!ids.length){ el.innerHTML = emptyState("camera","Nenhuma foto ainda","Tire a primeira foto hoje: ela vira seu ponto de partida para comparar daqui a semanas.",{go:"foto",label:"Adicionar foto"}); return; }
  el.innerHTML = ids.map(id=>{
    const f = state.fotos[id];
    const src = fotoSrc(f);
    return '<div class="foto-item'+(id===fotoCmp.a?' cmp-a':(id===fotoCmp.b?' cmp-b':''))+'">'+
      '<button type="button" class="foto-open" data-fotozoom="'+id+'" aria-label="Ampliar a foto de '+fmtDateBR(f.iso)+'">'+
        '<img src="'+src+'" alt="Foto de progresso de '+fmtDateBR(f.iso)+'" loading="lazy">'+
        '<span class="foto-zoom-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5"/></svg></span>'+
        '<span class="foto-date">'+fmtDateBR(f.iso)+'</span>'+
      '</button>'+
      (ids.length > 1 ? '<button type="button" class="foto-cmpbtn" data-fotosel="'+id+'" aria-label="Usar a foto de '+fmtDateBR(f.iso)+' no comparador">Comparar</button>' : '')+
      '<button type="button" class="foto-remove" data-fotorm="'+id+'" aria-label="Remover foto">×</button>'+
    '</div>';
  }).join("");
  el.querySelectorAll("[data-fotorm]").forEach(btn=>{
    btn.addEventListener("click", (e)=>{ e.stopPropagation(); removeFotoProgresso(btn.dataset.fotorm); });
  });
  el.querySelectorAll("[data-fotozoom]").forEach(btn=>{
    btn.addEventListener("click", ()=> abrirFotoZoom(ids, ids.indexOf(btn.dataset.fotozoom), btn));
  });
  // v94 V5: "Comparar" numa miniatura a coloca no comparador (a mais antiga vira "antes", a mais nova "depois")
  el.querySelectorAll("[data-fotosel]").forEach(it=>{
    it.addEventListener("click", ()=>{
      if(ids.length < 2) return;
      const id = it.dataset.fotosel;
      const iso = state.fotos[id].iso;
      if(String(iso) <= String(state.fotos[fotoCmp.a].iso)) fotoCmp.a = id; else fotoCmp.b = id;
      if(fotoCmp.a === fotoCmp.b) return;
      renderFotosProgresso();
    });
  });
}
document.getElementById("btn-add-foto").addEventListener("click", ()=> document.getElementById("foto-input").click());
document.getElementById("foto-input").addEventListener("change", (e)=>{
  const file = e.target.files && e.target.files[0];
  if(file) uploadFotoProgresso(file);
  e.target.value = "";
});

/* ============================================================
   BIBLIOTECA DE EXERCÍCIOS — consolida, por categoria, todo
   exercício presente em algum dia da rotina atual (sem duplicar
   por nome), reaproveitando nota técnica e alternativas já
   existentes. Puramente derivado — nenhum dado novo pra manter.
   ============================================================ */
function renderBibliotecaExercicios(){
  const el = document.getElementById("biblioteca-body");
  if(!el) return;
  const byCat = {};
  CATEGORY_ORDER.forEach(c=> byCat[c]=[]);
  const seen = new Set();
  DAYS.forEach(key=>{
    const day = state.rotina[key];
    if(!day) return;
    (day.exercicios||[]).forEach(ex=>{
      if(!ex.nome || seen.has(ex.nome)) return;
      seen.add(ex.nome);
      const primary = (ex.musculos||[])[0];
      const cat = (primary && MUSCLE_CATEGORY[primary]) || "Core";
      if(!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(ex);
    });
  });
  const bq = tokensBusca(bibliotecaQ);
  let totalEx = 0, achadosEx = 0;
  CATEGORY_ORDER.forEach(c=> totalEx += (byCat[c]||[]).length);
  const html = CATEGORY_ORDER.map(cat=>{
    const list = (byCat[cat]||[]).filter(ex=>{
      if(!bq.length) return true;
      const mus = (ex.musculos||[]).map(m=> MUSCLE_LANDMARKS[m]?MUSCLE_LANDMARKS[m].label:m).join(" ");
      return achaTodos(ex.nome+" "+mus+" "+(ex.nota||"")+" "+(EXERCISE_ALTERNATIVES[ex.nome]||[]).join(" ")+" "+cat, bq);
    });
    achadosEx += list.length;
    if(!list.length) return "";
    const rows = list.map(ex=>{
      const musculosLabel = (ex.musculos||[]).map(m=> MUSCLE_LANDMARKS[m]?MUSCLE_LANDMARKS[m].label:m).join(", ");
      const alt = EXERCISE_ALTERNATIVES[ex.nome];
      return '<div class="biblio-ex">'+
        '<div class="biblio-ex-head"><div class="biblio-ex-title"><strong>'+escapeHtml(ex.nome)+'</strong><span class="chip neutral">'+escapeHtml(musculosLabel)+'</span></div>'+
          '<a class="ex-video-link" href="'+youtubeSearchUrl(ex.nome)+'" target="_blank" rel="noopener noreferrer" title="Buscar vídeo de execução no YouTube">'+ICON_PLAY+'<span>Vídeo</span></a>'+
        '</div>'+
        (ex.nota ? '<div class="biblio-ex-nota">'+ICON_TIP+'<span>'+escapeHtml(ex.nota)+'</span></div>' : '')+
        guiaExecucaoHtml(ex.nome)+
        (alt ? '<div class="biblio-ex-alt"><div class="biblio-ex-alt-label">'+ICON_SWAP+'<span>Alternativas — toque para ver como executar</span></div><div class="biblio-ex-chips">'+alt.map(a=>'<button type="button" class="biblio-ex-chip biblio-alt-btn" aria-expanded="false" data-balt="'+escapeHtml(a)+'">'+escapeHtml(a)+'</button>').join("")+'</div><div class="biblio-alt-panel" hidden></div></div>' : '')+
      '</div>';
    }).join("");
    return '<details class="biblio-cat"'+(bq.length ? ' open' : '')+'><summary>'+
        '<span class="biblio-cat-ic">'+(CATEGORY_ICON[cat]||ICON_CORE)+'</span>'+
        '<span class="biblio-cat-txt"><span class="biblio-cat-name">'+cat+'</span><span class="biblio-cat-count">'+list.length+(list.length===1?' exercício':' exercícios')+'</span></span>'+
      '</summary><div class="biblio-cat-list">'+rows+'</div></details>';
  }).join("");
  el.innerHTML = html || (bq.length
    ? '<div class="search-empty"><div class="empty-note">Nenhum exercício com “'+escapeHtml(bibliotecaQ)+'”. Tente o nome do músculo (ex.: “peito”) ou uma palavra mais curta.</div><button type="button" class="btn small" data-busca-limpar="biblioteca">Limpar busca</button></div>'
    : '<div class="empty-note">A biblioteca ainda está vazia. Monte sua rotina em Treino e os exercícios aparecem aqui.</div>');
  const stB = document.getElementById("biblioteca-status");
  if(stB) stB.textContent = bq.length ? (achadosEx === 0 ? "Nenhum exercício encontrado." : achadosEx+" de "+totalEx+(totalEx===1?" exercício":" exercícios")+".") : "";
  el.querySelectorAll(".biblio-alt-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const box = btn.closest(".biblio-ex-alt");
      const panel = box.querySelector(".biblio-alt-panel");
      const nome = btn.dataset.balt;
      const jaAberto = btn.getAttribute("aria-expanded")==="true";
      box.querySelectorAll(".biblio-alt-btn").forEach(b=>{ b.setAttribute("aria-expanded","false"); b.classList.remove("on"); });
      if(jaAberto){ panel.hidden = true; panel.innerHTML = ""; return; }
      btn.setAttribute("aria-expanded","true"); btn.classList.add("on");
      panel.innerHTML =
        '<div class="biblio-alt-head"><strong>'+escapeHtml(nome)+'</strong>'+
          '<a class="ex-video-link" href="'+youtubeSearchUrl(nome)+'" target="_blank" rel="noopener noreferrer" title="Buscar vídeo de execução no YouTube">'+ICON_PLAY+'<span>Vídeo</span></a></div>'+
        (guiaCorpoHtml(nome) || '<div class="empty-note">Sem guia escrito para esta variação — use o vídeo.</div>');
      panel.hidden = false;
    });
  });
}

/* ============================================================
   RESUMO DO MÊS — consolida, num só card, dados que já existem
   espalhados por outras abas (treinos feitos, PRs, variação de
   peso/cintura) numa janela fixa dos últimos 30 dias.
   ============================================================ */
function computeResumoJanela(start, end){
  // nunca conta como "agendado" um dia anterior ao cadastro do usuário (ou ao
  // primeiro registro salvo) — senão a comparação com o "mês anterior" mostra
  // 0% artificial pra quem ainda não tinha o app antes dessa janela.
  const trackStart = getTrackingStartISO();
  const effStart = start < trackStart ? trackStart : start;
  const scheduled = effStart > end ? [] : activeDaysInRange(effStart, end);
  const done = scheduled.filter(iso=> state.checkins[iso]?.concluido).length;

  const exNomes = new Set();
  Object.values(state.checkins).forEach(c=>{ if(c && c.cargas) Object.keys(c.cargas).forEach(n=>exNomes.add(n)); });
  const prs = [];
  exNomes.forEach(nome=>{
    const hist = getCargaHistory(nome);
    const antes = hist.filter(h=> h.iso < start);
    const dentro = hist.filter(h=> h.iso >= start && h.iso <= end);
    if(!dentro.length) return;
    const maxAntes = antes.length ? Math.max(...antes.map(h=>h.peso)) : 0;
    const maxDentro = Math.max(...dentro.map(h=>h.peso));
    if(maxDentro > maxAntes) prs.push({nome, peso:maxDentro});
  });

  const medIsos = Object.keys(state.medicoes).filter(iso=> iso>=start && iso<=end).sort();
  let pesoDelta = null, cinturaDelta = null;
  if(medIsos.length>=2){
    const first = state.medicoes[medIsos[0]], last = state.medicoes[medIsos[medIsos.length-1]];
    if(first.pesoKg!=null && last.pesoKg!=null) pesoDelta = last.pesoKg - first.pesoKg;
    if(first.cinturaCm!=null && last.cinturaCm!=null) cinturaDelta = last.cinturaCm - first.cinturaCm;
  }
  return {start, end, scheduled: scheduled.length, done, prs, pesoDelta, cinturaDelta};
}
/* v98 F9 — o resumo acompanha o período do gráfico de peso: 30 dias = mês; 90 dias = trimestre; Tudo = desde o início */
function resumoCfg(periodo){
  if(periodo === "all") return {id:"all", titulo:"Resumo dos meses", hint:"desde que você começou", ant:null, sub:"desde o início", prLabel:"PRs no período", rel:"Relatório do período"};
  if(periodo === "90") return {id:"90", dias:90, titulo:"Resumo dos meses", hint:"últimos 90 dias vs. 90 dias anteriores", ant:"90 dias anteriores", antNo:"nos 90 dias anteriores", sub:"últimos 90 dias", prLabel:"PRs no período", rel:"Relatório do período"};
  return {id:"30", dias:30, titulo:"Resumo do mês", hint:"últimos 30 dias vs. mês anterior", ant:"mês passado", antNo:"no mês passado", sub:"últimos 30 dias", prLabel:"PRs no mês", rel:"Relatório mensal"};
}
function computeResumoMes(periodo){
  const cfg = resumoCfg(periodo || (typeof pesoPeriodo !== "undefined" ? pesoPeriodo : "30"));
  const today = todayISO();
  if(cfg.id === "all"){
    const atual = computeResumoJanela(getTrackingStartISO(), today);
    return Object.assign({}, atual, {anterior:{scheduled:0, done:0, prs:[], pesoDelta:null, cinturaDelta:null}, cfg});
  }
  const start = addDaysISO(today, -(cfg.dias-1));
  const prevEnd = addDaysISO(start, -1);
  const prevStart = addDaysISO(prevEnd, -(cfg.dias-1));
  const atual = computeResumoJanela(start, today);
  const anterior = computeResumoJanela(prevStart, prevEnd);
  return Object.assign({}, atual, {anterior, cfg});
}
function renderResumoMes(){
  const el = document.getElementById("resumo-mes-body");
  if(!el) return;
  const r = computeResumoMes();
  const cfg = r.cfg;
  const tEl = document.getElementById("resumo-titulo"), hEl = document.getElementById("resumo-hint");
  if(tEl) tEl.textContent = cfg.titulo;
  if(hEl) hEl.textContent = cfg.hint;
  const a = r.anterior;
  const temAnt = !!cfg.ant;
  const pct = r.scheduled ? Math.round((r.done/r.scheduled)*100) : null;
  const pctAnt = a.scheduled ? Math.round((a.done/a.scheduled)*100) : null;

  let cmpTreinos = "";
  if(temAnt){
    if(pct!=null && pctAnt!=null){
      cmpTreinos = '<span class="attr-cmp">'+(pct>=pctAnt?"↑":"↓")+' vs. '+pctAnt+'% '+cfg.antNo+'</span>';
    } else if(pct!=null && a.scheduled===0){
      cmpTreinos = '<span class="attr-cmp">sem dado '+cfg.antNo+'</span>';
    }
  }
  let cmpPRs = "";
  if(temAnt && a.scheduled>0){
    const diff = r.prs.length - a.prs.length;
    cmpPRs = diff===0 ? '<span class="attr-cmp">igual ao período anterior</span>' : '<span class="attr-cmp">'+(diff>0?"↑ +"+diff:"↓ "+diff)+' vs. '+cfg.ant+'</span>';
  }
  const cmpPeso = (temAnt && r.pesoDelta!=null && a.pesoDelta!=null) ? '<span class="attr-cmp">'+cfg.ant+': '+(a.pesoDelta>0?"+":"")+num(a.pesoDelta,1)+' kg</span>' : "";
  const cmpCintura = (temAnt && r.cinturaDelta!=null && a.cinturaDelta!=null) ? '<span class="attr-cmp">'+cfg.ant+': '+(a.cinturaDelta>0?"+":"")+num(a.cinturaDelta,1)+' cm</span>' : "";

  el.innerHTML =
    '<div class="attr-tile"><span class="attr-ic" aria-hidden="true">'+ICON_CALENDAR+'</span><span class="attr-val">'+(pct==null?"—":pct+"%")+'</span><span class="attr-label">Treinos</span><span class="attr-sub">'+(r.scheduled? r.done+" de "+r.scheduled : "sem treinos agendados")+'</span>'+cmpTreinos+'</div>'+
    '<div class="attr-tile"><span class="attr-ic" aria-hidden="true">'+ICON_TROPHY+'</span><span class="attr-val">'+r.prs.length+'</span><span class="attr-label">'+cfg.prLabel+'</span><span class="attr-sub">'+(r.prs.length? r.prs.slice(0,2).map(p=>escapeHtml(p.nome)).join(", ") : "nenhum ainda")+'</span>'+cmpPRs+'</div>'+
    '<div class="attr-tile"><span class="attr-ic" aria-hidden="true">'+(r.pesoDelta==null?ICON_WEIGHT:(r.pesoDelta<=0?ICON_TREND_DN:ICON_TREND_UP))+'</span><span class="attr-val">'+(r.pesoDelta==null?"—":(r.pesoDelta>0?"+":"")+num(r.pesoDelta,1)+" kg")+'</span><span class="attr-label">Peso</span><span class="attr-sub">'+cfg.sub+'</span>'+cmpPeso+'</div>'+
    '<div class="attr-tile"><span class="attr-ic" aria-hidden="true">'+ICON_TAPE+'</span><span class="attr-val">'+(r.cinturaDelta==null?"—":(r.cinturaDelta>0?"+":"")+num(r.cinturaDelta,1)+" cm")+'</span><span class="attr-label">Cintura</span><span class="attr-sub">'+cfg.sub+'</span>'+cmpCintura+'</div>';
}

/* ============================================================
   HALL DE RECORDES PESSOAIS — consolida, num só lugar, o maior peso
   já registrado em cada exercício (e quando foi batido). Puramente
   derivado do histórico de cargas já salvo nos check-ins.
   ============================================================ */
function computeRecordesPessoais(){
  const exNomes = new Set();
  Object.values(state.checkins).forEach(c=>{ if(c && c.cargas) Object.keys(c.cargas).forEach(n=>exNomes.add(n)); });
  const musclesByName = {};
  DAYS.forEach(key=>{
    const day = state.rotina[key];
    (day && day.exercicios || []).forEach(ex=>{ if(ex.nome && !musclesByName[ex.nome]) musclesByName[ex.nome] = ex.musculos||[]; });
  });
  const byCat = {};
  CATEGORY_ORDER.forEach(c=> byCat[c]=[]);
  exNomes.forEach(nome=>{
    const hist = getCargaHistory(nome);
    if(!hist.length) return;
    let best = hist[0];
    hist.forEach(h=>{ if(h.peso >= best.peso) best = h; });
    const musculos = musclesByName[nome]||[];
    const primary = musculos[0];
    const cat = (primary && MUSCLE_CATEGORY[primary]) || "Core";
    if(!byCat[cat]) byCat[cat] = [];
    byCat[cat].push({nome, peso:best.peso, iso:best.iso, musculos});
  });
  CATEGORY_ORDER.forEach(cat=> byCat[cat].sort((x,y)=> y.iso.localeCompare(x.iso)));
  return byCat;
}
function renderRecordesPessoais(){
  const el = document.getElementById("recordes-body");
  if(!el) return;
  const byCat = computeRecordesPessoais();
  const total = CATEGORY_ORDER.reduce((sum,cat)=> sum + (byCat[cat]||[]).length, 0);
  if(!total){
    el.innerHTML = emptyState("trophy","Seu hall de recordes está vazio","Registre a carga dos exercícios no treino e cada recorde pessoal aparece aqui.",{go:"treino",label:"Ir para o treino"});
    return;
  }
  el.innerHTML = CATEGORY_ORDER.map(cat=>{
    const list = byCat[cat]||[];
    if(!list.length) return "";
    const rows = list.map(r=>{
      const musculosLabel = (r.musculos||[]).map(m=> MUSCLE_LANDMARKS[m]?MUSCLE_LANDMARKS[m].label:m).join(", ");
      return '<div class="record-row">'+
        '<span class="record-ic">'+ICON_TROPHY+'</span>'+
        '<div class="record-txt"><strong>'+escapeHtml(r.nome)+'</strong>'+(musculosLabel?'<span class="chip neutral">'+escapeHtml(musculosLabel)+'</span>':'')+'</div>'+
        '<div class="record-meta"><span class="record-peso">'+fmtKg(r.peso)+' kg</span><span class="record-date">'+fmtDateBR(r.iso)+'</span></div>'+
      '</div>';
    }).join("");
    return '<details class="biblio-cat"><summary>'+
        '<span class="biblio-cat-ic">'+(CATEGORY_ICON[cat]||ICON_CORE)+'</span>'+
        '<span class="biblio-cat-txt"><span class="biblio-cat-name">'+cat+'</span><span class="biblio-cat-count">'+list.length+(list.length===1?' recorde':' recordes')+'</span></span>'+
      '</summary><div class="biblio-cat-list">'+rows+'</div></details>';
  }).join("");
}

/* ============================================================
   PERIODIZAÇÃO AVANÇADA (opcional, 3.5) — "modo extra" pra quem já
   tem base: cicla blocos de Volume/Força/Deload em semanas, só como
   guia de RPE/séries. Nunca reescreve a rotina em si (mesma decisão
   de segurança do deload programado) — é puramente informativo.
   ============================================================ */
const PERIODIZACAO_TIPOS = {
  volume: {label:"Volume", guia:"Mais séries por grupo muscular, RPE 7-8 (deixando 2-3 reps na reserva). Foco em acumular estímulo de treino."},
  forca:  {label:"Força", guia:"Menos séries, cargas mais pesadas (perto do seu 1RM estimado), RPE 8-9+. Foco em intensidade, não em volume."},
  deload: {label:"Deload", guia:"Reduza ~40-50% do volume ou da carga essa semana. Recuperação ativa antes do próximo bloco."},
};
function computePeriodizacaoAtual(){
  const p = state.settings && state.settings.periodizacao;
  if(!p || !p.ativo || !p.inicioISO || !(p.blocos||[]).length) return null;
  const totalSemanas = p.blocos.reduce((s,b)=> s + (Number(b.semanas)||0), 0);
  if(totalSemanas<=0) return null;
  const todayMonday = mondayOfISO(todayISO());
  let weeksElapsed = 0, monday = p.inicioISO;
  while(monday < todayMonday){ monday = addDaysISO(monday, 7); weeksElapsed++; }
  const semanaNoCiclo = weeksElapsed % totalSemanas;
  let acc = 0;
  for(let i=0;i<p.blocos.length;i++){
    const semanas = Number(p.blocos[i].semanas)||0;
    if(semanaNoCiclo < acc + semanas){
      return {
        tipo: PERIODIZACAO_TIPOS[p.blocos[i].tipo] || PERIODIZACAO_TIPOS.volume,
        semanaAtual: (semanaNoCiclo - acc) + 1,
        totalSemanasBloco: semanas,
        proximoTipo: PERIODIZACAO_TIPOS[p.blocos[(i+1) % p.blocos.length].tipo] || PERIODIZACAO_TIPOS.volume,
      };
    }
    acc += semanas;
  }
  return null;
}
function renderPeriodizacaoStatus(){
  const card = document.getElementById("periodizacao-status");
  const el = document.getElementById("periodizacao-status-body");
  if(!card || !el) return;
  const atual = computePeriodizacaoAtual();
  if(!atual){ card.hidden = true; el.innerHTML = ""; return; }
  card.hidden = false;
  const pct = Math.round((atual.semanaAtual/atual.totalSemanasBloco)*100);
  el.innerHTML =
    '<div class="rec-card">'+
      '<div class="rec-head"><span class="rec-icon" style="background:var(--accent-soft); color:var(--accent-fg,var(--accent));">'+ICON_SWAP+'</span><span class="rec-tag">Fase atual</span></div>'+
      '<div class="rec-title">'+escapeHtml(atual.tipo.label)+' — semana '+atual.semanaAtual+' de '+atual.totalSemanasBloco+'</div>'+
      '<div class="quest-track u-my8"><div class="quest-fill" style="width:'+pct+'%;"></div></div>'+
      '<div class="rec-desc">'+escapeHtml(atual.tipo.guia)+'</div>'+
      '<div class="rec-desc u-mt4">Próxima fase: '+escapeHtml(atual.proximoTipo.label)+'.</div>'+
    '</div>';
}

/* ============================================================
   GLOSSÁRIO — termos técnicos do app, por categoria. Cada termo
   recolhido por padrão (só o nome aparece), toca pra expandir a
   definição — pedido do Gabriel pra não virar parede de texto.
   ============================================================ */
function glosFonte(t){ return t && t.url ? ' <a class="glos-src" href="'+escapeHtml(t.url)+'" target="_blank" rel="noopener noreferrer">Fonte: '+escapeHtml(t.src||"")+'</a>' : ""; }
const GLOSSARIO = {
  "Treino": [
    {termo:"Divisão A–F (PPL: Push/Pull/Legs)", def:"A estrutura da sua rotina: dias de Peito e Ombros (com tríceps), Costas e Bíceps e Pernas, repetidos 2× por semana — A, B e C, depois D, E e F. Em inglês isso é o PPL (Push/Pull/Legs: empurrar, puxar e pernas). É tipo separar as tarefas da casa por cômodo em vez de misturar tudo — cada grupo muscular treina e descansa de forma mais previsível."},
    {termo:"RPE (esforço percebido)", def:"Nota de 6 a 10 para o esforço do exercício. Pense no marcador de combustível do carro: ele não diz quanto você andou, diz quanto ainda tinha no tanque. Aqui, o que importa é quantas repetições ainda sobravam quando você parou. 10 = nenhuma (falha); 9 = sobrava 1; 8 = sobravam 2; 7 = sobravam 3; 6 = 4 ou mais. Exemplo: fez 10 repetições e conseguiria mais 2 → RPE 8. Não precisa ser exato: uma noção já ajuda. O app cruza a nota com as repetições de cada série para sugerir se a carga sobe, fica ou reduz. Menores de 18 anos e iniciantes não recebem a opção \"Falha\" na pergunta rápida.", src:"Zourdos et al., 2016 — Novel resistance training-specific RPE scale (J Strength Cond Res)", url:"https://pubmed.ncbi.nlm.nih.gov/26049792/"},
    {termo:"RIR (repetições em reserva)", def:"Quantas repetições a mais você ainda faria antes de falhar — o \"troco\" do RPE. RPE 8 ≈ 2 RIR; RPE 10 ≈ 0 RIR (limite). É o combustível que sobrou no tanque.", src:"Helms et al., 2016 — RPE and RIR in resistance training (Strength Cond J)", url:"https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full"},
    {termo:"Dupla progressão", def:"A regra que o app usa para sugerir a carga: primeiro você sobe as repetições, depois o peso. Exemplo com meta de 8–12: com 20 kg você faz 9, 9, 8 → mantém; na semana seguinte 11, 10, 10 → mantém; quando fizer 12, 12, 12 (topo da faixa nas três séries) → sobe para 22,5 kg e recomeça perto de 8. É como subir um degrau só depois de firmar o pé no anterior. Se o esforço (RPE) estiver muito alto no topo da faixa, o app pede mais uma sessão antes de subir.", src:"Helms et al., 2016 — RPE and RIR in resistance training", url:"https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full"},
    {termo:"1RM (repetição máxima)", def:"O peso máximo que você levantaria numa única repetição. Arriscado de testar de verdade, por isso o app estima esse número a partir de séries normais."},
    {termo:"Volume e MEV / MAV / MRV", def:"Volume é quantas séries um músculo recebe por semana. Pensa como dose: MEV é a dose mínima pra crescer, MAV é a faixa ideal, MRV é o teto — passar disso acumula fadiga mais rápido do que recupera."},
    {termo:"Deload", def:"Uma semana de respiro com volume ou carga bem reduzida, de tempos em tempos, pra dissipar o cansaço acumulado. Mesma lógica de parar pra descansar numa viagem longa — no total, você anda mais rápido."},
    {termo:"Periodização", def:"Alternar blocos de treino com focos diferentes — semanas de Volume (mais séries) seguidas de Força (cargas mais pesadas). Opcional, configurável em Config, e não muda sua rotina — só orienta a intensidade."},
    {termo:"Progressão de carga", def:"Aumentar aos poucos o peso levantado ao longo do tempo. O app sugere quando subir com base no RPE da sua última sessão naquele exercício."},
    {termo:"Quest do dia", def:"A lista de exercícios do treino de hoje — \"quest\" porque o app usa linguagem de jogo (completar = ganhar XP) pra tornar o hábito mais motivador."},
  ],
  "Corpo": [
    {termo:"IMC (Índice de Massa Corporal)", def:"Peso dividido pela altura ao quadrado — uma estimativa rápida e populacional de faixa de peso. Não diferencia músculo de gordura, por isso o app também mostra % de gordura."},
    {termo:"RCQ (relação cintura-quadril)", def:"Cintura dividida pelo quadril — indica como a gordura está distribuída, usado como sinal de risco cardiovascular pela OMS."},
    {termo:"% de gordura", def:"Estimativa de gordura corporal a partir de medidas de fita métrica (cintura, quadril, pescoço) — método da Marinha dos EUA, sem precisar de bioimpedância."},
  ],
  "Nutrição": [
    {termo:"TMB (Taxa Metabólica Basal)", def:"Quantas calorias seu corpo gasta só pra te manter vivo, em repouso total. É a base do cálculo de quanto você deveria comer."},
    {termo:"TDEE (gasto calórico total)", def:"TMB + o gasto de atividade física do dia. É o número usado pra calcular sua meta calórica (manter, perder ou ganhar peso)."},
    {termo:"Macros", def:"Proteína, carboidrato e gordura — os três blocos que formam as calorias da dieta. A meta de proteína segue evidência científica (1.4–2.0 g/kg)."},
  ],
  "Jogo": [
    {termo:"Streak (sequência)", def:"Quantos dias de treino seguidos você completou sem furar o planejado — mesmo conceito de apps como Duolingo."},
    {termo:"Meta da semana", def:"O mínimo de treinos que você combina consigo a cada semana (padrão: um dia a menos que o agendado). Os dias extras viram bônus e as semanas seguidas com a meta cumprida são contadas à parte da sequência diária."},
    {termo:"Dia leve", def:"Caminhada, cárdio leve ou mobilidade no lugar do treino. Mantém a sequência e vale metade do XP de um treino, mas não conta no total de treinos. Serve para os dias de sono ruim, cansaço ou dor leve."},
    {termo:"Sessão rápida", def:"Um Full Body curto montado com a sua rotina: 1 exercício por grande grupo, 3 séries cada, parando com 1 a 2 repetições na reserva. Conta como o treino do dia."},
    {termo:"Cintura ÷ altura (RCE)", def:"Cintura dividida pela altura. É como uma régua simples: se a cintura passa da metade da altura (0,5), vale prestar atenção. Serve de indicador, não de diagnóstico."},
    {termo:"Teste da fala", def:"Forma de medir a intensidade do cárdio leve: você deve conseguir conversar enquanto se exercita, mesmo que com a respiração um pouco mais forte."},
    {termo:"Congelamento (freeze)", def:"Uma proteção que evita que sua sequência zere se você perder um dia de treino — uso limitado, pra não virar desculpa."},
    {termo:"XP e Nível/Patente", def:"XP é a pontuação ganha ao concluir treinos; acumular XP sobe seu nível e sua patente, de Novato até Titã."},
    {termo:"Conquistas", def:"Medalhas permanentes por marcos específicos (primeiro treino, 7 dias seguidos, primeiro PR...) — uma vez desbloqueada, fica pra sempre."},
    {termo:"Semana perfeita", def:"Completar 100% dos treinos agendados numa semana — reconhecido pelo narrador \"Ferro\" e nas Recomendações."},
    {termo:"PR (recorde pessoal)", def:"A maior carga que você já registrou num exercício. Superar o PR é o sinal mais direto de que o treino está funcionando."},
  ],
};
let glossarioCat = "Todos";   /* v98 F9: "Todos" é o padrão */

/* v91 U4 — busca. Sem acento e sem diferença de maiúscula; várias palavras = todas precisam aparecer. */
const normBusca = t => String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
const tokensBusca = q => normBusca(q).split(/\s+/).filter(Boolean);
function achaTodos(texto, tokens){ const h = normBusca(texto); return tokens.every(t=> h.includes(t)); }
/* destaca (<mark>) os trechos achados; só quando o texto normalizado mantém o mesmo tamanho (sem acento "solto") */
function destaca(texto, tokens){
  const raw = String(texto||"");
  const n = normBusca(raw);
  if(!tokens.length || n.length !== raw.length) return escapeHtml(raw);
  const marc = new Array(raw.length).fill(false);
  tokens.forEach(t=>{ let i = n.indexOf(t); while(i >= 0){ for(let j=i;j<i+t.length;j++) marc[j]=true; i = n.indexOf(t, i+t.length); } });
  let out = "", dentro = false, buf = "";
  const flush = ()=>{ out += dentro ? '<mark class="hl">'+escapeHtml(buf)+'</mark>' : escapeHtml(buf); buf = ""; };
  for(let i=0;i<raw.length;i++){ if(marc[i] !== dentro){ flush(); dentro = marc[i]; } buf += raw[i]; }
  flush();
  return out;
}
let glossarioQ = "", bibliotecaQ = "";
function setupBuscas(){
  const liga = (inpId, clearId, onChange)=>{
    const inp = document.getElementById(inpId), clr = document.getElementById(clearId);
    if(!inp || !clr) return;
    let t = null;
    inp.addEventListener("input", ()=>{
      clr.hidden = inp.value === "";
      clearTimeout(t); t = setTimeout(()=> onChange(inp.value), 90);
    });
    inp.addEventListener("keydown", e=>{ if(e.key === "Escape" && inp.value){ e.preventDefault(); inp.value = ""; clr.hidden = true; onChange(""); } });
    clr.addEventListener("click", ()=>{ inp.value = ""; clr.hidden = true; onChange(""); inp.focus(); });
  };
  liga("glossario-busca", "glossario-limpar", q=>{ glossarioQ = q.trim(); renderGlossario(); });
  liga("biblioteca-busca", "biblioteca-limpar", q=>{ bibliotecaQ = q.trim(); renderBibliotecaExercicios(); });
  document.addEventListener("click", e=>{
    const b = e.target.closest("[data-busca-limpar]");
    if(!b) return;
    const alvo = b.dataset.buscaLimpar;
    const inp = document.getElementById(alvo+"-busca"), clr = document.getElementById(alvo+"-limpar");
    if(inp){ inp.value = ""; inp.focus(); }
    if(clr) clr.hidden = true;
    if(alvo === "glossario"){ glossarioQ = ""; renderGlossario(); } else { bibliotecaQ = ""; renderBibliotecaExercicios(); }
  });
}
function renderGlossario(){
  const nav = document.getElementById("glossario-subnav");
  const body = document.getElementById("glossario-body");
  const status = document.getElementById("glossario-status");
  if(!nav || !body) return;
  if(!nav.childElementCount){
    nav.innerHTML = ["Todos"].concat(Object.keys(GLOSSARIO)).map(cat=>
      '<button type="button" class="tab-btn" role="tab" data-gloscat="'+cat+'" aria-selected="'+(cat===glossarioCat)+'">'+cat+'</button>'
    ).join("");
    nav.querySelectorAll("[data-gloscat]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        glossarioCat = btn.dataset.gloscat;
        renderGlossario();
      });
    });
  } else {
    nav.querySelectorAll("[data-gloscat]").forEach(btn=> btn.setAttribute("aria-selected", String(btn.dataset.gloscat===glossarioCat)));
  }
  const tk = tokensBusca(glossarioQ);
  nav.hidden = tk.length > 0;   // com busca, procura em todas as categorias
  if(tk.length){
    const achados = [];
    Object.keys(GLOSSARIO).forEach(cat=> GLOSSARIO[cat].forEach(t=>{ if(achaTodos(t.termo+" "+t.def, tk)) achados.push({cat, t}); }));
    if(status) status.textContent = achados.length ? (achados.length === 1 ? "1 termo encontrado." : achados.length+" termos encontrados.") : "Nenhum termo encontrado.";
    body.innerHTML = achados.length ? achados.map(({cat, t})=>
      '<details class="glos-term"'+(achados.length <= 3 ? ' open' : '')+'><summary><span>'+destaca(t.termo, tk)+'<span class="glos-cat">'+escapeHtml(cat)+'</span></span></summary><div class="glos-term-desc">'+destaca(t.def, tk)+'</div></details>'
    ).join("") : '<div class="search-empty"><div class="empty-note">Nenhum termo com “'+escapeHtml(glossarioQ)+'”. Tente uma palavra mais curta ou sem acento.</div><button type="button" class="btn small" data-busca-limpar="glossario">Limpar busca</button></div>';
    return;
  }
  if(status) status.textContent = "";
  if(glossarioCat === "Todos"){
    /* v98 F9 — "Todos": todos os termos, cada um com a etiqueta da sua categoria (mesmo visual da busca) */
    const todos = [];
    Object.keys(GLOSSARIO).forEach(cat=> GLOSSARIO[cat].forEach(t=> todos.push({cat, t})));
    if(status) status.textContent = "";
    body.innerHTML = todos.map(({cat, t})=>
      '<details class="glos-term"><summary><span>'+escapeHtml(t.termo)+'<span class="glos-cat">'+escapeHtml(cat)+'</span></span></summary><div class="glos-term-desc">'+escapeHtml(t.def)+glosFonte(t)+'</div></details>'
    ).join("");
    return;
  }
  const termos = GLOSSARIO[glossarioCat] || [];
  body.innerHTML = termos.map(t=>
    '<details class="glos-term"><summary>'+escapeHtml(t.termo)+'</summary><div class="glos-term-desc">'+escapeHtml(t.def)+glosFonte(t)+'</div></details>'
  ).join("");
}

/* ============================================================
   RECOMENDAÇÕES — motor de regras simples sobre dados que o app já
   calcula (sem IA externa, sem nada novo pra começar): volume fora
   da faixa MEV/MRV, deload pendente, semana perfeita.
   ============================================================ */
function weeksSinceDeload(){
  const today = todayISO();
  const todayMonday = mondayOfISO(today);
  const baseline = (state.settings && state.settings.ultimoDeload) ? state.settings.ultimoDeload : mondayOfISO(getTrackingStartISO());
  let weeks = 0;
  let monday = baseline;
  while(monday < todayMonday){
    monday = addDaysISO(monday, 7);
    weeks++;
  }
  return weeks;
}
function computeRecomendacoes(){
  const recs = [];
  const totals = computeVolumeTotals();

  MUSCLE_ORDER.forEach(m=>{
    const lm = MUSCLE_LANDMARKS[m];
    const vol = totals[m]||0;
    if(vol > 0 && vol < lm.mev){
      recs.push({icon:ICON_TREND_DOWN, tone:"warn", tag:"Volume", title: lm.label+" abaixo do mínimo", desc:"Sua rotina atual programa "+vol+" séries/semana pra "+lm.label.toLowerCase()+" — abaixo do MEV ("+lm.mev+"). Considere adicionar mais séries nesse grupo.", goto:"treino", action:"Ver volume"});
    } else if(vol > lm.mrv){
      recs.push({icon:ICON_ALERT, tone:"crit", tag:"Volume", title: lm.label+" acima do teto", desc:"Sua rotina programa "+vol+" séries/semana pra "+lm.label.toLowerCase()+" — acima do MRV ("+lm.mrv+"). Risco de acúmulo de fadiga; considere reduzir.", goto:"treino", action:"Ajustar volume", focus:"volume-adjust"});
    }
  });

  const weeksNoDeload = weeksSinceDeload();
  if(weeksNoDeload >= 5){
    recs.push({icon:ICON_BATTERY, tone:"info", tag:"Recuperação", title:"Hora de considerar um deload", desc:"Já são "+weeksNoDeload+" semanas sem um deload. Uma semana com ~40-50% menos séries (ou RPE mais baixo nas mesmas séries) ajuda a dissipar fadiga acumulada antes que ela vire overtraining. Ajuste manualmente em \"Editar rotina\" essa semana.", deloadBtn:true});
  }

  const engine = computeStreakEngine();
  if(engine.perfect && engine.streak >= 7){
    recs.push({icon:ICON_TROPHY, tone:"warn", tag:"Reconhecimento", title:"Sequência perfeita!", desc:"Você está há "+engine.streak+" dias seguidos sem usar nenhum congelamento. Considera registrar uma medição ou foto hoje pra guardar esse momento."});
  }

  if(!recs.length){
    recs.push({icon:ICON_CHECK_CIRCLE, tone:"good", tag:"Tudo certo", title:"Nada pra ajustar agora", desc:"Seu volume planejado está dentro das faixas recomendadas e não há deload pendente. Continue assim!"});
  }
  return recs;
}
function renderRecomendacoes(){
  const el = document.getElementById("recomendacoes-body");
  if(!el) return;
  const recs = computeRecomendacoes();
  el.innerHTML = recs.map(r=>
    '<details class="rec-card">'+
      '<summary class="rec-head">'+
        '<span class="rec-icon" style="background:color-mix(in srgb, '+TONE_VAR[r.tone||"info"]+' 16%, transparent); color:'+TONE_VAR[r.tone||"info"]+';">'+r.icon+'</span>'+
        '<span class="rec-head-txt"><span class="rec-tag">'+r.tag+'</span><span class="rec-title">'+escapeHtml(r.title)+'</span></span>'+
      '</summary>'+
      '<div class="rec-body">'+
        '<div class="rec-desc">'+escapeHtml(r.desc)+'</div>'+
        (r.goto ? '<button class="btn small ghost rec-action" data-recgoto="'+r.goto+'"'+(r.focus?' data-recfocus="'+r.focus+'"':'')+'>'+escapeHtml(r.action)+'</button>' : "")+
        (r.deloadBtn ? '<button class="btn small ghost rec-deload-btn">Marquei o deload dessa semana</button>' : "")+
      '</div>'+
    '</details>'
  ).join("");
  el.querySelectorAll("[data-recgoto]").forEach(btn=> btn.addEventListener("click", ()=>{
    showTab(btn.dataset.recgoto);
    if(btn.dataset.recfocus === "volume-adjust"){
      volAdjOpen = true;
      renderVolumeAdjust();
      const t = document.getElementById("volume-adjust");
      if(t && !t.hidden){
        t.scrollIntoView({behavior:"smooth", block:"center"});
        const f = t.querySelector("[data-vadj]"); if(f) f.focus({preventScroll:true});
      }
    }
  }));
  el.querySelectorAll(".rec-deload-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      state.settings = Object.assign({}, state.settings, {ultimoDeload: mondayOfISO(todayISO())});
      saveDoc("config/settings", state.settings);
      showToast("Deload marcado — contagem reiniciada.");
      renderRecomendacoes();
    });
  });
}

const SUPLEMENTOS = [
  {icon:ICON_PILL, titulo:"Creatina monohidratada", desc:"O suplemento de treino com mais evidência acumulada. Segundo a International Society of Sports Nutrition (Kreider et al., 2017): 3–5g/dia, todos os dias, qualquer horário. Protocolo opcional de saturação rápida: 20g/dia divididos em 4 doses por 5-7 dias. Considerada segura em uso contínuo por pessoas sem doença renal prévia."},
  {icon:ICON_SHAKER, titulo:"Whey protein (ou outra fonte de proteína em pó)", desc:"Não é obrigatório — é conveniência pra bater a meta de proteína calculada na aba Dieta (1.4–2.0 g/kg/dia, ISSN/Jäger et al. 2017). Só faz sentido se a comida sólida já não estiver cobrindo essa meta."},
  {icon:ICON_BOLT, titulo:"Cafeína (pré-treino)", desc:"Segundo a ISSN (Guest et al., 2021): 3–6 mg/kg, cerca de 60 minutos antes do treino (pode começar em ~2 mg/kg). Em treino de força o ganho é pequeno (2–7%), mais claro em resistência muscular e velocidade da barra. Doses altas (9 mg/kg) só aumentam efeitos colaterais — taquicardia, ansiedade, insônia — e prejudicam o sono; evite à noite. A tolerância varia de pessoa pra pessoa. Café, cápsula ou pré-treino servem; o que importa é a dose de cafeína."},
  {icon:ICON_PILL, titulo:"Ômega-3 (EPA + DHA)", desc:"O posicionamento da ISSN (2025) aponta que atletas têm risco maior de índice de ômega-3 baixo, e que o suplemento pode ajudar na recuperação (menos dor muscular), no sono e na função cardiovascular, com possível ganho de força em treino resistido. Peixes gordos (salmão, sardinha) 2×/semana já cobrem boa parte; óleo de peixe ou de alga (opção vegetariana) entra se você não come peixe. A dose exata depende da sua dieta — vale combinar com médico ou nutricionista."},
  {icon:ICON_PILL, titulo:"Vitamina D (só se houver deficiência)", desc:"Não é suplemento de performance: segundo o NIH (Office of Dietary Supplements), os estudos não mostram ganho de força ou massa muscular em adultos saudáveis. Ela faz sentido pra corrigir deficiência — o que só um exame de sangue confirma. A ingestão recomendada pra adultos é 600 UI/dia e o limite superior seguro é 4.000 UI/dia, então não vale 'dose de ataque' sem orientação profissional."},
  {icon:ICON_HOME, titulo:"Equipamento (se parte do treino for em casa)", desc:"O plano inicial assume academia (barra, halteres, máquinas) a menos que você tenha escolhido casa ou pouco equipamento no cadastro. Pra treinar em casa ou em viagens: halteres ajustáveis + banco cobrem a maioria dos exercícios de empurrar/puxar; faixas elásticas são baratas, portáteis e boas pra aquecimento."},
  {icon:ICON_RULER, titulo:"Fita métrica e balança (acompanhamento)", desc:"Baratos e os que mais ajudam a saber se o treino está funcionando: peso pela manhã, em jejum e sempre nas mesmas condições, e cintura/quadril na aba Corpo. A fita métrica diz mais sobre composição corporal do que o peso isolado."},
  {icon:ICON_LEGS, titulo:"Calçado adequado", desc:"Pra agachar e levantar peso, solado firme e plano (ou tênis de sola baixa e dura) dá mais estabilidade que tênis de corrida com muito amortecimento. Pra cardio e corrida o amortecimento volta a fazer sentido. É uma questão de estabilidade e conforto, sem estudo que mostre ganho de força."},
  {icon:ICON_TAG, titulo:"Acessórios de apoio (opcionais)", desc:"Cinto de levantamento (pressão intra-abdominal em terra/agachamento pesados), straps (quando o antebraço cansa antes das costas) e joelheiras (conforto em volume alto de pernas) — úteis, não essenciais pra começar."},
];
function renderSuplementos(){
  const el = document.getElementById("suplementos-body");
  if(!el) return;
  el.innerHTML = SUPLEMENTOS.map(s=>
    '<details class="rec-card">'+
      '<summary class="rec-head">'+
        '<span class="rec-icon" style="background:var(--accent-soft); color:var(--accent-fg,var(--accent));">'+s.icon+'</span>'+
        '<span class="rec-head-txt"><span class="rec-title">'+escapeHtml(s.titulo)+'</span></span>'+
      '</summary>'+
      '<div class="rec-body"><div class="rec-desc">'+escapeHtml(s.desc)+'</div></div>'+
    '</details>'
  ).join("");
}

/* ============================================================
   FONTES
   ============================================================ */
function renderFontes(){
  document.getElementById("fontes-corpo").innerHTML =
    'Fórmulas: IMC — <a href="https://www.cdc.gov/bmi/adult-calculator/bmi-categories.html" target="_blank" rel="noopener">classificação CDC/OMS</a> · '+
    'RCQ — <a href="https://www.who.int/publications/i/item/9789241501491" target="_blank" rel="noopener">OMS, Waist Circumference and Waist-Hip Ratio (2008)</a> · '+
    '% Gordura — método da Marinha dos EUA (<a href="https://www.omnicalculator.com/pt/saude/gordura-corporal-marinha-americana" target="_blank" rel="noopener">fórmula de Hodgdon &amp; Beckett</a>), classificação por faixas — <a href="https://www.acefitness.org/about-ace/press-room/in-the-news/8602/body-fat-percentage-charting-averages-in-men-and-women-very-well-health/" target="_blank" rel="noopener">ACE Fitness</a> · Cintura ÷ altura — <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4800150/" target="_blank" rel="noopener">Ashwell &amp; Gibson, BMJ Open (2016)</a> · Hábitos — sono: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/" target="_blank" rel="noopener">AASM/SRS (2015)</a>, passos: <a href="https://pubmed.ncbi.nlm.nih.gov/35247352/" target="_blank" rel="noopener">Paluch et al. (2022)</a>.';
  document.getElementById("fontes-dieta").innerHTML =
    'Fórmulas: TMB — <a href="https://www.omnicalculator.com/health/bmr" target="_blank" rel="noopener">equação de Mifflin-St Jeor</a> · '+
    'Proteína — <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153" target="_blank" rel="noopener">ISSN Position Stand: Protein and Exercise (2017)</a> · '+
    'Gordura/Carboidrato — <a href="https://www.ncbi.nlm.nih.gov/books/NBK610333/" target="_blank" rel="noopener">Acceptable Macronutrient Distribution Range (IOM/National Academies)</a> · '+
    'Cardápio — composição dos alimentos pela <a href="https://www.tabelatacoonline.com.br" target="_blank" rel="noopener">Tabela Brasileira de Composição de Alimentos (TACO, NEPA/UNICAMP)</a>; soja texturizada e proteínas em pó: valor típico de rótulo; vegano e vegetariano: <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153" target="_blank" rel="noopener">ISSN Position Stand (2017)</a>; proteína por refeição: <a href="https://pubmed.ncbi.nlm.nih.gov/28642676/" target="_blank" rel="noopener">ISSN Position Stand (2017)</a>; nota sobre déficit: <a href="https://pubmed.ncbi.nlm.nih.gov/28698222/" target="_blank" rel="noopener">Morton et al. (2018)</a>.';
  const fontesRec = document.getElementById("fontes-recomendacoes");
  if(fontesRec){
    fontesRec.innerHTML =
      'Fontes: <a href="https://link.springer.com/article/10.1186/s12970-017-0173-z" target="_blank" rel="noopener">Kreider et al. (2017) — ISSN Position Stand: Creatine Supplementation</a> · '+
      '<a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153" target="_blank" rel="noopener">Jäger et al. (2017) — ISSN Position Stand: Protein and Exercise</a> · '+
      '<a href="https://jissn.biomedcentral.com/track/pdf/10.1186/s12970-020-00383-4" target="_blank" rel="noopener">Guest et al. (2021) — ISSN Position Stand: Caffeine and Exercise Performance</a> · '+
      '<a href="https://www.nutraingredients.com/Article/2025/01/22/issn-publishes-position-on-omega-3-for-athletes/" target="_blank" rel="noopener">ISSN (2025) — Omega-3 for Athletes (resumo)</a> · '+
      '<a href="https://ods.od.nih.gov/factsheets/VitaminD-HealthProfessional/" target="_blank" rel="noopener">NIH ODS — Vitamin D Fact Sheet</a> · '+
      '<a href="https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth" target="_blank" rel="noopener">RP Strength — Training Volume Landmarks (MEV/MAV/MRV)</a> · '+
      '<a href="https://musclesquad.com/blogs/fitness-equipment/5-home-gym-essentials" target="_blank" rel="noopener">MuscleSquad — equipamentos essenciais de home gym</a>.';
  }
}

/* ============================================================
   RENDER GERAL
   ============================================================ */
/* v94 P1: render por seção. Antes, cada clique refazia as 33 funções de desenho (tela inteira, inclusive abas ocultas).
   Agora só a aba visível é redesenhada; as demais ficam marcadas e são desenhadas quando abertas (showTab). */
const SECTION_RENDERERS = {
  painel: [renderPlanoPorque, renderStreak, renderNarrator, renderLastWeekRecap, renderWeekDots, renderQuickStats, renderWeightChart, renderTodayCard, renderHojeMetricas, renderHojeMissoes, renderChallenges, renderResumoMes, renderRecordesPessoais, renderSemanaResumo],
  treino: [renderPlanoPorque, renderFormatoCard, renderWeekGrid, renderCargas, renderAnaliseTreino, renderVolume, renderHeatmap, renderBibliotecaExercicios],
  corpo: [renderCorpoKpis, renderAtalhoMedidas, renderComoMedir, renderComposicao, renderHabitos, renderGradeHabitos, renderMusculosSemana, renderEvolucaoChart, renderFotosProgresso, renderTabelaMedicoes],
  dieta: [renderDieta],
  recomendacoes: [renderRecomendacoes, renderSuplementos, renderPeriodizacaoStatus],
  perfil: [renderRadar, renderAttrs, renderPerfilSummary, renderMarcos, renderAchievements],
  config: [renderTemas, renderSkins, renderConfigExtras, renderRecupConfig],
  glossario: [renderGlossario]
};
function renderSection(id){
  dirtyViews.delete(id);
  (SECTION_RENDERERS[id] || []).forEach(fn=> fn());
}
function visibleViewId(){
  const v = document.querySelector(".view:not([hidden])");
  return v ? v.id.replace("view-","") : "painel";
}
/* Safari/WebKit: quando um redesenho troca o conteúdo de vários cartões de uma vez, o navegador perde a posição da página
   (vai ao topo, às vezes ao fim) sem nenhum comando de rolagem do app. O Chrome não faz isso (ancora a rolagem). Guardamos o scrollY
   antes de redesenhar e devolvemos no mesmo instante, antes de pintar: a pessoa não vê nada. Só age se a posição mudou de fato. */
function preservandoRolagem(fn){
  const y = window.scrollY;
  try{ fn(); }
  finally{ if(Math.abs(window.scrollY - y) > 1) (window.ngScrollRestaura || window.scrollTo.bind(window))(0, y); }   // "restaura" não desliga a guarda de rolagem (ver seguraRolagem)
}
function render(){
  preservandoRolagem(()=>{
    applyAccentSkin();
    applyGameMode();
    renderNivel(); renderNavExtras(); renderMolduras();            // aparece no Perfil e no Painel (card de patente compacto) — sempre atual
    const cur = visibleViewId();
    Object.keys(SECTION_RENDERERS).forEach(id=>{ if(id === cur) renderSection(id); else dirtyViews.add(id); });
  });
}
function renderAll(){ preservandoRolagem(()=>{ Object.keys(SECTION_RENDERERS).forEach(renderSection); applyAccentSkin(); applyGameMode(); renderNivel(); }); }   // impressão/exportação e testes

/* v83: luz que acompanha o ponteiro nos cards (só mouse/trackpad) */
(function cardSpotlight(){
  if(!window.matchMedia || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
  let raf = 0, last = null;
  document.addEventListener("pointermove", (e)=>{
    last = e;
    if(raf) return;
    raf = requestAnimationFrame(()=>{
      raf = 0;
      const card = last.target && last.target.closest ? last.target.closest(".card") : null;
      if(!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", (last.clientX - r.left)+"px");
      card.style.setProperty("--my", (last.clientY - r.top)+"px");
    });
  }, {passive:true});
})();

renderFontes();
initStore();   // v92: o assistente de primeiro uso abre em fimCarregamento(), depois que o banco respondeu
render();

// a trilha semanal depende da largura real do card — reajusta ao redimensionar a janela
let trailResizeTimer = null;
window.addEventListener("resize", ()=>{
  clearTimeout(trailResizeTimer);
  trailResizeTimer = setTimeout(renderWeekTrail, 150);
});


/* Segura a posição da página quando NÃO foi a pessoa que rolou.
   Safari/WebKit pula a página de dois jeitos: (1) no clique (mousedown) o foco vai para o elemento "focável" mais próximo — a seção da tela —
   e o Safari pode rolar até ele; é por isso que clicar num botão (o Safari não dá foco a botões) ou no espaço entre os cartões "joga a tela para outro canto";
   (2) um redesenho que encolhe a página por um instante. Aqui: lembramos o scrollY no pointerdown (antes de qualquer foco) e, se a página saltar
   mais de 40 px dentro de 0,35 s sem a pessoa ter girado a roda, tocado e arrastado ou usado o teclado, devolvemos. Depois do clique, saltos para CIMA
   (>120 px) também são desfeitos por 2,5 s. Rolagens pedidas pelo próprio app (scrollTo/scrollIntoView) desligam a guarda. */
(function seguraRolagem(){
  const sTo = window.scrollTo.bind(window);
  let alvo = null, ate = 0, loop = false, yDown = null, ateDown = 0;
  const NAV = '[data-tab],[data-goto],[data-empty-go],[data-subtab],[data-go],a[href],.tab-btn,.cmdk-chip,.top-avatar,.top-icon';
  const solta = ()=>{ alvo = null; yDown = null; };
  const longe = (y)=> Math.abs(window.scrollY - y) > 40;
  const subiu = (y)=> window.scrollY < y - 120;   // depois do clique só desfazemos salto para CIMA (a página encolheu); salto para baixo só na janela curta do toque
  const folga = ()=> document.documentElement.scrollHeight - window.innerHeight;
  // 1) antes do foco: onde a página estava
  document.addEventListener("pointerdown", (e)=>{
    alvo = null; yDown = null;
    const t = e.target;
    if(!t || t === document.documentElement || !t.closest || t.closest(NAV)) return;
    yDown = window.scrollY; ateDown = performance.now() + 350;   // o foco acontece no mousedown, logo após o pointerdown
  }, true);
  // 2) depois do clique em algo da tela
  document.addEventListener("click", (e)=>{
    const t = e.target;
    if(!t || !t.closest || t.closest(NAV) || !t.closest(".view")) return;
    alvo = (yDown != null ? yDown : window.scrollY); ate = performance.now() + 2500;
    if(!loop){ loop = true; requestAnimationFrame(tick); }
  }, true);
  // a página pode encolher e só voltar a crescer alguns quadros depois (conteúdo montado em etapas): enquanto a
  // janela de 2,5 s estiver aberta, a cada quadro devolve a rolagem se ela saltou
  function tick(){
    if(alvo == null || performance.now() > ate){ loop = false; return; }
    if(subiu(alvo) && folga() >= alvo - 2) sTo(0, alvo);
    requestAnimationFrame(tick);
  }
  ["wheel","touchmove","keydown","pointercancel"].forEach(ev=> addEventListener(ev, solta, {passive:true, capture:true}));   // a pessoa rolou: a guarda sai de cena
  addEventListener("scroll", ()=>{
    const agora = performance.now();
    if(yDown != null){
      if(agora > ateDown) yDown = null;
      else if(longe(yDown)){ sTo(0, yDown); return; }   // saltou logo depois do toque: volta
    }
    if(alvo == null) return;
    if(agora > ate){ alvo = null; return; }
    if(subiu(alvo)) sTo(0, alvo);
  }, {passive:true});
  // rolagem feita pelo próprio app (scrollIntoView/scrollTo) não deve ser desfeita
  const sIV = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function(){ solta(); return sIV.apply(this, arguments); };
  window.ngScrollRestaura = sTo;
  window.scrollTo = function(){ solta(); return sTo.apply(window, arguments); };
  // focus() sem opções deixa de rolar a página quando o elemento JÁ está à vista (o Safari rola mesmo assim ao refazer a tela e devolver o foco ao botão).
  // Elemento fora da tela continua sendo levado à vista (campo em erro, foco devolvido ao botão depois de fechar um pop-up).
  const f0 = HTMLElement.prototype.focus;
  HTMLElement.prototype.focus = function(o){
    if(o !== undefined) return f0.call(this, o);
    f0.call(this, {preventScroll:true});
    try{
      const r = this.getBoundingClientRect();
      if(r.height > 0 && (r.bottom < 0 || r.top > window.innerHeight)) sIV.call(this, {block:/^(INPUT|TEXTAREA|SELECT)$/.test(this.tagName) ? "center" : "nearest", behavior:"auto"});
    }catch(_){}
  };
})();

/* cabeçalho que some ao rolar pra baixo e reaparece ao rolar pra cima — só em
   telas de toque; no topo da página (ou ao trocar de aba) fica sempre visível */
(function setupAutoHideHeader(){
  const bar = document.querySelector(".topbar");
  if(!bar || !window.matchMedia) return;
  const mq = window.matchMedia("(hover:none) and (pointer:coarse)");
  let lastY = window.scrollY, ticking = false;
  function update(){
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const dy = y - lastY;
    if(!mq.matches || y < 60){ bar.classList.remove("hide"); lastY = y; return; }
    if(dy > 10){ bar.classList.add("hide"); lastY = y; }
    else if(dy < -10){ bar.classList.remove("hide"); lastY = y; }
  }
  window.addEventListener("scroll", ()=>{ if(!ticking){ ticking = true; requestAnimationFrame(update); } }, {passive:true});
  // foco num campo dentro do cabeçalho (ex.: navegação por teclado) → mostra de volta
  bar.addEventListener("focusin", ()=> bar.classList.remove("hide"));
})();
/* ganchos só para os testes automatizados — ficam inertes a menos que o aparelho tenha ng_test_hooks=1 */
/* NG+ — resumo compacto para o "treinador por IA" (só é usado no app instalado/online e só se a pessoa ativar). Não inclui nome, e-mail, idade, peso, medidas nem fotos. */
function resumoParaTreinador(){
  const p = state.perfil || {};
  const plan = computeVolumeTotals();
  const musc = {}; DAYS.forEach(k=>{ const d = state.rotina[k]; if(d && d.ativo) (d.exercicios||[]).forEach(e=>{ if(!musc[e.nome]) musc[e.nome] = e.musculos || []; }); });
  const ordem = {estagnado:0, progredindo:1, estavel:2, "sem-dados":3};
  const itens = allActiveExercises().map(x=> analiseExercicio(x.nome, musc[x.nome], plan)).filter(i=> i.sess.length).sort((a,b)=> ordem[a.cls.estado] - ordem[b.cls.estado]).slice(0, 14);
  const seg = mondayOfISO(todayISO()), real = semanaRealizadaPorMusculo(seg);
  const hoje = todayISO(), ha30 = addDaysISO(hoje, -30);
  return {
    experiencia: String(p.experiencia || ""), objetivo: String(p.objetivo || ""),
    diasPorSemana: DAYS.filter(k=>{ const d = state.rotina[k]; return d && d.ativo !== false && (d.exercicios||[]).length; }).length,
    sequenciaDias: computeStreak(),
    treinosUltimos30Dias: Object.keys(state.checkins).filter(iso=> iso > ha30 && iso <= hoje && state.checkins[iso] && state.checkins[iso].concluido).length,
    exercicios: itens.map(i=>({nome:i.nome, estado:i.cls.estado, resumo:i.resumo, sessoes:i.sess.slice(-ANALISE_JANELA).map(x=>({data:x.iso, cargaKg:x.peso, repsPorSerie:x.sets, rpe:x.rpe}))})),
    volume: MUSCLE_ORDER.filter(m=> (plan[m]||0) > 0).map(m=>({musculo:MUSCLE_LANDMARKS[m].label, realizado:real[m]||0, planejado:plan[m], minimo:MUSCLE_LANDMARKS[m].mev, ideal:MUSCLE_LANDMARKS[m].mav, teto:MUSCLE_LANDMARKS[m].mrv}))
  };
}
window.ngApp = { resumoParaTreinador, exportarBackup: ()=> exportarDadosJSON(), perfilCarregado: ()=> !!state.perfil, idade: ()=> { const n = Number((state.perfil||{}).idade); return isFinite(n) && n > 0 ? n : null; } };
try{ if(localStorage.getItem("ng_test_hooks") === "1" && /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) window.__ngTest = {sugestaoProgressao, TIPS, GLOSSARIO, state: ()=> state, analiseExercicio, classificarExercicio, sessoesDoExercicio, semanaRealizadaPorMusculo, renderAnaliseTreino}; }catch(e){}
})();
