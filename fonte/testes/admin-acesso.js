// Cartão "Pedidos de acesso" (Config): aparece só para administradores (a função devolve 403 para os demais), lista pendentes,
// aprova/recusa com um toque e mostra as mensagens certas. Sessão e Supabase simulados. Uso: SP=<axe> node admin-acesso.js http://localhost:8791
const { chromium } = require('playwright');
const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const REF = 'gjoxrgnkwmjvcfiywtcs', UID = '11111111-1111-4111-8111-111111111111', MAIL = 'gabriel@example.com';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const J = (o, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(o) });
const PEND = [
  { id: 'id-1', criado_em: '2026-11-10T12:00:00Z', nome: 'Maria <b>Souza</b>', email: 'maria@example.com', idade: 25, menor: false, email_responsavel: null },
  { id: 'id-2', criado_em: '2026-11-11T12:00:00Z', nome: 'João Pedro', email: 'joao@example.com', idade: 15, menor: true, email_responsavel: 'pai@example.com' }];
async function abre(b, listar, acao, w = 400) {
  const c = await b.newContext({ viewport: { width: w, height: 900 } });
  await c.addInitScript(([REF, UID, MAIL]) => { try {
    if (sessionStorage.getItem('semeado')) return; sessionStorage.setItem('semeado', '1');
    localStorage.setItem('sb-' + REF + '-auth-token', JSON.stringify({ access_token: 'a.b.c', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user: { id: UID, email: MAIL, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' } }));
  } catch (e) { } }, [REF, UID, MAIL]);
  const p = await c.newPage(); p.errs = []; p.csp = []; p.chamadas = [];
  p.on('pageerror', e => p.errs.push(e.message));
  p.on('console', m => { if (/Content.Security.Policy/i.test(m.text())) p.csp.push(m.text()); });
  await p.route('**/challenges.cloudflare.com/**', r => r.abort());
  await p.route('**/' + REF + '.supabase.co/**', r => {
    const u = r.request().url();
    if (/\/functions\/v1\/gerir-acesso/.test(u)) {
      const corpo = JSON.parse(r.request().postData() || '{}'); p.chamadas.push({ corpo, auth: r.request().headers()['authorization'] });
      return corpo.acao === 'listar' ? r.fulfill(listar(p)) : r.fulfill(acao(corpo, p));
    }
    if (/\/rest\/v1\//.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'content-range': '*/0' }, body: '[]' });
    return r.fulfill(J({}));
  });
  await p.goto(URL_); await p.waitForTimeout(2200);
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(700);
  await p.evaluate(() => { const m = document.getElementById('modal-root'); if (m) { try { m.hidePopover(); } catch (e) { } m.innerHTML = ''; } document.querySelectorAll('[inert]').forEach(e => e.removeAttribute('inert')); document.body.style.overflow = ''; });   // boas-vindas da conta nova: não é o assunto deste teste
  await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
  return { c, p };
}
(async () => {
  const b = await chromium.launch();
  { const { c, p } = await abre(b, () => J({ ok: false, error: 'sem_permissao' }, 403), () => J({}));
    t('não administrador: o cartão fica oculto', !(await p.isVisible('#cfg-admin')));
    t('a consulta foi feita com o token da sessão', p.chamadas.length >= 1 && /^Bearer a\.b\.c$/.test(p.chamadas[0].auth || ''), JSON.stringify(p.chamadas[0]));
    t('não administrador: nenhum dado de pedido no HTML', (await p.innerHTML('#cfg-admin-lista')).trim() === '' && !/maria|joao/i.test(await p.innerHTML('#cfg-admin')));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  { let perdeu = false;   // era administrador, perdeu a permissão: ao atualizar, o cartão some e a lista é apagada da tela
    const { c, p } = await abre(b, () => (!perdeu ? J({ ok: true, pendentes: PEND, recentes: [] }) : J({ ok: false, error: 'sem_permissao' }, 403)), () => J({}));
    t('antes: administrador vê o cartão com a lista', await p.isVisible('#cfg-admin') && (await p.$$('#cfg-admin-lista .ng-adm-item')).length === 2);
    perdeu = true; await p.evaluate(() => document.getElementById('cfg-admin-atualiza').click()); await p.waitForTimeout(700);
    t('depois do 403: cartão oculto', !(await p.isVisible('#cfg-admin')));
    t('depois do 403: lista apagada do HTML', (await p.innerHTML('#cfg-admin-lista')).trim() === '' && !/maria|joao/i.test(await p.innerHTML('#cfg-admin')));
    await c.close(); }

  { let lista = PEND.slice();
    const { c, p } = await abre(b, () => J({ ok: true, pendentes: lista, recentes: [] }), (corpo) => {
      lista = lista.filter(x => x.id !== corpo.id);
      return J(corpo.acao === 'recusar' ? { ok: true } : { ok: true, email_enviado: true, ja_existia: false });
    });
    t('administrador: o cartão aparece', await p.isVisible('#cfg-admin'));
    t('mostra o contador de pedidos', /2 pedidos esperando/.test(await p.textContent('#cfg-admin-cnt')), await p.textContent('#cfg-admin-cnt'));
    const itens = await p.$$('#cfg-admin-lista .ng-adm-item'); t('lista os dois pedidos', itens.length === 2);
    t('nome é escrito como texto (sem injetar HTML)', (await p.textContent('#cfg-admin-lista')).includes('Maria <b>Souza</b>') && (await p.$$('#cfg-admin-lista b')).length === 0);
    const txt = await p.textContent('#cfg-admin-lista');
    t('menor mostra idade, selo e responsável', /15 anos/.test(txt) && /menor de 18/.test(txt) && /pai@example\.com/.test(txt), txt.slice(0, 200));
    if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('#cfg-admin', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: cartão sem violações', v.length === 0, v.join(',')); }
    await p.click('#cfg-admin-lista [data-id="id-1"] [data-adm="aprovar"]'); await p.waitForTimeout(500);
    const ap = p.chamadas.find(x => x.corpo.acao === 'aprovar');
    t('aprovar chama a função com o id', !!ap && ap.corpo.id === 'id-1', JSON.stringify(ap));
    t('aprovado: mensagem de convite enviado', /Enviei o convite por e-mail/.test(await p.textContent('#cfg-admin-msg')), await p.textContent('#cfg-admin-msg'));
    t('a lista é atualizada (1 pedido)', (await p.$$('#cfg-admin-lista .ng-adm-item')).length === 1 && /1 pedido esperando/.test(await p.textContent('#cfg-admin-cnt')));
    await p.click('#cfg-admin-lista [data-id="id-2"] [data-adm="recusar"]'); await p.waitForTimeout(500);
    t('recusar: mensagem e lista vazia', /Pedido recusado/.test(await p.textContent('#cfg-admin-msg')) && /Nenhum pedido/.test(await p.textContent('#cfg-admin-lista')), await p.textContent('#cfg-admin-msg'));
    t('sem violação de CSP e sem erros de JS', p.csp.length === 0 && p.errs.length === 0, p.csp.concat(p.errs).join('|'));
    await c.close(); }

  { let lista = [PEND[0]];
    const { c, p } = await abre(b, () => J({ ok: true, pendentes: lista, recentes: [] }), () => J({ ok: true, email_enviado: false, ja_existia: false }));
    await p.click('#cfg-admin-lista [data-adm="aprovar"]'); await p.waitForTimeout(500);
    t('convite não saiu: avisa para a pessoa entrar com o e-mail', /e-mail de convite não saiu/.test(await p.textContent('#cfg-admin-msg')), await p.textContent('#cfg-admin-msg'));
    await c.close(); }

  { const { c, p } = await abre(b, () => J({ ok: true, pendentes: [PEND[0]], recentes: [] }), () => J({ ok: false, error: 'pedido_nao_encontrado' }, 404));
    await p.click('#cfg-admin-lista [data-adm="aprovar"]'); await p.waitForTimeout(500);
    t('pedido já decidido (404): mensagem clara', /já foi decidido/.test(await p.textContent('#cfg-admin-msg')), await p.textContent('#cfg-admin-msg'));
    await c.close(); }

  { const { c, p } = await abre(b, () => J({ ok: true, pendentes: [PEND[0]], recentes: [] }), () => J({ ok: true, ja_existia: true }));
    await p.click('#cfg-admin-lista [data-adm="aprovar"]'); await p.waitForTimeout(500);
    t('quem já tinha conta: mensagem própria', /já tinha conta/.test(await p.textContent('#cfg-admin-msg')), await p.textContent('#cfg-admin-msg'));
    await c.close(); }

  if (axeSrc) for (const w of [320, 1280]) {
    const { c, p } = await abre(b, () => J({ ok: true, pendentes: PEND, recentes: [] }), () => J({ ok: true }), w);
    t(`@${w}: sem rolagem horizontal`, await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    await c.close();
  }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
