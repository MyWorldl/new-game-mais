// NG+ · gerir-acesso — só para administradores (tabela public.admins): listar, aprovar e recusar pedidos de acesso.
// Aprovar convida o e-mail pelo Supabase Auth (manda o e-mail de convite); se o e-mail não puder ser enviado,
// cria a conta mesmo assim (a pessoa entra pedindo o código de login). verify_jwt = true.
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

function idadeDe(nasc: string, hoje = new Date()): number {
  const [a, m, d] = nasc.split('-').map(Number)
  let idade = hoje.getUTCFullYear() - a
  if (hoje.getUTCMonth() + 1 < m || (hoje.getUTCMonth() + 1 === m && hoje.getUTCDate() < d)) idade--
  return idade
}

Deno.serve(async (req: Request) => {
  const cors = corsDe(req)
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'sem_token' }, 401)
  let corpo: { acao?: string; id?: string } = {}
  try { corpo = await req.json() } catch { /* corpo vazio */ }

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: u, error: eu } = await admin.auth.getUser(token)
  if (eu || !u?.user?.email) return json({ error: 'token_invalido' }, 401)
  const quem = u.user.email.toLowerCase()
  const { data: ehAdmin } = await admin.from('admins').select('email').eq('email', quem).maybeSingle()
  if (!ehAdmin) return json({ error: 'sem_permissao' }, 403)

  if (corpo.acao === 'listar') {
    const d30 = new Date(Date.now() - 30 * 86400_000).toISOString()
    const d90 = new Date(Date.now() - 90 * 86400_000).toISOString()
    await admin.from('pedidos_acesso').delete().neq('status', 'pendente').lt('decidido_em', d30)    // guarda o mínimo de dados pessoais
    await admin.from('pedidos_acesso').delete().eq('status', 'pendente').lt('criado_em', d90)
    const { data: pend, error: e1 } = await admin.from('pedidos_acesso').select('id,criado_em,nome,email,nascimento,menor,email_responsavel').eq('status', 'pendente').order('criado_em', { ascending: true }).limit(100)
    if (e1) return json({ error: 'falha_listar' }, 500)
    const { data: rec } = await admin.from('pedidos_acesso').select('id,nome,email,status,decidido_em').neq('status', 'pendente').order('decidido_em', { ascending: false }).limit(10)
    return json({ ok: true, pendentes: (pend || []).map((p) => ({ id: p.id, criado_em: p.criado_em, nome: p.nome, email: p.email, idade: idadeDe(p.nascimento), menor: p.menor, email_responsavel: p.email_responsavel })), recentes: rec || [] })
  }

  if ((corpo.acao === 'aprovar' || corpo.acao === 'recusar') && typeof corpo.id === 'string' && /^[0-9a-f-]{36}$/.test(corpo.id)) {
    const { data: p, error: e1 } = await admin.from('pedidos_acesso').select('*').eq('id', corpo.id).eq('status', 'pendente').maybeSingle()
    if (e1) return json({ error: 'falha_ler' }, 500)
    if (!p) return json({ error: 'pedido_nao_encontrado' }, 404)
    const agora = new Date().toISOString()

    if (corpo.acao === 'recusar') {
      const { error } = await admin.from('pedidos_acesso').update({ status: 'recusado', decidido_em: agora, decidido_por: quem }).eq('id', p.id)
      return error ? json({ error: 'falha_gravar' }, 500) : json({ ok: true })
    }

    let emailEnviado = false, jaExistia = false
    const { data: jaTem } = await admin.rpc('usuario_existe', { p_email: p.email })
    if (jaTem) { jaExistia = true } else {
      const meta = { nome: p.nome, menor: p.menor }
      const { error: ei } = await admin.auth.admin.inviteUserByEmail(p.email, { data: meta, redirectTo: SITE + '/' })
      if (!ei) { emailEnviado = true } else {
        const { error: ec } = await admin.auth.admin.createUser({ email: p.email, email_confirm: true, user_metadata: meta })
        if (ec) return json({ error: 'falha_criar_conta', detalhe: ec.message }, 500)
      }
    }
    const { error } = await admin.from('pedidos_acesso').update({ status: 'aprovado', decidido_em: agora, decidido_por: quem }).eq('id', p.id)
    if (error) return json({ error: 'falha_gravar' }, 500)
    return json({ ok: true, email_enviado: emailEnviado, ja_existia: jaExistia })
  }

  return json({ error: 'acao_invalida' }, 400)
})
