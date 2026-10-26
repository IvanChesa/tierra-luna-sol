// Geometría de las fotos de referencia de la fase 3b (docs/realismo/referencias.md): el ángulo de
// fase de cada foto y, en Saturno, la inclinación de los anillos vista por el observador.
// Uso: node scripts/reference-geometry.mjs
//
// - Fotos desde la órbita de la Tierra (Hubble): astronomy-engine, con el observador en el centro de
//   la Tierra (el Hubble está a ~540 km: no cambia el ángulo de fase en nada que se vea).
// - Fotos de sondas: NASA/JPL Horizons, con la sonda como observador (cantidades 20, distancia, y
//   24, ángulo Sol–cuerpo–observador). Cada consulta sale con su URL.
import { Body, GeoVector, Illumination, RotationAxis } from 'astronomy-engine';

const HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api';

/** [id, cuerpo, instante UT, qué foto] — instante: el de la página de la foto (si solo da el día, las 12:00). */
const EARTH_PHOTOS = [
  ['marte-hubble-2016', Body.Mars, '2016-05-12T12:00:00Z', 'Hubble, heic1609'],
  ['jupiter-hubble-2019', Body.Jupiter, '2019-06-27T12:00:00Z', 'Hubble OPAL, STScI-2019-36'],
  ['saturno-hubble-2019', Body.Saturn, '2019-06-20T12:00:00Z', 'Hubble OPAL, 2019'],
  ['urano-hubble-2021', Body.Uranus, '2021-10-25T12:00:00Z', 'Hubble OPAL, 2021'],
  ['neptuno-hubble-2021', Body.Neptune, '2021-09-07T12:00:00Z', 'Hubble OPAL, 2021'],
];

/**
 * [id, código Horizons del cuerpo, código de la sonda, inicio, fin, paso, qué foto]. Se pide una
 * tabla alrededor del instante de la foto: la página da la distancia o el instante aproximado.
 */
const SPACECRAFT_PHOTOS = [
  // MESSENGER, tercer sobrevuelo (máximo acercamiento: 2009-09-29 21:55 UTC); la foto en color
  // (PIA12371) se tomó a 16 300 km de altitud.
  [
    'mercurio-messenger-2009',
    '199',
    '-236',
    '2009-09-29 18:00',
    '2009-09-30 02:00',
    '15 m',
    'PIA12371',
  ],
  // Cassini, «The Day the Earth Smiled» (PIA17172): 2013-07-19, en la sombra de Saturno.
  ['saturno-cassini-2013', '699', '-82', '2013-07-19 18:00', '2013-07-20 00:00', '1 h', 'PIA17172'],
  // Voyager 2: Neptuno, 4 días y 20 horas antes del máximo acercamiento (1989-08-25 03:56 UTC).
  ['neptuno-voyager-1989', '899', '-32', '1989-08-20 06:00', '1989-08-20 10:00', '1 h', 'PIA01492'],
  // MESSENGER, segundo sobrevuelo de Venus (máximo acercamiento: 2007-06-05 23:08 UTC), «Approaching
  // Venus Image #2» (PIA10124): la página no da la hora; tabla del día antes del acercamiento.
  [
    'venus-messenger-2007',
    '299',
    '-236',
    '2007-06-05 00:00',
    '2007-06-05 23:00',
    '3 h',
    'PIA10124',
  ],
  // Voyager 2: Urano a unos 12,7 millones de km (registro de la NASA de la imagen), enero de 1986.
  ['urano-voyager-1986', '799', '-32', '1986-01-10 00:00', '1986-01-18 00:00', '1 d', 'PIA18182'],
];

/**
 * Latitud del observador sobre el ecuador del cuerpo (la apertura de los anillos en Saturno), con el
 * polo IAU de `RotationAxis`: positiva si se ve la cara norte.
 */
function subObserverLatitude(body, date) {
  const geo = GeoVector(body, date, true); // de la Tierra al cuerpo, EQJ, con aberración
  const axis = RotationAxis(body, date).north;
  const length = Math.hypot(geo.x, geo.y, geo.z);
  const dot = -(geo.x * axis.x + geo.y * axis.y + geo.z * axis.z) / length;
  return (Math.asin(dot) * 180) / Math.PI;
}

function earthPhoto([id, body, iso, what]) {
  const date = new Date(iso);
  const info = Illumination(body, date);
  const latitude = subObserverLatitude(body, date);
  const face = latitude >= 0 ? 'norte' : 'sur';
  const extra =
    body === Body.Saturn
      ? ` · anillos abiertos ${Math.abs(latitude).toFixed(1)}° (cara ${face})`
      : ` · se ve el hemisferio ${face} (latitud ${latitude.toFixed(1)}°)`;
  return `| ${id} | ${what} | ${iso.slice(0, 10)} | ${info.phase_angle.toFixed(1)}°${extra} | astronomy-engine (\`Illumination\`, \`RotationAxis\`) |`;
}

async function spacecraftPhoto([id, target, observer, start, stop, step, what]) {
  const params = {
    format: 'text',
    COMMAND: `'${target}'`,
    CENTER: `'500@${observer}'`,
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${step}'`,
    QUANTITIES: "'20,24'",
    CSV_FORMAT: "'YES'",
  };
  const url = `${HORIZONS}?${Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&')}`;
  const text = await (await fetch(url)).text();
  const table = /\$\$SOE([\s\S]*?)\$\$EOE/.exec(text);
  if (!table)
    return `| ${id} | ${what} | — | Horizons no ha respondido: ${text.split('\n').slice(2, 6).join(' ').trim()} | ${url} |`;
  const rows = table[1]
    .trim()
    .split('\n')
    .map((line) => line.split(',').map((cell) => cell.trim()));
  // CSV: fecha, (marcas), delta (UA), deldot, S-O-T, /r, S-T-O…: se toman las dos últimas columnas numéricas.
  const lines = rows.map((cells) => {
    const numbers = cells.filter((cell) => cell !== '' && Number.isFinite(Number(cell)));
    const deltaAu = Number(numbers[0]);
    const phase = Number(numbers.at(-1));
    return `${cells[0]}: ${(deltaAu * 149_597_870.7).toFixed(0)} km, fase ${phase.toFixed(1)}°`;
  });
  return `| ${id} | ${what} | — | ${lines.join(' · ')} | ${url} |`;
}

console.log('| Foto | Fuente | Fecha | Ángulo de fase | Cálculo |');
console.log('|---|---|---|---|---|');
for (const photo of EARTH_PHOTOS) console.log(earthPhoto(photo));
for (const photo of SPACECRAFT_PHOTOS) console.log(await spacecraftPhoto(photo));
