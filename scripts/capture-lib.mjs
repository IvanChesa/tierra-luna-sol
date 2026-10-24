// Utilidades de Playwright para las capturas deterministas (?captura=1), el póster y las mediciones.
// Lo usan scripts/capture.mjs, scripts/build-poster.mjs y scripts/measure.mjs.
//
// Navegador: el Chromium de Playwright. Por defecto con la GPU del equipo (ANGLE sobre D3D11 en
// Windows); con `--swiftshader`, WebGL por software (lo que usará el CI en Linux).
import { chromium } from '@playwright/test';
import { startServer } from './serve-dist.mjs';

export const PORT = 4321;
export const BASE = `http://localhost:${PORT}`;

export function launchArgs(argv = process.argv) {
  return argv.includes('--swiftshader')
    ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    : ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'];
}

/** Arranca el servidor del build y el navegador; devuelve una función para cerrarlo todo. */
export async function openBrowser(argv = process.argv) {
  const server = await startServer(PORT);
  const browser = await chromium.launch({ args: launchArgs(argv) });
  return {
    browser,
    async close() {
      await browser.close();
      server.close();
    },
  };
}

/**
 * Idioma y zona fijos: la interfaz escribe fechas y horas en la hora local del navegador, así que las
 * capturas solo son deterministas con una zona dada.
 */
export const PAGE_OPTIONS = { locale: 'es-ES', timezoneId: 'Europe/Madrid' };

/**
 * Abre una URL del explorador y espera a que el motor esté listo y, en el modo de captura, a que no
 * queden texturas por subir (el motor deja de pintar). Devuelve la página y los errores de consola.
 * `setup` se ejecuta antes de cargar la página (para interceptar peticiones, por ejemplo).
 */
export async function openViewer(
  browser,
  path,
  { width = 1600, height = 900, scale = 1, setup } = {},
) {
  const page = await browser.newPage({
    ...PAGE_OPTIONS,
    viewport: { width, height },
    deviceScaleFactor: scale,
  });
  if (setup) await setup(page);
  const problems = [];
  page.on('pageerror', (error) => problems.push(`[pageerror] ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`[console] ${message.text()}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) problems.push(`[${response.status()}] ${response.url()}`);
  });
  await page.goto(BASE + path);
  await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, { timeout: 90_000 });
  await waitForIdle(page);
  return { page, problems };
}

/** Espera a que el motor lleve 1,5 s sin pintar (texturas subidas, cámara quieta). */
export async function waitForIdle(page, timeoutMs = 30_000) {
  const start = Date.now();
  let last = -1;
  let stableSince = Date.now();
  while (Date.now() - start < timeoutMs) {
    const frames = await page.evaluate(
      () => window.__tlsViewer?.engine?.stats().renderedFrames ?? 0,
    );
    if (frames !== last) {
      last = frames;
      stableSince = Date.now();
    } else if (Date.now() - stableSince > 1500) {
      return;
    }
    await page.waitForTimeout(250);
  }
  throw new Error('El motor no ha llegado al reposo');
}

export const stats = (page) => page.evaluate(() => window.__tlsViewer.engine.stats());

export const rendererName = (page) =>
  page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'desconocido';
  });
