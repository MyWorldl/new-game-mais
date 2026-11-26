// Tipos compartilhados entre o app (JS puro) e a ilha React do mapa corporal.
export type MusculoId =
  | "peito" | "costas" | "ombros" | "biceps" | "triceps"
  | "quadriceps" | "posterior" | "gluteos" | "panturrilha" | "abdomen";

/** Silhueta: "M" masculina, "F" feminina, "N" neutra (gênero não informado). */
export type Perfil = "M" | "F" | "N";

export type Estado = "vazio" | "warn" | "ok" | "crit";

export interface MusculoDado {
  id: MusculoId;
  nome: string;
  categoria: string;
  planejado: number;   // séries previstas na rotina
  feito: number;       // séries registradas nesta semana
  mev: number;         // volume mínimo efetivo
  mrv: number;         // volume máximo recuperável
  foco: boolean;
  alvo: number;        // meta de séries do foco
}

export interface Dados {
  perfil: Perfil;
  musculos: MusculoDado[];
}
