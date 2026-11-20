// Cardápio da semana (redesenho) e lista de compras: botões em grade, 7 dias numa linha, totais em blocos, caixinhas "já comprei" e exportação em PDF (sem biblioteca).
// Uso: node cardapio-pdf.js http://localhost:8791
const fs = require('fs'), os = require('os'), path = require('path');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const { abreCardapio } = require('./cardapio-ajuda.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 768);
    const erros = []; p.on('pageerror', e => erros.push(String(e)));
    await abreCardapio(p, { espera: 2200 });
    // ---- estrutura ----
    const g = await p.evaluate(() => {
      const tops = sel => [...document.querySelectorAll(sel)].map(e => Math.round(e.getBoundingClientRect().top));
      const mesmaLinha = l => Math.max(...l) - Math.min(...l) <= 2;
      const dias = [...document.querySelectorAll('.cdp-day')];
      return {
        acoes: mesmaLinha(tops('.cdp-edit-btn')) && document.querySelectorAll('.cdp-edit-btn').length === 3,
        dias: dias.length === 7 && mesmaLinha(tops('.cdp-day')),
        diasCabem: dias.every(d => d.querySelector('b').scrollWidth <= d.clientWidth + 1),
        chips: document.querySelectorAll('.cdp-tchip').length === 4 && [...document.querySelectorAll('.cdp-tchip')].every(c => c.scrollWidth <= c.clientWidth + 1),
        selects: document.querySelectorAll('.cdp-controls .ngs-btn').length === 3,
        semRolagem: document.documentElement.scrollWidth <= innerWidth,
      };
    });
    t(L + 'Trocar alimentos, Meus alimentos e Refazer formulário lado a lado', g.acoes, JSON.stringify(g));
    t(L + 'os 7 dias numa só linha e com o texto dentro do botão', g.dias && g.diasCabem, JSON.stringify(g));
    t(L + 'Kcal, Prot., Carb. e Gord. em blocos organizados (sem texto cortado)', g.chips, JSON.stringify(g));
    t(L + 'jeito, rotina e refeições usam o seletor do app', g.selects);
    t(L + 'sem rolagem lateral', g.semRolagem);
    // seletor do cardápio troca o jeito de comer
    await p.click('.cdp-controls .ngs-btn >> nth=0'); await p.waitForTimeout(400);
    await p.click('.ngs-op[data-v="veg"]'); await p.waitForTimeout(700);
    t(L + 'escolher no seletor muda o cardápio (Vegetariano)', await p.evaluate(() => document.querySelector('[data-cdp-sel="jeito"]').value === 'veg' && /Vegetariano/.test(document.querySelector('.cdp-controls .ngs-val').textContent)));
    // ---- lista de compras ----
    await p.evaluate(() => { const d = document.querySelector('.cdp-shop'); d.open = true; d.scrollIntoView(); }); await p.waitForTimeout(300);
    const n0 = await p.evaluate(() => document.querySelectorAll('[data-cdp-buy]').length);
    t(L + 'lista de compras: itens com caixinha e contagem no cabeçalho', n0 > 5 && (await p.evaluate(() => /itens?/.test(document.querySelector('.cdp-shop-n').textContent))));
    await p.evaluate(() => { document.querySelectorAll('.cdp-buy')[0].click(); document.querySelectorAll('.cdp-buy')[1].click(); }); await p.waitForTimeout(250);
    t(L + 'marcar itens atualiza o progresso e risca o item', await p.evaluate(n => document.querySelector('[data-buy-txt]').textContent === '2 de ' + n + ' comprados' && document.querySelectorAll('.cdp-buy.feito').length === 2, n0));
    await p.reload(); await p.waitForTimeout(1500); await abreCardapio(p, { espera: 2000 });
    await p.evaluate(() => { document.querySelector('.cdp-shop').open = true; }); await p.waitForTimeout(200);
    t(L + 'marcações continuam depois de recarregar', await p.evaluate(() => document.querySelectorAll('.cdp-buy.feito').length === 2));
    // ---- PDF ----
    const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }), p.click('[data-cdp="pdf"]')]);
    const arq = path.join(os.tmpdir(), 'ng-lista-' + w + '.pdf'); await dl.saveAs(arq);
    const buf = fs.readFileSync(arq), txt = buf.toString('latin1');
    t(L + 'PDF baixado com nome lista-de-compras-ng-AAAA-MM-DD.pdf', /^lista-de-compras-ng-\d{4}-\d{2}-\d{2}\.pdf$/.test(dl.suggestedFilename()), dl.suggestedFilename());
    t(L + 'arquivo é um PDF válido (cabeçalho, xref e %%EOF)', buf.slice(0, 5).toString() === '%PDF-' && /startxref\s+\d+\s+%%EOF\s*$/.test(txt) && /\/Type \/Catalog/.test(txt) && /\/Count [1-9]/.test(txt));
    t(L + 'PDF traz o título, os grupos e a nota', /\(Lista de compras da semana\)/.test(txt) && /\(PROTE\xCDNAS\)/.test(txt) && /Gerado pelo NG\+/.test(txt));
    // o xref aponta para objetos reais
    const off = [...txt.matchAll(/(\d{10}) 00000 n/g)].map(m => +m[1]);
    t(L + 'tabela xref aponta para os objetos', off.length > 4 && off.every((o, i) => txt.slice(o, o + 12).startsWith((i + 1) + ' 0 obj')));
    // limpar
    await p.click('[data-cdp="limpar-compras"]'); await p.waitForTimeout(200);
    t(L + 'Limpar marcações zera o progresso', await p.evaluate(() => document.querySelectorAll('.cdp-buy.feito').length === 0 && /^0 de/.test(document.querySelector('[data-buy-txt]').textContent)));
    t(L + 'sem erros de script', erros.length === 0, erros.join(' | '));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
