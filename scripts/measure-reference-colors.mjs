// Colores medidos en fotos reales (fase 3b): repite las medidas que usan `data/photometry.ts`
// (`chromaticity` de los planetas y de cada anillo de Saturno) y `scripts/reference-colors.mjs` (el
// océano de la Tierra), con las regiones exactas de cada foto, y las compara con los valores en uso.
// Uso: node scripts/measure-reference-colors.mjs
//
// Las fotos se descargan a una carpeta temporal del sistema (no entran en el repo; docs/realismo/
// referencias.md dice de dónde sale cada una y con qué licencia). Todas las cuentas son en RGB lineal
// (la foto se decodifica como sRGB) y la cromaticidad es RGB / luminancia (Rec. 709).
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BODY_PHOTOMETRY, RING_PHOTOMETRY } from '../src/app/data/photometry.ts';
import { OCEAN_CHROMA } from './reference-colors.mjs';

const CACHE = join(tmpdir(), 'tls-referencias');
const ROOT = new URL('../', import.meta.url);

/**
 * Discos: la media de un círculo dentro del disco (lejos del limbo). Centro y radio en píxeles de la
 * imagen descargada, medidos con un umbral sobre el fondo negro (el radio del disco, entre paréntesis).
 */
const DISCS = [
  {
    id: 'marte',
    url: 'https://cdn.esahubble.org/archives/images/screen/heic1609a.jpg',
    center: [640, 620],
    radius: 300,
    note: 'Hubble, 12-05-2016 (heic1609): el 70 % del disco (radio 439 px)',
  },
  {
    id: 'jupiter',
    url: 'https://cdn.esahubble.org/archives/images/screen/heic1914a.jpg',
    center: [634, 660],
    radius: 274,
    note: 'Hubble OPAL, 27-06-2019 (heic1914): el 60 % del disco (radio 457 px)',
  },
  {
    id: 'saturno',
    url: 'https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg',
    center: [643, 396],
    radius: 88,
    note: 'Hubble OPAL, 20-06-2019 (heic1917): el 50 % del globo (radio ecuatorial 177 px), por encima de los anillos que lo cruzan',
  },
  {
    id: 'urano',
    url: 'https://planetary.s3.amazonaws.com/web/assets/pictures/_1200x630_crop_center-center_82_none/uranus-neptune-colors-irwin.jpg',
    center: [572, 513],
    radius: 94,
    note: 'Irwin et al. (2024), imagen reprocesada (abajo a la izquierda): el 60 % del disco (radio 157 px)',
  },
  {
    id: 'neptuno',
    url: 'https://planetary.s3.amazonaws.com/web/assets/pictures/_1200x630_crop_center-center_82_none/uranus-neptune-colors-irwin.jpg',
    center: [976, 507],
    radius: 88,
    note: 'Irwin et al. (2024), imagen reprocesada (abajo a la derecha): el 60 % del disco (radio 147 px)',
  },
];

/**
 * Anillos de Saturno en heic1917a: elipse del borde exterior del anillo A (136 775 km), con las ansas
 * en (243, 433) y (1043, 359): centro (643, 396), semieje mayor 401,7 px, girado −5,28°, y semieje
 * menor 166,6 px (apertura de 24,5°; la fecha da 24,0°). Se promedia el ansa derecha (u > 0,6 a y
 * |v| < 0,3 b), lejos de los bordes de cada anillo.
 */
const RINGS = {
  url: 'https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg',
  center: [643, 396],
  a: 401.7,
  b: 166.6,
  angleDeg: -5.28,
  outerKm: 136_775,
  bands: {
    C: [80_000, 90_000],
    B: [95_000, 115_000],
    Cassini: [118_500, 121_500],
    A: [124_000, 135_000],
  },
};

/** Fotos de EPIC (DSCOVR) del 21-06-2016, con el centroide de cada una (sus metadatos). */
const EPIC = [
  { id: 'epic_1b_20160621230313', lat: 22.324, lon: -155.039 },
  { id: 'epic_1b_20160621152458', lat: 22.412, lon: -40.562 },
  { id: 'epic_1b_20160621074644', lat: 22.522, lon: 74.026 },
].map((image) => ({
  ...image,
  url: `https://epic.gsfc.nasa.gov/archive/natural/2016/06/21/jpg/${image.id}.jpg`,
}));

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const TABLE = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const chroma = (rgb) => rgb.map((v) => v / luminance(rgb));
const show = (v) => v.map((x) => x.toFixed(3)).join(' · ');
const D = Math.PI / 180;

async function download(url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, url.split('/').pop().split('?')[0]);
  const cached = await stat(file).catch(() => null);
  if (cached?.size) return file;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo descargar ${url}: ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  return file;
}

async function rgbImage(path) {
  const { data, info } = await sharp(path)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    at: (x, y) => {
      const i = (y * info.width + x) * 3;
      return [TABLE[data[i]], TABLE[data[i + 1]], TABLE[data[i + 2]]];
    },
  };
}

function mean(samples) {
  const sum = [0, 0, 0];
  for (const s of samples) for (let c = 0; c < 3; c++) sum[c] += s[c];
  return sum.map((v) => v / samples.length);
}

/** Diferencia máxima entre dos cromaticidades (por canal). */
const gap = (a, b) => Math.max(...a.map((v, i) => Math.abs(v - b[i])));

const rows = [];
const report = (name, measured, used, note) => {
  rows.push({ name, measured, used, note });
};

// --- Discos ------------------------------------------------------------------------------------
for (const disc of DISCS) {
  const image = await rgbImage(await download(disc.url));
  const [cx, cy] = disc.center;
  const samples = [];
  for (let y = cy - disc.radius; y <= cy + disc.radius; y++) {
    for (let x = cx - disc.radius; x <= cx + disc.radius; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= disc.radius ** 2) samples.push(image.at(x, y));
    }
  }
  report(disc.id, chroma(mean(samples)), BODY_PHOTOMETRY[disc.id].chromaticity?.rgb, disc.note);
}

// --- Anillos -------------------------------------------------------------------------------------
{
  const image = await rgbImage(await download(RINGS.url));
  const [cx, cy] = RINGS.center;
  const cos = Math.cos(RINGS.angleDeg * D);
  const sin = Math.sin(RINGS.angleDeg * D);
  const bands = Object.fromEntries(Object.keys(RINGS.bands).map((name) => [name, []]));
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const u = dx * cos + dy * sin;
      const v = -dx * sin + dy * cos;
      if (u < 0.6 * RINGS.a || Math.abs(v) > 0.3 * RINGS.b) continue;
      const km = Math.hypot(u / RINGS.a, v / RINGS.b) * RINGS.outerKm;
      for (const [name, [from, to]] of Object.entries(RINGS.bands)) {
        if (km >= from && km < to) bands[name].push(image.at(x, y));
      }
    }
  }
  for (const [name, samples] of Object.entries(bands)) {
    report(
      `anillo ${name}`,
      chroma(mean(samples)),
      RING_PHOTOMETRY.chromaticity[name],
      `heic1917a, ansa derecha, ${RINGS.bands[name].map((km) => km / 1000).join('–')} mil km (${samples.length} px)`,
    );
  }
}

// --- Océano de la Tierra (EPIC) ------------------------------------------------------------------
{
  // Máscara del agua: la especular de la textura de la Tierra (1k), blanca en el agua.
  const dir = fileURLToPath(new URL('public/textures/1k/', ROOT));
  const maskName = (await readdir(dir)).find((name) => name.startsWith('earth-specular.'));
  const maskData = await sharp(await readFile(join(dir, maskName)))
    .toColourspace('b-w')
    .raw()
    .toBuffer({ resolveWithObject: true });
  const mask = maskData.data;
  const mw = maskData.info.width;
  const mh = maskData.info.height;
  // Agua «segura»: la máscara y sus vecinos a ±2 píxeles son agua (lejos de la costa).
  const water = (lat, lon) => {
    const sx = Math.floor(((lon + 180) / 360) * mw);
    const sy = Math.floor(((90 - lat) / 180) * mh);
    for (let j = -2; j <= 2; j++) {
      for (let i = -2; i <= 2; i++) {
        const x = (((sx + i) % mw) + mw) % mw;
        const y = Math.min(mh - 1, Math.max(0, sy + j));
        if (mask[y * mw + x] < 128) return false;
      }
    }
    return true;
  };
  const perImage = [];
  for (const epic of EPIC) {
    const image = await rgbImage(await download(epic.url));
    // El disco: la caja de los píxeles más claros que el fondo.
    let minX = image.width;
    let maxX = 0;
    let minY = image.height;
    let maxY = 0;
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        if (luminance(image.at(x, y)) > 0.004) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const radius = (maxX - minX) / 2;
    const lat0 = epic.lat * D;
    const samples = [];
    for (let y = 0; y < image.height; y++) {
      for (let x = 0; x < image.width; x++) {
        // Proyección ortográfica inversa desde el centroide (el norte, arriba).
        const px = (x - cx) / radius;
        const py = -(y - cy) / radius;
        const rho = Math.hypot(px, py);
        if (rho > 0.6 || rho === 0) continue;
        const c = Math.asin(rho);
        const lat =
          Math.asin(Math.cos(c) * Math.sin(lat0) + (py * Math.sin(c) * Math.cos(lat0)) / rho) / D;
        const lon =
          epic.lon +
          Math.atan2(
            px * Math.sin(c),
            rho * Math.cos(c) * Math.cos(lat0) - py * Math.sin(c) * Math.sin(lat0),
          ) /
            D;
        const wrapped = ((((lon + 180) % 360) + 360) % 360) - 180;
        if (water(lat, wrapped)) samples.push(image.at(x, y));
      }
    }
    // Sin nubes: el 20 % más oscuro del agua.
    samples.sort((p, q) => luminance(p) - luminance(q));
    const clear = mean(samples.slice(0, Math.floor(samples.length * 0.2)));
    perImage.push(clear);
    report(`océano ${epic.id}`, chroma(clear), null, `${samples.length} px de agua a < 0,6 radios`);
  }
  report(
    'océano (media de las tres)',
    chroma(mean(perImage)),
    OCEAN_CHROMA,
    'EPIC, 21-06-2016: el 20 % más oscuro del agua',
  );
}

// --- Venus: de la fotometría (no hay foto en color real con licencia compatible) -----------------
{
  // Albedos geométricos por banda de Mallama, Krobusek y Pavlov (2017, Icarus 282, 19, tabla 7;
  // https://arxiv.org/abs/1609.05048): [longitud de onda efectiva en nm, albedo].
  const albedos = [
    [469, 0.664], // g′
    [549, 0.689], // V
    [616, 0.712], // r′
  ];
  // Interpolación lineal (y extrapolación del primer y el último tramo).
  const at = (nm) => {
    const k = nm <= albedos[1][0] ? 0 : 1;
    const [[x0, y0], [x1, y1]] = [albedos[k], albedos[k + 1]];
    return y0 + ((nm - x0) / (x1 - x0)) * (y1 - y0);
  };
  // Longitudes de onda dominantes de los primarios sRGB: rojo 611 nm, verde 549 nm, azul 464 nm.
  report(
    'venus',
    chroma([at(611), at(549), at(464)]),
    BODY_PHOTOMETRY.venus.chromaticity?.rgb,
    'Mallama et al. (2017), tabla 7: albedos g′, V y r′ a las longitudes de onda de los primarios sRGB',
  );
}

// --- Informe -------------------------------------------------------------------------------------
console.log('Cromaticidad (RGB lineal / luminancia): medida en la foto · en uso\n');
let worst = 0;
for (const row of rows) {
  const used = row.used ? show(row.used) : '—';
  const difference = row.used ? gap(row.measured, row.used) : 0;
  worst = Math.max(worst, difference);
  const flag = row.used && difference > 0.02 ? ` (diferencia ${difference.toFixed(3)})` : '';
  console.log(`${row.name}: ${show(row.measured)} · ${used}${flag}\n  ${row.note}`);
}
console.log(`\nDiferencia máxima con los valores en uso: ${worst.toFixed(3)}`);
