// Comprueba que las librerías pesadas no entran en el JS inicial de ninguna página (PLAN §4.6 y §5).
// Uso: node scripts/check-initial-bundle.mjs   (después de `ng build`)
//
// El JS inicial de una página es el que carga su HTML prerenderizado (<script> y
// <link rel=modulepreload>). Se revisan TODAS las páginas: una ficha que importara astronomy-engine
// de forma estática lo cargaría al abrirse. En ese JS no puede aparecer ninguna cadena
// característica de estas librerías.
import { readFile, readdir } from 'node:fs/promises';

const BROWSER = new URL('../dist/tierra-luna-sol/browser/', import.meta.url);
/** Cadenas literales que sobreviven a la minificación de cada librería. */
const MARKERS = {
  'astronomy-engine': [
    // Lo lanza el constructor de AstroTime: entra con casi cualquier uso de la librería, incluso
    // con importaciones pequeñas (MakeTime, ΔT).
    'Argument must be a Date object, an AstroTime object, or a numeric UTC Julian date.',
    'Invalid precess direction',
    'Indeterminate sky coordinates',
    'The Earth does not have a longitude as seen from itself.',
  ],
  three: ['THREE.WebGLRenderer', 'THREE.WebGLProgram'],
};

const files = await readdir(BROWSER, { recursive: true });
const pages = files
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replaceAll('\\', '/'));
if (!pages.includes('index.html')) throw new Error('No encuentro dist/…/browser/index.html');

/** Ficheros JS iniciales de cada página, por nombre de fichero. */
const initialByPage = new Map();
for (const page of pages) {
  const html = await readFile(new URL(page, BROWSER), 'utf8');
  const scripts = [
    ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
    ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
  ].map((m) => m[1].replace(/^\//, ''));
  initialByPage.set(page, [...new Set(scripts)]);
}
const initial = [...new Set([...initialByPage.values()].flat())];
if (initial.length === 0) throw new Error('No encuentro scripts iniciales en los HTML');

const found = async (file) => {
  const code = await readFile(new URL(file, BROWSER), 'utf8');
  return Object.entries(MARKERS)
    .filter(([, markers]) => markers.some((marker) => code.includes(marker)))
    .map(([library]) => library);
};

let failed = false;
for (const file of initial) {
  for (const library of await found(file)) {
    const where = [...initialByPage]
      .filter(([, list]) => list.includes(file))
      .map(([page]) => page);
    console.error(`✖ ${library} está en el JS inicial (${file}), que cargan: ${where.join(', ')}`);
    failed = true;
  }
}
const lazy = [];
for (const file of files.filter((f) => f.endsWith('.js') && !initial.includes(f))) {
  for (const library of await found(file)) lazy.push(`${library} → ${file}`);
}
if (failed) process.exit(1);
console.log(
  `✔ El JS inicial de las ${pages.length} páginas (${initial.length} ficheros) no lleva ${Object.keys(MARKERS).join(' ni ')}.`,
);
console.log(
  lazy.length
    ? `  En chunks diferidos: ${lazy.join('; ')}.`
    : '  (Ninguna de las dos está todavía en ningún chunk.)',
);
