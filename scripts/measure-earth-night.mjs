// La Tierra de noche (fase 9b, D40): el suelo sin luces de la cara nocturna, en CIELAB (L* y C*), y el
// tono de las luces, medidos en el lienzo (`engine.capture()`, sin la interfaz):
// - «Las luces de la noche» (la vista guiada de la Tierra, en escritorio y en el móvil): dentro de 0,85
//   radios del centro del disco (sin el limbo), las luces son el 2 % de los píxeles más brillantes y el
//   suelo, el 80 % más oscuro;
// - la vista general el 19-05-2026, con la Tierra entre la cámara y el Sol (su cara nocturna hacia la
//   cámara, delante del Sol), y el 08-04-2026, de lado: su disco frente al fondo que lo rodea, para ver
//   que se sigue leyendo como un disco.
// Uso: npm run build && node scripts/measure-earth-night.mjs
import sharp from 'sharp';
import { openBrowser, openViewer, waitForIdle } from './capture-lib.mjs';

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const TABLE = Float64Array.from({ length: 256 }, (_, c) => toLinear(c));

/** CIELAB (D65) de un color en RGB lineal (sRGB), como en compare-io.mjs. */
function cielab([r, g, b]) {
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const t = (v) => (v > 216 / 24389 ? Math.cbrt(v) : ((24389 / 27) * v + 16) / 116);
  const [fx, fy, fz] = [t(x), t(y), t(z)];
  const a = 500 * (fx - fy);
  const bb = 200 * (fy - fz);
  return {
    L: 116 * fy - 16,
    a,
    b: bb,
    c: Math.hypot(a, bb),
    h: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360,
  };
}

/** Los píxeles del lienzo (PNG) y el disco de la Tierra en ellos (centro y radio en píxeles). */
async function canvasAndEarth(page) {
  const { base64, earth, dpr } = await page.evaluate(async () => {
    const engine = window.__tlsViewer.engine;
    const blob = await engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    const index = engine.system.layout.indexOf('tierra');
    const body = engine.screen.find((b) => b.index === index);
    return {
      base64: btoa(binary),
      earth: body ? { x: body.x, y: body.y, r: body.radiusPx } : null,
      dpr: window.devicePixelRatio,
    };
  });
  const png = Buffer.from(base64, 'base64');
  const image = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  if (!earth) throw new Error('No encuentro la Tierra en la pantalla.');
  return { image, earth: { x: earth.x * dpr, y: earth.y * dpr, r: earth.r * dpr } };
}

/** Los colores (RGB lineal) de los píxeles entre `from` y `to` radios del centro de un disco. */
function ring({ data, info }, { x, y, r }, from, to) {
  const out = [];
  const x0 = Math.max(0, Math.floor(x - to * r));
  const x1 = Math.min(info.width - 1, Math.ceil(x + to * r));
  const y0 = Math.max(0, Math.floor(y - to * r));
  const y1 = Math.min(info.height - 1, Math.ceil(y + to * r));
  for (let j = y0; j <= y1; j++) {
    for (let i = x0; i <= x1; i++) {
      const d = Math.hypot(i + 0.5 - x, j + 0.5 - y) / r;
      if (d < from || d > to) continue;
      const k = (j * info.width + i) * info.channels;
      out.push([TABLE[data[k]], TABLE[data[k + 1]], TABLE[data[k + 2]]]);
    }
  }
  return out;
}

const luminance = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const mean = (colors) =>
  colors
    .reduce((s, c) => [s[0] + c[0], s[1] + c[1], s[2] + c[2]], [0, 0, 0])
    .map((v) => v / colors.length);
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.floor(p * (values.length - 1))];
const f = (v, d = 1) => v.toFixed(d).replace('.', ',');

const DESKTOP = { width: 1600, height: 900, scale: 1 };
const MOBILE = { width: 390, height: 844, scale: 2, mobile: true };
const lights = async (page) => {
  await page.getByRole('button', { name: 'Las luces de la noche', exact: true }).click();
};

const { browser, close } = await openBrowser();
try {
  for (const [name, size] of [
    ['«Las luces de la noche», escritorio', DESKTOP],
    ['«Las luces de la noche», móvil', MOBILE],
  ]) {
    const { page } = await openViewer(browser, '/explorar/tierra?captura=1', size);
    await lights(page);
    await page.waitForTimeout(800);
    await waitForIdle(page).catch(() => undefined);
    const { image, earth } = await canvasAndEarth(page);
    const colors = ring(image, earth, 0, 0.85);
    const sorted = [...colors].sort((a, b) => luminance(a) - luminance(b));
    const ground = sorted.slice(0, Math.floor(0.8 * sorted.length)).map(cielab);
    const bright = sorted.slice(Math.floor(0.98 * sorted.length));
    const lightLab = cielab(mean(bright));
    const groundMean = cielab(mean(sorted.slice(0, Math.floor(0.8 * sorted.length))));
    console.log(
      `${name}: suelo sin luces (el 80 % más oscuro de ${colors.length} px): L* medio ${f(groundMean.L)} (percentil 95, ${f(
        percentile(
          ground.map((c) => c.L),
          0.95,
        ),
      )}) · C* medio ${f(groundMean.c)} (percentil 95, ${f(
        percentile(
          ground.map((c) => c.c),
          0.95,
        ),
      )}) · luces (el 2 % más brillante): L* ${f(lightLab.L)}, C* ${f(lightLab.c)}, h ${f(lightLab.h, 0)}°`,
    );
    await page.close();
  }
  // La vista general con la Tierra de noche: su disco frente al fondo de alrededor (el 19-05, delante
  // del Sol y de su halo; el 08-04, de lado, casi toda su cara nocturna hacia la cámara).
  for (const date of ['2026-05-19', '2026-04-08']) {
    const { page } = await openViewer(browser, `/?captura=1&fecha=${date}T00:00Z`, DESKTOP);
    const { image, earth } = await canvasAndEarth(page);
    const disc = cielab(mean(ring(image, earth, 0, 0.8)));
    const around = cielab(mean(ring(image, earth, 1.6, 2.4)));
    console.log(
      `Vista general, la Tierra de noche (${date}; ${f(earth.r)} px de radio): su disco, L* ${f(disc.L)} y C* ${f(disc.c)}; alrededor, L* ${f(around.L)} (contraste ΔL* ${f(disc.L - around.L)})`,
    );
    await page.close();
  }
} finally {
  await close();
}
