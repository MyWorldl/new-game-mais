# NG+ — Treino Fases 1, 2 e 3 (progresso v1)

Atualizado em 06/11/2026. Origem do plano: `claude/analise-audios-treino-v1.md`.

## O que mudou

**Fase 1 — lançamento série a série.** Cada série registra as repetições (ou segundos) que a pessoa fez de verdade, sem teto. Exercício pode ser encerrado antes ("Encerrar aqui", XP proporcional, piso de 50%) ou pulado (0 XP, não quebra a sequência), com motivo opcional. Check-ins antigos (só `progresso`) viram séries implícitas, então nada quebra. Backup/importação preservam `sets`, `status`, `motivo`.

**Fase 2 — RPE e dupla progressão.** Ao fechar o último exercício aparece "Como foi esse exercício?" (Sobrou bastante = RPE 7, Bom = 8, Quase na falha = 9, Falha = 10). "Falha" não aparece para menores de 18 nem iniciantes; o seletor manual 6–10 do painel Registrar continua (sem o 10 para menores). Explicação com analogia do marcador de combustível, mostrada na 1ª vez e em `?`/Glossário (com fontes). A sugestão de carga agora usa as séries: topo da faixa em todas as séries e RPE ≤ 8 (ou ausente) → subir; topo com RPE 9–10 → manter; série abaixo do mínimo em 2 sessões com RPE ≥ 9 → reduzir um degrau; dentro da faixa → manter e buscar +1 repetição. Sem séries (legado) mantém a regra antiga só por RPE. O RPE nunca é obrigatório.

**Fase 3 — Análise do treino.** Novo card na aba Treino (regras locais, sem IA): por exercício, últimas 4 sessões → Progredindo / Estável / Estagnado / Sem dados, com tabela das sessões. Estagnado cruza RPE alto (recuperação), volume planejado abaixo do MEV ou acima do MRV, e lembra de ignorar se foi deload. Tendência de força (1RM por Epley) só para adultos não iniciantes com ≥3 sessões; iniciantes e menores veem "repetições na mesma carga" e "séries concluídas". Seção de volume da semana (realizado × planejado) com a semana passada comparada ao mínimo. Ao concluir o treino do dia aparece "Análise de hoje" comparando cada exercício com a última vez.

## Testes
- `testes/treino-f1.js` 26/26, `treino-f2.js` 23/23, `treino-f3.js` 16/16, E2E 22/22.
- axe (WCAG 2.1 A/AA) em 7 temas × 320/400/1024 px: 0 violações nas telas de Treino novas.
- Gancho de teste `window.__ngTest` só ativa com `localStorage.ng_test_hooks=1`.
- Service worker: `ng-t3-1`.

## Fontes
- Zourdos et al., 2016 (escala RPE/RIR): https://pubmed.ncbi.nlm.nih.gov/26049792/
- Helms et al., 2016 (RPE/RIR e dupla progressão): https://openrepository.aut.ac.nz/items/92cefeac-7c32-44f1-bfbc-f48f4a5dd8cf/full
- RP Strength, landmarks de volume: https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth

## Riscos / observações
- As sessões antigas são localizadas pelo índice/nome do exercício na rotina atual; se a rotina mudou muito, o histórico de um exercício pode ficar incompleto (mesma limitação do gráfico de cargas).
- Os limiares (4 sessões, ≥1 repetição de diferença, RPE ≥ 9) são heurísticas; ajustar após uso real.

## Checklist de teste no celular
1. Fechar um exercício (3 séries) e responder "Como foi?"; tocar em Alterar.
2. Fechar o dia e ver "Análise de hoje".
3. Abrir Treino → Análise do treino e expandir um exercício.
4. Glossário → RPE, RIR, Dupla progressão (links de fonte).
