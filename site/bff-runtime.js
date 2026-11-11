/* bff-runtime.js — NG+ (New Game+) — antes Best Friends Forever / Ritmo de Ferro (Etapa A, versão standalone)
 *
 * O que é: um "adaptador". Dentro do Claude o app conversa com window.claude (db, assets, downloads).
 * Fora do Claude (Cloudflare Pages) esse objeto não existe — então este arquivo cria um igual,
 * guardando tudo no IndexedDB do navegador. O app não percebe a diferença.
 * Analogia: é a tomada com adaptador — o plugue do app é o mesmo; só muda a parede.
 *
 * Regras:
 *  - Só se instala se window.claude NÃO existir (dentro do Claude nada muda).
 *  - Se o IndexedDB estiver indisponível, use("db") devolve null e o app mostra o "modo local" de sempre.
 *  - Dados: banco "bff" → store "docs" (chave = caminho, ex. "checkins/2026-10-14") e "blobs" (fotos).
 *  - Etapa B (Supabase) troca só este arquivo por outro adaptador, com a mesma API.
 */
(function(){
  "use strict";
  if (window.claude) return;

  var DB_NAME = "bff", DB_VER = 2;   // v2 (Etapa B): + stores "fila" (envios pendentes) e "meta"
  var NUV = window.ngNuvem || null;   // camada de conta/sincronização (ng-nuvem.js); ausente = só local, como antes
  var cache = new Map();          // path -> data (objeto)
  var docL = new Map();           // path -> Set(cb)
  var colL = new Map();           // coleção -> Set({fn, limit})
  var blobUrls = new Map();       // id -> object URL
  var idb = null, readyP = null, bc = null, uidAtual = null;

  function req2p(r){ return new Promise(function(res, rej){ r.onsuccess = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; }); }
  function txDone(tx){ return new Promise(function(res, rej){ tx.oncomplete = function(){ res(); }; tx.onerror = tx.onabort = function(){ rej(tx.error || new Error("tx")); }; }); }
  function clone(o){ return o == null ? o : JSON.parse(JSON.stringify(o)); }
  function colOf(p){ var i = p.indexOf("/"); return i < 0 ? p : p.slice(0, i); }
  function idOf(p){ var i = p.indexOf("/"); return i < 0 ? p : p.slice(i + 1); }

  function open(){
    return new Promise(function(res, rej){
      var r;
      try { r = indexedDB.open(DB_NAME, DB_VER); } catch(e){ rej(e); return; }
      r.onupgradeneeded = function(){
        var d = r.result;
        if (!d.objectStoreNames.contains("docs")) d.createObjectStore("docs", {keyPath: "path"});
        if (!d.objectStoreNames.contains("blobs")) d.createObjectStore("blobs", {keyPath: "id"});
        if (!d.objectStoreNames.contains("fila")) d.createObjectStore("fila", {keyPath: "path"});
        if (!d.objectStoreNames.contains("meta")) d.createObjectStore("meta", {keyPath: "k"});
      };
      r.onsuccess = function(){ res(r.result); };
      r.onerror = function(){ rej(r.error); };
      r.onblocked = function(){ rej(new Error("blocked")); };
    });
  }

  function ready(){
    if (readyP) return readyP;
    readyP = (async function(){
      if (!window.indexedDB) throw new Error("sem IndexedDB");
      if (NUV) { var ses = await NUV.sessao(); DB_NAME = "bff-" + ses.uid; uidAtual = ses.uid; }   // cada conta tem o seu banco local
      idb = await open();
      var tx = idb.transaction(["docs", "blobs"], "readonly");
      var docs = await req2p(tx.objectStore("docs").getAll());
      var blobs = await req2p(tx.objectStore("blobs").getAll());
      docs.forEach(function(r){ cache.set(r.path, r.data); });
      blobs.forEach(function(r){ blobUrls.set(r.id, URL.createObjectURL(r.blob)); });
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch(e){}
      try {
        bc = new BroadcastChannel("bff-sync");
        bc.onmessage = function(ev){ recarrega(ev.data); };
      } catch(e){ bc = null; }
      if (NUV) { try { await NUV.preparar(interno()); } catch(e){} }   // login feito: busca a nuvem (1ª vez) e liga a sincronização
      return true;
    })();
    return readyP;
  }

  // outra aba mudou algo: relê só o que mudou e avisa quem escuta
  async function recarrega(msg){
    if (!msg || !idb) return;
    try {
      if (msg.type === "docs") {
        var tx = idb.transaction("docs", "readonly"), st = tx.objectStore("docs");
        for (var i = 0; i < msg.paths.length; i++) {
          var r = await req2p(st.get(msg.paths[i]));
          if (r) cache.set(r.path, r.data); else cache.delete(msg.paths[i]);
        }
        notifica(msg.paths);
      } else if (msg.type === "blobs") {
        var tx2 = idb.transaction("blobs", "readonly"), st2 = tx2.objectStore("blobs");
        for (var j = 0; j < msg.ids.length; j++) {
          var b = await req2p(st2.get(msg.ids[j]));
          if (b && !blobUrls.has(b.id)) blobUrls.set(b.id, URL.createObjectURL(b.blob));
          if (!b && blobUrls.has(msg.ids[j])) { URL.revokeObjectURL(blobUrls.get(msg.ids[j])); blobUrls.delete(msg.ids[j]); }
        }
        notifica(msg.paths || []);
      }
    } catch(e){}
  }

  /* ---------- snapshots ---------- */
  function docSnap(path){
    var exists = cache.has(path), d = cache.get(path);
    return {id: idOf(path), exists: exists, data: function(){ return exists ? clone(d) : undefined; }};
  }
  function colDocs(col, limit){
    var out = [];
    cache.forEach(function(v, p){ if (colOf(p) === col && p.indexOf("/") > 0) out.push(p); });
    out.sort(function(a, b){ return idOf(a) < idOf(b) ? -1 : idOf(a) > idOf(b) ? 1 : 0; });
    if (limit != null && out.length > limit) out = out.slice(0, limit);
    return out;
  }
  function colSnap(col, limit){
    var docs = colDocs(col, limit).map(function(p){
      var d = cache.get(p);
      return {id: idOf(p), exists: true, data: function(){ return clone(d); }};
    });
    return {empty: docs.length === 0, size: docs.length, docs: docs, forEach: function(fn){ docs.forEach(fn); }};
  }
  function notifica(paths){
    var cols = new Set();
    paths.forEach(function(p){
      cols.add(colOf(p));
      var s = docL.get(p);
      if (s) s.forEach(function(cb){ try { cb.fn(docSnap(p)); } catch(e){} });
    });
    cols.forEach(function(c){
      var s = colL.get(c);
      if (s) s.forEach(function(l){ try { l.fn(colSnap(c, l.limit)); } catch(e){} });
    });
  }

  /* ---------- escrita ---------- */
  async function gravar(path, data){
    await ready();
    var tx = idb.transaction(NUV ? ["docs", "fila"] : "docs", "readwrite");
    var st = NUV ? tx.objectStore("docs") : tx.objectStore("docs");
    if (data === undefined) st.delete(path);
    else st.put({path: path, data: clone(data), updatedAt: Date.now()});
    if (NUV) tx.objectStore("fila").put({path: path, op: data === undefined ? "del" : "set", t: Date.now()});
    await txDone(tx);
    if (data === undefined) cache.delete(path); else cache.set(path, clone(data));
    notifica([path]);
    try { if (bc) bc.postMessage({type: "docs", paths: [path]}); } catch(e){}
    if (NUV) NUV.mudou();
  }

  function addDocListener(path, fn, errFn){
    var rec = {fn: fn};
    if (!docL.has(path)) docL.set(path, new Set());
    docL.get(path).add(rec);
    ready().then(function(){ if (docL.get(path).has(rec)) fn(docSnap(path)); }, function(e){ if (errFn) errFn(e); });
    return function(){ var s = docL.get(path); if (s) s.delete(rec); };
  }
  function addColListener(col, limit, fn, errFn){
    var rec = {fn: fn, limit: limit};
    if (!colL.has(col)) colL.set(col, new Set());
    colL.get(col).add(rec);
    ready().then(function(){ if (colL.get(col).has(rec)) fn(colSnap(col, limit)); }, function(e){ if (errFn) errFn(e); });
    return function(){ var s = colL.get(col); if (s) s.delete(rec); };
  }

  function makeQuery(col, limit){
    return {
      limit: function(n){ return makeQuery(col, n); },
      orderBy: function(){ return makeQuery(col, limit); },   // a ordem por id já é a usada pelo app
      onSnapshot: function(fn, errFn){ return addColListener(col, limit, fn, errFn); },
      get: async function(){ await ready(); return colSnap(col, limit); }
    };
  }

  var db = {
    doc: function(path){
      return {
        id: idOf(path), path: path,
        get: async function(){ await ready(); return docSnap(path); },
        set: function(data){ return gravar(path, data); },
        update: async function(patch){ await ready(); return gravar(path, Object.assign({}, cache.get(path) || {}, patch)); },
        delete: function(){ return gravar(path, undefined); },
        onSnapshot: function(fn, errFn){ return addDocListener(path, fn, errFn); }
      };
    },
    collection: function(name){ return makeQuery(name, null); }
  };

  /* ---------- fotos (assets) ---------- */
  function hex32(){
    var a = new Uint8Array(16); crypto.getRandomValues(a);
    return Array.prototype.map.call(a, function(b){ return ("0" + b.toString(16)).slice(-2); }).join("");
  }
  // reduz para no máximo 1600 px (JPEG 0,82): foto de celular de 4 MB vira ~300 KB. Falhou? guarda o original.
  async function reduzir(file){
    try {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
      var bmp = await createImageBitmap(file);
      var m = Math.max(bmp.width, bmp.height), k = m > 1600 ? 1600 / m : 1;
      if (k === 1 && file.size < 600 * 1024) { bmp.close && bmp.close(); return file; }
      var c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      var out = await new Promise(function(res){ c.toBlob(res, "image/jpeg", 0.82); });
      return out && out.size < file.size ? out : file;
    } catch(e){ return file; }
  }
  var assets = {
    upload: async function(file){
      await ready();
      var blob = await reduzir(file), id = hex32();
      var tx = idb.transaction(NUV ? ["blobs", "fila"] : "blobs", "readwrite");
      tx.objectStore("blobs").put({id: id, blob: blob, type: blob.type, size: blob.size, criadoEm: Date.now()});
      if (NUV) tx.objectStore("fila").put({path: "blob:" + id, op: "bset", t: Date.now()});
      await txDone(tx);
      var url = URL.createObjectURL(blob);
      blobUrls.set(id, url);
      try { if (bc) bc.postMessage({type: "blobs", ids: [id]}); } catch(e){}
      if (NUV) NUV.mudou();
      return {id: id, url: url, sizeBytes: blob.size, contentType: blob.type};
    },
    delete: async function(id){
      await ready();
      var tx = idb.transaction(NUV ? ["blobs", "fila"] : "blobs", "readwrite");
      tx.objectStore("blobs").delete(id);
      if (NUV) tx.objectStore("fila").put({path: "blob:" + id, op: "bdel", t: Date.now()});
      await txDone(tx);
      var u = blobUrls.get(id); if (u) URL.revokeObjectURL(u);
      blobUrls.delete(id);
      try { if (bc) bc.postMessage({type: "blobs", ids: [id]}); } catch(e){}
      if (NUV) NUV.mudou();
    },
    list: async function(){
      await ready();
      var tx = idb.transaction("blobs", "readonly");
      var all = await req2p(tx.objectStore("blobs").getAll());
      var total = all.reduce(function(s, r){ return s + (r.size || 0); }, 0);
      return {assets: all.map(function(r){ return {id: r.id, url: blobUrls.get(r.id), sizeBytes: r.size, contentType: r.type}; }), usage: {bytes: total}};
    }
  };

  /* ---------- peças internas para a camada de nuvem (ng-nuvem.js) ---------- */
  function interno(){
    var ST = function(nome, modo){ return idb.transaction(nome, modo || "readonly"); };
    function bloboUrl(id, blob){ if (blobUrls.has(id)) URL.revokeObjectURL(blobUrls.get(id)); blobUrls.set(id, URL.createObjectURL(blob)); }
    return {
      uid: uidAtual,
      paths: function(){ return Array.from(cache.keys()); },
      docLocal: function(p){ return cache.has(p) ? clone(cache.get(p)) : undefined; },
      filaListar: function(){ return req2p(ST("fila").objectStore("fila").getAll()); },
      filaPut: async function(path, op){ var tx = ST("fila", "readwrite"); tx.objectStore("fila").put({path: path, op: op, t: Date.now()}); await txDone(tx); },
      // remove da fila só se ninguém regravou o item enquanto enviávamos (compara o carimbo t)
      filaRemover: async function(path, t){
        var tx = ST("fila", "readwrite"), st = tx.objectStore("fila"), cur = await req2p(st.get(path));
        if (cur && cur.t === t) st.delete(path);
        await txDone(tx);
      },
      metaGet: async function(k){ var r = await req2p(ST("meta").objectStore("meta").get(k)); return r ? r.v : undefined; },
      metaSet: async function(k, v){ var tx = ST("meta", "readwrite"); tx.objectStore("meta").put({k: k, v: v}); await txDone(tx); },
      // aplica uma mudança vinda da nuvem; recusa se houver envio pendente desse caminho (o que está no aparelho vence até ser enviado)
      aplicarRemoto: async function(path, data){
        var tx = idb.transaction(["docs", "fila"], "readwrite");
        var pend = await req2p(tx.objectStore("fila").get(path));
        if (pend) { await txDone(tx); return false; }
        if (data === undefined) tx.objectStore("docs").delete(path);
        else tx.objectStore("docs").put({path: path, data: clone(data), updatedAt: Date.now()});
        await txDone(tx);
        if (data === undefined) cache.delete(path); else cache.set(path, clone(data));
        notifica([path]);
        try { if (bc) bc.postMessage({type: "docs", paths: [path]}); } catch(e){}
        return true;
      },
      blobIds: async function(){ return (await req2p(ST("blobs").objectStore("blobs").getAllKeys())); },
      blobTem: function(id){ return blobUrls.has(id); },
      blobGet: async function(id){ var r = await req2p(ST("blobs").objectStore("blobs").get(id)); return r ? r.blob : null; },
      blobPutRemoto: async function(id, blob){
        var tx = ST("blobs", "readwrite");
        tx.objectStore("blobs").put({id: id, blob: blob, type: blob.type, size: blob.size, criadoEm: Date.now()});
        await txDone(tx);
        bloboUrl(id, blob);
        try { if (bc) bc.postMessage({type: "blobs", ids: [id]}); } catch(e){}
        var fp = []; cache.forEach(function(d, p){ if (p.indexOf("fotos/") === 0 && d && d.assetId === id) fp.push(p); });
        notifica(fp);
      },
      // lê o banco antigo ("bff", de antes do login), sem criar um novo se ele não existir
      lerLegado: function(){
        return new Promise(function(res){
          var criou = false, r;
          try { r = indexedDB.open("bff"); } catch(e){ res(null); return; }
          r.onupgradeneeded = function(){ criou = true; try { r.transaction.abort(); } catch(e){} };
          r.onerror = function(){ if (criou) { try { indexedDB.deleteDatabase("bff"); } catch(e){} } res(null); };
          r.onsuccess = async function(){
            try {
              var d = r.result;
              if (!d.objectStoreNames.contains("docs")) { d.close(); res(null); return; }
              var tx = d.transaction(["docs", "blobs"], "readonly");
              var docs = await req2p(tx.objectStore("docs").getAll());
              var blobs = d.objectStoreNames.contains("blobs") ? await req2p(tx.objectStore("blobs").getAll()) : [];
              d.close(); res({docs: docs, blobs: blobs});
            } catch(e){ res(null); }
          };
        });
      },
      // copia o legado para a conta e enfileira tudo para envio
      importarLegado: async function(leg){
        for (var i = 0; i < leg.docs.length; i++) {
          var d = leg.docs[i], tx = idb.transaction(["docs", "fila"], "readwrite");
          tx.objectStore("docs").put({path: d.path, data: d.data, updatedAt: Date.now()});
          tx.objectStore("fila").put({path: d.path, op: "set", t: Date.now()});
          await txDone(tx); cache.set(d.path, clone(d.data));
        }
        for (var j = 0; j < leg.blobs.length; j++) {
          var b = leg.blobs[j], tx2 = idb.transaction(["blobs", "fila"], "readwrite");
          tx2.objectStore("blobs").put(b);
          tx2.objectStore("fila").put({path: "blob:" + b.id, op: "bset", t: Date.now()});
          await txDone(tx2); bloboUrl(b.id, b.blob);
        }
      },
      apagarTudoLocal: async function(){ try { idb.close(); } catch(e){} await new Promise(function(res){ var q = indexedDB.deleteDatabase(DB_NAME); q.onsuccess = q.onerror = q.onblocked = function(){ res(); }; }); }
    };
  }

  /* ---------- downloads (fora do Claude o <a download> funciona normalmente) ---------- */
  var downloads = {
    save: async function(o){
      var blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url; a.download = o.filename || "arquivo";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function(){ URL.revokeObjectURL(url); }, 4000);
    }
  };

  /* ---------- ponte usada pelo app (fotoSrc, backup com fotos) ---------- */
  function blobToDataUrl(b){
    return new Promise(function(res, rej){ var r = new FileReader(); r.onload = function(){ res(r.result); }; r.onerror = function(){ rej(r.error); }; r.readAsDataURL(b); });
  }
  window.bffRuntime = {
    standalone: true,
    version: NUV ? "B1" : "A1",
    blobUrl: function(id){ return blobUrls.get(id) || ""; },
    // devolve {id: "data:image/jpeg;base64,..."} das fotos pedidas (para o backup .json)
    exportarFotos: async function(ids){
      await ready();
      var out = {}, tx = idb.transaction("blobs", "readonly"), st = tx.objectStore("blobs");
      for (var i = 0; i < ids.length; i++) {
        var r = await req2p(st.get(ids[i]));
        if (r) out[ids[i]] = await blobToDataUrl(r.blob);
      }
      return out;
    },
    // recebe {id: dataURL}; só aceita imagens e ids de 32 hex; não sobrescreve o que já existe
    importarFotos: async function(map){
      await ready();
      var n = 0, novos = [];
      for (var id in map) {
        if (!/^[0-9a-f]{32}$/.test(id)) continue;
        var m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+\/=]+)$/.exec(String(map[id]));
        if (!m || blobUrls.has(id)) continue;
        var bin = atob(m[2]), u8 = new Uint8Array(bin.length);
        for (var k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
        var blob = new Blob([u8], {type: m[1]});
        var tx = idb.transaction("blobs", "readwrite");
        tx.objectStore("blobs").put({id: id, blob: blob, type: blob.type, size: blob.size, criadoEm: Date.now()});
        await txDone(tx);
        blobUrls.set(id, URL.createObjectURL(blob));
        novos.push(id); n++;
      }
      try { if (bc && novos.length) bc.postMessage({type: "blobs", ids: novos}); } catch(e){}
      return n;
    }
  };

  // ---- diagnóstico local: guarda os últimos erros NESTE aparelho (nada é enviado). Se um dia houver RUM (window.DD_RUM), repassa.
  var ERROS_CHAVE = "ng-erros";
  function lerErros(){ try { var v = JSON.parse(localStorage.getItem(ERROS_CHAVE) || "[]"); return Array.isArray(v) ? v : []; } catch(e){ return []; } }
  function reportar(err, ctx){
    try {
      var msg = String((err && err.message) || err || "erro").slice(0, 200);
      var pilha = String((err && err.stack) || "").split("\n").slice(0, 5).map(function(l){ return l.replace(/https?:\/\/[^\/\s)]+/g, ""); }).join("\n").slice(0, 600);
      var lista = lerErros(), ult = lista[lista.length - 1], agora = Date.now();
      if (ult && ult.m === msg && ult.c === (ctx || "")) { ult.n = (ult.n || 1) + 1; ult.t = agora; }
      else lista.push({t: agora, c: ctx || "", m: msg, s: pilha, n: 1});
      localStorage.setItem(ERROS_CHAVE, JSON.stringify(lista.slice(-30)));
      if (window.DD_RUM && typeof window.DD_RUM.addError === "function") window.DD_RUM.addError(err, {contexto: ctx || ""});
    } catch(e){}
  }
  window.reportar = reportar;
  window.ngErros = {
    listar: lerErros,
    limpar: function(){ try { localStorage.removeItem(ERROS_CHAVE); } catch(e){} },
    texto: function(){
      var linhas = ["NG+ · relatório de diagnóstico", "gerado em " + new Date().toISOString(), "navegador: " + String(navigator.userAgent).slice(0, 160), "online: " + (navigator.onLine !== false), ""];
      var l = lerErros();
      if (!l.length) linhas.push("(nenhum erro registrado)");
      l.forEach(function(x){ linhas.push(new Date(x.t).toISOString() + " · " + (x.c || "-") + " · x" + (x.n || 1) + "\n" + x.m + (x.s ? "\n" + x.s : "") + "\n"); });
      return linhas.join("\n");
    }
  };
  window.addEventListener("error", function(ev){
    if (ev && ev.filename && ev.filename.indexOf(location.origin) !== 0) return;      // ignora scripts de extensões
    if (ev && /ResizeObserver loop/.test(String(ev.message))) return;
    reportar((ev && ev.error) || (ev && ev.message), "janela");
  });
  window.addEventListener("unhandledrejection", function(ev){ reportar(ev && ev.reason, "promessa"); });

  // ---- aviso "Nova versão disponível": o service worker novo assume sozinho; a página só recarrega se a pessoa pedir
  function avisaNovaVersao(){
    if (document.getElementById("ng-atualiza")) return;
    var box = document.createElement("div");
    box.id = "ng-atualiza"; box.className = "ng-atualiza"; box.setAttribute("role", "status");
    var tx = document.createElement("span"); tx.textContent = "Nova versão disponível.";
    var ok = document.createElement("button"); ok.type = "button"; ok.className = "btn small primary"; ok.textContent = "Atualizar";
    var dp = document.createElement("button"); dp.type = "button"; dp.className = "btn small ghost"; dp.textContent = "Depois";
    ok.addEventListener("click", function(){ location.reload(); });
    dp.addEventListener("click", function(){ box.remove(); });
    box.appendChild(tx); box.appendChild(ok); box.appendChild(dp);
    (document.body || document.documentElement).appendChild(box);
  }
  window.ngAvisaNovaVersao = avisaNovaVersao;

  // abre sem internet depois da 1ª visita (só em https ou localhost)
  try {
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
      var tinhaControle = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", function(){
        if (tinhaControle) avisaNovaVersao();        // 1ª instalação não conta: só troca de versão
        tinhaControle = true;
      });
      window.addEventListener("load", function(){
        navigator.serviceWorker.register("sw.js").then(function(reg){
          var checa = function(){ try { reg.update().catch(function(){}); } catch(e){} };
          document.addEventListener("visibilitychange", function(){ if (document.visibilityState === "visible") checa(); });
          setInterval(checa, 3600000);
        }).catch(function(){});
      });
    }
  } catch(e){}

  window.claude = {
    use: async function(name){
      if (name === "downloads") return downloads;
      if (name !== "db" && name !== "assets") return null;
      try { await ready(); } catch(e){ return null; }
      return name === "db" ? db : assets;
    }
  };
})();
