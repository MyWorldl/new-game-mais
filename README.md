# Best Friends Forever (Ritmo de Ferro)

App de treino, corpo e dieta. Site estático (sem build) publicado no Cloudflare Pages.
Os dados ficam no navegador de quem usa (IndexedDB) — Etapa A. Sincronização na nuvem (Supabase) será a Etapa B.

## Estrutura
- `site/`  → o que vai ao ar (index.html, bff-runtime.js, sw.js, manifest, ícones, _headers)
- `fonte/` → ferramentas para regenerar o site (não vai ao ar) — veja `fonte/README-fonte.md`

## Publicar (Cloudflare Pages + Git)
1. Cloudflare → Workers & Pages → Create application → Pages → Connect to Git → GitHub → escolha este repositório (privado).
2. Project name: ex. `best-friends-forever` (projeto novo, separado de outros sites).
3. Production branch: `main`.
4. Framework preset: None · Build command: vazio (ou `exit 0`) · Build output directory: `site` · Root directory: vazio.
5. Save and Deploy. A URL será `https://<nome>.pages.dev`.

## Atualizar
Edite/gere os arquivos → `git add -A && git commit -m "..." && git push` → a Cloudflare publica sozinha.
Se mudar o app, troque `VERSAO` em `site/sw.js` (para o celular pegar a versão nova).
Cada branch diferente de `main` gera um link de pré-visualização.

## Cuidados
- Não versionar chaves/segredos (a Etapa B usará só a chave pública do Supabase + RLS).
- Se esta pasta estiver dentro do OneDrive, prefira manter o repositório fora dele (veja abaixo) ou pausar a sincronização ao usar git.
