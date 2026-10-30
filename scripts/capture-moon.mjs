// Capturas de la Luna para el informe de la fase 6 (?captura=1): su vista, el polo sur, la cara
// oculta, la luna llena, el cuarto creciente y la luz rasante, en escritorio y móvil, y las
// comparativas sin interfaz (cuadradas, en vista limpia).
// Uso: npm run build && node scripts/capture-moon.mjs docs/informes/img/fase-6 [--solo=a,b]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

/** Los píxeles del lienzo (`engine.capture()`), sin la interfaz. */
async function canvasPng(page) {
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
}

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-moon.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
const SQUARE = { width: 900, height: 900, scale: 1 };

/**
 * Fechas de noviembre de 2026 (astronomy-engine, `SearchMoonPhase`): luna nueva el 9 a las 07:02 UT,
 * cuarto creciente el 17 a las 11:48 y luna llena el 24 a las 14:54.
 */
const NEW = '2026-11-09T07:03Z';
const FIRST_QUARTER = '2026-11-17T11:48Z';
const FULL = '2026-11-24T14:54Z';

/** Pulsa un botón del panel de la Luna (por su texto o por su etiqueta), las veces que se diga. */
const press =
  (name, times = 1) =>
  async (page) => {
    for (let k = 0; k < times; k++) {
      await page.getByRole('button', { name, exact: true }).click();
    }
  };

/** [nombre, ruta, tamaño, acción tras cargar]. */
const SHOTS = [
  ['escritorio-luna', '/explorar/luna?captura=1', DESKTOP],
  ['movil-luna', '/explorar/luna?captura=1', MOBILE],
  // Las vistas del panel (cada una lleva la fecha a su luz) y dos paradas del recorrido.
  ['vista-cara-visible', '/explorar/luna?captura=1', DESKTOP, press('Cara visible')],
  ['vista-cara-oculta', '/explorar/luna?captura=1', DESKTOP, press('Cara oculta')],
  ['vista-polo-sur', '/explorar/luna?captura=1', DESKTOP, press('Polo sur')],
  ['vista-luz-rasante', '/explorar/luna?captura=1', DESKTOP, press('Luz rasante')],
  ['recorrido-copernico', '/explorar/luna?captura=1', DESKTOP, press('Parada siguiente', 2)],
  ['recorrido-shackleton', '/explorar/luna?captura=1', DESKTOP, press('Parada anterior')],
  ['movil-vista-luz-rasante', '/explorar/luna?captura=1', MOBILE, press('Luz rasante')],
  ['movil-vista-polo-sur', '/explorar/luna?captura=1', MOBILE, press('Polo sur')],
  // Desde la Tierra, en sus fases (la geometría real de la cámara: `desde=tierra`).
  ['luna-llena', `/?captura=1&cuerpo=luna&fecha=${FULL}&desde=tierra`, SQUARE],
  ['luna-cuarto-creciente', `/?captura=1&cuerpo=luna&fecha=${FIRST_QUARTER}&desde=tierra`, SQUARE],
  // La cara oculta, iluminada en luna nueva, con la cámara cerca de la dirección del Sol.
  ['luna-cara-oculta', `/?captura=1&cuerpo=luna&fecha=${NEW}&fase=15&latitud=0`, SQUARE],
  // El eclipse total del 3-3-2026 en su máximo (11:33:37 UT; catálogo de la NASA), desde la Tierra.
  ['luna-eclipse-2026', '/?captura=1&cuerpo=luna&fecha=2026-03-03T11:33:37Z&desde=tierra', SQUARE],
  // La libración en longitud, desde la Tierra: +6,65° el 6-1-2026 y −6,60° el 21-11-2026 (los extremos
  // de 2026 con la Luna gibosa; astronomy-engine, `Libration`).
  ['luna-libracion-este', '/?captura=1&cuerpo=luna&fecha=2026-01-06T06:00Z&desde=tierra', SQUARE],
  ['luna-libracion-oeste', '/?captura=1&cuerpo=luna&fecha=2026-11-21T18:00Z&desde=tierra', SQUARE],
  // El polo sur, desde 75° S sobre el ecuador de la Luna.
  ['luna-polo-sur', `/?captura=1&cuerpo=luna&fecha=${FIRST_QUARTER}&fase=70&latitud=-75`, SQUARE],
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
      await waitForIdle(page);
    }
    // Las comparativas cuadradas, sin interfaz: la vista limpia (`V`) centra la escena en el lienzo.
    const clean = size === SQUARE;
    if (clean) {
      await page.keyboard.press('v');
      await waitForIdle(page);
    }
    await page.mouse.move(0, 0);
    const png = clean ? await canvasPng(page) : await page.screenshot();
    await sharp(png)
      .webp({ quality: 90 })
      .toFile(file(`${name}.webp`));
    console.log(name);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
