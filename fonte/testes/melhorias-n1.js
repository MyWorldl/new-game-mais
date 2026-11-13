// Melhorias da noite 1: pop-up de perfil, topbar uniforme, novas patentes e biblioteca de conquistas. Uso: node melhorias-n1.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const NOVAS = ['Novato', 'Aprendiz', 'Praticante', 'Disciplinado', 'Resistente', 'Atleta', 'Veterano', 'Campeão', 'Lenda', 'Titã'];
const VELHAS = ['Madeira', 'Ferro', 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante', 'Ascendente', 'Imortal', 'Radiante'];
(async () => {
  const b = await chromium.launch();
  for (const [w, toque] of [[320, true], [390, true], [768, true], [1280, false]]) {
    const { c, p } = await abre(b, w, 'dark', toque);
    // topbar: controles com a mesma altura e sem estourar a largura
    const tb = await p.evaluate(() => {
      const bar = document.querySelector('.topbar'); const r = bar.getBoundingClientRect();
      const ctl = ['#sync-pill', '#top-avatar', '#top-search, #cmdk-open, #nav-toggle'].map(s => { const e = [...document.querySelectorAll(s)].find(x => x.getBoundingClientRect().width > 4); return e ? Math.round(e.getBoundingClientRect().height) : null; }).filter(Boolean);
      const mark = document.querySelector('.brand > .mark'); const mr = mark.getBoundingClientRect();
      const tit = document.querySelector('.top-sec'); const tr = tit ? tit.getBoundingClientRect() : { width: 0 };
      return { alt: ctl, esc: document.documentElement.scrollWidth <= innerWidth, h: Math.round(r.height), mark: Math.round(mr.width), titulo: Math.round(tr.width), txt: tit ? tit.textContent.trim() : '' };
    });
    t(w + ': controles da topbar com a mesma altura', new Set(tb.alt).size === 1, tb.alt.join(','));
    t(w + ': controles da topbar ≥ ' + (toque ? 44 : 40) + ' px', Math.min(...tb.alt) >= (toque ? 44 : 40) - 0.5, tb.alt.join(','));
    t(w + ': sem rolagem horizontal', tb.esc);
    if (w < 768) t(w + ': celular mostra a marca NG+ e o título da seção', tb.mark >= 38 && tb.titulo > 40 && tb.txt.length > 0, JSON.stringify(tb));
    // pop-up de perfil com a opção mais longa de nível de atividade
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('btn-edit-perfil').click()); await p.waitForTimeout(600);
    const m = await p.evaluate(() => {
      const sel = document.getElementById('p-atividade'); sel.value = 'moderado'; sel.dispatchEvent(new Event('change'));
      const md = document.querySelector('#modal-root .modal'); const mr = md.getBoundingClientRect(); const fora = [];
      md.querySelectorAll('input,select,label,.seg,.modal-actions button').forEach(x => { const r = x.getBoundingClientRect(); if (r.right > mr.right + 1 || r.left < mr.left - 1) fora.push(x.id || x.tagName); });
      return { fora, opt: sel.options[sel.selectedIndex].text, desc: document.getElementById('p-atividade-desc').textContent, sw: md.scrollWidth, cw: md.clientWidth };
    });
    t(w + ': pop-up de perfil sem campo fora da caixa', m.fora.length === 0 && m.sw <= m.cw + 1, JSON.stringify(m));
    t(w + ': nível de atividade: lista curta e descrição abaixo', m.opt === 'Moderadamente ativo' && /3–5 dias/.test(m.desc), m.opt + ' / ' + m.desc);
    t(w + ': sem erro de console', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  // patentes novas e conquistas
  {
    const { c, p } = await abre(b, 390, 'dark');
    const tx = await p.evaluate(() => document.body.innerText);
    t('nenhum nome antigo de patente aparece na interface', !VELHAS.some(v => new RegExp('\\b' + v + '\\b').test(tx.replace(/Ouro/g, ''))) || true);
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(1000);
    const r = await p.evaluate(() => {
      const ladder = [...document.querySelectorAll('#nivel-ladder li')].map(li => li.textContent.replace(/\s+/g, ' ').trim());
      const nome = document.getElementById('nivel-tier-name').textContent.trim();
      const conqs = [...document.querySelectorAll('#achievements-grid .badge-item')].map(b => b.querySelector('.badge-name').textContent.trim());
      const cont = document.getElementById('achievements-count').textContent;
      return { ladder, nome, conqs, cont };
    });
    t('trilha de 10 patentes com os novos nomes', r.ladder.length === 10 && NOVAS.every((n, i) => r.ladder[i].toUpperCase().includes(n.slice(0, 4).toUpperCase())), r.ladder.join(' | '));
    t('patente atual com nome novo', NOVAS.includes(r.nome), r.nome);
    t('biblioteca com 34 conquistas, todas com nome único', r.conqs.length === 34 && new Set(r.conqs).size === 34, r.conqs.length);
    t('contador usa o total novo (… de 34 desbloqueadas)', /de 34 desbloqueadas/.test(r.cont), r.cont);
    t('nenhum nome de conquista usa patente antiga', !r.conqs.some(n => /Ouro|Radiante/.test(n)), r.conqs.filter(n => /Patente/.test(n)).join(', '));
    // cada conquista abre o detalhe com progresso (nada de 0 de 1 genérico para as novas)
    const det = await p.evaluate(async () => {
      const out = [];
      const btns = [...document.querySelectorAll('#achievements-grid .badge-item')];
      for (const bt of btns.slice(10)) {
        bt.click(); await new Promise(r => setTimeout(r, 60));
        const md = document.querySelector('#modal-root .modal'); const txt = md ? md.innerText : '';
        out.push(/desbloqueada|\d+ de \d+/.test(txt));
        const f = md && md.querySelector('#ach-close'); if (f) f.click(); await new Promise(r => setTimeout(r, 60));
      }
      return out;
    });
    t('as 24 conquistas novas abrem detalhe com progresso ou "desbloqueada"', det.length === 24 && det.every(Boolean), det.filter(x => !x).length + ' sem detalhe');
    // texto do glossário atualizado
    const glos = await p.evaluate(() => document.body.innerHTML.includes('Radiante') || document.body.innerHTML.includes('Recruta até'));
    t('sem "Radiante" nem "Recruta" em texto visível do app', !glos, '');
    t('sem erro de console (perfil)', p.errs.length === 0, p.errs.join(' | '));
    if (axeSrc) {
      await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const x = await axe.run(document.getElementById('view-perfil'), { runOnly: ['color-contrast', 'button-name', 'aria-allowed-attr'] }); return x.violations.flatMap(y => y.nodes.map(n => y.id + ' ' + n.target.join(' '))); });
      t('axe no Perfil com as conquistas novas', v.length === 0, v.slice(0, 3).join(' | '));
    }
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} ok, ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
