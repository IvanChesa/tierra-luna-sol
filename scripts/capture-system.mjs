// Capturas de la vista general del sistema solar para el informe de la fase 4b (?captura=1): las
// estelas de color (D34) en pausa, hacia atrás y reproduciendo, los planetas más grandes y un planeta
// enfocado, en escritorio, portátil y móvil.
// Uso: npm run build && node scripts/capture-system.mjs docs/informes/img/fase-4b [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-system.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
const webp = (png, name) => sharp(png).webp({ quality: 90 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const LAPTOP = { width: 1280, height: 720, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };

const press =
  (...keys) =>
  async (page) => {
    for (const key of keys) await page.keyboard.press(key);
  };
/** Reproduce un momento (a 3 días/s, la velocidad de la vista general) y pausa. */
const playBriefly = async (page) => {
  await page.keyboard.press('k');
  await page.waitForTimeout(2000);
  await page.keyboard.press('k');
};

/** [nombre, ruta, tamaño, acción tras cargar]. */
const SHOTS = [
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  ['escritorio-sistema-atras', '/?captura=1', DESKTOP, press('r')],
  ['escritorio-sistema-reproduciendo', '/?captura=1', DESKTOP, playBriefly],
  ['escritorio-jupiter', '/?captura=1&cuerpo=jupiter', DESKTOP],
  ['escritorio-saturno', '/?captura=1&cuerpo=saturno', DESKTOP],
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['portatil-sistema', '/?captura=1', LAPTOP],
  ['movil-sistema', '/?captura=1', MOBILE],
  ['movil-sistema-atras', '/?captura=1', MOBILE, press('r')],
  ['movil-jupiter', '/?captura=1&cuerpo=jupiter', MOBILE],
];

const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length);
const wanted = only ? new Set(only.split(',')) : null;

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, action] of SHOTS) {
    if (wanted && !wanted.has(name)) continue;
    const { page, problems } = await openViewer(browser, path, size);
    if (action) {
      await action(page);
      await page.waitForTimeout(800);
      await waitForIdle(page).catch(() => undefined);
    }
    // El puntero, fuera: si no, su resaltado (`:hover`) parece un estado.
    await page.mouse.move(0, 0);
    await webp(await page.screenshot(), `${name}.webp`);
    console.log(name);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
