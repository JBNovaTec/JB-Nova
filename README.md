# JB NOVA · Panel Base

Tienda en línea + panel de inventario, pedidos y caja para negocios venezolanos.
Google Sheets como base de datos, Google Apps Script como backend y Cloudflare Workers para publicar la web.

## Estructura

| Carpeta | Qué contiene |
|---|---|
| `base/01-web/` | `index.html` (tienda + panel) y `mayorista/index.html` (copia idéntica). Imágenes por cliente: `icon-nav.png`, `logo-claro.png`, `pagos.jpg` (opcional). |
| `base/02-backend/` | `Code.gs` para pegar en Apps Script. |
| `base/INSTALACION.md` | Checklist para instalar la base en un cliente nuevo. |
| `demo/` | Demo pública "Boutique Luna" (datos inventados, funciona sin backend). |
| `docs/` | Planes y documentación (Novi, el asistente de reglas). |

## Reglas

- **Nunca subir** `MASTER_KEY`, PIN reales, URLs `/exec` de clientes ni datos de clientes. En la base `API_URL` queda vacío.
- Las instalaciones de clientes entregados **no viven en este repositorio**.
- Cada cambio se hace en la base, se prueba en la demo y después se actualiza cada cliente.
- Trabajo nuevo en ramas aparte (ej. `novi-fase-1`); a `main` entra solo lo probado.
