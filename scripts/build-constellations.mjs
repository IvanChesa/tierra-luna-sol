// Prepara las constelaciones de la vista del cielo (fase 8) a partir de d3-celestial (Olaf Frohn,
// licencia BSD de 3 cláusulas), descargado con `node scripts/download-assets.mjs` en
// assets-src/constellations/ (fijado a un commit, con su SHA-256 en el manifiesto):
// - public/data/constellations.json: las líneas de las 88 constelaciones (J2000, en grados) y dónde va
//   su nombre; lo carga la escena del cielo al abrir la vista;
// - public/data/constellations.LICENSE.txt: la licencia BSD, que pide reproducir su aviso, y la
//   atribución de las cartas de la IAU de las que salen las figuras (CC BY 4.0);
// - src/app/data/constellations.ts: el nombre de cada una por su símbolo de la IAU, el oficial (en
//   latín) y el español (D38), para los textos del cielo («Júpiter, en Géminis (Gemini)»).
//
// Las líneas de d3-celestial son las figuras (de Alan MacRobert) de las cartas de las constelaciones de
// la IAU, hechas con Sky & Telescope (Roger Sinnott y Rick Fienberg) y publicadas con licencia CC BY 4.0
// (la página de la IAU, consultada el 2026-11-01), con algún retoque de Olaf Frohn (su README, fuente
// [3]). CC BY 4.0 pide la atribución: va en el fichero de licencia, en FUENTES.md y en /creditos
// (revisión de la fase 8, hallazgo 5). Los nombres son los oficiales de la IAU, en latín: los que da
// `Constellation` de astronomy-engine (licencia MIT) en el punto donde d3-celestial pone el nombre, lo
// que comprueba de paso que su símbolo es el de esa región del cielo. Los nombres «es» de d3-celestial
// no se usan. Los españoles (D38, decisión de Iván del 03-11) salen de
// scripts/content/constellations-es.json: los de la tabla «Constelaciones» del Anuario del Real
// Observatorio de Madrid para 2019 (IGN) y, en el zodiaco, los que usa el mismo Anuario para esas
// constelaciones; los comprueba con los PDF del IGN scripts/check-constellation-names.mjs.
// Uso: node scripts/build-constellations.mjs
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { Constellation } from 'astronomy-engine';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets-src/constellations/', ROOT);
const PAGE = 'https://github.com/ofrohn/d3-celestial';
/** Las cartas de las constelaciones de la IAU, de las que salen las figuras. */
const IAU_CHARTS = {
  url: 'https://www.iau.org/IAU/IAU/Astronomy-FAQs/Constellations.aspx',
  credit: 'IAU and Sky & Telescope magazine (Roger Sinnott & Rick Fienberg)',
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

const manifest = JSON.parse(await readFile(new URL('manifest.json', SRC), 'utf8'));
/** Lee un fichero descargado y comprueba que es el del manifiesto (el del commit fijado). */
async function source(file) {
  const bytes = await readFile(new URL(file, SRC));
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  if (sha256 !== manifest[file]?.sha256) {
    throw new Error(`${file} no es el descargado (SHA-256): node scripts/download-assets.mjs`);
  }
  return bytes.toString('utf8');
}

const spanish = JSON.parse(
  await readFile(new URL('scripts/content/constellations-es.json', ROOT), 'utf8'),
);
const SPANISH = new Map(spanish.constellations.map((c) => [c.id, c.es]));
const lines = JSON.parse(await source('constellations.lines.json'));
const names = JSON.parse(await source('constellations.json'));
const license = await source('LICENSE');
const commit = manifest['constellations.lines.json'].url.match(
  /d3-celestial\/([0-9a-f]{40})\//,
)?.[1];
if (!commit) throw new Error('El manifiesto no dice el commit de d3-celestial');

/** Grados con tres decimales (3,6″: invisible con cualquier campo de visión de la vista). */
const round = (value) => Math.round(value * 1000) / 1000;

/** Sin acentos ni diéresis ni espacios raros, en minúsculas, para comparar nombres. */
const plain = (text) =>
  text.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

/**
 * El nombre de la IAU de una constelación: el de d3-celestial (`name`, con la diéresis de Boötes) si
 * coincide con el de astronomy-engine; si no, su nombre latino (`la`) si es el que coincide (la
 * Serpiente, que d3-celestial nombra por partes, y Corona Australis, que llama Corona Austrina). Si
 * ninguno coincide, el de d3-celestial, y se avisa (astronomy-engine escribe «Antila» por Antlia).
 */
function officialName(properties, engineName) {
  if (plain(properties.name) === plain(engineName)) return properties.name.replace(/\s+/g, ' ');
  if (plain(properties.la) === plain(engineName)) return properties.la.replace(/\s+/g, ' ');
  console.warn(
    `  ${properties.desig}: «${properties.name}» (d3-celestial) frente a «${engineName}»`,
  );
  return properties.name.replace(/\s+/g, ' ');
}

// La Serpiente va en dos partes (la cabeza y la cola, a los lados de Ofiuco) con el mismo símbolo:
// 89 partes para 88 constelaciones, cada una con su posición del nombre y sus líneas, en el mismo
// orden en los dos ficheros.
if (lines.features.length !== names.features.length) throw new Error('Líneas y nombres no casan');
const constellations = lines.features
  .map((feature, k) => {
    const info = names.features[k];
    if (info?.id !== feature.id) throw new Error(`Orden distinto en ${feature.id}`);
    if (feature.geometry.type !== 'MultiLineString') throw new Error(`${feature.id}: geometría`);
    const [ra, dec] = info.geometry.coordinates;
    // La IAU en ese punto (J2000; la ascensión recta de d3-celestial va de −180° a 180°).
    const iau = Constellation((((ra % 360) + 360) % 360) / 15, dec);
    if (iau.symbol !== feature.id) {
      throw new Error(`${feature.id}: su nombre cae en ${iau.symbol} según la IAU`);
    }
    const es = SPANISH.get(feature.id);
    if (!es) throw new Error(`${feature.id}: sin nombre en español (constellations-es.json)`);
    return {
      id: feature.id,
      name: officialName(info.properties, iau.name),
      es,
      // La parte (en la Serpiente, Serpens Caput y Serpens Cauda), para el orden.
      part: info.properties.name,
      // La posición del nombre (ascensión recta y declinación, grados, J2000).
      label: [ra, dec].map(round),
      lines: feature.geometry.coordinates.map((polyline) => polyline.flat().map(round)),
    };
  })
  .sort((a, b) => a.id.localeCompare(b.id) || a.part.localeCompare(b.part));

const symbols = [...new Set(constellations.map((c) => c.id))];
if (symbols.length !== 88) throw new Error(`Hay ${symbols.length} constelaciones`);
for (const c of constellations) {
  if (!c.name) throw new Error(`${c.id}: sin nombre`);
  for (const polyline of c.lines) {
    if (polyline.length < 4 || polyline.length % 2 !== 0) throw new Error(`${c.id}: línea corta`);
    for (let k = 1; k < polyline.length; k += 2) {
      if (Math.abs(polyline[k]) > 90) throw new Error(`${c.id}: declinación fuera de rango`);
    }
  }
}

const segments = constellations.reduce(
  (sum, c) => sum + c.lines.reduce((s, polyline) => s + polyline.length / 2 - 1, 0),
  0,
);

const SOURCE = `d3-celestial (Olaf Frohn), commit ${commit}, ${PAGE}`;
const data = {
  generated: 'GENERADO por scripts/build-constellations.mjs: no se edita a mano.',
  source: SOURCE,
  license:
    'BSD de 3 cláusulas (d3-celestial) y CC BY 4.0 (las cartas de la IAU): constellations.LICENSE.txt',
  basis: `Las figuras de las cartas de las constelaciones de la IAU (${IAU_CHARTS.credit}; CC BY 4.0, ${IAU_CHARTS.url}), con retoques de Olaf Frohn (README de d3-celestial, fuente [3]). Nombres oficiales de la IAU, de astronomy-engine; en español (es), los del Anuario del Real Observatorio de Madrid para 2019 (IGN): ${spanish.table.url}.`,
  frame: 'J2000: ascensión recta y declinación en grados',
  constellations: constellations.map(({ id, name, es, label, lines: polylines }) => ({
    id,
    name,
    es,
    label,
    lines: polylines,
  })),
};
await writeFile(new URL('public/data/constellations.json', ROOT), `${JSON.stringify(data)}\n`);
await writeFile(
  new URL('public/data/constellations.LICENSE.txt', ROOT),
  [
    'Líneas de las constelaciones (constellations.json), preparadas por',
    'scripts/build-constellations.mjs de Tierra Luna Sol a partir de d3-celestial:',
    `${PAGE} (commit ${commit}).`,
    'Los nombres son los oficiales de la IAU, de astronomy-engine (licencia MIT), y en español, los del',
    `Anuario del Real Observatorio de Madrid para 2019 (© Instituto Geográfico Nacional): ${spanish.table.url}.`,
    '',
    'Las líneas son las figuras de las cartas de las constelaciones de la IAU (las de Alan MacRobert),',
    'con algún retoque de Olaf Frohn en d3-celestial:',
    `  ${IAU_CHARTS.credit}.`,
    `  Licencia Creative Commons Attribution 4.0 International (${IAU_CHARTS.license}),`,
    `  según ${IAU_CHARTS.url} (consultada el 2026-11-01).`,
    '  Cambios: las líneas, de d3-celestial; pasadas a grados con tres decimales.',
    '',
    'Licencia de d3-celestial:',
    '',
    license.trim(),
    '',
  ].join('\n'),
);

const quote = (text) => `'${text.replace(/'/g, "\\'")}'`;
const entries = symbols
  .map((id) => `  ${id}: ${quote(constellations.find((c) => c.id === id)?.name ?? '')},`)
  .join('\n');
const spanishEntries = symbols.map((id) => `  ${id}: ${quote(SPANISH.get(id) ?? '')},`).join('\n');
const spanishSource = `${spanish.table.title}, ${spanish.table.publisher}: ${spanish.table.url}`;
const doc = [
  '/**',
  ' * Los nombres oficiales de la IAU (en latín) de las 88 constelaciones, por su símbolo (el que da',
  ' * `Constellation` de astronomy-engine). Sus líneas, en `public/data/constellations.json`: las figuras',
  ' * de las cartas de la IAU (IAU y Sky & Telescope, CC BY 4.0), de d3-celestial (Olaf Frohn, licencia',
  ' * BSD de 3 cláusulas).',
  ' */',
].join('\n');
const ts = `// GENERADO por scripts/build-constellations.mjs: no se edita a mano.
${doc}
export const CONSTELLATION_NAMES: Readonly<Record<string, string>> = {
${entries}
};

/**
 * Los nombres en español (D38): los del Anuario del Real Observatorio de Madrid (IGN), comprobados con
 * sus PDF por scripts/check-constellation-names.mjs (la lista y sus citas, en
 * scripts/content/constellations-es.json).
 */
export const CONSTELLATION_NAMES_ES: Readonly<Record<string, string>> = {
${spanishEntries}
};

export const CONSTELLATION_NAMES_ES_SOURCE = ${quote(spanishSource)};

export const CONSTELLATIONS_SOURCE = '${SOURCE}';
export const CONSTELLATIONS_LICENSE = 'BSD de 3 cláusulas (d3-celestial) y CC BY 4.0 (las cartas de la IAU)';
`;
await writeFile(new URL('src/app/data/constellations.ts', ROOT), ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/data/constellations.ts'],
  { cwd: ROOT, stdio: 'ignore' },
);
console.log(
  `→ public/data/constellations.json (${symbols.length} constelaciones en ${constellations.length} partes, ${segments} segmentos) y src/app/data/constellations.ts`,
);
