#!/usr/bin/env python3
"""Injeta fonte/dados/*.json no app.html no lugar dos marcadores /*@@NOME@@*/<valor padrão>;
Uso: injeta-dados.py entrada.html saida.html
Marcador: /*@@BASE_EXERCICIOS@@*/{"exercicios":[]}  ->  fonte/dados/exercicios.json (minificado)
"""
import json, os, re, sys
aqui = os.path.dirname(os.path.abspath(__file__))
MARCADORES = {"BASE_EXERCICIOS": "exercicios.json", "BASE_PLANOS": "planos.json"}
src = open(sys.argv[1], encoding="utf-8").read()
for nome, arq in MARCADORES.items():
    marca = "/*@@%s@@*/" % nome
    if marca not in src:
        continue
    caminho = os.path.join(aqui, "dados", arq)
    dados = json.load(open(caminho, encoding="utf-8"))
    # </script> dentro de JSON quebraria o HTML; escapa o "<"
    js = json.dumps(dados, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    # troca o marcador e o valor padrão que vem logo depois (um literal {...} ou [...] até o ; da linha)
    src = re.sub(re.escape(marca) + r"[^\n]*?;(?=\n)", lambda m: marca + js + ";", src, count=1)
open(sys.argv[2], "w", encoding="utf-8").write(src)
