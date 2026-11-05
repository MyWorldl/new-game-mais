"""Visual v2 (Fases 1-3): CSS + marcação/JS do radar. Uso: python3 aplica-visual.py in.html out.html"""
import sys
base=__file__.rsplit('/',1)[0]
src=open(sys.argv[1],encoding='utf8').read()
def rep(old,new):
    global src
    assert src.count(old)==1,(old[:70],src.count(old))
    src=src.replace(old,new)
css=open(base+'/visual-v2.css',encoding='utf8').read()
rep('</style>\n\n<div class="app">','</style>\n<style id="visual-v2">\n'+css+'</style>\n\n<div class="app">')
# Fase 3 — radar da ficha de personagem
js=open(base+'/radar.js',encoding='utf8').read()
rep('<div class="attrs-grid" id="attrs-grid"></div>','<div class="attrs-radar" id="attrs-radar"></div>\n      <div class="attrs-grid" id="attrs-grid"></div>')
rep('function renderAttrs(){\n', js+'function renderAttrs(){\n')
rep('perfil: [renderAttrs, renderPerfilSummary, renderAchievements]','perfil: [renderRadar, renderAttrs, renderPerfilSummary, renderAchievements]')

# Fase 4 — bolinha do tema padrão acompanha o novo verde-limão (era o azul-ciano antigo)
assert src.count('sw(["#05070d","#141b2e","#22b8cf"])')==2
src=src.replace('sw(["#05070d","#141b2e","#22b8cf"])','sw(["#06080a","#151b1f","#a3e635"])')
# Fase 6 — gráfico/tile de peso usam a série 1 (limão no tema padrão; azul nos demais)
rep('label:"Peso", color:"var(--s-blue)",','label:"Peso", color:"var(--viz-1)",')
rep('statTileV2({eyebrow:"Peso atual", value:num(med.pesoKg,1), unit:"kg", accent:"var(--s-blue)", iconBg:"color-mix(in srgb, var(--s-blue) 18%, transparent)", iconColor:"var(--s-blue)"','statTileV2({eyebrow:"Peso atual", value:num(med.pesoKg,1), unit:"kg", accent:"var(--viz-1)", iconBg:"color-mix(in srgb, var(--viz-1) 18%, transparent)", iconColor:"var(--viz-1)"')
open(sys.argv[2],'w',encoding='utf8').write(src); print("ok",len(src))
