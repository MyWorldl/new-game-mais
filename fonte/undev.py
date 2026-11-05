#!/usr/bin/env python3
"""Gera o candidato 'PRD' (sem nada de DEV) a partir do DEV publicado + estado original do PRD."""
import re, sys
dev = open(sys.argv[1], encoding='utf-8').read()
prd = open(sys.argv[2], encoding='utf-8').read()
out = dev

def sub1(old, new):
    global out
    assert out.count(old) == 1, ("marcador não único/ausente", old[:70], out.count(old))
    out = out.replace(old, new, 1)

# 1) título
sub1('<title>[DEV] Best Friends Forever</title>', '<title>Best Friends Forever</title>')
# 2) selo DEV (CSS + subtítulo)
m = re.search(r'\n\.dev-badge\{[^\n]*\}\n', out); assert m
out = out[:m.start()] + '\n' + out[m.end():]
sub1('<div class="sub"><span class="dev-badge">DEV</span> dados de teste · ~1 ano · nada é salvo</div>', '<div class="sub">Treino, corpo e dieta em um só lugar</div>')
# 3) Config: remove cartão "Testar o cadastro" e a página de design system (card + style + script)
a = out.index('<div class="card" id="dev-cadastro">')
b = out.index('</script>', out.index('window.__dsRender=render;')) + len('</script>')
b2 = out.index('<div class="card">', b)   # próximo cartão (Conta)
out = out[:a] + '    ' + out[b2:]
# 4) seed DEV e estado inicial
a = out.index('/* ============================================================\n   ESTADO — AMBIENTE DEV.')
b = out.index('const DEV_SEED = seedDevData();') + len('const DEV_SEED = seedDevData();')
out = out[:a].rstrip('\n') + '\n' + out[b:].lstrip('\n')
dev_state = re.search(r'  perfil: DEV_SEED\.perfil,.*?settings: DEV_SEED\.settings,[^\n]*\n', out, re.S); assert dev_state
prd_state = re.search(r'  perfil: null,[^\n]*\n  rotina: defaultRotina\(\),.*?settings: \{accentSkin: null[^\n]*\n', prd, re.S); assert prd_state
out = out[:dev_state.start()] + prd_state.group(0) + out[dev_state.end():]
# 5) initStore
sub1('    db = null;   // DEV: nunca conecta ao banco (protege os dados de produção)', '    db = await window.claude?.use?.("db");')
sub1('showToast("Ambiente DEV: dados de teste. Alterações valem só até recarregar a página.");', 'showToast("Você está no modo local: o que registrar vale só até fechar o app.");')
# 6) botão de cadastro de teste
a = out.index('(function devCadastro(){')
b = out.index('})();', a) + len('})();')
out = out[:a] + out[b:].lstrip('\n')
assert 'DEV_SEED' not in out and 'dev-badge' not in out and 'btn-dev-cadastro' not in out and 'ds-page' not in out
open(sys.argv[3], 'w', encoding='utf-8').write(out)
print('ok', len(out))
