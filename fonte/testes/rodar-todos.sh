#!/bin/sh
# Roda a bateria de testes contra o site/ servido COM os cabeçalhos de produção (_headers, inclusive a CSP).
# Pré-requisitos: node 22+, `npm i playwright` (NODE_PATH) e chromium instalado. Uso: sh fonte/testes/rodar-todos.sh
# Fatias (CI em paralelo): FATIA=2/4 sh fonte/testes/rodar-todos.sh roda só os testes da fatia 2 (ver fatias.txt).
# Sem FATIA roda tudo. Teste novo: acrescente a linha em fatias.txt (sem ela, roda na fatia 1 e avisa).
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
FATIA="${FATIA:-}"
quer() {   # este teste é da fatia atual?
  [ -z "$FATIA" ] && return 0
  qual="${FATIA%/*}"
  linha=$(grep -E "^[0-9]+ $1\$" fatias.txt | head -1)
  if [ -z "$linha" ]; then
    [ "$qual" = 1 ] && echo "::warning::teste '$1' sem fatia em fatias.txt; rodando na fatia 1" && return 0
    return 1
  fi
  [ "${linha%% *}" = "$qual" ]
}
roda() {   # nome, comando...
  nome="$1"; shift
  quer "$nome" || return 0
  saida=$(timeout "${TEMPO:-280}" "$@" 2>&1); rc=$?
  echo "=== $nome (rc=$rc)"; echo "$saida" | tail -2
  if [ $rc -ne 0 ] || echo "$saida" | grep -q '^FAIL'; then falhas=$((falhas+1)); echo "!!! $nome FALHOU"; echo "$saida" | grep '^FAIL' | head -5; fi
}
for t in base-guias filtro-alternativas planos-situacoes perfil-situacoes regra-dia-treino formato-semana-auto modelos-rotina plano-personalizado habitos-janela missoes-hoje sub-abas topo-mobile cargas-seletor alinhamentos config-grupos reagenda scroll-dieta rolagem-render rolagem-clique perfil-foto-foco login-turnstile login-launcher espera-reenvio pedir-acesso admin-acesso relogin-inatividade como-estou-hoje tutorial lateral-foto-analise semana-casa banner-instalar treino-f1 ranking-series telas-dados paletas nav-acoes hoje-v3 habitos-v3 corpo-v3 perfil-v3 melhorias-n1 melhorias-n2 responsivo-n2 dieta-v3 cardapio-n3 treino-anel treino-f2 treino-f3 politica instalar fontes acessibilidade-sw atualizacao-sw; do
  roda "$t" node "$t.js"
done
TEMPO=900; roda auditoria-v3 node auditoria-v3.js http://localhost:8791; TEMPO=280   # auditoria final do redesign v3 (~7 min)
roda redesign-r2 node redesign-r2.js http://localhost:8791
roda troca-sem-repeticao node troca-sem-repeticao.js http://localhost:8791
roda nivel-avancado node nivel-avancado.js http://localhost:8791
roda ranking-amigos node ranking-amigos.js http://localhost:8791
roda editar-rotina-treino node editar-rotina-treino.js http://localhost:8791
roda unilaterais node unilaterais.js http://localhost:8791
roda analise-categorias node analise-categorias.js http://localhost:8791
roda volume-feito node volume-feito.js http://localhost:8791
roda cardapio-e2e node cardapio-e2e.js http://localhost:8791
roda cardapio-nos node cardapio-nos.js http://localhost:8791
roda cardapio-sob-demanda node cardapio-sob-demanda.js http://localhost:8791
roda cardapio-sim node cardapio-sim.mjs
roda cardapio-modulo node cardapio-modulo.mjs
roda cardapio-trocas-motor node cardapio-trocas.mjs
roda cardapio-meus-motor node cardapio-meus.mjs
roda cardapio-favoritos-motor node cardapio-favoritos.mjs
roda cardapio-grao-motor node cardapio-grao.mjs
roda movimento-toque node movimento-toque.js http://localhost:8791
roda modal-tema node modal-tema.js http://localhost:8791
roda mapa-corporal node mapa-corporal.js http://localhost:8791
roda medicao node medicao.js http://localhost:8791
roda login-rapido node login-rapido.js http://localhost:8791
roda cardapio-meus node cardapio-meus.js http://localhost:8791
roda cardapio-trocas node cardapio-trocas.js http://localhost:8791
roda cardapio-compras node cardapio-compras.js http://localhost:8791
roda cardapio-pdf node cardapio-pdf.js http://localhost:8791
roda unit-lembretes node --experimental-strip-types unit-lembretes.mjs
roda unit-treinador node --experimental-strip-types unit-treinador.mjs
roda backend-pedir-acesso node --experimental-strip-types --import ./backend/registra.mjs backend/pedir-acesso.mjs
roda backend-gerir-acesso node --experimental-strip-types --import ./backend/registra.mjs backend/gerir-acesso.mjs
roda backend-delete-account node --experimental-strip-types --import ./backend/registra.mjs backend/delete-account.mjs
echo "------ testes com falha: $falhas"
exit $falhas
