# NG+ · Redesign visual v3 — decisões

Branch: `redesign-v3` · só camada visual · sem merge sem OK do Gabriel.
Convenção dos "antes": `antes-depois/antes-<m|d>-<aba>.jpg` (m = 390×844, d = 1280×800, tema padrão escuro, dados de teste).

## Fase 0 — leitura das referências (o que extraí, sem copiar arte)

O repositório é público: as 15 referências (imagens e vídeo) **não** entram no git. Só ficam aqui as ideias extraídas.

| Ref | Ideia aproveitada |
|---|---|
| 01 app set roxo/rosa | anel de passos, ícones de barra inferior, gráfico de barras com gradiente |
| 02 tablet azul | gráfico de amplitude com meta tracejada, leitura "atual → alvo" |
| 03 composição corporal | KPIs com sparkline, cartão de "idade metabólica" |
| 04 hábitos verde neon | grade 12 semanas com checks brilhantes, % por linha, sequências |
| 05 home coral | anel duplo central + cartões de métricas + lista de treinos + botão central na barra |
| 06/09/11/14 sistema roxo | HUD: perfil, nível, missões, roadmap, cartões de gráfico |
| 07/10 nível e XP | barras de XP, pontos de habilidade, calendário com poções (selos) |
| 08 dourado | perfil com moldura circular, nível, missão atual e roadmap de 4 etapas |
| 12 ciano radar | radar hexagonal + "insights" em texto curto |
| 13 molduras | cantos ornamentais (vou fazer em CSS puro, só em Perfil/Conquistas) |
| 15 vídeo | carrossel horizontal de métricas com anel, curva suave que troca de série |

## Plano de componentes
Ver o resumo da Fase 0 no chat (lista de 10 componentes, ordem de fases e perguntas em aberto).

## Decisões do Gabriel (após a Fase 0)
- Temas pastel (rosa, roxo e azul, claro e escuro): ficam como estão.
- Barra inferior com 4 itens: o Perfil sai da barra e fica no avatar do topo.
- Botão central da barra: abre um menu de ações rápidas.

## Fase 1 — paletas e movimento
- Paletas do modo jogo: **Lima** (padrão, igual ao que já existia), **Violeta** e **Ouro**. Só trocam variáveis de cor (`data-paleta` em `<html>`, bloco no fim de `visual-v2.css`); nenhuma regra de estrutura muda.
- A escolha fica em `config/settings.paleta` (e em `localStorage ng-paleta` só para não piscar ao abrir). Escolher uma paleta desliga o tema pastel; escolher um pastel remove `data-paleta`.
- A cor de patente (skin) continua valendo por cima de qualquer paleta, como já era no padrão. Por isso o card de patente (Platina) segue em azul-esverdeado nas três paletas: é a cor do nível, não do tema.
- Séries de gráfico validadas com o validador de paleta no escuro: Violeta `#9577e8 / #de6a3a / #1fa97a`, Ouro `#bd8a0c / #4a98e4 / #d65f8c` (luminosidade na banda, separação para daltonismo, contraste ≥ 3:1). Lima mantém `#a3e635 / #f0824f / #9085e9`, que já existia (acima da banda de luminosidade por escolha antiga; não mexi).
- Tokens de movimento em `:root`: `--dur-fast 120ms`, `--dur-base 220ms`, `--dur-slow 420ms`, `--ease-out cubic-bezier(.22,1,.36,1)`; com `prefers-reduced-motion` as durações caem para ~0.
- Correção de passagem: `.sl-chip-n` (número da série não selecionada) usava `--muted`, com contraste ~3,9:1 sobre o fundo de medalha; agora usa `--ink-soft`.
- Teste novo `fonte/testes/paletas.js` (25 verificações, entra no `rodar-todos.sh`): botões, atributos, persistência, pastel limpa a paleta, tokens de movimento e contraste AA (axe) em 5 telas por paleta.
