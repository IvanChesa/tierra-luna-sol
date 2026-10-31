// Mosaicos globales de las lunas (fase 7, tarea 1): GeoTIFF del USGS Astrogeology (y, Mimas, un IMG
// del PDS) en proyección cilíndrica simple, llevados a la convención de las texturas de la escena
// (equirrectangular, la longitud 0 en el centro creciendo hacia el este y el norte arriba).
// build-textures.mjs lo usa para las texturas de las lunas; sus sondas (accidentes con nombre del
// Gazetteer) comprueban después que el mapa no ha quedado girado ni reflejado.
//
// - Dónde empieza la longitud: la de su georreferencia, como el modelo de Mercurio
//   (build-relief.mjs): la longitud central de la proyección más la x del punto de anclaje, en
//   metros sobre el ecuador del radio de la georreferencia. Las columnas crecen hacia el este (las
//   coordenadas proyectadas de GDAL lo hacen siempre, aunque la etiqueta del producto use longitudes
//   positivas al oeste); si un mapa saliera reflejado, sus sondas lo dirían. En un IMG del PDS, la de
//   su etiqueta (`SAMPLE_PROJECTION_OFFSET` y `MAP_RESOLUTION`, con las muestras hacia el este).
// - Los huecos sin datos (valor 0; Voyager 2 solo vio el hemisferio sur de Tritón), con el gris medio
//   de lo que sí hay: se ven como una zona lisa, sin inventar relieve. La imagen y su máscara se
//   reducen por separado y se dividen: lo que hay no se mezcla con los huecos.
// - Sin cargar el mosaico entero en memoria (algunos pasan de 190 Mpx): lo reduce sharp.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { BODY_DATA } from '../src/app/data/body-data.ts';
import { tiffGeoInfo } from './build-relief.mjs';

/**
 * Lee un mosaico y lo deja a `width` × `width / 2` (RGB de 8 bits, sRGB), centrado en la longitud 0.
 * `band`: solo ese canal (Tritón: el naranja de un mosaico en falso color), en gris. Devuelve el
 * búfer, la fracción del mapa sin datos y un informe.
 */
export async function loadMosaic(url, width, { band } = {}) {
  const path = fileURLToPath(url);
  const source = path.toLowerCase().endsWith('.img')
    ? await pdsSource(path)
    : await geoTiffSource(path);
  if (Math.abs(source.width / source.height - 2) > 0.01) {
    throw new Error(`${path}: no es un mapa global de 2:1 (${source.width} × ${source.height})`);
  }
  if (Math.abs(source.spanDeg - 360) > 0.5) {
    throw new Error(`${path}: cubre ${source.spanDeg.toFixed(2)}° de longitud, no 360°`);
  }
  const { firstLonDeg } = source;
  const height = width / 2;
  const open = () => source.open().removeAlpha();
  const reduce = (pipeline) =>
    pipeline.resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  const [color, coverage] = await Promise.all([
    reduce(open().toColourspace('srgb')),
    // Un solo canal: sin toColourspace, sharp lo devuelve en sRGB, con tres.
    reduce(open().threshold(1).toColourspace('b-w')),
  ]);
  const pixels = width * height;
  // Un canal en gris, una vez reducido (sharp aplica `extractChannel` después de `toColourspace`: con
  // él, la imagen llegaba con un canal en lugar de tres).
  if (band !== undefined) {
    for (let i = 0; i < pixels; i++) {
      const value = color[i * 3 + band];
      color[i * 3] = color[i * 3 + 1] = color[i * 3 + 2] = value;
    }
  }
  // El gris medio de lo que hay, para los huecos.
  let sum = 0;
  let count = 0;
  let empty = 0;
  for (let i = 0; i < pixels; i++) {
    const w = coverage[i] / 255;
    if (w < 0.5) empty++;
    if (w > 0.8) {
      for (let c = 0; c < 3; c++) sum += color[i * 3 + c] / w;
      count += 3;
    }
  }
  const fill = count ? sum / count : 128;
  const out = Buffer.alloc(pixels * 3);
  // Columna del borde izquierdo: la de la longitud −180°.
  const shift = Math.round(((((-180 - firstLonDeg) % 360) + 360) % 360) / (360 / width)) % width;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + ((x + shift) % width);
      const o = (y * width + x) * 3;
      const w = coverage[i] / 255;
      for (let c = 0; c < 3; c++) {
        // Dentro de lo que hay, su color; en el borde de un hueco, se funde con el gris medio.
        const own = w > 0.02 ? color[i * 3 + c] / w : fill;
        out[o + c] = Math.round(Math.min(255, own * w + fill * (1 - w)));
      }
    }
  }
  const kind =
    band !== undefined
      ? `su canal ${band} en gris`
      : source.channels === 1
        ? 'en gris'
        : 'en color';
  return {
    data: out,
    width,
    height,
    emptyFraction: empty / pixels,
    report: `${source.width} × ${source.height}, ${kind}, el borde izquierdo en ${firstLonDeg.toFixed(2)}° E; sin datos, ${((100 * empty) / pixels).toFixed(1)} % (con el gris medio)`,
  };
}

/** Un GeoTIFF del USGS: la longitud de su primera columna, de su georreferencia. */
async function geoTiffSource(path) {
  const info = await tiffGeoInfo(path);
  if (!info.width || !info.height) throw new Error(`${path}: sin dimensiones`);
  const radiusM = info.semiMajorAxisM;
  const pixelScale = info.pixelScale?.[0];
  const tiepointX = info.tiepoint?.[3];
  if (!radiusM || !pixelScale || tiepointX === undefined) {
    throw new Error(`${path}: sin georreferencia (radio, escala o punto de anclaje)`);
  }
  const metersPerDegree = (2 * Math.PI * radiusM) / 360;
  const anchorLon = info.centerLonDeg + tiepointX / metersPerDegree;
  const open = () => sharp(path, { limitInputPixels: false });
  return {
    open,
    width: info.width,
    height: info.height,
    channels: (await open().metadata()).channels,
    firstLonDeg: info.pixelIsPoint ? anchorLon - (0.5 * pixelScale) / metersPerDegree : anchorLon,
    spanDeg: (info.width * pixelScale) / metersPerDegree,
  };
}

/**
 * Un IMG del PDS con su etiqueta PDS3 dentro (Mimas: COISS_3006): una banda de 8 bits en cilíndrica
 * simple. La longitud ESTE del borde izquierdo de la primera muestra, de `SAMPLE_PROJECTION_OFFSET`
 * (la muestra, contada desde 0, del meridiano central) y `MAP_RESOLUTION` (px/°), con las muestras
 * hacia el este (`SAMPLE_DISPLAY_DIRECTION = RIGHT`) aunque las longitudes del producto sean oeste.
 */
async function pdsSource(path) {
  const bytes = await readFile(path);
  const head = bytes.subarray(0, Math.min(bytes.length, 65_536)).toString('latin1');
  const end = head.search(/\r?\nEND\r?\n/);
  if (end < 0) throw new Error(`${path}: sin etiqueta PDS3`);
  const label = {};
  for (const line of head.slice(0, end).split(/\r?\n/)) {
    const match = /^\s*(\^?\w+)\s*=\s*"?([^"]*?)"?\s*(<[^>]*>)?\s*$/.exec(line);
    // Solo la primera aparición de cada clave (los objetos IMAGE y de la proyección no las repiten).
    if (match && !(match[1] in label)) label[match[1]] = match[2];
  }
  const number = (key) => {
    const value = Number(label[key]);
    if (!Number.isFinite(value)) throw new Error(`${path}: falta ${key} en la etiqueta`);
    return value;
  };
  const width = number('LINE_SAMPLES');
  const height = number('LINES');
  if (
    label.MAP_PROJECTION_TYPE !== 'SIMPLE CYLINDRICAL' ||
    number('SAMPLE_BITS') !== 8 ||
    number('BANDS') !== 1 ||
    label.SAMPLE_DISPLAY_DIRECTION !== 'RIGHT' ||
    label.LINE_DISPLAY_DIRECTION !== 'DOWN'
  ) {
    throw new Error(`${path}: se espera una banda de 8 bits en cilíndrica simple, norte arriba`);
  }
  const offset = (number('^IMAGE') - 1) * number('RECORD_BYTES');
  const pixels = bytes.subarray(offset, offset + width * height);
  if (pixels.length !== width * height) throw new Error(`${path}: imagen incompleta`);
  const resolution = number('MAP_RESOLUTION');
  const west = label.POSITIVE_LONGITUDE_DIRECTION === 'WEST';
  const centerEast = (west ? -1 : 1) * number('CENTER_LONGITUDE');
  return {
    open: () => sharp(pixels, { raw: { width, height, channels: 1 } }),
    width,
    height,
    channels: 1,
    firstLonDeg: centerEast - (number('SAMPLE_PROJECTION_OFFSET') + 0.5) / resolution,
    spanDeg: width / resolution,
  };
}

/**
 * Sondas de los mosaicos de las lunas (fase 7): rasgos con nombre del Gazetteer of Planetary
 * Nomenclature (IAU/USGS; su número de `Feature`), con su latitud y su longitud ESTE (el Gazetteer de
 * estas lunas da longitudes oeste; sus datos para SIG, en este: son los de aquí). De dos clases:
 * - De brillo (`radius` y `sign`): la media en un disco de `radius` grados, más clara (+1) u oscura
 *   (−1) que el anillo que lo rodea (de 2 a 3 radios): manchas, regiones y cráteres de rayos.
 * - De borde (`diameterKm`, el del Gazetteer): en los mosaicos dominados por el sombreado (las lunas
 *   heladas de Saturno, normalizadas en brillo), el gradiente del brillo en el borde de un cráter (de
 *   0,8 a 1,2 radios; el radio angular, de ese diámetro y del radio del catálogo) frente al de su
 *   interior (hasta 0,5) y al de fuera (de 1,6 a 2,2 radios).
 * Se comprueban en el mapa de 2048 px: con él girado 180° o reflejado, alguna tiene que fallar. Se
 * eligieron entre los rasgos del Gazetteer los que discriminan la orientación (informe de la fase 7):
 * en las lunas de Saturno, Herschel o un borde gastado como el de Odiseo no destacan entre tantos
 * cráteres. Fobos no lleva: es irregular (los radios angulares de sus cráteres no valen) y sus rasgos
 * se ven por el sombreado, no por su brillo; lo alinea su georreferencia.
 */
export const MOSAIC_PROBES = {
  io: [{ name: 'Loki Patera', lat: 12.97, lon: 51.2, radius: 3, sign: -1, feature: 3459 }],
  europa: [
    { name: 'Pwyll', lat: -25.2, lon: 88.6, radius: 3, sign: 1, feature: 4878 },
    { name: 'Thrace Macula', lat: -45.9, lon: -172.1, radius: 1.5, sign: -1, feature: 5984 },
  ],
  ganymede: [
    { name: 'Osiris', lat: -38.0, lon: -166.31, radius: 1, sign: 1, feature: 4509 },
    { name: 'Tros', lat: 11.14, lon: -27.26, radius: 1, sign: 1, feature: 6091 },
  ],
  callisto: [
    { name: 'Burr', lat: 42.7, lon: -134.5, radius: 0.8, sign: 1, feature: 927 },
    { name: 'Lofn', lat: -56.5, lon: -22.3, radius: 2, sign: 1, feature: 3451 },
  ],
  mimas: [
    { name: 'Gareth', lat: -43.06, lon: 72.22, diameterKm: 23, feature: 2106 },
    { name: 'Iseult', lat: -47.24, lon: -33.78, diameterKm: 21, feature: 2729 },
  ],
  enceladus: [
    { name: 'Bahman', lat: 14.703, lon: -61.3732, diameterKm: 10.564, feature: 14604 },
    { name: 'Parwez', lat: 22.9494, lon: -25.5583, diameterKm: 13.494, feature: 14615 },
    { name: 'Marjanah', lat: 38.2045, lon: 56.9907, diameterKm: 12.949, feature: 14235 },
  ],
  tethys: [
    { name: 'Oenops', lat: 28.13, lon: -93.44, diameterKm: 25.7, feature: 14427 },
    { name: 'Polyphemus', lat: -3.48, lon: 77.02, diameterKm: 73, feature: 4788 },
    { name: 'Philoetius', lat: 2.32, lon: 175.29, diameterKm: 28.3, feature: 14429 },
  ],
  dione: [
    { name: 'Catillus', lat: -2.38, lon: 84.7, diameterKm: 42.2, feature: 1079 },
    { name: 'Halys', lat: -59.17, lon: -53.72, diameterKm: 35.2, feature: 2335 },
    { name: 'Eumelus', lat: -0.1, lon: -65.96, diameterKm: 35.1, feature: 14352 },
  ],
  rhea: [
    { name: 'Pachacamac', lat: -23.4, lon: -83.7, diameterKm: 46.8, feature: 14683 },
    { name: 'Inmar', lat: -2.3, lon: 58.4, diameterKm: 54.8, feature: 14672 },
    { name: 'Pouliuli', lat: -16.9, lon: 75.6, diameterKm: 59.8, feature: 14685 },
  ],
  iapetus: [
    { name: 'Valdebron', lat: 29.6, lon: -104.4, diameterKm: 49, feature: 14489 },
    { name: 'Dapamort', lat: 36.6, lon: -84.9, diameterKm: 49, feature: 14462 },
  ],
  // Tritón, en su canal naranja: una mancha oscura y dos depresiones oscuras del hemisferio que vio
  // Voyager 2 (giradas o reflejadas caen en el hueco del norte o en terreno sin ellas).
  triton: [
    { name: 'Doro Macula', lat: -27.5, lon: 31.7, radius: 1.5, sign: -1, feature: 1583 },
    { name: 'Kasu Patera', lat: 39, lon: 14, radius: 3, sign: -1, feature: 2951 },
    { name: 'Ukupanio Cavus', lat: 35, lon: 23, radius: 3, sign: -1, feature: 6196 },
  ],
};

/** El cuerpo del catálogo de cada mosaico con sondas de borde (para su radio). */
const MOSAIC_BODIES = {
  mimas: 'mimas',
  enceladus: 'encelado',
  tethys: 'tetis',
  dione: 'dione',
  rhea: 'rea',
  iapetus: 'japeto',
};

/** Una sonda de borde pasa si el gradiente en el borde supera en este factor al de dentro y fuera. */
const RIM_RATIO = 1.15;

/** Radio de una sonda en grados de arco: el suyo o, en las de borde, el del cráter. */
function probeRadiusDeg(id, probe) {
  if (!probe.diameterKm) return probe.radius;
  const body = MOSAIC_BODIES[id];
  if (!body) throw new Error(`«${id}»: sin radio del catálogo para sus sondas de borde`);
  return (probe.diameterKm / 2 / BODY_DATA[body].physical.radiusKm.value) * (180 / Math.PI);
}

/**
 * Comprueba las sondas de un mosaico (RGB de 8 bits, equirrectangular con la longitud 0 en el centro)
 * y devuelve un informe; falla si alguna no pasa o si el mapa girado 180° o reflejado también las pasa
 * todas (las sondas no distinguirían la orientación).
 */
export function checkMosaicProbes(id, { data, width, height }) {
  const probes = MOSAIC_PROBES[id];
  if (!probes) return null;
  const luminance = new Float32Array(width * height);
  for (let i = 0; i < luminance.length; i++) {
    luminance[i] = 0.2126 * data[3 * i] + 0.7152 * data[3 * i + 1] + 0.0722 * data[3 * i + 2];
  }
  const at = (field, x, y) =>
    field[Math.min(Math.max(y, 0), height - 1) * width + (((x % width) + width) % width)];
  // El gradiente del brillo (Sobel), solo si alguna sonda es de borde: el este–oeste, por cos φ (en la
  // esfera, una columna mide menos lejos del ecuador).
  let gradient = null;
  if (probes.some((probe) => probe.diameterKm)) {
    gradient = new Float32Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      const cosLat = Math.max(Math.cos((90 - ((y + 0.5) * 180) / height) * (Math.PI / 180)), 0.15);
      for (let x = 0; x < width; x++) {
        const l = (dx, dy) => at(luminance, x + dx, y + dy);
        const gx = l(1, -1) + 2 * l(1, 0) + l(1, 1) - l(-1, -1) - 2 * l(-1, 0) - l(-1, 1);
        const gy = l(-1, 1) + 2 * l(0, 1) + l(1, 1) - l(-1, -1) - 2 * l(0, -1) - l(1, -1);
        gradient[y * width + x] = Math.hypot(gx * cosLat, gy);
      }
    }
  }
  const pxPerDeg = width / 360;
  // Media de un campo en una corona de `r0` a `r1` grados de arco (en la esfera: el radio en
  // longitud crece con 1/cos φ).
  const annulus = (field, lat, lon, r0, r1) => {
    const cx = (lon + 180) * pxPerDeg;
    const cy = (90 - lat) * pxPerDeg;
    const stretch = 1 / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const reach = Math.ceil(r1 * pxPerDeg);
    let sum = 0;
    let count = 0;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -Math.ceil(reach * stretch); dx <= Math.ceil(reach * stretch); dx++) {
        const d = Math.hypot(dx / stretch, dy) / pxPerDeg;
        if (d < r0 || d > r1) continue;
        sum += at(field, Math.round(cx + dx), Math.round(cy + dy));
        count++;
      }
    }
    return sum / count;
  };
  const measure = (probe, transform) => {
    const [lat, lon] = transform(probe.lat, probe.lon);
    const r = probeRadiusDeg(id, probe);
    if (probe.diameterKm && gradient) {
      const rim = annulus(gradient, lat, lon, 0.8 * r, 1.2 * r);
      const inside = annulus(gradient, lat, lon, 0, 0.5 * r);
      const outside = annulus(gradient, lat, lon, 1.6 * r, 2.2 * r);
      const ratio = rim / Math.max(inside, outside, 1e-6);
      return { ratio, ok: ratio >= RIM_RATIO };
    }
    const ratio =
      annulus(luminance, lat, lon, 0, r) /
      Math.max(annulus(luminance, lat, lon, 2 * r, 3 * r), 1e-6);
    return { ratio, ok: probe.sign > 0 ? ratio > 1.08 : ratio < 0.92 };
  };
  const passes = (transform) => probes.map((probe) => ({ probe, ...measure(probe, transform) }));
  const straight = passes((lat, lon) => [lat, lon]);
  const rotated = passes((lat, lon) => [lat, lon + 180 > 180 ? lon - 180 : lon + 180]);
  const mirrored = passes((lat, lon) => [lat, -lon]);
  const show = (results) => results.map((r) => `${r.probe.name} ${r.ratio.toFixed(2)}`).join(', ');
  if (!straight.every((r) => r.ok)) {
    throw new Error(`El mosaico de «${id}» no pasa sus sondas: ${show(straight)}`);
  }
  for (const [label, results] of [
    ['girado 180°', rotated],
    ['reflejado', mirrored],
  ]) {
    if (results.every((r) => r.ok)) {
      throw new Error(`Las sondas de «${id}» no distinguen el mapa ${label}: ${show(results)}`);
    }
  }
  return `${id}: sondas (brillo: disco / anillo; borde: borde / resto) ${show(straight)}; girado 180°, ${show(rotated)}; reflejado, ${show(mirrored)}`;
}

// Solo: un mosaico a 2048 px en PNG, con sus sondas (un círculo en cada una), para verlo.
//   node scripts/usgs-mosaic.mjs <id> <fichero del mosaico> <carpeta de salida> [canal]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, file, out, band] = process.argv.slice(2);
  if (!id || !file || !out) {
    throw new Error('Uso: node scripts/usgs-mosaic.mjs <id> <fichero> <carpeta de salida> [canal]');
  }
  const mosaic = await loadMosaic(pathToFileURL(file), 2048, {
    band: band === undefined ? undefined : Number(band),
  });
  console.log(mosaic.report);
  try {
    console.log(checkMosaicProbes(id, mosaic) ?? '(sin sondas)');
  } catch (error) {
    // La vista previa se escribe igual: sirve para ver por qué falla.
    console.log(String(error));
    process.exitCode = 1;
  }
  const marks = (MOSAIC_PROBES[id] ?? [])
    .map((probe) => {
      const pxPerDeg = mosaic.width / 360;
      const cx = (probe.lon + 180) * pxPerDeg;
      const cy = (90 - probe.lat) * pxPerDeg;
      const r = Math.max(probeRadiusDeg(id, probe) * pxPerDeg, 4);
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="red" stroke-width="2"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${mosaic.width}" height="${mosaic.height}">${marks}</svg>`;
  await sharp(mosaic.data, { raw: { width: mosaic.width, height: mosaic.height, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(join(out, `${id}.png`));
}
