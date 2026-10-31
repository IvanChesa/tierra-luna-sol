// Genera las texturas de la escena (D17, D18): WebP por niveles (1k, 2k y 4k, nunca más que el
// original) con hash en el nombre, en public/textures/{nivel}/, y el manifiesto de ficheros
// src/app/scene/texture-files.ts (GENERADO: no se edita a mano).
// Uso: node scripts/download-assets.mjs && node scripts/build-textures.mjs
//
// Además comprueba lo que no se puede dar por supuesto:
// - Alineación del meridiano 0 de los mapas de superficie: en cada uno, unos puntos conocidos
//   (mares lunares, Syrtis Major, el Sáhara…) tienen que ser oscuros o claros donde toca. Con el
//   mapa girado 180°, las sondas fallan.
// - La tira de los anillos de Saturno (fase 7, D36): su profundidad óptica, de una ocultación de
//   Cassini (scripts/ring-profile.mjs), comprobada con los radios publicados de sus divisiones
//   (Colombo, Maxwell, Huygens, Encke y Keeler) y de sus bordes (data/saturn-rings.ts); el color de
//   cada anillo, de su reflectividad por bandas medida por el Hubble (`RING_SPECTRA`), y su albedo,
//   el de la ficha de la NASA calibrado con esas medidas. El alfa de la tira es la opacidad vista de
//   frente, 1 − e^(−τ), y su color, el albedo.
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
import { RING_PHOTOMETRY, RING_SPECTRA } from '../src/app/data/photometry.ts';
import { SATURN_RING_FEATURES } from '../src/app/data/saturn-rings.ts';
import {
  bandChromaticity,
  phaseFunction,
  ringReflectance,
} from '../src/app/ephemeris/photometry.ts';
import { OCEAN_CHROMA } from './reference-colors.mjs';
import {
  DEMS,
  checkAlignmentWithColor,
  checkElevation,
  loadElevation,
  normalMap,
  packElevation16,
} from './build-relief.mjs';
import { POLAR_EDGE_DEG, buildPolarNormalAtlas } from './lola-polar.mjs';
import { checkMosaicProbes, loadMosaic } from './usgs-mosaic.mjs';
import { checkRingFeatures, loadUvisProfile, ringStripTau } from './ring-profile.mjs';

const ROOT = new URL('../', import.meta.url);
const SRC = new URL('assets-src/textures/', ROOT);
const RINGS_SRC = new URL('assets-src/rings/', ROOT);
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
 * ring-profile (la tira RGBA de los anillos, de una ocultación: `profile`, de `innerKm` a `outerKm`),
 * panorama (cielo en coordenadas galácticas), relief (mapa de normales
 * calculado con build-relief.mjs a partir de un modelo de elevación; `color`: la textura con la que
 * se comprueba la alineación). `ocean`: máscara del agua con la que se corrige el color del océano
 * (OCEAN_CHROMA). `maxWidth`: el nivel más grande que se genera (4k si no se dice; 8k solo la
 * textura de día de la Tierra, en el nivel alto, fase 5, y el color de la Luna, fase 6). elevation:
 * la elevación de un modelo en 16 bits empaquetados en R y G (D15), sin pérdidas, para desplazar los
 * vértices (la Luna, fase 6). polar-relief: el atlas de normales de los casquetes polares de la Luna
 * (scripts/lola-polar.mjs; revisión de la fase 6): 2n × n px, el sur a la izquierda y el norte a la
 * derecha. mosaic: el mosaico global de una luna del USGS o del PDS (scripts/usgs-mosaic.mjs, fase 7),
 * con sondas de rasgos con nombre (`MOSAIC_PROBES`); `band`: solo ese canal, en gris.
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
  // Los anillos de Saturno (fase 7, D36): la τ de la ocultación de β Centauri de Cassini UVIS, de
  // 74 000 km (por dentro del anillo C) a 141 000 km (por fuera del F): 8,2 km por píxel en 8k.
  'saturn-rings': {
    kind: 'ring-profile',
    profile: 'UVIS_HSP_2008_231_BETCEN_I_TAU01KM.TAB',
    innerKm: 74_000,
    outerKm: 141_000,
    quality: 90,
    maxWidth: 8192,
  },
  'mercury-normal': { dem: 'mercury', kind: 'relief', color: 'mercury', quality: 85 },
  'mars-normal': { dem: 'mars', kind: 'relief', color: 'mars', quality: 85 },
  // Sus extremos se comprueban en 2k: en 1k, con píxeles de ~10 km, el punto más bajo cae en otro
  // sitio de la cuenca Polo Sur–Aitken, a 13° de Antoniadi.
  'moon-normal': { dem: 'moon', kind: 'relief', color: 'moon', quality: 85, checkLevel: '2k' },
  // La malla de la Luna se desplaza con esta elevación: sus vértices están a 0,7° en el ecuador en el
  // nivel alto (512 por vuelta), y la de 1k (0,35° por píxel, cada uno la media de su área) ya da dos
  // muestras por vértice; la de 2k pesaba 2,7 MiB (0,7 la de 1k) y ocupaba 8 MiB de VRAM (2 la de 1k)
  // sin verse (revisión de la fase 6, sugerencia 12).
  'moon-elevation': { dem: 'moon', kind: 'elevation', maxWidth: 1024 },
  // Sus casquetes polares, por encima de 76° (revisión de la fase 6, hallazgo 1): las normales de los
  // modelos polares del LOLA, a 893 m por píxel en 2k, sin el «sol de rayas» del equirrectangular.
  'moon-normal-poles': { kind: 'polar-relief', quality: 85, maxWidth: 2048 },
  // Las lunas (fase 7): mosaicos globales del USGS Astrogeology (Mimas, del PDS), en 1k y 2k (§5:
  // ≤ 300 kB por luna en el nivel bajo). Deimos, Proteo y las de Urano no tienen ninguno; el de Titán
  // (ISS, 938 nm) es su superficie bajo la neblina, que en luz visible no se ve: no se usa.
  phobos: { file: 'Phobos_Viking_Mosaic_40ppd_DLRcontrol.tif', kind: 'mosaic', quality: 80 },
  io: { file: 'Io_GalileoSSI-Voyager_Global_Mosaic_1km.tif', kind: 'mosaic', quality: 80 },
  europa: { file: 'Europa_Voyager_GalileoSSI_global_mosaic_500m.tif', kind: 'mosaic', quality: 80 },
  ganymede: {
    file: 'Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif',
    kind: 'mosaic',
    quality: 80,
  },
  callisto: {
    file: 'Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif',
    kind: 'mosaic',
    quality: 80,
  },
  mimas: { file: 'SM_1M_0_0_SIMP.IMG', kind: 'mosaic', quality: 80 },
  enceladus: { file: 'Enceladus_Cassini_mosaic_global_110m.tif', kind: 'mosaic', quality: 80 },
  tethys: { file: 'Tethys_Cassini_mosaic_global_293m.tif', kind: 'mosaic', quality: 80 },
  dione: { file: 'Dione_Cassini_Voyager_mosaic_global_154m.tif', kind: 'mosaic', quality: 80 },
  rhea: { file: 'Rhea_Cassini_Voyager_mosaic_global_417m.tif', kind: 'mosaic', quality: 80 },
  iapetus: { file: 'Iapetus_Cassini_Voyager_mosaic_global_783m.tif', kind: 'mosaic', quality: 80 },
  // Tritón: un mosaico en falso color (naranja, violeta y ultravioleta en R, G y B); solo su canal
  // naranja, el más cercano al visible, en gris.
  triton: {
    file: 'Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif',
    kind: 'mosaic',
    quality: 80,
    band: 0,
  },
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

/** Los anillos de Saturno del catálogo (ficha de la NASA): el intervalo del albedo de cada uno. */
const RINGS = BODY_DATA.saturno.rings;
if (!RINGS) throw new Error('Faltan los anillos de Saturno en body-data.ts');

const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const linearToSrgb = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);
const smooth = (t) => {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
};

/** Valor típico de un intervalo de la ficha: la media geométrica (la aritmética si empieza en 0). */
const typical = ([lo, hi]) => (lo > 0 ? Math.sqrt(lo * hi) : (lo + hi) / 2);

/**
 * Las regiones de los anillos (radios publicados, `data/saturn-rings.ts`), con el intervalo de su
 * albedo en la ficha de la NASA, el espectro del que sale su color (`RING_SPECTRA.colorFrom`) y, en el
 * C, el B y el A, la ventana donde el Hubble midió su reflectividad (Salo y French, 2010).
 */
const RING_REGIONS = (() => {
  const f = SATURN_RING_FEATURES;
  const { regions } = RINGS;
  return [
    ['C', f.cInnerKm, f.bInnerKm, regions.c, [78_000, 83_000]],
    ['B', f.bInnerKm, f.bOuterKm, regions.b, [100_000, 107_000]],
    ['Cassini', f.bOuterKm, f.aInnerKm, regions.cassini, null],
    ['A', f.aInnerKm, f.aOuterKm, regions.a, [127_000, 129_000]],
  ].map(([name, from, to, region, window]) => ({
    name,
    from,
    to,
    albedoRange: region.albedo.value,
    window,
    chroma: bandChromaticity(
      RING_SPECTRA[RING_SPECTRA.colorFrom[name]].map((value, i) => ({
        nm: RING_SPECTRA.wavelengthsNm[i],
        value,
      })),
    ),
  }));
})();

/**
 * El detalle del brillo de los anillos (revisión del bloque R, R1; fase 7, D36): la luminancia de la
 * textura de Solar System Scope por radio, relativa a su media en la ventana de cada región (donde se
 * calibra su albedo), entre ×0,2 y ×2. Aporta lo que la ocultación no da: con τ de 2 a 5, la luz que
 * refleja el anillo B está saturada y saldría plano; en las fotos, su parte interior es más oscura y la
 * central, más clara, con bandas. La τ ya no sale de la textura.
 * - Su radio: el borde exterior del B y el del A de la textura (las dos mayores caídas de su opacidad),
 *   en los radios medidos en la ocultación (`checkRingFeatures`): el del B no es circular.
 * - Comprobación: la opacidad de la textura, llevada a esos radios, correlaciona con la τ de la
 *   ocultación (en logaritmo) mejor sin desplazarla que desplazada más de 25 km.
 */
const RING_TEXTURE = '8k_saturn_ring_alpha.png';
const RING_DETAIL = { min: 0.2, max: 2 };

async function ringTextureDetail(tau, innerKm, outerKm, edges) {
  const { data, info } = await sharp(fileURLToPath(new URL(RING_TEXTURE, SRC)))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const columns = info.width;
  const alpha = new Float64Array(columns);
  const lum = new Float64Array(columns);
  for (let x = 0; x < columns; x++) {
    let a = 0;
    let l = 0;
    for (let y = 0; y < info.height; y++) {
      const k = (y * columns + x) * info.channels;
      a += data[k + 3] / 255;
      l +=
        0.2126 * srgbToLinear(data[k] / 255) +
        0.7152 * srgbToLinear(data[k + 1] / 255) +
        0.0722 * srgbToLinear(data[k + 2] / 255);
    }
    alpha[x] = a / info.height;
    lum[x] = l / info.height;
  }
  // La mayor caída de la opacidad (de ≥ 0,5 a ≤ 0,3 en 8 px) en una ventana: los bordes del B y del A.
  const steepestDrop = (from, to) => {
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
  };
  const xB = steepestDrop(Math.round(columns * 0.6), Math.round(columns * 0.73));
  const xA = steepestDrop(Math.round(columns * 0.9), Math.round(columns * 0.97));
  const width = tau.length;
  const kmPerPx = (outerKm - innerKm) / width;
  const radius = (x) => innerKm + (x + 0.5) * kmPerPx;
  /** Un perfil de la textura (por columna) en el radio r, con su escala y su origen, interpolado. */
  const sampleWith = (profile, scale, start, r) => {
    const u = (r - start) / scale - 0.5;
    const i = Math.min(Math.max(Math.floor(u), 0), columns - 2);
    const t = Math.min(Math.max(u - i, 0), 1);
    return profile[i] + t * (profile[i + 1] - profile[i]);
  };
  // Registro con la ocultación: la escala y el origen de la textura que más correlacionan su opacidad
  // con la τ medida (en logaritmo), de 75 000 a 136 000 km, partiendo de sus bordes del B y del A en los
  // radios medidos en la ocultación (el del B no es circular). La textura no es lineal en radio a mejor
  // que un 0,3 %: con dos bordes, el anillo C quedaba desplazado 150 km.
  const logTau = (t) => Math.log(Math.max(t, 0.01));
  const pixelsIn = (from, to) => {
    const list = [];
    for (let x = 0; x < width; x++) if (radius(x) >= from && radius(x) <= to) list.push(x);
    return list;
  };
  const correlation = (scale, start, pixels) => {
    const a = pixels.map((x) => logTau(tau[x]));
    const b = pixels.map((x) =>
      logTau(-Math.log(1 - Math.min(sampleWith(alpha, scale, start, radius(x)), 0.995))),
    );
    const mean = (v) => v.reduce((s, y) => s + y, 0) / v.length;
    const ma = mean(a);
    const mb = mean(b);
    let sab = 0;
    let saa = 0;
    let sbb = 0;
    for (let i = 0; i < a.length; i++) {
      sab += (a[i] - ma) * (b[i] - mb);
      saa += (a[i] - ma) ** 2;
      sbb += (b[i] - mb) ** 2;
    }
    return sab / Math.sqrt(saa * sbb);
  };
  const all = pixelsIn(75_000, 136_000);
  const scale0 = (edges.aOuterKm - edges.bOuterKm) / (xA - xB);
  const start0 = edges.bOuterKm - (xB + 0.5) * scale0;
  let fit = { scale: scale0, start: start0, r: correlation(scale0, start0, all) };
  // De lo grueso a lo fino: ±1 % de escala y ±300 km de origen; luego ±0,1 % y ±20 km.
  for (const [ds, steps, dStart, startSteps] of [
    [scale0 * 0.0005, 20, 10, 30],
    [scale0 * 0.0001, 10, 1, 20],
  ]) {
    const center = fit;
    for (let i = -steps; i <= steps; i++) {
      const scale = center.scale + i * ds;
      // El origen que deja fija la textura en el borde del A al cambiar la escala, más un desplazamiento.
      const pivot = center.start + (xA + 0.5) * (center.scale - scale);
      for (let j = -startSteps; j <= startSteps; j++) {
        const start = pivot + j * dStart;
        const r = correlation(scale, start, all);
        if (r > fit.r) fit = { scale, start, r };
      }
    }
  }
  // Con el registro, cada región tiene que quedar alineada por sí misma (su mejor desplazamiento,
  // a menos de 25 km): si no, la textura no tiene la estructura de la ocultación en su sitio.
  const regionShifts = [
    ['C', 75_000, 91_500],
    ['B', 92_500, 117_000],
    ['Cassini', 117_700, 121_800],
    ['A', 122_300, 136_500],
  ].map(([name, from, to]) => {
    const pixels = pixelsIn(from, to);
    let best = { shift: 0, r: correlation(fit.scale, fit.start, pixels) };
    for (let shift = -150; shift <= 150; shift += 5) {
      const r = correlation(fit.scale, fit.start - shift, pixels);
      if (r > best.r) best = { shift, r };
    }
    return { name, ...best };
  });
  const misaligned = regionShifts.filter((region) => Math.abs(region.shift) > 25);
  if (misaligned.length) {
    throw new Error(
      `La textura de los anillos no está alineada con la ocultación: ${misaligned.map((g) => `${g.name} a ${g.shift} km`).join(', ')}`,
    );
  }
  const texKmPerPx = fit.scale;
  const texInner = fit.start;
  const sample = (profile, r) => sampleWith(profile, texKmPerPx, texInner, r);
  /** La luminancia media de la textura entre dos radios (8 muestras: un píxel de cualquier nivel). */
  const lumBetween = (r0, r1) => {
    let sum = 0;
    for (let k = 0; k < 8; k++) sum += sample(lum, r0 + ((k + 0.5) / 8) * (r1 - r0));
    return sum / 8;
  };
  // La media de cada región en su ventana, con la tira más fina.
  const means = RING_REGIONS.map((ring) => {
    const [from, to] = ring.window ?? [ring.from, ring.to];
    let sum = 0;
    let n = 0;
    for (let x = 0; x < width; x++) {
      if (radius(x) >= from && radius(x) < to) {
        sum += lumBetween(radius(x) - kmPerPx / 2, radius(x) + kmPerPx / 2);
        n++;
      }
    }
    return sum / n;
  });
  return {
    /** El detalle de la región j en el píxel que va de r0 a r1 km. */
    detailAt: (j, r0, r1) =>
      Math.min(Math.max(lumBetween(r0, r1) / means[j], RING_DETAIL.min), RING_DETAIL.max),
    report: `anillos, detalle de la textura: registrada con la ocultación (de sus bordes del B y del A, ${scale0.toFixed(3)} km/px y ${Math.round(start0)} km, a ${texKmPerPx.toFixed(3)} km/px y ${Math.round(texInner)} km; correlación de log τ de ${correlation(scale0, start0, all).toFixed(3)} a ${fit.r.toFixed(3)}); el mejor desplazamiento de cada región, ${regionShifts.map((g) => `${g.name} ${g.shift} km`).join(', ')}`,
  };
}

/** Mezcla suave entre regiones vecinas (±250 km en cada borde): lo de fuera, la más cercana. */
const BLEND_KM = 250;
function regionWeights(r) {
  const w = RING_REGIONS.map((ring) => {
    const rise = smooth((r - (ring.from - BLEND_KM)) / (2 * BLEND_KM));
    const fall = 1 - smooth((r - (ring.to - BLEND_KM)) / (2 * BLEND_KM));
    return Math.min(rise, fall);
  });
  if (r < RING_REGIONS[0].from) w[0] = 1;
  if (r > RING_REGIONS.at(-1).to) w[w.length - 1] = 1;
  const total = w.reduce((sum, v) => sum + v, 0) || 1;
  return w.map((v) => v / total);
}

/**
 * El albedo de cada región (fase 7, D36): en el C, el B y el A, el que hace que el modelo de la escena
 * (dispersión simple con la τ medida de cada píxel y la función de fase de `data/photometry.ts`, con el
 * Sol y la vista a la misma elevación) dé la reflectividad medida por el Hubble en F555W (549 nm) en su
 * ventana, sin salir del intervalo de la ficha; en la división de Cassini, que el Hubble no midió, el
 * valor típico de la ficha. Se calcula con la tira más fina y vale para todos los niveles.
 */
function ringAlbedos(tau, innerKm, outerKm, texture) {
  const kmPerPx = (outerKm - innerKm) / tau.length;
  const mu = Math.sin((RING_SPECTRA.openingDeg * Math.PI) / 180);
  const particles = RING_PHOTOMETRY.photometry;
  const phase =
    phaseFunction((RING_SPECTRA.phaseDeg * Math.PI) / 180, particles) / phaseFunction(0, particles);
  const v = RING_SPECTRA.wavelengthsNm.indexOf(549);
  return RING_REGIONS.map((ring) => {
    const [lo, hi] = ring.albedoRange;
    if (!ring.window)
      return { albedo: typical(ring.albedoRange), calibration: 'típico de la ficha' };
    const [from, to] = ring.window;
    let sum = 0;
    let n = 0;
    for (let x = 0; x < tau.length; x++) {
      const r = innerKm + (x + 0.5) * kmPerPx;
      if (r < from || r >= to) continue;
      // Con el detalle de la textura (su media en la ventana es 1): la de la ventana, la medida.
      const j = RING_REGIONS.indexOf(ring);
      sum +=
        texture.detailAt(j, r - kmPerPx / 2, r + kmPerPx / 2) *
        ringReflectance(mu, mu, tau[x], true);
      n++;
    }
    const measured = RING_SPECTRA[ring.name][v];
    const model = (sum / n) * phase;
    const albedo = Math.min(Math.max(measured / model, lo), hi);
    return {
      albedo,
      calibration: `I/F ${measured} del Hubble a ${RING_SPECTRA.phaseDeg}° (${from / 1000}–${to / 1000} mil km)${albedo === measured / model ? '' : `, acotado a la ficha (${lo}–${hi})`}`,
    };
  });
}

/**
 * La tira de los anillos (fase 7, D36): `width` píxeles de `innerKm` a `outerKm`, con la τ medida en la
 * ocultación (`ringStripTau`) en el alfa, como la opacidad vista de frente (1 − e^(−τ)), y el albedo y
 * el color de su región en RGB (sRGB, 8 bits), con el detalle de la textura en el albedo.
 */
function measuredRingStrip(tau, innerKm, outerKm, albedos, texture) {
  const width = tau.length;
  const kmPerPx = (outerKm - innerKm) / width;
  const strip = Buffer.alloc(width * RING_HEIGHT * 4);
  for (let x = 0; x < width; x++) {
    const r = innerKm + (x + 0.5) * kmPerPx;
    const w = regionWeights(r);
    const albedo = albedos.reduce(
      (s, ring, j) =>
        s + (w[j] ? w[j] * ring.albedo * texture.detailAt(j, r - kmPerPx / 2, r + kmPerPx / 2) : 0),
      0,
    );
    const chroma = [0, 1, 2].map((i) =>
      RING_REGIONS.reduce((s, ring, j) => s + w[j] * ring.chroma[i], 0),
    );
    const rgb = chroma.map((v) => Math.round(255 * linearToSrgb(Math.min(albedo * v, 1))));
    const alpha = Math.round(255 * (1 - Math.exp(-tau[x])));
    for (let y = 0; y < RING_HEIGHT; y++) {
      const k = (y * width + x) * 4;
      strip[k] = rgb[0];
      strip[k + 1] = rgb[1];
      strip[k + 2] = rgb[2];
      strip[k + 3] = alpha;
    }
  }
  return sharp(strip, { raw: { width, height: RING_HEIGHT, channels: 4 } });
}

/** Informe de cada región: su τ mediana (frente al intervalo de la ficha), su albedo y su color. */
function ringRegionsReport(tau, innerKm, outerKm, albedos) {
  const kmPerPx = (outerKm - innerKm) / tau.length;
  return RING_REGIONS.map((ring, j) => {
    const values = [];
    for (let x = 0; x < tau.length; x++) {
      const r = innerKm + (x + 0.5) * kmPerPx;
      if (r >= ring.from && r < ring.to) values.push(tau[x]);
    }
    values.sort((a, b) => a - b);
    const median = values[Math.floor((values.length - 1) / 2)];
    const factsheet = RINGS.regions[ring.name === 'Cassini' ? 'cassini' : ring.name.toLowerCase()];
    const [lo, hi] = factsheet.opticalDepth.value;
    return `${ring.name}: τ mediana ${median.toFixed(2)} (ficha ${lo}–${hi}), albedo ${albedos[j].albedo.toFixed(3)} (${albedos[j].calibration}), color ${ring.chroma.map((v) => v.toFixed(3)).join('/')}`;
  }).join(' · ');
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
  if (spec.kind === 'mosaic') {
    // El mosaico, a 2048 px y centrado en la longitud 0 (con sus huecos rellenos); sus sondas; y los
    // niveles de 1k y 2k. La luminancia media, como la de los mapas de color, para el albedo (D29).
    const mosaic = await loadMosaic(new URL(spec.file, SRC), 2048, { band: spec.band });
    reports.push(`${id}: ${mosaic.report}`);
    const probes = checkMosaicProbes(id, mosaic);
    if (probes) reports.push(probes);
    const list = [];
    for (const [level, width] of LEVELS) {
      if (width > 2048) continue;
      const pipeline = sharp(mosaic.data, {
        raw: { width: mosaic.width, height: mosaic.height, channels: 3 },
      }).resize(width, width / 2, { fit: 'fill', kernel: 'lanczos3' });
      list.push(await emit(id, level, pipeline, spec.quality));
    }
    files[id] = list;
    luminance[id] = Number((await meanLuminance(list[0])).toFixed(4));
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
  if (spec.kind === 'ring-profile') {
    // La tira de los anillos (fase 7, D36): la τ de la ocultación, reducida a cada nivel desde el perfil
    // (reescalar la tira con lanczos dejaría halos en la opacidad junto a las divisiones); el albedo de
    // cada región, calibrado con la tira más fina, y sus rasgos, comprobados en ella.
    const profile = await loadUvisProfile(new URL(spec.profile, RINGS_SRC));
    reports.push(profile.report);
    const finest = LEVELS.filter(([, width]) => width <= spec.maxWidth).at(-1)[1];
    const fineTau = ringStripTau(profile, spec.innerKm, spec.outerKm, finest);
    const features = checkRingFeatures(fineTau, spec.innerKm, spec.outerKm);
    reports.push(features.report);
    const texture = await ringTextureDetail(fineTau, spec.innerKm, spec.outerKm, features.edges);
    reports.push(texture.report);
    const albedos = ringAlbedos(fineTau, spec.innerKm, spec.outerKm, texture);
    reports.push(
      `anillos, regiones: ${ringRegionsReport(fineTau, spec.innerKm, spec.outerKm, albedos)}`,
    );
    const list = [];
    for (const [level, width] of LEVELS) {
      if (width > spec.maxWidth) continue;
      const tau =
        width === finest ? fineTau : ringStripTau(profile, spec.innerKm, spec.outerKm, width);
      const strip = measuredRingStrip(tau, spec.innerKm, spec.outerKm, albedos, texture);
      list.push(await emit(id, level, strip, spec.quality, { alpha: true }));
    }
    files[id] = list;
    ringStrip = { inner: spec.innerKm, outer: spec.outerKm, features };
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
  const list = [];
  for (const [level, width] of LEVELS) {
    if (width > sourceWidth || width > (spec.maxWidth ?? DEFAULT_MAX_WIDTH)) continue;
    let pipeline = base().resize(width, width / 2, { fit: 'fill', kernel: 'lanczos3' });
    if (spec.kind === 'gray') pipeline = pipeline.toColourspace('b-w');
    // G ← 255 − G: el norte en G (ver `flipGreen`).
    if (spec.flipGreen) pipeline = pipeline.removeAlpha().linear([1, -1, 1], [0, 255, 0]);
    // El panorama sin estrellas se ve ampliado en los primeros planos (un píxel de 2k mide 0,18°): un
    // desenfoque leve quita las manchas de la mediana y de la compresión.
    if (spec.kind === 'panorama') pipeline = pipeline.blur(level === '1k' ? 0.6 : 1);
    list.push(await emit(id, level, pipeline, spec.quality));
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
 * Radios (km) que cubre la tira de los anillos de Saturno (fase 7, D36): de por dentro del anillo C a
 * por fuera del F, con la τ de la ocultación de β Centauri de Cassini UVIS.
 */
export const SATURN_RING_STRIP_KM = { inner: ${ringStrip.inner}, outer: ${ringStrip.outer} } as const;

/**
 * Lo medido en la tira más fina de los anillos al generarla (scripts/ring-profile.mjs): la τ mínima de
 * cada división (y la mediana del anillo a sus lados) y el radio de los bordes de los anillos C, B y A
 * y del núcleo del F. Un test lo compara con los radios publicados (data/saturn-rings.ts).
 */
export const SATURN_RING_FEATURES_MEASURED = ${JSON.stringify({ gaps: ringStrip.features.gaps, ...ringStrip.features.edges })} as const;

/**
 * Intervalo (m) de la elevación de la Luna empaquetada en 16 bits («moon-elevation», D15): un valor v
 * de 0 a 65 535 vale minM + v / 65 535 · (maxM − minM) sobre la esfera de 1737,4 km.
 */
export const MOON_ELEVATION_RANGE_M = { min: ${ELEVATION_RANGE_M.moon.minM}, max: ${ELEVATION_RANGE_M.moon.maxM} } as const;

/**
 * Latitud (grados) del borde de los casquetes polares de la Luna («moon-normal-poles»): el atlas cubre
 * de ahí al polo en estereográfica (scripts/lola-polar.mjs), y el shader lo coloca con ella.
 */
export const MOON_POLAR_CAP_EDGE_DEG = ${POLAR_EDGE_DEG};
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
