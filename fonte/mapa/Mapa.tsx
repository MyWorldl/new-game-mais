// Mapa corporal da semana (ilha React). Interface com Motion (interface: entrada, painel, barras, toque) e GSAP core (desenho SVG: entrada escalonada e pulso).
// Sem ScrollTrigger (decisão do Gabriel). Movimento reduzido: tudo vai direto ao valor final, sem animar.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LazyMotion, animate, domAnimation, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { gsap } from "gsap";
import { ALTURA, LARGURA, silhueta, type Vista } from "./silhuetas";
import type { Dados, MusculoId } from "./tipos";
import { estadoDe, forca, ROTULO } from "./util";

/** Número que sobe até o valor novo (Motion `animate`); com movimento reduzido, troca na hora. */
function Contador({ valor, reduzir }: { valor: number; reduzir: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const de = useRef(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduzir) { el.textContent = String(valor); de.current = valor; return; }
    const ctl = animate(de.current, valor, { duration: 0.6, ease: "easeOut", onUpdate: (v) => { el.textContent = String(Math.round(v)); } });
    de.current = valor;
    return () => ctl.stop();
  }, [valor, reduzir]);
  return <b ref={ref}>{valor}</b>;
}

function Figura({ vista, dados, sel, onSel, atraso, reduzir }: { vista: Vista; dados: Dados; sel: MusculoId | null; onSel: (id: MusculoId) => void; atraso: number; reduzir: boolean }) {
  const forma = useMemo(() => silhueta(dados.perfil, vista), [dados.perfil, vista]);
  const porId = useMemo(() => new Map(dados.musculos.map((mu) => [mu.id, mu])), [dados.musculos]);
  const svgRef = useRef<SVGSVGElement>(null);
  const primeira = useRef(true);
  const assinatura = dados.musculos.map((mu) => forca(mu).toFixed(3)).join("|") + dados.perfil;

  // GSAP: preenchimento forte de cada músculo (entra escalonado na 1ª vez, depois acompanha os dados)
  useLayoutEffect(() => {
    const raiz = svgRef.current;
    if (!raiz) return;
    const topos = raiz.querySelectorAll<SVGPathElement>(".vmap-m .top");
    const alvo = (_: number, el: Element) => Number((el as SVGElement).dataset.f);
    const mm = gsap.matchMedia();
    mm.add({ anima: "(prefers-reduced-motion: no-preference)", reduz: "(prefers-reduced-motion: reduce)" }, (ctx) => {
      const { reduz } = ctx.conditions as { reduz: boolean };
      if (reduz) { gsap.set(topos, { fillOpacity: alvo }); primeira.current = false; return; }
      if (primeira.current) {
        primeira.current = false;
        gsap.fromTo(topos, { fillOpacity: 0 }, { fillOpacity: alvo, duration: 0.7, ease: "power2.out", delay: atraso, stagger: { each: 0.05, from: "start" } });
      } else {
        gsap.to(topos, { fillOpacity: alvo, duration: 0.5, ease: "power2.out", overwrite: true });
      }
    });
    return () => { gsap.killTweensOf(topos); mm.kill(); };
  }, [assinatura, atraso]);

  // GSAP: pulso curto no músculo escolhido
  useEffect(() => {
    const raiz = svgRef.current;
    if (!raiz || !sel || reduzir) return;
    const alvo = raiz.querySelector<SVGGElement>(".vmap-m.sel");
    if (!alvo) return;
    const t = gsap.fromTo(alvo, { scale: 1, transformOrigin: "50% 50%" }, { scale: 1.06, duration: 0.16, ease: "power1.out", yoyo: true, repeat: 1, clearProps: "transform" });
    return () => { t.kill(); gsap.set(alvo, { clearProps: "transform" }); };
  }, [sel, reduzir]);

  return (
    <m.figure
      className="vmap-fig"
      initial={reduzir ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: atraso }}
    >
      <svg ref={svgRef} viewBox={`0 0 ${LARGURA} ${ALTURA}`} aria-hidden="true" focusable="false" className="vmap-svg vmap-gsap">
        <g className="vmap-corpo">{forma.corpo.map((f) => <path key={f.id} d={f.d} />)}</g>
        {forma.musculos.map((s, i) => {
          const mu = porId.get(s.id);
          if (!mu) return null;
          const cls = `vmap-m ${estadoDe(mu)}${mu.foco ? " foco" : ""}${sel === mu.id ? " sel" : ""}`;
          return (
            <g key={`${s.id}-${i}`} className={cls} onClick={() => onSel(mu.id)}>
              <path className="base" d={s.d} />
              <path className="top" d={s.d} data-f={forca(mu)} fillOpacity={forca(mu)} />
            </g>
          );
        })}
      </svg>
      <figcaption>{vista === "frente" ? "Frente" : "Costas"}</figcaption>
    </m.figure>
  );
}

export function Mapa({ dados }: { dados: Dados }) {
  const reduzirPref = useReducedMotion();
  const reduzir = !!reduzirPref;
  const [sel, setSel] = useState<MusculoId | null>(null);
  const alternar = (id: MusculoId) => setSel((v) => (v === id ? null : id));
  const atual = dados.musculos.find((mu) => mu.id === sel) ?? null;
  const transDetalhe = reduzir ? { duration: 0 } : { duration: 0.18 };
  return (
    <LazyMotion features={domAnimation}>
      <section className="vmap" aria-labelledby="vmap-t">
        <h3 id="vmap-t" className="vmap-t">Mapa corporal da semana</h3>
        <div className="vmap-figs">
          <Figura vista="frente" dados={dados} sel={sel} onSel={alternar} atraso={0} reduzir={reduzir} />
          <Figura vista="costas" dados={dados} sel={sel} onSel={alternar} atraso={0.12} reduzir={reduzir} />
        </div>
        <div className="vmap-detalhe" role="status" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <m.p
              key={atual ? atual.id : "vazio"}
              style={{ margin: 0 }}
              initial={reduzir ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduzir ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={transDetalhe}
            >
              {atual
                ? <><b>{atual.nome}</b>: {atual.planejado} séries planejadas (faixa {atual.mev}–{atual.mrv}), {atual.feito} feitas nesta semana, {ROTULO[estadoDe(atual)]}.</>
                : "Toque em um músculo, no desenho ou na lista, para ver os números."}
            </m.p>
          </AnimatePresence>
        </div>
        <ul className="vmap-lista">
          {dados.musculos.map((mu) => {
            const e = estadoDe(mu);
            const razao = mu.planejado > 0 ? Math.min(1, mu.feito / mu.planejado) : 0;
            return (
              <li key={mu.id}>
                <m.button
                  type="button"
                  className={`vmap-item ${e}${sel === mu.id ? " sel" : ""}`}
                  aria-pressed={sel === mu.id}
                  aria-label={`${mu.nome}: ${mu.planejado} séries planejadas, ${mu.feito} feitas nesta semana, ${ROTULO[e]}${mu.foco ? ", é o seu foco" : ""}`}
                  onClick={() => alternar(mu.id)}
                  whileTap={reduzir ? undefined : { scale: 0.97 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                >
                  <span className="vmap-dot" aria-hidden="true" />
                  <span className="vmap-nome">{mu.nome}{mu.foco ? <small className="vmap-foco">foco</small> : null}</span>
                  <span className="vmap-num" aria-hidden="true"><Contador valor={mu.feito} reduzir={reduzir} />/{mu.planejado}</span>
                  <span className="vmap-barra" aria-hidden="true">
                    <m.span
                      className="vmap-barra-i"
                      initial={reduzir ? false : { scaleX: 0 }}
                      animate={{ scaleX: razao }}
                      transition={reduzir ? { duration: 0 } : { type: "spring", stiffness: 140, damping: 20 }}
                    />
                  </span>
                </m.button>
              </li>
            );
          })}
        </ul>
        <p className="vmap-leg">Cor forte = feito · cor clara = planejado. Verde dentro da faixa, âmbar abaixo do mínimo, vermelho acima do máximo.</p>
      </section>
    </LazyMotion>
  );
}
