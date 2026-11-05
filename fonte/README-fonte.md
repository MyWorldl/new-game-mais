# Fonte do projeto (para regenerar o site)

- candidato-prd.html  → app (PRD v98 + Fases 8 e 9), sem selo DEV.
- aplica-standalone.py → gera ../site/index.html a partir do candidato (ajustes "A1"):
    python3 aplica-standalone.py candidato-prd.html ../site/index.html
- undev.py → transforma um HTML do DEV em candidato PRD: python3 undev.py dev.html prd.html saida.html
- testes/e2e.js → teste ponta a ponta (Playwright). Sirva a pasta site (ex.: python3 -m http.server 8765 dentro de site/) e rode: node e2e.js http://localhost:8765

Deploy: via Git (Cloudflare Pages conectado ao repositório; output = site). Veja ../README.md.
