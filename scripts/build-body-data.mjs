// Genera src/app/data/body-data.ts con los datos físicos y orbitales de los 30 cuerpos, copiados de
// las fichas de la NASA (NSSDCA) y del JPL. Cada dato lleva el id de su fuente (data/sources.ts).
// Uso: node scripts/build-body-data.mjs   (las páginas se guardan en assets-src/facts/)
//
// Solo se hacen cambios de unidad exactos (10^24 kg → kg, 10^6 km → km, g/cm³ → kg/m³) y, en los
// planetas, radio = diámetro / 2 (la ficha da el diámetro ecuatorial).
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('assets-src/facts/', ROOT);
const PAGES = {
  'nssdc-planets': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/',
  'nssdc-sun': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/sunfact.html',
  'nssdc-mars': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/marsfact.html',
  'nssdc-jovian-satellites': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/joviansatfact.html',
  'nssdc-saturnian-satellites':
    'https://nssdc.gsfc.nasa.gov/planetary/factsheet/saturniansatfact.html',
  'nssdc-uranian-satellites': 'https://nssdc.gsfc.nasa.gov/planetary/factsheet/uraniansatfact.html',
  'nssdc-neptunian-satellites':
    'https://nssdc.gsfc.nasa.gov/planetary/factsheet/neptuniansatfact.html',
  'jpl-satellite-physical-parameters': 'https://ssd.jpl.nasa.gov/sats/phys_par/',
};

async function page(id) {
  const file = new URL(`${id}.html`, CACHE);
  try {
    return await readFile(file, 'utf8');
  } catch {
    const response = await fetch(PAGES[id]);
    if (!response.ok) throw new Error(`HTTP ${response.status} en ${PAGES[id]}`);
    const html = await response.text();
    await writeFile(file, html);
    return html;
  }
}

const clean = (s) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
/** Filas de todas las tablas de una página, como arrays de celdas de texto. */
const rows = (html) =>
  [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) =>
    [...m[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) => clean(c[1])),
  );
/** «12,104» → 12104; «0.384*» → 0.384; «5.876854R» → 5.876854. */
function num(text) {
  const value = Number(
    text
      .replace(/,/g, '')
      .replace(/[*R]+$/, '')
      .trim(),
  );
  if (!Number.isFinite(value)) throw new Error(`No es un número: «${text}»`);
  return value;
}
const exact = (value) => Number(value.toPrecision(12));
const q = (value, source, note) => (note ? { value, source, note } : { value, source });

await mkdir(CACHE, { recursive: true });
const data = {};

// --- Planetas y Luna: tabla métrica general ----------------------------------------------------
{
  const table = rows(await page('nssdc-planets'));
  const header = table.find((r) => r.includes('MERCURY'));
  const column = (name) => header.indexOf(name);
  const row = (label) => {
    const r = table.find((cells) => cells[0]?.startsWith(label));
    if (!r) throw new Error(`Falta la fila ${label}`);
    return r;
  };
  const S = 'nssdc-planets';
  const planets = {
    mercurio: 'MERCURY',
    venus: 'VENUS',
    tierra: 'EARTH',
    marte: 'MARS',
    jupiter: 'JUPITER',
    saturno: 'SATURN',
    urano: 'URANUS',
    neptuno: 'NEPTUNE',
  };
  const cell = (label, name) => row(label)[column(name)];
  const yes = (text) => {
    if (text !== 'Yes' && text !== 'No') throw new Error(`Esperaba Yes/No: ${text}`);
    return text === 'Yes';
  };
  for (const [id, name] of Object.entries(planets)) {
    const pressure = cell('Surface Pressure', name);
    data[id] = {
      physical: {
        radiusKm: q(
          exact(num(cell('Diameter', name)) / 2),
          S,
          'Radio ecuatorial: la mitad del diámetro de la ficha.',
        ),
        massKg: q(exact(num(cell('Mass', name)) * 1e24), S),
        densityKgM3: q(num(cell('Density', name)), S),
        surfaceGravityMS2: q(num(cell('Gravity', name)), S),
        escapeVelocityKmS: q(num(cell('Escape Velocity', name)), S),
        rotationPeriodH: q(num(cell('Rotation Period', name)), S),
        lengthOfDayH: q(num(cell('Length of Day', name)), S),
        axialTiltDeg: q(num(cell('Obliquity to Orbit', name)), S),
        meanTemperatureC: q(num(cell('Mean Temperature', name)), S),
        ...(pressure.startsWith('Unknown') ? {} : { surfacePressureBar: q(num(pressure), S) }),
        globalMagneticField: q(yes(cell('Global Magnetic Field', name)), S),
        ringSystem: q(yes(cell('Ring System', name)), S),
      },
      orbit: {
        semiMajorAxisKm: q(exact(num(cell('Distance from Sun', name)) * 1e6), S),
        periapsisKm: q(exact(num(cell('Perihelion', name)) * 1e6), S),
        apoapsisKm: q(exact(num(cell('Aphelion', name)) * 1e6), S),
        periodDays: q(num(cell('Orbital Period', name)), S),
        meanOrbitalVelocityKmS: q(num(cell('Orbital Velocity', name)), S),
        inclinationDeg: q(num(cell('Orbital Inclination', name)), S, 'Respecto a la eclíptica.'),
        eccentricity: q(num(cell('Orbital Eccentricity', name)), S),
      },
    };
  }
  // La Luna: la columna MOON de la misma tabla (sus distancias y su periodo son respecto a la Tierra).
  const moonNote = 'Respecto a la Tierra (nota * de la ficha).';
  data.luna = {
    physical: {
      massKg: q(exact(num(cell('Mass', 'MOON')) * 1e24), S),
      densityKgM3: q(num(cell('Density', 'MOON')), S),
      surfaceGravityMS2: q(num(cell('Gravity', 'MOON')), S),
      escapeVelocityKmS: q(num(cell('Escape Velocity', 'MOON')), S),
      rotationPeriodH: q(num(cell('Rotation Period', 'MOON')), S),
      lengthOfDayH: q(num(cell('Length of Day', 'MOON')), S),
      axialTiltDeg: q(num(cell('Obliquity to Orbit', 'MOON')), S),
      meanTemperatureC: q(num(cell('Mean Temperature', 'MOON')), S),
      surfacePressureBar: q(num(cell('Surface Pressure', 'MOON')), S),
      globalMagneticField: q(yes(cell('Global Magnetic Field', 'MOON')), S),
    },
    orbit: {
      semiMajorAxisKm: q(exact(num(cell('Distance from Sun', 'MOON')) * 1e6), S, moonNote),
      periapsisKm: q(exact(num(cell('Perihelion', 'MOON')) * 1e6), S, moonNote),
      apoapsisKm: q(exact(num(cell('Aphelion', 'MOON')) * 1e6), S, moonNote),
      periodDays: q(num(cell('Orbital Period', 'MOON')), S, moonNote),
      meanOrbitalVelocityKmS: q(num(cell('Orbital Velocity', 'MOON')), S, moonNote),
      inclinationDeg: q(num(cell('Orbital Inclination', 'MOON')), S, 'Respecto a la eclíptica.'),
      eccentricity: q(num(cell('Orbital Eccentricity', 'MOON')), S),
    },
  };
}

// --- Sol -------------------------------------------------------------------------------------
{
  const html = await page('nssdc-sun');
  const table = rows(html);
  const S = 'nssdc-sun';
  const sun = (label) => {
    const r = table.find((cells) => cells[0]?.startsWith(label));
    if (!r) throw new Error(`Falta la fila ${label} del Sol`);
    return num(r[1].replace(/\.$/, ''));
  };
  const text = clean(html);
  const effective = /Effective temperature: ([\d,]+) K/.exec(text);
  const spectral = table.find((cells) => cells[0] === 'Spectral type');
  if (!effective || !spectral) throw new Error('Falta la temperatura efectiva o el tipo espectral');
  data.sol = {
    physical: {
      radiusKm: q(sun('Volumetric mean radius'), S, 'Radio medio volumétrico.'),
      massKg: q(exact(sun('Mass') * 1e24), S),
      densityKgM3: q(sun('Mean density'), S),
      surfaceGravityMS2: q(sun('Surface gravity'), S, 'En el ecuador.'),
      escapeVelocityKmS: q(sun('Escape velocity'), S),
      rotationPeriodH: q(
        sun('Sidereal rotation period'),
        S,
        'A 16° de latitud: el Sol no gira como un sólido.',
      ),
      axialTiltDeg: q(sun('Obliquity to ecliptic'), S, 'Respecto a la eclíptica.'),
      effectiveTemperatureK: q(num(effective[1]), S),
      luminosityW: q(exact(sun('Luminosity') * 1e24), S),
      spectralType: q(spectral[1], S),
    },
  };
}

// --- Lunas: radio y densidad del JPL ----------------------------------------------------------
const MOON_NAMES = {
  luna: 'Moon',
  fobos: 'Phobos',
  deimos: 'Deimos',
  io: 'Io',
  europa: 'Europa',
  ganimedes: 'Ganymede',
  calisto: 'Callisto',
  mimas: 'Mimas',
  encelado: 'Enceladus',
  tetis: 'Tethys',
  dione: 'Dione',
  rea: 'Rhea',
  titan: 'Titan',
  japeto: 'Iapetus',
  miranda: 'Miranda',
  ariel: 'Ariel',
  umbriel: 'Umbriel',
  titania: 'Titania',
  oberon: 'Oberon',
  triton: 'Triton',
  proteo: 'Proteus',
};
{
  const S = 'jpl-satellite-physical-parameters';
  const table = rows(await page(S));
  for (const [id, name] of Object.entries(MOON_NAMES)) {
    const r = table.find((cells) => cells[1] === name);
    if (!r) throw new Error(`Falta ${name} en el JPL`);
    // Celdas: planeta | satélite | código | GM valor σ ref | radio valor σ ref | densidad valor σ ref
    const [radius] = r[4].split(' ');
    const [density] = r[5].split(' ');
    data[id] ??= { physical: {} };
    data[id].physical.radiusKm = q(num(radius), S, 'Radio medio.');
    if (id !== 'luna') data[id].physical.densityKgM3 = q(exact(num(density) * 1000), S);
  }
}

// --- Lunas: masa, albedo y órbita de las fichas de satélites de la NASA ------------------------
{
  const sheets = {
    'nssdc-jovian-satellites': ['io', 'europa', 'ganimedes', 'calisto'],
    'nssdc-saturnian-satellites': ['mimas', 'encelado', 'tetis', 'dione', 'rea', 'titan', 'japeto'],
    'nssdc-uranian-satellites': ['miranda', 'ariel', 'umbriel', 'titania', 'oberon'],
    'nssdc-neptunian-satellites': ['proteo', 'triton'],
  };
  for (const [S, ids] of Object.entries(sheets)) {
    const table = rows(await page(S));
    for (const id of ids) {
      const name = MOON_NAMES[id];
      const matches = table.filter((cells) => cells[0]?.startsWith(`${name} (`));
      // La primera fila es la de parámetros físicos; la segunda, la de los orbitales.
      const [bulk, orbital] = matches;
      if (!bulk || !orbital) throw new Error(`Faltan filas de ${name} en ${S}`);
      const physical = data[id].physical;
      physical.massKg = q(exact(num(bulk[1]) * 1e20), S);
      const albedo = bulk[4];
      if (albedo.includes('/')) {
        const [dark, bright] = albedo.split('/').map((v) => num(v));
        physical.geometricAlbedo = q(
          dark,
          S,
          `Cara oscura; la clara llega a ${String(bright).replace('.', ',')} (la ficha da «${albedo}»).`,
        );
      } else if (albedo) {
        physical.geometricAlbedo = q(num(albedo), S);
      }
      // Órbita: semieje (10³ km) | [radios del planeta] | periodo (días) | rotación | inclinación | excentricidad
      const hasRadii = orbital.length === 7;
      const [, aCell] = orbital;
      const periodCell = orbital[hasRadii ? 3 : 2];
      const rotationCell = orbital[hasRadii ? 4 : 3];
      const inclinationCell = orbital[hasRadii ? 5 : 4];
      const eccentricityCell = orbital[hasRadii ? 6 : 5];
      const orbit = {
        semiMajorAxisKm: q(exact(num(aCell) * 1000), S),
        periodDays: q(num(periodCell), S),
        inclinationDeg: q(num(inclinationCell), S, 'Respecto al ecuador del planeta.'),
        eccentricity: q(num(eccentricityCell), S),
      };
      if (periodCell.endsWith('R'))
        orbit.retrograde = q(true, S, 'La ficha marca el periodo con «R».');
      data[id].orbit = orbit;
      if (rotationCell === 'S')
        physical.synchronousRotation = q(true, S, 'La ficha marca la rotación con «S».');
    }
  }
}

// --- Fobos y Deimos: ficha de Marte -----------------------------------------------------------
{
  const S = 'nssdc-mars';
  const table = rows(await page(S));
  const row = (label) => {
    const r = table.find((cells) => cells[0]?.startsWith(label) && cells.length === 3);
    if (!r) throw new Error(`Falta la fila ${label} de los satélites de Marte`);
    return r;
  };
  const columns = { fobos: 1, deimos: 2 };
  for (const [id, k] of Object.entries(columns)) {
    const physical = data[id].physical;
    physical.massKg = q(exact(num(row('Mass (10 15 kg)')[k]) * 1e15), S);
    physical.geometricAlbedo = q(num(row('Geometric albedo')[k]), S);
    const period = num(row('Sidereal orbit period (days)')[k]);
    const rotation = num(row('Sidereal rotation period (days)')[k]);
    if (period === rotation) {
      physical.synchronousRotation = q(true, S, 'Periodo de rotación igual al orbital.');
    }
    data[id].orbit = {
      semiMajorAxisKm: q(num(row('Semimajor axis*')[k]), S),
      periodDays: q(period, S),
      inclinationDeg: q(
        num(row('Orbital inclination (deg)')[k]),
        S,
        'Respecto al ecuador de Marte.',
      ),
      eccentricity: q(num(row('Orbital eccentricity')[k]), S),
    };
  }
}

// --- Salida -----------------------------------------------------------------------------------
const ORDER = [
  'sol',
  'mercurio',
  'venus',
  'tierra',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
  ...Object.keys(MOON_NAMES),
];
function literal(value, indent = '') {
  if (Array.isArray(value)) return `[${value.map((v) => literal(v, indent)).join(', ')}]`;
  if (value && typeof value === 'object') {
    const inner = Object.entries(value)
      .map(
        ([k, v]) =>
          `${indent}  ${/^[a-zA-Z_]\w*$/.test(k) ? k : `'${k}'`}: ${literal(v, `${indent}  `)},`,
      )
      .join('\n');
    return `{\n${inner}\n${indent}}`;
  }
  if (typeof value === 'string') return `'${value.replaceAll("'", "\\'")}'`;
  return String(value);
}
const today = new Date().toISOString().slice(0, 10);
const body = ORDER.map((id) => `  ${id}: ${literal(data[id], '  ')},`).join('\n');
const ts = `// GENERADO por scripts/build-body-data.mjs el ${today}. No se edita a mano.
// Datos físicos y orbitales copiados de las fichas de la NASA (NSSDCA) y del JPL; cada dato lleva
// el id de su fuente (data/sources.ts). Solo hay cambios de unidad exactos y, en los planetas,
// radio = diámetro / 2.
import type { BodyData, BodyId } from './body.model';

export const BODY_DATA: Record<BodyId, BodyData> = {
${body}
};
`;
await writeFile(new URL('src/app/data/body-data.ts', ROOT), ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/data/body-data.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
);
console.log(`${ORDER.length} cuerpos → src/app/data/body-data.ts`);
