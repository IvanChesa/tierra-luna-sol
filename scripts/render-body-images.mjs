// Imágenes de las fichas de los cuerpos y la imagen Open Graph (fase 9, tarea 1), renderizadas por el
// propio motor: el mismo estilo que las miniaturas (scripts/lib/body-shots.mjs) y sin licencias nuevas
// (las de las texturas: docs/FUENTES.md).
//
// - public/img/fichas/<id>-360.webp y -720.webp: cada cuerpo solo y centrado, en un cuadrado del color
//   de la página; las fichas los muestran a 240 px CSS como mucho (1x y 2x, y la de 720 para pantallas
//   de 3x). Saturno, con los anillos enteros; el Sol, con su halo.
// - public/img/og.jpg: la imagen para compartir (1200 × 630, D25), en JPEG, que lo leen todas las apps de
//   mensajería (WebP, no todas), y de menos de 300 kB (WhatsApp no enseña las más pesadas). Es una
//   composición de tres de esas imágenes, «Tierra Luna Sol»: el Sol a la izquierda (de donde les llega
//   la luz), la Tierra en el centro y la Luna a su escala respecto a la Tierra (no a su distancia). Las
//   vistas del explorador encuadran dejando sitio a sus paneles: el cuerpo nunca queda en el centro.
//
// Uso: npm run build && node scripts/render-body-images.mjs [--swiftshader] [--solo=marte,saturno] [--og]
//   (--og: solo la imagen para compartir, con las de las fichas que ya haya)
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser } from './capture-lib.mjs';
import { BACKGROUND, CROP_RADII, bodyIds, captureBody } from './lib/body-shots.mjs';

const OUT = new URL('../public/img/fichas/', import.meta.url);
const OG = new URL('../public/img/og.jpg', import.meta.url);
/** Tamaños finales (px). */
const SIZES = [360, 720];
/** Ventana de la captura: el disco, de unos 740 px de diámetro (más que la imagen grande). */
const VIEWPORT = { width: 1600, height: 1600 };
/**
 * El recorte de cada cuerpo, en radios: el de las miniaturas, salvo Saturno, con los anillos enteros
 * (el borde del A está a 2,27 radios), y el Sol, con su halo, alejado dos pasos.
 */
const CROPS = { saturno: { crop: 2.4 }, sol: { crop: 'visible', zoomOut: 2 } };
/** Radios de la Tierra y de la Luna (km, los del catálogo: la ficha de la NASA y el JPL). */
const EARTH_RADIUS_KM = 6378.1;
const MOON_RADIUS_KM = 1737.4;

const args = process.argv.slice(2);
const only = args
  .find((a) => a.startsWith('--solo='))
  ?.slice('--solo='.length)
  .split(',');
const ogOnly = args.includes('--og');

/** La imagen de una ficha, a un diámetro dado (el disco ocupa el cuadrado con su margen). */
const piece = (id, size) =>
  sharp(fileURLToPath(new URL(`${id}-720.webp`, OUT)))
    .resize(size, size, { kernel: 'lanczos3' })
    .png()
    .toBuffer();

/** «Tierra Luna Sol», 1200 × 630: la composición de la imagen para compartir. */
async function openGraph() {
  const [W, H] = [1200, 630];
  const earth = 400;
  const moon = Math.round((earth * MOON_RADIUS_KM) / EARTH_RADIUS_KM);
  const sun = 820;
  // El Sol, cortado por el borde izquierdo y con su halo difuminado hacia el fondo (sin el borde de su
  // cuadrado): una máscara radial, opaca en el disco y transparente al llegar al borde.
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${sun}" height="${sun}"><defs><radialGradient id="g"><stop offset="0.6" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="${sun / 2}" cy="${sun / 2}" r="${sun / 2}" fill="url(#g)"/></svg>`,
  );
  const sunImage = await sharp(await piece('sol', sun))
    .ensureAlpha()
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer();
  const shown = Math.round(sun * 0.38);
  const sunPart = await sharp(sunImage)
    .extract({ left: sun - shown, top: Math.round((sun - H) / 2), width: shown, height: H })
    .png()
    .toBuffer();
  const result = await sharp({
    create: {
      width: W,
      height: H,
      channels: 3,
      background: { r: BACKGROUND[0], g: BACKGROUND[1], b: BACKGROUND[2] },
    },
  })
    .composite([
      { input: sunPart, left: 0, top: 0 },
      {
        input: await piece('tierra', earth),
        left: Math.round(W * 0.56 - earth / 2),
        top: Math.round(H / 2 - earth / 2),
      },
      {
        input: await piece('luna', moon),
        left: Math.round(W * 0.86 - moon / 2),
        top: Math.round(H * 0.36 - moon / 2),
      },
    ])
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(fileURLToPath(OG));
  console.log(`og.jpg: ${W} × ${H}, ${(result.size / 1024).toFixed(1)} kB`);
  if (result.size > 300 * 1024) throw new Error('og.jpg pasa de 300 kB');
}

await mkdir(OUT, { recursive: true });
let total = 0;
if (!ogOnly) {
  const { browser, close } = await openBrowser();
  try {
    for (const body of (await bodyIds()).filter((b) => !only || only.includes(b.id))) {
      const options = CROPS[body.id] ?? { crop: CROP_RADII };
      const shot = await captureBody(browser, body, { viewport: VIEWPORT, ...options });
      const sizes = [];
      for (const size of SIZES) {
        const target = fileURLToPath(new URL(`${body.id}-${size}.webp`, OUT));
        const result = await sharp(shot.image)
          .resize(size, size, { kernel: 'lanczos3' })
          .webp({ quality: 80, effort: 6 })
          .toFile(target);
        total += result.size;
        sizes.push(`${size} px, ${(result.size / 1024).toFixed(1)} kB`);
      }
      console.log(`${body.id}: recorte de ${2 * shot.half} px → ${sizes.join(' · ')}`);
      if (shot.problems.length) console.log(shot.problems.map((p) => `  ${p}`).join('\n'));
    }
  } finally {
    await close();
  }
}
if (ogOnly || !only) await openGraph();
if (total) console.log(`Total de las fichas: ${(total / 1024).toFixed(1)} kB.`);
