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
