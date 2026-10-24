// Mediciones de rendimiento y robustez del explorador para el informe (PLAN §5).
// Uso: npm run build && node scripts/measure.mjs [--swiftshader] [--img=docs/informes/img/fase-N]
// (con --img, guarda ahí la captura del contexto recuperado).
//
// - Reposo: frames pintados y llamadas a requestAnimationFrame en 3 s de pausa sin interacción.
// - Reproducción: FPS y coste por frame a 1 día/s durante 6 s (por calidad).
// - Contexto WebGL: WEBGL_lose_context.loseContext() y restoreContext().
// - Memoria: 10 idas y vueltas explorador ↔ ficha, 10 cambios de vista y 6 cambios de calidad.
//   Lo que demuestra cada cifra: el heap de JS (tras forzar el recolector) no crece; los contextos
//   WebGL vivos (se cuentan envolviendo getContext y descontando los perdidos) siguen siendo uno; y
//   renderer.info.memory del motor que queda no acumula geometrías ni texturas.
// - Arranque: peso de la primera vista por tipo, tareas largas (> 50 ms) y elemento LCP.
// - Estado y URL (§4.5): actualizaciones del store por segundo a 1 año/s (eventos `timeChanged`) y
//   cambios de la URL durante la reproducción.
import { stat } from 'node:fs/promises';
import sharp from 'sharp';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BASE,
  PAGE_OPTIONS,
  openBrowser,
  openViewer,
  rendererName,
  stats,
  waitForIdle,
} from './capture-lib.mjs';

const DIST = fileURLToPath(new URL('../dist/tierra-luna-sol/browser/', import.meta.url));
const IMG_DIR = process.argv.find((arg) => arg.startsWith('--img='))?.slice('--img='.length);

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
    if (IMG_DIR) {
      await sharp(await page.screenshot())
        .webp({ quality: 88 })
        .toFile(join(IMG_DIR, 'contexto-recuperado.webp'));
    }
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

  // --- Estado y URL durante la reproducción (§4.5) ------------------------------------------
  {
    // Actualizaciones del store: eventos `timeChanged` del motor a 1 año/s durante 5 s.
    const { page } = await openViewer(browser, '/?captura=1&cuerpo=marte');
    const events = await page.evaluate(async () => {
      const engine = window.__tlsViewer.engine;
      let count = 0;
      const off = engine.on('timeChanged', () => count++);
      engine.setSpeed(365.25 * 86_400);
      engine.setPlaying(true);
      await new Promise((r) => setTimeout(r, 1000));
      const start = count;
      await new Promise((r) => setTimeout(r, 5000));
      const perSecond = (count - start) / 5;
      engine.setPlaying(false);
      off();
      return perSecond;
    });
    await page.close();
    // Cambios de la URL (pushState y replaceState) durante 5 s de reproducción, sin modo de captura.
    const context = await browser.newContext({
      ...PAGE_OPTIONS,
      viewport: { width: 1600, height: 900 },
    });
    await context.addInitScript(() => {
      window.__urlChanges = 0;
      for (const method of ['pushState', 'replaceState']) {
        const original = history[method].bind(history);
        history[method] = (...args) => {
          window.__urlChanges++;
          return original(...args);
        };
      }
    });
    const live = await context.newPage();
    await live.goto(`${BASE}/?fecha=2030-06-01T12:00Z&cuerpo=marte`);
    await live.waitForSelector('tls-viewer-canvas.is-ready', { timeout: 60_000 });
    await live.selectOption('#time-speed', 'year');
    await live.click('.time__play');
    // Al empezar, la fecha sale de la URL (un cambio); después, ninguno.
    await live.waitForTimeout(1000);
    const urlBefore = await live.evaluate(() => window.__urlChanges);
    await live.waitForTimeout(5000);
    const urlDuring = (await live.evaluate(() => window.__urlChanges)) - urlBefore;
    await live.click('.time__play');
    await live.waitForTimeout(500);
    results.estado = {
      actualizacionesDelStorePorSegundo: events,
      cambiosDeUrlEn5sDeReproduccion: urlDuring,
      urlAlPausar: new URL(live.url()).search,
    };
    await context.close();
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

  // --- Memoria: 10 idas y vueltas explorador ↔ ficha, 10 cambios de vista y de calidad ------
  {
    const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
    // Cuenta los contextos WebGL que se crean y los que se pierden (dispose() fuerza la pérdida).
    await context.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      window.__glContexts = [];
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        const context = original.call(this, type, ...rest);
        if (context && /webgl/.test(type) && !window.__glContexts.includes(context)) {
          window.__glContexts.push(context);
        }
        return context;
      };
    });
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
      // Atrás (como el botón del navegador): vuelve a /?captura=1, la escena determinista.
      await page.goBack();
      await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, {
        timeout: 60_000,
      });
      await waitForIdle(page);
    }
    const afterTrips = await memory();
    const heapTrips = await heap();
    const liveContexts = () =>
      page.evaluate(() => window.__glContexts.filter((gl) => !gl.isContextLost()).length);
    const contexts = await liveContexts();
    const canvases = await page.evaluate(() => document.querySelectorAll('canvas').length);
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
    const contextsViews = await liveContexts();
    for (const setting of ['medium', 'low', 'high', 'medium', 'low', 'high']) {
      await page.evaluate((value) => window.__tlsViewer.engine.setQuality(value), setting);
      await waitForIdle(page);
    }
    const afterQuality = await memory();
    const heapQuality = await heap();
    results.memoria = {
      inicio: { geometrias: first.geometries, texturas: first.textures, heapMB: heapStart },
      tras10IdasYVueltas: {
        geometrias: afterTrips.geometries,
        texturas: afterTrips.textures,
        heapMB: heapTrips,
        contextosWebGLVivos: contexts,
        lienzos: canvases,
      },
      tras10CambiosDeVista: {
        geometrias: afterViews.geometries,
        texturas: afterViews.textures,
        heapMB: heapViews,
        contextosWebGLVivos: contextsViews,
      },
      tras6CambiosDeCalidad: {
        geometrias: afterQuality.geometries,
        texturas: afterQuality.textures,
        heapMB: heapQuality,
        contextosWebGLVivos: await liveContexts(),
      },
    };
    await context.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
