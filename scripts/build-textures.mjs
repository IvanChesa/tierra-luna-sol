// Genera las texturas de la escena (D17, D18): WebP por niveles (1k, 2k y 4k, nunca más que el
// original) con hash en el nombre, en public/textures/{nivel}/, y el manifiesto de ficheros
// src/app/scene/texture-files.ts (GENERADO: no se edita a mano).
// Uso: node scripts/download-assets.mjs && node scripts/build-textures.mjs
//
// Además comprueba lo que no se puede dar por supuesto:
// - Alineación del meridiano 0 de los mapas de superficie: en cada uno, unos puntos conocidos
//   (mares lunares, Syrtis Major, el Sáhara…) tienen que ser oscuros o claros donde toca. Con el
//   mapa girado 180°, las sondas fallan.
// - Radios que cubre la tira de los anillos de Saturno: Solar System Scope no los documenta. Se
//   calibran con dos bordes de la ficha de los anillos de la NASA (src/app/data/body-data.ts): el
//   exterior del anillo B (empieza la división de Cassini) y el exterior del anillo A. Se comprueba
//   después que el borde interior del anillo C cae donde la textura empieza a ser opaca y que la
//   división de Encke está donde dice la ficha.
// - Opacidad física de los anillos (fase 3b): la opacidad de la textura es artística (la división
//   de Cassini tiene τ ≈ 0,6; la NASA da 0–0,1). Se conserva su estructura radial y se lleva cada
//   anillo (C, B, A y la división de Cassini) a la profundidad óptica normal y al albedo de la ficha.
//   La luminancia de la textura modula ese albedo (su estructura fina, sin cambiar la media de cada
//   anillo donde se calibra; revisión del bloque R, R1) y el color es el medido en la foto del Hubble
//   (`RING_PHOTOMETRY.chromaticity`). El alfa de la tira es la opacidad vista de frente, 1 − e^(−τ), y
//   su color, el albedo.
// - Color del océano de la Tierra (fase 3b): el de la textura es un azul plano y saturado; se lleva
//   al medido en fotos de EPIC (DSCOVR) con la máscara del agua y se comprueba el resultado.
// - Orientación de la Vía Láctea (panorama de ESO en coordenadas galácticas, con l = 0 en el centro y
//   creciendo hacia la izquierda): el centro galáctico, más brillante que los polos y que el
//   anticentro, y la Gran Nube de Magallanes donde dice SIMBAD (l = 280,4652°, b = −32,8884°), más
//   brillante que el punto simétrico (el panorama al revés la pondría allí).
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BODY_DATA } from '../src/app/data/body-data.ts';
import { RING_PHOTOMETRY } from '../src/app/data/photometry.ts';
import { phaseFunction, relativeDetail, ringReflectance } from '../src/app/ephemeris/photometry.ts';
import { OCEAN_CHROMA } from './reference-colors.mjs';
import {
  DEMS,
  checkAlignmentWithColor,
  checkElevation,
  loadElevation,
  normalMap,
  packElevation16,
} from './build-relief.mjs';
import { buildPolarNormalAtlas } from './lola-polar.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets-src/textures/', ROOT);
const PUBLIC = new URL('public/', ROOT);
const LEVELS = [
  ['1k', 1024],
  ['2k', 2048],
  ['4k', 4096],
  ['8k', 8192],
];
/** El nivel más grande que se genera si la textura no pide otro (`maxWidth`): 4k. */
const DEFAULT_MAX_WIDTH = 4096;
/** Alto de la tira de los anillos (la escena solo lee una fila: basta con unos píxeles). */
const RING_HEIGHT = 16;

/**
 * kind: color (sRGB), gray (datos en escala de grises, sin espacio de color), normal (datos RGB),
 * ring (tira RGBA de los anillos), panorama (cielo en coordenadas galácticas), relief (mapa de normales
 * calculado con build-relief.mjs a partir de un modelo de elevación; `color`: la textura con la que
 * se comprueba la alineación). `ocean`: máscara del agua con la que se corrige el color del océano
 * (OCEAN_CHROMA). `maxWidth`: el nivel más grande que se genera (4k si no se dice; 8k solo la
 * textura de día de la Tierra, en el nivel alto, fase 5, y el color de la Luna, fase 6). elevation:
 * la elevación de un modelo en 16 bits empaquetados en R y G (D15), sin pérdidas, para desplazar los
 * vértices (la Luna, fase 6). polar-relief: el atlas de normales de los casquetes polares de la Luna
 * (scripts/lola-polar.mjs; revisión de la fase 6): 2n × n px, el sur a la izquierda y el norte a la
 * derecha.
 */
const TEXTURES = {
  mercury: { file: '8k_mercury.jpg', kind: 'color', quality: 80 },
  venus: { file: '4k_venus_atmosphere.jpg', kind: 'color', quality: 80 },
  'earth-day': {
    file: '8k_earth_daymap.jpg',
    kind: 'color',
    quality: 82,
    ocean: '8k_earth_specular_map.tif',
    maxWidth: 8192,
  },
  'earth-night': { file: '8k_earth_nightmap.jpg', kind: 'color', quality: 80 },
  'earth-clouds': { file: '8k_earth_clouds.jpg', kind: 'gray', quality: 80 },
  // Solar System Scope guarda el sur en G (convenio «DirectX»): se invierte para que sea (este,
  // norte, arriba), como lee el shader (revisión de la fase 5, hallazgo 4; lo comprueba NORMAL_PROBES).
  'earth-normal': {
    file: '8k_earth_normal_map.tif',
    kind: 'normal',
    quality: 90,
    flipGreen: true,
  },
  'earth-specular': { file: '8k_earth_specular_map.tif', kind: 'gray', quality: 85 },
  moon: { file: 'lroc_color_poles_8k.tif', kind: 'color', quality: 82, maxWidth: 8192 },
  mars: { file: '8k_mars.jpg', kind: 'color', quality: 80 },
  jupiter: { file: '8k_jupiter.jpg', kind: 'color', quality: 80 },
  saturn: { file: '8k_saturn.jpg', kind: 'color', quality: 80 },
  'saturn-rings': { file: '8k_saturn_ring_alpha.png', kind: 'ring', quality: 90 },
  'mercury-normal': { dem: 'mercury', kind: 'relief', color: 'mercury', quality: 85 },
  'mars-normal': { dem: 'mars', kind: 'relief', color: 'mars', quality: 85 },
  // Sus extremos se comprueban en 2k: en 1k, con píxeles de ~10 km, el punto más bajo cae en otro
  // sitio de la cuenca Polo Sur–Aitken, a 13° de Antoniadi.
  'moon-normal': { dem: 'moon', kind: 'relief', color: 'moon', quality: 85, checkLevel: '2k' },
  // La malla de la Luna se desplaza con esta elevación: sus vértices están a 0,7° en el ecuador en el
  // nivel alto (512 por vuelta), y la de 1k (0,35° por píxel, cada uno la media de su área) ya da dos
  // muestras por vértice; la de 2k pesaba 2,7 MiB y 8 MiB de VRAM más sin verse (revisión de la fase 6,
  // sugerencia 12).
  'moon-elevation': { dem: 'moon', kind: 'elevation', maxWidth: 1024 },
  // Sus casquetes polares, por encima de 76° (revisión de la fase 6, hallazgo 1): las normales de los
  // modelos polares del LOLA, a 893 m por píxel en 2k, sin el «sol de rayas» del equirrectangular.
  'moon-normal-poles': { kind: 'polar-relief', quality: 85, maxWidth: 2048 },
  uranus: { file: '2k_uranus.jpg', kind: 'color', quality: 82 },
  neptune: { file: '2k_neptune.jpg', kind: 'color', quality: 82 },
  'milky-way': { file: 'eso0932a.tif', kind: 'panorama', quality: 80, maxWidth: 2048 },
};

/**
 * Texturas que no se publican, con el motivo (ninguna ahora: la Vía Láctea de Gaia, CC BY-NC, se ha
 * sustituido por el panorama de ESO, CC BY 4.0, por decisión de Iván en la revisión del bloque B).
 */
const OMITTED = {};

/**
 * Sondas de alineación: [latitud, longitud este, nombre]. Los puntos oscuros tienen que medir menos
 * de `ratio` (0,6 por defecto) × el claro más tenue; `radius` es el radio de la media en píxeles
 * del nivel 1k (el cráter Kuiper de Mercurio mide unos 4 px).
 */
const PROBES = {
  'earth-day': {
    dark: [[0, -150, 'Pacífico']],
    bright: [[23, 10, 'Sáhara']],
  },
  moon: {
    dark: [
      [33, -16, 'Mare Imbrium'],
      [17, 59, 'Mare Crisium'],
    ],
    bright: [
      [-20, 20, 'tierras altas del sur'],
      [10, -160, 'cara oculta'],
    ],
  },
  mars: {
    dark: [
      [8, 70, 'Syrtis Major'],
      [47, -30, 'Acidalia Planitia'],
    ],
    bright: [
      [-42, 70, 'Hellas'],
      [0, -112, 'Tharsis'],
    ],
  },
  mercury: {
    dark: [[-11, -45, 'llanura junto a Kuiper']],
    bright: [[-11.3, -31.5, 'cráter Kuiper (rayos)']],
    ratio: 0.8,
    radius: 2,
  },
};

/**
 * Sondas de pendiente de los mapas de normales (este, norte, arriba en RGB): la media de una caja
 * [latitud mín., latitud máx., longitud mín., longitud máx.] en laderas conocidas, que tiene que
 * inclinarse hacia donde mira (en su canal, más de 1 por encima o por debajo del valor de un terreno
 * llano del mismo mapa, `flat`: el Pacífico central). Con un canal invertido, fallan. Las laderas sur
 * del Himalaya, los Alpes y los Pirineos miran al sur (suben hacia el norte), y las norte de los Alpes
 * y los Pirineos, al norte; la occidental de los Andes centrales, al oeste, y la oriental, al este.
 */
const NORMAL_PROBES = {
  'earth-normal': {
    flat: [-10, 10, -160, -140],
    slopes: [
      { box: [27.2, 27.8, 84, 88], channel: 1, sign: -1, name: 'ladera sur del Himalaya' },
      { box: [45.6, 46.0, 8, 11], channel: 1, sign: -1, name: 'ladera sur de los Alpes' },
      { box: [42.2, 42.5, -1, 2], channel: 1, sign: -1, name: 'ladera sur de los Pirineos' },
      { box: [47.2, 47.6, 10, 13], channel: 1, sign: 1, name: 'ladera norte de los Alpes' },
      { box: [42.9, 43.2, -1, 2], channel: 1, sign: 1, name: 'ladera norte de los Pirineos' },
      { box: [-24, -18, -70.4, -69], channel: 0, sign: -1, name: 'ladera oeste de los Andes' },
      { box: [-24, -18, -66, -64.6], channel: 0, sign: 1, name: 'ladera este de los Andes' },
    ],
  },
};

/**
 * La Luna: las paredes interiores de Copérnico (9,621° N, 20,079° O, 96,1 km; Gazetteer, IAU/USGS,
 * Feature/1296), entre 1,05° y 1,5° de su centro: la norte mira al sur, la sur al norte, la este al
 * oeste y la oeste al este. El llano, el interior de Mare Imbrium.
 */
NORMAL_PROBES['moon-normal'] = {
  flat: [32, 37, -20, -10],
  slopes: [
    { box: [10.67, 11.12, -20.4, -19.76], channel: 1, sign: -1, name: 'pared norte de Copérnico' },
    { box: [8.12, 8.57, -20.4, -19.76], channel: 1, sign: 1, name: 'pared sur de Copérnico' },
    { box: [9.3, 9.95, -19.01, -18.56], channel: 0, sign: -1, name: 'pared este de Copérnico' },
    { box: [9.3, 9.95, -21.6, -21.14], channel: 0, sign: 1, name: 'pared oeste de Copérnico' },
  ],
};

/**
 * Elevación empaquetada (D15) en el intervalo [minM, maxM]: la del LOLA va de unos −9,1 a +10,8 km.
 * La resolución vertical es (maxM − minM) / 65 535: 0,31 m (la del LOLA es de 0,5 m).
 */
const ELEVATION_RANGE_M = { moon: { minM: -9500, maxM: 11000 } };

/** Comprueba las sondas de pendiente de un mapa de normales (falla si alguna se inclina al revés). */
async function checkNormalSlopes(id, file) {
  const probes = NORMAL_PROBES[id];
  if (!probes) return null;
  const { data, info } = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mean = ([lat0, lat1, lon0, lon1], channel) => {
    const y0 = Math.floor(((90 - lat1) / 180) * info.height);
    const y1 = Math.ceil(((90 - lat0) / 180) * info.height);
    const x0 = Math.floor(((lon0 + 180) / 360) * info.width);
    const x1 = Math.ceil(((lon1 + 180) / 360) * info.width);
    let sum = 0;
    let n = 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        sum += data[(y * info.width + x) * info.channels + channel];
        n++;
      }
    }
    return sum / n;
  };
  const results = probes.slopes.map(({ box, channel, sign, name }) => {
    const tilt = mean(box, channel) - mean(probes.flat, channel);
    return { name, tilt, ok: sign * tilt > 1 };
  });
  const show = (r) => `${r.name} ${r.tilt > 0 ? '+' : ''}${r.tilt.toFixed(1)}`;
  const wrong = results.filter((r) => !r.ok);
  if (wrong.length) {
    throw new Error(`Pendientes de «${id}» al revés: ${wrong.map(show).join(', ')}`);
  }
  return `${id} (${file.level}, respecto al llano): ${results.map(show).join(' · ')}`;
}

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 10);

/** Escribe un WebP con hash y devuelve su entrada del manifiesto. */
async function emit(id, level, pipeline, quality, { alpha = false, lossless = false } = {}) {
  const bytes = await pipeline
    .webp(
      lossless
        ? { lossless: true, effort: 6 }
        : { quality, effort: 6, ...(alpha ? { alphaQuality: 100 } : {}) },
    )
    .toBuffer();
  const meta = await sharp(bytes).metadata();
  const path = `textures/${level}/${id}.${sha(bytes)}.webp`;
  await writeFile(new URL(path, PUBLIC), bytes);
  return { level, path, width: meta.width, height: meta.height, bytes: bytes.byteLength };
}

/** Luminancia media (0–255) alrededor de un punto de un mapa equirrectangular decodificado. */
function luminanceAt({ data, info }, latDeg, lonDeg, radius = 4) {
  const x0 = Math.round((0.5 + lonDeg / 360) * info.width);
  const y0 = Math.round(((90 - latDeg) / 180) * info.height);
  let sum = 0;
  let n = 0;
  for (let j = -radius; j <= radius; j++) {
    for (let i = -radius; i <= radius; i++) {
      const x = (((x0 + i) % info.width) + info.width) % info.width;
      const y = Math.min(Math.max(y0 + j, 0), info.height - 1);
      const k = (y * info.width + x) * info.channels;
      sum += (data[k] + data[k + 1] + data[k + 2]) / 3;
      n++;
    }
  }
  return sum / n;
}

async function checkAlignment(id, file) {
  const probes = PROBES[id];
  if (!probes) return null;
  const image = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const ratio = probes.ratio ?? 0.6;
  const radius = probes.radius ?? 4;
  const measure = (shift) => {
    const dark = probes.dark.map(([lat, lon, name]) => [
      name,
      luminanceAt(image, lat, lon + shift, radius),
    ]);
    const bright = probes.bright.map(([lat, lon, name]) => [
      name,
      luminanceAt(image, lat, lon + shift, radius),
    ]);
    const limit = ratio * Math.min(...bright.map(([, l]) => l));
    return { dark, bright, wrong: dark.filter(([, l]) => l >= limit) };
  };
  const aligned = measure(0);
  if (aligned.wrong.length) {
    throw new Error(
      `Meridiano 0 de «${id}» mal alineado: ${aligned.wrong.map(([n]) => n).join(', ')}`,
    );
  }
  // La prueba tiene que discriminar: con el mapa girado 180°, alguna sonda debe fallar.
  if (measure(180).wrong.length === 0)
    throw new Error(`Las sondas de «${id}» no distinguen un giro de 180°`);
  const show = (list) => list.map(([n, l]) => `${n} ${Math.round(l)}`).join(', ');
  return `${id}: oscuros ${show(aligned.dark)} · claros ${show(aligned.bright)} (girado 180°, fallaría)`;
}

/**
 * Luminancia lineal media (Rec. 709) de un mapa equirrectangular de color, ponderada por el área de
 * cada fila (cos φ). Con ella, la escena lleva cada cuerpo a su albedo geométrico (D29).
 */
async function meanLuminance(file) {
  const { data, info } = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const linear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const table = Float64Array.from({ length: 256 }, (_, c) => linear(c));
  let sum = 0;
  let weights = 0;
  for (let y = 0; y < info.height; y++) {
    const weight = Math.cos((((y + 0.5) / info.height) * 2 - 1) * (Math.PI / 2));
    for (let x = 0; x < info.width; x++) {
      const k = (y * info.width + x) * info.channels;
      sum +=
        weight *
        (0.2126 * table[data[k]] + 0.7152 * table[data[k + 1]] + 0.0722 * table[data[k + 2]]);
      weights += weight;
    }
  }
  return sum / weights;
}

/** Perfil radial (alfa medio por columna) de la tira de los anillos. */
async function ringProfile(file) {
  const { data, info } = await sharp(fileURLToPath(new URL(file, SRC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const alpha = new Float64Array(info.width);
  for (let x = 0; x < info.width; x++) {
    let sum = 0;
    for (let y = 0; y < info.height; y++) sum += data[(y * info.width + x) * info.channels + 3];
    alpha[x] = sum / info.height / 255;
  }
  return alpha;
}

/** x (px) de la mayor caída del alfa (de ≥ 0,5 a ≤ 0,3 en 8 px) dentro de una ventana. */
function steepestDrop(alpha, from, to) {
  let best = null;
  for (let x = from; x < to; x++) {
    const before = alpha[x - 4];
    const after = alpha[x + 4];
    if (before >= 0.5 && after <= 0.3 && (!best || before - after > best.drop)) {
      best = { x, drop: before - after };
    }
  }
  if (!best) throw new Error(`No encuentro el borde de los anillos entre ${from} y ${to} px`);
  return best.x;
}

/** Los anillos de Saturno del catálogo (ficha de la NASA). */
const RINGS = BODY_DATA.saturno.rings;
if (!RINGS) throw new Error('Faltan los anillos de Saturno en body-data.ts');
/** Borde interior y anchura de la división de Encke en la ficha de los anillos de la NASA. */
const ENCKE_GAP_KM = { inner: 133410, width: 325 };

async function calibrateRings(file) {
  const bOuter = RINGS.cassiniInnerKm.value;
  const aOuter = RINGS.outerRadiusKm.value;
  const cInner = RINGS.innerRadiusKm.value;
  const alpha = await ringProfile(file);
  const width = alpha.length;
  // Ventanas: la división de Cassini y el borde exterior del anillo A están en el último tercio.
  const xB = steepestDrop(alpha, Math.round(width * 0.6), Math.round(width * 0.73));
  const xA = steepestDrop(alpha, Math.round(width * 0.9), Math.round(width * 0.97));
  const kmPerPx = (aOuter - bOuter) / (xA - xB);
  const inner = bOuter - xB * kmPerPx;
  const outer = inner + width * kmPerPx;
  // Comprobación independiente: el anillo C empieza (el alfa sube) en su radio de la NASA.
  const xC = Math.round((cInner - inner) / kmPerPx);
  const mean = (a, b) => alpha.slice(a, b).reduce((s, v) => s + v, 0) / (b - a);
  const before = mean(xC - 40, xC - 10);
  const after = mean(xC + 10, xC + 40);
  if (!(after > before + 0.04)) {
    throw new Error(
      `La calibración de los anillos no cuadra con el anillo C (${before} → ${after})`,
    );
  }
  // Segunda comprobación independiente: el mínimo de opacidad cerca de la división de Encke cae
  // dentro de ella (o a menos de su anchura).
  const enckeCenter = ENCKE_GAP_KM.inner + ENCKE_GAP_KM.width / 2;
  const xE = Math.round((enckeCenter - inner) / kmPerPx);
  let xMin = xE;
  for (let x = xE - 60; x <= xE + 60; x++) if (alpha[x] < alpha[xMin]) xMin = x;
  const enckeFound = inner + (xMin + 0.5) * kmPerPx;
  if (Math.abs(enckeFound - enckeCenter) > ENCKE_GAP_KM.width) {
    throw new Error(
      `La división de Encke no está donde dice la ficha (${Math.round(enckeFound)} km)`,
    );
  }
  return {
    inner: Math.round(inner),
    outer: Math.round(outer),
    kmPerPx,
    report: `anillos: borde exterior del B en x = ${xB} px y del A en x = ${xA} px → ${kmPerPx.toFixed(3)} km/px; la tira cubre de ${Math.round(inner)} a ${Math.round(outer)} km; el anillo C (${cInner} km) cae en x = ${xC} px, donde el alfa sube de ${before.toFixed(2)} a ${after.toFixed(2)}; la división de Encke (${Math.round(enckeCenter)} km) tiene su mínimo a ${Math.round(enckeFound - enckeCenter)} km`,
  };
}

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

/** Valor típico de un intervalo de la ficha: la media geométrica (la aritmética si empieza en 0). */
const typical = ([lo, hi]) => (lo > 0 ? Math.sqrt(lo * hi) : (lo + hi) / 2);

/**
 * Reflectividad de los anillos medida por el Hubble (F555W, banda V) a 6° de fase con los anillos
 * abiertos 23,6°: I/F = 0,4650 en el anillo B (100 000–107 000 km) y 0,2970 en el A
 * (127 000–129 000 km), del ajuste de la tabla 5 de Salo y French (2010), «The opposition and tilt
 * effects of Saturn's rings from HST observations», Icarus 210, 785 (arXiv:1007.0349). El albedo de
 * esos anillos en la tira es el que hace que el modelo de la escena (dispersión simple con la función
 * de fase de `data/photometry.ts`) dé esa reflectividad, sin salir del intervalo de la ficha de la
 * NASA. El C y la división de Cassini se quedan con el valor típico de la ficha.
 */
const RING_HST = {
  phaseDeg: 6,
  openingDeg: 23.6,
  rings: {
    B: { from: 100_000, to: 107_000, reflectance: 0.465 },
    A: { from: 127_000, to: 129_000, reflectance: 0.297 },
  },
};

/**
 * Cuánto puede subir o bajar el albedo de una columna por el detalle de la textura: acota los huecos
 * (la división de Encke, el borde del anillo C), donde la luminancia de la textura cae casi a 0 y la
 * profundidad óptica ya los oscurece.
 */
const RING_DETAIL = { min: 0.2, max: 2 };

/**
 * Tira física de los anillos (fase 3b): la estructura radial de la textura con la profundidad óptica
 * y el albedo de cada anillo de la ficha de la NASA, modulado por la luminancia de la textura (R1).
 * Devuelve la tira RGBA (8 bits, sRGB) y un informe. Falla si la mediana de τ de algún anillo queda
 * fuera de su intervalo.
 */
async function physicalRingStrip(file, calibration) {
  const { data, info } = await sharp(fileURLToPath(new URL(file, SRC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const radius = (x) => calibration.inner + (x + 0.5) * calibration.kmPerPx;
  // Por columna, la opacidad media de la textura y su profundidad óptica aparente, y la luminancia
  // lineal media de su color (el brillo que pinta: la estructura fina de cada anillo).
  const tauSource = new Float64Array(width);
  const lumSource = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    let a = 0;
    let l = 0;
    for (let y = 0; y < info.height; y++) {
      const k = (y * width + x) * info.channels;
      a += data[k + 3] / 255;
      l +=
        0.2126 * srgbToLinear(data[k] / 255) +
        0.7152 * srgbToLinear(data[k + 1] / 255) +
        0.0722 * srgbToLinear(data[k + 2] / 255);
    }
    tauSource[x] = -Math.log(1 - Math.min(a / info.height, 0.995));
    lumSource[x] = l / info.height;
  }
  const { regions } = RINGS;
  const bounds = [
    ['C', RINGS.innerRadiusKm.value, RINGS.bInnerKm.value, regions.c],
    ['B', RINGS.bInnerKm.value, RINGS.cassiniInnerKm.value, regions.b],
    ['Cassini', RINGS.cassiniInnerKm.value, RINGS.cassiniOuterKm.value, regions.cassini],
    ['A', RINGS.cassiniOuterKm.value, RINGS.outerRadiusKm.value, regions.a],
  ];
  const columnsOf = (from, to) => {
    const list = [];
    for (let x = 0; x < width; x++) if (radius(x) >= from && radius(x) < to) list.push(x);
    return list;
  };
  const quantile = (values, q) =>
    [...values].sort((p, r) => p - r)[Math.floor(q * (values.length - 1))];
  const median = (values) => quantile(values, 0.5);
  // Para cada anillo, una ley de potencia que lleva sus percentiles 10 y 90 de τ a los extremos del
  // intervalo de la ficha (conserva el orden y los contrastes de la estructura radial), su albedo, el
  // detalle de la textura (su luminancia respecto a la media donde se calibra el anillo: la ventana
  // del Hubble en el B y el A, el anillo entero en el C y la división de Cassini) y su color, medido
  // en la foto del Hubble.
  const fitted = bounds.map(([name, from, to, region]) => {
    const columns = columnsOf(from, to);
    const logs = columns.map((x) => Math.log(Math.max(tauSource[x], 1e-4)));
    const [lo, hi] = region.opticalDepth.value;
    const low = Math.log(Math.max(lo, hi / 20));
    const p10 = quantile(logs, 0.1);
    const p90 = quantile(logs, 0.9);
    const slope = (Math.log(hi) - low) / Math.max(p90 - p10, 1e-3);
    const sourceMedian = median(columns.map((x) => tauSource[x]));
    const hst = RING_HST.rings[name];
    const window = hst ? columnsOf(hst.from, hst.to) : columns;
    const detail = relativeDetail(lumSource, window[0], window.at(-1) + 1).map((v) =>
      Math.min(Math.max(v, RING_DETAIL.min), RING_DETAIL.max),
    );
    return {
      name,
      from,
      to,
      region,
      slope,
      intercept: low - slope * p10,
      albedo: typical(region.albedo.value),
      detail,
      chroma: RING_PHOTOMETRY.chromaticity[name],
      sourceMedian,
    };
  });
  // Mezcla suave entre anillos vecinos (±250 km en cada borde), en escala logarítmica para τ.
  const BLEND_KM = 250;
  const weightsAt = (r) => {
    const w = fitted.map((ring) => {
      const rise = smooth((r - (ring.from - BLEND_KM)) / (2 * BLEND_KM));
      const fall = 1 - smooth((r - (ring.to - BLEND_KM)) / (2 * BLEND_KM));
      return Math.min(rise, fall);
    });
    // Por dentro del C y por fuera del A, el anillo más cercano.
    if (r < fitted[0].from) w[0] = 1;
    if (r > fitted[fitted.length - 1].to) w[w.length - 1] = 1;
    const total = w.reduce((sum, v) => sum + v, 0) || 1;
    return w.map((v) => v / total);
  };
  const tauPhysical = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const w = weightsAt(radius(x));
    const logSource = Math.log(Math.max(tauSource[x], 1e-4));
    const logTau = fitted.reduce(
      (s, ring, j) => s + w[j] * (ring.intercept + ring.slope * logSource),
      0,
    );
    const ceiling = fitted.reduce((s, ring, j) => s + w[j] * ring.region.opticalDepth.value[1], 0);
    tauPhysical[x] = Math.min(Math.exp(logTau), 1.5 * ceiling);
  }
  // Albedo de los anillos B y A: el que da la reflectividad medida por el Hubble (RING_HST) en esa
  // zona, de media, con la τ y el detalle de cada columna, el Sol y la vista a la misma elevación y la
  // función de fase de la escena.
  const mu = Math.sin((RING_HST.openingDeg * Math.PI) / 180);
  const particles = RING_PHOTOMETRY.photometry;
  const phase =
    phaseFunction((RING_HST.phaseDeg * Math.PI) / 180, particles) / phaseFunction(0, particles);
  for (const ring of fitted) {
    const measured = RING_HST.rings[ring.name];
    if (!measured) continue;
    const columns = columnsOf(measured.from, measured.to);
    const tau = median(columns.map((x) => tauPhysical[x]));
    const reflected = columns.reduce(
      (s, x) => s + ring.detail[x] * ringReflectance(mu, mu, tauPhysical[x], true),
      0,
    );
    const model = (reflected / columns.length) * phase;
    const [lo, hi] = ring.region.albedo.value;
    ring.albedo = Math.min(Math.max(measured.reflectance / model, lo), hi);
    ring.calibration = `I/F ${measured.reflectance} del Hubble a ${RING_HST.phaseDeg}° con τ ${tau.toFixed(2)}`;
  }
  const strip = Buffer.alloc(width * RING_HEIGHT * 4);
  for (let x = 0; x < width; x++) {
    const w = weightsAt(radius(x));
    const tau = tauPhysical[x];
    const albedo = fitted.reduce((s, ring, j) => s + w[j] * ring.albedo * ring.detail[x], 0);
    const chroma = [0, 1, 2].map((i) =>
      fitted.reduce((s, ring, j) => s + w[j] * ring.chroma[i], 0),
    );
    const rgb = chroma.map((v) => Math.round(255 * linearToSrgb(Math.min(albedo * v, 1))));
    const alpha = Math.round(255 * (1 - Math.exp(-tau)));
    for (let y = 0; y < RING_HEIGHT; y++) {
      const k = (y * width + x) * 4;
      strip[k] = rgb[0];
      strip[k + 1] = rgb[1];
      strip[k + 2] = rgb[2];
      strip[k + 3] = alpha;
    }
  }
  // Comprobación: la mediana de τ de cada anillo, ya física, cae en el intervalo de la ficha.
  const lines = fitted.map((ring) => {
    const columns = columnsOf(ring.from, ring.to);
    const after = median(columns.map((x) => tauPhysical[x]));
    const [lo, hi] = ring.region.opticalDepth.value;
    if (after < lo || after > hi) {
      throw new Error(
        `La τ del anillo ${ring.name} (${after.toFixed(2)}) no está en [${lo}, ${hi}]`,
      );
    }
    const [albedoLo, albedoHi] = ring.region.albedo.value;
    const albedoSource = ring.calibration ?? 'típico de la ficha';
    // El contraste de la estructura fina: desviación / media del detalle en bandas de 500 km.
    const bands = [];
    for (let km = ring.from; km + 500 <= ring.to; km += 500) {
      const cols = columnsOf(km, km + 500);
      bands.push(cols.reduce((s, x) => s + ring.detail[x], 0) / cols.length);
    }
    const mean = bands.reduce((s, v) => s + v, 0) / bands.length;
    const sd = Math.sqrt(bands.reduce((s, v) => s + (v - mean) ** 2, 0) / bands.length);
    const values = columns.map((x) => ring.detail[x]);
    const range = `×${Math.min(...values).toFixed(2)}–${Math.max(...values).toFixed(2)}`;
    return `${ring.name}: τ mediana ${ring.sourceMedian.toFixed(2)} → ${after.toFixed(2)} (ficha ${lo}–${hi}), albedo ${ring.albedo.toFixed(3)} (${albedoSource}; ficha ${albedoLo}–${albedoHi}), detalle de la textura ${range} (contraste ${(sd / mean).toFixed(3)} en bandas de 500 km), color ${ring.chroma.map((v) => v.toFixed(2)).join('/')}`;
  });
  return {
    image: () => sharp(strip, { raw: { width, height: RING_HEIGHT, channels: 4 } }),
    report: `anillos físicos: ${lines.join(' · ')}`,
  };
}

/**
 * Lleva el océano de la textura de día a OCEAN_CHROMA (fase 3b, arreglo de base de la Tierra). En el
 * agua de la máscara, cada píxel se multiplica por la ganancia por canal que lleva el océano abierto
 * a ese color y conserva su luminancia: se mantienen el detalle y las diferencias de las aguas
 * someras. Los píxeles poco azules (hielo marino, costas) apenas cambian. Se hace al tamaño del nivel
 * mayor (4096 px) y falla si el océano abierto no queda en el color medido.
 */
async function correctOcean(file, maskFile, width) {
  const height = width / 2;
  const read = (name, data) =>
    sharp(fileURLToPath(new URL(name, SRC)), { limitInputPixels: false, ignoreIcc: data }).resize(
      width,
      height,
      { fit: 'fill', kernel: 'lanczos3' },
    );
  const color = await read(file, false).removeAlpha().raw().toBuffer();
  const mask = await read(maskFile, true).toColourspace('b-w').raw().toBuffer();
  const table = Float64Array.from({ length: 256 }, (_, c) => srgbToLinear(c / 255));
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const pixels = width * height;
  const linear = new Float64Array(pixels * 3);
  for (let i = 0; i < pixels * 3; i++) linear[i] = table[color[i]];
  // Océano abierto: agua en toda la máscara y muy azul. Media ponderada por el área (cos φ).
  const blueness = (p) =>
    linear[3 * p + 2] / Math.max(lum(linear[3 * p], linear[3 * p + 1], linear[3 * p + 2]), 1e-6);
  const open = new Uint8Array(pixels);
  for (let p = 0; p < pixels; p++) open[p] = mask[p] >= 250 && blueness(p) > 2 ? 1 : 0;
  const chromaOf = (values) => {
    const sum = [0, 0, 0];
    for (let y = 0; y < height; y++) {
      const weight = Math.cos((((y + 0.5) / height) * 2 - 1) * (Math.PI / 2));
      for (let x = 0; x < width; x++) {
        const p = y * width + x;
        if (!open[p]) continue;
        for (let c = 0; c < 3; c++) sum[c] += weight * values[3 * p + c];
      }
    }
    const l = lum(...sum);
    return sum.map((v) => v / l);
  };
  const before = chromaOf(linear);
  const gains = OCEAN_CHROMA.map((v, c) => v / before[c]);
  const corrected = new Float64Array(pixels * 3);
  const out = Buffer.alloc(pixels * 3);
  for (let p = 0; p < pixels; p++) {
    const [r, g, b] = [linear[3 * p], linear[3 * p + 1], linear[3 * p + 2]];
    const l = lum(r, g, b);
    const weight = (mask[p] / 255) * smooth((blueness(p) - 1.2) / 0.8);
    const scaled = [r * gains[0], g * gains[1], b * gains[2]];
    const keep = l / Math.max(lum(...scaled), 1e-9);
    [r, g, b].forEach((v, c) => {
      const value = v + weight * (scaled[c] * keep - v);
      corrected[3 * p + c] = value;
      out[3 * p + c] = Math.round(255 * linearToSrgb(Math.min(Math.max(value, 0), 1)));
    });
  }
  const after = chromaOf(corrected);
  if (after.some((v, c) => Math.abs(v - OCEAN_CHROMA[c]) > 0.03)) {
    throw new Error(`El océano de la Tierra no queda en el color medido: ${after.join(', ')}`);
  }
  const show = (v) => v.map((x) => x.toFixed(3)).join('/');
  return {
    image: () => sharp(out, { raw: { width, height, channels: 3 } }),
    report: `océano de la Tierra: abierto ${show(before)} → ${show(after)} (EPIC ${show(OCEAN_CHROMA)}), ganancias ${show(gains)}, conservando la luminancia de cada píxel`,
  };
}

/**
 * Orientación del panorama de la Vía Láctea (coordenadas galácticas, l = 0 en el centro y creciendo
 * hacia la izquierda, el norte galáctico arriba): falla si no está como se espera.
 */
async function checkPanorama(file) {
  const image = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  // u = 0,5 − l/360: en luminanceAt, la «longitud» es −l.
  const at = (l, b, radius = 6) => luminanceAt(image, b, -l, radius);
  const center = at(0, 0);
  const anticenter = at(180, 0);
  const poles = Math.max(at(0, 89), at(0, -89));
  const lmc = at(280.4652, -32.8884, 3);
  const mirrored = at(79.5348, -32.8884, 3);
  if (!(center > 2 * poles && center > 2 * anticenter && lmc > 1.5 * mirrored)) {
    throw new Error(
      `La Vía Láctea no está orientada como se espera (centro ${center}, anticentro ${anticenter}, polos ${poles}, Nube de Magallanes ${lmc} frente a ${mirrored})`,
    );
  }
  return `vía láctea: centro galáctico ${Math.round(center)} · anticentro ${Math.round(anticenter)} · polos ${Math.round(poles)} · Gran Nube de Magallanes ${Math.round(lmc)} frente a ${Math.round(mirrored)} en el punto simétrico`;
}

// --- Generación ----------------------------------------------------------------------------------
for (const [level] of LEVELS) {
  const dir = new URL(`textures/${level}/`, PUBLIC);
  await mkdir(dir, { recursive: true });
  for (const name of await readdir(dir)) if (name.endsWith('.webp')) await rm(new URL(name, dir));
}

const files = {};
const luminance = {};
const reports = [];
let ringStrip = null;
for (const [id, spec] of Object.entries(TEXTURES)) {
  if (OMITTED[id]) {
    console.log(`${id}: omitida (${OMITTED[id]})`);
    continue;
  }
  if (spec.kind === 'relief') {
    // Mapas de normales: uno por nivel, calculado del modelo remuestreado a ese tamaño (las
    // pendientes son las de esa resolución) y comprobado contra su textura de color.
    const dem = DEMS[spec.dem];
    const list = [];
    for (const [level, width] of LEVELS) {
      if (width > (spec.maxWidth ?? DEFAULT_MAX_WIDTH)) continue;
      const elevation = await loadElevation(spec.dem, width);
      if (level === (spec.checkLevel ?? '1k')) {
        reports.push(checkElevation(spec.dem, elevation, width));
        const colorFile = files[spec.color]?.find((file) => file.level === level);
        if (!colorFile)
          throw new Error(`Falta la textura de color «${spec.color}» para comprobar el relieve`);
        const color = await sharp(fileURLToPath(new URL(colorFile.path, PUBLIC)))
          .raw()
          .toBuffer({ resolveWithObject: true });
        reports.push(
          checkAlignmentWithColor(spec.dem, elevation, {
            data: color.data,
            width: color.info.width,
            height: color.info.height,
            channels: color.info.channels,
          }),
        );
      }
      const normals = normalMap(
        elevation,
        width,
        width / 2,
        dem.radiusM,
        dem.exaggeration,
        dem.minCosLat,
      );
      const pipeline = sharp(normals, { raw: { width, height: width / 2, channels: 3 } });
      list.push(await emit(id, level, pipeline, spec.quality));
    }
    files[id] = list;
    const slopes = await checkNormalSlopes(id, list.find((f) => f.level === '2k') ?? list[0]);
    if (slopes) reports.push(slopes);
    console.log(
      `${id}: ${list.map((f) => `${f.level} ${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`,
    );
    continue;
  }
  if (spec.kind === 'polar-relief') {
    // Un atlas por nivel (n = la mitad del ancho), con sus comprobaciones: la proyección de cada modelo
    // polar, Shackleton y el acuerdo con las normales equirrectangulares donde se mezclan.
    const list = [];
    for (const [level, width] of LEVELS) {
      if (width > spec.maxWidth) continue;
      const { normals, report } = await buildPolarNormalAtlas(width / 2);
      const pipeline = sharp(normals, { raw: { width, height: width / 2, channels: 3 } });
      list.push(await emit(id, level, pipeline, spec.quality));
      if (width === spec.maxWidth) reports.push(report);
    }
    files[id] = list;
    console.log(
      `${id}: ${list.map((f) => `${f.level} ${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`,
    );
    continue;
  }
  if (spec.kind === 'elevation') {
    // La elevación remuestreada a cada nivel, en 16 bits (R alto, G bajo), en WebP sin pérdidas: con
    // pérdidas, el byte bajo sería ruido. Se comprueba que se decodifica igual, byte a byte.
    const { minM, maxM } = ELEVATION_RANGE_M[spec.dem];
    const list = [];
    for (const [level, width] of LEVELS) {
      if (width > (spec.maxWidth ?? DEFAULT_MAX_WIDTH)) continue;
      const elevation = await loadElevation(spec.dem, width);
      const packed = packElevation16(elevation, minM, maxM);
      const pipeline = sharp(packed, { raw: { width, height: width / 2, channels: 3 } });
      const file = await emit(id, level, pipeline, 100, { lossless: true });
      const decoded = await sharp(fileURLToPath(new URL(file.path, PUBLIC)))
        .raw()
        .toBuffer({ resolveWithObject: true });
      for (let i = 0; i < elevation.length; i++) {
        const k = i * decoded.info.channels;
        if (decoded.data[k] !== packed[3 * i] || decoded.data[k + 1] !== packed[3 * i + 1]) {
          throw new Error(
            `La elevación «${id}» (${level}) no se decodifica igual en el píxel ${i}`,
          );
        }
      }
      list.push(file);
    }
    files[id] = list;
    reports.push(
      `${id}: 16 bits en R y G, sin pérdidas, de ${minM} a ${maxM} m (resolución vertical ${((maxM - minM) / 65535).toFixed(2)} m); se decodifica igual byte a byte`,
    );
    console.log(
      `${id}: ${list.map((f) => `${f.level} ${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`,
    );
    continue;
  }
  const input = fileURLToPath(new URL(spec.file, SRC));
  let sourceWidth;
  let base;
  {
    const data = spec.kind === 'normal' || spec.kind === 'gray';
    sourceWidth = (await sharp(input, { limitInputPixels: false }).metadata()).width;
    base = () => sharp(input, { limitInputPixels: false, ignoreIcc: data });
  }
  if (spec.ocean) {
    const ocean = await correctOcean(spec.file, spec.ocean, LEVELS.at(-1)[1]);
    reports.push(ocean.report);
    base = ocean.image;
  }
  // El panorama, sin sus estrellas (las pone el catálogo HYG, nítidas y en su sitio): una mediana de
  // 5 × 5 px en el original las quita y conserva la luz difusa, las nubes de estrellas y el polvo. Con
  // ellas, en los primeros planos salían como trazos (la proyección equirrectangular galáctica las
  // estira lejos del plano de la Galaxia) y el grano doblaba el peso. Sin el detalle de las estrellas,
  // el nivel de 4k ya no aporta nada sobre el de 2k y costaría 43 MB de VRAM: se genera hasta 2k.
  if (spec.kind === 'panorama') {
    const filtered = await base().median(5).png({ compressionLevel: 1 }).toBuffer();
    base = () => sharp(filtered, { limitInputPixels: false });
  }
  if (spec.kind === 'ring') {
    ringStrip = await calibrateRings(spec.file);
    reports.push(ringStrip.report);
    const physical = await physicalRingStrip(spec.file, ringStrip);
    reports.push(physical.report);
    base = physical.image;
  }
  const list = [];
  for (const [level, width] of LEVELS) {
    if (width > sourceWidth || width > (spec.maxWidth ?? DEFAULT_MAX_WIDTH)) continue;
    let pipeline = base();
    if (spec.kind === 'ring') {
      pipeline = pipeline.resize(width, RING_HEIGHT, { fit: 'fill', kernel: 'lanczos3' });
    } else {
      pipeline = pipeline.resize(width, width / 2, { fit: 'fill', kernel: 'lanczos3' });
    }
    if (spec.kind === 'gray') pipeline = pipeline.toColourspace('b-w');
    // G ← 255 − G: el norte en G (ver `flipGreen`).
    if (spec.flipGreen) pipeline = pipeline.removeAlpha().linear([1, -1, 1], [0, 255, 0]);
    // El panorama sin estrellas se ve ampliado en los primeros planos (un píxel de 2k mide 0,18°): un
    // desenfoque leve quita las manchas de la mediana y de la compresión.
    if (spec.kind === 'panorama') pipeline = pipeline.blur(level === '1k' ? 0.6 : 1);
    list.push(await emit(id, level, pipeline, spec.quality, { alpha: spec.kind === 'ring' }));
  }
  files[id] = list;
  if (spec.kind === 'color') luminance[id] = Number((await meanLuminance(list[0])).toFixed(4));
  const report =
    spec.kind === 'panorama' ? await checkPanorama(list[0]) : await checkAlignment(id, list[0]);
  if (report) reports.push(report);
  // Las pendientes, en el nivel de 2k (en el de 1k, las laderas de los Alpes miden un par de píxeles).
  const slopes = await checkNormalSlopes(id, list.find((f) => f.level === '2k') ?? list[0]);
  if (slopes) reports.push(slopes);
  console.log(
    `${id}: ${list.map((f) => `${f.level} ${(f.bytes / 1024).toFixed(0)} kB`).join(' · ')}`,
  );
}

const today = new Date().toISOString().slice(0, 10);
const entries = Object.entries(files)
  .map(([id, list]) => {
    const items = list
      .map(
        (f) =>
          `    { level: '${f.level}', path: '${f.path}', width: ${f.width}, height: ${f.height}, bytes: ${f.bytes} },`,
      )
      .join('\n');
    return `  '${id}': [\n${items}\n  ],`;
  })
  .join('\n');
const ts = `// GENERADO por scripts/build-textures.mjs el ${today}. No se edita a mano.
// WebP por niveles con hash (public/textures/), a partir de los originales de assets-src/textures/
// (origen y licencia de cada uno en docs/FUENTES.md).
import type { TextureFiles, TextureId } from './textures';

export const TEXTURE_FILES: TextureFiles = {
${entries}
};

/**
 * Luminancia lineal media (Rec. 709) de cada mapa de color, ponderada por el área (cos φ), medida en
 * el nivel 1k: con ella, la escena lleva cada cuerpo a su albedo geométrico (D29).
 */
export const TEXTURE_MEAN_LUMINANCE: Readonly<Partial<Record<TextureId, number>>> = ${JSON.stringify(luminance)};

/**
 * Radios (km) que cubre la tira de los anillos de Saturno, calibrada con los bordes exteriores de los
 * anillos B y A de la ficha de la NASA.
 */
export const SATURN_RING_STRIP_KM = { inner: ${ringStrip.inner}, outer: ${ringStrip.outer} } as const;

/**
 * Intervalo (m) de la elevación de la Luna empaquetada en 16 bits («moon-elevation», D15): un valor v
 * de 0 a 65 535 vale minM + v / 65 535 · (maxM − minM) sobre la esfera de 1737,4 km.
 */
export const MOON_ELEVATION_RANGE_M = { min: ${ELEVATION_RANGE_M.moon.minM}, max: ${ELEVATION_RANGE_M.moon.maxM} } as const;
`;
const target = new URL('src/app/scene/texture-files.ts', ROOT);
await writeFile(target, ts);
execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/scene/texture-files.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
);
console.log('\nComprobaciones:\n' + reports.map((r) => `- ${r}`).join('\n'));
