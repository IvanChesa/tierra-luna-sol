// Capturas de la interfaz del explorador para los informes (?captura=1): escritorio, portátil y
// móvil, con los estados que piden las fases 3 y 3c (fichas de cuerpos y su fila de lunas, tarjeta,
// índice abierto, «Controles +», vistas, atajos, vista limpia, avisos, límite de fechas, carga, error
// y velocidades altas).
// Uso: npm run build && node scripts/capture-ui.mjs docs/informes/img/fase-3c [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, pageOptions, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-ui.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
const webp = (png, name) => sharp(png).webp({ quality: 88 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const LAPTOP = { width: 1280, height: 720, scale: 1 };
/** El escritorio más estrecho (64 rem): la barra de tiempo, en su versión compacta. */
const NARROW = { width: 1024, height: 768, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
/** Un teléfono pequeño y uno en horizontal, y una ventana de 1280 × 720 con el zoom al 200 %. */
const SMALL = { width: 360, height: 640, scale: 2, mobile: true };
const LANDSCAPE = { width: 844, height: 390, scale: 2, mobile: true };
const ZOOM_200 = { width: 640, height: 360, scale: 2 };
/** «Controles +» abierto (en móvil, una hoja). */
const controls = async (page) => page.click('.time__more');
/** El panel «Índice» abierto. */
const index = async (page) => page.click('.index-toggle');

const press =
  (...keys) =>
  async (page) => {
    for (const key of keys) await page.keyboard.press(key);
  };
/** A 1 año/s (el último escalón: «.» no pasa de él) y reproduciendo. */
const yearPerSecond = press(...Array(8).fill('.'), 'k');

/** Las estrellas no llegan nunca: la escena se queda en «Preparando la escena 3D…». */
const holdStars = async (page) => page.route('**/data/stars.bin', () => undefined);
/** Las estrellas fallan: estado de error. */
const failStars = async (page) =>
  page.route('**/data/stars.bin', (route) => route.fulfill({ status: 503 }));

/**
 * [nombre, ruta, tamaño, acción tras cargar, preparación antes de cargar, selector que esperar]. Con
 * preparación, la escena no llega a «lista»: se espera al selector (y a la interfaz diferida).
 */
const SHOTS = [
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  ['escritorio-ficha-saturno', '/?captura=1&cuerpo=saturno', DESKTOP],
  ['escritorio-indice-saturno', '/?captura=1&cuerpo=saturno', DESKTOP, index],
  ['escritorio-luna-de-saturno', '/?captura=1&cuerpo=titan', DESKTOP],
  ['escritorio-controles', '/?captura=1&cuerpo=jupiter', DESKTOP, controls],
  ['portatil-ficha-jupiter', '/?captura=1&cuerpo=jupiter', LAPTOP],
  ['portatil-indice', '/?captura=1', LAPTOP, index],
  ['estrecho-ficha-saturno', '/?captura=1&cuerpo=saturno', NARROW],
  ['estrecho-controles', '/?captura=1', NARROW, controls],
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['escritorio-luna', '/explorar/luna?captura=1', DESKTOP],
  ['movil-sistema', '/?captura=1', MOBILE],
  ['movil-ficha-saturno', '/?captura=1&cuerpo=saturno', MOBILE],
  ['movil-indice', '/?captura=1', MOBILE, index],
  ['movil-controles', '/?captura=1', MOBILE, controls],
  ['movil-tierra', '/explorar/tierra?captura=1', MOBILE],
  ['movil-luna', '/explorar/luna?captura=1', MOBILE],
  ['movil-pequeno', '/?captura=1', SMALL],
  ['movil-pequeno-ficha', '/?captura=1&cuerpo=saturno', SMALL],
  ['movil-pequeno-controles', '/?captura=1', SMALL, controls],
  ['movil-horizontal', '/?captura=1', LANDSCAPE],
  ['movil-horizontal-ficha', '/?captura=1&cuerpo=saturno', LANDSCAPE],
  ['zoom-200', '/?captura=1', ZOOM_200],
  ['zoom-200-controles', '/?captura=1', ZOOM_200, controls],
  ['escritorio-atajos', '/?captura=1', DESKTOP, press('?')],
  ['movil-menu', '/?captura=1', MOBILE, async (page) => page.click('.site-menu-button')],
  ['escritorio-vista-limpia', '/?captura=1', DESKTOP, press('v')],
  ['escritorio-aviso-url', '/?captura=1&fecha=2030-02-31T00:00Z&cuerpo=pluton', DESKTOP],
  ['escritorio-limite-2100', '/?captura=1&fecha=2100-12-31T23:00Z', DESKTOP, yearPerSecond],
  // Con Marte enfocado a 1 año/s, Fobos y Deimos se dibujan como su órbita (§4.5).
  ['escritorio-aliasing-marte', '/?captura=1&cuerpo=marte', DESKTOP, yearPerSecond],
  [
    'escritorio-carga',
    '/?captura=1',
    DESKTOP,
    null,
    holdStars,
    '.viewer-status:not(.viewer-status--error)',
  ],
  [
    'movil-carga',
    '/?captura=1',
    MOBILE,
    null,
    holdStars,
    '.viewer-status:not(.viewer-status--error)',
  ],
  ['escritorio-error', '/?captura=1', DESKTOP, null, failStars, '.viewer-status--error'],
  ['movil-error', '/?captura=1', MOBILE, null, failStars, '.viewer-status--error'],
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, action, setup, selector] of SHOTS) {
    if (setup) {
      const page = await browser.newPage(pageOptions(size));
      await setup(page);
      await page.goto(BASE + path);
      await page.waitForSelector(selector, { timeout: 90_000 });
      await page.waitForSelector('tls-time-controls', { timeout: 30_000 });
      await page.waitForTimeout(800);
      await webp(await page.screenshot(), `${name}.webp`);
      console.log(`${name}: ${selector}`);
      await page.close();
      continue;
    }
    const { page, problems } = await openViewer(browser, path, size);
    if (action) {
      await action(page);
      await page.waitForTimeout(1500);
      if (name !== 'escritorio-aliasing-marte') await waitForIdle(page).catch(() => undefined);
    }
    await webp(await page.screenshot(), `${name}.webp`);
    console.log(name);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
