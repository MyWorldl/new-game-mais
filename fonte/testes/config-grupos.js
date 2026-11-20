// Configurações em grupos: 5 grupos na ordem certa, "Conta e sincronização" por último, nada perdido, atalhos funcionam.
// Uso: node config-grupos.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const innerHeightMax = w => (w < 600 ? 700 : 600);
(async () => {
  const b = await chromium.launch();
  for (const w of [360, 390, 820]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark', w < 600);
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const v = document.getElementById('view-config');
      const gs = [...v.querySelectorAll(':scope > .cfg-grupo')];
      const ids = ['cfg-local-card','cfg-lembretes','cfg-instalar','cfg-diag-card','cfg-conta','cfg-admin','cfg-usuario','cfg-tour-btn','cfg-export-btn','cfg-periodizacao-seg'];
      return {
        grupos: gs.map(g => g.id),
        soltos: [...v.querySelectorAll(':scope > .card')].length,
        presentes: ids.filter(i => document.getElementById(i)).length, total: ids.length,
        contaUltimo: gs[gs.length - 1] && gs[gs.length - 1].id,
        contaDentro: !!document.querySelector('#cfg-g-conta #cfg-conta'),
        usuarioNaConta: !!document.querySelector('#cfg-g-conta #cfg-usuario'),
        chips: [...v.querySelectorAll('.cfg-jump-b')].length,
        navPrimeiro: v.firstElementChild.className,
        h2ids: new Set([...v.querySelectorAll('h2[id]')].map(h => h.id)).size === v.querySelectorAll('h2[id]').length,
        sw: document.documentElement.scrollWidth - innerWidth,
        dupIds: (() => { const m = {}; document.querySelectorAll('[id]').forEach(e => m[e.id] = (m[e.id] || 0) + 1); return Object.keys(m).filter(k => m[k] > 1); })()
      };
    });
    t(L + 'grupos na ordem', r.grupos.join() === 'cfg-g-treino,cfg-g-aparencia,cfg-g-app,cfg-g-dados,cfg-g-conta', r.grupos);
    t(L + '"Conta e sincronização" é o último grupo da página', r.contaUltimo === 'cfg-g-conta' && r.contaDentro);
    t(L + 'apelido ("Conta") fica no grupo Conta', r.usuarioNaConta);
    t(L + 'nenhum cartão solto fora dos grupos', r.soltos === 0, r.soltos);
    t(L + 'todos os controles continuam no DOM', r.presentes === r.total, r.presentes + '/' + r.total);
    t(L + 'barra de atalhos com 5 chips e primeiro elemento', r.chips === 5 && /cfg-jump/.test(r.navPrimeiro));
    t(L + 'sem ids duplicados', r.dupIds.length === 0, r.dupIds);
    t(L + 'sem rolagem lateral', r.sw <= 0, r.sw);
    // atalho leva ao grupo
    await p.click('.cfg-jump-b[data-cfg-ir="dados"]'); await p.waitForTimeout(900);
    const y = await p.evaluate(() => Math.round(document.getElementById('cfg-g-dados').getBoundingClientRect().top));
    const fim = await p.evaluate(() => Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2);
    t(L + 'chip "Dados" leva o grupo para a tela (no topo, ou o mais perto possível se a página acaba)', y >= 0 && y < innerHeightMax(w) && (y < 180 || fim), y + ' fim=' + fim);
    // grupo vazio não aparece (Conta sem login: só o apelido => visível; Lembretes hidden não deixa grupo vazio)
    const vis = await p.evaluate(() => [...document.querySelectorAll('.cfg-grupo')].map(g => [g.id, g.offsetHeight > 0]));
    t(L + 'todos os grupos têm conteúdo visível', vis.every(([, v]) => v), JSON.stringify(vis));
    await c.close();
  }
  await b.close();
  console.log('\n' + ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
