// Geometria do mapa corporal: uma silhueta gerada por parâmetros (masculina, feminina, neutra),
// com as regiões dos músculos desenhadas sobre ela. Tudo em SVG puro, sem imagens nem bibliotecas.
import type { MusculoId, Perfil } from "./tipos";

export const LARGURA = 200;
export const ALTURA = 420;
const CX = 100;

interface Medidas { S: number; T: number; W: number; H: number; L: number }
const MEDIDAS: Record<Perfil, Medidas> = {
  //            ombro      peito     cintura    quadril    eixo da perna
  M: { S: 50, T: 41, W: 31, H: 35, L: 19 },
  F: { S: 41, T: 32, W: 26, H: 41, L: 22.5 },
  N: { S: 46, T: 37, W: 29, H: 38, L: 21 },
};

type Pt = [number, number];

/** Curva suave fechada (Catmull-Rom convertida em Bézier) por uma lista de pontos. */
function suave(pts: Pt[]): string {
  const n = pts.length;
  const f = (v: number) => Math.round(v * 10) / 10;
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + "Z";
}

/** Pontos do lado direito (dx a partir do eixo). Gera o lado direito (+1) ou esquerdo (-1). */
const lado = (pts: Pt[], dir: 1 | -1): Pt[] => pts.map(([x, y]) => [CX + dir * x, y]);

/** Contorno simétrico: lado direito de cima para baixo, depois o esquerdo de baixo para cima. */
function simetrico(dir: Pt[]): string {
  const dirPts = lado(dir, 1);
  const esq = lado(dir, -1).reverse();
  return suave([...dirPts, ...esq]);
}

export interface Forma { id: string; d: string }
export interface Silhueta {
  corpo: Forma[];                                    // partes sem significado (cabeça, tronco, braços, pernas)
  musculos: { id: MusculoId; d: string; ladoUnico?: boolean }[];
}

export type Vista = "frente" | "costas";

export function silhueta(perfil: Perfil, vista: Vista): Silhueta {
  const { S, T, W, H, L } = MEDIDAS[perfil];

  const cabeca = `M${CX - 17} 32a17 20 0 1 0 34 0a17 20 0 1 0 -34 0Z`;
  const pescoco = suave([[CX - 7, 52], [CX + 7, 52], [CX + 8, 68], [CX - 8, 68]]);
  const tronco = simetrico([[8, 64], [S - 9, 73], [S - 3, 86], [T, 112], [T - 1, 135], [W + 6, 165], [W, 192], [H - 6, 214], [H, 238], [H - 3, 254], [2, 256]]);
  const braco = (dir: 1 | -1) => suave(lado([[S + 10, 92], [S + 11, 130], [S + 10, 165], [S + 12, 205], [S + 13, 235], [S + 6, 248], [S - 3, 238], [S - 3, 205], [S - 5, 165], [S - 6, 128], [S - 6, 96]], dir));
  const perna = (dir: 1 | -1) => suave(lado([
    [L + 19, 240], [L + 17, 285], [L + 12, 322], [L + 11, 345], [L + 9, 385], [L + 8, 404], [L + 14, 414],
    [L - 10, 414], [L - 9, 404], [L - 8, 385], [L - 10, 350], [L - 11, 322], [L - 13, 285], [L - 17, 246],
  ], dir));

  const corpo: Forma[] = [
    { id: "cabeca", d: cabeca }, { id: "pescoco", d: pescoco }, { id: "tronco", d: tronco },
    { id: "braco-d", d: braco(1) }, { id: "braco-e", d: braco(-1) },
    { id: "perna-d", d: perna(1) }, { id: "perna-e", d: perna(-1) },
  ];

  // dois lados de uma região (direito e esquerdo), a partir dos pontos do lado direito
  const par = (id: MusculoId, pts: Pt[]) => [
    { id, d: suave(lado(pts, 1)) },
    { id, d: suave(lado(pts, -1)) },
  ];
  const deltoide: Pt[] = [[S - 8, 80], [S + 6, 84], [S + 11, 100], [S + 8, 116], [S - 3, 112], [S - 9, 94]];
  const panturrilha: Pt[] = [[L - 9, 330], [L + 10, 330], [L + 11, 352], [L + 7, 378], [L - 6, 378], [L - 10, 352]];

  const musculos = vista === "frente"
    ? [
        ...par("ombros", deltoide),
        ...par("peito", [[3, 88], [T - 3, 90], [T - 1, 108], [T - 11, 122], [3, 120]]),
        ...par("biceps", [[S - 4, 106], [S + 8, 106], [S + 9, 134], [S + 5, 156], [S - 3, 156], [S - 5, 132]]),
        { id: "abdomen" as MusculoId, d: simetrico([[W - 6, 130], [W - 5, 158], [W - 8, 190], [4, 202]]) },
        ...par("quadriceps", [[L - 14, 250], [L + 15, 248], [L + 13, 292], [L + 7, 316], [L - 6, 316], [L - 12, 290]]),
        ...par("panturrilha", panturrilha),
      ]
    : [
        ...par("ombros", deltoide),
        ...par("costas", [[4, 74], [S - 9, 82], [T, 100], [T - 5, 148], [W + 2, 184], [4, 190]]),
        ...par("triceps", [[S - 4, 106], [S + 8, 106], [S + 9, 134], [S + 5, 156], [S - 3, 156], [S - 5, 132]]),
        ...par("gluteos", [[3, 206], [H, 210], [H + 2, 238], [H - 8, 254], [3, 254]]),
        ...par("posterior", [[L - 14, 262], [L + 15, 260], [L + 13, 296], [L + 7, 320], [L - 6, 320], [L - 12, 294]]),
        ...par("panturrilha", panturrilha),
      ];

  return { corpo, musculos };
}
