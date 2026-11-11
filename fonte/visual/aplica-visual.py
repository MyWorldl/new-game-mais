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

# Ficha de personagem: remove o subtítulo "seus dados reais, com metáfora de RPG" (pedido do Gabriel)
rep('\n        <span class="hint">seus dados reais, com metáfora de RPG</span>','')

# ===== Melhorias v3 (referências): conquistas com progresso, próximos marcos, calendário mensal, grade de hábitos, água =====
conq=open(base+'/ng-conquistas.js',encoding='utf8').read()
cal=open(base+'/ng-calendario.js',encoding='utf8').read()
habjs=open(base+'/ng-habitos.js',encoding='utf8').read()

# (1) conquistas: renderAchievements novo (o antigo é renomeado e fica sem uso) + card "Próximos marcos"
rep('function renderAchievements(){\n', conq+'function renderAchievementsLegado(){\n')
rep('<div class="card">\n      <div class="card-head">\n        <h2>Conquistas</h2>',
    '<div class="card" id="marcos-card">\n      <div class="card-head">\n        <h2>Próximos marcos</h2>\n        <span class="hint">o que falta para o próximo passo</span>\n      </div>\n      <ul class="marcos-list" id="marcos-list"></ul>\n    </div>\n    <div class="card">\n      <div class="card-head">\n        <h2>Conquistas</h2>')
rep('perfil: [renderRadar, renderAttrs, renderPerfilSummary, renderAchievements]','perfil: [renderRadar, renderAttrs, renderPerfilSummary, renderMarcos, renderAchievements]')

# (2) calendário mensal na Constância (Treino)
rep('function renderHeatmap(){\n', cal.replace('function renderHeatmap(){\n  if(constanciaModo','function renderHeatmap(){\n  if(constanciaModo')+'function renderHeatmapSemanas(){\n')
rep('<span class="hint">Cada barra é uma semana</span>','<span class="hint" id="constancia-hint">Cada barra é uma semana</span>')
rep('      <div class="seg u-mb12" id="constancia-period">',
    '      <div class="seg u-mb12" id="constancia-modo" role="group" aria-label="Modo de visualização"><button type="button" data-modo="semanas" class="active" aria-pressed="true">Semanas</button><button type="button" data-modo="mes" aria-pressed="false">Mês</button></div>\n      <div id="constancia-semanas">\n      <div class="seg u-mb12" id="constancia-period">')
rep('Sem dado (antes do seu cadastro ou semana ainda não chegou)</div>\n      </div>\n    </div>\n',
    'Sem dado (antes do seu cadastro ou semana ainda não chegou)</div>\n      </div>\n      </div>\n      <div id="constancia-mes" hidden></div>\n    </div>\n')

# (3) hábitos: água opcional (dentro de checkins/<iso>.hab, sem mudar o formato do backup) + grade de 12 semanas
rep('<div class="field-row hab-um">\n          <div class="field-ic-group"><label for="h-cardio">Cárdio leve (min)</label><div class="field-ic-wrap">\n            <input type="number" step="1" min="0" max="600" id="h-cardio" placeholder="30" inputmode="numeric"></div></div>\n        </div>',
    '<div class="field-row hab-num">\n          <div class="field-ic-group"><label for="h-cardio">Cárdio leve (min)</label><div class="field-ic-wrap">\n            <input type="number" step="1" min="0" max="600" id="h-cardio" placeholder="30" inputmode="numeric"></div></div>\n          <div class="field-ic-group"><label for="h-agua">Água (litros)</label><div class="field-ic-wrap">\n            <input type="number" step="0.25" min="0" max="10" id="h-agua" placeholder="2" inputmode="decimal"></div></div>\n        </div>')
rep('Sono, passos e cárdio leve ajudam na recuperação.','Sono, passos e cárdio leve ajudam na recuperação; a água entra só como registro.')
rep('const sono = rd("h-sono"), passos = rd("h-passos"), cardio = rd("h-cardio");','const sono = rd("h-sono"), passos = rd("h-passos"), cardio = rd("h-cardio"), agua = rd("h-agua");')
rep('if(cardio != null && !(cardio >= 0 && cardio <= 600)){ habMsg("Cárdio: informe entre 0 e 600 minutos."); return; }',
    'if(cardio != null && !(cardio >= 0 && cardio <= 600)){ habMsg("Cárdio: informe entre 0 e 600 minutos."); return; }\n  if(agua != null && !(agua >= 0 && agua <= 10)){ habMsg("Água: informe entre 0 e 10 litros."); return; }')
rep('if(cardio != null) hab.cardio = Math.round(cardio);','if(cardio != null) hab.cardio = Math.round(cardio);\n  if(agua != null) hab.agua = Math.round(agua*100)/100;')
rep('set("h-sono", h.sono); set("h-passos", h.passos); set("h-cardio", h.cardio);','set("h-sono", h.sono); set("h-passos", h.passos); set("h-cardio", h.cardio); set("h-agua", h.agua);')
rep('const sono = med("sono"), passos = med("passos");','const sono = med("sono"), passos = med("passos"), agua = med("agua");')
rep("  if(cardioTot > 0) linhas.push(","  if(agua != null) linhas.push('<li><b>Água média: '+String(Math.round(agua*100)/100).replace('.', ',')+' L/dia</b> — só um registro; o app não define meta de água.</li>');\n  if(cardioTot > 0) linhas.push(")
rep("if(x.h.cardio != null) partes.push(x.h.cardio+' min de cárdio');","if(x.h.cardio != null) partes.push(x.h.cardio+' min de cárdio');\n    if(x.h.agua != null) partes.push(String(x.h.agua).replace('.', ',')+' L de água');")
rep('t:"Hábitos · sono, passos e cárdio leve"','t:"Hábitos · sono, passos, água e cárdio leve"')
rep('a intensidade certa é aquela em que você ainda consegue conversar.",','a intensidade certa é aquela em que você ainda consegue conversar. A água é só um registro opcional: o app não define meta.",')
rep('<div id="hab-resumo"></div>','<div id="hab-resumo"></div>\n      <div id="hab-grade"></div>')
rep('function renderHabitos(){\n', habjs+'function renderHabitos(){\n')
rep('renderHabitos, renderEvolucaoChart','renderHabitos, renderGradeHabitos, renderEvolucaoChart')


# ===== Topo e menu lateral (referência Kinora) =====
nav=open(base+'/ng-nav.js',encoding='utf8').read()
IC_SEARCH='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/></svg>'
IC_PANEL='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16"/></svg>'
rep('<div class="brand">\n      <div class="mark">BFF</div>',
    '<div class="brand">\n      <button type="button" class="top-icon nav-toggle" id="nav-toggle" aria-label="Recolher ou expandir o menu lateral" aria-pressed="false">'+IC_PANEL+'</button>\n      <div class="top-title"><span class="top-greet" id="top-greet"></span><strong class="top-sec" id="top-sec">Hoje</strong></div>\n      <div class="mark">BFF</div>')
rep('<button type="button" class="cmdk-chip" id="cmdk-open" aria-haspopup="dialog" aria-label="Abrir paleta de comandos (Ctrl K)">Comandos <kbd>Ctrl K</kbd></button>\n    </div>',
    '<button type="button" class="cmdk-chip" id="cmdk-open" aria-haspopup="dialog" aria-label="Abrir paleta de comandos (Ctrl K)">'+IC_SEARCH+'<span>Buscar ou ir para…</span> <kbd>Ctrl K</kbd></button>\n      <button type="button" class="top-icon top-search" id="top-search" aria-haspopup="dialog" aria-label="Buscar ou ir para (paleta de comandos)">'+IC_SEARCH+'</button>\n      <button type="button" class="top-avatar" id="top-avatar" data-goto="perfil" aria-label="Abrir o perfil"><span id="top-avatar-ini">—</span></button>\n    </div>')
rep('<div class="bottomnav" id="bottomnav">\n    <nav class="tabs"',
    '<div class="bottomnav" id="bottomnav" role="navigation" aria-label="Navegação principal">\n    <div class="side-brand" aria-hidden="true"><div class="mark">BFF</div><div class="side-name"><b>BFF</b><small>New Game+</small></div></div>\n    <nav class="tabs"')
rep('    </nav>\n    <!-- v98 Fase 3: o botão "Mais" saiu;',
    '    </nav>\n    <div class="side-streak" id="side-streak" role="group" aria-label="Sequência atual"></div>\n    <!-- v98 Fase 3: o botão "Mais" saiu;')
rep('function renderNivel(){\n', nav+'function renderNivel(){\n')
rep('renderNivel();            // aparece','renderNivel(); renderNavExtras();            // aparece')
rep('if(mainName === "treino") renderWeekTrail();','navTitulo(name);\n  if(mainName === "treino") renderWeekTrail();')

open(sys.argv[2],'w',encoding='utf8').write(src); print("ok",len(src))
