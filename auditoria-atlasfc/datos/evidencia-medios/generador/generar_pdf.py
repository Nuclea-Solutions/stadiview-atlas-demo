"""PDF de evidencia: imágenes y video que inflan la home de atlasfc.com.mx."""
import csv
import sys
from pathlib import Path

SKILL = "/root/.claude/skills/synced/96598755-4789-4a86-b729-2074f8770397_884e3842-88b3-4217-b2ca-5b66e7c737ca/nuclea-pdf-internal-reports/assets"
sys.path.insert(0, SKILL)
from nuclea_pdf import (Documento, MARGEN, DERECHA, UTIL, BARLOW_LIGHT, BARLOW_MEDIUM,
                        MONO_LIGHT, MONO_MEDIUM, TINTA, TEXTO_2, TEXTO_3, TEXTO_4,
                        REGLA, TRACK_NORMAL)
from reportlab.lib.utils import ImageReader

AQUI = Path(__file__).parent
DATOS = Path("/home/user/stadiview-atlas-demo/auditoria-atlasfc/datos")
SALIDA = "/home/user/stadiview-atlas-demo/auditoria-atlasfc/06-evidencia-medios-home.pdf"

QUE_ES = {
    "img1": ("Nota · Con el aliento de La Fiel, Atlas FC remontó a Puebla en el Jalisco", "Tarjeta de noticias"),
    "img2": ("Nota · Semana Rojinegra: Atlas FC busca seguir entre los líderes en San Luis", "Tarjeta de noticias"),
    "img3": ("Nota · Las voces del triunfo Rojinegro ante Puebla", "Tarjeta de noticias"),
    "img4": ("Edgar Zaldívar · Mediocampista · 6", "Carrusel de plantel"),
    "img5": ("Antonio Sánchez · Portero · 22", "Carrusel de plantel"),
    "img6": ("Camilo Vargas · Portero · 12", "Carrusel de plantel"),
    "img7": ("Jorge Sánchez · 3", "Carrusel de plantel"),
    "img8": ("Jorge San Martín · Defensa · 218", "Carrusel de plantel"),
    "img9": ("DUK · Delantero · 11", "Carrusel de plantel"),
    "img10": ("Rivaldo Lozano · Defensa · 17", "Carrusel de plantel"),
    "img11": ("Manuel Capasso · Defensa · 28", "Carrusel de plantel"),
    "img12": ("Gaddi Aguirre · Defensa · 13", "Carrusel de plantel"),
}


def kb(n):
    return f"{int(n):,} KB"


def imagen(doc, ruta, ancho, alto, x=MARGEN, pie=None):
    """Imagen con pie en mono; respeta la paginación del documento."""
    doc._asegurar(alto + (20 if pie else 6))
    doc.c.drawImage(ImageReader(str(ruta)), x, doc.y - alto, ancho, alto)
    doc.y -= alto
    if pie:
        doc.texto(x, doc.y - 11, pie, MONO_LIGHT, 6.2, TEXTO_3, TRACK_NORMAL)
        doc.y -= 11
    doc.y -= 14


def encajar(ruta, caja_w, caja_h):
    w, h = ImageReader(str(ruta)).getSize()
    k = min(caja_w / w, caja_h / h)
    return w * k, h * k


def tabla_imagenes(doc, filas):
    cols = [("", MARGEN), ("#", MARGEN + 70), ("QUÉ ES", MARGEN + 90), ("ORIGINAL", 330),
            ("AVIF 600", 404), ("AVIF 1600", 452), ("AHORRO", 506)]

    def cabecera():
        for t, x in cols:
            doc.texto(x, doc.y, t, MONO_LIGHT, 6.2, TEXTO_3, TRACK_NORMAL)
        doc.regla(doc.y - 7, TINTA, 0.35)
        doc.y -= 20

    doc._asegurar(120)
    cabecera()
    for f in filas:
        alto = 62
        folio = doc.folio
        doc._asegurar(alto + 10)
        if doc.folio != folio:
            cabecera()
        n = f["archivo"][:-4]
        mini = AQUI / "thumbs" / f["archivo"]
        w, h = encajar(mini, 62, alto - 6)
        doc.c.drawImage(ImageReader(str(mini)), MARGEN, doc.y - h + 8, w, h)
        base = doc.y
        doc.texto(MARGEN + 70, base, f"{int(n[3:]):02d}", MONO_LIGHT, 11, TEXTO_4)
        titulo, donde = QUE_ES[n]
        y = doc.parrafo(MARGEN + 90, base, titulo, 330 - (MARGEN + 90) - 10, BARLOW_MEDIUM, 9, TINTA, 11.5)
        doc.texto(MARGEN + 90, y - 1, donde.upper(), MONO_LIGHT, 6.2, TEXTO_3, TRACK_NORMAL)
        doc.texto(330, base, kb(f["original_KiB"]), MONO_MEDIUM, 7.4, TINTA)
        doc.texto(330, base - 11, f"{f['ancho']}×{f['alto']} px", MONO_LIGHT, 6.6, TEXTO_2)
        doc.texto(404, base, kb(f["avif_600_KiB"]), MONO_LIGHT, 7.4, TINTA)
        doc.texto(452, base, kb(f["avif_1600_KiB"]) if f["avif_1600_KiB"] else "—", MONO_LIGHT, 7.4,
                  TINTA if f["avif_1600_KiB"] else TEXTO_4)
        ahorro = 100 * (1 - int(f["avif_600_KiB"]) / int(f["original_KiB"]))
        doc.texto(506, base, f"−{ahorro:.1f} %", MONO_MEDIUM, 7.4, TINTA)
        doc.y -= alto
        doc.regla(doc.y + 8, REGLA, 1)
        doc.y -= 8


def main():
    filas = list(csv.DictReader(open(DATOS / "experimento-recompresion-imagenes.csv", encoding="utf-8")))
    filas.sort(key=lambda r: int(r["archivo"][3:-4]))
    total_o = sum(int(r["original_KiB"]) for r in filas)
    total_a = sum(int(r["avif_600_KiB"]) for r in filas)

    doc = Documento(SALIDA, cornisa="AUDITORÍA ATLASFC.COM.MX / MEDIOS DE LA HOME",
                    titulo_pdf="Evidencia de medios pesados — home atlasfc.com.mx")

    doc.portada(
        antetitulo="AUDITORÍA / EVIDENCIA TÉCNICA",
        titulo=["Qué pesa en la home", "de atlasfc.com.mx"],
        subtitulo="Las 12 imágenes más pesadas y el video del hero, con su versión optimizada",
        metadatos=[("EMPRESA", "Nuclea Solutions"),
                   ("SITIO AUDITADO", "www.atlasfc.com.mx (Webflow)"),
                   ("ELABORADO POR", "Marlon Espinosa Pérez"),
                   ("FECHA DE MEDICIÓN", "27 de octubre de 2026"),
                   ("HERRAMIENTAS", "Lighthouse 12.8.2 · Playwright · sharp · ffmpeg")],
        pie_izquierdo="NUCLEA SOLUTIONS / AUDITORÍA WEB",
    )

    # ---------------------------------------------------------- cómo leer
    doc.seccion("CÓMO LEER ESTE DOCUMENTO")
    doc.campo("QUÉ MUESTRA", "Los archivos concretos que hacen que la página de inicio pese 15.8 MB en "
              "un celular: qué foto o video es cada uno, dónde aparece, cuánto pesa hoy y cuánto pesaría "
              "optimizado, medido con los mismos archivos del sitio.")
    doc.y -= 6
    doc.campo("CÓMO SE MIDIÓ", "Lighthouse en perfil móvil registró cada descarga de la home. Las 12 "
              "imágenes JPEG más pesadas y el video se descargaron una vez y se recomprimieron con sharp "
              "(WebP q75, AVIF q50) y ffmpeg. Playwright midió a qué tamaño se muestra cada una en pantalla.")
    doc.y -= 6
    doc.campo("ARCHIVOS", "auditoria-atlasfc/datos/experimento-recompresion-imagenes.csv · "
              "experimento-video-hero.csv · tamano-mostrado-imagenes-home.csv · lighthouse/01-movil.json")
    doc.y -= 14

    doc.seccion("RESUMEN")
    cols = [("ELEMENTO", MARGEN, 190), ("HOY", 260, 90), ("OPTIMIZADO", 360, 100), ("AHORRO", 470, 80)]
    doc.tabla(cols, [
        ["12 imágenes más pesadas (3 notas + 9 jugadores)", (kb(total_o), "mono"), (kb(total_a), "mono"),
         (f"−{100 * (1 - total_a / total_o):.1f} %", "mono")],
        ["Solo la foto de la nota más reciente", (kb(4040), "mono"), (kb(27), "mono"), ("−99.3 %", "mono")],
        ["Video del hero (descargado dos veces)", ("3,896 KB", "mono"), ("32 KB móvil", "mono"), ("−99.2 %", "mono")],
        ["Video del hero en escritorio (una descarga, AV1)", ("3,896 KB", "mono"), ("599 KB", "mono"), ("−84.6 %", "mono")],
    ])
    doc.y -= 4
    doc.campo("LECTURA", "Ninguna de estas 12 imágenes está en pantalla cuando la página termina de "
              "cargar, pero el navegador las descarga todas. Junto con el video suman 10.6 MB de los 14.1 MB "
              "que Webflow sirve, y factura, en cada primera visita a la home desde un celular.")

    # ---------------------------------------------------------- foto de 4 MB
    doc.salto()
    doc.seccion("01 · LA FOTO DE 4 MB")
    w, h = encajar(AQUI / "img1_vista.jpg", UTIL, 215)
    imagen(doc, AQUI / "img1_vista.jpg", w, h,
           pie="6adfc569b4720c4ef2872752_nota.jpg · 6,595 × 4,397 px · 4,040 KB · original de cámara")
    doc.campo("NOTA", "Con el aliento de La Fiel, Atlas FC remontó a Puebla en el Jalisco (27/10/2026).")
    doc.y -= 4
    doc.campo("DÓNDE APARECE", "Tarjeta del carrusel de noticias de la home y cabecera de la nota. "
              "En los dos casos se usa como background-image de CSS, que no admite srcset: todos los "
              "dispositivos descargan el original completo.")
    doc.y -= 4
    doc.campo("EN PANTALLA", "348 × 187 px en celular y 392 × 267 px en escritorio. El original es "
              "16.8 veces más ancho de lo que se muestra en escritorio.")
    doc.y -= 4
    doc.campo("OPTIMIZADA", "AVIF a 600 px: 27 KB (tarjeta). AVIF a 1600 px: 111 KB (cabecera de nota).")
    doc.y -= 12

    doc.seccion("MISMO RECORTE AL 100 %, ORIGINAL CONTRA AVIF")
    cw = (UTIL - 12) / 2
    ch = cw * 380 / 560
    doc._asegurar(ch + 24)
    top = doc.y
    doc.c.drawImage(ImageReader(str(AQUI / "cmp_original.jpg")), MARGEN, top - ch, cw, ch)
    doc.c.drawImage(ImageReader(str(AQUI / "cmp_avif.jpg")), MARGEN + cw + 12, top - ch, cw, ch)
    doc.texto(MARGEN, top - ch - 11, "REFERENCIA SIN PÉRDIDA A 1600 PX", MONO_LIGHT, 6.2, TEXTO_3, TRACK_NORMAL)
    doc.texto(MARGEN + cw + 12, top - ch - 11, "AVIF Q50 A 1600 PX · 111 KB", MONO_LIGHT, 6.2, TEXTO_3,
              TRACK_NORMAL)
    doc.y = top - ch - 30

    # ---------------------------------------------------------- 12 imágenes
    doc.salto()
    doc.seccion("02 · LAS 12 IMÁGENES MÁS PESADAS DE LA HOME")
    doc.campo("CRITERIO", "Ordenadas por bytes transferidos en Lighthouse móvil. AVIF 600 es el tamaño "
              "adecuado para tarjeta; AVIF 1600, para cabecera de nota. El ahorro se calcula contra AVIF 600.")
    doc.y -= 12
    tabla_imagenes(doc, filas)
    doc.campo("TOTAL", f"{kb(total_o)} hoy contra {kb(total_a)} en AVIF 600: "
              f"−{100 * (1 - total_a / total_o):.1f} %.")
    doc.y -= 4
    doc.campo("PLANTEL", "Las 9 fotos de jugadores son JPEG de 800 × 1200 px (~215 KB) que se muestran a "
              "321 × 400 px en celular. Están en un carrusel fuera de pantalla y se descargan igual.")

    # ---------------------------------------------------------- video
    doc.salto()
    doc.seccion("03 · EL VIDEO DEL HERO")
    fw = (UTIL - 3 * 8) / 4
    fh = fw * 720 / 1280
    doc._asegurar(fh + 24)
    top = doc.y
    for i in range(4):
        doc.c.drawImage(ImageReader(str(AQUI / "thumbs" / f"v_frame{i + 1}.jpg")),
                        MARGEN + i * (fw + 8), top - fh, fw, fh)
        doc.texto(MARGEN + i * (fw + 8), top - fh - 11, f"SEG {[0.8, 2.8, 4.8, 6.9][i]}",
                  MONO_LIGHT, 6.2, TEXTO_3, TRACK_NORMAL)
    doc.y = top - fh - 30
    doc.campo("ARCHIVO", "6a3ed965eb4a459ec3a0ab55_Video-Hero_mp4.mp4", mono=True)
    doc.campo("QUÉ ES", "Clip en bucle de 8.07 s, 1280 × 720, 30 fps, sin audio, como fondo de la "
              "portada (afición con bengalas rojas en el exterior del estadio).")
    doc.y -= 4
    doc.campo("DOBLE DESCARGA", "La home tiene dos <video autoplay loop> con el mismo archivo: "
              ".video-desktop y .hero-bg-video-mobile. Uno siempre está oculto con display:none, pero el "
              "navegador descarga los dos. Lighthouse registró 2 × 1,948 KB en móvil y en escritorio.")
    doc.y -= 4
    doc.campo("FORMATOS", "El MP4 (H.264) va antes que el WebM. El WebM usa VP8, un códec "
              "antiguo, y pesa más (2,322 KB): no aporta ahorro.")
    doc.y -= 12

    doc.seccion("PRUEBAS DE RECOMPRESIÓN (MISMO CLIP)")
    cols = [("VARIANTE", MARGEN, 200), ("CÓDEC", 270, 70), ("RESOLUCIÓN", 345, 70), ("PESO", 420, 60),
            ("VS HOY", 490, 60)]
    doc.tabla(cols, [
        ["Original MP4 (servido hoy)", ("H.264", "mono"), ("1280×720", "mono"), ("1,946 KB", "mono"), ("—", "mono")],
        ["Original WebM (servido hoy)", ("VP8", "mono"), ("1280×720", "mono"), ("2,322 KB", "mono"), ("+19 %", "mono")],
        ["H.264 CRF 30", ("H.264", "mono"), ("1280×720", "mono"), ("633 KB", "mono"), ("−67 %", "mono")],
        ["AV1 CRF 42 (escritorio)", ("AV1", "mono"), ("1280×720", "mono"), ("599 KB", "mono"), ("−69 %", "mono")],
        ["H.264 CRF 30, versión móvil", ("H.264", "mono"), ("854×480", "mono"), ("329 KB", "mono"), ("−83 %", "mono")],
        ["Póster AVIF (recomendado en móvil)", ("AVIF", "mono"), ("1280×720", "mono"), ("32 KB", "mono"), ("−98 %", "mono")],
    ])

    # ---------------------------------------------------------- qué hacer
    doc.salto()
    doc.seccion("04 · QUÉ CORREGIR")
    doc.bloque("01", "Fotos de notas", campos=[
        ("CAMBIO", "Cambiar background-image por un elemento Image ligado al campo del CMS para que "
                   "Webflow genere srcset, y reemplazar las fotos de más de 1 MB."),
        ("REGLA EDITORIAL", "Exportar a 1600 px de ancho antes de subir. Nunca el original de cámara."),
        ("AHORRO", "~4.8 MB por visita a la home (3 fotos de notas) y ~3.9 MB por lectura de la nota."),
    ])
    doc.bloque("02", "Video del hero", campos=[
        ("CAMBIO", "Dejar un solo <video> (escritorio), con un clip AV1 o H.264 de ≤600 KB cargado "
                   "después del contenido principal. En celular, solo el póster en AVIF."),
        ("AHORRO", "~3.8 MB por visita en celular y ~3.2 MB en escritorio."),
    ])
    doc.bloque("03", "Carrusel de plantel", campos=[
        ("CAMBIO", "Fotos en AVIF a 600 px y carga diferida real: solo las tarjetas visibles."),
        ("AHORRO", "~1.8 MB por visita a la home."),
    ])
    doc.callout("CIERRE",
                intro="Tres correcciones sin cambiar de plataforma eliminan ~10.4 MB de los 14.1 MB que "
                      "Webflow sirve por visita a la home. Ese es el origen del paquete de ancho de banda de "
                      "$860 USD al mes.",
                puntos=["Imágenes: −96.6 % medido con los archivos reales del sitio",
                        "Video: de 2 descargas de 1.9 MB a 1 de ≤600 KB, o 32 KB en celular",
                        "Calidad visual: sin diferencia perceptible (ver página 03)"])
    doc.firma("Marlon Espinosa Pérez", "Director General · Nuclea Solutions", "marlon@nuclea.solutions")
    doc.guardar()
    print(SALIDA)


if __name__ == "__main__":
    main()
