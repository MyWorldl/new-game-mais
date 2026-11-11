// NG+ · LGPD — exclusão de conta. Apaga, para o usuário que fez a chamada (e só ele): seus documentos (user_docs),
// suas fotos (bucket fotos-progresso, pasta <uid>/) e, por fim, o próprio usuário de autenticação.
// Deploy: verify_jwt = true. Versão publicada no projeto gjoxrgnkwmjvcfiywtcs (função "delete-account", v1).
import { createClient } from 'npm:@supabase/supabase-js@2'

const BUCKET = 'fotos-progresso'
// CORS restrito ao site do app (e localhost para desenvolvimento). Extras: segredo CORS_ORIGENS (lista separada por vírgula).
const PERMITIDAS = ['https://new-game-mais.sombrasplays.workers.dev', ...(Deno.env.get('CORS_ORIGENS') || '').split(',').map((s) => s.trim()).filter(Boolean)]
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

Deno.serve(async (req: Request) => {
  const cors = corsDe(req)
  const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'sem_token' }, 401)
  let corpo: { confirmar?: string } = {}
  try { corpo = await req.json() } catch { /* corpo vazio */ }
  if (corpo.confirmar !== 'EXCLUIR') return json({ error: 'confirmacao_ausente' }, 400)

  const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', chaveAdmin(), { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: u, error: eu } = await admin.auth.getUser(token)
  if (eu || !u?.user) return json({ error: 'token_invalido' }, 401)
  const uid = u.user.id

  // 1) fotos: lista a pasta do usuário e remove em lotes
  let fotos = 0
  for (let guarda = 0; guarda < 50; guarda++) {
    const { data: lst, error: el } = await admin.storage.from(BUCKET).list(uid, { limit: 100 })
    if (el) return json({ error: 'falha_listar_fotos', detalhe: el.message }, 500)
    if (!lst || !lst.length) break
    const { error: er } = await admin.storage.from(BUCKET).remove(lst.map((o) => `${uid}/${o.name}`))
    if (er) return json({ error: 'falha_remover_fotos', detalhe: er.message }, 500)
    fotos += lst.length
  }

  // 2) documentos
  const { error: ed, count } = await admin.from('user_docs').delete({ count: 'exact' }).eq('user_id', uid)
  if (ed) return json({ error: 'falha_remover_docs', detalhe: ed.message }, 500)

  // 3) o usuário de autenticação
  const { error: edu } = await admin.auth.admin.deleteUser(uid)
  if (edu) return json({ error: 'falha_remover_usuario', detalhe: edu.message, docs: count ?? 0, fotos }, 500)

  return json({ ok: true, docs: count ?? 0, fotos })
})
