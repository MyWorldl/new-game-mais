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

  // chave de teste: só em localhost, para a bateria automática do app (não existe em produção)
  try { if (location.hostname === "localhost" && localStorage.getItem("ng_dev_semnuvem") === "1") return; } catch(e){}

  var client = SB.createClient(API, KEY, {
    auth: {persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce"}
  });

  var I = null, uid = null, email = null;
  var fluxo = false, falhou = false, retry = 0, tRetry = null, pulling = null, canal = null;
  var recentes = null, ultimoPull = 0, ultimoOk = null, estadoAtual = {k: "loading", n: 0}, logado = false;

  /* ---------------- util ---------------- */
  function $(id){ return document.getElementById(id); }
  function esc(t){ return String(t).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }
  function igual(a, b){ try { return JSON.stringify(a) === JSON.stringify(b); } catch(e){ return false; } }
  function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
  function msgErro(e, contexto){
    var m = String((e && (e.message || e.error_description)) || e || "").toLowerCase(), st = e && (e.status || e.code);
    if (/failed to fetch|network|load failed|fetch/.test(m) || navigator.onLine === false) return "Sem conexão com a internet. Confira a rede e tente de novo.";
    if (/signups? not allowed|not allowed for otp|user not found/.test(m)) return "Este e-mail ainda não foi liberado no NG+. Peça o convite a quem administra o app.";
    if (/not authorized|email address not/.test(m)) return "O envio de e-mails ainda não está liberado para este endereço. Fale com quem administra o app.";
    if (st === 429 || /rate limit|too many|seconds|security purposes/.test(m)) return "Muitos pedidos seguidos. Espere cerca de um minuto e tente de novo.";
    if (contexto === "codigo" && /expired|invalid|token/.test(m)) return "Código inválido ou vencido. Confira os números ou peça um novo e-mail.";
    if (/invalid.*email|unable to validate email/.test(m)) return "Esse e-mail não parece válido. Confira e tente de novo.";
    return contexto === "codigo" ? "Não consegui validar o código agora. Tente de novo." : "Não consegui enviar o e-mail agora. Tente de novo em instantes.";
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

  var CSS = '' +
    '.ng-login{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom));background:var(--bg,#0b1220);color:var(--ink,#eef2f7);font-family:inherit;overflow:auto}' +
    '.ng-login-box{width:100%;max-width:420px;display:flex;flex-direction:column;gap:14px}' +
    '.ng-login-mark{width:64px;height:64px;border-radius:18px;display:grid;place-items:center;font-weight:800;font-size:22px;background:var(--accent,#a3e635);color:var(--accent-ink,#10200a);letter-spacing:-.02em}' +
    '.ng-login h1{margin:4px 0 0;font-size:26px;line-height:1.15}' +
    '.ng-login p{margin:0;color:var(--ink-soft,#b6c0cf);line-height:1.5;font-size:15px}' +
    '.ng-login form{display:flex;flex-direction:column;gap:12px;margin-top:6px}' +
    '.ng-login label{font-size:13px;color:var(--muted,#9aa6b8);font-weight:600}' +
    '.ng-login input{font:inherit;font-size:17px;min-height:48px;padding:10px 14px;border-radius:12px;border:1px solid var(--line-strong,#3a4658);background:var(--surface-2,#141c2b);color:var(--ink,#eef2f7);width:100%;box-sizing:border-box}' +
    '.ng-login input:focus-visible,.ng-btn:focus-visible{outline:3px solid var(--focus,#7dd3fc);outline-offset:2px}' +
    '.ng-login input[inputmode=numeric]{letter-spacing:.35em;text-align:center;font-size:22px}' +
    '.ng-btn{font:inherit;font-weight:700;font-size:16px;min-height:48px;padding:10px 16px;border-radius:12px;border:1px solid transparent;background:var(--accent,#a3e635);color:var(--accent-ink,#10200a);cursor:pointer}' +
    '.ng-btn.ghost{background:transparent;color:var(--ink,#eef2f7);border-color:var(--line-strong,#3a4658)}' +
    '.ng-btn[disabled]{opacity:.55;cursor:default}' +
    '.ng-login-m{min-height:22px;font-size:14px;color:var(--ink-soft,#b6c0cf)}' +
    '.ng-login-m.err{color:var(--bad,#ff8a8a)}' +
    '.ng-dlg{position:fixed;inset:0;z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.6)}' +
    '.ng-dlg-box{width:100%;max-width:420px;border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;background:var(--surface,#10192a);color:var(--ink,#eef2f7);border:1px solid var(--line-strong,#3a4658)}' +
    '.ng-dlg-box h2{margin:0;font-size:20px}.ng-dlg-box p{margin:0;font-size:15px;line-height:1.5;color:var(--ink-soft,#b6c0cf)}' +
    '.ng-dlg-act{display:flex;gap:10px;flex-wrap:wrap}.ng-dlg-act .ng-btn{flex:1 1 140px}' +
    '.ng-chk{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--ink,#eef2f7)}.ng-chk input{width:22px;min-height:22px;margin-top:2px}';
  function injetaCss(){
    if ($("ng-nuvem-css")) return;
    var st = document.createElement("style"); st.id = "ng-nuvem-css"; st.textContent = CSS; (document.head || document.documentElement).appendChild(st);
  }
  function quandoDom(fn){ if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn, {once: true}); }
  function travaApp(on){ var a = document.querySelector(".app"); if (a) { if (on) a.setAttribute("inert", ""); else a.removeAttribute("inert"); } }

  var sessaoP = null;
  function sessao(){
    if (sessaoP) return sessaoP;
    sessaoP = (async function(){
      var s = await lerSessao();
      if (!s) s = await pedirLogin();
      uid = s.uid; email = s.email; logado = true;
      return s;
    })();
    return sessaoP;
  }

  function pedirLogin(){
    return new Promise(function(resolve){
      var enviadoPara = null, cooldown = 0, tCool = null, concluido = false;
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
              '<div id="ng-login-cod" hidden><label for="ng-login-c">Código do e-mail</label><input id="ng-login-c" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" pattern="[0-9]*" aria-describedby="ng-login-m"></div>' +
              '<button class="ng-btn" type="submit" id="ng-login-ok">Enviar link e código</button>' +
              '<button class="ng-btn ghost" type="button" id="ng-login-reenv" hidden>Reenviar e-mail</button>' +
              '<button class="ng-btn ghost" type="button" id="ng-login-outro" hidden>Usar outro e-mail</button>' +
            '</form>' +
            '<p class="ng-login-m" id="ng-login-m" role="status" aria-live="polite"></p>' +
          '</div>';
        document.body.appendChild(el);
        var f = $("ng-login-f"), inE = $("ng-login-e"), inC = $("ng-login-c"), box = $("ng-login-cod"), ok = $("ng-login-ok"),
            reenv = $("ng-login-reenv"), outro = $("ng-login-outro"), m = $("ng-login-m"), p = $("ng-login-p");
        function msg(t, erro){ m.textContent = t || ""; m.className = "ng-login-m" + (erro ? " err" : ""); }
        function trava(b){ ok.disabled = b; reenv.disabled = b || cooldown > 0; }
        function ticCool(){
          clearInterval(tCool);
          reenv.textContent = cooldown > 0 ? "Reenviar e-mail (" + cooldown + " s)" : "Reenviar e-mail";
          reenv.disabled = cooldown > 0;
          if (cooldown <= 0) return;
          tCool = setInterval(function(){ cooldown--; reenv.textContent = cooldown > 0 ? "Reenviar e-mail (" + cooldown + " s)" : "Reenviar e-mail"; reenv.disabled = cooldown > 0; if (cooldown <= 0) clearInterval(tCool); }, 1000);
        }
        function finaliza(s){
          if (concluido) return; concluido = true; clearInterval(tCool);
          try { el.remove(); } catch(e){} travaApp(false);
          resolve({uid: s.user.id, email: s.user.email || enviadoPara || ""});
        }
        async function enviar(){
          var e = inE.value.trim().toLowerCase();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { msg("Digite um e-mail válido.", true); inE.focus(); return; }
          if (navigator.onLine === false) { msg("Sem internet. Conecte-se para entrar pela primeira vez neste aparelho.", true); return; }
          trava(true); msg("Enviando…");
          try {
            var r = await client.auth.signInWithOtp({email: e, options: {shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname}});
            if (r.error) throw r.error;
            enviadoPara = e; cooldown = 30; ticCool();
            inE.readOnly = true; box.hidden = false; reenv.hidden = false; outro.hidden = false; ok.textContent = "Entrar com o código";
            p.textContent = "Enviamos um e-mail para " + e + ". Toque no link que veio nele ou digite aqui o código de números.";
            msg("E-mail enviado. Confira também a caixa de spam."); inC.focus();
          } catch(err){ msg(msgErro(err, "email"), true); }
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
        reenv.addEventListener("click", function(){ if (cooldown <= 0) enviar(); });
        outro.addEventListener("click", function(){
          enviadoPara = null; inE.readOnly = false; inE.value = ""; inC.value = ""; box.hidden = true; reenv.hidden = true; outro.hidden = true;
          ok.textContent = "Enviar link e código"; clearInterval(tCool); msg(""); p.textContent = "Digite o e-mail liberado para você. Vamos enviar um link e um código de acesso — não precisa de senha."; inE.focus();
        });
        // login pelo link do e-mail (mesmo navegador) ou por outra aba
        client.auth.onAuthStateChange(function(ev, s){ if (s && (ev === "SIGNED_IN" || ev === "INITIAL_SESSION")) finaliza(s); });
        client.auth.getSession().then(function(r){ if (r && r.data && r.data.session) finaliza(r.data.session); }).catch(function(){});
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
    if (fluxo || !I || !logado || navigator.onLine === false) { atualizaEstado(); return; }
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
    if (pulling) return pulling;
    pulling = (async function(){
      recentes = new Set();
      try {
        var rows = [], from = 0, passo = 1000;
        for (;;) {
          var r = await client.from("user_docs").select("path,data").order("path").range(from, from + passo - 1);
          if (r.error) throw r.error;
          rows = rows.concat(r.data || []);
          if (!r.data || r.data.length < passo) break;
          from += passo;
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
            var lst = await client.storage.from(BUCKET).list(uid, {limit: 1000}), tem = {};
            (lst.data || []).forEach(function(o){ tem[o.name] = 1; });
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

  function dialogo(html){
    return new Promise(function(resolve){
      injetaCss();
      var d = document.createElement("div"); d.className = "ng-dlg";
      d.innerHTML = '<div class="ng-dlg-box" role="dialog" aria-modal="true">' + html + '</div>';
      document.body.appendChild(d);
      d.addEventListener("click", function(ev){ var b = ev.target.closest("[data-r]"); if (b) { var chk = d.querySelector("input[type=checkbox]"); var v = b.getAttribute("data-r"); d.remove(); resolve({r: v, chk: !!(chk && chk.checked)}); } });
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
      if (document.visibilityState === "visible") { flush(); if (Date.now() - ultimoPull > 20000) sincronizar(); }
    });
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
  function ligaConfig(){
    var card = $("cfg-conta"); if (!card) return;
    card.hidden = false; pintaConta();
    $("cfg-conta-sync").addEventListener("click", async function(){ var b = this; b.disabled = true; await sincronizar(); await flush(); b.disabled = false; });
    $("cfg-conta-sair").addEventListener("click", sair);
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
    versao: "B1"
  };
})();
