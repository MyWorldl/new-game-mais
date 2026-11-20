// Sub-abas: Treino (Plano | Progresso | Biblioteca | Calculadoras), Dieta (Metas | Cardápio), Perfil (Perfil | Configurações | Glossário | Sobre).
// Sobre reúne as fontes (28 referências) e nenhuma aba traz mais citações no rodapé. Uso: node sub-abas.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
(async () => {
  const b = await chromium.launch();
  for (const w of [320, 390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 768);
    const erros = []; p.on('pageerror', e => erros.push(String(e)));
    const vis = sel => p.evaluate(s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; }, sel);
    const ir = id => p.evaluate(i => document.getElementById(i).click(), id).then(() => p.waitForTimeout(600));
    const sub = sel => p.evaluate(s => document.querySelector(s).click(), sel).then(() => p.waitForTimeout(600));
    const marcada = sel => p.evaluate(s => document.querySelector(s).getAttribute('aria-selected'), sel);

    // ---- Treino ----
    await ir('tab-treino');
    t(L + 'Treino: barra de sub-abas com 4 itens', await p.evaluate(() => { const n = document.getElementById('treino-subnav'); return !n.hidden && n.querySelectorAll('.subtab-btn').length === 4; }));
    t(L + 'Treino: abre em Plano (formato e rotina visíveis; análise oculta)', (await marcada('#subtab-treino-plano')) === 'true' && await vis('#formato-card') && await vis('#btn-edit-rotina') && !(await vis('#analise-treino-card')));
    await sub('#subtab-treino-progresso');
    t(L + 'Treino › Progresso: constância, cargas e análise aparecem; formato some', await vis('#constancia-title') && await vis('#analise-treino-card') && await vis('.carga-cat') && !(await vis('#formato-card')));
    t(L + 'Treino › Progresso: marcada como atual', (await marcada('#subtab-treino-progresso')) === 'true' && (await marcada('#subtab-treino-plano')) === 'false');
    await sub('#subtab-treino-biblioteca');
    t(L + 'Treino › Biblioteca: busca visível, calculadoras ocultas', await vis('#biblioteca-busca') && !(await vis('#calc-1rm-peso')));
    await sub('#subtab-treino-calculadoras');
    t(L + 'Treino › Calculadoras: campos visíveis, biblioteca oculta', await vis('#calc-1rm-peso') && !(await vis('#biblioteca-busca')));
    // lembra a sub-aba ao sair e voltar
    await ir('tab-dieta'); await ir('tab-treino');
    t(L + 'Treino: volta na sub-aba em que estava', (await marcada('#subtab-treino-calculadoras')) === 'true' && await vis('#calc-1rm-peso'));
    await sub('#subtab-treino-plano');

    // ---- Dieta ----
    await ir('tab-dieta');
    t(L + 'Dieta: barra com Metas e Cardápio; abre em Metas', await p.evaluate(() => { const n = document.getElementById('dieta-subnav'); return !n.hidden && n.querySelectorAll('.subtab-btn').length === 2; }) && (await marcada('#subtab-dieta-metas')) === 'true');
    t(L + 'Dieta › Metas: objetivo calórico e macros visíveis; cardápio oculto', await vis('#seg-objetivo') && await vis('#macro-bars') && !(await vis('#cardapio-card')));
    await sub('#subtab-dieta-cardapio');
    t(L + 'Dieta › Cardápio: cardápio visível; objetivo e macros ocultos', await vis('#cardapio-card') && !(await vis('#seg-objetivo')) && !(await vis('#macro-bars')));

    // ---- Perfil ----
    await ir('tab-perfil');
    t(L + 'Perfil: 4 sub-abas (Perfil, Configurações, Glossário, Sobre)', await p.evaluate(() => [...document.querySelectorAll('#perfil-subnav .subtab-btn')].map(b => b.textContent.trim()).join('|')) === 'Perfil|Configurações|Glossário|Sobre');
    t(L + 'Perfil: ficha de personagem visível e o cartão "Mais do app" não existe mais', await vis('#attrs-grid') && !(await p.evaluate(() => !!document.getElementById('perfil-mais'))));
    await sub('#subtab-config');
    t(L + 'Perfil › Configurações: conta visível; o item principal "Perfil" segue marcado', await vis('#cfg-usuario') && (await p.evaluate(() => document.getElementById('tab-perfil').getAttribute('aria-selected'))) === 'true');
    await sub('#subtab-glossario');
    t(L + 'Perfil › Glossário: busca visível', await vis('#glossario-busca'));
    await sub('#subtab-sobre');
    const sobre = await p.evaluate(() => {
      const as = [...document.querySelectorAll('#fontes-lista a')];
      return { n: as.length, bons: as.every(a => a.target === '_blank' && /noopener/.test(a.rel) && /^https:\/\//.test(a.href)), grupos: [...document.querySelectorAll('#fontes-lista h3')].map(h => h.textContent.trim()).join('|'), cont: document.getElementById('fontes-contagem').textContent };
    });
    t(L + 'Sobre: 28 referências, todas com link seguro (https, nova aba, noopener)', sobre.n === 28 && sobre.bons, JSON.stringify(sobre));
    t(L + 'Sobre: agrupadas em Treino, Corpo e hábitos, Dieta e Dicas', sobre.grupos === 'Treino|Corpo e hábitos|Dieta|Dicas, suplementos e equipamento', sobre.grupos);
    t(L + 'Sobre: aviso de saúde e botão do tutorial', await vis('#sobre-aviso') && await vis('#sobre-tour'));
    // nenhum link de citação sobrou no fim das outras abas
    const sobras = await p.evaluate(() => ['view-treino', 'view-dieta', 'view-corpo', 'view-recomendacoes', 'view-painel'].map(id => { const v = document.getElementById(id); return [id, v.querySelectorAll('a[target="_blank"]:not(.ex-video-link):not(.video)').length, v.querySelectorAll('.src a, .cm-fontes, .ajuste-src a').length]; }).filter(x => x[1] || x[2]));
    t(L + 'abas sem rodapé de citações nem links de fonte (vídeos de exercício não contam)', sobras.length === 0, JSON.stringify(sobras));
    // os extras do menu lateral não aparecem mais (viraram sub-abas), mas o botão continua no DOM
    t(L + 'botões extras do menu lateral ocultos', await p.evaluate(() => ['tab-glossario', 'tab-config'].every(i => { const e = document.getElementById(i); return e && e.getClientRects().length === 0; })));
    // barra de sub-abas some fora dos grupos
    await ir('tab-painel');
    t(L + 'Hoje: sem barra de sub-abas', await p.evaluate(() => document.getElementById('subnav-host').hidden));
    await ir('tab-corpo');
    t(L + 'Corpo: continua com Corpo e Dicas', await p.evaluate(() => [...document.querySelectorAll('#corpo-subnav .subtab-btn')].map(b => b.textContent.trim()).join('|')) === 'Corpo|Dicas' && await vis('#corpo-subnav'));
    // sem rolagem lateral e a barra gruda abaixo do topo
    await ir('tab-treino'); await p.evaluate(() => window.scrollTo(0, 500)); await p.waitForTimeout(400);
    const g = await p.evaluate(() => ({ rola: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, h: Math.round(document.getElementById('subnav-host').getBoundingClientRect().top), tb: Math.round(document.querySelector('.topbar').getBoundingClientRect().bottom) }));
    t(L + 'sem rolagem lateral', !g.rola, JSON.stringify(g));
    if (w >= 768) t(L + 'faixa de sub-abas grudada logo abaixo do topo ao rolar', Math.abs(g.h - g.tb) <= 2, JSON.stringify(g));
    t(L + 'sem erros de script', erros.length === 0, erros.join(' | '));
    await c.close();
  }
  await b.close(); console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
