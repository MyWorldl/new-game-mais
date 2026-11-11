#!/usr/bin/env python3
"""Passo 0 do build: monta o candidato a partir das fontes separadas.

Uso: python3 inclui.py entrada.html saida.html

Procura linhas que contenham só um marcador `/*@inclui caminho/arquivo.js*/` (caminho relativo a fonte/)
e troca cada uma pelo conteúdo do arquivo. Cada arquivo é a ÚNICA fonte do seu trecho: não existe
cópia embutida em candidato-prd.html. Falha (assert) se um arquivo faltar, ficar vazio, ou se algum
marcador sobrar sem ser resolvido.
"""
import os, re, sys

ent, sai = sys.argv[1], sys.argv[2]
base = os.path.dirname(os.path.abspath(__file__))
src = open(ent, encoding="utf-8").read()
MARC = re.compile(r"^[ \t]*/\*@inclui ([A-Za-z0-9_./-]+)\*/[ \t]*$", re.M)

usados = []
def troca(m):
    rel = m.group(1)
    assert ".." not in rel.split("/"), "caminho fora de fonte/: " + rel
    cam = os.path.join(base, rel)
    assert os.path.isfile(cam), "arquivo de inclusão não existe: " + rel
    txt = open(cam, encoding="utf-8").read()
    assert txt.strip(), "arquivo de inclusão vazio: " + rel
    assert "/*@inclui" not in txt, "inclusão aninhada não é suportada: " + rel
    usados.append(rel)
    return txt.rstrip("\n")

out = MARC.sub(troca, src)
assert "/*@inclui" not in out, "marcador @inclui mal formado (precisa estar sozinho na linha)"
open(sai, "w", encoding="utf-8").write(out)
print("inclui.py:", len(usados), "arquivo(s) incluído(s):", ", ".join(usados) or "nenhum")
