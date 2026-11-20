/* PDF da lista de compras — sem biblioteca externa.
   Escreve um PDF 1.4 de verdade (texto vetorial, fontes padrão Helvetica/Helvetica-Bold, acentos do português via WinAnsi),
   então o arquivo abre em qualquer leitor, pode ser compartilhado e não depende da janela de impressão do navegador.
   Função pura: dados entram, bytes saem (testável em Node). */

// larguras da Helvetica (AFM, 1/1000 do corpo) para ASCII 32..126; letras acentuadas usam a largura da letra-base
const W = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,
  1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,
  333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const base = c => c.normalize("NFD").replace(/[̀-ͯ]/g, "");
export function larguraTexto(s, tam, negrito){
  let w = 0;
  for(const ch of String(s)){
    const b = base(ch), code = b.charCodeAt(0);
    w += (code >= 32 && code <= 126) ? W[code - 32] : (ch === "—" ? 1000 : ch === "–" ? 556 : 556);
  }
  return w / 1000 * tam * (negrito ? 1.06 : 1);
}

// texto -> bytes WinAnsi (como string binária) já escapado para dentro de ( … )
const ESPECIAIS = {"≈":"~","—":"\x97","–":"\x96","·":"\xB7","•":"\x95","’":"\x92","‘":"\x91","“":"\x93","”":"\x94","…":"\x85","×":"\xD7","º":"\xBA","ª":"\xAA","→":"->","↑":"^","↓":"v"};
export function codifica(s){
  let out = "";
  for(const ch of String(s).normalize("NFC")){
    const c = ch.charCodeAt(0);
    let o = ESPECIAIS[ch];
    if(o == null) o = (c < 256) ? ch : "?";
    out += o.replace(/[\\()]/g, m => "\\" + m);
  }
  return out;
}

const A4 = {w:595.28, h:841.89}, M = 42;
const num = n => (Math.round(n * 100) / 100).toString();

/* dados = {titulo, subtitulo, grupos:[{rotulo, itens:[{nome, qtd, feito}]}], notas:[texto], rodape, assunto}
   devolve Uint8Array com o PDF */
export function montaPdf(d){
  const paginas = [];
  let ops = [], y = 0, pg = null;
  const tx = (x, yy, s, tam, neg, cor) => ops.push("BT /"+(neg ? "F2" : "F1")+" "+tam+" Tf "+(cor || "0.1 0.12 0.16")+" rg "+num(x)+" "+num(yy)+" Td ("+codifica(s)+") Tj ET");
  const txDir = (xDir, yy, s, tam, neg, cor) => tx(xDir - larguraTexto(s, tam, neg), yy, s, tam, neg, cor);
  const linha = (x1, y1, x2, y2, cor, esp, trac) => ops.push((trac ? "["+trac+"] 0 d " : "")+num(esp || .5)+" w "+(cor || "0.85 G")+" "+num(x1)+" "+num(y1)+" m "+num(x2)+" "+num(y2)+" l S"+(trac ? " [] 0 d" : ""));
  const novaPagina = (primeira) => {
    if(pg) paginas.push(ops.join("\n"));
    ops = []; pg = {primeira};
    if(primeira){
      ops.push("0.043 0.067 0.098 rg 0 "+num(A4.h - 96)+" "+num(A4.w)+" 96 re f");
      ops.push("0.62 0.9 0.14 rg 0 "+num(A4.h - 99)+" "+num(A4.w)+" 3 re f");
      tx(M, A4.h - 46, d.titulo, 21, true, "1 1 1");
      if(d.subtitulo) tx(M, A4.h - 68, d.subtitulo, 10.5, false, "0.72 0.78 0.85");
      y = A4.h - 96 - 30;
    } else y = A4.h - M - 8;
  };
  const rodapeY = M - 8;
  const cabe = (altura) => y - altura >= M + 14;
  novaPagina(true);

  const larguraUtil = A4.w - 2 * M;
  (d.grupos || []).forEach(g => {
    if(!g.itens.length) return;
    const cab = (cont) => {
      if(!cabe(34)) novaPagina(false);
      y -= 6;
      tx(M, y, String(g.rotulo).toUpperCase() + (cont ? "  (continuação)" : ""), 9.5, true, "0.24 0.5 0.06");
      txDir(A4.w - M, y, g.itens.length + (g.itens.length > 1 ? " itens" : " item"), 8.5, false, "0.5 0.54 0.6");
      linha(M, y - 5, A4.w - M, y - 5, "0.62 0.9 0.14 RG", 1.1);
      y -= 20;
    };
    cab(false);
    g.itens.forEach(it => {
      const tam = 10.5, qLarg = larguraTexto(it.qtd, tam, true), nomeMax = larguraUtil - 22 - qLarg - 14;
      // quebra o nome em linhas se não couber ao lado da quantidade
      const palavras = String(it.nome).split(/\s+/), linhas = []; let atual = "";
      palavras.forEach(p => { const t = atual ? atual + " " + p : p; if(larguraTexto(t, tam) <= nomeMax || !atual) atual = t; else { linhas.push(atual); atual = p; } });
      if(atual) linhas.push(atual);
      const altura = 7 + linhas.length * 13.5;
      if(!cabe(altura)){ novaPagina(false); cab(true); }
      const topo = y;
      // caixinha de marcar (preenchida com ✓ se já comprado)
      const bx = M + 2, by = y - 9.5;
      ops.push((it.feito ? "0.24 0.5 0.06 rg " : "1 1 1 rg ")+"0.45 0.5 0.56 RG 0.8 w "+num(bx)+" "+num(by)+" 9.5 9.5 re B");
      if(it.feito) ops.push("1 1 1 RG 1.4 w "+num(bx + 2)+" "+num(by + 4.6)+" m "+num(bx + 4)+" "+num(by + 2.4)+" l "+num(bx + 7.6)+" "+num(by + 7.4)+" l S");
      linhas.forEach((l, i) => tx(M + 22, y - 8.5 - i * 13.5, l, tam, false, it.feito ? "0.5 0.54 0.6" : "0.1 0.12 0.16"));
      txDir(A4.w - M - 2, y - 8.5, it.qtd, tam, true, it.feito ? "0.5 0.54 0.6" : "0.1 0.12 0.16");
      y -= altura;
      linha(M + 22, y + 1.5, A4.w - M, y + 1.5, "0.9 G", .5, "1.5 2");
      y -= 2;
      void topo;
    });
    y -= 6;
  });

  // notas
  const notas = (d.notas || []).filter(Boolean);
  if(notas.length){
    if(!cabe(40)) novaPagina(false);
    y -= 8;
    notas.forEach(n => {
      const tam = 8.8, palavras = String(n).split(/\s+/), linhas = []; let atual = "";
      palavras.forEach(p => { const t = atual ? atual + " " + p : p; if(larguraTexto(t, tam) <= larguraUtil) atual = t; else { linhas.push(atual); atual = p; } });
      if(atual) linhas.push(atual);
      if(!cabe(linhas.length * 11.5 + 6)) novaPagina(false);
      linhas.forEach(l => { tx(M, y - 8, l, tam, false, "0.38 0.42 0.48"); y -= 11.5; });
      y -= 4;
    });
  }
  paginas.push(ops.join("\n"));

  // rodapé com paginação
  const total = paginas.length;
  const conteudos = paginas.map((c, i) => {
    const r = [];
    r.push("0.88 G 0.5 w "+num(M)+" "+num(rodapeY + 14)+" m "+num(A4.w - M)+" "+num(rodapeY + 14)+" l S");
    r.push("BT /F1 8 Tf 0.5 0.54 0.6 rg "+num(M)+" "+num(rodapeY)+" Td ("+codifica(d.rodape || "")+") Tj ET");
    const t = "Página " + (i + 1) + " de " + total;
    r.push("BT /F1 8 Tf 0.5 0.54 0.6 rg "+num(A4.w - M - larguraTexto(t, 8))+" "+num(rodapeY)+" Td ("+codifica(t)+") Tj ET");
    return c + "\n" + r.join("\n");
  });

  // montagem do arquivo
  const objs = [];   // índice 0 = objeto 1
  objs.push("<< /Type /Catalog /Pages 2 0 R >>");
  const kids = conteudos.map((_, i) => (5 + i * 2) + " 0 R").join(" ");
  objs.push("<< /Type /Pages /Kids [" + kids + "] /Count " + total + " >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objs.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  conteudos.forEach((c, i) => {
    objs.push("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 "+num(A4.w)+" "+num(A4.h)+"] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents " + (6 + i * 2) + " 0 R >>");
    objs.push("<< /Length " + c.length + " >>\nstream\n" + c + "\nendstream");
  });
  const info = objs.length + 1;
  objs.push("<< /Title (" + codifica(d.titulo) + ") /Subject (" + codifica(d.assunto || "") + ") /Producer (NG+) /Creator (NG+) >>");
  let arq = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"; const pos = [];
  objs.forEach((o, i) => { pos.push(arq.length); arq += (i + 1) + " 0 obj\n" + o + "\nendobj\n"; });
  const xref = arq.length;
  arq += "xref\n0 " + (objs.length + 1) + "\n0000000000 65535 f \n" + pos.map(p => String(p).padStart(10, "0") + " 00000 n \n").join("");
  arq += "trailer\n<< /Size " + (objs.length + 1) + " /Root 1 0 R /Info " + info + " 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
  const bytes = new Uint8Array(arq.length);
  for(let i = 0; i < arq.length; i++) bytes[i] = arq.charCodeAt(i) & 255;
  return bytes;
}
