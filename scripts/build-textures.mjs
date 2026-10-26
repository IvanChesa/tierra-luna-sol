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
//   después que el borde interior del anillo C cae donde la textura empieza a ser opaca.
// - Orientación del cielo (Vía Láctea, ICRF): el centro galáctico tiene que ser más brillante que el
//   polo galáctico norte.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { FloatType } from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';

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
 * ring (tira RGBA de los anillos), sky (EXR del cielo, se tonemapea).
 */
const TEXTURES = {
  sun: { file: '8k_sun.jpg', kind: 'color', quality: 80 },
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
  uranus: { file: '2k_uranus.jpg', kind: 'color', quality: 82 },
  neptune: { file: '2k_neptune.jpg', kind: 'color', quality: 82 },
  'milky-way': { file: 'milkyway_2020_4k.exr', kind: 'sky', quality: 72 },
};

/**
 * Texturas que no se publican, con el motivo. La Vía Láctea del NASA SVS (4851) deriva de Gaia DR2,
 * que se distribuye con licencia CC BY-NC 3.0 IGO (https://www.cosmos.esa.int/web/gaia-users/license):
 * la cláusula no comercial no entra en la política de licencias del proyecto (revisión de la fase 2,
 * hallazgo 4). Queda omitida hasta que Iván decida (docs/PENDIENTES.md); el código del cielo sigue
 * listo para otra fuente.
 */
const OMITTED = {
  'milky-way': 'licencia CC BY-NC 3.0 IGO de Gaia DR2 (pendiente de Iván)',
};

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

async function calibrateRings(file) {
  const bodyData = await readFile(new URL('src/app/data/body-data.ts', ROOT), 'utf8');
  const edge = (name) => {
    const match = new RegExp(`${name}: \\{\\s*value: (\\d+)`).exec(bodyData);
    if (!match) throw new Error(`Falta ${name} de los anillos en body-data.ts`);
    return Number(match[1]);
  };
  const bOuter = edge('cassiniInnerKm');
  const aOuter = edge('outerRadiusKm');
  const cInner = edge('innerRadiusKm');
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
  return {
    inner: Math.round(inner),
    outer: Math.round(outer),
    report: `anillos: borde exterior del B en x = ${xB} px y del A en x = ${xA} px → ${kmPerPx.toFixed(3)} km/px; la tira cubre de ${Math.round(inner)} a ${Math.round(outer)} km; el anillo C (${cInner} km) cae en x = ${xC} px, donde el alfa sube de ${before.toFixed(2)} a ${after.toFixed(2)}`,
  };
}

/** Vía Láctea: EXR lineal (0–1) → sRGB de 8 bits con una ganancia que lleva el p99,9 a ~1. */
async function skyImage(file) {
  const buffer = await readFile(new URL(file, SRC));
  const loader = new EXRLoader();
  loader.setDataType(FloatType);
  const exr = loader.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength),
  );
  const { width, height, data } = exr;
  const channels = data.length / (width * height);
  const GAIN = 2.5;
  const encode = (v) => {
    const c = Math.min(1, Math.max(0, v * GAIN));
    return Math.round(255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055));
  };
  const out = Buffer.alloc(width * height * 3);
  // El EXRLoader entrega las filas de abajo arriba (convención de WebGL): se dan la vuelta.
  for (let y = 0; y < height; y++) {
    const src = (height - 1 - y) * width;
    for (let x = 0; x < width; x++) {
      const i = (src + x) * channels;
      const o = (y * width + x) * 3;
      out[o] = encode(data[i]);
      out[o + 1] = encode(data[i + 1]);
      out[o + 2] = encode(data[i + 2]);
    }
  }
  const image = sharp(out, { raw: { width, height, channels: 3 } });
  // Orientación: el centro galáctico (AR 266,4°, Dec −28,9°) más brillante que el polo norte galáctico.
  const raw = { data: out, info: { width, height, channels: 3 } };
  const at = (raDeg, decDeg) => luminanceAt(raw, decDeg, -raDeg, 8); // u = 0,5 − AR/360
  const center = at(266.4, -28.9);
  const pole = at(192.9, 27.1);
  if (!(center > 2 * pole)) throw new Error('La Vía Láctea no está orientada como se espera');
  return {
    image,
    width,
    report: `vía láctea: centro galáctico ${Math.round(center)} · polo galáctico norte ${Math.round(pole)}`,
  };
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
  const input = fileURLToPath(new URL(spec.file, SRC));
  let sourceWidth;
  let base;
  if (spec.kind === 'sky') {
    const sky = await skyImage(spec.file);
    reports.push(sky.report);
    sourceWidth = sky.width;
    base = () => sky.image.clone();
  } else {
    const data = spec.kind === 'normal' || spec.kind === 'gray';
    sourceWidth = (await sharp(input, { limitInputPixels: false }).metadata()).width;
    base = () => sharp(input, { limitInputPixels: false, ignoreIcc: data });
  }
  if (spec.kind === 'ring') {
    ringStrip = await calibrateRings(spec.file);
    reports.push(ringStrip.report);
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
    // El nivel 4k del cielo lleva un grano de estrellas débiles que dobla el peso sin aportar nada
    // como fondo: un desenfoque leve lo deja dentro del presupuesto de §5 (≤ 1,5 MB).
    if (spec.kind === 'sky' && level === '4k') pipeline = pipeline.blur(0.6);
    list.push(await emit(id, level, pipeline, spec.quality, { alpha: spec.kind === 'ring' }));
  }
  files[id] = list;
  if (spec.kind === 'color') luminance[id] = Number((await meanLuminance(list[0])).toFixed(4));
  const report = await checkAlignment(id, list[0]);
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
