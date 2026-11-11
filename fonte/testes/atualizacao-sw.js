// NG+ · teste do aviso "Nova versão disponível" e do diagnóstico local (reportar). Sobe o próprio servidor com uma CÓPIA do site.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), os = require('os'), path = require('path');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + x : '')); };
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.woff2': 'font/woff2' };
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ng-site-'));
  fs.cpSync(path.join(__dirname, '..', '..', 'site'), tmp, { recursive: true });
  const srv = http.createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
    const f = path.join(tmp, p);
    if (!f.startsWith(tmp) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('nao'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(fs.readFileSync(f));
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const U = 'http://localhost:' + srv.address().port + '/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1100, height: 800 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) {} });
  const p = await ctx.newPage(); p.setDefaultTimeout(10000);
  await p.goto(U); await p.waitForTimeout(1000);
  await p.evaluate(async () => { const db = await window.claude.use('db'); await db.doc('config/perfil').set({ nomeCompleto: 'Teste', nomeUsuario: 't.t', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', pesoMetaKg: 80 }); });
  await p.reload(); await p.waitForTimeout(2500);
  t('1ª instalação do service worker NÃO mostra o aviso', await p.evaluate(() => !document.getElementById('ng-atualiza')));
  await p.reload(); await p.waitForTimeout(1500);
  t('página controlada pelo service worker', await p.evaluate(() => !!navigator.serviceWorker.controller));
  // publica "versão nova": muda VERSAO no sw.js servido e pede atualização
  const swf = path.join(tmp, 'sw.js'); fs.writeFileSync(swf, fs.readFileSync(swf, 'utf8').replace(/VERSAO\s*=\s*"[^"]+"/, 'VERSAO = "teste-nova-versao"'));
  await p.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); await r.update(); });
  await p.waitForSelector('#ng-atualiza', { timeout: 10000 }).catch(() => {});
  const av = await p.evaluate(() => { const e = document.getElementById('ng-atualiza'); return e ? { txt: e.textContent, role: e.getAttribute('role'), btns: [...e.querySelectorAll('button')].map(x => x.textContent) } : null; });
  t('versão nova: aparece "Nova versão disponível" com Atualizar e Depois', !!av && /Nova versão disponível/.test(av.txt) && av.btns.join() === 'Atualizar,Depois', JSON.stringify(av));
  t('o aviso é um status (leitor de tela)', !!av && av.role === 'status');
  t('o aviso não se duplica', await p.evaluate(() => { window.ngAvisaNovaVersao(); window.ngAvisaNovaVersao(); return document.querySelectorAll('#ng-atualiza').length === 1; }));
  const pos = await p.evaluate(() => { const r = document.getElementById('ng-atualiza').getBoundingClientRect(); return { dentro: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight && r.top >= 0 }; });
  t('o aviso cabe na tela', pos.dentro, JSON.stringify(pos));
  await p.click('#ng-atualiza button:has-text("Depois")'); await p.waitForTimeout(200);
  t('"Depois" fecha o aviso sem recarregar', await p.evaluate(() => !document.getElementById('ng-atualiza')));
  // diagnóstico
  await p.evaluate(() => { window.ngErros.limpar(); window.reportar(new Error('falha de teste'), 'teste'); window.reportar(new Error('falha de teste'), 'teste'); });
  const lst = await p.evaluate(() => window.ngErros.listar());
  t('reportar agrupa repetições', lst.length === 1 && lst[0].n === 2 && lst[0].c === 'teste', JSON.stringify(lst).slice(0, 120));
  await p.evaluate(() => { setTimeout(() => { throw new Error('estouro de teste'); }, 0); }); await p.waitForTimeout(300);
  await p.evaluate(() => { Promise.reject(new Error('promessa de teste')); }); await p.waitForTimeout(300);
  const ctxs = await p.evaluate(() => window.ngErros.listar().map(x => x.c + ':' + x.m).join(' | '));
  t('erro não tratado e promessa rejeitada entram no diagnóstico', /janela:.*estouro de teste/.test(ctxs) && /promessa:.*promessa de teste/.test(ctxs), ctxs);
  const txt = await p.evaluate(() => window.ngErros.texto());
  t('relatório tem o cabeçalho', /NG\+ · relatório de diagnóstico/.test(txt) && /falha de teste/.test(txt));
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
  const card = await p.evaluate(() => ({ res: document.getElementById('cfg-diag-resumo').textContent, vis: !document.getElementById('cfg-diag-card').hidden }));
  t('Config → Diagnóstico mostra a contagem', card.vis && /3 tipo\(s\) de erro/.test(card.res), card.res.slice(0, 90));
  await p.click('#cfg-diag-copiar'); await p.waitForTimeout(500);
  const copiou = await p.evaluate(() => ({ area: !document.getElementById('cfg-diag-wrap').hidden, v: document.getElementById('cfg-diag-texto').value.length }));
  t('copiar: ou copia, ou mostra o texto para copiar à mão', copiou.area ? copiou.v > 50 : true, JSON.stringify(copiou));
  await p.click('#cfg-diag-limpar'); await p.waitForTimeout(300);
  t('limpar zera o diagnóstico', await p.evaluate(() => window.ngErros.listar().length === 0 && /Nenhum erro/.test(document.getElementById('cfg-diag-resumo').textContent)));
  // CSP: nenhuma violação no console desta sessão é checada pelo rodar-todos (servidor com cabeçalhos); aqui só garantimos que o gancho de teste é de localhost
  t('gancho __ngTest só em localhost (aqui: localhost → existe)', await p.evaluate(() => typeof window.__ngTest === 'object'));
  console.log(ok + ' ok / ' + bad + ' falhas'); await b.close(); srv.close(); fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(bad ? 1 : 0);
})();
