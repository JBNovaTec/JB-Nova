# JB NOVA · Panel Base — instalación para un cliente nuevo

Un panel por cliente: mismo código para todos, datos y configuración propios.
Tiempo estimado: 10–15 minutos si ya tenés los datos del cliente (probado en una instalación de prueba el 23/11/2026).

## Antes de empezar
- Una cuenta de Google donde vivirán los datos del cliente (idealmente la del cliente).
- Una cuenta de Cloudflare para publicar la web (puede ser la de JB NOVA, un Worker por cliente).
- Logo del cliente (PNG), color de marca, WhatsApp, RIF, Instagram.

## 1. Backend (Google Sheets + Apps Script)
1. Crear una planilla nueva de Google Sheets con el nombre del cliente.
2. Extensiones → Apps Script. Borrar lo que haya y pegar todo `02-backend/Code.gs`. Guardar.
3. Elegir la función `setup` y tocar **Ejecutar**. Aceptar los permisos (Configuración avanzada → Ir al proyecto → Permitir). Crea las hojas (Productos, Pedidos, Clientes, Agenda, Gastos, Cierres, Config, Novi_Log, Novi_FAQ, Novi_Sinonimos, Resumen), 4 productos de ejemplo y el disparador diario de la tasa BCV (8:00 y 17:45, hora de Venezuela). Debe terminar con "Se completó la ejecución" y sin errores.
4. (Recomendado) Configuración del proyecto → Propiedades del script → agregar `MASTER_KEY` con la clave maestra de JB NOVA. Así la clave nunca queda escrita en el código.
5. Implementar → Nueva implementación → tipo **Aplicación web** · Ejecutar como: **Yo** · Quién tiene acceso: **Cualquier persona**. Copiar la URL que termina en `/exec`.

## 2. Web
1. Abrir `01-web/index.html` y `01-web/mayorista/index.html` (son el mismo archivo) y pegar la URL en la línea `const API_URL = "";`. Mientras esté vacía, la web funciona en modo demo.
2. Reemplazar `icon-nav.png` (cuadrado, para el panel y la pestaña) y `logo-claro.png` (logo sobre fondo blanco, para la nota) por los del cliente. `pagos.jpg` es opcional: si no está, no se muestra.
3. Publicar la carpeta `01-web` en Cloudflare (Workers & Pages → subir carpeta). Si el cliente no contrató catálogo mayorista, se puede omitir la carpeta `mayorista`.

## 3. Configurar desde el panel (sin tocar código)
Entrar a `tu-sitio/#panel` con la clave `1234` y, en **Ajustes**:
1. Cambiar la clave del panel.
2. Datos del negocio: nombre, razón social, RIF, correo, Instagram, TikTok, frase corta, ciudad, color principal y link del logo para la nota (imagen subida a Drive y compartida, o cualquier link directo).
3. Tasa del día, WhatsApp, formas de entrega y de pago.
4. **Módulos activos**: tienda en línea, catálogo mayorista, ventas a crédito con cuotas, productos con sabores y Novi (asistente del panel). Se activa solo lo que el cliente contrató.
5. En Inventario, borrar los productos de ejemplo y cargar los reales.

## 4. Pruebas antes de entregar
- Hacer un pedido de prueba desde la tienda y otro desde el panel (Nuevo pedido). Revisar la nota de entrega en PDF.
- Registrar un gasto y hacer un cierre de caja.
- Eliminar los pedidos de prueba (Pedidos → Eliminar pedido) para que el stock vuelva a su valor.

## Qué cambia por cliente / qué no
- **Cambia**: Ajustes del panel, logos, URL del backend, productos.
- **No cambia**: el código. Si hay que arreglar o mejorar algo, se hace en esta base y luego se actualiza cada instalación (pegar `Code.gs` nuevo y crear una versión nueva de la implementación; reemplazar `index.html` conservando su `API_URL`).

## Novi (asistente del panel)
- Botón azul del robot abajo a la derecha, solo dentro del panel (después del PIN). Se apaga en Ajustes → Módulos activos.
- Consultas: ventas (por período y por producto), formas de pago, caja, lo más/menos vendido, stock, stock bajo, lista de compra, valor del inventario, quién debe, cuotas vencidas, pedidos pendientes, buscar un pedido (PED-1003 o nota 12), datos de un cliente, mejores clientes, mejor día de la semana, gastos y ganancia.
- Conectores sin IA: hora y fecha de Venezuela, conversión $ ↔ Bs ↔ € y **tasa BCV**. La tasa se consulta sola (bcv.today, fuente no oficial) y Novi **pregunta** si se actualiza; nunca la cambia sin que el dueño diga que sí.
- Dictado por voz: botón del micrófono (Chrome/Edge/Android; si el navegador no lo soporta, no aparece).
- Si pasan 5 minutos sin escribir, la conversación se borra y al abrir arranca una nueva.
- Funciona con reglas y palabras clave, sin IA: costo $0 por mensaje y responde con las mismas cuentas del panel.
- Lo que el dueño escribe queda en la hoja **Novi_Log** (texto, intención, si entendió). Revisarla cada semana para agregar sinónimos a lo que no entendió.

### Paquetes de preguntas (uso interno de JB NOVA)
- Están en `novi/paquetes/` del repositorio: `general` (para todos) y por rubro: `ropa-calzado`, `bodega`, `comida`, `suplementos`.
- Al instalar: ejecutar `setup`, crear el script **NoviPaquetes** con el contenido de `base/02-backend/NoviPaquetes.gs`, poner en `PAQUETES_ELEGIDOS` los paquetes del cliente (ej. `["general", "bodega"]`), ejecutar `cargarPaquetesNovi` y **borrar el script**.
- Completar en la hoja **Novi_FAQ** lo que dice `[EDITAR: ...]`. Mientras tenga esa marca, Novi no usa esa respuesta con los clientes. Se pueden agregar preguntas propias del negocio (columna `claves` = formas de preguntarlo, separadas por coma) y desactivar filas con `activo = NO`.
- **Novi_Sinonimos**: palabras propias del negocio (ej. `gomas` → `zapatos`).
- Para cambiar el diccionario o los paquetes: editar `novi/`, correr `node herramientas/probar.js` (debe dar 95% o más) y `python3 herramientas/armar.py`, que vuelve a armar la web y `NoviPaquetes.gs`.

## Actualizar una instalación que ya existe
1. Pegar el `Code.gs` nuevo, guardar y ejecutar **`setup`** una vez (no borra datos: agrega las hojas de Novi, los colores nuevos y el disparador de la tasa). Después cargar los paquetes de Novi como en la sección de arriba.
2. Implementar → Administrar implementaciones → lápiz → **Nueva versión**.
3. Reemplazar `index.html` y `mayorista/index.html` conservando su `API_URL`.
4. Los usuarios del panel tienen que volver a entrar con su PIN una vez.

## Cómo verificar el backend antes de la web
Con la URL `/exec` (desde el navegador o una herramienta) se puede probar enviando un POST de texto con `{"action":"catalog"}`: debe devolver `ok:true` con los 4 productos. La acción del panel para cargar todo es `load` con el campo `pin`.

## Historial de correcciones
### Versión con Novi ampliado
- Novi: preguntas frecuentes y sinónimos en hojas, paquetes por rubro, tasa BCV con confirmación, conversiones, hora y fecha, pedidos, clientes, mejores clientes, mejor día, dictado por voz y reinicio a los 5 minutos.
- Backend: acciones `tasa_set` y `tasa_bcv`; hojas Novi_FAQ y Novi_Sinonimos; disparador `tareaTasaBcv`.
### Versión con Novi (fase 1)
- Nuevo: Novi en el panel (consultas) y módulo `mod_novi`.
- Seguridad: el panel usa una sesión de 6 horas después del PIN. Si alguien prueba PIN falsos, solo se bloquean las entradas nuevas por 10 minutos; quien ya está adentro sigue trabajando. La clave maestra nunca queda bloqueada. Cambiar la clave cierra todas las sesiones.
- Seguridad: límite de pedidos desde la tienda (12 por minuto en total y 3 cada 10 minutos por teléfono). Los pedidos cargados desde el panel no tienen límite.
- La franja de la nota de entrega (PDF y vista del panel) usa el color del negocio configurado en Ajustes.
- La hoja Pedidos ahora colorea el estado "Crédito".

### Versión anterior
- Corregido: `setup` fallaba por falta del formato de la hoja Agenda.
- Cambiado: el prefijo de código de producto ahora es `P-` (antes tenía el de otro cliente).
- Probado: catálogo, pedido con nota PDF y marca, PIN incorrecto rechazado, mayorista solo efectivo, gasto y cierre de caja con fondo inicial.
- Pendiente: probar la web conectada en vivo contra un backend recién instalado.

## Notas
- La clave maestra de JB NOVA no está en ningún archivo de esta carpeta.
- Esta base se generó a partir del sistema entregado a Promediven. No contiene sus datos, logos ni credenciales.
