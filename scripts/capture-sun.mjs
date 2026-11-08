// Capturas del Sol para el informe de la fase 9b (D41) y de la totalidad del cielo (E1): el Sol de
// cerca (solo el lienzo, como la comparativa de la fase 3b con el SDO, y con la interfaz, en escritorio
// y móvil), la vista general con su resplandor, el Sol para medir su limbo (`?medida=limbo`, solo
// «después») y el eclipse total del 12-08-2026 desde Fraga, de cerca y de lejos (como en la fase 8).
// Con `--prefijo=antes` o `--prefijo=despues`, para comparar (el «antes», con el build de la rama sin
// la entrega 9b.c).
// Uso: npm run build && node scripts/capture-sun.mjs docs/informes/img/fase-9b --prefijo=despues
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-sun.mjs <carpeta de salida>');
const prefix = process.argv.find((arg) => arg.startsWith('--prefijo='))?.slice(10) ?? 'despues';
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
const webp = (png, name) => sharp(png).webp({ quality: 90 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
const SQUARE = { width: 900, height: 900, scale: 1 };

/** El Sol de cerca: la fecha de la comparativa de la fase 3b con el SDO (10-05-2024). */
const SUN = '/?captura=1&cuerpo=sol&fecha=2024-05-10T00:00Z';
/** El eclipse total del 12-08-2026 desde Fraga (la franja de la totalidad), como en la fase 8. */
const FRAGA = '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:29:29Z';

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

/**
 * [nombre, ruta, tamaño, qué se guarda: «lienzo» (solo el 3D), «limpio» (el 3D con la vista limpia,
 * centrado en todo el lienzo) o «página» (con la interfaz), y si solo existe «después»].
 */
const SHOTS = [
  ['sol-cerca', SUN, SQUARE, 'clean'],
  ['escritorio-sol-cerca', SUN, DESKTOP, 'page'],
  ['movil-sol-cerca', SUN, MOBILE, 'page'],
  ['escritorio-sol-sistema', '/?captura=1', DESKTOP, 'page'],
  ['movil-sol-sistema', '/?captura=1', MOBILE, 'page'],
  ['sol-medida-limbo', `${SUN}&medida=limbo`, SQUARE, 'clean', true],
  [
    'escritorio-cielo-eclipse-fraga-cerca',
    `${FRAGA}&rumbo=285.33&altura=5.19&campo=3`,
    DESKTOP,
    'canvas',
  ],
  ['escritorio-cielo-eclipse-fraga', `${FRAGA}&rumbo=285.4&altura=12&campo=50`, DESKTOP, 'canvas'],
  ['movil-cielo-eclipse-fraga-cerca', `${FRAGA}&rumbo=285.33&altura=5.19&campo=4`, MOBILE, 'page'],
];

const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length);
const wanted = only ? new Set(only.split(',')) : null;

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, kind, afterOnly] of SHOTS) {
    if (wanted && !wanted.has(name)) continue;
    if (afterOnly && prefix === 'antes') continue;
    const { page, problems } = await openViewer(browser, path, size);
    if (kind === 'clean') {
      // La vista limpia (`V`) quita los paneles: el Sol, en el centro de todo el lienzo.
      await page.keyboard.press('v');
      await page.waitForTimeout(500);
      await waitForIdle(page).catch(() => undefined);
    }
    // El puntero, fuera: si no, su resaltado (`:hover`) parece un estado.
    await page.mouse.move(0, 0);
    const png = kind === 'page' ? await page.screenshot() : await canvasPng(page);
    await webp(png, `${prefix}-${name}.webp`);
    console.log(`${prefix}-${name}`);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
