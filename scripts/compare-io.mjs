// Ío frente a PIA02308 (revisión del bloque D, D1): el color de la escena con la geometría de la foto,
// en CIELAB, como los anillos (compare-rings.mjs).
//
// La foto: «Global image of Io (true color)», Galileo SSI, con los filtros de 756 nm, verde y violeta
// («approximates what the human eye would see»), centrada en 0,3° N y 137,5° O, con el Sol casi detrás
// de la sonda (NASA/JPL/University of Arizona; https://photojournal.jpl.nasa.gov/catalog/PIA02308). Su
// geometría, de Horizons (Ío, 501, vista desde Galileo, -77): el 2-7-1999 a las 05:00 UT, Galileo la veía
// centrada en 137,7° O y 0,4° N, a 126 000 km y con una fase de 4,4°; el Sol, sobre 141,4° O y 2,8° N.
// En la escena: Ío sola (`aislado=1`), a las 04:58 UT, con esa fase y desde 0,3° sobre su ecuador (la
// cámara queda a 3,6° de longitud del punto subsolar, hacia el este: centrada en 137,5° O).
//
// Mide, en el 60 % central del disco (lejos del limbo, como measure-reference-colors.mjs):
// - el color medio (RGB lineal) y su CIELAB con la luminancia de la foto: la exposición no cuenta, solo
//   el tono (h) y la croma (C*). Tolerancia: ΔE*ab ≤ 4,6 entre los dos (dos diferencias apenas
//   perceptibles, ΔE 2,3: Sharma, 2003; el mismo umbral que el tono lavanda de los anillos);
// - la variedad de color, píxel a píxel: la dispersión de a* y b* y qué parte del disco es casi neutra
//   (blanca o gris, C* < 12), naranja o roja (h < 75° con C* > 20) y oscura (L* por debajo de 0,6 veces la
//   mediana del disco). Un mosaico en gris con un tinte no tiene blancos ni naranjas.
//
// Uso: npm run build && node scripts/compare-io.mjs [carpeta] [--swiftshader]
//   carpeta: si se da, guarda allí la captura de la escena (`io-galileo-1999.webp`).
// La foto se descarga a una carpeta temporal del sistema (no entra en el repo; docs/realismo/
// referencias.md dice de dónde sale y con qué licencia).
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer } from './capture-lib.mjs';

const CACHE = join(tmpdir(), 'tls-referencias');
const PHOTO = {
  url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia02/pia02308/PIA02308.jpg',
  // El disco, como en measure-reference-colors.mjs.
  center: [1397, 1397],
  radius: 1389,
};
const SCENE_PATH = '/?captura=1&aislado=1&cuerpo=io&fecha=1999-07-02T04:58Z&fase=4.4&latitud=0.3';
const SIZE = { width: 900, height: 900, scale: 1 };
/** Fracción del lado del lienzo que ocupa el disco aislado (`FRAMING_FILL.body`). */
const BODY_FILL = 0.46;
/** El 60 % central del radio. */
const INNER = 0.6;
/** ΔE*ab máximo entre los colores medios (dos diferencias apenas perceptibles). */
const IO_TOLERANCE_DE = 4.6;

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const TABLE = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

/** CIELAB (D65) de un color en RGB lineal (sRGB), como en compare-rings.mjs. */
function cielab([r, g, b]) {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const t = (v) => (v > 216 / 24389 ? Math.cbrt(v) : ((24389 / 27) * v + 16) / 116);
  const [fx, fy, fz] = [t(x), t(y), t(z)];
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return {
    L: 116 * fy - 16,
    a,
    b: bb,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

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

/** Las medidas del 60 % central de un disco (centro y radio en píxeles). */
async function measure(input, [cx, cy], radius) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const sum = [0, 0, 0];
  const labs = [];
  const r = radius * INNER;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = (y * info.width + x) * 3;
      const rgb = [TABLE[data[i]], TABLE[data[i + 1]], TABLE[data[i + 2]]];
      for (let c = 0; c < 3; c++) sum[c] += rgb[c];
      labs.push(cielab(rgb));
    }
  }
  const mean = sum.map((v) => v / labs.length);
  const avg = (f) => labs.reduce((s, p) => s + f(p), 0) / labs.length;
  const meanA = avg((p) => p.a);
  const meanB = avg((p) => p.b);
  const spread = Math.sqrt(avg((p) => (p.a - meanA) ** 2 + (p.b - meanB) ** 2));
  const sortedL = labs.map((p) => p.L).sort((p, q) => p - q);
  const medianL = sortedL[Math.floor(sortedL.length / 2)];
  const share = (test) => labs.filter(test).length / labs.length;
  return {
    mean,
    chroma: mean.map((v) => v / luminance(mean)),
    spread,
    neutral: share((p) => p.c < 12),
    orange: share((p) => p.h < 75 && p.c > 20),
    dark: share((p) => p.L < 0.6 * medianL),
    pixels: labs.length,
  };
}

/** CIELAB de una cromaticidad con una luminancia dada (la de la foto). */
const labAt = (chroma, y) => cielab(chroma.map((v) => v * y));

// --- La foto ------------------------------------------------------------------------------------
const photo = await measure(await download(PHOTO.url), PHOTO.center, PHOTO.radius);

// --- La escena ----------------------------------------------------------------------------------
const [outArg] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const { browser, close } = await openBrowser();
let png;
try {
  const { page, problems } = await openViewer(browser, SCENE_PATH, SIZE);
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  if (problems.length) console.warn(problems.join('\n'));
  png = Buffer.from(base64, 'base64');
  await page.close();
} finally {
  await close();
}
const radius = (BODY_FILL * Math.min(SIZE.width, SIZE.height)) / 2;
const scene = await measure(png, [SIZE.width / 2, SIZE.height / 2], radius);
if (outArg) {
  const dir = isAbsolute(outArg)
    ? pathToFileURL(outArg.endsWith('/') || outArg.endsWith('\\') ? outArg : `${outArg}/`)
    : new URL(`../${outArg.replace(/\/?$/, '/')}`, import.meta.url);
  await mkdir(dir, { recursive: true });
  await sharp(png)
    .webp({ quality: 88 })
    .toFile(fileURLToPath(new URL('io-galileo-1999.webp', dir)));
}

// --- Informe ------------------------------------------------------------------------------------
const y = luminance(photo.mean);
const photoLab = labAt(photo.chroma, y);
const sceneLab = labAt(scene.chroma, y);
const deltaE = Math.hypot(photoLab.a - sceneLab.a, photoLab.b - sceneLab.b);
const f = (v, d = 2) => v.toFixed(d).replace('.', ',');
const pct = (v) => `${f(100 * v, 1)} %`;
const lab = (c) => `a* ${f(c.a, 1)}, b* ${f(c.b, 1)} (C* ${f(c.c, 1)}, h ${f(c.h, 1)}°)`;
console.log(`Ío, el 60 % central del disco (foto: ${photo.pixels} px; escena: ${scene.pixels} px)`);
console.log(
  `Cromaticidad (RGB lineal / luminancia): foto ${photo.chroma.map((v) => f(v, 3)).join(' · ')}`,
);
console.log(
  `                                       escena ${scene.chroma.map((v) => f(v, 3)).join(' · ')}`,
);
console.log(`Color medio, con la luminancia de la foto (L* ${f(photoLab.L, 1)}):`);
console.log(`  foto   ${lab(photoLab)}`);
console.log(`  escena ${lab(sceneLab)}`);
console.log(
  `  ΔE*ab ${f(deltaE, 1)} (tolerancia ${f(IO_TOLERANCE_DE, 1)}): ${deltaE <= IO_TOLERANCE_DE ? 'dentro' : 'FUERA'}`,
);
console.log('Variedad de color, píxel a píxel: foto · escena');
console.log(`  dispersión de a* y b*: ${f(photo.spread, 1)} · ${f(scene.spread, 1)}`);
console.log(`  casi neutro (C* < 12): ${pct(photo.neutral)} · ${pct(scene.neutral)}`);
console.log(`  naranja o rojo (h < 75°, C* > 20): ${pct(photo.orange)} · ${pct(scene.orange)}`);
console.log(`  oscuro (L* < 0,6 × mediana): ${pct(photo.dark)} · ${pct(scene.dark)}`);
console.log(
  `Ganancia por canal que llevaría la escena al color medio de la foto: ${photo.chroma.map((v, c) => f(v / scene.chroma[c], 3)).join(' · ')}`,
);
