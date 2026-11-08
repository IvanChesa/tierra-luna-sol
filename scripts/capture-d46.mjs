// Capturas de la entrega 9b.f (fase 9b, D46): el Sol y la Tierra del explorador, con color realzado,
// en la fecha de las capturas de la referencia (15-01-2026, 00:00 UTC): el Sol de cerca y en la vista
// general, y la Tierra completa (de día, con África y Europa), el Pacífico y el Himalaya (sus vistas
// guiadas), en escritorio y móvil, con la interfaz. Con `--prefijo=antes` (el build de la rama sin la
// entrega) o `--prefijo=despues`.
// Con `--comparar`, además, cada vista con su «antes», su «después» y la de la referencia, lado a lado,
// en `assets-src/referencias/comparativas/` (ignorada por git: las capturas de la referencia son solo
// para medir y no se suben al repo, D46).
// Uso: npm run build && node scripts/capture-d46.mjs docs/informes/img/fase-9b --prefijo=despues
//      [--comparar] [--solo=nombre,…]
import { mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-d46.mjs <carpeta de salida> [--prefijo=…]');
const prefix = process.argv.find((arg) => arg.startsWith('--prefijo='))?.slice(10) ?? 'despues';
const compare = process.argv.includes('--comparar');
const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length);
const wanted = only ? new Set(only.split(',')) : null;
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const REF = new URL('../assets-src/referencias/', import.meta.url);
const COMPARE = new URL('comparativas/', REF);
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
const DATE = '2026-01-15T00:00Z';

/** Una vista guiada: su botón en el panel de la Tierra. */
const guided = (title) => async (page) => {
  await page.getByRole('button', { name: title, exact: true }).click();
};

/** [nombre, ruta, tamaño, acción tras cargar, la captura de la referencia con la que se compara]. */
const SHOTS = [
  [
    'd46-escritorio-sol-cerca',
    `/?captura=1&cuerpo=sol&fecha=${DATE}`,
    DESKTOP,
    null,
    'ref-sol-cerca-escritorio.png',
  ],
  [
    'd46-movil-sol-cerca',
    `/?captura=1&cuerpo=sol&fecha=${DATE}`,
    MOBILE,
    null,
    'ref-sol-cerca-movil.png',
  ],
  [
    'd46-escritorio-sol-sistema',
    `/?captura=1&fecha=${DATE}`,
    DESKTOP,
    null,
    'ref-sol-sistema-escritorio.png',
  ],
  ['d46-movil-sol-sistema', `/?captura=1&fecha=${DATE}`, MOBILE, null, 'ref-sol-sistema-movil.png'],
  [
    'd46-escritorio-tierra-completa',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    DESKTOP,
    guided('La Tierra completa'),
    'ref-planeta-africa-escritorio.png',
  ],
  [
    'd46-movil-tierra-completa',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    MOBILE,
    guided('La Tierra completa'),
    'ref-planeta-africa-movil.png',
  ],
  [
    'd46-escritorio-pacifico',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    DESKTOP,
    guided('El Pacífico'),
    'ref-planeta-pacifico-escritorio.png',
  ],
  [
    'd46-movil-pacifico',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    MOBILE,
    guided('El Pacífico'),
    'ref-planeta-pacifico-movil.png',
  ],
  [
    'd46-escritorio-himalaya',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    DESKTOP,
    guided('El Himalaya'),
    'ref-planeta-himalaya-escritorio.png',
  ],
  [
    'd46-movil-himalaya',
    `/explorar/tierra?captura=1&fecha=${DATE}`,
    MOBILE,
    guided('El Himalaya'),
    'ref-planeta-himalaya-movil.png',
  ],
];

const exists = (path) =>
  stat(path).then(
    () => true,
    () => false,
  );

/** Las tres capturas de una vista, a la misma altura, lado a lado (solo en local). */
async function sideBySide(name, reference) {
  const parts = [file(`antes-${name}.webp`), file(`despues-${name}.webp`)];
  const ref = fileURLToPath(new URL(reference, REF));
  if (!(await exists(ref))) return null;
  parts.push(ref);
  for (const part of parts) if (!(await exists(part))) return null;
  const height = 900;
  const images = await Promise.all(
    parts.map((part) => sharp(part).resize({ height }).png().toBuffer({ resolveWithObject: true })),
  );
  const width = images.reduce((sum, image) => sum + image.info.width, 0) + 2 * 12;
  let left = 0;
  const composite = images.map((image) => {
    const item = { input: image.data, left, top: 0 };
    left += image.info.width + 12;
    return item;
  });
  await mkdir(COMPARE, { recursive: true });
  const target = fileURLToPath(new URL(`${name}.png`, COMPARE));
  await sharp({ create: { width, height, channels: 3, background: '#000' } })
    .composite(composite)
    .png()
    .toFile(target);
  return target;
}

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, action, reference] of SHOTS) {
    if (wanted && !wanted.has(name)) continue;
    const { page, problems } = await openViewer(browser, path, size);
    if (action) {
      await action(page);
      await page.waitForTimeout(500);
      await waitForIdle(page);
    }
    // El puntero, fuera: si no, su resaltado (`:hover`) parece un estado.
    await page.mouse.move(0, 0);
    const png = await page.screenshot();
    await sharp(png)
      .webp({ quality: 90 })
      .toFile(file(`${prefix}-${name}.webp`));
    console.log(`${prefix}-${name}`);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
    if (compare) {
      const done = await sideBySide(name, reference);
      if (done) console.log(`  lado a lado (solo en local): ${done}`);
    }
  }
} finally {
  await close();
}
