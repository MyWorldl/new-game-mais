/* NG+ — calendário próprio (no lugar do seletor de data do Android/iOS).
   Opt-in: <input type="date" data-ngdate>. O <input> original continua no DOM (escondido) e é a fonte da verdade: min, max e value
   são lidos dele; ao escolher um dia o calendário grava o valor e dispara "input" e "change". Dias fora de min/max aparecem apagados e não
   podem ser escolhidos. Se o app trocar value/min/max por código, o botão se atualiza sozinho.
   Teclado: setas movem o dia, PageUp/PageDown trocam o mês, Home/End = início/fim da semana, Enter/Espaço escolhe, Esc fecha. */
(function setupNgDate(){
  const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
  const DIAS = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
  const DIAS_CURTOS = ["D","S","T","Q","Q","S","S"];
  const IC_CAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/></svg>';
  const IC_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6"/></svg>';
  const IC_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>';
  const IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const reduz = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = () => window.matchMedia && matchMedia("(max-width:767px)").matches;
  const p2 = n => (n < 10 ? "0" : "") + n;
  const iso = (a, m, d) => a + "-" + p2(m + 1) + "-" + p2(d);
  const valido = s => /^\d{4}-\d{2}-\d{2}$/.test(s || "");
  const partes = s => { const [a, m, d] = s.split("-").map(Number); return {a, m: m - 1, d}; };
  const dow = s => { const x = partes(s); return new Date(Date.UTC(x.a, x.m, x.d)).getUTCDay(); };
  const diasNoMes = (a, m) => new Date(Date.UTC(a, m + 1, 0)).getUTCDate();
  const soma = (s, n) => { const x = partes(s), t = new Date(Date.UTC(x.a, x.m, x.d + n)); return iso(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()); };
  const hojeLocal = () => { const t = new Date(); return iso(t.getFullYear(), t.getMonth(), t.getDate()); };
  const br = s => { const x = partes(s); return p2(x.d) + "/" + p2(x.m + 1) + "/" + x.a; };
  const longo = s => { const x = partes(s); return DIAS[dow(s)] + ", " + x.d + " de " + MESES[x.m] + " de " + x.a; };
  let uid = 0, aberto = null;

  function hoje(){ try{ if(typeof todayISO === "function") return todayISO(); }catch(e){} return hojeLocal(); }

  function rotuloRelativo(v){
    const h = hoje();
    if(v === h) return "Hoje";
    if(v === soma(h, -1)) return "Ontem";
    if(v === soma(h, 1)) return "Amanhã";
    return DIAS[dow(v)].replace("-feira", "");
  }

  function sincroniza(inp){
    const w = inp._ngd; if(!w) return;
    const v = inp.value;
    if(valido(v)){
      w.rel.textContent = rotuloRelativo(v);
      w.txt.textContent = br(v);
      w.btn.classList.remove("is-vazio");
    } else {
      w.rel.textContent = "Escolher dia";
      w.txt.textContent = "dd/mm/aaaa";
      w.btn.classList.add("is-vazio");
    }
    w.btn.disabled = inp.disabled;
    const rotulo = w.titulo || "Data";
    w.btn.setAttribute("aria-label", rotulo + ": " + (valido(v) ? longo(v) : "nenhum dia escolhido") + " — abrir calendário");
  }

  function melhora(inp){
    if(inp._ngd) return;
    const id = "ngd-" + (++uid);
    const wrap = document.createElement("div");
    wrap.className = "ngd";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ngd-btn"; btn.id = id + "-btn";
    btn.setAttribute("aria-haspopup", "dialog"); btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = '<span class="ngd-ic" aria-hidden="true">' + IC_CAL + '</span><span class="ngd-txt"><span class="ngd-rel"></span><span class="ngd-val"></span></span><span class="ngd-chev" aria-hidden="true">' + IC_NEXT + '</span>';
    const lab = inp.id ? document.querySelector('label[for="' + inp.id + '"]') : null;
    const titulo = inp.getAttribute("aria-label") || (lab ? lab.textContent.trim() : "") || "Data";
    inp.parentNode.insertBefore(wrap, inp);
    wrap.appendChild(btn); wrap.appendChild(inp);
    inp.classList.add("ngd-nativo"); inp.tabIndex = -1; inp.setAttribute("aria-hidden", "true");
    if(lab){ lab.addEventListener("click", e=>{ e.preventDefault(); btn.focus(); }); }
    inp._ngd = {wrap, btn, rel: btn.querySelector(".ngd-rel"), txt: btn.querySelector(".ngd-val"), titulo};
    // value gravado por código (renderHabitos faz isso) não dispara evento: o botão acompanha pelo setter
    const desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    Object.defineProperty(inp, "value", {configurable:true, enumerable:true, get(){ return desc.get.call(this); }, set(v){ desc.set.call(this, v); sincroniza(this); }});
    btn.addEventListener("click", ()=> aberto && aberto.inp === inp ? fecha() : abre(inp));
    btn.addEventListener("keydown", e=>{ if(e.key === "ArrowDown"){ e.preventDefault(); abre(inp); } });
    inp.addEventListener("change", ()=> sincroniza(inp));
    inp.addEventListener("input", ()=> sincroniza(inp));
    new MutationObserver(()=> sincroniza(inp)).observe(inp, {attributes:true, attributeFilter:["disabled","min","max","value"]});
    sincroniza(inp);
  }

  function limites(inp){ return {min: valido(inp.min) ? inp.min : "", max: valido(inp.max) ? inp.max : ""}; }
  function foraDosLimites(s, l){ return (l.min && s < l.min) || (l.max && s > l.max); }

  function abre(inp){
    if(aberto) fecha(true);
    const w = inp._ngd; if(!w || w.btn.disabled) return;
    const l = limites(inp);
    let base = valido(inp.value) ? inp.value : (l.max && hoje() > l.max ? l.max : (l.min && hoje() < l.min ? l.min : hoje()));
    const b = partes(base);
    const root = document.createElement("div");
    root.id = "ngdl" + (++uid);
    root.className = "ngs-layer ngd-layer" + (celular() ? " is-sheet" : " is-pop");
    root.innerHTML =
      '<div class="ngs-scrim" data-ngd-fecha></div>' +
      '<div class="ngs-panel ngd-panel" role="dialog" aria-modal="true" aria-label="' + esc("Calendário — " + w.titulo) + '">' +
        '<div class="ngs-grab" aria-hidden="true"></div>' +
        '<div class="ngs-head"><span class="ngs-title">' + esc(w.titulo) + '</span><button type="button" class="ngs-x" data-ngd-fecha aria-label="Fechar calendário">' + IC_X + '</button></div>' +
        '<div class="ngd-nav"><button type="button" class="ngd-seta" data-ngd-mes="-1" aria-label="Mês anterior">' + IC_PREV + '</button><div class="ngd-mes" aria-live="polite"></div><button type="button" class="ngd-seta" data-ngd-mes="1" aria-label="Próximo mês">' + IC_NEXT + '</button></div>' +
        '<div class="ngd-sem" aria-hidden="true">' + DIAS_CURTOS.map(d=> '<span>' + d + '</span>').join("") + '</div>' +
        '<div class="ngd-grade" role="grid" aria-label="Dias do mês"></div>' +
        '<div class="ngd-rodape"></div>' +
      '</div>';
    document.body.appendChild(root);
    const panel = root.querySelector(".ngs-panel");
    const est = {inp, btn:w.btn, root, panel, ano:b.a, mes:b.m, foco:base, l, t:null};
    aberto = est;
    desenha(est);
    w.btn.setAttribute("aria-expanded", "true");
    posiciona(est);
    requestAnimationFrame(()=>{ root.classList.add("in"); });
    foca(est);
    root.addEventListener("click", e=>{
      if(e.target.closest("[data-ngd-fecha]")){ fecha(); return; }
      const m = e.target.closest("[data-ngd-mes]"); if(m){ trocaMes(est, +m.dataset.ngdMes); return; }
      const d = e.target.closest(".ngd-dia"); if(d && !d.disabled){ escolhe(est, d.dataset.d); return; }
      const a = e.target.closest("[data-ngd-ir]"); if(a && !a.disabled){ escolhe(est, a.dataset.ngdIr); }
    });
    root.addEventListener("keydown", e=> teclado(e, est));
    est.onResize = ()=> posiciona(est);
    addEventListener("resize", est.onResize, {passive:true});
    est.onScroll = ()=>{ if(!celular()) posiciona(est); };
    addEventListener("scroll", est.onScroll, {passive:true});
  }

  function desenha(est){
    const {ano, mes, l, inp} = est;
    const sel = inp.value, h = hoje();
    const primeiro = iso(ano, mes, 1), vazios = dow(primeiro), total = diasNoMes(ano, mes);
    if(!valido(est.foco) || partes(est.foco).a !== ano || partes(est.foco).m !== mes){
      const alvo = valido(sel) && partes(sel).a === ano && partes(sel).m === mes ? sel : (h.slice(0, 7) === primeiro.slice(0, 7) ? h : primeiro);
      est.foco = alvo;
    }
    // o dia focado precisa ser escolhível; senão, o primeiro escolhível do mês
    if(foraDosLimites(est.foco, l)){
      for(let d = 1; d <= total; d++){ const s = iso(ano, mes, d); if(!foraDosLimites(s, l)){ est.foco = s; break; } }
    }
    let html = "";
    for(let i = 0; i < vazios; i++) html += '<span class="ngd-vazio" role="gridcell" aria-hidden="true"></span>';
    for(let d = 1; d <= total; d++){
      const s = iso(ano, mes, d), off = foraDosLimites(s, l);
      html += '<button type="button" class="ngd-dia' + (s === h ? " hoje" : "") + (s === sel ? " sel" : "") + '" role="gridcell" data-d="' + s + '"' +
        (off ? ' disabled' : '') + ' tabindex="' + (s === est.foco ? 0 : -1) + '" aria-label="' + esc(longo(s)) + (s === h ? " (hoje)" : "") + '"' + (s === sel ? ' aria-selected="true"' : '') + '>' + d + '</button>';
    }
    est.panel.querySelector(".ngd-grade").innerHTML = html;
    est.panel.querySelector(".ngd-mes").textContent = MESES[mes][0].toUpperCase() + MESES[mes].slice(1) + " " + ano;
    const ant = est.panel.querySelector('[data-ngd-mes="-1"]'), prox = est.panel.querySelector('[data-ngd-mes="1"]');
    ant.disabled = !!(l.min && iso(ano, mes, 1) <= l.min);
    prox.disabled = !!(l.max && iso(ano, mes, total) >= l.max);
    // atalhos: só para o que a janela permite
    const atalhos = [["Hoje", h], ["Ontem", soma(h, -1)]].filter(x=> !foraDosLimites(x[1], l));
    est.panel.querySelector(".ngd-rodape").innerHTML = atalhos.length
      ? atalhos.map(x=> '<button type="button" class="ngd-atalho" data-ngd-ir="' + x[1] + '"' + (x[1] === sel ? ' aria-pressed="true"' : '') + '>' + x[0] + '</button>').join("")
      : "";
    est.panel.querySelector(".ngd-rodape").hidden = !atalhos.length;
  }

  function foca(est){
    const el = est.panel.querySelector('.ngd-dia[tabindex="0"]');
    if(el) el.focus({preventScroll:true});
  }

  function trocaMes(est, n){
    let m = est.mes + n, a = est.ano;
    while(m < 0){ m += 12; a--; }
    while(m > 11){ m -= 12; a++; }
    est.mes = m; est.ano = a;
    const alvo = Math.min(partes(est.foco).d, diasNoMes(a, m));
    est.foco = iso(a, m, alvo);
    desenha(est);
    if(!document.activeElement || !est.panel.contains(document.activeElement) || document.activeElement.disabled || !document.activeElement.isConnected) foca(est);
  }

  function moveFoco(est, n){
    const s = soma(est.foco, n);
    if(foraDosLimites(s, est.l)) return;   // não anda além da janela permitida
    const x = partes(s);
    est.foco = s; est.ano = x.a; est.mes = x.m;
    desenha(est); foca(est);
  }

  function teclado(e, est){
    const k = e.key;
    if(k === "Escape"){ e.preventDefault(); e.stopPropagation(); fecha(); return; }
    const noDia = document.activeElement && document.activeElement.classList.contains("ngd-dia");
    if(noDia){
      if(k === "ArrowLeft"){ e.preventDefault(); moveFoco(est, -1); return; }
      if(k === "ArrowRight"){ e.preventDefault(); moveFoco(est, 1); return; }
      if(k === "ArrowUp"){ e.preventDefault(); moveFoco(est, -7); return; }
      if(k === "ArrowDown"){ e.preventDefault(); moveFoco(est, 7); return; }
      if(k === "Home"){ e.preventDefault(); moveFoco(est, -dow(est.foco)); return; }
      if(k === "End"){ e.preventDefault(); moveFoco(est, 6 - dow(est.foco)); return; }
      if(k === "PageUp"){ e.preventDefault(); trocaMes(est, e.shiftKey ? -12 : -1); foca(est); return; }
      if(k === "PageDown"){ e.preventDefault(); trocaMes(est, e.shiftKey ? 12 : 1); foca(est); return; }
    }
    if(k === "Tab"){
      const f = [...est.root.querySelectorAll("button,[tabindex='0']")].filter(x=> !x.disabled && x.getClientRects().length && x.tabIndex >= 0);
      if(!f.length) return;
      const i = f.indexOf(document.activeElement);
      if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
      else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
    }
  }

  function escolhe(est, valor){
    const inp = est.inp;
    const mudou = inp.value !== valor;
    inp.value = valor;
    fecha();
    sincroniza(inp);
    if(mudou){
      inp.dispatchEvent(new Event("input", {bubbles:true}));
      inp.dispatchEvent(new Event("change", {bubbles:true}));
    }
  }

  function posiciona(est){
    const panel = est.panel;
    if(celular()){ panel.style.cssText = ""; est.root.classList.add("is-sheet"); est.root.classList.remove("is-pop"); return; }
    est.root.classList.add("is-pop"); est.root.classList.remove("is-sheet");
    const r = est.btn.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const larg = Math.min(Math.max(r.width, 320), vw - 24);
    const esq = Math.min(Math.max(12, r.left), vw - larg - 12);
    const abaixo = vh - r.bottom - 12, acima = r.top - 12;
    const embaixo = abaixo >= 420 || abaixo >= acima;
    const altMax = Math.max(300, Math.min(520, (embaixo ? abaixo : acima) - 8));
    panel.style.cssText = "left:" + Math.round(esq) + "px;width:" + Math.round(larg) + "px;max-height:" + Math.round(altMax) + "px;" +
      (embaixo ? "top:" + Math.round(r.bottom + 8) + "px;" : "bottom:" + Math.round(vh - r.top + 8) + "px;");
    est.root.classList.toggle("sobe", !embaixo);
  }

  function fecha(rapido){
    const est = aberto; if(!est) return;
    aberto = null;
    removeEventListener("resize", est.onResize); removeEventListener("scroll", est.onScroll);
    est.btn.setAttribute("aria-expanded", "false");
    const tira = ()=>{ est.root.remove(); };
    est.root.classList.remove("in");
    if(rapido || reduz()) tira(); else setTimeout(tira, 220);
    if(!rapido) try{ est.btn.focus({preventScroll:true}); }catch(e){}
  }

  document.addEventListener("keydown", e=>{ if(e.key === "Escape" && aberto){ e.preventDefault(); fecha(); } }, true);
  window.ngDateSync = sincroniza;
  window.ngDateAbre = abre;
  window.ngDateFecha = fecha;
  document.querySelectorAll("input[data-ngdate]").forEach(melhora);
  new MutationObserver(ms=>{
    ms.forEach(m=> m.addedNodes.forEach(n=>{
      if(n.nodeType !== 1) return;
      if(n.matches && n.matches("input[data-ngdate]")) melhora(n);
      if(n.querySelectorAll) n.querySelectorAll("input[data-ngdate]").forEach(melhora);
    }));
  }).observe(document.body, {childList:true, subtree:true});
})();
