// Rodada 2 do redesign: Volume semanal + foco, Treino ao vivo (descanso/guia), Editar rotina, calendário do app (Hábitos), Evolução.
// Uso: node redesign-r2.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 600);
    const go = async s => { await p.evaluate(x => { const e = document.querySelector(x); e && e.click(); }, s); await p.waitForTimeout(600); };

    // ---- Volume semanal por grupo
    await go('#tab-treino'); await go('#subtab-treino-progresso');
    const vol = await p.evaluate(() => {
      const rows = [...document.querySelectorAll('.volA-row')];
      return {
        cats: document.querySelectorAll('.volA-cat').length, rows: rows.length,
        semTrilha: rows.filter(r => !r.querySelector('.volA-track')).length,
        semValor: rows.filter(r => !r.querySelector('.volA-val b')).length,
        estados: [...new Set(rows.map(r => ['ok', 'warn', 'crit'].find(k => r.classList.contains(k))))],
        legenda: document.querySelectorAll('.vol-legend .li').length,
        sw: document.documentElement.scrollWidth - innerWidth
      };
    });
    t(L + 'volume: categorias e linhas desenhadas', vol.cats >= 2 && vol.rows >= 6, JSON.stringify(vol));
    t(L + 'volume: toda linha tem trilha e valor, estado definido', vol.semTrilha === 0 && vol.semValor === 0 && vol.estados.every(Boolean), JSON.stringify(vol.estados));
    t(L + 'volume: legenda com 4 itens e sem rolagem lateral', vol.legenda === 4 && vol.sw <= 0, vol.legenda + ' / ' + vol.sw);

    // ---- Editar rotina
    await go('#subtab-treino-plano'); await go('#btn-edit-rotina');
    const ed = await p.evaluate(() => {
      const dias = [...document.querySelectorAll('.re-day')];
      const d0 = dias[0];
      return {
        dias: dias.length,
        interruptores: document.querySelectorAll('.re-switch input.d-ativo[role="switch"]').length,
        nomes: document.querySelectorAll('.re-day .d-nome').length,
        legendas: d0 ? d0.querySelectorAll('.ex-f > span').length : 0,
        campos: d0 ? ['.ex-series', '.ex-reps', '.ex-meta', '.ex-nome', '.ex-remove', '.add-ex'].every(s => d0.querySelector(s)) : false,
        selectsApp: document.querySelectorAll('#rg-dias').length && document.querySelectorAll('.ngs #rg-dias, .ngs #rotina-template-select').length,
        sw: document.documentElement.scrollWidth - innerWidth
      };
    });
    t(L + 'editor: 7 dias com interruptor, nome e campos com legenda', ed.dias === 7 && ed.interruptores === 7 && ed.nomes === 7 && ed.legendas > 0 && ed.legendas % 3 === 0 && ed.campos, JSON.stringify(ed));
    t(L + 'editor: seletores do app (dias por semana e modelo) e sem rolagem lateral', ed.selectsApp === 2 && ed.sw <= 0, JSON.stringify(ed));
    // desligar um dia marca como folga e salvar mantém a estrutura
    const antes = await p.evaluate(() => document.querySelector('.re-day:nth-of-type(1) .d-ativo, .re-day .d-ativo').checked);
    await p.evaluate(() => { const i = document.querySelectorAll('.re-day .d-ativo')[0]; i.click(); });
    await p.waitForTimeout(250);
    const off = await p.evaluate(() => document.querySelectorAll('.re-day')[0].classList.contains('off'));
    t(L + 'editor: interruptor do dia alterna o estado de folga', off === antes, antes + ' -> off=' + off);
    await p.evaluate(() => { const i = document.querySelectorAll('.re-day .d-ativo')[0]; i.click(); });
    await p.waitForTimeout(150);

    // ---- Treino ao vivo: folha de registro
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => { const bt = document.querySelector('[data-qtoggle]'); bt && bt.click(); }); await p.waitForTimeout(900);
    const qc = await p.evaluate(() => {
      const sh = [...document.querySelectorAll('.qc-panel')].find(e => e.getClientRects().length);
      if (!sh) return null;
      const alvos = [...sh.querySelectorAll('button, summary, select, input:not([type=hidden])')].filter(e => e.getClientRects().length && !e.closest('.ngs-nativo') && !e.classList.contains('ngs-nativo'));
      const pequenos = alvos.filter(e => { const r = e.getBoundingClientRect(); return (r.width < 40 || r.height < 40) && e.type !== 'checkbox' && !e.classList.contains('info-tip'); }).map(e => (e.className || e.tagName) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
      const sw = sh.querySelector('input[data-restauto]');
      return {
        descansoApp: !!sh.querySelector('.ngs [data-restsel], .ngs.quest-rest-select, .ngs-nativo[data-restsel]'),
        botao: (sh.querySelector('.quest-rest-btn') || {}).textContent,
        interruptor: !!sw, rotuloAuto: !!sh.querySelector('.rest-auto-t small'),
        pequenos, sw: document.documentElement.scrollWidth - innerWidth
      };
    });
    t(L + 'folha de registro abre', !!qc);
    if (qc) {
      t(L + 'folha: descanso com seletor do app, botão "Iniciar descanso" e interruptor automático', qc.descansoApp && /Iniciar descanso/.test(qc.botao || '') && qc.interruptor && qc.rotuloAuto, JSON.stringify(qc));
      t(L + 'folha: alvos de toque ≥ 40px e sem rolagem lateral', qc.pequenos.length === 0 && qc.sw <= 0, JSON.stringify(qc.pequenos));
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelectorAll('.qc-panel').forEach(s => { try { s.hidePopover(); } catch (e) {} }));

    // ---- Calendário do app (Hábitos)
    await go('#tab-config'); await go('#subtab-corpo');
    await p.evaluate(() => document.getElementById('habitos-card').scrollIntoView({ block: 'start' }));
    const hoje = iso(Date.now()), ontem = iso(Date.now() - 864e5);
    const dp0 = await p.evaluate(() => { const d = document.getElementById('h-data'); const w = d._ngd; return { botao: !!w, rel: w && w.rel.textContent, val: w && w.txt.textContent, v: d.value, aria: w && w.btn.getAttribute('aria-label') }; });
    t(L + 'calendário: botão do app no lugar do seletor nativo, mostra "Hoje"', dp0.botao && dp0.rel === 'Hoje' && /^\d{2}\/\d{2}\/\d{4}$/.test(dp0.val) && dp0.v === hoje, JSON.stringify(dp0));
    await p.click('.ngd-btn'); await p.waitForTimeout(600);
    const cal = await p.evaluate(() => {
      const dias = [...document.querySelectorAll('.ngd-dia')];
      const hab = dias.filter(d => !d.disabled).map(d => d.dataset.d);
      const tam = dias.filter(d => !d.disabled).map(d => Math.round(d.getBoundingClientRect().height));
      return { aberto: !!document.querySelector('.ngd-panel'), dias: dias.length, habilitados: hab, altura: Math.min(...tam), seta: [...document.querySelectorAll('.ngd-seta')].map(s => s.disabled), foco: document.activeElement && document.activeElement.className, sw: document.documentElement.scrollWidth - innerWidth };
    });
    t(L + 'calendário: só hoje e ontem escolhíveis (respeita min/max do campo)', cal.aberto && cal.habilitados.join() === [ontem, hoje].join(), JSON.stringify(cal.habilitados));
    t(L + 'calendário: células ≥ 44px, foco dentro, sem rolagem lateral', cal.altura >= 44 && /ngd-dia/.test(cal.foco || '') && cal.sw <= 0, JSON.stringify(cal));
    // escolhe ontem: valor, eventos e formulário
    await p.evaluate(() => { window.__ev = []; const d = document.getElementById('h-data'); ['input', 'change'].forEach(n => d.addEventListener(n, () => window.__ev.push(n))); });
    await p.click('.ngd-dia[data-d="' + ontem + '"]'); await p.waitForTimeout(500);
    const pos = await p.evaluate(() => { const d = document.getElementById('h-data'); return { v: d.value, ev: window.__ev.join(), rel: d._ngd.rel.textContent, fechou: !document.querySelector('.ngd-panel'), form: document.querySelector('#form-habitos button[type=submit]').disabled }; });
    t(L + 'calendário: escolher ontem grava o valor, dispara input/change e mostra "Ontem"', pos.v === ontem && /input/.test(pos.ev) && /change/.test(pos.ev) && pos.rel === 'Ontem' && pos.fechou && !pos.form, JSON.stringify(pos));
    // teclado: abre, Esc fecha e devolve o foco ao botão
    await p.focus('.ngd-btn'); await p.keyboard.press('Enter'); await p.waitForTimeout(500);
    const abriuTeclado = await p.evaluate(() => !!document.querySelector('.ngd-panel'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(450);
    const fechou = await p.evaluate(() => ({ painel: !!document.querySelector('.ngd-panel'), foco: document.activeElement && document.activeElement.classList.contains('ngd-btn') }));
    t(L + 'calendário: Enter abre, Esc fecha e devolve o foco', abriuTeclado && !fechou.painel && fechou.foco, JSON.stringify(fechou));
    // valor gravado por código atualiza o botão
    await p.evaluate(d => { document.getElementById('h-data').value = d; }, hoje); await p.waitForTimeout(100);
    t(L + 'calendário: valor gravado por código atualiza o botão', await p.evaluate(() => document.getElementById('h-data')._ngd.rel.textContent) === 'Hoje');

    // ---- Evolução
    const ev = await p.evaluate(() => {
      const tabs = [...document.querySelectorAll('#evolucao-tabs .metric-tab')];
      const per = [...document.querySelectorAll('#evolucao-period button')];
      return { tabs: tabs.length, alturaTabs: Math.min(...tabs.map(x => Math.round(x.getBoundingClientRect().height))), per: per.length, alturaPer: Math.min(...per.map(x => Math.round(x.getBoundingClientRect().height))), ativo: per.filter(x => x.classList.contains('active')).length };
    });
    t(L + 'evolução: 5 métricas e 4 períodos, alvos ≥ 44px, um período ativo', ev.tabs === 5 && ev.per === 4 && ev.alturaTabs >= 44 && ev.alturaPer >= 44 && ev.ativo === 1, JSON.stringify(ev));
    await p.click('#evolucao-period button[data-period="3"]'); await p.waitForTimeout(300);
    t(L + 'evolução: trocar o período troca o botão ativo', await p.evaluate(() => document.querySelector('#evolucao-period button.active').dataset.period) === '3');

    // ---- Hábitos: grade das 12 semanas continua íntegra
    const hg = await p.evaluate(() => { const rows = [...document.querySelectorAll('.hg-row')]; return { rows: rows.length, cols: rows.map(r => r.querySelectorAll('.hg-cells > *').length), nome: rows.every(r => r.querySelector('.hg-top b')) }; });
    t(L + 'hábitos: 4 linhas com 12 semanas cada', hg.rows === 4 && hg.cols.every(n => n === 12) && hg.nome, JSON.stringify(hg));
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} passaram, ${bad} falharam`);
  process.exit(bad ? 1 : 0);
})();
