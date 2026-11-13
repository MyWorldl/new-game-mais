/* Página de instalação do NG+ (instalar.html): detecta o aparelho, mostra o passo a passo certo, usa a janela oficial de instalação
 * quando o navegador oferece (beforeinstallprompt) e deixa copiar/compartilhar o link. Sem dependências; compatível com a CSP do site. */
(function(){
  "use strict";
  var $ = function(id){ return document.getElementById(id); };
  var adiado = null;
  var ua = navigator.userAgent || "";
  var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
  var android = /Android/i.test(ua);
  var embutido = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|; wv\)|WhatsApp|Snapchat|TikTok/i.test(ua);
  var safari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua) && !embutido;

  function jaInstalado(){
    try { if (window.navigator.standalone === true) return true; } catch(e){}
    try { return ["standalone", "fullscreen", "minimal-ui"].some(function(m){ return window.matchMedia("(display-mode: " + m + ")").matches; }); } catch(e){ return false; }
  }

  var abas = Array.prototype.slice.call(document.querySelectorAll(".seg [role=tab]"));
  function escolhe(k, foco){
    abas.forEach(function(b){
      var on = b.getAttribute("data-p") === k;
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      var p = $(b.getAttribute("aria-controls")); if (p) p.hidden = !on;
      if (on && foco) b.focus();
    });
  }
  abas.forEach(function(b, i){
    b.addEventListener("click", function(){ escolhe(b.getAttribute("data-p")); });
    b.addEventListener("keydown", function(e){
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
      e.preventDefault(); escolhe(abas[(i + d + abas.length) % abas.length].getAttribute("data-p"), true);
    });
  });
  escolhe(ios ? "ios" : android ? "android" : "pc");
  if (ios && !safari) $("ios-aviso").hidden = false;

  function pinta(){
    var st = $("ins-status"), ag = $("ins-agora");
    if (jaInstalado()) {
      st.hidden = false; ag.hidden = true;
      st.innerHTML = "<strong>Pronto:</strong> o NG+ já está instalado e aberto como app neste aparelho. Para instalar em outro celular, abra esta página lá.";
      return;
    }
    st.hidden = true; ag.hidden = !adiado;
  }
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); adiado = e; pinta(); });
  window.addEventListener("appinstalled", function(){
    adiado = null; var st = $("ins-status"); st.hidden = false; $("ins-agora").hidden = true;
    st.innerHTML = "<strong>Instalando…</strong> em instantes o ícone do NG+ aparece na tela inicial.";
  });
  $("ins-btn").addEventListener("click", async function(){
    if (!adiado) return;
    var ev = adiado; adiado = null; this.disabled = true;
    try {
      await ev.prompt(); var r = await ev.userChoice;
      if (!(r && r.outcome === "accepted")) { $("ins-copiado").textContent = "Tudo bem, fica para depois. É só tocar de novo quando quiser."; }
    } catch(e){ $("ins-copiado").textContent = "Não consegui abrir a janela de instalação. Use o passo a passo acima."; }
    this.disabled = false; pinta();
  });

  var url = location.origin + location.pathname;
  $("ins-url").value = url;
  $("ins-url").addEventListener("focus", function(){ this.select(); });
  var msg = $("ins-copiado");
  $("ins-copiar").addEventListener("click", async function(){
    try { await navigator.clipboard.writeText(url); msg.textContent = "Link copiado."; }
    catch(e){ var i = $("ins-url"); i.focus(); i.select(); msg.textContent = "Selecionei o link: use Copiar do seu aparelho."; }
  });
  if (navigator.share) {
    var bs = $("ins-compartilhar"); bs.hidden = false;
    bs.addEventListener("click", function(){ navigator.share({ title: "NG+ (New Game+)", text: "Instale o NG+ no celular:", url: url }).catch(function(){}); });
  }
  if ("serviceWorker" in navigator) { try { navigator.serviceWorker.register("sw.js").catch(function(){}); } catch(e){} }
  pinta();
})();
