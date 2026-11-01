// Capturas de las órbitas y estelas que de cerca se ven como rectas (revisión del bloque D, D3), antes
// y después del cambio, deterministas (?captura=1): las cinco vistas en las que se veían (el ansa de
// Saturno ampliada, Saturno con la geometría del Hubble de 2019, Europa delante de Júpiter y las vistas
// Tierra y Luna) y tres en las que las órbitas se tienen que seguir viendo (la vista general y los
// sistemas de Saturno y de Júpiter), en escritorio y móvil.
// Uso: npm run build && node scripts/capture-straight-orbits.mjs docs/informes/img/fase-7/rectas-antes
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-straight-orbits.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DEVICES = [
  ['escritorio', { width: 1600, height: 900, scale: 1 }],
  ['movil', { width: 390, height: 844, scale: 2, mobile: true }],
];
/** [nombre, ruta, solo el lienzo]: las de capture-rings.mjs, capture-moons.mjs, capture-earth.mjs y capture-moon.mjs. */
const SHOTS = [
  ['saturno-hubble-2019', '/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra', true],
  ['europa-jupiter', '/?captura=1&cuerpo=europa&detras=jupiter', false],
  ['tierra', '/explorar/tierra?captura=1', false],
  ['luna', '/explorar/luna?captura=1', false],
  // Donde las órbitas se ven curvas y se quedan.
  ['sistema', '/?captura=1', false],
  ['saturno', '/?captura=1&cuerpo=saturno', false],
  ['jupiter', '/?captura=1&cuerpo=jupiter', false],
];
/** El ansa ampliada de capture-rings.mjs (4000 × 2250 px, recortada alrededor del ansa derecha). */
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
  for (const [name, path, canvasOnly] of SHOTS) {
    for (const [device, size] of DEVICES) {
      const { page, problems } = await openViewer(browser, path, size);
      const png = canvasOnly ? await canvasPng(page) : await page.screenshot();
      await sharp(png)
        .webp({ quality: 88 })
        .toFile(file(`${device}-${name}.webp`));
      console.log(`${device}-${name}`);
      if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
      await page.close();
    }
  }
  const { page } = await openViewer(browser, ANSA.path, ANSA.size);
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
