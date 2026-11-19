// Hábitos só podem ser registrados/editados no dia de hoje e no dia anterior; dia mais antigo fica como está; dia futuro nunca.
// Cenário do pedido: dia 1, dia 2 e dia 3 (a pessoa esqueceu os dias 1 e 2 e abre o app no dia 3): consegue preencher o dia 2 (ontem) e o dia 3 (hoje), mas não o dia 1.
// Uso: node habitos-janela.js http://localhost:8791
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const D = n => iso(Date.now() - n * 864e5);
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    const { c, p } = await abre(b, w, 'dark');
    await p.evaluate(() => localStorage.setItem('ng_test_hooks', '1')); await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(700);
    const hoje = D(0), ontem = D(1), dia1 = D(2), amanha = iso(Date.now() + 864e5);
    // o dia 1 e o dia 2 ficam vazios (a pessoa esqueceu); o seed já traz hábitos em outros dias
    await p.evaluate(async ([a, b2]) => { const db = await window.claude.use('db'); for (const d of [a, b2]) await db.doc('checkins/' + d).set({ data: d, dia: 'seg', concluido: false }); }, [dia1, ontem]);
    await p.reload(); await p.waitForTimeout(1500);
    await p.evaluate(() => document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()));
    await p.evaluate(() => document.getElementById('tab-corpo').click()); await p.waitForTimeout(700);
    const st = await p.evaluate(() => { const d = document.getElementById('h-data'); return { v: d.value, min: d.min, max: d.max }; });
    t(L + 'seletor de dia: começa em hoje, mínimo = ontem, máximo = hoje', st.v === hoje && st.min === ontem && st.max === hoje, JSON.stringify(st));
    t(L + 'texto explica a janela (hoje e dia anterior)', /hoje e o dia anterior/i.test(await p.textContent('#hab-janela')));
    const escolhe = async (d) => { await p.fill('#h-data', d); await p.dispatchEvent('#h-data', 'change'); await p.waitForTimeout(250); };
    const estado = () => p.evaluate(() => ({ btn: document.querySelector('#form-habitos button[type=submit]').disabled, sono: document.getElementById('h-sono').disabled, aviso: document.getElementById('hab-aviso').hidden ? '' : document.getElementById('hab-aviso').textContent }));
    // dia 1 (2 dias atrás): bloqueado
    await escolhe(dia1);
    let e = await estado();
    t(L + 'dia 1 (2 dias atrás): campos e botão desligados, com aviso', e.btn && e.sono && /hoje ou de ontem/i.test(e.aviso), JSON.stringify(e));
    const salvoDia1 = await p.evaluate(d => { const c = __ngTest.state().checkins[d]; return c && c.hab ? JSON.stringify(c.hab) : null; }, dia1);
    // tentativa forçada pela função (mesmo se o botão fosse acionado): não grava
    await p.evaluate(() => { document.getElementById('h-sono').disabled = false; document.getElementById('h-sono').value = '8'; document.getElementById('form-habitos').requestSubmit(); });
    await p.waitForTimeout(300);
    const depois = await p.evaluate(d => { const c = __ngTest.state().checkins[d]; return c && c.hab ? JSON.stringify(c.hab) : null; }, dia1);
    t(L + 'dia 1: salvar à força não grava nada', depois === salvoDia1 && depois === null, depois);
    // dia 2 (ontem): editável
    await escolhe(ontem);
    e = await estado();
    t(L + 'dia 2 (ontem): campos e botão ligados, sem aviso', !e.btn && !e.sono && e.aviso === '', JSON.stringify(e));
    await p.fill('#h-sono', '7'); await p.fill('#h-passos', '5000');
    await p.click('#form-habitos button[type=submit]'); await p.waitForTimeout(500);
    const ont = await p.evaluate(d => { const c = __ngTest.state().checkins[d]; return c && c.hab; }, ontem);
    t(L + 'dia 2 (ontem): salva os hábitos', ont && ont.sono === 7 && ont.passos === 5000, JSON.stringify(ont));
    // dia 3 (hoje): editável
    await escolhe(hoje);
    await p.fill('#h-sono', '6.5');
    await p.click('#form-habitos button[type=submit]'); await p.waitForTimeout(500);
    const hj = await p.evaluate(d => { const c = __ngTest.state().checkins[d]; return c && c.hab; }, hoje);
    t(L + 'dia 3 (hoje): salva os hábitos', hj && hj.sono === 6.5, JSON.stringify(hj));
    // dia futuro: bloqueado, com aviso próprio
    await escolhe(amanha);
    e = await estado();
    t(L + 'amanhã: bloqueado, "ainda não chegou"', e.btn && /ainda não chegou/i.test(e.aviso), JSON.stringify(e));
    await p.evaluate(() => { document.getElementById('h-sono').disabled = false; document.getElementById('h-sono').value = '9'; document.getElementById('form-habitos').requestSubmit(); });
    await p.waitForTimeout(300);
    t(L + 'amanhã: salvar à força não cria registro', await p.evaluate(d => !(__ngTest.state().checkins[d] && __ngTest.state().checkins[d].hab), amanha));
    // voltar para hoje religa tudo
    await escolhe(hoje);
    e = await estado();
    t(L + 'voltar para hoje religa o formulário', !e.btn && !e.sono && e.aviso === '', JSON.stringify(e));
    // hábitos antigos continuam à vista (só leitura): a grade e a lista dos 7 dias não mudam
    t(L + 'sem erros de script', p.errs.length === 0, p.errs.join(' | '));
    await c.close();
  }
  await b.close();
  console.log(ok + ' ok, ' + bad + ' falhas'); process.exit(bad ? 1 : 0);
})();
