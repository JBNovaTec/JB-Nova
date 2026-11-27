/**
 * JB NOVA · Paquetes de preguntas de Novi (USO INTERNO, NO SE DEJA EN EL CLIENTE)
 * Archivo generado por herramientas/armar.py a partir de novi/paquetes/. No editar a mano.
 *
 * Cómo usarlo al instalar un cliente:
 * 1) En el proyecto de Apps Script del cliente: + Archivo > Script, nombre "NoviPaquetes", pegar todo esto.
 * 2) Elegir los paquetes en PAQUETES_ELEGIDOS (siempre "general" + el rubro del cliente).
 * 3) Ejecutar la función cargarPaquetesNovi. Copia las preguntas a la hoja Novi_FAQ y los sinónimos a Novi_Sinonimos.
 *    Se puede ejecutar de nuevo: no duplica lo que ya está.
 * 4) BORRAR este archivo del proyecto del cliente.
 * 5) En la hoja Novi_FAQ, completar lo que dice [EDITAR: ...]. Mientras una respuesta tenga [EDITAR,
 *    Novi no la usa con los clientes.
 *
 * Paquetes disponibles: "bodega", "comida", "general", "ropa-calzado", "suplementos"
 */
const PAQUETES_ELEGIDOS = ["general"];

function cargarPaquetesNovi() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const faq = ss.getSheetByName("Novi_FAQ"), sin = ss.getSheetByName("Novi_Sinonimos");
  if (!faq || !sin) throw new Error("Primero ejecutá setup (crea las hojas Novi_FAQ y Novi_Sinonimos).");
  const yaF = {}, yaS = {};
  faq.getDataRange().getValues().slice(1).forEach(function (r) { yaF[String(r[3]) + "|" + String(r[0])] = 1; });
  sin.getDataRange().getValues().slice(1).forEach(function (r) { yaS[String(r[0]).toLowerCase()] = 1; });
  const nf = [], ns = [];
  PAQUETES_ELEGIDOS.forEach(function (n) {
    const p = NOVI_BIBLIOTECA[n];
    if (!p) throw new Error("No existe el paquete: " + n);
    p.preguntas.forEach(function (q) { if (!yaF[n + "|" + q[0]]) { nf.push([q[0], q[1], q[2], n, "SI"]); yaF[n + "|" + q[0]] = 1; } });
    Object.keys(p.sinonimos).forEach(function (a) { if (!yaS[a.toLowerCase()]) { ns.push([a, p.sinonimos[a]]); yaS[a.toLowerCase()] = 1; } });
  });
  if (nf.length) faq.getRange(faq.getLastRow() + 1, 1, nf.length, 5).setValues(nf);
  if (ns.length) sin.getRange(sin.getLastRow() + 1, 1, ns.length, 2).setValues(ns);
  return "Preguntas agregadas: " + nf.length + " · Sinónimos agregados: " + ns.length;
}

const NOVI_BIBLIOTECA = {
 "bodega": {
  "titulo": "Bodega / víveres",
  "preguntas": [
   [
    "¿Venden fiado?",
    "fian, venden fiado, fiado, me fian, anotar en la cuenta, cuenta abierta",
    "[EDITAR: Solo fiamos a clientes de confianza con cuenta abierta. Pregunta en la tienda.]"
   ],
   [
    "Detallado / suelto",
    "detallado, suelto, por unidad, al detal, una sola, venden suelto, por pieza",
    "[EDITAR: Sí, vendemos al detal por unidad, y también por bulto o caja.]"
   ],
   [
    "Por bulto o caja",
    "bulto, por bulto, caja, por caja, paca, fardo, por paca",
    "[EDITAR: Vendemos por bulto o caja con mejor precio.] Al mayor, desde {min_mayor} unidades en efectivo."
   ],
   [
    "Vencimiento",
    "vencimiento, fecha de vencimiento, vencido, esta vencido, caduca",
    "[EDITAR: Revisamos las fechas de vencimiento todos los días. Si un producto te llega vencido, te lo cambiamos.]"
   ],
   [
    "Charcutería por peso",
    "charcuteria, por peso, por kilo, medio kilo, cortan, rebanado, queso, jamon, fiambre",
    "[EDITAR: En charcutería vendemos por peso (desde 100 g) y te lo cortamos al momento.]"
   ],
   [
    "Pan",
    "pan, pan fresco, a que hora llega el pan, canilla, pan dulce",
    "[EDITAR: El pan fresco llega todos los días a las 7:00 am y a las 4:00 pm.]"
   ],
   [
    "Hielo y bebidas frías",
    "hielo, bolsa de hielo, bebidas frias, refresco frio, cerveza fria, frio",
    "[EDITAR: Sí, tenemos hielo y bebidas frías.]"
   ],
   [
    "Gas",
    "gas, bombona, bombonas, recarga de gas",
    "[EDITAR: No vendemos gas.]"
   ],
   [
    "Recargas",
    "recarga, recargas, saldo movistar, saldo digitel, saldo movilnet, recargar saldo",
    "[EDITAR: Hacemos recargas Movistar, Digitel y Movilnet.]"
   ],
   [
    "Pago móvil en montos pequeños",
    "pago movil por poquito, monto pequeno, montos pequenos, pago movil minimo, minimo pago movil",
    "[EDITAR: Sí, aceptamos Pago Móvil desde cualquier monto.]"
   ],
   [
    "Delivery mínimo",
    "minimo para delivery, delivery minimo, cuanto para delivery, desde cuanto hacen delivery",
    "[EDITAR: El delivery es gratis desde $15 de compra en la zona; si no, cuesta $1.]"
   ],
   [
    "Bolsas",
    "bolsa, bolsas, traer bolsa, cobran la bolsa",
    "[EDITAR: Las bolsas no tienen costo adicional.]"
   ],
   [
    "Productos importados",
    "importado, importados, de afuera, americano, colombiano",
    "[EDITAR: Tenemos productos nacionales e importados; lo indicamos en cada producto.]"
   ],
   [
    "Precio del día",
    "precio del dia, cambio el precio, subio, subieron, por que subio",
    "Los precios en dólares se mantienen; en bolívares cambian con la tasa BCV del día ({tasa} Bs/$ hoy)."
   ]
  ],
  "sinonimos": {
   "pote": "frasco",
   "potes": "frascos",
   "chucherias": "golosinas",
   "chuches": "golosinas",
   "refrescos": "refresco",
   "frescolita": "refresco",
   "harinapan": "harina pan",
   "caraota": "caraotas",
   "aceite": "aceite",
   "arepa": "harina",
   "papel": "papel higienico",
   "toallin": "papel",
   "jabon": "jabon"
  }
 },
 "comida": {
  "titulo": "Comida / restaurante / comida rápida",
  "preguntas": [
   [
    "Menú",
    "menu, la carta, que tienen, que venden, que hay de comer, que comida",
    "Todo nuestro menú está en esta página con precios en dólares y bolívares. [EDITAR: Si quieres, te mandamos la carta en imagen por WhatsApp.]"
   ],
   [
    "Menú del día",
    "menu del dia, plato del dia, almuerzo, almuerzo del dia, especial del dia, ejecutivo",
    "[EDITAR: El menú del día cambia a diario. Lo publicamos cada mañana en @{instagram}.]"
   ],
   [
    "Horario de cocina",
    "horario de cocina, hasta que hora cocinan, cocina abierta, a que hora sirven, hora de almuerzo, cenas",
    "[EDITAR: La cocina abre de 11:00 am a 10:00 pm.]"
   ],
   [
    "Tiempo de preparación",
    "cuanto tarda, tiempo de preparacion, cuanto se tarda el pedido, demora la comida, cuanto falta",
    "[EDITAR: Los pedidos tardan entre 20 y 35 minutos, según la hora.]"
   ],
   [
    "Costo del delivery",
    "costo del delivery, cuanto cobran de delivery, cuanto es el delivery, delivery gratis, zonas de delivery, hasta donde llegan",
    "[EDITAR: El delivery cuesta $1 en la zona cercana y $2 más lejos. Llegamos hasta ____.]"
   ],
   [
    "Para llevar",
    "para llevar, pick up, lo paso buscando, retirar el pedido",
    "Sí, puedes pedir para llevar y retirarlo en el local. Te avisamos por WhatsApp cuando esté listo."
   ],
   [
    "Ingredientes y alergias",
    "ingredientes, alergia, alergico, alergica, tiene mani, gluten, lactosa, que lleva",
    "[EDITAR: Los ingredientes principales están en la descripción de cada plato.] Si tienes una alergia, avísanos antes de pedir por WhatsApp al +{whatsapp} y te confirmamos qué puedes comer."
   ],
   [
    "Vegetariano",
    "vegetariano, vegetariana, vegano, vegana, sin carne, opciones vegetarianas",
    "[EDITAR: Tenemos algunas opciones sin carne, marcadas en el menú.]"
   ],
   [
    "Picante",
    "picante, pica, salsa picante, sin picante",
    "[EDITAR: Nuestros platos no pican; la salsa picante va aparte.]"
   ],
   [
    "Porciones",
    "porcion, porciones, para cuantas personas, alcanza para, tamano, racion, raciones",
    "[EDITAR: Cada producto indica para cuántas personas alcanza.]"
   ],
   [
    "Combos",
    "combo, combos, promo, promocion, con refresco, incluye bebida",
    "[EDITAR: Los combos incluyen bebida y acompañante. Están en la sección Combos.]"
   ],
   [
    "Reservas",
    "reservar, reserva, reservacion, mesa, mesa para, cumpleanos",
    "[EDITAR: Para reservar una mesa escríbenos por WhatsApp al +{whatsapp} con fecha, hora y número de personas.]"
   ],
   [
    "Eventos y catering",
    "evento, eventos, catering, fiesta, pedido grande, para una reunion, bandejas",
    "[EDITAR: Hacemos pedidos para eventos con 48 horas de anticipación.] Escríbenos al +{whatsapp}."
   ],
   [
    "Pedido con anticipación",
    "pedir para mas tarde, programar pedido, para manana, con anticipacion, encargar",
    "[EDITAR: Sí, puedes dejar tu pedido programado para la hora que quieras.]"
   ],
   [
    "Pagar al recibir",
    "pagar al recibir, pago contra entrega, pago en puerta, pagar cuando llegue",
    "[EDITAR: Puedes pagar en efectivo al recibir; por Pago Móvil, antes de despachar.]"
   ]
  ],
  "sinonimos": {
   "burger": "hamburguesa",
   "burgers": "hamburguesas",
   "perros": "perro",
   "perrito": "perro",
   "pizzas": "pizza",
   "parrilla": "parrilla",
   "chicha": "chicha",
   "refresco": "bebida",
   "refrescos": "bebidas",
   "malta": "bebida",
   "jugo": "bebida",
   "jugos": "bebidas"
  }
 },
 "general": {
  "titulo": "Preguntas generales (todos los negocios)",
  "preguntas": [
   [
    "Horario",
    "horario, a que hora abren, a que hora cierran, hora de apertura, estan abiertos, abren hoy, atienden hoy, hasta que hora, a que hora atienden",
    "[EDITAR: Atendemos de lunes a sábado de 8:00 am a 6:00 pm.]"
   ],
   [
    "Domingos y feriados",
    "domingo, domingos, feriado, feriados, dias festivos, abren el domingo, trabajan el domingo",
    "[EDITAR: Los domingos y feriados no abrimos, pero puedes dejar tu pedido y te lo despachamos el siguiente día hábil.]"
   ],
   [
    "Ubicación",
    "donde estan, direccion, ubicacion, donde queda, como llego, tienen local, tienda fisica, donde los consigo, punto de referencia",
    "Estamos en {ciudad}. [EDITAR: dirección exacta y punto de referencia.]"
   ],
   [
    "Formas de pago",
    "formas de pago, como pago, metodos de pago, que aceptan, puedo pagar con, como se paga, medios de pago",
    "Aceptamos: {pagos}. Los pagos por Pago Móvil y Transferencia se cobran en bolívares a la tasa BCV del día."
   ],
   [
    "Datos de Pago Móvil",
    "datos de pago movil, pago movil, a donde transfiero, datos bancarios, numero de cuenta, cuenta bancaria, a que banco",
    "[EDITAR: Pago Móvil: Banco ____, teléfono ____, C.I./RIF ____.] Después envíanos el capture por WhatsApp al +{whatsapp} con tu número de pedido."
   ],
   [
    "Zelle",
    "zelle, correo zelle, pagar por zelle, aceptan zelle, tienen zelle",
    "[EDITAR: Zelle a nombre de ____, correo ____.] Envíanos el capture al +{whatsapp}."
   ],
   [
    "Dólares en efectivo",
    "efectivo, dolar en efectivo, aceptan dolar, billetes, cash",
    "Sí, aceptamos dólares en efectivo. [EDITAR: El vuelto lo damos en dólares si hay sencillo, o en bolívares.]"
   ],
   [
    "Tasa que usan",
    "a que tasa, tasa que usan, que tasa, precio en bs, cobran en bs, tasa del dia, tasa bcv",
    "Usamos la tasa oficial del BCV del día. Hoy: {tasa} Bs por dólar."
   ],
   [
    "Tarjeta / punto de venta",
    "tarjeta, punto de venta, debito, pagar con tarjeta",
    "[EDITAR: En la tienda aceptamos tarjeta de débito por punto de venta.]"
   ],
   [
    "Binance / USDT",
    "binance, usdt, cripto, criptomonedas",
    "[EDITAR: Sí, aceptamos USDT por Binance Pay. Pídenos los datos por WhatsApp.]"
   ],
   [
    "Delivery",
    "delivery, hacen delivery, a domicilio, llevan, envian a mi casa, despacho",
    "Sí. Formas de entrega: {entregas}. [EDITAR: zonas y costo del delivery.]"
   ],
   [
    "Envíos nacionales",
    "envios nacionales, envian a otra ciudad, mrw, zoom, tealca, encomienda, envio nacional, envian al interior",
    "[EDITAR: Hacemos envíos a todo el país por MRW, Zoom o Tealca. El envío se paga al recibir (cobro en destino).]"
   ],
   [
    "Tiempo de entrega",
    "cuanto tarda, cuando llega, tiempo de entrega, demora, cuanto se tarda, para cuando",
    "[EDITAR: El delivery llega el mismo día si pides antes de las 3:00 pm. Los envíos nacionales tardan de 2 a 4 días hábiles.]"
   ],
   [
    "Retiro en tienda",
    "retirar, buscar en tienda, pick up, paso buscando, lo busco, retiro",
    "Puedes retirar tu pedido en nuestra tienda en {ciudad}. Te avisamos por WhatsApp cuando esté listo."
   ],
   [
    "Cómo comprar",
    "como compro, como hago un pedido, como pido, como comprar, como funciona, como hago la compra",
    "Agrega los productos al carrito en esta página, elige la forma de pago y de entrega, y envía el pedido. Te confirmamos por WhatsApp."
   ],
   [
    "Estado de mi pedido",
    "mi pedido, estado de mi pedido, donde esta mi pedido, ya enviaron, ya salio, rastrear",
    "Escríbenos por WhatsApp al +{whatsapp} con tu número de pedido y te decimos cómo va."
   ],
   [
    "Ya pagué",
    "ya pague, ya transferi, envie el pago, comprobante, capture, ya hice el pago, referencia",
    "¡Gracias! Envía el capture del pago por WhatsApp al +{whatsapp} con tu número de pedido para verificarlo."
   ],
   [
    "Factura o nota",
    "factura, facturan, nota de entrega, recibo, fiscal, comprobante de compra",
    "Con cada compra te enviamos una nota de entrega. [EDITAR: Si necesitas factura fiscal, pídela al hacer tu pedido.]"
   ],
   [
    "Garantía",
    "garantia, tiene garantia, tienen garantia, si sale malo, defecto, defectuoso",
    "[EDITAR: Si el producto llega con un defecto de fábrica, lo cambiamos dentro de los primeros 7 días con su nota de entrega.]"
   ],
   [
    "Cambios y devoluciones",
    "cambio, cambios, devolucion, devoluciones, puedo cambiar, reembolso, devolver",
    "[EDITAR: Aceptamos cambios dentro de los 7 días siguientes a la compra, con el producto sin usar y su nota de entrega. No hacemos reembolsos en efectivo.]"
   ],
   [
    "Precios",
    "precio, precios, lista de precios, catalogo, cuanto cuesta, cuanto vale",
    "Los precios están en esta página, en dólares y en bolívares a la tasa del día. Si no encuentras algo, escríbenos al +{whatsapp}."
   ],
   [
    "Disponibilidad",
    "hay disponible, tienen, les queda, hay stock, disponible, lo tienen",
    "En la página ves si cada producto está Disponible o Agotado. Si está agotado, escríbenos y te avisamos cuando llegue."
   ],
   [
    "Apartar",
    "apartar, reservar, separar, me lo guardan, me lo apartan",
    "[EDITAR: Apartamos productos por 24 horas con un abono del 50%.]"
   ],
   [
    "Encargos",
    "encargo, pedido especial, pueden traer, pueden conseguir, no lo tienen, lo traen",
    "Si no ves lo que buscas, escríbenos al +{whatsapp}: a veces podemos traerlo por encargo."
   ],
   [
    "Al mayor",
    "al mayor, mayorista, precio al mayor, por mayor, distribuidor, revender, para revender",
    "Tenemos precios al mayor desde {min_mayor} unidades, solo en efectivo. Escríbenos al +{whatsapp} y te damos acceso al catálogo mayorista."
   ],
   [
    "Crédito o cuotas",
    "credito, cuotas, fiado, pagar en partes, cashea, financiamiento, a credito",
    "[EDITAR: Ofrecemos compras en cuotas a clientes aprobados. Escríbenos para más información.]"
   ],
   [
    "Compra mínima",
    "compra minima, monto minimo, minimo de compra, hay minimo",
    "[EDITAR: En detal no hay compra mínima.] Al mayor, el mínimo es de {min_mayor} unidades."
   ],
   [
    "Ofertas",
    "descuento, descuentos, oferta, ofertas, promocion, promociones, promo, rebaja",
    "[EDITAR: Esta semana tenemos ____.] Síguenos en Instagram @{instagram} para enterarte de las ofertas."
   ],
   [
    "Redes sociales",
    "instagram, redes, redes sociales, tiktok, facebook, ig",
    "Síguenos en Instagram @{instagram}."
   ],
   [
    "Hablar con una persona",
    "hablar con alguien, asesor, atencion al cliente, una persona, un humano, contacto, whatsapp, telefono, numero",
    "Escríbenos por WhatsApp al +{whatsapp} y te atiende una persona."
   ],
   [
    "¿Es confiable?",
    "es seguro, confiable, estafa, son reales, es real, como se que es real, son serios",
    "Somos {legal} (RIF {rif}). Puedes ver nuestras redes en @{instagram} y escribirnos al +{whatsapp} antes de pagar."
   ],
   [
    "RIF y razón social",
    "rif, razon social, nombre de la empresa",
    "{legal} · RIF {rif}."
   ],
   [
    "Correo",
    "correo, email, mail, correo electronico",
    "Nuestro correo es {correo}."
   ],
   [
    "Vuelto",
    "vuelto, sencillo, dan vuelto",
    "[EDITAR: Damos vuelto en dólares cuando hay sencillo; si no, en bolívares por Pago Móvil.]"
   ],
   [
    "Proveedores",
    "proveedor, proveedores, vender a ustedes, ofrecer productos, alianza",
    "Para propuestas de proveedores o alianzas, escríbenos al +{whatsapp} o al correo {correo}."
   ],
   [
    "Empleo",
    "empleo, trabajo, vacante, vacantes, trabajar con ustedes",
    "[EDITAR: Por ahora no tenemos vacantes.] Puedes dejarnos tus datos por WhatsApp al +{whatsapp}."
   ],
   [
    "Regalos",
    "regalo, envolver, para regalo, tarjeta de regalo, gift card",
    "[EDITAR: Sí, envolvemos para regalo sin costo adicional. Avísanos al hacer tu pedido.]"
   ]
  ],
  "sinonimos": {}
 },
 "ropa-calzado": {
  "titulo": "Ropa y calzado",
  "preguntas": [
   [
    "Guía de tallas",
    "talla, tallas, guia de tallas, que talla, cual es mi talla, como se mi talla, tabla de tallas, medidas",
    "[EDITAR: Manejamos tallas S, M, L y XL. Si nos dices tu estatura y peso por WhatsApp al +{whatsapp}, te recomendamos la talla.]"
   ],
   [
    "Tallas grandes",
    "tallas grandes, talla grande, plus size, xxl, 2xl, 3xl, talla extra",
    "[EDITAR: Tenemos algunos modelos hasta 2XL. Pregúntanos por el que te gustó.]"
   ],
   [
    "Talla de calzado",
    "talla de zapato, numero de zapato, que numero, talla de calzado, numero de calzado, calzo",
    "[EDITAR: El calzado viene en tallas venezolanas del 35 al 44. Cada producto indica las tallas disponibles.]"
   ],
   [
    "¿Talla exacta o grande?",
    "horma, viene grande, viene pequeno, talla exacta, talla normal, como horma, pido una mas",
    "[EDITAR: La mayoría de nuestros modelos son de talla exacta. Si alguno horma distinto, lo indicamos en la descripción.]"
   ],
   [
    "Material y tela",
    "material, tela, algodon, de que es, licra, poliester, cuero, sintetico",
    "El material de cada prenda está en su descripción. [EDITAR: Si tienes dudas, escríbenos y te mandamos fotos de la etiqueta.]"
   ],
   [
    "Colores",
    "colores, que colores, otro color, en negro, en blanco, viene en",
    "Los colores disponibles aparecen en cada producto. Si buscas uno que no ves, escríbenos al +{whatsapp}."
   ],
   [
    "Cuidado y lavado",
    "como lavar, lavado, se encoge, destiñe, cuidado de la prenda, secadora, planchar",
    "[EDITAR: Recomendamos lavar a mano o en ciclo delicado con agua fría, sin secadora, para que la prenda dure más.]"
   ],
   [
    "Cambio por talla",
    "cambio de talla, cambiar la talla, no me quedo, me quedo grande, me quedo pequeno, me quedo",
    "[EDITAR: Si no te quedó, la cambiamos por otra talla dentro de los 7 días, sin usar, con etiqueta y su nota de entrega.]"
   ],
   [
    "Fotos reales",
    "fotos reales, como se ve puesto, foto real, mas fotos, video, se ve igual",
    "Sí, te mandamos fotos o video reales del producto por WhatsApp al +{whatsapp}."
   ],
   [
    "Medirse en tienda",
    "probador, probarmelo, medirmelo, me lo puedo probar, probar",
    "[EDITAR: Sí, en la tienda puedes medirte las prendas antes de comprar.]"
   ],
   [
    "¿Original o réplica?",
    "original, originales, replica, imitacion, son de marca, 1.1",
    "[EDITAR: Todos nuestros productos son originales. / Indicamos en cada producto si es original o de fabricación nacional.]"
   ],
   [
    "Nueva colección",
    "nueva coleccion, cuando llega mercancia, llego mercancia, novedades, lo nuevo, temporada",
    "[EDITAR: Recibimos mercancía nueva cada semana.] Síguenos en @{instagram} para ver lo último."
   ],
   [
    "Ropa de niños",
    "ninos, nino, nina, ninas, infantil, bebe, para ninos",
    "[EDITAR: Por ahora solo manejamos ropa para dama y caballero.]"
   ],
   [
    "Unisex",
    "unisex, para hombre, para mujer, dama, caballero",
    "Cada producto indica si es para dama, caballero o unisex. Si tienes dudas, pregúntanos."
   ],
   [
    "Al mayor (ropa)",
    "docena, por docena, surtido, tallas surtidas, curva de tallas",
    "Al mayor vendemos desde {min_mayor} piezas, y puedes surtir tallas y colores. Escríbenos al +{whatsapp}."
   ]
  ],
  "sinonimos": {
   "camiseta": "franela",
   "camisetas": "franelas",
   "remera": "franela",
   "playera": "franela",
   "jeans": "jean",
   "blue": "jean",
   "gomas": "zapatos",
   "tenis": "zapatos",
   "zapatillas": "zapatos",
   "cotizas": "sandalias",
   "chancletas": "sandalias",
   "short": "shorts",
   "mono": "pantalon",
   "suéter": "sueter",
   "hoodie": "sudadera"
  }
 },
 "suplementos": {
  "titulo": "Suplementos deportivos",
  "preguntas": [
   [
    "¿Son originales?",
    "original, originales, sellado, sellados, replica, son de verdad, importado, importados",
    "[EDITAR: Todos nuestros productos son originales, importados y sellados de fábrica.]"
   ],
   [
    "Vencimiento",
    "vencimiento, fecha de vencimiento, cuando vence, caduca, esta vigente",
    "Todos los productos tienen su fecha de vencimiento en el envase. [EDITAR: Si quieres, te enviamos una foto antes de comprar.]"
   ],
   [
    "Cómo se toma",
    "como se toma, como tomar, cuanto tomar, dosis, cuantas veces, cuando tomar, antes o despues",
    "La forma de uso y la porción recomendada están en la etiqueta de cada producto. Para tu caso particular, consulta a tu médico o nutricionista."
   ],
   [
    "¿Con agua o con leche?",
    "con agua o con leche, con leche, con agua, con que se mezcla, se mezcla, batido",
    "La etiqueta indica con qué se prepara. Con agua suele quedar más ligero y con leche más cremoso."
   ],
   [
    "Proteína: whey o isolate",
    "whey o isolate, isolate, aislada, diferencia entre, cual proteina, que proteina me recomiendas, concentrada",
    "En general, la isolate (aislada) tiene más proteína por porción y menos lactosa, y la concentrada suele ser más económica. Si tienes dudas por tu salud o tu objetivo, consulta a un nutricionista."
   ],
   [
    "Creatina para empezar",
    "creatina, para empezar, principiante, primera vez, que compro para empezar",
    "Cada producto trae su modo de uso en la etiqueta. Si es tu primera vez con suplementos, lo ideal es consultarlo con un profesional de salud. Con gusto te mostramos las opciones que tenemos."
   ],
   [
    "Sabores",
    "sabores, que sabor, sabor, chocolate, vainilla, fresa, sin sabor",
    "Los sabores disponibles aparecen en cada producto. Si buscas uno que no ves, escríbenos al +{whatsapp}."
   ],
   [
    "Servicios por envase",
    "servicios, porciones, cuantos servicios, cuanto dura, para cuanto alcanza, cuantas porciones",
    "La cantidad de servicios de cada envase está en su descripción y en la etiqueta."
   ],
   [
    "Tamaños",
    "2 libras, 5 libras, lb, libras, tamano, presentacion, presentaciones, mas grande",
    "Cada producto muestra sus presentaciones disponibles. Normalmente la más grande sale más económica por servicio."
   ],
   [
    "Contraindicaciones",
    "contraindicaciones, efectos secundarios, es malo, hace dano, embarazada, hipertenso, diabetico, rinones",
    "Si tienes alguna condición de salud, estás embarazada o tomas medicamentos, consulta a tu médico antes de usar cualquier suplemento. No podemos dar recomendaciones médicas."
   ],
   [
    "Para bajar de peso",
    "bajar de peso, quemador, quemadores, adelgazar, perder grasa, definir",
    "Tenemos productos para acompañar un plan de alimentación y entrenamiento. Antes de usar quemadores, consulta a un profesional de salud."
   ],
   [
    "Para ganar masa",
    "ganar masa, ganar peso, aumentar, volumen, ganador, gainer, subir de peso",
    "Tenemos ganadores de peso y proteínas. Te ayudamos a comparar opciones por WhatsApp al +{whatsapp}; para tu caso particular, consulta a un nutricionista."
   ],
   [
    "Asesoría",
    "asesoria, asesor, me puedes asesorar, que me recomiendas, recomendacion, rutina",
    "Te ayudamos a comparar productos por WhatsApp al +{whatsapp}. Para un plan de alimentación o de suplementación a tu medida, lo ideal es un nutricionista."
   ],
   [
    "Envío cuidado",
    "llega bien, se rompe, embalaje, bien empacado, sellado al llegar",
    "[EDITAR: Enviamos todo bien embalado y con el sello de seguridad intacto.]"
   ]
  ],
  "sinonimos": {
   "prote": "proteina",
   "protes": "proteinas",
   "proteínas": "proteinas",
   "crea": "creatina",
   "pre": "preentreno",
   "pre-entreno": "preentreno",
   "pre entreno": "preentreno",
   "ganador": "ganador",
   "gainer": "ganador",
   "bcaas": "bcaa",
   "aminos": "aminoacidos",
   "quema": "quemador",
   "colageno": "colageno"
  }
 }
};
