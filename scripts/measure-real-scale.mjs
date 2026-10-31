// Mediciones de la escala real (fase 7, tarea 4): sin temblores ni saltos. En la escala real y en la
// ilustrativa:
// - **El cuerpo enfocado**, con el tiempo corriendo: Fobos (el más pequeño y el más rápido alrededor
//   de su planeta) y Neptuno (el más lejano). La cámara lo sigue: su centro se queda quieto en
//   pantalla (el origen flotante, en float64) y su radio, igual.
// - **Un vecino que se mueve en pantalla**, con pasos de tiempo fijos (sin el ruido del reloj de cada
//   frame): Fobos con Marte enfocado y Tritón con Neptuno. Si la posición temblara (float32 con
//   coordenadas grandes), su segunda diferencia lo diría; con un movimiento suave, es casi cero.
// Cifras, en px CSS:
// - temblor: la raíz cuadrática media de la segunda diferencia de la posición;
// - salto: el mayor cambio de un frame (o de un paso) al siguiente;
// - radio: el menor y el mayor de la serie.
// Uso: npm run build && node scripts/measure-real-scale.mjs
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const HOUR_S = 3600;
const DAY_S = 86_400;
const START = '2026-10-24T00:00:00Z';
/** [cuerpo enfocado, velocidad (s simulados por s real)]. */
const FOCUSED = [
  ['fobos', HOUR_S],
  ['fobos', DAY_S],
  ['neptuno', HOUR_S],
  ['neptuno', 30 * DAY_S],
];
/** [cuerpo enfocado, vecino, paso de tiempo (s), pasos]. */
const NEIGHBOURS = [
  ['marte', 'fobos', 60, 120],
  ['neptuno', 'triton', 600, 120],
];

/** Resumen de una serie de posiciones y radios en pantalla. */
function summarize(xs, ys, radii) {
  let jitter = 0;
  let jump = 0;
  for (let k = 1; k < xs.length; k++) {
    jump = Math.max(jump, Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]));
    if (k + 1 < xs.length) {
      jitter += (xs[k + 1] - 2 * xs[k] + xs[k - 1]) ** 2 + (ys[k + 1] - 2 * ys[k] + ys[k - 1]) ** 2;
    }
  }
  return {
    muestras: xs.length,
    tembloresPx: Number(Math.sqrt(jitter / Math.max(xs.length - 2, 1)).toFixed(4)),
    saltoMaxPx: Number(jump.toFixed(4)),
    radioPx: [Number(Math.min(...radii).toFixed(3)), Number(Math.max(...radii).toFixed(3))],
  };
}

/** Reproduce `seconds` segundos reales a `speed` y apunta el cuerpo enfocado en cada frame. */
const trackFocused = (page, id, speed, seconds) =>
  page.evaluate(
    async ([id, speed, seconds]) => {
      const engine = window.__tlsViewer.engine;
      const index = engine.world.visuals.findIndex((v) => v.body.id === id);
      engine.setSpeed(speed);
      engine.setPlaying(true);
      // El primer segundo, la cámara termina de colocarse.
      await new Promise((r) => setTimeout(r, 1000));
      const series = { xs: [], ys: [], radii: [] };
      const end = performance.now() + seconds * 1000;
      while (performance.now() < end) {
        await new Promise((r) => requestAnimationFrame(r));
        const body = engine.screen[index];
        series.xs.push(body.x);
        series.ys.push(body.y);
        series.radii.push(body.radiusPx);
      }
      engine.setPlaying(false);
      return series;
    },
    [id, speed, seconds],
  );

/** Lleva el tiempo a pasos fijos y apunta, tras cada frame, dónde cae el vecino en pantalla. */
const trackNeighbour = (page, id, stepSeconds, steps, start) =>
  page.evaluate(
    async ([id, stepSeconds, steps, start]) => {
      const engine = window.__tlsViewer.engine;
      const index = engine.world.visuals.findIndex((v) => v.body.id === id);
      const series = { xs: [], ys: [], radii: [], onScreen: 0 };
      for (let k = 0; k < steps; k++) {
        engine.setTime(new Date(Date.parse(start) + k * stepSeconds * 1000));
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        const body = engine.screen[index];
        series.xs.push(body.x);
        series.ys.push(body.y);
        series.radii.push(body.radiusPx);
        if (body.onScreen) series.onScreen++;
      }
      return series;
    },
    [id, stepSeconds, steps, start],
  );

const results = {};
const { browser, close } = await openBrowser();
try {
  for (const scale of ['real', 'ilustrativa']) {
    for (const [id, speed] of FOCUSED) {
      const { page } = await openViewer(
        browser,
        `/?captura=1&cuerpo=${id}&escala=${scale}&fecha=${START}`,
      );
      await waitForIdle(page);
      const s = await trackFocused(page, id, speed, 4);
      results[`${scale}-${id}-enfocado-${speed}s`] = summarize(s.xs, s.ys, s.radii);
      await page.close();
    }
    for (const [focus, id, step, steps] of NEIGHBOURS) {
      const { page } = await openViewer(
        browser,
        `/?captura=1&cuerpo=${focus}&escala=${scale}&fecha=${START}`,
      );
      await waitForIdle(page);
      const s = await trackNeighbour(page, id, step, steps, START);
      results[`${scale}-${id}-con-${focus}-cada-${step}s`] = {
        ...summarize(s.xs, s.ys, s.radii),
        enPantalla: `${s.onScreen} de ${steps}`,
      };
      await page.close();
    }
  }
} finally {
  await close();
}
console.log(JSON.stringify(results, null, 2));
