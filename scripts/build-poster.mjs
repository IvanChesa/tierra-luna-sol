// Póster provisional del explorador (PLAN, fase 2, 2.c.17): una captura del propio motor en modo de
// captura por vista, en escritorio (1600 × 900) y móvil (720 × 1280), a WebP en public/img/.
// La fase 9 lo sustituye por el definitivo. Uso: npm run build && node scripts/build-poster.mjs
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer } from './capture-lib.mjs';

const OUT = new URL('../public/img/', import.meta.url);
const VIEWS = [
  ['system', '/'],
  ['earth', '/explorar/tierra'],
  ['moon', '/explorar/luna'],
];
const FORMATS = [
  // [nombre, ventana CSS, densidad, tamaño final]
  ['escritorio', 1600, 900, 1, 1600, 900],
  ['movil', 360, 760, 2, 720, 1280],
];

await mkdir(OUT, { recursive: true });
const { browser, close } = await openBrowser();
try {
  for (const [view, path] of VIEWS) {
    for (const [format, width, height, scale, outWidth, outHeight] of FORMATS) {
      const { page, problems } = await openViewer(browser, `${path}?captura=1`, {
        width,
        height,
        scale,
      });
      // Solo el escenario 3D: sin el texto de la vista (que va en el HTML encima del póster).
      await page.addStyleTag({ content: '.viewer__text { visibility: hidden !important; }' });
      const png = await page.locator('.viewer__stage').screenshot();
      const target = fileURLToPath(new URL(`poster-${view}-${format}.webp`, OUT));
      const info = await sharp(png)
        .resize(outWidth, outHeight, { fit: 'cover' })
        .webp({ quality: 72, effort: 6 })
        .toFile(target);
      const real = problems.filter((p) => !p.includes('/img/poster-'));
      console.log(
        `${view} ${format}: ${outWidth}×${outHeight}, ${(info.size / 1024).toFixed(0)} kB`,
      );
      if (real.length) console.log(real.join('\n'));
      await page.close();
    }
  }
} finally {
  await close();
}
