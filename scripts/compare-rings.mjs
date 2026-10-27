// Anillos de Saturno frente a la foto del Hubble (revisión del bloque R, R1): mide, radio a radio, el
// brillo de los anillos respecto al disco, su cromaticidad y el contraste de su estructura fina, en la
// foto (heic1917a, 20-06-2019) y en la escena con la misma geometría
// (`?cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra`, como `capture-realism.mjs`).
//
// Uso: npm run build && node scripts/compare-rings.mjs [carpeta] [--swiftshader]
//   carpeta: si se da, guarda allí la captura de la escena (`saturno-hubble-2019.webp`).
//
// La foto se descarga a una carpeta temporal del sistema (no entra en el repo; docs/realismo/
// referencias.md dice de dónde sale y con qué licencia). Todo en RGB lineal (la imagen se decodifica
// como sRGB); la cromaticidad es RGB / luminancia (Rec. 709).
//
// - En la foto, la elipse del borde exterior del anillo A y el disco son los de
//   `measure-reference-colors.mjs` (centro, semiejes y giro medidos a mano en la imagen).
// - En la escena, cada punto del plano de los anillos se proyecta con la cámara del motor
//   (`window.__tlsViewer.engine.world`, solo en el modo de captura): las mismas bandas, sin medir a ojo.
// - Las dos miden las ansas (a menos de ±17,5° del eje mayor de la elipse, |v| < 0,3 b) y el disco
//   dentro de medio radio ecuatorial alrededor del centro.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { BODY_DATA } from '../src/app/data/body-data.ts';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const CACHE = join(tmpdir(), 'tls-referencias');
const PHOTO = {
  url: 'https://cdn.esahubble.org/archives/images/screen/heic1917a.jpg',
  center: [643, 396],
  /** Semiejes de la elipse del borde exterior del anillo A (136 775 km) y su giro. */
  a: 401.7,
  b: 166.6,
  angleDeg: -5.28,
  /** Radio ecuatorial del globo en la imagen. */
  equatorPx: 177,
};
const SCENE_PATH = '/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra';
const SIZE = { width: 900, height: 900, scale: 1 };

const SATURN = BODY_DATA.saturno;
const RINGS = SATURN.rings;
if (!RINGS) throw new Error('Faltan los anillos de Saturno en body-data.ts');
const EQUATOR_KM = SATURN.physical.radiusKm.value;
const OUTER_KM = RINGS.outerRadiusKm.value;

/** Bandas del perfil (km) y las regiones del contraste fino, lejos de los bordes de cada anillo. */
const BIN_KM = 2500;
const PROFILE_FROM = 75_000;
const PROFILE_TO = 137_500;
const FINE = {
  B: [95_000, 115_000],
  A: [124_000, 133_000],
};
const FINE_BIN_KM = 500;
/** Bandas con nombre para el resumen (las del matiz medido en la fase 3b). */
const BANDS = {
  C: [80_000, 90_000],
  B: [95_000, 115_000],
  Cassini: [118_500, 121_500],
  A: [124_000, 135_000],
};

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const TABLE = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));
const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

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

async function rgbImage(input) {
  const { data, info } = await sharp(input)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    width: info.width,
    height: info.height,
    at(x, y) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= info.width || py >= info.height) return null;
      const i = (py * info.width + px) * 3;
      return [TABLE[data[i]], TABLE[data[i + 1]], TABLE[data[i + 2]]];
    },
  };
}

/**
 * Las medidas, con una función `point(km, phi)` que da el píxel de un punto del plano de los anillos
 * (phi: ángulo paramétrico de la elipse proyectada, 0 en el eje mayor) y el disco.
 */
function measure(image, point, disc) {
  const mean = (samples) => {
    const sum = [0, 0, 0];
    for (const s of samples) for (let c = 0; c < 3; c++) sum[c] += s[c];
    return samples.length ? sum.map((v) => v / samples.length) : null;
  };
  // El disco: medio radio ecuatorial alrededor del centro.
  const discSamples = [];
  const [cx, cy] = disc.center;
  const r = disc.radiusPx * 0.5;
  for (let y = Math.floor(cy - r); y <= cy + r; y++) {
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const p = image.at(x, y);
      if (p) discSamples.push(p);
    }
  }
  const discMean = mean(discSamples);
  const discL = luminance(discMean);
  // Las ansas: para cada radio, ángulos paramétricos a ±17,5° del eje mayor, en los dos lados.
  const ring = (fromKm, toKm, stepKm = 100) => {
    const samples = [];
    for (let km = fromKm + stepKm / 2; km < toKm; km += stepKm) {
      for (const side of [0, Math.PI]) {
        for (let deg = -17.5; deg <= 17.5; deg += 0.5) {
          const [x, y] = point(km, side + (deg * Math.PI) / 180);
          const p = image.at(x, y);
          if (p) samples.push(p);
        }
      }
    }
    return mean(samples);
  };
  const profile = [];
  for (let km = PROFILE_FROM; km < PROFILE_TO; km += BIN_KM) {
    const m = ring(km, km + BIN_KM);
    if (m) profile.push({ km, l: luminance(m) / discL, chroma: m.map((v) => v / luminance(m)) });
  }
  const bands = Object.fromEntries(
    Object.entries(BANDS).map(([name, [from, to]]) => {
      const m = ring(from, to);
      return [name, { l: luminance(m) / discL, chroma: m.map((v) => v / luminance(m)) }];
    }),
  );
  // Estructura fina: desviación típica / media del brillo en bandas de 500 km.
  const fine = Object.fromEntries(
    Object.entries(FINE).map(([name, [from, to]]) => {
      const values = [];
      for (let km = from; km < to; km += FINE_BIN_KM) {
        const m = ring(km, km + FINE_BIN_KM, 50);
        if (m) values.push(luminance(m));
      }
      const avg = values.reduce((s, v) => s + v, 0) / values.length;
      const sd = Math.sqrt(values.reduce((s, v) => s + (v - avg) ** 2, 0) / values.length);
      return [name, sd / avg];
    }),
  );
  return { disc: { l: discL, chroma: discMean.map((v) => v / discL) }, profile, bands, fine };
}

// --- La foto ------------------------------------------------------------------------------------
const photo = await rgbImage(await download(PHOTO.url));
const cos = Math.cos((PHOTO.angleDeg * Math.PI) / 180);
const sin = Math.sin((PHOTO.angleDeg * Math.PI) / 180);
const photoPoint = (km, phi) => {
  const t = km / OUTER_KM;
  const u = t * PHOTO.a * Math.cos(phi);
  const v = t * PHOTO.b * Math.sin(phi);
  return [PHOTO.center[0] + u * cos - v * sin, PHOTO.center[1] + u * sin + v * cos];
};
const photoResult = measure(photo, photoPoint, {
  center: PHOTO.center,
  radiusPx: PHOTO.equatorPx,
});

// --- La escena ----------------------------------------------------------------------------------
const [outArg] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const { browser, close } = await openBrowser();
let sceneResult;
try {
  const { page, problems } = await openViewer(browser, SCENE_PATH, SIZE);
  // Como en capture-realism.mjs: la vista limpia (`V`) quita los paneles y la escena se encuadra en
  // todo el lienzo (Saturno lo llena y los anillos se miden con más píxeles).
  await page.keyboard.press('v');
  await waitForIdle(page);
  const { base64, projection } = await page.evaluate(async (equatorKm) => {
    const engine = window.__tlsViewer.engine;
    const world = engine.world;
    const rings = world.scene.getObjectByName('saturn-rings');
    const camera = world.camera;
    rings.updateWorldMatrix(true, false);
    const m = rings.matrixWorld.elements;
    const v = camera.matrixWorldInverse.elements;
    const p = camera.projectionMatrix.elements;
    const canvas = document.querySelector('tls-viewer-canvas canvas');
    const width = canvas.width;
    const height = canvas.height;
    const mul = (e, [x, y, z, w]) => [
      e[0] * x + e[4] * y + e[8] * z + e[12] * w,
      e[1] * x + e[5] * y + e[9] * z + e[13] * w,
      e[2] * x + e[6] * y + e[10] * z + e[14] * w,
      e[3] * x + e[7] * y + e[11] * z + e[15] * w,
    ];
    // Un punto del plano de los anillos (en radios ecuatoriales) → píxel del lienzo.
    const project = (x, z) => {
      const clip = mul(p, mul(v, mul(m, [x, 0, z, 1])));
      return [((clip[0] / clip[3] + 1) / 2) * width, ((1 - clip[1] / clip[3]) / 2) * height];
    };
    const center = project(0, 0);
    // La dirección del plano que cae en el eje mayor de la elipse proyectada (la más larga).
    let best = { theta: 0, length: 0 };
    for (let k = 0; k < 3600; k++) {
      const theta = (k / 3600) * Math.PI * 2;
      const [x, y] = project(Math.cos(theta), Math.sin(theta));
      const length = Math.hypot(x - center[0], y - center[1]);
      if (length > best.length) best = { theta, length };
    }
    const blob = await engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    // Para medir fuera, una tabla de proyecciones: radios de 100 km en 100 km y ángulos de 0,5°.
    const table = {};
    for (let km = 70_000; km <= 140_000; km += 50) {
      const row = [];
      for (const side of [0, Math.PI]) {
        for (let deg = -17.5; deg <= 17.5; deg += 0.5) {
          const theta = best.theta + side + (deg * Math.PI) / 180;
          const r = km / equatorKm;
          row.push(project(r * Math.cos(theta), r * Math.sin(theta)));
        }
      }
      table[km] = row;
    }
    return {
      base64: btoa(binary),
      projection: { center, equatorPx: best.length, table },
    };
  }, EQUATOR_KM);
  if (problems.length) console.warn(problems.join('\n'));
  const png = Buffer.from(base64, 'base64');
  const scene = await rgbImage(png);
  // phi (ángulo de la elipse) ↔ el índice de la tabla: mismo orden que en la página.
  const angles = [];
  for (const side of [0, Math.PI]) {
    for (let deg = -17.5; deg <= 17.5; deg += 0.5) angles.push(side + (deg * Math.PI) / 180);
  }
  const scenePoint = (km, phi) => {
    const row = projection.table[Math.round(km / 50) * 50];
    let index = angles.findIndex((a) => Math.abs(a - phi) < 1e-6);
    if (index < 0) index = 0;
    return row[index];
  };
  sceneResult = measure(scene, scenePoint, {
    center: projection.center,
    radiusPx: projection.equatorPx,
  });
  if (outArg) {
    const dir = isAbsolute(outArg)
      ? pathToFileURL(outArg.endsWith('/') || outArg.endsWith('\\') ? outArg : `${outArg}/`)
      : new URL(`../${outArg.replace(/\/?$/, '/')}`, import.meta.url);
    await mkdir(dir, { recursive: true });
    await sharp(png)
      .webp({ quality: 82, effort: 6 })
      .toFile(fileURLToPath(new URL('saturno-hubble-2019.webp', dir)));
  }
  await page.close();
} finally {
  await close();
}

// --- Informe ------------------------------------------------------------------------------------
const f = (v, d = 2) => v.toFixed(d).replace('.', ',');
const chroma = (c) => c.map((v) => f(v)).join(' · ');
console.log('Disco (medio radio): foto', chroma(photoResult.disc.chroma));
console.log('                     escena', chroma(sceneResult.disc.chroma));
console.log('\nBanda       | brillo / disco: foto · escena | cromaticidad: foto  ·  escena');
for (const name of Object.keys(BANDS)) {
  const a = photoResult.bands[name];
  const b = sceneResult.bands[name];
  console.log(
    `${name.padEnd(11)} | ${f(a.l)} · ${f(b.l)} | ${chroma(a.chroma)}  ·  ${chroma(b.chroma)}`,
  );
}
console.log('\nEstructura fina (desviación / media en bandas de 500 km): foto · escena');
for (const name of Object.keys(FINE)) {
  console.log(`${name}: ${f(photoResult.fine[name], 3)} · ${f(sceneResult.fine[name], 3)}`);
}
console.log('\nPerfil (miles de km): brillo / disco, foto · escena');
for (const row of photoResult.profile) {
  const other = sceneResult.profile.find((r) => r.km === row.km);
  console.log(
    `${f(row.km / 1000, 1).padStart(6)}  ${f(row.l)} · ${other ? f(other.l) : '—'}   ${chroma(row.chroma)}  ·  ${other ? chroma(other.chroma) : '—'}`,
  );
}
