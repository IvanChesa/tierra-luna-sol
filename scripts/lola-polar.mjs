// Los casquetes polares de la Luna (revisión de la fase 6, hallazgo 1). Junto a un polo, la elevación
// equirrectangular del LOLA de 16 px/° salta cientos de metros entre columnas vecinas separadas unos
// metros (la fila del polo es un círculo diminuto), y su relieve salía como un «sol de rayas». Aquí,
// los modelos polares del propio LOLA (PDS: estereográfica polar de 75° al polo, 240 m por píxel) se
// llevan a un atlas de normales con los dos casquetes, en la proyección que usa el shader de la Luna:
// - la mitad izquierda, el sur: r = tan(π/4 + φ/2) / T, x = r·sen λ, y = r·cos λ;
// - la derecha, el norte: r = tan(π/4 − φ/2) / T, x = r·sen λ, y = −r·cos λ;
// con T = tan(7,5°) (r = 1 a 75° de latitud), u = 0,25 + 0,25·x (0,75 + 0,25·x en el norte) y
// v = 0,5 + 0,5·y. Las normales se guardan en los ejes x e y del plano, que no degeneran en el polo
// (el este y el norte, sí), y el shader las lleva al este–norte (`planeToEastNorth`) por encima de 76°.
// build-textures.mjs lo usa para generar «moon-normal-poles»; también se puede ejecutar solo:
//   node scripts/lola-polar.mjs <carpeta de salida>   (PNG de prueba, sombreado y comprobaciones)
import { mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { DEMS, loadElevation, normalMap } from './build-relief.mjs';

const ROOT = new URL('../', import.meta.url);
const ELEVATION = new URL('assets-src/elevation/', ROOT);
const DEG = Math.PI / 180;

/** Latitud del borde de los casquetes (la de los modelos polares) y la tangente que normaliza r. */
export const POLAR_EDGE_DEG = 75;
export const POLAR_T = Math.tan(((90 - POLAR_EDGE_DEG) / 2) * DEG);

/**
 * Centro de Shackleton (Gazetteer of Planetary Nomenclature, IAU/USGS, Feature/5450): 89,67° S,
 * 129,78° E y 20,92 km de diámetro. Un hoyo de unos 4 km de hondo junto al polo sur.
 */
const SHACKLETON = { latDeg: -89.67, lonDeg: 129.78, radiusKm: 10.46 };

/** Los dos modelos polares: el sur (mitad izquierda del atlas) y el norte (mitad derecha). */
const POLES = [
  { name: 'sur', south: true, file: 'ldem_75s_240m.img', label: 'ldem_75s_240m.lbl' },
  { name: 'norte', south: false, file: 'ldem_75n_240m.img', label: 'ldem_75n_240m.lbl' },
];

/** Lee un modelo polar del LOLA con su etiqueta PDS (enteros de 16 bits LSB, en medios metros). */
async function readPolarDem({ file, label, south }) {
  const text = await readFile(new URL(label, ELEVATION), 'latin1');
  const value = (key) => {
    const match = text.match(new RegExp(`^\\s*${key}\\s*=\\s*"?(-?[\\d.]+)`, 'm'));
    if (!match) throw new Error(`La etiqueta ${label} no tiene ${key}`);
    return Number(match[1]);
  };
  const lines = value('LINES');
  const samples = value('LINE_SAMPLES');
  if (value('CENTER_LATITUDE') !== (south ? -90 : 90) || value('SAMPLE_BITS') !== 16) {
    throw new Error(`${label}: no es un modelo de 16 bits del polo ${south ? 'sur' : 'norte'}`);
  }
  if (!/SAMPLE_TYPE\s*=\s*LSB_INTEGER/.test(text)) throw new Error(`${label}: no es LSB_INTEGER`);
  const bytes = await readFile(new URL(file, ELEVATION));
  if (bytes.length !== lines * samples * 2) throw new Error(`${file}: tamaño inesperado`);
  const scaling = value('SCALING_FACTOR');
  const data = new Float32Array(lines * samples);
  for (let i = 0; i < data.length; i++) data[i] = bytes.readInt16LE(2 * i) * scaling;
  return {
    data,
    lines,
    samples,
    scale: value('MAP_SCALE'),
    lineOffset: value('LINE_PROJECTION_OFFSET'),
    sampleOffset: value('SAMPLE_PROJECTION_OFFSET'),
    radiusM: value('A_AXIS_RADIUS') * 1000,
  };
}

/**
 * Elevación (m) de un modelo polar en una latitud y longitud (radianes), bilineal. `sx` y `sy`: los
 * signos de su estereográfica (x = sx·ρ·sen λ, y = sy·ρ·cos λ; las líneas crecen hacia abajo y el
 * polo está en (offset, offset), contando desde 0 por el centro del primer píxel), que se eligen
 * comparando con la elevación equirrectangular (`chooseConvention`).
 */
function polarElevation(dem, convention, lat, lon) {
  const rho = 2 * dem.radiusM * Math.tan((Math.PI / 2 - Math.abs(lat)) / 2);
  const sample = dem.sampleOffset + (convention.sx * rho * Math.sin(lon)) / dem.scale;
  const line = dem.lineOffset - (convention.sy * rho * Math.cos(lon)) / dem.scale;
  const s0 = Math.min(Math.max(Math.floor(sample), 0), dem.samples - 2);
  const l0 = Math.min(Math.max(Math.floor(line), 0), dem.lines - 2);
  const fs = Math.min(Math.max(sample - s0, 0), 1);
  const fl = Math.min(Math.max(line - l0, 0), 1);
  const at = (l, s) => dem.data[l * dem.samples + s];
  return (
    (1 - fl) * ((1 - fs) * at(l0, s0) + fs * at(l0, s0 + 1)) +
    fl * ((1 - fs) * at(l0 + 1, s0) + fs * at(l0 + 1, s0 + 1))
  );
}

/** Correlación de Pearson de dos listas. */
function correlation(a, b) {
  const n = a.length;
  const ma = a.reduce((s, x) => s + x, 0) / n;
  const mb = b.reduce((s, x) => s + x, 0) / n;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    ab += (a[i] - ma) * (b[i] - mb);
    aa += (a[i] - ma) ** 2;
    bb += (b[i] - mb) ** 2;
  }
  return ab / Math.sqrt(aa * bb);
}

/** Píxel de un mapa equirrectangular (longitud 0 en el centro, norte arriba) en lat/lon (grados). */
function equirectIndex(width, latDeg, lonDeg) {
  const height = width / 2;
  const x = Math.floor((((((lonDeg + 180) % 360) + 360) % 360) / 360) * width) % width;
  const y = Math.min(height - 1, Math.max(0, Math.floor(((90 - latDeg) / 180) * height)));
  return y * width + x;
}

/** Puntos (grados) del anillo de 76° a 79° de un casquete, donde valen los dos modelos. */
function ringPoints(south, lonStepDeg) {
  const points = [];
  for (let latAbs = 76.25; latAbs <= 78.75; latAbs += 0.25) {
    for (let lon = -180; lon < 180; lon += lonStepDeg) points.push([south ? -latAbs : latAbs, lon]);
  }
  return points;
}

/**
 * La convención de la estereográfica del modelo polar: de las cuatro de signos, la que da la misma
 * elevación que el modelo equirrectangular del LOLA en el anillo de 76° a 79°. Falla si no destaca.
 */
function chooseConvention(dem, south, equirect, width) {
  const points = ringPoints(south, 1);
  const reference = points.map(([lat, lon]) => equirect[equirectIndex(width, lat, lon)]);
  const options = [
    { sx: 1, sy: 1 },
    { sx: 1, sy: -1 },
    { sx: -1, sy: 1 },
    { sx: -1, sy: -1 },
  ].map((convention) => ({
    convention,
    r: correlation(
      reference,
      points.map(([lat, lon]) => polarElevation(dem, convention, lat * DEG, lon * DEG)),
    ),
  }));
  options.sort((a, b) => b.r - a.r);
  const [best, second] = options;
  if (!(best.r > 0.9 && best.r - second.r > 0.3)) {
    throw new Error(
      `No se reconoce la proyección del modelo polar (${options.map((o) => o.r.toFixed(2)).join(', ')})`,
    );
  }
  return best;
}

/** Del plano de un casquete (x, y en [−1, 1]) a la latitud y la longitud (radianes). */
function planeToLatLon(x, y, south) {
  const colatitude = 2 * Math.atan(Math.hypot(x, y) * POLAR_T);
  return south
    ? { lat: colatitude - Math.PI / 2, lon: Math.atan2(x, y) }
    : { lat: Math.PI / 2 - colatitude, lon: Math.atan2(x, -y) };
}

/** De la latitud y la longitud (radianes) al plano de su casquete (x, y), como el shader. */
export function latLonToPlane(lat, lon, south) {
  const r = Math.tan((Math.PI / 2 - Math.abs(lat)) / 2) / POLAR_T;
  return south
    ? { x: r * Math.sin(lon), y: r * Math.cos(lon) }
    : { x: r * Math.sin(lon), y: -r * Math.cos(lon) };
}

/**
 * Las componentes este y norte de un vector del plano de un casquete (tx, ty) en el punto (x, y), como
 * el shader: en el sur, el este es (y, −x) / r y el norte, (x, y) / r; en el norte, los dos al revés.
 */
export function planeToEastNorth(x, y, south, tx, ty) {
  const r = Math.max(Math.hypot(x, y), 1e-9);
  const s = south ? 1 : -1;
  return [(s * (tx * y - ty * x)) / r, (s * (tx * x + ty * y)) / r];
}

/** La normal (−1…1) del texel del atlas más cercano a (x, y) de un casquete. */
function atlasNormal(atlas, n, half, x, y) {
  const i = Math.min(n - 1, Math.max(0, Math.floor(((x + 1) / 2) * n)));
  const j = Math.min(n - 1, Math.max(0, Math.floor(((1 - y) / 2) * n)));
  const o = (j * 2 * n + half * n + i) * 3;
  return [atlas[o] / 127.5 - 1, atlas[o + 1] / 127.5 - 1, atlas[o + 2] / 127.5 - 1];
}

/**
 * Atlas de normales de los dos casquetes: 2n × n px, RGB con los ejes x, y del plano y el «arriba» en
 * [0, 255]. Cada píxel promedia k × k muestras bilineales del modelo polar (k, las que hacen falta
 * para cubrir sus píxeles de 240 m: sin aliasing al reducir). Las pendientes, con diferencias
 * centradas en el plano, pasadas a metros del suelo con el factor de escala de la estereográfica
 * (cos² de media colatitud; es conforme: igual en todas direcciones). Fuera del círculo de 75°, llano.
 */
export async function buildPolarNormalAtlas(n) {
  const equirectWidth = 5760;
  const moon = DEMS.moon;
  const equirect = await loadElevation('moon', equirectWidth);
  const equirectNormals = normalMap(
    equirect,
    equirectWidth,
    equirectWidth / 2,
    moon.radiusM,
    moon.exaggeration,
    moon.minCosLat,
  );
  const atlas = Buffer.alloc(2 * n * n * 3);
  const reports = [];
  for (const [half, pole] of POLES.entries()) {
    const dem = await readPolarDem(pole);
    const { convention, r } = chooseConvention(dem, pole.south, equirect, equirectWidth);
    const elevationAt = (lat, lon) => polarElevation(dem, convention, lat, lon);
    const pixelMeters = (4 * dem.radiusM * POLAR_T) / n;
    const k = Math.max(2, Math.ceil(pixelMeters / dem.scale));
    const h = new Float32Array(n * n);
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        let sum = 0;
        for (let sj = 0; sj < k; sj++) {
          for (let si = 0; si < k; si++) {
            const x = ((i + (si + 0.5) / k) / n) * 2 - 1;
            const y = 1 - ((j + (sj + 0.5) / k) / n) * 2;
            const { lat, lon } = planeToLatLon(x, y, pole.south);
            sum += elevationAt(lat, lon);
          }
        }
        h[j * n + i] = sum / (k * k);
      }
    }
    for (let j = 0; j < n; j++) {
      for (let i = 0; i < n; i++) {
        const x = ((i + 0.5) / n) * 2 - 1;
        const y = 1 - ((j + 0.5) / n) * 2;
        const o = (j * 2 * n + half * n + i) * 3;
        const rr = Math.hypot(x, y);
        if (rr > 1.02) {
          atlas[o] = 128;
          atlas[o + 1] = 128;
          atlas[o + 2] = 255;
          continue;
        }
        const ground = 1 / (1 + (rr * POLAR_T) ** 2);
        const left = h[j * n + Math.max(i - 1, 0)];
        const right = h[j * n + Math.min(i + 1, n - 1)];
        const up = h[Math.max(j - 1, 0) * n + i];
        const down = h[Math.min(j + 1, n - 1) * n + i];
        let nx = (-moon.exaggeration * (right - left)) / (2 * pixelMeters * ground);
        let ny = (-moon.exaggeration * (up - down)) / (2 * pixelMeters * ground);
        let nz = 1;
        const length = Math.hypot(nx, ny, nz);
        nx /= length;
        ny /= length;
        nz /= length;
        atlas[o] = Math.round((nx * 0.5 + 0.5) * 255);
        atlas[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        atlas[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      }
    }
    const agreement = checkAgreement(atlas, n, half, pole.south, equirectNormals, equirectWidth);
    reports.push(
      `casquete ${pole.name}: estereográfica con x = ${convention.sx > 0 ? '' : '−'}ρ·sen λ e y = ${convention.sy > 0 ? '' : '−'}ρ·cos λ (su elevación correlaciona ${r.toFixed(3)} con la equirrectangular a 76–79°), ${k} × ${k} muestras por píxel; ${agreement}`,
    );
    if (pole.south) reports.push(checkShackleton(elevationAt, atlas, n, half));
  }
  return { normals: atlas, report: `moon-normal-poles (${2 * n}×${n}): ${reports.join('; ')}` };
}

/**
 * Las normales del atlas, llevadas al este–norte como en el shader, frente a las del mapa
 * equirrectangular en el anillo de 76° a 79° (donde el shader las mezcla): las dos componentes tienen
 * que correlacionar. Con un eje o un signo cambiado, saldrían al revés. Falla si no.
 */
function checkAgreement(atlas, n, half, south, equirectNormals, width) {
  const east = [[], []];
  const north = [[], []];
  for (const [latDeg, lonDeg] of ringPoints(south, 0.5)) {
    const { x, y } = latLonToPlane(latDeg * DEG, lonDeg * DEG, south);
    const [tx, ty] = atlasNormal(atlas, n, half, x, y);
    const [e, nn] = planeToEastNorth(x, y, south, tx, ty);
    const o = equirectIndex(width, latDeg, lonDeg) * 3;
    east[0].push(e);
    east[1].push(equirectNormals[o] / 127.5 - 1);
    north[0].push(nn);
    north[1].push(equirectNormals[o + 1] / 127.5 - 1);
  }
  const rEast = correlation(east[0], east[1]);
  const rNorth = correlation(north[0], north[1]);
  if (!(rEast > 0.7 && rNorth > 0.7)) {
    throw new Error(
      `Las normales del casquete ${south ? 'sur' : 'norte'} no casan con las equirrectangulares a 76–79° (este ${rEast.toFixed(2)}, norte ${rNorth.toFixed(2)})`,
    );
  }
  return `sus normales, en el este–norte del shader, correlacionan con las equirrectangulares a 76–79° (este ${rEast.toFixed(2)}, norte ${rNorth.toFixed(2)})`;
}

/**
 * Shackleton, en el polo sur: su centro, más de 1 km por debajo de su borde, y sus paredes interiores,
 * inclinadas hacia el centro en el atlas (lo que se pinta). Falla si no.
 */
function checkShackleton(elevationAt, atlas, n, half) {
  const center = { lat: SHACKLETON.latDeg * DEG, lon: SHACKLETON.lonDeg * DEG };
  const radiusDeg = SHACKLETON.radiusKm / ((DEMS.moon.radiusM / 1000) * DEG);
  // Puntos a una distancia angular dada del centro, en 24 rumbos.
  const ring = (distanceDeg) =>
    Array.from({ length: 24 }, (_, step) => {
      const bearing = (step / 24) * 2 * Math.PI;
      const d = distanceDeg * DEG;
      const lat = Math.asin(
        Math.sin(center.lat) * Math.cos(d) + Math.cos(center.lat) * Math.sin(d) * Math.cos(bearing),
      );
      const lon =
        center.lon +
        Math.atan2(
          Math.sin(bearing) * Math.sin(d) * Math.cos(center.lat),
          Math.cos(d) - Math.sin(center.lat) * Math.sin(lat),
        );
      return { lat, lon };
    });
  const bottom = elevationAt(center.lat, center.lon);
  const rim = ring(radiusDeg).map((p) => elevationAt(p.lat, p.lon));
  const rimMean = rim.reduce((s, v) => s + v, 0) / rim.length;
  // Las paredes, a media distancia: la normal, hacia el centro (en el plano, que es conforme, la
  // dirección del punto al centro).
  const c = latLonToPlane(center.lat, center.lon, true);
  let inward = 0;
  for (const p of ring(radiusDeg / 2)) {
    const { x, y } = latLonToPlane(p.lat, p.lon, true);
    const [tx, ty] = atlasNormal(atlas, n, half, x, y);
    const dx = c.x - x;
    const dy = c.y - y;
    inward += (tx * dx + ty * dy) / Math.hypot(dx, dy);
  }
  inward /= 24;
  if (!(rimMean - bottom > 1000 && inward > 0.1)) {
    throw new Error(
      `Shackleton no sale como un hoyo en el casquete sur (fondo ${bottom.toFixed(0)} m, borde ${rimMean.toFixed(0)} m, paredes hacia dentro ${inward.toFixed(3)})`,
    );
  }
  return `Shackleton: fondo a ${bottom.toFixed(0)} m y borde a ${rimMean.toFixed(0)} m de media, y sus paredes se inclinan hacia el centro (componente horizontal media de su normal: ${inward.toFixed(2)})`;
}

// Solo: el atlas de 2048 × 1024 en PNG y un sombreado con luz rasante (el Sol a 3°, desde arriba a la
// izquierda del plano), para verlo.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2];
  if (!out) throw new Error('Uso: node scripts/lola-polar.mjs <carpeta de salida>');
  await mkdir(out, { recursive: true });
  const n = 1024;
  const { normals, report } = await buildPolarNormalAtlas(n);
  console.log(report);
  await sharp(normals, { raw: { width: 2 * n, height: n, channels: 3 } })
    .png()
    .toFile(join(out, 'moon-normal-poles.png'));
  const elevation = 3 * DEG;
  const sun = [
    -Math.cos(elevation) * Math.SQRT1_2,
    Math.cos(elevation) * Math.SQRT1_2,
    Math.sin(elevation),
  ];
  const shade = Buffer.alloc(2 * n * n);
  for (let p = 0; p < shade.length; p++) {
    const v = [0, 1, 2].map((c) => normals[3 * p + c] / 127.5 - 1);
    const light = (v[0] * sun[0] + v[1] * sun[1] + v[2] * sun[2]) * 6;
    shade[p] = Math.round(255 * Math.min(Math.max(light, 0), 1));
  }
  await sharp(shade, { raw: { width: 2 * n, height: n, channels: 1 } })
    .png()
    .toFile(join(out, 'moon-poles-shade.png'));
}
