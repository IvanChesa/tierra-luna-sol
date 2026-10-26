// Relieve a partir de modelos de elevación oficiales (fase 3b; la fase 6 lo reutiliza para la Luna):
// - lee el modelo (MOLA MEGDR del PDS en binario o un GeoTIFF del USGS) y lo deja equirrectangular
//   con la longitud 0 en el centro, creciendo hacia el este, y el norte arriba (la convención de las
//   texturas de la escena);
// - calcula el mapa de normales de cada nivel (este, norte, arriba en RGB) con diferencias finitas
//   sobre la esfera y una exageración vertical documentada;
// - empaqueta la elevación en 16 bits en dos canales de 8 (D15), para el desplazamiento de la Luna.
// build-textures.mjs lo usa para generar los mapas de normales; también se puede ejecutar solo:
//   node scripts/build-relief.mjs <mars|mercury> <carpeta de salida>   (PNG de prueba y comprobaciones)
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = new URL('../', import.meta.url);
const ELEVATION = new URL('assets-src/elevation/', ROOT);

/**
 * Modelos de elevación. Radio de referencia y exageración vertical de cada uno. La exageración es
 * un ajuste visual: a 4096 px de ancho, un píxel de Marte mide 5,2 km y las pendientes reales a esa
 * escala son de pocos grados; sin exagerar, el relieve apenas se vería ni con luz rasante.
 */
export const DEMS = {
  mars: {
    file: 'megt90n000eb.img',
    format: 'mola-megdr',
    width: 5760,
    height: 2880,
    radiusM: 3396000,
    exaggeration: 6,
    /**
     * Sondas (centros del Gazetteer of Planetary Nomenclature, IAU/USGS): [latitud, longitud este,
     * nombre, tolerancia en grados].
     */
    highest: [18.65, 226.2, 'Olympus Mons', 3],
    lowest: [-42.4, 70.5, 'Hellas Planitia', 15],
  },
  mercury: {
    file: 'Mercury_Messenger_USGS_DEM_Global_665m_v2.tif',
    format: 'geotiff',
    radiusM: 2439400,
    // Mercurio está lleno de cráteres de paredes empinadas (20–30° ya a esta escala): con más
    // exageración, casi todo se autosombrea con luz rasante.
    exaggeration: 2,
  },
};

/** Lee los campos de la cabecera TIFF que hacen falta para saber dónde empieza la longitud. */
export async function tiffGeoInfo(path) {
  const handle = await (await import('node:fs/promises')).open(path, 'r');
  try {
    const head = Buffer.alloc(16);
    await handle.read(head, 0, 16, 0);
    const little = head.toString('latin1', 0, 2) === 'II';
    const u16 = (b, o) => (little ? b.readUInt16LE(o) : b.readUInt16BE(o));
    const u32 = (b, o) => (little ? b.readUInt32LE(o) : b.readUInt32BE(o));
    if (u16(head, 2) !== 42) throw new Error('Solo se leen TIFF clásicos (no BigTIFF)');
    const ifdOffset = u32(head, 4);
    const countBuffer = Buffer.alloc(2);
    await handle.read(countBuffer, 0, 2, ifdOffset);
    const count = u16(countBuffer, 0);
    const entries = Buffer.alloc(count * 12);
    await handle.read(entries, 0, entries.length, ifdOffset + 2);
    const tags = {};
    for (let k = 0; k < count; k++) {
      const o = k * 12;
      const tag = u16(entries, o);
      const type = u16(entries, o + 2);
      const n = u32(entries, o + 4);
      const size = { 1: 1, 2: 1, 3: 2, 4: 4, 12: 8 }[type] ?? 4;
      let data = entries.subarray(o + 8, o + 12);
      if (size * n > 4) {
        data = Buffer.alloc(size * n);
        await handle.read(data, 0, data.length, u32(entries, o + 8));
      }
      const values = [];
      // Las tiras (273 y 279) se leen enteras; el resto, como mucho 512 valores.
      const limit = tag === 273 || tag === 279 ? n : Math.min(n, 512);
      for (let i = 0; i < limit; i++) {
        if (type === 3) values.push(u16(data, i * 2));
        else if (type === 4) values.push(u32(data, i * 4));
        else if (type === 12)
          values.push(little ? data.readDoubleLE(i * 8) : data.readDoubleBE(i * 8));
        else if (type === 2) values.push(data.toString('latin1').replace(/\0+$/, ''));
      }
      tags[tag] = type === 2 ? values[0] : values;
    }
    // GeoKeyDirectory (34735) y sus parámetros dobles (34736): la longitud central de la proyección
    // (ProjCenterLongGeoKey, 3088, o ProjNatOriginLongGeoKey, 3080) y el tipo de raster (1025).
    const keys = {};
    const directory = tags[34735] ?? [];
    for (let k = 4; k + 3 < directory.length; k += 4) {
      const [id, location, , value] = directory.slice(k, k + 4);
      keys[id] = location === 34736 ? tags[34736]?.[value] : location === 0 ? value : undefined;
    }
    return {
      littleEndian: little,
      compression: tags[259]?.[0] ?? 1,
      stripOffsets: tags[273] ?? [],
      stripByteCounts: tags[279] ?? [],
      centerLonDeg: keys[3088] ?? keys[3080] ?? 0,
      pixelIsPoint: keys[1025] === 2,
      width: tags[256]?.[0],
      height: tags[257]?.[0],
      bitsPerSample: tags[258]?.[0],
      sampleFormat: tags[339]?.[0] ?? 1,
      pixelScale: tags[33550], // [sx, sy, sz] en unidades del modelo (m)
      tiepoint: tags[33922], // [i, j, k, x, y, z]
      geoAscii: tags[34737],
    };
  } finally {
    await handle.close();
  }
}

/**
 * Desplaza las columnas para que la longitud 0 quede en el centro (de 0–360° a −180–180°).
 * `firstColumnLonDeg`: longitud del borde izquierdo de la primera columna.
 */
function centerPrimeMeridian(data, width, height, firstColumnLonDeg) {
  // Columna de la longitud −180°: la que hay que poner a la izquierda.
  const shift =
    Math.round(((((-180 - firstColumnLonDeg) % 360) + 360) % 360) / (360 / width)) % width;
  if (shift === 0) return data;
  const out = new Float32Array(data.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) out[row + x] = data[row + ((x + shift) % width)];
  }
  return out;
}

/**
 * Elevación (m) equirrectangular con la longitud 0 en el centro, creciendo hacia el este, y el norte
 * arriba, remuestreada a `width` × `width / 2`.
 */
export async function loadElevation(name, width) {
  const dem = DEMS[name];
  const path = fileURLToPath(new URL(dem.file, ELEVATION));
  let source;
  let sourceWidth;
  let sourceHeight;
  let firstLon;
  if (dem.format === 'mola-megdr') {
    // Enteros de 16 bits con signo, big-endian, en metros; la muestra 1 empieza en 0° E y la línea 1
    // en 90° N (etiqueta megt90n000eb.lbl del PDS).
    const bytes = await readFile(path);
    sourceWidth = dem.width;
    sourceHeight = dem.height;
    if (bytes.length !== sourceWidth * sourceHeight * 2)
      throw new Error('Tamaño de MOLA inesperado');
    source = new Float32Array(sourceWidth * sourceHeight);
    for (let i = 0; i < source.length; i++) source[i] = bytes.readInt16BE(2 * i);
    firstLon = 0;
  } else {
    // GeoTIFF: la georreferencia dice dónde empieza la longitud. Borde izquierdo: la longitud central
    // de la proyección más la x del punto de anclaje (en metros sobre el ecuador), que es la esquina
    // del primer píxel (o su centro, si es PixelIsPoint).
    const info = await tiffGeoInfo(path);
    if (info.sampleFormat !== 2 || info.bitsPerSample !== 16) {
      throw new Error(`El GeoTIFF no es de enteros de 16 bits con signo (${JSON.stringify(info)})`);
    }
    if (info.width !== 2 * info.height) throw new Error('El GeoTIFF no es global (2:1)');
    const metersPerDegree = (2 * Math.PI * dem.radiusM) / 360;
    const anchorLon = info.centerLonDeg + info.tiepoint[3] / metersPerDegree;
    firstLon = info.pixelIsPoint
      ? anchorLon - (0.5 * info.pixelScale[0]) / metersPerDegree
      : anchorLon;
    sourceWidth = info.width;
    sourceHeight = info.height;
    // Se leen las tiras tal cual: sharp convertiría los enteros con signo a sRGB de 8 bits.
    source = await readTiffInt16(path, info);
  }
  const resized = resampleArea(source, sourceWidth, sourceHeight, width, width / 2);
  return centerPrimeMeridian(resized, width, width / 2, firstLon);
}

/** Los píxeles de un TIFF sin comprimir de enteros de 16 bits con signo, leyendo sus tiras. */
async function readTiffInt16(path, info) {
  if (info.compression !== 1) throw new Error(`El GeoTIFF está comprimido (${info.compression})`);
  const total = info.width * info.height;
  const bytes = Buffer.alloc(total * 2);
  const handle = await (await import('node:fs/promises')).open(path, 'r');
  try {
    let written = 0;
    for (let k = 0; k < info.stripOffsets.length; k++) {
      const length = info.stripByteCounts[k];
      await handle.read(bytes, written, length, info.stripOffsets[k]);
      written += length;
    }
    if (written !== bytes.length)
      throw new Error(`El GeoTIFF tiene ${written} bytes de datos, no ${bytes.length}`);
  } finally {
    await handle.close();
  }
  const out = new Int16Array(total);
  for (let i = 0; i < total; i++)
    out[i] = info.littleEndian ? bytes.readInt16LE(2 * i) : bytes.readInt16BE(2 * i);
  return out;
}

/**
 * Remuestreo por áreas (cada píxel de salida es la media ponderada de los de entrada que cubre): el
 * filtro correcto para reducir una elevación sin inventar picos. Separable: primero las filas.
 */
export function resampleArea(source, sourceWidth, sourceHeight, width, height) {
  const weights = (from, to) => {
    const scale = from / to;
    return Array.from({ length: to }, (_, i) => {
      const start = i * scale;
      const end = start + scale;
      const taps = [];
      for (let k = Math.floor(start); k < Math.ceil(end); k++) {
        const w = Math.min(end, k + 1) - Math.max(start, k);
        if (w > 0) taps.push([Math.min(k, from - 1), w / scale]);
      }
      return taps;
    });
  };
  const columns = weights(sourceWidth, width);
  const rows = weights(sourceHeight, height);
  const horizontal = new Float32Array(width * sourceHeight);
  for (let y = 0; y < sourceHeight; y++) {
    const row = y * sourceWidth;
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (const [k, w] of columns[x]) sum += source[row + k] * w;
      horizontal[y * width + x] = sum;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    for (const [k, w] of rows[y]) {
      const row = k * width;
      for (let x = 0; x < width; x++) out[y * width + x] += horizontal[row + x] * w;
    }
  }
  return out;
}

/**
 * Mapa de normales (RGB de 8 bits: este, norte, arriba en [0, 255]) de una elevación equirrectangular,
 * con diferencias centradas: en longitud, la distancia de un píxel es R·cos φ·Δλ (con un mínimo cerca
 * de los polos) y la longitud da la vuelta; en latitud, R·Δφ.
 */
export function normalMap(elevation, width, height, radiusM, exaggeration) {
  const out = Buffer.alloc(width * height * 3);
  const dLon = (2 * Math.PI) / width;
  const dLat = Math.PI / height;
  for (let y = 0; y < height; y++) {
    const lat = Math.PI / 2 - (y + 0.5) * dLat;
    const east = 2 * radiusM * Math.max(Math.cos(lat), 0.02) * dLon;
    const north = 2 * radiusM * dLat;
    const up = Math.max(y - 1, 0) * width;
    const down = Math.min(y + 1, height - 1) * width;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const left = row + ((x - 1 + width) % width);
      const right = row + ((x + 1) % width);
      const dhEast = (elevation[right] - elevation[left]) / east;
      const dhNorth = (elevation[up + x] - elevation[down + x]) / north;
      let nx = -exaggeration * dhEast;
      let ny = -exaggeration * dhNorth;
      let nz = 1;
      const length = Math.hypot(nx, ny, nz);
      nx /= length;
      ny /= length;
      nz /= length;
      const o = (row + x) * 3;
      out[o] = Math.round((nx * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((nz * 0.5 + 0.5) * 255);
    }
  }
  return out;
}

/**
 * Elevación en 16 bits empaquetada en dos canales de 8 (D15: R = byte alto, G = byte bajo), entre
 * `minM` y `maxM`. La resolución vertical es (maxM − minM) / 65535.
 */
export function packElevation16(elevation, minM, maxM) {
  const out = Buffer.alloc(elevation.length * 3);
  for (let i = 0; i < elevation.length; i++) {
    const t = Math.min(Math.max((elevation[i] - minM) / (maxM - minM), 0), 1);
    const v = Math.round(t * 65535);
    out[3 * i] = v >> 8;
    out[3 * i + 1] = v & 255;
  }
  return out;
}

/** Inversa de {@link packElevation16} (para las comprobaciones). */
export const unpackElevation16 = (high, low, minM, maxM) =>
  minM + (((high << 8) | low) / 65535) * (maxM - minM);

/** Latitud y longitud (grados) del píxel más alto o más bajo. */
function extreme(elevation, width, height, sign) {
  let best = 0;
  for (let i = 1; i < elevation.length; i++) {
    if (sign * elevation[i] > sign * elevation[best]) best = i;
  }
  const x = best % width;
  const y = Math.floor(best / width);
  return {
    lat: 90 - ((y + 0.5) * 180) / height,
    lon: ((x + 0.5) * 360) / width - 180,
    value: elevation[best],
  };
}

/** Distancia angular (grados) entre dos puntos. */
function separationDeg([lat1, lon1], [lat2, lon2]) {
  const r = Math.PI / 180;
  const c =
    Math.sin(lat1 * r) * Math.sin(lat2 * r) +
    Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon1 - lon2) * r);
  return Math.acos(Math.min(Math.max(c, -1), 1)) / r;
}

/**
 * Comprueba la alineación con dos accidentes conocidos (el punto más alto y el más bajo del modelo
 * remuestreado deben caer dentro de ellos: a menos de su tolerancia en grados) y devuelve un informe. Sin sondas, el informe dice
 * el intervalo de elevaciones.
 */
export function checkElevation(name, elevation, width) {
  const dem = DEMS[name];
  const height = width / 2;
  const high = extreme(elevation, width, height, 1);
  const low = extreme(elevation, width, height, -1);
  const range = `de ${Math.round(low.value)} a ${Math.round(high.value)} m`;
  if (!dem.highest || !dem.lowest)
    return `${name}: elevación ${range} (georreferencia del GeoTIFF)`;
  const toEast = (lon) => ((lon % 360) + 360) % 360;
  const dHigh = separationDeg([high.lat, high.lon], [dem.highest[0], dem.highest[1]]);
  const dLow = separationDeg([low.lat, low.lon], [dem.lowest[0], dem.lowest[1]]);
  if (dHigh > dem.highest[3] || dLow > dem.lowest[3]) {
    throw new Error(
      `Relieve de ${name} mal alineado: el punto más alto está a ${dHigh.toFixed(1)}° de ${dem.highest[2]} y el más bajo a ${dLow.toFixed(1)}° de ${dem.lowest[2]}`,
    );
  }
  return `${name}: elevación ${range}; el punto más alto (${high.lat.toFixed(1)}°, ${toEast(high.lon).toFixed(1)}° E) está a ${dHigh.toFixed(1)}° de ${dem.highest[2]} y el más bajo, a ${dLow.toFixed(1)}° de ${dem.lowest[2]}`;
}

/**
 * Alineación del relieve con la textura de color del mismo cuerpo: correlación entre la magnitud de
 * la pendiente del relieve y la del gradiente de luminancia de la textura (las paredes de los
 * cráteres y los escarpes salen en las dos), entre −60° y 60° de latitud, con la textura girada.
 * Falla si el máximo no está en 0° o no destaca. `color`: { data, width, height, channels } (8 bits).
 */
export function checkAlignmentWithColor(name, elevation, color) {
  const { width, height } = color;
  const magnitude = (value) => {
    const g = new Float64Array(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 0; x < width; x++) {
        const l = value(y * width + ((x - 1 + width) % width));
        const r = value(y * width + ((x + 1) % width));
        const u = value((y - 1) * width + x);
        const d = value((y + 1) * width + x);
        g[y * width + x] = Math.hypot(r - l, d - u);
      }
    }
    return g;
  };
  const relief = magnitude((i) => elevation[i]);
  const k = color.channels;
  const image = magnitude((i) => color.data[i * k] + color.data[i * k + 1] + color.data[i * k + 2]);
  const rows = [];
  for (let y = 0; y < height; y++) if (Math.abs(90 - ((y + 0.5) * 180) / height) < 60) rows.push(y);
  const correlation = (shiftDeg) => {
    const shift = Math.round((shiftDeg / 360) * width);
    let sa = 0,
      sb = 0,
      saa = 0,
      sbb = 0,
      sab = 0,
      n = 0;
    for (const y of rows) {
      for (let x = 0; x < width; x++) {
        const a = relief[y * width + x];
        const b = image[y * width + ((x + shift + width) % width)];
        sa += a;
        sb += b;
        saa += a * a;
        sbb += b * b;
        sab += a * b;
        n++;
      }
    }
    const covariance = sab / n - (sa / n) * (sb / n);
    return covariance / Math.sqrt((saa / n - (sa / n) ** 2) * (sbb / n - (sb / n) ** 2));
  };
  const aligned = correlation(0);
  const others = [-10, -5, 5, 10, 90, 180].map((shift) => [shift, correlation(shift)]);
  const best = Math.max(...others.map(([, value]) => value));
  if (!(aligned > 1.5 * best)) {
    throw new Error(
      `El relieve de ${name} no está alineado con su textura (0°: ${aligned.toFixed(3)}; girado: ${best.toFixed(3)})`,
    );
  }
  return `${name}: relieve y textura de color, correlación ${aligned.toFixed(3)} alineados frente a ≤ ${best.toFixed(3)} girados (±5°, ±10°, 90°, 180°)`;
}

// --- Ejecución directa (prueba) ------------------------------------------------------------------
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [name, out] = process.argv.slice(2);
  if (!DEMS[name] || !out)
    throw new Error('Uso: node scripts/build-relief.mjs <mars|mercury> <carpeta>');
  const width = 2048;
  const elevation = await loadElevation(name, width);
  console.log(checkElevation(name, elevation, width));
  const dem = DEMS[name];
  const normals = normalMap(elevation, width, width / 2, dem.radiusM, dem.exaggeration);
  await sharp(normals, { raw: { width, height: width / 2, channels: 3 } })
    .png()
    .toFile(`${out}/${name}-normal-${width}.png`);
  // El empaquetado de 16 bits ida y vuelta: el error es como mucho media unidad.
  const min = Math.min(...elevation.subarray(0, 100000));
  const max = Math.max(...elevation.subarray(0, 100000));
  const packed = packElevation16(elevation.subarray(0, 1000), min, max);
  const error = Math.max(
    ...Array.from({ length: 1000 }, (_, i) =>
      Math.abs(unpackElevation16(packed[3 * i], packed[3 * i + 1], min, max) - elevation[i]),
    ),
  );
  console.log(
    `16 bits empaquetados: error máximo ${error.toFixed(3)} m (paso ${((max - min) / 65535).toFixed(3)} m)`,
  );
}
