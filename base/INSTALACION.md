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
3. Elegir la función `setup` y tocar **Ejecutar**. Aceptar los permisos (Configuración avanzada → Ir al proyecto → Permitir). Crea las hojas (Productos, Pedidos, Clientes, Agenda, Gastos, Cierres, Config, Resumen) y 4 productos de ejemplo. Debe terminar con "Se completó la ejecución" y sin errores.
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
4. **Módulos activos**: tienda en línea, catálogo mayorista, ventas a crédito con cuotas, productos con sabores. Se activa solo lo que el cliente contrató.
5. En Inventario, borrar los productos de ejemplo y cargar los reales.

## 4. Pruebas antes de entregar
- Hacer un pedido de prueba desde la tienda y otro desde el panel (Nuevo pedido). Revisar la nota de entrega en PDF.
- Registrar un gasto y hacer un cierre de caja.
- Eliminar los pedidos de prueba (Pedidos → Eliminar pedido) para que el stock vuelva a su valor.

## Qué cambia por cliente / qué no
- **Cambia**: Ajustes del panel, logos, URL del backend, productos.
- **No cambia**: el código. Si hay que arreglar o mejorar algo, se hace en esta base y luego se actualiza cada instalación (pegar `Code.gs` nuevo y crear una versión nueva de la implementación; reemplazar `index.html` conservando su `API_URL`).

## Cómo verificar el backend antes de la web
Con la URL `/exec` (desde el navegador o una herramienta) se puede probar enviando un POST de texto con `{"action":"catalog"}`: debe devolver `ok:true` con los 4 productos. La acción del panel para cargar todo es `load` con el campo `pin`.

## Historial de correcciones de esta versión
- Corregido: `setup` fallaba por falta del formato de la hoja Agenda.
- Cambiado: el prefijo de código de producto ahora es `P-` (antes tenía el de otro cliente).
- Probado: catálogo, pedido con nota PDF y marca, PIN incorrecto rechazado, mayorista solo efectivo, gasto y cierre de caja con fondo inicial.
- Pendiente: probar la web conectada en vivo contra un backend recién instalado.

## Notas
- La clave maestra de JB NOVA no está en ningún archivo de esta carpeta.
- Esta base se generó a partir del sistema entregado a Promediven. No contiene sus datos, logos ni credenciales.
