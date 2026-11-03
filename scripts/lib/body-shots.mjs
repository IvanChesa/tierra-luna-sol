// Retratos de los cuerpos con el propio motor (fase 3c, las miniaturas; fase 9, las imágenes de las
// fichas): cada cuerpo solo y centrado (modo de captura con `aislado=1`: sin estrellas, órbitas,
// etiquetas ni los demás cuerpos), con la misma luz en todo el sitio. Lo usan
// scripts/build-body-thumbnails.mjs y scripts/render-body-images.mjs.
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { openViewer, waitForIdle } from '../capture-lib.mjs';

/**
 * Fracción del lado corto del lienzo que ocupa el diámetro del cuerpo enfocado (`FRAMING_FILL.body`
 * en scene/engine.ts): de ahí sale su radio en la captura.
 */
export const BODY_FILL = 0.46;
/** Color de fondo del lienzo (`BACKGROUND_COLOR` del motor, #0d1321, el de la página). */
export const BACKGROUND = [0x0d, 0x13, 0x21];
/** Diferencia con el fondo (0–255, el canal que más difiere) a partir de la cual un píxel es del cuerpo. */
const THRESHOLD = 10;
/**
 * Recorte, en radios del cuerpo: el disco con un margen pequeño (el halo de las atmósferas, como el
 * de Titán, se queda fuera: si no, parecería una estrella).
 */
export const CROP_RADII = 1.06;

/**
 * Geometría de la luz: el cuerpo, con un ángulo de fase de 30° y visto desde 15° sobre su ecuador
 * (la parte de noche, una franja fina en un lado); las lunas, desde 15° sobre la eclíptica
 * (`sobre=ecliptica`, fase 7): con su ecuador, las de Urano (tumbadas como su planeta) salían con un
 * tercio del disco en sombra y Tritón, con la sombra al otro lado (informe de la fase 3c, §10.3).
 */
export const LIGHT = { phase: 30, latitude: 15 };

/**
 * Excepciones:
 * - el Sol emite luz: sin fase, y alejado (pasos de «−») para que salga con su halo, recortado por lo
 *   que se ve: así se lee como una estrella;
 * - la Tierra, a las 11:00 UTC del día de las capturas: Europa y África de cara (a las 00:00, el
 *   Pacífico);
 * - Saturno, desde 25° al sur, con los anillos abiertos. Al sur porque, desde el equinoccio de 2025,
 *   el Sol ilumina la cara sur de los anillos: desde el norte se veía su cara de sombra, oscura (fase 7,
 *   D36). Cada script dice cuánto de los anillos recorta.
 */
export const SPECIAL = {
  sol: { light: null, crop: 'visible' },
  tierra: { date: '2026-10-24T11:00Z' },
  saturno: { light: { phase: 30, latitude: -25 } },
};

/** Los ids y el tipo de los cuerpos del catálogo, del índice ligero (sin compilar TypeScript). */
export async function bodyIds() {
  const source = await readFile(
    new URL('../../src/app/data/body-index.ts', import.meta.url),
    'utf8',
  );
  const bodies = [...source.matchAll(/\{ id: '([a-z]+)', name: '[^']+', kind: '([a-z]+)'/g)].map(
    ([, id, kind]) => ({ id, kind }),
  );
  if (bodies.length !== 30)
    throw new Error(`Se esperaban 30 cuerpos en el índice y hay ${bodies.length}.`);
  return bodies;
}

/**
 * Radio de lo que se ve en la captura, desde el centro del lienzo (donde lo pone `aislado`): la
 * distancia mayor de un píxel distinto del fondo.
 */
function visibleRadius(data, width, height, channels) {
  const cx = width / 2;
  const cy = height / 2;
  let r2 = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * channels;
      const diff = Math.max(
        Math.abs(data[i] - BACKGROUND[0]),
        Math.abs(data[i + 1] - BACKGROUND[1]),
        Math.abs(data[i + 2] - BACKGROUND[2]),
      );
      if (diff <= THRESHOLD) continue;
      const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
      if (d2 > r2) r2 = d2;
    }
  }
  return Math.sqrt(r2);
}

/**
 * Captura un cuerpo solo y centrado y lo recorta en un cuadrado alrededor de su disco. Devuelve una
 * imagen de sharp (PNG del recorte) y las medidas. `crop`: radios del cuerpo, o 'visible' (todo lo que
 * se ve, con su halo); `zoomOut`: pasos de «−» antes de capturar.
 */
export async function captureBody(browser, { id, kind }, { viewport, crop, zoomOut = 0 }) {
  const special = SPECIAL[id] ?? {};
  const light = special.light === undefined ? LIGHT : special.light;
  const query = new URLSearchParams({ captura: '1', aislado: '1', cuerpo: id });
  if (special.date) query.set('fecha', special.date);
  if (light) {
    query.set('fase', String(light.phase));
    query.set('latitud', String(light.latitude));
    if (kind === 'moon') query.set('sobre', 'ecliptica');
  }
  const { page, problems } = await openViewer(browser, `/?${query}`, viewport);
  for (let k = 0; k < zoomOut; k++) await page.keyboard.press('-');
  if (zoomOut) await waitForIdle(page);
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  await page.close();
  const png = Buffer.from(base64, 'base64');
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const seen = visibleRadius(data, info.width, info.height, info.channels);
  const body = (BODY_FILL * Math.min(info.width, info.height)) / 2;
  // Lo que se ve tiene que llegar al menos al disco del cuerpo (o, alejado, a una parte de él): si
  // no, la captura ha fallado.
  if (!(seen > (0.9 * body) / 1.4 ** zoomOut))
    throw new Error(`«${id}»: no se ve el cuerpo en la captura.`);
  const half = Math.ceil(crop === 'visible' ? seen * 1.02 : body * crop);
  const left = Math.round(info.width / 2) - half;
  const top = Math.round(info.height / 2) - half;
  const side = 2 * half;
  // Si el recorte se sale del lienzo, se completa con el color del fondo.
  const pad = {
    top: Math.max(0, -top),
    left: Math.max(0, -left),
    bottom: Math.max(0, top + side - info.height),
    right: Math.max(0, left + side - info.width),
  };
  // En dos pasos: en una sola cadena, sharp recorta antes de rellenar.
  const extended = await sharp(png)
    .extend({ ...pad, background: { r: BACKGROUND[0], g: BACKGROUND[1], b: BACKGROUND[2] } })
    .png()
    .toBuffer();
  const image = sharp(extended).extract({
    left: left + pad.left,
    top: top + pad.top,
    width: side,
    height: side,
  });
  return {
    image: await image.png().toBuffer(),
    bodyRadius: body,
    half,
    problems: problems.filter((p) => !p.includes('/img/poster-')),
  };
}
