// Teste do cardápio da semana no navegador. Uso: (na pasta site) python3 -m http.server 8765 &  node cardapio-e2e.js http://localhost:8765
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8765') + '/index.html';
const SHOT = process.argv[3] || '';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('ng_dev_semnuvem','1'); localStorage.setItem('ng_recup_pulo','9999-12-31'); }catch(e){} });   // chave de teste do app: sem nuvem/login em localhost
  const p = await ctx.newPage(); p.setDefaultTimeout(8000);
  const errs = []; p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CE ' + m.text()); });
  await p.goto(URL_); await p.waitForTimeout(1200);
  const hoje = iso(Date.now());
  await p.evaluate(async (hoje) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.cd', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, criadoEm: hoje });
    await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
  }, hoje);
  await p.reload(); await p.waitForTimeout(1800);
  await p.click('#tab-dieta'); await p.waitForTimeout(600);
  const body = () => p.evaluate(() => (document.getElementById('cardapio-body') || {}).innerText || '');
  let txt = await body();
  t('card aparece com 7 dias', await p.locator('.cdp-day').count() === 7);
  t('refeições da rotina padrão (marmita = 5)', await p.locator('.cdp-meal').count() === 5);
  t('chips de total do dia', await p.locator('.cdp-tchip').count() === 4);
  t('lista de compras existe', /Lista de compras da semana/.test(txt));
  // trocar de dia não refaz a aba e mantém foco
  await p.click('.cdp-day[data-v="2"]'); await p.waitForTimeout(200);
  t('dia 3 (descanso) selecionado', await p.locator('.cdp-day.on').getAttribute('data-v') === '2' && /descanso/.test(await p.locator('.cdp-day.on').innerText()));
  // trocar rotina
  await p.click('.cdp-chip[data-cdp="rotina"][data-v="corrido"]'); await p.waitForTimeout(400);
  t('rotina corrido = 4 refeições', await p.locator('.cdp-meal').count() === 4);
  // jeito vegano + sem lactose + sem glúten: nenhum alimento proibido
  await p.click('.cdp-chip[data-cdp="jeito"][data-v="vegan"]'); await p.waitForTimeout(300);
  await p.click('.cdp-chip[data-cdp="restr"][data-v="lactose"]'); await p.waitForTimeout(300);
  await p.click('.cdp-chip[data-cdp="restr"][data-v="gluten"]'); await p.waitForTimeout(300);
  txt = await body();
  t('vegano sem carne/ovo/queijo/iogurte/whey/pão', !/frango|patinho|acém|sardinha|abadejo|pintado|ovo|queijo|iogurte|whey|pão|aveia/i.test(await p.locator('.cdp-meals').innerText()));
  t('nota do vegano visível', /vitamina B12/.test(txt));
  // salvo em settings.cardapio
  const salvo = await p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/settings').get(); return d.exists ? d.data().cardapio : null; });
  t('escolhas salvas em settings.cardapio', salvo && salvo.jeito === 'vegan' && salvo.rotina === 'corrido' && salvo.restricoes.lactose && salvo.restricoes.gluten, JSON.stringify(salvo));
  await p.reload(); await p.waitForTimeout(1800); await p.click('#tab-dieta'); await p.waitForTimeout(500);
  t('escolhas persistem após reload', await p.locator('.cdp-chip.on[data-v="vegan"]').count() === 1 && await p.locator('.cdp-meal').count() === 4);
  // lista de compras abre
  await p.click('.cdp-shop summary'); await p.waitForTimeout(200);
  t('lista de compras abre com itens', await p.locator('.cdp-shop .cdp-it').count() > 5);
  // sem rolagem horizontal no celular
  t('sem rolagem horizontal (390 px)', await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  if (SHOT) { await p.locator('#cardapio-card').scrollIntoViewIfNeeded(); await p.locator('#cardapio-card').screenshot({ path: SHOT }); }
  t('sem erros de JS', errs.length === 0, errs.join(' | '));
  console.log(ok + ' ok, ' + bad + ' falhas'); await b.close(); process.exit(bad ? 1 : 0);
})();
