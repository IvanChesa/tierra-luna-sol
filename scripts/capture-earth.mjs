// Capturas de la Tierra para el informe de la fase 5 (?captura=1): su vista, el mediodía y la
// medianoche UTC del solsticio, la vista general y la geometría de la foto de EPIC del 21-06-2016
// (DSCOVR), con la foto al lado si está en la caché de `measure-reference-colors.mjs`.
// Uso: npm run build && node scripts/capture-earth.mjs docs/informes/img/fase-5 [--solo=a,b]
import { mkdir, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
if (!out) throw new Error('Uso: node scripts/capture-earth.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
const SQUARE = { width: 900, height: 900, scale: 1 };
/** La foto de EPIC del Pacífico (2016-06-21 22:58:24 UT; docs/realismo/referencias.md). */
const EPIC = join(tmpdir(), 'tls-referencias', 'epic_1b_20160621230313.jpg');

/** Una vista guiada: su botón en el panel de la Tierra. */
const guided = (title) => async (page) => {
  await page.getByRole('button', { name: title, exact: true }).click();
};

/** [nombre, ruta, tamaño, acción tras cargar]. */
const SHOTS = [
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['tierra-mediodia-utc', '/explorar/tierra?captura=1&fecha=2026-06-21T12:00Z', DESKTOP],
  ['tierra-medianoche-utc', '/explorar/tierra?captura=1&fecha=2026-06-21T00:00Z', DESKTOP],
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  [
    'tierra-epic-2016',
    '/?captura=1&cuerpo=tierra&fecha=2016-06-21T22:58Z&fase=9.4&latitud=22.3',
    SQUARE,
  ],
  ['movil-tierra', '/explorar/tierra?captura=1', MOBILE],
  // Las vistas guiadas (cada una pone su hora del día sobre la fecha de la captura).
  ['vista-tierra-completa', '/explorar/tierra?captura=1', DESKTOP, guided('La Tierra completa')],
  ['vista-pacifico', '/explorar/tierra?captura=1', DESKTOP, guided('El Pacífico')],
  ['vista-himalaya', '/explorar/tierra?captura=1', DESKTOP, guided('El Himalaya')],
  ['movil-vista-himalaya', '/explorar/tierra?captura=1', MOBILE, guided('El Himalaya')],
  ['vista-luces', '/explorar/tierra?captura=1', DESKTOP, guided('Las luces de la noche')],
  ['vista-espana', '/explorar/tierra?captura=1', DESKTOP, guided('España')],
  ['movil-vista-espana', '/explorar/tierra?captura=1', MOBILE, guided('España')],
  // El máximo del eclipse total del 12-08-2026 (17:45:51 UT, 65,2° N 25,2° O; catálogo de la NASA),
  // con la cámara cerca de la dirección del Sol y sobre la latitud del eclipse.
  [
    'tierra-eclipse-2026',
    '/?captura=1&cuerpo=tierra&fecha=2026-08-12T17:45:51Z&fase=25&latitud=50',
    SQUARE,
  ],
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
    // Junto a la foto de EPIC: el lienzo de la captura (sin la interfaz) y la foto, a la misma altura.
    if (name === 'tierra-epic-2016' && (await stat(EPIC).catch(() => null))) {
      const ours = await sharp(png).resize({ height: 900 }).png().toBuffer();
      const photo = await sharp(EPIC).resize({ height: 900 }).png().toBuffer();
      const width = (await sharp(photo).metadata()).width ?? 900;
      await sharp({ create: { width: 900 + width, height: 900, channels: 3, background: '#000' } })
        .composite([
          { input: ours, left: 0, top: 0 },
          { input: photo, left: 900, top: 0 },
        ])
        .webp({ quality: 90 })
        .toFile(file('tierra-epic-2016-comparada.webp'));
    }
    console.log(name);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
