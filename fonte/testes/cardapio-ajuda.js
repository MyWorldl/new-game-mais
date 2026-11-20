// Ajuda comum dos testes do cardápio: o card agora tem campos selecionáveis (jeito, rotina, refeições por dia, restrições)
// e só aparece depois que a pessoa responde o formulário da caixa flutuante (ou já tinha escolhas salvas).
// abreCardapio(p): vai à Dieta › Cardápio e, se o formulário abrir sozinho, confirma com as escolhas padrão (onívoro, marmita).
// escolhe(p, 'jeito'|'rotina'|'nref'|'restr'|'dia', valor): usa o campo certo.  valorDe(p, campo): valor atual de um campo.
module.exports.abreCardapio = async (p, opts = {}) => {
  await p.evaluate(() => { document.getElementById('tab-dieta').click(); });
  await p.waitForTimeout(500);
  await p.evaluate(() => { const b = document.getElementById('subtab-dieta-cardapio'); if (b) b.click(); });
  await p.waitForTimeout(opts.espera || 900);
  const form = p.locator('[data-form="salvar"]');
  if (await form.count()) { await form.click(); await p.waitForTimeout(900); }
};
module.exports.escolhe = async (p, rot, v) => {
  if (rot === 'dia') { await p.click('[data-cdp="dia"][data-v="' + v + '"]'); return; }
  if (rot === 'restr') {
    await p.evaluate(() => { const d = document.querySelector('details.cdp-multi'); if (d) d.open = true; });
    const c = p.locator('[data-cdp-chk="restr"][data-v="' + v + '"]');
    await c.click();
  } else await p.selectOption('[data-cdp-sel="' + rot + '"]', String(v));
  await p.waitForTimeout(350);
};
module.exports.valorDe = (p, rot, v) => rot === 'restr'
  ? p.evaluate(v => !!document.querySelector('[data-cdp-chk="restr"][data-v="' + v + '"]').checked, v)
  : p.evaluate(r => document.querySelector('[data-cdp-sel="' + r + '"]').value, rot);
