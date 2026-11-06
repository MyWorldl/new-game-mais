# Best Friends Forever — pacote para Cloudflare Pages (Etapa A, upload direto)

Conteúdo: index.html (app), bff-runtime.js (guarda os dados no navegador), sw.js (abrir sem internet),
manifest.webmanifest + icon-*.png (instalar como app), _headers (segurança).

## Publicar (upload direto — sem GitHub)
1. Cloudflare → Workers & Pages → Create → Pages → "Upload assets" (arrastar e soltar).
2. Nome do projeto NOVO e separado (ex.: `best-friends-forever` → https://best-friends-forever.pages.dev). Não use o projeto do outro site.
3. Arraste a PASTA descompactada (os arquivos na raiz, não uma subpasta) → Deploy.
4. Atualizar depois: Pages → seu projeto → Create deployment → arraste a pasta nova.
   Ao mudar o app, troque `VERSAO` no sw.js para o celular pegar a versão nova.

## Depois de publicar
- Abra no celular → "Adicionar à tela inicial".
- Config → Seus dados → Exportar (o arquivo leva as fotos). Faça de vez em quando.
- Os dados ficam no navegador/aparelho: celular e PC NÃO sincronizam (isso é a Etapa B, Supabase).
