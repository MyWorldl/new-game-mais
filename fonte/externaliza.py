#!/usr/bin/env python3
"""Etapa final do build: tira o CSS e o JS embutidos do index.html e grava app.<hash>.css / app.<hash>.js.
Assim o CSP pode dispensar 'unsafe-inline' em script-src e style-src (elementos), e o navegador guarda os arquivos
com cache 'immutable' (o nome muda quando o conteúdo muda).
Módulos carregados sob demanda (import()): cada arquivo extra vira <nome>.<hash>.js e o app.js passa a apontar para ele (o texto "./<nome>.js"
entre aspas é trocado pelo nome com hash). Uso: python3 externaliza.py <pasta site> [arquivo-do-modulo.js ...]"""
import sys, re, glob, os, hashlib
site = sys.argv[1]
modulos = sys.argv[2:]   # ex.: .build/cardapio.js
idx = os.path.join(site, 'index.html')
html = open(idx, encoding='utf-8').read()

assert 'app.' not in re.findall(r'<link rel="stylesheet" href="(app\.[^"]+)"', html) or True

# 1) CSS: todos os <style> em ordem -> um arquivo, no lugar do primeiro
estilos = list(re.finditer(r'<style[^>]*>(.*?)</style>', html, re.S))
assert estilos, 'nenhum <style> encontrado'
css = '\n'.join(m.group(1).strip() + '\n' for m in estilos)
h_css = hashlib.sha256(css.encode('utf-8')).hexdigest()[:10]
nome_css = 'app.%s.css' % h_css
# monta de trás para frente para não invalidar posições
partes = []; ultimo = 0
for n, m in enumerate(estilos):
    partes.append(html[ultimo:m.start()])
    if n == 0:
        partes.append('<link rel="stylesheet" href="%s">\n<link rel="stylesheet" id="ng-nuvem-css" href="ng-nuvem.css">' % nome_css)
    ultimo = m.end()
partes.append(html[ultimo:])
html = ''.join(partes)

# 2) JS: <script> sem src -> arquivo
scripts = [m for m in re.finditer(r'<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>', html, re.S)]
assert len(scripts) == 1, 'esperava 1 script embutido, achei %d' % len(scripts)
m = scripts[0]
js = m.group(1).strip('\n') + '\n'
# 2b) módulos sob demanda: grava <nome>.<hash>.js e troca a referência no app.js ANTES de calcular o hash do app.js
nomes_modulos = []
for cam in modulos:
    base = os.path.splitext(os.path.basename(cam))[0]
    cod = open(cam, encoding='utf-8').read()
    nome_mod = '%s.%s.js' % (base, hashlib.sha256(cod.encode('utf-8')).hexdigest()[:10])
    ref = '"./%s.js"' % base
    assert js.count(ref) == 1, 'esperava 1 referência %s no app.js, achei %d' % (ref, js.count(ref))
    js = js.replace(ref, '"./%s"' % nome_mod)
    nomes_modulos.append((base, nome_mod, cod))
h_js = hashlib.sha256(js.encode('utf-8')).hexdigest()[:10]
nome_js = 'app.%s.js' % h_js
html = html[:m.start()] + '<script src="%s"></script>' % nome_js + html[m.end():]

# 3) grava e apaga as versões antigas
manter = {nome_css, nome_js} | {n for _, n, _ in nomes_modulos}
velhos = glob.glob(os.path.join(site, 'app.*.css')) + glob.glob(os.path.join(site, 'app.*.js'))
for base, _, _ in nomes_modulos:
    velhos += glob.glob(os.path.join(site, base + '.*.js'))
for velho in velhos:
    if os.path.basename(velho) in manter:
        continue
    try:
        os.remove(velho)
    except OSError as e:   # ambientes sem permissão de apagar: avisa e segue (apague à mão antes do commit)
        print('AVISO: não consegui apagar', velho, '-', e, file=sys.stderr)
open(os.path.join(site, nome_css), 'w', encoding='utf-8').write(css)
open(os.path.join(site, nome_js), 'w', encoding='utf-8').write(js)
for _, n, cod in nomes_modulos:
    open(os.path.join(site, n), 'w', encoding='utf-8').write(cod)
open(idx, 'w', encoding='utf-8').write(html)

# 4) o service worker passa a guardar os arquivos novos já na instalação (a linha marcada é regravada)
sw = os.path.join(site, 'sw.js')
t = open(sw, encoding='utf-8').read()
lista = [nome_css, nome_js] + [n for _, n, _ in nomes_modulos]
linha = 'const ARQUIVOS_APP = [%s, "./ng-nuvem.css"]; /*build:app*/' % ', '.join('"./%s"' % n for n in lista)
t2, n = re.subn(r'const ARQUIVOS_APP = .*?/\*build:app\*/', linha, t)
assert n == 1, 'marcador /*build:app*/ não encontrado no sw.js'
open(sw, 'w', encoding='utf-8').write(t2)
print('ok', nome_css, len(css), nome_js, len(js), 'index.html', len(html), *['%s %d' % (n, len(c)) for _, n, c in nomes_modulos])
