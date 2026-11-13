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
