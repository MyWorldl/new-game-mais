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
