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

## Fase 2 — barra inferior de 4 itens e menu de ações rápidas (celular, < 768 px)
- Barra: Hoje, Treino, [botão central], Dieta, Corpo. O Perfil sai da barra e fica no avatar do topo, que já abria o Perfil; agora ele fica marcado (`aria-current="page"`) quando o Perfil está aberto. A partir de 768 px nada muda: menu lateral completo, sem botão central.
- Botão central "+" (60 px, `aria-haspopup="menu"`): abre um menu de 4 ações, cada uma reaproveitando o botão ou a função que o app já tem, sem regra nova de dados: (1) Começar/Continuar treino (o mesmo botão grande do Hoje; se não há treino em aberto vira "Abrir o treino"), (2) Registrar medição (leva ao campo de peso), (3) Hábitos do dia (leva ao campo de sono), (4) Marcar treino como feito (o mesmo botão "Já treinei").
- A ação 4 fica desligada (`aria-disabled`) quando não há treino em aberto, com a explicação em texto ("Já registrado hoje" ou "Sem treino em aberto hoje"), nunca só por cor.
- Teclado: Esc fecha e devolve o foco ao botão; setas, Home e End movem; Tab e clique fora fecham. Animação só com `transform` e `opacity`, usando os tokens `--dur-base` e `--ease-out`; com movimento reduzido abre e fecha sem animar.
- Sem dimmer atrás do menu: a barra usa `backdrop-filter`, que prende elementos `position:fixed` dentro dela. Fechar clicando fora resolve sem precisar do véu.
- Teste novo `fonte/testes/nav-acoes.js` (37 verificações, entra no `rodar-todos.sh`): 320 e 390 px, alvos ≥ 44 px, botão central centralizado e sem cobrir itens, foco, teclado, as 4 ações, movimento reduzido, desktop inalterado e axe com o menu aberto (Lima e pastel rosa claro).

## Fase 3 — tela Hoje: anel duplo, carrossel de métricas e missões de hoje
- Nada foi removido da Hoje: "Quest de hoje", Perdido, Plano, Patente, Ferro, Sua semana, Missões da semana/mês e "Ver mais" continuam. Foram **adicionados** três blocos, todos só de leitura (nenhum dado novo é gravado; nenhum caminho de dados muda).
- **Anel duplo** no cartão "Quest de hoje": anel de fora = o dia (exercícios feitos/total), anel de dentro = a semana (treinos feitos / meta semanal, a mesma `statsSemana` do app). Texto equivalente em `aria-label` ("Anel de fora, hoje: … Anel de dentro, semana: …"). Atualiza junto com o anel que já existia, via `setTodayRing`.
- **Carrossel de métricas** logo abaixo do cartão principal (4 cartões): Sequência (dias e recorde), Treinos da semana (x/meta e barra), Peso atual (variação desde a medição anterior e há quantos dias), Hábitos de hoje (x/3 de sono, passos e cárdio). Celular: desliza de lado com encaixe, 4 pontos indicadores, cartão seguinte aparecendo na borda; a partir de 768 px vira grade de 4 colunas. Cada cartão é um botão: Peso → campo de peso; Hábitos → campo de sono; Treinos → aba Treino; Sequência → "Sua semana".
- **Missões de hoje** (3): treino do dia (ou "Descansar hoje" quando é dia sem treino, já contando como feita), hábitos do dia (opcional, não vale XP) e peso (feita se há medição nos últimos 7 dias). Estado em texto (Em aberto/Feita/Descanso) além do ícone; no celular o texto fica só para leitor de tela porque o círculo vazio/marcado já mostra. Botões reaproveitam o botão grande do Hoje, `irParaPeso` e o foco no campo de sono.
- Sem cadastro (primeira vez): carrossel mostra "—" e a missão vira "Fazer o seu cadastro"; nada quebra.
- Teste novo `fonte/testes/hoje-v3.js` (54 verificações): anéis (valores e descrição), carrossel (4 cartões, valores reais, encaixe, pontos, grade no desktop, 320/390/1280 px), missões, as 4 ações, atualização após concluir o treino, estado sem cadastro e axe (Lima, Violeta, rosa pastel claro).
- Observação de teste: `cardapio-trocas` (axe do pop-up de trocas no tema azul claro) falhou uma vez na bateria completa e passou isolado e em reexecuções; os estilos desta fase não tocam o pop-up. Tratar como intermitente de animação sob carga; se repetir no CI, investigar.
