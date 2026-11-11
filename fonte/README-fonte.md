# Fonte do projeto (para regenerar o site)

Fluxo: cardapio/*.js -> esbuild (.build/cardapio.bundle.js) -> candidato-prd.html + inclui.py (monta) -> visual/aplica-visual.py (visual v2) -> aplica-standalone.py (NG+ e dados no aparelho) -> externaliza.py -> ../site/

- candidato-prd.html  -> app-base (PRD v98 + Fases 8 e 9), sem selo DEV.
- visual/visual-v2.css -> o visual novo (Fase 1). É o arquivo para ajustar cores, cartões, navegação.
- visual/aplica-visual.py -> insere o CSS no app.
- aplica-standalone.py -> ajustes do NG+ / armazenamento no navegador.
- cardapio/engine.js + ui.js -> módulos ES, ÚNICA fonte do cardápio. `ui.js` exporta `criaCardapio(ctx)` e só enxerga o app pelo objeto `ctx` (contrato documentado no topo do arquivo). O esbuild os empacota num IIFE (`var NGCardapio`) em `fonte/.build/` (gerado, fora do git).
- inclui.py -> passo 0 do build: troca cada marcador de inclusão (linha só com `/*@inclui caminho.js*/`) pelo conteúdo do arquivo; hoje só `.build/cardapio.bundle.js`. Editar sempre em `cardapio/`, nunca no candidato.
- build.sh -> roda tudo e escreve ../site/index.html:   sh build.sh
- undev.py -> converte um HTML do DEV em candidato PRD.
- testes/e2e.js -> teste ponta a ponta (Playwright): sirva a pasta site (python3 -m http.server 8765) e rode node e2e.js http://localhost:8765

Deploy: git push (Cloudflare publica a pasta site/). Ao mudar o app, troque VERSAO em site/sw.js.
