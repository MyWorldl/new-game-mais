// Ponto de entrada da ilha: o app (JS puro) carrega este módulo sob demanda com import("./mapa.js")
// e chama atualizar(elemento, dados) toda vez que o volume semanal é recalculado.
import { createRoot, type Root } from "react-dom/client";
import { Mapa } from "./Mapa";
import type { Dados } from "./tipos";

const raizes = new WeakMap<HTMLElement, Root>();

export function atualizar(el: HTMLElement, dados: Dados): void {
  let raiz = raizes.get(el);
  if (!raiz) { raiz = createRoot(el); raizes.set(el, raiz); }
  raiz.render(<Mapa dados={dados} />);
}

export function desmontar(el: HTMLElement): void {
  raizes.get(el)?.unmount();
  raizes.delete(el);
}
