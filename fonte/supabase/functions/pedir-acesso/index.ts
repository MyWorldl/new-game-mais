// NG+ · pedir-acesso — recebe o pedido de acesso de quem ainda não tem conta (verify_jwt = false: é público de propósito).
// Não cria conta (exceto para e-mails de administrador): grava um pedido que o Gabriel aprova em Configurações.
// Proteções: validação rígida, campo-isca (honeypot), limite global por hora, 1 pedido pendente por e-mail e,
// se existir o segredo TURNSTILE_SECRET, conferência do anti-robô no servidor.
import { createClient } from 'npm:@supabase/supabase-js@2'

const SITE = 'https://new-game-mais.sombrasplays.workers.dev'
const PERMITIDAS = [SITE, ...(Deno.env.get('CORS_ORIGENS') || '').split(',').map((s) => s.trim()).filter(Boolean)]
const corsDe = (req: Request) => {
  const o = req.headers.get('Origin') || ''
  const ok = PERMITIDAS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o)
  return { 'Access-Control-Allow-Origin': ok ? o : PERMITIDAS[0], 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
}

function chaveAdmin(): string {
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (legado) return legado
  try { const m = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}'); return m.default || Object.values(m)[0] as string } catch { return '' }
}

const MAX_POR_HORA = 30
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/
const email = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')
const emailOk = (e: string) => e.length <= 254 && EMAIL_RE.test(e)

function idadeDe(nasc: string, hoje = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nasc)) return null
  const [a, m, d] = nasc.split('-').map(Number)
  const dt = new Date(Date.UTC(a, m - 1, d))
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null
  let idade = hoje.getUTCFullYear() - a
  if (hoje.getUTCMonth() + 1 < m || (hoje.getUTCMonth() + 1 === m && hoje.getUTCDate() < d)) idade--
  return idade < 0 ? null : idade
}

Deno.serve(async (req: Request) => {
  const cors = corsDe(req)
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const bruto = await req.text()
  if (bruto.length > 4000) return json({ error: 'corpo_grande' }, 413)
  let c: Record<string, unknown> = {}
  try { c = JSON.parse(bruto) } catch { return json({ error: 'json_invalido' }, 400) }

  if (typeof c.site === 'string' && c.site !== '') return json({ ok: true, estado: 'enviado' })   // campo-isca preenchido: robô; finge sucesso

  const nome = typeof c.nome === 'string' ? c.nome.replace(/\s+/g, ' ').trim() : ''
  const em = email(c.email)
  const nasc = typeof c.nascimento === 'string' ? c.nascimento : ''
  const resp = email(c.email_responsavel)
  if (nome.length < 2 || nome.length > 80 || /[\u0000-\u001f<>]/.test(nome)) return json({ error: 'dados_invalidos', campo: 'nome' }, 400)
  if (!emailOk(em)) return json({ error: 'dados_invalidos', campo: 'email' }, 400)
  const idade = idadeDe(nasc)
  if (idade === null || idade > 120) return json({ error: 'dados_invalidos', campo: 'nascimento' }, 400)
  if (idade < 13) return json({ error: 'idade_minima' }, 400)
  if (c.aceite !== true) return json({ error: 'aceite_obrigatorio' }, 400)
  const menor = idade < 18
  if (menor) {
    if (!emailOk(resp) || resp === em) return json({ error: 'responsavel_obrigatorio' }, 400)
    if (c.aceite_responsavel !== true) return json({ error: 'aceite_responsavel_obrigatorio' }, 400)
  }

  const segredo = Deno.env.get('TURNSTILE_SECRET')
  if (segredo) {
    const token = typeof c.captcha === 'string' ? c.captcha : ''
    if (!token) return json({ error: 'captcha' }, 400)
    try {
      const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: segredo, response: token }) })
      const j = await r.json()
      if (!j.success) return json({ error: 'captcha' }, 400)
    } catch { return json({ error: 'captcha_indisponivel' }, 503) }
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } })

  const { data: jaTem, error: e0 } = await admin.rpc('usuario_existe', { p_email: em })
  if (e0) return json({ error: 'falha_interna' }, 500)
  if (jaTem) return json({ ok: true, estado: 'ja_tem_conta' })

  const { data: ehAdmin } = await admin.from('admins').select('email').eq('email', em).maybeSingle()

  const desde = new Date(Date.now() - 3600_000).toISOString()
  const { count } = await admin.from('pedidos_acesso').select('id', { count: 'exact', head: true }).gte('criado_em', desde)
  if (!ehAdmin && (count ?? 0) >= MAX_POR_HORA) return json({ error: 'muitos_pedidos' }, 429)

  const linha = { nome, email: em, nascimento: nasc, menor, email_responsavel: menor ? resp : null }

  if (ehAdmin) {   // administrador: cria a conta direto (se o e-mail do Supabase ainda não existir)
    const { error: ec } = await admin.auth.admin.createUser({ email: em, email_confirm: true, user_metadata: { nome } })
    if (ec) return json({ error: 'falha_criar_conta' }, 500)
    await admin.from('pedidos_acesso').insert({ ...linha, status: 'aprovado', decidido_em: new Date().toISOString(), decidido_por: 'auto-admin' })
    return json({ ok: true, estado: 'aprovado_auto' })
  }

  const { error: ei } = await admin.from('pedidos_acesso').insert(linha)
  if (ei) {
    if ((ei as { code?: string }).code === '23505') return json({ ok: true, estado: 'ja_pendente' })
    return json({ error: 'falha_gravar' }, 500)
  }
  return json({ ok: true, estado: 'enviado' })
})
