// @ts-nocheck
// Edge Function "lembretes" — NG+: envia o lembrete de treino por Web Push.
// Chamada de hora em hora pelo pg_cron (sem login; é idempotente: só envia quando a hora local da pessoa bate
// com a hora escolhida e ainda não enviou hoje) e, com login, pelo botão "Enviar lembrete de teste" (body {"teste":true}).
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { decidir } from "./logica.ts";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ erro: "chaves VAPID não configuradas" }, 503);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "https://new-game-mais.sombrasplays.workers.dev", pub, priv);
  const admin = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

  let body = {}; try { body = await req.json(); } catch (_e) {}
  const agora = new Date();
  let subs, teste = false;

  if (body && body.teste === true) {
    const jwt = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: u } = await admin.auth.getUser(jwt);
    if (!u || !u.user) return json({ erro: "faça login para enviar o teste" }, 401);
    teste = true;
    const r = await admin.from("push_subs").select("*").eq("user_id", u.user.id).eq("ativo", true);
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
        const dia = pre.local.dia;
        const docs = await admin.from("user_docs").select("path,data").eq("user_id", s.user_id).in("path", ["rotina/" + dia, "checkins/" + pre.local.iso]);
        const m = {}; (docs.data || []).forEach((d) => { m[d.path] = d.data; });
        const dec = decidir(s, agora, m["rotina/" + dia] || null, m["checkins/" + pre.local.iso] || null);
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
