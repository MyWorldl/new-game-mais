// Redesenho completo (render/renderAll) NÃO pode mudar a rolagem — simula o WebKit, que zera a rolagem quando muitos cartões trocam de conteúdo.
// Uso: node rolagem-render.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1440, 900], [400, 800]]) {
    const c = await b.newContext({ viewport: { width: w, height: h } });
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    const hoje = iso(Date.now());
    await p.evaluate(async (hoje) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80, experiencia: 'intermediario', local: 'academia', criadoEm: '2026-10-01' }); await db.doc('medicoes/' + hoje).set({ data: hoje, pesoKg: 82.4, cinturaCm: 90, quadrilCm: 100 }); }, hoje);
    await p.reload(); await p.waitForTimeout(1800);
    for (const tab of ['painel', 'dieta', 'treino', 'corpo', 'perfil', 'config']) {
      await p.evaluate(tab => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.getElementById('tab-' + tab).click(); }, tab); await p.waitForTimeout(700);
      // simula o WebKit: toda troca de innerHTML dentro de um cartão zera a rolagem (uma vez por lote)
      await p.evaluate(() => {
        if (!window.__wk) {
          window.__wk = true; const d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
          Object.defineProperty(Element.prototype, 'innerHTML', { configurable: true, get: d.get, set(v) { d.set.call(this, v); if (this.closest && this.closest('.card')) window.scrollTo(0, 0); } });
        }
      });
      const alt = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
      const alvo = Math.min(600, Math.floor(alt / 2));
      await p.evaluate(y => window.scrollTo(0, y), alvo); await p.waitForTimeout(250);
      const y0 = await p.evaluate(() => Math.round(scrollY));
      // dispara um redesenho completo por uma escrita de configuração (o mesmo caminho do eco da nuvem)
      await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/settings').set({ ts: Date.now(), skin: 'default' }, { merge: true }).catch(() => db.doc('config/settings').set({ ts: Date.now() })); });
      await p.waitForTimeout(900);
      const y1 = await p.evaluate(() => Math.round(scrollY));
      t(`[${w}px/${tab}] tela alta o bastante (${alt}px) p/ o teste valer`, alvo >= 100, alt);
      t(`[${w}px/${tab}] redesenho não muda a rolagem`, Math.abs(y1 - y0) <= 3, y0 + ' -> ' + y1);
    }
    t(`[${w}] sem erros de JS`, p.errs.length === 0, p.errs.join('|')); await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
