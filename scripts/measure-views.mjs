// FPS, VRAM y peso por vista en los tres niveles de calidad (fase 3b, criterio de la tabla; PLAN §5).
// Uso: npm run build && node scripts/measure-views.mjs [--swiftshader] [alta|media|baja…]
// (sin niveles, los tres; con alguno, solo esos: para repetir uno si la máquina estaba ocupada).
//
// Por cada nivel, una página en modo de captura que recorre las vistas como lo haría quien la usa
// (desde la fase 7, también los sistemas de lunas, con sus mosaicos),
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
  // Fase 7: los sistemas de lunas, con sus mosaicos (se cargan al enfocar el sistema).
  ['dione (luna de saturno)', { focus: 'dione' }],
  ['jupiter (sus lunas)', { focus: 'jupiter' }],
  ['europa (luna de jupiter)', { focus: 'europa' }],
  ['triton (luna de neptuno)', { focus: 'triton' }],
  ['fobos (luna de marte)', { focus: 'fobos' }],
  // Fase 9b (D42 y D45): las cinco de Urano con sus mapas del JPL, y Deimos con su forma.
  ['urano (sus lunas)', { focus: 'urano' }],
  ['miranda (luna de urano)', { focus: 'miranda' }],
  ['deimos (luna de marte)', { focus: 'deimos' }],
  ['sol (primer plano)', { focus: 'sol' }],
  ['tierra (vista)', { route: '/explorar/tierra' }],
  ['luna (vista)', { route: '/explorar/luna' }],
  // Fase 8: el cielo desde el Montsec (a 1 día/s, el cielo gira entero cada segundo).
  ['cielo (vista)', { route: '/cielo' }],
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

const LEVELS = ['alta', 'media', 'baja'];
const chosen = LEVELS.filter((level) => process.argv.includes(level));

const results = { gpu: null, niveles: {} };
const { browser, close } = await openBrowser();
try {
  for (const quality of chosen.length > 0 ? chosen : LEVELS) {
    const page = await browser.newPage(pageOptions({ width: 1600, height: 900 }));
    const downloads = [];
    // Cada fichero cuenta una vez: si se vuelve a pedir (al dejar un primer plano, el cuerpo vuelve a
    // su textura de la vista general), lo sirve la caché del navegador.
    const requested = new Set();
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      // Las texturas, el catálogo de estrellas y, desde la fase 8, las constelaciones (`/data/`).
      if (!url.pathname.startsWith('/textures/') && !url.pathname.startsWith('/data/')) return;
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
      // La VRAM y las llamadas de dibujo del último frame (desde la fase 9b, con todas sus pasadas:
      // también las del bloom del Sol).
      const { vramMB, llamadas } = await page.evaluate(() => {
        const stats = window.__tlsViewer.engine.stats();
        return { vramMB: Math.round(stats.vramMB), llamadas: stats.drawCalls };
      });
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
        llamadas,
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
