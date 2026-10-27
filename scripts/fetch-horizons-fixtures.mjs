// Descarga los fixtures de referencia de NASA/JPL Horizons y del USNO para los tests de precisión.
// Uso: node scripts/fetch-horizons-fixtures.mjs [fichero.json …]   (sin argumentos, todos)
// Salida: src/app/ephemeris/fixtures/*.json, cada serie con la URL exacta de su consulta.
//
// - Vectores geométricos (VEC_CORR=NONE), en km, eclíptica J2000 (REF_PLANE=ECLIPTIC, ICRF).
// - Planetas respecto al centro del Sol (500@10); la Luna respecto al de la Tierra (500@399);
//   las lunas respecto al centro de su planeta (500@<planeta>).
// - Instantes en UT (TIME_TYPE=UT), como el tiempo interno del proyecto. El barrido por décadas va
//   en TT: para 2050–2100 nadie sabe el ΔT (TT − UT) y Horizons y astronomy-engine suponen valores
//   distintos (hasta ~2 minutos en 2100); en TT se compara solo la dinámica.
import { mkdir, writeFile } from 'node:fs/promises';

const HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const USNO_API = 'https://aa.usno.navy.mil/api';
const USNO_PHASES = `${USNO_API}/moon/phases/year`;
const OUT_DIR = new URL('../src/app/ephemeris/fixtures/', import.meta.url);

const PLANETS = [
  ['mercurio', '199'],
  ['venus', '299'],
  ['tierra', '399'],
  ['marte', '499'],
  ['jupiter', '599'],
  ['saturno', '699'],
  ['urano', '799'],
  ['neptuno', '899'],
];
// [id, código Horizons, centro]
const MOONS = [
  ['luna', '301', '399'],
  ['fobos', '401', '499'],
  ['deimos', '402', '499'],
  ['io', '501', '599'],
  ['europa', '502', '599'],
  ['ganimedes', '503', '599'],
  ['calisto', '504', '599'],
  ['mimas', '601', '699'],
  ['encelado', '602', '699'],
  ['tetis', '603', '699'],
  ['dione', '604', '699'],
  ['rea', '605', '699'],
  ['titan', '606', '699'],
  ['japeto', '608', '699'],
  ['miranda', '705', '799'],
  ['ariel', '701', '799'],
  ['umbriel', '702', '799'],
  ['titania', '703', '799'],
  ['oberon', '704', '799'],
  ['triton', '801', '899'],
  ['proteo', '808', '899'],
];

/** Las 3 fechas de la fase 1 del plan (ver docs/informes/fase-1.md), a las 00:00 UT. */
const PLAN_DATES = ['2026-01-01', '2026-10-23', '2030-06-15'].map((d) => `${d}T00:00:00Z`);
/** Barrido largo: 1 de enero de cada década, 1900–2100, a las 00:00 TT. */
const DECADES = Array.from({ length: 21 }, (_, k) => `${1900 + 10 * k}-01-01T00:00:00Z`);
/** Barrido de las lunas en 2020–2035 (objetivo de §5): cada 3 meses, a las 00:00 UT. */
const QUARTERS = [];
for (let year = 2020; year <= 2035; year++) {
  for (const month of ['01', '04', '07', '10']) QUARTERS.push(`${year}-${month}-01T00:00:00Z`);
}

const toJd = (iso) => Date.parse(iso) / 86_400_000 + 2_440_587.5;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function horizonsUrl(params) {
  const query = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  return `${HORIZONS}?${query}`;
}

async function fetchText(url, attempts = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt >= attempts) throw error;
      await sleep(2000 * attempt);
    }
  }
}

/** Vectores de `target` respecto a `center` en los instantes `isoTimes` (UT). */
async function vectors(target, center, isoTimes, timeScale) {
  const url = horizonsUrl({
    format: 'json',
    COMMAND: `'${target}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'500@${center}'`,
    REF_PLANE: "'ECLIPTIC'",
    REF_SYSTEM: "'ICRF'",
    VEC_TABLE: "'1'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: `'${timeScale}'`,
    TLIST_TYPE: "'JD'",
    TLIST: isoTimes.map((iso) => `'${toJd(iso)}'`).join(','),
  });
  const json = JSON.parse(await fetchText(url));
  const result = json.result;
  const body = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(`Respuesta sin datos para ${target}: ${result.slice(0, 400)}`);
  const lines = body.trim().split('\n');
  if (lines.length !== isoTimes.length) throw new Error(`Filas inesperadas para ${target}`);
  const rows = lines.map((line, k) => {
    const [jd, , x, y, z] = line.split(',').map((cell) => cell.trim());
    if (Math.abs(Number(jd) - toJd(isoTimes[k])) > 1e-6)
      throw new Error(`Instante distinto en ${target}`);
    return [isoTimes[k], Number(x), Number(y), Number(z)];
  });
  const ephemeris = /Target body name:.*\{source: ([^}]+)\}/.exec(result)?.[1] ?? 'desconocida';
  await sleep(500);
  return { query: url, ephemeris, rows };
}

async function vectorSet(description, times, planets, moons, timeScale = 'UT') {
  const series = [];
  for (const [id, code] of planets) {
    series.push({
      id,
      target: code,
      center: '10',
      ...(await vectors(code, '10', times, timeScale)),
    });
    console.log(`  ${id}`);
  }
  for (const [id, code, center] of moons) {
    series.push({ id, target: code, center, ...(await vectors(code, center, times, timeScale)) });
    console.log(`  ${id}`);
  }
  return {
    description,
    source: 'NASA/JPL Horizons API, https://ssd-api.jpl.nasa.gov/doc/horizons.html',
    retrieved: new Date().toISOString().slice(0, 10),
    frame: 'Eclíptica J2000 (REF_PLANE=ECLIPTIC, REF_SYSTEM=ICRF)',
    units: 'km',
    corrections: 'Ninguna (vectores geométricos, VEC_CORR=NONE)',
    timeScale,
    rowFormat: `[instante ${timeScale} (ISO 8601; la Z solo marca el formato), x, y, z]`,
    series,
  };
}

/** Fracción iluminada de la Luna vista desde el centro de la Tierra (cantidad 10 de Horizons). */
async function moonIllumination(isoTimes) {
  const url = horizonsUrl({
    format: 'json',
    COMMAND: "'301'",
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'500@399'",
    QUANTITIES: "'10'",
    CSV_FORMAT: "'YES'",
    TIME_TYPE: "'UT'",
    TLIST_TYPE: "'JD'",
    TLIST: isoTimes.map((iso) => `'${toJd(iso)}'`).join(','),
  });
  const result = JSON.parse(await fetchText(url)).result;
  const lines = result.split('$$SOE')[1].split('$$EOE')[0].trim().split('\n');
  const rows = lines.map((line, k) => {
    const cells = line.split(',').map((cell) => cell.trim());
    return [isoTimes[k], Number(cells.at(-2))];
  });
  return {
    description: 'Porcentaje iluminado del disco lunar desde el centro de la Tierra.',
    source: 'NASA/JPL Horizons API, https://ssd-api.jpl.nasa.gov/doc/horizons.html',
    retrieved: new Date().toISOString().slice(0, 10),
    query: url,
    rowFormat: '[instante UT ISO 8601, porcentaje iluminado]',
    rows,
  };
}

/** Fases principales del USNO (lunas nuevas, cuartos y llenas) de los años indicados. */
async function usnoPhases(years) {
  const series = [];
  for (const year of years) {
    const query = `${USNO_PHASES}?year=${year}`;
    const json = JSON.parse(await fetchText(query));
    const phases = json.phasedata.map((p) => {
      const iso = `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}T${p.time}:00Z`;
      return [p.phase, iso];
    });
    series.push({ year, query, phases });
    await sleep(500);
  }
  return {
    description: 'Instantes de las fases principales de la Luna, redondeados al minuto (UT).',
    source:
      'U.S. Naval Observatory, Astronomical Applications API, https://aa.usno.navy.mil/data/api',
    retrieved: new Date().toISOString().slice(0, 10),
    rowFormat: '[fase, instante UT ISO 8601]',
    series,
  };
}

/** Tiempo sidéreo de Greenwich (medio y aparente) del USNO en los instantes UT1 indicados. */
async function usnoSiderealTimes(isoTimes) {
  const rows = [];
  for (const iso of isoTimes) {
    const [date, time] = iso.replace('Z', '').split('T');
    const query = `${USNO_API}/siderealtime?date=${date}&time=${time}&coords=0.0,0.0&reps=1&intv_mag=1&intv_unit=hours`;
    const [row] = JSON.parse(await fetchText(query)).properties.data;
    rows.push({ instant: iso, query, gmst: row.gmst, gast: row.gast });
    await sleep(500);
  }
  return {
    description: 'Tiempo sidéreo de Greenwich, medio (GMST) y aparente (GAST), en h:m:s.',
    source:
      'U.S. Naval Observatory, Astronomical Applications API, https://aa.usno.navy.mil/data/api',
    retrieved: new Date().toISOString().slice(0, 10),
    rows,
  };
}

/** Equinoccios y solsticios del USNO (redondeados al minuto, UT). */
async function usnoSeasons(year) {
  const query = `${USNO_API}/seasons?year=${year}`;
  const json = JSON.parse(await fetchText(query));
  const events = json.data
    .filter((e) => e.phenom === 'Equinox' || e.phenom === 'Solstice')
    .map((e) => [
      e.phenom,
      `${e.year}-${String(e.month).padStart(2, '0')}-${String(e.day).padStart(2, '0')}T${e.time}:00Z`,
    ]);
  return {
    description: 'Equinoccios y solsticios, redondeados al minuto (UT).',
    source:
      'U.S. Naval Observatory, Astronomical Applications API, https://aa.usno.navy.mil/data/api',
    retrieved: new Date().toISOString().slice(0, 10),
    query,
    rowFormat: '[fenómeno, instante UT ISO 8601]',
    events,
  };
}

/**
 * Máximo de un eclipse solar del catálogo de eclipses de la NASA (Fred Espenak, GSFC): el instante
 * (UT y TDT), ΔT y el lugar del máximo, de la ficha del eclipse (`id`: AAAAMMDD).
 */
async function nasaSolarEclipse(id) {
  const query = `https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+${id}`;
  const text = (await fetchText(query))
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&Delta;/g, 'Δ');
  const ut = text.match(/Circumstances at Greatest Eclipse:\s*(\d{2}:\d{2}:\d{2}) UT/);
  const tdt = text.match(/Instant of\s+(\d{2}:\d{2}:\d{2}) TDT/);
  const deltaT = text.match(/ΔT = ([\d.]+) s/);
  const gamma = text.match(/Gamma = (-?[\d.]+)/);
  const latitude = text.match(/Latitude:\s*([\d.]+)° ([NS])/);
  const longitude = text.match(/Longitude:\s*([\d.]+)° ([EW])/);
  if (!ut || !tdt || !deltaT || !latitude || !longitude) {
    throw new Error(`No se entiende la ficha del eclipse ${id}`);
  }
  const date = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
  return {
    description:
      'Máximo de un eclipse solar: instante (UT y TDT), ΔT y lugar del máximo (latitud norte y longitud este, en grados; al 0,1° de la ficha).',
    source:
      "NASA Eclipse Web Site, «Eclipse Predictions by Fred Espenak, NASA's GSFC», https://eclipse.gsfc.nasa.gov/",
    retrieved: new Date().toISOString().slice(0, 10),
    query,
    greatestEclipseUt: `${date}T${ut[1]}Z`,
    greatestEclipseTdt: `${date}T${tdt[1]}Z`,
    deltaTSeconds: Number(deltaT[1]),
    gamma: gamma ? Number(gamma[1]) : null,
    latitudeDeg: Number(latitude[1]) * (latitude[2] === 'S' ? -1 : 1),
    longitudeDeg: Number(longitude[1]) * (longitude[2] === 'W' ? -1 : 1),
  };
}

async function save(name, data) {
  // Una fila por línea: los arrays sin anidar se escriben en una sola línea.
  const json = JSON.stringify(data, null, 1).replace(
    /\[\s+([^[\]{}]*?)\s+\]/g,
    (_, inner) => `[${inner.replace(/\s*\n\s*/g, ' ')}]`,
  );
  await writeFile(new URL(name, OUT_DIR), `${json}\n`);
  console.log(`→ ${name}`);
}

/**
 * Instantes de control de la revisión del bloque A (docs/revisiones/bloque-A.md, hallazgo A3):
 * fuera de cualquier otro fixture y de la rejilla del ajuste de las lunas, para validarlo de forma
 * independiente. Tres en UT (uso real) y tres en TT (solo dinámica).
 */
const CONTROL_UT = ['1957-10-04T19:28:00Z', '2026-10-24T00:00:00Z', '2042-03-17T06:30:00Z'];
const CONTROL_TT = ['1905-07-14T00:00:00Z', '2063-04-05T12:00:00Z', '2099-12-31T00:00:00Z'];
/** Los 16 cuerpos que comprobó aquella revisión. */
const CONTROL_PLANETS = PLANETS.filter(([id]) => ['mercurio', 'marte', 'neptuno'].includes(id));
const CONTROL_MOONS = MOONS.filter(([id]) =>
  [
    'luna',
    'io',
    'fobos',
    'deimos',
    'mimas',
    'tetis',
    'titan',
    'japeto',
    'miranda',
    'ariel',
    'titania',
    'triton',
    'proteo',
  ].includes(id),
);

/** Ficheros que genera el script. Sin argumentos, todos; con argumentos, solo los indicados. */
const JOBS = [
  [
    'horizons-plan-dates.json',
    () => vectorSet('Las 3 fechas del plan, a las 00:00 UT.', PLAN_DATES, PLANETS, MOONS),
  ],
  [
    'horizons-decades.json',
    () =>
      vectorSet(
        '1 de enero de cada década, 1900–2100, a las 00:00 TT.',
        DECADES,
        PLANETS,
        MOONS,
        'TT',
      ),
  ],
  [
    'horizons-moons-2020-2035.json',
    () =>
      vectorSet(
        'Día 1 de enero, abril, julio y octubre de 2020 a 2035, a las 00:00 UT.',
        QUARTERS,
        [],
        MOONS.filter(([id]) => id !== 'luna'),
      ),
  ],
  [
    'horizons-control-ut.json',
    () =>
      vectorSet(
        'Control independiente (revisión del bloque A): 3 instantes en UT para 16 cuerpos.',
        CONTROL_UT,
        CONTROL_PLANETS,
        CONTROL_MOONS,
      ),
  ],
  [
    'horizons-control-tt.json',
    () =>
      vectorSet(
        'Control independiente (revisión del bloque A): 3 instantes en TT para 16 cuerpos.',
        CONTROL_TT,
        CONTROL_PLANETS,
        CONTROL_MOONS,
        'TT',
      ),
  ],
  ['horizons-moon-illumination.json', () => moonIllumination(PLAN_DATES)],
  ['usno-moon-phases.json', () => usnoPhases([1900, 2026, 2100])],
  [
    'usno-sidereal-time.json',
    () =>
      usnoSiderealTimes([
        '1900-01-01T00:00:00Z',
        '2000-01-01T12:00:00Z',
        '2026-10-23T00:00:00Z',
        // La API del USNO solo admite 1800–2050.
        '2050-12-31T00:00:00Z',
      ]),
  ],
  ['usno-seasons-2026.json', () => usnoSeasons(2026)],
  ['nasa-eclipse-2026-08-12.json', () => nasaSolarEclipse('20260812')],
];

const wanted = process.argv.slice(2);
const unknown = wanted.filter((name) => !JOBS.some(([file]) => file === name));
if (unknown.length) throw new Error(`Ficheros desconocidos: ${unknown.join(', ')}`);

await mkdir(OUT_DIR, { recursive: true });
for (const [file, build] of JOBS) {
  if (wanted.length && !wanted.includes(file)) continue;
  console.log(`${file}…`);
  await save(file, await build());
}
