// El color del radar de Venus «Bajo las nubes» (D49; revisión del bloque S, decisión 2): el de las
// fotos de las Venera 13 y 14, como el globo de Magellan de la NASA, PIA00104 («The simulated hues are
// based on color images recorded by the Soviet Venera 13 and 14 spacecraft»,
// https://science.nasa.gov/photojournal/venus-computer-simulated-global-view-centered-at-180-degrees-east-longitude/).
//
// En PIA00104 el tono cambia con el brillo: pardo rojizo en lo oscuro y naranja amarillento en lo
// claro. Se mide su cromaticidad lineal (RGB / luminancia Rec. 709) en los percentiles 5, 50 y 95 de
// la luminancia del disco (el 60 % central del radio, lejos del limbo; la media de ±2,5 puntos de
// percentil), y los mismos percentiles de la luminancia de nuestro mosaico del radar en cada nivel:
// el shader lleva cada valor del mosaico al tono de PIA00104 en el mismo percentil, sin cambiar su
// brillo (`VISUAL_CONFIG.venus.radar.venera`). Es una medida, no se copia nada: la foto se descarga
// a una carpeta temporal del sistema (no entra en el repo; material de la NASA/JPL, D43).
// Uso: node scripts/measure-venera-tint.mjs
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TEXTURE_FILES } from '../src/app/scene/texture-files.ts';

const CACHE = join(tmpdir(), 'tls-referencias');
const PIA00104 =
  'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00104/PIA00104.jpg';
const PERCENTILES = [0.05, 0.5, 0.95];

/** sRGB (0–255) a lineal. */
const linear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

async function download(url) {
  await mkdir(CACHE, { recursive: true });
  const file = join(CACHE, url.split('/').at(-1));
  try {
    await stat(file);
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    await writeFile(file, Buffer.from(await response.arrayBuffer()));
  }
  return readFile(file);
}

/** Los píxeles [L, R, G, B] en lineal, ordenados por luminancia; con `disc`, solo el centro del disco. */
async function pixels(input, disc) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  // El disco de PIA00104: el contorno sobre el fondo negro (centrado; su radio, la mitad de su ancho).
  let minX = width;
  let maxX = 0;
  if (disc) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const k = (y * width + x) * channels;
        if (data[k] + data[k + 1] + data[k + 2] > 60) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
  }
  const cx = disc ? (minX + maxX) / 2 : 0;
  const cy = height / 2;
  const limit = disc ? 0.6 * ((maxX - minX) / 2) : Infinity;
  const out = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (disc && Math.hypot(x - cx, y - cy) > limit) continue;
      const k = (y * width + x) * channels;
      const r = linear(data[k]);
      const g = linear(data[k + 1]);
      const b = linear(data[k + 2]);
      out.push([0.2126 * r + 0.7152 * g + 0.0722 * b, r, g, b]);
    }
  }
  return out.sort((a, b) => a[0] - b[0]);
}

const at = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))][0];

/** La cromaticidad media (RGB / L) de los píxeles a ±2,5 puntos de un percentil. */
function chromaticity(sorted, p) {
  const from = Math.max(0, Math.floor((p - 0.025) * sorted.length));
  const to = Math.min(sorted.length, Math.floor((p + 0.025) * sorted.length));
  let r = 0;
  let g = 0;
  let b = 0;
  for (let i = from; i < to; i++) {
    r += sorted[i][1];
    g += sorted[i][2];
    b += sorted[i][3];
  }
  const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r / l, g / l, b / l].map((v) => Number(v.toFixed(3)));
}

const pia = await pixels(await download(PIA00104), true);
console.log(`PIA00104 (el 60 % central del disco, ${pia.length} píxeles):`);
for (const p of PERCENTILES) {
  console.log(
    `  p${Math.round(p * 100)}: L ${at(pia, p).toFixed(4)}, RGB/L ${chromaticity(pia, p).join(', ')}`,
  );
}
for (const level of TEXTURE_FILES['venus-radar']) {
  const file = fileURLToPath(new URL(`../public/${level.path}`, import.meta.url));
  const radar = await pixels(file, false);
  const levels = PERCENTILES.map((p) => Number(at(radar, p).toFixed(4)));
  console.log(`Mosaico del radar, ${level.path}: L en p5, p50 y p95 = ${levels.join(', ')}`);
}
