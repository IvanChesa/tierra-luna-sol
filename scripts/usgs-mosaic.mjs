// Mosaicos globales de las lunas (fase 7, tarea 1): GeoTIFF del USGS Astrogeology en proyección
// cilíndrica simple, llevados a la convención de las texturas de la escena (equirrectangular, la
// longitud 0 en el centro creciendo hacia el este y el norte arriba). build-textures.mjs lo usa para
// las texturas de las lunas; sus sondas (accidentes con nombre del Gazetteer) comprueban después que
// el mapa no ha quedado girado ni reflejado.
//
// - Dónde empieza la longitud: la de su georreferencia, como el modelo de Mercurio
//   (build-relief.mjs): la longitud central de la proyección más la x del punto de anclaje, en
//   metros sobre el ecuador del radio de la georreferencia. Las columnas crecen hacia el este (las
//   coordenadas proyectadas de GDAL lo hacen siempre, aunque la etiqueta del producto use longitudes
//   positivas al oeste); si un mapa saliera reflejado, sus sondas lo dirían.
// - Los huecos sin datos (valor 0; Voyager 2 solo vio el hemisferio sur de las lunas de Urano y de
//   Tritón), con el gris medio de lo que sí hay: se ven como una zona lisa, sin inventar relieve. La
//   imagen y su máscara se reducen por separado y se dividen: lo que hay no se mezcla con los huecos.
// - Sin cargar el mosaico entero en memoria (algunos pasan de 190 Mpx): lo reduce sharp.
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { tiffGeoInfo } from './build-relief.mjs';

/**
 * Lee un mosaico y lo deja a `width` × `width / 2` (RGB de 8 bits, sRGB), centrado en la longitud 0.
 * Devuelve el búfer, la fracción del mapa sin datos y un informe.
 */
export async function loadMosaic(url, width) {
  const path = fileURLToPath(url);
  const info = await tiffGeoInfo(path);
  if (!info.width || !info.height) throw new Error(`${path}: sin dimensiones`);
  if (Math.abs(info.width / info.height - 2) > 0.01) {
    throw new Error(`${path}: no es un mapa global de 2:1 (${info.width} × ${info.height})`);
  }
  const radiusM = info.semiMajorAxisM;
  const pixelScale = info.pixelScale?.[0];
  const tiepointX = info.tiepoint?.[3];
  if (!radiusM || !pixelScale || tiepointX === undefined) {
    throw new Error(`${path}: sin georreferencia (radio, escala o punto de anclaje)`);
  }
  const metersPerDegree = (2 * Math.PI * radiusM) / 360;
  const anchorLon = info.centerLonDeg + tiepointX / metersPerDegree;
  const firstLonDeg = info.pixelIsPoint
    ? anchorLon - (0.5 * pixelScale) / metersPerDegree
    : anchorLon;
  const spanDeg = (info.width * pixelScale) / metersPerDegree;
  if (Math.abs(spanDeg - 360) > 0.5) {
    throw new Error(`${path}: cubre ${spanDeg.toFixed(2)}° de longitud, no 360°`);
  }
  const height = width / 2;
  const open = () => sharp(path, { limitInputPixels: false });
  const reduce = (pipeline) =>
    pipeline.resize(width, height, { fit: 'fill', kernel: 'lanczos3' }).raw().toBuffer();
  const [color, coverage, sourceMeta] = await Promise.all([
    reduce(open().removeAlpha().toColourspace('srgb')),
    // Un solo canal: sin toColourspace, sharp lo devuelve en sRGB, con tres.
    reduce(open().removeAlpha().threshold(1).toColourspace('b-w')),
    open().metadata(),
  ]);
  const pixels = width * height;
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
  return {
    data: out,
    width,
    height,
    emptyFraction: empty / pixels,
    report: `${info.width} × ${info.height}, ${sourceMeta.channels === 1 ? 'en gris' : 'en color'}, el borde izquierdo en ${firstLonDeg.toFixed(2)}° E; sin datos, ${((100 * empty) / pixels).toFixed(1)} % (con el gris medio)`,
  };
}

/**
 * Sondas de los mosaicos de las lunas (fase 7): rasgos con nombre del Gazetteer of Planetary
 * Nomenclature (IAU/USGS; su URL), con su latitud y su longitud ESTE (el Gazetteer de estas lunas da
 * longitudes oeste: este = −oeste), un radio de la media (grados) y si son más claros (+1) o más
 * oscuros (−1) que el anillo que los rodea (de 2 a 3 radios). Se comprueban en el mapa de 2048 px: con
 * él girado 180° o reflejado, alguna tiene que fallar. Fobos no lleva: sus rasgos se ven por el
 * sombreado del relieve, no por su brillo; lo alinea su georreferencia.
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
};

/**
 * Comprueba las sondas de un mosaico (RGB de 8 bits, equirrectangular con la longitud 0 en el centro)
 * y devuelve un informe; falla si alguna no pasa o si el mapa girado 180° o reflejado también las pasa
 * todas (las sondas no distinguirían la orientación).
 */
export function checkMosaicProbes(id, { data, width, height }) {
  const probes = MOSAIC_PROBES[id];
  if (!probes) return null;
  const luminance = (x, y) => {
    const xx = ((x % width) + width) % width;
    const yy = Math.min(Math.max(y, 0), height - 1);
    const k = (yy * width + xx) * 3;
    return 0.2126 * data[k] + 0.7152 * data[k + 1] + 0.0722 * data[k + 2];
  };
  const pxPerDeg = width / 360;
  // Media en un disco (en la esfera: el radio en longitud crece con 1/cos φ) y en el anillo de 2 a 3
  // radios.
  const contrast = ({ lat, lon, radius }, transform) => {
    const [tlat, tlon] = transform(lat, lon);
    const cx = (tlon + 180) * pxPerDeg;
    const cy = (90 - tlat) * pxPerDeg;
    const stretch = 1 / Math.max(Math.cos((tlat * Math.PI) / 180), 0.2);
    let inner = 0;
    let innerN = 0;
    let outer = 0;
    let outerN = 0;
    const reach = Math.ceil(3 * radius * pxPerDeg);
    for (let dy = -reach; dy <= reach; dy++) {
      for (let dx = -Math.ceil(reach * stretch); dx <= Math.ceil(reach * stretch); dx++) {
        const d = Math.hypot(dx / stretch, dy) / (radius * pxPerDeg);
        const l = luminance(Math.round(cx + dx), Math.round(cy + dy));
        if (d <= 1) {
          inner += l;
          innerN++;
        } else if (d >= 2 && d <= 3) {
          outer += l;
          outerN++;
        }
      }
    }
    return inner / innerN / Math.max(outer / outerN, 1e-6);
  };
  const passes = (transform) =>
    probes.map((probe) => {
      const ratio = contrast(probe, transform);
      return { probe, ratio, ok: probe.sign > 0 ? ratio > 1.08 : ratio < 0.92 };
    });
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
  return `${id}: sondas (disco / anillo) ${show(straight)}; girado 180°, ${show(rotated)}; reflejado, ${show(mirrored)}`;
}

// Solo: un mosaico a 2048 px en PNG, con sus sondas (un círculo en cada una), para verlo.
//   node scripts/usgs-mosaic.mjs <id> <fichero del mosaico> <carpeta de salida>
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [id, file, out] = process.argv.slice(2);
  if (!id || !file || !out) {
    throw new Error('Uso: node scripts/usgs-mosaic.mjs <id> <fichero> <carpeta de salida>');
  }
  const mosaic = await loadMosaic(pathToFileURL(file), 2048);
  console.log(mosaic.report);
  try {
    console.log(checkMosaicProbes(id, mosaic) ?? '(sin sondas)');
  } catch (error) {
    // La vista previa se escribe igual: sirve para ver por qué falla.
    console.log(String(error));
    process.exitCode = 1;
  }
  const marks = (MOSAIC_PROBES[id] ?? [])
    .map(({ lat, lon, radius }) => {
      const pxPerDeg = mosaic.width / 360;
      const cx = (lon + 180) * pxPerDeg;
      const cy = (90 - lat) * pxPerDeg;
      return `<circle cx="${cx}" cy="${cy}" r="${Math.max(radius * pxPerDeg, 4)}" fill="none" stroke="red" stroke-width="2"/>`;
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${mosaic.width}" height="${mosaic.height}">${marks}</svg>`;
  await sharp(mosaic.data, { raw: { width: mosaic.width, height: mosaic.height, channels: 3 } })
    .composite([{ input: Buffer.from(svg) }])
    .png()
    .toFile(join(out, `${id}.png`));
}
