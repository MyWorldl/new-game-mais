// Teste da ATUALIZAÇÃO POR NÓ do cardápio (UX-03) no navegador. Uso: node cardapio-nos.js http://localhost:8791
// Prova que um clique não recria os controles: o botão clicado é o mesmo nó (foco mantido), os blocos de controles e de dias não
// recebem nós novos nem removidos, e a lista de compras aberta continua aberta.
const { chromium } = require('playwright');
const { abreCardapio, escolhe, valorDe } = require('./cardapio-ajuda.js');
const URL_ = (process.argv[2] || 'http://localhost:8765') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); } catch (e) {} });
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
  await abreCardapio(p);

  // marca os nós atuais e observa mutações de estrutura nos controles e nos dias
  await p.evaluate(() => {
    const body = document.getElementById('cardapio-body');
    window.__estrutura = { controles: 0, dias: 0, corpo: 0 };
    // o texto das regiões (data-r) pode mudar; botões e grupos não
    const obs = (sel, chave) => { const n = body.querySelector(sel); new MutationObserver(ms => { ms.forEach(m => { if (m.type === 'childList' && !(m.target.closest && m.target.closest('[data-r]'))) window.__estrutura[chave] += m.addedNodes.length + m.removedNodes.length; }); }).observe(n, { childList: true, subtree: true }); };
    obs('.cdp-controls', 'controles'); obs('.cdp-days', 'dias');
    new MutationObserver(ms => { ms.forEach(m => { if (m.type === 'childList' && m.target === body) window.__estrutura.corpo += m.addedNodes.length + m.removedNodes.length; }); }).observe(body, { childList: true });
    body.querySelectorAll('[data-cdp],[data-cdp-sel],[data-cdp-chk]').forEach(n => n.setAttribute('data-marca', (n.dataset.cdp || n.dataset.cdpSel || n.dataset.cdpChk) + ':' + (n.dataset.v || '')));
    body.querySelector('.cdp-multi').setAttribute('data-esqueleto', '1');
    window.__bodyHtmlAntes = body.querySelector('[data-r="refeicoes"]').innerHTML;
  });
  const mesmoNo = async (sel, marca) => p.evaluate(([s, m]) => { const n = document.querySelector(s); return !!n && n.getAttribute('data-marca') === m; }, [sel, marca]);

  // abrir a lista de compras antes de clicar
  await p.click('.cdp-shop summary'); await p.waitForTimeout(100);
  t('lista de compras abriu', await p.locator('.cdp-shop').evaluate(d => d.open));

  // 1) clique em "dia": mesmo botão, foco no botão, refeições mudam, lista segue aberta, controles e dias sem nós novos
  await p.click('.cdp-day[data-v="2"]'); await p.waitForTimeout(250);
  t('dia: o botão clicado é o mesmo nó (não foi recriado)', await mesmoNo('.cdp-day[data-v="2"]', 'dia:2'));
  t('dia: o foco ficou no botão clicado', await p.evaluate(() => document.activeElement && document.activeElement.matches('.cdp-day[data-v="2"]')));
  t('dia: refeições trocaram', await p.evaluate(() => document.querySelector('[data-r="refeicoes"]').innerHTML) !== await p.evaluate(() => window.__bodyHtmlAntes));
  t('dia: lista de compras segue aberta', await p.locator('.cdp-shop').evaluate(d => d.open));
  t('dia: só o dia 3 está ligado', await p.locator('.cdp-day.on').count() === 1 && await p.locator('.cdp-day.on').getAttribute('data-v') === '2' && await p.locator('.cdp-day[data-v="2"]').getAttribute('aria-pressed') === 'true' && await p.locator('.cdp-day[data-v="0"]').getAttribute('aria-pressed') === 'false');

  // 2) clique em jeito/rotina/restrição (passa pelo app: grava e redesenha a Dieta)
  for (const [rot, v] of [['jeito', 'vegan'], ['rotina', 'fora'], ['restr', 'lactose'], ['jeito', 'omni']]) {
    await escolhe(p, rot, v);
    const sel = rot === 'restr' ? `[data-cdp-chk="restr"][data-v="${v}"]` : `[data-cdp-sel="${rot}"]`, marca = rot === 'restr' ? `restr:${v}` : `${rot}:`;
    t(`${rot}=${v}: mesmo campo (não foi recriado)`, await mesmoNo(sel, marca));
    if (rot === 'restr') t(`${rot}=${v}: foco mantido na caixa clicada`, await p.evaluate(s => document.activeElement && document.activeElement.matches(s), sel));
  }
  t('o grupo de restrições continua sendo o mesmo nó do esqueleto', await p.evaluate(() => document.querySelector('.cdp-multi').getAttribute('data-esqueleto') === '1'));
  t('restrição lactose marcada e resumo "1 selecionada"', await valorDe(p, 'restr', 'lactose') && /1 selecionada/.test(await p.locator('[data-r="restrinfo"]').innerText()));
  t('rotina "fora" escolhida (4 refeições)', await valorDe(p, 'rotina') === 'fora' && await p.locator('.cdp-meal').count() === 4);
  t('jeito voltou para onívoro', await valorDe(p, 'jeito') === 'omni');
  const est = await p.evaluate(() => window.__estrutura);
  t('nenhum botão/grupo novo ou removido nos controles (só o texto da descrição muda)', est.controles === 0, JSON.stringify(est));
  t('nenhum nó novo ou removido nos dias', est.dias === 0, JSON.stringify(est));
  t('o corpo do card não foi recriado (esqueleto único)', est.corpo === 0, JSON.stringify(est));
  t('lista de compras aberta durante todas as trocas', await p.locator('.cdp-shop').evaluate(d => d.open));
  t('sem erros de JS/CSP', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`${ok} ok, ${bad} falhas`);
  await b.close(); process.exit(bad ? 1 : 0);
})();
