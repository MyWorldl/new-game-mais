// Base de exercícios: filtro de idade/nível nas alternativas e integridade do JSON injetado.
// Uso: node filtro-alternativas.js http://localhost:8791
const { chromium } = require('playwright');
let bad = 0; const t = (n, c, x = '') => { if (!c) bad++; console.log((c ? 'PASS ' : 'FAIL ') + n + (x ? '  ' + String(x).slice(0, 300) : '')); };
const URL_ = (process.argv[2] || 'http://localhost:8791') + '/index.html';
(async () => {
  const b = await chromium.launch();
  const c = await b.newContext();
  await c.addInitScript(() => { try { localStorage.setItem('ng_test_hooks', '1'); localStorage.setItem('ng_dev_semnuvem', '1'); localStorage.setItem('ng_tutorial_visto', '1'); } catch (e) {} });
  const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL_); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const T = __ngTest, alt = ['Stiff (levantamento terra romeno)', 'Terra sumô', 'Leg press'];
    const f = (p, l = alt) => T.filtraAlternativas(l, p);
    const ids = T.BASE_EXERCICIOS.exercicios.map(e => e.id);
    return {
      n: ids.length, dup: ids.length - new Set(ids).size,
      adulto_avancado: f({ idade: 30, experiencia: 'avancado' }),
      adulto_iniciante: f({ idade: 30, experiencia: 'iniciante' }),
      menor_avancado: f({ idade: 15, experiencia: 'avancado' }),
      sem_perfil: f(null),
      sem_idade: f({ experiencia: 'avancado' }),
      manter: T.filtraAlternativas(alt, { idade: 15, experiencia: 'iniciante' }, 'Terra sumô'),
      desconhecido: T.exercicioAdequadoAoPerfil('Exercício inventado', { idade: 15, experiencia: 'iniciante' }),
    };
  });
  t('JSON injetado: ≥100 fichas, sem id repetido', r.n >= 100 && r.dup === 0, JSON.stringify([r.n, r.dup]));
  t('adulto avançado vê tudo', r.adulto_avancado.length === 3, r.adulto_avancado);
  t('iniciante adulto não recebe Terra sumô (avançado)', !r.adulto_iniciante.includes('Terra sumô') && r.adulto_iniciante.includes('Leg press'), r.adulto_iniciante);
  t('menor de 18 não recebe Terra sumô, mas segue com Stiff (substituto do terra)', !r.menor_avancado.includes('Terra sumô') && r.menor_avancado.includes('Stiff (levantamento terra romeno)') && r.menor_avancado.includes('Leg press'), r.menor_avancado);
  t('sem perfil: só filtra por nível iniciante', !r.sem_perfil.includes('Terra sumô'), r.sem_perfil);
  t('idade desconhecida não filtra por idade', r.sem_idade.length === 3, r.sem_idade);
  t('o exercício que já está na rotina nunca é escondido', r.manter.includes('Terra sumô'), r.manter);
  t('nome sem ficha segue como antes (permitido)', r.desconhecido === true);
  t('sem erro de página', errs.length === 0, errs.join('|'));
  await b.close(); process.exit(bad ? 1 : 0);
})();
