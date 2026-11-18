#!/usr/bin/env python3
"""Junta fonte/dados/*.json em UM arquivo (.build/dados.json): {"exercicios": <exercicios.json>, "planos": <planos.json>}.
O externaliza.py transforma esse arquivo em site/dados.<hash>.js (window.NG_DADOS = {...}), carregado por <script src> ANTES do app.js
e guardado pelo service worker. Assim o tamanho do app.js não depende de quantos exercícios existem (teste "desempenho": JS < 700 KB).
Uso: gera-dados.py saida.json"""
import json, os, sys
aqui = os.path.dirname(os.path.abspath(__file__))
ler = lambda n: json.load(open(os.path.join(aqui, "dados", n), encoding="utf-8"))
json.dump({"exercicios": ler("exercicios.json"), "planos": ler("planos.json")},
          open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
