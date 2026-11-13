/* NG+ — progresso das conquistas + "Próximos marcos".
   Tudo é DERIVADO dos dados que o app já guarda (nada novo é gravado, o formato do backup não muda). */
function achProgressList(){
  const eng = computeStreakEngine(), ni = computeNivelInfo(), tr = countTotalTreinos();
  const sem = statsSemana(mondayOfISO(todayISO()));
  const P = (cur, max, un, extra)=> ({cur:Math.max(0, Math.min(cur, max)), max:max, un:un, extra:extra||""});
  return {
    "Primeiro Passo":     P(tr, 1, "treino"),
    "Semana de Ferro":    P(eng.best, 7, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Guerreiro do Mês":   P(eng.best, 30, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Inabalável":         P(eng.best, 90, "dias de sequência", "Conta a sua melhor sequência até hoje."),
    "Centurião":          P(tr, 100, "treinos", "Dia leve não entra nesta conta."),
    "Patente Ouro":       P(ni.tierIndex, 4, "degraus de patente", "Você está na patente "+ni.tierName+"."),
    "Patente Radiante":   P(ni.tierIndex, 9, "degraus de patente", "Você está na patente "+ni.tierName+"."),
    "Recorde Pessoal":    P(hasCargaRegistrada() ? 1 : 0, 1, "registro de carga"),
    "Congelado no Tempo": P(eng.freezesUsedTotal, 1, "congelamento usado", "O congelamento entra sozinho quando você falta e ainda tem saldo."),
    "Regularidade Total": sem.cap > 0
      ? P(sem.feitos, sem.cap, "treinos desta semana", "Vale também uma semana perfeita no passado: aqui mostramos a semana atual.")
      : P(0, 1, "semana", "Sem treinos agendados nesta semana.")
  };
}
function achProgTxt(p){ return p.cur+" de "+p.max; }

function abrirConquista(i){
  const a = ACHIEVEMENTS[i]; if(!a) return;
  const p = achProgressList()[a.nome] || {cur:0, max:1, un:"", extra:""};
  const feita = a.check();
  const body = document.createElement("div");
  body.innerHTML =
    '<h2>'+escapeHtml(a.nome)+'</h2>'+
    '<div class="sub">'+escapeHtml(a.desc)+'</div>'+
    '<div class="ach-det">'+
      (feita
        ? '<p class="ach-det-ok"><b>Conquista desbloqueada.</b> Ela fica com você, mesmo se a sequência quebrar.</p>'
        : '<div class="ach-det-top"><b>'+achProgTxt(p)+'</b><span>'+escapeHtml(p.un)+'</span></div>'+
          '<div class="ach-bar" aria-hidden="true"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></div>'+
          (p.extra ? '<p class="ach-det-extra">'+escapeHtml(p.extra)+'</p>' : ''))+
    '</div>'+
    '<div class="modal-actions"><button class="btn primary" type="button" id="ach-close">Fechar</button></div>';
  openModal(body);
  body.querySelector("#ach-close").addEventListener("click", closeModal);
}

function renderAchievements(){
  const el = document.getElementById("achievements-grid");
  const countEl = document.getElementById("achievements-count");
  if(!el) return;
  const flags = ACHIEVEMENTS.map(a=>a.check());
  const prog = achProgressList();
  const unlockedCount = flags.filter(Boolean).length;
  if(countEl) countEl.textContent = unlockedCount+" de "+ACHIEVEMENTS.length+" desbloqueadas";
  const htmls = ACHIEVEMENTS.map((a,i)=>{
    const unlocked = flags[i];
    const p = prog[a.nome] || {cur:0, max:1, un:""};
    const color = ACHIEVEMENT_COLORS[i % ACHIEVEMENT_COLORS.length];
    const lbl = a.nome+": "+(unlocked ? "desbloqueada" : "bloqueada, "+achProgTxt(p)+" "+p.un)+". Toque para ver detalhes.";
    return '<button type="button" class="badge-item'+(unlocked?'':' locked')+'" data-ach="'+i+'" aria-label="'+escapeHtml(lbl)+'">'+
      '<span class="badge-ic" style="'+(unlocked?('background:color-mix(in srgb, '+color+' 20%, transparent); border-color:color-mix(in srgb, '+color+' 45%, transparent); color:'+color+'; box-shadow:0 0 12px 1px color-mix(in srgb, '+color+' 40%, transparent);'):'')+'">'+
        BADGE_SHIELD_SVG +
        (unlocked?'':'<span class="badge-lock">'+BADGE_LOCK_SVG+'</span>')+
      '</span>'+
      '<span class="badge-name">'+escapeHtml(a.nome)+'</span>'+
      (unlocked
        ? '<span class="badge-prog done" aria-hidden="true">Feita</span>'
        : '<span class="badge-bar" aria-hidden="true"><i style="width:'+Math.round(p.cur/p.max*100)+'%"></i></span><span class="badge-prog" aria-hidden="true">'+achProgTxt(p)+'</span>')+
    '</button>';
  });
  const secao = (titulo, lista, cls, nota)=> lista.length
    ? '<section class="vit-sec"><h3 class="vit-h">'+titulo+' <span>'+lista.length+'</span></h3>'+(nota ? '<p class="vit-nota">'+nota+'</p>' : '')+'<div class="vit-lista '+cls+'">'+lista.join("")+'</div></section>' : '';
  const ganhas = htmls.filter((_,i)=> flags[i]), faltam = htmls.filter((_,i)=> !flags[i]);
  el.innerHTML = secao("Na vitrine", ganhas, "vit-shelf") +
    (ganhas.length ? '' : '<p class="vit-vazia">A vitrine começa vazia: a primeira conquista aparece aqui assim que sair.</p>') +
    secao("Em progresso", faltam, "vit-grid", "Toque para ver o quanto falta.");
  el.onclick = function(ev){
    const b = ev.target.closest && ev.target.closest("[data-ach]");
    if(b) abrirConquista(Number(b.dataset.ach));
  };
}

function renderMarcos(){
  const ul = document.getElementById("marcos-list");
  if(!ul) return;
  const ni = computeNivelInfo(), eng = computeStreakEngine();
  const prog = achProgressList();
  const rows = [];
  const row = (titulo, texto, ratio, sub)=>
    '<li class="marco prox"><div class="marco-top"><b>'+escapeHtml(titulo)+'</b><span>'+escapeHtml(texto)+'</span></div>'+
    '<div class="ach-bar" aria-hidden="true"><i style="width:'+Math.round(Math.max(0, Math.min(1, ratio))*100)+'%"></i></div>'+
    (sub ? '<div class="marco-sub">'+escapeHtml(sub)+'</div>' : '')+'</li>';
  // 0) você está aqui (etapa 1 do caminho)
  rows.push('<li class="marco atual" aria-current="step"><div class="marco-top"><b>Você está aqui: patente '+escapeHtml(ni.tierName)+'</b><span>nível '+(ni.tierIndex+1)+' de '+NIVEL_TIERS.length+'</span></div>'+
    '<div class="marco-sub">'+num(ni.xp)+' XP no total'+(eng.streak ? ' · sequência de '+eng.streak+(eng.streak === 1 ? ' dia' : ' dias') : '')+'.</div></li>');
  // 1) próxima patente
  if(ni.isMax){
    rows.push('<li class="marco"><div class="marco-top"><b>Patente máxima</b><span>'+escapeHtml(ni.tierName)+'</span></div><div class="marco-sub">Você chegou ao topo. Agora é manter o ritmo.</div></li>');
  } else {
    const falta = Math.max(0, ni.tierNeed - ni.xpInTier);
    rows.push(row(ni.proximaTier ? "Próxima patente: "+ni.proximaTier : "Concluir a patente "+ni.tierName, ni.xpInTier+" de "+ni.tierNeed+" XP", ni.xpInTier/ni.tierNeed,
      "Faltam "+falta+" XP, o equivalente a cerca de "+ni.treinosParaProxima+(ni.treinosParaProxima === 1 ? " treino." : " treinos.")));
  }
  // 2) próximo marco de sequência que ainda rende XP
  if(ni.proximoMarco){
    rows.push(row("Próximo marco de sequência", eng.streak+" de "+ni.proximoMarco+" dias", eng.streak/ni.proximoMarco,
      "Ao chegar lá você ganha +"+NIVEL_XP_POR_MARCO+" XP (uma vez só)."));
  } else {
    rows.push('<li class="marco"><div class="marco-top"><b>Marcos de sequência</b><span>todos alcançados</span></div></li>');
  }
  // 3) a conquista bloqueada mais perto de sair
  let melhor = null;
  ACHIEVEMENTS.forEach((a,i)=>{
    if(a.check()) return;
    const p = prog[a.nome]; if(!p) return;
    const r = p.cur / p.max;
    if(!melhor || r > melhor.r) melhor = {a:a, p:p, r:r};
  });
  if(melhor) rows.push(row("Conquista mais perto: "+melhor.a.nome, achProgTxt(melhor.p)+" "+melhor.p.un, melhor.r, melhor.a.desc));
  else rows.push('<li class="marco"><div class="marco-top"><b>Conquistas</b><span>todas desbloqueadas</span></div></li>');
  ul.innerHTML = rows.join("");
}
