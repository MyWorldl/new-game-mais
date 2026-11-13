// Rodada de 13/11: foto de perfil, foco corporal obrigatório (com "Corpo todo"), conquista "Primeira Medida" só com peso + medidas,
// menus (<select>) que abrem no Safari e aviso de foco para contas antigas. Uso: node perfil-foto-foco.js http://localhost:8791 [webkit]
const pw = require('playwright');
const zlib = require('zlib');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const WK = process.argv[3] === 'webkit', eng = WK ? pw.webkit : pw.chromium;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const PERFIL = { nomeCompleto: 'Rafaela Souza', nomeUsuario: 'rafa', sexo: 'F', idade: 30, alturaCm: 165, ativo: true, nivelAtividade: 'leve', objetivo: 'manutencao', experiencia: 'intermediario', diasSemana: 3, local: 'academia', criadoEm: '2026-10-01' };
// PNG 40x20 colorido gerado na hora (sem depender de arquivo)
function png() {
  const w = 40, h = 20, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = x * 6; raw[o + 1] = y * 12; raw[o + 2] = 200; } }
  const crc = (b) => { let c, crcT = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } let r = 0xffffffff; for (const x of b) r = crcT[(r ^ x) & 255] ^ (r >>> 8); return (r ^ 0xffffffff) >>> 0; };
  const ch = (tp, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(tp), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', zlib.deflateSync(raw)), ch('IEND', Buffer.alloc(0))]);
}
async function novo(b, w = 1100, h = 900) {
  const c = await b.newContext({ viewport: { width: w, height: h } });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('crash', () => console.log('PAGE CRASH'));
  await p.goto(URL_); await p.waitForTimeout(1500);
  return { c, p };
}
const clk = (p, sel) => WK ? p.evaluate(s => document.querySelector(s).click(), sel) : p.click(sel);   // o WebKit do Playwright (Linux) às vezes cai com mouse real; clique por script evita o falso alarme
const semModal = p => p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); const m = document.getElementById('modal-root'); if (m) { try { m.hidePopover(); } catch (e) { } m.innerHTML = ''; } document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); });
const salva = (p, perfil, med) => p.evaluate(async ([perfil, med, hoje]) => { const db = await window.claude.use('db'); await db.doc('config/perfil').set(perfil); if (med) await db.doc('medicoes/' + hoje).set(Object.assign({ data: hoje }, med)); }, [perfil, med || null, iso(Date.now())]);
const le = p => p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/perfil').get(); return d && (d.data ? d.data() : d); });
(async () => {
  const b = await eng.launch();

  // 1) conquista "Primeira Medida": só com peso + cintura + quadril + pescoço
  for (const [rot, med, feita] of [['só o peso', { pesoKg: 80 }, false], ['peso + cintura + quadril', { pesoKg: 80, cinturaCm: 90, quadrilCm: 100 }, false], ['peso + todas as medidas', { pesoKg: 80, cinturaCm: 90, quadrilCm: 100, pescocoCm: 38 }, true]]) {
    const { c, p } = await novo(b);
    await salva(p, Object.assign({ focos: ['costas'] }, PERFIL), med); await p.reload(); await p.waitForTimeout(1800); await semModal(p);
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(700);
    const txt = await p.evaluate(() => document.querySelector('.badge-grid') ? document.querySelector('.badge-grid').textContent.replace(/\s+/g, '') : '');
    const f = /PrimeiraMedidaFeita/.test(txt);
    t('1) Primeira Medida com ' + rot + (feita ? ': conta como feita' : ': NÃO conta'), f === feita, txt.slice(0, 120));
    await c.close();
  }

  // 2) cadastro: foco obrigatório, "Corpo todo" exclusivo
  { const { c, p } = await novo(b, 900, 1000);
    await clk(p, '#ob-start'); await p.waitForTimeout(300);
    await p.fill('#ob-idade', '30');
    for (const g of ['objetivo', 'experiencia', 'dias', 'local']) await clk(p, '#ob-g-' + g + ' .ob-card:nth-of-type(2)');
    await clk(p, '#ob-next1'); await p.waitForTimeout(300);
    t('2) sem foco o cadastro não avança', await p.locator('#ob-sexo').count() === 0 && /foco/i.test(await p.textContent('#ob-err-foco')), await p.textContent('#ob-err-foco'));
    t('2) "Corpo todo" aparece em destaque (1º, largura total)', await p.evaluate(() => { const a = document.querySelector('#ob-foco .foco-chip'); return a.classList.contains('foco-todo') && /Corpo todo \(full body\)/.test(a.textContent) && a.getBoundingClientRect().width > 300; }));
    await clk(p, '[data-foco="gluteos"]'); await clk(p, '[data-foco="costas"]'); await clk(p, '[data-foco="peito"]');
    t('2) máximo de 2 grupos', (await p.$$('#ob-foco .foco-chip.on')).length === 2 && /até 2/.test(await p.textContent('#ob-foco-msg')));
    await clk(p, '.foco-todo');
    t('2) "Corpo todo" tira os grupos escolhidos', (await p.$$('#ob-foco .foco-chip.on')).length === 1 && await p.getAttribute('.foco-todo', 'aria-pressed') === 'true');
    await clk(p, '[data-foco="ombros"]');
    t('2) escolher um grupo tira o "Corpo todo"', await p.getAttribute('.foco-todo', 'aria-pressed') === 'false' && await p.getAttribute('[data-foco="ombros"]', 'aria-pressed') === 'true');
    await clk(p, '.foco-todo'); await clk(p, '#ob-next1'); await p.waitForTimeout(300);
    t('2) com Corpo todo o cadastro avança', await p.locator('#ob-sexo').count() === 1);
    await p.fill('#ob-nome', 'Teste'); await p.fill('#ob-altura', '170'); await p.fill('#ob-peso', '70'); await p.selectOption('#ob-sexo', 'M');
    await clk(p, '#ob-next2'); await p.waitForTimeout(500); await clk(p, '#ob-finish'); await p.waitForTimeout(500);
    const pf = await le(p);
    t('2) perfil salvo com focos ["corpo_todo"]', JSON.stringify(pf && pf.focos) === '["corpo_todo"]', JSON.stringify(pf && pf.focos));
    t('2) só o peso no cadastro: "Primeira Medida" não conta', !/PrimeiraMedidaFeita/.test(await p.evaluate(() => { document.getElementById('tab-perfil').click(); return document.querySelector('.badge-grid') ? document.querySelector('.badge-grid').textContent.replace(/\s+/g, '') : ''; })));
    t('2) sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  // 3) Editar perfil: foco obrigatório + foto de perfil
  { const { c, p } = await novo(b);
    await salva(p, Object.assign({ focos: ['gluteos'] }, PERFIL)); await p.reload(); await p.waitForTimeout(1800); await semModal(p);
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(500);
    await p.evaluate(() => document.getElementById('btn-edit-perfil').click()); await p.waitForTimeout(400);
    await clk(p, '#p-foco [data-foco="gluteos"]');   // desmarca o único foco
    await p.evaluate(() => document.getElementById('p-save').click()); await p.waitForTimeout(300);
    t('3) sem foco o perfil não salva', /foco/i.test(await p.textContent('#p-erro')) && await p.locator('#p-save').count() === 1, await p.textContent('#p-erro'));
    await clk(p, '#p-foco .foco-todo');
    await p.setInputFiles('#p-foto-arq', { name: 'foto.png', mimeType: 'image/png', buffer: png() }); await p.waitForTimeout(900);
    t('3) foto escolhida: prévia aparece e botão Remover surge', await p.locator('#p-foto-prev img').count() === 1 && await p.isVisible('#p-foto-remover'), await p.textContent('#p-foto-msg'));
    await p.evaluate(() => document.getElementById('p-save').click()); await p.waitForTimeout(700);
    const pf = await le(p);
    t('3) foto salva como JPEG pequeno (data URL ≤ 60 KB)', !!pf && /^data:image\/jpeg;base64,/.test(pf.fotoPerfil || '') && pf.fotoPerfil.length < 60000, pf && (pf.fotoPerfil || '').length);
    t('3) foco salvo = corpo_todo', JSON.stringify(pf.focos) === '["corpo_todo"]');
    t('3) foto aparece no perfil e no topo do app', await p.locator('#perfil-avatar-initials img').count() === 1 && await p.locator('#top-avatar img').count() === 1);
    t('3) a foto cabe no círculo (imagem quadrada, sem esticar)', await p.evaluate(() => { const i = document.querySelector('#perfil-avatar-initials img'); const r = i.getBoundingClientRect(); return Math.abs(r.width - r.height) < 2 && r.width > 30 && getComputedStyle(i).objectFit === 'cover'; }));
    await p.evaluate(() => document.getElementById('btn-edit-perfil').click()); await p.waitForTimeout(400);
    await clk(p, '#p-foto-remover'); await p.evaluate(() => document.getElementById('p-save').click()); await p.waitForTimeout(700);
    const pf2 = await le(p);
    t('3) remover foto: some do perfil, do topo e do banco', !pf2.fotoPerfil && await p.locator('#perfil-avatar-initials img').count() === 0 && await p.locator('#top-avatar img').count() === 0);
    await p.evaluate(() => document.getElementById('btn-edit-perfil').click()); await p.waitForTimeout(400);
    await p.setInputFiles('#p-foto-arq', { name: 'x.txt', mimeType: 'text/plain', buffer: Buffer.from('não sou imagem') }); await p.waitForTimeout(500);
    t('3) arquivo que não é imagem: mensagem clara e nada muda', /Não consegui usar esse arquivo/.test(await p.textContent('#p-foto-msg')) && await p.locator('#p-foto-prev img').count() === 0);
    await p.evaluate(() => document.getElementById('p-save').click()); await p.waitForTimeout(500);
    await p.evaluate(async () => { const db = await window.claude.use('db'); const d = await db.doc('config/perfil').get(); const v = d.data ? d.data() : d; v.fotoPerfil = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; await db.doc('config/perfil').set(v); });
    await p.reload(); await p.waitForTimeout(1500); await semModal(p);
    t('3) foto de fonte não confiável (não é JPEG) é ignorada', await p.locator('#perfil-avatar-initials img').count() === 0);
    t('3) sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  // 4) conta antiga sem foco: o Hoje pede a escolha
  { const { c, p } = await novo(b);
    await salva(p, PERFIL); await p.reload(); await p.waitForTimeout(1800); await semModal(p);
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(500);
    t('4) conta sem foco: aviso "Escolha o seu foco corporal" no Hoje', await p.isVisible('#plano-porque-hoje') && /Escolha o seu foco corporal/.test(await p.textContent('#plano-porque-hoje')));
    await clk(p, '[data-ppq="foco"]'); await p.waitForTimeout(400);
    await clk(p, '#foco-esc-ok'); await p.waitForTimeout(200);
    t('4) salvar sem escolher mostra erro', /Escolha até 2/.test(await p.textContent('#foco-esc-erro')));
    await clk(p, '.foco-chip[data-foco="pernas"]'); await clk(p, '#foco-esc-ok'); await p.waitForTimeout(600);
    const pf = await le(p);
    t('4) foco salvo e aviso some', JSON.stringify(pf.focos) === '["pernas"]' && !/Escolha o seu foco corporal/.test(await p.textContent('#plano-porque-hoje')));
    t('4) sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  // 5) menus: no Safari/WebKit o menu fica nativo (lista sempre visível); nos demais, a lista própria nasce visível
  { const { c, p } = await novo(b);
    await semModal(p);
    await p.evaluate(() => { const d = document.createElement('div'); d.style.cssText = 'position:fixed;top:120px;left:300px;z-index:99999;background:#222;padding:20px'; d.innerHTML = '<select id="zz"><option value="">Selecione</option><option>Masculino</option><option>Feminino</option></select>'; document.body.appendChild(d); });
    const ap = await p.evaluate(() => getComputedStyle(document.getElementById('zz')).appearance);
    const wk = await p.evaluate(() => document.documentElement.hasAttribute('data-wk'));
    if (WK) { t('5) Safari/WebKit: <html data-wk> marcado e menu nativo (appearance não é base-select)', wk && ap !== 'base-select', ap + ' wk=' + wk); }
    else {
      t('5) Chromium: sem data-wk e menu próprio ativo', !wk && ap === 'base-select', ap);
      await p.locator('#zz').click({ force: true }); await p.waitForTimeout(700);
      const st = await p.evaluate(() => { const s = document.getElementById('zz'); const o = s.querySelector('option:nth-child(2)'); const r = o.getBoundingClientRect(); return { open: s.matches(':open'), w: r.width, h: r.height, op: getComputedStyle(s, '::picker(select)').opacity }; });
      t('5) Chromium: a lista abre, tem tamanho e está visível (opacity 1)', st.open && st.w > 20 && st.h > 10 && st.op === '1', JSON.stringify(st));
    }
    t('5) sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
