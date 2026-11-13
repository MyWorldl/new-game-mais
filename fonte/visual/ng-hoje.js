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
