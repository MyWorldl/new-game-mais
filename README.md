# NG+ (New Game+) — app de treino, corpo e dieta

Site estático (sem build) publicado na Cloudflare (Workers + static assets) a partir deste repositório.
Os dados ficam no navegador de quem usa (IndexedDB) — Etapa A. Sincronização na nuvem (Supabase) será a Etapa B.

## Estrutura
- `site/`         → o que vai ao ar (index.html, bff-runtime.js, sw.js, manifest, ícones, _headers)
- `fonte/`        → ferramentas para regenerar o site (não vai ao ar) — veja `fonte/README-fonte.md`
- `wrangler.jsonc`→ diz à Cloudflare para publicar a pasta `site/` (nome = `new-game-mais`)

## Configuração no painel da Cloudflare (Workers & Pages → Import a repository)
- Project name: `new-game-mais` (igual ao `name` do wrangler.jsonc)
- Production branch: `main`
- Build command: vazio
- Deploy command: `npx wrangler deploy`
- Preview command: `npx wrangler preview` (se der erro, use `npx wrangler versions upload`)
- Variáveis/segredos: nenhum nesta etapa. Token de API: deixe a criação automática.

## Atualizar
`git add -A` → `git commit -m "..."` → `git push` → a Cloudflare publica sozinha.
Se mudar o app, troque `VERSAO` em `site/sw.js` (para o celular pegar a versão nova).
Branches diferentes de `main` geram um link de pré-visualização.

## Cuidados
- Não versionar chaves/segredos (a Etapa B usará só a chave pública do Supabase + RLS).
- Esta pasta está no OneDrive: se aparecerem arquivos duplicados/conflitos dentro de `.git`, mova o repositório para fora do OneDrive (ex.: `C:\dev\`).
