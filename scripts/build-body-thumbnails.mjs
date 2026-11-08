// Miniaturas de las fichas de cuerpos (fase 3c, tarea 1): cada cuerpo renderizado por el propio
// motor, solo y centrado (modo de captura con `aislado=1`: sin estrellas, órbitas, etiquetas ni los
// demás cuerpos), recortado alrededor de su disco y en WebP pequeño en public/img/cuerpos/<id>.webp.
// Las texturas son las de la escena (docs/FUENTES.md): desde la fase 7, las lunas con mosaico global
// salen con él; desde la fase 9b, todas (Deimos y las de Urano, con los mapas del JPL; Proteo, con su
// campo de cráteres generado; Fobos y Deimos, con su forma real), salvo Titán, por su neblina.
//
// Uso: npm run build && node scripts/build-body-thumbnails.mjs [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser } from './capture-lib.mjs';
import { CROP_RADII, bodyIds, captureBody } from './lib/body-shots.mjs';

const OUT = new URL('../public/img/cuerpos/', import.meta.url);
/** Tamaño final (px): las fichas las muestran a 40 px CSS como mucho, con densidad 2. */
const SIZE = 96;
/** Ventana de la captura. */
const VIEWPORT = { width: 640, height: 640 };
/**
 * El recorte (la luz y los casos especiales, en scripts/lib/body-shots.mjs, comunes con las imágenes
 * de las fichas): el Sol, alejado seis pasos y con su halo, para que se lea como una estrella; Saturno,
 * a 1,7 radios: el círculo de la ficha corta las puntas de los anillos y el planeta se ve más grande.
 */
const CROPS = { sol: { crop: 'visible', zoomOut: 6 }, saturno: { crop: 1.7 } };

await mkdir(OUT, { recursive: true });
const bodies = await bodyIds();
const { browser, close } = await openBrowser();
let total = 0;
try {
  for (const body of bodies) {
    const shot = await captureBody(browser, body, {
      viewport: VIEWPORT,
      ...(CROPS[body.id] ?? { crop: CROP_RADII }),
    });
    const target = fileURLToPath(new URL(`${body.id}.webp`, OUT));
    const result = await sharp(shot.image)
      .resize(SIZE, SIZE, { kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 6 })
      .toFile(target);
    total += result.size;
    console.log(
      `${body.id}: radio ${shot.bodyRadius.toFixed(0)} px, recorte ${shot.half} px, ${(result.size / 1024).toFixed(1)} kB`,
    );
    if (shot.problems.length) console.log(shot.problems.map((p) => `  ${p}`).join('\n'));
  }
} finally {
  await close();
}
console.log(`Total: ${(total / 1024).toFixed(1)} kB en ${bodies.length} miniaturas.`);
