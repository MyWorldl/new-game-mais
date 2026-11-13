import sys,re
src=open(sys.argv[1],encoding='utf8').read()
def rep(old,new,count=1):
    global src
    assert src.count(old)==count,(old[:60],src.count(old))
    src=src.replace(old,new)

# 1) carrega o adaptador antes de qualquer script do app
rep('<script>\n(function(){\n"use strict";\ndocument.documentElement.lang = "pt-BR";',
    '<script src="vendor-supabase.js"></script>\n<script src="ng-nuvem.js"></script>\n<script src="bff-runtime.js"></script>\n<script>\n(function(){\n"use strict";\ndocument.documentElement.lang = "pt-BR";')

# 1b) fontes hospedadas no próprio site (LGPD: nenhum pedido ao Google; funciona offline)
rep('<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Work+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap">',
    '<style id="ng-fontes">\n'
    "@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:500;font-display:swap;src:url(fonts/barlow-condensed-latin-500-normal.woff2) format('woff2');}\n"
    "@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:600;font-display:swap;src:url(fonts/barlow-condensed-latin-600-normal.woff2) format('woff2');}\n"
    "@font-face{font-family:'Barlow Condensed';font-style:normal;font-weight:700;font-display:swap;src:url(fonts/barlow-condensed-latin-700-normal.woff2) format('woff2');}\n"
    "@font-face{font-family:'Work Sans';font-style:normal;font-weight:400 700;font-display:swap;src:url(fonts/work-sans-latin-wght-normal.woff2) format('woff2');}\n"
    "@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:500;font-display:swap;src:url(fonts/ibm-plex-mono-latin-500-normal.woff2) format('woff2');}\n"
    "@font-face{font-family:'IBM Plex Mono';font-style:normal;font-weight:600;font-display:swap;src:url(fonts/ibm-plex-mono-latin-600-normal.woff2) format('woff2');}\n"
    '</style>')

# 2) foto: URL vem do adaptador
rep('function fotoSrc(f){ return f.assetId ? ("/_blob/"+f.assetId) : (f.localUrl||""); }',
    'function fotoSrc(f){ return f.assetId ? ((window.bffRuntime && window.bffRuntime.blobUrl(f.assetId)) || ("/_blob/"+f.assetId)) : (f.localUrl||""); }   // A1: fora do Claude, o adaptador devolve a URL local da foto')

# 3) indicador de sincronização: fora do Claude tudo é gravado no aparelho
rep('  if(!state.db) return {k:"local", n};\n  if(navigator.onLine === false) return {k:"offline", n};',
    '  if(!state.db) return {k:"local", n};\n  if(window.ngNuvem){ const e = window.ngNuvem.estado(); return {k:e.k, n:e.n||0}; }   // B1: estado real da sincronização com a conta\n  if(window.bffRuntime) return {k:"saved", n:0};   // A1: gravação local no aparelho, não depende de internet\n  if(navigator.onLine === false) return {k:"offline", n};')
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
rep('<div class="mark">BFF</div>','<div class="mark">NG+</div>',2)   # topo + menu lateral
rep('<div class="side-name"><b>BFF</b><small>New Game+</small></div>','<div class="side-name"><b>NG+</b><small>New Game+</small></div>')
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

# B1) indicador de sincronização com a conta (novos estados: syncing e erro) + atualização por evento
rep('    loading: {ic:"refresh", txt:"Conectando", full:"Conectando para buscar seus dados…"},',
    '    loading: {ic:"refresh", txt:"Conectando", full:"Conectando para buscar seus dados…"},\n    syncing: {ic:"refresh", txt:"Sincronizando", full:"Sincronizando com a sua conta…"},\n    erro:    {ic:"cloud-off", txt: n===1 ? "1 pendente" : n+" pendentes", full: alt+" ainda não chegaram à nuvem. Estão guardadas neste aparelho e o app tenta de novo sozinho. Toque para tentar agora."},')
rep('  if(flushing || k === "loading") b.dataset.busy = "1"; else delete b.dataset.busy;',
    '  if(flushing || k === "loading" || k === "syncing") b.dataset.busy = "1"; else delete b.dataset.busy;')
rep('.sync-pill[data-state="pending"]{--sync-c:var(--warn);}',
    '.sync-pill[data-state="pending"], .sync-pill[data-state="syncing"]{--sync-c:var(--warn);}\n.sync-pill[data-state="erro"]{--sync-c:var(--crit);}')
rep('    if(k === "pending"){ flushAttempt = 0; scheduleFlush(true); showToast("Tentando salvar agora…"); }',
    '    if(window.ngNuvem && (k === "pending" || k === "erro" || k === "offline")){ window.ngNuvem.sincronizar(); showToast(k === "offline" ? syncTextos(k, n).full : "Tentando sincronizar agora…"); }\n    else if(k === "pending"){ flushAttempt = 0; scheduleFlush(true); showToast("Tentando salvar agora…"); }')
rep('window.addEventListener("offline", updateSyncPill);\n',
    'window.addEventListener("offline", updateSyncPill);\nwindow.addEventListener("ng-sync", ()=>{ try{ updateSyncPill(); }catch(e){} });   // B1\n')
rep('  _carregTimer = setTimeout(()=>{   // v98 F7: passou de 6 s sem resposta — diz o que está acontecendo em vez de mostrar tela "vazia" calada\n    if(!carregando) return;',
    '  const espera = window.ngNuvem ? 25000 : 6000;   // B1: com conta, o 1º acesso baixa os dados da nuvem\n  _carregTimer = setTimeout(function avisoLento(){   // v98 F7: passou de 6 s sem resposta — diz o que está acontecendo em vez de mostrar tela "vazia" calada\n    if(!carregando) return;\n    if(document.querySelector(".ng-login")){ _carregTimer = setTimeout(avisoLento, 3000); return; }   // B1: pessoa ainda está na tela de entrada')
rep('    fimCarregamento();\n  }, 6000);', '    fimCarregamento();\n  }, espera);')
rep('      <div id="analise-treino-body"></div>\n',
    '      <div id="analise-treino-body"></div>\n      <div id="treinador-ia" hidden style="margin-top:18px;padding-top:14px;border-top:1px solid var(--line-strong)">\n        <h3 class="an-h3">Resumo do treinador (IA) <span class="chip neutral">opcional</span></h3>\n        <p class="hint u-mb10" id="trn-info" role="status"></p>\n        <div class="data-actions">\n          <button class="btn" id="trn-btn" type="button"></button>\n          <button class="btn ghost" id="trn-revoga" type="button" hidden>Desativar IA</button>\n        </div>\n        <div id="trn-saida" role="region" aria-label="Resumo do treinador" aria-live="polite" tabindex="-1" hidden style="white-space:pre-wrap;margin-top:12px;padding:12px 14px;border:1px solid var(--line-strong);border-radius:12px;line-height:1.55"></div>\n        <p class="foot-note u-mt4" id="trn-aviso" hidden>Texto gerado por IA a partir dos seus números. Pode errar e não substitui um profissional de educação física ou de saúde.</p>\n      </div>\n')

rep('    <div class="card">\n      <div class="card-head">\n        <h2>Seus dados</h2>',
    '    <div class="card" id="cfg-instalar">\n      <div class="card-head">\n        <h2>Instalar no celular</h2>\n        <span class="hint">abre em tela cheia e funciona sem internet</span>\n      </div>\n      <div class="hint u-mb10" id="cfg-inst-info" role="status"></div>\n      <div class="data-actions">\n        <button class="btn" id="cfg-inst-btn" type="button" aria-expanded="false" aria-controls="cfg-inst-passos"></button>\n        <a class="btn ghost" id="cfg-inst-pagina" href="instalar.html" target="_blank" rel="noopener">Página de instalação (QR)</a>\n      </div>\n      <div class="hint u-mt8" id="cfg-inst-passos" role="region" aria-label="Passo a passo para instalar" hidden></div>\n    </div>\n\n'
    '    <div class="card" id="cfg-lembretes" hidden>\n      <div class="card-head">\n        <h2>Lembretes de treino</h2>\n        <span class="hint">um aviso só nos dias de treino</span>\n      </div>\n      <div class="hint u-mb10" id="lem-info" role="status"></div>\n      <label class="hint" for="lem-hora" style="display:block;margin-bottom:6px">Horário do lembrete</label>\n      <select id="lem-hora" class="carga-chart-select" style="max-width:100%">' + ''.join('<option value="%d">%02d:00</option>' % (h, h) for h in range(5, 23)) + '</select>\n      <div class="data-actions u-mt8">\n        <button class="btn" id="lem-btn" type="button">Ativar lembretes</button>\n        <button class="btn ghost" id="lem-teste" type="button" hidden>Enviar lembrete de teste</button>\n      </div>\n    </div>\n\n'
    '    <div class="card" id="cfg-conta" hidden>\n      <div class="card-head">\n        <h2>Conta e sincronização</h2>\n        <span class="hint">seus dados em todos os aparelhos</span>\n      </div>\n      <div class="hint u-mb10" id="cfg-conta-info" role="status"></div>\n      <div class="conta-grupo">\n        <h3 class="conta-h">Sincronização</h3>\n        <div class="conta-btns">\n          <button class="btn" id="cfg-conta-sync" type="button">Sincronizar agora</button>\n          <button class="btn ghost" id="cfg-conta-politica" type="button">Política de privacidade</button>\n        </div>\n      </div>\n      <div class="conta-grupo">\n        <h3 class="conta-h">Sessão</h3>\n        <label class="hint" for="cfg-relogin" style="display:block;margin-bottom:6px">Pedir e-mail e código de novo</label>\n        <select id="cfg-relogin" class="carga-chart-select" style="max-width:100%"><option value="0">Nunca (continuar conectado)</option><option value="30">Depois de 30 minutos fora do app</option><option value="480">Depois de 8 horas fora do app</option><option value="10080">Depois de 7 dias fora do app</option></select>\n        <div class="hint u-mt4" id="cfg-relogin-info" role="status"></div>\n        <div class="conta-btns u-mt8">\n          <button class="btn" id="cfg-conta-sair" type="button">Sair da conta</button>\n        </div>\n      </div>\n      <div class="conta-grupo conta-perigo">\n        <h3 class="conta-h">Zona de perigo</h3>\n        <p class="hint">Resetar apaga seus registros e fotos, mas <b>mantém a conta</b>. Excluir remove também o login. Nenhuma das duas ações pode ser desfeita.</p>\n        <div class="conta-btns">\n          <button class="btn conta-warn" id="cfg-conta-resetar" type="button">Resetar meus dados</button>\n          <button class="btn conta-crit" id="cfg-conta-excluir" type="button">Excluir minha conta e dados</button>\n        </div>\n      </div>\n    </div>\n\n    <div class="card">\n      <div class="card-head">\n        <h2>Seus dados</h2>')

open(sys.argv[2],'w',encoding='utf8').write(src)
print("ok",len(src))
