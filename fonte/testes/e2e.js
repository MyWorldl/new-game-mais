// Teste ponta-a-ponta do pacote standalone (Etapa A). Uso: node e2e.js http://localhost:8765
const { chromium } = require('playwright');
const fs = require('fs');
const URL_ = (process.argv[2]||'http://localhost:8765')+'/index.html';
let ok=0, bad=0; const t=(n,c,x='')=>{ (c?ok++:bad++); console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:'')); };
const iso = d=>{ const x=new Date(d); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
// PNG 1x1 vermelho
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');
(async()=>{
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport:{width:400,height:850}, acceptDownloads:true});
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PE '+e.message)); p.on('console',m=>{ if(m.type()==='error') errs.push('CE '+m.text()); });
  await p.goto(URL_); await p.waitForTimeout(1500);
  t('adaptador instalado', await p.evaluate(()=>!!window.bffRuntime && !!window.claude));
  t('1ª abertura mostra onboarding', await p.evaluate(()=>!!document.querySelector('.modal-backdrop')));

  // grava via mesma API que o app usa
  const hoje = iso(Date.now());
  await p.evaluate(async (hoje)=>{
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({nomeCompleto:'Teste Standalone',nomeUsuario:'teste.sa',sexo:'M',idade:30,alturaCm:178,ativo:true,nivelAtividade:'ativo',objetivo:'manutencao',pesoMetaKg:80,criadoEm:hoje});
    await db.doc('medicoes/'+hoje).set({data:hoje,pesoKg:82.4,cinturaCm:90,quadrilCm:100});
    await db.doc('checkins/'+hoje).set({treinou:true,ts:Date.now()});
  }, hoje);
  await p.reload(); await p.waitForTimeout(1800);
  t('após reload: sem onboarding (perfil persistiu)', await p.evaluate(()=>!document.querySelector('.modal-backdrop')));
  const dump = async ()=> p.evaluate(async ()=>{ const db=await window.claude.use('db'); const o={}; for(const c of ['checkins','medicoes','fotos']){ const s=await db.collection(c).get(); o[c]=s.docs.map(d=>d.id); } const pf=await db.doc('config/perfil').get(); o.perfil=pf.exists&&pf.data().nomeUsuario; return o; });
  let d = await dump();
  t('dados lidos do IndexedDB', d.perfil==='teste.sa' && d.checkins.includes(hoje) && d.medicoes.includes(hoje), JSON.stringify(d));
  await p.locator('.bottomnav [data-tab="corpo"]').first().click(); await p.waitForTimeout(500);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(x=>x.open=true));
  const txtCorpo = await p.evaluate(()=>(document.getElementById('tabela-medicoes')||document.body).innerText + ' ' + (document.getElementById('m-peso')||{}).value);
  t('aba Corpo mostra a medição salva (82,4)', /82[,.]4/.test(txtCorpo), txtCorpo.replace(/\s+/g,' ').slice(0,120));

  // ---- foto pela UI real ----
  await p.evaluate(()=>{ const bt=[...document.querySelectorAll('[data-tab],[data-view],.bottomnav button,.bottomnav a')]; });
  // vai para a aba onde está #btn-add-foto
  const abas = await p.evaluate(()=>[...document.querySelectorAll('.bottomnav [data-tab], .bottomnav button')].map(x=>x.dataset.tab||x.textContent.trim()));
  console.log('abas:', abas.join(' | '));
  const achouBtn = async ()=> p.evaluate(()=>{ const b=document.getElementById('btn-add-foto'); return !!b && b.offsetParent!==null; });
  if(!(await achouBtn())){
    const n = await p.locator('.bottomnav button, .bottomnav a').count();
    for(let i=0;i<n && !(await achouBtn());i++){ await p.locator('.bottomnav button, .bottomnav a').nth(i).click().catch(()=>{}); await p.waitForTimeout(300); }
  }
  // o botão pode estar em "Ver mais" ou card recolhido: força input direto
  await p.setInputFiles('#foto-input', {name:'f.png', mimeType:'image/png', buffer:PNG});
  await p.waitForTimeout(1200);
  d = await dump();
  t('foto gravada (registro fotos/<id>)', d.fotos.length===1, JSON.stringify(d.fotos));
  const fotoInfo = await p.evaluate(async ()=>{ const db=await window.claude.use('db'); const s=await db.collection('fotos').get(); const f=s.docs[0].data(); return {assetId:f.assetId, url: window.bffRuntime.blobUrl(f.assetId)}; });
  t('foto tem assetId 32 hex e URL local', /^[0-9a-f]{32}$/.test(fotoInfo.assetId||'') && fotoInfo.url.startsWith('blob:'));
  await p.reload(); await p.waitForTimeout(1800);
  const fotoInfo2 = await p.evaluate(async ()=>{ const db=await window.claude.use('db'); const s=await db.collection('fotos').get(); const f=s.docs[0].data(); return window.bffRuntime.blobUrl(f.assetId); });
  t('foto sobrevive ao reload', fotoInfo2.startsWith('blob:'));
  const imgOk = await p.evaluate(async ()=>{ const imgs=[...document.querySelectorAll('img')].filter(i=>i.src.startsWith('blob:')); return imgs.map(i=>i.complete && i.naturalWidth>0); });
  await p.locator('.bottomnav [data-tab="corpo"]').first().click(); await p.waitForTimeout(500);
  await p.evaluate(()=>document.querySelectorAll('details').forEach(x=>x.open=true)); await p.waitForTimeout(400);
  const imgOk2 = await p.evaluate(()=>[...document.querySelectorAll('img')].filter(i=>i.src.startsWith('blob:')).map(i=>i.complete && i.naturalWidth>0));
  t('foto aparece renderizada na tela Corpo', imgOk2.length>=1 && imgOk2.every(Boolean), JSON.stringify(imgOk2));

  // ---- backup (via botão real) ----
  const [dl] = await Promise.all([ p.waitForEvent('download'), p.evaluate(()=>document.getElementById('cfg-export-btn').click()) ]);
  const f1 = '/tmp/bff-backup.json'; await dl.saveAs(f1);
  const bk = JSON.parse(fs.readFileSync(f1,'utf8'));
  t('backup tem perfil/medições/check-ins', bk.perfil && bk.medicoes[hoje] && bk.checkins[hoje]);
  t('backup tem fotos + fotosArquivos', Object.keys(bk.fotos).length===1 && Object.keys(bk.fotosArquivos||{}).length===1 && /^data:image\//.test(Object.values(bk.fotosArquivos)[0]));
  t('nome do arquivo ritmo-de-ferro-dados-*.json', /^ritmo-de-ferro-dados-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());

  // ---- limpa tudo (como "limpar dados do site") e restaura ----
  await p.evaluate(()=>new Promise(r=>{ const q=indexedDB.deleteDatabase('bff'); q.onsuccess=q.onerror=q.onblocked=()=>r(); }));
  const ctx2 = await b.newContext({viewport:{width:400,height:850}}); const p2 = await ctx2.newPage();
  p2.on('pageerror',e=>errs.push('PE2 '+e.message));
  await p2.goto(URL_); await p2.waitForTimeout(1500);
  t('contexto limpo volta ao onboarding', await p2.evaluate(()=>!!document.querySelector('.modal-backdrop')));
  await p2.evaluate(()=>{ document.querySelectorAll('.modal-backdrop').forEach(x=>x.remove()); });
  await p2.setInputFiles('#cfg-import-file', f1); await p2.waitForTimeout(600);
  const temPainel = await p2.evaluate(()=>{ const x=document.getElementById('import-panel'); return x && !x.hidden ? x.innerText : ''; });
  t('painel de importação aparece e cita restauração das imagens', /imagens e elas serão restauradas/.test(temPainel), temPainel.replace(/\n/g,' | ').slice(0,160));
  await p2.evaluate(()=>document.getElementById('import-confirm').click()); await p2.waitForTimeout(1500);
  const d2 = await p2.evaluate(async ()=>{ const db=await window.claude.use('db'); const o={}; for(const c of ['checkins','medicoes','fotos']){ const s=await db.collection(c).get(); o[c]=s.docs.map(d=>d.id); } const pf=await db.doc('config/perfil').get(); o.perfil=pf.exists&&pf.data().nomeUsuario; const f=(await db.collection('fotos').get()).docs[0]; o.url = f? window.bffRuntime.blobUrl(f.data().assetId):''; return o; });
  t('restauração: perfil, check-in, medição', d2.perfil==='teste.sa' && d2.checkins.includes(hoje) && d2.medicoes.includes(hoje));
  t('restauração: foto e imagem', d2.fotos.length===1 && d2.url.startsWith('blob:'));
  await p2.reload(); await p2.waitForTimeout(1500);
  t('após restaurar+reload: sem onboarding', await p2.evaluate(()=>!document.querySelector('.modal-backdrop')));

  // ---- 2 abas: sincroniza via BroadcastChannel ----
  const p3 = await ctx2.newPage(); await p3.goto(URL_); await p3.waitForTimeout(1200);
  await p2.evaluate(async ()=>{ const db=await window.claude.use('db'); await db.doc('medicoes/2020-01-01').set({data:'2020-01-01',pesoKg:77}); });
  await p3.waitForTimeout(500);
  const visto = await p3.evaluate(async ()=>{ const db=await window.claude.use('db'); return (await db.doc('medicoes/2020-01-01').get()).exists; });
  t('2ª aba enxerga gravação da 1ª (BroadcastChannel)', visto);

  // ---- offline com service worker ----
  const p4 = await ctx2.newPage(); await p4.goto(URL_); await p4.waitForTimeout(2500);
  const swOk = await p4.evaluate(async()=>{ const r=await navigator.serviceWorker.getRegistration(); return !!(r && (r.active||r.installing||r.waiting)); });
  t('service worker registrado', swOk);
  await p4.reload(); await p4.waitForTimeout(1500);
  await ctx2.setOffline(true);
  await p4.reload().catch(()=>{}); await p4.waitForTimeout(1800);
  t('abre offline e mantém os dados', await p4.evaluate(async()=>{ if(!window.claude) return false; const db=await window.claude.use('db'); return (await db.doc('config/perfil').get()).exists; }));
  await ctx2.setOffline(false);
  t('manifest válido', await p4.evaluate(async()=>{ const j=await (await fetch('manifest.webmanifest')).json(); return j.name==='Best Friends Forever' && j.icons.length===2; }));
  t('sem erros de JS/console', errs.length===0, errs.join(' || ').slice(0,300));
  console.log(`\n${ok} ok, ${bad} falhas`);
  await b.close(); process.exit(bad?1:0);
})();
