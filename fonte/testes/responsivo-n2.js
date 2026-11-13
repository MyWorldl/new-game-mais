// Varredura de responsividade: nenhuma aba estoura a largura em 9 tamanhos de tela (celular pequeno até 1920). Uso: node responsivo-n2.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async()=>{const b=await chromium.launch();
const tamanhos=[[320,568],[360,640],[375,667],[414,896],[667,375],[768,1024],[1024,768],[1366,768],[1920,1080]];
const abas=['painel','treino','dieta','corpo','perfil','config'];
for(const [w,h] of tamanhos){
  const {c,p}=await abre(b,w,'dark',w<1000); await p.setViewportSize({width:w,height:h});
  for(const a of abas){
    await p.evaluate(a=>{const t=document.getElementById('tab-'+a)||document.querySelector('[data-goto="'+a+'"]'); if(t) t.click();},a); await p.waitForTimeout(700);
    const r=await p.evaluate(()=>{const o=[];const W=innerWidth;document.querySelectorAll('body *').forEach(e=>{const s=getComputedStyle(e);if(s.display==='none'||s.visibility==='hidden'||s.position==='fixed')return;const r=e.getBoundingClientRect();if(r.width>0&&r.right>W+1&&!e.closest('[data-rola],.table-wrap,.tbl-scroll,pre,.heat-wrap,svg,.chart-scroll')){let sc=false,n=e.parentElement;while(n){const ov=getComputedStyle(n).overflowX;if(ov==='auto'||ov==='scroll'||ov==='hidden'){sc=true;break}n=n.parentElement}if(!sc)o.push((e.id||e.className||e.tagName).toString().slice(0,40)+' '+Math.round(r.right))}});return {sw:document.documentElement.scrollWidth,W,o:o.slice(0,4)}});
    t(w+'x'+h+' · '+a+': sem rolagem horizontal nem elemento fora da tela', r.sw<=r.W && r.o.length===0, JSON.stringify(r));
  }
  await c.close();
}
await b.close();console.log(`\n${ok} ok, ${bad} falhas`);process.exit(bad?1:0)})();
