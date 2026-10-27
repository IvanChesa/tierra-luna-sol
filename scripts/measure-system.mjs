// Mediciones de la fase 4b: la vista general con las estelas de color (D34) y los planetas más
// grandes, a la velocidad de cada contexto (D33). Por calidad (alta, media y baja): FPS, coste por
// frame en la CPU, llamadas de dibujo, triángulos y VRAM estimada, en la vista general a 3 días por
// segundo, con Júpiter enfocado y en la vista Tierra (fase 5) a 1 hora por segundo (modo de captura,
// sin interacción).
//
// También el radio en pantalla (px CSS) del Sol y de los planetas en la vista general, en escritorio,
// portátil y móvil, el 24-10-2026 (anillos de Saturno casi de canto) y el 01-03-2032 (abiertos).
//
// Uso: npm run build && node scripts/measure-system.mjs [--swiftshader]
import { readFile } from 'node:fs/promises';
import { openBrowser, openViewer, rendererName } from './capture-lib.mjs';

/** Los cuerpos en el orden de la escena (el de `data/body-index.ts`). */
const BODY_IDS = [
  ...(await readFile(new URL('../src/app/data/body-index.ts', import.meta.url), 'utf8')).matchAll(
    /\{ id: '([a-z]+)'/g,
  ),
].map((match) => match[1]);
const PRIMARIES = [
  'sol',
  'mercurio',
  'venus',
  'tierra',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
];
const SIZES = {
  escritorio: { width: 1600, height: 900, scale: 1 },
  portatil: { width: 1280, height: 720, scale: 1 },
  movil: { width: 390, height: 844, scale: 2, mobile: true },
};

const DAY_S = 86_400;
const HOUR_S = 3600;

/** Reproduce a `speed` (s simulados por s real) 6 s y resume las cifras del motor. */
const sample = (page, speed) =>
  page.evaluate(async (speed) => {
    const engine = window.__tlsViewer.engine;
    engine.setSpeed(speed);
    engine.setPlaying(true);
    await new Promise((r) => setTimeout(r, 1000));
    const samples = [];
    for (let k = 0; k < 5; k++) {
      await new Promise((r) => setTimeout(r, 1000));
      samples.push(engine.stats());
    }
    engine.setPlaying(false);
    const fps = samples.map((s) => s.fps);
    const last = samples.at(-1);
    return {
      fpsMin: Math.min(...fps),
      fpsMedio: Number((fps.reduce((a, b) => a + b, 0) / fps.length).toFixed(1)),
      cpuMsPorFrame: Number(last.frameMs.toFixed(2)),
      llamadas: last.drawCalls,
      triangulos: last.triangles,
      vramMB: Math.round(last.vramMB),
      nivel: last.quality,
    };
  }, speed);

const results = {};
const { browser, close } = await openBrowser();
try {
  for (const [name, size] of Object.entries(SIZES)) {
    for (const date of ['', '&fecha=2032-03-01T00:00Z']) {
      const { page } = await openViewer(browser, `/?captura=1${date}`, size);
      // `screen` es privado en TypeScript, pero en el navegador se lee: radios del último frame.
      const radii = await page.evaluate(() =>
        window.__tlsViewer.engine.screen.map((body) => body.radiusPx),
      );
      results[`radios-px-${name}${date ? '-2032' : ''}`] = Object.fromEntries(
        PRIMARIES.map((id) => [id, Number((radii[BODY_IDS.indexOf(id)] ?? NaN).toFixed(1))]),
      );
      await page.close();
    }
  }
  for (const quality of ['alta', 'media', 'baja']) {
    const overview = await openViewer(browser, `/?captura=1&calidad=${quality}`);
    results[`vista-general-3-dias-${quality}`] = await sample(overview.page, 3 * DAY_S);
    if (quality === 'alta') results.gpu = await rendererName(overview.page);
    await overview.page.close();
    const jupiter = await openViewer(browser, `/?captura=1&calidad=${quality}&cuerpo=jupiter`);
    results[`jupiter-1-hora-${quality}`] = await sample(jupiter.page, HOUR_S);
    await jupiter.page.close();
    // La vista Tierra (fase 5): el material completo, las nubes y, en alto, la textura de día de 8k.
    const earth = await openViewer(browser, `/explorar/tierra?captura=1&calidad=${quality}`);
    results[`tierra-1-hora-${quality}`] = await sample(earth.page, HOUR_S);
    await earth.page.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
