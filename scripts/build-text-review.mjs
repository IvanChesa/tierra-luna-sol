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
  `1. [Por cuerpo](#por-cuerpo): los ${bodies.length}, con su resumen y sus tres curiosidades y, en ${bodies.filter((b) => b.mapNote).length} lunas, la línea sobre su mapa (${bodies.length * 4 + bodies.filter((b) => b.mapNote).length} textos).`,
  '2. [Por vista](#por-vista): el sistema solar, la Tierra y sus vistas guiadas, la Luna, sus vistas y su recorrido, y el cielo.',
  '3. [Las páginas](#las-paginas): los índices, los eclipses, «Sobre el proyecto», los créditos y la 404; y [los textos fijos](#los-textos-fijos) de las fichas, del pie y del menú.',
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
  // La línea sobre su mapa (fase 9b, D45), en las lunas con parte de su mapa recreada.
  if (body.mapNote) {
    entry('Sobre su mapa', body.mapNote.text, [body.mapNote.source ?? '/creditos#lunas-recreadas']);
  }
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
  // Sin las migas de pan (antes de nada: si no, ocupaban el sitio de la entradilla).
  let all = blocks(mainOf(await page(route))).filter(
    (b) => b.kind !== 'li' || !/^(Inicio|Planetas|Lunas)$/.test(b.value),
  );
  // En los índices y en los eclipses, solo el texto fijo: el título y la entradilla (no las tarjetas
  // ni la lista de eclipses).
  if (route === '/planetas' || route === '/lunas' || route === '/eclipses') {
    all = all.filter((b) => b.kind === 'h1' || b.kind === 'p').slice(0, 2);
  }
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

// --- 3 bis. Las fichas y el pie: los textos fijos ------------------------------------------------------
push(
  '<a id="los-textos-fijos"></a>',
  '',
  '## 3 bis. Los textos fijos de las fichas, del pie y del menú',
  '',
  'Los que se repiten en las 30 fichas (cambia el cuerpo, no la frase) y los del pie del sitio, del pie del explorador y del menú del móvil. Cada uno sale de su función (`pages/body-detail/`) o de su plantilla.',
  '',
);
const { BODIES } = await import('../src/app/data/bodies.ts');
const { bodyFacts } = await import('../src/app/pages/body-detail/body-facts.ts');
const { imageAltOf, kindLineOf } = await import('../src/app/pages/body-detail/body-labels.ts');
const todayText = await import('../src/app/pages/body-detail/today-text.ts');
push('#### El tipo, encima del título', '');
for (const id of ['sol', 'marte', 'luna', 'titan']) {
  const kind = kindLineOf(BODIES.find((b) => b.id === id));
  entry(
    `En ${id === 'sol' ? 'el Sol' : id === 'luna' ? 'la Luna' : BODIES.find((b) => b.id === id).name}`,
    kind.parent ? `${kind.text} ${kind.parent.name}` : kind.text,
  );
}
push('#### Los títulos de la ficha', '');
const ficha = await page('/planetas/marte');
for (const block of blocks(mainOf(ficha)).filter((b) => b.kind === 'h2'))
  entry('Apartado', block.value);
entry('El enlace al explorador', 'Ver en 3D');
const grupos = new Set();
for (const body of BODIES) for (const group of bodyFacts(body)) grupos.add(group.title);
entry('Las tablas de «Datos»', [...grupos].join(' · '));
push('#### Las etiquetas y las aclaraciones de los datos', '');
const labels = new Map();
for (const body of BODIES) {
  for (const row of bodyFacts(body).flatMap((g) => g.rows)) {
    if (!labels.has(row.label)) labels.set(row.label, new Set());
    if (row.note) labels.get(row.label).add(row.note);
  }
}
for (const [label, notes] of labels) {
  entry(
    label,
    notes.size ? `${label}. Aclaraciones: ${[...notes].map((n) => `«${n}»`).join(', ')}` : label,
  );
}
push('#### «Hoy»', '');
entry('Antes del cálculo (y sin JavaScript)', todayText.PENDING_NOTE);
entry('Después del cálculo (ejemplo)', todayText.calculatedNote(new Date('2026-11-03T18:40:00Z')));
entry('En las lunas de elementos medios (ejemplo, Titán)', todayText.positionNote('titan'));
entry('La fase de la Luna (ejemplo)', `Gibosa menguante · ${todayText.illuminatedText(0.87)}`);
entry('Si falla el cálculo', 'No se han podido calcular las distancias de hoy.');
push('#### Los textos alternativos de las imágenes', '');
for (const body of BODIES) entry(body.name, imageAltOf(body));
push('#### Las fuentes, al final de la ficha (ejemplo, Marte)', '');
const notes = [...ficha.matchAll(/<p[^>]*class="body__note"[^>]*>([\s\S]*?)<\/p>/g)].map((m) =>
  text(m[1]),
);
const last = notes.at(-1);
if (last) entry('La nota de los textos', last);
push('#### El pie y el menú', '');
const footer =
  /<footer[^>]*class="site-footer"[^>]*>([\s\S]*?)<\/footer>/.exec(await page('/creditos'))?.[1] ??
  '';
for (const block of blocks(footer)) entry('El pie de las páginas', block.value);
const explorerFoot =
  /<footer[^>]*class="explorer__foot"[^>]*>([\s\S]*?)<\/footer>/.exec(await page('/'))?.[1] ?? '';
// La ayuda y, en los créditos, cada línea por separado (son dos <span> en el mismo párrafo).
const hints = /<p[^>]*class="explorer__hints"[^>]*>([\s\S]*?)<\/p>/.exec(explorerFoot)?.[1];
if (hints) entry('El pie del explorador: la ayuda', text(hints));
for (const m of explorerFoot.matchAll(/<span\b[^>]*>([\s\S]*?)<\/span>/g))
  entry('El pie del explorador: los créditos', text(m[1]));
const menuNote = /<p[^>]*class="site-nav__extra site-nav__privacy"[^>]*>([\s\S]*?)<\/p>/.exec(
  await page('/'),
)?.[1];
if (menuNote) entry('El menú del móvil', text(menuNote));

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
