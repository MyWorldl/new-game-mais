const { chromium } = require('playwright');
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom','seg','ter','qua','qui','sex','sab'];
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
module.exports.abre = async (b, w = 400, modo='dark', toque=false) => {
  const c = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1, colorScheme: modo, ...(toque ? { hasTouch: true, isMobile: true } : {}) });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem','1'); localStorage.setItem('ng_recup_pulo','9999-12-31'); localStorage.setItem('bff_rest_auto','0'); localStorage.setItem('ng_tutorial_visto','1'); } catch(e){} });
  const p = await c.newPage(); p.errs = [];
  p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const dias = []; for (let i = 0; i < 90; i++) dias.push(iso(Date.now() - i*864e5));
  await p.evaluate(async ([dias, MAP]) => {
    const db = await window.claude.use('db');
    const hoje = dias[0];
    await db.doc('config/perfil').set({ nomeCompleto:'Teste', nomeUsuario:'teste.v4', sexo:'M', idade:30, alturaCm:178, ativo:true, nivelAtividade:'ativo', objetivo:'manutencao', experiencia:'intermediario', criadoEm: dias[89] });
    const ex = n => ({ nome:n, series:4, reps:'6-10', metaReps:32, musculos:['peito'] });
    const rot = { seg:['Segunda — A','Supino reto','Desenvolvimento militar com barra','Elevação lateral'], ter:['Perna','Leg press','Agachamento livre'], qua:['Costas','Remada curvada'], qui:['Peito 2','Supino inclinado com halteres'], sex:['Ombros','Elevação lateral'] };
    for (const k of Object.keys(rot)) await db.doc('rotina/'+k).set({ nome: rot[k][0], ativo:true, exercicios: rot[k].slice(1).map(ex) });
    // checkins: treinos nos dias de rotina, cargas variando, séries
    const pesos = { 'Supino reto':[80,82.5,85,87.5,87.5,40], 'Desenvolvimento militar com barra':[30,30,30], 'Leg press':[200,210,220,230,240], 'Agachamento livre':[100,110,120], 'Remada curvada':[60,62.5,65,67.5], 'Supino inclinado com halteres':[30,32,32,28,20], 'Elevação lateral':[12,12,10,9] };
    for (let i = 60; i >= 0; i--) {
      const d = dias[i], k = MAP[new Date(d+'T12:00:00').getDay()];
      if (!rot[k]) continue;
      const c = { data:d, dia:k, concluido: i>0 || false, cargas:{}, sets:{}, progresso:{} };
      const sessao = Math.floor((60-i)/7);
      rot[k].slice(1).forEach((nome, idx) => {
        const arr = pesos[nome]; c.cargas[nome] = arr[Math.min(sessao, arr.length-1)];
        c.sets[idx] = [ {r:10+((sessao+idx)%3)}, {r:10+((sessao+idx)%3)}, {r:9}, {r:8-(idx%2)} ];
        c.progresso[idx] = c.sets[idx].reduce((t,s)=>t+s.r,0);
      });
      if (i%5===0) c.hab = { sono: 6+(i%3), passos: 6000+i*50, cardio: 20, agua: 2.5 };
      else if (i%2===0) c.hab = { sono: 7, passos: 8000 };
      await db.doc('checkins/'+d).set(c);
    }
    // medições semanais
    const med = [[63,86.2,89.5,99.5],[56,86.2,89.4,99.5],[49,86.3,89.3,99.4],[42,86.2,89.3,99.4],[35,86.4,89.5,99.5],[28,86.4,89.5,99.5],[21,86.2,89.3,99.4],[14,86.3,89.3,99.4],[7,74.5,88.5,96.0]];
    for (const [ago, peso, cint, quad] of med) { const d = dias[ago] || dias[89]; await db.doc('medicoes/'+d).set({ pesoKg:peso, cinturaCm:cint, quadrilCm:quad, pescocoCm:38 }); }
  }, [dias, MAP]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p };
};
