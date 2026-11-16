/* NG+ — topo e menu lateral (referência Kinora): título da seção + saudação, avatar, card de sequência no menu e
   botão de recolher o menu. Só leitura dos dados que o app já calcula; a única preferência guardada é a do menu
   (recolhido/expandido), no navegador (localStorage, com try/catch). */
const NAV_TITULOS = {painel:"Hoje", treino:"Treino", dieta:"Dieta", corpo:"Corpo", recomendacoes:"Dicas", perfil:"Perfil", glossario:"Glossário", config:"Configurações"};
function navTitulo(id){
  const el = document.getElementById("top-sec");
  if(el) el.textContent = NAV_TITULOS[id] || "NG+";
}
function navPrimeiroNome(){
  const p = state.perfil;
  return (p && p.nomeCompleto) ? String(p.nomeCompleto).trim().split(/\s+/)[0] : "";
}
function navSaudacao(){
  const h = new Date().getHours();
  const g = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const n = navPrimeiroNome();
  return n ? g+", "+n : g;
}
const SS_FLAME = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2c1 3.5 4.5 5.5 4.5 10a4.5 4.5 0 0 1-9 0c0-1.7.8-3 1.7-4.2.3 1.2 1 1.9 1.8 2C11 7.5 11 4.5 12 2Z"/></svg>';
function renderSideStreak(){
  const box = document.getElementById("side-streak");
  if(!box) return;
  const eng = computeStreakEngine();
  const hoje = todayISO(), seg = mondayOfISO(hoje), start = getTrackingStartISO();
  const NOMES = {feito:"treino feito", hoje:"hoje", falta:"sem registro", descanso:"descanso", futuro:"ainda vai chegar"};
  const dots = [], falas = [];
  for(let i = 0; i < 7; i++){
    const iso = addDaysISO(seg, i), key = dayKeyFromISO(iso);
    const ativo = !!(state.rotina[key] && state.rotina[key].ativo);
    const c = state.checkins[iso];
    let st;
    if(c && c.concluido) st = "feito";
    else if(iso === hoje) st = "hoje";
    else if(iso > hoje) st = ativo ? "futuro" : "descanso";
    else if(iso < start || !ativo) st = "descanso";
    else st = "falta";
    dots.push('<span class="ss-d"><i class="ss-l">'+DAY_LABEL[key].charAt(0)+'</i><i class="ss-dot st-'+st+(st === "hoje" && c && c.concluido ? " feito" : "")+'"></i></span>');
    falas.push(DAY_LABEL[key]+": "+(iso === hoje && st !== "feito" ? "hoje, "+(ativo ? "treino em aberto" : "descanso") : NOMES[st]));
  }
  box.setAttribute("aria-label", "Sequência atual: "+eng.streak+(eng.streak === 1 ? " dia" : " dias")+". Esta semana, "+falas.join("; ")+".");
  box.innerHTML =
    '<span class="ss-head">'+SS_FLAME+'<span class="ss-eyebrow">Sequência atual</span></span>'+
    '<span class="ss-num"><b>'+eng.streak+'</b><span class="ss-unit">'+(eng.streak === 1 ? "dia" : "dias")+'</span></span>'+
    '<span class="ss-dots" aria-hidden="true">'+dots.join("")+'</span>';
}
function renderNavExtras(){
  const g = document.getElementById("top-greet");
  if(g) g.textContent = navSaudacao();
  const av = document.getElementById("top-avatar"), ini = document.getElementById("top-avatar-ini");
  const p = state.perfil, n = navPrimeiroNome();
  if(ini){
    const foto = p ? fotoPerfilValida(p.fotoPerfil) : null;
    ini.textContent = "";
    if(foto) ini.appendChild(fotoPerfilImg(foto)); else ini.textContent = p ? perfilInitials(p.nomeCompleto) : "?";
    if(av) av.classList.toggle("has-foto", !!foto);
  }
  if(av) av.setAttribute("aria-label", n ? "Abrir o perfil de "+n : "Abrir o perfil");
  navTitulo(visibleViewId());
  renderSideStreak();
}
function navAplicar(modo){
  document.documentElement.setAttribute("data-nav", modo);
  const b = document.getElementById("nav-toggle");
  if(b) b.setAttribute("aria-pressed", modo === "rail" ? "true" : "false");
}
(function setupNavExtras(){
  let modo = "wide";
  try{ if(localStorage.getItem("ng-nav") === "rail") modo = "rail"; }catch(e){}
  navAplicar(modo);
  const t = document.getElementById("nav-toggle");
  if(t) t.addEventListener("click", ()=>{
    modo = document.documentElement.getAttribute("data-nav") === "rail" ? "wide" : "rail";
    navAplicar(modo);
    try{ localStorage.setItem("ng-nav", modo); }catch(e){}
  });
  const s = document.getElementById("top-search");
  if(s) s.addEventListener("click", ()=>{ const c = document.getElementById("cmdk-open"); if(c) c.click(); });
})();
