/**
 * JB NOVA — PANEL BASE · Backend en Google Apps Script (Google Sheets como base de datos).
 * Un panel por cliente: misma plantilla, datos y configuración propios.
 * Incluye: precios divisas / Bs (BCV) / mayorista con código, nota de entrega en PDF (Drive + correo).
 *
 * PASOS:
 * 1) Creá una planilla nueva de Google Sheets, andá a Extensiones > Apps Script y pegá este archivo.
 * 2) Elegí la función "setup" y tocá Ejecutar (aceptá los permisos). Crea las hojas y datos de ejemplo.
 * 3) Implementar > Nueva implementación > Tipo: Aplicación web
 *      Ejecutar como: Yo   |   Quién tiene acceso: Cualquier persona
 *    Copiá la URL que termina en /exec y pegala en API_URL dentro de index.html.
 * 4) Para cambiar el PIN del panel: editá NUEVO_PIN acá abajo y ejecutá la función "cambiarPin".
 *
 * Cada vez que cambies este código: Implementar > Administrar implementaciones > Editar > Nueva versión.
 */

const PIN_INICIAL = "1234";
const NUEVO_PIN = "1234";
const NOTA_INICIAL = 1; // próximo número de nota de entrega
const PBS = ["Pago Móvil", "Transferencia"]; // formas de pago que cobran el precio BCV en Bs
const ESTADOS = ["Pendiente", "Crédito", "Pagado", "Entregado", "Cancelado"];

const HOJAS = {
  Productos: ["id", "nombre", "categoria", "emoji", "imagenes", "descripcion", "especificaciones", "costo", "precio", "stock", "minimo", "activo", "marca", "bcv", "mayor", "proximo", "codigo", "sabor"],
  Pedidos: ["id", "fecha", "cliente", "telefono", "entrega", "direccion", "pago", "items", "total", "estado", "fecha_pago", "ganancia", "tipo", "email", "nota", "nota_url", "codigo", "credito", "cuotas", "abonado", "pagos", "venc"],
  Clientes: ["codigo", "nombre", "telefono", "activo"],
  Agenda: ["id", "nombre", "telefono", "direccion", "notas", "fecha"],
  Gastos: ["id", "fecha", "categoria", "descripcion", "monto", "pago"],
  Cierres: ["fecha", "ventas", "gastos", "efectivo_esperado", "efectivo_contado", "diferencia", "notas", "fondo", "cobros_efectivo", "gastos_efectivo"],
  Config: ["clave", "valor"]
};
// Columnas que se guardan como texto (evita que Sheets convierta fechas o teléfonos)
const TEXTO = ["sabor", "fecha", "fecha_pago", "telefono", "items", "imagenes", "descripcion", "especificaciones", "cliente", "direccion", "notas", "valor", "id_texto", "marca", "email", "nota_url", "codigo", "tipo", "nombre", "pagos", "venc", "credito"];

/* ================= SETUP ================= */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(HOJAS).forEach(function (nombre) {
    let sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
    const cols = HOJAS[nombre];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
    cols.forEach(function (c, i) {
      if (TEXTO.indexOf(c) > -1) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat("@");
    });
  });
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty("ADMIN_PIN")) props.setProperty("ADMIN_PIN", PIN_INICIAL);

  if (leer_("Config").length === 0) {
    const cfg = {
      negocio: "Mi Negocio",
      intro: "Texto de presentación del negocio. Se cambia desde Ajustes en el panel.",
      tasa: "60", whatsapp: "584240000000",
      entregas: "Entrega personal, Delivery, Envío nacional",
      pagos: "Efectivo $, Zelle, Pago Móvil, Transferencia",
      legal: "", rif: "", correo: "", instagram: "", tiktok: "", lema: "", ciudad: "", color: "#0a86b8", logo_url: "",
      mod_tienda: "SI", mod_mayorista: "SI", mod_credito: "SI", mod_sabores: "SI",
      sitio: "", min_mayor: "5", nota_siguiente: String(NOTA_INICIAL)
    };
    Object.keys(cfg).forEach(function (k) { agregar_("Config", {clave: k, valor: cfg[k]}); });
  }
  if (leer_("Productos").length === 0) cargarCatalogo_();
  if (leer_("Clientes").length === 0) agregar_("Clientes", {codigo: "MAYOR-DEMO", nombre: "Distribuidora Demo C.A.", telefono: "", activo: "SI"});
  // Dispara los permisos de Drive y correo (se piden una sola vez)
  carpetaNotas_(); MailApp.getRemainingDailyQuota();
  embellecer_();
  resumen_();
  SpreadsheetApp.getActiveSpreadsheet().setActiveSheet(SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Resumen"));
}
function cargarCatalogo_() {
  const rows = JSON.parse(Utilities.ungzip(Utilities.newBlob(Utilities.base64Decode(SEED), "application/x-gzip")).getDataAsString());
  const sh = hoja_("Productos"), cols = HOJAS.Productos;
  const out = rows.map(function (a) {
    return fila_("Productos", {id: a[0], nombre: a[1], marca: a[2], categoria: a[3], emoji: a[4], imagenes: a[5], descripcion: a[6], especificaciones: a[7], costo: a[8], precio: a[9], bcv: a[10], mayor: a[11], stock: a[12], minimo: a[13], activo: "SI", proximo: a[14] ? "SI" : "NO"});
  });
  sh.getRange(2, 1, out.length, cols.length).setValues(out);
}
function cambiarPin() { PropertiesService.getScriptProperties().setProperty("ADMIN_PIN", String(NUEVO_PIN)); }

/* ================= ENTRADA HTTP ================= */
function doGet() { return salida_({ok: true, mensaje: "API activa"}); }

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    const a = req.action;
    if (a === "catalog") return salida_(catalogo_(req.mayor === true));
    if (a === "order") { const res = conLock_(function () { return pedido_(req); }); cacheLimpiar_(); return salida_(res); }
    verificarPin_(req.pin);
    if (a === "order_del" || a === "product_del" || a === "credit_pay_del" || a === "cust_del") verificarPin_(req.clave);
    if (a === "pulse") return salida_(Object.assign({ok: true}, ultimoPedido_()));
    const fn = ADMIN[a];
    if (!fn) throw new Error("Acción desconocida");
    if (a === "load") return salida_(estado_());
    const out = conLock_(function () { return fn(req); }); cacheLimpiar_();
    return salida_(out);
  } catch (err) {
    return salida_({ok: false, error: String(err.message || err)});
  }
}

const ADMIN = {
  load: estado_,
  order_status: function (r) {
    const o = leer_("Pedidos").filter(function (x) { return x.id === r.id; })[0];
    if (!o) throw new Error("Pedido no encontrado");
    if (ESTADOS.indexOf(r.estado) < 0) throw new Error("Estado inválido");
    if (o.estado === "Cancelado") throw new Error("El pedido ya está cancelado");
    if (r.estado === "Cancelado" && Number(o.abonado) > 0) throw new Error("Este crédito ya tiene pagos registrados. Si fue un error, elimina el pedido.");
    if (String(o.credito).toUpperCase() === "SI" && o.estado === "Crédito" && (r.estado === "Pagado" || r.estado === "Entregado")) throw new Error("Es un pedido a crédito: registra los pagos hasta completar el saldo.");
    if (r.estado === "Cancelado") {
      JSON.parse(o.items || "[]").forEach(function (i) {
        const p = leer_("Productos").filter(function (x) { return Number(x.id) === i.id; })[0];
        if (p) { p.stock = Number(p.stock) + i.q; escribir_("Productos", p); }
      });
    }
    if ((r.estado === "Pagado" || r.estado === "Entregado") && !o.fecha_pago) o.fecha_pago = new Date().toISOString();
    o.estado = r.estado;
    escribir_("Pedidos", o);
    return estado_();
  },
  credit_set: function (r) {
    const o = leer_("Pedidos").filter(function (x) { return x.id === r.id; })[0];
    if (!o) throw new Error("Pedido no encontrado");
    if (o.estado !== "Pendiente") throw new Error("Solo un pedido pendiente puede pasar a crédito");
    const n = Math.floor(Number(r.cuotas));
    if (!(n >= 1 && n <= 36)) throw new Error("Las cuotas deben ser de 1 a 36");
    const total = Number(o.total);
    let venc = [];
    if (Array.isArray(r.venc) && r.venc.length) {
      if (r.venc.length !== n) throw new Error("Las fechas no coinciden con las cuotas");
      let acum = 0;
      venc = r.venc.map(function (v, i) {
        const f = txt_(v.f, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) throw new Error("Fecha inválida");
        const m = i === n - 1 ? Math.round((total - acum) * 100) / 100 : Math.round(total / n * 100) / 100;
        acum += m;
        return {f: f, m: m};
      });
    }
    o.credito = "SI"; o.cuotas = n; o.abonado = 0; o.pagos = "[]"; o.venc = JSON.stringify(venc); o.estado = "Crédito";
    escribir_("Pedidos", o);
    return estado_();
  },
  credit_pay: function (r) {
    const o = leer_("Pedidos").filter(function (x) { return x.id === r.id; })[0];
    if (!o) throw new Error("Pedido no encontrado");
    if (String(o.credito).toUpperCase() !== "SI" || o.estado !== "Crédito") throw new Error("Este pedido no tiene saldo a crédito por cobrar");
    const m = Math.round(Number(r.monto) * 100) / 100;
    const saldo = Math.round((Number(o.total) - Number(o.abonado || 0)) * 100) / 100;
    if (!(m > 0)) throw new Error("Escribe el monto del pago");
    if (m > saldo + 0.005) throw new Error("El pago es mayor al saldo pendiente ($" + saldo.toFixed(2) + ")");
    const f = /^\d{4}-\d{2}-\d{2}$/.test(String(r.fecha || "")) ? String(r.fecha) : Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
    const pagos = jsonArr_(o.pagos);
    pagos.push({f: f, m: m, mt: txt_(r.pago, 40) || o.pago, n: txt_(r.nota, 80)});
    o.pagos = JSON.stringify(pagos);
    o.abonado = Math.round(pagos.reduce(function (a, p) { return a + Number(p.m); }, 0) * 100) / 100;
    if (o.abonado >= Number(o.total) - 0.005) { o.abonado = Number(o.total); o.estado = "Pagado"; o.fecha_pago = f; }
    escribir_("Pedidos", o);
    return estado_();
  },
  credit_pay_del: function (r) {
    const o = leer_("Pedidos").filter(function (x) { return x.id === r.id; })[0];
    if (!o) throw new Error("Pedido no encontrado");
    if (String(o.credito).toUpperCase() !== "SI" || (o.estado !== "Crédito" && o.estado !== "Pagado")) throw new Error("No se puede modificar este pedido");
    const pagos = jsonArr_(o.pagos), i = Math.floor(Number(r.idx));
    if (!(i >= 0 && i < pagos.length)) throw new Error("Pago no encontrado");
    pagos.splice(i, 1);
    o.pagos = JSON.stringify(pagos);
    o.abonado = Math.round(pagos.reduce(function (a, p) { return a + Number(p.m); }, 0) * 100) / 100;
    if (o.abonado < Number(o.total) - 0.005) { o.estado = "Crédito"; o.fecha_pago = ""; }
    escribir_("Pedidos", o);
    return estado_();
  },
  cust_save: function (r) {
    const c = r.cliente || {}, nombre = txt_(c.nombre, 80);
    if (!nombre) throw new Error("El nombre es obligatorio");
    const todos = leer_("Agenda");
    const fila = {nombre: nombre, telefono: txt_(c.telefono, 30), direccion: txt_(c.direccion, 160), notas: txt_(c.notas, 300)};
    if (c.id) {
      const ex = todos.filter(function (x) { return Number(x.id) === Number(c.id); })[0];
      if (!ex) throw new Error("Cliente no encontrado");
      fila.id = ex.id; fila.fecha = ex.fecha; fila._fila = ex._fila;
      escribir_("Agenda", fila);
    } else {
      fila.id = todos.reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0) + 1;
      fila.fecha = new Date().toISOString();
      agregar_("Agenda", fila);
    }
    return estado_();
  },
  cust_del: function (r) {
    const c = leer_("Agenda").filter(function (x) { return Number(x.id) === Number(r.id); })[0];
    if (!c) throw new Error("Cliente no encontrado");
    SpreadsheetApp.getActive().getSheetByName("Agenda").deleteRow(c._fila);
    return estado_();
  },
  order_del: function (r) {
    const o = leer_("Pedidos").filter(function (x) { return x.id === r.id; })[0];
    if (!o) throw new Error("Pedido no encontrado");
    if (o.estado !== "Cancelado") {
      JSON.parse(o.items || "[]").forEach(function (i) {
        const p = leer_("Productos").filter(function (x) { return Number(x.id) === i.id; })[0];
        if (p) { p.stock = Number(p.stock) + i.q; escribir_("Productos", p); }
      });
    }
    SpreadsheetApp.getActive().getSheetByName("Pedidos").deleteRow(o._fila);
    return estado_();
  },
  product_del: function (r) {
    const p = leer_("Productos").filter(function (x) { return Number(x.id) === Number(r.id); })[0];
    if (!p) throw new Error("Producto no encontrado");
    SpreadsheetApp.getActive().getSheetByName("Productos").deleteRow(p._fila);
    return estado_();
  },
  pin_change: function (r) {
    if (!pinOk_(r.actual)) throw new Error("La clave actual no es correcta");
    const n = String(r.nueva || "");
    if (n.length < 4) throw new Error("La clave nueva debe tener al menos 4 caracteres");
    if (claveMaestra_() && n === claveMaestra_()) throw new Error("Elegí otra clave");
    PropertiesService.getScriptProperties().setProperty("ADMIN_PIN", n);
    return estado_();
  },
  product_save: function (r) {
    const p = r.product;
    const nombre = txt_(p.nombre, 120), precio = Number(p.precio) || 0;
    if (!nombre) throw new Error("El nombre es obligatorio");
    const fila = {
      nombre: nombre, categoria: txt_(p.categoria, 40) || "Otros", emoji: txt_(p.emoji, 4) || "📦",
      imagenes: txt_(p.imagenes, 2000), descripcion: txt_(p.descripcion, 1000), especificaciones: txt_(p.especificaciones, 1500),
      costo: Number(p.costo) || 0, precio: precio, stock: Math.max(0, Math.floor(Number(p.stock)) || 0),
      minimo: Math.max(0, Math.floor(Number(p.minimo)) || 0), activo: p.activo ? "SI" : "NO",
      marca: txt_(p.marca, 60), sabor: txt_(p.sabor, 60), bcv: Number(p.bcv) || 0, mayor: Number(p.mayor) || 0, proximo: p.proximo ? "SI" : "NO"
    };
    const todos = leer_("Productos");
    let codigo = txt_(p.codigo, 40).toUpperCase().replace(/\s+/g, "");
    if (codigo) {
      const dup = todos.filter(function (x) { return String(x.codigo).toUpperCase() === codigo && Number(x.id) !== Number(p.id || 0); })[0];
      if (dup) throw new Error("Ese código ya lo tiene: " + dup.nombre);
    }
    if (p.id) {
      const ex = todos.filter(function (x) { return Number(x.id) === Number(p.id); })[0];
      if (!ex) throw new Error("Producto no encontrado");
      fila.codigo = codigo || String(ex.codigo || "") || siguienteCodigo_(todos);
      fila.id = ex.id; fila._fila = ex._fila; escribir_("Productos", fila);
    } else {
      fila.codigo = codigo || siguienteCodigo_(todos);
      fila.id = todos.reduce(function (m, x) { return Math.max(m, Number(x.id) || 0); }, 0) + 1;
      agregar_("Productos", fila);
    }
    return estado_();
  },
  foto: function (r) {
    const m = /^data:image\/(jpeg|png|webp);base64,(.+)$/.exec(String(r.data || ""));
    if (!m) throw new Error("Imagen inválida");
    if (m[2].length > 4000000) throw new Error("La foto es muy pesada");
    const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), "image/" + m[1], "foto-" + Date.now() + "." + (m[1] === "jpeg" ? "jpg" : m[1]));
    const f = carpetaFotos_().createFile(blob);
    f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return {ok: true, url: "https://drive.google.com/thumbnail?id=" + f.getId() + "&sz=w1000"};
  },
  stock_adjust: function (r) {
    const p = leer_("Productos").filter(function (x) { return Number(x.id) === Number(r.id); })[0];
    if (!p) throw new Error("Producto no encontrado");
    p.stock = Math.max(0, Number(p.stock) + Math.floor(Number(r.delta)));
    escribir_("Productos", p);
    return estado_();
  },
  expense_add: function (r) {
    const e = r.expense, monto = Number(e.monto);
    if (!(monto > 0)) throw new Error("Monto inválido");
    if (!/^\d{4}-\d\d-\d\d$/.test(String(e.fecha))) throw new Error("Fecha inválida");
    agregar_("Gastos", {id: Date.now(), fecha: e.fecha, categoria: txt_(e.categoria, 40), descripcion: txt_(e.descripcion, 160), monto: Math.round(monto * 100) / 100, pago: txt_(e.pago, 20) || "Efectivo"});
    return estado_();
  },
  expense_del: function (r) {
    const g = leer_("Gastos").filter(function (x) { return Number(x.id) === Number(r.id); })[0];
    if (g) SpreadsheetApp.getActive().getSheetByName("Gastos").deleteRow(g._fila);
    return estado_();
  },
  config_save: function (r) {
    const c = r.config;
    const nuevo = {
      negocio: txt_(c.negocio, 60) || "Tienda", intro: txt_(c.intro, 600), titulo: txt_(c.titulo, 80),
      tasa: Number(c.tasa) > 0 ? String(Number(c.tasa)) : config_().tasa,
      whatsapp: String(c.whatsapp || "").replace(/\D/g, ""),
      entregas: (c.entregas || []).join(", "), pagos: (c.pagos || []).join(", "),
      min_mayor: String(Math.max(1, Math.floor(Number(c.min_mayor)) || 5))
    };
    ["legal", "rif", "correo", "instagram", "tiktok", "lema", "ciudad", "color", "logo_url"].forEach(function (k) { if (c[k] !== undefined) nuevo[k] = txt_(c[k], 300); });
    ["mod_tienda", "mod_mayorista", "mod_credito", "mod_sabores"].forEach(function (k) { if (c[k] !== undefined) nuevo[k] = c[k] === "NO" ? "NO" : "SI"; });
    if (c.codigos) {
      const sh = hoja_("Clientes"), ult = sh.getLastRow();
      if (ult > 1) sh.getRange(2, 1, ult - 1, HOJAS.Clientes.length).clearContent();
      c.codigos.slice(0, 200).forEach(function (x) { if (txt_(x.codigo, 30)) agregar_("Clientes", {codigo: txt_(x.codigo, 30).toUpperCase(), nombre: txt_(x.nombre, 80), telefono: "", activo: "SI"}); });
    }
    const filas = leer_("Config");
    Object.keys(nuevo).forEach(function (k) {
      const ex = filas.filter(function (x) { return x.clave === k; })[0];
      if (ex) { ex.valor = nuevo[k]; escribir_("Config", ex); } else agregar_("Config", {clave: k, valor: nuevo[k]});
    });
    return estado_();
  },
  close_save: function (r) {
    const c = r.cierre;
    if (!/^\d{4}-\d\d-\d\d$/.test(String(c.fecha))) throw new Error("Fecha inválida");
    const fila = {fecha: c.fecha, ventas: Number(c.ventas) || 0, gastos: Number(c.gastos) || 0, efectivo_esperado: Number(c.efectivo_esperado) || 0, efectivo_contado: Number(c.efectivo_contado) || 0, diferencia: Number(c.diferencia) || 0, notas: txt_(c.notas, 160), fondo: Number(c.fondo) || 0, cobros_efectivo: Number(c.cobros_efectivo) || 0, gastos_efectivo: Number(c.gastos_efectivo) || 0};
    const ex = leer_("Cierres").filter(function (x) { return x.fecha === c.fecha; })[0];
    if (ex) { fila._fila = ex._fila; escribir_("Cierres", fila); } else agregar_("Cierres", fila);
    return estado_();
  }
};

/* ================= LÓGICA ================= */
function cliente_(codigo) {
  const c = String(codigo || "").trim().toUpperCase();
  if (!c) return null;
  const f = leer_("Clientes").filter(function (x) { return String(x.codigo).toUpperCase() === c && String(x.activo).toUpperCase() !== "NO"; })[0];
  return f ? {codigo: String(f.codigo), nombre: String(f.nombre)} : null;
}
function catalogo_(may) {
  const o = catalogoBase_();
  if (!may) o.products.forEach(function (p) { p.mayor = 0; });
  return o;
}
function catalogoBase_() {
  const cache = CacheService.getScriptCache(), hit = cache.get("cat");
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  const productos = leer_("Productos").map(producto_).filter(function (p) { return p.activo; });
  productos.forEach(function (p) { delete p.costo; });
  const out = {ok: true, config: config_(), products: productos};
  try { cache.put("cat", JSON.stringify(out), 20); } catch (e) {}
  return out;
}
// Se ejecuta UNA vez después de actualizar el código: agrega las columnas de crédito y la hoja Agenda.
function actualizarCredito() {
  const ss = SpreadsheetApp.getActive();
  ["Pedidos", "Agenda", "Productos"].forEach(function (nombre) {
    const sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre), cols = HOJAS[nombre];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
    cols.forEach(function (c, i) { if (TEXTO.indexOf(c) > -1) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat("@"); });
  });
  const ped = ss.getSheetByName("Pedidos"), ec = HOJAS.Pedidos.indexOf("estado") + 1;
  ped.getRange(2, ec, ped.getMaxRows() - 1, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(ESTADOS, true).setAllowInvalid(false).build());
  return "ok";
}
function actualizarCaja() {
  const ss = SpreadsheetApp.getActive();
  ["Gastos", "Cierres"].forEach(function (nombre) {
    const sh = ss.getSheetByName(nombre) || ss.insertSheet(nombre), cols = HOJAS[nombre];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
    sh.setFrozenRows(1);
  });
  return "ok";
}
function cacheLimpiar_() { try { CacheService.getScriptCache().remove("cat"); } catch (e) {} }
function ultimoPedido_() {
  const v = CacheService.getScriptCache().get("ult");
  if (v) { try { const o = JSON.parse(v); return {ult: o.id, t: o.t}; } catch (e) {} }
  return {ult: "", t: 0};
}
function carpetaFotos_() {
  const props = PropertiesService.getScriptProperties(), idc = props.getProperty("CARPETA_FOTOS");
  if (idc) { try { return DriveApp.getFolderById(idc); } catch (e) {} }
  const f = DriveApp.createFolder("Fotos de productos - " + config_().negocio);
  props.setProperty("CARPETA_FOTOS", f.getId());
  return f;
}
function siguienteCodigo_(todos) {
  const n = todos.reduce(function (m, x) { const k = /^P-(\d+)$/i.exec(String(x.codigo || "")); return k ? Math.max(m, Number(k[1])) : m; }, 0) + 1;
  return "P-" + String(n).padStart(3, "0");
}
// Se ejecuta UNA vez después de actualizar el código: agrega la columna Código, numera los productos y crea la carpeta de fotos.
function actualizarHoja() {
  const sh = hoja_("Productos"), cols = HOJAS.Productos, ci = cols.indexOf("codigo");
  sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight("bold");
  sh.getRange(1, ci + 1, sh.getMaxRows(), 1).setNumberFormat("@");
  const vals = sh.getDataRange().getValues(), usados = {};
  let mx = 0;
  for (let i = 1; i < vals.length; i++) { const c = String(vals[i][ci] || ""); const k = /^P-(\d+)$/i.exec(c); if (k) mx = Math.max(mx, Number(k[1])); }
  const col = [];
  for (let i = 1; i < vals.length; i++) {
    let c = String(vals[i][ci] || "");
    if (!c && vals[i][0] !== "") { mx++; c = "P-" + String(mx).padStart(3, "0"); }
    col.push([c]);
  }
  if (col.length) sh.getRange(2, ci + 1, col.length, 1).setValues(col);
  const filas = leer_("Config");
  if (!filas.some(function (x) { return x.clave === "min_mayor"; })) agregar_("Config", {clave: "min_mayor", valor: "5"});
  carpetaFotos_();
  return "ok";
}

function estado_() {
  return {
    ok: true, config: config_(),
    products: leer_("Productos").map(producto_),
    orders: leer_("Pedidos").map(pedidoObj_),
    expenses: leer_("Gastos").map(function (g) { return {id: Number(g.id), fecha: g.fecha, categoria: g.categoria, descripcion: g.descripcion, monto: Number(g.monto), pago: g.pago || "Efectivo"}; }),
    clientes: hoja_("Agenda") ? leer_("Agenda").map(clienteObj_) : [],
    codigos: leer_("Clientes").map(function (c) { return {codigo: String(c.codigo), nombre: String(c.nombre)}; }),
    cierres: leer_("Cierres").map(function (c) { return {fecha: c.fecha, ventas: Number(c.ventas), gastos: Number(c.gastos), efectivo_esperado: Number(c.efectivo_esperado), efectivo_contado: Number(c.efectivo_contado), diferencia: Number(c.diferencia), notas: c.notas, fondo: Number(c.fondo) || 0, cobros_efectivo: Number(c.cobros_efectivo) || 0, gastos_efectivo: Number(c.gastos_efectivo) || 0}; })
  };
}

// Los precios SIEMPRE se toman de la hoja, nunca del navegador del cliente.
function pedido_(r) {
  const productos = leer_("Productos");
  const may = r.mayor === true, minMay = Number(config_().min_mayor) || 5;
  const pago = txt_(r.pago, 40), bs = PBS.indexOf(pago) > -1;
  if (may && !/efectivo/i.test(pago)) throw new Error("La compra mayorista es solo en efectivo");
  const items = [];
  (r.items || []).forEach(function (l) {
    const p = productos.filter(function (x) { return Number(x.id) === Number(l.id) && String(x.activo).toUpperCase() !== "NO"; })[0];
    const q = Math.floor(Number(l.q));
    if (!p || !(q > 0) || q > 99) throw new Error("Producto inválido");
    if (String(p.proximo).toUpperCase() === "SI") throw new Error("Próximo a llegar, consultar: " + p.nombre);
    if (Number(p.stock) < q) throw new Error("Sin stock suficiente: " + p.nombre);
    const up = may ? Number(p.mayor) : (bs ? (Number(p.bcv) || Number(p.precio)) : Number(p.precio));
    if (!(up > 0)) throw new Error("Consultar precio por WhatsApp: " + p.nombre);
    items.push({id: Number(p.id), n: p.nombre + (p.sabor ? " – " + p.sabor : ""), q: q, p: up, c: Number(p.costo), m: String(p.marca || ""), _p: p});
  });
  if (!items.length) throw new Error("El carrito está vacío");
  if (may && items.reduce(function (a, i) { return a + i.q; }, 0) < minMay) throw new Error("La compra mayorista requiere al menos " + minMay + " unidades");
  const cliente = txt_(r.cliente, 80);
  if (!cliente) throw new Error("Falta el nombre");
  items.forEach(function (i) { i._p.stock = Number(i._p.stock) - i.q; escribir_("Productos", i._p); });
  const limpios = items.map(function (i) { return {id: i.id, n: i.n, q: i.q, p: i.p, c: i.c, m: i.m}; });
  const total = Math.round(limpios.reduce(function (a, i) { return a + i.p * i.q; }, 0) * 100) / 100;
  const ganancia = Math.round(limpios.reduce(function (a, i) { return a + (i.p - i.c) * i.q; }, 0) * 100) / 100;
  const id = "PED-" + (leer_("Pedidos").reduce(function (m, x) { const k = /^PED-(\d+)$/.exec(String(x.id)); return k ? Math.max(m, Number(k[1])) : m; }, 1000) + 1);
  const tipo = may ? "Mayorista" : (bs ? "Detal · Bs (BCV)" : "Detal · Divisas");
  const email = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(r.email || "").trim()) ? String(r.email).trim() : "";
  const fecha = new Date().toISOString();
  const nota = siguienteNota_();
  const ped = {id: id, fecha: fecha, cliente: cliente, telefono: txt_(r.telefono, 30), entrega: txt_(r.entrega, 40), direccion: txt_(r.direccion, 160), pago: pago, items: JSON.stringify(limpios), total: total, estado: "Pendiente", fecha_pago: "", ganancia: ganancia, tipo: tipo, email: email, nota: nota, nota_url: "", codigo: ""};
  agregar_("Pedidos", ped);
  try { CacheService.getScriptCache().put("ult", JSON.stringify({id: id, t: Date.now()}), 21600); } catch (e) {}
  // Nota de entrega en PDF: se guarda en Drive y se envía al correo del cliente (si lo dio). Nunca bloquea el pedido.
  let notaUrl = "", enviada = false;
  try {
    const pdf = notaPdf_(ped, limpios, bs || false);
    const arch = carpetaNotas_().createFile(pdf);
    try { if (config_().notas_publicas !== "NO") arch.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e1) {}
    notaUrl = arch.getUrl();
    const f = leer_("Pedidos").filter(function (x) { return x.id === id; })[0];
    if (f) { f.nota_url = notaUrl; escribir_("Pedidos", f); }
    const cfg = config_();
    if (email) {
      MailApp.sendEmail({to: email, bcc: cfg.correo || "", subject: "Nota de entrega #" + nota + " - " + cfg.negocio,
        htmlBody: "<p>Hola " + esc_(cliente) + ",</p><p>Gracias por tu pedido. Adjuntamos tu <b>nota de entrega #" + nota + "</b> por <b>$" + total.toFixed(2) + "</b>.</p><p>" + esc_(cfg.negocio) + " · WhatsApp " + cfg.whatsapp + "</p>",
        attachments: [pdf], name: cfg.negocio});
      enviada = true;
    }
  } catch (err) { /* el pedido ya quedó guardado */ }
  return {ok: true, id: id, items: limpios, total: total, tipo: tipo, fecha: fecha, nota: nota, nota_url: notaUrl, nota_enviada: enviada, config: config_()};
}

function siguienteNota_() {
  const filas = leer_("Config"), ex = filas.filter(function (x) { return x.clave === "nota_siguiente"; })[0];
  const n = ex ? (Number(ex.valor) || NOTA_INICIAL) : NOTA_INICIAL;
  if (ex) { ex.valor = String(n + 1); escribir_("Config", ex); } else agregar_("Config", {clave: "nota_siguiente", valor: String(n + 1)});
  return n;
}
function carpetaNotas_() {
  const props = PropertiesService.getScriptProperties(), idc = props.getProperty("CARPETA_NOTAS");
  if (idc) { try { return DriveApp.getFolderById(idc); } catch (e) {} }
  const f = DriveApp.createFolder("Notas de entrega - " + config_().negocio);
  props.setProperty("CARPETA_NOTAS", f.getId());
  return f;
}
function esc_(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;"}[c]; }); }
function m2_(n) { return Number(n || 0).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, "."); }

function logoHtml_(cfg) {
  try {
    if (cfg.logo_url) {
      const b = UrlFetchApp.fetch(cfg.logo_url, {muteHttpExceptions: true}).getBlob();
      return '<img height="60" src="data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) + '">';
    }
  } catch (e) {}
  return '<b style="font-size:20px">' + esc_(cfg.legal || cfg.negocio) + '</b>';
}
function notaPdf_(o, items, bs) {
  const cfg = config_(), tasa = cfg.tasa, f = new Date(o.fecha);
  const fecha = Utilities.formatDate(f, Session.getScriptTimeZone(), "dd/MM/yyyy");
  const filas = items.map(function (i) {
    return '<tr><td style="padding:7px;border-bottom:1px solid #ccd">' + esc_(i.n) + (i.m ? '<br><span style="font-size:10px;color:#5b6575">Marca: ' + esc_(i.m) + '</span>' : '') + '</td><td align="right" style="padding:7px;border-bottom:1px solid #ccd">' + i.q + '</td><td align="right" style="padding:7px;border-bottom:1px solid #ccd">' + m2_(i.p) + ' $</td><td align="right" style="padding:7px;border-bottom:1px solid #ccd">' + m2_(i.p * i.q) + ' $</td></tr>';
  }).join("");
  const logo = logoHtml_(cfg);
  const html = '<html><body style="font-family:Arial,sans-serif;font-size:12px;color:#10141c">' +
    '<table width="100%"><tr><td>' + logo + '</td><td align="right" style="font-size:11px"><b style="font-size:14px">' + esc_(cfg.legal || cfg.negocio) + '</b><br>Rif: ' + esc_(cfg.rif) + '<br>' + esc_(cfg.correo) + '<br>+' + esc_(cfg.whatsapp) + '<br>IG: @' + esc_(cfg.instagram) + '</td></tr></table>' +
    '<div style="background:#00a5d6;color:#fff;text-align:center;padding:4px;margin-top:6px;font-size:10px;letter-spacing:1px">' + esc_(cfg.lema) + '</div>' +
    '<h2 style="text-align:center;letter-spacing:2px;margin:18px 0">NOTA DE ENTREGA</h2>' +
    '<table width="100%"><tr><td><b>Para</b><br>' + esc_(o.cliente) + '<br>' + esc_(o.telefono) + '</td><td align="right"><b>Nota de entrega #</b> ' + o.nota + '<br><b>Fecha</b> ' + fecha + '<br><b>Tipo</b> ' + esc_(o.tipo) + '</td></tr></table><br>' +
    '<table width="100%" cellspacing="0"><tr style="background:#071c51;color:#fff"><th align="left" style="padding:7px">Artículo</th><th align="right" style="padding:7px">Cantidad</th><th align="right" style="padding:7px">Precio</th><th align="right" style="padding:7px">Importe</th></tr>' + filas + '</table><br>' +
    '<table align="right" width="260"><tr><td>Total parcial</td><td align="right">' + m2_(o.total) + ' $</td></tr><tr><td>TAX (0%)</td><td align="right">(0,00 $)</td></tr><tr><td style="border-top:2px solid #071c51"><b>Total General</b></td><td align="right" style="border-top:2px solid #071c51"><b>' + m2_(o.total) + ' $</b></td></tr>' +
    (bs ? '<tr><td>Equivale a (tasa BCV ' + m2_(tasa) + ')</td><td align="right">Bs. ' + m2_(o.total * tasa) + '</td></tr>' : '') + '</table><br><br><br>' +
    '<p style="font-size:10px;color:#5b6575;text-align:center;clear:both">Forma de pago: ' + esc_(o.pago) + ' · Entrega: ' + esc_(o.entrega) + '<br>¡Gracias por tu compra!</p></body></html>';
  return Utilities.newBlob(html, "text/html", "n.html").getAs("application/pdf").setName("Nota de entrega " + o.nota + " - " + String(o.cliente).replace(/[\\\/:*?"<>|]/g, "") + ".pdf");
}

function producto_(r) {
  return {id: Number(r.id), nombre: r.nombre, categoria: r.categoria, emoji: r.emoji, imagenes: r.imagenes, descripcion: r.descripcion, especificaciones: r.especificaciones,
    costo: Number(r.costo), precio: Number(r.precio), stock: Number(r.stock), minimo: Number(r.minimo), activo: String(r.activo).toUpperCase() !== "NO",
    marca: r.marca || "", bcv: Number(r.bcv) || 0, mayor: Number(r.mayor) || 0, proximo: String(r.proximo).toUpperCase() === "SI", codigo: String(r.codigo || ""), sabor: String(r.sabor || "")};
}
function pedidoObj_(r) {
  let items = []; try { items = JSON.parse(r.items || "[]"); } catch (e) {}
  return {id: r.id, fecha: r.fecha, cliente: r.cliente, telefono: r.telefono, entrega: r.entrega, direccion: r.direccion, pago: r.pago, items: items, total: Number(r.total), estado: r.estado, fecha_pago: r.fecha_pago, tipo: r.tipo, nota: r.nota, nota_url: r.nota_url, email: r.email, credito: String(r.credito).toUpperCase() === "SI", cuotas: Number(r.cuotas) || 0, abonado: Number(r.abonado) || 0, pagos: jsonArr_(r.pagos), venc: jsonArr_(r.venc)};
}
function jsonArr_(s) {
  try { const a = JSON.parse(s || "[]"); return Array.isArray(a) ? a : []; } catch (e) { return []; }
}
function clienteObj_(r) {
  return {id: Number(r.id), nombre: String(r.nombre), telefono: String(r.telefono), direccion: String(r.direccion), notas: String(r.notas), fecha: r.fecha};
}
function config_() {
  const c = {};
  leer_("Config").forEach(function (r) { c[r.clave] = r.valor; });
  const lista = function (s) { return String(s || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean); };
  return {negocio: c.negocio || "Tienda", intro: c.intro || "", titulo: c.titulo || "", tasa: Number(c.tasa) || 1, whatsapp: String(c.whatsapp || ""), entregas: lista(c.entregas), pagos: lista(c.pagos),
    rif: c.rif || "", correo: c.correo || "", instagram: c.instagram || "", sitio: c.sitio || "", legal: c.legal || "", tiktok: c.tiktok || "", lema: c.lema || "", ciudad: c.ciudad || "", color: c.color || "#0a86b8", logo_url: c.logo_url || "",
    mod_tienda: c.mod_tienda || "SI", mod_mayorista: c.mod_mayorista || "SI", mod_credito: c.mod_credito || "SI", mod_sabores: c.mod_sabores || "SI", notas_publicas: c.notas_publicas || "SI", min_mayor: Math.max(1, Number(c.min_mayor) || 5)};
}

/* ================= UTILIDADES ================= */
// La clave maestra de JB NOVA NO va en el código: se guarda como propiedad del script (MASTER_KEY).
function claveMaestra_() { return String(PropertiesService.getScriptProperties().getProperty("MASTER_KEY") || ""); }
function pinOk_(pin) {
  const p = String(pin || "");
  return (claveMaestra_() !== "" && p === claveMaestra_()) || p === String(PropertiesService.getScriptProperties().getProperty("ADMIN_PIN"));
}
function verificarPin_(pin) {
  const cache = CacheService.getScriptCache();
  const fallos = Number(cache.get("fallos") || 0);
  if (fallos >= 10) throw new Error("Demasiados intentos. Esperá unos minutos.");
  if (!pinOk_(pin)) {
    cache.put("fallos", String(fallos + 1), 600);
    throw new Error("PIN incorrecto");
  }
}
function conLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function salida_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function txt_(s, n) { return String(s == null ? "" : s).trim().slice(0, n); }
function hoja_(n) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(n); }

function leer_(nombre) {
  const sh = hoja_(nombre), vals = sh.getDataRange().getValues(), h = vals[0], out = [];
  for (let i = 1; i < vals.length; i++) {
    if (vals[i].every(function (v) { return v === ""; })) continue;
    const o = {_fila: i + 1};
    h.forEach(function (c, j) { const v = vals[i][j]; o[c] = v instanceof Date ? v.toISOString() : v; });
    out.push(o);
  }
  return out;
}
function fila_(nombre, o) { return HOJAS[nombre].map(function (c) { return o[c] === undefined ? "" : o[c]; }); }
function agregar_(nombre, o) {
  const sh = hoja_(nombre);
  sh.getRange(sh.getLastRow() + 1, 1, 1, HOJAS[nombre].length).setValues([fila_(nombre, o)]);
}
function escribir_(nombre, o) {
  hoja_(nombre).getRange(o._fila, 1, 1, HOJAS[nombre].length).setValues([fila_(nombre, o)]);
}

/* ================= FORMATO DE LA PLANILLA ================= */
const USD = "$#,##0.00";
const ANCHOS = {
  Productos: {id: 50, nombre: 250, categoria: 130, emoji: 60, imagenes: 220, descripcion: 260, especificaciones: 260, costo: 85, precio: 85, stock: 70, minimo: 75, activo: 70, marca: 130, bcv: 85, mayor: 85, proximo: 80},
  Pedidos: {id: 90, fecha: 170, cliente: 150, telefono: 110, entrega: 130, direccion: 180, pago: 120, items: 220, total: 85, estado: 100, fecha_pago: 170, ganancia: 90, tipo: 150, email: 170, nota: 60, nota_url: 200, codigo: 110},
  Clientes: {codigo: 130, nombre: 240, telefono: 120, activo: 70},
  Agenda: {id: 50, nombre: 220, telefono: 120, direccion: 260, notas: 260, fecha: 150},
  Gastos: {id: 120, fecha: 100, categoria: 150, descripcion: 300, monto: 90},
  Cierres: {fecha: 100, ventas: 90, gastos: 90, efectivo_esperado: 130, efectivo_contado: 130, diferencia: 90, notas: 280},
  Config: {clave: 120, valor: 520}
};
const CATEGORIAS_GASTO = ["Mercadería", "Delivery / envíos", "Publicidad", "Local / servicios", "Sueldos", "Otros"];

function embellecer_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const colores = {Productos: "#00a5d6", Pedidos: "#e58e00", Gastos: "#d93a3a", Cierres: "#13a05a", Config: "#5b6575", Clientes: "#00a5d6", Agenda: "#00a5d6"};
  const usdCols = {Productos: ["costo", "precio", "bcv", "mayor"], Pedidos: ["total", "ganancia"], Clientes: [], Agenda: [], Gastos: ["monto"], Cierres: ["ventas", "gastos", "efectivo_esperado", "efectivo_contado", "diferencia"], Config: []};
  const recortar = ["imagenes", "descripcion", "especificaciones", "items", "direccion", "notas", "valor", "nota_url"];
  Object.keys(HOJAS).forEach(function (n) {
    const sh = ss.getSheetByName(n), cols = HOJAS[n], nc = cols.length, filas = sh.getMaxRows();
    sh.setTabColor(colores[n]);
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 34);
    sh.getRange(1, 1, 1, nc).setBackground("#071c51").setFontColor("#ffffff").setFontWeight("bold").setVerticalAlignment("middle");
    cols.forEach(function (c, i) { sh.setColumnWidth(i + 1, ANCHOS[n][c] || 110); });
    sh.getRange(2, 1, filas - 1, nc).setVerticalAlignment("middle").setFontSize(10);
    sh.getBandings().forEach(function (b) { b.remove(); });
    sh.getRange(2, 1, filas - 1, nc).applyRowBanding(SpreadsheetApp.BandingTheme.LIGHT_GREY, false, false);
    cols.forEach(function (c, i) {
      const rg = sh.getRange(2, i + 1, filas - 1, 1);
      if (usdCols[n].indexOf(c) > -1) rg.setNumberFormat(USD);
      if (recortar.indexOf(c) > -1) rg.setWrapStrategy(SpreadsheetApp.WrapStrategy.CLIP);
    });
  });

  const lista = function (vals, estricto) { return SpreadsheetApp.newDataValidation().requireValueInList(vals, true).setAllowInvalid(!estricto).build(); };
  const p = ss.getSheetByName("Productos"), ped = ss.getSheetByName("Pedidos"), gas = ss.getSheetByName("Gastos");
  const col = function (n, c) { return HOJAS[n].indexOf(c) + 1; };
  p.getRange(2, col("Productos", "activo"), p.getMaxRows() - 1, 1).setDataValidation(lista(["SI", "NO"], true)).setHorizontalAlignment("center");
  p.getRange(2, col("Productos", "proximo"), p.getMaxRows() - 1, 1).setDataValidation(lista(["SI", "NO"], true)).setHorizontalAlignment("center");
  p.getRange(2, col("Productos", "emoji"), p.getMaxRows() - 1, 1).setHorizontalAlignment("center").setFontSize(14);
  p.getRange(2, col("Productos", "stock"), p.getMaxRows() - 1, 2).setNumberFormat("0").setHorizontalAlignment("center");
  ped.getRange(2, col("Pedidos", "estado"), ped.getMaxRows() - 1, 1).setDataValidation(lista(ESTADOS, true)).setHorizontalAlignment("center").setFontWeight("bold");
  gas.getRange(2, col("Gastos", "categoria"), gas.getMaxRows() - 1, 1).setDataValidation(lista(CATEGORIAS_GASTO, false));

  // Colores condicionales
  const pf = p.getMaxRows();
  p.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($B2<>"",$J2<>"",$J2<=$K2)').setBackground("#fde2e2").setFontColor("#b42318").setBold(true).setRanges([p.getRange(2, 10, pf - 1, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$L2="NO"').setFontColor("#98a2b3").setRanges([p.getRange(2, 1, pf - 1, HOJAS.Productos.length)]).build()
  ]);
  const er = ped.getRange(2, col("Pedidos", "estado"), ped.getMaxRows() - 1, 1);
  const est = function (t, bg, fg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(bg).setFontColor(fg).setRanges([er]).build(); };
  ped.setConditionalFormatRules([est("Pendiente", "#fff1d6", "#9a5b00"), est("Pagado", "#dbe4ff", "#1d3fd8"), est("Entregado", "#d6f5e3", "#0b7a43"), est("Cancelado", "#e5e7eb", "#5b6575")]);
}

/* ================= HOJA RESUMEN ================= */
function resumen_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName("Resumen");
  if (sh) { sh.clear(); sh.clearConditionalFormatRules(); } else sh = ss.insertSheet("Resumen", 0);
  sh.setHiddenGridlines(true);
  sh.setTabColor("#10141c");
  sh.setColumnWidth(1, 20);
  for (let c = 2; c <= 9; c++) sh.setColumnWidth(c, 130);
  sh.setColumnWidth(10, 20);
  sh.getRange("M1").setFormula('=YEAR(TODAY())&"-"&TEXT(MONTH(TODAY()),"00")');
  sh.hideColumns(13);

  const R = function (hoja, c, fin) { return hoja + "!$" + c + "$2:$" + c + "$" + (fin || 5000); };
  const mes = "$M$1&\"*\"";
  const cobrado = function (colSuma) {
    return "=SUMIFS(" + R("Pedidos", colSuma) + "," + R("Pedidos", "J") + ',"Pagado",' + R("Pedidos", "K") + "," + mes + ")+SUMIFS(" + R("Pedidos", colSuma) + "," + R("Pedidos", "J") + ',"Entregado",' + R("Pedidos", "K") + "," + mes + ")";
  };
  const bajo = "(" + R("Productos", "B", 1000) + '<>"")*(' + R("Productos", "J", 1000) + "<=" + R("Productos", "K", 1000) + ")*(" + R("Productos", "L", 1000) + '<>"NO")';

  sh.getRange("B2:I2").merge().setValue("Resumen del negocio").setFontSize(22).setFontWeight("bold").setFontColor("#071c51");
  sh.getRange("B3:I3").merge().setFormula('="Panel de "&IFERROR(VLOOKUP("negocio",Config!$A$2:$B$50,2,FALSE),"tu negocio")&"  ·  Mes en curso: "&$M$1').setFontColor("#5b6575");
  sh.setRowHeight(2, 40);

  const tiles = [
    [5, 0, "Cobrado este mes", cobrado("I"), USD, "Pedidos pagados y entregados"],
    [5, 1, "Ganancia bruta del mes", cobrado("L"), USD, "Venta menos costo de producto"],
    [5, 2, "Gastos del mes", "=SUMIFS(" + R("Gastos", "E") + "," + R("Gastos", "B") + "," + mes + ")", USD, "Hoja Gastos"],
    [5, 3, "Ganancia neta del mes", "=D6-F6", USD, "Ganancia bruta menos gastos"],
    [9, 0, "Pedidos pendientes", '=COUNTIF(' + R("Pedidos", "J") + ',"Pendiente")', "0", "Esperando confirmar pago"],
    [9, 1, "Pedidos del mes", "=COUNTIFS(" + R("Pedidos", "B") + "," + mes + ")-COUNTIFS(" + R("Pedidos", "B") + "," + mes + "," + R("Pedidos", "J") + ',"Cancelado")', "0", "Sin contar cancelados"],
    [9, 2, "Valor del inventario", "=SUMPRODUCT(" + R("Productos", "H", 1000) + "," + R("Productos", "J", 1000) + ")", USD, "Stock a precio de costo"],
    [9, 3, "Productos con stock bajo", "=SUMPRODUCT(" + bajo + ")", "0", "Igual o menor al mínimo"]
  ];
  tiles.forEach(function (t) {
    const r = t[0], c = 2 + t[1] * 2;
    sh.getRange(r, c, 1, 2).merge().setValue(t[2]).setFontSize(10).setFontColor("#5b6575");
    sh.getRange(r + 1, c, 1, 2).merge().setFormula(t[3]).setNumberFormat(t[4]).setFontSize(24).setFontWeight("bold").setFontColor("#10141c");
    sh.getRange(r + 2, c, 1, 2).merge().setValue(t[5]).setFontSize(9).setFontColor("#98a2b3");
    const box = sh.getRange(r, c, 3, 2);
    box.setBackground("#f4f6fa").setHorizontalAlignment("left").setVerticalAlignment("middle");
    box.setBorder(true, true, true, true, false, false, "#ffffff", SpreadsheetApp.BorderStyle.SOLID_THICK);
    sh.setRowHeight(r + 1, 44);
  });
  sh.getRange("H6").setFontColor("#13a05a");
  sh.setConditionalFormatRules([SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor("#d93a3a").setRanges([sh.getRange("H6")]).build()]);

  sh.getRange("B13").setValue("Stock bajo o agotado").setFontSize(13).setFontWeight("bold");
  sh.getRange("B14").setFormula('=IFERROR(FILTER(' + R("Productos", "B", 1000) + '&"  ·  "&' + R("Productos", "J", 1000) + '&" uds.",' + bajo + '),"Todo el stock está en orden")');
  sh.getRange("F13").setValue("Cobrado por forma de pago").setFontSize(13).setFontWeight("bold");
  sh.getRange("F14").setFormula('=IFERROR(QUERY(Pedidos!$A$1:$Q$5000,"select G, sum(I) where J=\'Pagado\' or J=\'Entregado\' group by G order by sum(I) desc label G \'Forma de pago\', sum(I) \'USD\'",1),"Todavía no hay cobros")');
  sh.getRange("G14:G30").setNumberFormat(USD);
  sh.getRange("F14:G14").setFontWeight("bold").setBackground("#10141c").setFontColor("#ffffff");
  sh.getRange("B31").setValue("Las cifras se calculan solas con las hojas Pedidos, Gastos y Productos. No hace falta editar esta hoja.").setFontColor("#98a2b3").setFontSize(9);
}

/* ================= EDICIÓN DIRECTA EN LA PLANILLA ================= */
// Se ejecuta sola cuando alguien edita a mano. Mantiene los datos consistentes.
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    const sh = e.range.getSheet(), nombre = sh.getName(), r = e.range;
    if (r.getRow() < 2) return;
    if (nombre === "Productos") autoProductos_(sh, r);
    else if (nombre === "Pedidos" && r.getNumRows() === 1 && r.getNumColumns() === 1) autoPedido_(sh, r, e.oldValue);
  } catch (err) { /* nunca interrumpir la edición */ }
}

// Producto nuevo escrito a mano: le pone número de id y valores por defecto.
function autoProductos_(sh, r) {
  const n = HOJAS.Productos.length, ult = sh.getLastRow();
  if (ult < 2) return;
  const datos = sh.getRange(2, 1, ult - 1, n).getValues();
  let maxId = 0;
  datos.forEach(function (f) { maxId = Math.max(maxId, Number(f[0]) || 0); });
  for (let fila = r.getRow(); fila < r.getRow() + r.getNumRows(); fila++) {
    if (fila < 2 || fila > ult) continue;
    const f = datos[fila - 2];
    if (String(f[1]).trim() === "" || String(f[0]).trim() !== "") continue;
    sh.getRange(fila, 1).setValue(++maxId);
    if (f[3] === "") sh.getRange(fila, 4).setValue("📦");
    if (f[9] === "") sh.getRange(fila, 10).setValue(0);
    if (f[10] === "") sh.getRange(fila, 11).setValue(5);
    if (f[11] === "") sh.getRange(fila, 12).setValue("SI");
    if (f[15] === "") sh.getRange(fila, 16).setValue("NO");
  }
}

// Cambio de estado hecho a mano en la hoja Pedidos: mismas reglas que el panel.
function autoPedido_(sh, r, anterior) {
  const cE = HOJAS.Pedidos.indexOf("estado") + 1;
  if (r.getColumn() !== cE) return;
  const nuevo = String(r.getValue()), fila = r.getRow();
  const ant = anterior == null ? "" : String(anterior);
  if (ant === "Cancelado" && nuevo !== "Cancelado") {
    r.setValue("Cancelado");
    SpreadsheetApp.getActive().toast("Un pedido cancelado no se puede reactivar. Hacé un pedido nuevo.", "Panel", 6);
    return;
  }
  if (nuevo === "Cancelado" && ant !== "Cancelado") {
    let items = [];
    try { items = JSON.parse(sh.getRange(fila, HOJAS.Pedidos.indexOf("items") + 1).getValue() || "[]"); } catch (x) {}
    const ps = SpreadsheetApp.getActive().getSheetByName("Productos");
    const ult = ps.getLastRow();
    if (ult >= 2) {
      const ids = ps.getRange(2, 1, ult - 1, 1).getValues();
      items.forEach(function (i) {
        for (let k = 0; k < ids.length; k++) {
          if (Number(ids[k][0]) === i.id) {
            const c = ps.getRange(k + 2, 10);
            c.setValue((Number(c.getValue()) || 0) + i.q);
            break;
          }
        }
      });
    }
    SpreadsheetApp.getActive().toast("Pedido cancelado. El stock volvió al inventario.", "Panel", 5);
  }
  if ((nuevo === "Pagado" || nuevo === "Entregado")) {
    const cF = sh.getRange(fila, HOJAS.Pedidos.indexOf("fecha_pago") + 1);
    if (String(cF.getValue()) === "") cF.setValue(new Date().toISOString());
  }
}

const SEED = "H4sIAP47BGsC/4uONtRRUAooyk8pTS7JV3DNSs0tyMlXMFQCivomFiUnKkSAmM6JJanp+UWH1yYqOIL4H+ZPXgaiQdgltTi5KLMgOfPw5jyFlFSFVIgZenAjrBQQJlnoKBgaAbGBjoKljoIRkDLVUTCI1VGINsLmDiNaucPQBGK7EZA2NIc4CuYSY2wuMUa4JBLNJU4QlyzfQrJLQCaZggMFGBhmekCmsQEkcMAOMcHmEBOEQ6KwO2T2JJIdAjLJyAhivbEZkA3EZtAQiQUAoO3NcyQCAAA=";
