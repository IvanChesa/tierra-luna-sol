// Genera src/app/data/eclipses.ts (fase 8): los eclipses de Sol y de Luna que se ven desde cada lugar
// del cielo desde España durante los próximos diez años, calculados con las mismas funciones que la
// página (`src/app/ephemeris/eclipse-search.ts`, astronomy-engine). La página `/eclipses` muestra esta
// lista prerenderizada (sin cargar astronomy-engine en su JS inicial) y el navegador la recalcula
// desde el día de hoy.
// Uso: node scripts/build-eclipses.mjs [AAAA-MM-DD]   (por defecto, hoy en UTC)
import { execFileSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import './lib/ts-resolve.mjs';

const { eclipsesBetween } = await import('../src/app/ephemeris/eclipse-search.ts');
const { toEclipseEntry } = await import('../src/app/data/eclipse-entry.ts');
const { SKY_PLACES } = await import('../src/app/data/places.ts');

const ROOT = new URL('../', import.meta.url);
/** Años de la lista. */
const YEARS = 10;

const day = process.argv[2] ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error(`Fecha no válida: ${day}`);
const from = new Date(`${day}T00:00:00Z`);
const until = new Date(from);
until.setUTCFullYear(until.getUTCFullYear() + YEARS);

const byPlace = {};
for (const place of SKY_PLACES) {
  const observer = {
    latDeg: place.latitudeDeg,
    lonDeg: place.longitudeDeg,
    altitudeM: place.altitudeM ?? 0,
  };
  byPlace[place.id] = eclipsesBetween(from, until, observer).map(toEclipseEntry);
}

const body = Object.entries(byPlace)
  .map(([id, list]) => `  '${id}': ${JSON.stringify(list)},`)
  .join('\n');
const ts = `// GENERADO por scripts/build-eclipses.mjs: no se edita a mano.
import type { EclipseEntry } from './eclipse-entry';

/** El día (UTC) desde el que se calculó la lista, y hasta cuándo llega (${YEARS} años). */
export const ECLIPSES_FROM = '${day}';
export const ECLIPSES_UNTIL = '${until.toISOString().slice(0, 10)}';

/**
 * Los eclipses de Sol y de Luna que se ven desde cada lugar del selector del cielo (algo de ellos con
 * el astro sobre el horizonte), por orden, calculados con astronomy-engine
 * (\`ephemeris/eclipse-search.ts\`).
 */
export const ECLIPSES_BY_PLACE: Readonly<Record<string, readonly EclipseEntry[]>> = {
${body}
};
`;
await writeFile(new URL('src/app/data/eclipses.ts', ROOT), ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/data/eclipses.ts'],
  { cwd: ROOT, stdio: 'ignore' },
);
const counts = Object.entries(byPlace).map(([id, list]) => `${id} ${list.length}`);
console.log(
  `→ src/app/data/eclipses.ts (${day} a ${until.toISOString().slice(0, 10)}): ${counts.join(', ')}`,
);
