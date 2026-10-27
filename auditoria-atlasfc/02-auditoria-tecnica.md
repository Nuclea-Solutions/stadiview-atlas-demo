# 02 · Auditoría técnica — atlasfc.com.mx

**Fecha de medición:** 27 de octubre de 2026, 21:17–22:05 UTC · **Preparado por:** Nuclea Solutions
**Dominio verificado:** `atlasfc.com.mx` / `www.atlasfc.com.mx` (responden 200 con `data-wf-domain="atlasfc.com.mx"`, `lang="es-MX"` y título "Atlas FC – Sitio Oficial"). `clubatlas.com.mx` no resuelve y `clubatlas.com` es un dominio estacionado en venta (§6.5).

## Metodología y límites

| Aspecto | Detalle |
|---|---|
| Alcance | Solo lectura. **26 URLs** representativas (home, listado y paginación de noticias, home femenil, afición/boletos, patrocinadores, Únete a La Fiel, visorías, 3 legales, **15 notas**) + 4 páginas del listado para dimensionar el CMS + 12 imágenes para el experimento de recompresión. Ninguna petición de escritura y ningún envío de formularios |
| Ritmo | `curl` secuencial con pausa de 1 s; Lighthouse secuencial con pausa de 5 s. `robots.txt` responde 200 **vacío** (no hay restricciones) |
| Herramientas | `curl -I` (headers), Lighthouse 12.8.2 (Chromium headless; perfil móvil por defecto con 4G lento simulado; perfil escritorio con `--preset=desktop`), `sharp` 0.33 para recompresión, DNS-over-HTTPS para DNS |
| Ubicación del probador | Centro de datos en EE. UU. (Cloudflare `IAD`/`ORD`). **El TTFB desde Guadalajara será distinto**; los tiempos de Lighthouse usan red simulada, así que son comparables entre páginas |
| No disponible | Datos de campo CrUX (la API de PageSpeed sin llave devolvió 429), Wayback Machine (conexión rechazada desde el entorno), panel de Webflow, Analytics y Search Console. **Para medir el INP real se necesita acceso a Search Console o GA4** |
| Unidades | MB = MiB (1,024 KiB), tal como reporta Lighthouse |

Las salidas crudas están en `datos/`: `lighthouse/*.json` (36 reportes), `headers/`, `html/`, `pesos-y-lighthouse-por-pagina.csv`, `bytes-webflow-vs-terceros-movil.csv`, `seo-muestra.csv`, `experimento-recompresion-imagenes.csv`, `inventario-urls-301.csv`, `dns.txt` y `precios-webflow-extracto-2026-10-27.txt`.

---

## 1. Stack actual

### 1.1 Plataforma — Webflow confirmado **[Medido]**
```
$ curl -sI https://atlasfc.com.mx/
HTTP/2 200
server: cloudflare
cf-cache-status: HIT
age: 3717
strict-transport-security: max-age=31536000
surrogate-control: max-age=35040
surrogate-key: atlasfc.com.mx 69fcf3ea92d2cdb9abbec2bb pageId:69fcf3ea92d2cdb9abbec2a7 …
x-wf-region: us-east-1
link: <https://cdn.prod.website-files.com>; rel=preconnect …
```
- HTML: `<!-- Last Published: Tue Oct 27 2026 19:07:08 GMT -->`, `data-wf-site="69fcf3ea92d2cdb9abbec2bb"`. Por el timestamp del ObjectId, el sitio se creó alrededor de **mayo de 2026**.
- CDN: Cloudflare, operado por Webflow (no por el club). Los activos salen de `cdn.prod.website-files.com` (S3 `INTELLIGENT_TIERING` detrás de Cloudflare) y jQuery 3.5.1 de `d3e54v103j8qbb.cloudfront.net`.
- DNS: zona en **DNSimple**. `www` → CNAME `cdn.webflow.com`; apex → A `198.202.211.1`. Correo en Google Workspace (MX `smtp.google.com`).
- Pie de página: "© 2026 Atlas FC · Powered by Nuclea Studio".

### 1.2 Plan probable y costo **[Precio público + inferencia]**
Según webflow.com/pricing (consultado el 27/10/2026), en mayo de 2026 Webflow sustituyó los planes CMS/Business por **Premium**: $25/mes anual o **$39/mes mensual**, 50 GB de ancho de banda incluidos, 20,000 ítems de CMS y 40 colecciones. El ancho de banda adicional se vende por bloques:

| Add-on | Anual | **Mensual** |
|---|---|---|
| +950 GB | $374 | $560 |
| **+1.450 TB** | $574 | **$860** |
| +1.950 TB | $774 | $1,160 |

**$39 + $860 = $899/mes**, que coincide con los ~$900/mes que reporta el club para ~1.5 TB. Es la configuración más probable, pero hay que confirmarla con la factura. Si el club pagara anual, serían $599/mes.

### 1.3 CMS **[Medido]**
- Colección de notas en `/post/{slug}`. El listado `/noticias` pagina con `?e90dc3fe_page=N` y muestra **"2 / 439"** con 6 notas por página. La última página (439) tiene 2 notas → **≈ 2,630 notas**.
- Al menos **29 % de las notas observadas** (7 de 24) son importadas del sitio anterior, con slugs del tipo `/post/https-www-atlasfc-com-mx-articles-…-27457-a8821`. La URL original se convirtió en slug con restos de URL-encoding (`c3-a1` = "á"). Las URLs antiguas `/articles/…` hoy dan **404** (§4.4).
- Otras colecciones inferidas por el marcado: jugadores varonil y femenil (≈ 30 fotos por plantel), patrocinadores, partidos o boletos (pestañas de "Boletos") y probablemente categorías. **Estimación: 6–9 colecciones.** El límite de Premium es 40.
- Uso del límite de ítems: ~2,630 notas + ~100 ítems de otras colecciones ≈ **14 % de 20,000**.

### 1.4 Integraciones de terceros **[Medido en el HTML]**

| Integración | Dónde | Observación |
|---|---|---|
| Google Analytics 4 `G-C69DE74GF3` | Todas las páginas | Servido en primera parte por la ruta `/xa5e8du3i6y…/` (Google tag gateway), **169 KB** de JS por página. Sin banner de consentimiento |
| Google reCAPTCHA | Todas las páginas | **349 KB** de JS en cada página, aunque solo `/unete-a-la-fiel` tiene el widget |
| Google Fonts (vía `webfont.js`) | Todas | 6 familias × 5 pesos: Anton, Bebas Neue, Inter, JetBrains Mono, Lexend y Saira Condensed |
| Adobe Typekit `gsv1pnq` | Todas | Más fuentes; **44 peticiones de fuentes y ~1 MB por página** |
| Swiper `@11` (jsDelivr) | Todas | Versión **flotante**, **sin SRI** |
| 365scores (`webws.365scores.com`) | Home, femenil | Calendario y resultados consultados **desde el navegador** a una API web no documentada (COMP 141 y 7143, equipos 1258 y 53631) |
| Google Apps Script | Todas (script) / `/unete-a-la-fiel` (formulario) | El formulario envía NOMBRE, APELLIDO, TELÉFONO y CORREO por `fetch` POST a `script.google.com/macros/s/AKfycby…/exec` (§6.3) |
| Microsoft Forms | Enlace | Formulario externo |
| Shopify | `shop.atlasfc.com.mx` (A `23.227.38.65`) | Tienda oficial; también enlaza a `atlasfcshop.mx` |
| **Fanki** | `/aficion` | Boletaje: `https://fanki.co/mex/organizer/atlas` |
| `cloud.atlasrojinegro.com` | Enlace "Experiencias Rojinegras" | Otro sistema; responde con `Cache-Control: no-cache` |
| Caliente.mx | Navbar y pie | Patrocinador (enlaces de afiliado) |
| Redes sociales | Enlaces | Facebook, Instagram, X, YouTube, TikTok, Discord y WhatsApp. **No hay píxeles de Meta ni TikTok** |

---

## 2. Peso de página y ancho de banda

### 2.1 Peso por tipo de página (Lighthouse móvil, primera visita sin caché) **[Medido]**

| Grupo | URLs | Peso medio | Imágenes | Video | JS | Fuentes | HTML | Peticiones (mediana) |
|---|---|---|---|---|---|---|---|---|
| **Home** | 1 | **15.8 MB** | 10.3 MB | 3.8 MB | 661 KB | 1.0 MB | 43 KB | 143 |
| Secciones (noticias, paginación, femenil) | 3 | 4.6 MB | 2.9 MB | 0 | 660 KB | 995 KB | 29 KB | 81 |
| Institucionales | 7 | 1.9 MB | 264 KB | 0 | 629 KB | 1.0 MB | 23 KB | 74 |
| **Notas** | 15 | **3.3 MB** (mediana 2.7) | 1.6 MB | 0 | 622 KB | 994 KB | 13 KB | 78 |
| **Todas** | 26 | **3.5 MB** (mediana 2.6) | 1.7 MB | 150 KB | 630 KB | 1.0 MB | 19 KB | 78 |

Detalle por URL en `datos/pesos-y-lighthouse-por-pagina.csv`.

### 2.2 Los mayores culpables **[Medido]**

1. **Imágenes del CMS subidas como originales de cámara.** La imagen destacada de la nota más reciente (`…6adfc569…_nota.jpg`) mide **6,595 × 4,397 px y pesa 4,040 KB**, y se descarga en la home **y** en la nota. Otras notas: `gol fem.jpg` 2,844 KB, `19 puebla.jpg` 2,307 KB, `puebla.jpg` 1,982 KB y `191919.jpeg` 1,630 KB.
2. **La cabecera de la nota usa la foto como `background-image` CSS** (`div.header-blog`, que además es el elemento LCP). Una imagen de fondo **no admite `srcset`**, así que **todos los dispositivos descargan el original** aunque el celular solo necesite 800 px.
3. **El lazy load no funciona en la práctica.** La home tiene 100 `<img>`, de las cuales 99 llevan `loading="lazy"`. Aun así, **sin hacer scroll se descargan 62 imágenes (10.3 MB)**, verificado en una corrida sin captura de página completa. Los carruseles (Swiper) y las pestañas renderizan todas las tarjetas en el DOM; las fotos del plantel (~30 JPEG de 800 × 1200, ~215 KB cada una) cargan aunque estén fuera de vista.
4. **Video del hero duplicado.** Hay dos `<video autoplay loop>` (escritorio y móvil) con el mismo archivo. El MP4 de 1.9 MB se declara **antes** que el WebM y el navegador descargó **3.8 MB** de video en la home móvil. Los archivos no tienen `Cache-Control` explícito.
5. **Fuentes:** 44 archivos y ~1 MB por página entre Google Fonts y Typekit.
6. **JS de terceros:** reCAPTCHA (349 KB) y gtag (169 KB) son el 82 % del JS de cada nota.

Lo que **sí** está bien: las imágenes estáticas del diseño ya usan AVIF (90 referencias `.avif` en la home) y el CSS y los activos estáticos tienen `max-age=31536000, immutable`.

### 2.3 Experimento de recompresión con imágenes reales del sitio **[Medido]**
Se descargaron las 12 imágenes JPEG más pesadas de la home y se recomprimieron con `sharp`: WebP q75 y AVIF q50, al ancho de uso real (`datos/experimento-recompresion-imagenes.csv`).

| Imagen | Original | WebP 600 px | AVIF 600 px | AVIF 1600 px |
|---|---|---|---|---|
| `nota.jpg` (6595 × 4397) | 4,040 KB | 34 KB | **27 KB** | **111 KB** |
| `semana rojinegra.jpg` (2092 × 1394) | 630 KB | 24 KB | 18 KB | 52 KB |
| `nota.jpg` (2092 × 1394) | 341 KB | 19 KB | 14 KB | 43 KB |
| 9 fotos de plantel (800 × 1200) | 211–231 KB c/u | 29–36 KB | **18–23 KB** | — |
| **Total de las 12** | **6,984 KB** | — | **235 KB (−96.6 %)** | — |

### 2.4 ¿Cuántos MB por visita explican 1.5 TB/mes? **[Estimación]**
Webflow factura el tráfico que sirve: HTML y `cdn.prod.website-files.com`. Las fuentes de Google/Adobe, reCAPTCHA y jsDelivr **no cuentan**. Bytes servidos por Webflow en la primera visita móvil (`datos/bytes-webflow-vs-terceros-movil.csv`): **home 14.1 MB**, notas 1.7 MB en promedio, secciones 2.7 MB e institucionales 0.5 MB.

**Supuestos** (sin acceso a Analytics):
- 250,000 usuarios al mes y 1.6 sesiones por usuario → **~400,000 visitas al mes** y ~800,000 páginas vistas.
- Página de entrada: 25 % home, 60 % notas (tráfico de redes), 10 % secciones y 5 % institucionales.
- Las visitas repetidas aprovechan la caché del navegador (las imágenes tienen `max-age` de 1 año) y solo descargan imágenes nuevas.

| Componente | Cálculo | TB/mes |
|---|---|---|
| Primera visita del mes | 250k × (0.25 × 14.1 + 0.60 × 1.7 + 0.10 × 2.7 + 0.05 × 0.5 MB) = 250k × **4.8 MB** | 1.21 |
| Visitas repetidas (caché caliente) | 150k × ~0.5 MB | 0.08 |
| Páginas adicionales por visita | 400k × ~0.5 MB (imágenes nuevas) | 0.20 |
| **Total** | | **≈ 1.5 TB** ✔ |

- **Promedio: ≈ 3.75 MB por visita** (1.5 TB ÷ 400k visitas).
- **Solo la home explicaría ~60 % del ancho de banda** (250k × 25 % × 14.1 MB ≈ 0.88 TB). Dentro de la home, una sola foto (4 MB) y el video (3.8 MB) pesan más que todo lo demás junto.

Con Analytics se puede ajustar la mezcla real. Aunque la proporción de entradas por la home fuera del 15 %, la conclusión no cambia.

---

## 3. Rendimiento

### 3.1 Lighthouse **[Medido]**

| Grupo | Móvil: Perf | LCP | TBT | CLS máx | Escritorio: Perf | LCP |
|---|---|---|---|---|---|---|
| Home | **49** | **6.9 s** | 987 ms | 0.001 | 84 | 1.8 s |
| Secciones | 43 | 14.5 s | 839 ms | 0.131 | 79 | 2.2 s |
| Institucionales | 47 | 9.1 s | 600 ms | **0.265** (código de conducta) | 78 | 2.6 s |
| **Notas** | **44** | **16.4 s** (máx **33.0 s**) | 889 ms | 0.005 | 68 | 5.2 s |
| **Mediana global** | **44.5** | **14.0 s** | 810 ms | — | 79 | 2.5 s |

Umbrales "buenos" de Google: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1. **Ninguna de las 26 URLs cumple LCP en móvil.** La variación entre corridas es normal: la home dio 31/8.2 s en la primera corrida y 49/6.9 s en la oficial.

### 3.2 Core Web Vitals
- **LCP:** en la home es el `<video>` del hero móvil; en las notas, la imagen de fondo original de `div.header-blog`. Causa raíz: bytes de imagen (§2.2).
- **INP:** Lighthouse no mide INP en laboratorio; su indicador más cercano es **TBT, de 600–2,479 ms en móvil**. En la home: 2.3 s de ejecución de JS, 6.3 s de trabajo en el hilo principal y 1,922 nodos DOM. **Riesgo alto de INP > 200 ms en celulares de gama media.** Hay que confirmarlo con Search Console o CrUX.
- **CLS:** en general bien (< 0.1), salvo en la home femenil (0.131 en móvil), el listado de noticias en escritorio (0.111) y el código de conducta (0.265).

### 3.3 TTFB y caché **[Medido]**
- TTFB en Lighthouse: **46–62 ms** (HTML servido desde la caché de Cloudflare). Con `curl` a través del proxy de salida: 139–1,219 ms. **El servidor no es el problema; lo son los bytes.**
- HTML: `cf-cache-status: HIT` en 21 de 26 URLs y `MISS` en 5. **No envía `Cache-Control`**; el CDN se controla con `surrogate-control: max-age=35040–432000` y se purga al publicar.
- CSS/JS de Webflow: `public, max-age=31536000, immutable` ✔. Imágenes de CMS: `max-age=31536000` ✔. jQuery: `max-age=84600`. Swiper (jsDelivr): `max-age=604800`.

---

## 4. SEO

### 4.1 Hallazgos críticos **[Medido en `datos/seo-muestra.csv`]**

| Problema | Alcance | Evidencia |
|---|---|---|
| **Las notas no tienen título propio** | 15 de 15 notas (≈ 2,630 en total) | `<title>Atlas F.C.</title>`, el mismo para todas |
| **Sin meta descripción** | 15/15 notas y 6/11 páginas | Longitud 0 |
| **Sin Open Graph ni Twitter Card en las notas** | 15/15 | Al compartir una nota en WhatsApp o X **no sale su foto ni su titular** |
| **Sin H1 en las notas** | 15/15 | El titular es `<h3 class="white blogs">` |
| **Sin `<link rel="canonical">`** | 26/26 | Además, `atlasfc.com.mx` y `www.atlasfc.com.mx` **responden 200 los dos** = contenido duplicado |
| **Sin sitemap** | — | `/sitemap.xml` → **404**. `robots.txt` → 200, vacío |
| **Sin RSS** | — | `/post/rss.xml` → 404 |
| **Sin datos estructurados en las notas** | 15/15 | No hay `NewsArticle` |
| `SportsEvent` desactualizado | Home | El JSON-LD anuncia "Atlas FC vs Toluca – Jornada 16", **22/04/2026**, con `url: "/"` relativa |
| Fechas en inglés | Notas | "October 27, 2026" en un sitio `es-MX` |
| URLs heredadas perdidas | Sitio anterior | `/articles/{slug}-{id}` → **404** |

Lighthouse da **SEO 100** en casi todas las páginas porque solo revisa lo básico (que exista `<title>`, que haya viewport, que las páginas sean rastreables). **Esa calificación no refleja los problemas de arriba.**

### 4.2 Lo que está bien
`lang="es-MX"`, HTTPS con 301 desde HTTP, URLs legibles en las notas nuevas, `SportsTeam` en la home con `athlete[]` y `sameAs`, y título y descripción correctos en la home.

### 4.3 Estructura de URLs actual
`/`, `/home-femenil`, `/noticias`, `/noticias?e90dc3fe_page=N`, `/post/{slug}`, `/aficion` (`/boletos` → 301 a `/aficion`), `/patrocinadores`, `/unete-a-la-fiel`, `/visorias` y `/documentacion-oficial/{doc}`. **No existen** `/plantel`, `/calendario` ni `/tienda` (todas dan 404); el plantel y el calendario son anclas dentro de la home.

### 4.4 Inventario de redirecciones 301
Está en **`datos/inventario-urls-301.csv`**: 28 reglas de página o patrón + 24 notas observadas con su URL nueva propuesta y su ID heredado. El listado completo de las ~2,630 notas se genera con el export del CMS durante la migración, sin rastrear el sitio. El resumen de reglas está en `05-plan-migracion.md` §2.2.

---

## 5. Accesibilidad y móvil (WCAG 2.2 AA)

Lighthouse móvil: **82–88** de accesibilidad (mediana 88). Fallas automáticas recurrentes:

| Criterio WCAG | Hallazgo | Ejemplo |
|---|---|---|
| 1.4.3 Contraste mínimo | 5–16 elementos por página | `.text-style-muted`, `.tag-text.grey` sobre fondo claro |
| 2.4.4 / 4.1.2 Propósito y nombre del enlace | **16–25 enlaces sin nombre accesible** por página | Logo de Caliente, íconos sociales, flechas de carrusel (`<a href="#" class="metrics-prev">`) |
| **2.5.8 Tamaño del objetivo (nuevo en 2.2)** | 12 objetivos táctiles por página | Enlaces del menú Varonil/Femenil |
| 1.3.1 Información y relaciones | Saltos en el orden de encabezados; `role="list"` sin `listitem` en Swiper | `<h5>` después de `<h2>`; las notas no tienen H1 |
| 2.5.3 Etiqueta en el nombre | El texto visible no coincide con `aria-label` | Varios botones |
| **2.2.2 Pausar, detener, ocultar** (revisión manual) | El video del hero se repite indefinidamente **sin control de pausa** | `video#…-video autoplay loop` |
| 1.1.1 Contenido no textual (revisión manual) | 68 de 100 imágenes con `alt=""` en la home, incluidas fotos de notas y jugadores que sí aportan información | — |
| 3.1.2 Idioma de las partes | Fechas en inglés | "October 27, 2026" |
| 2.3.3 Animación por interacción (AAA, buena práctica) | No se encontró `prefers-reduced-motion` ni en el HTML ni en el CSS compartido | Carruseles y video siempre en movimiento |

En móvil, además, el TBT de ~0.6–2.5 s hace que los menús y carruseles se sientan lentos en equipos de gama media.

---

## 6. Seguridad

### 6.1 Headers HTTP **[Medido en las 26 URLs]**

| Header | Presente | Valor |
|---|---|---|
| `Strict-Transport-Security` | 26/26 | `max-age=31536000`, **sin** `includeSubDomains` ni `preload` |
| `Content-Security-Policy` | **0/26** | — |
| `X-Frame-Options` / `frame-ancestors` | **0/26** | El sitio se puede incrustar en un iframe (clickjacking) |
| `X-Content-Type-Options` | **0/26** | — |
| `Referrer-Policy` | **0/26** | — |
| `Permissions-Policy` | **0/26** | — |

En el plan Premium, Webflow **no permite definir headers de respuesta**, así que esto no se puede corregir sin cambiar de hosting o poner un proxy delante. Como comparación, la tienda Shopify (`shop.atlasfc.com.mx`) sí envía `content-security-policy: … frame-ancestors 'none'`.

### 6.2 Scripts de terceros
- **Swiper desde jsDelivr con versión flotante `@11` y sin `integrity`.** Si el paquete o el CDN se comprometen, se ejecuta código arbitrario en atlasfc.com.mx. Riesgo de cadena de suministro.
- **59 KB de JS inline** en la home (16 bloques). Esto dificulta una CSP estricta sin nonces.
- La API no oficial de 365scores se consume desde el navegador: es frágil y no hay acuerdo de uso visible.
- jQuery 3.5.1 (2020). No tiene vulnerabilidades críticas conocidas para este uso, pero es una versión antigua.

### 6.3 Formulario "Únete a La Fiel" — riesgo alto **[Medido en el código; no se probó]**
```js
var SHEET_URL = 'https://script.google.com/macros/s/AKfycbyRqcd…/exec';
form.addEventListener('submit', function (e) { e.preventDefault();
  fetch(SHEET_URL, { method: 'POST', body: JSON.stringify({nombre, apellido, telefono, correo}) }) … });
```
- El endpoint es **público y está en el código fuente de las 26 páginas**. Cualquiera, incluido un bot, puede mandarle registros falsos en volumen (spam, envenenamiento de la base de aficionados o agotar la cuota de Apps Script).
- El formulario muestra un widget reCAPTCHA (`data-sitekey="6LcF_j8t…"`), pero el script **intercepta el envío y no manda el token**. Por lo que se lee en el código, el captcha **no protege nada**.
- Los datos personales (nombre, teléfono, correo) terminan en una hoja de Google cuyo control de acceso no se puede auditar desde fuera. Implicaciones para la LFPDPPP: aviso de privacidad, finalidad y derechos ARCO.
- No se encontró banner de consentimiento de cookies y GA4 se carga en todas las páginas.

### 6.4 Correo y DNS **[Medido]**

| Registro | Estado | Riesgo |
|---|---|---|
| SPF | `v=spf1 include:_spf.google.com -all` ✔ | — |
| **DMARC** | **No existe** (`_dmarc.atlasfc.com.mx`) | Cualquiera puede mandar correos que parecen de @atlasfc.com.mx: phishing de boletos, abonos o "premios" |
| DKIM | No se encontró en el selector por defecto de Google (`google._domainkey`) | Verificar en Google Workspace |
| CAA | No existe | Cualquier autoridad certificadora puede emitir certificados para el dominio |
| DNSSEC | No verificado (DNSimple) | — |

### 6.5 Superficie heredada
- `clubatlas.com` es un dominio estacionado con aviso de "may be for sale". Si un tercero lo compra, puede usarlo para suplantar al club. **Evaluar adquirirlo de forma defensiva**, junto con variantes como `atlasfc.mx` o `atlas-fc.com.mx`.

### 6.6 Contexto: ataques automatizados con IA
Los escáneres automatizados, cada vez más asistidos por IA, buscan cuatro cosas: paneles de administración expuestos, endpoints de formularios sin validación, scripts de terceros comprometibles y dominios sin DMARC. **Hoy el sitio no expone panel ni base de datos propios** (es un punto a favor de Webflow), pero sí tiene tres de esos cuatro vectores: el endpoint de Apps Script, Swiper sin SRI y la falta de DMARC. La arquitectura propuesta los cierra sin agregar un panel expuesto (ver `03-propuesta-arquitectura.md` §4).

---

## 7. Flujo editorial

**Cómo se publica hoy (inferido del marcado y de los límites del plan):** el equipo de contenido crea ítems en la colección de notas desde el Editor de Webflow y los publica; el sitio se republica y Cloudflare purga la caché. Las fotos se suben tal como salen de la cámara o de WhatsApp (se ven nombres como `WhatsApp …jpeg`, `nota.jpg` y `19 puebla.jpg`).

Limitaciones de Webflow para una redacción deportiva:

| Necesidad de la redacción | Webflow Premium |
|---|---|
| Optimización automática de fotos subidas al CMS | **No.** La conversión a AVIF/WebP existe para Assets, no para campos de imagen del CMS. Además, la plantilla usa `background-image` |
| Campos SEO por nota (título, descripción, imagen social) | Existen, **pero la plantilla no los usa** (corregible) |
| Galerías de partido (30–80 fotos) | Campo multi-imagen limitado a **25 imágenes** por campo (según la documentación de Webflow) |
| Video | Solo embeds o video de fondo de hasta 30 MB (según la documentación de Webflow); no hay hosting adaptativo |
| Publicación programada | Disponible (Premium) |
| **Flujo de aprobación (redactor → editor → publicar), log de actividad, roles finos** | **Solo en el plan Team ($2,500/mes)** o Enterprise |
| Volumen | 20,000 ítems; con ~2,630 hoy hay margen de varios años |
| Ritmo de publicación en partido (minuto a minuto, marcador en vivo) | No es nativo; hoy depende de la API de 365scores desde el navegador |
| API de CMS | 60–120 peticiones por minuto, suficiente para migrar |
| Búsqueda interna | Se reindexa cada 12 h |

---

## 8. Resumen de hallazgos por severidad

| # | Hallazgo | Severidad | Esfuerzo de corrección |
|---|---|---|---|
| 1 | Imágenes de CMS originales (hasta 4 MB) + `background-image` en notas + lazy load inefectivo | **Crítica (costo y rendimiento)** | Bajo |
| 2 | Notas sin título, descripción, OG, H1, canonical ni sitemap | **Crítica (SEO)** | Bajo |
| 3 | Formulario con datos personales hacia un Apps Script público y captcha sin efecto | **Alta (seguridad y privacidad)** | Bajo |
| 4 | Sin DMARC ni CAA | **Alta (suplantación)** | Muy bajo |
| 5 | Video del hero duplicado y en autoplay (3.8 MB) | Alta | Muy bajo |
| 6 | Sin headers de seguridad (CSP, XFO, nosniff) | Media-alta | Requiere proxy o migración |
| 7 | Swiper flotante sin SRI | Media | Muy bajo |
| 8 | 44 archivos de fuentes (~1 MB) y reCAPTCHA en todas las páginas | Media | Bajo |
| 9 | Contenido duplicado entre apex y www | Media | Muy bajo |
| 10 | URLs `/articles/` heredadas en 404 | Media | Medio |
| 11 | Accesibilidad: enlaces sin nombre, contraste, objetivos táctiles, video sin pausa | Media | Medio |
| 12 | API no oficial de 365scores desde el cliente | Media | Medio |

---

## 9. Quick wins (próximas 2 semanas, sin migrar)

Ordenados por impacto / esfuerzo. Son las tareas de la **Fase 0** de `05-plan-migracion.md`.

1. **Imágenes de notas:** cambiar la cabecera de la plantilla de nota de `background-image` a un elemento **Image** ligado al campo del CMS (Webflow genera `srcset`). Reemplazar las ~20 imágenes de más de 1 MB de las notas recientes por versiones ≤1600 px y ≤200 KB. **Regla editorial: exportar a 1600 px antes de subir.**
2. **Home:** dejar un solo `<video>` (escritorio) con el WebM primero y un clip recomprimido ≤600 KB; en móvil, solo el póster. Limitar los carruseles a 6 tarjetas visibles y cargar las fotos del plantel en 600 px AVIF.
3. **SEO de notas:** en la plantilla, `Título SEO = {Nombre} | Atlas FC`, `Descripción = {Resumen}`, `OG image = {Imagen principal}`, titular en H1. Activar el **sitemap automático** y el **RSS**, y poner el dominio `www` como predeterminado con 301 desde el apex.
4. **Seguridad:** publicar DMARC `v=DMARC1; p=none; rua=mailto:dmarc@atlasfc.com.mx` (endurecer a `quarantine` y luego `reject` en 6 semanas), activar DKIM en Google Workspace, agregar CAA (`letsencrypt.org`, `pki.goog` y la CA de Webflow), fijar Swiper a una versión exacta con `integrity` y sacar el formulario del Apps Script público (usar el formulario nativo de Webflow con reCAPTCHA verificado o un Worker con Turnstile).
5. **Peso de terceros:** cargar reCAPTCHA solo en `/unete-a-la-fiel` y reducir las fuentes a 2 familias.
6. **Facturación:** después de 3 semanas midiendo el consumo nuevo, **bajar el add-on de ancho de banda**. Con la estimación de ~320 GB: $39 + $210 (con margen) = **$249/mes**, o **$189** con +250 GB. **Ahorro: $650–710 al mes desde el segundo mes.**

Impacto estimado en peso: home de 15.8 MB a **~2 MB**, nota media de 3.3 MB a **~1.5 MB** (de los cuales ~1 MB serían fuentes y JS de terceros, que solo se resuelven del todo con la migración).
