// Capturas de la fase 7, entrega 7.a (las lunas con su mosaico), deterministas (?captura=1):
// - Una hoja de contactos con las 12 lunas que tienen mosaico global, cada una sola (`aislado=1`) y
//   con la luz de las miniaturas (fase de 30°, desde 15° sobre la eclíptica), con su nombre; y la
//   misma hoja «antes», con su color esquemático (sus texturas, bloqueadas).
// - Algunas lunas delante de su planeta (`detras=`), en escritorio y en móvil.
// Uso: npm run build && node scripts/capture-moons.mjs docs/informes/img/fase-7 [--swiftshader]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, stats } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-moons.mjs <carpeta de salida>');
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

/**
 * [id del catálogo, nombre, textura]: las lunas con mosaico (scene/world.ts, BODY_TEXTURES). Titán no
 * lleva (su color y su halo, frente a PIA06230: `titan-cassini-2005` de capture-realism.mjs).
 */
const MOONS = [
  ['fobos', 'Fobos', 'phobos'],
  ['io', 'Ío', 'io'],
  ['europa', 'Europa', 'europa'],
  ['ganimedes', 'Ganímedes', 'ganymede'],
  ['calisto', 'Calisto', 'callisto'],
  ['mimas', 'Mimas', 'mimas'],
  ['encelado', 'Encélado', 'enceladus'],
  ['tetis', 'Tetis', 'tethys'],
  ['dione', 'Dione', 'dione'],
  ['rea', 'Rea', 'rhea'],
  ['japeto', 'Jápeto', 'iapetus'],
  ['triton', 'Tritón', 'triton'],
];
const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
/** Lunas delante de su planeta: [nombre del fichero, ruta]. */
const IN_CONTEXT = [
  ['europa-jupiter', '/?captura=1&cuerpo=europa&detras=jupiter'],
  ['titan-saturno', '/?captura=1&cuerpo=titan&detras=saturno'],
  ['dione-saturno', '/?captura=1&cuerpo=dione&detras=saturno'],
  ['triton-neptuno', '/?captura=1&cuerpo=triton&detras=neptuno'],
];
/** Lado de cada casilla de la hoja de contactos (px) y alto de su rótulo. */
const CELL = 300;
const LABEL = 34;
const COLUMNS = 5;
/** La captura de cada luna: el lienzo cuadrado y la fracción de su lado que ocupa el disco. */
const SHOT = { width: 640, height: 640 };
const BODY_FILL = 0.46;

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

/** Una luna sola, recortada a 1,1 radios y reducida a la casilla. */
async function moonCell(browser, id, blockTexture) {
  const query = new URLSearchParams({
    captura: '1',
    aislado: '1',
    cuerpo: id,
    fase: '30',
    latitud: '15',
    sobre: 'ecliptica',
  });
  const setup = blockTexture
    ? (page) => page.route(`**/textures/*/${blockTexture}.*.webp`, (route) => route.abort())
    : undefined;
  const { page } = await openViewer(browser, `/?${query}`, { ...SHOT, setup });
  // Solo el lienzo (sin la ficha que abre `cuerpo=`), como las miniaturas.
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
  const radius = (BODY_FILL * SHOT.width) / 2;
  const half = Math.round(radius * 1.1);
  return sharp(png)
    .extract({
      left: SHOT.width / 2 - half,
      top: SHOT.height / 2 - half,
      width: 2 * half,
      height: 2 * half,
    })
    .resize(CELL, CELL)
    .png()
    .toBuffer();
}

/** La hoja de contactos de las lunas con mosaico, con o sin sus texturas. */
async function contactSheet(browser, name, withTextures) {
  const rows = Math.ceil(MOONS.length / COLUMNS);
  const width = COLUMNS * CELL;
  const height = rows * (CELL + LABEL);
  const layers = [];
  for (const [k, [id, label, texture]] of MOONS.entries()) {
    const left = (k % COLUMNS) * CELL;
    const top = Math.floor(k / COLUMNS) * (CELL + LABEL);
    layers.push({ input: await moonCell(browser, id, withTextures ? null : texture), left, top });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${CELL}" height="${LABEL}"><text x="${CELL / 2}" y="24" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#e8e2d0" text-anchor="middle">${escapeXml(label)}</text></svg>`;
    layers.push({ input: Buffer.from(svg), left, top: top + CELL });
  }
  await sharp({ create: { width, height, channels: 3, background: '#0d1321' } })
    .composite(layers)
    .webp({ quality: 88 })
    .toFile(file(`${name}.webp`));
  console.log(`${name}: ${MOONS.length} lunas`);
}

const { browser, close } = await openBrowser();
try {
  await contactSheet(browser, 'lunas-mosaicos-despues', true);
  await contactSheet(browser, 'lunas-mosaicos-antes', false);
  for (const [name, path] of IN_CONTEXT) {
    for (const [device, size] of [
      ['escritorio', DESKTOP],
      ['movil', MOBILE],
    ]) {
      const { page, problems } = await openViewer(browser, path, size);
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
