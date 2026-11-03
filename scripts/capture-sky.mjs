// Capturas del cielo desde España y de los eclipses para el informe de la fase 8 (?captura=1): el
// cielo del Montsec de noche, con la Vía Láctea, en el crepúsculo y de día, el del Teide, la Luna de
// cerca, el eclipse total del 12-08-2026 desde Fraga, la página /eclipses y «Ver en 3D» (la sombra de
// la Luna sobre la Tierra y la Luna eclipsada).
// Uso: npm run build && node scripts/capture-sky.mjs docs/informes/img/fase-8 [--solo=a,b]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, pageOptions } from './capture-lib.mjs';

const out = process.argv[2];
if (!out) throw new Error('Uso: node scripts/capture-sky.mjs <carpeta de salida>');
const only =
  process.argv
    .find((arg) => arg.startsWith('--solo='))
    ?.slice(7)
    .split(',') ?? null;
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };

/** Los píxeles del lienzo (`engine.capture()`), sin la interfaz. */
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

/** [nombre, ruta, tamaño, «lienzo» (solo el 3D) o «página» (con la interfaz)] */
const SHOTS = [
  // El Montsec el 1-11-2026 a las 22:00: Saturno al sur, en su culminación.
  ['escritorio-cielo-montsec-noche', '/cielo?captura=1&fecha=2026-11-01T21:00Z', DESKTOP, 'page'],
  ['movil-cielo-montsec-noche', '/cielo?captura=1&fecha=2026-11-01T21:00Z', MOBILE, 'page'],
  // A las 21:00, hacia el noroeste: el triángulo de verano y la Vía Láctea del Cisne al Águila.
  [
    'escritorio-cielo-via-lactea',
    '/cielo?captura=1&fecha=2026-11-01T20:00Z&rumbo=300&altura=50&campo=80',
    DESKTOP,
    'canvas',
  ],
  // La puesta del Sol (17:40) hacia el suroeste.
  [
    'escritorio-cielo-crepusculo',
    '/cielo?captura=1&fecha=2026-11-01T16:40Z&rumbo=240&altura=14&campo=70',
    DESKTOP,
    'canvas',
  ],
  // El crepúsculo náutico (18:50): el azul profundo y las primeras estrellas.
  [
    'escritorio-cielo-nautico',
    '/cielo?captura=1&fecha=2026-11-01T17:50Z&rumbo=240&altura=20&campo=70',
    DESKTOP,
    'canvas',
  ],
  // De día (mediodía): sin estrellas.
  [
    'escritorio-cielo-dia',
    '/cielo?captura=1&fecha=2026-11-01T11:30Z&rumbo=180&altura=25&campo=70',
    DESKTOP,
    'canvas',
  ],
  // El Teide a la misma hora UTC: una hora menos en el reloj canario.
  [
    'escritorio-cielo-teide',
    '/cielo?captura=1&lugar=teide&fecha=2026-11-01T21:00Z',
    DESKTOP,
    'page',
  ],
  // La Luna en cuarto menguante (2-11-2026, 05:00), de cerca: su fase y su orientación.
  [
    'escritorio-cielo-luna-cerca',
    '/cielo?captura=1&fecha=2026-11-02T04:00Z&rumbo=119.05&altura=51.42&campo=2',
    DESKTOP,
    'canvas',
  ],
  // El eclipse total del 12-08-2026 desde Fraga (en la franja de la totalidad), de lejos y de cerca.
  [
    'escritorio-cielo-eclipse-fraga',
    '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:29:29Z&rumbo=285.4&altura=12&campo=50',
    DESKTOP,
    'canvas',
  ],
  [
    'escritorio-cielo-eclipse-fraga-cerca',
    '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:29:29Z&rumbo=285.33&altura=5.19&campo=3',
    DESKTOP,
    'canvas',
  ],
  // «Ver en 3D» de ese eclipse (la sombra sobre la Península) y de un eclipse total de Luna.
  [
    'escritorio-ver-en-3d-sol',
    '/explorar/tierra?captura=1&fecha=2026-08-12T18:29:29Z&sombra=1',
    DESKTOP,
    'canvas',
  ],
  [
    'escritorio-ver-en-3d-luna',
    '/explorar/luna?captura=1&fecha=2029-12-20T22:41:55Z',
    DESKTOP,
    'canvas',
  ],
  ['escritorio-eclipses', '/eclipses', DESKTOP, 'static'],
  ['movil-eclipses', '/eclipses', MOBILE, 'static'],
];

const { browser, close } = await openBrowser();
try {
  for (const [name, path, size, kind] of SHOTS) {
    if (only && !only.includes(name)) continue;
    if (kind === 'static') {
      const page = await browser.newPage(pageOptions(size));
      await page.goto(BASE + path);
      await page.locator('.eclipses__note', { hasText: 'Calculado en tu navegador' }).waitFor({
        timeout: 60_000,
      });
      await page.screenshot({ path: file(`${name}.png`), fullPage: false });
      console.log(name);
      await page.close();
      continue;
    }
    const { page, problems } = await openViewer(browser, path, size);
    if (kind === 'canvas') {
      await sharp(await canvasPng(page)).toFile(file(`${name}.png`));
    } else {
      await page.waitForTimeout(600);
      await page.screenshot({ path: file(`${name}.png`) });
    }
    const stats = await page.evaluate(() => window.__tlsViewer.engine.stats());
    console.log(
      `${name}: ${stats.drawCalls} llamadas, ${stats.vramMB.toFixed(1)} MB${problems.length ? ` · ${problems.join(' · ')}` : ''}`,
    );
    await page.close();
  }
} finally {
  await close();
}
