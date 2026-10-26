// Capturas de la fase 3b (realismo): cada planeta con la geometría de su foto de referencia
// (docs/realismo/referencias.md), la vista general, los detalles (relieve, anillos a contraluz,
// órbitas sobre los discos) y la comparación de tone mapping.
// Uso: npm run build && node scripts/capture-realism.mjs <carpeta> [filtro] [--swiftshader]
//   filtro: solo las capturas cuyo nombre lo contenga (p. ej. «saturno»).
import { mkdir } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, stats, waitForIdle } from './capture-lib.mjs';

/** Solo los píxeles del lienzo (`engine.capture()`), en PNG. */
async function canvasPng(page) {
  const base64 = await page.evaluate(async () => {
    const blob = await window.__tlsViewer.engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
  });
  return Buffer.from(base64, 'base64');
}

const [out, filter] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
if (!out) throw new Error('Uso: node scripts/capture-realism.mjs <carpeta> [filtro]');
// Una carpeta del proyecto (relativa a la raíz) o una ruta absoluta (pruebas fuera del repo).
const dir = isAbsolute(out)
  ? pathToFileURL(out.endsWith('/') || out.endsWith('\\') ? out : `${out}/`)
  : new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2 };
/** Primer plano cuadrado para las comparativas (sin interfaz: vista limpia por la URL de captura). */
const SQUARE = { width: 900, height: 900, scale: 1 };

/** [nombre, ruta, tamaño] */
const SHOTS = [
  // Vista general y móvil.
  ['escritorio-sistema', '/?captura=1', DESKTOP],
  ['movil-sistema', '/?captura=1', MOBILE],
  // Comparativas con las fotos de referencia (la misma geometría).
  ['marte-hubble-2016', '/?captura=1&cuerpo=marte&fecha=2016-05-12T12:00Z&desde=tierra', SQUARE],
  [
    'jupiter-hubble-2019',
    '/?captura=1&cuerpo=jupiter&fecha=2019-06-27T12:00Z&desde=tierra',
    SQUARE,
  ],
  [
    'saturno-hubble-2019',
    '/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra',
    SQUARE,
  ],
  ['urano-hubble-2021', '/?captura=1&cuerpo=urano&fecha=2021-10-25T12:00Z&desde=tierra', SQUARE],
  [
    'neptuno-hubble-2021',
    '/?captura=1&cuerpo=neptuno&fecha=2021-09-07T12:00Z&desde=tierra',
    SQUARE,
  ],
  // Fotos de sondas: ángulo de fase de Horizons (docs/realismo/referencias.md).
  [
    'mercurio-messenger-2009',
    '/?captura=1&cuerpo=mercurio&fecha=2009-09-29T20:37Z&fase=110',
    SQUARE,
  ],
  ['venus-messenger-2007', '/?captura=1&cuerpo=venus&fecha=2007-06-05T12:00Z&fase=23', SQUARE],
  ['venus-fase-150', '/?captura=1&cuerpo=venus&fase=150', SQUARE],
  // La Tierra desde DSCOVR (EPIC): fase y latitud de los metadatos de la imagen.
  [
    'tierra-epic-2016',
    '/?captura=1&cuerpo=tierra&fecha=2016-06-21T22:58Z&fase=9.4&latitud=22.3',
    SQUARE,
  ],
  ['urano-voyager-1986', '/?captura=1&cuerpo=urano&fecha=1986-01-14T21:00Z&fase=13.8', SQUARE],
  ['neptuno-voyager-1989', '/?captura=1&cuerpo=neptuno&fecha=1989-08-20T08:00Z&fase=15', SQUARE],
  ['luna-fase-90', '/?captura=1&cuerpo=luna&fase=90', SQUARE],
  ['sol-sdo-2024', '/?captura=1&cuerpo=sol&fecha=2024-05-10T00:00Z', SQUARE],
  // Saturno a contraluz, como «The Day the Earth Smiled»: fase ≈ 176°, 17° por debajo de los anillos.
  [
    'saturno-cassini-2013',
    '/?captura=1&cuerpo=saturno&fecha=2013-07-19T21:30Z&fase=176&latitud=-17',
    SQUARE,
  ],
  // Relieve con luz rasante (cerca del terminador).
  ['marte-terminador', '/?captura=1&cuerpo=marte&fase=80&latitud=10', SQUARE],
  ['mercurio-terminador', '/?captura=1&cuerpo=mercurio&fase=80&latitud=10', SQUARE],
  // Órbitas sobre los discos (como las capturas de la fase 2).
  ['escritorio-saturno', '/?captura=1&cuerpo=saturno', DESKTOP],
  ['escritorio-jupiter', '/?captura=1&cuerpo=jupiter', DESKTOP],
  ['escritorio-tierra', '/explorar/tierra?captura=1', DESKTOP],
  ['movil-tierra', '/explorar/tierra?captura=1', MOBILE],
  ['escritorio-luna', '/explorar/luna?captura=1', DESKTOP],
  // Tone mapping comparado (Saturno, con el Sol al fondo de la vista general).
  ...['neutral', 'agx', 'aces'].flatMap((mode) => [
    [
      `tonemapping-${mode}-saturno`,
      `/?captura=1&cuerpo=saturno&fecha=2019-06-20T12:00Z&desde=tierra&tonemapping=${mode}`,
      SQUARE,
    ],
    [`tonemapping-${mode}-sistema`, `/?captura=1&tonemapping=${mode}`, DESKTOP],
  ]),
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size] of SHOTS) {
    if (filter && !name.includes(filter)) continue;
    const { page, problems } = await openViewer(browser, path, size);
    // Las comparativas van sin interfaz ni etiquetas: la vista limpia (`V`) quita los paneles, la
    // escena se centra en todo el lienzo y se guardan solo sus píxeles.
    const clean = size === SQUARE;
    if (clean) {
      await page.keyboard.press('v');
      await waitForIdle(page);
    }
    const png = clean ? await canvasPng(page) : await page.screenshot();
    await sharp(png)
      .webp({ quality: 88 })
      .toFile(file(`${name}.webp`));
    const s = await stats(page);
    console.log(
      `${name}: ${s.drawCalls} llamadas, ${Math.round(s.triangles / 1000)} k triángulos, ${Math.round(s.vramMB)} MB de VRAM`,
    );
    if (problems.length) console.log(problems.map((p) => `  ${p}`).join('\n'));
    await page.close();
  }
} finally {
  await close();
}
