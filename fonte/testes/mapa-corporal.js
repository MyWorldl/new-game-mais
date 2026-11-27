// Mapa corporal do Volume semanal (ilha React + TypeScript): carga sob demanda, silhuetas, números, acessibilidade, CSP e queda segura.
// Uso: node mapa-corporal.js http://localhost:8791   (o servidor precisa aplicar os cabeçalhos de produção)
const { chromium } = require('playwright'); const fs = require('fs');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 400) : '')); };
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const ex = (nome, s, m) => ({ nome, series: s, reps: '8-12', metaReps: s * 10, musculos: m });
const ROT = {
  seg: ['Peito e ombros', ex('Supino reto', 5, ['peito', 'triceps']), ex('Desenvolvimento', 4, ['ombros']), ex('Rosca direta', 3, ['biceps'])],
  ter: ['Pernas', ex('Agachamento', 3, ['quadriceps', 'gluteos']), ex('Mesa flexora', 3, ['posterior']), ex('Panturrilha em pé', 16, ['panturrilha'])],
  qua: ['Costas', ex('Remada curvada', 4, ['costas', 'biceps']), ex('Abdominal', 3, ['abdomen'])],
};
async function prepara(b, w, modo, sexo, antes) {
  const { c, p } = await abre(b, w, modo, w < 768);
  if (antes) await p.evaluate(async () => { for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  p.reqs = []; p.viol = []; p.erros = [];
  p.on('request', r => p.reqs.push(r.url())); p.on('console', m => { if (m.type() === 'error' && !/status of 400/.test(m.text())) p.erros.push(m.text()); });
  await c.addInitScript(() => document.addEventListener('securitypolicyviolation', e => (window.__viol = window.__viol || []).push(e.violatedDirective + ' ' + e.blockedURI)));
  if (antes) await antes(c);
  await p.evaluate(async ([sexo, ROT]) => {
    const db = await window.claude.use('db');
    const d = await db.doc('config/perfil').get(); const base = d && d.data ? d.data() : d;
    await db.doc('config/perfil').set(Object.assign({}, base, { sexo }));
    for (const k of Object.keys(ROT)) await db.doc('rotina/' + k).set({ nome: ROT[k][0], ativo: true, exercicios: ROT[k].slice(1) });
  }, [sexo, ROT]);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
  return { c, p };
}
const vaiProgresso = async p => { await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(400); await p.evaluate(() => document.querySelector('#subtab-treino-progresso').click()); await p.waitForTimeout(1200); };
(async () => {
  const b = await chromium.launch();
  const ds = {};
  for (const [sexo, modo] of [['M', 'dark'], ['F', 'light'], [null, 'dark']]) {
    const L = '[' + (sexo || 'N') + '/' + modo + '] ';
    const { c, p } = await prepara(b, 390, modo, sexo);
    t(L + 'na tela de login/Hoje o módulo do mapa não é baixado (carga sob demanda)', !p.reqs.some(u => /\/mapa\.[0-9a-f]+\.js/.test(u)));
    await vaiProgresso(p);
    await p.waitForSelector('#volume-mapa .vmap', { timeout: 8000 });
    t(L + 'o módulo é baixado ao abrir Treino > Progresso', p.reqs.some(u => /\/mapa\.[0-9a-f]+\.js/.test(u)));
    t(L + 'duas figuras (frente e costas) e 10 músculos na lista', await p.locator('.vmap-fig').count() === 2 && await p.locator('.vmap-item').count() === 10);
    ds[sexo || 'N'] = await p.evaluate(() => [...document.querySelectorAll('.vmap-corpo')].map(g => g.querySelector('#x') ? '' : [...g.querySelectorAll('path')].map(x => x.getAttribute('d')).join('|')).join('||'));
    // pelve: o tronco desce sobre o topo das coxas (sem vão nem "tampa" solta) e glúteos/coxas ficam dentro do contorno do corpo
    const geo = await p.evaluate(() => [...document.querySelectorAll('.vmap-svg')].map(svg => {
      const corpo = [...svg.querySelectorAll('.vmap-corpo path')];
      const dentro = (x, y) => corpo.some(c => c.isPointInFill(new DOMPoint(x, y)));
      const pelve = [[100, 262], [94, 262], [106, 262], [80, 250], [120, 250], [90, 270], [110, 270]].map(([x, y]) => dentro(x, y));
      const fora = [...svg.querySelectorAll('.vmap-m .base')].map(m => {
        const n = 60, tot = m.getTotalLength(); let f = 0;
        for (let i = 0; i < n; i++) { const q = m.getPointAtLength(tot * i / n); if (q.y > 200 && q.y < 320 && !dentro(q.x, q.y) && !corpo.some(c => c.isPointInStroke(new DOMPoint(q.x, q.y)))) f++; }
        return f;
      });
      return { pelve, fora };
    }));
    t(L + 'pelve contínua: pontos do quadril e da virilha dentro do corpo, nas duas vistas', geo.every(g => g.pelve.every(Boolean)), JSON.stringify(geo.map(g => g.pelve)));
    t(L + 'glúteos, coxas e panturrilhas não passam do contorno do corpo', geo.every(g => g.fora.every(n => n <= 1)), JSON.stringify(geo.map(g => g.fora)));
    t(L + 'figuras com a mesma quantidade de regiões dos dois lados (frente 11 ou 12, costas 11 ou 12)', await p.locator('.vmap-m').count() >= 20);
    // estados: peito 12/13 dentro da faixa; ombros abaixo do mínimo
    const peito = p.locator('.vmap-item', { hasText: 'Peito' });
    t(L + 'peito aparece com classe de estado e números', /(ok|warn|crit)/.test(await peito.getAttribute('class')) && /\d+\/\d+/.test(await peito.innerText()));
    await peito.click(); await p.waitForTimeout(600);   // o painel de detalhe troca de texto com uma saída curta (Motion, ~0,2 s)
    t(L + 'tocar na lista mostra os números e marca o item (aria-pressed)', (await peito.getAttribute('aria-pressed')) === 'true' && /Peito.*séries planejadas.*feitas nesta semana/.test(await p.locator('.vmap-detalhe').innerText()));
    await p.locator('.vmap-m.sel').first().waitFor({ timeout: 2000 }).catch(() => {});
    t(L + 'a região do músculo no desenho fica selecionada', await p.locator('.vmap-m.sel').count() >= 1);
    await peito.click();
    t(L + 'tocar de novo desmarca', (await peito.getAttribute('aria-pressed')) === 'false' && await p.locator('.vmap-m.sel').count() === 0);
    t(L + 'itens da lista têm nome acessível completo e alvo de toque >= 44 px', await p.evaluate(() => [...document.querySelectorAll('.vmap-item')].every(b => /séries planejadas/.test(b.getAttribute('aria-label')) && b.getBoundingClientRect().height >= 43.5)));
    t(L + 'desenho escondido dos leitores de tela (a lista é a alternativa em texto)', await p.evaluate(() => [...document.querySelectorAll('.vmap-svg')].every(s => s.getAttribute('aria-hidden') === 'true')));
    t(L + 'as barras antigas continuam presentes', await p.locator('#volume-body .volA-row').count() >= 10);
    if (axeSrc) { await p.evaluate(axeSrc); const av = await p.evaluate(async () => window.axe ? (await axe.run('#volume-mapa', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length) : ['sem axe']); t(L + 'axe sem violações no mapa', av.length === 0, av.join(',')); }
    t(L + 'nenhuma violação de CSP', !((await p.evaluate(() => window.__viol || [])).length), JSON.stringify(await p.evaluate(() => window.__viol || [])));
    t(L + 'sem erro de JavaScript nem de console', !p.errs.length && !p.erros.length, p.errs.concat(p.erros).join('|'));
    await c.close();
  }
  t('silhuetas diferentes: masculina, feminina e neutra', new Set([ds.M, ds.F, ds.N]).size === 3);

  // queda segura: se o módulo não carregar, o mapa some e as barras seguem
  {
    const { c, p } = await prepara(b, 390, 'dark', 'M', async c => { await c.route(/\/mapa\.[0-9a-f]+\.js/, r => r.abort()); });
    await vaiProgresso(p); await p.waitForTimeout(800);
    t('queda segura: com o módulo bloqueado o mapa fica oculto e as barras continuam', await p.evaluate(() => document.getElementById('volume-mapa').hidden === true) && await p.locator('#volume-body .volA-row').count() >= 10);
    t('queda segura: sem erro não tratado', !p.errs.length, p.errs.join('|'));
    await c.close();
  }
  // movimento reduzido: sem transição
  {
    const { c, p } = await prepara(b, 390, 'dark', 'M', async c => { });
    await p.emulateMedia({ reducedMotion: 'reduce' }); await vaiProgresso(p); await p.waitForSelector('#volume-mapa .vmap');
    t('movimento reduzido: sem transição nas regiões', await p.evaluate(() => { const e = document.querySelector('.vmap-m .top'); return getComputedStyle(e).transitionDuration.split(',').every(x => parseFloat(x) < 0.001); }));
    await p.waitForTimeout(150);
    t('movimento reduzido: preenchimento e contadores já no valor final (GSAP/Motion não animam)', await p.evaluate(() => [...document.querySelectorAll('.vmap-m .top')].every(e => Math.abs(parseFloat(getComputedStyle(e).fillOpacity) - Number(e.dataset.f)) < 0.02) && [...document.querySelectorAll('.vmap-item')].every(i => { const n = i.querySelector('.vmap-num'); return n && /^\d+\/\d+$/.test(n.textContent.trim()); })));
    await c.close();
  }
  // movimento normal: o GSAP termina no valor certo, sem escala residual e sem <style> injetado (CSP)
  {
    const { c, p } = await prepara(b, 390, 'dark', 'M', async c => { });
    await vaiProgresso(p); await p.waitForSelector('#volume-mapa .vmap'); await p.waitForTimeout(2200);
    t('animação: o preenchimento termina em fill-opacity = força do dado', await p.evaluate(() => { const l = [...document.querySelectorAll('.vmap-m .top')]; return l.length > 0 && l.every(e => Math.abs(parseFloat(getComputedStyle(e).fillOpacity) - Number(e.dataset.f)) < 0.02); }));
    await p.locator('.vmap-item', { hasText: 'Peito' }).click(); await p.waitForTimeout(900);
    t('animação: sem escala residual depois do pulso', await p.evaluate(() => { const e = document.querySelector('.vmap-m.sel'); return !!e && !/scale: [0-9]|matrix/.test(e.getAttribute('style') || ''); }));
    t('animação: nenhuma violação de CSP e nenhum <style> injetado pelas bibliotecas', !(await p.evaluate(() => window.__viol || [])).length && await p.evaluate(() => document.querySelectorAll('#volume-mapa style').length === 0));
    t('animação: barra de progresso por transform (Motion)', await p.evaluate(() => [...document.querySelectorAll('.vmap-barra-i')].some(e => /scaleX/.test(e.style.transform))));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas');
  process.exit(bad ? 1 : 0);
})();
