// Comprueba los nombres en español de las constelaciones (D38, fase 9) con su fuente: los anuarios del
// Real Observatorio de Madrid que publica el IGN en PDF. Los descarga en assets-src/anuarios/ (una vez;
// con su SHA-256), lee el texto de las páginas citadas y comprueba, constelación a constelación:
// - que la tabla «Constelaciones» del Anuario de 2019 tiene su fila (el nombre latino, la abreviatura de
//   la IAU y la traducción, tal como la copia `scripts/content/constellations-es.json`);
// - que el nombre que se usa es el de la tabla o, si no, que la diferencia es la que se dice: en el
//   zodiaco, que el Anuario usa ese nombre para la constelación (las «Constelaciones recorridas» por
//   los planetas, o su texto); una tilde o una mayúscula de la Ortografía de la RAE; o una forma corta
//   que la tabla contiene.
// Uso: node scripts/check-constellation-names.mjs   (descarga unos 220 MB la primera vez)
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { openPdf } from './lib/pdf-text.mjs';

const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('assets-src/anuarios/', ROOT);
const data = JSON.parse(
  await readFile(new URL('scripts/content/constellations-es.json', ROOT), 'utf8'),
);

/** Sin tildes ni diéresis, en minúsculas y con los espacios normales. */
const plain = (text) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
/** Una línea de una tabla del PDF, sin los separadores de columna y con el signo menos. */
const clean = (line) =>
  line.replaceAll('\u0000', '−').replaceAll('|', ' ').replace(/\s+/g, ' ').trim();

/** El PDF de un año, descargado si hace falta y comprobado con su SHA-256. */
async function document(year) {
  const { url, sha256 } = data.documents[year];
  const file = new URL(`Anuario${year}.pdf`, CACHE);
  if (!(await stat(file).catch(() => null))) {
    await mkdir(CACHE, { recursive: true });
    console.log(`Descargando ${url}…`);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  const bytes = await readFile(file);
  const hash = createHash('sha256').update(bytes).digest('hex');
  if (hash !== sha256) throw new Error(`Anuario${year}.pdf no es el citado (SHA-256 ${hash})`);
  return openPdf(bytes);
}

const pdfs = new Map();
const pageLines = async (year, page) => {
  if (!pdfs.has(year)) pdfs.set(year, await document(year));
  return pdfs.get(year).pageText(page).split('\n').map(clean);
};

const failures = [];
const fail = (message) => failures.push(message);

// 1. La tabla de 2019: una fila por constelación.
const table = (
  await Promise.all(data.table.pdfPages.map((page) => pageLines('2019', page)))
).flat();
const intro = (await pageLines('2019', data.table.pdfPages[0] - 2)).join(' ');
if (!plain(intro).includes(plain('la traducción más habitual del nombre'))) {
  fail('2019: no encuentro «la traducción más habitual del nombre» en la introducción de la tabla');
}
for (const c of data.constellations) {
  // La fila: «Ursa Major UMa 11 50 1280 125 Osa Mayor» (el latín de la IAU sin la diéresis de Boötes).
  const latin = plain(c.latin);
  const row = table.find((line) => {
    const p = plain(line);
    return p.startsWith(`${latin} ${c.id.toLowerCase()} `) && line.endsWith(` ${c.table}`);
  });
  if (!row)
    fail(`${c.id}: no hay en la tabla de 2019 una fila de ${c.latin} que acabe en «${c.table}»`);
}

// 2. Cada nombre: el de la tabla o una diferencia dicha y comprobada.
for (const c of data.constellations) {
  if (c.es === c.table && !c.reason) continue;
  switch (c.reason) {
    case 'tilde':
      if (plain(c.es) !== plain(c.table) || c.es === c.table)
        fail(`${c.id}: «${c.es}» no es «${c.table}» con su tilde`);
      break;
    case 'mayúsculas':
      if (c.es.toLowerCase() !== c.table.toLowerCase() || c.es === c.table)
        fail(`${c.id}: «${c.es}» no es «${c.table}» con sus mayúsculas`);
      break;
    case 'forma corta':
      if (!c.table.includes(c.es) || c.es === c.table)
        fail(`${c.id}: «${c.es}» no está dentro de «${c.table}»`);
      break;
    case 'zodiaco': {
      if (!c.usage?.length) {
        fail(`${c.id}: sin el uso del Anuario que respalde «${c.es}»`);
        break;
      }
      for (const id of c.usage) {
        const usage = data.usages[id];
        const lines = await pageLines(usage.year, usage.pdfPage);
        const line = lines.find((l) => l.startsWith(usage.line) && l.includes(usage.text));
        if (!line)
          fail(
            `${c.id}: no encuentro «${usage.text}» (${usage.line}) en ${usage.year}, página ${usage.pdfPage} del PDF`,
          );
        else if (
          !plain(usage.text).split(/[/ ]/).includes(plain(c.es)) &&
          !plain(usage.text).includes(plain(c.es))
        )
          fail(`${c.id}: «${usage.text}» (${usage.year}) no nombra «${c.es}»`);
      }
      break;
    }
    default:
      fail(`${c.id}: «${c.es}» no es el de la tabla («${c.table}») y no dice por qué`);
  }
}

if (data.constellations.length !== 88) fail(`Hay ${data.constellations.length} constelaciones`);
if (failures.length) {
  for (const message of failures) console.error(`✖ ${message}`);
  process.exit(1);
}
const changed = data.constellations.filter((c) => c.reason);
console.log(
  `✔ Las 88 constelaciones, en la tabla del Anuario de 2019 (IGN); ${changed.length} con otro nombre: ${changed.map((c) => `${c.table} → ${c.es} (${c.reason})`).join(', ')}.`,
);
