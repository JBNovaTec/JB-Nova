/* ============ NOVI · DICCIONARIO ============
   Aquí se le enseña a Novi a entender. Cada intención tiene la lista de formas de preguntarla.
   Reglas para agregar frases:
   - Todo en minúsculas, sin acentos ni signos ("cuanto vendi", no "¿Cuánto vendí?").
   - Las frases de varias palabras valen más que las sueltas, así que una frase específica gana.
   - Si dos intenciones empatan, gana la que está más arriba en esta lista.
   - Las palabras sueltas de 5 letras o más se reconocen aunque tengan un error de tipeo ("bentas" = "ventas").
   Después de editar: correr  python3 herramientas/armar.py  y  node herramientas/probar.js
*/
const NV_INT = [
  ["quien_eres", ["quien eres","quien sos","como te llamas","que eres","eres un robot","eres una ia","eres 1 ia","eres 1 inteligencia artificial","eres 1 robot","eres ia","eres inteligencia artificial","eres real","eres humano","quien te creo","quien te hizo"]],
  ["tasa", ["tasa","tasas","bcv","tasa del dia","tasa de hoy","tasa oficial","a cuanto esta el dolar","a como esta el dolar","cuanto esta el dolar","como esta el dolar","precio del dolar","valor del dolar","dolar hoy","dolar de hoy","el dolar","euro","precio del euro","cambio del dia","actualizar tasa","cambiar tasa","cambiar la tasa","actualizar la tasa"]],
  ["convertir", ["cuanto es","cuanto son","cuanto seria","cuanto serian","en bs","en bolivares","a bs","a bolivares","en dolar","a dolar","a dolares","en divisas","convierte","convertir","conversion","pasame","pasar a","calcula","calculame"]],
  ["hora", ["que hora es","que horas son","hora","la hora","hora es","dime la hora"]],
  ["fecha", ["que dia es","que dia es hoy","que fecha es","fecha de hoy","que fecha","fecha","en que dia estamos","que dia estamos","a cuanto estamos"]],
  ["mejor_dia", ["mejor dia","mejores dias","peor dia","que dia vendo mas","dia que mas vendo","dia que mas se vende","dias mas fuertes","dia mas fuerte","dia de la semana","dias de la semana","que dia se vende mas","que dias vendo mas","dia flojo","dias flojos"]],
  ["mejores_clientes", ["mejores clientes","mejor cliente","quien compra mas","quienes compran mas","quien me compra mas","el que mas me compra","la que mas me compra","mas me compra","clientes que mas compran","cliente que mas compra","clientes frecuentes","top clientes","clientes fieles","mejores compradores","quien gasta mas"]],
  ["cliente_info", ["telefono de","telefono del","numero de","whatsapp de","wasap de","datos de","direccion de","donde vive","que compro","que ha comprado","que se llevo","que me compro","compras de","historial de","info de","informacion de","contacto de","ficha de","buscar cliente","busca al cliente","el cliente","la clienta"]],
  ["compra", ["lista de compra","lista de compras","que tengo que comprar","que debo comprar","que hay que comprar","que me falta comprar","que necesito comprar","que pido","que le pido al proveedor","pedir al proveedor","pedirle al proveedor","proveedor","pedido al proveedor","reponer","reposicion","surtir","que surtir","hacer pedido de mercancia","comprar mercancia","que mercancia falta"]],
  ["vencidas", ["vencida","vencidas","vencido","vencidos","vence","vencen","vence hoy","vencen hoy","se vence","atrasado","atrasados","atrasada","atrasadas","morosos","moroso","morosa","cuotas de hoy","cobrar hoy","a quien cobro hoy","que cobro hoy","a quien le cobro","le toca pagar","toca pagar","quien paga hoy","cuotas","cuota","cuotas pendientes","pagos atrasados"]],
  ["deben", ["quien me debe","quienes me deben","me debe","me deben","debe","deben","deudores","deudor","deudora","deuda","deudas","fiado","fiados","fiao","fiaos","credito","creditos","por cobrar","cuentas por cobrar","saldo","saldos","cuanto me deben","cuanto me debe","lo que me deben","plata en la calle"]],
  ["bajos", ["stock bajo","inventario bajo","bajo","bajos","agotado","agotados","agotada","agotadas","se acabo","se acabaron","poco stock","por agotarse","por acabarse","sin stock","se esta acabando","se estan acabando","alertas","alerta","que falta","que me falta","faltantes","bajo minimo","bajo el minimo","quedan pocos","quedan pocas"]],
  ["top", ["mas vendido","mas vendidos","mas vendida","mas vendidas","lo que mas se vende","lo que mas sale","mas sale","mas salen","top","top 10","estrella","productos estrella","mejores productos","mas se vende","mas se venden","que se vende","que es lo que mas vendo","que vendo mas","lo mas pedido","mas pedidos","ranking","menos vendido","menos vendidos","menos se vendio","menos se vende","menos se venden","menos sale","menos salio"]],
  ["ganancia", ["ganancia","ganancias","utilidad","utilidades","gane","ganamos","rentabilidad","neto","ganancia neta","cuanto gane","cuanto ganamos","beneficio","margen","cuanto me queda","me queda libre"]],
  ["caja", ["caja","cierre","cierre de caja","cerrar","cerrar caja","cuadrar","cuadre","cuadrar caja","arqueo","efectivo en caja","cuanto hay en caja","cuanto efectivo","plata en caja","cuanto debe haber"]],
  ["pagos", ["forma de pago","formas de pago","por metodo","metodo de pago","metodos de pago","por pago","pago movil","zelle","efectivo","transferencia","como me pagaron","como pagaron","por forma de pago","por banco","punto de venta","tarjeta","binance","divisas","en divisas","entro por","entro en"]],
  ["pendientes", ["pendiente","pendientes","por atender","falta por atender","sin pagar","sin confirmar","pedidos nuevos","pedido nuevo","por confirmar","pedido","pedidos","ordenes","orden","que pedidos tengo","pedidos de hoy","llego algun pedido","hay pedidos"]],
  ["gastos", ["gasto","gastos","gaste","gastamos","egresos","egreso","en que gaste","cuanto gaste","cuanto he gastado","salidas de dinero"]],
  ["stock", ["stock","cuanto queda","cuantos quedan","cuantas quedan","queda","quedan","existencia","existencias","tengo de","hay de","cuanto hay","cuantos hay","cuantas hay","disponible","disponibles","cuantas unidades","cuantos tengo","cuantas tengo","tienes","tenemos","hay","busca","buscar","buscame","precio de","cuanto cuesta","cuanto vale","a cuanto esta"]],
  ["inventario", ["valor del inventario","cuanto vale el inventario","cuanto vale mi inventario","inventario","inventario total","capital","mercancia","cuanto tengo invertido","cuanto hay en mercancia","valor de la mercancia","vale la mercancia"]],
  ["ventas", ["vendi","vendido","venta","ventas","vendimos","vende","vendo","vendiste","cobrado","cobre","cobramos","cobros","facture","facturado","facturamos","facturacion","ingreso","ingresos","cuanto hice","cuanto hicimos","cuanto llevo","como voy","como vamos","como va","cuanto entro","cuanto ha entrado","plata","dinero","resumen","como estamos","como va el negocio","movimiento","como fue el dia","he vendido"]],
  ["saludo", ["hola","holaa","buenas","buen dia","buenos dias","buenas tardes","buenas noches","hey","epa","epale","que tal","saludos","que mas","como estas"]],
  ["despedida", ["chao","chau","adios","nos vemos","hasta luego","hasta manana","bye","me voy"]],
  ["menu", ["menu","ayuda","opciones","que puedes hacer","que sabes hacer","que haces","comandos","help","que mas puedes hacer","para que sirves","como funcionas","no se que preguntar"]],
  ["gracias", ["gracias","muchas gracias","listo","ok","okey","perfecto","chevere","fino","dale","excelente","genial","buenisimo","de una"]]
];
/* Palabras que no ayudan a buscar productos o clientes */
const NV_STOP = new Set(("de del la el los las lo un una unos unas me mi mis que en y a al por para con cuanto cuantos cuanta cuantas hay queda quedan " +
  "tengo tiene tienes tenemos stock existencia existencias producto productos disponible disponibles dime decime muestrame ver quiero saber sobre " +
  "esta este estos estas cual cuales es son hoy porfa favor precio cuesta vale busca buscar buscame unidades he has ha vendido vendi vendimos se " +
  "quien quienes cliente clienta telefono numero datos direccion compro comprado llevo compras historial info informacion contacto ficha whatsapp wasap debe deben quien quienes").split(" "));
/* Sinónimos que vienen de fábrica. Cada negocio agrega los suyos en la hoja Novi_Sinonimos. */
const NV_SIN0 = {fiao:"fiado", fiaos:"fiados", verdes:"dolar", lechugas:"dolar", dolares:"dolar", usd:"dolar", bolos:"bs", bolivares:"bs", bolivar:"bs", ves:"bs",
  xq:"porque", pq:"porque", q:"que", k:"que", tb:"tambien", hoi:"hoy", wasa:"whatsapp", wsp:"whatsapp", ws:"whatsapp", tlf:"telefono", tel:"telefono", nro:"numero"};
