/* ---- NG+ visual v2 · Fase 3: radar da Ficha de personagem (somente leitura; nenhum dado novo é salvo) ---- */
function radarAxes(){
  const today = todayISO();
  // 1) Consistência — treinos feitos / agendados nos últimos 30 dias
  const sched30 = activeDaysInRange(addDaysISO(today, -29), today);
  const done30 = sched30.filter(iso=> state.checkins[iso]?.concluido).length;
  // 2) Semana — treinos feitos / treinos ativos da semana corrente (seg–dom)
  const wk = weekRange(today);
  const wkAtivos = wk.filter(iso=> state.rotina[dayKeyFromISO(iso)]?.ativo);
  const wkDone = wkAtivos.filter(iso=> state.checkins[iso]?.concluido).length;
  // 3) Hábitos — dias com algum hábito registrado nos últimos 7 dias
  let habDias = 0;
  for(let i=0;i<7;i++){ if(habDe(addDaysISO(today, -i))) habDias++; }
  // 4) Medições — semanas (das últimas 4) com pelo menos uma medição
  const medIsos = Object.keys(state.medicoes||{});
  let medSem = 0;
  for(let w=0; w<4; w++){
    const a = addDaysISO(today, -(7*w+6)), b = addDaysISO(today, -7*w);
    if(medIsos.some(iso=> iso>=a && iso<=b)) medSem++;
  }
  // 5) Patente — progresso dentro da patente atual
  const info = computeNivelInfo();
  const patPct = info.isMax ? 100 : Math.min(100, Math.round((info.xpInTier/info.tierNeed)*100));
  const pct = (a,b)=> b>0 ? Math.round(Math.min(1, a/b)*100) : 0;
  return [
    {k:"Consistência", v:pct(done30, sched30.length), sub: sched30.length ? done30+" de "+sched30.length+" treinos em 30 dias" : "sem treinos agendados ainda"},
    {k:"Semana", v:pct(wkDone, wkAtivos.length), sub: wkAtivos.length ? wkDone+" de "+wkAtivos.length+" treinos desta semana" : "sem treinos nesta semana"},
    {k:"Hábitos", v:pct(habDias, 7), sub: habDias+" de 7 dias com hábitos registrados"},
    {k:"Medições", v:pct(medSem, 4), sub: medSem+" de 4 semanas com medição"},
    {k:"Patente", v:patPct, sub: info.isMax ? "patente máxima atingida" : info.tierName+" · "+num(info.xpInTier)+" de "+num(info.tierNeed)+" XP"}
  ];
}
function renderRadar(){
  const el = document.getElementById("attrs-radar");
  if(!el) return;
  const axes = radarAxes();
  const W = 360, H = 270, cx = 180, cy = 142, R = 88, n = axes.length;
  const ang = i => (-90 + i*360/n) * Math.PI/180;
  const pt = (i, r) => [cx + r*Math.cos(ang(i)), cy + r*Math.sin(ang(i))];
  const f = v => (Math.round(v*10)/10);
  const ring = frac => axes.map((_,i)=>{ const p = pt(i, R*frac); return f(p[0])+","+f(p[1]); }).join(" ");
  let svg = '<svg class="radar-svg" viewBox="0 0 '+W+' '+H+'" aria-hidden="true" focusable="false">';
  [0.25,0.5,0.75,1].forEach(fr=>{ svg += '<polygon class="radar-ring'+(fr===1?' outer':'')+'" points="'+ring(fr)+'"/>'; });
  axes.forEach((_,i)=>{ const p = pt(i, R); svg += '<line class="radar-spoke" x1="'+cx+'" y1="'+cy+'" x2="'+f(p[0])+'" y2="'+f(p[1])+'"/>'; });
  const poly = axes.map((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); return f(p[0])+","+f(p[1]); }).join(" ");
  svg += '<polygon class="radar-area" points="'+poly+'"/>';
  axes.forEach((a,i)=>{ const p = pt(i, R*Math.max(a.v,3)/100); svg += '<circle class="radar-dot" cx="'+f(p[0])+'" cy="'+f(p[1])+'" r="4"/>'; });
  axes.forEach((a,i)=>{
    const p = pt(i, R+14), c = Math.cos(ang(i));
    const anchor = Math.abs(c) < 0.2 ? "middle" : (c > 0 ? "start" : "end");
    const dy = (i===0) ? -14 : (Math.sin(ang(i)) > 0.5 ? 6 : -4);
    svg += '<text class="radar-lbl" x="'+f(p[0])+'" y="'+f(p[1]+dy)+'" text-anchor="'+anchor+'">'+escapeHtml(a.k)+'<tspan class="radar-val" x="'+f(p[0])+'" dy="14">'+a.v+'%</tspan></text>';
  });
  svg += '</svg>';
  const list = '<ul class="radar-list" aria-label="Atributos da ficha de personagem">'+axes.map(a=>
    '<li><div class="radar-li-top"><span>'+escapeHtml(a.k)+'</span><b>'+a.v+'%</b></div>'+
    '<div class="radar-li-bar" aria-hidden="true"><i style="width:'+a.v+'%"></i></div>'+
    '<small>'+escapeHtml(a.sub)+'</small></li>').join("")+'</ul>';
  el.innerHTML = svg + list;
}
