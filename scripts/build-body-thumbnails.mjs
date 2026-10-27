// Miniaturas de las fichas de cuerpos (fase 3c, tarea 1): cada cuerpo renderizado por el propio
// motor, solo y centrado (modo de captura con `aislado=1`: sin estrellas, órbitas, etiquetas ni los
// demás cuerpos), recortado alrededor de su disco y en WebP pequeño en public/img/cuerpos/<id>.webp.
// Las texturas son las de siempre: nada nuevo que atribuir (docs/FUENTES.md). Las lunas sin textura
// salen con su color esquemático hasta la fase 7.
//
// Uso: npm run build && node scripts/build-body-thumbnails.mjs [--swiftshader]
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const OUT = new URL('../public/img/cuerpos/', import.meta.url);
/** Tamaño final (px): las fichas las muestran a 40 px CSS como mucho, con densidad 2. */
const SIZE = 96;
/** Ventana de la captura. */
const VIEWPORT = { width: 640, height: 640 };
/**
 * Fracción del lado corto del lienzo que ocupa el diámetro del cuerpo enfocado (`FRAMING_FILL.body`
 * en scene/engine.ts): de ahí sale su radio en la captura.
 */
const BODY_FILL = 0.46;
/** Color de fondo del lienzo (`BACKGROUND_COLOR` del motor, #0d1321). */
const BACKGROUND = [0x0d, 0x13, 0x21];
/** Diferencia con el fondo (0–255, el canal que más difiere) a partir de la cual un píxel es del cuerpo. */
const THRESHOLD = 10;
/**
 * Recorte, en radios del cuerpo: el disco con un margen pequeño (el halo de las atmósferas, como el
 * de Titán, se queda fuera: si no, parecería una estrella).
 */
const CROP_RADII = 1.06;
/**
 * Geometría de la luz: el cuerpo, con un ángulo de fase de 30° y visto desde 15° sobre su ecuador
 * (la parte de noche, una franja fina en un lado). Excepciones:
 * - el Sol emite luz: sin fase, y alejado (seis pasos de «−») para que salga como en la vista
 *   general, con su halo, recortado por lo que se ve: así se lee como una estrella;
 * - la Tierra, a las 11:00 UTC del día de las capturas: Europa y África de cara (a las 00:00, el
 *   Pacífico);
 * - Saturno, desde 25°, con los anillos abiertos, y recortado a 1,7 radios: el círculo de la ficha
 *   corta las puntas de los anillos y el planeta se ve más grande.
 */
const LIGHT = { phase: 30, latitude: 15 };
const SPECIAL = {
  sol: { light: null, crop: 'visible', zoomOut: 6 },
  tierra: { date: '2026-10-24T11:00Z' },
  saturno: { light: { phase: 30, latitude: 25 }, crop: 1.7 },
};

/** Los ids del catálogo, del índice ligero (sin compilar TypeScript). */
async function bodyIds() {
  const source = await readFile(new URL('../src/app/data/body-index.ts', import.meta.url), 'utf8');
  return [...source.matchAll(/\{ id: '([a-z]+)', name: '/g)].map((match) => match[1]);
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

await mkdir(OUT, { recursive: true });
const ids = await bodyIds();
if (ids.length !== 30) throw new Error(`Se esperaban 30 cuerpos en el índice y hay ${ids.length}.`);
const { browser, close } = await openBrowser();
let total = 0;
try {
  for (const id of ids) {
    const special = SPECIAL[id] ?? {};
    const light = special.light === undefined ? LIGHT : special.light;
    const query = new URLSearchParams({ captura: '1', aislado: '1', cuerpo: id });
    if (special.date) query.set('fecha', special.date);
    if (light) {
      query.set('fase', String(light.phase));
      query.set('latitud', String(light.latitude));
    }
    const { page, problems } = await openViewer(browser, `/?${query}`, VIEWPORT);
    for (let k = 0; k < (special.zoomOut ?? 0); k++) await page.keyboard.press('-');
    if (special.zoomOut) await waitForIdle(page);
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
    // Lo que se ve tiene que llegar al menos al disco del cuerpo (o, alejado, a una parte de él):
    // si no, la captura ha fallado.
    const zoom = 1.4 ** (special.zoomOut ?? 0);
    if (!(seen > (0.9 * body) / zoom))
      throw new Error(`«${id}»: no se ve el cuerpo en la captura.`);
    const crop = special.crop ?? CROP_RADII;
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
    const target = fileURLToPath(new URL(`${id}.webp`, OUT));
    const result = await sharp(png)
      .extend({ ...pad, background: { r: BACKGROUND[0], g: BACKGROUND[1], b: BACKGROUND[2] } })
      .extract({ left: left + pad.left, top: top + pad.top, width: side, height: side })
      .resize(SIZE, SIZE, { kernel: 'lanczos3' })
      .webp({ quality: 82, effort: 6 })
      .toFile(target);
    total += result.size;
    const real = problems.filter((p) => !p.includes('/img/poster-'));
    console.log(
      `${id}: radio ${body.toFixed(0)} px, recorte ${half} px, ${(result.size / 1024).toFixed(1)} kB`,
    );
    if (real.length) console.log(real.map((p) => `  ${p}`).join('\n'));
  }
} finally {
  await close();
}
console.log(`Total: ${(total / 1024).toFixed(1)} kB en ${ids.length} miniaturas.`);
