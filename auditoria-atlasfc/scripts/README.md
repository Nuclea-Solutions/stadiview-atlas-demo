# Scripts de auditoría (solo lectura)

Orden de ejecución, desde esta carpeta:

```bash
node 01-descubrir.mjs     # robots.txt + sitemap -> datos/inventario-urls.csv, datos/muestra-urls.txt (≤50)
./02-headers.sh           # curl -I por URL, 1/s -> datos/headers/, datos/headers-resumen.csv
node 03-pesos.mjs         # Chromium móvil, peso por tipo de recurso -> datos/pesos/, datos/pesos-resumen.csv
./04-lighthouse.sh        # Lighthouse móvil+escritorio (8 URLs) -> datos/lighthouse/
```

Límites que aplican los scripts: 1 petición/s al origen (`comun.mjs`), respeta `robots.txt`
(Allow/Disallow para `*`), muestra máxima de 50 URLs (`MAX_URLS`), pausa de 3 s entre cargas
completas y 5 s entre corridas de Lighthouse. User-Agent identificable: `NucleaAuditBot/1.0`.
