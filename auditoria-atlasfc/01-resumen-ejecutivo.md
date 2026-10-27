# Resumen ejecutivo · Sitio oficial atlasfc.com.mx

**Para:** Directiva del Club Atlas · **De:** Nuclea Solutions · **Fecha:** 27 de octubre de 2026

## El problema
El sitio cuesta **~$900 USD al mes (~$10,800 al año)**. Casi todo ese dinero no paga el servicio de Webflow, sino el **exceso de datos que el propio sitio envía**: $860 de los $899 mensuales son un paquete extra de ancho de banda.

La causa es concreta y la medimos: **la página de inicio pesa 16 MB** en un celular, unas 8 veces más de lo recomendable. Una sola foto de una nota pesa 4 MB porque se subió tal como salió de la cámara, y el video de portada se descarga dos veces. Eso tiene tres consecuencias:

- **Cuesta dinero cada mes.**
- **El sitio es lento:** en celular tarda entre 7 y 16 segundos en mostrar lo principal; lo recomendado es menos de 2.5.
- **Las noticias casi no aparecen en Google** y, al compartirlas por WhatsApp, no muestran ni foto ni titular: las ~2,600 notas se llaman igual, "Atlas F.C.".

También encontramos **tres puntos de seguridad** que hoy aprovechan los ataques automatizados, cada vez más apoyados en inteligencia artificial:

- El formulario "Únete a La Fiel" envía nombre, teléfono y correo de los aficionados a una dirección pública sin protección real.
- Cualquiera puede mandar correos haciéndose pasar por @atlasfc.com.mx; esto es la base del fraude de boletos.
- El sitio carga código de terceros sin verificar su integridad.

## La recomendación, en dos pasos

| Paso | Qué es | Tiempo | Inversión única (estimada) | Costo mensual después |
|---|---|---|---|---|
| **1. Optimizar ya** (sin cambiar de plataforma) | Fotos y video ligeros, Google bien configurado, cerrar los tres riesgos de seguridad | **2 semanas** | ~$1,600 | **~$249** (hoy $899) |
| **2. Migrar a una plataforma propia** | Sitio en Cloudflare con un gestor de noticias más cómodo para la redacción; los datos y respaldos quedan **a nombre del club** | **12 semanas** | ~$16,000 | **~$225**, incluido el mantenimiento |

- **Ahorro del paso 1:** ~$650 al mes (~$7,800 al año). **Se paga solo en unos 3 meses.**
- **Ahorro total respecto a hoy:** ~$674 al mes (~$8,100 al año).

El paso 2 **no se justifica solo por el ahorro**: casi todo el ahorro llega con el paso 1. Se justifica porque:

1. **Seguridad:** el sitio público queda sin panel de administración ni base de datos expuestos.
2. **Costo fijo** aunque haya picos de tráfico por partido o fichaje.
3. **Mejor herramienta para la redacción:** galerías, programación y roles de aprobación.
4. **Base para la plataforma de boletaje propia y el estadio en 3D** sin afectar la velocidad del sitio. Es lo que permite **recuperar la propiedad del canal digital** que hoy está repartido entre proveedores.

## Lo que necesitamos para arrancar
1. **Autorización para el paso 1** (2 semanas).
2. **Accesos de solo lectura** a Webflow, Google Analytics y Search Console, y la **factura de Webflow** para confirmar las cifras con datos reales del club.
3. Una persona de la redacción como enlace para definir reglas de fotos y probar el nuevo gestor.

*Todas las cifras de tráfico y peso fueron medidas el 27/10/2026. Los ahorros son estimaciones con supuestos documentados en `02-auditoria-tecnica.md` y `04-modelo-costos.csv`. La tarifa de horas es supuesta y se puede ajustar.*
