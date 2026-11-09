// La Tierra al entrar directo en su vista (revisión del bloque S, S2: «la Tierra entra como una bola
// azul lisa»; a los 9 s seguía así y a los 17 s ya tenía su mapa): con la red móvil de §5 (la de
// `measure-pages.mjs`, la «4G lenta» de Lighthouse), en un móvil, capturas a los 2, 5, 10, 15, 20 y
// 30 s de la navegación y, en cada una, si se ve ya el 3D (o aún el póster) y cuánto mapa de día tiene
// el centro del disco (`detail`). En pausa, con una fecha fija (África de día), para que el giro no
// cambie la medida. Con `--cpu4`, también la CPU ×4 (la de Lighthouse).
// Uso: npm run build && node scripts/capture-earth-entry.mjs <antes|despues> [--cpu4]
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser } from './capture-lib.mjs';

const stage = process.argv[2];
if (stage !== 'antes' && stage !== 'despues') {
  throw new Error('Uso: node scripts/capture-earth-entry.mjs <antes|despues>');
}
const dir = new URL('../docs/informes/img/fase-10/', import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(`${stage}-${name}.webp`, dir));
const TIMES_S = [2, 5, 10, 15, 20, 30];
/**
 * Con `--serie`, en lugar de las capturas, una medida por segundo desde que se va el póster durante
 * 20 s: cuánto tiempo se ve la Tierra azul (el 3D sin su mapa de día: menos de `SMOOTH` % de tierra).
 */
const series = process.argv.includes('--serie');
/**
 * Con `--repetida`, una visita repetida, como la de la revisión: primero la portada sin limitar la red
 * (el código y las texturas de la vista general, en la caché del navegador) y después la vista Tierra
 * con la red lenta. Así el 3D llega enseguida y lo que tarda es la textura grande.
 */
const repeat = process.argv.includes('--repetida');
/**
 * Con `--8k-lenta`, sin limitar la red: el código llega enseguida y las texturas tardan más, las de 1k
 * `SLOW_1K_MS` y las de 8K `SLOW_8K_MS`: el caso de S2 (el 3D listo, la 1k de la vista general aún en
 * camino al enfocar la Tierra y la grande, después), sin depender de la red.
 */
const slow8k = process.argv.includes('--8k-lenta');
const SLOW_1K_MS = 4000;
const SLOW_8K_MS = 12_000;
/** Con `--escritorio`, en un escritorio (1440 × 900, calidad alta: la 8K) en lugar de un móvil. */
const desktop = process.argv.includes('--escritorio');
const SMOOTH = 1;
const cpu4 = process.argv.includes('--cpu4');

/**
 * Cuánto mapa de día tiene la Tierra en el centro del lienzo: la parte de los píxeles con color de
 * tierra (el rojo por encima del azul: el desierto, la sabana, el bosque). Sin el mapa de día, la
 * Tierra es azul, con las nubes y el contorno de los continentes del mapa del océano (S2): casi 0.
 */
async function detail(png) {
  const { data, info } = await sharp(png)
    .extract(
      desktop
        ? { left: 420, top: 150, width: 600, height: 600 }
        : { left: 56, top: 200, width: 300, height: 300 },
    )
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let land = 0;
  const n = info.width * info.height;
  for (let k = 0; k < n; k++) {
    if (data[3 * k] > data[3 * k + 2] + 8) land++;
  }
  return (100 * land) / n;
}

const { browser, close } = await openBrowser(process.argv);
try {
  const context = await browser.newContext({
    viewport: desktop ? { width: 1440, height: 900 } : { width: 412, height: 823 },
    deviceScaleFactor: 1,
    isMobile: !desktop,
    hasTouch: !desktop,
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
  });
  // El recorrido de la primera vez no arranca fuera de la portada; las pistas, vistas.
  await context.addInitScript(() => {
    localStorage.setItem('tls.recorrido', 'visto');
    localStorage.setItem('tls.pistas', 'visto');
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  if (repeat) {
    await page.goto(`${BASE}/`, { waitUntil: 'load' });
    await page.waitForTimeout(8000);
  } else {
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  }
  if (slow8k) {
    for (const [pattern, delay] of [
      ['**/textures/1k/**', SLOW_1K_MS],
      ['**/textures/8k/**', SLOW_8K_MS],
    ]) {
      await page.route(pattern, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        await route.continue();
      });
    }
  } else {
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 562.5,
      downloadThroughput: (1474.4 * 1024) / 8,
      uploadThroughput: (675 * 1024) / 8,
    });
  }
  if (cpu4) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  const start = Date.now();
  await page.goto(`${BASE}/explorar/tierra?fecha=2026-11-09T12:00Z`, { waitUntil: 'commit' });
  if (series) {
    // El póster llega con el HTML prerenderizado y se va cuando el 3D ha pintado.
    await page.waitForSelector('tls-viewer-poster', { state: 'attached', timeout: 60_000 });
    await page.waitForSelector('tls-viewer-poster', { state: 'detached', timeout: 120_000 });
    const shown = (Date.now() - start) / 1000;
    const smooth = [];
    const values = [];
    for (let k = 0; k <= 20; k++) {
      await page.waitForTimeout(Math.max(0, start + (shown + k) * 1000 - Date.now()));
      const png = await page.screenshot();
      const value = await detail(png);
      values.push(value.toFixed(1));
      if (value < SMOOTH) smooth.push(k);
      if ([0, 2, 5, 10].includes(k)) {
        await sharp(png)
          .webp({ quality: 85 })
          .toFile(file(`tierra-entrada-serie-${k}s`));
      }
    }
    console.log(values.join(' '));
    console.log(
      `${stage}${cpu4 ? ' (CPU ×4)' : ''}${repeat ? ' (visita repetida)' : ''}${slow8k ? ' (la 1k, 4 s más lenta, y la 8K, 12 s)' : ''}${desktop ? ' (escritorio)' : ''}: el 3D, a los ${shown.toFixed(1)} s; la Tierra azul (sin su mapa) en ${smooth.length} de las 21 medidas (segundos ${smooth.join(', ') || 'ninguno'})`,
    );
    await context.close();
    await close();
    process.exit(0);
  }
  for (const t of TIMES_S) {
    await page.waitForTimeout(Math.max(0, start + t * 1000 - Date.now()));
    const png = await page.screenshot();
    const scene = await page.evaluate(() => !document.querySelector('tls-viewer-poster'));
    await sharp(png)
      .webp({ quality: 85 })
      .toFile(file(`tierra-entrada${cpu4 ? '-cpu4' : ''}-${t}s`));
    console.log(
      `${stage}${cpu4 ? ' (CPU ×4)' : ''}, a los ${t} s: ${scene ? 'el 3D' : 'el póster'}, tierra en el ${(await detail(png)).toFixed(1)} % del centro`,
    );
  }
  await context.close();
} finally {
  await close();
}
