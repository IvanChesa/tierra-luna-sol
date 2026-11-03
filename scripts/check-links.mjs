// Sin enlaces rotos (fase 9, criterio de aceptación): recorre el HTML prerenderizado de todas las
// páginas del build y comprueba sus enlaces.
// - Internos (`/ruta`, `/ruta#ancla`, `#ancla`, `/img/…`): que la ruta sea una página o un fichero del
//   build y que el ancla exista en esa página. Es lo que hace `npm run check`.
// - Externos (con --externos): una petición a cada dirección distinta (HEAD y, si no la admite, GET),
//   con un tiempo máximo; los DOI, con que doi.org los resuelva. Los de ivanchesa.com se dan como
//   pendientes mientras el dominio no responda (fase 11; PENDIENTES.md), no como rotos.
// Uso: npm run build && node scripts/check-links.mjs [--externos]
import { readFile, readdir, stat } from 'node:fs/promises';

const BROWSER = new URL('../dist/tierra-luna-sol/browser/', import.meta.url);
const external = process.argv.includes('--externos');
/** Los enlaces que dependen de un paso de Iván (el dominio ivanchesa.com, que aún no resuelve). */
const PENDING = /^https:\/\/(www\.)?ivanchesa\.com(\/|$)/;

const files = (await readdir(BROWSER, { recursive: true })).map((f) => f.replaceAll('\\', '/'));
const pages = files.filter((f) => f.endsWith('.html'));
/** La ruta de cada página: `index.html` es `/`; `planetas/marte.html`, `/planetas/marte`. */
const routeOf = (file) => (file === 'index.html' ? '/' : `/${file.replace(/\.html$/, '')}`);
const html = new Map();
for (const file of pages) html.set(routeOf(file), await readFile(new URL(file, BROWSER), 'utf8'));
const ids = new Map(
  [...html].map(([route, source]) => [
    route,
    new Set([...source.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
  ]),
);

const failures = [];
const outside = new Map();
let internal = 0;
for (const [route, source] of html) {
  // Los enlaces de la página (los `href` de `<a>`; los de `<link>`, no: los pone el build).
  for (const [, raw] of source.matchAll(/<a\b[^>]*\shref="([^"]*)"/g)) {
    const href = raw.replaceAll('&amp;', '&');
    if (/^https?:\/\//.test(href)) {
      if (!outside.has(href)) outside.set(href, new Set());
      outside.get(href).add(route);
      continue;
    }
    if (/^(mailto|tel):/.test(href)) continue;
    internal++;
    const [pathAndQuery, fragment] = href.split('#');
    const path = (pathAndQuery ?? '').split('?')[0] || route;
    const target = path.replace(/\/+$/, '') || '/';
    if (html.has(target)) {
      if (fragment && !ids.get(target)?.has(fragment)) {
        failures.push(`${route}: «${href}» lleva a un ancla que no existe en ${target}`);
      }
      continue;
    }
    const file = target.replace(/^\//, '');
    if (!(await stat(new URL(file, BROWSER)).catch(() => null))?.isFile()) {
      failures.push(`${route}: «${href}» no es ninguna página ni fichero del build`);
    }
  }
}

let pending = [];
if (external) {
  const broken = [];
  const check = async (url) => {
    // Un DOI: basta con que doi.org lo resuelva (los editores, como OUP, responden 403 a los robots).
    if (url.startsWith('https://doi.org/')) {
      try {
        const response = await fetch(url, {
          method: 'HEAD',
          redirect: 'manual',
          signal: AbortSignal.timeout(20_000),
        });
        return response.status >= 300 && response.status < 400 && response.headers.get('location')
          ? null
          : `${response.status} en doi.org`;
      } catch (error) {
        return error.cause?.code ?? error.name;
      }
    }
    for (const method of ['HEAD', 'GET']) {
      try {
        const response = await fetch(url, {
          method,
          redirect: 'follow',
          signal: AbortSignal.timeout(20_000),
          headers: { 'user-agent': 'tierra-luna-sol-check-links' },
        });
        if (response.ok) return null;
        if (method === 'GET') return `${response.status}`;
      } catch (error) {
        if (method === 'GET') return error.cause?.code ?? error.name;
      }
    }
    return 'sin respuesta';
  };
  const urls = [...outside.keys()];
  for (let k = 0; k < urls.length; k += 6) {
    const batch = urls.slice(k, k + 6);
    const results = await Promise.all(batch.map(check));
    batch.forEach((url, i) => {
      if (!results[i]) return;
      const where = [...outside.get(url)].slice(0, 3).join(', ');
      if (PENDING.test(url)) pending.push(`${url} (${results[i]})`);
      else broken.push(`${url}: ${results[i]} (en ${where})`);
    });
  }
  for (const b of broken) failures.push(`externo roto: ${b}`);
}

if (failures.length) {
  for (const f of failures) console.error(`✖ ${f}`);
  process.exit(1);
}
console.log(
  `✔ Enlaces de las ${pages.length} páginas: ${internal} internos bien (rutas, ficheros y anclas)${external ? `; ${outside.size} externos distintos comprobados` : `; ${outside.size} externos sin comprobar (--externos)`}.`,
);
if (pending.length) console.log(`  Pendientes del dominio (fase 11): ${pending.join(', ')}`);
