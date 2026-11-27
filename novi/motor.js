/* ============ NOVI · MOTOR DE REGLAS ============
   Funciones puras: limpiar texto, detectar intención, sacar períodos, montos, pedidos, productos y clientes.
   No usan IA ni internet. Se prueban solas con herramientas/probar.js */
const NV_NUM = ["cero","uno","dos","tres","cuatro","cinco","seis","siete","ocho","nueve","diez"];
let NV_SIN = Object.assign({}, NV_SIN0);           // se completa con la hoja Novi_Sinonimos del negocio
let NV_FAQ = [];                                     // filas de la hoja Novi_Faq: {pregunta, claves, respuesta}
function nvCargarDatos(d){
  NV_SIN = Object.assign({}, NV_SIN0);
  ((d && d.sin) || []).forEach(s => { const a = nvLimpio(s.palabra), b = nvLimpio(s.equivale); if (a && b) NV_SIN[a] = b; });
  NV_FAQ = ((d && d.faq) || []).filter(f => f.respuesta && String(f.activo || "SI").toUpperCase() !== "NO")
    .map(f => ({p:f.pregunta || "", r:f.respuesta, k:String(f.claves || "").split(/[,;\n]+/).map(nvNorm).filter(Boolean)}));
}
const nvLimpio = s => String(s == null ? "" : s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ\s]/g, " ").replace(/ñ/g, "n").replace(/\s+/g, " ").trim();
function nvNorm(s){
  let t = String(s == null ? "" : s).toLowerCase().replace(/\$/g, " dolar ").replace(/€/g, " euro ");
  t = nvLimpio(t).replace(/\bun par\b/g, "2").replace(/\b(uno|una)\b/g, "1");
  t = t.split(" ").map(w => { const i = NV_NUM.indexOf(w); return i > 1 ? String(i) : (NV_SIN[w] || w); }).join(" ");
  return t.replace(/\s+/g, " ").trim();
}
const nvHas = (t, ph) => (" " + t + " ").indexOf(" " + ph + " ") > -1;
function nvLev(a, b){
  if (Math.abs(a.length - b.length) > 2) return 9;
  const v = Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) { let p = v[0]; v[0] = i;
    for (let j = 1; j <= b.length; j++) { const x = v[j]; v[j] = Math.min(v[j] + 1, v[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = x; } }
  return v[b.length];
}
/* Puntaje de una lista de frases: suma las palabras de cada frase encontrada; las palabras sueltas largas aceptan 1 error de tipeo */
let NV_EXACTAS = null;   // palabras sueltas que ya son frase de alguna intención: no se corrigen como error de tipeo
function nvPuntaje(t, frases){
  if (!NV_EXACTAS) { NV_EXACTAS = new Set(); NV_INT.forEach(([, l]) => l.forEach(ph => { if (ph.indexOf(" ") < 0) NV_EXACTAS.add(ph); })); }
  const ws = t.split(" ").filter(w => !NV_EXACTAS.has(w));
  return frases.reduce((a, ph) => {
    if (nvHas(t, ph)) return a + ph.split(" ").length;
    if (ph.length >= 5 && ph.indexOf(" ") < 0 && ws.some(w => w.length >= 5 && w[0] === ph[0] && nvLev(w, ph) <= 1)) return a + 1;
    return a;
  }, 0);
}
function nvIntent(t, raw){
  const monto = nvMonto(raw || t);
  let best = null, sc = 0;
  NV_INT.forEach(([k, l]) => {
    if (k === "convertir" && !monto) return;          // "cuánto es" solo convierte si hay un monto con moneda
    const n = nvPuntaje(t, l) + (k === "convertir" ? 2 : 0);
    if (n > sc) { sc = n; best = k; }
  });
  return {i:best, s:sc};
}
function nvFaq(t){
  let best = null, sc = 0;
  NV_FAQ.forEach(f => { const n = nvPuntaje(t, f.k); if (n > sc) { sc = n; best = f; } });
  return {f:best, s:sc};
}
/* Montos con moneda: "$20", "20 dolares", "500 bs", "1.250,50 bs" */
function nvNumero(s){
  s = String(s);
  if (s.indexOf(".") > -1 && s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") > -1) s = s.replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = parseFloat(s); return isNaN(n) ? null : n;
}
function nvMonto(raw){
  const t = String(raw || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const mon = "(\\$|usd|dolar(?:es)?|verdes|divisas?|bs\\.?|bss|bolivar(?:es)?|bolos|ves|euros?|€)";
  let m = new RegExp("(\\d[\\d.,]*)\\s*" + mon).exec(t) || null, num, cur;
  if (m) { num = m[1]; cur = m[2]; }
  else { m = new RegExp(mon + "\\s*(\\d[\\d.,]*)").exec(t); if (m) { cur = m[1]; num = m[2]; } }
  if (!m) return null;
  const n = nvNumero(num.replace(/[.,]$/, "")); if (n === null) return null;
  const c = /bs|bol|ves/.test(cur) ? "bs" : /eur|€/.test(cur) ? "eur" : "usd";
  return {n, c};
}
/* Número de pedido: "pedido 1003", "PED-1003", "nota 12" */
function nvPedidoRef(raw){
  const t = String(raw || "").toLowerCase();
  let m = /\bped[-\s#]*(\d{3,6})\b/.exec(t) || /\b(?:pedido|orden)\s*(?:n(?:ro|umero|°|º)?\.?\s*|#\s*)?(\d{3,6})\b/.exec(t);
  if (m) return {tipo:"ped", n:m[1]};
  m = /\bnota\s*(?:de entrega\s*)?(?:n(?:ro|umero|°|º)?\.?\s*|#\s*)?(\d{1,6})\b/.exec(t);
  return m ? {tipo:"nota", n:m[1]} : null;
}
/* Quita del texto las frases de intención para quedarse con lo que se busca (producto o cliente) */
function nvResto(t){
  let r = " " + t + " ";
  NV_INT.forEach(([, l]) => l.slice().sort((a, b) => b.length - a.length).forEach(ph => { r = r.split(" " + ph + " ").join(" "); }));
  r = r.replace(/\b(esta semana|semana pasada|semana anterior|este mes|mes pasado|mes anterior|ultimos 7 dias|7 dias|todo el tiempo|historico|siempre|hoy|ayer|semana|mes|dia)\b/g, " ");
  return r.split(" ").filter(w => (w.length > 1 || /\d/.test(w)) && !NV_STOP.has(w)).join(" ").trim();
}
/* Búsqueda aproximada en una lista: cada elemento trae el texto donde buscar */
function nvAprox(q, lista, texto){
  const toks = nvNorm(q).split(" ").filter(w => (w.length > 1 || /\d/.test(w)) && !NV_STOP.has(w));
  if (!toks.length) return [];
  const qj = toks.join("");
  return lista.map(x => {
    const nm = nvNorm(texto(x)), ws = nm.split(" "), nj = nm.replace(/ /g, "");
    let s = toks.reduce((a, w) => a + Math.max(0, ...ws.map(y => y === w ? 1 : (/\d/.test(w) ? 0 : (w.length >= 3 && y.indexOf(w) === 0) ? .9 : (w.length >= 4 && nvLev(w, y) <= 1) ? .8 : (w.length >= 6 && nvLev(w, y) <= 2) ? .6 : 0))), 0) / toks.length;
    if (qj.length >= 4 && nj.indexOf(qj) > -1) s = Math.max(s, 1);
    return {x, s};
  }).filter(r => r.s >= .6).sort((a, b) => b.s - a.s);
}
