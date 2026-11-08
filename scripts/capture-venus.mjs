// Venus «Bajo las nubes» (fase 9b, entrega 9b.e, D44): capturas y medidas.
//
// - Capturas (con la interfaz), en escritorio y móvil, de Venus enfocada con sus nubes y con el radar
//   de Magellan (`?radar=1`), en una fecha con Maat Mons hacia la cámara y de día; y la del lienzo solo
//   con el radar, con Maat Mons señalado donde dice el Gazetteer (proyectado con la cámara de la
//   escena), para ver que cae en su sitio.
// - Con `--medir`, §5 en los tres niveles: la VRAM y las llamadas de dibujo con Venus enfocada, con
//   las nubes y con el radar; los FPS durante la reproducción con el radar; y la memoria tras encenderlo
//   y apagarlo 10 veces y dejar Venus (la textura del radar se suelta: la VRAM vuelve a la de antes).
//
// Con `--buscar`, solo busca la fecha: recorre un año en la página (cada 2 días) y dice en cuáles Maat
// Mons queda más de frente a la cámara, de día.
//
// Uso: npm run build && node scripts/capture-venus.mjs docs/informes/img/fase-9b [--medir] [--solo=…]
//      node scripts/capture-venus.mjs <carpeta> --buscar
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { BASE, openBrowser, openViewer, rendererName, stats, waitForIdle } from './capture-lib.mjs';

const out = process.argv[2];
if (!out || out.startsWith('--')) {
  throw new Error('Uso: node scripts/capture-venus.mjs <carpeta de salida> [--medir] [--solo=…]');
}
const measure = process.argv.includes('--medir');
const search = process.argv.includes('--buscar');
const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length);
const wanted = only ? new Set(only.split(',')) : null;
const dir = new URL(`../${out.replace(/\/?$/, '/')}`, import.meta.url);
await mkdir(dir, { recursive: true });
const file = (name) => fileURLToPath(new URL(name, dir));

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
/**
 * Una fecha con Maat Mons (0,5° N, 194,6° E) hacia la cámara del primer plano de Venus y de día: el
 * encuadre de un cuerpo enfocado mira su cara iluminada, y Venus gira tan despacio (243 días) que su
 * cara cambia poco de un día a otro. Elegida con `--buscar` (abajo).
 */
const DATE = process.env.VENUS_DATE ?? '2026-11-05T00:00Z';
/** Maat Mons en el Gazetteer de la IAU (Feature/3550): latitud y longitud este. */
const MAAT_MONS = { latDeg: 0.5, lonDeg: 194.6 };

const venus = (query = '') => `/?captura=1&cuerpo=venus&fecha=${DATE}${query}`;
/** En el móvil, la ficha no se abre sola al elegir (fase 9c): se abre con «ⓘ», arriba. */
const openSheet = async (page) => {
  await page.getByRole('button', { name: 'Ver la ficha de Venus' }).tap();
  await page.locator('#card-radar-note').waitFor();
  await waitForIdle(page);
};
/** [nombre, ruta, tamaño, acción tras cargar]. */
const SHOTS = [
  ['venus-escritorio-nubes', venus(), DESKTOP],
  ['venus-escritorio-radar', venus('&radar=1'), DESKTOP],
  ['venus-movil-nubes', venus(), MOBILE, openSheet],
  ['venus-movil-radar', venus('&radar=1'), MOBILE, openSheet],
];

/** Espera a que el radar esté a la vista (en captura, sin fundido) y a que el motor repose. */
async function waitForRadar(page, state = 'on') {
  await page.waitForFunction(
    (expected) => window.__tlsViewer?.engine?.venusRadarState === expected,
    state,
    { timeout: 60_000 },
  );
  await waitForIdle(page);
}

/** La imagen del lienzo (PNG) del motor, sin la interfaz. */
const canvasPng = async (page) =>
  Buffer.from(
    await page.evaluate(async () => {
      const blob = await window.__tlsViewer.engine.capture();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      }
      return btoa(binary);
    }),
    'base64',
  );

/**
 * Dónde cae Maat Mons en el lienzo: el punto de la superficie de Venus a esa latitud y longitud, con la
 * orientación de su malla en la escena (Y, el polo; la longitud este hacia −Z), proyectado con la cámara.
 * `null` si está en la cara de atrás.
 */
const projectFeature = (page, { latDeg, lonDeg }) =>
  page.evaluate(
    ({ latDeg, lonDeg }) => {
      const engine = window.__tlsViewer.engine;
      const world = engine.world;
      const mesh = world.visuals.find((visual) => visual.body.id === 'venus').mesh;
      const camera = world.camera;
      const lat = (latDeg * Math.PI) / 180;
      const lon = (lonDeg * Math.PI) / 180;
      const local = mesh.position
        .clone()
        .set(Math.cos(lat) * Math.cos(lon), Math.sin(lat), -Math.cos(lat) * Math.sin(lon));
      mesh.updateMatrixWorld();
      camera.updateMatrixWorld();
      const point = local.clone().applyMatrix4(mesh.matrixWorld);
      const center = mesh.position.clone().setFromMatrixPosition(mesh.matrixWorld);
      const normal = point.clone().sub(center).normalize();
      const toCamera = camera.position.clone().sub(point).normalize();
      if (normal.dot(toCamera) <= 0) return null;
      const sun = world.visuals.find((visual) => visual.body.id === 'sol').mesh;
      const toSun = sun.position.clone().sub(center).normalize();
      const ndc = point.clone().project(camera);
      const canvas = document.querySelector('tls-viewer-canvas canvas');
      return {
        x: ((ndc.x + 1) / 2) * canvas.width,
        y: ((1 - ndc.y) / 2) * canvas.height,
        facing: normal.dot(toCamera),
        sunlit: normal.dot(toSun),
      };
    },
    { latDeg, lonDeg },
  );

const { browser, close } = await openBrowser();
const report = { gpu: null, fecha: DATE, capturas: {}, maatMons: null, medidas: null };
try {
  if (search) {
    const { page } = await openViewer(browser, venus(), DESKTOP);
    const found = [];
    const start = Date.parse('2026-01-01T00:00Z');
    for (let day = 0; day < 365; day += 2) {
      const iso = new Date(start + day * 86_400_000).toISOString();
      await page.evaluate((time) => window.__tlsViewer.engine.setTime(new Date(time)), iso);
      await page.waitForTimeout(80);
      const at = await projectFeature(page, MAAT_MONS);
      if (at && at.sunlit > 0.3) found.push({ fecha: iso, ...at });
    }
    found.sort((a, b) => b.facing + b.sunlit - (a.facing + a.sunlit));
    console.log(JSON.stringify(found.slice(0, 8), null, 2));
    await page.close();
  }
  for (const [name, path, size, action] of search ? [] : SHOTS) {
    if (wanted && !wanted.has(name)) continue;
    const { page, problems } = await openViewer(browser, path, size);
    if (path.includes('radar=1')) await waitForRadar(page);
    if (action) await action(page);
    report.gpu ??= await rendererName(page);
    await sharp(await page.screenshot())
      .webp({ quality: 82 })
      .toFile(file(`${name}.webp`));
    const { vramMB, drawCalls } = await stats(page);
    report.capturas[name] = {
      problemas: problems,
      vramMB: Math.round(vramMB),
      llamadas: drawCalls,
      radar: await page.evaluate(() => window.__tlsViewer.engine.venusRadarState),
    };
    // El lienzo solo, con el radar y Maat Mons señalado (escritorio).
    if (name === 'venus-escritorio-radar') {
      const png = await canvasPng(page);
      const meta = await sharp(png).metadata();
      const at = await projectFeature(page, MAAT_MONS);
      report.maatMons = at;
      const marks = at
        ? `<circle cx="${at.x}" cy="${at.y}" r="${Math.round(meta.width / 60)}" fill="none" stroke="#ffcc33" stroke-width="3"/>`
        : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${meta.width}" height="${meta.height}">${marks}</svg>`;
      await sharp(png)
        .composite([{ input: Buffer.from(svg) }])
        .webp({ quality: 85 })
        .toFile(file('venus-radar-maat-mons.webp'));
    }
    await page.close();
  }

  if (measure && !search) {
    report.medidas = {};
    for (const quality of ['alta', 'media', 'baja']) {
      const page = await browser.newPage({
        locale: 'es-ES',
        timezoneId: 'Europe/Madrid',
        viewport: { width: 1600, height: 900 },
      });
      await page.goto(`${BASE}${venus(`&calidad=${quality}`)}`);
      await page.waitForFunction(() => window.__tlsViewer?.ready === true, null, {
        timeout: 90_000,
      });
      await waitForIdle(page);
      const clouds = await stats(page);
      await page.evaluate(() => window.__tlsViewer.engine.setVenusRadar(true));
      await waitForRadar(page);
      const radar = await stats(page);
      // FPS: 4 s de reproducción a 1 día/s con el radar (tras 1 s de arranque).
      const playback = await page.evaluate(async () => {
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
          cpuMsPorFrame: Number(samples.at(-1).frameMs.toFixed(2)),
        };
      });
      // Memoria: 10 veces encendido y apagado, y después otro cuerpo.
      for (let k = 0; k < 10; k++) {
        await page.evaluate(() => window.__tlsViewer.engine.setVenusRadar(false));
        await waitForRadar(page, 'off');
        await page.evaluate(() => window.__tlsViewer.engine.setVenusRadar(true));
        await waitForRadar(page);
      }
      const afterToggles = await stats(page);
      // Apagado: la textura del radar se suelta y la VRAM vuelve a la de las nubes.
      await page.evaluate(() => window.__tlsViewer.engine.setVenusRadar(false));
      await waitForRadar(page, 'off');
      const off = await stats(page);
      await page.evaluate(() => {
        const engine = window.__tlsViewer.engine;
        engine.focus('marte');
        engine.skipTransition();
      });
      await waitForIdle(page);
      const left = await stats(page);
      const heapMB = await page.evaluate(() =>
        performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1_048_576) : null,
      );
      report.medidas[quality] = {
        nubes: { vramMB: Math.round(clouds.vramMB), llamadas: clouds.drawCalls },
        radar: {
          vramMB: Math.round(radar.vramMB),
          llamadas: radar.drawCalls,
          texturas: radar.textures,
          ...playback,
        },
        tras10vueltas: {
          vramMB: Math.round(afterToggles.vramMB),
          texturas: afterToggles.textures,
        },
        apagado: { vramMB: Math.round(off.vramMB), texturas: off.textures },
        trasDejarVenus: {
          vramMB: Math.round(left.vramMB),
          texturas: left.textures,
          estado: await page.evaluate(() => window.__tlsViewer.engine.venusRadarState),
          heapMB,
        },
      };
      await page.close();
    }
  }
} finally {
  await close();
}
console.log(JSON.stringify(report, null, 2));
