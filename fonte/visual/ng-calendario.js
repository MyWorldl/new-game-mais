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
