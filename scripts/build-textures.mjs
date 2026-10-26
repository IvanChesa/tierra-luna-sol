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
//   anillo (C, B, A y la división de Cassini) a la profundidad óptica normal y al albedo de la ficha;
//   la textura solo aporta el matiz del color. El alfa de la tira es la opacidad vista de frente,
//   1 − e^(−τ), y su color, el albedo.
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
import {
  DEMS,
  checkAlignmentWithColor,
  checkElevation,
  loadElevation,
  normalMap,
} from './build-relief.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets-src/textures/', ROOT);
const PUBLIC = new URL('public/', ROOT);
const LEVELS = [
  ['1k', 1024],
  ['2k', 2048],
  ['4k', 4096],
];
/** Alto de la tira de los anillos (la escena solo lee una fila: basta con unos píxeles). */
const RING_HEIGHT = 16;

/**
 * kind: color (sRGB), gray (datos en escala de grises, sin espacio de color), normal (datos RGB),
 * ring (tira RGBA de los anillos), panorama (cielo en coordenadas galácticas), relief (mapa de normales
 * calculado con build-relief.mjs a partir de un modelo de elevación; `color`: la textura con la que
 * se comprueba la alineación).
 */
const TEXTURES = {
  mercury: { file: '8k_mercury.jpg', kind: 'color', quality: 80 },
  venus: { file: '4k_venus_atmosphere.jpg', kind: 'color', quality: 80 },
  'earth-day': { file: '8k_earth_daymap.jpg', kind: 'color', quality: 82 },
  'earth-night': { file: '8k_earth_nightmap.jpg', kind: 'color', quality: 80 },
  'earth-clouds': { file: '8k_earth_clouds.jpg', kind: 'gray', quality: 80 },
  'earth-normal': { file: '8k_earth_normal_map.tif', kind: 'normal', quality: 90 },
  'earth-specular': { file: '8k_earth_specular_map.tif', kind: 'gray', quality: 85 },
  moon: { file: 'lroc_color_poles_4k.tif', kind: 'color', quality: 82 },
  mars: { file: '8k_mars.jpg', kind: 'color', quality: 80 },
  jupiter: { file: '8k_jupiter.jpg', kind: 'color', quality: 80 },
  saturn: { file: '8k_saturn.jpg', kind: 'color', quality: 80 },
  'saturn-rings': { file: '8k_saturn_ring_alpha.png', kind: 'ring', quality: 90 },
  'mercury-normal': { dem: 'mercury', kind: 'relief', color: 'mercury', quality: 85 },
  'mars-normal': { dem: 'mars', kind: 'relief', color: 'mars', quality: 85 },
  uranus: { file: '2k_uranus.jpg', kind: 'color', quality: 82 },
  neptune: { file: '2k_neptune.jpg', kind: 'color', quality: 82 },
  'milky-way': { file: 'eso0932a.tif', kind: 'panorama', quality: 70 },
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

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 10);

/** Escribe un WebP con hash y devuelve su entrada del manifiesto. */
async function emit(id, level, pipeline, quality, { alpha = false } = {}) {
  const bytes = await pipeline
    .webp({ quality, effort: 6, ...(alpha ? { alphaQuality: 100 } : {}) })
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
/**
 * Matiz de cada anillo (RGB lineal / luminancia), medido en la foto del Hubble de Saturno del
 * 20-06-2019 (OPAL, NASA/ESA) a lo largo del ansa derecha: el color de la textura en los anillos
 * tenues no es fiable (salía morado en el C).
 */
const RING_TINTS = {
  C: [0.97, 0.97, 1.35],
  B: [0.94, 1.01, 1.07],
  Cassini: [0.98, 0.98, 1.29],
  A: [1.0, 0.99, 1.08],
};

/** Valor típico de un intervalo de la ficha: la media geométrica (la aritmética si empieza en 0). */
const typical = ([lo, hi]) => (lo > 0 ? Math.sqrt(lo * hi) : (lo + hi) / 2);

/**
 * Tira física de los anillos (fase 3b): la estructura radial de la textura con la profundidad óptica
 * y el albedo de cada anillo de la ficha de la NASA. Devuelve la tira RGBA (8 bits, sRGB) y un
 * informe. Falla si la mediana de τ de algún anillo queda fuera de su intervalo.
 */
async function physicalRingStrip(file, calibration) {
  const { data, info } = await sharp(fileURLToPath(new URL(file, SRC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = info.width;
  const radius = (x) => calibration.inner + (x + 0.5) * calibration.kmPerPx;
  // Por columna, la opacidad media de la textura y su profundidad óptica aparente.
  const tauSource = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    let a = 0;
    for (let y = 0; y < info.height; y++) a += data[(y * width + x) * info.channels + 3] / 255;
    tauSource[x] = -Math.log(1 - Math.min(a / info.height, 0.995));
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
  // intervalo de la ficha (conserva el orden y los contrastes de la estructura radial), su albedo y
  // su matiz, medido en la foto del Hubble.
  const fitted = bounds.map(([name, from, to, region]) => {
    const columns = columnsOf(from, to);
    const logs = columns.map((x) => Math.log(Math.max(tauSource[x], 1e-4)));
    const [lo, hi] = region.opticalDepth.value;
    const low = Math.log(Math.max(lo, hi / 20));
    const p10 = quantile(logs, 0.1);
    const p90 = quantile(logs, 0.9);
    const slope = (Math.log(hi) - low) / Math.max(p90 - p10, 1e-3);
    const sourceMedian = median(columns.map((x) => tauSource[x]));
    return {
      name,
      from,
      to,
      region,
      slope,
      intercept: low - slope * p10,
      albedo: typical(region.albedo.value),
      chroma: RING_TINTS[name],
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
  const strip = Buffer.alloc(width * RING_HEIGHT * 4);
  const tauPhysical = new Float64Array(width);
  for (let x = 0; x < width; x++) {
    const w = weightsAt(radius(x));
    const logSource = Math.log(Math.max(tauSource[x], 1e-4));
    const logTau = fitted.reduce(
      (s, ring, j) => s + w[j] * (ring.intercept + ring.slope * logSource),
      0,
    );
    const ceiling = fitted.reduce((s, ring, j) => s + w[j] * ring.region.opticalDepth.value[1], 0);
    const tau = Math.min(Math.exp(logTau), 1.5 * ceiling);
    tauPhysical[x] = tau;
    const albedo = fitted.reduce((s, ring, j) => s + w[j] * ring.albedo, 0);
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
    return `${ring.name}: τ mediana ${ring.sourceMedian.toFixed(2)} → ${after.toFixed(2)} (ficha ${lo}–${hi}), albedo ${ring.albedo.toFixed(2)}, matiz ${ring.chroma.map((v) => v.toFixed(2)).join('/')}`;
  });
  return {
    image: () => sharp(strip, { raw: { width, height: RING_HEIGHT, channels: 4 } }),
    report: `anillos físicos: ${lines.join(' · ')}`,
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
      const elevation = await loadElevation(spec.dem, width);
      if (level === '1k') {
        reports.push(checkElevation(spec.dem, elevation, width));
        const colorFile = files[spec.color]?.[0];
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
      const normals = normalMap(elevation, width, width / 2, dem.radiusM, dem.exaggeration);
      const pipeline = sharp(normals, { raw: { width, height: width / 2, channels: 3 } });
      list.push(await emit(id, level, pipeline, spec.quality));
    }
    files[id] = list;
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
  if (spec.kind === 'ring') {
    ringStrip = await calibrateRings(spec.file);
    reports.push(ringStrip.report);
    const physical = await physicalRingStrip(spec.file, ringStrip);
    reports.push(physical.report);
    base = physical.image;
  }
  const list = [];
  for (const [level, width] of LEVELS) {
    if (width > sourceWidth) continue;
    let pipeline = base();
    if (spec.kind === 'ring') {
      pipeline = pipeline.resize(width, RING_HEIGHT, { fit: 'fill', kernel: 'lanczos3' });
    } else {
      pipeline = pipeline.resize(width, width / 2, { fit: 'fill', kernel: 'lanczos3' });
    }
    if (spec.kind === 'gray') pipeline = pipeline.toColourspace('b-w');
    // El panorama lleva el grano de las estrellas débiles, que dobla el peso sin aportar nada como
    // fondo (las estrellas las pone el catálogo HYG): un desenfoque leve lo deja dentro de §5.
    if (spec.kind === 'panorama') pipeline = pipeline.blur(level === '4k' ? 0.8 : 0.5);
    list.push(await emit(id, level, pipeline, spec.quality, { alpha: spec.kind === 'ring' }));
  }
  files[id] = list;
  if (spec.kind === 'color') luminance[id] = Number((await meanLuminance(list[0])).toFixed(4));
  const report =
    spec.kind === 'panorama' ? await checkPanorama(list[0]) : await checkAlignment(id, list[0]);
  if (report) reports.push(report);
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
