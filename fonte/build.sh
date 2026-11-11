#!/bin/sh
# Gera ../site/: módulo do cardápio (esbuild) -> visual v2 -> ajustes standalone/NG+ -> externaliza (app.<hash>.js/css e cardapio.<hash>.js)
set -e
cd "$(dirname "$0")"
# esbuild fixado em ../package.json (versão exata + package-lock.json); instala só se faltar
[ -x ../node_modules/.bin/esbuild ] || (cd .. && npm ci --no-audit --no-fund --ignore-scripts)
mkdir -p .build
# empacota o cardápio (engine.js + ui.js) em UM módulo ES, carregado sob demanda pelo app com import(); sem minificar (legível, como o app.js)
../node_modules/.bin/esbuild cardapio/ui.js --bundle --format=esm --target=es2020 --charset=utf8 --log-level=warning --outfile=.build/cardapio.js
python3 visual/aplica-visual.py app.html /tmp/app-v2.html
python3 aplica-standalone.py /tmp/app-v2.html ../site/index.html
python3 externaliza.py ../site .build/cardapio.js
