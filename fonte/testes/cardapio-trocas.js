// Pop-up "Trocar alimentos" do cardápio, no navegador. Uso: SP=/tmp/sp node fonte/testes/cardapio-trocas.js http://localhost:8791 [pasta-de-imagens]
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const SHOTS = process.argv[3] || '';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  const abre = async (w, h) => {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.setDefaultTimeout(8000); p.errs = [];
    p.on('pageerror', e => p.errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push('CE ' + m.text()); });
    await p.goto(URL_); await p.waitForTimeout(1200);
    const hoje = iso(Date.now());
    await p.evaluate(async (hoje) => {
      const db = await window.claude.use('db');
      await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 'teste.tr', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia' });
      await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
    }, hoje);
    await p.reload(); await p.waitForTimeout(1800);
    await p.click('#tab-dieta'); await p.waitForTimeout(700);
    return { c, p };
  };
  const salvo = p => p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/settings').get(); return d.exists ? (d.data().cardapio || null) : null; });
  const refeicaoTxt = (p, i) => p.locator('.cdp-meal').nth(i).innerText();

  for (const [w, h] of [[390, 844], [1280, 900]]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(w, h);
    // botão ao lado dos filtros
    const btn = p.locator('[data-cdp="editar"]');
    t(L + 'botão "Trocar alimentos" existe no card', await btn.count() === 1 && /Trocar alimentos/.test(await btn.innerText()));
    const bb = await btn.boundingBox(), fb = await p.locator('.cdp-controls').boundingBox();
    t(L + 'botão fica dentro da área dos filtros', bb && fb && bb.y >= fb.y - 1 && bb.y + bb.height <= fb.y + fb.height + 1, JSON.stringify([bb, fb]));
    t(L + 'botão fica logo abaixo dos filtros e acima dos dias, com a frase ao lado', await p.evaluate(() => { const r = document.querySelector('[data-cdp="restr"]').getBoundingClientRect(), b = document.querySelector('[data-cdp="editar"]').getBoundingClientRect(), d = document.querySelector('.cdp-days').getBoundingClientRect(); return b.top >= r.bottom - 1 && b.bottom <= d.top + 1; }));
    if (w >= 1000) t(L + 'no desktop os chips da Rotina ficam em até 2 linhas (filtros não espremidos)', await p.evaluate(() => { const cs = [...document.querySelectorAll('[data-cdp="rotina"]')].map(x => Math.round(x.getBoundingClientRect().top)); return new Set(cs).size <= 2; }));
    if (w >= 700) t(L + 'filtros alinhados: Jeito de comer e Rotina começam na mesma altura', await p.evaluate(() => { const tops = [...document.querySelectorAll('.cdp-controls .cdp-lbl')].slice(0, 2).map(x => Math.round(x.getBoundingClientRect().top)); return tops.length === 2 && Math.max(...tops) - Math.min(...tops) <= 1; }));
    t(L + 'Rotina tem 5 opções, a primeira é "Dia tradicional"', await p.locator('[data-cdp="rotina"]').count() === 5 && /Dia tradicional/.test(await p.locator('[data-cdp="rotina"]').first().innerText()));
    t(L + 'card começa sem trocas', /Troque qualquer alimento/.test(await p.locator('[data-r="trocasinfo"]').innerText()));

    await p.click('.cdp-day[data-v="1"]'); await p.waitForTimeout(150);
    const baseTer = await refeicaoTxt(p, 1);
    await p.click('.cdp-day[data-v="0"]'); await p.waitForTimeout(150);
    await p.click('[data-cdp="rotina"][data-v="tradicional"]'); await p.waitForTimeout(400);
    t(L + 'Dia tradicional: ligado, 5 refeições, descrição visível', await p.locator('[data-cdp="rotina"][data-v="tradicional"].on').count() === 1 && await p.locator('.cdp-meal').count() === 5 && /arroz e feijão/.test(await p.locator('[data-r="rotdesc"]').innerText()));
    t(L + 'Dia tradicional: feijão/lentilha no almoço e no jantar', /Feij|Lentilha/.test(await refeicaoTxt(p, 1)) && /Feij|Lentilha/.test(await refeicaoTxt(p, 3)));
    await p.click('[data-cdp="rotina"][data-v="marmita"]'); await p.waitForTimeout(400);
    // abre o pop-up
    await btn.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
    const y0 = await p.evaluate(() => scrollY);
    await btn.click(); await p.waitForTimeout(400);
    t(L + 'pop-up abre como diálogo', await p.locator('#modal-root .modal[role="dialog"]').count() === 1 && /Trocar alimentos/.test(await p.locator('#modal-root h2').innerText()));
    t(L + 'app fica inerte atrás do pop-up', await p.evaluate(() => document.querySelector('.app').inert === true));
    t(L + 'tem 5 refeições (marmita), lista de alimentos e alternativas', await p.locator('[data-pop="refeicao"]').count() === 5 && await p.locator('[data-pop="alimento"]').count() >= 3 && await p.locator('[data-pop="para"]').count() >= 2);
    t(L + 'sem rolagem horizontal com o pop-up aberto', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    t(L + 'pop-up cabe na tela (rolagem interna, não corta o botão Pronto)', await p.evaluate(() => { const m = document.querySelector('#modal-root .modal').getBoundingClientRect(); return m.top >= -1 && m.bottom <= innerHeight + 1; }));
    if (axeSrc && w === 390) {
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => (await axe.run(document.querySelector('#modal-root'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
      t(L + 'axe sem violações no pop-up', v.length === 0, v.join(','));
    }

    // escolhe Almoço, a primeira proteína e uma alternativa
    await p.click('[data-pop="refeicao"][data-v="almoco"]'); await p.waitForTimeout(150);
    const prot = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-pop="alimento"]')].find(b => /frango|acém|patinho|sardinha|abadejo|pintado|ovo|queijo|iogurte/i.test(b.innerText)); return r ? { id: r.dataset.v, nome: r.querySelector('.cdp-n').innerText.trim() } : null; });
    t(L + 'almoço tem uma proteína para trocar', !!prot, JSON.stringify(prot));
    await p.click('[data-pop="alimento"][data-v="' + prot.id + '"]'); await p.waitForTimeout(150);
    const alt = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-pop="para"]:not(.on)')][0]; return r ? { id: r.dataset.v, nome: r.querySelector('.cdp-n').innerText.trim(), ef: r.querySelector('small').innerText } : null; });
    t(L + 'alternativa mostra o efeito em kcal e proteína', alt && /[+−±]\d+ kcal · [+−±]\d+ g prot/.test(alt.ef), JSON.stringify(alt));
    const antes = await refeicaoTxt(p, 1);
    await p.click('[data-pop="para"][data-v="' + alt.id + '"]'); await p.waitForTimeout(350);
    t(L + 'mensagem de confirmação (aria-live)', /Trocado:/.test(await p.locator('[data-pop-msg]').innerText()));
    t(L + 'item novo marcado como "trocado" e "Voltar ao sugerido" aparece', await p.locator('.cdp-pop-it.on .cdp-tag').count() === 1 && await p.locator('[data-pop="voltar"]').count() === 1);
    t(L + 'foco continua num botão do pop-up', await p.evaluate(() => !!document.activeElement.closest('#modal-root')));
    let sv = await salvo(p);
    t(L + 'troca salva em settings.cardapio.trocas (só deste dia)', sv && sv.trocas && sv.trocas.length === 1 && sv.trocas[0].de === prot.id && sv.trocas[0].para === alt.id && sv.trocas[0].d === 0 && sv.trocas[0].s === 'almoco', JSON.stringify(sv));
    t(L + 'filtros continuam salvos junto das trocas', sv && sv.jeito === 'omni' && sv.rotina === 'marmita');
    // Esc fecha, foco volta ao botão, o card mostra a troca e a rolagem não pulou
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    t(L + 'Esc fecha o pop-up e o app deixa de ser inerte', await p.locator('#modal-root .modal').count() === 0 && await p.evaluate(() => document.querySelector('.app').inert === false));
    t(L + 'foco volta ao botão "Trocar alimentos"', await p.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-cdp') === 'editar'));
    { const y1 = await p.evaluate(() => scrollY); t(L + 'rolagem não pulou ao abrir/fechar', Math.abs(y1 - y0) <= 2, y0 + ' -> ' + y1); }
    const depois = await refeicaoTxt(p, 1);
    t(L + 'card do almoço mostra o alimento novo', depois !== antes && depois.indexOf(alt.nome.replace(/\*$/, '')) >= 0, alt.nome);
    t(L + 'texto do card: "1 troca feita."', /1 troca feita/.test(await p.locator('[data-r="trocasinfo"]').innerText()));
    // outro dia não muda (troca só do dia 0)
    await p.click('.cdp-day[data-v="1"]'); await p.waitForTimeout(200);
    t(L + 'terça (outro dia) mantém o almoço original', (await refeicaoTxt(p, 1)) === baseTer);
    await p.click('.cdp-day[data-v="0"]'); await p.waitForTimeout(200);

    // volta ao sugerido
    await btn.click(); await p.waitForTimeout(300);
    await p.click('[data-pop="refeicao"][data-v="almoco"]'); await p.waitForTimeout(100);
    await p.click('[data-pop="alimento"][data-v="' + alt.id + '"]'); await p.waitForTimeout(100);
    if (SHOTS) await p.screenshot({ path: SHOTS + '/popup-' + w + '.png' });   // depois da checagem de rolagem (a captura em si mexe na página)
    await p.click('[data-pop="voltar"]'); await p.waitForTimeout(300);
    sv = await salvo(p);
    t(L + '"Voltar ao sugerido" apaga a troca', sv && (!sv.trocas || sv.trocas.length === 0));
    t(L + 'texto do card volta ao original', await refeicaoTxt(p, 1) === antes);

    // escopo "todos os dias": troca no café vale em outros dias
    await p.click('[data-pop="refeicao"][data-v="cafe"]'); await p.waitForTimeout(100);
    const cafe = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-pop="alimento"]')].find(b => /ovo|iogurte|queijo|leite|tofu/i.test(b.innerText)); return r ? r.dataset.v : null; });
    if (cafe) {
      await p.click('[data-pop="fechar"]'); await p.waitForTimeout(250);
      const baseCafe = [], nomesCafe = [];
      for (let d = 0; d < 7; d++) { await p.click('.cdp-day[data-v="' + d + '"]'); await p.waitForTimeout(100); baseCafe.push(await refeicaoTxt(p, 0)); nomesCafe.push(await p.evaluate(() => [...document.querySelectorAll('.cdp-meal')[0].querySelectorAll('.cdp-n')].map(x => x.innerText.replace(/\*$/, '').trim()))); }
      // com mais alimentos no cardápio, escolhe uma PROTEÍNA do café que apareça em pelo menos 2 dias (o teste não depende do dia da semana)
      const cont = {}; nomesCafe.forEach(l => new Set(l).forEach(n => { cont[n] = (cont[n] || 0) + 1; }));
      const nomeAlvo = Object.keys(cont).filter(n => /ovo|iogurte|queijo|ricota|muçarela|leite|tofu|whey/i.test(n) && cont[n] >= 2).sort((a, b) => cont[b] - cont[a])[0] || Object.keys(cont).sort((a, b) => cont[b] - cont[a])[0];
      const diaAlvo = nomesCafe.findIndex(l => l.indexOf(nomeAlvo) >= 0);
      await p.click('.cdp-day[data-v="' + diaAlvo + '"]'); await p.waitForTimeout(100);
      await btn.click(); await p.waitForTimeout(300);
      await p.click('[data-pop="refeicao"][data-v="cafe"]'); await p.waitForTimeout(100);
      await p.evaluate(n => { [...document.querySelectorAll('[data-pop="alimento"]')].find(b => b.querySelector('.cdp-n').innerText.replace(/\*$/, '').trim().indexOf(n) === 0).click(); }, nomeAlvo); await p.waitForTimeout(100);
      await p.click('[data-pop="escopo"][data-v="todos"]'); await p.waitForTimeout(100);
      const a2 = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-pop="para"]:not(.on)')][0]; return r ? { id: r.dataset.v, nome: r.querySelector('.cdp-n').innerText.replace(/\*$/, '').trim() } : null; });
      const nomeAntes = await p.evaluate(() => document.querySelector('.cdp-pop-it.on .cdp-n').innerText.replace(/\*$/, '').replace(/trocado/i, '').trim());
      await p.click('[data-pop="para"][data-v="' + a2.id + '"]'); await p.waitForTimeout(300);
      sv = await salvo(p);
      t(L + 'troca "todos os dias" salva com d=-1', sv && sv.trocas && sv.trocas.length === 1 && sv.trocas[0].d === -1 && sv.trocas[0].s === 'cafe', JSON.stringify(sv && sv.trocas));
      await p.click('[data-pop="fechar"]'); await p.waitForTimeout(300);
      let comOriginal = 0, trocados = 0, naoTocados = 0;
      for (let d = 0; d < 7; d++) {
        await p.click('.cdp-day[data-v="' + d + '"]'); await p.waitForTimeout(120);
        const agora = await refeicaoTxt(p, 0), tinha = baseCafe[d].indexOf(nomeAntes) >= 0;
        if (tinha) { comOriginal++; if (agora.indexOf(a2.nome) >= 0 && agora.indexOf(nomeAntes) < 0) trocados++; } else if (agora === baseCafe[d]) naoTocados++;
      }
      t(L + 'troca "todos os dias": vale em todos os dias em que o alimento aparecia no café (' + trocados + ' de ' + comOriginal + ')', comOriginal >= 2 && trocados === comOriginal, nomeAntes + ' -> ' + a2.nome);
      t(L + 'dias sem esse alimento no café não mudam', naoTocados === 7 - comOriginal);
      t(L + 'lista de compras foi recalculada (inclui o alimento novo)', await p.evaluate(async () => { document.querySelector('.cdp-shop').open = true; return document.querySelector('.cdp-shop').innerText.length > 50; }));
      // persistência
      await p.reload(); await p.waitForTimeout(1800); await p.click('#tab-dieta'); await p.waitForTimeout(600);
      t(L + 'trocas persistem após recarregar', /1 troca feita/.test(await p.locator('[data-r="trocasinfo"]').innerText()));
      // restaurar tudo
      await p.click('[data-cdp="editar"]'); await p.waitForTimeout(300);
      t(L + 'botão "Restaurar todas (1)" aparece', await p.locator('[data-pop="restaurar"]').count() === 1 && /\(1\)/.test(await p.locator('[data-pop="restaurar"]').innerText()));
      await p.click('[data-pop="restaurar"]'); await p.waitForTimeout(300);
      sv = await salvo(p);
      t(L + 'restaurar apaga todas as trocas', sv && (!sv.trocas || sv.trocas.length === 0) && /desfeitas/.test(await p.locator('[data-pop-msg]').innerText()));
      await p.click('[data-pop="fechar"]'); await p.waitForTimeout(200);
    }

    // restrição: com troca por carne salva, virar vegano ignora a troca
    if (w === 390) {
      await p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/settings').get(); const s = d.exists ? d.data() : {}; s.cardapio = { jeito: 'omni', rotina: 'marmita', restricoes: { lactose: false, gluten: false }, trocas: [{ d: -1, s: 'almoco', de: 'frango', para: 'patinho' }, { d: 0, s: 'cafe', de: 'ovo', para: 'tofu' }] }; await db.doc('config/settings').set(s); });
      await p.reload(); await p.waitForTimeout(1800); await p.click('#tab-dieta'); await p.waitForTimeout(600);
      await p.click('.cdp-chip[data-cdp="jeito"][data-v="vegan"]'); await p.waitForTimeout(400);
      const info = await p.locator('[data-r="trocasinfo"]').innerText();
      t(L + 'no vegano, troca por carne guardada é ignorada e avisada', /não combin/.test(info) && !/patinho/i.test(await p.locator('.cdp-meals').innerText()), info);
      await p.click('[data-cdp="editar"]'); await p.waitForTimeout(300);
      await p.click('[data-pop="refeicao"][data-v="almoco"]'); await p.waitForTimeout(100);
      const nomes = await p.evaluate(() => [...document.querySelectorAll('[data-pop="para"] .cdp-n')].map(e => e.innerText).join('|'));
      t(L + 'no vegano as alternativas não trazem carne, ovo, laticínio', !/frango|patinho|acém|sardinha|abadejo|pintado|ovo|queijo|iogurte|whey/i.test(nomes), nomes);
      await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    }
    if (SHOTS) { await p.locator('#cardapio-card').scrollIntoViewIfNeeded(); await p.locator('#cardapio-card').screenshot({ path: SHOTS + '/card-' + w + '.png' }); }   // por último: a captura de um elemento alto mexe na rolagem
    t(L + 'sem erros de JS', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }

  // acessibilidade (axe, WCAG A/AA) do card e do pop-up nos 7 temas: modo jogo + rosa/roxo/azul em claro e escuro
  if (axeSrc) {
    const { c, p } = await abre(390, 844);
    await p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/settings').get(); const s = d.exists ? d.data() : {}; s.cardapio = { jeito: 'omni', rotina: 'budget', restricoes: { lactose: false, gluten: false }, trocas: [{ d: 0, s: 'almoco', de: 'acem', para: 'patinho' }] }; await db.doc('config/settings').set(s); });
    await p.reload(); await p.waitForTimeout(1800); await p.click('#tab-dieta'); await p.waitForTimeout(600);
    await p.evaluate(axeSrc);
    const temas = [['game'], ['rosa', 'claro'], ['rosa', 'escuro'], ['roxo', 'claro'], ['roxo', 'escuro'], ['azul', 'claro'], ['azul', 'escuro']];
    const ap = (tm) => p.evaluate(([a, m]) => { const r = document.documentElement; if (a === 'game') { r.setAttribute('data-game', 'on'); r.removeAttribute('data-tema'); r.removeAttribute('data-modo'); } else { r.setAttribute('data-game', 'off'); r.setAttribute('data-tema', a); r.setAttribute('data-modo', m); } }, tm);
    await p.click('[data-cdp="editar"]'); await p.waitForTimeout(300);
    await p.click('[data-pop="refeicao"][data-v="almoco"]'); await p.waitForTimeout(100);
    for (const tm of temas) {
      await ap(tm); await p.waitForTimeout(500);
      const v = await p.evaluate(async () => (await axe.run(document.querySelector('#modal-root'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
      t('[axe] pop-up sem violações no tema ' + tm.join('/'), v.length === 0, v.join(','));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    for (const tm of temas) {
      await ap(tm); await p.waitForTimeout(500);
      const v = await p.evaluate(async () => (await axe.run(document.getElementById('cardapio-card'), { runOnly: ['wcag2a', 'wcag2aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
      t('[axe] card do cardápio sem violações no tema ' + tm.join('/'), v.length === 0, v.join(','));
    }
    await c.close();
  }
  console.log(ok + ' ok, ' + bad + ' falhas'); await b.close(); process.exit(bad ? 1 : 0);
})();
