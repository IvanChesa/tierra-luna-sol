// Las imágenes del README (fase 11): capturas deterministas (?captura=1) de las vistas principales y
// de una ficha, y una animación corta del sistema solar a lo largo de 2026 (un fotograma cada 15
// días, con la fecha en la barra de tiempo), en WebP, en docs/img/readme/.
// Uso: npm run build && node scripts/capture-readme.mjs [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, pageOptions } from './capture-lib.mjs';

const OUT = fileURLToPath(new URL('../docs/img/readme/', import.meta.url));
const SIZE = { width: 1280, height: 720 };
const STILL = { width: 960, quality: 78 };
const FRAME = { width: 800, quality: 70, delayMs: 160 };
const VIEWS = [
  ['portada', '/?captura=1'],
  // A las 17:00 UTC del 24-10: Sudamérica de día y África al anochecer, con el terminador.
  ['tierra', '/explorar/tierra?captura=1&fecha=2026-10-24T17:00Z'],
  ['luna', '/explorar/luna?captura=1'],
  ['saturno', '/?cuerpo=saturno&captura=1'],
  ['cielo', '/cielo?captura=1'],
];
const FRAMES = 24;
const START = Date.UTC(2026, 0, 1);

await mkdir(OUT, { recursive: true });
const { browser, close } = await openBrowser();
const problems = [];
const still = async (name, png) => {
  const file = `${OUT}${name}.webp`;
  const info = await sharp(png).resize(STILL.width).webp({ quality: STILL.quality }).toFile(file);
  console.log(`${name}.webp: ${(info.size / 1024).toFixed(0)} kB`);
};
try {
  for (const [name, path] of VIEWS) {
    const view = await openViewer(browser, path, SIZE);
    problems.push(...view.problems);
    await still(name, await view.page.screenshot());
    await view.page.close();
  }
  // Una ficha: HTML prerenderizado, sin 3D.
  const page = await browser.newPage(pageOptions(SIZE));
  await page.goto(`${BASE}/planetas/marte`, { waitUntil: 'networkidle' });
  await still('ficha', await page.screenshot());
  await page.close();

  const frames = [];
  for (let k = 0; k < FRAMES; k++) {
    const date = new Date(START + k * 15 * 86_400_000).toISOString().slice(0, 10);
    const view = await openViewer(browser, `/?captura=1&fecha=${date}T00:00Z`, SIZE);
    problems.push(...view.problems);
    frames.push(
      await sharp(await view.page.screenshot())
        .resize(FRAME.width)
        .toBuffer(),
    );
    await view.page.close();
  }
  const info = await sharp(frames, { join: { animated: true } })
    .webp({ quality: FRAME.quality, loop: 0, delay: frames.map(() => FRAME.delayMs) })
    .toFile(`${OUT}sistema-solar.webp`);
  console.log(`sistema-solar.webp: ${FRAMES} fotogramas, ${(info.size / 1024).toFixed(0)} kB`);
} finally {
  await close();
}
if (problems.length) {
  console.error(problems.join('\n'));
  process.exitCode = 1;
}
