// Capturas de la fase 7, entrega 7.c (la escala real), deterministas (?captura=1), en escritorio y
// móvil: la vista general en escala real, Fobos con Marte detrás y Neptuno con Tritón detrás (los dos
// casos de la prueba de temblores, `scripts/measure-real-scale.mjs`), y «Controles +» abierto con el
// selector de la escala.
// Uso: npm run build && node scripts/capture-real-scale.mjs docs/informes/img/fase-7 [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, stats, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-real-scale.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DEVICES = [
  ['escritorio', { width: 1600, height: 900, scale: 1 }],
  ['movil', { width: 390, height: 844, scale: 2, mobile: true }],
];
/** [nombre, ruta, abrir «Controles +»]. */
const SHOTS = [
  ['escala-real-sistema', '/?captura=1&escala=real', false],
  ['escala-real-fobos-marte', '/?captura=1&escala=real&cuerpo=fobos&detras=marte', false],
  ['escala-real-neptuno-triton', '/?captura=1&escala=real&cuerpo=neptuno&detras=triton', false],
  ['escala-real-controles', '/?captura=1&escala=real', true],
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, controls] of SHOTS) {
    for (const [device, size] of DEVICES) {
      const { page, problems } = await openViewer(browser, path, size);
      if (controls) {
        await page.getByRole('button', { name: 'Controles', exact: true }).click();
        await page.locator('#time-scale').scrollIntoViewIfNeeded();
        await waitForIdle(page);
      }
      await sharp(await page.screenshot())
        .webp({ quality: 88 })
        .toFile(file(`${device}-${name}.webp`));
      const s = await stats(page);
      console.log(
        `${device}-${name}: ${s.drawCalls} llamadas, ${s.textures} texturas, ${Math.round(s.vramMB)} MB de VRAM`,
      );
      if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
      await page.close();
    }
  }
} finally {
  await close();
}
