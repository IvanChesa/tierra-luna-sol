// Prepara el build para Cloudflare Pages (fase 4, D9, D17 y D26). Va después de `ng build` en
// `npm run build`, así que los e2e, las capturas y el CI prueban lo mismo que se publica.
//
// 1. Las rutas prerenderizadas pasan de `ruta/index.html` a `ruta.html`. Pages sirve `ruta.html` en
//    `/ruta` y redirige `/ruta/` y `/ruta.html` a `/ruta`: URLs sin barra final (D9). Con
//    `ruta/index.html`, la URL que Pages da por buena sería `/ruta/`.
// 2. `404.html` en la raíz (la página prerenderizada de `/404`): sin él, Pages trata el sitio como una
//    aplicación de una sola página y responde 200, con `index.html`, a cualquier ruta.
// 3. Fuera `index.csr.html`, la página sin prerenderizar de Angular: todas las rutas se prerenderizan.
// 4. La CSP de `_headers` (en `public/`, con el marcador {{INLINE_SCRIPTS}}) lleva los hashes SHA-256
//    de los scripts en línea de todas las páginas, que genera Angular: el contrato de eventos, su
//    arranque y el que activa la hoja de estilos diferida. `security.autoCsp` no admite el
//    prerenderizado («Cannot set both SSR and auto-CSP»). Si alguna página tuviera un manejador en
//    línea (`onload="…"`), la CSP lo bloquearía: el script falla.
// 5. Los límites de Pages (plan gratuito): ningún fichero de más de 25 MiB y menos de 20 000 ficheros.
//
// Uso: ng build && node scripts/prepare-pages.mjs   (es idempotente)
import { createHash } from 'node:crypto';
import { readFile, readdir, rename, rm, rmdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = new URL('../', import.meta.url);
const BROWSER = fileURLToPath(new URL('dist/tierra-luna-sol/browser/', ROOT));
const HEADERS_SOURCE = fileURLToPath(new URL('public/_headers', ROOT));
const PLACEHOLDER = '{{INLINE_SCRIPTS}}';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FILES = 20_000;

/** Todos los ficheros del build, con barras normales y relativos a `browser/`. */
async function files() {
  const list = await readdir(BROWSER, { recursive: true, withFileTypes: true });
  return list
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(BROWSER.length).split(sep).join('/'));
}

// --- 1, 2 y 3: las rutas como `ruta.html`, con `404.html` y sin `index.csr.html` -----------------
const moved = [];
for (const file of (await files()).filter((f) => f.endsWith('/index.html'))) {
  const route = file.slice(0, -'/index.html'.length);
  const target = join(BROWSER, `${route}.html`);
  if (await stat(target).catch(() => null)) {
    throw new Error(`Ya existe ${route}.html: no se puede publicar ${file} como /${route}`);
  }
  await rename(join(BROWSER, file), target);
  moved.push(route);
  // La carpeta de la ruta, si se ha quedado vacía (las de las rutas hijas siguen).
  await rmdir(dirname(join(BROWSER, file))).catch(() => undefined);
}
await rm(join(BROWSER, 'index.csr.html'), { force: true });
const all = await files();
if (!all.includes('404.html')) throw new Error('Falta 404.html (la ruta /404 prerenderizada)');
if (!all.includes('_redirects')) throw new Error('Falta _redirects (public/_redirects)');

// --- 4: la CSP con los hashes de los scripts en línea --------------------------------------------
const pages = all.filter((file) => file.endsWith('.html'));
const hashes = new Set();
for (const page of pages) {
  const html = await readFile(join(BROWSER, page), 'utf8');
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\ssrc=/.test(attributes)) continue;
    // Los datos (`application/json`) no se ejecutan: la CSP no los mira.
    const type = /\stype="([^"]*)"/.exec(attributes)?.[1] ?? '';
    if (type && !/^(text\/javascript|module)$/.test(type)) continue;
    hashes.add(`'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`);
  }
  const handler = /<[a-z][^>]*\son[a-z]+\s*=/i.exec(html);
  if (handler) throw new Error(`${page} tiene un manejador en línea que la CSP bloquearía`);
}
const template = await readFile(HEADERS_SOURCE, 'utf8');
if (template.split(PLACEHOLDER).length !== 2) {
  throw new Error(`public/_headers debe llevar ${PLACEHOLDER} una sola vez (en la CSP)`);
}
await writeFile(join(BROWSER, '_headers'), template.replace(PLACEHOLDER, [...hashes].join(' ')));

// --- 5: los límites de Pages --------------------------------------------------------------------
let largest = { file: '', bytes: 0 };
for (const file of all) {
  const { size } = await stat(join(BROWSER, file));
  if (size > largest.bytes) largest = { file, bytes: size };
  if (size > MAX_FILE_BYTES) {
    throw new Error(`${file} pesa ${(size / 2 ** 20).toFixed(1)} MiB: Pages no admite más de 25`);
  }
}
if (all.length >= MAX_FILES)
  throw new Error(`${all.length} ficheros: Pages admite menos de 20 000`);

console.log(
  `Pages: ${moved.length} rutas como ruta.html, ${pages.length} páginas, ${hashes.size} scripts en línea en la CSP, ${all.length} ficheros (el mayor, ${largest.file}: ${(largest.bytes / 2 ** 20).toFixed(2)} MiB de 25)`,
);
