// Mediciones de la fase 3c (tarea 9): el explorador arranca en movimiento (D31), así que ya no hay
// render bajo demanda al llegar. Para el informe:
//
// - Al entrar (sin modo de captura, reproduciendo a 3 horas por segundo), en escritorio y en un
//   teléfono (Pixel 7, táctil): CLS (suma de los `layout-shift` sin interacción reciente), LCP y su
//   elemento, tareas largas (> 50 ms) y su tiempo de bloqueo (lo que pasa de 50 ms), y frames por
//   segundo con la reproducción automática (llamadas a requestAnimationFrame).
// - A 3 horas por segundo, en modo de captura y en los tres niveles: FPS y coste por frame en la CPU
//   (stats() del motor).
// - Pestaña oculta: el motor deja de pintar (y vuelve al mostrarla).
//
// No usa Lighthouse (no está entre las dependencias; @lhci/cli espera la decisión de Iván, fase 10):
// mide con las mismas APIs de rendimiento lo que Lighthouse puntúa en el arranque.
//
// Uso: npm run build && node scripts/measure-autoplay.mjs [--swiftshader]
import { devices } from '@playwright/test';
import { BASE, PAGE_OPTIONS, openBrowser, openViewer, rendererName } from './capture-lib.mjs';

/** Contadores en la página, antes de cargar nada: rAF, tareas largas, LCP y desplazamientos. */
const INIT = () => {
  const original = window.requestAnimationFrame.bind(window);
  window.__raf = 0;
  window.requestAnimationFrame = (callback) => {
    window.__raf++;
    return original(callback);
  };
  window.__longTasks = [];
  window.__lcp = null;
  window.__shifts = [];
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__longTasks.push(Math.round(entry.duration));
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((list) => {
      const last = list.getEntries().at(-1);
      window.__lcp = {
        ms: Math.round(last.startTime),
        element: last.element
          ? `${last.element.tagName.toLowerCase()}.${String(last.element.className)}`
          : '',
      };
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__shifts.push({
          value: entry.value,
          at: Math.round(entry.startTime),
          nodes: (entry.sources ?? []).map((source) =>
            source.node instanceof Element
              ? `${source.node.tagName.toLowerCase()}.${String(source.node.className).split(' ')[0]}`
              : String(source.node?.nodeName ?? ''),
          ),
        });
      }
    }).observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Navegador sin estas entradas.
  }
};

const FORMATS = {
  escritorio: { ...PAGE_OPTIONS, viewport: { width: 1600, height: 900 } },
  movil: { ...PAGE_OPTIONS, ...devices['Pixel 7'] },
};

const results = {};
const { browser, close } = await openBrowser();
try {
  // --- Al entrar: CLS, LCP, tareas largas y FPS con la reproducción automática -----------------
  for (const [name, options] of Object.entries(FORMATS)) {
    const context = await browser.newContext(options);
    await context.addInitScript(INIT);
    const page = await context.newPage();
    await page.goto(`${BASE}/`);
    await page.waitForSelector('tls-viewer-canvas.is-ready', { timeout: 90_000 });
    await page.waitForLoadState('networkidle');
    // Lo que pinta la reproducción automática durante 5 s, ya cargado todo.
    await page.waitForTimeout(1000);
    const simMs = () =>
      page.evaluate(() =>
        Date.parse(document.querySelector('.time__readout time')?.getAttribute('datetime') ?? ''),
      );
    const before = await page.evaluate(() => window.__raf);
    const simBefore = await simMs();
    const wallBefore = Date.now();
    await page.waitForTimeout(5000);
    const after = await page.evaluate(() => window.__raf);
    const hoursPerSecond =
      ((await simMs()) - simBefore) / 3_600_000 / ((Date.now() - wallBefore) / 1000);
    const measured = await page.evaluate(() => ({
      shifts: window.__shifts,
      longTasks: window.__longTasks,
      lcp: window.__lcp,
      playing: document.querySelector('.time__play')?.textContent?.trim(),
      speed: document.querySelector('.time__zone')?.textContent?.replace(/\s+/g, ' ').trim(),
    }));
    const cls = measured.shifts.reduce((sum, shift) => sum + shift.value, 0);
    results[`entrar-${name}`] = {
      reproduciendo: measured.playing,
      lectura: measured.speed,
      cls: Number(cls.toFixed(4)),
      desplazamientos: measured.shifts,
      lcp: measured.lcp,
      tareasLargasMs: measured.longTasks,
      bloqueoMs: measured.longTasks.reduce((sum, ms) => sum + Math.max(0, ms - 50), 0),
      framesPorSegundo: Math.round((after - before) / 5),
      // La lectura de la barra cambia como mucho 5 veces por segundo: una cifra aproximada.
      horasSimuladasPorSegundo: Number(hoursPerSecond.toFixed(2)),
    };
    await context.close();
  }

  // --- A 3 horas por segundo, por calidad: FPS y coste por frame ------------------------------
  for (const quality of ['alta', 'media', 'baja']) {
    const { page } = await openViewer(browser, `/?captura=1&calidad=${quality}`);
    results[`3h-por-segundo-${quality}`] = await page.evaluate(async () => {
      const engine = window.__tlsViewer.engine;
      engine.setSpeed(3 * 3600);
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
        efemeridesMsPorFrame: Number(last.ephemerisMs.toFixed(3)),
        llamadas: last.drawCalls,
        vramMB: Math.round(last.vramMB),
        nivel: last.quality,
      };
    });
    if (quality === 'alta') results.gpu = await rendererName(page);
    await page.close();
  }

  // --- Pestaña oculta: el motor deja de pintar --------------------------------------------------
  {
    const { page } = await openViewer(browser, '/?captura=1');
    results.pestanaOculta = await page.evaluate(async () => {
      const engine = window.__tlsViewer.engine;
      const frames = () => engine.stats().renderedFrames;
      const setHidden = (hidden) => {
        Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
        Object.defineProperty(document, 'visibilityState', {
          value: hidden ? 'hidden' : 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
      };
      engine.setSpeed(3 * 3600);
      engine.setPlaying(true);
      await new Promise((r) => setTimeout(r, 1000));
      const visibleStart = frames();
      await new Promise((r) => setTimeout(r, 2000));
      const visible = frames() - visibleStart;
      setHidden(true);
      await new Promise((r) => setTimeout(r, 300));
      const hiddenStart = frames();
      await new Promise((r) => setTimeout(r, 2000));
      const hidden = frames() - hiddenStart;
      setHidden(false);
      await new Promise((r) => setTimeout(r, 1000));
      const back = frames() - hiddenStart - hidden;
      engine.setPlaying(false);
      return { framesVisibleEn2s: visible, framesOcultaEn2s: hidden, framesAlVolverEn1s: back };
    });
    await page.close();
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
