# NG+ — análise dos 3 áudios e proposta de melhorias no Treino — v1

Data: 05/11/2026. Proposta (nada foi implementado ainda). Base: código atual do app (`renderLiveWorkout`, `renderWeekTrailDetail`, `bumpQuestProgress`, `metaRepsDe`, `sugestaoProgressao`, glossário `rpe`).

## 1. O que os áudios pedem (transcrição interpretada)
1. **Áudio 1 (≈18 s):** fazer a "IA" avaliar o treino com base nos registros; levantar melhorias no treino; mostrar a capacidade do usuário para melhorar nos exercícios; "evolução/devolução progressiva". *(A transcrição automática ficou incerta em "devolução progressiva": assumi "evolução progressiva".)*
2. **Áudio 2 (≈23 s):** melhorar o lançamento de exercício; deixar tudo pronto para o RPE funcionar; o glossário deve explicar essa dúvida (o que é e como funciona o RPE); dar uma opção de **concluir o exercício sem terminá-lo por completo** ou sem atingir a meta de séries do treino.
3. **Áudio 3 (≈23 s):** o treino tem um **limitador de repetições**; ajustar para poder lançar a quantidade realmente feita, mesmo acima ou abaixo do previsto.

## 2. Diagnóstico no código (por que a dor existe)
- O app guarda **um único contador de repetições por exercício** (`checkins[iso].progresso[idx]`), limitado por `Math.min(metaReps, …)` em `bumpQuestProgress` e na tela. Esse é o "limitador".
- `metaReps` = séries × ponto médio da faixa (ex.: 3 × 8-12 → 30). Quem faz 3×8 = 24 **nunca fecha o exercício**, e o treino do dia só conclui se **todos** os exercícios baterem a meta. Quem faz 3×12 = 36 é cortado em 30.
- O botão "✓ Série" soma um valor fixo (meta ÷ séries): não registra o que a pessoa fez de fato.
- Não existe "terminar parcial" nem "pular exercício" (só "Concluir treino inteiro" no nível do dia e o treino rápido).
- **RPE**: uma nota 6–10 por exercício, opcional, descrita como "esforço da última série". A sugestão de carga (`sugestaoProgressao`) só funciona se houver RPE e **ignora repetições** (o próprio código comenta isso). Sem séries individuais, o app também não consegue estimar capacidade nem avaliar evolução.
- O "Ferro" (narrador) é **baseado em regras**, não é IA generativa, e comenta só constância/XP, não qualidade do treino.

## 3. Proposta (3 fases, cada uma entregável sozinha)

### Fase 1 — Lançamento de verdade (áudios 2 e 3) — prioridade máxima
- **Série a série**: cada toque em "✓ Série" abre uma linha com **repetições feitas** (campo numérico, já preenchido com o alvo, 0–99, sem teto) e, opcionalmente, carga daquela série (herda a do exercício). Um toque confirma o previsto; tocar no número edita.
- **Faixa de referência sem culpa**: mostrar "meta 8–12" e um rótulo neutro por série ("abaixo da faixa", "na faixa", "acima da faixa") com texto/ícone (não só cor), sem tom de falha.
- **Exercício concluído** passa a ser "séries registradas ≥ séries previstas" (não mais total de repetições). Isso resolve o 3×8 que nunca fechava.
- **Encerrar aqui** (concluir parcial): botão no exercício e no modo ao vivo que marca `status = parcial` (opcional: motivo — cansaço, dor, tempo, equipamento). **Pular** fica separado (`pulado`). O treino do dia conclui quando todos os exercícios estão resolvidos (ok/parcial/pulado) e há pelo menos um com séries registradas. XP e sequência continuam por treino concluído (regra atual preservada).
- **Dados (compatível)**: novos campos opcionais em `checkins/<iso>`: `sets[idx] = [{r, k?}]` e `status[idx]`. `progresso[idx]` continua sendo gravado como soma das repetições (derivado), então streak/XP/backup/importador e check-ins antigos seguem válidos; nada é apagado.
- **Risco**: dia já em andamento na hora da atualização (tratado lendo `progresso` antigo como "séries implícitas"); acessibilidade (alvos ≥ 44 px, `inputmode="numeric"`, rótulos). Menores/iniciantes: mantém a regra de nunca sugerir falha/carga máxima.

### Fase 2 — RPE que funciona (áudio 2)
- **Pedir no momento certo**: ao concluir a **última série** do exercício, aparece "Como foi?" com 4 opções em linguagem simples que mapeiam o RPE: *Sobrou bastante (7)*, *Bom (8)*, *Quase na falha (9)*, *Falha (10)*; o seletor 6–10 continua disponível. Para menores/iniciantes a opção "Falha" fica oculta.
- **Mini-explicação de 20 s** na primeira vez e no (?) do campo, com analogia: *o RPE é o ponteiro do combustível — não mede quanto você levantou, mede quanto ainda restava no tanque (quantas repetições sobraram)*.
- **Glossário reescrito** (entrada `rpe`): o que é, tabela 6–10 com repetições na reserva (RIR), exemplo com número ("fez 10 reps e conseguiria mais 2 → RPE 8"), "não precisa ser exato" e **como o app usa** (sugestão de carga). Mantém a fonte (Zourdos 2016) e acrescenta Helms 2016.
- **Sugestão de carga com repetições** (dupla progressão, lendo `sets`): bateu o topo da faixa em todas as séries com RPE ≤ 8 → sugerir subir carga; dentro da faixa → buscar +1 rep; abaixo da faixa por 2 sessões → manter/reduzir um degrau. Sem RPE, a regra ainda funciona só com repetições.

### Fase 3 — "Treinador" que avalia e mostra evolução (áudio 1)
- **Sem IA generativa por padrão**: motor de regras local (offline, sem custo, previsível, sem enviar dados de saúde a terceiros). O "Ferro" ganha uma segunda voz: um cartão **"Análise do treino"** ao concluir o dia e um resumo semanal.
- **Por exercício** (últimas 3–4 sessões): *progredindo*, *estável*, *estagnado* (2+ sessões sem avanço → ajustar carga/reps, deload ou trocar variação — usa as alternativas que o app já tem), *sem dados*. Cruza com o **Volume semanal por músculo** que já existe.
- **"Capacidade para melhorar"**: para adultos com histórico, tendência de **força estimada** (fórmula de Epley, carga × reps) com aviso de que é estimativa; para **iniciantes e menores de idade** não mostra "carga máxima" — mostra "repetições na mesma carga" e "séries concluídas".
- **Opcional futuro (Etapa B)**: texto personalizado por um modelo de linguagem via backend, com consentimento explícito (LGPD) e envio mínimo de dados. Só depois do login/Supabase.

## 4. Ordem, esforço e verificação
| Fase | Esforço | Entrega testável |
|---|---|---|
| 1 | médio | lançar 3×8 e fechar; lançar 15 reps numa série de 12; encerrar parcial; E2E + backup/importação |
| 2 | pequeno–médio | RPE ao fim da última série; glossário; sugestão usando reps |
| 3 | médio | cartão de análise com dados de demonstração (os backups de 1 ano e 75 dias já servem) |

Em cada fase: E2E 22/22 + novos testes, axe (7 temas × 320/400/desktop), nenhuma mudança no formato do backup além de campos opcionais, PRD/DEV do Claude intactos.

## 5. Decisões do Gabriel (06/11/2026)
1. **Parcial** conta XP, porém **menos** que um exercício completo. **Pulado** não conta XP, e o XP final do treino concluído desconta o valor dos exercícios pulados (XP do treino passa a ser proporcional aos exercícios feitos). Pendente de definir os pesos exatos (sugestão: completo 100%, parcial proporcional às séries feitas com piso de 50%, pulado 0%) e como isso convive com a sequência (sugestão: o dia conta para a sequência se houver ao menos 1 exercício feito).
2. "IA" = regras locais agora; modelo de linguagem só na Etapa B — **aprovado**.
3. Leitura dos áudios — **confirmada**.

## 6. (antigo) Decisões que dependiam do Gabriel
1. Um exercício **parcial ou pulado** deve contar para concluir o treino do dia (sequência/XP)? Recomendo: parcial conta; pulado conta só se houver ao menos um exercício feito.
2. "IA" = regras locais agora, modelo de linguagem só na Etapa B — de acordo?
3. Confirmar a leitura dos áudios (principalmente "evolução progressiva" e "o glossário deve explicar o RPE").

## Fontes
- Zourdos et al., 2016 (RPE/RIR, já usada no app): https://pubmed.ncbi.nlm.nih.gov/26049792/
- Helms et al., 2016 — RPE baseado em repetições na reserva: https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full
- ACSM, 2009 — Progression models in resistance training for healthy adults: https://pubmed.ncbi.nlm.nih.gov/19204579/
