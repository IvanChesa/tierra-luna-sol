// Capturas de los sistemas de lunas de la vista general para el informe de la fase 9b (D39): cada
// planeta con sus lunas de cerca, en el marco de la vista general (`?marco=ilustrativo`, solo en
// captura: el planeta enfocado sin pasar a su sistema local físico, y las texturas que se piden en la
// vista general), la vista general entera y la conjunción de Júpiter y Saturno de 2040, en escritorio
// y móvil. Con `--prefijo=antes` o `--prefijo=despues`, para comparar.
// Uso: npm run build && node scripts/capture-moon-systems.mjs docs/informes/img/fase-9b --prefijo=despues
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-moon-systems.mjs <carpeta de salida>');
const prefix = process.argv.find((arg) => arg.startsWith('--prefijo='))?.slice(10) ?? 'despues';
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
const webp = (png, name) => sharp(png).webp({ quality: 90 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };

/**
 * Una fecha con los anillos de Saturno abiertos (en 2026 están casi de canto) y lejos de su conjunción
 * con Urano de 2032, en la que los dos sistemas de lunas se comprimen (fase 9b).
 */
const OPEN_RINGS = '2029-06-01T00:00Z';
/** La conjunción de Júpiter y Saturno de 2040 (revisión del bloque C, C2). */
const CONJUNCTION = '2040-10-31T00:00Z';

/** Aleja (o acerca, con `key` «+») la cámara `n` pasos del zoom (×1,4 cada uno, como sus botones). */
const zoomOut =
  (n, key = '-') =>
  async (page) => {
    for (let i = 0; i < n; i++) await page.keyboard.press(key);
  };
const zoomIn = (n) => zoomOut(n, '+');
const close = (body, date) =>
  `/?captura=1&cuerpo=${body}&marco=ilustrativo${date ? `&fecha=${date}` : ''}`;

/** [nombre, ruta, tamaño, acción tras cargar]. */
const SHOTS = [
  ['escritorio-jupiter-cerca', close('jupiter'), DESKTOP, zoomOut(2)],
  // Las lunas que se ven grandes, con su mapa sin enfocar su sistema (fase 9b, D42).
  ['escritorio-jupiter-mapas', close('jupiter'), DESKTOP, zoomIn(1)],
  ['escritorio-saturno-cerca', close('saturno', OPEN_RINGS), DESKTOP, zoomOut(3)],
  ['escritorio-saturno-cerca-2026', close('saturno'), DESKTOP, zoomOut(3)],
  ['escritorio-tierra-cerca', close('tierra'), DESKTOP, zoomOut(1)],
  ['escritorio-marte-cerca', close('marte'), DESKTOP, zoomOut(1)],
  ['escritorio-urano-cerca', close('urano'), DESKTOP, zoomOut(2)],
  ['escritorio-neptuno-cerca', close('neptuno'), DESKTOP, zoomOut(1)],
  ['escritorio-conjuncion-2040', close('jupiter', CONJUNCTION), DESKTOP, zoomOut(5)],
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  // La vista general, acercada: sin enfocar nada, los sistemas aparecen cuando su planeta crece.
  ['escritorio-sistema-cerca', '/?captura=1', DESKTOP, zoomIn(3)],
  ['movil-jupiter-cerca', close('jupiter'), MOBILE, zoomOut(2)],
  ['movil-saturno-cerca', close('saturno', OPEN_RINGS), MOBILE, zoomOut(3)],
  ['movil-sistema', '/?captura=1', MOBILE],
];

const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length);
const wanted = only ? new Set(only.split(',')) : null;

const { browser, close: closeAll } = await openBrowser();
try {
  for (const [name, path, size, action] of SHOTS) {
    if (wanted && !wanted.has(name)) continue;
    const { page, problems } = await openViewer(browser, path, size);
    if (action) {
      // El foco en el lienzo: las teclas del zoom son suyas.
      await page.locator('canvas').first().focus();
      await action(page);
      await page.waitForTimeout(800);
      await waitForIdle(page).catch(() => undefined);
    }
    // El puntero, fuera: si no, su resaltado (`:hover`) parece un estado.
    await page.mouse.move(0, 0);
    await webp(await page.screenshot(), `${prefix}-${name}.webp`);
    console.log(`${prefix}-${name}`);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await closeAll();
}
