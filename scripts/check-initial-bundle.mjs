// Comprueba que las librerías pesadas no entran en el bundle inicial (PLAN §4.6 y §5).
// Uso: node scripts/check-initial-bundle.mjs   (después de `ng build`)
//
// Los ficheros iniciales son los que carga el HTML prerenderizado (<script> y <link rel=modulepreload>
// de index.html). En ellos no puede aparecer ninguna cadena característica de estas librerías.
import { readFile, readdir } from 'node:fs/promises';

const BROWSER = new URL('../dist/tierra-luna-sol/browser/', import.meta.url);
/** Cadenas literales que sobreviven a la minificación de cada librería. */
const MARKERS = {
  'astronomy-engine': [
    'Invalid precess direction',
    'Indeterminate sky coordinates',
    'The Earth does not have a longitude as seen from itself.',
  ],
  three: ['THREE.WebGLRenderer', 'THREE.WebGLProgram'],
};

const html = await readFile(new URL('index.html', BROWSER), 'utf8');
const initial = [
  ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
  ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
].map((m) => m[1]);
if (initial.length === 0) throw new Error('No encuentro los scripts iniciales en index.html');

const all = (await readdir(BROWSER)).filter((file) => file.endsWith('.js'));
let failed = false;
for (const file of [...new Set(initial)]) {
  const code = await readFile(new URL(file, BROWSER), 'utf8');
  for (const [library, markers] of Object.entries(MARKERS)) {
    if (markers.some((marker) => code.includes(marker))) {
      console.error(`✖ ${library} está en el bundle inicial (${file})`);
      failed = true;
    }
  }
}
const lazy = [];
for (const file of all.filter((f) => !initial.includes(f))) {
  const code = await readFile(new URL(file, BROWSER), 'utf8');
  for (const [library, markers] of Object.entries(MARKERS)) {
    if (markers.some((marker) => code.includes(marker))) lazy.push(`${library} → ${file}`);
  }
}
if (failed) process.exit(1);
console.log(`✔ Bundle inicial (${initial.join(', ')}) sin ${Object.keys(MARKERS).join(' ni ')}.`);
console.log(lazy.length ? `  En chunks diferidos: ${lazy.join('; ')}.` : '  (Ninguna de las dos está todavía en ningún chunk.)');
