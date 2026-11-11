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

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        caminho = self.path.split('?')[0]
        for rx, hs in regras:
            if rx.match(caminho):
                for k, v in hs.items():
                    self.send_header(k, v)
        super().end_headers()
    def log_message(self, *a): pass

http.server.ThreadingHTTPServer(('127.0.0.1', porta), functools.partial(H, directory=raiz)).serve_forever()
