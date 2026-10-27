// Paso 1: robots.txt + sitemap(s) -> inventario completo de URLs (para el mapa 301) y muestra de ~50 URLs.
import { SITIO, MAX_URLS, pedir, guardar, parsearRobots } from './comun.mjs';

const robotsRes = await pedir(`${SITIO}/robots.txt`);
const robotsTxt = robotsRes.ok ? await robotsRes.text() : '';
guardar('robots.txt', robotsTxt || `# sin robots.txt (HTTP ${robotsRes.status})\n`);
const robots = parsearRobots(robotsTxt);

const pendientes = robots.sitemaps.length ? [...robots.sitemaps] : [`${SITIO}/sitemap.xml`];
const vistos = new Set(); const urls = new Map();
while (pendientes.length) {
  const sm = pendientes.shift(); if (vistos.has(sm)) continue; vistos.add(sm);
  const r = await pedir(sm, { redirect: 'follow' }); if (!r.ok) continue;
  const xml = await r.text();
  guardar(`sitemaps/${vistos.size}.xml`, xml);
  for (const m of xml.matchAll(/<sitemap>[\s\S]*?<loc>\s*([^<\s]+)\s*<\/loc>/g)) pendientes.push(m[1]);
  for (const m of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(m[1])?.[1];
    const lastmod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(m[1])?.[1] || '';
    if (loc) urls.set(loc, lastmod);
  }
}

// Clasificación por prefijo de ruta: en Webflow cada colección CMS vive en /<slug-coleccion>/<item>.
const filas = [...urls].map(([url, lastmod]) => {
  const p = new URL(url).pathname.replace(/\/$/, '') || '/';
  const seg = p.split('/').filter(Boolean);
  const grupo = seg.length === 0 ? 'home' : seg.length === 1 ? 'estatica' : `cms:${seg[0]}`;
  return { url, ruta: p, grupo, lastmod, permitido: robots.permitido(p) };
});
const csv = ['url,ruta,grupo,lastmod,permitido_robots', ...filas.map((f) => [f.url, f.ruta, f.grupo, f.lastmod, f.permitido].join(','))].join('\n');
guardar('inventario-urls.csv', csv + '\n');

const porGrupo = {};
for (const f of filas) (porGrupo[f.grupo] ||= []).push(f);
const resumen = Object.fromEntries(Object.entries(porGrupo).map(([g, l]) => [g, l.length]).sort((a, b) => b[1] - a[1]));
guardar('inventario-resumen.json', { total: filas.length, sitemaps: [...vistos], crawlDelay: robots.crawlDelay, porGrupo: resumen });

// Muestra: home + todas las estáticas (hasta 20) + reparto del resto entre colecciones CMS (las más recientes primero).
const permitidas = filas.filter((f) => f.permitido);
const muestra = new Set([`${SITIO}/`]);
permitidas.filter((f) => f.grupo === 'estatica').slice(0, 20).forEach((f) => muestra.add(f.url));
const colecciones = Object.keys(porGrupo).filter((g) => g.startsWith('cms:'));
const cupo = Math.max(1, Math.floor((MAX_URLS - muestra.size) / Math.max(1, colecciones.length)));
for (const g of colecciones) {
  const items = porGrupo[g].filter((f) => f.permitido).sort((a, b) => (b.lastmod || '').localeCompare(a.lastmod || ''));
  const n = /noticia|news|nota|blog|articul/i.test(g) ? Math.max(cupo, 15) : cupo;
  items.slice(0, n).forEach((f) => muestra.size < MAX_URLS && muestra.add(f.url));
}
guardar('muestra-urls.txt', [...muestra].join('\n') + '\n');
console.log(JSON.stringify({ total: filas.length, muestra: muestra.size, porGrupo: resumen }, null, 2));
