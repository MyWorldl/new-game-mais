/* NG+ · constelação da página de apresentação: triângulos vazados em tons de verde-limão formando um "+" (o plus do New Game+), mais partículas soltas ao redor.
   Só decoração (o canvas é aria-hidden). Regras: começa depois da página carregar (o texto é o que importa para o LCP); para quando a aba fica
   escondida ou o desenho sai da tela; no celular usa menos partículas; com movimento reduzido desenha UM quadro parado. Sem biblioteca, sem rede. */
(function () {
  'use strict';
  var cv = document.getElementById('constelacao');
  if (!cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  if (!ctx) return;

  var reduz = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var CORES = ['#a3e635', '#bef264', '#84cc16', '#d9f99d', '#92a095'];   // limão do app em quatro tons + um cinza
  var parts = [], W = 0, H = 0, dpr = 1, raf = 0, ultimo = 0, visivel = true, iniciou = false;

  function semente(a) { return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  function dentroDoMais(x, y) { var w = 0.15, L = 0.8; return (Math.abs(x) < w && Math.abs(y) < L) || (Math.abs(y) < w && Math.abs(x) < L); }

  function gera(qtd) {
    var rnd = semente(20261126), out = [], i, x, y, noMais = Math.round(qtd * 0.8);
    for (i = 0; out.length < qtd; i++) {
      var forma = out.length < noMais;
      if (forma) { x = rnd() * 2 - 1; y = rnd() * 2 - 1; if (!dentroDoMais(x, y)) continue; }
      else { x = rnd() * 2.2 - 1.1; y = rnd() * 2.2 - 1.1; if (dentroDoMais(x, y)) continue; }
      out.push({ x: x, y: y, r: forma ? 3.2 + rnd() * 4.2 : 2 + rnd() * 3, rot: rnd() * 6.2832, vr: (rnd() - 0.5) * 0.0006, cor: CORES[(rnd() * CORES.length) | 0], a: forma ? 0.7 + rnd() * 0.3 : 0.16 + rnd() * 0.26, fase: rnd() * 6.2832 });
    }
    return out;
  }

  function mede() {
    var r = cv.getBoundingClientRect();
    W = Math.max(1, Math.round(r.width)); H = Math.max(1, Math.round(r.height));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    parts = gera(W < 700 ? 260 : 480);
  }

  function quadro(t) {
    ctx.clearRect(0, 0, W, H);
    var S = Math.min(W, H) / 2 * 0.94, cx = W / 2, cy = H / 2, k, p, px, py, a, rr;
    ctx.lineWidth = 1; ctx.lineJoin = 'round';
    for (k = 0; k < parts.length; k++) {
      p = parts[k];
      px = cx + p.x * S + Math.sin(t * 0.0004 + p.fase) * 3;
      py = cy + p.y * S + Math.cos(t * 0.00035 + p.fase) * 3;
      a = p.a * (0.7 + 0.3 * Math.sin(t * 0.0011 + p.fase)); rr = p.rot + p.vr * t;
      ctx.save(); ctx.translate(px, py); ctx.rotate(rr); ctx.globalAlpha = a; ctx.strokeStyle = p.cor;
      ctx.beginPath(); ctx.moveTo(0, -p.r); ctx.lineTo(p.r * 0.87, p.r * 0.5); ctx.lineTo(-p.r * 0.87, p.r * 0.5); ctx.closePath(); ctx.stroke();
      ctx.restore();
    }
  }

  function laco(agora) {
    raf = 0;
    if (!visivel || document.hidden) return;
    if (agora - ultimo >= 33) { ultimo = agora; quadro(agora); }   // ~30 quadros por segundo bastam e poupam bateria
    raf = requestAnimationFrame(laco);
  }
  function retoma() { if (!reduz && !raf && visivel && !document.hidden && iniciou) raf = requestAnimationFrame(laco); }

  function inicia() {
    if (iniciou) return; iniciou = true;
    mede(); quadro(0);
    cv.setAttribute('data-pronto', reduz ? 'parado' : 'animando');
    if ('IntersectionObserver' in window) { new IntersectionObserver(function (es) { visivel = es[0].isIntersecting; if (visivel) retoma(); }).observe(cv); }
    document.addEventListener('visibilitychange', retoma);
    var tm = 0;
    window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(function () { mede(); quadro(performance.now()); }, 150); });
    if (window.matchMedia) {
      var mq = window.matchMedia('(prefers-reduced-motion: reduce)'), muda = function () { reduz = mq.matches; cv.setAttribute('data-pronto', reduz ? 'parado' : 'animando'); if (reduz) { if (raf) { cancelAnimationFrame(raf); raf = 0; } quadro(0); } else retoma(); };
      if (mq.addEventListener) mq.addEventListener('change', muda);
    }
    retoma();
  }

  function quandoPuder() { if (window.requestIdleCallback) window.requestIdleCallback(inicia, { timeout: 1500 }); else setTimeout(inicia, 300); }
  if (document.readyState === 'complete') quandoPuder(); else window.addEventListener('load', quandoPuder);
})();
