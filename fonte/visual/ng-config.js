/* NG+ — Configurações organizadas em 5 grupos (antes eram 12 cartões soltos).
   Só reorganiza o que já existe: os cartões são MOVIDOS (mesmos ids, mesmos botões e ouvintes), nada é copiado nem recriado.
   Ordem: Treino e rotina · Aparência · App e ajuda · Dados e diagnóstico · Conta e sincronização (sempre por último).
   Uma barra de atalhos no topo leva a cada grupo. */
(function organizaConfig(){
  const view = document.getElementById("view-config");
  if(!view || view.querySelector(".cfg-grupo")) return;
  const ic = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'+d+'</svg>';
  const GRUPOS = [
    {k:"treino", t:"Treino e rotina", d:"onde você treina, periodização e lembretes", ic:ic('<path d="M6.5 6.5 3 10l4 4M17.5 17.5 21 14l-4-4M7 12h10M9 8l6 8"/>'),
      cartoes:["#cfg-local-card","Periodização avançada","Como você está hoje","#cfg-lembretes"]},
    {k:"aparencia", t:"Aparência", d:"tema, cores de destaque e molduras", ic:ic('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 12h8.5"/>'),
      cartoes:["Personalização"]},
    {k:"app", t:"App e ajuda", d:"instalar no celular e rever o tutorial", ic:ic('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>'),
      cartoes:["#cfg-instalar","Tutorial"]},
    {k:"dados", t:"Dados e diagnóstico", d:"backup, importação e relatório de erros", ic:ic('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>'),
      cartoes:["Seus dados","#cfg-diag-card"]},
    {k:"conta", t:"Conta e sincronização", d:"apelido, nuvem e acesso", ic:ic('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6.5 7-6.5s7 2.9 7 6.5"/>'),
      cartoes:["Conta","#cfg-admin","#cfg-conta"]}
  ];
  const cards = [...view.querySelectorAll(":scope > .card")];
  const acha = ch => ch.charAt(0) === "#" ? cards.find(c=> "#"+c.id === ch) : cards.find(c=>{ const h = c.querySelector("h2"); return h && h.textContent.trim().indexOf(ch) === 0; });
  const usados = new Set();
  const nav = document.createElement("nav");
  nav.className = "cfg-jump"; nav.setAttribute("aria-label", "Grupos de configurações");
  const frag = document.createDocumentFragment();
  GRUPOS.forEach(g=>{
    const sec = document.createElement("section");
    sec.className = "cfg-grupo"; sec.id = "cfg-g-"+g.k; sec.setAttribute("aria-labelledby", "cfg-g-"+g.k+"-t");
    sec.innerHTML = '<header class="cfg-grupo-h"><span class="cfg-grupo-ic">'+g.ic+'</span><div><h2 id="cfg-g-'+g.k+'-t">'+g.t+'</h2><p>'+g.d+'</p></div></header>';
    g.cartoes.forEach(ch=>{ const c = acha(ch); if(c && !usados.has(c)){ usados.add(c); c.classList.add("cfg-bloco"); sec.appendChild(c); } });
    frag.appendChild(sec);
    const a = document.createElement("button");
    a.type = "button"; a.className = "cfg-jump-b"; a.dataset.cfgIr = g.k; a.textContent = g.t.replace(/ e .*/, "").replace("App", "App");
    nav.appendChild(a);
  });
  // cartões que não estão na lista (futuros) vão para "App e ajuda", antes da Conta
  const sobra = cards.filter(c=> !usados.has(c));
  const alvoSobra = frag.querySelector("#cfg-g-app");
  sobra.forEach(c=>{ c.classList.add("cfg-bloco"); alvoSobra.appendChild(c); });
  view.insertBefore(nav, view.firstChild);
  view.appendChild(frag);
  nav.addEventListener("click", e=>{
    const b = e.target.closest("[data-cfg-ir]"); if(!b) return;
    const alvo = document.getElementById("cfg-g-"+b.dataset.cfgIr); if(!alvo) return;
    alvo.scrollIntoView({block:"start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"});
    try{ alvo.querySelector("h2").parentNode.setAttribute("tabindex", "-1"); alvo.querySelector("h2").parentNode.focus({preventScroll:true}); }catch(_){}
  });
})();
