// El Sol de la fase 9b (D41), medido en el lienzo (`engine.capture()`, sin la interfaz):
// - `limbo`: el oscurecimiento del limbo por canal con `?medida=limbo` (el Sol sin halo, corona, bloom,
//   granulación ni manchas, con todo su disco por debajo de la compresión del tone mapping neutro).
//   I(μ)/I(1) de R, G y B por intervalos de μ (el lineal de cada píxel: el sRGB decodificado más el
//   0,04 que resta el tone mapping neutro por debajo de su compresión) y el exponente α de cada canal
//   (pendiente de ln I frente a ln μ, de μ = 0,1 a 1), frente a la ley de Hestroffer y Magnan (1998):
//   0,426, 0,508 y 0,626 (`ephemeris/sun.ts`).
// - `disco`: el Sol de cerca tal como se ve (con su bloom): el centro y el borde en CIELAB (L*, C*, h),
//   el centro casi blanco y el borde dorado.
// - `totalidad`: el eclipse total del 12-08-2026 desde Fraga (la captura de cerca de la fase 8): el
//   disco de la Luna frente al cielo de alrededor (de 2 a 3 radios, con la corona) y frente al cielo
//   lejos de ella (las esquinas), en CIELAB; y el tono del cielo (h y C*), azul y no malva. Y la de
//   lejos: el cielo alto y el anillo del horizonte.
// Uso: npm run build && node scripts/measure-sun.mjs [limbo|disco|totalidad…]
import sharp from 'sharp';
import { openBrowser, openViewer } from './capture-lib.mjs';
import { cielab, srgbToLinear } from './lib/color.mjs';

const EXPECTED_ALPHA = {
  R: -0.023 + 0.292 / 0.65,
  G: -0.023 + 0.292 / 0.55,
  B: -0.023 + 0.292 / 0.45,
};
/** El tone mapping neutro de Khronos resta 0,04 por debajo de su compresión (si el canal menor ≥ 0,08). */
const NEUTRAL_OFFSET = 0.04;
/** El campo vertical de la cámara del espacio (`BASE_FOV_DEG`, `scene/engine.ts`). */
const FOV_DEG = 40;

const SQUARE = { width: 900, height: 900, scale: 1 };
const DESKTOP = { width: 1600, height: 900, scale: 1 };
const SUN_URL = '/?captura=1&cuerpo=sol&fecha=2024-05-10T00:00Z';
const FRAGA = '/cielo?captura=1&lugar=fraga&fecha=2026-08-12T18:29:29Z';

/** El lienzo (RGB de 8 bits) y, si se pide, el disco de un cuerpo del espacio (px reales). */
async function canvas(page, bodyId = null) {
  const { base64, body, dpr } = await page.evaluate(async (id) => {
    const engine = window.__tlsViewer.engine;
    const blob = await engine.capture();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    let disc = null;
    if (id) {
      const index = engine.system.layout.indexOf(id);
      const screen = engine.screen.find((b) => b.index === index);
      disc = screen ? { x: screen.x, y: screen.y, r: screen.radiusPx } : null;
    }
    return { base64: btoa(binary), body: disc, dpr: window.devicePixelRatio };
  }, bodyId);
  const image = await sharp(Buffer.from(base64, 'base64'))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    image,
    disc: body ? { x: body.x * dpr, y: body.y * dpr, r: body.r * dpr } : null,
  };
}

const pixel = ({ data, info }, i, j) => {
  const k = (j * info.width + i) * info.channels;
  return [data[k], data[k + 1], data[k + 2]];
};

/** Los píxeles (RGB lineal) a una distancia del centro entre `from` y `to` (en radios). */
function ring(image, { x, y, r }, from, to) {
  const { info } = image;
  const out = [];
  for (
    let j = Math.max(0, Math.floor(y - to * r));
    j <= Math.min(info.height - 1, y + to * r);
    j++
  ) {
    for (
      let i = Math.max(0, Math.floor(x - to * r));
      i <= Math.min(info.width - 1, x + to * r);
      i++
    ) {
      const d = Math.hypot(i + 0.5 - x, j + 0.5 - y) / r;
      if (d >= from && d < to) out.push(pixel(image, i, j).map(srgbToLinear));
    }
  }
  return out;
}

const mean = (colors) => {
  const sum = [0, 0, 0];
  for (const c of colors) for (let k = 0; k < 3; k++) sum[k] += c[k];
  return sum.map((s) => s / Math.max(colors.length, 1));
};
const fmt = (lab) => `L* ${lab.L.toFixed(1)} · C* ${lab.c.toFixed(1)} · h ${lab.h.toFixed(0)}°`;

/**
 * El borde del disco con precisión de subpíxel: por 720 radios desde el centro aproximado, donde el
 * brillo cruza la mitad entre el fondo y el último píxel del disco. Devuelve el centro y el radio
 * ajustados (mínimos cuadrados de un círculo a esos puntos).
 */
function fitDisc(image, guess) {
  const lum = (i, j) => {
    const [r, g, b] = pixel(image, i, j).map(srgbToLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const sample = (px, py) => {
    const i = Math.floor(px);
    const j = Math.floor(py);
    if (i < 0 || j < 0 || i + 1 >= image.info.width || j + 1 >= image.info.height) return 0;
    const fx = px - i;
    const fy = py - j;
    return (
      lum(i, j) * (1 - fx) * (1 - fy) +
      lum(i + 1, j) * fx * (1 - fy) +
      lum(i, j + 1) * (1 - fx) * fy +
      lum(i + 1, j + 1) * fx * fy
    );
  };
  const points = [];
  for (let k = 0; k < 720; k++) {
    const a = (k / 720) * 2 * Math.PI;
    const [dx, dy] = [Math.cos(a), Math.sin(a)];
    const inside = sample(guess.x + dx * guess.r * 0.97, guess.y + dy * guess.r * 0.97);
    const outside = sample(guess.x + dx * guess.r * 1.05, guess.y + dy * guess.r * 1.05);
    const half = (inside + outside) / 2;
    let previous = inside;
    for (let s = 0.97; s <= 1.05; s += 0.0005) {
      const value = sample(guess.x + dx * guess.r * s, guess.y + dy * guess.r * s);
      if (value <= half) {
        const t = (previous - half) / Math.max(previous - value, 1e-9);
        const radius = guess.r * (s - 0.0005 * (1 - t));
        points.push([guess.x + dx * radius, guess.y + dy * radius]);
        break;
      }
      previous = value;
    }
  }
  // Círculo de Kåsa: x² + y² + D·x + E·y + F = 0 por mínimos cuadrados.
  let [sxx, sxy, syy, sx, sy, n, sxz, syz, sz] = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const [px, py] of points) {
    const z = px * px + py * py;
    sxx += px * px;
    sxy += px * py;
    syy += py * py;
    sx += px;
    sy += py;
    n += 1;
    sxz += px * z;
    syz += py * z;
    sz += z;
  }
  const m = [
    [sxx, sxy, sx],
    [sxy, syy, sy],
    [sx, sy, n],
  ];
  const v = [-sxz, -syz, -sz];
  const det = (a) =>
    a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) -
    a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0]) +
    a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
  const d0 = det(m);
  const solve = (col) =>
    det(m.map((row, i) => row.map((value, j) => (j === col ? v[i] : value)))) / d0;
  const [D, E, F] = [solve(0), solve(1), solve(2)];
  const x = -D / 2;
  const y = -E / 2;
  return { x, y, r: Math.sqrt(x * x + y * y - F), points: points.length };
}

async function measureLimb(browser) {
  const { page, problems } = await openViewer(browser, `${SUN_URL}&medida=limbo`, SQUARE);
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  const { image, disc } = await canvas(page, 'sol');
  await page.close();
  // El disco del motor (la proyección exacta de la esfera) y, para comprobarlo, el ajustado en la
  // imagen: su borde a media altura cae algo por dentro, porque el limbo ya está oscuro.
  const fitted = fitDisc(image, disc);
  console.log(
    `\nLimbo (?medida=limbo): disco del motor (${disc.x.toFixed(1)}, ${disc.y.toFixed(1)}) r ${disc.r.toFixed(2)} px; ` +
      `borde a media altura en la imagen: (${fitted.x.toFixed(1)}, ${fitted.y.toFixed(1)}) r ${fitted.r.toFixed(2)} px`,
  );
  // μ en perspectiva: un píxel a θ del centro (tan θ = r / focal) ve la esfera con sen i = sen θ / sen θmáx.
  const focal = image.info.height / 2 / Math.tan((FOV_DEG * Math.PI) / 360);
  const sinMax = Math.sin(Math.atan(disc.r / focal));
  // Por intervalos de μ, el lineal de cada canal antes del tone mapping (sRGB decodificado + 0,04).
  const bins = new Map();
  const { info } = image;
  for (let j = 0; j < info.height; j++) {
    for (let i = 0; i < info.width; i++) {
      const rPx = Math.hypot(i + 0.5 - disc.x, j + 0.5 - disc.y);
      if (rPx / disc.r >= 0.995) continue;
      const s = Math.sin(Math.atan(rPx / focal)) / sinMax;
      const mu = Math.sqrt(Math.max(1 - s * s, 0));
      const linear = pixel(image, i, j).map((c) => srgbToLinear(c) + NEUTRAL_OFFSET);
      const key = Math.min(Math.floor(mu * 40), 39);
      const bin = bins.get(key) ?? { mu: 0, rgb: [0, 0, 0], n: 0 };
      bin.mu += mu;
      for (let k = 0; k < 3; k++) bin.rgb[k] += linear[k];
      bin.n += 1;
      bins.set(key, bin);
    }
  }
  const rows = [...bins.values()]
    .map((b) => ({ mu: b.mu / b.n, rgb: b.rgb.map((s) => s / b.n), n: b.n }))
    .sort((a, b) => a.mu - b.mu);
  const center = rows[rows.length - 1];
  const alphas = {};
  ['R', 'G', 'B'].forEach((name, k) => {
    // Pendiente de ln(I/I(1)) frente a ln μ, por mínimos cuadrados, de μ = 0,1 a 1 (pesos: píxeles).
    let [sw, sx, sy, sxx, sxy] = [0, 0, 0, 0, 0];
    for (const row of rows) {
      if (row.mu < 0.1) continue;
      const x = Math.log(row.mu);
      const y = Math.log(row.rgb[k] / center.rgb[k]);
      sw += row.n;
      sx += row.n * x;
      sy += row.n * y;
      sxx += row.n * x * x;
      sxy += row.n * x * y;
    }
    alphas[name] = (sw * sxy - sx * sy) / (sw * sxx - sx * sx);
  });
  console.log('μ      I/I(1) R (ley)       G (ley)       B (ley)');
  for (const target of [1, 0.8, 0.6, 0.4, 0.3, 0.2, 0.15, 0.1]) {
    const row = rows.reduce((best, r) =>
      Math.abs(r.mu - target) < Math.abs(best.mu - target) ? r : best,
    );
    const cells = ['R', 'G', 'B'].map((name, k) => {
      const measured = row.rgb[k] / center.rgb[k];
      const law = row.mu ** EXPECTED_ALPHA[name];
      return `${measured.toFixed(3)} (${law.toFixed(3)})`;
    });
    console.log(`${row.mu.toFixed(3)}  ${cells.join('  ')}`);
  }
  for (const name of ['R', 'G', 'B']) {
    const delta = alphas[name] - EXPECTED_ALPHA[name];
    console.log(
      `α ${name}: ${alphas[name].toFixed(3)} (ley ${EXPECTED_ALPHA[name].toFixed(3)}; diferencia ${delta >= 0 ? '+' : ''}${delta.toFixed(3)})`,
    );
  }
  if (problems.length) console.log(problems.join('\n'));
  return alphas;
}

async function measureDisc(browser) {
  const { page, problems } = await openViewer(browser, SUN_URL, SQUARE);
  await page.keyboard.press('v');
  await page.waitForTimeout(500);
  const { image, disc: fitted } = await canvas(page, 'sol');
  await page.close();
  console.log('\nEl Sol de cerca, como se ve (con su bloom):');
  const zones = [
    ['centro (r < 0,1)', 0, 0.1],
    ['μ ≈ 0,7 (r 0,70–0,73)', 0.7, 0.73],
    ['μ ≈ 0,4 (r 0,90–0,93)', 0.9, 0.93],
    ['borde, μ ≈ 0,15 (r 0,985–0,99)', 0.985, 0.99],
  ];
  for (const [name, from, to] of zones) {
    console.log(`${name}: ${fmt(cielab(mean(ring(image, fitted, from, to))))}`);
  }
  if (problems.length) console.log(problems.join('\n'));
}

/** La Luna del cielo en pantalla (px reales): su centro y su radio, con la cámara del cielo. */
const skyMoon = (page) =>
  page.evaluate(() => {
    const sky = window.__tlsViewer.engine.sky;
    const camera = sky.camera;
    const moon = sky.moon;
    const Vector3 = moon.position.constructor;
    const dpr = window.devicePixelRatio;
    const canvasEl = document.querySelector('canvas');
    const w = canvasEl.width;
    const h = canvasEl.height;
    const toPx = (v) => {
      const p = v.clone().project(camera);
      return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
    };
    const up = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const center = toPx(moon.position);
    const edge = toPx(moon.position.clone().add(up.multiplyScalar(moon.scale.x)));
    return { x: center.x, y: center.y, r: Math.hypot(edge.x - center.x, edge.y - center.y), dpr };
  });

async function measureTotality(browser) {
  const near = `${FRAGA}&rumbo=285.33&altura=5.19&campo=3`;
  const { page, problems } = await openViewer(browser, near, DESKTOP);
  const { image } = await canvas(page);
  const moon = await skyMoon(page);
  await page.close();
  console.log(
    `\nTotalidad del 12-08-2026 desde Fraga (campo de 3°): la Luna en (${moon.x.toFixed(1)}, ${moon.y.toFixed(1)}), r ${moon.r.toFixed(1)} px`,
  );
  const inner = cielab(mean(ring(image, moon, 0, 0.9)));
  const around = cielab(mean(ring(image, moon, 2, 3)));
  const corners = [];
  const { info } = image;
  const box = Math.round(info.height * 0.12);
  for (const [i0, j0] of [
    [0, 0],
    [info.width - box, 0],
  ]) {
    for (let j = j0; j < j0 + box; j++)
      for (let i = i0; i < i0 + box; i++) corners.push(pixel(image, i, j).map(srgbToLinear));
  }
  const far = cielab(mean(corners));
  console.log(`la Luna (hasta 0,9 radios): ${fmt(inner)}`);
  console.log(`el cielo de 2 a 3 radios (con la corona): ${fmt(around)}`);
  console.log(`el cielo lejos de la corona (esquinas de arriba): ${fmt(far)}`);
  console.log(
    `la Luna, ${(around.L - inner.L).toFixed(1)} de L* más oscura que lo que la rodea y ${(far.L - inner.L).toFixed(1)} más que el cielo lejano`,
  );
  if (problems.length) console.log(problems.join('\n'));

  // De lejos: el cielo a varias alturas, en una franja de ±12 px alrededor de la fila de cada altura
  // (proyectada con la cámara del cielo) y lejos del Sol (a más de 8° de él en rumbo).
  const wide = `${FRAGA}&rumbo=285.4&altura=12&campo=50`;
  const second = await openViewer(browser, wide, DESKTOP);
  const { image: wideImage } = await canvas(second.page);
  const altitudes = [0.5, 1.5, 3, 5, 8, 15, 25, 33];
  const spots = await second.page.evaluate(
    ({ altitudes: list, sunAzimuth }) => {
      const sky = window.__tlsViewer.engine.sky;
      const camera = sky.camera;
      const Vector3 = sky.moon.position.constructor;
      const canvasEl = document.querySelector('canvas');
      const out = [];
      for (const alt of list) {
        const row = [];
        for (let az = sunAzimuth - 30; az <= sunAzimuth + 30; az += 0.5) {
          if (Math.abs(az - sunAzimuth) < 8) continue;
          const h = (alt * Math.PI) / 180;
          const a = (az * Math.PI) / 180;
          const p = new Vector3(Math.cos(h) * Math.sin(a), Math.sin(h), -Math.cos(h) * Math.cos(a))
            .multiplyScalar(10)
            .project(camera);
          if (Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z > 1) continue;
          row.push([((p.x + 1) / 2) * canvasEl.width, ((1 - p.y) / 2) * canvasEl.height]);
        }
        out.push(row);
      }
      return out;
    },
    { altitudes, sunAzimuth: 285.4 },
  );
  await second.page.close();
  console.log('\nTotalidad, campo de 50° (la cámara a 12° de altura), lejos del Sol:');
  altitudes.forEach((alt, k) => {
    const colors = [];
    for (const [x, y] of spots[k]) {
      const i = Math.round(x);
      for (let j = Math.round(y) - 2; j <= Math.round(y) + 2; j++) {
        if (i >= 0 && j >= 0 && i < wideImage.info.width && j < wideImage.info.height)
          colors.push(pixel(wideImage, i, j).map(srgbToLinear));
      }
    }
    console.log(
      `a ${alt}° de altura: ${colors.length ? fmt(cielab(mean(colors))) : 'fuera de la imagen'}`,
    );
  });
  if (second.problems.length) console.log(second.problems.join('\n'));
}

const chosen = ['limbo', 'disco', 'totalidad'].filter((name) => process.argv.includes(name));
const { browser, close } = await openBrowser();
try {
  for (const name of chosen.length ? chosen : ['limbo', 'disco', 'totalidad']) {
    if (name === 'limbo') await measureLimb(browser);
    if (name === 'disco') await measureDisc(browser);
    if (name === 'totalidad') await measureTotality(browser);
  }
} finally {
  await close();
}
