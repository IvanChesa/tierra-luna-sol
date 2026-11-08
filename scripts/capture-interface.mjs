// Capturas de la interfaz de la fase 9c (D47; `docs/decisiones/FASE-9c-INTERFAZ.md`, §4), antes y
// después, a 390, 768 y 1440 px: la portada (y, después, durante el recorrido), Saturno elegido (con
// la hoja en el móvil y, después, también con la ficha cerrada: el selector, y con «Controles» abierto),
// la Tierra, la Luna y el Cielo, una ficha completa, /lunas y /eclipses.
// Uso: npm run build && CAPTURE_PORT=4350 node scripts/capture-interface.mjs <antes|despues> [nombre…]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, pageOptions } from './capture-lib.mjs';

const stage = process.argv[2];
if (stage !== 'antes' && stage !== 'despues') {
  throw new Error('Uso: node scripts/capture-interface.mjs <antes|despues> [nombre…]');
}
const wanted = new Set(process.argv.slice(3).filter((arg) => !arg.startsWith('--')));
const dir = new URL('../docs/informes/img/fase-9c/', import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(`${stage}-${name}.webp`, dir));

const SIZES = {
  390: { width: 390, height: 844, scale: 2, mobile: true },
  768: { width: 768, height: 1024, scale: 1, mobile: true },
  1440: { width: 1440, height: 900, scale: 1 },
};

/**
 * [nombre, ruta, explorador o página, acción tras cargar]. El recorrido de la portada solo existe
 * después (la ruta sin parámetros, en un contexto nuevo: la primera vez).
 */
const SHOTS = [
  ['portada', '/?captura=1', 'viewer'],
  ['saturno', '/?captura=1&cuerpo=saturno', 'viewer'],
  // El selector con un planeta con lunas elegido y la ficha cerrada (decisión de Iván del 07-11): en
  // el PC y la tableta, dos filas; en el móvil, una, con la raya.
  ...(stage === 'despues' ? [['saturno-fichas', '/?captura=1&cuerpo=saturno', 'closed']] : []),
  // «Controles» abierto con Saturno (crítica de la 9c): cuenta en el encuadre; en el móvil, hoja baja.
  ...(stage === 'despues' ? [['saturno-controles', '/?captura=1&cuerpo=saturno', 'controls']] : []),
  ['tierra', '/explorar/tierra?captura=1', 'viewer'],
  ['luna', '/explorar/luna?captura=1', 'viewer'],
  ['cielo', '/cielo?captura=1', 'viewer'],
  ['ficha-marte', '/planetas/marte', 'page'],
  ['lunas', '/lunas', 'page'],
  ['eclipses', '/eclipses', 'page'],
  ...(stage === 'despues' ? [['recorrido', '/', 'tour']] : []),
];

const { browser, close } = await openBrowser(process.argv);
try {
  for (const [name, path, kind] of SHOTS) {
    if (wanted.size && !wanted.has(name)) continue;
    for (const [size, options] of Object.entries(SIZES)) {
      let page;
      if (kind === 'viewer' || kind === 'closed' || kind === 'controls') {
        ({ page } = await openViewer(browser, path, options));
        if (kind === 'closed') {
          await page.getByRole('button', { name: 'Cerrar la ficha' }).click();
          await page.waitForTimeout(800);
        }
        if (kind === 'controls') {
          await page.locator('.time__more').click();
          // El encuadre se mide otra vez y la cámara aparta el cuerpo.
          await page.waitForTimeout(2500);
        }
      } else {
        page = await browser.newPage(pageOptions(options));
        await page.goto(BASE + path);
        if (kind === 'tour') {
          // Unos segundos dentro del recorrido: ya ha empezado y «Saltar» se ve.
          await page
            .getByRole('button', { name: /Saltar el recorrido/ })
            .waitFor({ timeout: 90_000 });
          await page.waitForTimeout(6000);
        } else {
          await page.evaluate(async () => {
            await document.fonts.ready;
          });
        }
      }
      // Las páginas, enteras; el explorador, la ventana.
      const png = await page.screenshot({ fullPage: kind === 'page', animations: 'disabled' });
      await sharp(png)
        .webp({ quality: kind === 'page' ? 68 : 80 })
        .toFile(file(`${size}-${name}`));
      console.log(`${stage}-${size}-${name}.webp`);
      await page.close();
    }
  }
} finally {
  await close();
}
