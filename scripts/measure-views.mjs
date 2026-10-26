// FPS, VRAM y peso por vista en los tres niveles de calidad (fase 3b, criterio de la tabla; PLAN §5).
// Uso: npm run build && node scripts/measure-views.mjs [--swiftshader]
//
// Por cada nivel, una página en modo de captura que recorre las vistas como lo haría quien la usa,
// sin recargar: la primera vista (`/`), los primeros planos con algo nuevo de la fase 3b (Marte con su
// relieve, Saturno con sus anillos y el Sol) y las vistas Tierra y Luna. En cada paso:
// - peso: bytes de las texturas y del catálogo de estrellas descargados en ese paso (el tamaño del
//   fichero servido; el servidor local no comprime y los WebP no ganan con gzip). En las vistas Tierra
//   y Luna, es lo «adicional» de §5;
// - VRAM estimada por el motor (texturas + geometría) al llegar al reposo;
// - FPS durante 4 s de reproducción a 1 día/s (el motor pinta cada frame) y coste de CPU por frame.
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, openBrowser, pageOptions, rendererName, waitForIdle } from './capture-lib.mjs';

const DIST = fileURLToPath(new URL('../dist/tierra-luna-sol/browser/', import.meta.url));

/** Pasos del recorrido: [nombre, acción en la página]. */
const STEPS = [
  ['sistema', null],
  ['marte (primer plano)', { focus: 'marte' }],
  ['saturno (primer plano)', { focus: 'saturno' }],
  ['sol (primer plano)', { focus: 'sol' }],
  ['tierra (vista)', { route: '/explorar/tierra' }],
  ['luna (vista)', { route: '/explorar/luna' }],
];

/** FPS y coste por frame durante 4 s de reproducción a 1 día/s (tras 1 s de arranque). */
const playbackStats = (page) =>
  page.evaluate(async () => {
    const engine = window.__tlsViewer.engine;
    engine.setSpeed(86_400);
    engine.setPlaying(true);
    await new Promise((r) => setTimeout(r, 1000));
    const samples = [];
    for (let k = 0; k < 4; k++) {
      await new Promise((r) => setTimeout(r, 1000));
      samples.push(engine.stats());
    }
    engine.setPlaying(false);
    const fps = samples.map((s) => s.fps);
    return {
      fpsMin: Math.round(Math.min(...fps)),
      fpsMedio: Math.round(fps.reduce((a, b) => a + b, 0) / fps.length),
      cpuMsPorFrame: Number(samples[samples.length - 1].frameMs.toFixed(2)),
    };
  });

const results = { gpu: null, niveles: {} };
const { browser, close } = await openBrowser();
try {
  for (const quality of ['alta', 'media', 'baja']) {
    const page = await browser.newPage(pageOptions({ width: 1600, height: 900 }));
    const downloads = [];
    // Cada fichero cuenta una vez: si se vuelve a pedir (al dejar un primer plano, el cuerpo vuelve a
    // su textura de la vista general), lo sirve la caché del navegador.
    const requested = new Set();
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      if (!url.pathname.startsWith('/textures/') && !url.pathname.endsWith('.bin')) return;
      if (requested.has(url.pathname)) return;
      requested.add(url.pathname);
      const size = await stat(join(DIST, decodeURIComponent(url.pathname)))
        .then((info) => (info.isFile() ? info.size : 0))
        .catch(() => 0);
      downloads.push({ path: url.pathname, size });
    });
    await page.goto(`${BASE}/?captura=1&calidad=${quality}`);
    await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, {
      timeout: 90_000,
    });
    await waitForIdle(page);
    results.gpu ??= await rendererName(page);
    const rows = {};
    let seen = 0;
    for (const [name, action] of STEPS) {
      if (action?.focus) {
        await page.evaluate((id) => {
          const engine = window.__tlsViewer.engine;
          engine.focus(id);
          engine.skipTransition();
        }, action.focus);
      } else if (action?.route) {
        await page.evaluate((url) => {
          history.pushState({}, '', url);
          dispatchEvent(new PopStateEvent('popstate'));
        }, action.route);
        await page.waitForTimeout(300);
        await page.evaluate(() => window.__tlsViewer.engine.skipTransition());
      }
      await waitForIdle(page);
      const vramMB = await page.evaluate(() =>
        Math.round(window.__tlsViewer.engine.stats().vramMB),
      );
      const playback = await playbackStats(page);
      await waitForIdle(page);
      // Lo que haya llegado en este paso (las respuestas se cuentan de forma asíncrona).
      await page.waitForTimeout(500);
      const step = downloads.slice(seen);
      seen = downloads.length;
      rows[name] = {
        pesoKB: Math.round(step.reduce((sum, d) => sum + d.size, 0) / 1024),
        ficheros: step.map((d) => d.path.replace(/^\/textures\//, '')),
        vramMB,
        ...playback,
      };
    }
    results.niveles[quality] = rows;
    await page.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
