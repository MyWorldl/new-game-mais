# Progresso da publicação — Etapa A (standalone) — v1

Atualizado em 05/11/2026. Complementa `claude/plano-publicacao-cloudflare-supabase-v1.md`.

## Decisões do Gabriel
- Hospedagem: Cloudflare Pages, em um projeto NOVO e separado do outro site que ele já tem na mesma conta.
- Entrega: MUDOU em 05/11 para **Git** (GitHub privado → Cloudflare Pages com deploy automático). Antes: upload direto. Motivo: histórico de versões e deploy a cada `git push`. Obs. da Cloudflare: projeto com Git não volta para Direct Upload (e vice-versa).
- Pasta local do Gabriel: `Projetos\Claude\projeto_academia` (raiz do repositório): `site/` (vai ao ar), `fonte/` (ferramentas), `README.md`, `.gitignore`.
- Configuração do Pages: branch `main`, framework None, build command vazio (ou `exit 0`), build output directory `site`, root directory vazio.
- Endereço inicial: `*.pages.dev`.
- Fotos de progresso: vão DENTRO do arquivo de backup (.json).
- PRD/DEV do Claude não foram alterados; o pacote parte do PRD v98 + Fases 8 e 9 (ainda não aplicadas em prod).

## O que foi construído (pacote `bff-ritmo-de-ferro-pacote.zip`)
- `bff-runtime.js`: cria `window.claude` só se não existir (dentro do Claude nada muda). db em IndexedDB (docs + blobs), cache em memória, BroadcastChannel entre abas, `storage.persist()`, fotos reduzidas a 1600 px JPEG 0,82, downloads via `<a download>`, registro do service worker.
- `index.html`: PRD + Fases 8/9 com ajustes mínimos marcados "A1": `fotoSrc` usa a URL local do adaptador; indicador "Tudo salvo neste aparelho"; backup leva `fotosArquivos` (data URLs) e a importação restaura as imagens (limite de importação 80 MB fora do Claude); aviso em Config → Seus dados.
- `sw.js` (abre offline, rede primeiro), `manifest.webmanifest` + ícones, `_headers` (CSP, nosniff, no-referrer, sem permissões de câmera/microfone/localização), `LEIA-ME.md`.
- Script `aplica-standalone.py` gera o `index.html` a partir do candidato PRD (reaplicável a cada versão).

## Testes (E2E Playwright, 22/22)
Onboarding na 1ª abertura; persistência após reload; foto adicionada, mantida e renderizada; backup tem perfil/medições/check-ins + fotos embutidas; limpar dados do site → importar → tudo volta (inclusive imagem); duas abas sincronizam; service worker registrado; abre offline com dados; manifest válido; zero erros de console; sem overflow a 320 px na tela Config.

## Pendente
- Gabriel: `git init` + primeiro commit + push para repositório privado no GitHub, conectar no Cloudflare Pages (passos no README.md da raiz). Cuidado: pasta está no OneDrive — preferir repositório fora dele; validar no celular (checklist 3.5 do plano) e instalar como app.
- Testar Safari/iOS de verdade (limpeza de dados de sites pouco usados) — mitigação: PWA + backup.
- Fontes do Google continuam externas (offline usa fonte padrão); self-host opcional.
- "aplicar em prod": levar Fases 8/9 ao PRD do Claude (independe da publicação).
- Confirmar Termos da Cloudflare antes de uso comercial.
- Etapa B (Supabase: login + sincronização celular/PC) em sessão futura.

## Atualização 05/11 — nome e visual
- App renomeado para **NG+ (New Game+)** (título, cabeçalho, manifest, textos, nomes de arquivos baixados `ng-mais-*`). O id interno do backup continua `ritmo-de-ferro` (compatibilidade).
- Publicação: GitHub `MyWorldl/new-game-mais` + Cloudflare (Workers static assets, `wrangler.jsonc`, output `site/`, deploy a cada push).
- **Visual v2 — Fase 1** (decisões: híbrido Kinora/FitFlow + toques de RPG; em fases; manter os 7 temas; destino = site NG+): arquivo `fonte/visual/visual-v2.css` (bloco sem camada, só estilo). Novo padrão verde-limão no tema "Modo jogo"; cartões em vidro, cabeçalho translúcido, navegação inferior flutuante, Hoje (quest, patente/XP, sequência, semana, medidas, missões). Os outros 6 temas recebem a parte estrutural.
- Verificado: 22/22 E2E, axe (contraste) sem violações em 7 temas × 320/400 px × 5 telas, sem overflow horizontal.
- Próximas fases: Treino, Dieta, Corpo, Perfil/Config (ficha de personagem com radar de atributos, rank), gráficos.
