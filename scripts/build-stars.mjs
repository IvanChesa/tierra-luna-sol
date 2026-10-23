// Genera public/data/stars.bin a partir del catálogo HYG v4.1 (estrellas con magnitud ≤ 6,5).
// Uso: node scripts/build-stars.mjs   (el CSV original se guarda en assets-src/hyg/)
//
// Fuente: HYG Database v4.1, David Nash (astronexus.com), CC BY-SA 4.0, fijada por commit:
const COMMIT = 'c7f7f883fe678cc7680169a50ccd7dcc49b060ce';
const SOURCE_URL = `https://raw.githubusercontent.com/astronexus/HYG-Database/${COMMIT}/hyg/CURRENT/hygdata_v41.csv`;
const MAX_MAGNITUDE = 6.5;
//
// Formato de stars.bin (little-endian), versión 1:
//   cabecera, 16 bytes: «TLSS» (ASCII) · versión uint16 · reservado uint16 · número de estrellas
//   uint32 · reservado uint32.
//   cada estrella, 8 bytes, de la más brillante a la más débil:
//     ascensión recta uint16 (ra/360°·65536; resolución 0,0055°) ·
//     declinación int16 (dec/90°·32767; resolución 0,0027°) ·
//     magnitud visual int16 (×100) · índice de color B−V int16 (×1000; −32768 si no se conoce).
//   Coordenadas J2000 (época y equinoccio 2000.0, como el catálogo).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('assets-src/hyg/hygdata_v41.csv', ROOT);
const OUT = new URL('public/data/stars.bin', ROOT);
const REFERENCE = new URL('src/app/ephemeris/fixtures/hyg-reference-stars.json', ROOT);
export const NO_COLOR = -32768;

/** Parte una línea CSV respetando los campos entre comillas. */
function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else cell += ch;
  }
  cells.push(cell);
  return cells;
}

async function loadCsv() {
  try {
    return await readFile(CACHE, 'utf8');
  } catch {
    const response = await fetch(SOURCE_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status} al descargar HYG`);
    const text = await response.text();
    await mkdir(new URL('./', CACHE), { recursive: true });
    await writeFile(CACHE, text);
    return text;
  }
}

const csv = await loadCsv();
const sha256 = createHash('sha256').update(csv).digest('hex');
const [header, ...lines] = csv.split(/\r?\n/).filter((line) => line.length > 0);
const columns = parseCsvLine(header);
const col = (name) => {
  const index = columns.indexOf(name);
  if (index < 0) throw new Error(`Falta la columna ${name}`);
  return index;
};
const [ID, PROPER, RA, DEC, MAG, CI] = ['id', 'proper', 'ra', 'dec', 'mag', 'ci'].map(col);

const stars = [];
for (const line of lines) {
  const cells = parseCsvLine(line);
  const id = Number(cells[ID]);
  const mag = Number(cells[MAG]);
  // El registro 0 es el Sol.
  if (id === 0 || !(mag <= MAX_MAGNITUDE)) continue;
  const raDeg = Number(cells[RA]) * 15; // HYG da la ascensión recta en horas.
  const decDeg = Number(cells[DEC]);
  if (!Number.isFinite(raDeg) || !Number.isFinite(decDeg))
    throw new Error(`Coordenadas no válidas en ${id}`);
  const ci = cells[CI] === '' ? null : Number(cells[CI]);
  stars.push({ id, proper: cells[PROPER], raDeg, decDeg, mag, ci });
}
stars.sort((a, b) => a.mag - b.mag || a.id - b.id);

const buffer = Buffer.alloc(16 + stars.length * 8);
buffer.write('TLSS', 0, 'ascii');
buffer.writeUInt16LE(1, 4);
buffer.writeUInt32LE(stars.length, 8);
const clampI16 = (value) => Math.max(-32767, Math.min(32767, value));
stars.forEach((star, k) => {
  const offset = 16 + k * 8;
  buffer.writeUInt16LE(Math.round((star.raDeg / 360) * 65536) % 65536, offset);
  buffer.writeInt16LE(clampI16(Math.round((star.decDeg / 90) * 32767)), offset + 2);
  buffer.writeInt16LE(clampI16(Math.round(star.mag * 100)), offset + 4);
  buffer.writeInt16LE(
    star.ci === null ? NO_COLOR : clampI16(Math.round(star.ci * 1000)),
    offset + 6,
  );
});
await mkdir(new URL('public/data/', ROOT), { recursive: true });
await writeFile(OUT, buffer);

// Estrellas de referencia para el test de integridad, copiadas tal cual del CSV.
const named = ['Sirius', 'Canopus', 'Vega', 'Polaris', 'Betelgeuse', 'Antares'];
const reference = {
  description:
    'Filas de HYG v4.1 sin transformar, para comprobar que stars.bin las contiene (ra en grados = ra en horas · 15).',
  source: SOURCE_URL,
  sha256,
  maxMagnitude: MAX_MAGNITUDE,
  count: stars.length,
  stars: named.map((name) => {
    const star = stars.find((s) => s.proper === name);
    if (!star) throw new Error(`No encuentro ${name}`);
    return {
      id: star.id,
      proper: star.proper,
      raDeg: star.raDeg,
      decDeg: star.decDeg,
      mag: star.mag,
      ci: star.ci,
    };
  }),
  faintest: { id: stars.at(-1).id, mag: stars.at(-1).mag },
  withoutColor: stars.filter((s) => s.ci === null).length,
};
await writeFile(REFERENCE, `${JSON.stringify(reference, null, 1)}\n`);

console.log(`HYG v4.1 (sha256 ${sha256})`);
console.log(
  `${stars.length} estrellas con magnitud ≤ ${MAX_MAGNITUDE} → public/data/stars.bin (${buffer.length} bytes)`,
);
console.log(`Sin índice de color: ${reference.withoutColor}`);
