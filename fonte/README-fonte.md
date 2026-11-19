# Fonte do projeto (para regenerar o site)

Fluxo: cardapio/*.js -> esbuild (.build/cardapio.js, módulo ES) ; app.html -> visual/aplica-visual.py (visual v2) -> aplica-standalone.py (NG+ e dados no aparelho) -> externaliza.py (app.<hash>.js/css e cardapio.<hash>.js) -> ../site/

- app.html  -> app-base (PRD v98 + Fases 8 e 9), sem selo DEV.
- visual/visual-v2.css -> o visual novo (Fase 1). É o arquivo para ajustar cores, cartões, navegação.
- visual/aplica-visual.py -> insere o CSS no app.
- aplica-standalone.py -> ajustes do NG+ / armazenamento no navegador.
- cardapio/engine.js + ui.js -> módulos ES, ÚNICA fonte do cardápio. `ui.js` exporta `criaCardapio(ctx)` e só enxerga o app pelo objeto `ctx` (contrato no topo do arquivo). O esbuild gera `.build/cardapio.js` (fora do git) e o `externaliza.py` o grava como `site/cardapio.<hash>.js`, trocando a constante `CARDAPIO_URL` do app pelo nome com hash e incluindo o arquivo no pré-cache do `sw.js`. O app o carrega com `import()` na primeira vez que a Dieta desenha o cardápio.
- build.sh -> roda tudo e escreve ../site/index.html:   sh build.sh
- undev.py -> converte um HTML do DEV em app.html (fonte do app).
- testes/e2e.js -> teste ponta a ponta (Playwright): sirva a pasta site (python3 -m http.server 8765) e rode node e2e.js http://localhost:8765

Deploy: git push (Cloudflare publica a pasta site/). Ao mudar o app, troque VERSAO em site/sw.js.

- Histórico: as cópias antigas do app (backup-prd, de antes do deploy na Cloudflare) foram removidas na limpeza do item 10; continuam no histórico do git (commit 917cd94 e anteriores).

## Orçamento de tamanho (onde pôr conteúdo novo)

- **Regra:** conteúdo novo (fichas de exercício, guias, dicas, glossário, planos, textos longos) vai em `fonte/dados/*.json`, nunca como tabela dentro de `fonte/app.html`. O build junta tudo em `site/dados.<hash>.js` (JSON comprime ~5× melhor que código). O `app.js` fica só com código.
- **Régua:** `fonte/orcamento-tamanho.json` define o que o usuário baixa (gzip) por arquivo (`app.js`, `app.css`, `dados.js`, `cardapio.js`) e um alarme de tamanho bruto mais folgado. O mesmo arquivo é lido por `fonte/tamanho.mjs` e pela `auditoria-v3`.
- **Aviso rápido:** `sh fonte/build.sh` termina rodando `node tamanho.mjs`: mostra a tabela em segundos, avisa a partir de 90% do limite e falha o build se passar. Também avisa quando uma tabela de conteúdo dentro do `app.html` passa de 12 KB (falha em 25 KB). `NG_TAMANHO_SO_AVISO=1` transforma falhas em avisos (uso local).
- **Se o código passar de ~800 KB brutos:** carregar sob demanda as telas pouco usadas (cadastro, editor de perfil, tutorial), como o cardápio. Mudar um número do orçamento é decisão consciente: registre o motivo no PR.
