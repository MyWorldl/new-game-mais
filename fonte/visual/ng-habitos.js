/* NG+ — grade de hábitos das últimas 12 semanas. Só leitura de checkins/<iso>.hab (inclui o campo opcional "agua").
   Cada quadradinho é uma semana; o número é quantos dias daquela semana tiveram o hábito registrado (sem meta, sem culpa). */
const HAB_GRADE = [
  {k:"sono",   nome:"Sono"},
  {k:"passos", nome:"Passos"},
  {k:"cardio", nome:"Cárdio leve"},
  {k:"agua",   nome:"Água"}
];
const HAB_MES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
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
    const cont = semanas.map(ini=>{
      let c = 0;
      for(let i = 0; i < 7; i++){
        const iso = addDaysISO(ini, i);
        if(iso > hoje) break;
        const x = habDe(iso);
        if(x && x[h.k] != null) c++;
      }
      return c;
    });
    const total = cont.reduce((t,c)=> t+c, 0);
    const max = Math.max.apply(null, cont);
    let iBest = -1;
    if(max > 0) for(let i = cont.length-1; i >= 0; i--) if(cont[i] === max){ iBest = i; break; }
    const primeira = cont.findIndex(c=> c > 0);
    const media = primeira >= 0 ? total/(12-primeira) : 0;
    return {h, cont, total, max, iBest, media};
  });
  const lider = dados.slice().sort((a,b)=> b.total - a.total)[0];
  const html = dados.map(d=>{
    const cels = d.cont.map((c,w)=>{
      const ini = semanas[w];
      const rot = "Semana de "+fmtDateBR(ini)+": "+dias(c)+" com registro"+(w === 11 ? " (semana atual, em andamento)" : "")+(w === d.iBest ? " — sua semana mais constante" : "");
      return '<span class="hg-c l'+nvDe(c)+(w === 11 ? ' now' : '')+(w === d.iBest ? ' best' : '')+'" role="listitem" aria-label="'+rot+'" title="'+rot+'">'+(c ? c : "")+'</span>';
    }).join("");
    const st = d.total
      ? '<div class="hg-st"><span>Esta semana <b>'+d.cont[11]+'</b></span><span>Média <b>'+num(d.media, 1)+'</b>/semana</span><span>Melhor <b>'+d.max+'</b> dias</span></div>'
      : '';
    return '<div class="hg-row">'+
      '<div class="hg-top"><b>'+d.h.nome+'</b><span>'+(d.total ? dias(d.total)+" registrados" : "sem registros ainda")+'</span></div>'+
      '<div class="hg-cells" role="list" aria-label="'+d.h.nome+": dias com registro por semana, das últimas 12 semanas"+'">'+cels+'</div>'+st+
    '</div>';
  }).join("");
  let mesAnt = -1;
  const meses = semanas.map(ini=>{ const m = Number(ini.slice(5,7)) - 1; const novo = m !== mesAnt; mesAnt = m; return '<span>'+(novo ? HAB_MES[m] : '')+'</span>'; }).join("");
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
