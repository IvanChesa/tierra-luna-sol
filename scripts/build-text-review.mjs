// La lista de los textos para la revisión de Iván (fase 9, tarea 7; decisión de Iván al lanzar el
// bloque E): docs/revision-textos.md, con cada texto, su fuente y un hueco para sus correcciones, por
// cuerpo y por vista. Sale de los propios datos (los textos de los cuerpos, las vistas guiadas, el
// recorrido de la Luna y los nombres de las constelaciones) y del HTML del build (los textos de las
// páginas y sus descriptions): dice lo que se publica.
//
// No reescribe el fichero si ya tiene alguna corrección escrita (salvo con --forzar): las correcciones
// se pasan después a su origen y el texto se regenera.
//
// Uso: npm run build && node scripts/build-text-review.mjs [--forzar]
import './lib/ts-resolve.mjs';
import { readFile, stat, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const OUT = new URL('docs/revision-textos.md', ROOT);
const DIST = new URL('dist/tierra-luna-sol/browser/', ROOT);
const force = process.argv.includes('--forzar');
const CORRECTION = 'Corrección:';

// --- Si ya hay correcciones, no se toca ------------------------------------------------------------
if (await stat(OUT).catch(() => null)) {
  const current = await readFile(OUT, 'utf8');
  const written = current
    .split('\n')
    .filter((line) => line.startsWith(CORRECTION) && line.slice(CORRECTION.length).trim());
  if (written.length && !force) {
    console.error(
      `✖ docs/revision-textos.md ya tiene ${written.length} correcciones: pásalas a su origen o usa --forzar.`,
    );
    process.exit(1);
  }
}

/** El texto de un trozo de HTML: sin etiquetas ni comentarios, con las entidades y los espacios normales. */
const text = (html) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** El HTML prerenderizado de una ruta. */
async function page(route) {
  const file = route === '/' ? 'index.html' : `${route.slice(1)}.html`;
  return readFile(new URL(file, DIST), 'utf8');
}

/** Los bloques de texto (títulos, párrafos y elementos de lista) de un trozo de HTML, en orden. */
function blocks(html) {
  const out = [];
  for (const m of html.matchAll(/<(h1|h2|h3|p|li|dt|dd|figcaption)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    const kind = m[1];
    // Los elementos de lista que contienen otra lista: solo su texto propio.
    const body = m[2].replace(/<(ul|ol)\b[\s\S]*?<\/\1>/g, '');
    const value = text(body);
    if (value) out.push({ kind, value });
  }
  return out;
}

/** El contenido de <main> (las páginas de contenido) o de la entradilla del explorador. */
const mainOf = (html) => /<main\b[^>]*>([\s\S]*)<\/main>/.exec(html)?.[1] ?? '';
const introOf = (html) =>
  /<div[^>]*class="explorer__intro"[^>]*>([\s\S]*?)<\/div>/.exec(html)?.[1] ?? '';
const descriptionOf = (html) =>
  /<meta name="description" content="([^"]*)"/.exec(html)?.[1]?.replace(/&quot;/g, '"') ?? '';
const titleOf = (html) => text(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? '');

const lines = [];
const push = (...items) => lines.push(...items);
/** Un texto con su fuente y su hueco. */
function entry(label, value, sources = []) {
  push(`**${label}**`, '', `> ${value}`, '');
  if (sources.length) push(`Fuente: ${sources.map((s) => `<${s}>`).join(' · ')}`, '');
  push(CORRECTION, '');
}

const today = new Date().toISOString().slice(0, 10);
const bodies = JSON.parse(await readFile(new URL('scripts/content/body-texts.json', ROOT), 'utf8'));
const { GUIDED_VIEWS, MOON_VIEWS, MOON_TOUR } = await import('../src/app/data/tours.ts');
const constellations = JSON.parse(
  await readFile(new URL('scripts/content/constellations-es.json', ROOT), 'utf8'),
);
const routes = Object.keys(
  JSON.parse(await readFile(new URL('dist/tierra-luna-sol/prerendered-routes.json', ROOT), 'utf8'))
    .routes,
);

push(
  '# Revisión de los textos',
  '',
  `> GENERADO por \`scripts/build-text-review.mjs\` el ${today}, desde los datos y el HTML del build: es lo que se publica. Decisión de Iván al lanzar el bloque E (fase 9, tarea 7).`,
  '',
  '## Cómo se usa',
  '',
  `- Debajo de cada texto, una línea «${CORRECTION}». Si el texto está bien, déjala vacía; si no, escribe ahí el texto como lo quieres (o lo que cambiarías).`,
  '- Cada texto lleva su fuente. Los de los cuerpos, además, sus citas literales en inglés, en `docs/datos/textos-cuerpos.md`.',
  '- El script no reescribe este fichero si ya tiene alguna corrección escrita: las correcciones se pasan a su origen (`scripts/content/body-texts.json`, `src/app/data/tours.ts` o la plantilla de la página), se regenera lo que corresponda y se marca el texto como revisado (`reviewed: true`).',
  '- Los nombres de las constelaciones (al final) los revisa la sesión de revisión del bloque E (decisión de Iván del 03-11).',
  '',
  '## Índice',
  '',
  '1. [Por cuerpo](#por-cuerpo): los 30, con su resumen y sus tres curiosidades (120 textos).',
  '2. [Por vista](#por-vista): el sistema solar, la Tierra y sus vistas guiadas, la Luna, sus vistas y su recorrido, y el cielo.',
  '3. [Las páginas](#las-paginas): los índices, los eclipses, «Sobre el proyecto», los créditos y la 404.',
  '4. [Las descriptions](#las-descriptions): lo que se ve al compartir cada página.',
  '5. [Los nombres de las constelaciones](#los-nombres-de-las-constelaciones).',
  '',
);

// --- 1. Por cuerpo ----------------------------------------------------------------------------------
push('<a id="por-cuerpo"></a>', '', '## 1. Por cuerpo', '');
for (const body of bodies) {
  push(`### ${body.name}`, '');
  entry('Resumen', body.summary.text, [body.summary.source]);
  body.facts.forEach((fact, k) => entry(`Curiosidad ${k + 1}`, fact.text, [fact.source]));
}

// --- 2. Por vista -----------------------------------------------------------------------------------
push('<a id="por-vista"></a>', '', '## 2. Por vista', '');
const views = [
  ['/', 'El sistema solar'],
  ['/explorar/tierra', 'La Tierra'],
  ['/explorar/luna', 'La Luna'],
  ['/cielo', 'El cielo desde España'],
];
for (const [route, name] of views) {
  push(`### ${name} (\`${route}\`)`, '');
  for (const block of blocks(introOf(await page(route)))) {
    entry(block.kind === 'h1' ? 'Título' : 'Entradilla', block.value);
  }
  if (route === '/explorar/tierra') {
    push('#### Las vistas guiadas', '');
    for (const view of GUIDED_VIEWS) entry(view.title, view.text, view.sources);
  }
  if (route === '/explorar/luna') {
    push('#### Las vistas', '');
    for (const view of MOON_VIEWS) entry(view.title, view.text, view.sources);
    push('#### El recorrido', '');
    MOON_TOUR.forEach((stop, k) => entry(`${k + 1}. ${stop.title}`, stop.text, stop.sources));
  }
}

// --- 3. Las páginas ---------------------------------------------------------------------------------
push('<a id="las-paginas"></a>', '', '## 3. Las páginas', '');
const pages = [
  ['/planetas', 'Planetas'],
  ['/lunas', 'Lunas'],
  ['/eclipses', 'Próximos eclipses'],
  ['/sobre-el-proyecto', 'Sobre el proyecto'],
  ['/creditos', 'Créditos'],
  ['/404', 'Página no encontrada'],
];
for (const [route, name] of pages) {
  push(`### ${name} (\`${route}\`)`, '');
  let all = blocks(mainOf(await page(route)));
  // En los índices y en los eclipses, solo el texto fijo (no las tarjetas ni la lista de eclipses).
  if (route === '/planetas' || route === '/lunas' || route === '/eclipses') {
    all = all.filter((b, k) => k < 3 && (b.kind === 'h1' || b.kind === 'p'));
  }
  // Sin las migas de pan.
  all = all.filter((b) => b.kind !== 'li' || !/^(Inicio|Planetas|Lunas)$/.test(b.value));
  let n = 0;
  for (const block of all) {
    const label =
      block.kind === 'h1'
        ? 'Título'
        : block.kind === 'h2' || block.kind === 'h3' || block.kind === 'dt'
          ? `Apartado: ${block.value}`
          : `Párrafo ${++n}`;
    if (label.startsWith('Apartado')) push(`#### ${block.value}`, '');
    else entry(label, block.value);
  }
}

// --- 4. Las descriptions ----------------------------------------------------------------------------
push(
  '<a id="las-descriptions"></a>',
  '',
  '## 4. Las descriptions',
  '',
  'Lo que enseñan los buscadores y las apps al compartir cada página (con el título y la imagen global). En las fichas, la primera frase de su resumen: se corrigen con él.',
  '',
);
for (const route of routes) {
  const html = await page(route);
  entry(`${titleOf(html)} (\`${route}\`)`, descriptionOf(html));
}

// --- 5. Las constelaciones --------------------------------------------------------------------------
push(
  '<a id="los-nombres-de-las-constelaciones"></a>',
  '',
  '## 5. Los nombres de las constelaciones',
  '',
  `Decisión de Iván del 03-11 (D38): el nombre en español y, como secundario, el oficial de la IAU en latín. Fuente: ${constellations.table.title}, ${constellations.table.publisher} (<${constellations.table.url}>), «${constellations.table.quote}». En el zodiaco, el nombre que usa el mismo Anuario para esas constelaciones cuando las recorren los planetas (2014–2019) o en su texto; con las tildes y las mayúsculas de la RAE. Lo comprueba \`scripts/check-constellation-names.mjs\` con los PDF. **Los revisa la sesión de revisión del bloque E.**`,
  '',
  '| Símbolo | IAU (latín) | Tabla del IGN | Nombre que se usa | Por qué | Corrección |',
  '|---|---|---|---|---|---|',
);
for (const c of constellations.constellations) {
  const why =
    c.reason === 'zodiaco'
      ? `zodiaco: ${c.usage.map((u) => `${constellations.usages[u].year}, «${constellations.usages[u].text}»`).join('; ')}`
      : (c.reason ?? '');
  push(`| ${c.id} | ${c.latin} | ${c.table} | ${c.es} | ${why} | |`);
}
push('');

await writeFile(OUT, `${lines.join('\n')}\n`);
const count = lines.filter((line) => line === CORRECTION).length;
console.log(
  `→ docs/revision-textos.md: ${count} textos con su hueco y ${constellations.constellations.length} constelaciones.`,
);
