// Editar rotina: escolher o treino do dia num seletor (modelos do app + Descanso + Personalizado) e cartão de exercício estruturado.
// Uso: node editar-rotina-treino.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 600);
    const go = async s => { await p.evaluate(x => { const e = document.querySelector(x); e && e.click(); }, s); await p.waitForTimeout(600); };
    await go('#tab-treino'); await go('#subtab-treino-plano'); await go('#btn-edit-rotina');

    // ---- seletor do treino
    const base = await p.evaluate(() => {
      const dias = [...document.querySelectorAll('.re-day')];
      const s0 = dias[1].querySelector('.d-treino');   // segunda
      return {
        selects: dias.filter(d => d.querySelector('.d-treino')).length,
        nomesVisiveis: dias.filter(d => !d.querySelector('.d-nome').hidden).length,
        grupos: [...s0.querySelectorAll('optgroup')].map(g => g.label),
        opcoes: s0.querySelectorAll('option').length,
        temDescanso: !!s0.querySelector('option[value="__descanso"]'), temPers: !!s0.querySelector('option[value="__outro"]'),
        custom: dias.filter(d => d.querySelector('.d-treino').closest('.ngs')).length,
        ordem: dias.map(d => d.dataset.key)
      };
    });
    t(L + 'cada dia tem seletor de treino (caixa própria) e o campo de nome fica escondido', base.selects === 7 && base.custom === 7 && base.nomesVisiveis === 0, JSON.stringify(base));
    t(L + 'seletor lista treinos dos modelos + Descanso + Personalizado', base.opcoes >= 12 && base.temDescanso && base.temPers && base.grupos.length >= 4, JSON.stringify(base.grupos) + ' ' + base.opcoes);

    // abrir a caixa de verdade (clique no botão) e conferir a lista
    await p.locator('#re-tabs .re-tab[data-dia="ter"]').click();   // PR B: um dia por vez (abas)
    await p.locator('.re-day').nth(1).locator('.ngs-btn').scrollIntoViewIfNeeded(); await p.locator('.re-day').nth(1).locator('.ngs-btn').click();
    await p.waitForTimeout(500);
    const lista = await p.evaluate(() => { const op = document.querySelector('.ngs-layer .ngs-op.ativo') || document.querySelector('.ngs-layer [role="option"]'); const o = op && op.getBoundingClientRect(); const topo = o && document.elementFromPoint(o.left + o.width / 2, o.top + Math.min(o.height / 2, 10)); return { painel: !!op, itens: document.querySelectorAll('.ngs-layer [role="option"]').length, visivel: !!(topo && topo.closest('.ngs-layer')) }; });
    t(L + 'clicar na caixa abre a lista de treinos, visível por cima da janela', lista.painel && lista.itens >= 12 && lista.visivel, JSON.stringify(lista));
    await p.fill('.ngs-layer .ngs-q', 'Descanso'); await p.waitForTimeout(150);
    await p.locator('.ngs-layer [role="option"]', { hasText: 'Descanso' }).first().click(); await p.waitForTimeout(400);
    const viaMouse = await p.evaluate(() => { const d = document.querySelectorAll('.re-day')[1]; return { fechou: !document.querySelector('.ngs-layer'), modal: !!document.querySelector('.modal'), conf: !d.querySelector('.re-confirma').hidden }; });
    t(L + 'escolher com o mouse fecha a lista, mantém a janela e pede confirmação', viaMouse.fechou && viaMouse.modal && viaMouse.conf, JSON.stringify(viaMouse));
    await p.evaluate(() => document.querySelectorAll('.re-day')[1].querySelector('[data-re-acao="cancelar"]').click());
    // dia com exercícios: escolher outro treino pede confirmação
    const pega = key => p.evaluate(k => { const d = [...document.querySelectorAll('.re-day')].find(x => x.dataset.key === k); return {
      nomes: [...d.querySelectorAll('.ex-nome')].map(i => i.value), nome: d.querySelector('.d-nome').value, conf: !d.querySelector('.re-confirma').hidden,
      resumo: d.querySelector('.re-resumo').textContent, atual: d.querySelector('.ngs-val').textContent.trim() }; }, key);
    const escolhe = (key, valor) => p.evaluate(([k, v]) => { const d = [...document.querySelectorAll('.re-day')].find(x => x.dataset.key === k); const s = d.querySelector('.d-treino'); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, [key, valor]);
    const valorDe = (key, nome) => p.evaluate(([k, n]) => { const d = [...document.querySelectorAll('.re-day')].find(x => x.dataset.key === k); const o = [...d.querySelectorAll('.d-treino option')].find(x => x.textContent.startsWith(n)); return o && o.value; }, [key, nome]);
    const antes = await pega('seg');
    const alvo = await p.evaluate(() => { const s = document.querySelector('.re-day[data-key="seg"] .d-treino'); const o = [...s.querySelectorAll('optgroup option')][0]; return { v: o.value, nome: o.textContent.split(' · ').slice(0, -1).join(' · ') }; });
    await escolhe('seg', alvo.v);
    const conf = await pega('seg');
    t(L + 'dia com exercícios: pede confirmação e nada muda ainda', conf.conf && JSON.stringify(conf.nomes) === JSON.stringify(antes.nomes) && conf.nome === antes.nome, JSON.stringify(conf));
    // cancelar volta a caixa ao treino atual
    await p.evaluate(() => document.querySelector('.re-day[data-key="seg"] [data-re-acao="cancelar"]').click());
    const canc = await pega('seg');
    t(L + 'cancelar mantém tudo e a caixa volta ao treino atual', !canc.conf && canc.nome === antes.nome && canc.atual.includes(antes.nome) && canc.nomes.length === antes.nomes.length, JSON.stringify(canc));
    // só renomear
    await escolhe('seg', alvo.v);
    await p.evaluate(() => document.querySelector('.re-day[data-key="seg"] [data-re-acao="renomear"]').click());
    const ren = await pega('seg');
    t(L + 'só renomear troca o nome e preserva os exercícios', !ren.conf && ren.nome === alvo.nome && JSON.stringify(ren.nomes) === JSON.stringify(antes.nomes) && ren.atual.includes(alvo.nome), JSON.stringify(ren));
    // trocar de verdade
    const alvo2 = await p.evaluate(() => { const s = document.querySelector('.re-day[data-key="seg"] .d-treino'); const o = [...s.querySelectorAll('optgroup option')].filter(x => x.value.indexOf('__') !== 0)[1]; return { v: o.value, nome: o.textContent.split(' · ').slice(0, -1).join(' · '), n: Number(o.textContent.split(' · ').pop().replace(/\D/g, '')) }; });
    await escolhe('seg', alvo2.v);
    await p.evaluate(() => document.querySelector('.re-day[data-key="seg"] [data-re-acao="trocar"]').click());
    const tr = await pega('seg');
    t(L + 'trocar substitui pelos exercícios do treino escolhido', tr.nome === alvo2.nome && tr.nomes.length === alvo2.n && tr.nomes.every(Boolean) && JSON.stringify(tr.nomes) !== JSON.stringify(antes.nomes), JSON.stringify(tr));
    t(L + 'resumo do dia mostra exercícios e séries', /\d+ exercícios? · \d+ séries? no total/.test(tr.resumo), tr.resumo);
    // descanso num dia com exercícios: confirma e desliga o dia
    await escolhe('seg', '__descanso');
    const dc = await pega('seg');
    t(L + 'Descanso também pede confirmação quando há exercícios', dc.conf);
    await p.evaluate(() => document.querySelector('.re-day[data-key="seg"] [data-re-acao="trocar"]').click());
    const dc2 = await p.evaluate(() => { const d = document.querySelector('.re-day[data-key="seg"]'); return { off: d.classList.contains('off'), ativo: d.querySelector('.d-ativo').checked, n: d.querySelectorAll('.ex-entry').length, nome: d.querySelector('.d-nome').value }; });
    t(L + 'Descanso remove exercícios e marca o dia como folga', dc2.off && !dc2.ativo && dc2.n === 0 && dc2.nome === 'Descanso', JSON.stringify(dc2));
    // dia vazio: escolher treino aplica direto, sem confirmação, e liga o dia
    const novo = await valorDe('seg', alvo2.nome);
    await escolhe('seg', novo);
    const dv = await p.evaluate(() => { const d = document.querySelector('.re-day[data-key="seg"]'); return { conf: !d.querySelector('.re-confirma').hidden, ativo: d.querySelector('.d-ativo').checked, n: d.querySelectorAll('.ex-entry').length }; });
    t(L + 'dia vazio: aplica direto (sem confirmar) e liga o dia', !dv.conf && dv.ativo && dv.n === alvo2.n, JSON.stringify(dv));
    // personalizado: revela o campo de nome e preserva exercícios
    await escolhe('seg', '__outro');
    const pe = await p.evaluate(() => { const d = document.querySelector('.re-day[data-key="seg"]'); const i = d.querySelector('.d-nome'); i.value = 'Meu treino X'; i.dispatchEvent(new Event('input', { bubbles: true })); return { visivel: !i.hidden, n: d.querySelectorAll('.ex-entry').length, atual: d.querySelector('.ngs-val').textContent.trim() }; });
    t(L + 'Personalizado mostra o campo de nome, mantém exercícios e a caixa reflete o nome', pe.visivel && pe.n === alvo2.n && pe.atual.includes('Meu treino X'), JSON.stringify(pe));

    // ---- cartão do exercício
    await p.locator('#re-tabs .re-tab[data-dia="seg"]').click(); await p.waitForTimeout(200);
    const card = await p.evaluate(w => {
      const e = document.querySelector('.re-day[data-key="seg"] .ex-entry'); const r = e.getBoundingClientRect();
      const nome = e.querySelector('.ex-nome').getBoundingClientRect(), rm = e.querySelector('.ex-remove').getBoundingClientRect();
      const peq = [...e.querySelectorAll('button, input')].filter(x => x.getClientRects().length && (x.getBoundingClientRect().height < (w < 600 ? 43.5 : 35.5) || x.getBoundingClientRect().width < 43.5 && !x.classList.contains('muscle-chip')) && x.type !== 'checkbox').map(x => x.className + ':' + Math.round(x.getBoundingClientRect().width) + 'x' + Math.round(x.getBoundingClientRect().height));
      return {
        num: e.querySelector('.ex-num').textContent, rotulos: [...e.querySelectorAll('.ex-f > span, .ex-lbl')].map(x => x.textContent.trim()),
        larguraNome: Math.round(nome.width), numNaLinha: Math.abs((e.querySelector('.ex-num').getBoundingClientRect().top + 16) - (nome.top + nome.height / 2)) < 4, removeNaLinha: Math.abs((rm.top + rm.height / 2) - (nome.top + nome.height / 2)) < 4 && rm.left >= nome.right - 1,
        peq, sw: document.documentElement.scrollWidth - innerWidth, chipsPressed: e.querySelectorAll('.muscle-chip[aria-pressed]').length, nChips: e.querySelectorAll('.muscle-chip').length
      };
    }, w);
    t(L + 'cartão: número, rótulos (Séries/Repetições/Meta total/Músculos/Dica técnica)', card.num === '1' && ['SÉRIES', 'REPETIÇÕES', 'META TOTAL'].every(x => card.rotulos.some(r => r.toUpperCase() === x)) && card.rotulos.some(r => /^músculos trabalhados$/i.test(r)) && card.rotulos.some(r => /^dica técnica/i.test(r)), JSON.stringify(card.rotulos));
    t(L + 'cartão: número, nome e X na mesma linha, nome largo', card.larguraNome >= 180 && card.removeNaLinha && card.numNaLinha, JSON.stringify({ l: card.larguraNome, rm: card.removeNaLinha, num: card.numNaLinha }));
    t(L + 'cartão: alvos ≥ 44 px, chips com aria-pressed e sem rolagem lateral', card.peq.length === 0 && card.chipsPressed === card.nChips && card.sw <= 0, JSON.stringify(card.peq) + ' sw=' + card.sw);
    // numeração acompanha remoção e adição
    await p.evaluate(() => document.querySelector('.re-day[data-key="seg"] .ex-entry .ex-remove').click());
    const num2 = await p.evaluate(() => [...document.querySelectorAll('.re-day[data-key="seg"] .ex-num')].map(x => x.textContent).join(','));
    t(L + 'numeração se reorganiza ao remover', num2 === Array.from({ length: alvo2.n - 1 }, (_, i) => i + 1).join(','), num2);

    // ---- salvar e reabrir: nome personalizado persiste e a caixa mostra "(atual)"
    await p.evaluate(() => document.querySelector('#rotina-save').click()); await p.waitForTimeout(900);
    await go('#btn-edit-rotina');
    const rea = await p.evaluate(() => { const d = document.querySelector('.re-day[data-key="seg"]'); return { atual: d.querySelector('.ngs-val').textContent.trim(), n: d.querySelectorAll('.ex-entry').length, nome: d.querySelector('.d-nome').value }; });
    t(L + 'salvar e reabrir: treino escolhido persiste', rea.nome === 'Meu treino X' && rea.atual.includes('Meu treino X (atual)') && rea.n === alvo2.n - 1, JSON.stringify(rea));
    t(L + 'sem erros de página', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
