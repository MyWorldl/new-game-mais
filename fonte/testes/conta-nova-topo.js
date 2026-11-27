// Conta nova no Perfil (atributos contam desde o cadastro, não 30 dias cheios) e troca de aba abrindo no topo.
// Uso: node conta-nova-topo.js http://localhost:8791
const { chromium } = require('playwright');
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const iso = d => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
async function conta(b, diasDeConta) {
  const c = await b.newContext({ viewport: { width: 390, height: 800 }, reducedMotion: 'reduce' });
  await c.addInitScript(() => { try { localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_recup_pulo', '9999-12-31'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) { } });
  const p = await c.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const criado = iso(Date.now() - diasDeConta * 864e5);
  await p.evaluate(async criado => {
    const db = await window.claude.use('db');
    await db.doc('config/perfil').set({ nomeCompleto: 'Conta Nova', nomeUsuario: 'nova.t', sexo: 'M', idade: 30, alturaCm: 178, ativo: true, nivelAtividade: 'ativo', objetivo: 'manutencao', experiencia: 'intermediario', criadoEm: criado });
    const ex = n => ({ nome: n, series: 4, reps: '6-10', metaReps: 32, musculos: ['peito'] });
    for (const k of ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']) await db.doc('rotina/' + k).set({ nome: 'Treino ' + k, ativo: true, exercicios: [ex('Supino reto'), ex('Remada curvada')] });
  }, criado);
  await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(600);
  return { c, p };
}
const lerRadar = p => p.evaluate(() => [...document.querySelectorAll('#attrs-radar li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
(async () => {
  const b = await chromium.launch();
  { // conta de 4 dias: sem 30 dias cheios de cobrança
    const { c, p } = await conta(b, 4); const L = await lerRadar(p);
    const res = L.find(x => /Resistência/.test(x)) || '', dis = L.find(x => /Disciplina/.test(x)) || '';
    t('conta nova: Resistência e Disciplina dizem "desde o seu cadastro"', /séries previstas desde o seu cadastro/.test(res) && /treinos desde o seu cadastro/.test(dis), res + ' | ' + dis);
    const m = dis.match(/de (\d+) treinos/);
    t('conta nova: o total de treinos previstos cabe nos dias de conta (no máximo 5), não ~30', !!m && Number(m[1]) <= 5, dis);
    t('conta nova: sem erros de JS', p.errs.length === 0, p.errs.join('|')); await c.close(); }
  { // conta antiga (90 dias): mantém a janela de 30 dias
    const { c, p } = await conta(b, 90); const L = await lerRadar(p);
    const dis = L.find(x => /Disciplina/.test(x)) || '', res = L.find(x => /Resistência/.test(x)) || '';
    t('conta antiga: continua "em 30 dias" com 30 dias de treinos previstos', /séries previstas em 30 dias/.test(res) && /treinos em 30 dias/.test(dis) && Number((dis.match(/de (\d+) treinos/) || [])[1]) >= 28, res + ' | ' + dis);
    await c.close(); }
  { // troca de aba abre no topo
    const { c, p } = await conta(b, 90);
    const alt = await p.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    await p.evaluate(() => window.scrollTo(0, 700)); await p.waitForTimeout(200);
    const antes = await p.evaluate(() => Math.round(scrollY));
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(900);
    const depois = await p.evaluate(() => Math.round(scrollY));
    t('a página do Perfil tinha rolagem para o teste valer', alt > 300 && antes > 300, 'alt=' + alt + ' antes=' + antes);
    t('trocar de aba abre a tela nova no topo (rolagem zerada)', depois === 0, 'depois=' + depois);
    await c.close(); }
  console.log(`\n${ok} ok / ${bad} falhas`); await b.close(); process.exit(bad ? 1 : 0);
})();
