import type { Estado, MusculoDado } from "./tipos";

export function estadoDe(m: MusculoDado): Estado {
  if (m.planejado <= 0) return "vazio";
  if (m.planejado < m.mev) return "warn";
  if (m.planejado > m.mrv) return "crit";
  return "ok";
}

export const ROTULO: Record<Estado, string> = {
  vazio: "sem séries planejadas",
  warn: "abaixo do mínimo (MEV)",
  ok: "dentro da faixa ideal",
  crit: "acima do máximo (MRV)",
};

/** Quanto da barra "forte" (feito) aparece: de 0,3 a 1, conforme o que já foi feito do planejado. */
export function forca(m: MusculoDado): number {
  if (m.feito <= 0 || m.planejado <= 0) return 0;
  return 0.3 + 0.7 * Math.min(1, m.feito / m.planejado);
}

