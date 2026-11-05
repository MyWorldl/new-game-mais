/* Service worker do NG+ (New Game+) — só deixa o app abrir sem internet.
   Os DADOS ficam no IndexedDB (bff-runtime.js), não aqui. Para publicar uma versão nova, mude VERSAO. */
const VERSAO = "ng-a1-8";
const ARQUIVOS = ["./", "./index.html", "./bff-runtime.js", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e=>{ e.waitUntil(caches.open(VERSAO).then(c=>c.addAll(ARQUIVOS)).then(()=>self.skipWaiting())); });
self.addEventListener("activate", e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSAO).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener("fetch", e=>{
  const r = e.request;
  if(r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  // rede primeiro (pega versão nova quando há internet); sem internet, usa o que está guardado
  e.respondWith(fetch(r).then(res=>{ const cp = res.clone(); caches.open(VERSAO).then(c=>c.put(r, cp)).catch(()=>{}); return res; }).catch(()=>caches.match(r).then(m=>m || caches.match("./index.html"))));
});
