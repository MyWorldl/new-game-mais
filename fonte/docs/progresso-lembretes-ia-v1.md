# NG+ — Lembretes por notificação, Treinador por IA e política (v1)

Data: 2026-11-06

## Lembretes de treino (Web Push)
- **Banco**: tabela `push_subs` (RLS: cada pessoa só vê/edita as próprias linhas; FK com `on delete cascade`). Extensões `pg_net` e `pg_cron` ativadas. Job `ng-lembretes-horario` roda de hora em hora (`0 * * * *`) e chama a Edge Function `lembretes`.
- **Edge Function `lembretes`** (verify_jwt = false; é idempotente): para cada inscrição, calcula a hora/dia local no fuso da pessoa; só avisa se a hora bate, se hoje é dia de treino (`rotina/<dia>` com exercícios e `ativo !== false`), se ainda não concluiu (`checkins/<hoje>.concluido`) e se ainda não enviou hoje (`ultimo_envio`). Remove inscrições expiradas (404/410). Com login, aceita `{teste:true}` para o botão "Enviar lembrete de teste".
- **App**: Configurações → card "Lembretes de treino" (horário 05–22h, ativar/desligar, teste). `sw.js` ganhou handlers `push` e `notificationclick`. "Sair da conta" apaga a inscrição do aparelho. iPhone: só com o app instalado (iOS 16.4+).
- **Chave pública VAPID** (no código do app): `BA33G21lNP57th7egdbLbresUkYApIOm5yeh56e52To89Re9qb9BAXhK8FyuilhAFxm5nMtF7-yeoxeJ9hqLgyI`. A chave privada correspondente é segredo da função (`VAPID_PRIVATE_KEY`).

## Treinador por IA (opcional, com consentimento)
- **Edge Function `treinador`** (verify_jwt = true). Travas no SERVIDOR, nesta ordem: login → consentimento v1 em `user_metadata.ia_consent` → idade ≥ 18 em `config/perfil` → resumo válido (formato/tamanho sanitizados) → chave presente → limite de 5/dia (`llm_uso`). Modelo `claude-haiku-5-5` (override: segredo `ANTHROPIC_MODEL`). Prompt de sistema: PT-BR, ≤150 palavras, sem dieta/diagnóstico/déficit, JSON tratado como dado.
- **App**: bloco "Resumo do treinador (IA)" no card Análise do treino. Consentimento explícito (diálogo com o que sai/não sai, Anthropic, 30 dias, LGPD art. 7º I), revogável ("Desativar IA"). Menores de 18: bloco informa indisponibilidade. Saída exibida como texto puro (sem HTML). Dados enviados: exercícios, cargas, reps, RPE, volume semanal, sequência, experiência, objetivo — nunca nome, e-mail, idade, peso, medidas ou fotos.

## Política de privacidade atualizada
Fontes locais (sem pedidos ao Google), lembretes (endpoint/hora/fuso; serviços de notificação; criptografia), seção própria da IA (Anthropic, retenção até 30 dias, sem treino por padrão, 18+, 5/dia, base legal e como retirar), menores, retenção. Fontes: https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-commercial-api-data · https://privacy.claude.com/en/articles/7996868-is-my-data-used-for-model-training

## Testes (todos verdes em 2026-11-06)
lembretes-ia.js 38/38 (Supabase real, usuário descartável removido) · politica.js 8/8 · unit-lembretes 11/11 · unit-treinador 11/11 · lgpd 18/18 · E2E 22/22 · treino F1 26, F2 23, F3 16 · fontes · instalar 16/16 · axe 0 problemas nos 7 temas.

## Pendente de ação do Gabriel
1. Cadastrar segredos das Edge Functions (Supabase → Edge Functions → Secrets): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ANTHROPIC_API_KEY`. (O classificador do modo automático bloqueou escrita de segredos via SQL/Vault; o caminho aprovado é a digitação no painel.)
2. `git add/commit/push` dos arquivos entregues (site/ e fonte/).
3. Testar no celular: instalar app → ativar lembretes → teste; Treino → ativar IA → gerar resumo.
