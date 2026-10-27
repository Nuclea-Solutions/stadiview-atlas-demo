// Utilidades compartidas: pausa entre peticiones, robots.txt y rutas de salida.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SITIO = process.env.SITIO || 'https://atlasfc.com.mx';
export const UA = 'NucleaAuditBot/1.0 (+auditoria de solo lectura; contacto: nuclea.solutions)';
export const DATOS = process.env.DATOS || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'datos');
export const MAX_URLS = Number(process.env.MAX_URLS || 50);

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// Garantiza como máximo 1 petición por segundo hacia el sitio.
let ultima = 0;
export async function pedir(url, opts = {}) {
  const espera = 1000 - (Date.now() - ultima);
  if (espera > 0) await dormir(espera);
  ultima = Date.now();
  return fetch(url, { redirect: 'manual', ...opts, headers: { 'user-agent': UA, ...(opts.headers || {}) } });
}

export function guardar(rel, contenido) {
  const f = path.join(DATOS, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, typeof contenido === 'string' ? contenido : JSON.stringify(contenido, null, 2));
  return f;
}

export function leer(rel) {
  return fs.readFileSync(path.join(DATOS, rel), 'utf8');
}

// Interpreta robots.txt para User-agent: * (y el nuestro). Suficiente para Allow/Disallow simples.
export function parsearRobots(txt) {
  const reglas = []; const sitemaps = []; let aplica = false; let crawlDelay = 0;
  for (const linea of txt.split(/\r?\n/)) {
    const [k, ...v] = linea.split(':'); const val = v.join(':').trim(); const key = (k || '').trim().toLowerCase();
    if (key === 'user-agent') aplica = val === '*' || /nucleaauditbot/i.test(val);
    else if (key === 'sitemap') sitemaps.push(val);
    else if (aplica && (key === 'allow' || key === 'disallow') && val) reglas.push({ tipo: key, ruta: val });
    else if (aplica && key === 'crawl-delay') crawlDelay = Number(val) || 0;
  }
  const permitido = (p) => {
    let mejor = null;
    for (const r of reglas) {
      const re = new RegExp('^' + r.ruta.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
      if (re.test(p) && (!mejor || r.ruta.length > mejor.ruta.length)) mejor = r;
    }
    return !mejor || mejor.tipo === 'allow';
  };
  return { reglas, sitemaps, crawlDelay, permitido };
}
