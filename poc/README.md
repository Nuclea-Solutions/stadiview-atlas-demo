# PoC — StadiView by Nuclea · Selección de asientos (Atlas / Estadio Jalisco)

Prueba de concepto de la experiencia de compra de la plataforma propuesta a Atlas, construida sobre **datos reales** extraídos del inventario público de Fanki (evento `ABN_ATS_V02_TEMP_202627`, Pase Rojinegro Temporada 26–27).

## Cómo correrla
El proyecto ya usa Vite. Con el server corriendo (`npm run dev`), abre:

```
http://localhost:5173/poc/
```

No requiere build ni dependencias extra (vanilla JS + un JSON de datos).

## Qué demuestra (vs. el flujo actual de Fanki)
- **Mapa del estadio interactivo** con las 9 zonas reales, colores reales, precio y disponibilidad reales.
- **Grid de asientos real** por sección (filas Z→A, estados Disponible/Vendido/Apartado tal cual el inventario).
- **Score de vista por asiento** (0–100) — diferenciador que Fanki no tiene; hoy se elige a ciegas.
- **Asiento sugerido** (mejor vista disponible en la sección).
- **Disponibilidad en vivo**, carrito con tope por persona (real: `maxByFan=4`) y total.
- Checkout marcado como PoC (el pago real reutilizaría el procesador tokenizado — Mercado Pago/Adyen).

## Estructura
```
poc/
  index.html      # estructura + vistas (estadio / sección / carrito)
  styles.css      # identidad rojinegro, claro/oscuro
  app.js          # render data-driven, score de vista, carrito
  data/
    jalisco-matrix.json   # matriz compacta (9 zonas, 51 secciones, 18,328 asientos)
```

## Procedencia de los datos
Extraídos de endpoints **públicos** de Fanki (sin autenticación, los mismos JSON que carga el navegador de cualquier visitante):
- `GET /api/stadiums/ABN_ATS_V02_TEMP_202627` — zonas, precios, disponibilidad.
- `GET /api/stadiums/sections?eventCode=…&sectionCode=…` — grid de asientos por sección.

Matriz cruda completa (para referencia/regenerar): [`../docs/fanki-matriz-boletos-completa.json`](../docs/fanki-matriz-boletos-completa.json).

### Snapshot capturado (17 jul 2026)
| Dato | Valor |
|---|---|
| Estadio | Estadio Jalisco |
| Zonas / secciones | 9 / 51 |
| Asientos mapeados | 18,328 |
| Disponibles al momento | 15,302 |
| Máx. por persona | 4 |
| `qrType` | **`STATIC_DEFAULT`** (QR estático — no rotativo) |
| `enableQueue` | **`false`** (sin fila virtual en este evento) |

> **Hallazgo relevante para el pitch:** el inventario de Fanki declara `qrType: STATIC_DEFAULT` y `enableQueue: false`. Un QR **estático** es capturable por screenshot y duplicable — refuerza el diferenciador de "QR dinámico/rotativo firmado" de la propuesta Nuclea. Y `enableQueue:false` confirma la ausencia de fila virtual en el flujo del Atlas.

## Vista del estadio y paleta
El mapa es un **bowl elíptico** (forma de estadio real, cancha con marcas) con dos anillos: interior = lower bowl (preferentes/premium), exterior = tribunas amplias. La disposición sigue la orientación real de Fanki (Poniente arriba, Oriente abajo, Sur izquierda, Norte derecha).

Los colores **no** replican el arcoíris saturado de Fanki: se eligió una **paleta apagada/premium acorde a la identidad de atlasfc.com.mx** (oro para San Matías, platino para VIP, y tonos joya apagados para el resto), dejando el **rojo Atlas `#E90E12` reservado para acciones y selección**. Cada etiqueta de zona lleva una placa de fondo oscura con borde del color de la zona para que los textos **no se encimen** entre sí. Los mismos colores fluyen a los asientos disponibles del grid; vendido = gris, apartado = ámbar, seleccionado = rojo Atlas.

## Dos modos de estadio: Mapa 2D vs Estadio 3D
En la vista del estadio hay un **toggle `MAPA 2D / ESTADIO 3D`**:
- **Mapa 2D** (por defecto): el mapa esquemático plano — es el **flujo de compra** funcional (zonas → secciones → asiento → carrito, con inventario real).
- **Estadio 3D**: el estadio 3D del repo base incrustado **inline** en **vista general**; al **hacer clic en cualquier asiento** entras al **detalle de la vista desde ahí** (primera persona), y `BACK TO STADIUM` regresa a la vista general. Es un modo de **exploración/visualización**.

Cualquier navegación 2D (clic en una zona, breadcrumb) regresa automáticamente al Mapa 2D. El iframe 3D se carga una sola vez (perezoso, al abrir el tab por primera vez).

> Además del tab, sigue existiendo el botón **"Ver en 3D"** en el panel del asiento seleccionado (2D): abre el mismo estadio 3D en un modal saltando **directo** a ese asiento. Dos caminos al 3D: explorar (tab) o previsualizar tu asiento exacto (modal).

## Vista 3D unificada con el estadio 3D del repo base
El diferenciador estrella ya está integrado: al seleccionar un asiento, el botón **"Ver en 3D — vista desde tu asiento"** abre un **modal con el estadio 3D del repo base** (`/index.html`, Three.js) incrustado por iframe, entrando **directo a la vista en primera persona** desde un asiento del tier equivalente a la zona elegida.

- La PoC llama al 3D con `/index.html?embed=1&enter=seat&tier=N`.
- El base ahora entiende esos parámetros: `embed=1` oculta su chrome (nav, panel, controles), `tier=N` elige el nivel (0 premium/cerca → 2 general/alto) y `enter=seat` entra directo a la vista del asiento (`flyToSeat`). Sin parámetros, el estadio 3D funciona **igual que antes** en la raíz `/` (los cambios están protegidos por parámetros).
- El mapeo zona→tier usa el precio: `≥$15,000 → 0`, `≥$5,500 → 1`, resto `→ 2`.

Nota honesta: el modelo 3D base es un estadio genérico generado matemáticamente; la vista es **representativa del tier/zona**, no del asiento exacto. En producción se sustituye por la geometría real del Estadio Jalisco para que la vista sea asiento-exacta.

## Pantalla de inicio + dos flujos: Abono vs Partido
La PoC arranca en una **pantalla de inicio** (`¿Cómo quieres vivir el Jalisco?`) donde el usuario elige entre dos accesos, y **el flujo se ramifica** según la elección:

- **Abono** → entra directo a la selección de asiento. Strip de temporada: `PASE ROJINEGRO · TEMPORADA 26–27`.
- **Partido** → pasa primero por una **lista de próximos partidos** (Atlas vs Guadalajara/América/Pumas/Cruz Azul, con fecha, jornada, escudo/monograma del rival y precio); al elegir uno, entra a la selección de asiento con el **encabezado de duelo** dinámico de ese partido (competición, hora, `ATLAS [escudo] — [rival]`), al estilo de sitios de club (p. ej. realmadrid.com).

Ambos flujos comparten el **mismo mapa de asientos**; solo cambian el encabezado y el contexto. El botón **`↺ Cambiar evento`** regresa a la pantalla de inicio. Deep-links: `?tipo=abono` y `?tipo=partido` (compartibles). El escudo de Chivas es real; los demás rivales usan un badge de monograma (placeholder) — en producción se usan los crests oficiales del feed de la Liga MX.

## Homogeneidad con las tablas del sitio
El top bar usa el **escudo oficial de Atlas** (`assets/atlas-crest.svg`, tomado del sitio). El panel de selección (ZONAS y secciones) se alineó con la **TABLA GENERAL** del sitio oficial: **lavado de gradiente vino**, encabezado de columnas en mono (`ZONA / DESDE`), **filas continuas con divisores** (no cajas sueltas) y **fila activa/hover en rojo Atlas sólido a todo lo ancho** — el mismo patrón con que el sitio resalta al Atlas en su tabla de posiciones.

## Responsive
Funciona en móvil, tablet y escritorio. Breakpoints: la vista se apila en una columna bajo **860px**; bajo **640px** el top bar reordena (el contador de disponibles baja a su línea, el carrito no se corta), el strip de partido apila los equipos, los paneles dejan de ser sticky y el modal/drawer 3D usan casi todo el viewport; bajo **400px** se compactan asientos y etiquetas. El grid de asientos siempre hace scroll horizontal dentro de su contenedor, nunca desborda la página.

## Notas honestas
- El **score de vista** es un modelo *estimado* (nivel de precio + cercanía a cancha + centrado horizontal), no una medición 3D real; está etiquetado como "estimada" en la UI. Con el modelo 3D del estadio (repo base StadiView) se sustituiría por un cálculo geométrico real.
- El mapa de zonas es **esquemático** (dos anillos con sectores por zona); la geometría exacta de tribunas del Jalisco se afinaría en producción.
- Es un prototipo de front-end: sin backend, sin locking de inventario, sin pago real.
