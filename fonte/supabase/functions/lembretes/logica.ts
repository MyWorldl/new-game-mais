// @ts-nocheck
// Lógica pura do lembrete (testável fora do Supabase): decide se AGORA é a hora de avisar esta inscrição.
const DIAS_EN = { Sun: "dom", Mon: "seg", Tue: "ter", Wed: "qua", Thu: "qui", Fri: "sex", Sat: "sab" };
const NOME_DIA = { dom: "domingo", seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", sab: "sábado" };

export function parteLocal(tz, agora) {
  let f;
  try {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  } catch (_e) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23", weekday: "short" });
  }
  const p = {};
  f.formatToParts(agora).forEach((x) => { p[x.type] = x.value; });
  return { iso: p.year + "-" + p.month + "-" + p.day, hora: Number(p.hour) % 24, dia: DIAS_EN[p.weekday] || "seg" };
}

/** sub: {hora, tz, ultimo_envio}; rotinaDia: doc rotina/<dia> (ou null); checkin: doc checkins/<hoje> (ou null) */
export function decidir(sub, agora, rotinaDia, checkin) {
  const l = parteLocal(sub.tz, agora);
  if (l.hora !== sub.hora) return { enviar: false, motivo: "fora-da-hora", local: l };
  if (sub.ultimo_envio === l.iso) return { enviar: false, motivo: "ja-enviado", local: l };
  const treina = !!(rotinaDia && rotinaDia.ativo !== false && Array.isArray(rotinaDia.exercicios) && rotinaDia.exercicios.length > 0);
  if (!treina) return { enviar: false, motivo: "dia-de-descanso", local: l, marcar: true };
  if (checkin && checkin.concluido) return { enviar: false, motivo: "ja-treinou", local: l, marcar: true };
  const nome = rotinaDia.nome && String(rotinaDia.nome).slice(0, 40);
  const meio = !!(checkin && (checkin.sets || checkin.status || checkin.progresso));
  return {
    enviar: true, motivo: "ok", local: l,
    payload: {
      titulo: "NG+ · hora do treino",
      corpo: meio
        ? "Seu treino de hoje está pela metade. Falta pouco para fechar o dia!"
        : "Hoje é " + NOME_DIA[l.dia] + (nome ? " — " + nome : "") + ". Que tal registrar o treino no NG+?",
      url: "./",
    },
  };
}
