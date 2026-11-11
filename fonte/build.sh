#!/bin/sh
# Gera ../site/index.html: candidato PRD + módulos (inclui.py) -> visual v2 -> ajustes standalone/NG+
set -e
cd "$(dirname "$0")"
python3 inclui.py candidato-prd.html /tmp/candidato-montado.html
python3 visual/aplica-visual.py /tmp/candidato-montado.html /tmp/candidato-v2.html
python3 aplica-standalone.py /tmp/candidato-v2.html ../site/index.html
python3 externaliza.py ../site
