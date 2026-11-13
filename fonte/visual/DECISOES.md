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

## Fase 4 · Hábitos (grade de 12 semanas)

**Decisão do Gabriel:** "manter como está". Interpretação: a estrutura não muda (4 linhas de hábito, 12 semanas, semana atual destacada com tracejado, melhor semana com moldura dourada, número do dia dentro de cada quadradinho) e apenas se acrescenta camada visual.

**O que foi acrescentado (só visual/derivado, nenhum dado novo gravado):**
- Brilho (glow) suave nos quadradinhos de nível 2 e 3 no modo jogo, com a cor de destaque da paleta ativa; nível 0/1 sem brilho para o brilho significar "semana forte".
- Selo de % por hábito = dias registrados ÷ dias desde o primeiro registro daquele hábito (teto 100%). É descritivo, não meta: o texto da tela continua dizendo "registrar já conta, não há meta". Tem `role="img"` e `aria-label` por extenso (nunca só cor/número solto).
- "Semanas seguidas": semanas consecutivas com ao menos um registro; a semana em andamento nunca zera a contagem (tom sem culpa).
- Animação de acendimento (opacity/transform, escalonada de 30 ms) só na primeira renderização da sessão; desliga com prefers-reduced-motion (tokens de duração ≈ 0).

**Verificação:** `fonte/testes/habitos-v3.js` (33 checagens: estrutura mantida, % com aria-label, semanas seguidas, glow, animação só 1ª vez, sem overflow em 320/390/1280, axe AA em Lima, Violeta, Ouro, roxo claro e azul escuro). Antes/depois: `antes-depois/depois-f4-habitos.jpg` (Lima, Violeta, Ouro no celular + desktop).

## Fase 5 · Treino (timer de descanso em anel)

**Decisão do Gabriel:** "pode seguir" com o plano proposto (anel + transições).

**Achado:** as transições entre telas (View Transitions, `withTransition`/`showTabAnimated`) já existem no app desde a v85 (deslize lateral, topo e barra fixos, desligadas com movimento reduzido ou sem suporte). Nada a refazer; só confirmei que continuam funcionando (regressão completa passou). Registrado aqui para não duplicar trabalho.

**O que mudou (só visual; contagem, sons, vibração e dados do descanso não mudam):**
- O descanso em andamento ganhou um anel de 44 px que se esvazia (SVG com `pathLength=100`, atributos de apresentação, sem estilo inline, compatível com a CSP). O tempo continua em texto grande ao lado (`mm:ss`), com o ícone do cronômetro no centro do anel.
- Acessibilidade: o anel é `role="img"` com descrição em texto ("Descanso: faltam 00:54 de 1 min 30 s"); o fim do descanso continua anunciado pelo aviso já existente. O estado nunca depende só da cor.
- Nos 5 últimos segundos o anel dá um pequeno pulso (transform, `--dur-slow`); com movimento reduzido não há pulso.
- `restTimers[idx]` passou a guardar `total` (duração inicial) para calcular a fração; é a única mudança de lógica e só serve ao desenho.
- Botão "Cancelar" com alvo ≥ 44 px no celular (antes 36 px).
- O brilho do arco só aparece no modo jogo (`data-game="on"`).

**Verificação:** `fonte/testes/treino-anel.js` (32 checagens: 320/390/1280 px, tamanho do anel, rótulo, esvaziamento, cancelar, pulso nos 5 s finais e fim do descanso com relógio simulado, movimento reduzido, axe em Lima, Violeta, Ouro, roxo e azul pastel). Antes/depois: `antes-depois/depois-f5-timer-anel.jpg` (Lima, Violeta e Ouro em 390 px). O "antes" é o relógio em texto com ícone, visível em `antes-m-treino.jpg`.

## Fase 7 · Corpo (KPIs com mini-gráficos e radar de músculos)

**Decisão do Gabriel:** "pode seguir" com o plano proposto. Ajuste de escopo registrado: o radar que o app já tinha é o de atributos do Perfil (Força, Resistência…), que fica para a fase do Perfil. Na aba Corpo entrou um radar novo, de músculos, usando só a conta que o app já faz (`semanaRealizadaPorMusculo` e `MUSCLE_LANDMARKS`).

**O que foi acrescentado (nada é gravado; tudo derivado de dados existentes):**
- **Resumo no topo do Corpo** (4 cartões: Peso, Cintura, % de gordura, IMC): valor da última medição, variação desde a medição anterior (▲/▼ em texto, sem cor de "bom/ruim"), há quantos dias, e mini-gráfico (sparkline) das últimas até 12 medições. As contas de IMC e % de gordura são as mesmas da tabela (`calcIMC`, `calcBFNavy`); o teste confere que os valores batem com o "Resumo do período". Cada cartão é um botão: Peso e Cintura abrem a aba correspondente da Evolução; % de gordura e IMC levam à tabela. Cada cartão tem descrição por extenso (valor, variação, quando, primeira e última medição do mini-gráfico). Sem medições: mensagem acolhedora e botão que leva ao campo de peso.
- **Músculos da semana** (card novo entre Hábitos e Evolução): radar de 6 grupos (Peito, Costas, Ombros, Braços, Pernas, Core) sobre os últimos 7 dias corridos (não a semana de calendário, para a segunda-feira não parecer vazia). Valor do grupo = média, por músculo, de séries feitas ÷ MAV (teto de 100%). Lista equivalente em texto com séries e "feito/ideal" por músculo, mais o bloco "O que o radar diz" (mais trabalhado, grupos sem séries "sem cobrança", pernas com pouca fatia quando faz sentido) e a nota "retrato de 7 dias, não uma meta". Sem séries na janela: mensagem e nenhum gráfico vazio.
- Acendimento dos cartões (opacity/transform, escalonado) só na primeira abertura da aba; desliga com movimento reduzido. Correção junto: a grade de hábitos (Fase 4) também só anima na primeira abertura (antes a classe ficava ligada e a animação repetia ao voltar para a aba).

**Verificação:** `fonte/testes/corpo-v3.js` (49 checagens: ordem e valores dos KPIs, igualdade com o resumo da tabela, mini-gráfico com todos os pontos e ponto final redondo, descrição por extenso, alvos ≥ 44 px, 2 colunas no celular e 4 no desktop, cliques levando às abas, atualização ao salvar nova medição, estado vazio, radar com cenário controlado de séries (inclusive treino fora dos 7 dias que não conta), insights, 320/390/1280 px, movimento reduzido e axe nas 5 paletas). `habitos-v3.js` ajustado para observar a animação na abertura. Antes/depois: `antes-depois/depois-f7-corpo.jpg` (antes: `antes-m-corpo.jpg`).

**Efeito colateral encontrado na regressão (Fase 7):** com o resumo no topo, o card "Nova medição" desceu na tela e, no desktop de 1440 px, o tutorial passou a colocar o balão ao lado do card (antes ia embaixo). O balão não cobre o card, mas o teste `tutorial.js` só comparava a sobreposição na vertical. O teste agora compara os dois eixos (retângulos que realmente se cruzam); o comportamento do tutorial não mudou.

## Fases 8 e 9 · Perfil (moldura do avatar, caminho em etapas, vitrine e radar)

**Decisão do Gabriel:** "pode seguir" com o plano proposto (avatar com moldura; nível/XP e roadmap; vitrine; radar). As duas fases do plano original (Perfil e molduras ornamentais) foram feitas juntas porque a moldura é parte do Perfil.

**O que foi acrescentado (só visual; nenhum dado novo é gravado, as contas de patente/XP/conquistas são as do app):**
- **Moldura do avatar, CSS puro, sem imagem de terceiros.** O avatar do Perfil ficou circular dentro de uma moldura de 80 px com anel de XP (conic-gradient, preenchido com a % do caminho até a próxima patente, igual à barra do card de patente), emblema com o nível (1 a 10) e ornamentos que crescem com a patente: 1–2 anel simples; 3–4 anel duplo; 5–6 marcas ao redor; 7–8 marcas e quatro gemas; 9–10 brilho e giro lento das gemas (transform; desligado com movimento reduzido). A moldura é `role="img"` com descrição por extenso ("patente Platina, nível 6 de 10, 21% do caminho…"); o nível nunca depende só da cor. O avatar do topo (botão do Perfil) ganhou só o anel de XP.
- **Caminho em 4 etapas** (card "Próximos marcos"): linha do tempo vertical numerada com "Você está aqui" (patente atual, nível, XP total, sequência), próxima patente, próximo marco de sequência e conquista mais perto. As 3 últimas já existiam; a 1ª etapa é nova e a primeira vem marcada com `aria-current="step"`.
- **Vitrine de conquistas:** as desbloqueadas ficam numa prateleira ("Na vitrine") e as demais em "Em progresso", com a barra do quanto falta. Nenhuma conquista foi removida e tocar ainda abre o detalhe. Sem nenhuma conquista, aparece uma mensagem acolhedora.
- **Radar da ficha:** abertura suave (opacity/transform) só na primeira vez; sem mudar os atributos nem as contas.
- Decisão: a moldura segue a patente (e não o nível de conquistas) porque a patente é o único progresso contínuo e já tem cor própria (`--t1` a `--t10`).

**Verificação:** `fonte/testes/perfil-v3.js` (51 checagens: moldura com descrição e nível igual ao do escudo, anel de XP igual à barra do card, ornamentos por patente 1–10, movimento reduzido, caminho numerado, vitrine sem perder conquistas e com detalhe funcionando, usuário novo (vitrine vazia), sem cadastro, 320/390/1280 px e axe nas 5 paletas). Antes/depois: `antes-depois/depois-f8-perfil.jpg` e `depois-f8-molduras.jpg` (as 10 molduras lado a lado); antes: `antes-m-perfil.jpg`.

