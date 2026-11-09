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
// - Los huecos sin datos (valor 0; Voyager 2 solo vio el hemisferio sur de Tritón), con un gris liso,
//   sin inventar relieve. La imagen y su máscara se reducen por separado y se dividen: lo que hay no
//   se mezcla con los huecos. Sin corte duro en el borde (revisión del bloque D, D2): el gris es el de
//   la franja vecina al hueco (no la media de toda la luna) y, junto al borde, el de lo que hay al otro
//   lado (una media local), que se funde con él a lo largo de unos grados; lo que hay se funde con ese
//   gris en el último grado y medio.
// - Sin cargar el mosaico entero en memoria (algunos pasan de 190 Mpx): lo reduce sharp.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { BODY_DATA } from '../src/app/data/body-data.ts';
import { tiffGeoInfo } from './build-relief.mjs';

/**
 * Lee un mosaico y lo deja a `width` × `width / 2` (RGB de 8 bits, sRGB), centrado en la longitud 0.
 * `band`: solo ese canal (Tritón: el naranja de un mosaico en falso color), en gris. `plain`: un TIFF
 * sin georreferencia (los mapas del JPL de la fase 9b), con la longitud ESTE de su borde izquierdo
 * (`leftEdgeEastDeg`) y el sentido de sus columnas (`eastward`); sus sondas lo comprueban. Con
 * `plain.background` (el de Deimos, una carta aerografiada sobre un fondo claro), lo que a gran escala
 * (desenfocado `blurPx` píxeles del mapa reducido) es más claro que `above` es el fondo de la carta, lo
 * no cartografiado: cuenta como sin datos. Con `zerosAreGaps` (el radar de Magellan, fase 9b), todo 0
 * es un hueco: en un radar no hay sombras de cráteres a 0 que conservar (`restoreShadowSpecks`), y las
 * franjas de las órbitas que faltan son rayas finas a 0. Con `maskAtSource` (las lunas, desde la entrega
 * 10.a, D48), la máscara de lo que hay se umbraliza en el original y después se reduce, como con
 * `zerosAreGaps`, pero conservando las sombras a 0 (`restoreShadowSpecks`): un píxel del borde de un hueco
 * cuenta por lo que tiene de dato, y su color, por el de ese dato (sin oscurecerse con el hueco). Devuelve
 * el búfer, su cobertura (de 0 a 1 por píxel: las sondas solo miden lo que hay), la fracción del mapa sin
 * datos y un informe.
 */
export async function loadMosaic(
  url,
  width,
  { band, plain, zerosAreGaps = false, maskAtSource = false } = {},
) {
  const path = fileURLToPath(url);
  const source = plain
    ? await plainSource(path, plain)
    : path.toLowerCase().endsWith('.img')
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
  const [color, coverage, light] = await Promise.all([
    reduce(open().toColourspace('srgb')),
    // Un solo canal: sin toColourspace, sharp lo devuelve en sRGB, con tres. sharp umbraliza después de
    // reducir: así, la máscara sale binaria y un píxel mezclado con un hueco cuenta como dato entero.
    // Con huecos grandes (las lunas) lo tapa el fundido del borde; con las rayas finas del radar (unos
    // 25 px del original, 3 o 5 del mapa reducido), no: se veían como líneas oscuras. Con
    // `zerosAreGaps` (y `maskAtSource`), la máscara se umbraliza en el original y después se reduce,
    // como la imagen.
    zerosAreGaps || maskAtSource
      ? fullResolutionMask(open(), source).then(reduce)
      : reduce(open().threshold(1).toColourspace('b-w')),
    // El fondo de una carta aerografiada (sharp desenfoca después de reducir).
    plain?.background ? reduce(open().toColourspace('b-w').blur(plain.background.blurPx)) : null,
  ]);
  const pixels = width * height;
  let background = 0;
  if (light) {
    for (let i = 0; i < pixels; i++) {
      if (light[i] > plain.background.above && coverage[i]) {
        coverage[i] = 0;
        background++;
      }
    }
  }
  // Un canal en gris, una vez reducido (sharp aplica `extractChannel` después de `toColourspace`: con
  // él, la imagen llegaba con un canal en lugar de tres).
  if (band !== undefined) {
    for (let i = 0; i < pixels; i++) {
      const value = color[i * 3 + band];
      color[i * 3] = color[i * 3 + 1] = color[i * 3 + 2] = value;
    }
  }
  const shadows = zerosAreGaps
    ? { count: 0, pixels: 0 }
    : restoreShadowSpecks(color, coverage, width, height);
  const { data: out, empty, fill, mean } = fillGaps(color, coverage, width, height);
  // Columna del borde izquierdo: la de la longitud −180°.
  const shift = Math.round(((((-180 - firstLonDeg) % 360) + 360) % 360) / (360 / width)) % width;
  const shifted = Buffer.alloc(pixels * 3);
  const shiftedCoverage = new Float32Array(pixels);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + ((x + shift) % width);
      out.copy(shifted, (y * width + x) * 3, i * 3, i * 3 + 3);
      shiftedCoverage[y * width + x] = coverage[i] / 255;
    }
  }
  const kind =
    band !== undefined
      ? `su canal ${band} en gris`
      : source.channels === 1
        ? 'en gris'
        : 'en color';
  const show = (rgb) => rgb.map((v) => v.toFixed(0)).join('/');
  const gaps = empty
    ? `sin datos, ${((100 * empty) / pixels).toFixed(1)} % (con el gris de la franja vecina, ${show(fill)}, frente a la media de lo que hay, ${show(mean)}, y su borde difuminado)`
    : 'sin datos, 0,0 %';
  const specks = shadows.count
    ? `; ${shadows.count} motas a 0 dentro de sombras (${shadows.pixels} px), tomadas por sombra y no por hueco`
    : '';
  return {
    data: shifted,
    coverage: shiftedCoverage,
    width,
    height,
    emptyFraction: empty / pixels,
    report: `${source.width} × ${source.height}, ${kind}, el borde izquierdo en ${firstLonDeg.toFixed(2)}° E; ${gaps}${specks}${background ? `; de ello, el fondo claro de la carta (lo no cartografiado), el ${((100 * background) / pixels).toFixed(1)} % del mapa` : ''}`,
  };
}

/**
 * La máscara de lo que hay (255) y de los huecos (0) de un mosaico, a su resolución, como una imagen de
 * sharp que se puede reducir después (`zerosAreGaps`).
 */
async function fullResolutionMask(pipeline, source) {
  const mask = await pipeline.toColourspace('b-w').threshold(1).raw().toBuffer();
  // Un canal también al reducirla (sin `toColourspace`, sharp la devuelve en sRGB, con tres).
  return sharp(mask, {
    raw: { width: source.width, height: source.height, channels: 1 },
    limitInputPixels: false,
  }).toColourspace('b-w');
}

/**
 * Las motas «sin datos» que son sombras (fase 9b, D45): en un mosaico de 8 bits, lo más hondo de la
 * sombra de un cráter vale 0 (saturado por abajo), como lo que no tiene datos. Una mota sin datos
 * pequeña (como mucho `maxPixels` en el mapa reducido) que toca algo casi negro (el píxel más oscuro de
 * lo que hay a 1–2 píxeles de ella, como mucho `maxRingMin`, de 0 a 255) es el núcleo de una sombra:
 * cuenta como dato y conserva su valor (negro). La media del anillo no vale: a 2 km, en Encélado y en
 * Dione ya es la del terreno, y su mínimo, casi siempre negro (de 0 a 10 en 1033 de sus 1338 motas y en
 * 1410 de 1914). Sin esto, en Fobos se recreaban sombras de cráteres como terreno gris, y en las lunas
 * de Saturno, miles de motas (D45: lo real no se toca).
 */
export const SHADOW_SPECKS = { maxPixels: 400, maxRingMin: 20 };

/**
 * Marca como dato (cobertura 255) las motas de `coverage` (de 0 a 255; < 128, sin datos) que son
 * sombras, según `SHADOW_SPECKS`. `color`: el mapa reducido (RGB de 8 bits, con los huecos a 0).
 * Devuelve cuántas motas y píxeles.
 */
export function restoreShadowSpecks(color, coverage, width, height) {
  const pixels = width * height;
  const label = new Int32Array(pixels).fill(-1);
  const luminance = (i) => {
    const w = coverage[i] / 255;
    const v = 0.2126 * color[3 * i] + 0.7152 * color[3 * i + 1] + 0.0722 * color[3 * i + 2];
    return w > 0.02 ? v / w : 0;
  };
  const neighbors = (i, visit) => {
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      const yy = y + dy;
      if (yy < 0 || yy >= height) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (dx || dy) visit(yy * width + ((x + dx + width) % width));
      }
    }
  };
  let count = 0;
  let restored = 0;
  for (let start = 0; start < pixels; start++) {
    if (coverage[start] >= 128 || label[start] !== -1) continue;
    // La mota (8-conexa), sin pasar de `maxPixels` + 1.
    const speck = [start];
    label[start] = start;
    for (let n = 0; n < speck.length && speck.length <= SHADOW_SPECKS.maxPixels; n++) {
      neighbors(speck[n], (j) => {
        if (coverage[j] < 128 && label[j] === -1) {
          label[j] = start;
          speck.push(j);
        }
      });
    }
    if (speck.length > SHADOW_SPECKS.maxPixels) {
      // Un hueco grande: se marca entero para no volver a recorrerlo.
      for (let n = 0; n < speck.length; n++) {
        neighbors(speck[n], (j) => {
          if (coverage[j] < 128 && label[j] === -1) {
            label[j] = start;
            speck.push(j);
          }
        });
      }
      continue;
    }
    // Lo que hay alrededor, a 1–2 píxeles.
    const ring = new Set();
    for (const i of speck) neighbors(i, (j) => coverage[j] >= 128 && ring.add(j));
    for (const i of [...ring]) neighbors(i, (j) => coverage[j] >= 128 && ring.add(j));
    let darkest = Infinity;
    for (const j of ring) darkest = Math.min(darkest, luminance(j));
    if (darkest > SHADOW_SPECKS.maxRingMin) continue;
    for (const i of speck) coverage[i] = 255;
    count++;
    restored += speck.length;
  }
  return { count, pixels: restored };
}

/**
 * Anchos del relleno de los huecos (revisión del bloque D, D2), en grados del mapa: la franja vecina
 * (de donde sale su gris), el alcance de la media local que lo continúa dentro del hueco y el fundido
 * de lo que hay con ese gris junto al borde.
 */
export const GAP_FILL_DEG = { strip: 10, local: 5, feather: 1.5 };

/**
 * Rellena los huecos de un mosaico reducido (RGB de 8 bits; `coverage`, su máscara reducida, de 0 a
 * 255) sin corte duro. Cada píxel con datos vale su color (dividido por su cobertura: la imagen y la
 * máscara se reducen por separado); en el hueco:
 * - lejos del borde, el gris medio de la franja vecina, lo que hay a menos de `strip` grados del hueco
 *   (no la media de toda la luna: en Tritón, junto al hueco, el mosaico es más oscuro que su media);
 * - junto al borde, la media local de lo que hay al otro lado (convolución normalizada, de unos
 *   `local` grados), que se funde con ese gris hacia dentro del hueco;
 * y lo que hay se funde con el relleno en sus últimos `feather` grados, para que el detalle no se corte
 * en seco. Las distancias, en píxeles del mapa equirrectangular (en longitud, con la vuelta del
 * antimeridiano). Devuelve el mapa, cuántos píxeles no tenían datos, el gris de la franja y la media de
 * lo que hay (para el informe).
 */
export function fillGaps(color, coverage, width, height) {
  const pixels = width * height;
  const pxPerDeg = width / 360;
  const cover = new Float32Array(pixels);
  let empty = 0;
  for (let i = 0; i < pixels; i++) {
    cover[i] = coverage[i] / 255;
    if (cover[i] < 0.5) empty++;
  }
  // El color de lo que hay (sin la mezcla con los huecos de la reducción) y premultiplicado.
  const own = new Float32Array(pixels * 3);
  const premultiplied = new Float32Array(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const w = cover[i];
    for (let c = 0; c < 3; c++) {
      own[i * 3 + c] = w > 0.02 ? color[i * 3 + c] / w : 0;
      premultiplied[i * 3 + c] = own[i * 3 + c] * w;
    }
  }
  // La media de lo que hay (cobertura > 0,8), solo para el informe.
  const total = [0, 0, 0];
  let valid = 0;
  for (let i = 0; i < pixels; i++) {
    if (cover[i] <= 0.8) continue;
    for (let c = 0; c < 3; c++) total[c] += own[i * 3 + c];
    valid++;
  }
  const mean = total.map((v) => (valid ? v / valid : 128));
  if (!empty) {
    const out = Buffer.alloc(pixels * 3);
    for (let i = 0; i < pixels * 3; i++) out[i] = Math.round(Math.min(255, own[i]));
    return { data: out, empty, fill: mean, mean };
  }
  // El gris de la franja vecina: lo que hay (cobertura > 0,8) cerca de un hueco.
  const gap = new Float32Array(pixels);
  for (let i = 0; i < pixels; i++) gap[i] = 1 - cover[i];
  const nearGap = blur(gap, width, height, 1, (GAP_FILL_DEG.strip / 2) * pxPerDeg);
  const sum = [0, 0, 0];
  let count = 0;
  for (let i = 0; i < pixels; i++) {
    if (cover[i] <= 0.8 || nearGap[i] < 0.02) continue;
    for (let c = 0; c < 3; c++) sum[c] += own[i * 3 + c];
    count++;
  }
  const fill = sum.map((v) => (count ? v / count : 128));
  // La media local de lo que hay (convolución normalizada) y lo cerca que está cada píxel de datos.
  const localSigma = (GAP_FILL_DEG.local / 2) * pxPerDeg;
  const localSum = blur(premultiplied, width, height, 3, localSigma);
  const localWeight = blur(cover, width, height, 1, localSigma);
  const edge = blur(cover, width, height, 1, (GAP_FILL_DEG.feather / 2) * pxPerDeg);
  const smooth = (t) => {
    const x = Math.min(Math.max(t, 0), 1);
    return x * x * (3 - 2 * x);
  };
  const out = Buffer.alloc(pixels * 3);
  for (let i = 0; i < pixels; i++) {
    const weight = localWeight[i];
    // Con datos a menos de unos grados, su media local; más adentro, el gris de la franja.
    const near = smooth(weight / 0.25);
    // Lo que hay, entero a partir de `feather` grados del borde.
    const keep = cover[i] * smooth((edge[i] - 0.5) / 0.45);
    for (let c = 0; c < 3; c++) {
      const local = weight > 1e-4 ? localSum[i * 3 + c] / weight : fill[c];
      const filled = fill[c] + (local - fill[c]) * near;
      const value = own[i * 3 + c] * keep + filled * (1 - keep);
      out[i * 3 + c] = Math.round(Math.min(Math.max(value, 0), 255));
    }
  }
  return { data: out, empty, fill, mean };
}

/**
 * Desenfoque casi gaussiano (tres pasadas de caja) de `sigma` píxeles de un campo de `channels`
 * canales: en horizontal, con la vuelta del mapa (la longitud −180° sigue a la 180°); en vertical,
 * sin pasar de los polos.
 */
function blur(field, width, height, channels, sigma) {
  // Tres cajas de ancho 2r + 1 dan una varianza de 3 ((2r + 1)² − 1) / 12 = σ².
  const radius = Math.max(1, Math.round((Math.sqrt(4 * sigma * sigma + 1) - 1) / 2));
  let a = Float32Array.from(field);
  let b = new Float32Array(field.length);
  const span = 2 * radius + 1;
  for (let pass = 0; pass < 3; pass++) {
    // Horizontal, con la vuelta.
    for (let y = 0; y < height; y++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          acc += a[(y * width + ((k + width) % width)) * channels + c];
        }
        for (let x = 0; x < width; x++) {
          b[(y * width + x) * channels + c] = acc / span;
          const outX = (x - radius + width) % width;
          const inX = (x + radius + 1) % width;
          acc += a[(y * width + inX) * channels + c] - a[(y * width + outX) * channels + c];
        }
      }
    }
    [a, b] = [b, a];
    // Vertical, repitiendo la fila del polo.
    for (let x = 0; x < width; x++) {
      for (let c = 0; c < channels; c++) {
        const at = (y) => a[(Math.min(Math.max(y, 0), height - 1) * width + x) * channels + c];
        let acc = 0;
        for (let k = -radius; k <= radius; k++) acc += at(k);
        for (let y = 0; y < height; y++) {
          b[(y * width + x) * channels + c] = acc / span;
          acc += at(y + radius + 1) - at(y - radius);
        }
      }
    }
    [a, b] = [b, a];
  }
  return a;
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
 * Un mapa global en cilíndrica simple sin georreferencia (los del Solar System Simulator del JPL, fase
 * 9b): la longitud ESTE de su borde izquierdo y el sentido de sus columnas, dados. Con las columnas
 * hacia el oeste, se refleja: su borde izquierdo pasa a ser el derecho, que es la misma longitud (el
 * mapa da la vuelta entera).
 */
async function plainSource(path, { leftEdgeEastDeg, eastward }) {
  const open = () => {
    const pipeline = sharp(path);
    return eastward ? pipeline : pipeline.flop();
  };
  const metadata = await sharp(path).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`${path}: sin dimensiones`);
  return {
    open,
    width: metadata.width,
    height: metadata.height,
    channels: metadata.channels,
    firstLonDeg: leftEdgeEastDeg,
    spanDeg: 360,
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
 * Se comprueban en el mapa de 2048 px, solo con lo que hay: las de brillo no cuentan los huecos
 * rellenos (revisión del bloque D, D2: en Tritón, dos sondas junto al borde del hueco pasaban porque
 * su corona caía en parte sobre el gris claro del relleno). Con el mapa girado 180° o reflejado,
 * alguna tiene que fallar. Se
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
  // Tritón, en su canal naranja: tres manchas oscuras (maculae) del hemisferio sur que vio Voyager 2
  // (giradas o reflejadas caen en terreno sin ellas). Kasu Patera y Ukupanio Cavus, las de antes, están
  // a 3–4° del hueco del norte: sin contar el hueco no tienen contraste (revisión del bloque D, D2).
  triton: [
    { name: 'Doro Macula', lat: -27.5, lon: 31.7, radius: 1.5, sign: -1, feature: 1583 },
    { name: 'Namazu Macula', lat: -25.5, lon: 14, radius: 2, sign: -1, feature: 4125 },
    { name: 'Kikimora Maculae', lat: -31, lon: 78, radius: 1, sign: -1, feature: 3029 },
  ],
  // Los mapas del JPL (fase 9b), sin georreferencia: con el borde izquierdo en −180° y las columnas
  // hacia el este (como los del USGS), y solo con esa de las cuatro convenciones posibles (0° o −180°,
  // hacia el este o el oeste), pasan Wunda, clara, y Hamlet, oscura (claridad de fuente oficial: los pies
  // de foto de la NASA, NSSDC P-29502 y APOD del 31-01-1997), y los bordes de Yangoor y Domovoy. Las
  // cinco de Urano usan longitudes este de 0 a 360 en el Gazetteer, y Deimos, oeste. En las demás,
  // el brillo de cada rasgo es el observado en el mapa, y sus sondas comprueban que no se gire ni se
  // refleje: Verona Rupes (el escarpe, claro), Belmont Chasma (oscura) y Ursula (clara). En Deimos,
  // Swift, un cráter de fondo oscuro en la latitud del Gazetteer (planetográfica, como la del mapa).
  deimos: [{ name: 'Swift', lat: 12.5, lon: 1.8, radius: 2, sign: -1, feature: 5789 }],
  miranda: [{ name: 'Verona Rupes', lat: -18.3, lon: -12.2, radius: 1, sign: 1, feature: 6359 }],
  ariel: [
    { name: 'Yangoor', lat: -68.7, lon: -80.3, diameterKm: 78, feature: 6638 },
    { name: 'Domovoy', lat: -71.5, lon: -20.3, diameterKm: 71, feature: 1570 },
  ],
  umbriel: [{ name: 'Wunda', lat: -7.9, lon: -86.4, radius: 2.5, sign: 1, feature: 6587 }],
  titania: [
    { name: 'Belmont Chasma', lat: -8.5, lon: 32.6, radius: 1, sign: -1, feature: 678 },
    { name: 'Ursula', lat: -12.4, lon: 45.2, radius: 2, sign: 1, feature: 6245 },
  ],
  oberon: [{ name: 'Hamlet', lat: -46.1, lon: 44.4, radius: 3, sign: -1, feature: 2340 }],
  // Venus bajo las nubes (fase 9b, D44): el mosaico del radar de Magellan, con su georreferencia. En el
  // radar, los volcanes con sus coladas (Maat Mons, en el radio de su ficha, 395 km de diámetro: 1,9°;
  // y Sapas Mons) y Maxwell Montes (en las cumbres de Venus, el suelo devuelve mucho más eco) son más
  // claros que lo que los rodea. El Gazetteer da sus centros en longitud este de 0 a 360 (Maat Mons,
  // 194,6° E; Sapas Mons, 188,3° E). Una sonda oscura (Lakshmi Planum, la meseta lisa junto a Maxwell,
  // o el fondo de Mead) no se distingue de lo que la rodea a esta escala (medido: 0,94 a 0,99).
  'venus-radar': [
    { name: 'Maat Mons', lat: 0.5, lon: -165.4, radius: 2, sign: 1, feature: 3550 },
    { name: 'Sapas Mons', lat: 8.5, lon: -171.7, radius: 1, sign: 1, feature: 5318 },
    { name: 'Maxwell Montes', lat: 65.2, lon: 3.3, radius: 2.5, sign: 1, feature: 3766 },
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
  miranda: 'miranda',
  ariel: 'ariel',
  umbriel: 'umbriel',
  titania: 'titania',
  oberon: 'oberon',
  deimos: 'deimos',
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
 * Los accidentes de las sondas de un mosaico (nombre, latitud, longitud y radio en grados de arco): los
 * que D48 no deja borrar en lo real con luz rasante (`correctGrazing`, con `protect`).
 */
export function probeAreas(id) {
  return (MOSAIC_PROBES[id] ?? []).map((probe) => ({
    name: probe.name,
    lat: probe.lat,
    lon: probe.lon,
    radius: probeRadiusDeg(id, probe),
  }));
}

/**
 * Comprueba las sondas de un mosaico (RGB de 8 bits, equirrectangular con la longitud 0 en el centro)
 * y devuelve un informe; falla si alguna no pasa o si el mapa girado 180° o reflejado también las pasa
 * todas (las sondas no distinguirían la orientación). Con `onlyCovered` (el mapa recreado de D45, con
 * `coverage` = lo real y lo real con luz rasante): una sonda que cae sobre todo fuera de lo cubierto no se
 * mide (lo recreado sustituye a propósito el detalle fino de lo visto de lejos; ya pasó en el mosaico) y
 * se dice. Con `signOnly` (D48, revisión de la 10.a, hallazgo 1), cada sonda de brillo ha de conservar
 * su signo (más clara o más oscura que su anillo, sin el margen del 8 %): en lo real con luz rasante, el
 * contraste del mosaico lleva la luz de la foto (el anillo, oscurecido junto al terminador, o la sombra
 * de una fosa), que se corrige, pero el albedo no puede borrarse. Con `reference` (el mosaico), se da
 * también su cociente allí.
 */
export function checkMosaicProbes(
  id,
  { data, width, height, coverage },
  { onlyCovered = false, reference = null, signOnly = false } = {},
) {
  const probes = MOSAIC_PROBES[id];
  if (!probes) return null;
  const luminanceOf = (rgb) => {
    const field = new Float32Array(width * height);
    for (let i = 0; i < field.length; i++) {
      field[i] = 0.2126 * rgb[3 * i] + 0.7152 * rgb[3 * i + 1] + 0.0722 * rgb[3 * i + 2];
    }
    return field;
  };
  const luminance = luminanceOf(data);
  const referenceLuminance = reference ? luminanceOf(reference.data) : null;
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
  // longitud crece con 1/cos φ), sin los huecos sin datos (`own`: solo lo que hay).
  const covered = (x, y) => !coverage || at(coverage, x, y) >= 0.5;
  const annulus = (field, lat, lon, r0, r1, own = false) => {
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
        const [x, y] = [Math.round(cx + dx), Math.round(cy + dy)];
        if (own && !covered(x, y)) continue;
        sum += at(field, x, y);
        count++;
      }
    }
    // Sin datos en la corona (una sonda girada que cae en un hueco): no hay rasgo que medir.
    return count ? sum / count : NaN;
  };
  // La fracción cubierta de un disco de `r1` grados de arco (`onlyCovered`).
  const coveredShare = (lat, lon, r1) => {
    const cx = (lon + 180) * pxPerDeg;
    const cy = (90 - lat) * pxPerDeg;
    const stretch = 1 / Math.max(Math.cos((lat * Math.PI) / 180), 0.2);
    const reach = Math.ceil(r1 * pxPerDeg);
    let inside = 0;
    let count = 0;
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -Math.ceil(reach * stretch); dx <= Math.ceil(reach * stretch); dx++) {
        if (Math.hypot(dx / stretch, dy) / pxPerDeg > r1) continue;
        if (covered(Math.round(cx + dx), Math.round(cy + dy))) inside++;
        count++;
      }
    }
    return count ? inside / count : 0;
  };
  const measure = (probe, transform, straight = false) => {
    const [lat, lon] = transform(probe.lat, probe.lon);
    const r = probeRadiusDeg(id, probe);
    // En el mapa recreado, una sonda sobre todo fuera de lo real no se mide (en su sitio; girada o
    // reflejada, no cuenta como pasada).
    if (
      onlyCovered &&
      coverage &&
      coveredShare(lat, lon, probe.diameterKm ? 2.2 * r : 3 * r) < 0.5
    ) {
      return straight ? { ratio: NaN, ok: true, skipped: true } : { ratio: NaN, ok: false };
    }
    if (probe.diameterKm && gradient) {
      const rim = annulus(gradient, lat, lon, 0.8 * r, 1.2 * r);
      const inside = annulus(gradient, lat, lon, 0, 0.5 * r);
      const outside = annulus(gradient, lat, lon, 1.6 * r, 2.2 * r);
      const ratio = rim / Math.max(inside, outside, 1e-6);
      return { ratio, ok: ratio >= RIM_RATIO };
    }
    const ratio =
      annulus(luminance, lat, lon, 0, r, true) /
      Math.max(annulus(luminance, lat, lon, 2 * r, 3 * r, true), 1e-6);
    const [low, high] = signOnly && straight ? [1, 1] : [0.92, 1.08];
    const ok = probe.sign > 0 ? ratio > high : ratio < low;
    if (!straight || !referenceLuminance) return { ratio, ok };
    // Su cociente en el mosaico (en su sitio), para el informe.
    const original =
      annulus(referenceLuminance, lat, lon, 0, r) /
      Math.max(annulus(referenceLuminance, lat, lon, 2 * r, 3 * r), 1e-6);
    return { ratio, ok, original };
  };
  const passes = (transform, straight = false) =>
    probes.map((probe) => ({ probe, ...measure(probe, transform, straight) }));
  const straight = passes((lat, lon) => [lat, lon], true);
  const rotated = passes((lat, lon) => [lat, lon + 180 > 180 ? lon - 180 : lon + 180]);
  const mirrored = passes((lat, lon) => [lat, -lon]);
  const show = (results) =>
    results
      .map(
        (r) =>
          `${r.probe.name} ${r.skipped ? 'en zona recreada' : r.ratio.toFixed(2)}${r.original ? ` (mosaico ${r.original.toFixed(2)})` : ''}`,
      )
      .join(', ');
  if (straight.every((r) => r.skipped)) {
    // Solo con `onlyCovered`: todas caen en lo recreado (Deimos, con su única sonda, Swift, en lo visto
    // de lejos). Ya pasaron en el mosaico, antes de recrear, y lo real queda igual byte a byte
    // (`recreateMosaic` lo comprueba): no hay nada más que medir aquí, y se dice.
    return `${id}: ninguna sonda cae en lo real (${show(straight)}); pasaron en el mosaico, antes de recrear, y lo real queda igual byte a byte`;
  }
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

// Solo: un mosaico a 2048 px en PNG, con sus sondas (un círculo en cada una), para verlo. Con
// --radar, todo 0 es un hueco (`zerosAreGaps`: el radar de Venus).
//   node scripts/usgs-mosaic.mjs <id> <fichero del mosaico> <carpeta de salida> [canal] [--radar]
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, file, out, band] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
  if (!id || !file || !out) {
    throw new Error('Uso: node scripts/usgs-mosaic.mjs <id> <fichero> <carpeta de salida> [canal]');
  }
  const mosaic = await loadMosaic(pathToFileURL(file), 2048, {
    band: band === undefined ? undefined : Number(band),
    zerosAreGaps: process.argv.includes('--radar'),
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
