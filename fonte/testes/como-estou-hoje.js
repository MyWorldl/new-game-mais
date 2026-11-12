// "Como você está hoje?": tela na 1ª abertura de cada dia de treino + botão em Configurações; o cartão saiu do Painel.
// Uso: node como-estou-hoje.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const HOJE = '2026-11-11';   // quarta
const ex = n => [{ nome: 'Ex ' + n + ' 1', series: 3, reps: '8-12', metaReps: 30, musculos: ['peito'] }, { nome: 'Ex ' + n + ' 2', series: 3, reps: '8-12', metaReps: 30, musculos: ['costas'] }];
const R = (nome, ativo = true) => ({ nome, ativo, exercicios: ativo ? ex(nome) : [] });
const ROT = { seg: R('A'), ter: R('B'), qua: R('C'), qui: R('D'), sex: R('E'), sab: R('F'), dom: R('G') };
const ROT_QUA_DESCANSO = Object.assign({}, ROT, { qua: R('Descanso', false) });
const PERFIL = { nomeCompleto: 'Teste', nomeUsuario: 't', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', local: 'academia', pesoMetaKg: 80, criadoEm: '2026-10-01' };
(async () => {
  const b = await chromium.launch();
  const mk = async ({ rotina = ROT, checkins = {}, perfil = PERFIL }) => {
    const c = await b.newContext({ viewport: { width: 400, height: 900 } });
    await c.clock.setFixedTime(new Date(HOJE + 'T10:00:00'));
    await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_test_hooks', '1'); } catch (e) { } });
    const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
    await p.goto(URL_); await p.waitForTimeout(1200);
    await p.evaluate(async ([rotina, checkins, perfil]) => {
      const db = await window.claude.use('db');
      if (perfil) await db.doc('config/perfil').set(perfil);
      for (const [k, d] of Object.entries(rotina)) await db.doc('rotina/' + k).set(d);
      for (const [d, c] of Object.entries(checkins)) await db.doc('checkins/' + d).set(c);
    }, [rotina, checkins, perfil]);
    await p.reload(); await p.waitForTimeout(1800);
    return { c, p };
  };
  const modal = p => p.evaluate(() => { const m = document.querySelector('.modal'); return m ? m.innerText : ''; });
  const doc = (p, path) => p.evaluate(async path => { const db = await window.claude.use('db'); const s = await db.doc(path).get(); return s.exists ? s.data() : null; }, path);

  { const { c, p } = await mk({});
    t('1ª abertura do dia de treino: a tela aparece sozinha', /Como você está hoje\?/.test(await modal(p)), (await modal(p)).slice(0, 80));
    t('o cartão não existe mais no Painel', (await p.locator('#cc-recup').count()) === 0);
    t('sem resposta, o botão diz "Agora não"', (await p.locator('#recup-fechar').innerText()) === 'Agora não');
    await p.click('#recup-fechar'); await p.waitForTimeout(300);
    t('"Agora não" fecha a tela e devolve o app (sem travar)', (await p.locator('.modal').count()) === 0 && (await p.evaluate(() => !document.querySelector('.app').inert)));
    await p.reload(); await p.waitForTimeout(1800);
    t('na 2ª abertura do mesmo dia, não aparece de novo', (await p.locator('.modal').count()) === 0);
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(500);
    t('Configurações: texto "Ainda não respondido hoje"', /Ainda não respondido hoje/.test(await p.locator('#cfg-recup-info').innerText()));
    await p.click('#cfg-recup-btn'); await p.waitForTimeout(400);
    t('botão em Configurações reabre a tela', /Como você está hoje\?/.test(await modal(p)));
    t('em Configurações, com treino hoje e não concluído, mostra Dia leve e Sessão rápida', (await p.locator('[data-plano]').count()) === 2);
    await p.click('button[data-rec="sono"][data-v="0"]'); await p.click('button[data-rec="energia"][data-v="0"]'); await p.waitForTimeout(300);
    t('Sono ruim + energia baixa: orientação de dia leve', /dia leve/i.test(await p.locator('#recup-msg').innerText()), await p.locator('#recup-msg').innerText());
    t('resposta é gravada no check-in do dia', await doc(p, 'checkins/' + HOJE).then(d => d && d.recup && d.recup.sono === 0 && d.recup.energia === 0), JSON.stringify(await doc(p, 'checkins/' + HOJE)));
    t('com respostas o botão diz "Pronto"', (await p.locator('#recup-fechar').innerText()) === 'Pronto');
    await p.click('#recup-fechar'); await p.waitForTimeout(300);
    t('Configurações mostra o resumo das respostas', /sono ruim · energia baixa/.test(await p.locator('#cfg-recup-info').innerText()), await p.locator('#cfg-recup-info').innerText());
    await p.click('#cfg-recup-btn'); await p.waitForTimeout(300);
    await p.click('button[data-rec="sono"][data-v="0"]'); await p.waitForTimeout(200);   // tocar de novo desmarca (corrigir resposta errada)
    t('tocar na mesma opção desmarca (corrige resposta errada)', await doc(p, 'checkins/' + HOJE).then(d => d && d.recup && d.recup.sono === undefined && d.recup.energia === 0));
    await p.click('[data-plano="leve"]'); await p.waitForTimeout(600);
    t('"Dia leve" na tela registra o dia como leve', await doc(p, 'checkins/' + HOJE).then(d => d && d.concluido === true && d.leve === true));
    t('sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }

  { const { c, p } = await mk({});
    await p.evaluate(() => { document.querySelectorAll('.modal-backdrop').forEach(x => x.remove()); document.querySelector('.app').inert = false; localStorage.setItem('ng_recup_pulo', '2026-11-10'); });
    await p.reload(); await p.waitForTimeout(1800);
    t('no dia seguinte (marca de ontem) aparece de novo', /Como você está hoje\?/.test(await modal(p))); await c.close(); }

  { const { c, p } = await mk({ rotina: ROT_QUA_DESCANSO });
    t('dia de descanso: a tela de abertura não aparece', (await p.locator('.modal').count()) === 0);
    await p.evaluate(() => document.getElementById('tab-config').click()); await p.waitForTimeout(400);
    await p.click('#cfg-recup-btn'); await p.waitForTimeout(300);
    t('mas dá para abrir por Configurações (sem Dia leve/Sessão rápida)', /Como você está hoje\?/.test(await modal(p)) && (await p.locator('[data-plano]').count()) === 0); await c.close(); }

  { const { c, p } = await mk({ checkins: { [HOJE]: { data: HOJE, dia: 'qua', recup: { sono: 2 } } } });
    t('já respondeu hoje: não pergunta de novo', (await p.locator('.modal').count()) === 0); await c.close(); }

  { const { c, p } = await mk({ perfil: null });
    const m = await modal(p);
    t('sem cadastro: abre o cadastro, não o "Como você está hoje?"', m && !/Como você está hoje\?/.test(m), m.slice(0, 60)); await c.close(); }

  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
