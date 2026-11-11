// Política de privacidade atualizada (fontes locais, lembretes e IA). Uso: node politica.js http://localhost:8791
const { chromium } = require('playwright'); const fs = require('fs');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
const axeSrc = process.env.SP ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 200) : '')); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 400, height: 850 } }); const p = await c.newPage();
  const reqs = []; p.on('request', r => reqs.push(r.url()));
  await p.goto(URL_); await p.waitForSelector('.ng-login', { timeout: 8000 }); await p.click('#ng-login-pol'); await p.waitForSelector('.ng-dlg-box.longo');
  const s = (await p.locator('.ng-dlg-box.longo').innerText()).replace(/\s+/g, ' ');
  t('mantém o essencial: LGPD, art. 18, Supabase, Cloudflare, Gmail, contato', /LGPD/.test(s) && /art\. 18/.test(s) && /Supabase/.test(s) && /Cloudflare/.test(s) && /Gmail/.test(s) && /@/.test(s));
  t('fontes: diz que ficam no próprio app (e não menciona Google Fonts)', /fontes de letra do app ficam dentro do próprio app/.test(s) && !/Google Fonts/i.test(s));
  t('lembretes: dados guardados, serviço de notificações e como apagar', /endereço de notificação/.test(s) && /serviço de notificações/.test(s) && /Os lembretes são apagados/.test(s));
  t('IA: opcional, Anthropic, o que sai e o que não sai, 30 dias, 18 anos, 5 por dia, base legal e como retirar', /treinador por IA \(opcional\)/.test(s) && /Anthropic/.test(s) && /Não é enviado: nome, e-mail, idade, peso, medidas nem fotos/.test(s) && /30 dias/.test(s) && /maiores de 18 anos/.test(s) && /5 resumos por dia/.test(s) && /art\. 7º, I/.test(s) && /Desativar IA/.test(s));
  t('não afirma mais, sem ressalva, que "não envia dados para IA"', !/e não enviamos seus dados para ferramentas de IA\.<\/p>/.test(await p.evaluate(() => document.querySelector('.ng-dlg-box.longo').innerHTML)) && /a menos que você mesmo ative/.test(s));
  t('menores: sem resumo por IA', /resumo por IA não é oferecido a menores de 18/.test(s));
  if (axeSrc) { await p.evaluate(axeSrc); const v = await p.evaluate(async () => (await axe.run('.ng-dlg-box.longo', { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map(x => x.id + ':' + x.nodes.length)); t('axe: política sem violações', v.length === 0, v.join(',')); }
  t('nenhum pedido a Google Fonts', !reqs.some(u => /fonts\.(googleapis|gstatic)\.com/.test(u)));
  await b.close(); console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad ? 1 : 0);
})();
