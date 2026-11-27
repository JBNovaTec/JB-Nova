// Banco de pruebas de Novi: mide cuántas frases de novi/pruebas.json entiende bien.
// Uso (desde la raíz):  node herramientas/probar.js        (muestra solo los errores)
//                       node herramientas/probar.js -v     (muestra todo)
const fs = require("fs"), vm = require("vm"), path = require("path");
const R = p => path.join(__dirname, "..", p);
const ctx = {console};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(R("novi/diccionario.js"), "utf8") + "\n" + fs.readFileSync(R("novi/motor.js"), "utf8") +
  "\nthis.api = {nvNorm, nvIntent, nvFaq, nvPedidoRef, nvResto, nvAprox, nvCargarDatos};", ctx);
const N = ctx.api;

// Datos de ejemplo: preguntas de los paquetes general + ropa-calzado, y productos/clientes inventados
const faq = [], sin = [];
for (const n of ["general", "ropa-calzado"]) {
  const d = JSON.parse(fs.readFileSync(R("novi/paquetes/" + n + ".json"), "utf8"));
  d.preguntas.forEach(q => faq.push({pregunta: q.p, claves: q.k.join(", "), respuesta: q.r, activo: "SI"}));
  Object.entries(d.sinonimos || {}).forEach(([a, b]) => sin.push({palabra: a, equivale: b}));
}
N.nvCargarDatos({faq, sin});
const PRODUCTOS = ["Franela básica", "Franela estampada", "Jean skinny", "Jean mom", "Gorra clásica", "Vestido negro", "Vestido floral", "Sudadera", "Camisa oxford", "Chaqueta jean", "Sandalias", "Colección navidad"];
const CLIENTES = ["Andrea Gómez", "Distribuidora Demo", "Carlos Pérez"];

// Misma ruta de decisión que nvResponder (sin las partes de interfaz)
function clasificar(raw){
  const t = N.nvNorm(raw);
  if (t === "menu") return "menu";
  if (N.nvPedidoRef(raw)) return "pedido";
  let {i, s} = N.nvIntent(t, raw);
  const fq = N.nvFaq(t);
  if (fq.f && fq.s > s) return "faq";
  if (!i && /\b(hoy|ayer|semana|mes)\b/.test(t)) i = "ventas";
  if (!i) {
    const q = N.nvResto(t);
    if (q && (N.nvAprox(q, PRODUCTOS, x => x)[0] || {s:0}).s >= .8) i = "stock";
    else if (q && (N.nvAprox(q, CLIENTES, x => x)[0] || {s:0}).s >= .9) i = "cliente_info";
  }
  return i || "ninguna";
}

const casos = JSON.parse(fs.readFileSync(R("novi/pruebas.json"), "utf8"));
const v = process.argv.includes("-v");
let ok = 0; const malos = {};
for (const [frase, esp] of casos) {
  const got = clasificar(frase);
  if (got === esp) ok++; else (malos[esp] = malos[esp] || []).push(frase + "  →  " + got);
  if (v) console.log((got === esp ? "✓ " : "✗ ") + frase + "  →  " + got + (got === esp ? "" : "  (esperaba " + esp + ")"));
}
if (!v) for (const k in malos) { console.log("\n[" + k + "]"); malos[k].forEach(x => console.log("  ✗ " + x)); }
const pct = (100 * ok / casos.length).toFixed(1);
console.log("\nAciertos: " + ok + "/" + casos.length + " (" + pct + "%)");
process.exit(pct >= 95 ? 0 : 1);
