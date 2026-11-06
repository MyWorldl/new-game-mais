/* Service worker do NG+ (New Game+) — só deixa o app abrir sem internet.
   Os DADOS ficam no IndexedDB (bff-runtime.js), não aqui. Para publicar uma versão nova, mude VERSAO. */
const VERSAO = "ng-reset-1";
const ARQUIVOS = ["./", "./index.html", "./bff-runtime.js", "./ng-nuvem.js", "./vendor-supabase.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./fonts/barlow-condensed-latin-500-normal.woff2", "./fonts/barlow-condensed-latin-600-normal.woff2", "./fonts/barlow-condensed-latin-700-normal.woff2", "./fonts/work-sans-latin-wght-normal.woff2", "./fonts/ibm-plex-mono-latin-500-normal.woff2", "./fonts/ibm-plex-mono-latin-600-normal.woff2"];
self.addEventListener("install", e=>{ e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e=>{
  const r = e.request;
  if(r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  // rede primeiro (pega versão nova quando há internet); sem internet, usa o que está guardado
  e.respondWith(fetch(r).then(res=>{ const cp = res.clone(); caches.open(VERSAO).then(c=>c.put(r, cp)).catch(()=>{}); return res; }).catch(()=>caches.match(r).then(m=>m || caches.match("./index.html"))));
});

/* Lembretes de treino (Web Push): o servidor manda {titulo, corpo, url}; o toque abre/foca o app. */
self.addEventListener("push", e=>{
  let d = {}; try{ d = e.data ? e.data.json() : {}; }catch(_){ d = {corpo: e.data ? e.data.text() : ""}; }
  e.waitUntil(self.registration.showNotification(String(d.titulo || "NG+").slice(0, 80), {
    body: String(d.corpo || "").slice(0, 200), icon: "icon-192.png", badge: "icon-192.png", tag: "ng-lembrete", renotify: false, data: {url: d.url || "./"}
  }));
});
self.addEventListener("notificationclick", e=>{
  e.notification.close();
  const alvo = new URL((e.notification.data && e.notification.data.url) || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({type: "window", includeUncontrolled: true}).then(cs=>{
    for(const c of cs){ if(c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus(); }
    return self.clients.openWindow(alvo);
  }));
});
