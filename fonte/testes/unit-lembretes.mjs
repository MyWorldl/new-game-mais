import { decidir, parteLocal, chaveTreino } from "../supabase/functions/lembretes/logica.ts";
let ok=0,bad=0; const t=(n,c,x='')=>{(c?ok++:bad++);console.log((c?'PASS ':'FAIL ')+n+(x?'  '+x:''))};
// 2026-11-06 21:30 UTC = 18:30 em São Paulo (sexta)
const agora=new Date("2026-11-06T21:30:00Z");
const rot={nome:"Pernas",ativo:true,exercicios:[{nome:"Agachamento"}]};
const sub={hora:18,tz:"America/Sao_Paulo",ultimo_envio:null};
let p=parteLocal("America/Sao_Paulo",agora); t("parte local SP", p.iso==="2026-11-06"&&p.hora===18&&p.dia==="sex", JSON.stringify(p));
p=parteLocal("Asia/Tokyo",agora); t("parte local Tóquio vira o dia", p.iso==="2026-11-07"&&p.hora===6&&p.dia==="sab", JSON.stringify(p));
p=parteLocal("Invalido/Zona",agora); t("fuso inválido cai em São Paulo", p.hora===18);
let d=decidir(sub,agora,rot,null); t("hora certa + dia de treino → envia", d.enviar&&/sexta — Pernas/.test(d.payload.corpo), d.payload&&d.payload.corpo);
d=decidir({...sub,hora:19},agora,rot,null); t("hora errada → não envia", !d.enviar&&d.motivo==="fora-da-hora");
d=decidir({...sub,ultimo_envio:"2026-11-06"},agora,rot,null); t("já enviado hoje → não envia", !d.enviar&&d.motivo==="ja-enviado");
d=decidir(sub,agora,{nome:"Descanso",ativo:false,exercicios:[]},null); t("dia de descanso → não envia e marca", !d.enviar&&d.motivo==="dia-de-descanso"&&d.marcar);
d=decidir(sub,agora,null,null); t("sem rotina → não envia", !d.enviar);
d=decidir(sub,agora,rot,{concluido:true}); t("já treinou hoje → não envia e marca", !d.enviar&&d.motivo==="ja-treinou"&&d.marcar);
d=decidir(sub,agora,rot,{sets:{0:[{r:8}]},concluido:false}); t("treino pela metade → mensagem de 'falta pouco'", d.enviar&&/pela metade/.test(d.payload.corpo));
d=decidir({...sub,tz:"Asia/Tokyo",hora:6},agora,rot,null); t("respeita o fuso da pessoa", d.enviar);
// Reagendar: o treino de hoje pode ter sido remanejado (config/settings.reagenda.dias)
t("sem settings → dia da semana", chaveTreino(null,"2026-11-06","sex")==="sex" && chaveTreino({},"2026-11-06","sex")==="sex");
t("reagenda de outra data não vale hoje", chaveTreino({reagenda:{dias:{"2026-11-05":"qua"}}},"2026-11-06","sex")==="sex");
t("remanejado para hoje → usa o treino remanejado", chaveTreino({reagenda:{dias:{"2026-11-06":"qua"}}},"2026-11-06","sex")==="qua");
t("chave inválida cai no dia da semana", chaveTreino({reagenda:{dias:{"2026-11-06":"xyz"}}},"2026-11-06","sex")==="sex" && chaveTreino({reagenda:{dias:{"2026-11-06":7}}},"2026-11-06","sex")==="sex");
// sexta é descanso na rotina, mas o treino de quarta (Pernas) foi remanejado para hoje: precisa avisar
const descanso={nome:"Descanso",ativo:false,exercicios:[]};
d=decidir(sub,agora,descanso,null); t("sem remanejamento, sexta de descanso não avisa", !d.enviar&&d.motivo==="dia-de-descanso");
d=decidir(sub,agora,rot,null); t("com remanejamento, aviso usa o treino remanejado (Pernas)", d.enviar&&/Pernas/.test(d.payload.corpo));
console.log(`\n${ok} ok / ${bad} falhas`); process.exit(bad?1:0);
