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

// --- Fase 8: el cielo desde España ----------------------------------------------------------------

/**
 * Los lugares de los fixtures de salidas y puestas (fase 8, tarea 4): uno peninsular y uno canario,
 * para probar las dos zonas horarias. Las coordenadas, las de `src/app/data/places.ts`.
 */
const USNO_PLACES = [
  { id: 'montsec', latDeg: 42.024637, lonDeg: 0.736936, timeZone: 'Europe/Madrid', tz: 1 },
  {
    id: 'teide',
    latDeg: 28 + 18 / 60 + 4 / 3600,
    lonDeg: -(16 + 30 / 60 + 38 / 3600),
    timeZone: 'Atlantic/Canary',
    tz: 0,
  },
];
/** El equinoccio de marzo y los dos solsticios de 2026; en junio, con el horario de verano. */
const USNO_DATES = [
  { date: '2026-03-20', dst: false },
  { date: '2026-06-21', dst: true },
  { date: '2026-12-21', dst: false },
];

/** «HH:MM» de un día local (con la hora de su zona y el verano) → instante UT ISO 8601. */
function localToUt(date, time, tz, dst) {
  const [h, m] = time.split(':').map(Number);
  const [y, mo, d] = date.split('-').map(Number);
  const ms = Date.UTC(y, mo - 1, d, h, m) - (tz + (dst ? 1 : 0)) * 3_600_000;
  return new Date(ms).toISOString().replace(':00.000Z', 'Z');
}

/**
 * Las horas del crepúsculo náutico (`task` 3) o astronómico (4) de un día, de la tabla anual del USNO
 * (en la hora estándar de la zona, sin el horario de verano: «Add one hour for daylight time»).
 */
async function usnoTwilightTable(place, year, task) {
  const query =
    `https://aa.usno.navy.mil/calculated/rstt/year?ID=AA&year=${year}&task=${task}` +
    `&lat=${place.latDeg.toFixed(6)}&lon=${place.lonDeg.toFixed(6)}&label=${place.id}` +
    `&tz=${place.tz}&tz_sign=1&submit=Get+Data`;
  const html = await fetchText(query);
  const pre = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/)?.[1];
  if (!pre) throw new Error(`Sin tabla del USNO: ${query}`);
  const rows = new Map(
    pre
      .split('\n')
      .filter((line) => /^\d{2} {2}/.test(line))
      .map((line) => [Number(line.slice(0, 2)), line]),
  );
  /** Comienzo y final del día `day` del mes `month` (1–12), «HH:MM», o `null` si no hay. */
  const at = (month, day) => {
    const line = rows.get(day) ?? '';
    const cell = (offset) => {
      const raw = line.slice(offset, offset + 4);
      return /^\d{4}$/.test(raw) ? `${raw.slice(0, 2)}:${raw.slice(2)}` : null;
    };
    const base = 4 + 11 * (month - 1);
    return { begin: cell(base), end: cell(base + 5) };
  };
  return { query, at };
}

/**
 * Salidas, puestas y crepúsculos del USNO (fase 8): el Sol y la Luna (salida, culminación y puesta) y
 * el crepúsculo civil, de la API `rstt/oneday` en la hora local del lugar (con su zona y su horario de
 * verano, como las daría un reloj allí); el náutico y el astrónomico, de las tablas anuales.
 */
async function usnoRiseSetSpain() {
  const PHEN = {
    'Begin Civil Twilight': 'civilDawn',
    Rise: 'rise',
    'Upper Transit': 'transit',
    Set: 'set',
    'End Civil Twilight': 'civilDusk',
  };
  const series = [];
  for (const place of USNO_PLACES) {
    const nautical = await usnoTwilightTable(place, 2026, 3);
    await sleep(500);
    const astronomical = await usnoTwilightTable(place, 2026, 4);
    await sleep(500);
    for (const { date, dst } of USNO_DATES) {
      const query = `${USNO_API}/rstt/oneday?date=${date}&coords=${place.latDeg.toFixed(6)},${place.lonDeg.toFixed(6)}&tz=${place.tz}&dst=${dst}`;
      const data = JSON.parse(await fetchText(query)).properties.data;
      if (data.isdst !== dst)
        throw new Error(`El USNO no da el horario de verano pedido: ${query}`);
      const events = (list) =>
        Object.fromEntries(
          list
            .filter((e) => PHEN[e.phen])
            .map((e) => {
              const local = e.time.replace(/\s+DT$/, '').trim();
              return [PHEN[e.phen], { local, ut: localToUt(date, local, place.tz, dst) }];
            }),
        );
      const [, month, day] = date.split('-').map(Number);
      const twilight = (table) => {
        const { begin, end } = table.at(month, day);
        // Las tablas anuales van en la hora estándar: sin el horario de verano.
        return {
          dawn: begin ? localToUt(date, begin, place.tz, false) : null,
          dusk: end ? localToUt(date, end, place.tz, false) : null,
        };
      };
      series.push({
        place: place.id,
        latDeg: place.latDeg,
        lonDeg: place.lonDeg,
        timeZone: place.timeZone,
        date,
        utcOffsetHours: place.tz + (dst ? 1 : 0),
        query,
        sun: events(data.sundata),
        moon: events(data.moondata),
        nautical: { query: nautical.query, ...twilight(nautical) },
        astronomical: { query: astronomical.query, ...twilight(astronomical) },
      });
      await sleep(500);
    }
  }
  return {
    description:
      'Salidas, culminaciones y puestas del Sol y de la Luna y crepúsculos civil, náutico y astronómico, al minuto, en un lugar peninsular (el Montsec) y uno canario (el Teide). `local`: la hora del reloj del lugar ese día (con su zona y su horario de verano); `ut`: el mismo instante en UT. Los crepúsculos náutico y astronómico, de las tablas anuales (en hora estándar), ya en UT.',
    source:
      'U.S. Naval Observatory, Astronomical Applications API (https://aa.usno.navy.mil/data/api) y «Rise/Set/Twilight Table for an Entire Year» (https://aa.usno.navy.mil/data/RS_OneYear)',
    retrieved: new Date().toISOString().slice(0, 10),
    series,
  };
}

const NASA_MONTHS = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

/**
 * Los eclipses de Sol y de Luna de unos años (fase 8): la fecha, el instante del máximo (TD) y el tipo,
 * de los catálogos de cinco milenios de la NASA (Fred Espenak y Jean Meeus, GSFC), tabla de 2001–2100.
 * Tipos de Sol: T total, A anular, H híbrido, P parcial; de Luna: T total, P parcial, N penumbral (la
 * primera letra; las siguientes, del catálogo, matizan el tipo).
 */
async function nasaEclipseCatalog(fromYear, toYear) {
  const parse = async (query, kind) => {
    const text = (await fetchText(query)).replace(/<[^>]+>/g, '');
    const rows = [];
    const pattern =
      /\d{5}\s+(\d{4}) ([A-Z][a-z]{2}) (\d{2})\s+(\d{2}:\d{2}:\d{2})\s+-?\d+\s+-?\d+\s+\d+\s+(\S+)/g;
    for (const match of text.matchAll(pattern)) {
      const year = Number(match[1]);
      if (year < fromYear || year > toYear) continue;
      const month = String(NASA_MONTHS[match[2]]).padStart(2, '0');
      rows.push({
        kind,
        date: `${year}-${month}-${match[3]}`,
        greatestEclipseTd: `${year}-${month}-${match[3]}T${match[4]}Z`,
        type: match[5],
      });
    }
    return rows;
  };
  const solarQuery = 'https://eclipse.gsfc.nasa.gov/SEcat5/SE2001-2100.html';
  const lunarQuery = 'https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html';
  const solar = await parse(solarQuery, 'solar');
  await sleep(500);
  const lunar = await parse(lunarQuery, 'lunar');
  if (solar.length === 0 || lunar.length === 0) throw new Error('Catálogos de la NASA vacíos');
  return {
    description: `Eclipses de Sol y de Luna de ${fromYear} a ${toYear}: fecha, instante del máximo (TD) y tipo del catálogo (Sol: T total, A anular, H híbrido, P parcial; Luna: T total, P parcial, N penumbral).`,
    source:
      'NASA Eclipse Web Site, «Five Millennium Catalog of Solar Eclipses» y «… of Lunar Eclipses» (Fred Espenak y Jean Meeus, NASA/GSFC), https://eclipse.gsfc.nasa.gov/',
    retrieved: new Date().toISOString().slice(0, 10),
    queries: [solarQuery, lunarQuery],
    eclipses: [...solar, ...lunar].sort((a, b) =>
      a.greatestEclipseTd.localeCompare(b.greatestEclipseTd),
    ),
  };
}

/**
 * Puntos de la línea central de un eclipse total o anular (fase 8): el instante (UT) y la latitud y la
 * longitud del centro de la sombra, con la duración de la fase central allí, de la tabla del camino de
 * la NASA (`page`, por ejemplo `SE2026Aug12T`), en las horas pedidas.
 */
async function nasaCentralLine(page, date, times) {
  const query = `https://eclipse.gsfc.nasa.gov/SEpath/SEpath2001/${page}path.html`;
  const text = (await fetchText(query)).replace(/<[^>]+>/g, '');
  const angle = (deg, min, hemisphere) =>
    (Number(deg) + Number(min) / 60) * (hemisphere === 'S' || hemisphere === 'W' ? -1 : 1);
  const points = times.map((time) => {
    const line = text.split('\n').find((l) => l.trim().startsWith(time));
    if (!line) throw new Error(`No está la hora ${time} en ${query}`);
    // Tres pares (límite norte, límite sur, línea central) de «gg mm.mN ggg mm.mE»: la central, la
    // última; luego la razón de diámetros, la altura y el acimut del Sol, el ancho y la duración.
    const pairs = [...line.matchAll(/(\d{1,2}) (\d{2}\.\d)([NS])\s+(\d{3}) (\d{2}\.\d)([EW])/g)];
    const central = pairs.at(-1);
    const duration = line.match(/(\d{2})m(\d{2}\.\d)s\s*$/);
    if (!central || !duration) throw new Error(`No se entiende la fila ${time} de ${query}`);
    return {
      ut: `${date}T${time}:00Z`,
      latitudeDeg: Number(angle(central[1], central[2], central[3]).toFixed(5)),
      longitudeDeg: Number(angle(central[4], central[5], central[6]).toFixed(5)),
      centralDurationSeconds: Number(duration[1]) * 60 + Number(duration[2]),
    };
  });
  return {
    description:
      'Puntos de la línea central del eclipse: instante (UT), latitud norte y longitud este (grados, de los grados y minutos de la tabla) y duración de la totalidad allí (s).',
    source:
      "NASA Eclipse Web Site, «Eclipse Predictions by Fred Espenak, NASA's GSFC», https://eclipse.gsfc.nasa.gov/",
    retrieved: new Date().toISOString().slice(0, 10),
    query,
    points,
  };
}

/**
 * Máximo de un eclipse solar del catálogo de eclipses de la NASA (Fred Espenak, GSFC): el instante
 * (UT y TDT), ΔT, el lugar del máximo y la altura del Sol allí, de la ficha del eclipse (`id`:
 * AAAAMMDD).
 */
async function nasaSolarEclipse(id) {
  const query = `https://eclipse.gsfc.nasa.gov/SEsearch/SEdata.php?Ecl=+${id}`;
  const text = (await fetchText(query))
    .replace(/&nbsp;/g, ' ')
    .replace(/&deg;/g, '°')
    .replace(/&Delta;/g, 'Δ')
    .replace(/&rsquo;/g, '’');
  const ut = text.match(/Circumstances at Greatest Eclipse:\s*(\d{2}:\d{2}:\d{2}) UT/);
  const tdt = text.match(/Instant of\s+(\d{2}:\d{2}:\d{2}) TDT/);
  const deltaT = text.match(/ΔT = ([\d.]+) s/);
  const gamma = text.match(/Gamma = (-?[\d.]+)/);
  const latitude = text.match(/Latitude:\s*([\d.]+)° ([NS])/);
  const longitude = text.match(/Longitude:\s*([\d.]+)° ([EW])/);
  const sunAltitude = text.match(/Sun’s Altitude:\s*(-?[\d.]+)°/);
  if (!ut || !tdt || !deltaT || !latitude || !longitude || !sunAltitude) {
    throw new Error(`No se entiende la ficha del eclipse ${id}`);
  }
  const date = `${id.slice(0, 4)}-${id.slice(4, 6)}-${id.slice(6, 8)}`;
  return {
    description:
      'Máximo de un eclipse solar: instante (UT y TDT), ΔT, lugar del máximo (latitud norte y longitud este, en grados; al 0,1° de la ficha) y altura del Sol allí (grados).',
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
    sunAltitudeDeg: Number(sunAltitude[1]),
  };
}

/**
 * Eclipses de Luna del catálogo de cinco milenios de la NASA (Fred Espenak y Jean Meeus, GSFC), en su
 * tabla de 2001–2100: para cada fecha (AAAA-MM-DD), el instante del máximo (TD), ΔT, el tipo, gamma
 * (distancia del centro de la Luna al eje de la sombra, en radios ecuatoriales de la Tierra; negativa
 * al sur), las magnitudes penumbral y umbral y la duración de las fases penumbral, parcial y total
 * (minutos). La NASA calcula la sombra con la regla de Danjon (el radio de la Tierra, +1/85).
 */
async function nasaLunarEclipses(dates) {
  const query = 'https://eclipse.gsfc.nasa.gov/LEcat5/LE2001-2100.html';
  const text = (await fetchText(query)).replace(/<[^>]+>/g, '');
  const months = {
    Jan: 1,
    Feb: 2,
    Mar: 3,
    Apr: 4,
    May: 5,
    Jun: 6,
    Jul: 7,
    Aug: 8,
    Sep: 9,
    Oct: 10,
    Nov: 11,
    Dec: 12,
  };
  const rows = dates.map((date) => {
    const [year, month, day] = date.split('-');
    const name = Object.entries(months).find(([, n]) => n === Number(month))?.[0];
    const row = text.match(
      new RegExp(
        `\\d{5}\\s+${year} ${name} ${day}\\s+(\\d{2}:\\d{2}:\\d{2})\\s+(\\d+)\\s+\\d+\\s+\\d+\\s+(\\S+)\\s+\\S+\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+(-?[\\d.]+)\\s+([\\d.]+|-)\\s+([\\d.]+|-)\\s+([\\d.]+|-)`,
      ),
    );
    if (!row) throw new Error(`No está el eclipse de Luna del ${date} en el catálogo`);
    const minutes = (value) => (value === '-' ? null : Number(value));
    return {
      greatestEclipseTd: `${date}T${row[1]}Z`,
      deltaTSeconds: Number(row[2]),
      type: row[3],
      gamma: Number(row[4]),
      penumbralMagnitude: Number(row[5]),
      umbralMagnitude: Number(row[6]),
      penumbralMinutes: minutes(row[7]),
      partialMinutes: minutes(row[8]),
      totalMinutes: minutes(row[9]),
    };
  });
  return {
    description:
      'Eclipses de Luna: instante del máximo (TD), ΔT (s), tipo, gamma (radios ecuatoriales de la Tierra; negativa al sur del eje), magnitudes penumbral y umbral y duración de las fases penumbral, parcial y total (minutos). La NASA calcula la sombra con la regla de Danjon.',
    source:
      'NASA Eclipse Web Site, «Five Millennium Catalog of Lunar Eclipses» (Fred Espenak y Jean Meeus, NASA/GSFC), https://eclipse.gsfc.nasa.gov/LEcat5/LEcatalog.html',
    retrieved: new Date().toISOString().slice(0, 10),
    query,
    eclipses: rows,
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
  // Fase 6: el total del 3-3-2026 (el de las capturas), el total del 7-9-2025 y el parcial del
  // 28-8-2026.
  ['nasa-lunar-eclipses.json', () => nasaLunarEclipses(['2026-03-03', '2025-09-07', '2026-08-28'])],
  // Fase 8: el cielo desde España (salidas, puestas y crepúsculos) y los próximos eclipses.
  ['usno-rise-set-spain.json', () => usnoRiseSetSpain()],
  ['nasa-eclipses-2026-2035.json', () => nasaEclipseCatalog(2026, 2035)],
  [
    'nasa-eclipse-2026-08-12-path.json',
    // Las dos horas en que la línea central cruza la Península (Asturias y Burgos).
    () => nasaCentralLine('SE2026Aug12T', '2026-08-12', ['18:28', '18:30']),
  ],
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
