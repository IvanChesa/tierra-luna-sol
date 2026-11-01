// Capturas de los anillos de Saturno (fase 7, D36), antes y después del cambio, deterministas
// (?captura=1): las geometrías de las fotos de referencia (docs/realismo/referencias.md), Saturno
// enfocado en 2026 (los anillos casi de canto) y la vista general, en escritorio y móvil; y el ansa
// derecha ampliada (una captura grande recortada), donde se tienen que ver las divisiones de Cassini,
// Encke y Keeler. Solo el lienzo (`engine.capture()`), sin la interfaz: se comparan los anillos.
// Uso: npm run build && node scripts/capture-rings.mjs docs/informes/img/fase-7/anillos-antes
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-rings.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DEVICES = [
  ['escritorio', { width: 1600, height: 900, scale: 1 }],
  ['movil', { width: 390, height: 844, scale: 2, mobile: true }],
];
/** [nombre, ruta]: las de `capture-realism.mjs` (la misma geometría que cada foto) y dos más. */
const SHOTS = [
  // Hubble OPAL, 20-06-2019 (heic1917a): desde la Tierra, los anillos abiertos 24°.
  ['saturno-hubble-2019', '/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra'],
  // Cassini, 19-07-2013 (PIA17172): a contraluz, fase ≈ 176°, 17° por debajo de los anillos (R2).
  [
    'saturno-cassini-2013',
    '/?captura=1&cuerpo=saturno&fecha=2013-07-19T21:30Z&fase=176&latitud=-17',
  ],
  // La sombra del planeta sobre los anillos y la de los anillos sobre el disco (2017).
  ['saturno-sombra', '/?captura=1&cuerpo=saturno&fecha=2017-06-15T12:00Z&fase=60&latitud=30'],
  // Saturno enfocado en 2026: los anillos, casi de canto (cruzaron el plano en marzo de 2025).
  ['saturno-2026', '/?captura=1&cuerpo=saturno&fecha=2026-10-24T00:00Z'],
  ['sistema', '/?captura=1'],
];
/**
 * El ansa ampliada: Saturno desde 30° sobre los anillos con la luz de 2017, en una captura de 4000 ×
 * 2250 px (a unos 60 km por píxel en el anillo A), recortada alrededor del ansa derecha.
 */
const ANSA = {
  path: '/?captura=1&cuerpo=saturno&fecha=2017-06-15T12:00Z&fase=40&latitud=30',
  size: { width: 4000, height: 2250, scale: 1 },
  crop: { left: 2500, top: 700, width: 1500, height: 850 },
};

/** El lienzo del motor en PNG (sin la interfaz). */
const canvasPng = async (page) => {
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  return Buffer.from(base64, 'base64');
};

const { browser, close } = await openBrowser();
try {
  for (const [name, path] of SHOTS) {
    for (const [device, size] of DEVICES) {
      const { page, problems } = await openViewer(browser, path, size);
      await sharp(await canvasPng(page))
        .webp({ quality: 88 })
        .toFile(file(`${device}-${name}.webp`));
      console.log(`${device}-${name}`);
      if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
      await page.close();
    }
  }
  const { page } = await openViewer(browser, ANSA.path, ANSA.size);
  // Más cerca: el ansa derecha, a unos 60 km por píxel.
  for (let k = 0; k < 2; k++) await page.keyboard.press('+');
  await waitForIdle(page);
  await sharp(await canvasPng(page))
    .extract(ANSA.crop)
    .webp({ quality: 90 })
    .toFile(file('ansa-ampliada.webp'));
  console.log('ansa-ampliada');
  await page.close();
} finally {
  await close();
}
