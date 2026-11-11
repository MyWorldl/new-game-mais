// @ts-nocheck
// Edge Function "lembretes" — NG+: envia o lembrete de treino por Web Push.
// Duas formas de chamar (verify_jwt = false, a função faz a própria autenticação):
//  1) pg_cron de hora em hora, com o header x-cron-secret (segredo guardado no Vault; validado pela RPC cron_secret_ok).
//     É idempotente: só envia quando a hora local da pessoa bate com a escolhida e ainda não enviou hoje.
//  2) Pessoa logada, pelo botão "Enviar lembrete de teste" (body {"teste":true} + JWT do usuário).
// Qualquer outra chamada recebe 401 ANTES de ler inscrições ou enviar push.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { decidir, chaveTreino } from "./logica.ts";

// CORS restrito ao site do app (e localhost para desenvolvimento). Extras: segredo CORS_ORIGENS (lista separada por vírgula).
const PERMITIDAS = ["https://new-game-mais.sombrasplays.workers.dev", ...(Deno.env.get("CORS_ORIGENS") || "").split(",").map((s) => s.trim()).filter(Boolean)];
const corsDe = (req) => {
  const o = req.headers.get("Origin") || "";
  const ok = PERMITIDAS.includes(o) || /^http:\/\/localhost(:\d+)?$/.test(o);
  return { "Access-Control-Allow-Origin": ok ? o : PERMITIDAS[0], "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
};

Deno.serve(async (req) => {
  const CORS = corsDe(req);
  const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ erro: "método não permitido" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });
  let body = {}; try { body = await req.json(); } catch (_e) {}
  const teste = !!(body && body.teste === true);

  // --- autenticação (antes de qualquer outra coisa) ---
  let uidTeste = null;
  if (teste) {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u || !u.user) return json({ erro: "faça login para enviar o teste" }, 401);
    uidTeste = u.user.id;
  } else {
    const seg = req.headers.get("x-cron-secret") || "";
    const { data: ok } = await admin.rpc("cron_secret_ok", { p: seg });
    if (ok !== true) return json({ erro: "não autorizado" }, 401);
  }

  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ erro: "chaves VAPID não configuradas" }, 503);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "https://new-game-mais.sombrasplays.workers.dev", pub, priv);

  const agora = new Date();
  let subs;
  if (teste) {
    const r = await admin.from("push_subs").select("*").eq("user_id", uidTeste).eq("ativo", true);
    subs = r.data || [];
  } else {
    const r = await admin.from("push_subs").select("*").eq("ativo", true);
    if (r.error) return json({ erro: "falha ao ler inscrições" }, 500);
    subs = r.data || [];
  }

  const res = { total: subs.length, enviados: 0, removidos: 0, falhas: 0, pulados: 0 };
  for (const s of subs) {
    try {
      let payload;
      if (teste) {
        payload = { titulo: "NG+ · teste de lembrete", corpo: "Funcionou! É assim que o lembrete de treino vai aparecer.", url: "./" };
      } else {
        // só consulta os dados da pessoa quando a hora bate (evita leituras à toa)
        const pre = decidir(s, agora, { ativo: true, exercicios: [1] }, null);
        if (pre.motivo === "fora-da-hora" || pre.motivo === "ja-enviado") { res.pulados++; continue; }
        // o treino de hoje pode ter sido remanejado em "Reagendar" (config/settings.reagenda): lê as configurações e as 7 rotinas de uma vez
        const docs = await admin.from("user_docs").select("path,data").eq("user_id", s.user_id)
          .in("path", ["config/settings", "checkins/" + pre.local.iso, ...["seg", "ter", "qua", "qui", "sex", "sab", "dom"].map((k) => "rotina/" + k)]);
        const m = {}; (docs.data || []).forEach((d) => { m[d.path] = d.data; });
        const chave = chaveTreino(m["config/settings"], pre.local.iso, pre.local.dia);
        const dec = decidir(s, agora, m["rotina/" + chave] || null, m["checkins/" + pre.local.iso] || null);
        if (!dec.enviar) {
          if (dec.marcar) await admin.from("push_subs").update({ ultimo_envio: dec.local.iso }).eq("user_id", s.user_id).eq("endpoint", s.endpoint);
          res.pulados++; continue;
        }
        payload = dec.payload;
        // marca antes de enviar: se o cron rodar duas vezes, não duplica
        await admin.from("push_subs").update({ ultimo_envio: dec.local.iso }).eq("user_id", s.user_id).eq("endpoint", s.endpoint);
      }
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: "normal" });
      res.enviados++;
    } catch (e) {
      const code = e && e.statusCode;
      if (code === 404 || code === 410) { await admin.from("push_subs").delete().eq("user_id", s.user_id).eq("endpoint", s.endpoint); res.removidos++; }
      else { res.falhas++; console.error("push falhou", code, String(e && e.message).slice(0, 120)); }
    }
  }
  return json(res);
});
