// Capturas de la interfaz del explorador para el informe de la fase 3 (?captura=1): escritorio y
// móvil, con los estados que pide el plan (ficha, vistas, hoja desplegada, atajos, vista limpia,
// avisos, límite de fechas, error y velocidades altas).
// Uso: npm run build && node scripts/capture-ui.mjs docs/informes/img/fase-3 [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, PAGE_OPTIONS, openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-ui.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
const webp = (png, name) => sharp(png).webp({ quality: 88 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const LAPTOP = { width: 1280, height: 720, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2 };

const press =
  (...keys) =>
  async (page) => {
    for (const key of keys) await page.keyboard.press(key);
  };
/** A 1 año/s (cinco escalones por encima del tiempo real) y reproduciendo. */
const yearPerSecond = press('.', '.', '.', '.', '.', 'k');

/** [nombre, ruta, tamaño, acción tras cargar, preparación antes de cargar] */
const SHOTS = [
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  ['movil-sistema', '/?captura=1', MOBILE],
  ['escritorio-ficha-saturno', '/?captura=1&cuerpo=saturno', DESKTOP],
  ['movil-ficha-saturno', '/?captura=1&cuerpo=saturno', MOBILE],
  ['portatil-ficha-jupiter', '/?captura=1&cuerpo=jupiter', LAPTOP],
  ['escritorio-luna-de-saturno', '/?captura=1&cuerpo=titan', DESKTOP],
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['movil-tierra', '/explorar/tierra?captura=1', MOBILE],
  ['escritorio-luna', '/explorar/luna?captura=1', DESKTOP],
  ['movil-luna', '/explorar/luna?captura=1', MOBILE],
  ['movil-tiempo-desplegado', '/?captura=1', MOBILE, async (page) => page.click('.time__more')],
  ['escritorio-atajos', '/?captura=1', DESKTOP, press('?')],
  ['movil-menu', '/?captura=1', MOBILE, async (page) => page.click('.site-menu-button')],
  ['escritorio-vista-limpia', '/?captura=1', DESKTOP, press('v')],
  ['escritorio-aviso-url', '/?captura=1&fecha=2030-02-31T00:00Z&cuerpo=pluton', DESKTOP],
  ['escritorio-limite-2100', '/?captura=1&fecha=2100-12-31T23:00Z', DESKTOP, yearPerSecond],
  // Con Marte enfocado a 1 año/s, Fobos y Deimos se dibujan como su órbita (§4.5).
  ['escritorio-aliasing-marte', '/?captura=1&cuerpo=marte', DESKTOP, yearPerSecond],
  [
    'escritorio-error',
    '/?captura=1',
    DESKTOP,
    null,
    async (page) => page.route('**/data/stars.bin', (route) => route.fulfill({ status: 503 })),
  ],
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, action, setup] of SHOTS) {
    if (setup) {
      // El error no llega a «listo»: se abre a mano y se espera a la caja de error.
      const page = await browser.newPage({
        ...PAGE_OPTIONS,
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.scale,
      });
      await setup(page);
      await page.goto(BASE + path);
      await page.waitForSelector('.viewer-status--error', { timeout: 90_000 });
      await page.waitForTimeout(500);
      await webp(await page.screenshot(), `${name}.webp`);
      console.log(`${name}: estado de error`);
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
