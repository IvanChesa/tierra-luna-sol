// Comprueba que las librerías pesadas no entran en el JS inicial de ninguna página (PLAN §4.6 y §5).
// Uso: node scripts/check-initial-bundle.mjs   (después de `ng build`, que genera browser-stats.json)
//
// Dos capas:
// 1. Por MÓDULO (fase 2, hallazgo A2 del bloque A): el metafile de esbuild
//    (dist/tierra-luna-sol/browser-stats.json, `statsJson` en angular.json) dice qué módulos fuente
//    lleva cada fichero. El JS inicial de una página es el que carga su HTML prerenderizado
//    (<script> y <link rel=modulepreload>) más lo que esos ficheros importan de forma estática. En
//    ese JS no puede haber ningún módulo de node_modules/three ni de node_modules/astronomy-engine:
//    basta un `import { Vector3 } from 'three'` para que salte.
// 2. Por CADENAS (fase 1): marcadores literales de cada librería, como segunda red.
import { readFile, readdir } from 'node:fs/promises';

const DIST = new URL('../dist/tierra-luna-sol/', import.meta.url);
const BROWSER = new URL('browser/', DIST);
/** Módulos prohibidos en el JS inicial (rutas del metafile). */
const FORBIDDEN = {
  // Sin ancla: con node_modules enlazado (fuera de la raíz), el metafile guarda «../../…/node_modules/…».
  three: /(^|\/)node_modules\/three\//,
  'astronomy-engine': /(^|\/)node_modules\/astronomy-engine\//,
  // CLAUDE.md: los stores y los controles del visor tampoco van en el bundle inicial (fase 3).
  'los stores': /(^|\/)src\/app\/state\//,
  'los controles del visor':
    /(^|\/)src\/app\/features\/(explorer-ui|time-controls|body-picker|body-panel|camera-controls|shortcuts)\//,
};
/** Cadenas literales que sobreviven a la minificación de cada librería. */
const MARKERS = {
  'astronomy-engine': [
    // Lo lanza el constructor de AstroTime: entra con casi cualquier uso de la librería.
    'Argument must be a Date object, an AstroTime object, or a numeric UTC Julian date.',
    'Invalid precess direction',
    'Indeterminate sky coordinates',
    'The Earth does not have a longitude as seen from itself.',
  ],
  three: ['THREE.WebGLRenderer', 'THREE.WebGLProgram'],
};
/** Aviso de §5 para el chunk del visor (en bruto). */
const VIEWER_CHUNK_WARNING_BYTES = 900 * 1000;

const stats = JSON.parse(await readFile(new URL('browser-stats.json', DIST), 'utf8'));
const outputs = stats.outputs;
const files = await readdir(BROWSER, { recursive: true });
const pages = files
  .filter((file) => file.endsWith('.html'))
  .map((file) => file.replaceAll('\\', '/'));
if (!pages.includes('index.html')) throw new Error('No encuentro dist/…/browser/index.html');

/** El fichero y todo lo que importa de forma estática (se carga a la vez). */
function staticClosure(file, seen = new Set()) {
  if (seen.has(file)) return seen;
  seen.add(file);
  for (const entry of outputs[file]?.imports ?? []) {
    if (entry.kind === 'import-statement') staticClosure(entry.path, seen);
  }
  return seen;
}

const initialByPage = new Map();
for (const page of pages) {
  const html = await readFile(new URL(page, BROWSER), 'utf8');
  const direct = [
    ...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g),
    ...html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g),
  ].map((m) => m[1].replace(/^\//, ''));
  const closure = new Set();
  for (const file of direct) staticClosure(file, closure);
  initialByPage.set(page, [...closure]);
}
const initial = [...new Set([...initialByPage.values()].flat())];
if (initial.length === 0) throw new Error('No encuentro scripts iniciales en los HTML');

const pagesLoading = (file) =>
  [...initialByPage].filter(([, list]) => list.includes(file)).map(([page]) => page);

let failed = false;
for (const file of initial) {
  const output = outputs[file];
  if (!output) {
    console.error(`✖ ${file} no está en browser-stats.json (¿build sin statsJson?)`);
    failed = true;
    continue;
  }
  const inputs = Object.keys(output.inputs);
  for (const [library, pattern] of Object.entries(FORBIDDEN)) {
    const modules = inputs.filter((input) => pattern.test(input));
    if (modules.length) {
      console.error(
        `✖ ${library} está en el JS inicial (${file}, módulos: ${modules.slice(0, 3).join(', ')}${modules.length > 3 ? '…' : ''}), que cargan: ${pagesLoading(file).join(', ')}`,
      );
      failed = true;
    }
  }
  const code = await readFile(new URL(file, BROWSER), 'utf8');
  for (const [library, markers] of Object.entries(MARKERS)) {
    if (markers.some((marker) => code.includes(marker))) {
      console.error(`✖ ${library} (por su código) está en el JS inicial (${file})`);
      failed = true;
    }
  }
}
// Si un patrón no casa con ningún módulo del build, la capa por módulos no vería nada (por ejemplo,
// si cambia cómo esbuild escribe las rutas): eso es un fallo, no un aprobado.
for (const [library, pattern] of Object.entries(FORBIDDEN)) {
  const found = Object.values(outputs).some((output) =>
    Object.keys(output.inputs ?? {}).some((input) => pattern.test(input)),
  );
  if (!found) {
    console.error(
      `✖ Ningún módulo del metafile casa con el patrón de ${library}: revisa FORBIDDEN`,
    );
    failed = true;
  }
}
if (failed) process.exit(1);

// Dónde están las librerías y cuánto pesa el chunk del visor.
const lazy = Object.entries(outputs)
  .filter(([file]) => file.endsWith('.js') && !initial.includes(file))
  .map(([file, output]) => ({
    file,
    bytes: output.bytes,
    libraries: Object.entries(FORBIDDEN)
      .filter(([, pattern]) => Object.keys(output.inputs).some((input) => pattern.test(input)))
      .map(([library]) => library),
  }))
  .filter((entry) => entry.libraries.length);
console.log(
  `✔ El JS inicial de las ${pages.length} páginas (${initial.length} ficheros) no lleva ningún módulo de ${Object.keys(FORBIDDEN).join(' ni de ')}.`,
);
for (const entry of lazy) {
  const kb = (entry.bytes / 1000).toFixed(2);
  const warning = entry.bytes > VIEWER_CHUNK_WARNING_BYTES ? ' ⚠ supera el aviso de 900 kB' : '';
  console.log(
    `  Diferido: ${entry.file} (${kb} kB en bruto) con ${entry.libraries.join(' y ')}${warning}`,
  );
}
