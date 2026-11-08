// El movimiento del Sol realzado (fase 9b, D46, segunda vuelta): su superficie fluye y sus bucles de
// plasma cambian con el reloj de pared, despacio, también con el tiempo en pausa; con movimiento
// reducido, quieto. Sin el modo de captura (que lo deja quieto para que las capturas sean
// deterministas): el Sol de cerca con `?fecha=` (así el explorador arranca en pausa y el Sol no gira),
// en la vista limpia, y dos capturas del lienzo separadas `SECONDS` segundos; con y sin
// `prefers-reduced-motion`. Mide la diferencia media entre las dos en el disco y fuera de él (0–255).
// Uso: npm run build && node scripts/capture-sun-motion.mjs docs/informes/img/fase-9b [--prefijo=sol2]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, pageOptions } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-sun-motion.mjs <carpeta de salida>');
const prefix = process.argv.find((arg) => arg.startsWith('--prefijo='))?.slice(10) ?? 'sol2';
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const SIZE = { width: 1600, height: 900, scale: 1 };
const URL_SUN = '/?cuerpo=sol&fecha=2026-01-15T00:00Z';
/** Lo que se espera a que carguen las texturas y la cámara llegue al Sol (s). */
const SETTLE_S = 12;
const SECONDS = 6;
/** El recorte: el Sol, en el centro del lienzo con la vista limpia (px). */
const CROP = { left: 450, top: 100, width: 700, height: 700 };

/** Diferencia media por canal (0–255) entre dos capturas, dentro y fuera del disco. */
function difference(a, b) {
  const { width, height, channels } = a.info;
  const cx = width / 2;
  const cy = height / 2;
  let inside = 0;
  let insideN = 0;
  let outside = 0;
  let outsideN = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const k = (y * width + x) * channels;
      const d =
        (Math.abs(a.data[k] - b.data[k]) +
          Math.abs(a.data[k + 1] - b.data[k + 1]) +
          Math.abs(a.data[k + 2] - b.data[k + 2])) /
        3;
      const r = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // El disco mide unos 207 px de radio con la vista limpia en escritorio.
      if (r < 190) {
        inside += d;
        insideN++;
      } else if (r > 215) {
        outside += d;
        outsideN++;
      }
    }
  }
  return { disc: inside / insideN, around: outside / outsideN };
}

const { browser, close } = await openBrowser();
try {
  for (const [label, reducedMotion] of [
    ['movimiento', 'no-preference'],
    ['movimiento-reducido', 'reduce'],
  ]) {
    const page = await browser.newPage({ ...pageOptions(SIZE), reducedMotion });
    await page.goto(BASE + URL_SUN);
    await page.waitForSelector('canvas');
    await page.waitForTimeout(SETTLE_S * 1000);
    // La vista limpia (sin paneles) y el puntero, fuera.
    await page.keyboard.press('v');
    await page.mouse.move(0, 0);
    await page.waitForTimeout(2000);
    const shots = [];
    for (const t of [0, SECONDS]) {
      if (t) await page.waitForTimeout(SECONDS * 1000);
      const png = await page.locator('canvas').first().screenshot();
      const crop = await sharp(png).extract(CROP).png().toBuffer();
      shots.push(await sharp(crop).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
      await sharp(crop)
        .webp({ quality: 90 })
        .toFile(file(`${prefix}-${label}-t${t}.webp`));
    }
    const { disc, around } = difference(shots[0], shots[1]);
    console.log(
      `${label}: en ${SECONDS} s, diferencia media ${disc.toFixed(2)} en el disco y ${around.toFixed(2)} fuera (0–255)`,
    );
    await page.close();
  }
} finally {
  await close();
}
