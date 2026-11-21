/* NG+ — Ranking entre os cadastrados (XP/nível, sequência de dias e volume total em kg).
   Analogia: é o placar do grupo da academia. Cada um escreve só o próprio resultado no quadro; ninguém vê peso, medidas, fotos ou hábitos de ninguém.
   Como funciona: o app calcula as 3 métricas no aparelho e chama a função publicar_ranking (Supabase). O SERVIDOR lê o apelido e a idade do próprio perfil
   da pessoa (não confia no que o aparelho diz): menor de 18 anos, ou sem idade informada, nunca entra e a linha é apagada. Todos os adultos entram por padrão;
   quem sai (Configurações ou aba Treino › Ranking) tem a linha apagada e também deixa de ver o quadro. Sem login ou sem internet, o ranking some sem erro. */
const RK_METRICAS = [
  {k:"xp",  rot:"XP / nível", col:"xp",        sec:"sequencia"},
  {k:"seq", rot:"Sequência",  col:"sequencia", sec:"xp"},
  {k:"vol", rot:"Volume (kg)",col:"volume_kg", sec:"xp"}
];
let rkEscadaAberta = false, rkMetrica = "xp", rkCache = null, rkEu = null, rkErro = false, rkCarregando = false, rkTentou = 0, rkUltPub = 0, rkUltHash = "", rkSaidaOk = false;
function rkNuvem(){ const n = window.ngNuvem; return n && n.client ? n : null; }
function rkIdade(){ const n = Number((state.perfil || {}).idade); return isFinite(n) && n > 0 ? Math.floor(n) : null; }
function rkAdulto(){ const i = rkIdade(); return i != null && i >= 18; }
function rkOculto(){ return !!(state.settings && state.settings.rankingOculto); }
/* volume total = carga (kg) × repetições de todas as séries feitas, exercícios de repetição com carga registrada (peso do corpo e tempo não entram) */
function rkVolumeKg(){
  let total = 0;
  Object.keys(state.checkins || {}).forEach(iso=>{
    const c = state.checkins[iso]; if(!c || !c.cargas) return;
    const day = state.rotina[c.dia || treinoKey(iso)], exs = (day && day.exercicios) || [];
    exs.forEach((e, i)=>{
      const x = exDoDia(e, iso, i), peso = Math.min(1000, Number(c.cargas[x.nome]));
      if(!(peso > 0) || faixaDeReps(x.reps).unid !== "reps") return;
      const est = estadoEx(c, i, x);
      if(est.status === "pulado" || !est.n) return;
      total += peso * fatorLados(x.nome) * est.sets.reduce((a, s)=> a + (Number(s.r) || 0), 0);
    });
  });
  return Math.round(total);
}
function rkMeus(){
  const info = computeNivelInfo();
  return {xp:info.xp, nivel:info.tierIndex + 1, sequencia:computeStreak(), volume_kg:rkVolumeKg()};
}
/* posição com empate: quem tem o mesmo valor ocupa a mesma posição (1, 2, 2, 4) */
function rkOrdena(linhas, mk){
  const m = RK_METRICAS.find(x=> x.k === mk) || RK_METRICAS[0];
  const l = (linhas || []).slice().sort((a, b)=> (b[m.col] - a[m.col]) || (b[m.sec] - a[m.sec]) || String(a.apelido).localeCompare(String(b.apelido), "pt-BR"));
  return l.map(r=> Object.assign({}, r, {pos: 1 + l.filter(o=> o[m.col] > r[m.col]).length}));
}
function rkValor(r, mk){
  if(mk === "seq") return r.sequencia + (r.sequencia === 1 ? " dia" : " dias");
  if(mk === "vol") return Number(r.volume_kg).toLocaleString("pt-BR") + " kg";
  return "Nv. " + r.nivel + " · " + Number(r.xp).toLocaleString("pt-BR") + " XP";
}
function rkQuando(em){ const m = Math.round((Date.now() - em) / 60000); return m < 1 ? "agora há pouco" : "há " + m + " min"; }
async function rkSessaoId(){
  if(rkEu) return rkEu;
  const N = rkNuvem(); if(!N) return null;
  try{ const r = await N.client.auth.getSession(); rkEu = r && r.data && r.data.session ? r.data.session.user.id : null; }catch(e){}
  return rkEu;
}
async function rkPublicar(forca){
  const N = rkNuvem(); if(!N || !rkAdulto() || rkOculto() || navigator.onLine === false) return null;
  const d = rkMeus(), h = JSON.stringify(d), agora = Date.now();
  if(!forca && (agora - rkUltPub < 60e3 || (h === rkUltHash && agora - rkUltPub < 6 * 3600e3))) return null;
  try{
    const r = await N.client.rpc("publicar_ranking", {p_xp:d.xp, p_nivel:d.nivel, p_sequencia:d.sequencia, p_volume_kg:d.volume_kg});
    if(r.error) return null;
    rkUltPub = agora; rkUltHash = h; return r.data;
  }catch(e){ return null; }
}
async function rkLer(forca){
  const N = rkNuvem(); if(!N) return null;
  if(!forca && rkCache && Date.now() - rkCache.em < 5 * 60e3) return rkCache.linhas;
  const r = await N.client.from("ranking").select("user_id,apelido,xp,nivel,sequencia,volume_kg,atualizado_em").limit(200);
  if(r.error) throw r.error;
  rkCache = {linhas:r.data || [], em:Date.now()};
  return rkCache.linhas;
}
/* garante a linha apagada de quem saiu ou deixou de ser elegível (uma vez por abertura do app) */
async function rkRetiraSeNecessario(){
  const N = rkNuvem(); if(!N || rkSaidaOk || navigator.onLine === false) return;
  if(rkIdade() == null && !rkOculto()) return;
  if(!rkOculto() && rkAdulto()) return;
  try{ const r = await N.client.rpc("sair_do_ranking"); if(!r.error) rkSaidaOk = true; }catch(e){}
}
async function rkAtualizar(forca){
  if(rkCarregando || !rkNuvem()) return;
  rkCarregando = true; rkTentou = Date.now();
  try{
    await rkRetiraSeNecessario();
    if(rkAdulto() && !rkOculto()){
      await rkPublicar(!!forca);
      await rkSessaoId();
      await rkLer(true);
      rkErro = false;
    }
  }catch(e){ rkErro = true; }
  rkCarregando = false;
  renderRankingHoje(true); renderRankingTreino(true); renderRankingConfig();
}
/* o ranking só existe para quem está na nuvem, é adulto e não saiu; em qualquer outro caso o cartão de Hoje fica escondido */
function rkPrecisaAtualizar(){
  if(!rkNuvem() || rkCarregando) return false;
  if(!rkCache) return Date.now() - rkTentou > 60e3;
  return Date.now() - rkCache.em > 5 * 60e3 && Date.now() - rkTentou > 60e3;
}
function rkPatente(r){ const t = NIVEL_TIERS[Math.max(0, Math.min(NIVEL_TIERS.length, Number(r.nivel) || 1) - 1)]; return t ? t.name : ""; }
function rkMax(linhas, mk){ const m = RK_METRICAS.find(x=> x.k === mk) || RK_METRICAS[0]; return Math.max(1, ...linhas.map(r=> Number(r[m.col]) || 0)); }
function rkPct(r, mk, max){ const m = RK_METRICAS.find(x=> x.k === mk) || RK_METRICAS[0]; return Math.max(2, Math.min(100, Math.round(((Number(r[m.col]) || 0) / max) * 100))); }
/* linha da lista. Com `max`, ganha a barra proporcional ao líder e (em telas largas) as outras duas métricas em colunas. */
function rkLinhaHtml(r, mk, eu, max){
  const voce = eu && r.user_id === eu;
  const medalha = r.pos <= 3 ? '<span class="rk-med rk-med'+r.pos+'" aria-hidden="true">'+r.pos+'</span>' : '<span class="rk-pos" aria-hidden="true">'+r.pos+'º</span>';
  let extra = "", barra = "", pat = "";
  if(max){
    barra = '<span class="rk-barra" aria-hidden="true"><i style="inline-size:'+rkPct(r, mk, max)+'%"></i></span>';
    pat = '<span class="rk-pat" style="--pat:var(--t'+(Math.max(1, Math.min(NIVEL_TIERS.length, Number(r.nivel) || 1)))+')">'+escapeHtml(rkPatente(r))+'</span>';
    extra = '<span class="rk-extra" aria-hidden="true">'+RK_METRICAS.filter(m=> m.k !== mk).map(m=> '<span>'+escapeHtml(rkValor(r, m.k))+'</span>').join("")+'</span>';
  }
  return '<li class="rk-item'+(voce ? ' rk-eu' : '')+(max ? ' rk-comb' : '')+'">'+medalha+
    '<span class="rk-nome"><span class="sr-only">'+r.pos+'º lugar: </span>'+escapeHtml(r.apelido)+(voce ? ' <small>(você)</small>' : '')+'</span>'+pat+extra+
    '<b class="rk-val">'+escapeHtml(rkValor(r, mk))+'</b>'+barra+'</li>';
}
/* pódio em degraus: 2º, 1º, 3º. O 1º é o mais alto. */
function rkPodioHtml(l, mk, eu){
  const topo = l.slice(0, 3); if(!topo.length) return "";
  const ordem = topo.length >= 3 ? [topo[1], topo[0], topo[2]] : topo.length === 2 ? [topo[1], topo[0]] : [topo[0]];
  return '<ol class="rk-podio" aria-label="Pódio">'+ordem.map(r=>{
    const voce = eu && r.user_id === eu;
    return '<li class="rk-pd rk-pd'+Math.min(r.pos, 3)+(voce ? ' rk-eu' : '')+'">'+
      '<span class="rk-pd-nome"><span class="sr-only">'+r.pos+'º lugar: </span>'+escapeHtml(r.apelido)+(voce ? ' <small>(você)</small>' : '')+'</span>'+
      '<b class="rk-pd-val">'+escapeHtml(rkValor(r, mk))+'</b>'+
      '<span class="rk-pd-deg" aria-hidden="true">'+r.pos+'</span></li>';
  }).join("")+'</ol>';
}
function rkResumoHtml(l, meu){
  const cel = (rot, val, extra)=> '<div class="rk-res-c"><span class="rk-res-r">'+rot+'</span><b class="rk-res-v">'+val+'</b>'+(extra ? '<small>'+extra+'</small>' : '')+'</div>';
  return '<div class="rk-resumo">'+
    cel("Participantes", String(l.length), l.length === 1 ? "pessoa no quadro" : "pessoas no quadro")+
    cel("Sua posição", meu ? meu.pos+"º" : "—", meu ? "de "+l.length : "ainda sem números")+
    cel("Sua patente", meu ? escapeHtml(rkPatente(meu)) : "—", meu ? "nível "+meu.nivel+" de "+NIVEL_TIERS.length : "")+
  '</div>';
}
/* escada das 10 patentes: quantas pessoas estão em cada uma e onde você está */
function rkEscadaHtml(l, meu){
  const por = {}; l.forEach(r=>{ const n = Math.max(1, Math.min(NIVEL_TIERS.length, Number(r.nivel) || 1)); por[n] = (por[n] || 0) + 1; });
  const meuN = meu ? Math.max(1, Math.min(NIVEL_TIERS.length, Number(meu.nivel) || 1)) : 0;
  const linhas = NIVEL_TIERS.map((t, i)=>({n:i + 1, nome:t.name})).reverse().map(t=>{
    const q = por[t.n] || 0, eh = t.n === meuN;
    return '<li class="rk-es'+(eh ? ' rk-es-eu' : '')+(q ? '' : ' vazio')+'" style="--pat:var(--t'+t.n+')">'+
      '<span class="rk-es-n" aria-hidden="true">'+t.n+'</span><span class="rk-es-nome">'+escapeHtml(t.nome)+'</span>'+
      '<span class="rk-es-q">'+(q ? q+(q === 1 ? " pessoa" : " pessoas") : "ninguém ainda")+'</span>'+
      (eh ? '<span class="rk-es-voce">você está aqui</span>' : '')+'</li>';
  }).join("");
  return '<details class="rk-escada"'+(rkEscadaAberta ? ' open' : '')+'><summary>Escada de patentes</summary><ol class="rk-es-lista">'+linhas+'</ol></details>';
}
function renderRankingHoje(semBusca){
  const box = document.getElementById("hoje-ranking"); if(!box) return;
  const ok = rkNuvem() && rkAdulto() && !rkOculto() && rkCache && rkCache.linhas.length;
  if(!semBusca && rkPrecisaAtualizar() && rkAdulto() && !rkOculto()) rkAtualizar(false);
  if(!ok){ box.hidden = true; return; }
  const l = rkOrdena(rkCache.linhas, "xp"), eu = rkEu;
  const topo = l.slice(0, 3), meu = l.find(r=> r.user_id === eu);
  box.hidden = false;
  document.getElementById("rk-h-sub").textContent = l.length + (l.length === 1 ? " pessoa" : " pessoas") + " · por XP";
  document.getElementById("rk-h-lista").innerHTML = topo.map(r=> rkLinhaHtml(r, "xp", eu)).join("");
  document.getElementById("rk-h-voce").innerHTML = meu && meu.pos > 3
    ? '<span class="rk-voce-txt">Você está em <b>'+meu.pos+'º</b> de '+l.length+'.</span>' : (meu ? '<span class="rk-voce-txt">Você está no pódio. Continue assim.</span>' : "");
}
function renderRankingTreino(semBusca){
  const box = document.getElementById("rk-t-corpo"); if(!box) return;
  const N = rkNuvem(), idade = rkIdade();
  const sub = document.getElementById("rk-t-sub");
  const msg = (txt, extra)=>{ box.innerHTML = '<p class="hint rk-aviso">'+txt+'</p>'+(extra || ""); if(sub) sub.textContent = ""; };
  if(!N){ msg("O ranking aparece quando você está com a conta conectada e com internet."); return; }
  if(idade == null){ msg("Para participar do ranking, informe sua idade no Perfil. Ele é só para maiores de 18 anos."); return; }
  if(idade < 18){ msg("O ranking é só para maiores de 18 anos. Seus dados não aparecem para ninguém."); return; }
  if(rkOculto()){
    msg("Você está fora do ranking: seu apelido e seus números não aparecem para ninguém, e você também não vê o quadro.",
      '<button type="button" class="btn primary" id="rk-voltar">Voltar a aparecer no ranking</button>');
    const b = document.getElementById("rk-voltar"); if(b) b.addEventListener("click", ()=> rkDefineVisivel(true));
    return;
  }
  if(!semBusca && rkPrecisaAtualizar()) rkAtualizar(false);
  if(!rkCache){
    msg(rkErro ? "Não consegui carregar o ranking agora." : "Carregando o ranking…", rkErro ? '<button type="button" class="btn small ghost" id="rk-retry">Tentar de novo</button>' : "");
    const r = document.getElementById("rk-retry"); if(r) r.addEventListener("click", ()=> rkAtualizar(true));
    return;
  }
  const l = rkOrdena(rkCache.linhas, rkMetrica), eu = rkEu;
  if(sub) sub.textContent = l.length + (l.length === 1 ? " pessoa" : " pessoas");
  const meu = l.find(r=> r.user_id === eu), max = rkMax(l, rkMetrica);
  box.innerHTML =
    rkResumoHtml(l, meu)+
    '<div class="seg rk-seg" id="rk-seg" role="group" aria-label="Ordenar por">'+
      RK_METRICAS.map(m=> '<button type="button" data-rk="'+m.k+'" aria-pressed="'+(m.k === rkMetrica)+'" class="'+(m.k === rkMetrica ? "active" : "")+'">'+m.rot+'</button>').join("")+
    '</div>'+
    rkPodioHtml(l, rkMetrica, eu)+
    '<ol class="rk-lista" id="rk-t-lista" aria-label="Todos os participantes">'+l.map(r=> rkLinhaHtml(r, rkMetrica, eu, max)).join("")+'</ol>'+
    rkEscadaHtml(l, meu)+
    '<p class="hint rk-pe">'+(meu ? 'Você está em '+meu.pos+'º lugar. ' : 'Seus números ainda não chegaram ao quadro; abra a aba Hoje com internet. ')+
    'Atualizado '+rkQuando(rkCache.em)+'. <button type="button" class="link-btn" id="rk-atualizar">Atualizar agora</button></p>';
  box.querySelectorAll("[data-rk]").forEach(b=> b.addEventListener("click", ()=>{ rkMetrica = b.dataset.rk; renderRankingTreino(true); }));
  const esc = box.querySelector(".rk-escada"); if(esc) esc.addEventListener("toggle", ()=>{ rkEscadaAberta = esc.open; });
  const a = document.getElementById("rk-atualizar"); if(a) a.addEventListener("click", ()=> rkAtualizar(true));
}
function renderRankingConfig(){
  const chk = document.getElementById("cfg-ranking"), nota = document.getElementById("cfg-ranking-nota"); if(!chk) return;
  const idade = rkIdade(), adulto = idade != null && idade >= 18;
  chk.disabled = !adulto;
  chk.checked = adulto && !rkOculto();
  if(nota) nota.textContent = idade == null ? "Informe sua idade no Perfil para participar. O ranking é só para maiores de 18 anos."
    : !adulto ? "O ranking é só para maiores de 18 anos. Seus dados não aparecem para ninguém."
    : rkOculto() ? "Você está fora do ranking: ninguém vê seus números e você não vê o quadro." : "Seu apelido, XP/nível, sequência e volume total aparecem para os outros cadastrados.";
}
async function rkDefineVisivel(visivel){
  state.settings = Object.assign({}, state.settings, {rankingOculto: !visivel});
  saveDoc("config/settings", state.settings);
  rkCache = null; rkSaidaOk = false; rkErro = false;
  renderRankingConfig(); renderRankingTreino(true); renderRankingHoje(true);
  if(visivel){ await rkAtualizar(true); }
  else{
    const N = rkNuvem();
    if(N){ try{ const r = await N.client.rpc("sair_do_ranking"); if(!r.error) rkSaidaOk = true; }catch(e){} }
    renderRankingTreino(true);
  }
}
(function ligaRanking(){
  const chk = document.getElementById("cfg-ranking");
  if(chk) chk.addEventListener("change", ()=> rkDefineVisivel(chk.checked));
  const ver = document.getElementById("rk-h-ver");
  if(ver) ver.addEventListener("click", ()=> withTransition(()=> setSub("treino", "ranking"), {nav:true, dir:null}));
  document.addEventListener("visibilitychange", ()=>{ if(document.visibilityState === "visible" && rkNuvem() && rkAdulto() && !rkOculto()) rkAtualizar(false); });
})();
window.ngRanking = {atualizar: rkAtualizar, meus: rkMeus, volumeKg: rkVolumeKg, ordena: rkOrdena, definirVisivel: rkDefineVisivel};
