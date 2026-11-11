# NG+ (New Game+) — app de treino, corpo e dieta

PWA de arquivo único (HTML + CSS + JS embutidos), publicada na Cloudflare (Workers + static assets) e ligada ao Supabase
(login por e-mail, sincronização, fotos, lembretes por push e resumo do treinador por IA).
Site no ar: https://new-game-mais.sombrasplays.workers.dev

## Estrutura
- `site/` — **o que vai ao ar**: `index.html` (gerado), `app.<hash>.js` e `app.<hash>.css` (gerados), `ng-nuvem.css`, `bff-runtime.js` (camada de dados local/IndexedDB), `ng-nuvem.js` (login e sincronização),
  `vendor-supabase.js` (supabase-js fixado), `sw.js` (service worker), `manifest.webmanifest`, `_headers` (cabeçalhos e CSP), `fonts/`, ícones.
- `fonte/` — **de onde o site nasce** (não vai ao ar): `candidato-prd.html` (fonte do app), `visual/` (tema v2), `aplica-standalone.py`, `build.sh`,
  `testes/` (Playwright e testes unitários), `supabase/` (Edge Functions e SQL) e `docs/`. Detalhes em `fonte/README-fonte.md`.
- `wrangler.jsonc` — diz à Cloudflare para publicar a pasta `site/` (nome do projeto: `new-game-mais`).

## Fluxo de trabalho
1. Editar `fonte/candidato-prd.html` (ou `fonte/visual/`, `site/ng-nuvem.js`, `site/bff-runtime.js`, etc.).
2. Gerar o site: `sh fonte/build.sh`. Ele reescreve `site/index.html` (pequeno, ~64 KB) e separa o CSS e o JS em `site/app.<hash>.css` e `site/app.<hash>.js` (`fonte/externaliza.py`), regravando também a lista de pré-cache do `sw.js`. **Não edite esses arquivos à mão.** Se o ambiente não deixar apagar, os `app.*` antigos ficam para trás: apague-os antes do commit.
3. Rodar os testes: `sh fonte/testes/rodar-todos.sh` (sobe o `site/` com os cabeçalhos de produção, inclusive a CSP; precisa de Node 22+, `playwright` e Chromium). Testes avulsos: `node fonte/testes/<teste>.js`.
4. Trocar `VERSAO` em `site/sw.js` (é o que faz o celular pegar a versão nova e mostrar o aviso "Nova versão disponível").
5. `git add` (só o que mudou, inclusive os `app.*` novos) → `git commit` → `git push origin main`. A Cloudflare publica sozinha.
6. A conferência é automática **depois de ativar o CI**: copie `fonte/ci/ci.yml` para `.github/workflows/ci.yml` (o Claude não consegue gravar nessa pasta protegida). O workflow refaz o build (o `site/` precisa estar em dia), roda os testes e, depois do push na `main`, espera o `sw.js` ao vivo mostrar a `VERSAO` nova.

## Segurança do site
- CSP sem `unsafe-inline` em scripts e em `<style>`: todo script e todo CSS vêm de arquivos próprios (`script-src 'self'`, `style-src 'self'`); só atributos `style=""` seguem permitidos (`style-src-attr`). Por isso o app não usa `onclick=` nem cria `<style>` por script.
- O gancho de teste `window.__ngTest` só existe em `localhost`.
- Erros do app ficam no aparelho (`reportar()` → Config → Diagnóstico); nada é enviado. Para ligar um RUM (Datadog) é preciso liberar o domínio na CSP, carregar o SDK e atualizar a política de privacidade: `reportar()` já repassa para `window.DD_RUM.addError` quando ele existir.

## Supabase (projeto `gjoxrgnkwmjvcfiywtcs`)
- Tabelas: `user_docs` (dados da pessoa, com RLS), `push_subs`, `llm_uso` (cota diária da IA). Bucket privado `fotos-progresso`.
- Edge Functions em `fonte/supabase/functions/`: `lembretes` (push; `verify_jwt=false`, exige o header `x-cron-secret` ou o JWT do usuário no teste),
  `treinador` (resumo por IA; exige login, consentimento e 18+; cota atômica por dia de São Paulo), `delete-account` (exclusão LGPD).
  CORS restrito ao site (mais `localhost` e, se preciso, o segredo `CORS_ORIGENS`).
- SQL de referência: `fonte/supabase/push_ia_v1.sql` (inscrições, cota e cron) e `fonte/supabase/seguranca_v1.sql` (segredo do cron no Vault, `cron_secret_ok`, `consome_cota_ia`).
- Segredos das funções (painel → Edge Functions → Secrets): `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `ANTHROPIC_API_KEY`. O segredo do cron fica no **Vault** do banco.

## Cuidados
- Nunca versionar chaves: só a chave pública (publishable) do Supabase vai ao app; a proteção real é o RLS.
- `fonte/testes/em-casa.js` é um arquivo antigo, fora do git: não adicionar.
- Publicar só depois de conferir o `sw.js` ao vivo — o app instalado só atualiza quando a `VERSAO` muda.
