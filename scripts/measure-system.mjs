// Mediciones de la fase 4b: la vista general con las estelas de color (D34) y los planetas más
// grandes, a la velocidad de cada contexto (D33). Por calidad (alta, media y baja): FPS, coste por
// frame en la CPU, llamadas de dibujo, triángulos y VRAM estimada, en la vista general a 3 días por
// segundo y con Júpiter enfocado a 1 hora por segundo (modo de captura, sin interacción).
//
// Uso: npm run build && node scripts/measure-system.mjs [--swiftshader]
import { openBrowser, openViewer, rendererName } from './capture-lib.mjs';

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
  for (const quality of ['alta', 'media', 'baja']) {
    const overview = await openViewer(browser, `/?captura=1&calidad=${quality}`);
    results[`vista-general-3-dias-${quality}`] = await sample(overview.page, 3 * DAY_S);
    if (quality === 'alta') results.gpu = await rendererName(overview.page);
    await overview.page.close();
    const jupiter = await openViewer(browser, `/?captura=1&calidad=${quality}&cuerpo=jupiter`);
    results[`jupiter-1-hora-${quality}`] = await sample(jupiter.page, HOUR_S);
    await jupiter.page.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
