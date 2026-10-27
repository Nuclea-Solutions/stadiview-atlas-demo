// Paso 3: carga real de cada página (Chromium, perfil móvil) y mide bytes transferidos por tipo de recurso,
// dominios de terceros, formatos de imagen, lazy load, video, y metadatos SEO/a11y básicos del DOM.
// Pausa >=3 s entre páginas; el sitio recibe 1 documento HTML por página (los assets salen del CDN).
import { createRequire } from 'node:module';
// playwright viene preinstalado globalmente; require() lo resuelve vía NODE_PATH, import no.
const { chromium } = createRequire(import.meta.url)('playwright');
import { SITIO, UA, guardar, leer, dormir } from './comun.mjs';

const urls = leer('muestra-urls.txt').split('\n').filter(Boolean);
const host = new URL(SITIO).hostname.replace(/^www\./, '');
const browser = await chromium.launch();
const ctx = await browser.newContext({
  userAgent: UA + ' Mobile', viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
});
const tipo = (t, mime, url) => {
  if (t === 'Document') return 'html';
  if (t === 'Script') return 'js';
  if (t === 'Stylesheet') return 'css';
  if (t === 'Font') return 'fuentes';
  if (t === 'Image' || /^image\//.test(mime)) return 'imagenes';
  if (t === 'Media' || /^video\/|^audio\/|\.(m3u8|ts|mp4|webm)(\?|$)/.test(mime + url)) return 'video';
  if (t === 'XHR' || t === 'Fetch') return 'xhr';
  return 'otros';
};

const resumen = [];
for (const [i, url] of urls.entries()) {
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  const reqs = new Map(); let fase = 'inicial';
  cdp.on('Network.responseReceived', (e) => reqs.set(e.requestId, {
    url: e.response.url, status: e.response.status, mime: e.response.mimeType, tipo: tipo(e.type, e.response.mimeType, e.response.url),
    cache: e.response.headers['cache-control'] || e.response.headers['Cache-Control'] || '', fase, bytes: 0,
  }));
  cdp.on('Network.loadingFinished', (e) => { const r = reqs.get(e.requestId); if (r) r.bytes = e.encodedDataLength; });

  let error = null;
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    fase = 'scroll';
    // Recorre la página completa para disparar lazy load y medir el peso "visita completa".
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 250)); }
    });
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await dormir(5000); // deja correr videos autoplay / beacons unos segundos
  } catch (e) { error = String(e.message || e); }

  const dom = await page.evaluate(() => {
    const m = (s) => document.querySelector(s)?.getAttribute('content') || '';
    const imgs = [...document.images];
    const jsonld = [...document.querySelectorAll('script[type="application/ld+json"]')].flatMap((s) => {
      try { const j = JSON.parse(s.textContent); return [j].flat().flatMap((x) => x['@graph'] || [x]).map((x) => x['@type']); } catch { return ['(json-ld inválido)']; }
    });
    return {
      title: document.title, titleLen: document.title.length,
      description: m('meta[name="description"]'), canonical: document.querySelector('link[rel="canonical"]')?.href || '',
      robots: m('meta[name="robots"]'), lang: document.documentElement.lang, generator: m('meta[name="generator"]'),
      webflow: { site: document.documentElement.dataset.wfSite || '', page: document.documentElement.dataset.wfPage || '' },
      og: { title: m('meta[property="og:title"]'), image: m('meta[property="og:image"]'), type: m('meta[property="og:type"]') },
      twitter: m('meta[name="twitter:card"]'), jsonld,
      h1: document.querySelectorAll('h1').length,
      imgs: imgs.length, imgsSinAlt: imgs.filter((x) => !x.hasAttribute('alt')).length,
      imgsLazy: imgs.filter((x) => x.loading === 'lazy').length, imgsConSrcset: imgs.filter((x) => x.srcset).length,
      videos: [...document.querySelectorAll('video')].map((v) => ({ autoplay: v.autoplay, src: v.currentSrc || v.querySelector('source')?.src || '' })),
      iframes: [...document.querySelectorAll('iframe')].map((f) => f.src).filter(Boolean),
      linksSinTexto: [...document.querySelectorAll('a')].filter((a) => !a.textContent.trim() && !a.getAttribute('aria-label') && !a.querySelector('img[alt]:not([alt=""])')).length,
      inputsSinLabel: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].filter((el) => !el.labels?.length && !el.getAttribute('aria-label')).length,
    };
  }).catch(() => ({}));

  const lista = [...reqs.values()];
  const suma = (f) => lista.filter(f).reduce((a, r) => a + r.bytes, 0);
  const tipos = ['html', 'css', 'js', 'fuentes', 'imagenes', 'video', 'xhr', 'otros'];
  const porTipo = Object.fromEntries(tipos.map((t) => [t, suma((r) => r.tipo === t)]));
  const terceros = {};
  for (const r of lista) { const h = new URL(r.url).hostname; if (!h.endsWith(host)) terceros[h] = (terceros[h] || 0) + r.bytes; }
  const formatos = {};
  for (const r of lista.filter((r) => r.tipo === 'imagenes')) formatos[r.mime] = (formatos[r.mime] || 0) + r.bytes;
  const fila = {
    url, error, peticiones: lista.length, bytesInicial: suma((r) => r.fase === 'inicial'), bytesTotal: suma(() => true),
    porTipo, formatosImagen: formatos, terceros, dom,
    top10: lista.sort((a, b) => b.bytes - a.bytes).slice(0, 10).map(({ url, tipo, mime, bytes, cache }) => ({ url, tipo, mime, bytes, cache })),
  };
  guardar(`pesos/${String(i + 1).padStart(3, '0')}.json`, fila);
  resumen.push(fila);
  console.log(`${i + 1}/${urls.length} ${(fila.bytesTotal / 1e6).toFixed(2)} MB ${url}`);
  await page.close();
  await dormir(3000);
}
await browser.close();

const cols = ['url', 'peticiones', 'mb_inicial', 'mb_total', 'html', 'css', 'js', 'fuentes', 'imagenes', 'video', 'xhr', 'otros', 'img_webp_avif_pct', 'imgs', 'imgs_lazy', 'imgs_srcset', 'imgs_sin_alt', 'video_autoplay', 'jsonld', 'canonical_ok', 'og_image', 'h1', 'n_terceros'];
const kb = (b) => (b / 1024).toFixed(0);
const lineas = resumen.map((f) => {
  const img = Object.values(f.formatosImagen).reduce((a, b) => a + b, 0) || 1;
  const moderno = Object.entries(f.formatosImagen).filter(([m]) => /webp|avif/.test(m)).reduce((a, [, b]) => a + b, 0);
  const d = f.dom || {};
  return [f.url, f.peticiones, (f.bytesInicial / 1e6).toFixed(2), (f.bytesTotal / 1e6).toFixed(2), ...['html', 'css', 'js', 'fuentes', 'imagenes', 'video', 'xhr', 'otros'].map((t) => kb(f.porTipo[t])),
    ((moderno / img) * 100).toFixed(0), d.imgs, d.imgsLazy, d.imgsConSrcset, d.imgsSinAlt, (d.videos || []).some((v) => v.autoplay), `"${(d.jsonld || []).join('|')}"`,
    d.canonical === f.url || d.canonical === f.url.replace(/\/$/, ''), !!d.og?.image, d.h1, Object.keys(f.terceros).length].join(',');
});
guardar('pesos-resumen.csv', `# columnas por tipo en KB transferidos (comprimidos)\n${cols.join(',')}\n${lineas.join('\n')}\n`);
