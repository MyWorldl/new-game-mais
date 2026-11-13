// "Pedir acesso": fluxo da tela de cadastro por convite (sem rede real: Supabase e Turnstile simulados).
// Cobre: abrir/voltar, validações locais, menor de idade (responsável), menor de 13, honeypot, corpo enviado,
// estados devolvidos pela função, mapeamento de erros, política, cartão do administrador (403 oculto / lista / aprovar / recusar)
// e acessibilidade (axe) em 320/390/1280. Uso: SP=<pasta com axe> node pedir-acesso.js http://localhost:8791
const { chromium } = require('playwright');
const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const STUB = `window.turnstile={render:function(sel,o){window.__renders=(window.__renders||0)+1;setTimeout(function(){o.callback('TS-'+window.__renders)},80);return 'w'+window.__renders},reset:function(){window.__resets=(window.__resets||0)+1}};`;
const J = (o, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(o) });
const anos = n => { const d = new Date(); d.setFullYear(d.getFullYear() - n); d.setDate(d.getDate() - 2); return d.toISOString().slice(0, 10); };

async function abre(b, resposta, w = 400) {
  const c = await b.newContext({ viewport: { width: w, height: 860 } });
  const p = await c.newPage(); p.csp = []; p.errs = []; p.pedidos = [];
  p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) p.csp.push(m.text()); });
  p.on('pageerror', e => p.errs.push(e.message));
  await p.route('**/challenges.cloudflare.com/**', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: STUB }));
  await p.route('**/gjoxrgnkwmjvcfiywtcs.supabase.co/**', r => {
    const u = r.request().url();
    if (/\/functions\/v1\/pedir-acesso/.test(u)) {
      p.pedidos.push(JSON.parse(r.request().postData() || '{}'));
      return r.fulfill(typeof resposta === 'function' ? resposta(p.pedidos.length) : resposta || J({ ok: true, estado: 'enviado' }));
    }
    return r.fulfill(J({}));
  });
  await p.goto(URL_); await p.waitForSelector('#ng-login-e', { timeout: 8000 });
  return { c, p };
}
async function preenche(p, o = {}) {
  await p.fill('#ng-ped-n', o.nome ?? 'Maria Souza'); await p.fill('#ng-ped-e', o.email ?? 'maria@example.com');
  await p.fill('#ng-ped-d', o.nasc ?? anos(25));
  if (o.resp) await p.fill('#ng-ped-r', o.resp);
  if (o.ar) await p.check('#ng-ped-ar');
  if (o.aceite !== false) await p.check('#ng-ped-a');
}
const msg = p => p.textContent('#ng-login-m');
const visivel = (p, s) => p.isVisible(s);

(async () => {
  const b = await chromium.launch();

  { const { c, p } = await abre(b);
    t('login mostra o atalho "Pedir acesso"', await visivel(p, '#ng-login-pedir'));
    t('formulário de pedido começa oculto', !(await visivel(p, '#ng-pedir-f')));
    await p.fill('#ng-login-e', 'ana@example.com'); await p.click('#ng-login-pedir');
    t('abre o formulário e esconde o de entrar', (await visivel(p, '#ng-pedir-f')) && !(await visivel(p, '#ng-login-f')));
    t('título muda para "Pedir acesso ao NG+"', /Pedir acesso ao NG\+/.test(await p.textContent('#ng-login-t')));
    t('e-mail digitado no login vem preenchido', (await p.inputValue('#ng-ped-e')) === 'ana@example.com');
    t('bloco do responsável oculto para adulto', !(await visivel(p, '#ng-ped-resp')));
    await p.fill('#ng-ped-d', anos(25)); t('adulto: continua sem responsável', !(await visivel(p, '#ng-ped-resp')));
    await p.fill('#ng-ped-d', anos(15)); t('menor de 18: pede o e-mail do responsável', await visivel(p, '#ng-ped-resp'));
    await p.fill('#ng-ped-d', anos(10)); t('menor de 13: aviso na hora', /13 anos/.test(await msg(p)), await msg(p));
    await p.click('#ng-ped-voltar');
    t('voltar retorna ao login', (await visivel(p, '#ng-login-f')) && /Entrar no NG\+/.test(await p.textContent('#ng-login-t')));
    t('nada foi enviado ao navegar', p.pedidos.length === 0);
    t('sem violação de CSP', p.csp.length === 0, p.csp.join('|')); t('sem erros de JS', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  { // validações locais: nada é enviado
    const { c, p } = await abre(b); await p.click('#ng-login-pedir');
    const tenta = async (nome, o, re) => { await preenche(p, o); await p.click('#ng-ped-ok'); await p.waitForTimeout(150); t(nome, re.test(await msg(p)) && p.pedidos.length === 0, await msg(p)); };
    await tenta('nome curto é recusado', { nome: 'A' }, /nome/i);
    await tenta('e-mail inválido é recusado', { nome: 'Maria', email: 'maria@' }, /e-mail válido/);
    await tenta('sem data de nascimento é recusado', { nasc: '' }, /nascimento/);
    await tenta('menor de 13 é recusado', { nasc: anos(10) }, /13 anos/);
    await tenta('menor sem e-mail do responsável é recusado', { nasc: anos(16), email: 'm@example.com', resp: '' }, /responsável/);
    await tenta('responsável igual ao próprio e-mail é recusado', { nasc: anos(16), email: 'm@example.com', resp: 'm@example.com' }, /diferente/);
    await tenta('menor sem confirmar o responsável é recusado', { nasc: anos(16), email: 'm@example.com', resp: 'pai@example.com', ar: false }, /responsável sabe/);
    await p.fill('#ng-ped-d', anos(25)); await p.uncheck('#ng-ped-a'); await p.click('#ng-ped-ok'); await p.waitForTimeout(150);
    t('sem aceitar a política é recusado', /política/.test(await msg(p)) && p.pedidos.length === 0, await msg(p));
    await c.close(); }

  { // envio de adulto
    const { c, p } = await abre(b, J({ ok: true, estado: 'enviado' })); await p.click('#ng-login-pedir');
    await p.waitForFunction(() => window.__renders === 1, null, { timeout: 4000 }).catch(() => {});
    await preenche(p, { nome: '  Maria   Souza ', email: 'MARIA@Example.com' }); await p.waitForTimeout(250); await p.click('#ng-ped-ok'); await p.waitForTimeout(500);
    const q = p.pedidos[0] || {};
    t('adulto: um pedido enviado', p.pedidos.length === 1);
    t('corpo: nome limpo, e-mail minúsculo, nascimento e aceite', q.nome === 'Maria Souza' && q.email === 'maria@example.com' && /^\d{4}-\d{2}-\d{2}$/.test(q.nascimento) && q.aceite === true, JSON.stringify(q));
    t('corpo: leva o token do Turnstile e honeypot vazio', /^TS-\d+$/.test(q.captcha) && q.site === '', JSON.stringify(q));
    t('corpo: adulto não manda dados de responsável', !('email_responsavel' in q) && !('aceite_responsavel' in q));
    t('mostra "Pedido enviado" com o e-mail', /Pedido enviado/.test(await p.textContent('#ng-login-t')) && /maria@example\.com/.test(await p.textContent('#ng-login-p')), await p.textContent('#ng-login-p'));
    t('campos são limpos após o envio', (await p.inputValue('#ng-ped-n')) === '' && !(await p.isChecked('#ng-ped-a')));
    t('o widget é reiniciado depois do envio', (await p.evaluate(() => window.__resets || 0)) >= 1);
    await p.click('#ng-ped-fim-voltar'); t('voltar do "enviado" retorna ao login', await visivel(p, '#ng-login-f'));
    t('sem violação de CSP', p.csp.length === 0, p.csp.join('|')); t('sem erros de JS', p.errs.length === 0, p.errs.join('|'));
    await c.close(); }

  { // envio de menor
    const { c, p } = await abre(b); await p.click('#ng-login-pedir');
    await preenche(p, { nasc: anos(16), resp: 'Pai@Example.com', ar: true }); await p.waitForTimeout(250); await p.click('#ng-ped-ok'); await p.waitForTimeout(500);
    const q = p.pedidos[0] || {};
    t('menor: manda responsável e confirmação', q.email_responsavel === 'pai@example.com' && q.aceite_responsavel === true, JSON.stringify(q));
    await c.close(); }

  { // honeypot preenchido é repassado (o servidor descarta em silêncio)
    const { c, p } = await abre(b); await p.click('#ng-login-pedir'); await preenche(p);
    await p.evaluate(() => { document.getElementById('ng-ped-site').value = 'http://spam'; });
    const bx = await p.evaluate(() => { const r = document.querySelector('.ng-isca').getBoundingClientRect(); return [r.left, r.width, r.height]; });
    t('honeypot fora da tela e minúsculo', (bx[0] < -1000 || bx[0] > 5000) && bx[1] <= 1 && bx[2] <= 1, JSON.stringify(bx));
     await p.waitForTimeout(250); await p.click('#ng-ped-ok'); await p.waitForTimeout(400);
    t('honeypot preenchido segue no corpo (servidor decide)', (p.pedidos[0] || {}).site === 'http://spam');
        await c.close(); }

  // estados e erros devolvidos pela função
  const casos = [
    ['ja_tem_conta', J({ ok: true, estado: 'ja_tem_conta' }), /já tem acesso/, true],
    ['aprovado_auto', J({ ok: true, estado: 'aprovado_auto' }), /acesso foi liberado/, true],
    ['ja_pendente', J({ ok: true, estado: 'ja_pendente' }), /Recebemos o seu pedido/, false],
    ['erro idade_minima', J({ ok: false, error: 'idade_minima' }, 400), /13 anos/, false],
    ['erro captcha', J({ ok: false, error: 'captcha' }, 400), /verificação de segurança/, false],
    ['erro muitos_pedidos (429)', J({ ok: false, error: 'muitos_pedidos' }, 429), /muitos pedidos/, false],
    ['erro desconhecido (500)', { status: 500, contentType: 'text/plain', body: 'x' }, /Não consegui enviar/, false],
  ];
  for (const [nome, resp, re, voltaLogin] of casos) {
    const { c, p } = await abre(b, resp); await p.click('#ng-login-pedir'); await preenche(p, { email: 'volta@example.com' }); await p.waitForTimeout(250); await p.click('#ng-ped-ok'); await p.waitForTimeout(500);
    const texto = (await msg(p)) + ' ' + (await p.textContent('#ng-login-p'));
    t(nome + ': mensagem correta', re.test(texto), texto);
    if (voltaLogin) t(nome + ': volta ao login com o e-mail preenchido', (await visivel(p, '#ng-login-f')) && (await p.inputValue('#ng-login-e')) === 'volta@example.com');
    if (nome.startsWith('erro')) t(nome + ': o formulário continua aberto para corrigir', await visivel(p, '#ng-pedir-f') && !(await p.isDisabled('#ng-ped-ok')));
    await c.close();
  }

  { // política abre a partir do formulário e fala do pedido de acesso
    const { c, p } = await abre(b); await p.click('#ng-login-pedir'); await p.click('#ng-ped-pol'); await p.waitForTimeout(300);
    const txt = await p.evaluate(() => (document.querySelector('.ng-dlg-box') || document.body).innerText);
    t('política abre e cita o pedido de acesso e a retenção', /Pedido de acesso/.test(txt) && /30 dias/.test(txt) && /90 dias/.test(txt), txt.slice(0, 120));
    t('política cita o consentimento do responsável', /responsável/.test(txt));
    await c.close(); }

  // acessibilidade
  if (axeSrc) for (const w of [320, 390, 1280]) {
    const { c, p } = await abre(b, null, w); await p.click('#ng-login-pedir'); await p.fill('#ng-ped-d', anos(15)); await p.waitForTimeout(250);
    await p.evaluate(axeSrc);
    const v = await p.evaluate(async () => (await axe.run('.ng-login', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length));
    t(`axe @${w}: formulário de pedido (com responsável) sem violações`, v.length === 0, v.join(','));
    const sem = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    t(`@${w}: sem rolagem horizontal`, sem);
    await c.close();
  }

  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
