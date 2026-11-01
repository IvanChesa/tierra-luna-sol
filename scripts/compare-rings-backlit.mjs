// Los anillos de Saturno a contraluz frente a PIA17172 (revisión del bloque D, D4), como
// compare-rings.mjs con la foto del Hubble: el color CIELAB de los anillos A, B y C y de la división de
// Cassini en la foto y en la escena con la misma geometría, y qué parte de cada uno sale saturada (un
// canal ≥ 250: blanco quemado).
//
// La foto: «The Day the Earth Smiled» (PIA17172, NASA/JPL-Caltech/SSI, 19-07-2013; mosaico de color
// natural de Cassini desde la sombra de Saturno, unos 17° por debajo del plano de los anillos: se ve su
// cara oscura, con la luz que la atraviesa). La elipse del anillo F (el núcleo, a 140 224 km; la línea
// fina más brillante), ajustada por mínimos cuadrados a 226 puntos de sus dos ansas: centro
// (4502,7, 1835,8), semiejes de 1936,4 y 575,7 px (una apertura de 17,3°, la de la foto) y sin giro. En
// la escena, la geometría de capture-rings.mjs (`saturno-cassini-2013`), y cada punto del plano de los
// anillos se proyecta con la cámara del motor, como en compare-rings.mjs.
//
// Se miden las ansas (a menos de ±17,5° del eje mayor y fuera del disco del planeta). La exposición de
// la foto es la de su procesado (deja ver los anillos tenues E y G): el brillo de cada anillo se da
// también respecto al del A. Lo que importa es el color y lo quemado.
//
// Uso: npm run build && node scripts/compare-rings-backlit.mjs [carpeta] [--swiftshader]
//   carpeta: si se da, guarda allí la captura de la escena (`saturno-cassini-2013.webp`).
// La foto se descarga a una carpeta temporal del sistema (no entra en el repo).
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { BODY_DATA } from '../src/app/data/body-data.ts';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const CACHE = join(tmpdir(), 'tls-referencias');
const PHOTO = {
  url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia17/pia17172/PIA17172.jpg',
  center: [4502.7, 1835.8],
  /** Semiejes de la elipse del núcleo del anillo F (140 224 km) y su giro. */
  a: 1936.4,
  b: 575.7,
  angleDeg: 0,
  fKm: 140_224,
};
const SCENE_PATH = '/?captura=1&cuerpo=saturno&fecha=2013-07-19T21:30Z&fase=176&latitud=-17';
const SIZE = { width: 1600, height: 900, scale: 1 };
const BANDS = {
  C: [80_000, 90_000],
  B: [95_000, 115_000],
  Cassini: [118_500, 121_500],
  A: [124_000, 135_000],
};

const SATURN = BODY_DATA.saturno;
const EQUATOR_KM = SATURN.physical.radiusKm.value;

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const TABLE = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));

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
    at(x, y) {
      const px = Math.round(x);
      const py = Math.round(y);
      if (px < 0 || py < 0 || px >= info.width || py >= info.height) return null;
      const i = (py * info.width + px) * 3;
      return [data[i], data[i + 1], data[i + 2]];
    },
  };
}

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
    Y: y,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/**
 * Cada banda: su color medio y qué parte de sus píxeles tiene algún canal ≥ 250. `point(km, phi)`: el
 * píxel de un punto del plano de los anillos (phi, el ángulo paramétrico de la elipse, 0 en el eje
 * mayor); `inDisc(x, y)`: si cae sobre el disco del planeta (que tapa la parte de atrás).
 */
function measure(image, point, inDisc) {
  return Object.fromEntries(
    Object.entries(BANDS).map(([name, [from, to]]) => {
      const sum = [0, 0, 0];
      let count = 0;
      let saturated = 0;
      for (let km = from + 50; km < to; km += 100) {
        for (const side of [0, Math.PI]) {
          for (let deg = -17.5; deg <= 17.5; deg += 0.5) {
            const [x, y] = point(km, side + (deg * Math.PI) / 180);
            if (inDisc(x, y)) continue;
            const p = image.at(x, y);
            if (!p) continue;
            for (let c = 0; c < 3; c++) sum[c] += TABLE[p[c]];
            if (Math.max(...p) >= 250) saturated++;
            count++;
          }
        }
      }
      const mean = sum.map((v) => v / count);
      return [name, { lab: cielab(mean), saturated: saturated / count, count }];
    }),
  );
}

// --- La foto ------------------------------------------------------------------------------------
const photo = await rgbImage(await download(PHOTO.url));
const cos = Math.cos((PHOTO.angleDeg * Math.PI) / 180);
const sin = Math.sin((PHOTO.angleDeg * Math.PI) / 180);
const photoPoint = (km, phi) => {
  const t = km / PHOTO.fKm;
  const u = t * PHOTO.a * Math.cos(phi);
  const v = t * PHOTO.b * Math.sin(phi);
  return [PHOTO.center[0] + u * cos - v * sin, PHOTO.center[1] + u * sin + v * cos];
};
// El disco del planeta, con su radio ecuatorial a la escala de la elipse (y el polar, achatado).
const photoEquatorPx = (EQUATOR_KM / PHOTO.fKm) * PHOTO.a;
const flattening = SATURN.physical.flatteningRatio?.value ?? 0;
const photoInDisc = (x, y) =>
  ((x - PHOTO.center[0]) / photoEquatorPx) ** 2 +
    ((y - PHOTO.center[1]) / (photoEquatorPx * (1 - flattening))) ** 2 <=
  1.02;
const photoResult = measure(photo, photoPoint, photoInDisc);

// --- La escena ----------------------------------------------------------------------------------
const [outArg] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const { browser, close } = await openBrowser();
let sceneResult;
try {
  const { page, problems } = await openViewer(browser, SCENE_PATH, SIZE);
  // La vista limpia (`V`): sin paneles, la escena ocupa todo el lienzo.
  await page.keyboard.press('v');
  await waitForIdle(page);
  const { base64, projection } = await page.evaluate(async (equatorKm) => {
    const engine = window.__tlsViewer.engine;
    const world = engine.world;
    const rings = world.scene.getObjectByName('saturn-rings');
    const saturn = world.scene.getObjectByName('saturno');
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
    const toPixel = (clip) => [
      ((clip[0] / clip[3] + 1) / 2) * width,
      ((1 - clip[1] / clip[3]) / 2) * height,
    ];
    // Un punto del plano de los anillos (en radios ecuatoriales) → píxel del lienzo.
    const project = (x, z) => toPixel(mul(p, mul(v, mul(m, [x, 0, z, 1]))));
    const center = project(0, 0);
    let best = { theta: 0, length: 0 };
    for (let k = 0; k < 3600; k++) {
      const theta = (k / 3600) * Math.PI * 2;
      const [x, y] = project(Math.cos(theta), Math.sin(theta));
      const length = Math.hypot(x - center[0], y - center[1]);
      if (length > best.length) best = { theta, length };
    }
    // El contorno del disco del planeta en pantalla: su radio, de la proyección de su ecuador.
    const blob = await engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const table = {};
    for (let km = 80_000; km <= 135_000; km += 100) {
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
    // El disco: el centro de Saturno y su radio aparente (el de la esfera del planeta en pantalla).
    saturn.updateWorldMatrix(true, false);
    const s = saturn.matrixWorld.elements;
    const sc = toPixel(mul(p, mul(v, [s[12], s[13], s[14], 1])));
    const radiusWorld = Math.hypot(s[0], s[1], s[2]);
    const dist = Math.hypot(
      s[12] - camera.position.x,
      s[13] - camera.position.y,
      s[14] - camera.position.z,
    );
    const discPx = (radiusWorld / dist / Math.tan((camera.fov * Math.PI) / 360)) * (height / 2);
    return { base64: btoa(binary), projection: { table, disc: { center: sc, radius: discPx } } };
  }, EQUATOR_KM);
  if (problems.length) console.warn(problems.join('\n'));
  const png = Buffer.from(base64, 'base64');
  const scene = await rgbImage(png);
  const angles = [];
  for (const side of [0, Math.PI]) {
    for (let deg = -17.5; deg <= 17.5; deg += 0.5) angles.push(side + (deg * Math.PI) / 180);
  }
  const scenePoint = (km, phi) => {
    const row = projection.table[Math.round(km / 100) * 100];
    const index = angles.findIndex((a) => Math.abs(a - phi) < 1e-6);
    return row[Math.max(index, 0)];
  };
  const { disc } = projection;
  const sceneInDisc = (x, y) =>
    Math.hypot(x - disc.center[0], y - disc.center[1]) <= disc.radius * 1.02;
  sceneResult = measure(scene, scenePoint, sceneInDisc);
  if (outArg) {
    const dir = isAbsolute(outArg)
      ? pathToFileURL(outArg.endsWith('/') || outArg.endsWith('\\') ? outArg : `${outArg}/`)
      : new URL(`../${outArg.replace(/\/?$/, '/')}`, import.meta.url);
    await mkdir(dir, { recursive: true });
    await sharp(png)
      .webp({ quality: 88 })
      .toFile(fileURLToPath(new URL('saturno-cassini-2013.webp', dir)));
  }
  await page.close();
} finally {
  await close();
}

// --- Informe ------------------------------------------------------------------------------------
const f = (v, d = 1) => v.toFixed(d).replace('.', ',');
const row = (r, a) =>
  `L* ${f(r.lab.L)} (brillo / A ${f(r.lab.Y / a.lab.Y, 2)}), C* ${f(r.lab.c)}, h ${Math.round(r.lab.h)}°, saturado ${f(100 * r.saturated)} %`;
console.log('Anillos a contraluz (ansas): foto PIA17172 · escena');
for (const name of Object.keys(BANDS)) {
  console.log(`${name.padEnd(8)} foto   ${row(photoResult[name], photoResult.A)}`);
  console.log(`${''.padEnd(8)} escena ${row(sceneResult[name], sceneResult.A)}`);
}
