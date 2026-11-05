import sys,re
src=open(sys.argv[1],encoding='utf8').read()
def rep(old,new,count=1):
    global src
    assert src.count(old)==count,(old[:60],src.count(old))
    src=src.replace(old,new)

# 1) carrega o adaptador antes de qualquer script do app
rep('<script>\n(function(){\n"use strict";\ndocument.documentElement.lang = "pt-BR";',
    '<script src="bff-runtime.js"></script>\n<script>\n(function(){\n"use strict";\ndocument.documentElement.lang = "pt-BR";')

# 2) foto: URL vem do adaptador
rep('function fotoSrc(f){ return f.assetId ? ("/_blob/"+f.assetId) : (f.localUrl||""); }',
    'function fotoSrc(f){ return f.assetId ? ((window.bffRuntime && window.bffRuntime.blobUrl(f.assetId)) || ("/_blob/"+f.assetId)) : (f.localUrl||""); }   // A1: fora do Claude, o adaptador devolve a URL local da foto')

# 3) indicador de sincronização: fora do Claude tudo é gravado no aparelho
rep('  if(!state.db) return {k:"local", n};\n  if(navigator.onLine === false) return {k:"offline", n};',
    '  if(!state.db) return {k:"local", n};\n  if(window.bffRuntime) return {k:"saved", n:0};   // A1: gravação local no aparelho, não depende de internet\n  if(navigator.onLine === false) return {k:"offline", n};')
rep('full:"Tudo salvo"+(hora ? " — última gravação às "+hora : "")+"."}',
    'full:"Tudo salvo"+(window.bffRuntime ? " neste aparelho" : "")+(hora ? " — última gravação às "+hora : "")+"."}')

# 4) aviso quando o armazenamento do navegador não está disponível
rep('showToast("Você está no modo local: o que registrar vale só até fechar o app.");',
    'showToast(window.bffRuntime ? "Este navegador bloqueou o armazenamento: o que registrar vale só até fechar o app. Saia do modo anônimo para salvar." : "Você está no modo local: o que registrar vale só até fechar o app.");')

# 5) backup inclui as imagens das fotos (somente fora do Claude)
rep('async function exportarDadosJSON(){\n  const payload = {',
    'async function exportarDadosJSON(){\n  let fotosArquivos = null;   // A1: fora do Claude o backup leva as imagens (reduzidas) junto\n  if(window.bffRuntime){ try{ fotosArquivos = await window.bffRuntime.exportarFotos(Object.values(fotosParaBackup()).map(f=>f.assetId)); }catch(e){ fotosArquivos = null; } }\n  const payload = {')
rep('    fotos: fotosParaBackup(),\n  };\n  const json',
    '    fotos: fotosParaBackup(),\n  };\n  if(fotosArquivos && Object.keys(fotosArquivos).length) payload.fotosArquivos = fotosArquivos;\n  const json')
rep("  const out = {perfil:null, settings:null, rotina:{}, checkins:{}, medicoes:{}, fotos:{}, exportadoEm:null, ignorados:0};",
    "  const out = {perfil:null, settings:null, rotina:{}, checkins:{}, medicoes:{}, fotos:{}, fotosArquivos:{}, exportadoEm:null, ignorados:0};")
rep("  out.total = Object.keys(out.fotos).length +",
    "  if(isObj(b.fotosArquivos)){   // A1: imagens embutidas no backup (só são gravadas fora do Claude)\n    for(const [aid, du] of Object.entries(b.fotosArquivos)){\n      if(/^[0-9a-f]{32}$/.test(aid) && typeof du === \"string\" && /^data:image\\/(jpeg|png|webp);base64,[A-Za-z0-9+\\/=]+$/.test(du)) out.fotosArquivos[aid] = du;\n    }\n  }\n  out.total = Object.keys(out.fotos).length +")
rep("const IMPORT_MAX_BYTES = 5 * 1024 * 1024;",
    "const IMPORT_MAX_BYTES = (window.bffRuntime ? 80 : 5) * 1024 * 1024;   // A1: backup com fotos embutidas é maior")
rep('Arquivo grande demais: o limite é 5 MB."','Arquivo grande demais: o limite é "+Math.round(IMPORT_MAX_BYTES/1048576)+" MB."')
rep("(Object.keys(d.fotos||{}).length ? '<li>Fotos: o backup guarda só a referência — elas reaparecem se este app ainda tiver os arquivos.</li>' : '')+",
    "(Object.keys(d.fotos||{}).length ? (Object.keys(d.fotosArquivos||{}).length ? '<li>Fotos: o backup traz as imagens e elas serão restauradas neste aparelho.</li>' : '<li>Fotos: o backup guarda só a referência — elas reaparecem se este aparelho ainda tiver os arquivos.</li>') : '')+")
rep("  const jobs = [];\n  if(d.perfil){ const fx = corrigirPerfilAltura(d.perfil);",
    "  const jobs = [];\n  if(window.bffRuntime && d.fotosArquivos && Object.keys(d.fotosArquivos).length){ try{ await window.bffRuntime.importarFotos(d.fotosArquivos); }catch(e){} }   // A1: restaura as imagens antes dos registros\n  if(d.perfil){ const fx = corrigirPerfilAltura(d.perfil);")

# 6) texto do card Seus dados
rep('em um arquivo .json — ou restaure um backup feito antes. Importar nunca apaga nada',
    'em um arquivo .json — ou restaure um backup feito antes. Importar nunca apaga nada')
rep('<div class="data-actions">\n        <button class="btn" id="cfg-export-btn"',
    '<div class="hint u-mb10" id="cfg-aviso-local" hidden>Seus dados ficam guardados neste aparelho e neste navegador. Faça um backup de vez em quando (e antes de trocar de celular ou limpar os dados do navegador): o arquivo leva também as fotos.</div>\n      <div class="data-actions">\n        <button class="btn" id="cfg-export-btn"')
rep('document.getElementById("cfg-export-btn").addEventListener("click", exportarDadosJSON);',
    'document.getElementById("cfg-export-btn").addEventListener("click", exportarDadosJSON);\nif(window.bffRuntime){ const av = document.getElementById("cfg-aviso-local"); if(av){ av.hidden = false; const h = av.previousElementSibling; if(h) h.innerHTML = h.innerHTML.replace("a referência das fotos", "as fotos de progresso"); } }   // A1')
rep('<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover">',
    '<meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#0b1220"><link rel="icon" type="image/png" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">')

# 7) Nome do app: NG+ (New Game+). O id técnico "ritmo-de-ferro" do backup NÃO muda (compatibilidade com backups antigos).
rep('<title>Best Friends Forever</title>','<title>NG+ (New Game+)</title>')
rep('<h1>Best Friends Forever</h1>','<h1>NG+</h1>')
rep('<div class="mark">BFF</div>','<div class="mark">NG+</div>')
rep('Bem-vindo(a) ao Best Friends Forever!','Bem-vindo(a) ao NG+!')
rep('"Sequência atual no Ritmo de Ferro"','"Sequência atual no NG+"')
rep("<h1>Ritmo de Ferro — '+r.cfg.rel","<h1>NG+ — '+r.cfg.rel")
rep("Gerado pelo Ritmo de Ferro em","Gerado pelo NG+ em")
rep("não parece um backup do Ritmo de Ferro.","não parece um backup do NG+.")
rep('"ritmo-de-ferro-"+todayISO()+".png"','"ng-mais-"+todayISO()+".png"')
rep('"ritmo-de-ferro-medicoes-"+todayISO()','"ng-mais-medicoes-"+todayISO()')
rep('"ritmo-de-ferro-dados-"+todayISO()','"ng-mais-dados-"+todayISO()')

# 9) % de gordura (Marinha): resultado zero ou negativo é fisicamente impossível (medida errada) -> não mostra número
rep('  return isFinite(pct) ? pct : null;\n}\nfunction classBF',
    '  return (isFinite(pct) && pct > 0) ? pct : null;   // NG+: <= 0% é medida inconsistente; a tela pede para conferir\n}\nfunction classBF')
rep('  const medB = ultimaComBF(p);\n  if(!medB){\n    el.innerHTML = !sexoValido(p.sexo)',
    '  const medB = ultimaComBF(p);\n  const bfForaDoPossivel = !medB && sexoValido(p.sexo) && med.cinturaCm > 0 && med.pescocoCm > 0 && (p.sexo !== "F" || med.quadrilCm > 0);   // NG+\n  if(!medB && bfForaDoPossivel){\n    el.innerHTML = emptyState("ruler","Confira as medidas","Com a cintura e o pescoço informados, a fórmula dá um resultado fora do possível (0% ou menos). Confira se a cintura foi medida na altura do umbigo e o pescoço logo abaixo do pomo de adão.",{go:"medir",label:"Corrigir medição"});\n    return;\n  }\n  if(!medB){\n    el.innerHTML = !sexoValido(p.sexo)')
open(sys.argv[2],'w',encoding='utf8').write(src)
print("ok",len(src))
