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
