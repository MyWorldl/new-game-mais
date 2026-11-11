#!/bin/sh
# Gera ../site/index.html: módulos do cardápio (esbuild) -> candidato PRD + inclusões (inclui.py) -> visual v2 -> ajustes standalone/NG+
set -e
cd "$(dirname "$0")"
# esbuild fixado em ../package.json (versão exata + package-lock.json); instala só se faltar
[ -x ../node_modules/.bin/esbuild ] || (cd .. && npm ci --no-audit --no-fund --ignore-scripts)
mkdir -p .build
# empacota o módulo do cardápio (engine.js + ui.js) em um IIFE que define `var NGCardapio`; sem minificar (o app.js continua legível)
../node_modules/.bin/esbuild cardapio/ui.js --bundle --format=iife --global-name=NGCardapio --target=es2020 --charset=utf8 --log-level=warning --outfile=.build/cardapio.bundle.js
python3 inclui.py candidato-prd.html /tmp/candidato-montado.html
python3 visual/aplica-visual.py /tmp/candidato-montado.html /tmp/candidato-v2.html
python3 aplica-standalone.py /tmp/candidato-v2.html ../site/index.html
python3 externaliza.py ../site
