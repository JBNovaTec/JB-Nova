/* ============ NOVI · RESPUESTAS E INTERFAZ DEL PANEL ============
   Usa los datos que el panel ya tiene cargados (P productos, O pedidos, E gastos, K cierres, CL agenda, C config)
   y las mismas fórmulas del panel. Las únicas acciones que cambian datos piden confirmación (por ahora: la tasa). */
const NOVI_SVG = () => '<svg viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="nvH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f8ff7"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient></defs>' +
  '<path d="M60 3c1.6 7.4 3.2 9 10.6 10.6C63.2 15.2 61.6 16.8 60 24.2 58.4 16.8 56.8 15.2 49.4 13.6 56.8 12 58.4 10.4 60 3z" fill="#7cb3ff"/>' +
  '<rect x="57.5" y="22" width="5" height="14" rx="2.5" fill="#3b82f6"/>' +
  '<rect x="11" y="58" width="14" height="30" rx="6" fill="#2563eb"/><rect x="95" y="58" width="14" height="30" rx="6" fill="#2563eb"/>' +
  '<rect x="20" y="34" width="80" height="72" rx="32" fill="url(#nvH)"/>' +
  '<ellipse cx="44" cy="46" rx="16" ry="6" fill="#fff" opacity=".16"/>' +
  '<rect x="31" y="52" width="58" height="38" rx="18" fill="#0b1633"/>' +
  '<ellipse class="nv-eye" cx="48" cy="67" rx="6" ry="7.5" fill="#7dd3fc"/><ellipse class="nv-eye" cx="72" cy="67" rx="6" ry="7.5" fill="#7dd3fc"/>' +
  '<path d="M52 78q8 6.5 16 0" stroke="#7dd3fc" stroke-width="3.6" fill="none" stroke-linecap="round"/></svg>';

const NV_INACTIVO = 5 * 60 * 1000;   // 5 minutos sin escribir: se borra la conversación
const NV = {open:false, started:false, wait:null, last:null, pend:null, act:0, bcvPedida:false, voz:null};

/* ---------- Ayudantes ---------- */
function nvPeriodo(t, def){
  const h = hoyKey(), dd = n => addDias(h, n);
  let k = def;
  if (/\bayer\b/.test(t)) k = "ayer";
  else if (/\bsemana (pasada|anterior)\b/.test(t)) k = "semanaP";
  else if (/\bsemana\b|\b7 dias\b|\bsemanal\b/.test(t)) k = "semana";
  else if (/\bmes (pasado|anterior)\b/.test(t)) k = "mesP";
  else if (/\bmes\b|\bmensual\b|\bcomo (voy|vamos)\b/.test(t)) k = "mes";
  else if (/\b(siempre|historico|todo el tiempo|todos los tiempos)\b/.test(t)) k = "todo";
  else if (/\bhoy\b|\bdia\b/.test(t)) k = "hoy";
  const m1 = h.slice(0, 8) + "01", mp1 = addMes(m1, -1), mpp1 = addMes(m1, -2);
  const T = {
    hoy:     {a:h, b:h, pa:dd(-1), pb:dd(-1), lbl:"Hoy", vs:"ayer"},
    ayer:    {a:dd(-1), b:dd(-1), pa:dd(-2), pb:dd(-2), lbl:"Ayer", vs:"anteayer"},
    semana:  {a:dd(-6), b:h, pa:dd(-13), pb:dd(-7), lbl:"Últimos 7 días", vs:"los 7 días anteriores"},
    semanaP: {a:dd(-13), b:dd(-7), pa:dd(-20), pb:dd(-14), lbl:"La semana pasada", vs:"la semana anterior"},
    mes:     {a:m1, b:h, pa:mp1, pb:addMes(h, -1), lbl:"Este mes", vs:"el mes pasado a la misma fecha"},
    mesP:    {a:mp1, b:addDias(m1, -1), pa:mpp1, pb:addDias(mp1, -1), lbl:"El mes pasado", vs:"el mes anterior"},
    todo:    {a:"0000-00-00", b:h, pa:"0000-00-00", pb:"0000-00-00", lbl:"Desde el inicio", vs:""}
  };
  return Object.assign({k}, T[k]);
}
const nvIn = (v, a, b) => { const k = dkey(v); return k >= a && k <= b; };
const nvBs = n => '<span class="mu">' + bs(n) + '</span>';
const nvPct = (a, b) => { if (!b) return a ? '<span class="up">nuevo</span>' : '<span class="mu">igual</span>'; const p = Math.round((a - b) / b * 100); return p === 0 ? '<span class="mu">igual</span>' : '<span class="' + (p > 0 ? "up" : "dn") + '">' + (p > 0 ? "▲ " : "▼ ") + Math.abs(p) + '%</span>'; };
const nvLn = (a, b) => '<div class="ln"><span>' + a + '</span><b>' + b + '</b></div>';
const nvDias = k => { const d = Math.round((Date.parse(hoyKey() + "T12:00:00") - Date.parse(dkey(k) + "T12:00:00")) / 864e5); return d <= 0 ? "hoy" : d === 1 ? "ayer" : "hace " + d + " días"; };
const nvNumBs = n => Number(n || 0).toLocaleString("es-VE", {minimumFractionDigits:2, maximumFractionDigits:2});
const nvVivo = o => o.estado !== "Cancelado";
/* Rellena {negocio}, {whatsapp}, {pagos}… con los datos de Ajustes */
function nvPlantilla(s){
  const v = {negocio:C.negocio, legal:C.legal || C.negocio, rif:C.rif, correo:C.correo, whatsapp:C.whatsapp, instagram:C.instagram, tiktok:C.tiktok, ciudad:C.ciudad, lema:C.lema,
    pagos:(C.pagos || []).join(", "), entregas:(C.entregas || []).join(", "), tasa:nvNumBs(C.tasa), min_mayor:C.min_mayor || 5};
  return String(s || "").replace(/\{(\w+)\}/g, (m, k) => v[k] !== undefined && v[k] !== "" ? String(v[k]) : "—");
}
const NV_DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
const nvHora = () => new Date().toLocaleTimeString("es-VE", {timeZone:"America/Caracas", hour:"numeric", minute:"2-digit", hour12:true});
const nvFechaLarga = () => new Date().toLocaleDateString("es-VE", {timeZone:"America/Caracas", weekday:"long", day:"numeric", month:"long", year:"numeric"});
function nvProductos(q){ const r = nvAprox(q, P, p => pname(p) + " " + (p.marca || "")); if (!r.length) return []; const top = r[0].s; return r.filter(x => x.s >= top - .15).map(x => x.x); }
/* Clientes: la agenda más los nombres que aparecen en los pedidos */
function nvClientes(){
  const m = {};
  O.forEach(o => { const k = cliKey(o); if (!m[k]) m[k] = {k, nombre:o.cliente, telefono:o.telefono || "", direccion:o.direccion || "", notas:""}; });
  (CL || []).forEach(c => { const k = telK(c.telefono).length >= 7 ? telK(c.telefono) : String(c.nombre || "").trim().toLowerCase(); m[k] = Object.assign(m[k] || {k}, {nombre:c.nombre, telefono:c.telefono || (m[k] || {}).telefono || "", direccion:c.direccion || (m[k] || {}).direccion || "", notas:c.notas || ""}); });
  return Object.values(m);
}
function nvCliente(q){ const r = nvAprox(q, nvClientes(), c => c.nombre); if (!r.length) return []; const top = r[0].s; return r.filter(x => x.s >= top - .1).map(x => x.x); }

/* ---------- Tasa BCV: Novi avisa y el dueño confirma ---------- */
function nvTasaPendiente(){
  const v = Number(C.tasa_bcv) || 0, f = String(C.tasa_bcv_fecha || "");
  if (!(v > 0) || !f || f > hoyKey() || Math.abs(v - Number(C.tasa)) < 0.005) return 0;
  try { if (localStorage.getItem("nv_tasa_no") === v + "|" + f) return 0; } catch(e){}
  return v;
}
function nvAvisoTasa(){
  const v = nvTasaPendiente(); if (!v) return "";
  NV.pend = {tipo:"tasa", v, f:C.tasa_bcv_fecha};
  return '<br><br>💱 La tasa BCV vigente es <b>' + nvNumBs(v) + ' Bs/$</b> (desde ' + fdate(C.tasa_bcv_fecha) + ') y tu sistema tiene <b>' + nvNumBs(C.tasa) + '</b>. ¿La actualizo?';
}
const NV_CH_TASA = ["Sí, actualizar la tasa","Dejar la tasa así"];
async function nvPedirBcv(forzar){
  if (NV.bcvPedida && !forzar) return null;
  NV.bcvPedida = true;
  try { const j = await api("tasa_bcv"); apply(j); return j; } catch(e){ return null; }
}

/* ---------- Respuestas por intención ---------- */
const NV_MENU = ["Ventas de hoy","Cierre de caja","Lo más vendido","Stock bajo","Lista de compra","Quién me debe","Cuotas vencidas","Pedidos pendientes","Tasa del dólar","Mejores clientes","Mejor día de venta","Buscar un pedido","Datos de un cliente","Valor del inventario","Ganancia del mes"];
const NV_R = {
  menu: () => ({h:"Puedo ayudarte con esto. Toca un botón o escríbeme, por ejemplo <i>“cuánto vendí esta semana”</i>, <i>“stock de harina”</i>, <i>“cuánto son $20 en bolívares”</i> o <i>“teléfono de María”</i>." + (NV.voz ? "<br>También puedes hablarme con el 🎤." : ""), c:NV_MENU}),
  saludo: () => NV_R.inicio(),
  quien_eres: () => ({h:"Soy <b>Novi</b>, el asistente de tu panel, creado por JB NOVA. No soy una inteligencia artificial: respondo con reglas y con los datos reales de tu negocio, así que nunca invento un número. Si algo no lo entiendo, te muestro lo que sí sé hacer.", c:NV_MENU.slice(0, 6)}),
  gracias: () => ({h:"¡Con gusto! Aquí estoy si necesitas algo más. 💙", c:["Ventas de hoy","Stock bajo","Quién me debe"]}),
  despedida: () => ({h:"¡Hasta luego! Cuando me necesites, toca el robot. 👋", c:[]}),
  inicio: () => {
    const hoy = hoyKey(), vh = r2(O.flatMap(cobros).filter(c => dkey(c.f) === hoy).reduce((a, c) => a + c.m, 0));
    const pend = O.filter(o => o.estado === "Pendiente").length, low = P.filter(p => p.activo && p.stock <= p.minimo).length;
    const venc = MOD("credito") ? O.filter(o => o.credito && o.estado === "Crédito").filter(o => { const c = cuotasDe(o).find(x => !x.ok); return c && c.f && c.f <= hoy; }).length : 0;
    const al = [];
    if (pend) al.push("<b>" + pend + "</b> " + (pend === 1 ? "pedido pendiente" : "pedidos pendientes"));
    if (low) al.push("<b>" + low + "</b> " + (low === 1 ? "producto con stock bajo" : "productos con stock bajo"));
    if (venc) al.push("<b>" + venc + "</b> " + (venc === 1 ? "cuota vencida o que vence hoy" : "cuotas vencidas o que vencen hoy"));
    const at = nvAvisoTasa();
    return {h:"¡Hola! Soy <b>Novi</b>, tu asistente de " + esc(C.negocio) + ".<br>Hoy llevas <b>" + usd(vh) + "</b> cobrados." + (al.length ? "<br>Ojo: tienes " + al.join(", ") + "." : " Todo está en orden.") + at + (at ? "" : "<br>¿Qué quieres saber?"), c:at ? NV_CH_TASA.concat(NV_MENU) : NV_MENU};
  },
  hora: () => ({h:"Son las <b>" + nvHora() + "</b> (hora de Venezuela).", c:["Qué día es hoy","Ventas de hoy"]}),
  fecha: () => ({h:"Hoy es <b>" + nvFechaLarga() + "</b>.", c:["Qué hora es","Ventas de hoy"]}),
  tasa: () => {
    const v = Number(C.tasa_bcv) || 0, eu = Number(C.tasa_bcv_eur) || 0, pend = nvTasaPendiente();
    let h = "Tasa de tu sistema: <b>" + nvNumBs(C.tasa) + " Bs por dólar</b>.<br><span class=\"mu\">Es la que usan la tienda y las notas para los precios en Bs.</span>";
    if (v) h += "<br><br>BCV: <b>" + nvNumBs(v) + " Bs/$</b>" + (eu ? " · euro " + nvNumBs(eu) + " Bs" : "") + '<br><span class="mu">Vigente desde ' + fdate(C.tasa_bcv_fecha) + (String(C.tasa_bcv_fecha) > hoyKey() ? " (publicada para el próximo día hábil)" : "") + ". Fuente no oficial: bcv.today.</span>";
    else h += "<br><br><span class=\"mu\">Todavía no tengo la tasa BCV consultada.</span>";
    if (pend) { NV.pend = {tipo:"tasa", v:pend, f:C.tasa_bcv_fecha}; h += "<br><br>¿Actualizo la tasa del sistema a <b>" + nvNumBs(pend) + "</b>?"; return {h, c:NV_CH_TASA.concat(["Cuánto son $20 en Bs"])}; }
    return {h, c:["Consultar BCV ahora","Cuánto son $20 en Bs","Cuánto son 1000 Bs en dólares"]};
  },
  convertir: (t, raw) => {
    const m = nvMonto(raw) || nvMonto(t), tasa = Number(C.tasa) || 0;
    if (!m) { NV.wait = "convertir"; return {h:"¿Qué monto convierto? Escríbelo con su moneda, por ejemplo <i>$20</i> o <i>500 Bs</i>.", c:["Cuánto son $20 en Bs","Cuánto son 1000 Bs en dólares","Cancelar"]}; }
    if (!(tasa > 0)) return {h:"No tengo una tasa cargada en el sistema. Ponla en Ajustes.", c:["Tasa del dólar"]};
    const pie = '<br><span class="mu">A la tasa de tu sistema: ' + nvNumBs(tasa) + ' Bs/$.</span>';
    if (m.c === "usd") return {h:usd(m.n) + " son <div class=\"big\">Bs. " + nvNumBs(m.n * tasa) + "</div>" + pie, c:["Tasa del dólar","Cuánto son 1000 Bs en dólares"]};
    if (m.c === "bs") return {h:"Bs. " + nvNumBs(m.n) + " son <div class=\"big\">" + usd(m.n / tasa) + "</div>" + pie, c:["Tasa del dólar","Cuánto son $20 en Bs"]};
    const eu = Number(C.tasa_bcv_eur) || 0;
    if (!eu) return {h:"No tengo la tasa del euro todavía.", c:["Consultar BCV ahora"]};
    return {h:"€" + nvNumBs(m.n) + " son <div class=\"big\">Bs. " + nvNumBs(m.n * eu) + "</div>(" + usd(m.n * eu / tasa) + ' a tu tasa)<br><span class="mu">Euro BCV: ' + nvNumBs(eu) + ' Bs.</span>', c:["Tasa del dólar"]};
  },
  ventas: (t, raw) => {
    const pe = nvPeriodo(t, "hoy"), q = nvResto(t), pr = q ? nvProductos(q) : [];
    if (pr.length) return NV_R.ventasProducto(pe, pr);
    const cb = O.flatMap(cobros), act = cb.filter(c => nvIn(c.f, pe.a, pe.b)), ant = cb.filter(c => nvIn(c.f, pe.pa, pe.pb));
    const tot = r2(act.reduce((a, c) => a + c.m, 0)), tant = r2(ant.reduce((a, c) => a + c.m, 0)), by = {};
    act.forEach(c => by[c.pago || "Otro"] = r2((by[c.pago || "Otro"] || 0) + c.m));
    const n = act.length, tk = n ? r2(tot / n) : 0;
    let h = pe.lbl + ' cobraste<div class="big">' + usd(tot) + '</div>' + nvBs(tot) + '<br>' + n + (n === 1 ? " cobro" : " cobros") + (n ? " · ticket promedio " + usd(tk) : "") + (pe.vs ? '<br>' + nvPct(tot, tant) + ' <span class="mu">vs ' + pe.vs + ' (' + usd(tant) + ')</span>' : "");
    if (n) h += '<br><br><b>Por forma de pago</b>' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => nvLn(esc(k), usd(v))).join("");
    const ch = pe.k === "hoy" ? ["Cierre de caja","Ventas de ayer","Esta semana","Este mes"] : pe.k === "mes" ? ["Ganancia del mes","Lo más vendido del mes","Mes pasado"] : ["Ventas de hoy","Este mes","Lo más vendido"];
    return {h, c:ch};
  },
  ventasProducto: (pe, pr) => {
    const ids = pr.slice(0, 6).map(p => p.id), m = {};
    O.filter(o => nvVivo(o) && nvIn(o.fecha, pe.a, pe.b)).forEach(o => o.items.filter(i => ids.indexOf(i.id) > -1).forEach(i => { const x = m[i.id] || (m[i.id] = {q:0, v:0, n:0}); x.q += i.q; x.v = r2(x.v + i.p * i.q); x.n++; }));
    const l = pr.slice(0, 6).map(p => ({p, x:m[p.id] || {q:0, v:0, n:0}}));
    if (l.length === 1) { const {p, x} = l[0]; return {h:pe.lbl + " de <b>" + esc(pname(p)) + "</b> vendiste<div class=\"big\">" + x.q + " uds.</div>" + usd(x.v) + " en " + x.n + (x.n === 1 ? " pedido" : " pedidos") + '<br><span class="mu">Te quedan ' + p.stock + ' uds.</span>', c:["Stock de " + pname(p), pe.k === "mes" ? "Ventas de hoy" : "Este mes"]}; }
    return {h:pe.lbl + ", ventas por producto:" + l.map(({p, x}) => nvLn(esc(pname(p)), x.q + " uds. · " + usd(x.v))).join(""), c:["Lo más vendido","Este mes"]};
  },
  pagos: (t, raw) => NV_R.ventas(t.replace(/\b(pago movil|zelle|efectivo|transferencia)\b/g, " "), raw),
  ganancia: t => {
    const pe = nvPeriodo(t, "mes"), act = O.flatMap(cobros).filter(c => nvIn(c.f, pe.a, pe.b));
    const vt = r2(act.reduce((a, c) => a + c.m, 0)), co = r2(act.reduce((a, c) => a + (c.o.total ? c.m / c.o.total * costoDe(c.o) : 0), 0));
    const ga = r2(E.filter(e => nvIn(e.fecha, pe.a, pe.b)).reduce((a, e) => a + e.monto, 0)), net = r2(vt - co - ga);
    return {h:pe.lbl + ':' + nvLn("Cobrado", usd(vt)) + nvLn("− Costo de lo vendido", usd(co)) + nvLn("− Gastos", usd(ga)) + '<div class="ln"><span><b>= Ganancia neta</b></span><b class="' + (net < 0 ? "dn" : "up") + '">' + usd(net) + '</b></div><span class="mu">Misma cuenta que el Resumen del panel.</span>', c:["Gastos del mes","Lo más vendido del mes","Ventas de hoy"]};
  },
  gastos: t => {
    const pe = nvPeriodo(t, "mes"), l = E.filter(e => nvIn(e.fecha, pe.a, pe.b)), by = {};
    l.forEach(e => by[e.categoria || "Otros"] = r2((by[e.categoria || "Otros"] || 0) + e.monto));
    const tot = r2(l.reduce((a, e) => a + e.monto, 0));
    if (!l.length) return {h:pe.lbl + " no hay gastos registrados.", c:["Ganancia del mes","Ventas de hoy"]};
    return {h:pe.lbl + ' gastaste <div class="big">' + usd(tot) + '</div>' + nvBs(tot) + '<br><br><b>Por categoría</b>' + Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k, v]) => nvLn(esc(k), usd(v))).join(""), c:["Ganancia del mes","Ir a Gastos"]};
  },
  caja: () => {
    const d = hoyKey(), {dp, cash, gef, gt, sales} = cajaCalc(d), ex = K.find(k => k.fecha === d), fondo = ex ? (+ex.fondo || 0) : fondoSug(d), esp = r2(fondo + cash - gef);
    let h = '<b>Caja de hoy</b>' + nvLn("Ventas cobradas (" + dp.length + ")", usd(sales)) + nvLn("Gastos del día", usd(gt)) + nvLn("Fondo inicial" + (ex ? "" : " (sugerido)"), usd(fondo)) + nvLn("+ Cobros en efectivo", usd(cash)) + nvLn("− Gastos en efectivo", usd(gef)) + '<div class="ln"><span><b>Efectivo que debería haber</b></span><b>' + usd(esp) + '</b></div>';
    h += ex ? '<br>Ya hiciste el cierre: contaste ' + usd(ex.efectivo_contado) + ', diferencia <b class="' + (ex.diferencia < 0 ? "dn" : "up") + '">' + usd(ex.diferencia) + '</b>.' : '<br><span class="mu">Todavía no guardaste el cierre de hoy.</span>';
    return {h, c:["Ir a Caja","Ventas de hoy","Por forma de pago"]};
  },
  top: t => {
    const pe = nvPeriodo(t, "mes"), m = {}, menos = /\bmenos\b/.test(t);
    O.filter(o => nvVivo(o) && nvIn(o.fecha, pe.a, pe.b)).forEach(o => o.items.forEach(i => { const x = m[i.n] || (m[i.n] = {q:0, v:0}); x.q += i.q; x.v = r2(x.v + i.p * i.q); }));
    if (menos) {
      const sin = P.filter(p => p.activo && !m[pname(p)]).slice(0, 10);
      const l = Object.entries(m).sort((a, b) => a[1].q - b[1].q).slice(0, 10);
      return {h:'<b>Lo que menos se vendió · ' + pe.lbl.toLowerCase() + '</b>' + l.map(([n, x]) => nvLn(esc(n), x.q + " uds.")).join("") + (sin.length ? '<br><b>Sin ventas en el período</b>' + sin.map(p => nvLn(esc(pname(p)), p.stock + " en stock")).join("") : ""), c:["Lo más vendido","Stock bajo"]};
    }
    const l = Object.entries(m).sort((a, b) => b[1].q - a[1].q || b[1].v - a[1].v).slice(0, 10);
    if (!l.length) return {h:pe.lbl + " todavía no hay ventas.", c:["Lo más vendido del mes pasado","Ventas de hoy"]};
    return {h:'<b>Lo más vendido · ' + pe.lbl.toLowerCase() + '</b>' + l.map(([n, x], i) => nvLn((i + 1) + ". " + esc(n), x.q + " uds. · " + usd(x.v))).join(""), c:["Lo menos vendido","Stock bajo","Mes pasado"]};
  },
  stock: (t) => {
    const q = nvResto(t);
    if (!q) { NV.wait = "stock"; return {h:"¿De qué producto? Escríbeme el nombre (aunque sea una parte).", c:["Stock bajo","Cancelar"]}; }
    const l = nvProductos(q).slice(0, 6);
    if (!l.length) return {h:"No encontré <b>" + esc(q) + "</b> en el inventario. Prueba con otra palabra del nombre o la marca.", c:["Stock bajo","Valor del inventario"]};
    const ult = p => { const v = O.filter(o => nvVivo(o) && o.items.some(i => i.id === p.id)).map(o => o.fecha).sort().pop(); return v ? "Última venta " + nvDias(v) + " (" + fdate(v) + ")" : "Sin ventas registradas"; };
    const est = p => !p.activo ? "inactivo" : p.proximo ? "próximo a llegar" : p.stock <= 0 ? '<b class="dn">agotado</b>' : p.stock <= p.minimo ? '<b class="dn">bajo el mínimo</b>' : '<b class="up">en orden</b>';
    if (l.length === 1) { const p = l[0]; return {h:esc(p.emoji || "📦") + " <b>" + esc(pname(p)) + "</b>" + (p.marca ? ' <span class="mu">' + esc(p.marca) + '</span>' : "") + (p.codigo ? ' <span class="mu">· ' + esc(p.codigo) + '</span>' : "") + '<div class="big">' + p.stock + ' uds.</div>Mínimo ' + p.minimo + ' · ' + est(p) + '<br>Precio ' + usd(p.precio) + (p.bcv ? ' · en Bs ' + nvBs(p.bcv) : ' · ' + nvBs(p.precio)) + (p.mayor ? ' · mayor ' + usd(p.mayor) : "") + '<br><span class="mu">' + ult(p) + '</span>', c:["Cuánto he vendido de " + pname(p), "Stock bajo", "Ir a Inventario"]}; }
    return {h:"Encontré " + l.length + " productos:" + l.map(p => nvLn(esc(p.emoji || "📦") + " " + esc(pname(p)), p.stock + " uds. · " + usd(p.precio))).join(""), c:["Stock bajo","Ir a Inventario"]};
  },
  bajos: () => {
    const l = P.filter(p => p.activo && p.stock <= p.minimo).sort((a, b) => a.stock - b.stock);
    if (!l.length) return {h:"✅ Todo el stock está en orden: ningún producto está en el mínimo o por debajo.", c:["Lo más vendido","Valor del inventario"]};
    const ag = l.filter(p => p.stock <= 0).length;
    return {h:"<b>" + l.length + "</b> " + (l.length === 1 ? "producto" : "productos") + " en el mínimo o por debajo" + (ag ? " (" + ag + (ag === 1 ? " agotado" : " agotados") + ")" : "") + ":" + l.slice(0, 15).map(p => nvLn(esc(p.emoji || "📦") + " " + esc(pname(p)), p.stock <= 0 ? '<span class="dn">Agotado</span>' : p.stock + " / mín. " + p.minimo)).join("") + (l.length > 15 ? '<span class="mu">Y ' + (l.length - 15) + ' más en Inventario.</span>' : ""), c:["Lista de compra","Ir a Inventario"]};
  },
  compra: () => {
    const l = P.filter(p => p.activo && !p.proximo && p.minimo > 0 && p.stock <= p.minimo).map(p => { const q = Math.max(1, p.minimo * 2 - p.stock); return {p, q, c:r2(q * (p.costo || 0))}; });
    if (!l.length) return {h:"No hace falta comprar nada por ahora: ningún producto está en su mínimo.", c:["Stock bajo","Lo más vendido"]};
    const tot = r2(l.reduce((a, x) => a + x.c, 0));
    return {h:"<b>Lista de compra sugerida</b><br><span class=\"mu\">Para llevar cada producto al doble de su mínimo.</span>" + l.map(x => nvLn(esc(pname(x.p)), x.q + " uds." + (x.c ? " · " + usd(x.c) : ""))).join("") + '<div class="ln"><span><b>Costo estimado</b></span><b>' + usd(tot) + '</b></div>', c:["Stock bajo","Valor del inventario"]};
  },
  inventario: () => {
    const l = P.filter(p => p.activo && p.stock > 0), u = l.reduce((a, p) => a + p.stock, 0);
    const co = r2(P.reduce((a, p) => a + (p.costo || 0) * Math.max(0, p.stock), 0)), ve = r2(l.reduce((a, p) => a + p.precio * p.stock, 0));
    return {h:"<b>Valor del inventario</b>" + nvLn("A precio de costo", usd(co)) + nvLn("A precio de venta", usd(ve)) + nvLn("Ganancia potencial", usd(r2(ve - co))) + '<span class="mu">' + u + ' unidades en ' + l.length + ' productos activos con stock.</span>', c:["Stock bajo","Lo más vendido"]};
  },
  deben: (t) => {
    if (!MOD("credito")) return {h:"El módulo de ventas a crédito está apagado en este negocio.", c:NV_MENU};
    const q = nvResto(t), uno = q ? nvCliente(q) : [];
    const g = {};
    O.filter(o => o.credito && o.estado === "Crédito").forEach(o => { const k = cliKey(o), x = g[k] || (g[k] = {k, n:o.cliente, s:0, p:0}); x.s = r2(x.s + saldoDe(o)); x.p++; });
    if (uno.length === 1) { const c = uno[0], x = g[c.k]; return {h:x && x.s > 0 ? esc(c.nombre) + " te debe <div class=\"big\">" + usd(x.s) + "</div>" + nvBs(x.s) + "<br>En " + x.p + (x.p === 1 ? " pedido a crédito." : " pedidos a crédito.") : "✅ " + esc(c.nombre) + " no te debe nada.", c:["Datos de " + c.nombre, "Cuotas vencidas", "Quién me debe"]}; }
    const l = Object.values(g).filter(x => x.s > 0).sort((a, b) => b.s - a.s);
    if (!l.length) return {h:"🎉 Nadie te debe: no hay créditos con saldo pendiente.", c:["Ventas de hoy","Stock bajo"]};
    const tot = r2(l.reduce((a, x) => a + x.s, 0));
    return {h:"Te deben <div class=\"big\">" + usd(tot) + "</div>" + nvBs(tot) + "<br>" + l.length + (l.length === 1 ? " cliente" : " clientes") + ":" + l.slice(0, 12).map(x => nvLn(esc(x.n) + (x.p > 1 ? ' <span class="mu">(' + x.p + ' pedidos)</span>' : ""), usd(x.s))).join("") + (l.length > 12 ? '<span class="mu">Y ' + (l.length - 12) + ' más en Pedidos → Crédito.</span>' : ""), c:["Cuotas vencidas","Ver créditos"]};
  },
  vencidas: () => {
    if (!MOD("credito")) return {h:"El módulo de ventas a crédito está apagado en este negocio.", c:NV_MENU};
    const hoy = hoyKey(), lim = addDias(hoy, 7), ya = [], prox = [];
    O.filter(o => o.credito && o.estado === "Crédito").forEach(o => { const c = cuotasDe(o).find(x => !x.ok); if (!c || !c.f) return; (c.f <= hoy ? ya : c.f <= lim ? prox : []).push({o, c}); });
    ya.sort((a, b) => a.c.f.localeCompare(b.c.f)); prox.sort((a, b) => a.c.f.localeCompare(b.c.f));
    const fila = x => nvLn(esc(x.o.cliente) + '<br><span class="mu">Cuota ' + x.c.n + ' de ' + x.o.cuotas + ' · ' + (x.c.f < hoy ? "venció " + fdate(x.c.f) : x.c.f === hoy ? "vence hoy" : "vence " + fdate(x.c.f)) + '</span>', usd(x.c.falta));
    let h = ya.length ? "<b>" + ya.length + "</b> " + (ya.length === 1 ? "cuota vencida o que vence hoy" : "cuotas vencidas o que vencen hoy") + ", por <b>" + usd(r2(ya.reduce((a, x) => a + x.c.falta, 0))) + "</b>:" + ya.slice(0, 10).map(fila).join("") : "✅ No hay cuotas vencidas ni que venzan hoy.";
    if (prox.length) h += "<br><br><b>Próximos 7 días</b>" + prox.slice(0, 6).map(fila).join("");
    return {h, c:["Quién me debe","Ver créditos"]};
  },
  pendientes: () => {
    const l = O.filter(o => o.estado === "Pendiente").sort((a, b) => Date.parse(a.fecha) - Date.parse(b.fecha));
    if (!l.length) return {h:"✅ No tienes pedidos pendientes.", c:["Ventas de hoy","Buscar un pedido"]};
    const tot = r2(l.reduce((a, o) => a + o.total, 0));
    return {h:"<b>" + l.length + "</b> " + (l.length === 1 ? "pedido pendiente" : "pedidos pendientes") + " por <b>" + usd(tot) + "</b>:" + l.slice(0, 8).map(o => nvLn(esc(o.id) + " · " + esc(o.cliente) + '<br><span class="mu">' + nvDias(o.fecha) + " · " + esc(o.pago || "") + '</span>', usd(o.total))).join("") + (l.length > 8 ? '<span class="mu">Y ' + (l.length - 8) + ' más.</span>' : ""), c:["Ver pedidos pendientes","Ventas de hoy"]};
  },
  pedido: (ref) => {
    const o = ref.tipo === "ped" ? O.find(x => String(x.id).toUpperCase() === "PED-" + ref.n) : O.find(x => String(x.nota) === String(Number(ref.n)));
    if (!o) return {h:"No encontré " + (ref.tipo === "ped" ? "el pedido <b>PED-" + esc(ref.n) + "</b>" : "la nota de entrega <b>#" + esc(ref.n) + "</b>") + ".", c:["Pedidos pendientes","Buscar un pedido"]};
    const sal = saldoDe(o);
    return {h:"<b>" + esc(o.id) + "</b> · " + esc(o.estado) + (o.nota ? ' <span class="mu">· nota #' + esc(o.nota) + '</span>' : "") + "<br>" + esc(o.cliente) + (o.telefono ? " · " + esc(o.telefono) : "") + '<br><span class="mu">' + fdt(o.fecha) + " · " + esc(o.pago || "") + " · " + esc(o.entrega || "") + '</span>' + o.items.map(i => nvLn(i.q + " × " + esc(i.n), usd(i.p * i.q))).join("") + '<div class="ln"><span><b>Total</b></span><b>' + usd(o.total) + '</b></div>' + (o.credito ? "Crédito: abonado " + usd(o.abonado) + (sal > 0 ? ' · saldo <b class="dn">' + usd(sal) + '</b>' : " · pagado completo") : ""), c:["Datos de " + o.cliente, "Ver pedidos pendientes"]};
  },
  cliente_info: (t) => {
    const q = nvResto(t);
    if (!q) { NV.wait = "cliente"; return {h:"¿De qué cliente? Escríbeme su nombre o parte del nombre.", c:["Mejores clientes","Cancelar"]}; }
    const l = nvCliente(q);
    if (!l.length) return {h:"No encontré a <b>" + esc(q) + "</b> en la agenda ni en los pedidos.", c:["Mejores clientes","Ir a Clientes"]};
    if (l.length > 1) return {h:"Encontré " + l.length + " clientes parecidos. ¿Cuál?", c:l.slice(0, 6).map(c => "Datos de " + c.nombre)};
    const c = l[0], ps = O.filter(o => cliKey(o) === c.k && nvVivo(o)).sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));
    const tot = r2(ps.reduce((a, o) => a + o.total, 0)), deb = r2(ps.reduce((a, o) => a + saldoDe(o), 0)), m = {};
    ps.forEach(o => o.items.forEach(i => m[i.n] = (m[i.n] || 0) + i.q));
    const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3), tel = String(c.telefono || "").replace(/\D/g, "");
    let h = "👤 <b>" + esc(c.nombre) + "</b>" + (c.telefono ? "<br>📞 " + esc(c.telefono) : "") + (c.direccion ? "<br>📍 " + esc(c.direccion) : "") + (c.notas ? '<br><span class="mu">' + esc(c.notas) + '</span>' : "");
    h += ps.length ? nvLn("Pedidos", ps.length) + nvLn("Total comprado", usd(tot)) + nvLn("Último pedido", nvDias(ps[0].fecha) + " (" + esc(ps[0].id) + ")") + (deb > 0 ? nvLn("Saldo a crédito", '<span class="dn">' + usd(deb) + '</span>') : "") + (top.length ? '<br><b>Lo que más compra</b>' + top.map(([n, q2]) => nvLn(esc(n), q2 + " uds.")).join("") : "") : "<br>Todavía no tiene pedidos.";
    if (tel.length >= 7) h += '<br><a class="nv-wa" target="_blank" rel="noopener" href="https://wa.me/' + esc(tel) + '">Abrir WhatsApp</a>';
    return {h, c:["Mejores clientes","Quién me debe"]};
  },
  mejores_clientes: (t) => {
    const pe = nvPeriodo(t, "todo"), g = {};
    O.filter(o => nvVivo(o) && nvIn(o.fecha, pe.a, pe.b)).forEach(o => { const k = cliKey(o), x = g[k] || (g[k] = {n:o.cliente, v:0, p:0}); x.v = r2(x.v + o.total); x.p++; });
    const l = Object.values(g).sort((a, b) => b.v - a.v).slice(0, 10);
    if (!l.length) return {h:"Todavía no hay compras en " + pe.lbl.toLowerCase() + ".", c:["Mejores clientes"]};
    return {h:"<b>Mejores clientes · " + pe.lbl.toLowerCase() + "</b>" + l.map((x, i) => nvLn((i + 1) + ". " + esc(x.n) + ' <span class="mu">(' + x.p + (x.p === 1 ? " pedido" : " pedidos") + ')</span>', usd(x.v))).join(""), c:pe.k === "todo" ? ["Mejores clientes del mes","Datos de " + l[0].n] : ["Mejores clientes","Datos de " + l[0].n]};
  },
  mejor_dia: () => {
    const desde = addDias(hoyKey(), -55), s = [0,0,0,0,0,0,0], d = [{},{},{},{},{},{},{}];
    O.flatMap(cobros).filter(c => nvIn(c.f, desde, hoyKey())).forEach(c => { const k = dkey(c.f), w = new Date(k + "T12:00:00").getDay(); s[w] = r2(s[w] + c.m); d[w][k] = 1; });
    if (!s.some(x => x > 0)) return {h:"Todavía no hay cobros suficientes para comparar los días.", c:["Ventas de hoy"]};
    const ord = [1,2,3,4,5,6,0], prom = w => r2(s[w] / 8);
    const mx = ord.reduce((a, w) => s[w] > s[a] ? w : a, 1), mn = ord.filter(w => s[w] > 0).reduce((a, w) => s[w] < s[a] ? w : a, mx);
    return {h:"En las últimas 8 semanas, tu mejor día es el <b>" + NV_DIAS[mx] + "</b> y el más flojo el <b>" + NV_DIAS[mn] + "</b>.<br><span class=\"mu\">Promedio cobrado por día de la semana:</span>" + ord.map(w => nvLn(NV_DIAS[w][0].toUpperCase() + NV_DIAS[w].slice(1), usd(prom(w)))).join(""), c:["Ventas de hoy","Esta semana","Mejores clientes"]};
  },
  faq: (f) => { const txt = nvPlantilla(f.r), falta = /\[EDITAR/i.test(txt); return {h:'📋 Así responde Novi a tus clientes' + (f.p ? ' sobre <i>“' + esc(f.p) + '”</i>' : "") + ':<br><br>' + esc(txt).replace(/\n/g, "<br>").replace(/\[EDITAR:?([^\]]*)\]/gi, '<mark>✏️$1</mark>') + '<br><br><span class="mu">' + (falta ? "Lo marcado en amarillo hay que completarlo en la hoja Novi_FAQ: mientras tanto, Novi no la usa con los clientes." : "Puedes cambiar esta respuesta en la hoja Novi_FAQ.") + '</span>', c:["Menú"]}; }
};
/* Botones con acción propia (no pasan por el diccionario) */
const NV_IR = {"ir a caja":["caja"], "ir a inventario":["inv"], "ir a gastos":["gas"], "ir a clientes":["cli"], "ver creditos":["ped","Crédito"], "ver pedidos pendientes":["ped","Pendiente"]};
const NV_ESP = {
  "cancelar": () => { NV.wait = null; NV.pend = null; return {h:"Listo. ¿Qué más quieres saber?", c:NV_MENU}; },
  "buscar un pedido": () => { NV.wait = "pedido"; return {h:"¿Qué número de pedido busco? Por ejemplo <i>1003</i> o <i>nota 12</i>.", c:["Pedidos pendientes","Cancelar"]}; },
  "datos de un cliente": () => { NV.wait = "cliente"; return {h:"¿De qué cliente? Escríbeme su nombre o parte del nombre.", c:["Mejores clientes","Cancelar"]}; },
  "consultar bcv ahora": async () => { if (DEMO) { await nvPedirBcv(true); return NV_R.tasa(); } const j = await nvPedirBcv(true); return j ? NV_R.tasa() : {h:"No pude consultar la tasa BCV ahora. Intenta en un rato o revísala en bcv.org.ve.", c:["Tasa del dólar"]}; },
  "si actualizar la tasa": async () => {
    const p = NV.pend; NV.pend = null;
    if (!p || p.tipo !== "tasa") return {h:"No tengo una tasa pendiente por actualizar.", c:["Tasa del dólar"]};
    const j = await run("tasa_set", {tasa:p.v});
    if (!j) return {h:"No pude guardar la tasa. Revisa la conexión e intenta de nuevo.", c:NV_CH_TASA};
    const y = window.scrollY; panel().then(() => window.scrollTo(0, y));
    return {h:"✅ Listo: la tasa ahora es <b>" + nvNumBs(C.tasa) + " Bs/$</b>. La tienda y las notas ya usan la nueva tasa.", c:["Cuánto son $20 en Bs","Ventas de hoy"]};
  },
  "dejar la tasa asi": () => { const p = NV.pend; NV.pend = null; if (p) { try { localStorage.setItem("nv_tasa_no", p.v + "|" + p.f); } catch(e){} } return {h:"Ok, dejo la tasa en <b>" + nvNumBs(C.tasa) + "</b>. Si cambias de idea, pregúntame por la tasa.", c:NV_MENU}; }
};
const NV_SI = new Set(["si","sip","dale","ok","okey","confirmo","confirmar","hazlo","de una","actualizala","actualizar","si dale"]), NV_NO = new Set(["no","nop","dejala","deja asi","dejala asi","no gracias","asi esta bien"]);

/* ---------- Cerebro: decide qué responder ---------- */
function nvResponder(raw){
  const t = nvNorm(raw);
  if (NV_IR[t]) { const [tb, st] = NV_IR[t]; tab = tb; if (st) statusF = st; nvToggle(false); panel(); window.scrollTo(0, 0); return null; }
  if (NV_ESP[t]) return {r:NV_ESP[t](), i:t.replace(/ /g, "_"), ok:true};
  if (NV.pend && NV_SI.has(t)) return {r:NV_ESP["si actualizar la tasa"](), i:"tasa_si", ok:true};
  if (NV.pend && NV_NO.has(t)) return {r:NV_ESP["dejar la tasa asi"](), i:"tasa_no", ok:true};
  if (t === "menu") return {r:NV_R.menu(), i:"menu", ok:true};
  const espera = NV.wait; NV.wait = null;
  const ref = nvPedidoRef(raw) || (espera === "pedido" && /^\d{1,6}$/.test(t) ? {tipo:"ped", n:t} : null);
  if (ref) return {r:NV_R.pedido(ref), i:"pedido", ok:true};
  let {i, s} = nvIntent(t, raw);
  const fq = nvFaq(t);
  if (espera === "stock" && (!i || i === "stock")) return {r:NV_R.stock("stock " + t), i:"stock", ok:true};
  if (espera === "cliente" && (!i || i === "cliente_info")) return {r:NV_R.cliente_info("datos de " + t), i:"cliente_info", ok:true};
  if (espera === "convertir" && nvMonto(raw)) return {r:NV_R.convertir(t, raw), i:"convertir", ok:true};
  if (fq.f && fq.s > s) return {r:NV_R.faq(fq.f), i:"faq", ok:true};
  if (!i && /\b(hoy|ayer|semana|mes)\b/.test(t)) i = ["ventas","pagos","top","gastos","ganancia","mejores_clientes"].indexOf(NV.last) > -1 ? NV.last : "ventas";
  if (!i) { const q = nvResto(t); if (q && nvProductos(q).length && nvAprox(q, P, p => pname(p))[0].s >= .8) i = "stock"; else if (q && nvCliente(q).length && nvAprox(q, nvClientes(), c => c.nombre)[0].s >= .9) i = "cliente_info"; }
  if (!i) return {r:{h:"Todavía no entiendo eso 🤔. Esto sí lo sé responder:" + '<br><span class="mu">Si es una pregunta de tus clientes, agrégala en la hoja Novi_FAQ.</span>', c:NV_MENU}, i:"", ok:false};
  NV.last = i;
  return {r:NV_R[i](t, raw), i, ok:true};
}

/* ---------- Interfaz ---------- */
function nvAdd(cls, html){ const m = document.createElement("div"); m.className = "nv-m " + cls; m.innerHTML = html; const box = $("nv_msgs"); box.appendChild(m); box.scrollTop = box.scrollHeight; }
function nvChips(l){ $("nv_chips").innerHTML = (l || []).map(c => '<button type="button" data-nv="' + esc(c) + '">' + esc(c) + '</button>').join(""); }
async function nvEnviar(txt, escrito){
  txt = String(txt || "").trim(); if (!txt) return;
  NV.act = Date.now();
  nvAdd("yo", esc(txt));
  const out = nvResponder(txt);
  if (!out) return;
  const r = await Promise.resolve(out.r);
  setTimeout(() => { nvAdd("bot", r.h); nvChips(r.c); }, 160);
  if (escrito && !DEMO) api("novi_log", {texto:txt, intencion:out.i, entendio:out.ok}).catch(() => {});
}
function nvSaludar(){ const r = NV_R.inicio(); nvAdd("bot", r.h); nvChips(r.c); NV.started = true; NV.act = Date.now(); }
function nvReiniciar(){ NV.started = false; NV.wait = null; NV.pend = null; NV.last = null; const b = $("nv_msgs"); if (b) b.innerHTML = ""; const c = $("nv_chips"); if (c) c.innerHTML = ""; if (NV.open) nvSaludar(); }
function nvToggle(on){
  NV.open = on === undefined ? !NV.open : on;
  $("nv_win").classList.toggle("open", NV.open);
  const dot = $("nv_dot"); if (dot && NV.open) dot.style.display = "none";
  const tip = $("nv_tip"); if (tip) tip.remove();
  if (NV.open) {
    if (NV.started && Date.now() - NV.act > NV_INACTIVO) nvReiniciar();
    if (!NV.started) {
      nvSaludar();
      if (!C.tasa_bcv_fecha || String(C.tasa_bcv_fecha) < hoyKey()) nvPedirBcv().then(j => { if (j && NV.open && nvTasaPendiente() && !NV.pend) { nvAdd("bot", nvAvisoTasa().replace(/^<br><br>/, "")); nvChips(NV_CH_TASA.concat(NV_MENU)); } });
    }
    setTimeout(() => { const i = $("nv_q"); if (i && window.innerWidth > 520) i.focus(); }, 60);
  } else if (NV.voz && NV.voz.on) NV.voz.rec.stop();
}
/* Dictado por voz del navegador (gratis, sin IA propia). Si el navegador no lo soporta, el botón no aparece. */
function nvVozIniciar(){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const b = $("nv_mic"); if (!SR || !b) return;
  const rec = new SR(); rec.lang = "es-VE"; rec.interimResults = true; rec.maxAlternatives = 1; rec.continuous = false;
  NV.voz = {rec, on:false, txt:""};
  b.style.display = "";
  rec.onresult = e => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; NV.voz.txt = t; $("nv_q").value = t; };
  rec.onend = () => { NV.voz.on = false; b.classList.remove("on"); const t = NV.voz.txt.trim(); NV.voz.txt = ""; if (t) { $("nv_q").value = ""; nvEnviar(t, true); } };
  rec.onerror = e => { NV.voz.on = false; b.classList.remove("on"); if (e.error === "not-allowed" || e.error === "service-not-allowed") nvAdd("bot", "Necesito permiso para usar el micrófono. Actívalo en el candado de la barra de direcciones."); };
  b.onclick = () => { if (NV.voz.on) { rec.stop(); return; } try { NV.voz.txt = ""; rec.start(); NV.voz.on = true; b.classList.add("on"); NV.act = Date.now(); } catch(e){} };
}
function nvMontar(){
  if ($("nv_fab")) return;
  const d = document.createElement("div");
  d.innerHTML = '<button class="nv-fab" id="nv_fab" type="button" aria-label="Abrir a Novi, tu asistente">' + NOVI_SVG() + '<span class="nv-dot" id="nv_dot"></span></button>' +
    '<section class="nv-win" id="nv_win" role="dialog" aria-label="Novi, asistente del panel"><div class="nv-hd">' + NOVI_SVG() + '<div><b>Novi</b><span>Asistente de tu negocio</span></div><button type="button" id="nv_x" aria-label="Cerrar">×</button></div>' +
    '<div class="nv-msgs" id="nv_msgs" aria-live="polite"></div><div class="nv-chips" id="nv_chips"></div>' +
    '<form class="nv-in" id="nv_f"><button type="button" class="nv-mic" id="nv_mic" aria-label="Hablarle a Novi" title="Hablarle a Novi" style="display:none">🎤</button><input id="nv_q" autocomplete="off" placeholder="Escríbele a Novi…" aria-label="Mensaje para Novi" maxlength="200"><button class="nv-env">Enviar</button></form></section>';
  while (d.firstChild) document.body.appendChild(d.firstChild);
  $("nv_fab").onclick = () => nvToggle();
  $("nv_x").onclick = () => nvToggle(false);
  $("nv_chips").onclick = e => { const b = e.target.closest("[data-nv]"); if (b) nvEnviar(b.dataset.nv, false); };
  $("nv_f").onsubmit = e => { e.preventDefault(); const i = $("nv_q"); const v = i.value; i.value = ""; nvEnviar(v, true); };
  $("nv_q").addEventListener("input", () => { NV.act = Date.now(); });
  nvVozIniciar();
  let visto = false; try { visto = sessionStorage.getItem("nv_tip") === "1"; sessionStorage.setItem("nv_tip", "1"); } catch(e){}
  if (!visto) { const t = document.createElement("div"); t.className = "nv-tip"; t.id = "nv_tip"; t.textContent = "¡Yo! Soy Novi."; document.body.appendChild(t); setTimeout(() => { if (t.parentNode) t.remove(); }, 6000); }
}
function noviSync(){
  const on = isPanel() && admin && MOD("novi");
  if (!on) { if ($("nv_fab")) { if (NV.voz && NV.voz.on) NV.voz.rec.stop(); ["nv_fab","nv_win","nv_tip"].forEach(id => { const x = $(id); if (x) x.remove(); }); NV.open = false; NV.started = false; NV.wait = null; NV.pend = null; NV.voz = null; } return; }
  nvMontar();
  const n = O.filter(o => o.estado === "Pendiente").length + P.filter(p => p.activo && p.stock <= 0).length + (nvTasaPendiente() ? 1 : 0), dot = $("nv_dot");
  if (dot) { dot.textContent = n > 9 ? "9+" : n; dot.style.display = n && !NV.open ? "block" : "none"; }
}
/* 5 minutos sin escribir: se borra la conversación (si está abierta, arranca una nueva) */
setInterval(() => { if (NV.started && Date.now() - NV.act > NV_INACTIVO) nvReiniciar(); }, 15000);

/* ---------- Enganches con el panel ---------- */
{ const _panel = panel; panel = async function(){ const r = await _panel.apply(this, arguments); noviSync(); return r; }; }
{ const _apply = apply; apply = function(j){ _apply(j); if (j && j.novi) nvCargarDatos(j.novi); }; }
window.addEventListener("hashchange", noviSync);
document.addEventListener("keydown", e => { if (e.key === "Escape" && NV.open) nvToggle(false); });

/* ---------- Modo demo: imita las acciones nuevas del Apps Script ---------- */
if (DEMO) {
  const _local = local;
  local = function(b){
    if (b.action === "novi_log") return {ok:true};
    if (b.action === "tasa_set") { dload(); const v = Number(b.tasa); if (!(v > 0)) throw new Error("Tasa inválida"); D.config.tasa = v; dsave(); return Object.assign(snap(), {novi:NOVI_DEMO}); }
    if (b.action === "tasa_bcv") {   // la demo también lee la tasa real; si no hay conexión, usa una de ejemplo
      const fin = () => Object.assign(snap(), {novi:NOVI_DEMO});
      return fetch("https://bcv.today/api/v1/rate.json", {cache:"no-store"}).then(r => r.json()).then(j => {
        const v = Number(j.USD), f = String(j.effective_date || j.date || "").slice(0, 10);
        if (!(v > 0) || !/^\d{4}-\d{2}-\d{2}$/.test(f)) throw 0;
        dload(); D.config.tasa_bcv = r2(v); D.config.tasa_bcv_eur = r2(Number(j.EUR) || 0); D.config.tasa_bcv_fecha = f; dsave(); return fin();
      }).catch(() => {
        dload(); if (!D.config.tasa_bcv) { const base = Number(D.config.tasa) || 1; D.config.tasa_bcv = r2(base * 1.0125); D.config.tasa_bcv_eur = r2(base * 1.0125 * 1.16); D.config.tasa_bcv_fecha = hoyKey(); dsave(); }
        return fin();
      });
    }
    const r = _local(b);
    if (b.action === "load" && r) r.novi = NOVI_DEMO;
    return r;
  };
}
