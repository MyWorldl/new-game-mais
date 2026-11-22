import { atualizar } from "./mapa.99f7e5e180.js";
const L = { peito:[10,22], costas:[10,25], ombros:[8,22], biceps:[8,20], triceps:[6,18], quadriceps:[8,20], posterior:[6,20], gluteos:[0,16], panturrilha:[8,20], abdomen:[0,16] };
const NOMES = { peito:"Peito", costas:"Costas", ombros:"Ombros", biceps:"Bíceps", triceps:"Tríceps", quadriceps:"Quadríceps", posterior:"Posterior de coxa", gluteos:"Glúteos", panturrilha:"Panturrilha", abdomen:"Abdômen" };
const CAT = { peito:"Peito, ombros e tríceps", ombros:"Peito, ombros e tríceps", triceps:"Peito, ombros e tríceps", costas:"Costas e bíceps", biceps:"Costas e bíceps", quadriceps:"Pernas", posterior:"Pernas", gluteos:"Pernas", panturrilha:"Pernas", abdomen:"Core" };
const PLAN = { meio:{peito:12,costas:14,ombros:6,biceps:9,triceps:4,quadriceps:18,posterior:4,gluteos:12,panturrilha:0,abdomen:3}, zero:{peito:12,costas:14,ombros:10,biceps:9,triceps:8,quadriceps:14,posterior:8,gluteos:10,panturrilha:9,abdomen:8}, cheio:{peito:14,costas:16,ombros:12,biceps:10,triceps:9,quadriceps:16,posterior:10,gluteos:12,panturrilha:10,abdomen:9}, foco:{peito:10,costas:12,ombros:8,biceps:8,triceps:6,quadriceps:14,posterior:10,gluteos:18,panturrilha:8,abdomen:6} };
const FEITO = { meio:{peito:12,costas:7,ombros:3,biceps:2,triceps:4,quadriceps:6,posterior:0,gluteos:4,panturrilha:0,abdomen:0}, zero:{}, cheio:null, foco:{gluteos:9,quadriceps:7,posterior:5} };
const $ = (id) => document.getElementById(id);
function dados() {
  const cen = $("d-cen").value, plan = PLAN[cen], feito = FEITO[cen] || plan;
  return { perfil: $("d-perfil").value, musculos: Object.keys(L).map((id) => ({ id, nome: NOMES[id], categoria: CAT[id], planejado: plan[id], feito: feito[id] || 0, mev: L[id][0], mrv: L[id][1], foco: cen === "foco" && id === "gluteos", alvo: 18 })) };
}
function tema() { const r = document.documentElement; r.removeAttribute("data-tema"); if ($("d-tema").value) r.setAttribute("data-tema", $("d-tema").value); r.setAttribute("data-modo", $("d-modo").value); r.setAttribute("data-theme", $("d-modo").value === "claro" ? "light" : "dark"); }
function render() { tema(); atualizar($("host"), dados()); }
["d-perfil", "d-cen", "d-tema", "d-modo"].forEach((id) => $(id).addEventListener("change", render));
render();
