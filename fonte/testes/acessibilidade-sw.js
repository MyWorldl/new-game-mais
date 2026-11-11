// NG+ · teste de acessibilidade e service worker (skip link, landmarks, trilha por teclado, cache/offline). Uso: python3 -m http.server 8792 --directory site  &  node acessibilidade-sw.js
const { chromium } = require('playwright');
let ok=0,bad=0; const t=(n,c,x='')=>{(c?ok++:bad++); console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''));};
(async()=>{
 const VERS=/VERSAO\s*=\s*"([^"]+)"/.exec(await (await fetch('http://localhost:8792/sw.js')).text())[1];
 const b=await chromium.launch(); const ctx=await b.newContext({viewport:{width:1100,height:800},serviceWorkers:'allow'});
 await ctx.addInitScript(()=>{try{localStorage.setItem('ng_dev_semnuvem','1');localStorage.setItem('ng_test_hooks','1');}catch(e){}});
 const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
 await p.goto('http://localhost:8792/'); await p.waitForTimeout(1200);
 await p.evaluate(async()=>{const db=await window.claude.use('db'); await db.doc('config/perfil').set({nomeCompleto:'Teste',nomeUsuario:'t.t',sexo:'M',idade:30,alturaCm:178,ativo:true,nivelAtividade:'ativo',objetivo:'manutencao',pesoMetaKg:80});});
 await p.reload(); await p.waitForTimeout(2500);
 t('html lang pt-BR', await p.evaluate(()=>document.documentElement.lang)==='pt-BR');
 // skip link: primeiro Tab
 await p.evaluate(()=>{ const e=document.querySelector('.app'); if(e) e.removeAttribute('inert'); document.querySelectorAll('[inert]').forEach(x=>x.removeAttribute('inert')); });
 await p.evaluate(()=>{document.activeElement&&document.activeElement.blur&&document.activeElement.blur(); window.scrollTo(0,0);}); await p.keyboard.press('Tab');
 const sk=await p.evaluate(()=>{const a=document.activeElement; const r=a.getBoundingClientRect(); return {cls:a.className, txt:a.textContent, top:Math.round(r.top)}});
 t('1º Tab foca o skip link e ele aparece na tela', sk.cls==='skip-link' && sk.top>=0, JSON.stringify(sk));
 await p.keyboard.press('Enter'); await p.waitForTimeout(200);
 t('Enter no skip link leva o foco ao <main>', await p.evaluate(()=>document.activeElement.id)==='main');
 t('landmarks: banner, main e nav presentes', await p.evaluate(()=>!!document.querySelector('[role=banner]')&&!!document.querySelector('main')&&!!document.querySelector('nav')));
 // trilha da semana
 await p.evaluate(()=>{const e=document.getElementById('tab-treino'); if(e) e.click();}); await p.waitForTimeout(900);
 const info=await p.evaluate(()=>{const n=[...document.querySelectorAll('#week-trail .week-trail-node')]; return {n:n.length, role:n[0]&&n[0].getAttribute('role'), tab:n[0]&&n[0].tabIndex, al:n[0]&&n[0].getAttribute('aria-label')}});
 t('trilha: 7 dias com role=button, tabindex 0 e aria-label', info.n===7&&info.role==='button'&&info.tab===0&&/—/.test(info.al||''), JSON.stringify(info));
 const antes=await p.evaluate(()=>document.querySelector('#week-trail .week-trail-node.selected')?.dataset.day);
 await p.evaluate(()=>document.querySelectorAll('#week-trail .week-trail-node')[4].focus());
 await p.keyboard.press('Enter'); await p.waitForTimeout(300);
 const dep=await p.evaluate(()=>({sel:document.querySelector('#week-trail .week-trail-node.selected')?.dataset.day, foco:document.activeElement.dataset&&document.activeElement.dataset.day, pressed:document.querySelector('#week-trail .week-trail-node.selected')?.getAttribute('aria-pressed')}));
 t('Enter seleciona o dia e o foco continua nele', dep.sel&&dep.sel===dep.foco&&dep.pressed==='true', JSON.stringify({antes,dep}));
 await p.keyboard.press('ArrowRight'); await p.keyboard.press('Tab'); await p.keyboard.press(' '); await p.waitForTimeout(300);
 // service worker
 const sw=await p.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration(); return !!(r&&r.active)});
 t('service worker ativo', sw);
 const ver=await p.evaluate(async()=>(await caches.keys()));
 t('cache com a versão nova', ver.includes(VERS), JSON.stringify(ver));
 const pre=await p.evaluate(async(v)=>{const c=await caches.open(v); return (await c.keys()).map(r=>new URL(r.url).pathname)}, VERS);
 t('pré-cache tem "/" e não tem /index.html', pre.includes('/')&&!pre.includes('/index.html'), pre.slice(0,4).join(','));
 // 404 não vai para o cache; e depois dele nada de HTML no lugar de JS
 const r404=await p.evaluate(async(v)=>{const r=await fetch('/nao-existe.js'); const c=await caches.open(v); return {s:r.status, noCache: !(await c.match('/nao-existe.js'))}}, VERS);
 t('404 passa e NÃO é guardado no cache', r404.s===404&&r404.noCache, JSON.stringify(r404));
 // offline
 await ctx.setOffline(true);
 const off=await p.evaluate(async()=>{const a=await fetch('/bff-runtime.js').then(r=>({s:r.status,t:r.headers.get('content-type')})).catch(e=>'erro'); const b=await fetch('/nao-existe.js').then(r=>'resp '+r.status).catch(e=>'rede-falhou'); return {a,b}});
 t('offline: arquivo guardado continua saindo do cache', off.a&&off.a.s===200&&/javascript/.test(off.a.t||''), JSON.stringify(off.a));
 t('offline: .js que não está no cache FALHA (não vira HTML)', off.b==='rede-falhou', off.b);
 const nav=await p.goto('http://localhost:8792/?x=1').then(r=>r&&r.status()).catch(e=>'erro '+e.message.slice(0,60));
 await p.waitForTimeout(800);
 t('offline: navegar abre o app a partir de "/"', nav===200 && await p.evaluate(()=>!!document.getElementById('main')), String(nav));
 await ctx.setOffline(false);
 t('sem erros de JS', errs.length===0, errs.slice(0,2).join(' | '));
 console.log(ok+' ok / '+bad+' falhas'); await b.close();
})();
