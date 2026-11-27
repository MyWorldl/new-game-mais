#!/usr/bin/env python3
"""Servidor estático de teste que aplica o site/_headers (CSP, cache) como a Cloudflare faz.
Uso: python3 servidor-com-headers.py <porta> <pasta do site>"""
import sys, os, re, http.server, functools

porta = int(sys.argv[1]); raiz = os.path.abspath(sys.argv[2])
regras = []   # (regex do caminho, {cabecalho: valor})
atual = None
for linha in open(os.path.join(raiz, '_headers'), encoding='utf-8'):
    if not linha.strip() or linha.lstrip().startswith('#'):
        continue
    if not linha.startswith((' ', '\t')):
        padrao = linha.strip()
        rx = re.compile('^' + '.*'.join(re.escape(p) for p in padrao.split('*')) + '$')
        atual = {}; regras.append((rx, atual))
    elif ':' in linha and atual is not None:
        k, v = linha.strip().split(':', 1); atual[k.strip()] = v.strip()

# A Cloudflare (html_handling "auto-trailing-slash" em wrangler.jsonc) manda /pagina.html para /pagina com 307 e serve /pagina a partir de pagina.html.
# Imitamos isso só para inicio.html: foi o que escondeu, num teste local, o defeito do service worker (cópia guardada "redirecionada" recusada offline).
# Não aplicado a instalar.html e index.html para não mudar o endereço que outros testes esperam.
REDIRECIONA = {'/inicio.html': '/inicio'}

class H(http.server.SimpleHTTPRequestHandler):
    def _redireciona(self):
        caminho, _, consulta = self.path.partition('?')
        if caminho in REDIRECIONA:
            self.send_response(307); self.send_header('Location', REDIRECIONA[caminho] + ('?' + consulta if consulta else '')); self.send_header('Content-Length', '0'); self.end_headers(); return True
        return False
    def do_GET(self):
        if not self._redireciona(): super().do_GET()
    def do_HEAD(self):
        if not self._redireciona(): super().do_HEAD()
    def translate_path(self, path):
        caminho, _, consulta = path.partition('?')
        if caminho == '/inicio': path = '/inicio.html' + ('?' + consulta if consulta else '')
        return super().translate_path(path)
    def end_headers(self):
        caminho = self.path.split('?')[0]
        for rx, hs in regras:
            if rx.match(caminho):
                for k, v in hs.items():
                    self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(H, directory=raiz)).serve_forever()
