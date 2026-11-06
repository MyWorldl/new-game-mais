# NG+ — Fontes locais e limites de leitura (v1)

Data: 2026-11-06

## Entregue (na pasta do projeto, ainda sem git push)
1. **Fontes locais (item 1)**: Barlow Condensed (500/600/700), Work Sans (variável) e IBM Plex Mono (500/600) em `site/fonts/` (woff2 + licenças OFL). `@font-face` inline no build (`aplica-standalone.py`, passo 1b). CSP sem googleapis/gstatic; `/fonts/*` com cache imutável; `sw.js` guarda as 6 fontes para uso offline. Teste: `fonte/testes/fontes.js` (4/4: nenhum pedido a host externo).
2. **Paginação robusta (item 3)**: `ng-nuvem.js` — o pull avança pelo que o servidor DEVOLVEU (não por um tamanho fixo) e só para em página vazia; deduplica por path; trava de segurança de 200 voltas. Antes, se o limite de linhas por requisição fosse menor que o pedido, o pull parava cedo e o app interpretaria o restante como "apagado em outro aparelho". Lista de fotos do Storage também paginada (100 por vez, offset). Teste: `fonte/testes/limites.js` (6/6; 2.300 medições; também com o servidor cortando em 400 linhas). Usuário descartável removido.
3. Regressão após as mudanças: E2E 22/22, treino F1 26/26, F2 23/23, F3 16/16, axe 0 problemas nos 7 temas.
4. **Botão "Instalar no celular"** (Configurações → card `#cfg-instalar`, 2026-11-06): Android/Chrome e Chrome/Edge no computador usam `beforeinstallprompt` (1 toque abre a janela oficial); iPhone/iPad não permite instalar por código, então mostra passo a passo (Safari: Compartilhar → Adicionar à Tela de Início; fora do Safari pede para abrir no Safari; navegador embutido pede para abrir no navegador). Já instalado: confirma e esconde o botão. Código em `ng-nuvem.js` (2º bloco) + card em `aplica-standalone.py`. Teste `fonte/testes/instalar.js` 16/16; regressão completa verde (E2E 22, treino 26/23/16, fontes, axe 0).
5. `sw.js` VERSAO = `ng-instalar-1`.

## Bloqueado / pendente
- **Item 5 (lembretes/push)**: planejado (tabela `push_subs` com RLS, chaves VAPID no Vault, Edge Function horária via pg_cron + pg_net, UI em Config, handlers no SW). A criação de segredos no Vault foi negada pelo classificador do modo automático ("Secret-Store Writes"). Nada foi criado no banco; chaves geradas foram descartadas. Precisa de autorização explícita do Gabriel.
- **Item 4 (texto de treinador por LLM)**: precisa de chave de API (segredo) e decisão de consentimento — não iniciado.
- **Item 2 (SMTP transacional)**: explicado ao Gabriel, aguardando "ok". Nota: os 30 e-mails/h são o limite padrão do Supabase Auth com SMTP próprio (ajustável em Rate Limits), não do Gmail em si; o Gmail tem teto diário próprio.
- **PRD Fases 8/9**: PUBLICADO em 2026-11-06 (versão 99, id 1793959585-bb45) após autorização explícita do Gabriel. Rollback = republicar `fonte\backup-prd\prd-v98-1792542466-7ede.html`.

Fontes: https://supabase.com/docs/guides/auth/auth-smtp · https://resend.com/pricing
