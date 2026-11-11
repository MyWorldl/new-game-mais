// @ts-nocheck
// Edge Function "treinador" — NG+: resumo de treino escrito por IA (Anthropic), SOMENTE com consentimento explícito.
// Garantias aplicadas no servidor (não dependem do aplicativo): login válido, consentimento gravado na conta,
// maior de 18 anos, limite diário e validação do que é enviado. A chave da Anthropic fica só nos segredos da função.
import { createClient } from "npm:@supabase/supabase-js@2";
import { MAX_POR_DIA, consentimentoOk, idadeOk, sanitizaResumo, SISTEMA, montaMensagem } from "./validacao.ts";

// CORS restrito ao site do app (e localhost para desenvolvimento). Extras: segredo CORS_ORIGENS (lista separada por vírgula).
const PERMITIDAS = ["https://new-game-mais.sombrasplays.workers.dev", ...(Deno.env.get("CORS_ORIGENS") || "").split(",").map((s) => s.trim()).filter(Boolean)];
const corsDe = (req) => {
  const o = req.headers.get("Origin") || "";
  const ok = PERMITIDAS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
  return { "Access-Control-Allow-Origin": ok ? o : PERMITIDAS[0], "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};
// "dia" do limite = dia civil em São Paulo (e não UTC, que virava às 21h)
const diaSP = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const MODELO = Deno.env.get("ANTHROPIC_MODEL") || "claude-haiku-5-5";

Deno.serve(async (req) => {
  const CORS = corsDe(req);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: u } = await admin.auth.getUser(jwt);
  if (!u || !u.user) return json({ erro: "faça login", codigo: "sem-login" }, 401);
  const uid = u.user.id;

  if (!consentimentoOk(u.user.user_metadata)) return json({ erro: "ative o recurso e aceite o uso de IA antes", codigo: "sem-consentimento" }, 403);
  const perfil = await admin.from("user_docs").select("data").eq("user_id", uid).eq("path", "config/perfil").maybeSingle();
  if (!idadeOk(perfil.data && perfil.data.data)) return json({ erro: "disponível apenas para maiores de 18 anos", codigo: "idade" }, 403);

  let body; try { body = await req.json(); } catch (_e) { return json({ erro: "pedido inválido" }, 400); }
  const resumo = sanitizaResumo(body && body.resumo);
  if (!resumo || !resumo.exercicios.length) return json({ erro: "ainda não há treinos suficientes para resumir", codigo: "sem-dados" }, 422);

  const chave = Deno.env.get("ANTHROPIC_API_KEY");   // checada depois das travas de login, consentimento, idade e dados
  if (!chave) return json({ erro: "recurso ainda não configurado", codigo: "sem-chave" }, 503);

  // limite diário: UMA instrução atômica no banco (insere ou soma 1 só se ainda houver cota) — sem corrida entre pedidos paralelos
  const rpc = await admin.rpc("consome_cota_ia", { p_user: uid, p_dia: diaSP(), p_max: MAX_POR_DIA });
  if (rpc.error) { console.error("cota", String(rpc.error.message).slice(0, 100)); return json({ erro: "não foi possível verificar o limite agora", codigo: "ia" }, 500); }
  const n = rpc.data;   // novo total do dia; nulo = limite atingido
  if (n === null || n === undefined) return json({ erro: "limite de " + MAX_POR_DIA + " resumos por dia atingido — volte amanhã", codigo: "limite" }, 429);

  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ctl.signal,
      headers: { "x-api-key": chave, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODELO, max_tokens: 500, system: SISTEMA, messages: [{ role: "user", content: montaMensagem(resumo) }] }),
    });
    if (!r.ok) { console.error("anthropic", r.status); return json({ erro: "o serviço de IA não respondeu agora; tente de novo em instantes", codigo: "ia" }, 502); }
    const j = await r.json();
    const texto = ((j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("\n") || "").trim().slice(0, 2500);
    if (!texto) return json({ erro: "resposta vazia; tente novamente", codigo: "ia" }, 502);
    return json({ texto, restantes: Math.max(0, MAX_POR_DIA - n) });
  } catch (e) {
    console.error("treinador", String(e && e.message).slice(0, 100));
    return json({ erro: "o serviço de IA demorou demais; tente de novo", codigo: "ia" }, 504);
  } finally { clearTimeout(to); }
});
