// Las métricas de Lighthouse en las páginas de contenido (fase 9, criterio «Lighthouse móvil ≥ 95 en
// una muestra de fichas»), sin Lighthouse: `@lhci/cli` espera la decisión de Iván (fase 10) y otra
// herramienta sería una condición de parada. Se miden con Playwright y el protocolo de DevTools en las
// condiciones del móvil de Lighthouse con su estrangulamiento «applied» (el de DevTools: CPU ×4 y red de
// 562,5 ms de RTT y 1,47 Mbit/s de bajada; las del modo simulado, 150 ms y 1,6 Mbit/s, son más
// benignas), en una pantalla de 412 × 823 a 1,75x, sin caché:
// - FCP y LCP (PerformanceObserver), CLS (los desplazamientos sin interacción) y el tiempo de bloqueo
//   (TBT: lo que pasa de 50 ms de cada tarea larga desde el FCP);
// - una estimación de la nota de rendimiento con las curvas públicas de Lighthouse 12 (log-normales,
//   con su p10 y su mediana del móvil) y sus pesos. El índice de velocidad (SI) no se mide: se toma el
//   LCP, que es su cota superior en estas páginas (todo se pinta a la vez), y la estimación sale a la
//   baja;
// - de «buenas prácticas», lo que se puede medir: 0 errores de consola y las imágenes a su proporción.
// La mediana de 3 cargas por página (otra sesión del equipo puede falsear las cifras: memoria del
// proyecto).
// Uso: npm run build && node scripts/measure-pages.mjs [rutas…]
import { chromium } from '@playwright/test';
import { startServer } from './serve-dist.mjs';

const PORT = 4396;
const BASE = `http://127.0.0.1:${PORT}`;
const ROUTES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      '/planetas/marte',
      '/planetas/saturno',
      '/lunas/titan',
      '/sol',
      '/luna',
      '/planetas',
      '/lunas',
      '/sobre-el-proyecto',
      '/creditos',
    ];
const RUNS = 3;

/** Lighthouse 12, móvil: p10 y mediana de cada métrica (ms; CLS sin unidad) y su peso. */
const CURVES = {
  fcp: { p10: 1800, median: 3000, weight: 0.1 },
  si: { p10: 3387, median: 5800, weight: 0.1 },
  lcp: { p10: 2500, median: 4000, weight: 0.25 },
  tbt: { p10: 200, median: 600, weight: 0.3 },
  cls: { p10: 0.1, median: 0.25, weight: 0.25 },
};

/** erfc(x) (Abramowitz y Stegun, 7.1.26; error < 1,5e-7). */
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * z);
  const poly =
    t *
    (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
  const value = poly * Math.exp(-z * z);
  return x >= 0 ? value : 2 - value;
}

/** La nota de una métrica con la curva log-normal de Lighthouse (`getLogNormalScore`). */
function score({ p10, median }, value) {
  if (value <= 0) return 1;
  const INVERSE_ERFC_ONE_FIFTH = 0.9061938024368232;
  const standardized =
    (Math.log(Math.max(Number.MIN_VALUE, value / median)) * INVERSE_ERFC_ONE_FIFTH) /
    -Math.log(p10 / median);
  return Math.min(1, Math.max(0, erfc(standardized) / 2));
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Lo que se observa en la página desde antes de cargar. */
const OBSERVE = () => {
  const m = { fcp: 0, lcp: 0, cls: 0, longTasks: [] };
  window.__metrics = m;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.name === 'first-contentful-paint') m.fcp = e.startTime;
  }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) m.lcp = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) m.cls += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) m.longTasks.push([e.startTime, e.duration]);
  }).observe({ type: 'longtask', buffered: true });
};

async function measure(browser, route) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
    hasTouch: true,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(e.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 562.5,
    downloadThroughput: (1474.4 * 1024) / 8,
    uploadThroughput: (675 * 1024) / 8,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.addInitScript(OBSERVE);
  await page.goto(BASE + route, { waitUntil: 'load' });
  // Lo que llega después de cargar (la hidratación, los datos «de hoy»): unos segundos más.
  await page.waitForTimeout(5000);
  const m = await page.evaluate(() => window.__metrics);
  const images = await page.evaluate(() =>
    [...document.images].map((img) => {
      const shown = img.getBoundingClientRect();
      const natural = img.naturalWidth / Math.max(1, img.naturalHeight);
      const rendered = shown.width / Math.max(1, shown.height);
      return {
        src: img.currentSrc,
        loaded: img.complete && img.naturalWidth > 0,
        ratioOk: shown.width === 0 || Math.abs(natural - rendered) / natural < 0.05,
      };
    }),
  );
  await context.close();
  const tbt = m.longTasks
    .filter(([start]) => start >= m.fcp)
    .reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0);
  return {
    fcp: m.fcp,
    lcp: m.lcp,
    cls: m.cls,
    tbt,
    longest: Math.max(0, ...m.longTasks.map(([, d]) => d)),
    errors,
    imagesOk: images.every((i) => (i.loaded || i.src === '') && i.ratioOk),
  };
}

const server = await startServer(PORT);
const browser = await chromium.launch();
const rows = [];
try {
  for (const route of ROUTES) {
    const runs = [];
    for (let k = 0; k < RUNS; k++) runs.push(await measure(browser, route));
    const r = {
      fcp: median(runs.map((x) => x.fcp)),
      lcp: median(runs.map((x) => x.lcp)),
      cls: median(runs.map((x) => x.cls)),
      tbt: median(runs.map((x) => x.tbt)),
      longest: median(runs.map((x) => x.longest)),
    };
    r.si = r.lcp;
    const total = Object.entries(CURVES).reduce(
      (sum, [key, curve]) => sum + curve.weight * score(curve, r[key]),
      0,
    );
    const errors = [...new Set(runs.flatMap((x) => x.errors))];
    rows.push({
      route,
      ...r,
      score: Math.round(total * 100),
      errors,
      imagesOk: runs.every((x) => x.imagesOk),
    });
  }
} finally {
  await browser.close();
  server.close();
}

console.log(
  '| Página | FCP | LCP | CLS | TBT | Tarea más larga | Nota estimada | Errores de consola | Imágenes |',
);
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of rows) {
  console.log(
    `| ${r.route} | ${(r.fcp / 1000).toFixed(2)} s | ${(r.lcp / 1000).toFixed(2)} s | ${r.cls.toFixed(3)} | ${Math.round(r.tbt)} ms | ${Math.round(r.longest)} ms | ${r.score} | ${r.errors.length} | ${r.imagesOk ? 'bien' : 'mal'} |`,
  );
}
for (const r of rows.filter((x) => x.errors.length))
  console.log(`${r.route}: ${r.errors.join(' · ')}`);
