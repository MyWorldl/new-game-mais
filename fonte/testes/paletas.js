// Paletas do modo jogo (Lima/Violeta/Ouro) + tokens de movimento. Uso: node paletas.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const ACC = { lima: '#a3e635', violeta: '#a78bfa', ouro: '#e5b83d' };
(async () => {
  const b = await chromium.launch();
  const { c, p } = await abre(b, 390, 'dark');
  const ir = async id => { await p.evaluate(i => document.getElementById(i).click(), id); await p.waitForTimeout(1200); };
  await ir('tab-config');
  const botoes = await p.evaluate(() => [...document.querySelectorAll('#theme-row .theme-opt')].map(e => (e.dataset.paleta || e.dataset.tema)));
  t('config: 3 paletas do modo jogo antes dos 3 pastéis', JSON.stringify(botoes) === JSON.stringify(['lima', 'violeta', 'ouro', 'rosa', 'roxo', 'azul']), JSON.stringify(botoes));
  t('padrão: Lima marcada e sem data-paleta', await p.evaluate(() => document.querySelector('#theme-row [data-paleta="lima"]').getAttribute('aria-checked') === 'true' && !document.documentElement.hasAttribute('data-paleta')));
  t('tokens de movimento existem', await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return s.getPropertyValue('--dur-fast').trim() === '120ms' && s.getPropertyValue('--dur-base').trim() === '220ms' && s.getPropertyValue('--dur-slow').trim() === '420ms' && /cubic-bezier/.test(s.getPropertyValue('--ease-out')); }));
  for (const k of ['violeta', 'ouro', 'lima']) {
    await p.evaluate(k => document.querySelector('#theme-row [data-paleta="' + k + '"]').click(), k); await p.waitForTimeout(500);
    const r = await p.evaluate(() => { const s = getComputedStyle(document.documentElement); return { game: document.documentElement.dataset.game, pal: document.documentElement.getAttribute('data-paleta'), acc: s.getPropertyValue('--accent').trim().toLowerCase(), tema: document.documentElement.getAttribute('data-tema'), ls: localStorage.getItem('ng-paleta') }; });
    t(k + ': aplica cor de destaque e mantém modo jogo', r.game === 'on' && r.acc === ACC[k] && !r.tema, JSON.stringify(r));
    t(k + ': atributo data-paleta ' + (k === 'lima' ? 'ausente' : 'presente') + ' e preferência guardada', (k === 'lima' ? r.pal === null : r.pal === k) && r.ls === k);
    t(k + ': só uma opção marcada', (await p.locator('#theme-row [aria-checked="true"]').count()) === 1);
  }
  // pastel continua funcionando e limpa a paleta
  await p.evaluate(() => document.querySelector('#theme-row [data-paleta="violeta"]').click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#theme-row [data-tema="roxo"]').click()); await p.waitForTimeout(400);
  t('pastel: troca para tema pastel e remove data-paleta', await p.evaluate(() => document.documentElement.dataset.game === 'off' && document.documentElement.dataset.tema === 'roxo' && !document.documentElement.hasAttribute('data-paleta')));
  await p.evaluate(() => document.querySelector('#theme-row [data-paleta="ouro"]').click()); await p.waitForTimeout(300);
  // persistência após recarregar
  await p.reload(); await p.waitForTimeout(1500);
  t('recarregar: paleta Ouro continua', await p.evaluate(() => document.documentElement.getAttribute('data-paleta') === 'ouro' && document.documentElement.dataset.game === 'on'));
  // contraste (axe) em cada paleta nas telas principais
  if (axeSrc) {
    for (const k of ['violeta', 'ouro']) {
      await p.evaluate(k => { const f = () => document.querySelector('#theme-row [data-paleta="' + k + '"]'); document.getElementById('tab-config').click(); setTimeout(() => f().click(), 200); }, k); await p.waitForTimeout(800);
      for (const tab of ['painel', 'treino', 'corpo', 'perfil', 'config']) {
        await ir('tab-' + tab);
        await p.evaluate(() => document.querySelectorAll('[data-cargadia]').forEach(b => { if (b.getAttribute('aria-expanded') !== 'true') b.click(); }));
        if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
        const v = await p.evaluate(async () => { const r = await axe.run(document, { runOnly: ['color-contrast'] }); return r.violations.flatMap(x => x.nodes.map(n => n.target.join(' ') + ' :: ' + (n.any[0] && n.any[0].message || ''))); });
        t(k + ' / ' + tab + ': contraste AA (axe)', v.length === 0, v.slice(0, 3).join(' | '));
      }
    }
  }
  t('sem erro de console', p.errs.length === 0, p.errs.join(' | '));
  await c.close(); await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
