// Ajusta elementos medios (elipse con precesión) a las efemérides del JPL para 16 lunas y escribe
// src/app/data/moon-elements.ts y docs/datos/elementos-lunas.md.
// Uso: node scripts/fit-moon-elements.mjs   (las descargas de Horizons se guardan en assets-src/)
//
// Por qué no se copian de la tabla del JPL (https://ssd.jpl.nasa.gov/sats/elem/): la tabla avisa de
// que «no está pensada para calcular efemérides», redondea los periodos (4–5 cifras en Fobos,
// Deimos, Tritón y Proteo) y, comprobado contra Horizons, para las lunas de Saturno no reproduce la
// posición ni en su propia época; las demás se desvían decenas de grados en pocos años. Aquí se
// hace lo mismo que describe el JPL
// («una elipse con precesión ajustada por mínimos cuadrados a la órbita integrada»), sin redondeo.
//
// Modelo (el mismo que src/app/ephemeris/moons.ts), en el plano de referencia de cada luna:
//   λ = λ0 + nλ·t + ½·ṅ·t² + Σ A·sen(ν·t + φ)     ϖ = ϖ0 + ϖ̇·t     Ω = Ω0 + Ω̇·t
//   M = λ − ϖ,  ω = ϖ − Ω,  e e i constantes;  t en días TDB desde J2000.
// Se ajusta con Levenberg–Marquardt sobre las posiciones, en variables sin singularidades
// (k = e·cos ϖ0, h = e·sen ϖ0, p = sen(i/2)·cos Ω0, q = sen(i/2)·sen Ω0).
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';

const ROOT = new URL('../', import.meta.url);
const CACHE = new URL('assets-src/horizons-fit/', ROOT);
const HORIZONS = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const JPL_ELEMENTS = 'https://ssd.jpl.nasa.gov/sats/elem/';
const IAU_POLES = 'https://doi.org/10.1007/s10569-017-9805-5';
const DEG = Math.PI / 180;
const TAU = 2 * Math.PI;
const J2000_JD = 2451545.0;

// Polos de los planos de referencia. Laplace: columnas R.A./Dec. de la tabla del JPL.
// Urano y Neptuno: la tabla usa su ecuador («equatorial») sin dar el polo; se toma el polo
// IAU 2015 (Archinal et al. 2018) en J2000. Para Neptuno: α = 299,36 + 0,70·sen N,
// δ = 43,46 − 0,51·cos N, con N = 357,85° en J2000. Urano gira en sentido retrógrado respecto a
// su polo norte IAU (α = 257,311°, δ = −15,175°): se usa el polo opuesto, el de su rotación, para
// que sus lunas tengan inclinaciones pequeñas (Miranda 4,4°, como en la tabla del JPL) y no ~180°.
const NEPTUNE_N = 357.85 * DEG;
const POLES = {
  fobos: { raDeg: 317.7, decDeg: 52.9, kind: 'laplace', source: JPL_ELEMENTS },
  deimos: { raDeg: 316.6, decDeg: 53.5, kind: 'laplace', source: JPL_ELEMENTS },
  saturnInner: { raDeg: 40.6, decDeg: 83.5, kind: 'laplace', source: JPL_ELEMENTS },
  titan: { raDeg: 36.4, decDeg: 84.0, kind: 'laplace', source: JPL_ELEMENTS },
  japeto: { raDeg: 288.7, decDeg: 78.9, kind: 'laplace', source: JPL_ELEMENTS },
  uranus: { raDeg: 77.311, decDeg: 15.175, kind: 'ecuador', source: IAU_POLES },
  neptune: {
    raDeg: Number((299.36 + 0.7 * Math.sin(NEPTUNE_N)).toFixed(4)),
    decDeg: Number((43.46 - 0.51 * Math.cos(NEPTUNE_N)).toFixed(4)),
    kind: 'ecuador',
    source: IAU_POLES,
  },
};

// [id, código Horizons, planeta (id del proyecto), código del planeta, polo, P (d), Papsis y Pnode (años)]
// P, Papsis y Pnode son las columnas de la tabla del JPL: solo sirven de semilla (paso de muestreo y
// valor inicial de las precesiones, probando los dos sentidos de giro).
const MOONS = [
  ['fobos', '401', 'marte', '499', POLES.fobos, 0.3187, 1.1, 2.3],
  ['deimos', '402', 'marte', '499', POLES.deimos, 1.2625, 0, 56.2],
  ['mimas', '601', 'saturno', '699', POLES.saturnInner, 0.942422, 0.493, 0.986],
  ['encelado', '602', 'saturno', '699', POLES.saturnInner, 1.370218, 2.916, 0],
  ['tetis', '603', 'saturno', '699', POLES.saturnInner, 1.887802, 0.005, 4.982],
  ['dione', '604', 'saturno', '699', POLES.saturnInner, 2.736916, 11.698, 0],
  ['rea', '605', 'saturno', '699', POLES.saturnInner, 4.517503, 33.939, 35.775],
  ['titan', '606', 'saturno', '699', POLES.titan, 15.945448, 346.68, 687.37],
  ['japeto', '608', 'saturno', '699', POLES.japeto, 79.331002, 1662.9, 3130.302],
  ['miranda', '705', 'urano', '799', POLES.uranus, 1.413479, 8.939, 17.787],
  ['ariel', '701', 'urano', '799', POLES.uranus, 2.520379, 28.901, 0],
  ['umbriel', '702', 'urano', '799', POLES.uranus, 4.144177, 64.126, 129.945],
  ['titania', '703', 'urano', '799', POLES.uranus, 8.705869, 579.928, 1644.649],
  ['oberon', '704', 'urano', '799', POLES.uranus, 13.463237, 158.604, 192.798],
  ['triton', '801', 'neptuno', '899', POLES.neptune, 5.8792, 675.2, 299.4],
  ['proteo', '808', 'neptuno', '899', POLES.neptune, 1.1229, 6.5, 13.1],
];

const SPAN = { start: '1900-01-01', stop: '2100-12-31' };

// --- Utilidades de matrices -------------------------------------------------------------------
const rotZ = (deg) => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
};
const rotX = (deg) => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return [1, 0, 0, 0, c, -s, 0, s, c];
};
const mul = (a, b) =>
  Array.from({ length: 9 }, (_, k) => {
    const i = Math.floor(k / 3);
    const j = k % 3;
    return a[i * 3] * b[j] + a[i * 3 + 1] * b[3 + j] + a[i * 3 + 2] * b[6 + j];
  });
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
const apply = (m, [x, y, z]) => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];
/** Igual que referencePlaneToEqj de coordinates.ts. */
const planeToEqj = (pole) => mul(rotZ(pole.raDeg + 90), rotX(90 - pole.decDeg));
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angleDeg = (a, b) => Math.atan2(norm(cross(a, b)), dot(a, b)) / DEG;

// --- Horizons ---------------------------------------------------------------------------------
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function vectorsQuery(target, center, start, stop, stepMinutes) {
  const params = {
    format: 'json',
    COMMAND: `'${target}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'VECTORS'",
    CENTER: `'500@${center}'`,
    REF_PLANE: "'FRAME'",
    REF_SYSTEM: "'ICRF'",
    VEC_TABLE: "'1'",
    VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    START_TIME: `'${start}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${stepMinutes} m'`,
  };
  return `${HORIZONS}?${Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')}`;
}

/** Descarga (o lee de la caché) una ventana de vectores: [{ t (días TDB desde J2000), r (km) }]. */
async function fetchWindow(name, query) {
  const file = new URL(`${name}.json`, CACHE);
  let text;
  try {
    text = await readFile(file, 'utf8');
  } catch {
    for (let attempt = 1; ; attempt++) {
      const response = await fetch(query);
      if (response.ok) {
        text = await response.text();
        break;
      }
      if (attempt >= 4) throw new Error(`HTTP ${response.status} en ${name}`);
      await sleep(3000 * attempt);
    }
    await writeFile(file, text);
    await sleep(500);
  }
  const result = JSON.parse(text).result;
  const body = result.split('$$SOE')[1]?.split('$$EOE')[0];
  if (!body) throw new Error(`Sin datos en ${name}: ${result.slice(0, 300)}`);
  const ephemeris = /Target body name:.*\{source: ([^}]+)\}/.exec(result)?.[1] ?? 'desconocida';
  const samples = body
    .trim()
    .split('\n')
    .map((line) => {
      const cells = line.split(',').map((cell) => cell.trim());
      return {
        t: Number(cells[0]) - J2000_JD,
        r: [Number(cells[2]), Number(cells[3]), Number(cells[4])],
      };
    });
  return { samples, ephemeris };
}

// --- Modelo -----------------------------------------------------------------------------------
function kepler(m, e) {
  let x = ((m % TAU) + TAU) % TAU;
  const target = x;
  for (let k = 0; k < 30; k++) {
    const delta = (x - e * Math.sin(x) - target) / (1 - e * Math.cos(x));
    x -= delta;
    if (Math.abs(delta) < 1e-14) break;
  }
  return x;
}

/** Índices de los parámetros. Los términos de longitud van al final, de 3 en 3 (A, ν, φ). */
const P = { a: 0, lam0: 1, nlam: 2, k: 3, h: 4, p: 5, q: 6, wdot: 7, odot: 8, ndot: 9 };
const BASE = 10;

/** Posición (km, plano de referencia) en `t` para el vector de parámetros `x`. */
function model(x, t) {
  let lam = x[P.lam0] + x[P.nlam] * t + 0.5 * x[P.ndot] * t * t;
  for (let j = BASE; j < x.length; j += 3) lam += x[j] * Math.sin(x[j + 1] * t + x[j + 2]);
  const e = Math.hypot(x[P.k], x[P.h]);
  const varpi = Math.atan2(x[P.h], x[P.k]) + x[P.wdot] * t;
  const s = Math.min(Math.hypot(x[P.p], x[P.q]), 1);
  const inc = 2 * Math.asin(s);
  const node = Math.atan2(x[P.q], x[P.p]) + x[P.odot] * t;
  const anomaly = kepler(lam - varpi, e);
  const xp = x[P.a] * (Math.cos(anomaly) - e);
  const yp = x[P.a] * Math.sqrt(1 - e * e) * Math.sin(anomaly);
  const arg = varpi - node;
  const x1 = xp * Math.cos(arg) - yp * Math.sin(arg);
  const y1 = xp * Math.sin(arg) + yp * Math.cos(arg);
  const y2 = y1 * Math.cos(inc);
  const z2 = y1 * Math.sin(inc);
  return [x1 * Math.cos(node) - y2 * Math.sin(node), x1 * Math.sin(node) + y2 * Math.cos(node), z2];
}

function residuals(x, samples, scale) {
  const out = new Float64Array(samples.length * 3);
  samples.forEach((s, i) => {
    const m = model(x, s.t);
    out[3 * i] = (m[0] - s.r[0]) / scale;
    out[3 * i + 1] = (m[1] - s.r[1]) / scale;
    out[3 * i + 2] = (m[2] - s.r[2]) / scale;
  });
  return out;
}

/** Suma de cuadrados; un modelo que da NaN (p. ej. e ≥ 1) cuenta como infinitamente malo. */
const sumSq = (r) => {
  const total = r.reduce((acc, v) => acc + v * v, 0);
  return Number.isNaN(total) ? Infinity : total;
};

/** Resuelve A·x = b (Gauss con pivote parcial). */
function solve(a, b) {
  const n = b.length;
  const m = a.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++)
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    [m[col], m[pivot]] = [m[pivot], m[col]];
    if (Math.abs(m[col][col]) < 1e-300) return null;
    for (let row = col + 1; row < n; row++) {
      const f = m[row][col] / m[col][col];
      for (let k = col; k <= n; k++) m[row][k] -= f * m[col][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let row = n - 1; row >= 0; row--) {
    let acc = m[row][n];
    for (let k = row + 1; k < n; k++) acc -= m[row][k] * x[k];
    x[row] = acc / m[row][row];
  }
  return x;
}

/** Levenberg–Marquardt. `free` son los índices que se ajustan; `steps`, el paso de cada derivada. */
function levenberg(x0, samples, scale, free, steps, iterations = 60) {
  let x = [...x0];
  let r = residuals(x, samples, scale);
  let cost = sumSq(r);
  let mu = 1e-3;
  for (let it = 0; it < iterations; it++) {
    const jac = free.map((index) => {
      const plus = [...x];
      const minus = [...x];
      plus[index] += steps[index];
      minus[index] -= steps[index];
      const rp = residuals(plus, samples, scale);
      const rm = residuals(minus, samples, scale);
      return rp.map((v, k) => (v - rm[k]) / (2 * steps[index]));
    });
    const n = free.length;
    const jtj = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => jac[i].reduce((acc, v, k) => acc + v * jac[j][k], 0)),
    );
    const jtr = jac.map((col) => col.reduce((acc, v, k) => acc + v * r[k], 0));
    let improved = false;
    for (let attempt = 0; attempt < 12; attempt++) {
      const damped = jtj.map((row, i) => row.map((v, j) => (i === j ? v * (1 + mu) : v)));
      const delta = solve(
        damped,
        jtr.map((v) => -v),
      );
      if (!delta) {
        mu *= 10;
        continue;
      }
      const candidate = [...x];
      free.forEach((index, i) => (candidate[index] += delta[i]));
      const rc = residuals(candidate, samples, scale);
      const cc = sumSq(rc);
      if (cc < cost) {
        const gain = (cost - cc) / cost;
        x = candidate;
        r = rc;
        cost = cc;
        mu = Math.max(mu / 3, 1e-12);
        improved = true;
        if (gain < 1e-12) return x;
        break;
      }
      mu *= 8;
    }
    if (!improved) break;
  }
  return x;
}

/** Errores angulares (grados) del modelo frente a las muestras. */
function angularErrors(x, samples) {
  return samples.map((s) => angleDeg(model(x, s.t), s.r));
}
const rms = (values) => Math.sqrt(values.reduce((acc, v) => acc + v * v, 0) / values.length);

/** Diferencia de longitud a lo largo de la órbita (radianes, con signo): Horizons − modelo. */
function alongTrack(x, sample) {
  const m = model(x, sample.t);
  const n = cross(m, model(x, sample.t + 1e-3));
  const c = cross(m, sample.r);
  return Math.atan2(dot(c, n) / norm(n), dot(m, sample.r));
}

/** Mejor sinusoide (periodo, amplitud y fase) de los residuos de longitud, por barrido de periodos. */
function bestSinusoid(samples, values, minDays, maxDays) {
  let best = null;
  for (let logP = Math.log(minDays); logP <= Math.log(maxDays); logP += 0.002) {
    const nu = TAU / Math.exp(logP);
    let ss = 0,
      sc = 0,
      cc = 0,
      ys = 0,
      yc = 0;
    samples.forEach((s, i) => {
      const sn = Math.sin(nu * s.t);
      const cs = Math.cos(nu * s.t);
      ss += sn * sn;
      sc += sn * cs;
      cc += cs * cs;
      ys += values[i] * sn;
      yc += values[i] * cs;
    });
    const det = ss * cc - sc * sc;
    if (det <= 0) continue;
    const A = (ys * cc - yc * sc) / det;
    const B = (yc * ss - ys * sc) / det;
    const reduction = A * ys + B * yc;
    if (!best || reduction > best.reduction) {
      best = { nu, amplitude: Math.hypot(A, B), phase: Math.atan2(B, A), reduction };
    }
  }
  return best;
}

// --- Ajuste de una luna -----------------------------------------------------------------------
async function fitMoon([id, code, , center, pole, period, apsisYears, nodeYears]) {
  const shortHalf = Math.max(15, 2 * period);
  const shortStep = Math.max(10, Math.round((period * 1440) / 12));
  const windows = [
    ['corta', '2025-12-01', '2026-02-01', shortStep],
    ['media', '2016-01-01', '2036-01-01', 10531],
    ['larga', SPAN.start, SPAN.stop, 105307],
  ].map(([label, start, stop, step]) => {
    if (label === 'corta') {
      const center = Date.UTC(2026, 0, 1);
      start = new Date(center - shortHalf * 86_400_000).toISOString().slice(0, 10);
      stop = new Date(center + shortHalf * 86_400_000).toISOString().slice(0, 10);
    }
    return { label, query: vectorsQuery(code, center, start, stop, step) };
  });
  const toPlane = transpose(planeToEqj(pole));
  const data = {};
  let ephemeris = '';
  for (const w of windows) {
    const { samples, ephemeris: source } = await fetchWindow(`${id}-${w.label}`, w.query);
    ephemeris = source;
    data[w.label] = samples.map((s) => ({ t: s.t, r: apply(toPlane, s.r) }));
  }

  // Valores iniciales con la ventana corta: radio medio, longitud desenrollada y plano medio.
  const short = data.corta;
  const a0 = short.reduce((acc, s) => acc + norm(s.r), 0) / short.length;
  const normal = short.slice(1).reduce(
    (acc, s, i) => {
      const c = cross(short[i].r, s.r);
      const len = norm(c);
      return [acc[0] + c[0] / len, acc[1] + c[1] / len, acc[2] + c[2] / len];
    },
    [0, 0, 0],
  );
  const nz = normal[2] / norm(normal);
  const inc0 = Math.acos(Math.max(-1, Math.min(1, nz)));
  const node0 = Math.atan2(normal[0], -normal[1]);
  // Longitud en el plano de la órbita, medida desde el nodo (λ = Ω + u para e≈0).
  const u = short.map((s) => {
    const c = Math.cos(node0);
    const sn = Math.sin(node0);
    const xn = s.r[0] * c + s.r[1] * sn;
    const yn = (-s.r[0] * sn + s.r[1] * c) * Math.cos(inc0) + s.r[2] * Math.sin(inc0);
    return Math.atan2(yn, xn);
  });
  for (let k = 1; k < u.length; k++) {
    while (u[k] - u[k - 1] > Math.PI) u[k] -= TAU;
    while (u[k] - u[k - 1] < -Math.PI) u[k] += TAU;
  }
  const tMean = short.reduce((acc, s) => acc + s.t, 0) / short.length;
  const uMean = u.reduce((acc, v) => acc + v, 0) / u.length;
  let num = 0;
  let den = 0;
  short.forEach((s, k) => {
    num += (s.t - tMean) * (u[k] - uMean);
    den += (s.t - tMean) ** 2;
  });
  const n0 = num / den;
  const sinHalf = Math.sin(inc0 / 2);
  let x = new Array(BASE).fill(0);
  x[P.a] = a0;
  x[P.nlam] = n0;
  x[P.lam0] = node0 + uMean - n0 * tMean;
  x[P.p] = sinHalf * Math.cos(node0);
  x[P.q] = sinHalf * Math.sin(node0);

  const span = 36_525;
  const stepsFor = (vector) =>
    vector.map((_, i) => {
      if (i === P.a) return a0 * 1e-7;
      if (i === P.nlam || i === P.wdot || i === P.odot) return 1e-8 / span;
      if (i === P.ndot) return 1e-8 / span ** 2;
      if (i < BASE) return 1e-8;
      const j = (i - BASE) % 3;
      return j === 1 ? 1e-8 / span : 1e-8;
    });
  const base = [P.a, P.lam0, P.nlam, P.k, P.h, P.p, P.q];
  const rates = [P.wdot, P.odot];
  x = levenberg(x, short, a0, base, stepsFor(x));
  // Precesiones: cada semilla (los dos sentidos de giro del nodo y del periapsis, y sin precesión)
  // recorre el ajuste completo y se queda la de menor coste total. Con una sola semilla, el ajuste
  // puede caer en un mínimo local con el sentido de giro invertido.
  const medium = [...short, ...data.media];
  const all = [...medium, ...data.larga];
  const rate = (years) => (years >= 0.05 ? TAU / (years * 365.25) : 0);
  const seeds = [[0, 0]];
  for (const sw of [1, -1]) for (const so of [1, -1]) seeds.push([sw, so]);
  let bestCost = Infinity;
  let bestX = x;
  for (const [sw, so] of seeds) {
    let candidate = [...x];
    candidate[P.odot] = so * rate(nodeYears);
    candidate[P.wdot] = sw * rate(apsisYears) + candidate[P.odot];
    candidate = levenberg(candidate, medium, a0, [...base, ...rates], stepsFor(candidate));
    candidate = levenberg(candidate, all, a0, [...base, ...rates], stepsFor(candidate));
    const cost = sumSq(residuals(candidate, all, a0));
    if (cost < bestCost) {
      bestCost = cost;
      bestX = candidate;
    }
  }
  x = bestX;

  // Aceleración secular y términos periódicos de longitud: solo si mejoran de verdad.
  const notes = [];
  const maxError = (vector) => Math.max(...angularErrors(vector, all));
  let current = maxError(x);
  const withNdot = levenberg(x, all, a0, [...base, ...rates, P.ndot], stepsFor(x));
  if (maxError(withNdot) < 0.8 * current) {
    x = withNdot;
    current = maxError(x);
    notes.push('aceleración secular de la longitud');
  }
  const ndotFree = x[P.ndot] !== 0 ? [P.ndot] : [];
  for (let term = 0; term < 3; term++) {
    const values = all.map((s) => alongTrack(x, s));
    const best = bestSinusoid(all, values, 400, 120 * 365.25);
    if (!best || best.amplitude < 0.15 * DEG) break;
    const candidate = [...x, best.amplitude, best.nu, best.phase];
    const terms = Array.from({ length: candidate.length - BASE }, (_, k) => BASE + k);
    const fitted = levenberg(
      candidate,
      all,
      a0,
      [...base, ...rates, ...ndotFree, ...terms],
      stepsFor(candidate),
    );
    const error = maxError(fitted);
    if (error > 0.9 * current) break;
    x = fitted;
    current = error;
    notes.push(`término de ${es(TAU / best.nu / 365.25, 1)} años`);
  }

  const errors = (samples) => angularErrors(x, samples);
  const recent = all.filter((s) => s.t >= 7305 && s.t <= 13149); // 2020–2035
  // Desglose del error en el sistema de la órbita (grados equivalentes, vistos desde el planeta).
  const components = all.map((sample) => {
    const m = model(x, sample.t);
    const diff = [sample.r[0] - m[0], sample.r[1] - m[1], sample.r[2] - m[2]];
    const radial = m.map((c) => c / norm(m));
    const n = cross(m, model(x, sample.t + 1e-3));
    const normal = n.map((c) => c / norm(n));
    const along = cross(normal, radial);
    return [radial, along, normal].map((axis) => dot(diff, axis) / norm(m) / DEG);
  });
  const stats = {
    radialDeg: rms(components.map((c) => c[0])),
    alongDeg: rms(components.map((c) => c[1])),
    crossDeg: rms(components.map((c) => c[2])),
    samples: all.length,
    rmsDeg: rms(errors(all)),
    maxDeg: Math.max(...errors(all)),
    max2020to2035Deg: Math.max(...errors(recent)),
  };
  return { id, code, center, pole, ephemeris, x, notes, stats, queries: windows };
}

// --- Conversión a elementos clásicos y salida ------------------------------------------------
const wrap360 = (deg) => ((deg % 360) + 360) % 360;
/** Número con coma decimal (documentos en español). */
const es = (value, digits) =>
  (digits === undefined ? String(value) : value.toFixed(digits)).replace('.', ',');
const round = (value, digits) => Number(value.toPrecision(digits));

function toElements(fit) {
  const { x, pole } = fit;
  const e = Math.hypot(x[P.k], x[P.h]);
  const varpi0 = Math.atan2(x[P.h], x[P.k]);
  const inc = 2 * Math.asin(Math.min(Math.hypot(x[P.p], x[P.q]), 1));
  const node0 = Math.atan2(x[P.q], x[P.p]);
  const elements = {
    referencePole: { raDeg: pole.raDeg, decDeg: pole.decDeg },
    semiMajorAxisKm: round(x[P.a], 10),
    eccentricity: round(e, 8),
    inclinationDeg: round(inc / DEG, 10),
    nodeDeg: round(wrap360(node0 / DEG), 12),
    nodeRateDegPerDay: round(x[P.odot] / DEG, 10),
    argPeriapsisDeg: round(wrap360((varpi0 - node0) / DEG), 12),
    argPeriapsisRateDegPerDay: round((x[P.wdot] - x[P.odot]) / DEG, 10),
    meanAnomalyDeg: round(wrap360((x[P.lam0] - varpi0) / DEG), 12),
    meanMotionDegPerDay: round((x[P.nlam] - x[P.wdot]) / DEG, 15),
  };
  if (x[P.ndot] !== 0) elements.meanMotionRateDegPerDay2 = round(x[P.ndot] / DEG, 10);
  const terms = [];
  for (let j = BASE; j < x.length; j += 3) {
    // A·sen(ν·t + φ) con A > 0.
    let amplitude = x[j];
    let phase = x[j + 2];
    if (amplitude < 0) {
      amplitude = -amplitude;
      phase += Math.PI;
    }
    terms.push({
      amplitudeDeg: round(amplitude / DEG, 8),
      periodDays: round(TAU / x[j + 1], 10),
      phaseDeg: round(wrap360(phase / DEG), 10),
    });
  }
  if (terms.length) elements.longitudeTerms = terms;
  return elements;
}

function tsLiteral(value, indent = '') {
  if (Array.isArray(value)) {
    return `[\n${value.map((v) => `${indent}  ${tsLiteral(v, `${indent}  `)},`).join('\n')}\n${indent}]`;
  }
  if (value && typeof value === 'object') {
    return `{\n${Object.entries(value)
      .map(([k, v]) => `${indent}  ${k}: ${tsLiteral(v, `${indent}  `)},`)
      .join('\n')}\n${indent}}`;
  }
  return typeof value === 'string' ? `'${value.replaceAll("'", "\\'")}'` : String(value);
}

await mkdir(CACHE, { recursive: true });
const fits = [];
for (const moon of MOONS) {
  const fit = await fitMoon(moon);
  fits.push(fit);
  const s = fit.stats;
  console.log(
    `${fit.id.padEnd(9)} rms ${s.rmsDeg.toFixed(3)}°  máx ${s.maxDeg.toFixed(3)}°  máx 2020–2035 ${s.max2020to2035Deg.toFixed(3)}°  ${fit.notes.join(', ')}`,
  );
}

const today = new Date().toISOString().slice(0, 10);
const parentOf = Object.fromEntries(MOONS.map(([id, , parent]) => [id, parent]));
const entries = Object.fromEntries(
  fits.map((fit) => [
    fit.id,
    {
      parent: parentOf[fit.id],
      source: fit.queries.at(-1).query,
      ephemeris: fit.ephemeris,
      referencePlane: { kind: fit.pole.kind, source: fit.pole.source },
      fit: {
        span: '1900–2100',
        samples: fit.stats.samples,
        rmsDeg: round(fit.stats.rmsDeg, 3),
        maxDeg: round(fit.stats.maxDeg, 3),
      },
      elements: toElements(fit),
    },
  ]),
);

const ts = `// GENERADO por scripts/fit-moon-elements.mjs el ${today}. No se edita a mano.
// Elementos medios ajustados por mínimos cuadrados a las efemérides del JPL (Horizons), época
// J2000 TT, en el plano de referencia de cada luna. Método, consultas y residuos:
// docs/datos/elementos-lunas.md.
import type { PlanetId } from '../ephemeris/ids';
import type { MeanElements } from '../ephemeris/moons';

export interface MoonElementsEntry {
  readonly parent: PlanetId;
  /** Consulta de Horizons de la ventana larga del ajuste (1900–2100). */
  readonly source: string;
  /** Efeméride del JPL de la que salen los datos. */
  readonly ephemeris: string;
  /** Plano de referencia: Laplace (polo de la tabla del JPL) o ecuador del planeta (polo IAU). */
  readonly referencePlane: { readonly kind: 'laplace' | 'ecuador'; readonly source: string };
  /** Calidad del ajuste frente a Horizons en 1900–2100 (error angular visto desde el planeta). */
  readonly fit: {
    readonly span: string;
    readonly samples: number;
    readonly rmsDeg: number;
    readonly maxDeg: number;
  };
  readonly elements: MeanElements;
}

export const MOON_ELEMENTS = ${tsLiteral(entries)} as const satisfies Record<string, MoonElementsEntry>;

export type MeanElementsMoonId = keyof typeof MOON_ELEMENTS;
`;
const tsFile = new URL('src/app/data/moon-elements.ts', ROOT);
await writeFile(tsFile, ts);

const rows = fits.map((fit) => {
  const s = fit.stats;
  const pole = `${fit.pole.kind} (${es(fit.pole.raDeg)}°, ${es(fit.pole.decDeg)}°)`;
  const parts = `${es(s.radialDeg, 3)} / ${es(s.alongDeg, 3)} / ${es(s.crossDeg, 3)}`;
  return `| ${fit.id} | ${fit.ephemeris} | ${pole} | ${s.samples} | ${es(s.rmsDeg, 3)} | ${parts} | ${es(s.maxDeg, 3)} | ${es(s.max2020to2035Deg, 3)} | ${fit.notes.join(', ') || '—'} |`;
});
const queries = fits.flatMap((fit) =>
  fit.queries.map((w) => `- ${fit.id}, ventana ${w.label}: <${w.query}>`),
);
const md = `# Elementos medios de las lunas (generado el ${today})

Generado por \`scripts/fit-moon-elements.mjs\`. No se edita a mano.

## Método
- Datos: vectores geométricos de NASA/JPL Horizons (ICRF, km, TDB) respecto al centro del planeta, en
  tres ventanas: corta (±15 días o ±2 periodos alrededor del 2026-01-01, 12 muestras por órbita),
  media (2016–2036, cada 7,3 días) y larga (1900–2100, cada 73,1 días).
- Plano de referencia: el de Laplace de la tabla del JPL (${JPL_ELEMENTS}) o, en Urano y Neptuno, su
  ecuador con el polo IAU 2015 (${IAU_POLES}). En Urano se usa el polo opuesto al norte IAU, el de
  su rotación (retrógrada), para que sus lunas tengan inclinaciones pequeñas y no ~180°.
- Modelo: elipse con precesión del nodo y del periapsis. Se añade una aceleración secular de la
  longitud si reduce el error máximo más de un 20 %, y hasta 3 términos periódicos de la longitud
  (periodos de 400 días a 120 años) si cada uno lo reduce más de un 10 %.
- Ajuste: Levenberg–Marquardt sobre las posiciones. Las precesiones se siembran con los periodos de
  la tabla del JPL en los dos sentidos de giro (y sin precesión) y se queda el mejor ajuste.

## Calidad del ajuste (error angular visto desde el planeta, en grados)
| Luna | Efeméride | Plano (polo α, δ) | Muestras | RMS | RMS radial / a lo largo / fuera del plano | Máx. 1900–2100 | Máx. 2020–2035 | Términos añadidos |
|---|---|---|---|---|---|---|---|---|
${rows.join('\n')}

## Consultas de Horizons
${queries.join('\n')}
`;
await mkdir(new URL('docs/datos/', ROOT), { recursive: true });
await writeFile(new URL('docs/datos/elementos-lunas.md', ROOT), md);

execFileSync(
  process.execPath,
  ['node_modules/prettier/bin/prettier.cjs', '--write', 'src/app/data/moon-elements.ts'],
  {
    cwd: ROOT,
    stdio: 'inherit',
  },
);
