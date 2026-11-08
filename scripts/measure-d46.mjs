// D46 (fase 9b, entrega 9b.f): el Sol y la Tierra del explorador frente a la referencia
// (earth.ethanplus.ai/solar.html; capturas propias en assets-src/referencias/, solo para medir: no se
// copia nada ni entra en el repo). Lo mismo en las dos: lo que se compara se mide igual
// (scripts/lib/disc-metrics.mjs).
// - El Sol de cerca: el tono (h) y el croma (C*) del centro (μ > 0,9) y del borde (μ de 0,15 a 0,35) y el
//   contraste a gran escala de su superficie (la desviación típica de L* sin el perfil del limbo).
// - El Sol en la vista general (segunda vuelta, 08-11: «el disco naranja y sin lavar»): lo mismo del
//   disco y su resplandor, la mediana de L* a 1,5, 2 y 3 radios del centro, con la del fondo (6).
// - La Tierra de día con África y Europa: cada píxel, a su latitud y su longitud (la referencia, con la
//   ortográfica inversa desde su punto central; la nuestra, con el rayo contra la malla de la escena);
//   los océanos (el Atlántico sur y el Índico: el agua de la máscara, sin el 50 % más claro, que
//   puede ser nube o reflejo), la fracción del disco cubierta por nubes (L* ≥ 70 y C* ≤ 12, sin el
//   reflejo), el Sáhara, el Sahel y el Amazonas oriental (la tierra de la máscara, su mediana) y el
//   máximo del reflejo del Sol en el agua.
// Uso: npm run build && node scripts/measure-d46.mjs [--solo-referencia] [--solo=sol|tierra]
// (`--solo=sol`, solo el Sol; `--solo=tierra`, solo la Tierra: cada sesión mide lo suyo.)
// (Sus funciones, `render` y `earthMetrics`, sirven también para calibrar cambiando los uniformes en la
// página: así no hay que rehacer el build por cada prueba.)
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';
import { cielab, srgbToLinear } from './lib/color.mjs';
import { overviewSunMetrics, sunMetrics } from './lib/disc-metrics.mjs';

const ROOT = new URL('../', import.meta.url);
const REF = new URL('assets-src/referencias/', ROOT);
const onlyReference = process.argv.includes('--solo-referencia');
/** `--solo=sol` o `--solo=tierra`: solo esa parte (la referencia y lo nuestro). */
const only = process.argv.find((arg) => arg.startsWith('--solo='))?.slice('--solo='.length) ?? null;
const wants = (part) => !only || only === part;
const D = Math.PI / 180;

const meta = JSON.parse(await readFile(new URL('capturas-referencia.json', REF), 'utf8')).capturas;

// --- La máscara del agua (la especular de la Tierra, 1k: blanca en el agua) -----------------------
const maskDir = fileURLToPath(new URL('public/textures/1k/', ROOT));
const maskName = (await readdir(maskDir)).find((name) => name.startsWith('earth-specular.'));
const mask = await sharp(await readFile(join(maskDir, maskName)))
  .toColourspace('b-w')
  .raw()
  .toBuffer({ resolveWithObject: true });
/** 1: agua; 0: tierra; `null`: costa (a menos de 2 px de la otra). */
function surface(lat, lon) {
  const W = mask.info.width;
  const H = mask.info.height;
  const sx = Math.floor(((lon + 180) / 360) * W);
  const sy = Math.floor(((90 - lat) / 180) * H);
  let water = 0;
  for (let j = -2; j <= 2; j++) {
    for (let i = -2; i <= 2; i++) {
      const x = (((sx + i) % W) + W) % W;
      const y = Math.min(H - 1, Math.max(0, sy + j));
      if (mask.data[y * W + x] >= 128) water++;
    }
  }
  return water === 25 ? 1 : water === 0 ? 0 : null;
}

/** Las regiones: [lat. mín., lat. máx., lon. mín., lon. máx.] y si son agua o tierra. */
const REGIONS = {
  'Atlántico sur': { box: [-30, -10, -15, 5], water: true },
  Índico: { box: [-25, -5, 45, 60], water: true },
  Sáhara: { box: [18, 28, -5, 25], water: false },
  Sahel: { box: [11, 16, -10, 30], water: false },
  'Amazonas oriental': { box: [-10, -3, -52, -44], water: false },
};

const wrap = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

/** Las medidas de la Tierra de una imagen con `geo(x, y)` → { lat, lon, mu } (o `null` fuera). */
export function earthMetrics({ data, info }, geo) {
  const lab = (k) =>
    cielab([srgbToLinear(data[k]), srgbToLinear(data[k + 1]), srgbToLinear(data[k + 2])]);
  const regions = Object.fromEntries(Object.keys(REGIONS).map((name) => [name, []]));
  let disc = 0;
  let clouds = 0;
  let glintMax = 0;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const point = geo(x, y);
      if (!point || point.mu < 0.3) continue;
      const k = (y * info.width + x) * info.channels;
      const color = lab(k);
      const kind = surface(point.lat, point.lon);
      disc++;
      // El reflejo: agua muy clara y poco saturada; no cuenta como nube.
      const glint = kind === 1 && color.L >= 70 && color.c <= 25 && point.glint;
      if (glint) glintMax = Math.max(glintMax, Math.max(data[k], data[k + 1], data[k + 2]));
      else if (color.L >= 70 && color.c <= 12) clouds++;
      for (const [name, { box, water }] of Object.entries(REGIONS)) {
        const [lat0, lat1, lon0, lon1] = box;
        if (point.lat < lat0 || point.lat > lat1 || point.lon < lon0 || point.lon > lon1) continue;
        if (kind !== (water ? 1 : 0)) continue;
        regions[name].push(color);
      }
    }
  }
  const summary = {};
  for (const [name, list] of Object.entries(regions)) {
    if (list.length < 200) {
      summary[name] = null;
      continue;
    }
    // En el agua, sin el 50 % más claro (nubes y reflejo); en la tierra, todo.
    const sorted = [...list].sort((a, b) => a.L - b.L);
    const kept = REGIONS[name].water ? sorted.slice(0, Math.ceil(sorted.length / 2)) : sorted;
    const median = (key) => {
      const values = kept.map((c) => c[key]).sort((a, b) => a - b);
      return values[Math.floor(values.length / 2)];
    };
    const a = median('a');
    const b = median('b');
    summary[name] = {
      L: median('L'),
      c: Math.hypot(a, b),
      h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360,
      px: kept.length,
    };
  }
  return { regions: summary, cloudFraction: clouds / disc, glintMax };
}

/** La referencia en modo planeta: ortográfica inversa desde su punto central (norte arriba). */
function referenceGeo({ cx, cy, r }, lat0Deg, lon0Deg, glintCenter) {
  const lat0 = lat0Deg * D;
  return (x, y) => {
    const px = (x + 0.5 - cx) / r;
    const py = -(y + 0.5 - cy) / r;
    const rho = Math.hypot(px, py);
    if (rho >= 1) return null;
    const c = Math.asin(rho);
    const lat =
      rho === 0
        ? lat0Deg
        : Math.asin(Math.cos(c) * Math.sin(lat0) + (py * Math.sin(c) * Math.cos(lat0)) / rho) / D;
    const lon =
      rho === 0
        ? lon0Deg
        : lon0Deg +
          Math.atan2(
            px * Math.sin(c),
            rho * Math.cos(c) * Math.cos(lat0) - py * Math.sin(c) * Math.sin(lat0),
          ) /
            D;
    const glint = glintCenter
      ? Math.hypot(x - glintCenter[0], y - glintCenter[1]) < glintCenter[2]
      : false;
    return { lat, lon: wrap(lon), mu: Math.sqrt(1 - rho * rho), glint };
  };
}

export const show = (c) =>
  c ? `L* ${c.L.toFixed(1)} · C* ${c.c.toFixed(1)} · h ${c.h.toFixed(0)}°` : '—';

/**
 * El Sol en la vista general (D46, segunda vuelta: «el disco naranja y sin lavar»): el color del centro
 * y del borde y el resplandor (la mediana de L* a 1,5, 2 y 3 radios, y el fondo, a 6).
 */
const showOverview = (device, m) => {
  const glow = [1.5, 2, 3].map((rho) => `${m.glow[rho]?.L.toFixed(1) ?? '—'} a ${rho}`).join(', ');
  return `  y en la vista general (${device}): centro ${show(m.center.lab)}; borde ${show(m.limb.lab)}; el resplandor, L* ${glow} radios (el fondo, ${m.glow[6]?.L.toFixed(1) ?? '—'})`;
};

// --- La referencia ---------------------------------------------------------------------------------
async function measureReference() {
  console.log('Referencia (earth.ethanplus.ai, capturas del 06-11):');
  for (const device of wants('sol') ? ['escritorio', 'movil'] : []) {
    const name = `ref-sol-cerca-${device}`;
    const image = await sharp(fileURLToPath(new URL(`${name}-limpia.png`, REF)))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const m = sunMetrics(image, meta[`${name}.png`].disco);
    console.log(
      `- el Sol de cerca (${device}): centro ${show(m.center.lab)}; borde ${show(m.limb.lab)}; contraste σL* ${m.contrast.toFixed(2)}`,
    );
    const overview = `ref-sol-sistema-${device}`;
    const wide = await sharp(fileURLToPath(new URL(`${overview}-limpia.png`, REF)))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    console.log(showOverview(device, overviewSunMetrics(wide, meta[`${overview}.png`].disco)));
  }
  for (const device of wants('tierra') ? ['escritorio', 'movil'] : []) {
    const name = `ref-planeta-africa-${device}`;
    const entry = meta[`${name}.png`];
    const [lat, lon] = entry.estado.coordenadas
      .match(/([\d.]+)° ([NS]) ([\d.]+)° ([EW])/)
      .slice(1)
      .reduce((acc, v, i, all) => {
        if (i === 0) acc.push(Number(all[0]) * (all[1] === 'S' ? -1 : 1));
        if (i === 2) acc.push(Number(all[2]) * (all[3] === 'W' ? -1 : 1));
        return acc;
      }, []);
    const image = await sharp(fileURLToPath(new URL(`${name}.png`, REF)))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const m = earthMetrics(image, referenceGeo(entry.disco, lat, lon, null));
    console.log(
      `- la Tierra con África (${device}, centro ${lat}°, ${lon}°): ${Object.entries(m.regions)
        .map(([k, v]) => `${k} ${show(v)}`)
        .join('; ')}; nubes, el ${(100 * m.cloudFraction).toFixed(1)} % del disco`,
    );
  }
}

// --- Lo nuestro (el build de la rama) ----------------------------------------------------------
export const DESKTOP = { width: 1600, height: 900, scale: 1 };
export const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
/** La fecha de las capturas de la referencia (2026-01-15, 00:00 UTC). */
export const DATE = '2026-01-15T00:00Z';
/** El cono del reflejo: el semivector entre la luz y la vista, a menos de este ángulo de la normal. */
const GLINT_DEG = 15;

/**
 * El lienzo (sin la interfaz) y, si se pide (`earth`), la latitud, la longitud, μ y el reflejo de cada
 * píxel de la Tierra: el rayo de cada píxel, en el sistema de su malla (la esfera unidad, con el polo
 * en Y, el meridiano 0 en +X y la longitud este hacia −Z), contra la esfera, como en
 * `measure-earth-epic.mjs`. Y el disco del Sol del motor (`sun`).
 */
export async function render(page, { earth = false, sun = false } = {}) {
  const result = await page.evaluate(
    async ({ withEarth, withSun, glintCos }) => {
      const engine = window.__tlsViewer.engine;
      const blob = await engine.capture();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const encode = (array) => {
        let binary = '';
        for (let i = 0; i < array.length; i += 0x8000) {
          binary += String.fromCharCode(...array.subarray(i, i + 0x8000));
        }
        return btoa(binary);
      };
      const canvas = document.querySelector('canvas');
      const width = canvas.width;
      const height = canvas.height;
      let disc = null;
      if (withSun) {
        const index = engine.system.layout.indexOf('sol');
        const screen = engine.screen.find((b) => b.index === index);
        const dpr = window.devicePixelRatio;
        disc = { cx: screen.x * dpr, cy: screen.y * dpr, r: screen.radiusPx * dpr };
      }
      let geo = null;
      if (withEarth) {
        const { camera, scene } = engine.world;
        const body = scene.getObjectByName('tierra');
        const star = scene.getObjectByName('sol');
        camera.updateMatrixWorld();
        body.updateMatrixWorld();
        star.updateMatrixWorld();
        const toLocal = body.matrixWorld.clone().invert();
        const origin = camera.position.clone().applyMatrix4(toLocal);
        const sunLocal = star.getWorldPosition(camera.position.clone()).applyMatrix4(toLocal);
        const point = camera.position.clone();
        // Por píxel: latitud, longitud, μ (la normal frente a la visual) y si cae en el reflejo.
        const out = new Float32Array(4 * width * height).fill(Number.NaN);
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            point.set(((x + 0.5) / width) * 2 - 1, 1 - ((y + 0.5) / height) * 2, 0.5);
            point.unproject(camera).applyMatrix4(toLocal);
            let dx = point.x - origin.x;
            let dy = point.y - origin.y;
            let dz = point.z - origin.z;
            const length = Math.hypot(dx, dy, dz);
            dx /= length;
            dy /= length;
            dz /= length;
            const b = origin.x * dx + origin.y * dy + origin.z * dz;
            const c = origin.x ** 2 + origin.y ** 2 + origin.z ** 2 - 1;
            const d = b * b - c;
            if (d < 0) continue;
            const t = -b - Math.sqrt(d);
            if (t < 0) continue;
            const hx = origin.x + t * dx;
            const hy = origin.y + t * dy;
            const hz = origin.z + t * dz;
            // La luz y la vista, desde el punto; su semivector frente a la normal (el punto mismo).
            let lx = sunLocal.x - hx;
            let ly = sunLocal.y - hy;
            let lz = sunLocal.z - hz;
            const ll = Math.hypot(lx, ly, lz);
            lx /= ll;
            ly /= ll;
            lz /= ll;
            let sx = lx - dx;
            let sy = ly - dy;
            let sz = lz - dz;
            const sl = Math.hypot(sx, sy, sz);
            const k = 4 * (y * width + x);
            out[k] = (Math.asin(Math.max(-1, Math.min(1, hy))) * 180) / Math.PI;
            out[k + 1] = (Math.atan2(-hz, hx) * 180) / Math.PI;
            out[k + 2] = -(hx * dx + hy * dy + hz * dz);
            out[k + 3] = (hx * sx + hy * sy + hz * sz) / sl > glintCos ? 1 : 0;
          }
        }
        geo = encode(new Uint8Array(out.buffer));
      }
      return { png: encode(bytes), width, height, disc, geo };
    },
    { withEarth: earth, withSun: sun, glintCos: Math.cos(GLINT_DEG * D) },
  );
  const image = await sharp(Buffer.from(result.png, 'base64'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let geo = null;
  if (result.geo) {
    const buffer = Buffer.from(result.geo, 'base64');
    const map = new Float32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 4);
    geo = (x, y) => {
      const k = 4 * (y * result.width + x);
      return Number.isNaN(map[k])
        ? null
        : { lat: map[k], lon: map[k + 1], mu: map[k + 2], glint: map[k + 3] === 1 };
    };
  }
  return { image, disc: result.disc, geo };
}

/** Lo nuestro: el Sol de cerca y la Tierra completa, en escritorio y móvil. */
async function measureOurs() {
  console.log('\nLo nuestro (el build de la rama, el 15-01-2026):');
  const { browser, close } = await openBrowser();
  try {
    for (const [device, size] of [
      ['escritorio', DESKTOP],
      ['movil', MOBILE],
    ]) {
      // El Sol de cerca, en la vista limpia (sin paneles).
      if (wants('sol')) {
        const sunView = await openViewer(browser, `/?captura=1&cuerpo=sol&fecha=${DATE}`, size);
        await sunView.page.keyboard.press('v');
        await waitForIdle(sunView.page);
        const sunShot = await render(sunView.page, { sun: true });
        await sunView.page.close();
        const m = sunMetrics(sunShot.image, sunShot.disc);
        console.log(
          `- el Sol de cerca (${device}): centro ${show(m.center.lab)}; borde ${show(m.limb.lab)}; contraste σL* ${m.contrast.toFixed(2)}`,
        );
        if (sunView.problems.length) console.log(sunView.problems.join('\n'));
        // Y en la vista general, también en la vista limpia.
        const wideView = await openViewer(browser, `/?captura=1&fecha=${DATE}`, size);
        await wideView.page.keyboard.press('v');
        await waitForIdle(wideView.page);
        const wideShot = await render(wideView.page, { sun: true });
        await wideView.page.close();
        console.log(showOverview(device, overviewSunMetrics(wideShot.image, wideShot.disc)));
        if (wideView.problems.length) console.log(wideView.problems.join('\n'));
      }

      // La Tierra completa (la vista guiada: 15° N, 10° E, a mediodía), en la vista limpia.
      if (!wants('tierra')) continue;
      const earthView = await openViewer(browser, `/explorar/tierra?captura=1&fecha=${DATE}`, size);
      await earthView.page.getByRole('button', { name: 'La Tierra completa', exact: true }).click();
      await earthView.page.keyboard.press('v');
      await waitForIdle(earthView.page);
      const earthShot = await render(earthView.page, { earth: true });
      await earthView.page.close();
      const e = earthMetrics(earthShot.image, earthShot.geo);
      console.log(
        `- la Tierra completa (${device}): ${Object.entries(e.regions)
          .map(([k, v]) => `${k} ${show(v)}`)
          .join(
            '; ',
          )}; nubes, el ${(100 * e.cloudFraction).toFixed(1)} % del disco; el reflejo, máximo ${e.glintMax} de 255`,
      );
      if (earthView.problems.length) console.log(earthView.problems.join('\n'));
    }
  } finally {
    await close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await measureReference();
  if (!onlyReference) await measureOurs();
}
