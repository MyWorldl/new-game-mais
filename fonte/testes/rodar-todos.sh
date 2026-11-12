#!/bin/sh
# Roda a bateria de testes contra o site/ servido COM os cabeçalhos de produção (_headers, inclusive a CSP).
# Pré-requisitos: node 22+, `npm i playwright` (NODE_PATH) e chromium instalado. Uso: sh fonte/testes/rodar-todos.sh
set -u
cd "$(dirname "$0")"
export SP="${SP:-$(mktemp -d)}"
# vários testes usam o axe-core em $SP/axe/node_modules (versão fixada)
[ -f "$SP/axe/node_modules/axe-core/axe.min.js" ] || npm install --prefix "$SP/axe" axe-core@4.10.2 --no-audit --no-fund --silent
python3 servidor-com-headers.py 8791 ../../site & S1=$!
python3 servidor-com-headers.py 8792 ../../site & S2=$!
trap 'kill $S1 $S2 2>/dev/null' EXIT
sleep 1
falhas=0
roda() {   # nome, comando...
  nome="$1"; shift
  saida=$(timeout 280 "$@" 2>&1); rc=$?
  echo "=== $nome (rc=$rc)"; echo "$saida" | tail -2
  if [ $rc -ne 0 ] || echo "$saida" | grep -q '^FAIL'; then falhas=$((falhas+1)); echo "!!! $nome FALHOU"; echo "$saida" | grep '^FAIL' | head -5; fi
}
for t in reagenda scroll-dieta rolagem-render login-turnstile relogin-inatividade como-estou-hoje tutorial lateral-foto-analise semana-casa banner-instalar treino-f1 ranking-series treino-f2 treino-f3 politica instalar fontes acessibilidade-sw atualizacao-sw; do
  roda "$t" node "$t.js"
done
roda cardapio-e2e node cardapio-e2e.js http://localhost:8791
roda cardapio-nos node cardapio-nos.js http://localhost:8791
roda cardapio-sob-demanda node cardapio-sob-demanda.js http://localhost:8791
roda cardapio-sim node cardapio-sim.mjs
roda cardapio-modulo node cardapio-modulo.mjs
roda cardapio-trocas-motor node cardapio-trocas.mjs
roda cardapio-trocas node cardapio-trocas.js http://localhost:8791
roda unit-lembretes node --experimental-strip-types unit-lembretes.mjs
roda unit-treinador node --experimental-strip-types unit-treinador.mjs
echo "------ testes com falha: $falhas"
exit $falhas
