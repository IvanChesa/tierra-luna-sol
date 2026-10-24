// Mediciones de rendimiento y robustez del explorador para el informe (PLAN §5).
// Uso: npm run build && node scripts/measure.mjs [--swiftshader]
//
// - Reposo: frames pintados y llamadas a requestAnimationFrame en 3 s de pausa sin interacción.
// - Reproducción: FPS y coste por frame a 1 día/s durante 6 s (por calidad).
// - Contexto WebGL: WEBGL_lose_context.loseContext() y restoreContext().
// - Memoria: 10 idas y vueltas explorador ↔ ficha y 10 cambios de vista.
// - Arranque: peso de la primera vista por tipo, tareas largas (> 50 ms) y elemento LCP.
import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE, openBrowser, openViewer, rendererName, stats, waitForIdle } from './capture-lib.mjs';

const DIST = fileURLToPath(new URL('../dist/tierra-luna-sol/browser/', import.meta.url));

const results = {};
const { browser, close } = await openBrowser();

/** Contadores en la página: rAF, tareas largas y LCP (antes de cargar nada). */
const INIT = () => {
  const original = window.requestAnimationFrame.bind(window);
  window.__rafCalls = 0;
  window.requestAnimationFrame = (callback) => {
    window.__rafCalls++;
    return original(callback);
  };
  window.__longTasks = [];
  window.__lcp = null;
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__longTasks.push(Math.round(entry.duration));
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      window.__lcp = {
        ms: Math.round(last.startTime),
        element: last.element
          ? `${last.element.tagName.toLowerCase()}.${last.element.className}`
          : '',
      };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // Navegador sin estas entradas.
  }
};

try {
  // --- Arranque y peso de la primera vista (alta y baja) --------------------------------------
  for (const quality of ['alta', 'baja']) {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    const bytes = { js: 0, css: 0, html: 0, textures: 0, stars: 0, img: 0, fonts: 0, other: 0 };
    page.on('response', async (response) => {
      const url = new URL(response.url());
      if (url.origin !== BASE) return;
      // Tamaño del fichero servido (el servidor local no comprime; los WebP no ganan con gzip).
      const size = await stat(
        join(DIST, decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname)),
      )
        .then((info) => (info.isFile() ? info.size : 0))
        .catch(() => 0);
      const path = url.pathname;
      const kind = path.endsWith('.js')
        ? 'js'
        : path.endsWith('.css')
          ? 'css'
          : path.startsWith('/textures/')
            ? 'textures'
            : path.endsWith('.bin')
              ? 'stars'
              : path.startsWith('/img/')
                ? 'img'
                : path.endsWith('.woff2')
                  ? 'fonts'
                  : path.endsWith('.html') || path === '/'
                    ? 'html'
                    : 'other';
      bytes[kind] += size;
    });
    const start = Date.now();
    await page.goto(`${BASE}/?calidad=${quality}`);
    await page.waitForFunction(() => window.__tlsViewer === undefined || true);
    await page.waitForFunction(
      () => document.querySelector('canvas.viewer-canvas') !== null,
      null,
      { timeout: 60_000 },
    );
    // Sin modo de captura no hay __tlsViewer: se espera a que la red se calme y el motor repose.
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    const longTasks = await page.evaluate(() => window.__longTasks);
    const lcp = await page.evaluate(() => window.__lcp);
    results[`primera-vista-${quality}`] = {
      kB: Object.fromEntries(Object.entries(bytes).map(([k, v]) => [k, Math.round(v / 1024)])),
      tareasLargasMs: longTasks,
      lcp,
      segundosHastaRedQuieta: (Date.now() - start) / 1000,
    };
    await context.close();
  }

  // --- Reposo: 0 FPS en pausa -----------------------------------------------------------------
  {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    await page.goto(`${BASE}/?captura=1`);
    await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, { timeout: 60_000 });
    await waitForIdle(page);
    const before = await page.evaluate(() => ({
      frames: window.__tlsViewer.engine.stats().renderedFrames,
      raf: window.__rafCalls,
    }));
    await page.waitForTimeout(3000);
    const after = await page.evaluate(() => ({
      frames: window.__tlsViewer.engine.stats().renderedFrames,
      raf: window.__rafCalls,
    }));
    results.reposo = {
      framesEn3s: after.frames - before.frames,
      rafEn3s: after.raf - before.raf,
      gpu: await rendererName(page),
    };

    // --- Contexto WebGL perdido y recuperado ------------------------------------------------
    const lost = await page.evaluate(async () => {
      const events = [];
      const engine = window.__tlsViewer.engine;
      engine.on('contextLost', () => events.push('contextLost'));
      engine.on('contextRestored', () => events.push('contextRestored'));
      const canvas = document.querySelector('canvas.viewer-canvas');
      const gl = canvas.getContext('webgl2');
      const ext = gl.getExtension('WEBGL_lose_context');
      const framesBefore = engine.stats().renderedFrames;
      ext.loseContext();
      await new Promise((r) => setTimeout(r, 500));
      engine.setTime(new Date('2027-01-01T00:00:00Z'));
      await new Promise((r) => setTimeout(r, 300));
      const framesWhileLost = engine.stats().renderedFrames;
      ext.restoreContext();
      await new Promise((r) => setTimeout(r, 2500));
      return {
        events,
        framesWhileLost: framesWhileLost - framesBefore,
        framesAfterRestore: engine.stats().renderedFrames - framesWhileLost,
        time: engine.time.toISOString(),
      };
    });
    await sharp(await page.screenshot())
      .webp({ quality: 88 })
      .toFile('docs/informes/img/fase-2/contexto-recuperado.webp');
    const center = await page.evaluate(() => {
      const canvas = document.querySelector('canvas.viewer-canvas');
      const probe = document.createElement('canvas');
      probe.width = canvas.width;
      probe.height = canvas.height;
      return { width: canvas.width, height: canvas.height };
    });
    results.contexto = { ...lost, lienzo: center };
    await context.close();
  }

  // --- Reproducción: FPS y coste por frame (por calidad) ----------------------------------
  for (const quality of ['alta', 'media', 'baja']) {
    const { page } = await openViewer(browser, `/?captura=1&calidad=${quality}`);
    const measured = await page.evaluate(async () => {
      const engine = window.__tlsViewer.engine;
      engine.setSpeed(86_400);
      engine.setPlaying(true);
      await new Promise((r) => setTimeout(r, 1000));
      const samples = [];
      for (let k = 0; k < 5; k++) {
        await new Promise((r) => setTimeout(r, 1000));
        samples.push(engine.stats());
      }
      engine.setPlaying(false);
      const fps = samples.map((s) => s.fps);
      const last = samples[samples.length - 1];
      return {
        fpsMin: Math.min(...fps),
        fpsMedio: fps.reduce((a, b) => a + b, 0) / fps.length,
        cpuMsPorFrame: last.frameMs,
        efemeridesMsPorFrame: last.ephemerisMs,
        llamadas: last.drawCalls,
        triangulos: last.triangles,
        texturas: last.textures,
        vramMB: Math.round(last.vramMB),
      };
    });
    results[`reproduccion-${quality}`] = measured;
    await page.close();
  }

  // --- VRAM por vista y nivel -------------------------------------------------------------
  for (const quality of ['alta', 'media', 'baja']) {
    for (const [view, path] of [
      ['sistema', '/'],
      ['tierra', '/explorar/tierra'],
      ['luna', '/explorar/luna'],
    ]) {
      const { page } = await openViewer(browser, `${path}?captura=1&calidad=${quality}`);
      const s = await stats(page);
      results[`vram-${quality}-${view}`] = Math.round(s.vramMB);
      await page.close();
    }
  }

  // --- Memoria: 10 idas y vueltas explorador ↔ ficha y 10 cambios de vista ----------------
  {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await page.goto(`${BASE}/?captura=1`);
    await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, { timeout: 60_000 });
    await waitForIdle(page);
    const heap = async () => {
      await cdp.send('HeapProfiler.collectGarbage');
      await page.waitForTimeout(300);
      return page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1024 / 1024));
    };
    const memory = () => page.evaluate(() => window.__tlsViewer.engine.stats());
    const first = await memory();
    const heapStart = await heap();
    for (let k = 0; k < 10; k++) {
      await page.click('a[href="/planetas"]');
      await page.waitForURL('**/planetas');
      await page.click('a.site-name');
      await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, {
        timeout: 60_000,
      });
      await waitForIdle(page);
    }
    const afterTrips = await memory();
    const heapTrips = await heap();
    const contexts = await page.evaluate(() => document.querySelectorAll('canvas').length);
    for (let k = 0; k < 10; k++) {
      const view = ['/explorar/tierra', '/explorar/luna', '/'][k % 3];
      await page.evaluate((url) => {
        history.pushState({}, '', url);
        dispatchEvent(new PopStateEvent('popstate'));
      }, view);
      await waitForIdle(page);
    }
    await page.evaluate(() => {
      history.pushState({}, '', '/');
      dispatchEvent(new PopStateEvent('popstate'));
    });
    await waitForIdle(page);
    const afterViews = await memory();
    const heapViews = await heap();
    results.memoria = {
      inicio: { geometrias: first.geometries, texturas: first.textures, heapMB: heapStart },
      tras10IdasYVueltas: {
        geometrias: afterTrips.geometries,
        texturas: afterTrips.textures,
        heapMB: heapTrips,
        lienzos: contexts,
      },
      tras10CambiosDeVista: {
        geometrias: afterViews.geometries,
        texturas: afterViews.textures,
        heapMB: heapViews,
      },
    };
    await context.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
