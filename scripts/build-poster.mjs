// Póster provisional del explorador (PLAN, fase 2, 2.c.17): una captura del propio motor en modo de
// captura por vista, en escritorio (ventana de 1600 × 900) y móvil (360 × 760 a 2×), a WebP en
// public/img/. La fase 9 lo sustituye por el definitivo. Uso: npm run build && node scripts/build-poster.mjs
//
// Sale al tamaño del lienzo (el explorador, sin la cabecera), sin escalar: en esa ventana, el póster
// y el 3D coinciden píxel a píxel. Si cambia su tamaño, hay que cambiar el `width` y el `height` de
// `viewer-poster.ts`.
//
// El 3D entra con un fundido sobre el póster: cualquier cambio de la interfaz que mueva el encuadre
// (los paneles `data-chrome`, sus márgenes) obliga a regenerarlo, o se verán dos escenas a la vez.
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
  // [nombre, ventana CSS, densidad, teléfono (táctil)]
  ['escritorio', 1600, 900, 1, false],
  ['movil', 360, 760, 2, true],
];

await mkdir(OUT, { recursive: true });
const { browser, close } = await openBrowser();
try {
  for (const [view, path] of VIEWS) {
    for (const [format, width, height, scale, mobile] of FORMATS) {
      const { page, problems } = await openViewer(browser, `${path}?captura=1`, {
        width,
        height,
        scale,
        mobile,
      });
      // Solo los píxeles del lienzo (engine.capture()): sin la interfaz ni las etiquetas, que van en
      // el HTML encima. El lienzo ocupa todo el explorador y la escena ya viene centrada en la parte
      // que dejan libre los paneles, como la verá quien llegue.
      const base64 = await page.evaluate(async () => {
        const blob = await window.__tlsViewer.engine.capture();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        }
        return btoa(binary);
      });
      const png = Buffer.from(base64, 'base64');
      const target = fileURLToPath(new URL(`poster-${view}-${format}.webp`, OUT));
      const info = await sharp(png).webp({ quality: 72, effort: 6 }).toFile(target);
      const real = problems.filter((p) => !p.includes('/img/poster-'));
      console.log(
        `${view} ${format}: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} kB`,
      );
      if (real.length) console.log(real.join('\n'));
      await page.close();
    }
  }
} finally {
  await close();
}
