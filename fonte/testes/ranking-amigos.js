// Ranking dos amigos: volume em kg, card em Hoje (top 3 + minha posição), sub-aba Treino › Ranking (3 métricas, empate), sair do ranking, menor de 18 e sem nuvem.
// A nuvem é simulada (cliente falso com auth/rpc/from); o servidor de verdade (RPC publicar_ranking) foi conferido à parte no Supabase.
// Uso: node ranking-amigos.js http://localhost:8791
const fs = require('fs');
const { chromium } = require('playwright');
const { abre } = require('./telas-dados-seed.js');
let ok = 0, bad = 0; const t = (n, c, x = '') => { (c ? ok++ : bad++); console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const axeSrc = process.env.SP && fs.existsSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js') ? fs.readFileSync(process.env.SP + '/axe/node_modules/axe-core/axe.min.js', 'utf8') : null;
const LINHAS = (eu, xpEu) => [
  { user_id: eu, apelido: 'teste.v4', xp: xpEu, nivel: 2, sequencia: 4, volume_kg: 5000, atualizado_em: new Date().toISOString() },
  { user_id: 'u-a', apelido: 'Ana', xp: 900, nivel: 3, sequencia: 12, volume_kg: 20000, atualizado_em: new Date().toISOString() },
  { user_id: 'u-b', apelido: 'Beto', xp: 300, nivel: 1, sequencia: 2, volume_kg: 90000, atualizado_em: new Date().toISOString() },
  { user_id: 'u-c', apelido: 'Caio', xp: 1200, nivel: 4, sequencia: 1, volume_kg: 1000, atualizado_em: new Date().toISOString() },
  { user_id: 'u-d', apelido: 'Duda', xp: 300, nivel: 1, sequencia: 7, volume_kg: 100, atualizado_em: new Date().toISOString() }
];
async function instalaFalsa(p, xpEu) {
  await p.evaluate(([linhas]) => {
    const calls = [];
    window.__rk = { calls, linhas };
    window.ngNuvem = { estado: () => ({ k: 'saved' }), client: {
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u-eu' } } } }) },
      rpc: async (n, a) => { calls.push({ n, a }); return { data: 'ok', error: null }; },
      from: () => ({ select: () => ({ limit: async () => ({ data: window.__rk.linhas, error: null }) }) })
    } };
  }, [LINHAS('u-eu', xpEu)]);
}
(async () => {
  const b = await chromium.launch();
  for (const w of [390, 1280]) {
    const L = '[' + w + '] ';
    let { c, p } = await abre(b, w, 'dark', w < 600);
    const go = async s => { await p.evaluate(x => { const e = document.querySelector(x); e && e.click(); }, s); await p.waitForTimeout(500); };
    const vis = s => p.evaluate(x => { const e = document.querySelector(x); return !!e && !e.hidden && e.offsetParent !== null && getComputedStyle(e).display !== 'none'; }, s);

    // ---- sem nuvem: nada aparece e nada quebra
    await go('#tab-painel');
    t(L + 'sem nuvem: card de Hoje escondido', !(await vis('#hoje-ranking')));
    await go('#tab-treino'); await go('#subtab-treino-ranking');
    t(L + 'sem nuvem: aba Ranking explica', /conta conectada/.test(await p.textContent('#rk-t-corpo')));

    // ---- volume em kg: carga × repetições, pulado e sem carga não contam
    const v0 = await p.evaluate(() => ngRanking.volumeKg());
    await p.evaluate(async () => {
      const db = await window.claude.use('db');
      await db.doc('checkins/2020-01-06').set({ data: '2020-01-06', dia: 'seg', concluido: true, cargas: { 'Supino reto': 100 }, sets: { 0: [{ r: 10 }, { r: 8 }] }, progresso: { 0: 18 } });
      await db.doc('checkins/2020-01-07').set({ data: '2020-01-07', dia: 'ter', concluido: true, cargas: { 'Leg press': 300 }, sets: {}, status: { 0: 'pulado' }, progresso: {} });
    });
    await p.reload(); await p.waitForTimeout(1500);
    const v1 = await p.evaluate(() => ngRanking.volumeKg());
    t(L + 'volume: soma carga × repetições (100 kg × 18) e ignora exercício pulado', v1 - v0 === 1800, v0 + ' → ' + v1);

    // ---- adulto, na nuvem: publica as 3 métricas e mostra o quadro
    await instalaFalsa(p, 500);
    await p.evaluate(() => ngRanking.atualizar(true)); await p.waitForTimeout(400);
    const pub = await p.evaluate(() => ({ calls: window.__rk.calls, meus: ngRanking.meus() }));
    const pc = pub.calls.find(x => x.n === 'publicar_ranking');
    t(L + 'publica XP, nível, sequência e volume do aparelho', !!pc && pc.a.p_xp === pub.meus.xp && pc.a.p_nivel === pub.meus.nivel && pc.a.p_sequencia === pub.meus.sequencia && pc.a.p_volume_kg === pub.meus.volume_kg, JSON.stringify(pc));
    t(L + 'não envia nome, idade, peso, medidas nem fotos', pc && Object.keys(pc.a).sort().join() === 'p_nivel,p_sequencia,p_volume_kg,p_xp');
    await go('#tab-painel');
    t(L + 'Hoje: card do ranking aparece', await vis('#hoje-ranking'));
    const hoje = await p.evaluate(() => ({ nomes: [...document.querySelectorAll('#rk-h-lista .rk-nome')].map(x => x.textContent.replace(/^\d+º lugar: /, '').trim()), voce: document.getElementById('rk-h-voce').textContent, sw: document.documentElement.scrollWidth - innerWidth }));
    t(L + 'Hoje: top 3 por XP (Caio, Ana, você)', hoje.nomes.length === 3 && /^Caio/.test(hoje.nomes[0]) && /^Ana/.test(hoje.nomes[1]) && /você/.test(hoje.nomes[2]), JSON.stringify(hoje.nomes));
    t(L + 'Hoje: quem está no pódio vê mensagem de pódio', /pódio/.test(hoje.voce), hoje.voce);
    t(L + 'Hoje: sem rolagem lateral', hoje.sw <= 0, hoje.sw);
    // abaixo do carrossel de métricas
    const ordem = await p.evaluate(() => { const a = document.getElementById('hoje-metricas'), r = document.getElementById('hoje-ranking'); return a && r ? !!(a.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) : null; });
    t(L + 'Hoje: o card fica abaixo do carrossel de métricas', ordem === true, ordem);
    const alvoVer = await p.evaluate(() => { const r = document.getElementById('rk-h-ver').getBoundingClientRect(); return Math.round(r.height); });
    t(L + 'Hoje: botão "Ver todos" com 44 px ou mais', alvoVer >= 44, alvoVer);

    // ---- minha posição quando fora do pódio
    await p.evaluate(() => { window.__rk.linhas[0].xp = 50; window.ngRanking.atualizar(true); }); await p.waitForTimeout(500);
    t(L + 'Hoje: fora do pódio mostra "Você está em 5º de 5"', /5º de 5/.test(await p.textContent('#rk-h-voce')), await p.textContent('#rk-h-voce'));

    // ---- Treino › Ranking: métricas e empate
    await go('#rk-h-ver');
    t(L + 'Ver todos abre Treino › Ranking', await vis('#treino-ranking') && (await p.getAttribute('#subtab-treino-ranking', 'aria-selected')) === 'true');
    const lista = (m) => p.evaluate(async (m) => { if (m) document.querySelector('[data-rk="' + m + '"]').click(); await new Promise(r => setTimeout(r, 200)); return [...document.querySelectorAll('#rk-t-lista .rk-item')].map(li => ({ pos: li.querySelector('.rk-pos,.rk-med').textContent.trim(), nome: li.querySelector('.rk-nome').textContent.replace(/^\d+º lugar: /, '').replace(' (você)', '').trim(), val: li.querySelector('.rk-val').textContent })); }, m);
    const xp = await lista('xp');
    t(L + 'XP: ordem Caio, Ana, Beto/Duda (empate), você', xp.map(x => x.nome).slice(0, 2).join() === 'Caio,Ana' && xp[4].nome === 'teste.v4', JSON.stringify(xp.map(x => x.pos + x.nome)));
    t(L + 'XP: empate de 300 XP ocupa a mesma posição (3º e 3º; próximo 5º)', xp[2].pos.replace('º', '') === '3' && xp[3].pos.replace('º', '') === '3' && xp[4].pos.replace('º', '') === '5', JSON.stringify(xp.map(x => x.pos)));
    const seq = await lista('seq');
    t(L + 'Sequência: Ana (12) primeiro, Duda (7) depois', seq[0].nome === 'Ana' && seq[1].nome === 'Duda' && /12 dias/.test(seq[0].val), JSON.stringify(seq.map(x => x.nome + x.val)));
    const vol = await lista('vol');
    t(L + 'Volume: Beto (90.000 kg) primeiro', vol[0].nome === 'Beto' && /90\.000 kg/.test(vol[0].val), JSON.stringify(vol.map(x => x.nome + x.val)));
    const tg = await p.evaluate(() => [...document.querySelectorAll('#rk-seg button, #rk-atualizar')].map(e => Math.round(e.getBoundingClientRect().height)));
    t(L + 'Treino › Ranking: alvos de toque com 44 px ou mais', tg.every(h => h >= 44), tg.join());
    t(L + 'Treino › Ranking: sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0);
    // ---- redesenho: título "Ranking", resumo, pódio em degraus, barras, colunas e escada de patentes
    await p.evaluate(() => document.querySelector('[data-rk="xp"]').click()); await p.waitForTimeout(250);
    const rd = await p.evaluate(() => {
      const h = id => (document.getElementById(id) || {}).textContent;
      const pod = [...document.querySelectorAll('#rk-t-corpo .rk-pd')].map(e => ({ nome: e.querySelector('.rk-pd-nome').textContent.replace(/^\d+º lugar: /, '').trim(), h: Math.round(e.querySelector('.rk-pd-deg').getBoundingClientRect().height), x: Math.round(e.getBoundingClientRect().left) }));
      const res = [...document.querySelectorAll('#rk-t-corpo .rk-res-c')].map(e => e.textContent.replace(/\s+/g, ' ').trim());
      const barras = [...document.querySelectorAll('#rk-t-lista .rk-barra i')].map(e => Math.round(e.getBoundingClientRect().width / e.parentElement.getBoundingClientRect().width * 100));
      const es = [...document.querySelectorAll('#rk-t-corpo .rk-es')];
      const extra = document.querySelector('#rk-t-lista .rk-extra');
      return { t1: h('rk-t-t'), t2: h('rk-h-t'), pod, res, barras, esN: es.length, esEu: (document.querySelector('.rk-es-eu') || {}).textContent, extraVis: !!extra && getComputedStyle(extra).display !== 'none', antigo: /dos amigos/i.test(document.getElementById('view-treino').innerText + document.getElementById('hoje-ranking').innerText) };
    });
    t(L + 'títulos viram "Ranking" (sem "dos amigos")', rd.t1 === 'Ranking' && rd.t2 === 'Ranking' && !rd.antigo, rd.t1 + '/' + rd.t2);
    t(L + 'resumo: participantes, sua posição e sua patente', rd.res.length === 3 && /^Participantes5/.test(rd.res[0]) && /^Sua posição5ºde 5/.test(rd.res[1]) && /^Sua patenteAprendiz/.test(rd.res[2]), JSON.stringify(rd.res));
    t(L + 'pódio: 2º, 1º, 3º com o 1º mais alto', rd.pod.length === 3 && rd.pod[1].nome === 'Caio' && rd.pod[0].nome === 'Ana' && rd.pod[1].h > rd.pod[0].h && rd.pod[0].h > rd.pod[2].h && rd.pod[0].x < rd.pod[1].x && rd.pod[1].x < rd.pod[2].x, JSON.stringify(rd.pod));
    t(L + 'barras: líder com 100% e as demais proporcionais', rd.barras[0] === 100 && rd.barras.every((v, i) => i === 0 || v < 100) && rd.barras.length === 5, JSON.stringify(rd.barras));
    t(L + 'colunas extras (sequência e volume) só em tela larga', rd.extraVis === (w >= 720), String(rd.extraVis));
    t(L + 'escada: 10 patentes e marca "você está aqui" na minha', rd.esN === 10 && /Aprendiz/.test(rd.esEu) && /você está aqui/.test(rd.esEu), rd.esEu);
    // empate: dois com 300 XP aparecem como 3º no pódio? (só 3 vagas: Caio, Ana e o primeiro dos empatados)
    const eh = await p.evaluate(() => [...document.querySelectorAll('#rk-t-corpo .rk-pd-deg')].map(e => e.textContent));
    t(L + 'pódio usa a posição real (com empate)', eh.join() === '2,1,3', eh.join());
    await p.evaluate(() => document.querySelector('.rk-escada > summary').click()); await p.waitForTimeout(200);
    await p.evaluate(() => document.querySelector('[data-rk="seq"]').click()); await p.waitForTimeout(250);
    t(L + 'escada continua aberta ao trocar a métrica', await p.evaluate(() => document.querySelector('.rk-escada').open));
    await p.evaluate(() => document.querySelector('[data-rk="xp"]').click()); await p.waitForTimeout(250);
    const alvo = await p.evaluate(() => Math.round(document.querySelector('.rk-escada > summary').getBoundingClientRect().height));
    t(L + 'escada: botão de abrir com 44 px ou mais', alvo >= 44, alvo);
    if (axeSrc) {
      for (const tema of ['padrao', 'azul', 'rosa', 'roxo']) {
        await p.evaluate(k => { const b = document.querySelector('#theme-row [data-tema="' + k + '"]'); if (b) b.click(); }, tema); await p.waitForTimeout(250);
        await p.evaluate(() => { document.getElementById('tab-treino').click(); document.getElementById('subtab-treino-ranking').click(); }); await p.waitForTimeout(250);
        if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
        const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('treino-ranking'), { runOnly: ['color-contrast', 'list', 'listitem', 'aria-allowed-attr'] }); return r.violations.map(x => x.id + ':' + x.nodes.slice(0, 2).map(n => n.target.join(' ')).join(',')); });
        t(L + 'axe no Ranking com o tema ' + tema, v.length === 0, v.join(' | '));
      }
      await p.evaluate(() => { const b = document.querySelector('#theme-row [data-tema="padrao"]'); if (b) b.click(); }); await p.waitForTimeout(200);
    }
    if (axeSrc) {
      if (!(await p.evaluate(() => typeof axe !== 'undefined'))) await p.evaluate(axeSrc);
      const v = await p.evaluate(async () => { const r = await axe.run(document.getElementById('view-treino'), { runOnly: ['color-contrast', 'aria-allowed-attr', 'aria-valid-attr-value', 'label', 'button-name', 'list', 'listitem'] }); return r.violations.flatMap(x => x.nodes.map(n => x.id + ' ' + n.target.join(' '))); });
      t(L + 'Treino › Ranking: axe sem violação (contraste, rótulos, listas)', v.length === 0, v.join(' | '));
    }

    // ---- sair do ranking (Configurações)
    await go('#tab-perfil'); await go('#subtab-config');
    t(L + 'Configurações: interruptor ligado por padrão', await p.evaluate(() => document.getElementById('cfg-ranking').checked && !document.getElementById('cfg-ranking').disabled));
    await p.evaluate(() => { window.__rk.calls.length = 0; document.getElementById('cfg-ranking').click(); }); await p.waitForTimeout(600);
    const chamadas = await p.evaluate(() => window.__rk.calls.map(c => c.n));
    t(L + 'sair: chama sair_do_ranking e não publica', chamadas.includes('sair_do_ranking') && !chamadas.includes('publicar_ranking'), chamadas.join());
    await go('#tab-painel');
    t(L + 'sair: card some de Hoje', !(await vis('#hoje-ranking')));
    await go('#tab-treino'); await go('#subtab-treino-ranking');
    t(L + 'sair: aba Ranking oferece voltar e não mostra a lista', /fora do ranking/.test(await p.textContent('#rk-t-corpo')) && !(await vis('#rk-t-lista')) && await vis('#rk-voltar'));
    await p.evaluate(() => { window.__rk.calls.length = 0; document.getElementById('rk-voltar').click(); }); await p.waitForTimeout(700);
    const volta = await p.evaluate(() => window.__rk.calls.map(c => c.n));
    t(L + 'voltar: publica de novo e a lista reaparece', volta.includes('publicar_ranking') && await vis('#rk-t-lista'), volta.join());
    await c.close();

    // ---- menor de 18 anos: nunca publica, retira a linha, não vê o quadro
    ({ c, p } = await abre(b, w, 'dark', w < 600));
    await p.evaluate(async () => { const db = await window.claude.use('db'); const pf = await db.doc('config/perfil').get(); await db.doc('config/perfil').set(Object.assign({}, pf.data ? pf.data() : pf, { idade: 16 })); });
    await p.reload(); await p.waitForTimeout(1500);
    await instalaFalsa(p, 500);
    await p.evaluate(() => ngRanking.atualizar(true)); await p.waitForTimeout(500);
    const mc = await p.evaluate(() => window.__rk.calls.map(x => x.n));
    t(L + 'menor de 18: não publica e pede a retirada da linha', !mc.includes('publicar_ranking') && mc.includes('sair_do_ranking'), mc.join());
    await p.evaluate(() => document.getElementById('tab-painel').click()); await p.waitForTimeout(400);
    t(L + 'menor de 18: card de Hoje escondido', !(await vis('#hoje-ranking')));
    await p.evaluate(() => document.getElementById('tab-treino').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('subtab-treino-ranking').click()); await p.waitForTimeout(400);
    t(L + 'menor de 18: aba Ranking explica que é só para maiores', /maiores de 18/.test(await p.textContent('#rk-t-corpo')) && !(await vis('#rk-t-lista')));
    await p.evaluate(() => document.getElementById('tab-perfil').click()); await p.waitForTimeout(300);
    await p.evaluate(() => document.getElementById('subtab-config').click()); await p.waitForTimeout(400);
    t(L + 'menor de 18: interruptor desativado e desligado', await p.evaluate(() => { const e = document.getElementById('cfg-ranking'); return e.disabled && !e.checked; }));
    t(L + 'sem erro de página', p.errs.length === 0, p.errs.join('|'));
    await c.close();
  }
  await b.close();
  console.log(`\n${ok} passaram, ${bad} falharam`);
  process.exit(bad ? 1 : 0);
})();
