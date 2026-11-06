const { chromium } = require('playwright'); const fs = require('fs');
const html = fs.readFileSync(process.argv[2], 'utf8'); const rt = fs.readFileSync('pacote/bff-runtime.js', 'utf8');
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const MAP = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
(async () => {
  const b = await chromium.launch(); let bad = 0; const t = (n, c, x = '') => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 250) : '')); };
  for (const w of [360, 400, 1280]) {
    const c = await b.newContext({ viewport: { width: w, height: 900 } });
    await c.route('**/*', r => { const u = r.request().url(); if (u === 'https://prd.test/') r.fulfill({ contentType: 'text/html', body: html }); else if (/fonts\.(googleapis|gstatic)/.test(u)) r.fulfill({ status: 200, contentType: 'text/css', body: '' }); else r.continue(); });
    await c.addInitScript(rt);
    const p = await c.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('PE ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('CE ' + m.text().slice(0, 160)); });
    await p.goto('https://prd.test/'); await p.waitForTimeout(1500);
    const hoje = iso(Date.now()), kh = MAP[new Date().getDay()];
    await p.evaluate(async ([hoje, kh]) => {
      const db = await window.claude.use('db'); if (!db) throw new Error('sem db');
      await db.doc('config/perfil').set({ nomeCompleto: 'T', nomeUsuario: 't.t', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', criadoEm: hoje });
      await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 80, cinturaCm: 85, pescocoCm: 38 });
    }, [hoje, kh]);
    await p.reload(); await p.waitForTimeout(1800);
    await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const a = document.querySelector('.app'); if (a) a.removeAttribute('inert'); });
    t(`@${w} sem erros de JS`, errs.length === 0, errs.join(' | '));
    t(`@${w} Fase 8: Sua semana é cartão fixo; Missões fixas`, await p.evaluate(() => !!document.querySelector('section.cc-semana-card#cc-semana') && !!document.querySelector('section#cc-missoes') && !document.querySelector('details#cc-semana')));
    t(`@${w} Fase 9: Peso + Resumo unidos (#cc-resumo dentro de #cc-peso)`, await p.evaluate(() => !!document.querySelector('#cc-peso #cc-resumo')));
    t(`@${w} sem selo DEV nem cadastro de teste`, await p.evaluate(() => !document.querySelector('.dev-badge') && !document.getElementById('dev-cadastro') && !document.getElementById('ds-page')));
    t(`@${w} Config: Conta antes de Personalização`, await p.evaluate(() => { const h = [...document.querySelectorAll('#view-config .card-head h2')].map(x => x.textContent.trim()); return h.indexOf('Conta') >= 0 && h.indexOf('Conta') < h.indexOf('Personalização'); }));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(500);
    t(`@${w} Treino: sem .treino-split em colunas (largura toda)`, await p.evaluate(() => { const s = document.querySelector('.treino-split'); return !s || getComputedStyle(s).display === 'contents'; }));
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(400);
    t(`@${w} Perfil: "Gênero para cálculo"`, await p.evaluate(() => /Gênero para cálculo/.test(document.getElementById('view-perfil').innerText)));
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    t(`@${w} sem rolagem horizontal`, ov <= 0, ov);
    await c.close();
  }
  console.log(bad ? 'FALHAS: ' + bad : 'TUDO OK'); await b.close(); process.exit(bad ? 1 : 0);
})();
