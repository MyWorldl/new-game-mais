/* NG+ — grade de hábitos das últimas 12 semanas. Só leitura de checkins/<iso>.hab (inclui o novo campo opcional "agua").
   Cada quadradinho é uma semana; o número é quantos dias daquela semana tiveram o hábito registrado (sem meta, sem culpa). */
const HAB_GRADE = [
  {k:"sono",   nome:"Sono"},
  {k:"passos", nome:"Passos"},
  {k:"cardio", nome:"Cárdio leve"},
  {k:"agua",   nome:"Água"}
];
function renderGradeHabitos(){
  const box = document.getElementById("hab-grade");
  if(!box) return;
  const hoje = todayISO();
  const seg0 = addDaysISO(mondayOfISO(hoje), -7*11);
  const semanas = [];
  for(let w = 0; w < 12; w++){
    const ini = addDaysISO(seg0, w*7);
    semanas.push(ini);
  }
  const html = HAB_GRADE.map(h=>{
    let total = 0;
    const cels = semanas.map(ini=>{
      let c = 0;
      for(let i = 0; i < 7; i++){
        const iso = addDaysISO(ini, i);
        if(iso > hoje) break;
        const x = habDe(iso);
        if(x && x[h.k] != null) c++;
      }
      total += c;
      const nv = c === 0 ? 0 : c <= 2 ? 1 : c <= 4 ? 2 : 3;
      const rot = "Semana de "+fmtDateBR(ini)+": "+c+(c === 1 ? " dia" : " dias")+" com registro";
      return '<span class="hg-c l'+nv+'" role="listitem" aria-label="'+rot+'" title="'+rot+'">'+(c ? c : "")+'</span>';
    }).join("");
    return '<div class="hg-row">'+
      '<div class="hg-top"><b>'+h.nome+'</b><span>'+(total ? total+(total === 1 ? " dia registrado" : " dias registrados") : "sem registros ainda")+'</span></div>'+
      '<div class="hg-cells" role="list" aria-label="'+h.nome+": dias com registro por semana, das últimas 12 semanas"+'">'+cels+'</div>'+
    '</div>';
  }).join("");
  box.innerHTML =
    '<h3 class="hg-h">Últimas 12 semanas</h3>'+
    '<p class="hg-sub">Cada quadradinho é uma semana; o número mostra em quantos dias você registrou. Registrar já conta, não há meta.</p>'+
    html+
    '<div class="hg-eixo" aria-hidden="true"><span>há 12 semanas</span><span>esta semana</span></div>';
}
