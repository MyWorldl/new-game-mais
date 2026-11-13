/* ---- NG+ visual v3 · Fases 8 e 9 · Perfil: moldura do avatar em CSS puro (anel de XP + ornamentos por patente).
        Tudo derivado de computeNivelInfo(); nada novo é salvo. ---- */
function renderMolduras(){
  let info;
  try{ info = computeNivelInfo(); }catch(e){ return; }
  const n = info.tierIndex + 1;
  const pct = info.isMax ? 100 : Math.max(0, Math.min(100, Math.round((info.xpInTier / info.tierNeed) * 100)));
  const aplica = el=>{
    if(!el) return;
    el.dataset.moldura = String(n);
    el.style.setProperty("--mc", "var(--t"+n+")");
    el.style.setProperty("--xp", String(pct));
  };
  const wrap = document.getElementById("perfil-avatar-wrap");
  aplica(wrap);
  if(wrap){
    wrap.setAttribute("aria-label", "Moldura do avatar: patente "+info.tierName+", nível "+n+" de "+NIVEL_TIERS.length+(info.isMax ? ", patente máxima." : ", "+pct+"% do caminho até a próxima patente."));
    const lv = wrap.querySelector(".pa-lv");
    if(lv) lv.textContent = String(n);
  }
  aplica(document.getElementById("top-avatar"));
}
