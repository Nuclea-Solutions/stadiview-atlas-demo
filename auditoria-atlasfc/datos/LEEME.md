# Datos crudos de la auditoría (27/10/2026)

| Archivo / carpeta | Contenido |
|---|---|
| `muestra-urls.txt` | Las 26 URLs auditadas (el número de línea es el ID `NN` que usan los demás archivos) |
| `muestra-ttfb.txt` | Código HTTP, TTFB y bytes transferidos (gzip) por URL, medidos con `curl` a 1 petición/s |
| `lighthouse/NN-movil.json`, `NN-escritorio.json` | Reportes Lighthouse 12.8.2 (26 móvil + 8 escritorio). Se pueden abrir en https://googlechrome.github.io/lighthouse/viewer/ |
| `lighthouse/00-home-movil-verificacion-lazyload.json` | Corrida de control sin captura de página completa, para verificar que el lazy load no se activó artificialmente |
| `lighthouse/00-psi-api-respuesta-429.json` | Respuesta de la API de PageSpeed sin llave: no hay datos de campo (CrUX) |
| `pesos-y-lighthouse-por-pagina.csv` | Por URL y dispositivo: puntajes, FCP/LCP/TBT/CLS/SI/TTFB, peso por tipo de recurso, peticiones, ahorros estimados por Lighthouse y fallas de accesibilidad |
| `bytes-webflow-vs-terceros-movil.csv` | Bytes servidos por Webflow (los que factura) frente a terceros, por URL, con los 3 recursos más pesados |
| `experimento-recompresion-imagenes.csv` | 12 imágenes reales recomprimidas a WebP/AVIF con `sharp` (original contra optimizado) |
| `seo-muestra.csv` | Título, descripción, canonical, Open Graph, JSON-LD, H1 e imágenes por URL |
| `inventario-urls-301.csv` | Mapa de redirecciones: reglas por patrón + notas observadas con su URL nueva e ID heredado |
| `urls-descubiertas.txt`, `posts-vistos.txt` | URLs internas encontradas en las páginas descargadas |
| `headers/` | Respuestas de `curl -I`: dominios, cada URL de la muestra, activos (caché), video, robots y pruebas de redirección |
| `html/` | HTML de las páginas analizadas (`muestra/NN.html` y secciones) |
| `dns.txt` | NS, A, CNAME, MX, SPF, DMARC, DKIM y CAA consultados por DNS-over-HTTPS |
| `robots.txt`, `sitemap.xml.respuesta-404.html` | Respuestas tal cual (robots vacío; el sitemap da 404) |
| `precios-webflow-extracto-2026-10-27.txt` | Extracto textual de webflow.com/pricing usado para el modelo de costos |
