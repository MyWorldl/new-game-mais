import { useMemo, useState } from "react";
import { ALTURA, LARGURA, silhueta, type Vista } from "./silhuetas";
import type { Dados, Estado, MusculoDado, MusculoId } from "./tipos";

function estadoDe(m: MusculoDado): Estado {
  if (m.planejado <= 0) return "vazio";
  if (m.planejado < m.mev) return "warn";
  if (m.planejado > m.mrv) return "crit";
  return "ok";
}

const ROTULO: Record<Estado, string> = {
  vazio: "sem séries planejadas",
  warn: "abaixo do mínimo (MEV)",
  ok: "dentro da faixa ideal",
  crit: "acima do máximo (MRV)",
};

/** Quanto da barra "forte" (feito) aparece: de 0,3 a 1, conforme o que já foi feito do planejado. */
function forca(m: MusculoDado): number {
  if (m.feito <= 0 || m.planejado <= 0) return 0;
  return 0.3 + 0.7 * Math.min(1, m.feito / m.planejado);
}

function Figura({ vista, dados, sel, onSel }: { vista: Vista; dados: Dados; sel: MusculoId | null; onSel: (id: MusculoId) => void }) {
  const forma = useMemo(() => silhueta(dados.perfil, vista), [dados.perfil, vista]);
  const porId = useMemo(() => new Map(dados.musculos.map((m) => [m.id, m])), [dados.musculos]);
  return (
    <figure className="vmap-fig">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} aria-hidden="true" focusable="false" className="vmap-svg">
        <g className="vmap-corpo">
          {forma.corpo.map((f) => <path key={f.id} d={f.d} />)}
        </g>
        {forma.musculos.map((s, i) => {
          const m = porId.get(s.id);
          if (!m) return null;
          const estado = estadoDe(m);
          const cls = `vmap-m ${estado}${m.foco ? " foco" : ""}${sel === m.id ? " sel" : ""}`;
          return (
            <g key={`${s.id}-${i}`} className={cls} onClick={() => onSel(m.id)}>
              <path className="base" d={s.d} />
              <path className="top" d={s.d} fillOpacity={forca(m)} />
            </g>
          );
        })}
      </svg>
      <figcaption>{vista === "frente" ? "Frente" : "Costas"}</figcaption>
    </figure>
  );
}

export function Mapa({ dados }: { dados: Dados }) {
  const [sel, setSel] = useState<MusculoId | null>(null);
  const atual = dados.musculos.find((m) => m.id === sel) ?? null;
  return (
    <section className="vmap" aria-labelledby="vmap-t">
      <h3 id="vmap-t" className="vmap-t">Mapa corporal da semana</h3>
      <div className="vmap-figs">
        <Figura vista="frente" dados={dados} sel={sel} onSel={(id) => setSel((v) => (v === id ? null : id))} />
        <Figura vista="costas" dados={dados} sel={sel} onSel={(id) => setSel((v) => (v === id ? null : id))} />
      </div>
      <p className="vmap-detalhe" role="status" aria-live="polite">
        {atual
          ? <><b>{atual.nome}</b>: {atual.planejado} séries planejadas (faixa {atual.mev}–{atual.mrv}), {atual.feito} feitas nesta semana, {ROTULO[estadoDe(atual)]}.</>
          : "Toque em um músculo, no desenho ou na lista, para ver os números."}
      </p>
      <ul className="vmap-lista">
        {dados.musculos.map((m) => {
          const e = estadoDe(m);
          return (
            <li key={m.id}>
              <button
                type="button"
                className={`vmap-item ${e}${sel === m.id ? " sel" : ""}`}
                aria-pressed={sel === m.id}
                aria-label={`${m.nome}: ${m.planejado} séries planejadas, ${m.feito} feitas nesta semana, ${ROTULO[e]}${m.foco ? ", é o seu foco" : ""}`}
                onClick={() => setSel((v) => (v === m.id ? null : m.id))}
              >
                <span className="vmap-dot" aria-hidden="true" />
                <span className="vmap-nome">{m.nome}{m.foco ? <small className="vmap-foco">foco</small> : null}</span>
                <span className="vmap-num" aria-hidden="true"><b>{m.feito}</b>/{m.planejado}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="vmap-leg">
        Cor forte = feito · cor clara = planejado. Verde dentro da faixa, âmbar abaixo do mínimo, vermelho acima do máximo.
        {dados.perfil === "N" ? " Silhueta neutra: informe o gênero em Editar perfil para ajustar o desenho." : ""}
      </p>
    </section>
  );
}
