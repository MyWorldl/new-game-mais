/* NG+ — seletor próprio (lista de opções com a cara do app).
   Troca a lista padrão do Android/iOS por um painel do app: no celular sobe como "folha" de baixo; no computador abre ao lado do botão.
   Opt-in: <select data-ngselect>. O <select> original continua no DOM (escondido) e é a fonte da verdade: o painel só lê as
   <option>/<optgroup> dele, grava o valor nele e dispara "change". Se o app trocar as opções, o botão se atualiza sozinho.
   Opções aceitam data-meta (texto pequeno à direita, ex.: última carga). Teclado: setas, Home/End, Enter, Esc, digitar para buscar. */
(function setupNgSelect(){
  const IC_CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const IC_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const IC_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const norm = t => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const reduz = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const celular = () => window.matchMedia && matchMedia("(max-width:767px)").matches;
  let uid = 0, aberto = null;   // aberto = {sel, btn, root, ...}

  function lerOpcoes(sel){
    const out = [];   // {tipo:"grupo",rotulo} | {tipo:"op",valor,rotulo,meta,desabilitada}
    [...sel.children].forEach(n=>{
      if(n.tagName === "OPTGROUP"){
        out.push({tipo:"grupo", rotulo:n.label});
        [...n.children].forEach(o=> out.push(op(o)));
      } else if(n.tagName === "OPTION") out.push(op(n));
    });
    return out;
    function op(o){ return {tipo:"op", valor:o.value, rotulo:o.textContent.trim(), meta:o.dataset.meta || "", desabilitada:o.disabled}; }
  }

  function sincroniza(sel){
    const w = sel._ngs; if(!w) return;
    const o = sel.selectedOptions && sel.selectedOptions[0];
    const txt = o ? o.textContent.trim() : (sel.dataset.placeholder || "Selecionar");
    if(!w.txt){ w.txt = document.createTextNode(""); w.val.appendChild(w.txt); }
    if(w.txt.nodeValue !== txt) w.txt.nodeValue = txt;   // só o texto muda (nenhum nó novo)
    w.btn.disabled = sel.disabled || !sel.options.length;
    w.btn.classList.toggle("is-vazio", !o || !o.value);
  }

  function melhora(sel){
    if(sel._ngs) return;
    const id = "ngs-" + (++uid);
    const wrap = document.createElement("div");
    wrap.className = "ngs";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = "ngs-btn"; btn.id = id + "-btn";
    btn.setAttribute("aria-haspopup", "listbox"); btn.setAttribute("aria-expanded", "false");
    const rotulo = sel.getAttribute("aria-label") || "";
    if(rotulo) btn.setAttribute("aria-label", rotulo + " — escolher");
    btn.innerHTML = '<span class="ngs-val"></span><span class="ngs-chev" aria-hidden="true">' + IC_CHEV + '</span>';
    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(btn); wrap.appendChild(sel);
    sel.classList.add("ngs-nativo"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
    sel._ngs = {wrap, btn, val:btn.querySelector(".ngs-val"), titulo: rotulo};
    btn.addEventListener("click", ()=> aberto && aberto.sel === sel ? fecha() : abre(sel));
    btn.addEventListener("keydown", e=>{ if(e.key === "ArrowDown" || e.key === "ArrowUp"){ e.preventDefault(); abre(sel); } });
    sel.addEventListener("change", ()=> sincroniza(sel));
    new MutationObserver(()=> sincroniza(sel)).observe(sel, {childList:true, subtree:true, attributes:true, attributeFilter:["disabled","selected"]});
    sincroniza(sel);
  }

  function abre(sel){
    if(aberto) fecha(true);
    const w = sel._ngs; if(!w || w.btn.disabled) return;
    const ops = lerOpcoes(sel), nOps = ops.filter(x=> x.tipo === "op").length;
    const comBusca = nOps > 7;
    const root = document.createElement("div");
    root.id = "ngsl" + (++uid);
    root.className = "ngs-layer" + (celular() ? " is-sheet" : " is-pop");
    root.innerHTML =
      '<div class="ngs-scrim" data-ngs-fecha></div>' +
      '<div class="ngs-panel" role="dialog" aria-modal="true" aria-label="' + esc(w.titulo || "Escolher opção") + '">' +
        '<div class="ngs-grab" aria-hidden="true"></div>' +
        '<div class="ngs-head"><span class="ngs-title">' + esc(w.titulo || "Escolher") + '</span>' +
          '<button type="button" class="ngs-x" data-ngs-fecha aria-label="Fechar">' + IC_X + '</button></div>' +
        (comBusca ? '<div class="ngs-busca"><input type="search" class="ngs-q" placeholder="Buscar…" aria-label="Buscar na lista" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search"></div>' : '') +
        '<div class="ngs-lista" role="listbox" tabindex="-1" aria-label="' + esc(w.titulo || "Opções") + '"></div>' +
      '</div>';
    document.body.appendChild(root);
    const lista = root.querySelector(".ngs-lista"), q = root.querySelector(".ngs-q"), panel = root.querySelector(".ngs-panel");
    const estado = {sel, btn:w.btn, root, lista, q, ops, ativo:-1, digitado:"", t:null};
    aberto = estado;
    desenha(estado, "");
    w.btn.setAttribute("aria-expanded", "true");
    posiciona(estado, panel);
    requestAnimationFrame(()=>{ root.classList.add("in"); });
    const atual = lista.querySelector('[aria-selected="true"]') || lista.querySelector(".ngs-op:not([aria-disabled])");
    if(atual) marca(estado, atual, true);
    if(q && !celular()) q.focus({preventScroll:true}); else lista.focus({preventScroll:true});

    root.addEventListener("click", e=>{
      if(e.target.closest("[data-ngs-fecha]")){ fecha(); return; }
      const o = e.target.closest(".ngs-op"); if(o && !o.hasAttribute("aria-disabled")) escolhe(estado, o.dataset.v);
    });
    root.addEventListener("keydown", e=> teclado(e, estado));
    if(q) q.addEventListener("input", ()=> desenha(estado, q.value));
    estado.onResize = ()=> posiciona(estado, panel);
    addEventListener("resize", estado.onResize, {passive:true});
    estado.onScroll = ()=>{ if(!celular()) posiciona(estado, panel); };
    addEventListener("scroll", estado.onScroll, {passive:true});
  }

  function desenha(est, termo){
    const t = norm(termo).trim();
    const valorAtual = est.sel.value;
    let html = "", grupoPendente = null, achou = 0, marcado = false;
    est.ops.forEach(x=>{
      if(x.tipo === "grupo"){ grupoPendente = x.rotulo; return; }
      if(t && !norm(x.rotulo + " " + (x.meta || "") + " " + (grupoPendente || "")).includes(t)) return;
      if(grupoPendente){ html += '<div class="ngs-grupo" role="presentation">' + esc(grupoPendente) + '</div>'; grupoPendente = null; }
      const sel = !marcado && x.valor === valorAtual; if(sel) marcado = true;
      html += '<div class="ngs-op" role="option" id="' + est.root.id + 'o' + (achou++) + '" data-v="' + esc(x.valor) + '" aria-selected="' + sel + '"' + (x.desabilitada ? ' aria-disabled="true"' : '') + '>' +
        '<span class="ngs-op-t">' + esc(x.rotulo) + '</span>' + (x.meta ? '<span class="ngs-op-m">' + esc(x.meta) + '</span>' : '') +
        '<span class="ngs-ok" aria-hidden="true">' + IC_CHECK + '</span></div>';
    });
    est.lista.innerHTML = html || '<div class="ngs-vazio">Nada encontrado' + (termo ? ' para “' + esc(termo) + '”' : '') + '.</div>';
    est.ativo = -1;
    const prim = est.lista.querySelector('[aria-selected="true"]') || est.lista.querySelector(".ngs-op:not([aria-disabled])");
    if(prim && t) marca(est, prim, false);
  }

  function marca(est, el, rola){
    est.lista.querySelectorAll(".ngs-op.ativo").forEach(x=> x.classList.remove("ativo"));
    el.classList.add("ativo");
    est.lista.setAttribute("aria-activedescendant", el.id);
    if(est.q) est.q.setAttribute("aria-activedescendant", el.id);
    if(rola) el.scrollIntoView({block:"nearest"});
    else el.scrollIntoView({block:"nearest"});
  }

  function mover(est, passo, extremo){
    const ops = [...est.lista.querySelectorAll(".ngs-op:not([aria-disabled])")]; if(!ops.length) return;
    const i = ops.findIndex(x=> x.classList.contains("ativo"));
    let n = extremo === "ini" ? 0 : extremo === "fim" ? ops.length - 1 : Math.min(ops.length - 1, Math.max(0, (i < 0 ? (passo > 0 ? -1 : ops.length) : i) + passo));
    marca(est, ops[n], true);
  }

  function teclado(e, est){
    if(e.key === "Escape"){ e.preventDefault(); e.stopPropagation(); fecha(); return; }
    if(e.key === "ArrowDown"){ e.preventDefault(); mover(est, 1); return; }
    if(e.key === "ArrowUp"){ e.preventDefault(); mover(est, -1); return; }
    if(e.key === "Home" && !(est.q && e.target === est.q)){ e.preventDefault(); mover(est, 0, "ini"); return; }
    if(e.key === "End" && !(est.q && e.target === est.q)){ e.preventDefault(); mover(est, 0, "fim"); return; }
    if(e.key === "Enter"){
      const a = est.lista.querySelector(".ngs-op.ativo");
      if(a){ e.preventDefault(); escolhe(est, a.dataset.v); }
      return;
    }
    if(e.key === "Tab"){   // mantém o foco dentro do painel
      const f = [...est.root.querySelectorAll("input,button,[tabindex='-1'].ngs-lista")].filter(x=> !x.disabled && x.getClientRects().length);
      if(!f.length) return;
      const i = f.indexOf(document.activeElement);
      if(e.shiftKey && i <= 0){ e.preventDefault(); f[f.length - 1].focus(); }
      else if(!e.shiftKey && i === f.length - 1){ e.preventDefault(); f[0].focus(); }
      return;
    }
    if(!est.q && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey){   // digitar para pular (sem caixa de busca)
      clearTimeout(est.t); est.digitado += norm(e.key); est.t = setTimeout(()=>{ est.digitado = ""; }, 700);
      const alvo = [...est.lista.querySelectorAll(".ngs-op:not([aria-disabled])")].find(x=> norm(x.querySelector(".ngs-op-t").textContent).startsWith(est.digitado));
      if(alvo) marca(est, alvo, true);
    }
  }

  function escolhe(est, valor){
    const sel = est.sel;
    const mudou = sel.value !== valor;
    sel.value = valor;
    fecha();
    sincroniza(sel);
    if(mudou) sel.dispatchEvent(new Event("change", {bubbles:true}));
  }

  function posiciona(est, panel){
    if(celular()){ panel.style.cssText = ""; est.root.classList.add("is-sheet"); est.root.classList.remove("is-pop"); return; }
    est.root.classList.add("is-pop"); est.root.classList.remove("is-sheet");
    const r = est.btn.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
    const larg = Math.min(Math.max(r.width, 300), vw - 24);
    let esq = Math.min(Math.max(12, r.left), vw - larg - 12);
    const abaixo = vh - r.bottom - 12, acima = r.top - 12;
    const embaixo = abaixo >= 260 || abaixo >= acima;
    const altMax = Math.max(180, Math.min(420, (embaixo ? abaixo : acima) - 8));
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
  window.ngSelectSync = sincroniza;
  window.ngSelectAbre = abre;
  window.ngSelectFecha = fecha;
  document.querySelectorAll("select[data-ngselect]").forEach(melhora);
  // selects criados depois (ex.: o cartão do Cardápio é montado sob demanda)
  new MutationObserver(ms=> ms.forEach(m=> m.addedNodes.forEach(n=>{
    if(n.nodeType !== 1) return;
    if(n.matches && n.matches("select[data-ngselect]")) melhora(n);
    if(n.querySelectorAll) n.querySelectorAll("select[data-ngselect]").forEach(melhora);
  }))).observe(document.body, {childList:true, subtree:true});
})();
