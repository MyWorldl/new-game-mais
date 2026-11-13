/* ng-nuvem.js — NG+ (Etapa B): conta (login) + sincronização com o Supabase.
 *
 * Como funciona (analogia): o aparelho continua sendo a "mesa de trabalho" — tudo é gravado primeiro aqui
 * (bff-runtime.js, IndexedDB), por isso o app abre e grava mesmo sem internet. Este arquivo é o "carteiro":
 * leva o que mudou para a nuvem (tabela user_docs + bucket de fotos) e traz o que mudou em outros aparelhos.
 *
 * Regras:
 *  - Só funciona fora do Claude (dentro do artifact existe window.claude e nada daqui roda).
 *  - Login obrigatório: e-mail → link ou código de 6 dígitos (Supabase Auth). Sem cadastro público (só convidados).
 *  - Cada conta tem o seu banco local (bff-<id>); o banco antigo "bff" (de antes do login) é oferecido uma vez para envio.
 *  - Conflito: a última gravação vence. O que está no aparelho e ainda não foi enviado nunca é sobrescrito pela nuvem.
 *  - Só a chave pública (publishable) está aqui. A segurança real é a RLS do banco (cada pessoa só enxerga o que é seu).
 */
(function(){
  "use strict";
  if (window.claude) return;
  var SB = window.supabase;
  if (!SB || !SB.createClient) return;   // biblioteca não carregou: o app segue só local, como na Etapa A

  var API = "https://gjoxrgnkwmjvcfiywtcs.supabase.co";
  var KEY = "sb_publishable_vIVq8zRxpaB1FrWGi4U18w_2W3WmAq2";
  var REF = "gjoxrgnkwmjvcfiywtcs";
  var BUCKET = "fotos-progresso";
  var TS_KEY = "0x4AAAAAAF9sIQ9t2NQabaoT";   // chave PÚBLICA do Cloudflare Turnstile (a secreta fica só no painel do Supabase)

  // chave de teste: só em localhost, para a bateria automática do app (não existe em produção)
  try { if (location.hostname === "localhost" && localStorage.getItem("ng_dev_semnuvem") === "1") return; } catch(e){}

  var client = SB.createClient(API, KEY, {
    auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce"}
  });

  var I = null, uid = null, email = null;
  var fluxo = false, falhou = false, retry = 0, tRetry = null, pulling = null, canal = null;
  var recentes = null, ultimoPull = 0, ultimoOk = null, estadoAtual = {k: "loading", n: 0}, logado = false;
  var resetando = false;   // true durante "Resetar meus dados": pausa envio e busca para nada ressuscitar o que está sendo apagado

  /* ---------------- util ---------------- */
  function $(id){ return document.getElementById(id); }
  function esc(t){ return String(t).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function igual(a, b){ try { return JSON.stringify(a) === JSON.stringify(b); } catch(e){ return false; } }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  var K_ESPERA = "ng_otp_espera", ESPERA_SEG = 60;   // o Supabase só manda outro e-mail ao mesmo endereço depois de 60 s
  function esperaDoErro(e){   // segundos que o servidor pediu para esperar (0 se o erro não for de limite)
    var m = String((e && (e.message || e.error_description)) || ""), st = e && (e.status || e.code);
    if (!(st === 429 || /rate limit|security purposes|too many/i.test(m))) return 0;
    var x = /(\d+)\s*seconds?/i.exec(m), n = x ? +x[1] : ESPERA_SEG;
    return Math.min(Math.max(n, 5), 300);
  }
  function msgErro(e, contexto){
    var m = String((e && (e.message || e.error_description)) || e || "").toLowerCase(), st = e && (e.status || e.code);
    if (/failed to fetch|network|load failed|fetch/.test(m) || navigator.onLine === false) return "Sem conexão com a internet. Confira a rede e tente de novo.";
    if (/signups? not allowed|not allowed for otp|user not found/.test(m)) return "Este e-mail ainda não foi liberado no NG+. Toque em \u201cPedir acesso\u201d logo abaixo para solicitar.";
    if (/not authorized|email address not/.test(m)) return "O envio de e-mails ainda não está liberado para este endereço. Fale com quem administra o app.";
    if (/captcha/.test(m)) return "A verificação de segurança não passou. Aguarde o selo \u201cConcluído\u201d aparecer e tente de novo. Se não carregar, desative bloqueadores de anúncio para este site ou troque de rede.";
    if (st === 429 || /rate limit|too many|seconds|security purposes/.test(m)) { var sg = esperaDoErro(e); return sg ? "Muitos pedidos seguidos. Espere " + sg + " segundos e tente de novo." : "Muitos pedidos seguidos. Espere cerca de um minuto e tente de novo."; }
    if (contexto === "codigo" && /expired|invalid|token/.test(m)) return "Código inválido ou vencido. Confira os números ou peça um novo e-mail.";
    if (/invalid.*email|unable to validate email/.test(m)) return "Esse e-mail não parece válido. Confira e tente de novo.";
    return contexto === "codigo" ? "Não consegui validar o código agora. Tente de novo." : "Não consegui enviar o e-mail agora. Tente de novo em instantes.";
  }

  /* ---------------- verificação "não sou robô" (Cloudflare Turnstile) ----------------
     Analogia: o porteiro do prédio. Quase todo mundo passa sem nem perceber; só quem parece robô recebe um desafio.
     O widget entrega um "crachá" (token) de uso único, que seguimos para o Supabase junto com o pedido do e-mail.
     Se o porteiro não carregar (bloqueador de anúncios, rede restrita), ainda tentamos enviar: o Supabase decide. */
  var tsPromessa = null;
  function carregaTurnstile(){
    if (tsPromessa) return tsPromessa;
    tsPromessa = new Promise(function(resolve){
      if (window.turnstile) { resolve(window.turnstile); return; }
      var sc = document.createElement("script"), fim = setTimeout(function(){ resolve(null); }, 12000);
      sc.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"; sc.async = true;
      sc.onload = function(){ clearTimeout(fim); resolve(window.turnstile || null); };
      sc.onerror = function(){ clearTimeout(fim); resolve(null); };
      document.head.appendChild(sc);
    });
    return tsPromessa;
  }

  /* ---------------- sessão e tela de login ---------------- */
  async function lerSessao(){
    try {
      var r = await client.auth.getSession();
      if (r && r.data && r.data.session) return {uid: r.data.session.user.id, email: r.data.session.user.email || ""};
    } catch(e){}
    // sem internet e com token vencido: o app ainda abre com os dados guardados no aparelho
    try {
      var raw = localStorage.getItem("sb-" + REF + "-auth-token");
      var j = raw && JSON.parse(raw);
      if (j && j.user && j.user.id) return {uid: j.user.id, email: j.user.email || "", offline: true};
    } catch(e){}
    return null;
  }

  function injetaCss(){
    // O CSS mora em ng-nuvem.css (ligado no <head> pelo build). Sem <style> criado por script: compatível com CSP sem 'unsafe-inline'.
    if ($("ng-nuvem-css")) return;
    var l = document.createElement("link"); l.rel = "stylesheet"; l.id = "ng-nuvem-css"; l.href = "ng-nuvem.css";
    (document.head || document.documentElement).appendChild(l);
  }
  function quandoDom(fn){ if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn, {once: true}); }
  function travaApp(on){ var a = document.querySelector(".app"); if (a) { if (on) a.setAttribute("inert", ""); else a.removeAttribute("inert"); } }

  /* ---------------- "Pedir e-mail e código de novo" depois de um tempo fora do app ----------------
     Analogia: o cofre da academia que tranca sozinho se você sai e demora. Config → Conta escolhe o tempo (por aparelho).
     O app marca "visto pela última vez" a cada 30 s enquanto está aberto e ao sair; ao voltar, se passou do limite, a sessão
     DESTE aparelho é encerrada (os dados locais ficam, e voltam quando a mesma conta entra de novo). Sem internet não há como
     receber o código: a tela de entrada avisa. Lembretes por notificação continuam, pois são enviados pelo servidor. */
  var K_REL = "ng_relogin_min", K_ATIV = "ng_atividade", K_MOTIVO = "ng_motivo_relogin";
  function lerReloginMin(){ try { var n = parseInt(localStorage.getItem(K_REL) || "0", 10); return n > 0 ? n : 0; } catch(e){ return 0; } }
  function marcaAtividade(){ try { localStorage.setItem(K_ATIV, String(Date.now())); } catch(e){} }
  function expirou(){
    var lim = lerReloginMin(); if (!lim) return false;
    try { var u = parseInt(localStorage.getItem(K_ATIV) || "0", 10); return u > 0 && Date.now() - u > lim * 60000; } catch(e){ return false; }
  }
  async function encerraSessaoLocal(mail){
    try { localStorage.setItem(K_MOTIVO, mail || ""); } catch(e){}
    try { await client.auth.signOut({scope: "local"}); } catch(e){}
    try { localStorage.removeItem("sb-" + REF + "-auth-token"); } catch(e){}
  }

  var sessaoP = null;
  function sessao(){
    if (sessaoP) return sessaoP;
    sessaoP = (async function(){
      var s = await lerSessao();
      if (s && expirou()) { await encerraSessaoLocal(s.email); s = null; }
      if (!s) s = await pedirLogin();
      marcaAtividade();
      uid = s.uid; email = s.email; logado = true;
      return s;
    })();
    return sessaoP;
  }

  function pedirLogin(){
    return new Promise(function(resolve){
      var enviadoPara = null, espAtiva = false, tCool = null, concluido = false;
      quandoDom(function(){
        injetaCss(); travaApp(true);
        var el = document.createElement("div");
        el.className = "ng-login"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "true"); el.setAttribute("aria-labelledby", "ng-login-t");
        el.innerHTML =
          '<div class="ng-login-box">' +
            '<div class="ng-login-mark" aria-hidden="true">NG+</div>' +
            '<h1 id="ng-login-t">Entrar no NG+</h1>' +
            '<p id="ng-login-p">Digite o e-mail liberado para você. Vamos enviar um link e um código de acesso — não precisa de senha.</p>' +
            '<form id="ng-login-f" novalidate>' +
              '<div><label for="ng-login-e">E-mail</label><input id="ng-login-e" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>' +
              '<div id="ng-login-ts"></div>' +
              '<div id="ng-login-cod" hidden><label for="ng-login-c">Código do e-mail</label><input id="ng-login-c" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]*" aria-describedby="ng-login-m"></div>' +
              '<button class="ng-btn" type="submit" id="ng-login-ok">Enviar link e código</button>' +
              '<button class="ng-btn ghost" type="button" id="ng-login-reenv" hidden>Reenviar e-mail</button>' +
              '<div class="ng-espera" id="ng-espera" role="progressbar" aria-label="Tempo de espera para pedir outro código" aria-valuemin="0" aria-valuemax="60" aria-valuenow="0" hidden><div class="ng-espera-trilho" aria-hidden="true"><span id="ng-espera-fill"></span></div><span id="ng-espera-txt"></span></div>' +
              '<button class="ng-btn ghost" type="button" id="ng-login-outro" hidden>Usar outro e-mail</button>' +
            '</form>' +
            '<form id="ng-pedir-f" novalidate hidden>' +
              '<div><label for="ng-ped-n">Seu nome</label><input id="ng-ped-n" type="text" autocomplete="name" maxlength="80" required></div>' +
              '<div><label for="ng-ped-e">E-mail</label><input id="ng-ped-e" type="email" inputmode="email" autocomplete="email" autocapitalize="none" spellcheck="false" required></div>' +
              '<div><label for="ng-ped-d">Data de nascimento</label><input id="ng-ped-d" type="date" autocomplete="bday" min="1900-01-01" required></div>' +
              '<div id="ng-ped-resp" hidden>' +
                '<p class="ng-peq">Você tem menos de 18 anos. Precisamos do e-mail de um responsável.</p>' +
                '<div><label for="ng-ped-r">E-mail do responsável</label><input id="ng-ped-r" type="email" inputmode="email" autocapitalize="none" spellcheck="false"></div>' +
                '<label class="ng-chk"><input type="checkbox" id="ng-ped-ar"><span>Meu responsável sabe e concorda que eu use o NG+.</span></label>' +
              '</div>' +
              '<div class="ng-isca" aria-hidden="true"><label for="ng-ped-site">Deixe em branco</label><input id="ng-ped-site" type="text" tabindex="-1" autocomplete="off"></div>' +
              '<div id="ng-ped-ts"></div>' +
              '<label class="ng-chk"><input type="checkbox" id="ng-ped-a"><span>Li e concordo com o uso dos meus dados descrito na política de privacidade.</span></label>' +
              '<button type="button" class="ng-link" id="ng-ped-pol">Ler a política de privacidade</button>' +
              '<button class="ng-btn" type="submit" id="ng-ped-ok">Pedir acesso</button>' +
              '<button class="ng-btn ghost" type="button" id="ng-ped-voltar">Voltar para entrar</button>' +
            '</form>' +
            '<div id="ng-ped-fim" hidden><button class="ng-btn" type="button" id="ng-ped-fim-voltar">Voltar para entrar</button></div>' +
            '<p class="ng-login-m" id="ng-login-m" role="status" aria-live="polite"></p>' +
            '<p class="ng-peq ng-pedir-aviso" id="ng-pedir-aviso">Ainda não tem acesso? <button type="button" class="ng-link" id="ng-login-pedir">Pedir acesso</button></p>' +
            '<p class="ng-peq" style="font-size:13px">Ao entrar, você concorda com o uso dos seus dados descrito na <button type="button" class="ng-link" id="ng-login-pol">política de privacidade</button>.</p>' +
          '</div>';
        document.body.appendChild(el);
        var f = $("ng-login-f"), inE = $("ng-login-e"), inC = $("ng-login-c"), box = $("ng-login-cod"), ok = $("ng-login-ok"),
            reenv = $("ng-login-reenv"), outro = $("ng-login-outro"), m = $("ng-login-m"), p = $("ng-login-p");
        $("ng-login-pol").addEventListener("click", abrirPolitica);
        var motivo = null; try { motivo = localStorage.getItem(K_MOTIVO); localStorage.removeItem(K_MOTIVO); } catch(e){}
        if (motivo !== null) {
          if (motivo) inE.value = motivo;
          p.textContent = "Por segurança, pedimos o login de novo depois de um tempo fora do app. Vamos enviar um novo código para o seu e-mail." + (navigator.onLine === false ? " Você está sem internet: conecte-se para entrar." : "");
        }
        function msg(t, erro){ m.textContent = t || ""; m.className = "ng-login-m" + (erro ? " err" : ""); }
        function trava(b){ ocupado = b; ok.disabled = b || (!enviadoPara && espAtiva); reenv.disabled = b || espAtiva; }
        var tsId = null, tsToken = null, tsFalhou = false, tsPedeToque = false;
        var AVISO_CAIXA = "Marque a caixa \u201cConfirme que é humano\u201d acima e toque em enviar de novo.";
        carregaTurnstile().then(function(T){
          if (!T) { tsFalhou = true; return; }
          try {
            tsId = T.render("#ng-login-ts", {
              sitekey: TS_KEY, theme: "auto", size: "flexible", language: "pt-br",
              "before-interactive-callback": function(){ tsPedeToque = true; if (!enviadoPara) msg("Marque a caixa \u201cConfirme que é humano\u201d para continuar."); },
              callback: function(t){ tsToken = t; tsPedeToque = false; if (m.textContent.indexOf("Marque a caixa") === 0) msg(""); },
              "expired-callback": function(){ tsToken = null; try { T.reset(tsId); } catch(e){} },
              "error-callback": function(){ tsToken = null; tsFalhou = true; return true; }
            });
          } catch(e){ tsFalhou = true; }
        });
        function tsNovo(){   // o crachá vale uma vez só: pede outro para a próxima tentativa
          tsToken = null; tsPedeToque = false;
          try { if (window.turnstile && tsId !== null) { tsFalhou = false; window.turnstile.reset(tsId); } } catch(e){}
        }
        /* ---- Espera entre pedidos de código. Analogia: a senha do caixa: a barra mostra quanto falta e o botão só libera quando ela
           enche, assim ninguém fica apertando várias vezes (o servidor recusaria e a espera não encurtaria). O prazo fica salvo
           por e-mail no aparelho, então recarregar a página não zera a espera. ---- */
        var espBox = $("ng-espera"), espFill = $("ng-espera-fill"), espTxt = $("ng-espera-txt"), ocupado = false;
        function espLer(e){ try { var o = JSON.parse(localStorage.getItem(K_ESPERA) || "null"); if (o && o.e === e && o.ate > Date.now()) return o; } catch(x){} return null; }
        function espIniciar(e, seg){ try { localStorage.setItem(K_ESPERA, JSON.stringify({e: e, ate: Date.now() + seg * 1000, total: seg})); } catch(x){} espAtualiza(); }
        function espAtualiza(){
          clearInterval(tCool);
          var e = enviadoPara || inE.value.trim().toLowerCase(), o = e ? espLer(e) : null, antes = espAtiva;
          espAtiva = !!o; espBox.hidden = !o;
          ok.disabled = ocupado || (!enviadoPara && espAtiva);
          reenv.disabled = ocupado || espAtiva;
          if (!o) { if (antes && enviadoPara && !ocupado) msg("Pronto: se o e-mail não chegou, você já pode pedir outro código."); return; }
          var rest = o.ate - Date.now(), seg = Math.max(1, Math.ceil(rest / 1000));
          espFill.style.width = Math.max(0, Math.min(100, 100 - 100 * rest / (o.total * 1000))) + "%";
          espTxt.textContent = "Aguarde " + seg + " s para pedir outro código";
          espBox.setAttribute("aria-valuemax", String(o.total)); espBox.setAttribute("aria-valuenow", String(Math.round((o.total * 1000 - rest) / 1000)));
          tCool = setInterval(espAtualiza, 250);
        }
        /* ---- Pedir acesso: quem ainda não foi liberado preenche o formulário e o Gabriel aprova em Configurações ---- */
        var fPed = $("ng-pedir-f"), h1 = $("ng-login-t"), pedirBtn = $("ng-login-pedir"), pedirAviso = $("ng-pedir-aviso"), fim = $("ng-ped-fim");
        var pedN = $("ng-ped-n"), pedE = $("ng-ped-e"), pedD = $("ng-ped-d"), pedR = $("ng-ped-r"), pedResp = $("ng-ped-resp"), pedA = $("ng-ped-a"), pedAR = $("ng-ped-ar"), pedOk = $("ng-ped-ok");
        var pTxtEntrar = null, pedTsId = null, pedTsToken = null, pedTsFalhou = false, pedTsToque = false, pedEnviando = false;
        var P_PEDIR = "Preencha os dados abaixo. A pessoa que administra o NG+ recebe o pedido e libera o seu acesso.";
        function hoje(){ var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
        pedD.max = hoje();
        function idadeDeData(v){
          var mm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ""); if (!mm) return null;
          var a = +mm[1], me = +mm[2], di = +mm[3], t = new Date();
          var dt = new Date(a, me - 1, di); if (dt.getFullYear() !== a || dt.getMonth() !== me - 1 || dt.getDate() !== di) return null;
          var idade = t.getFullYear() - a; if (t.getMonth() + 1 < me || (t.getMonth() + 1 === me && t.getDate() < di)) idade--;
          return idade < 0 ? null : idade;
        }
        function vista(k){
          var ped = k === "pedir", ent = k === "entrar", f = k === "fim";
          if (ped && pTxtEntrar === null) pTxtEntrar = p.textContent;
          $("ng-login-f").hidden = !ent; fPed.hidden = !ped; fim.hidden = !f;
          pedirAviso.hidden = !ent || !!enviadoPara;
          h1.textContent = ped ? "Pedir acesso ao NG+" : f ? "Pedido enviado" : "Entrar no NG+";
          if (ent && pTxtEntrar !== null) { p.textContent = pTxtEntrar; pTxtEntrar = null; }
          if (ped) p.textContent = P_PEDIR;
          msg("");
          if (ped) { if (!pedN.value && inE.value && !pedE.value) pedE.value = inE.value; carregaTsPedido(); pedN.focus(); }
          if (f) $("ng-ped-fim-voltar").focus();
          if (ent && !enviadoPara) inE.focus();
        }
        function carregaTsPedido(){
          if (pedTsId !== null || pedTsFalhou) return;
          carregaTurnstile().then(function(T){
            if (!T) { pedTsFalhou = true; return; }
            try {
              pedTsId = T.render("#ng-ped-ts", {
                sitekey: TS_KEY, theme: "auto", size: "flexible", language: "pt-br",
                "before-interactive-callback": function(){ pedTsToque = true; msg("Marque a caixa \u201cConfirme que é humano\u201d para continuar."); },
                callback: function(t){ pedTsToken = t; pedTsToque = false; if (m.textContent.indexOf("Marque a caixa") === 0) msg(""); },
                "expired-callback": function(){ pedTsToken = null; try { T.reset(pedTsId); } catch(e){} },
                "error-callback": function(){ pedTsToken = null; pedTsFalhou = true; return true; }
              });
            } catch(e){ pedTsFalhou = true; }
          });
        }
        function pedTsNovo(){ pedTsToken = null; pedTsToque = false; try { if (window.turnstile && pedTsId !== null) { pedTsFalhou = false; window.turnstile.reset(pedTsId); } } catch(e){} }
        function pedAtualizaMenor(){
          var id = idadeDeData(pedD.value); var menor = id !== null && id < 18;
          pedResp.hidden = !menor;
          if (id !== null && id < 13) msg("O NG+ é para quem tem 13 anos ou mais.", true); else if (m.textContent.indexOf("13 anos") >= 0) msg("");
        }
        pedD.addEventListener("input", pedAtualizaMenor); pedD.addEventListener("change", pedAtualizaMenor);
        pedirBtn.addEventListener("click", function(){ vista("pedir"); });
        $("ng-ped-voltar").addEventListener("click", function(){ vista("entrar"); });
        $("ng-ped-fim-voltar").addEventListener("click", function(){ vista("entrar"); });
        $("ng-ped-pol").addEventListener("click", abrirPolitica);
        var ERROS_PED = {
          idade_minima: "O NG+ é para quem tem 13 anos ou mais.",
          aceite_obrigatorio: "Marque que leu e concorda com a política de privacidade.",
          responsavel_obrigatorio: "Digite o e-mail de um responsável (diferente do seu).",
          aceite_responsavel_obrigatorio: "Marque que o responsável sabe e concorda.",
          muitos_pedidos: "Há muitos pedidos agora. Tente de novo mais tarde.",
          captcha: "A verificação de segurança não passou. Aguarde o selo \u201cConcluído\u201d e tente de novo.",
          captcha_indisponivel: "Não consegui conferir a verificação de segurança agora. Tente de novo em instantes.",
          dados_invalidos: "Confira os dados preenchidos e tente de novo."
        };
        async function pedirAcesso(){
          if (pedEnviando) return;
          var nome = pedN.value.replace(/\s+/g, " ").trim(), e = pedE.value.trim().toLowerCase(), nasc = pedD.value, id = idadeDeData(nasc);
          var r = pedR.value.trim().toLowerCase(), menor = id !== null && id < 18;
          if (nome.length < 2) { msg("Digite o seu nome.", true); pedN.focus(); return; }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { msg("Digite um e-mail válido.", true); pedE.focus(); return; }
          if (id === null) { msg("Informe a sua data de nascimento.", true); pedD.focus(); return; }
          if (id < 13) { msg("O NG+ é para quem tem 13 anos ou mais.", true); pedD.focus(); return; }
          if (menor) {
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r) || r === e) { msg("Digite o e-mail de um responsável (diferente do seu).", true); pedR.focus(); return; }
            if (!pedAR.checked) { msg("Marque que o responsável sabe e concorda.", true); pedAR.focus(); return; }
          }
          if (!pedA.checked) { msg("Marque que leu e concorda com a política de privacidade.", true); pedA.focus(); return; }
          if (navigator.onLine === false) { msg("Sem internet. Conecte-se para pedir acesso.", true); return; }
          if (!pedTsToken && !pedTsFalhou && pedTsToque) { msg(AVISO_CAIXA, true); return; }
          pedEnviando = true; pedOk.disabled = true;
          if (!pedTsToken && !pedTsFalhou) {
            msg("Conferindo a verificação de segurança…");
            for (var k = 0; k < 40 && !pedTsToken && !pedTsFalhou; k++) await sleep(250);
            if (!pedTsToken && !pedTsFalhou) { msg(pedTsToque ? AVISO_CAIXA : "A verificação de segurança ainda não terminou. Aguarde um instante e toque de novo.", true); pedEnviando = false; pedOk.disabled = false; return; }
          }
          msg("Enviando…");
          try {
            var corpo = {nome: nome, email: e, nascimento: nasc, aceite: true, site: $("ng-ped-site").value};
            if (menor) { corpo.email_responsavel = r; corpo.aceite_responsavel = true; }
            if (pedTsToken) corpo.captcha = pedTsToken;
            var resp = await fetch(API + "/functions/v1/pedir-acesso", {method: "POST", headers: {"Content-Type": "application/json", "apikey": KEY}, body: JSON.stringify(corpo)});
            var j = null; try { j = await resp.json(); } catch(x){}
            pedTsNovo();
            if (!resp.ok || !j || !j.ok) { msg((j && ERROS_PED[j.error]) || (resp.status === 429 ? ERROS_PED.muitos_pedidos : "Não consegui enviar o pedido agora. Tente de novo em instantes."), true); }
            else if (j.estado === "ja_tem_conta" || j.estado === "aprovado_auto") {
              inE.value = e; vista("entrar");
              msg(j.estado === "ja_tem_conta" ? "Este e-mail já tem acesso. Toque em \u201cEnviar link e código\u201d para entrar." : "Seu acesso foi liberado. Toque em \u201cEnviar link e código\u201d para entrar.");
            } else {
              vista("fim"); p.textContent = "Recebemos o seu pedido para " + e + ". Quando for aprovado, volte aqui e entre com este e-mail (você também pode receber um e-mail de convite). Se demorar, fale com quem administra o app.";
              [pedN, pedE, pedD, pedR].forEach(function(x){ x.value = ""; }); pedA.checked = false; pedAR.checked = false; pedResp.hidden = true;
            }
          } catch(err){ pedTsNovo(); msg(msgErro(err, "email"), true); }
          pedEnviando = false; pedOk.disabled = false;
        }
        fPed.addEventListener("submit", function(ev){ ev.preventDefault(); pedirAcesso(); });

        function finaliza(s){
          if (concluido) return; concluido = true; clearInterval(tCool);
          try { el.remove(); } catch(e){} travaApp(false);
          resolve({uid: s.user.id, email: s.user.email || enviadoPara || ""});
        }
        async function enviar(){
          var e = inE.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { msg("Digite um e-mail válido.", true); inE.focus(); return; }
          if (navigator.onLine === false) { msg("Sem internet. Conecte-se para entrar pela primeira vez neste aparelho.", true); return; }
          if (!tsToken && !tsFalhou && tsPedeToque) { msg(AVISO_CAIXA, true); return; }   // o widget pediu um toque: não adianta esperar
          if (!tsToken && !tsFalhou) {   // widget carregou mas ainda está conferindo: espera um pouco
            trava(true); msg("Conferindo a verificação de segurança…");
            for (var k = 0; k < 40 && !tsToken && !tsFalhou; k++) await sleep(250);
            if (!tsToken && !tsFalhou) { msg(tsPedeToque ? AVISO_CAIXA : "A verificação de segurança ainda não terminou. Aguarde um instante e toque de novo.", true); trava(false); return; }
          }
          trava(true); msg("Enviando…");
          try {
            var opts = {shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname};
            if (tsToken) opts.captchaToken = tsToken;
            var r = await client.auth.signInWithOtp({email: e, options: opts});
            tsNovo();
            if (r.error) throw r.error;
            enviadoPara = e; espIniciar(e, ESPERA_SEG);
            inE.readOnly = true; box.hidden = false; reenv.hidden = false; outro.hidden = false; ok.textContent = "Entrar com o código"; pedirAviso.hidden = true;
            p.textContent = "Enviamos um e-mail para " + e + ". Toque no link que veio nele ou digite aqui o código de números.";
            msg("E-mail enviado. Confira também a caixa de spam."); inC.focus();
          } catch(err){
            tsNovo(); var sg = esperaDoErro(err);
            if (sg) { espIniciar(e, sg); msg("O último e-mail acabou de sair. Espere a barra encher para pedir outro código; o código que já chegou continua valendo."); }
            else msg(msgErro(err, "email"), true);
          }
          trava(false);
        }
        f.addEventListener("submit", async function(ev){
          ev.preventDefault();
          if (!enviadoPara) { enviar(); return; }
          var c = inC.value.replace(/\s+/g, "");
          if (c.length < 6) { msg("Digite o código completo (6 números).", true); inC.focus(); return; }
          trava(true); msg("Conferindo…");
          try {
            var r = await client.auth.verifyOtp({email: enviadoPara, token: c, type: "email"});
            if (r.error) throw r.error;
            if (r.data && r.data.session) finaliza(r.data.session);
          } catch(err){ msg(msgErro(err, "codigo"), true); inC.select(); }
          trava(false);
        });
        reenv.addEventListener("click", function(){ if (!espAtiva) enviar(); });
        outro.addEventListener("click", function(){
          enviadoPara = null; inE.readOnly = false; inE.value = ""; inC.value = ""; box.hidden = true; reenv.hidden = true; outro.hidden = true;
          ok.textContent = "Enviar link e código"; espAtualiza(); msg(""); p.textContent = "Digite o e-mail liberado para você. Vamos enviar um link e um código de acesso — não precisa de senha."; pedirAviso.hidden = false; inE.focus();
        });
        // login pelo link do e-mail (mesmo navegador) ou por outra aba
        client.auth.onAuthStateChange(function(ev, s){ if (s && (ev === "SIGNED_IN" || ev === "INITIAL_SESSION")) finaliza(s); });
        client.auth.getSession().then(function(r){ if (r && r.data && r.data.session) finaliza(r.data.session); }).catch(function(){});
        inE.addEventListener("input", espAtualiza); espAtualiza();
        inE.focus();
      });
    });
  }

  /* ---------------- estado (usado pelo indicador "Salvo" e pela tela Config) ---------------- */
  function estado(){ return estadoAtual; }
  async function atualizaEstado(){
    var n = 0;
    try { n = I ? (await I.filaListar()).length : 0; } catch(e){}
    var k = navigator.onLine === false ? "offline" : (fluxo || pulling) ? "syncing" : n > 0 ? (falhou ? "erro" : "pending") : "saved";
    estadoAtual = {k: k, n: n, ultimoOk: ultimoOk};
    try { window.dispatchEvent(new Event("ng-sync")); } catch(e){}
    var el = $("cfg-conta-info"); if (el) pintaConta();
  }

  /* ---------------- envio (app → nuvem) ---------------- */
  function agendaRetry(){
    clearTimeout(tRetry);
    var ms = Math.min(60000, 2000 * Math.pow(2, retry)); retry++;
    tRetry = setTimeout(function(){ flush(); }, ms);
  }
  async function enviarLote(op, lote){
    if (op === "set") {
      var rows = [];
      lote.forEach(function(f){ var d = I.docLocal(f.path); if (d !== undefined) rows.push({user_id: uid, path: f.path, data: d}); });
      if (!rows.length) return;
      var r = await client.from("user_docs").upsert(rows, {onConflict: "user_id,path"});
      if (r.error) {
        if (r.error.code === "23514" && rows.length > 1) {   // algum item fora do formato: isola e descarta só ele
          for (var i = 0; i < rows.length; i++) {
            var r1 = await client.from("user_docs").upsert(rows[i], {onConflict: "user_id,path"});
            if (r1.error && r1.error.code !== "23514") throw r1.error;
            if (r1.error) try { console.warn("NG+: documento recusado pela nuvem", rows[i].path); } catch(e){}
          }
        } else if (r.error.code === "23514") { try { console.warn("NG+: documento recusado pela nuvem", rows[0].path); } catch(e){} }
        else throw r.error;
      }
    } else if (op === "del") {
      var r2 = await client.from("user_docs").delete().eq("user_id", uid).in("path", lote.map(function(f){ return f.path; }));
      if (r2.error) throw r2.error;
    } else if (op === "bset") {
      for (var j = 0; j < lote.length; j++) {
        var id = lote[j].path.slice(5), blob = await I.blobGet(id);
        if (!blob) continue;
        var r3 = await client.storage.from(BUCKET).upload(uid + "/" + id, blob, {contentType: blob.type || "image/jpeg", upsert: true});
        if (r3.error) { var sc = String(r3.error.statusCode || r3.error.status || ""); if (sc === "413" || sc === "415") continue; throw r3.error; }
      }
    } else if (op === "bdel") {
      var r4 = await client.storage.from(BUCKET).remove(lote.map(function(f){ return uid + "/" + f.path.slice(5); }));
      if (r4.error) throw r4.error;
    }
  }
  async function flush(){
    if (resetando || fluxo || !I || !logado || navigator.onLine === false) { atualizaEstado(); return; }
    fluxo = true; atualizaEstado();
    try {
      for (;;) {
        var fila = await I.filaListar(); if (!fila.length) break;
        fila.sort(function(a, b){ return a.t - b.t; });
        var op = fila[0].op, lote = [];
        for (var i = 0; i < fila.length && lote.length < 50 && fila[i].op === op; i++) lote.push(fila[i]);
        await enviarLote(op, lote);
        for (var k = 0; k < lote.length; k++) { await I.filaRemover(lote[k].path, lote[k].t); if (recentes) recentes.add(lote[k].path); }
      }
      retry = 0; falhou = false; ultimoOk = Date.now(); clearTimeout(tRetry);
    } catch(e){ falhou = true; try { console.warn("NG+: envio pendente", e && e.message); } catch(x){} agendaRetry(); }
    finally { fluxo = false; atualizaEstado(); }
  }

  /* ---------------- busca (nuvem → app) ---------------- */
  async function baixarFotos(){
    var ids = [];
    I.paths().forEach(function(p){ if (p.indexOf("fotos/") === 0) { var d = I.docLocal(p); if (d && /^[0-9a-f]{32}$/.test(d.assetId || "") && !I.blobTem(d.assetId)) ids.push(d.assetId); } });
    for (var i = 0; i < ids.length; i++) {
      try { var r = await client.storage.from(BUCKET).download(uid + "/" + ids[i]); if (r.data) await I.blobPutRemoto(ids[i], r.data); } catch(e){}
    }
  }
  async function pull(){
    if (resetando) return;
    if (pulling) return pulling;
    pulling = (async function(){
      recentes = new Set();
      try {
        /* Paginação robusta: avança pelo que o servidor DEVOLVEU (e não por um tamanho fixo) e só para numa página vazia.
           Se o limite de linhas por requisição do projeto for menor que o pedido, nada é cortado — um corte aqui faria o
           app achar que o resto "foi apagado em outro aparelho". */
        var rows = [], from = 0, passo = 1000, vistos = {}, voltas = 0;
        for (;;) {
          var r = await client.from("user_docs").select("path,data").order("path").range(from, from + passo - 1);
          if (r.error) throw r.error;
          var pg = r.data || [];
          if (!pg.length) break;
          pg.forEach(function(x){ if (!vistos[x.path]) { vistos[x.path] = 1; rows.push(x); } });
          from += pg.length;
          if (++voltas > 200) throw new Error("paginação excedeu o limite de segurança");
        }
        var primeira = !(await I.metaGet("sync1"));
        var nuvem = {};
        for (var i = 0; i < rows.length; i++) {
          var row = rows[i]; nuvem[row.path] = 1;
          if (recentes.has(row.path)) continue;
          if (!igual(I.docLocal(row.path), row.data)) await I.aplicarRemoto(row.path, row.data);
        }
        var pend = {}; (await I.filaListar()).forEach(function(f){ pend[f.path] = 1; });
        var locais = I.paths();
        for (var j = 0; j < locais.length; j++) {
          var p = locais[j];
          if (nuvem[p] || pend[p] || recentes.has(p)) continue;
          if (primeira) await I.filaPut(p, "set");            // 1ª sincronização deste aparelho: o que só existe aqui sobe
          else await I.aplicarRemoto(p, undefined);           // já sincronizou antes e sumiu da nuvem: foi apagado em outro aparelho
        }
        if (primeira) {   // fotos locais que ainda não estão na nuvem
          try {
            var tem = {}, off = 0;
            for (var vz = 0; vz < 200; vz++) {   // lista TODAS as fotos da nuvem, 100 por vez (o teto do Storage por página)
              var lst = await client.storage.from(BUCKET).list(uid, {limit: 100, offset: off, sortBy: {column: "name", order: "asc"}});
              if (lst.error) throw lst.error;
              var pgf = lst.data || [];
              if (!pgf.length) break;
              pgf.forEach(function(o){ tem[o.name] = 1; });
              off += pgf.length;
            }
            var ids = await I.blobIds();
            for (var b = 0; b < ids.length; b++) if (!tem[ids[b]]) await I.filaPut("blob:" + ids[b], "bset");
          } catch(e){}
        }
        await I.metaSet("sync1", Date.now());
        ultimoPull = Date.now();
        await baixarFotos();
      } finally { recentes = null; }
    })();
    try { await pulling; } finally { pulling = null; atualizaEstado(); }
    flush();
  }

  function ligaRealtime(){
    if (canal) return;
    canal = client.channel("ng-docs-" + uid)
      .on("postgres_changes", {event: "*", schema: "public", table: "user_docs", filter: "user_id=eq." + uid}, async function(ev){
        try {
          if (ev.eventType === "DELETE") {
            var o = ev.old || {};
            if (o.user_id && o.user_id !== uid) return;   // DELETE não é filtrável no Realtime: ignora o que não é seu
            if (o.path) await I.aplicarRemoto(o.path, undefined);
          } else if (ev.new && ev.new.path) {
            if (ev.new.user_id && ev.new.user_id !== uid) return;
            if (!igual(I.docLocal(ev.new.path), ev.new.data)) await I.aplicarRemoto(ev.new.path, ev.new.data);
            if (ev.new.path.indexOf("fotos/") === 0) baixarFotos();
          }
        } catch(e){}
      })
      .subscribe(function(status){ if (status === "SUBSCRIBED") pull().catch(function(){ falhou = true; atualizaEstado(); }); });
  }
  function sincronizar(){
    return pull().catch(function(){ falhou = true; atualizaEstado(); });
  }

  /* ---------------- chamado pelo adaptador local ---------------- */
  var tMudou = null;
  function mudou(){
    clearTimeout(tMudou);
    atualizaEstado();
    tMudou = setTimeout(function(){ flush(); }, 600);   // junta várias gravações seguidas num envio só
  }

  function dialogo(html, cls, rotulo){
    return new Promise(function(resolve){
      injetaCss();
      var d = document.createElement("div"); d.className = "ng-dlg" + (cls && cls.indexOf("top") >= 0 ? " top" : "");
      d.innerHTML = '<div class="ng-dlg-box' + (cls && cls.indexOf("longo") >= 0 ? ' longo' : '') + '" role="dialog" aria-modal="true" aria-label="' + (rotulo || (cls && cls.indexOf("longo") >= 0 ? 'Política de privacidade' : 'Aviso')) + '">' + html + '</div>';
      document.body.appendChild(d);
      d.addEventListener("click", function(ev){ var b = ev.target.closest("[data-r]"); if (b) { var chk = d.querySelector("input[type=checkbox]"); var v = b.getAttribute("data-r"); var chks = Array.prototype.map.call(d.querySelectorAll("input[type=checkbox]"), function(c){ return !!c.checked; }); d.remove(); resolve({r: v, chk: !!(chk && chk.checked), chks: chks}); } });
      var primeiro = d.querySelector("button"); if (primeiro) primeiro.focus();
    });
  }

  async function preparar(api){
    I = api;
    // 1) dados de antes do login neste aparelho (banco "bff"): oferece enviar para esta conta, uma vez por aparelho
    var feito = false; try { feito = !!localStorage.getItem("ng-legado-ok"); } catch(e){}
    if (!(await I.metaGet("sync1")) && !feito) {
      var leg = await I.lerLegado();
      if (leg && leg.docs && leg.docs.length) {
        var fotos = leg.blobs ? leg.blobs.length : 0;
        var esc1 = await new Promise(function(res){ quandoDom(function(){ dialogo(
          '<h2>Encontrei dados neste aparelho</h2><p>Este aparelho já tem ' + leg.docs.length + ' registros do NG+' + (fotos ? ' e ' + fotos + ' foto' + (fotos > 1 ? 's' : '') : '') + ' guardados antes do login. Quer enviar tudo para a conta <b>' + esc(email || "") + '</b>?</p><div class="ng-dlg-act"><button class="ng-btn" data-r="enviar">Enviar para a minha conta</button><button class="ng-btn ghost" data-r="vazio">Começar vazio</button></div>').then(function(x){ res(x.r); }); }); });
        if (esc1 === "enviar") await I.importarLegado(leg);
      }
      try { localStorage.setItem("ng-legado-ok", uid); } catch(e){}
    }
    // 2) 1ª vez nesta conta/aparelho: espera a nuvem (até 12 s) para não abrir o cadastro inicial por engano em aparelho novo
    if (!(await I.metaGet("sync1")) && navigator.onLine !== false) {
      try { await Promise.race([pull(), sleep(12000)]); } catch(e){}
    }
    // 3) segundo plano: tempo real, retomada ao voltar a internet / à aba
    ligaRealtime();
    window.addEventListener("online", function(){ atualizaEstado(); flush(); sincronizar(); });
    window.addEventListener("offline", atualizaEstado);
    document.addEventListener("visibilitychange", function(){
      if (document.visibilityState === "visible") {
        if (expirou()) { travaDeNovo(); return; }
        marcaAtividade(); flush(); if (Date.now() - ultimoPull > 20000) sincronizar();
      } else marcaAtividade();
    });
    window.addEventListener("pagehide", marcaAtividade);
    setInterval(function(){ if (document.visibilityState === "visible") marcaAtividade(); }, 30000);
    atualizaEstado(); flush();
    quandoDom(ligaConfig);
  }

  /* ---------------- tela Config: conta e sincronização ---------------- */
  function hora(t){ try { return new Date(t).toLocaleTimeString("pt-BR", {hour: "2-digit", minute: "2-digit"}); } catch(e){ return ""; } }
  function pintaConta(){
    var el = $("cfg-conta-info"); if (!el) return;
    var e = estadoAtual, t = {
      saved: "Tudo sincronizado" + (ultimoOk ? " (última vez às " + hora(ultimoOk) + ")" : ""),
      syncing: "Sincronizando…", pending: e.n + (e.n === 1 ? " alteração aguardando envio" : " alterações aguardando envio"),
      erro: e.n + (e.n === 1 ? " alteração não foi enviada ainda" : " alterações não foram enviadas ainda") + " — vamos tentar de novo sozinhos",
      offline: "Sem internet" + (e.n ? " — " + e.n + (e.n === 1 ? " alteração será enviada" : " alterações serão enviadas") + " ao reconectar" : ""), loading: "Conectando…"
    }[e.k] || "";
    el.innerHTML = 'Conectado como <b>' + esc(email || "") + '</b>.<br>' + esc(t) + '. Seus dados ficam também neste aparelho, por isso o app funciona sem internet.';
  }

  /* ---------------- LGPD: política de privacidade e exclusão da conta ---------------- */
  var CONTATO_PRIVACIDADE = "sombrasplays@gmail.com";   // responsável pelo app: troque aqui se quiser outro contato
  function politicaHtml(){
    return '<h2>Política de privacidade do NG+</h2>' +
      '<p class="ng-peq">Atualizada em 6 de novembro de 2026. Escrita em linguagem simples, com base na Lei Geral de Proteção de Dados (LGPD, Lei 13.709/2018).</p>' +
      '<h3>Quem cuida dos seus dados</h3><p>O NG+ é um projeto pessoal mantido por Gabriel, que é o responsável (controlador) pelos dados do app. Contato para qualquer pedido sobre seus dados: <b>' + esc(CONTATO_PRIVACIDADE) + '</b>.</p>' +
      '<h3>Quais dados ficam no app</h3><ul>' +
        '<li>Seu e-mail, usado só para entrar na conta.</li>' +
        '<li>O que você registra: perfil (nome, idade, sexo, altura, objetivo, experiência), treinos e cargas, dieta, medidas corporais, peso, conquistas e preferências.</li>' +
        '<li>Fotos de progresso, se você adicionar.</li>' +
        '<li>Foto de perfil, se você adicionar: ela é reduzida no seu aparelho (256 px) e guardada só na sua conta; você troca ou remove quando quiser, em Editar perfil.</li>' +
        '<li><b>Se você ativar os lembretes:</b> o endereço de notificação do seu navegador (um código técnico), o horário que escolheu e o seu fuso horário.</li>' +
        '<li><b>Se você ativar o resumo por IA:</b> um resumo dos seus números de treino, enviado só quando você pedir (veja a seção própria abaixo).</li></ul>' +
      '<p>Medidas, peso e fotos do corpo são dados pessoais sensíveis (dados de saúde). Por isso, só os tratamos com o seu consentimento, que você dá ao entrar e usar o app.</p>' +
      '<h3>Pedido de acesso</h3><p>Se você pede acesso pela tela de entrada, guardamos o seu nome, e-mail e data de nascimento (e, se você tem menos de 18 anos, o e-mail do responsável) só para quem administra o app decidir o pedido. Pedidos já decididos são apagados em até 30 dias e pedidos sem resposta em até 90 dias. Se você excluir a conta, o pedido dela também é apagado.</p>' +
      '<h3>Para que usamos</h3><p>Só para o app funcionar: guardar seu histórico, sincronizar entre os seus aparelhos e, se você ativar, avisar a hora do treino. Não vendemos dados, não mostramos anúncios, não fazemos perfis comerciais e não enviamos seus dados para ferramentas de IA, a menos que você mesmo ative, de forma opcional, o resumo do treinador por IA (seção abaixo).</p>' +
      '<h3>Onde ficam guardados</h3><ul>' +
        '<li>No seu aparelho (para o app funcionar sem internet).</li>' +
        '<li>Na nuvem da Supabase (banco de dados e login), em servidores no Brasil (São Paulo). Cada conta só enxerga os próprios dados e as fotos ficam em área privada.</li>' +
        '<li>A hospedagem do site é da Cloudflare, e o e-mail com o código de login é enviado pelo Gmail (Google). Essas empresas atuam como operadoras: só executam o serviço.</li>' +
        '<li>Os lembretes passam pelo serviço de notificações do seu navegador (Google no Chrome e no Android, Apple no iPhone, Mozilla no Firefox), que só entrega a mensagem ao aparelho. O conteúdo do aviso viaja criptografado.</li>' +
        '<li>As fontes de letra do app ficam dentro do próprio app: nenhum pedido ao Google ou a outros sites é feito para carregá-las.</li></ul>' +
      '<h3>Resumo do treinador por IA (opcional)</h3>' +
        '<p>É um recurso desligado por padrão. Só funciona se você ler o aviso, tocar em <b>Concordo e ativar</b> e depois tocar em <b>Gerar resumo</b>. Nada é enviado antes disso.</p><ul>' +
        '<li><b>O que é enviado:</b> nomes dos exercícios, cargas, repetições, RPE, volume semanal, sequência de dias, nível de experiência e objetivo. <b>Não é enviado:</b> nome, e-mail, idade, peso, medidas nem fotos.</li>' +
        '<li><b>Quem recebe:</b> a Anthropic (operadora do Claude), nos Estados Unidos, por meio da API comercial. Segundo a política da empresa, os dados enviados pela API são apagados em até 30 dias e não são usados para treinar modelos por padrão; podem ser retidos por mais tempo em caso de violação de uso ou exigência legal.</li>' +
        '<li><b>Limites:</b> só para maiores de 18 anos (verificado no servidor), no máximo 5 resumos por dia. O texto é gerado por IA, pode errar e não substitui profissional de saúde.</li>' +
        '<li><b>Base legal e como retirar:</b> seu consentimento (LGPD, art. 7º, I). Para retirar, use <b>Treino → Resumo do treinador → Desativar IA</b> ou exclua a conta. O registro do consentimento (versão e data) fica na sua conta e é apagado com ela.</li></ul>' +
      '<h3>Por quanto tempo</h3><p>Enquanto sua conta existir. Se você excluir a conta, os dados na nuvem são apagados na hora. Os lembretes são apagados quando você os desliga, sai da conta ou exclui a conta.</p>' +
      '<h3>Menores de 18 anos</h3><p>Se você tem menos de 18 anos, use o app com o conhecimento e o consentimento de um responsável: no pedido de acesso pedimos o e-mail dele e a sua confirmação de que ele sabe e concorda. Essa confirmação é uma declaração, não uma verificação de idade. O app não oferece metas agressivas de dieta para menores, e o resumo por IA não é oferecido a menores de 18 anos.</p>' +
      '<h3>Seus direitos (art. 18 da LGPD)</h3><ul>' +
        '<li><b>Acessar e levar seus dados:</b> Config → Seus dados → Exportar dados (.json).</li>' +
        '<li><b>Corrigir:</b> edite os registros direto no app.</li>' +
        '<li><b>Apagar só os registros e manter a conta:</b> Config → Conta → Resetar meus dados.</li>' +
        '<li><b>Excluir a conta e retirar o consentimento:</b> Config → Conta → Excluir minha conta e dados.</li>' +
        '<li><b>Saber com quem compartilhamos e tirar dúvidas:</b> escreva para ' + esc(CONTATO_PRIVACIDADE) + '.</li></ul>' +
      '<h3>Segurança</h3><p>A conexão é protegida (HTTPS), o acesso ao banco é restrito por conta e não há senha para vazar: o login é por e-mail com código. Nenhum sistema é 100% seguro; se houver um incidente que afete você, avisaremos.</p>' +
      '<h3>Saúde</h3><p>O NG+ organiza seu treino e sua alimentação, mas não é aconselhamento médico nem substitui profissional de saúde.</p>' +
      '<h3>Mudanças</h3><p>Se esta política mudar de forma relevante, avisamos no app e atualizamos a data acima.</p>' +
      '<div class="ng-dlg-act"><button class="ng-btn" data-r="fecha">Fechar</button></div>';
  }
  function abrirPolitica(){ return dialogo(politicaHtml(), "longo top"); }

  function dialogoOcupado(txt){
    injetaCss();
    var d = document.createElement("div"); d.className = "ng-dlg top";
    d.innerHTML = '<div class="ng-dlg-box" role="alertdialog" aria-live="assertive" aria-label="Aguarde"><h2>' + esc(txt) + '</h2><p>Não feche esta tela.</p></div>';
    document.body.appendChild(d); return d;
  }
  async function excluirConta(){
    if (navigator.onLine === false) { await dialogo('<h2>Sem internet</h2><p>Para excluir a conta é preciso estar conectado. Tente de novo quando a internet voltar.</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Entendi</button></div>'); return; }
    var x = await dialogo(
      '<h2>Excluir minha conta e meus dados?</h2>' +
      '<p>Isso apaga <b>para sempre</b>: a conta <b>' + esc(email || "") + '</b>, tudo o que está guardado na nuvem (perfil, treinos, dieta, medidas, conquistas) e as fotos de progresso. Os dados guardados neste aparelho também são apagados.</p>' +
      '<p><b>Não dá para desfazer.</b> Se quiser guardar uma cópia, cancele e use <b>Exportar dados (.json)</b> em Config → Seus dados.</p>' +
      '<div class="ng-dlg-act"><button class="ng-btn ghost" data-r="cancela">Cancelar</button><button class="ng-btn perigo" data-r="seguir">Continuar</button></div>');
    if (x.r !== "seguir") return;
    var pr = dialogo(
      '<h2>Confirme a exclusão</h2><p>Para confirmar, digite <b>EXCLUIR</b> no campo abaixo.</p>' +
      '<label class="ng-l" for="ng-exc-in">Digite EXCLUIR</label><input id="ng-exc-in" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
      '<div class="ng-dlg-act"><button class="ng-btn ghost" data-r="cancela">Cancelar</button><button class="ng-btn perigo" data-r="excluir" disabled>Excluir tudo</button></div>');
    var dl = document.querySelectorAll(".ng-dlg"); dl = dl[dl.length - 1];
    var inp = dl.querySelector("#ng-exc-in"), bt = dl.querySelector("[data-r=excluir]");
    inp.addEventListener("input", function(){ bt.disabled = inp.value.trim().toUpperCase() !== "EXCLUIR"; });
    inp.addEventListener("keydown", function(ev){ if (ev.key === "Enter" && !bt.disabled) bt.click(); });
    var y = await pr;
    if (y.r !== "excluir") return;
    var oc = dialogoOcupado("Excluindo sua conta…");
    var erro = null;
    try {
      try { if (canal) await client.removeChannel(canal); canal = null; } catch(e){}
      var ss = await client.auth.getSession();
      var tk = ss && ss.data && ss.data.session && ss.data.session.access_token;
      if (!tk) throw new Error("sem_sessao");
      var r = await fetch(API + "/functions/v1/delete-account", {method: "POST", headers: {"Content-Type": "application/json", "apikey": KEY, "Authorization": "Bearer " + tk}, body: JSON.stringify({confirmar: "EXCLUIR"})});
      var j = null; try { j = await r.json(); } catch(e){}
      if (!r.ok || !j || !j.ok) erro = (j && j.error) || ("http_" + r.status);
    } catch(e){ erro = (e && e.message) || "falha"; }
    oc.remove();
    if (erro) {
      await dialogo('<h2>Não foi possível excluir agora</h2><p>' + (/falha_remover_usuario/.test(erro) ? 'Seus registros e fotos já foram apagados, mas a conta ainda não. Tente de novo em instantes.' : 'Nada foi apagado por completo. Confira a internet e tente de novo; se continuar, escreva para ' + esc(CONTATO_PRIVACIDADE) + '.') + '</p><p class="ng-peq">Código: ' + esc(erro) + '</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Entendi</button></div>');
      return;
    }
    // sucesso: limpa tudo neste aparelho
    try { await I.apagarTudoLocal(); } catch(e){}
    try { await new Promise(function(res){ var q = indexedDB.deleteDatabase("bff"); q.onsuccess = q.onerror = q.onblocked = function(){ res(); }; }); } catch(e){}
    try { await client.auth.stopAutoRefresh(); } catch(e){}   // a conta já não existe: não chama o servidor para "sair"
    try { Object.keys(localStorage).forEach(function(k){ if (/^(ng|bff|sb-)/i.test(k)) localStorage.removeItem(k); }); } catch(e){}
    await dialogo('<h2>Conta excluída</h2><p>Sua conta e todos os seus dados foram apagados da nuvem e deste aparelho. Obrigado por ter usado o NG+.</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Fechar</button></div>');
    location.reload();
  }
  /* ---------------- Resetar meus dados (a conta continua) ----------------
   * Analogia: "esvaziar o armário" sem trocar a fechadura — apaga o que você guardou (nuvem + aparelho), mas o login,
   * os lembretes ligados e a escolha sobre o resumo por IA ficam como estão. Ordem: nuvem primeiro, aparelho depois;
   * se algo falhar no meio, o aparelho não é apagado e o app se acerta com a nuvem na próxima sincronização. */
  async function limparFotosDaNuvem(){
    for (var v = 0; v < 500; v++) {
      var lst = await client.storage.from(BUCKET).list(uid, {limit: 100, offset: 0});
      if (lst.error) throw lst.error;
      var nomes = (lst.data || []).filter(function(o){ return o && o.name && o.name.charAt(0) !== "."; }).map(function(o){ return uid + "/" + o.name; });
      if (!nomes.length) return;
      var rm = await client.storage.from(BUCKET).remove(nomes);
      if (rm.error) throw rm.error;
      if (!rm.data || !rm.data.length) throw new Error("fotos_nao_removidas");
    }
    throw new Error("fotos_limite");
  }
  async function resetarDados(){
    if (navigator.onLine === false) { await dialogo('<h2>Sem internet</h2><p>Para resetar é preciso estar conectado, para apagar também o que está na nuvem. Tente de novo quando a internet voltar.</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Entendi</button></div>', null, "Sem internet"); return; }
    var manter = false, x;
    for (;;) {
      x = await dialogo(
        '<h2>Resetar meus dados?</h2>' +
        '<p>Isso apaga <b>para sempre</b> tudo o que você registrou: treinos e cargas, rotina, dieta, medidas, peso, conquistas e fotos de progresso — na nuvem e neste aparelho. Nível, XP e sequência voltam do zero e o app recomeça pelo cadastro inicial.</p>' +
        '<p><b>Sua conta continua</b> (<b>' + esc(email || "") + '</b>): o login, os lembretes ligados e a escolha sobre o resumo por IA não mudam.</p>' +
        '<label class="ng-chk"><input type="checkbox"' + (manter ? ' checked' : '') + '> <span>Manter meu perfil (nome, idade, altura, objetivo) para não preencher de novo.</span></label>' +
        '<p class="ng-peq">Não dá para desfazer. Se quiser uma cópia, baixe o backup antes e guarde o arquivo.</p>' +
        '<div class="ng-dlg-act"><button class="ng-btn ghost" data-r="backup">Baixar backup antes</button></div>' +
        '<div class="ng-dlg-act"><button class="ng-btn ghost" data-r="cancela">Cancelar</button><button class="ng-btn perigo" data-r="seguir">Continuar</button></div>', null, "Resetar meus dados");
      manter = !!(x.chks && x.chks[0]);
      if (x.r === "backup") { try { if (window.ngApp && window.ngApp.exportarBackup) await window.ngApp.exportarBackup(); } catch(e){} continue; }
      break;
    }
    if (x.r !== "seguir") return;
    var pr = dialogo(
      '<h2>Confirme o reset</h2><p>Para confirmar, digite <b>RESETAR</b> no campo abaixo.</p>' +
      '<label class="ng-l" for="ng-rst-in">Digite RESETAR</label><input id="ng-rst-in" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false">' +
      '<div class="ng-dlg-act"><button class="ng-btn ghost" data-r="cancela">Cancelar</button><button class="ng-btn perigo" data-r="resetar" disabled>Resetar tudo</button></div>', null, "Confirmar o reset");
    var dl = document.querySelectorAll(".ng-dlg"); dl = dl[dl.length - 1];
    var inp = dl.querySelector("#ng-rst-in"), bt = dl.querySelector("[data-r=resetar]");
    inp.addEventListener("input", function(){ bt.disabled = inp.value.trim().toUpperCase() !== "RESETAR"; });
    inp.addEventListener("keydown", function(ev){ if (ev.key === "Enter" && !bt.disabled) bt.click(); });
    inp.focus();
    var y = await pr;
    if (y.r !== "resetar") return;
    var oc = dialogoOcupado("Resetando seus dados…");
    var erro = null; resetando = true; travaApp(true);
    try {
      try { if (canal) await client.removeChannel(canal); } catch(e){}
      canal = null;
      for (var w = 0; w < 100 && fluxo; w++) await sleep(100);   // deixa terminar um envio que já estava em andamento
      clearTimeout(tRetry); clearTimeout(tMudou);
      var del = client.from("user_docs").delete().eq("user_id", uid);
      if (manter) del = del.neq("path", "config/perfil");
      var rd = await del; if (rd.error) throw rd.error;
      await limparFotosDaNuvem();
      var rc = await client.from("user_docs").select("path", {count: "exact", head: true});   // confere: não pode sobrar nada (além do perfil, se mantido)
      if (rc.error) throw rc.error;
      if ((rc.count || 0) > (manter ? 1 : 0)) throw new Error("sobrou_registro");
    } catch(e){ erro = (e && (e.message || e.code)) || "falha"; }
    if (erro) {
      resetando = false; travaApp(false); oc.remove();
      ligaRealtime(); sincronizar();   // o aparelho se acerta com o que sobrou na nuvem
      await dialogo('<h2>Não foi possível resetar agora</h2><p>Confira a internet e tente de novo. Se uma parte já tinha sido apagada, o app mostra só o que sobrou; nada foi apagado à força neste aparelho.</p><p class="ng-peq">Código: ' + esc(erro) + '</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Entendi</button></div>', null, "Erro ao resetar");
      return;
    }
    // sucesso na nuvem: limpa este aparelho (registros, fila de envio, fotos e o banco antigo de antes do login)
    try { await I.apagarTudoLocal(); } catch(e){}
    try { await new Promise(function(res){ var q = indexedDB.deleteDatabase("bff"); q.onsuccess = q.onerror = q.onblocked = function(){ res(); }; }); } catch(e){}
    oc.remove();
    await dialogo('<h2>Dados resetados</h2><p>Tudo foi apagado' + (manter ? ', menos o seu perfil' : '') + '. Sua conta continua ativa. O app vai recarregar para você recomeçar.</p><div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Recomeçar</button></div>', null, "Dados resetados");
    location.reload();
  }
  async function travaDeNovo(){
    travaApp(true);
    try { await Promise.race([flush(), sleep(4000)]); } catch(e){}   // tenta mandar o que ficou pendente antes de trancar
    await encerraSessaoLocal(email);
    location.reload();
  }
  var TXT_REL = {"0": "Neste aparelho você continua conectado até tocar em Sair da conta.",
    "30": "Se ficar mais de 30 minutos fora do app, ele pede e-mail e código de novo.",
    "480": "Se ficar mais de 8 horas fora do app, ele pede e-mail e código de novo.",
    "10080": "Se ficar mais de 7 dias fora do app, ele pede e-mail e código de novo."};
  function pintaRelogin(){
    var sel = $("cfg-relogin"), info = $("cfg-relogin-info"); if (!sel || !info) return;
    var v = String(lerReloginMin());
    info.textContent = (TXT_REL[v] || TXT_REL["0"]) + (v !== "0" ? " Sem internet não dá para entrar de novo (o código vem por e-mail). Vale só neste aparelho." : "");
  }
  /* ---------------- Pedidos de acesso (cartão só para quem administra o app) ----------------
     Analogia: a portaria. Quem chega pela tela "Pedir acesso" fica na lista de espera; aqui o administrador libera ou recusa
     com um toque, sem abrir o painel do Supabase. A função gerir-acesso confere no servidor se quem chama é administrador:
     para os outros ela responde 403 e o cartão nem aparece. */
  var admBusy = false;
  async function admChama(acao, id){
    var ss = await client.auth.getSession();
    var tk = ss && ss.data && ss.data.session && ss.data.session.access_token;
    if (!tk) throw new Error("sem_sessao");
    var r = await fetch(API + "/functions/v1/gerir-acesso", {method: "POST", headers: {"Content-Type": "application/json", "apikey": KEY, "Authorization": "Bearer " + tk}, body: JSON.stringify({acao: acao, id: id})});
    var j = null; try { j = await r.json(); } catch(e){}
    return {status: r.status, j: j};
  }
  function admMsg(t){ var el = $("cfg-admin-msg"); if (el) el.textContent = t || ""; }
  function admData(iso){ try { return new Date(iso).toLocaleDateString("pt-BR", {day: "2-digit", month: "2-digit"}); } catch(e){ return ""; } }
  function admPinta(j){
    var box = $("cfg-admin-lista"), cnt = $("cfg-admin-cnt"); if (!box) return;
    var pend = (j && j.pendentes) || [];
    if (cnt) cnt.textContent = pend.length ? (pend.length + (pend.length === 1 ? " pedido esperando" : " pedidos esperando")) : "nenhum pedido esperando";
    if (!pend.length) { box.innerHTML = '<p class="hint">Nenhum pedido na lista de espera.</p>'; return; }
    box.innerHTML = pend.map(function(p){
      return '<div class="ng-adm-item" data-id="' + esc(p.id) + '">' +
        '<div><div class="ng-adm-nome">' + esc(p.nome) + (p.menor ? ' <span class="chip neutral">menor de 18</span>' : '') + '</div>' +
        '<div class="ng-adm-sub">' + esc(p.email) + ' · ' + esc(p.idade) + ' anos · pedido em ' + esc(admData(p.criado_em)) + '</div>' +
        (p.menor ? '<div class="ng-adm-sub">Responsável: ' + esc(p.email_responsavel || "") + '</div>' : '') + '</div>' +
        '<div class="ng-adm-act"><button type="button" class="btn" data-adm="aprovar" aria-label="Aprovar ' + esc(p.nome) + '">Aprovar</button>' +
        '<button type="button" class="btn ghost" data-adm="recusar" aria-label="Recusar ' + esc(p.nome) + '">Recusar</button></div></div>';
    }).join("");
  }
  /* esconde o cartão E apaga a lista da tela (nome e e-mail de quem pediu acesso não ficam no HTML de quem não administra) */
  function admEsconde(){
    var card = $("cfg-admin"); if (!card) return;
    card.hidden = true;
    var l = $("cfg-admin-lista"); if (l) l.innerHTML = "";
    var c = $("cfg-admin-cnt"); if (c) c.textContent = "";
    admMsg("");
  }
  async function admAtualiza(silencioso){
    var card = $("cfg-admin"); if (!card || admBusy) return;
    if (navigator.onLine === false) { if (!silencioso) admMsg("Sem internet. Conecte-se para ver os pedidos."); return; }
    try {
      var r = await admChama("listar");
      if (r.status === 403 || r.status === 401) { admEsconde(); return; }   // não é administrador: o cartão não aparece
      if (!r.j || !r.j.ok) { if (!silencioso) admMsg("Não consegui carregar os pedidos agora."); return; }
      card.hidden = false; admPinta(r.j); if (!silencioso) admMsg("");
    } catch(e){ if (!silencioso) admMsg("Não consegui carregar os pedidos agora."); }
  }
  function ligaAdmin(){
    var card = $("cfg-admin"); if (!card || card.getAttribute("data-ligado")) return;
    card.setAttribute("data-ligado", "1");
    var at = $("cfg-admin-atualiza"); if (at) at.addEventListener("click", function(){ admAtualiza(false); });
    card.addEventListener("click", async function(ev){
      var b = ev.target.closest("[data-adm]"); if (!b || admBusy) return;
      var item = b.closest("[data-id]"), id = item && item.getAttribute("data-id"), acao = b.getAttribute("data-adm"); if (!id) return;
      admBusy = true; Array.prototype.forEach.call(card.querySelectorAll("[data-adm]"), function(x){ x.disabled = true; });
      admMsg(acao === "aprovar" ? "Aprovando…" : "Recusando…");
      try {
        var r = await admChama(acao, id);
        if (r.j && r.j.ok) {
          admMsg(acao === "recusar" ? "Pedido recusado." : r.j.ja_existia ? "Aprovado. Essa pessoa já tinha conta e pode entrar." : r.j.email_enviado ? "Aprovado. Enviei o convite por e-mail." : "Aprovado. A conta foi criada, mas o e-mail de convite não saiu: avise a pessoa para entrar com o e-mail dela.");
        } else admMsg(r.status === 404 ? "Esse pedido já foi decidido." : "Não consegui concluir agora. Tente de novo.");
      } catch(e){ admMsg("Não consegui concluir agora. Confira a internet e tente de novo."); }
      admBusy = false; await admAtualiza(true);
    });
    var tabc = $("tab-config"); if (tabc) tabc.addEventListener("click", function(){ admAtualiza(true); });
    try { client.auth.onAuthStateChange(function(ev){ if (ev === "SIGNED_OUT") admEsconde(); }); } catch(e){}   // trocou de conta ou saiu: some na hora
    admAtualiza(true);
  }

  function ligaConfig(){
    var card = $("cfg-conta"); if (!card) return;
    card.hidden = false; pintaConta();
    var rl = $("cfg-relogin");
    if (rl) {
      rl.value = String(lerReloginMin()); if (rl.value !== String(lerReloginMin())) rl.value = "0";
      pintaRelogin();
      rl.addEventListener("change", function(){ try { localStorage.setItem(K_REL, rl.value); } catch(e){} marcaAtividade(); pintaRelogin(); });
    }
    $("cfg-conta-sync").addEventListener("click", async function(){ var b = this; b.disabled = true; await sincronizar(); await flush(); b.disabled = false; });
    $("cfg-conta-sair").addEventListener("click", sair);
    var pol = $("cfg-conta-politica"); if (pol) pol.addEventListener("click", abrirPolitica);
    var exc = $("cfg-conta-excluir"); if (exc) exc.addEventListener("click", excluirConta);
    var rst = $("cfg-conta-resetar"); if (rst) rst.addEventListener("click", resetarDados);
    ligaLembretes(); ligaTreinador(); ligaAdmin();
  }

  /* ---------------- Lembretes de treino (Web Push) ----------------
   * Analogia: o aparelho entrega ao serviço de notificações do navegador (Google/Apple/Mozilla) um "endereço de caixa postal".
   * Guardamos esse endereço na sua conta; de hora em hora o servidor confere quem treina hoje e ainda não treinou e manda o aviso. */
  var VAPID_PUB = "BA33G21lNP57th7egdbLbresUkYApIOm5yeh56e52To89Re9qb9BAXhK8FyuilhAFxm5nMtF7-yeoxeJ9hqLgyI";
  function pushSuportado(){ return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window; }
  function ehIOS(){ var ua = navigator.userAgent || ""; return /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1); }
  function b64ParaBytes(u){ var p = "=".repeat((4 - u.length % 4) % 4), r = atob((u + p).replace(/-/g, "+").replace(/_/g, "/")), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; }
  async function subDoAparelho(){ try { var reg = await navigator.serviceWorker.ready; return await reg.pushManager.getSubscription(); } catch(e){ return null; } }
  async function removerPushDoAparelho(){
    try { var sub = await subDoAparelho(); if (sub) { try { await client.from("push_subs").delete().eq("endpoint", sub.endpoint); } catch(e){} try { await sub.unsubscribe(); } catch(e){} } } catch(e){}
  }
  async function pintaLembretes(msg){
    var info = $("lem-info"), btn = $("lem-btn"), teste = $("lem-teste"), hora = $("lem-hora"); if (!info || !btn) return;
    teste.hidden = true; btn.disabled = false; hora.disabled = false;
    if (msg) { info.textContent = msg; }
    if (!pushSuportado()) {
      info.textContent = ehIOS()
        ? "No iPhone os lembretes só funcionam com o app instalado: use Configurações → Instalar no celular, abra o NG+ pelo ícone na tela inicial e volte aqui (precisa de iOS 16.4 ou mais novo)."
        : "Este navegador não oferece notificações. Tente o Chrome ou o Edge, ou instale o app.";
      btn.hidden = true; hora.disabled = true; return;
    }
    btn.hidden = false;
    if (Notification.permission === "denied") { info.textContent = "As notificações estão bloqueadas para o NG+ neste aparelho. Libere nas configurações do navegador (ou do celular) e volte aqui."; btn.disabled = true; hora.disabled = true; return; }
    var sub = await subDoAparelho(), row = null;
    if (sub) { try { var r = await client.from("push_subs").select("hora,ativo").eq("endpoint", sub.endpoint).maybeSingle(); row = r.data; } catch(e){} }
    if (sub && row && row.ativo) {
      hora.value = String(row.hora);
      if (!msg) info.textContent = "Lembretes ligados: você recebe um aviso às " + String(row.hora).padStart(2, "0") + ":00 nos dias de treino em que ainda não treinou.";
      btn.textContent = "Desligar lembretes"; btn.dataset.modo = "desligar"; teste.hidden = false;
    } else {
      if (!msg) info.textContent = "Receba um aviso no horário que escolher, só nos dias de treino em que você ainda não treinou. Funciona neste aparelho; para outro aparelho, ative lá também.";
      btn.textContent = "Ativar lembretes"; btn.dataset.modo = "ativar";
    }
  }
  async function ativarLembretes(){
    var btn = $("lem-btn"), hora = Number($("lem-hora").value);
    btn.disabled = true;
    try {
      var perm = await Notification.requestPermission();
      if (perm !== "granted") { await pintaLembretes("Sem a permissão do navegador não dá para avisar. Toque em Ativar de novo e escolha Permitir."); return; }
      var reg = await navigator.serviceWorker.ready;
      var sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({userVisibleOnly: true, applicationServerKey: b64ParaBytes(VAPID_PUB)});
      var j = sub.toJSON(), tz = "America/Sao_Paulo"; try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || tz; } catch(e){}
      var r = await client.from("push_subs").upsert({user_id: uid, endpoint: sub.endpoint, p256dh: j.keys.p256dh, auth: j.keys.auth, hora: hora, tz: tz, ativo: true, ultimo_envio: null}, {onConflict: "user_id,endpoint"});
      if (r.error) throw r.error;
      await pintaLembretes("Pronto! Lembretes ligados para as " + String(hora).padStart(2, "0") + ":00. Toque em “Enviar lembrete de teste” para ver como aparece.");
    } catch(e){ await pintaLembretes("Não consegui ativar agora (" + ((e && e.message) || "erro") + "). Confira a internet e tente de novo."); }
    finally { btn.disabled = false; }
  }
  async function desligarLembretes(){
    var btn = $("lem-btn"); btn.disabled = true;
    await removerPushDoAparelho();
    btn.disabled = false; await pintaLembretes("Lembretes desligados neste aparelho.");
  }
  async function testeLembrete(){
    var b = $("lem-teste"); b.disabled = true; var info = $("lem-info");
    try {
      var r = await client.functions.invoke("lembretes", {body: {teste: true}});
      if (r.error) { var c = r.error.context, j = null; try { j = c && c.json ? await c.json() : null; } catch(e){} info.textContent = (j && j.erro) ? "Ainda não deu: " + j.erro + "." : "Não consegui enviar o teste agora."; }
      else if (r.data && r.data.enviados > 0) info.textContent = "Teste enviado! A notificação deve aparecer em instantes.";
      else info.textContent = "O teste não chegou a nenhum aparelho. Desligue e ligue os lembretes de novo.";
    } catch(e){ info.textContent = "Não consegui enviar o teste agora."; }
    b.disabled = false;
  }
  function ligaLembretes(){
    var card = $("cfg-lembretes"); if (!card || card.dataset.ligado) return; card.dataset.ligado = "1"; card.hidden = false;
    $("lem-btn").addEventListener("click", function(){ if (this.dataset.modo === "desligar") desligarLembretes(); else ativarLembretes(); });
    $("lem-teste").addEventListener("click", testeLembrete);
    $("lem-hora").addEventListener("change", async function(){
      var sub = await subDoAparelho(); if (!sub) return;
      try { var r = await client.from("push_subs").update({hora: Number(this.value), ultimo_envio: null}).eq("endpoint", sub.endpoint).select("endpoint"); if (r.data && r.data.length) await pintaLembretes("Horário atualizado: " + String(this.value).padStart(2, "0") + ":00."); } catch(e){}
    });
    pintaLembretes();
  }

  /* ---------------- Resumo do treinador por IA (opcional, só com consentimento) ---------------- */
  var CONSENT_V = 1;
  async function consentimentoAtual(){
    try { var r = await client.auth.getSession(); var c = r.data && r.data.session && r.data.session.user.user_metadata && r.data.session.user.user_metadata.ia_consent; return !!(c && c.v === CONSENT_V && c.treinador === true); } catch(e){ return false; }
  }
  async function pintaTreinador(msg){
    var box = $("treinador-ia"); if (!box) return;
    var A = window.ngApp, info = $("trn-info"), btn = $("trn-btn"), rev = $("trn-revoga");
    if (!A || !A.perfilCarregado()) { box.hidden = true; return; }
    box.hidden = false; btn.disabled = false;
    var idade = A.idade();
    if (idade == null || idade < 18) { info.textContent = idade == null ? "Para usar o resumo por IA, informe sua idade no Perfil. O recurso é só para maiores de 18 anos." : "O resumo por IA não está disponível para menores de 18 anos. A análise do treino acima continua funcionando normalmente."; btn.hidden = true; rev.hidden = true; return; }
    btn.hidden = false;
    var ok = await consentimentoAtual();
    if (ok) { btn.textContent = "Gerar resumo"; btn.dataset.modo = "gerar"; rev.hidden = false; if (msg) info.textContent = msg; else if (!info.dataset.pos) info.textContent = "IA ativada. Ao tocar em “Gerar resumo”, um resumo dos seus números de treino (sem nome nem e-mail) é enviado à Anthropic para escrever o texto. Limite: 5 por dia."; }
    else { btn.textContent = "Ativar resumo por IA"; btn.dataset.modo = "ativar"; rev.hidden = true; info.textContent = msg || "Quer um resumo escrito por IA, como um treinador comentando seus números? É opcional e só acontece se você ativar: nada é enviado antes disso."; }
  }
  async function pedirConsentimentoIA(){
    var x = await dialogo(
      '<h2>Ativar o resumo do treinador por IA?</h2>' +
      '<p><b>O que é enviado</b> (só quando você tocar em “Gerar resumo”): nomes dos exercícios, cargas, repetições, RPE, volume semanal, sequência de dias, nível de experiência e objetivo.</p>' +
      '<p><b>O que não é enviado:</b> seu nome, e-mail, idade, peso, medidas e fotos.</p>' +
      '<p><b>Quem recebe:</b> a Anthropic (empresa que opera o Claude), nos Estados Unidos. Pela política da empresa para a API, os dados são apagados em até 30 dias e não são usados para treinar modelos por padrão (exceções: violação de uso e exigência legal).</p>' +
      '<p><b>Regras:</b> só para maiores de 18 anos; limite de 5 resumos por dia; você pode desativar quando quiser em Treino → Resumo do treinador. O texto é gerado por IA, pode errar e não substitui profissional de saúde.</p>' +
      '<p>Base legal: seu consentimento (LGPD, art. 7º, I), que você pode retirar a qualquer momento.</p>' +
      '<div class="ng-dlg-act"><button class="ng-btn" data-r="ok">Concordo e ativar</button><button class="ng-btn ghost" data-r="nao">Agora não</button></div>', "longo top", "Ativar resumo do treinador por IA");
    if (x.r !== "ok") return false;
    var r = await client.auth.updateUser({data: {ia_consent: {v: CONSENT_V, treinador: true, em: new Date().toISOString()}}});
    return !r.error;
  }
  async function gerarResumoIA(){
    var A = window.ngApp, info = $("trn-info"), btn = $("trn-btn"), out = $("trn-saida"), aviso = $("trn-aviso");
    if (navigator.onLine === false) { info.textContent = "Sem internet. Tente de novo quando voltar a conexão."; return; }
    var resumo = A.resumoParaTreinador();
    if (!resumo.exercicios.length) { info.textContent = "Registre alguns treinos primeiro: o resumo usa as suas últimas sessões."; return; }
    btn.disabled = true; btn.textContent = "Gerando…"; info.dataset.pos = "1"; info.textContent = "Escrevendo o resumo…";
    try {
      var r = await client.functions.invoke("treinador", {body: {resumo: resumo}});
      if (r.error) {
        var j = null; try { j = r.error.context && r.error.context.json ? await r.error.context.json() : null; } catch(e){}
        var cod = j && j.codigo;
        info.textContent = cod === "sem-chave" ? "O recurso de IA ainda está sendo configurado. Tente mais tarde."
          : cod === "limite" ? "Você já gerou 5 resumos hoje. Volte amanhã."
          : cod === "idade" ? "O resumo por IA é só para maiores de 18 anos."
          : cod === "sem-consentimento" ? "Ative o resumo por IA antes de gerar."
          : (j && j.erro) ? j.erro.charAt(0).toUpperCase() + j.erro.slice(1) + "." : "Não consegui gerar agora. Tente de novo em instantes.";
      } else {
        out.textContent = r.data.texto; out.hidden = false; aviso.hidden = false;   // textContent: nunca interpreta HTML vindo da IA
        info.textContent = "Resumo pronto. Resumos restantes hoje: " + r.data.restantes + ".";
        out.focus();
      }
    } catch(e){ info.textContent = "Não consegui gerar agora. Confira a internet e tente de novo."; }
    btn.disabled = false; btn.textContent = "Gerar resumo";
  }
  function ligaTreinador(){
    var box = $("treinador-ia"); if (!box || box.dataset.ligado) return; box.dataset.ligado = "1";
    $("trn-btn").addEventListener("click", async function(){
      if (this.dataset.modo === "gerar") return gerarResumoIA();
      this.disabled = true; var ok = await pedirConsentimentoIA(); this.disabled = false;
      await pintaTreinador(ok ? "IA ativada. Toque em “Gerar resumo” quando quiser." : null);
    });
    $("trn-revoga").addEventListener("click", async function(){
      await client.auth.updateUser({data: {ia_consent: {v: 0, treinador: false, em: new Date().toISOString()}}});
      var out = $("trn-saida"); out.hidden = true; out.textContent = ""; $("trn-aviso").hidden = true; $("trn-info").dataset.pos = "";
      await pintaTreinador("IA desativada. Nada mais será enviado.");
    });
    document.addEventListener("click", function(ev){ if (ev.target.closest && ev.target.closest("#tab-treino")) setTimeout(function(){ pintaTreinador(); }, 400); });
    setTimeout(function(){ pintaTreinador(); }, 1500);
  }
  async function sair(){
    var n = 0; try { n = (await I.filaListar()).length; } catch(e){}
    var x = await dialogo(
      '<h2>Sair desta conta?</h2><p>' + (n ? '<b>Atenção:</b> ' + n + (n === 1 ? ' alteração ainda não foi enviada' : ' alterações ainda não foram enviadas') + ' para a nuvem. ' : 'Tudo já está salvo na nuvem. ') +
      'Para voltar a usar o app, você vai entrar de novo com o e-mail.</p>' +
      '<label class="ng-chk"><input type="checkbox"> <span>Apagar também os dados guardados neste aparelho (use em aparelho emprestado). Eles continuam salvos na sua conta.</span></label>' +
      '<div class="ng-dlg-act"><button class="ng-btn" data-r="sair">Sair</button><button class="ng-btn ghost" data-r="cancela">Cancelar</button></div>');
    if (x.r !== "sair") return;
    try { await flush(); } catch(e){}
    await removerPushDoAparelho();   // este aparelho deixa de receber lembretes da conta que saiu
    var restam = 0; try { restam = (await I.filaListar()).length; } catch(e){}
    if (x.chk && restam) {
      var y = await dialogo('<h2>Ainda há alterações sem enviar</h2><p>Se apagar agora, ' + restam + (restam === 1 ? ' alteração será perdida' : ' alterações serão perdidas') + '. Conecte-se à internet e tente de novo, ou saia mantendo os dados neste aparelho.</p><div class="ng-dlg-act"><button class="ng-btn" data-r="manter">Sair mantendo os dados</button><button class="ng-btn ghost" data-r="cancela">Cancelar</button></div>');
      if (y.r !== "manter") return;
      x.chk = false;
    }
    try { if (canal) await client.removeChannel(canal); } catch(e){}
    try { await client.auth.signOut(); } catch(e){}
    if (x.chk) { try { await I.apagarTudoLocal(); } catch(e){} }
    try { localStorage.removeItem("ng-legado-ok"); } catch(e){}
    location.reload();
  }

  window.ngNuvem = {
    client: client, sessao: sessao, preparar: preparar, mudou: mudou, estado: estado, sincronizar: function(){ return sincronizar().then(flush); },
    abrirPolitica: abrirPolitica, versao: "B2"
  };
})();

/* ---------------- Instalar no celular (card "Instalar no celular" em Configurações) ----------------
 * Analogia: o navegador é uma "loja de bairro" que só pode fixar o atalho na sua mesa quando VOCÊ pede.
 *  - Android/Chrome e Chrome/Edge no computador: o navegador avisa (beforeinstallprompt) que dá para instalar; o botão usa esse aviso e abre a janela oficial de instalação com 1 toque.
 *  - iPhone/iPad (Safari): a Apple não permite instalar por botão; mostramos o passo a passo certo (Compartilhar → Adicionar à Tela de Início).
 *  - Já instalado (aberto como app): só confirma. Independe de login e de sincronização. */
(function(){
  "use strict";
  if (window.claude) return;
  var adiado = null, instalado = false;
  function $(id){ return document.getElementById(id); }
  function jaInstalado(){
    try { if (window.navigator.standalone === true) return true; } catch(e){}
    try { return ["standalone", "fullscreen", "minimal-ui"].some(function(m){ return window.matchMedia("(display-mode: " + m + ")").matches; }); } catch(e){ return false; }
  }
  function plataforma(){
    var ua = navigator.userAgent || "";
    var ios = /iPhone|iPad|iPod/i.test(ua) || (navigator.platform === "MacIntel" && (navigator.maxTouchPoints || 0) > 1);
    var android = /Android/i.test(ua);
    var embutido = /FBAN|FBAV|Instagram|Line\/|MicroMessenger|; wv\)|WhatsApp|Snapchat|TikTok/i.test(ua);
    var safari = ios && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(ua) && !embutido;
    return {ios: ios, android: android, embutido: embutido, safari: safari};
  }
  function passos(pl){
    var li = function(a){ return "<li>" + a.join("</li><li>") + "</li>"; };
    var l, t;
    if (pl.embutido) {
      t = "Este link está aberto dentro de outro aplicativo";
      l = ["Toque nos três pontinhos ou no ícone de compartilhar do aplicativo atual.", "Escolha <b>Abrir no navegador</b> (" + (pl.ios ? "Safari" : "Chrome") + ").", "Depois volte aqui em Configurações → Instalar no celular."];
    } else if (pl.ios) {
      t = pl.safari ? "No iPhone ou iPad (Safari)" : "No iPhone ou iPad";
      l = pl.safari
        ? ["Toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima, na barra do Safari).", "Role a lista e toque em <b>Adicionar à Tela de Início</b>.", "Deixe <b>Abrir como App Web</b> ligado, se aparecer, e toque em <b>Adicionar</b>."]
        : ["Abra este endereço no <b>Safari</b> (é o navegador que o iPhone usa para instalar apps da web).", "Toque em <b>Compartilhar</b> (quadrado com seta para cima).", "Escolha <b>Adicionar à Tela de Início</b> e toque em <b>Adicionar</b>."];
    } else if (pl.android) {
      t = "No Android (Chrome)";
      l = ["Toque nos três pontinhos <b>⋮</b> no canto superior do Chrome.", "Escolha <b>Instalar app</b> (em algumas versões: <b>Adicionar à tela inicial</b>).", "Confirme em <b>Instalar</b>. O ícone do NG+ aparece na tela inicial."];
    } else {
      t = "No computador (Chrome ou Edge)";
      l = ["Procure o ícone de <b>instalar</b> no canto direito da barra de endereço (uma telinha com uma seta).", "Se não aparecer: menu <b>⋮</b> → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar página como app</b> (no Edge: <b>Aplicativos</b> → <b>Instalar este site como um aplicativo</b>).", "No Firefox e no Safari do computador não há instalação; use o NG+ pelo navegador."];
    }
    return "<b>" + t + "</b><ol style=\"margin:8px 0 0 20px;padding:0;display:grid;gap:6px\">" + li(l) + "</ol>";
  }
  function pinta(){
    var info = $("cfg-inst-info"), btn = $("cfg-inst-btn"), pas = $("cfg-inst-passos"); if (!info || !btn) return;
    var pl = plataforma();
    if (instalado || jaInstalado()) {
      info.textContent = "Pronto: o NG+ está instalado e aberto como app neste aparelho. Para instalar em outro celular, abra Configurações lá.";
      btn.hidden = true; if (pas) pas.hidden = true; return;
    }
    btn.hidden = false;
    if (adiado) {
      info.textContent = "Instale para abrir o NG+ pelo ícone na tela inicial, em tela cheia e sem depender da internet.";
      btn.textContent = "Instalar agora"; btn.setAttribute("aria-expanded", "false"); btn.removeAttribute("aria-controls"); if (pas) pas.hidden = true;
    } else {
      info.textContent = pl.ios && !pl.embutido
        ? "No iPhone a instalação é feita pelo Safari, em 3 toques. Toque no botão para ver o passo a passo."
        : "Instale para abrir o NG+ pelo ícone na tela inicial, em tela cheia e sem depender da internet. Toque no botão para ver o passo a passo.";
      btn.textContent = "Como instalar"; btn.setAttribute("aria-controls", "cfg-inst-passos");
      btn.setAttribute("aria-expanded", pas && !pas.hidden ? "true" : "false");
    }
  }
  async function clicou(){
    var info = $("cfg-inst-info"), pas = $("cfg-inst-passos"), btn = $("cfg-inst-btn");
    if (adiado) {
      var ev = adiado; adiado = null; btn.disabled = true;
      try {
        await ev.prompt();
        var r = await ev.userChoice;
        if (r && r.outcome === "accepted") { info.textContent = "Instalando… em instantes o ícone do NG+ aparece na tela inicial."; btn.disabled = false; btn.hidden = true; return; }
        info.textContent = "Tudo bem, fica para depois. Quando quiser, é só tocar de novo.";
      } catch(e){ info.textContent = "Não consegui abrir a janela de instalação por aqui. Veja o passo a passo abaixo."; if (pas) { pas.innerHTML = passos(plataforma()); pas.hidden = false; } }
      btn.disabled = false; btn.textContent = "Como instalar"; btn.setAttribute("aria-controls", "cfg-inst-passos"); btn.setAttribute("aria-expanded", pas && !pas.hidden ? "true" : "false");
      return;
    }
    if (!pas) return;
    if (pas.hidden) { pas.innerHTML = passos(plataforma()); pas.hidden = false; } else pas.hidden = true;
    btn.setAttribute("aria-expanded", pas.hidden ? "false" : "true");
  }
  /* Banner "Instalar o app" no topo do Hoje. Só aparece no celular (ou quando o navegador oferece instalar), nunca se o app já está
   * instalado, e "Agora não" esconde por 14 dias. É um lembrete gentil: a instalação em si usa a mesma janela oficial / o mesmo passo a passo do card em Configurações. */
  var CH_BANNER = "ng_banner_instalar_ate", instalando = false;
  function bannerAdiado(){ try { var t = Number(localStorage.getItem(CH_BANNER)); return t && Date.now() < t; } catch(e){ return false; } }
  function bannerDispensar(){ try { localStorage.setItem(CH_BANNER, String(Date.now() + 14 * 86400000)); } catch(e){} }
  function bannerPinta(){
    var host = $("view-painel"); if (!host) return;
    var el = $("ng-install-banner"), pl = plataforma();
    var mostra = !(instalado || instalando || jaInstalado()) && !bannerAdiado() && (pl.ios || pl.android || !!adiado);
    if (!mostra) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement("div"); el.id = "ng-install-banner"; el.className = "card"; el.setAttribute("role", "region"); el.setAttribute("aria-label", "Instalar o app");
      el.innerHTML = '<div class="card-head"><h2>Instale o NG+ no celular</h2></div>' +
        '<div class="hint u-mb10" id="ng-ib-info">Abre pelo ícone na tela inicial, em tela cheia e sem depender da internet.</div>' +
        '<div class="data-actions"><button class="btn primary small" id="ng-ib-btn" type="button" aria-expanded="false" aria-controls="ng-ib-passos"></button>' +
        '<button class="btn ghost small" id="ng-ib-fechar" type="button">Agora não</button></div>' +
        '<div class="hint u-mt8" id="ng-ib-passos" role="region" aria-label="Passo a passo para instalar" hidden></div>';
      host.insertBefore(el, host.firstChild);
      $("ng-ib-btn").addEventListener("click", bannerClicou);
      $("ng-ib-fechar").addEventListener("click", function(){ bannerDispensar(); var e = $("ng-install-banner"); if (e) e.remove(); });
    }
    var btn = $("ng-ib-btn"), pas = $("ng-ib-passos");
    btn.textContent = adiado ? "Instalar agora" : "Como instalar";
    if (adiado) { btn.removeAttribute("aria-controls"); btn.setAttribute("aria-expanded", "false"); if (pas) pas.hidden = true; }
    else { btn.setAttribute("aria-controls", "ng-ib-passos"); btn.setAttribute("aria-expanded", pas && !pas.hidden ? "true" : "false"); }
  }
  async function bannerClicou(){
    var pas = $("ng-ib-passos"), btn = $("ng-ib-btn"), info = $("ng-ib-info");
    if (adiado) {
      var ev = adiado; adiado = null; btn.disabled = true;
      try {
        await ev.prompt();
        var r = await ev.userChoice;
        if (r && r.outcome === "accepted") { instalando = true; var e = $("ng-install-banner"); if (e) e.remove(); pinta(); return; }
        info.textContent = "Tudo bem, fica para depois. Você também encontra isso em Configurações → Instalar no celular.";
      } catch(e){ if (pas) { pas.innerHTML = passos(plataforma()); pas.hidden = false; } }
      btn.disabled = false; btn.textContent = "Como instalar"; btn.setAttribute("aria-controls", "ng-ib-passos"); btn.setAttribute("aria-expanded", pas && !pas.hidden ? "true" : "false");
      pinta();
      return;
    }
    if (!pas) return;
    if (pas.hidden) { pas.innerHTML = passos(plataforma()); pas.hidden = false; } else pas.hidden = true;
    btn.setAttribute("aria-expanded", pas.hidden ? "false" : "true");
  }
  var _pinta = pinta;
  pinta = function(){ _pinta(); bannerPinta(); };
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); adiado = e; pinta(); });
  window.addEventListener("appinstalled", function(){ instalado = true; adiado = null; pinta(); });
  function liga(){ bannerPinta(); var b = $("cfg-inst-btn"); if (!b || b.dataset.ligado) return; b.dataset.ligado = "1"; b.addEventListener("click", clicou); pinta(); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", liga); else liga();
  window.ngInstalar = {pinta: function(){ pinta(); }, plataforma: plataforma};
})();
