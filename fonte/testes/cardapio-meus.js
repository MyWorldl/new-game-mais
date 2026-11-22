// "Meus alimentos" no navegador. Uso: SP=/tmp/sp node fonte/testes/cardapio-meus.js http://localhost:8791
const { chromium } = require('playwright');
const { abreCardapio, escolhe, valorDe } = require('./cardapio-ajuda.js'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const L = '[' + w + '] ';
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.setDefaultTimeout(8000); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text()); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    const hoje = iso(Date.now());
    await p.evaluate(async (hoje) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.mf', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia' });
      await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
    }, hoje);
    await p.reload(); await p.waitForTimeout(1800);
    await abreCardapio(p);
    const salvo = () => p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/settings').get(); return d.exists ? (d.data().cardapio || null) : null; });
    const lista = async () => { await p.evaluate(() => { document.querySelector('.cdp-shop').open = true; }); return p.locator('[data-r="compras"]').innerText(); };

    t(L + 'botão "Meus alimentos" ao lado de "Trocar alimentos"', await p.locator('[data-cdp="meus"]').count() === 1 && /Meus alimentos/.test(await p.locator('[data-cdp="meus"]').innerText()));
    t(L + 'sem escolha: frase do automático', /o app escolhe entre todos/.test(await p.locator('[data-r="meusinfo"]').innerText()));
    const antes = await lista();
    t(L + 'por padrão a lista tem iogurte (o app escolhe)', /Iogurte natural/.test(antes), antes.slice(0, 200));

    await p.click('[data-cdp="meus"]'); await p.waitForTimeout(300);
    const pop = p.locator('.modal'); 
    t(L + 'abre o pop-up com os grupos e tudo marcado', /Meus alimentos/.test(await p.locator('.modal h2').first().innerText()) && await p.locator('[data-meus="alimento"][aria-pressed="false"]').count() === 0 && await p.locator('[data-meus="alimento"]').count() > 40);
    if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('.modal', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t(L + 'axe: pop-up sem violações', v.length === 0, v.join(',')); }

    // desmarca os dois iogurtes
    await p.click('[data-meus="alimento"][data-v="iogurte"]'); await p.waitForTimeout(250);
    t(L + 'desmarcar um alimento grava a escolha', await p.locator('[data-meus="alimento"][data-v="iogurte"]').getAttribute('aria-pressed') === 'false' && Array.isArray((await salvo()).meus) && (await salvo()).meus.indexOf('iogurte') < 0 && (await salvo()).meus.indexOf('iogurteD') >= 0, JSON.stringify((await salvo() || {}).meus));
    t(L + 'foco continua no botão tocado', await p.evaluate(() => document.activeElement && document.activeElement.dataset.v) === 'iogurte');
    await p.click('[data-meus="alimento"][data-v="iogurteD"]'); await p.waitForTimeout(250);
    // grupo: limpa as frutas
    await p.click('[data-meus="grupo-nenhum"][data-v="fruit"]'); await p.waitForTimeout(250);
    t(L + 'Limpar o grupo desliga todas as frutas', await p.locator('[data-meus="alimento"][aria-pressed="true"]').evaluateAll(els => els.every(e => !/Banana|Maçã|Manga|Uva|Mamão|Laranja|Morango/.test(e.textContent))));
    await p.click('[data-meus="grupo-todos"][data-v="fruit"]'); await p.waitForTimeout(250);
    t(L + 'Marcar todos religa o grupo', await p.locator('[data-meus="alimento"][data-v="banana"]').getAttribute('aria-pressed') === 'true');
    await p.click('[data-meus="fechar"]'); await p.waitForTimeout(400);

    const depois = await lista();
    t(L + 'lista de compras sem nenhum iogurte', !/Iogurte/.test(depois), depois.slice(0, 300));
    t(L + 'cardápio dos 7 dias sem iogurte', await (async () => { let ruim = false; for (let d = 0; d < 7; d++) { await p.click('.cdp-day[data-v="' + d + '"]'); await p.waitForTimeout(120); if (/Iogurte/.test(await p.locator('[data-r="refeicoes"]').innerText())) ruim = true; } return !ruim; })());
    t(L + 'frase do card mostra a escolha e a lista avisa a origem', /só os \d+ alimentos/.test(await p.locator('[data-r="meusinfo"]').innerText()) && /Só aparecem alimentos de Meus alimentos/.test(depois));

    // continua valendo depois de recarregar
    await p.reload(); await p.waitForTimeout(1800); await abreCardapio(p);
    t(L + 'escolha sobrevive ao recarregar', !/Iogurte/.test(await lista()) && Array.isArray((await salvo()).meus));

    // favoritos: estrela só nos alimentos marcados; grava em settings.cardapio.favoritos e sobrevive ao recarregar
    await p.click('[data-cdp="meus"]'); await p.waitForTimeout(300);
    const estrela = p.locator('[data-meus="fav"][data-v="salmao"]');
    t(L + 'estrela de favorito aparece nos alimentos marcados, desligada de início', await estrela.count() === 1 && await estrela.getAttribute('aria-pressed') === 'false' && /Favorito: Salmão/.test(await estrela.getAttribute('aria-label')));
    const eb = await estrela.boundingBox();
    t(L + 'estrela tem alvo de toque adequado (≥ 24 px; 44 px no toque)', eb && eb.width >= 24 && eb.height >= 24, JSON.stringify(eb));
    await estrela.click(); await p.waitForTimeout(250);
    t(L + 'tocar na estrela liga o favorito e grava', await p.locator('[data-meus="fav"][data-v="salmao"]').getAttribute('aria-pressed') === 'true' && ((await salvo()).favoritos || []).includes('salmao'));
    t(L + 'tocar na estrela não desmarca o alimento', await p.locator('[data-meus="alimento"][data-v="salmao"]').getAttribute('aria-pressed') === 'true');
    t(L + 'anuncia o favorito no aviso do pop-up', /Favorito: Salmão/.test(await p.locator('[data-meus-msg]').innerText()));
    await p.reload(); await p.waitForTimeout(1800); await abreCardapio(p);
    await p.click('[data-cdp="meus"]'); await p.waitForTimeout(300);
    t(L + 'favorito sobrevive ao recarregar', ((await salvo()).favoritos || []).includes('salmao') && await p.locator('[data-meus="fav"][data-v="salmao"]').getAttribute('aria-pressed') === 'true');
    await p.locator('[data-meus="fav"][data-v="salmao"]').click(); await p.waitForTimeout(200);
    t(L + 'tocar de novo tira o favorito', !((await salvo()).favoritos || []).includes('salmao'));
    await p.click('[data-meus="fechar"]'); await p.waitForTimeout(300);

    // não deixa desmarcar tudo
    await p.click('[data-cdp="meus"]'); await p.waitForTimeout(300);
    for (const g of ['prot', 'carb', 'leg', 'fruit', 'veg', 'fat']) { await p.click('[data-meus="grupo-nenhum"][data-v="' + g + '"]'); await p.waitForTimeout(80); }
    t(L + 'não deixa desmarcar tudo: avisa e mantém ao menos um', /pelo menos um/.test(await p.locator('[data-meus-msg]').innerText()) && await p.locator('[data-meus="alimento"][aria-pressed="true"]').count() >= 1);
    // proteína zerada: aviso do motor no pop-up
    await p.click('[data-meus="auto"]'); await p.waitForTimeout(250);
    t(L + '"Voltar ao automático" limpa a escolha', (await salvo()).meus === null && await p.locator('[data-meus="alimento"][aria-pressed="false"]').count() === 0);
    await p.click('[data-meus="fechar"]'); await p.waitForTimeout(300);
    t(L + 'automático: iogurte volta à lista', /Iogurte natural/.test(await lista()));
    t(L + 'sem erros de página', p.errs.length === 0, p.errs.slice(0, 3).join(' | '));
    await c.close();
  }
  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
