"""Insere o CSS do visual v2 (Fase 1) logo depois do bloco <style> principal. Uso: python3 aplica-visual.py in.html out.html"""
import sys,re
src=open(sys.argv[1],encoding='utf8').read()
css=open(__file__.rsplit('/',1)[0]+'/visual-v2.css',encoding='utf8').read()
marker='</style>\n\n<div class="app">'
assert src.count(marker)==1, src.count(marker)
src=src.replace(marker,'</style>\n<style id="visual-v2">\n'+css+'</style>\n\n<div class="app">')
open(sys.argv[2],'w',encoding='utf8').write(src); print("ok",len(src))
