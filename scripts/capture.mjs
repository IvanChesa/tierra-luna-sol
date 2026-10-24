// Capturas deterministas del informe de la fase (?captura=1): escritorio y móvil.
// Uso: npm run build && node scripts/capture.mjs docs/informes/img/fase-2 [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, rendererName, stats } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));
/** Las capturas van en WebP (calidad 88): pesan unas 8 veces menos que en PNG. */
const webp = (png, name) => sharp(png).webp({ quality: 88 }).toFile(file(name));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2 };

/** [nombre, ruta, tamaño] */
const SHOTS = [
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  ['movil-sistema', '/?captura=1', MOBILE],
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['movil-tierra', '/explorar/tierra?captura=1', MOBILE],
  ['escritorio-luna', '/explorar/luna?captura=1', DESKTOP],
  ['movil-luna', '/explorar/luna?captura=1', MOBILE],
  ['escritorio-saturno', '/?captura=1&cuerpo=saturno', DESKTOP],
  ['escritorio-jupiter', '/?captura=1&cuerpo=jupiter', DESKTOP],
  ['escritorio-escala-real', '/?captura=1&escala=real', DESKTOP],
  ['movil-escala-real', '/?captura=1&escala=real', MOBILE],
  // Prueba de profundidad (D13) en el marco real.
  ['profundidad-fobos-marte', '/?captura=1&escala=real&cuerpo=fobos&detras=marte', DESKTOP],
  ['profundidad-tierra-neptuno', '/?captura=1&escala=real&cuerpo=tierra&detras=neptuno', DESKTOP],
  ...['logaritmica', 'invertida', 'estandar'].map((mode) => [
    `profundidad-fobos-sol-${mode}`,
    `/?captura=1&escala=real&cuerpo=fobos&detras=sol&profundidad=${mode}`,
    DESKTOP,
  ]),
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size] of SHOTS) {
    const { page, problems } = await openViewer(browser, path, size);
    await webp(await page.screenshot(), `${name}.webp`);
    const s = await stats(page);
    console.log(
      `${name}: ${s.depth}, ${s.drawCalls} llamadas, ${Math.round(s.triangles / 1000)} k triángulos, ${s.textures} texturas, ${Math.round(s.vramMB)} MB de VRAM`,
    );
    if (name === 'escritorio-sistema') console.log(`  GPU: ${await rendererName(page)}`);
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
  // Detalle del Sol en la prueba de profundidad (3× sin suavizar).
  for (const mode of ['logaritmica', 'invertida', 'estandar']) {
    await sharp(
      await sharp(file(`profundidad-fobos-sol-${mode}.webp`))
        .png()
        .toBuffer(),
    )
      .extract({ left: 1010, top: 400, width: 120, height: 120 })
      .resize(360, 360, { kernel: 'nearest' })
      .toFile(file(`profundidad-sol-detalle-${mode}.png`));
  }
  // Primera pintura: lo que se ve sin JavaScript (texto prerenderizado + póster).
  for (const [name, size] of [
    ['sin-js-escritorio', DESKTOP],
    ['sin-js-movil', MOBILE],
  ]) {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
    });
    const page = await context.newPage();
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    await webp(await page.screenshot(), `${name}.webp`);
    await context.close();
    console.log(`${name}: sin JavaScript`);
  }
} finally {
  await close();
}
