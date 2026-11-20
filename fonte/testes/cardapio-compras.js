// Lista de compras = soma exata do que aparece nos 7 dias do cardápio (com trocas e "Meus alimentos"), e a primeira abertura do Cardápio.
// Também confere a migração: quem já tinha escolhas salvas não vê o formulário de novo; quem nunca configurou vê o convite + caixa flutuante.
// Uso: SP=/tmp/sp node fonte/testes/cardapio-compras.js http://localhost:8791
const { chromium } = require('playwright');
const { abreCardapio } = require('./cardapio-ajuda.js');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const PERFIL = { nomeCompleto: 'Teste', nomeUsuario: 'teste.cc', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia' };

async function novaPagina(b, w, settings) {
  const c = await b.newContext({ viewport: { width: w, height: 900 } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.setDefaultTimeout(8000); p.errs = [];
  p.on('pageerror', e => p.errs.push('PE ' + e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  await p.evaluate(async ([hoje, perfil, settings]) => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set(perfil);
    await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 });
    if (settings) await db.doc('config/settings').set(settings);
  }, [iso(Date.now()), PERFIL, settings]);
  await p.reload(); await p.waitForTimeout(1800);
  return { c, p };
}
// grama de um item: "2 fatias (≈ 60 g)" -> 60; "150 ml" -> 150; "1,8 kg" -> 1800 (a lista arredonda acima de 1 kg para 100 g)
const GRAMAS = `(q) => { const m = q.match(/≈\\s*([\\d.,]+)\\s*(kg|L|g|ml)/) || q.match(/^\\s*([\\d.,]+)\\s*(kg|L|g|ml)/); if (!m) return NaN; const v = parseFloat(m[1].replace(',', '.')); return /kg|L/.test(m[2]) ? Math.round(v * 1000) : v; }`;
async function somaSemana(p) {
  const dias = [];
  for (let d = 0; d < 7; d++) {
    await p.evaluate(d => document.querySelector('[data-cdp="dia"][data-v="' + d + '"]').click(), d); await p.waitForTimeout(160);
    dias.push(await p.evaluate(g => { const gr = eval(g); return [...document.querySelectorAll('.cdp-meal .cdp-it')].map(i => ({ n: i.querySelector('.cdp-n').textContent.replace(/\*/g, '').trim(), g: gr(i.querySelector('.cdp-q').textContent) })); }, GRAMAS));
  }
  const soma = {}; dias.flat().forEach(i => { soma[i.n] = (soma[i.n] || 0) + i.g; });
  const lista = await p.evaluate(g => { const gr = eval(g); document.querySelector('.cdp-shop').open = true; return [...document.querySelectorAll('[data-r="compras"] .cdp-it')].map(i => ({ n: i.querySelector('.cdp-n').textContent.replace(/\*/g, '').trim(), g: gr(i.querySelector('.cdp-q').textContent) })); }, GRAMAS);
  const nota = await p.locator('[data-r="compras"] .cdp-note').first().innerText();
  const dif = [];
  const nomes = new Set([...Object.keys(soma), ...lista.map(x => x.n)]);
  for (const n of nomes) { const l = lista.filter(x => x.n === n).reduce((s, x) => s + x.g, 0); if (!(n in soma) || Math.abs(l - soma[n]) > (l >= 1000 ? 50 : 0)) dif.push(n + ': semana ' + soma[n] + ' x lista ' + l); }
  return { dif, nLista: lista.length, nSoma: Object.keys(soma).length, nota, itens: dias.flat().length };
}

(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    // ---- usuário novo: cardápio começa vazio, com convite e formulário em caixa flutuante ----
    { const { c, p } = await novaPagina(b, w, null);
      await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(500);
      await p.evaluate(() => document.getElementById('subtab-dieta-cardapio').click()); await p.waitForTimeout(1300);
      t(L + 'usuário novo: o cardápio vem vazio (sem dias nem lista de compras)', await p.locator('.cdp-day').count() === 0 && await p.locator('.cdp-vazio').count() === 1);
      t(L + 'usuário novo: formulário aberto numa caixa flutuante (diálogo) com os 4 campos e os alimentos', await p.locator('#modal-root .modal[role="dialog"] [data-form="jeito"]').count() === 1 && await p.locator('#modal-root [data-form="rotina"]').count() === 1 && await p.locator('#modal-root [data-form="nref"]').count() === 1 && await p.locator('#modal-root [data-form="restr"]').count() >= 8 && await p.locator('#modal-root [data-form="alimento"]').count() > 10);
      await p.locator('[data-form="salvar"]').evaluate(e => e.click()); await p.waitForTimeout(900);
      t(L + 'depois de confirmar: cardápio montado com 7 dias e escolhas salvas como configuradas', await p.locator('.cdp-day').count() === 7 && await p.evaluate(async () => { const d = await (await window.claude.use('db')).doc('config/settings').get(); return d.exists && d.data().cardapio && d.data().cardapio.configurado === true; }));
      t(L + 'sem erro de script (usuário novo)', p.errs.length === 0, p.errs.join('|'));
      await c.close(); }

    // ---- quem já tinha escolhas salvas (antes do formulário existir): migra sem pedir de novo ----
    { const { c, p } = await novaPagina(b, w, { cardapio: { jeito: 'veg', rotina: 'tradicional', restricoes: { lactose: true } } });
      await p.evaluate(() => document.getElementById('tab-dieta').click()); await p.waitForTimeout(500);
      await p.evaluate(() => document.getElementById('subtab-dieta-cardapio').click()); await p.waitForTimeout(1500);
      t(L + 'escolhas antigas: sem formulário, cardápio direto, escolhas preservadas', await p.locator('#modal-root .modal').count() === 0 && await p.locator('.cdp-day').count() === 7 && await p.locator('[data-cdp-sel="jeito"]').inputValue() === 'veg' && await p.locator('[data-cdp-sel="rotina"]').inputValue() === 'tradicional' && await p.locator('[data-cdp-chk="restr"][data-v="lactose"]').isChecked());
      const r1 = await somaSemana(p);
      t(L + 'lista de compras = soma exata dos 7 dias (vegetariano, tradicional, sem lactose)', r1.dif.length === 0 && r1.nLista === r1.nSoma && r1.nLista > 8, r1.dif.slice(0, 4).join(' | ') + ' n=' + r1.nLista + '/' + r1.nSoma);
      t(L + 'lista diz quantos alimentos somou', new RegExp('Tudo o que aparece nos 7 dias[^.]*: ' + r1.nLista + ' alimentos?\\.').test(r1.nota), r1.nota);
      // muda para onívoro + 6 refeições: a lista acompanha
      await p.evaluate(() => { const s = document.querySelector('[data-cdp-sel="jeito"]'); s.value = 'omni'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(500);
      await p.evaluate(() => { const s = document.querySelector('[data-cdp-sel="nref"]'); s.value = '6'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await p.waitForTimeout(500);
      const r2 = await somaSemana(p);
      t(L + 'onívoro, 6 refeições: a lista continua igual à soma dos 7 dias', r2.dif.length === 0 && r2.itens > r1.itens, r2.dif.slice(0, 4).join(' | '));
      // "Meus alimentos": desmarca o iogurte pela caixa flutuante; a lista só tem o que sobrou
      await p.evaluate(() => document.querySelector('[data-cdp="meus"]').click()); await p.waitForTimeout(350);
      const tem = await p.locator('[data-meus="alimento"][data-v="iogurte"]').count();
      if (tem) { await p.evaluate(() => document.querySelector('[data-meus="alimento"][data-v="iogurte"]').click()); await p.waitForTimeout(250); }
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      const r3 = await somaSemana(p);
      const txt = await p.locator('[data-r="compras"]').innerText();
      t(L + 'Meus alimentos: sem iogurte nos 7 dias e na lista; lista = soma dos dias', (!tem || !/Iogurte/.test(txt)) && r3.dif.length === 0, r3.dif.slice(0, 3).join(' | '));
      // uma troca de alimento no popup: a lista acompanha
      await p.evaluate(() => document.querySelector('[data-cdp="editar"]').click()); await p.waitForTimeout(400);
      await p.evaluate(() => document.querySelector('[data-pop="refeicao"][data-v="almoco"]').click()); await p.waitForTimeout(200);
      const trocou = await p.evaluate(() => { const r = [...document.querySelectorAll('[data-pop="alimento"]')].find(x => /arroz|feij|frango|ovo|lentilha|tofu/i.test(x.innerText)); if (!r) return false; r.click(); return true; });
      await p.waitForTimeout(200);
      const alt = await p.evaluate(() => { const a = document.querySelector('[data-pop="para"]:not(.on)'); if (!a) return false; a.click(); return true; }); await p.waitForTimeout(350);
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      const r4 = await somaSemana(p);
      t(L + 'troca de alimento: a lista continua igual à soma dos 7 dias', trocou && alt && r4.dif.length === 0, r4.dif.slice(0, 3).join(' | ') + ' trocou=' + trocou + ' alt=' + alt);
      t(L + 'sem erro de script (escolhas antigas)', p.errs.length === 0, p.errs.join('|'));
      await c.close(); }
  }
  await b.close(); console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
