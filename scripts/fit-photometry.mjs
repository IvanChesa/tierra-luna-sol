// Ajusta los parámetros fotométricos (D29) de Mercurio, Venus, Marte y la Luna para que la curva de
// fase del disco entero siga las leyes de magnitud publicadas que usa astronomy-engine
// (src/app/ephemeris/photometry.ts, PHASE_LAWS). Escribe los resultados por consola: se copian a
// src/app/data/photometry.ts y el test de photometry.spec.ts comprueba que reproducen las leyes.
// Uso: node scripts/fit-photometry.mjs
//
// Método: Nelder–Mead sobre la raíz del error cuadrático medio (en magnitudes) cada 5° del intervalo
// de validez de cada ley, con los parámetros acotados a rangos físicos.
import { PHASE_LAWS, discBrightness, lawPhaseMagnitude } from '../src/app/ephemeris/photometry.ts';

const DEG = Math.PI / 180;

/** Error RMS (magnitudes) de un modelo frente a una ley, cada 5° de su intervalo de validez. */
function rmsError(law, photometry, steps = [48, 96]) {
  const [from, to] = law.validDeg;
  const full = discBrightness(0, photometry, ...steps);
  let sum = 0;
  let n = 0;
  for (let alpha = Math.max(from, 2.5); alpha <= to; alpha += 5) {
    const model = -2.5 * Math.log10(discBrightness(alpha * DEG, photometry, ...steps) / full);
    sum += (model - lawPhaseMagnitude(law, alpha)) ** 2;
    n++;
  }
  return Math.sqrt(sum / n);
}

/** Nelder–Mead sencillo (parámetros ya transformados a un espacio sin límites). */
function nelderMead(f, start, step = 0.3, iterations = 260) {
  const n = start.length;
  let simplex = [start];
  for (let i = 0; i < n; i++) {
    const point = [...start];
    point[i] += step;
    simplex.push(point);
  }
  let values = simplex.map(f);
  for (let it = 0; it < iterations; it++) {
    const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    simplex = order.map(([, i]) => simplex[i]);
    values = order.map(([v]) => v);
    const centroid = Array.from(
      { length: n },
      (_, d) => simplex.slice(0, n).reduce((s, p) => s + p[d], 0) / n,
    );
    const worst = simplex[n];
    const at = (t) => centroid.map((c, d) => c + t * (worst[d] - c));
    const reflected = at(-1);
    const fr = f(reflected);
    if (fr < values[0]) {
      const expanded = at(-2);
      const fe = f(expanded);
      [simplex[n], values[n]] = fe < fr ? [expanded, fe] : [reflected, fr];
    } else if (fr < values[n - 1]) {
      [simplex[n], values[n]] = [reflected, fr];
    } else {
      const contracted = at(0.5);
      const fc = f(contracted);
      if (fc < values[n]) {
        [simplex[n], values[n]] = [contracted, fc];
      } else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((x, d) => simplex[0][d] + 0.5 * (x - simplex[0][d]));
          values[i] = f(simplex[i]);
        }
      }
    }
  }
  const best = values.indexOf(Math.min(...values));
  return { point: simplex[best], value: values[best] };
}

const sigmoid = (x, lo, hi) => lo + (hi - lo) / (1 + Math.exp(-x));
const logit = (y, lo, hi) => Math.log((y - lo) / (hi - y));

/**
 * Cada ajuste: qué parámetros se mueven (con sus límites y el punto de partida) y cuáles quedan
 * fijos. Los rocosos tienen el disco plano en fase llena (L₀ = 1, Lommel–Seeliger): es lo que se ve
 * en la Luna llena, y la ley de fase sola no lo distingue de un limbo oscuro.
 */
const FITS = {
  mercurio: {
    fixed: { lommel: 1, minnaertK: 1, forwardFraction: 0, forwardAsymmetry: 0.5 },
    free: {
      lommelSlope: [0, 3, 1],
      oppositionAmplitude: [0, 3, 1],
      oppositionWidth: [0.003, 1, 0.08],
      backAsymmetry: [-0.9, 0.3, -0.2],
    },
  },
  luna: {
    fixed: { lommel: 1, minnaertK: 1, forwardFraction: 0, forwardAsymmetry: 0.5 },
    free: {
      lommelSlope: [0, 3, 0.7],
      oppositionAmplitude: [0, 3, 1],
      oppositionWidth: [0.003, 1, 0.1],
      backAsymmetry: [-0.9, 0.3, -0.1],
    },
  },
  // La ley de Marte es lineal (sin pico de oposición) y solo llega a 50°: se ajustan dos parámetros.
  marte: {
    fixed: {
      lommel: 1,
      minnaertK: 1,
      oppositionAmplitude: 0,
      oppositionWidth: 0.1,
      forwardFraction: 0,
      forwardAsymmetry: 0.5,
    },
    free: {
      lommelSlope: [0, 3, 0.5],
      backAsymmetry: [-0.9, 0.3, -0.2],
    },
  },
  venus: {
    fixed: { lommel: 0, lommelSlope: 0, oppositionAmplitude: 0, oppositionWidth: 0.1 },
    free: {
      minnaertK: [0.5, 1.2, 0.8],
      backAsymmetry: [-0.9, 0.3, -0.1],
      forwardFraction: [0, 0.7, 0.2],
      forwardAsymmetry: [0.2, 0.95, 0.7],
    },
  },
};

for (const [id, fit] of Object.entries(FITS)) {
  const law = PHASE_LAWS[id];
  const names = Object.keys(fit.free);
  const toParams = (x) => ({
    ...fit.fixed,
    ...Object.fromEntries(
      names.map((name, i) => [name, sigmoid(x[i], fit.free[name][0], fit.free[name][1])]),
    ),
  });
  const first = names.map((name) => logit(fit.free[name][2], fit.free[name][0], fit.free[name][1]));
  const t0 = Date.now();
  let seed = 11;
  const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let best = null;
  for (let attempt = 0; attempt < 8; attempt++) {
    const start = attempt === 0 ? first : names.map(() => (random() - 0.5) * 4);
    const result = nelderMead((x) => rmsError(law, toParams(x)), start);
    if (!best || result.value < best.value) best = result;
  }
  const { point, value } = best;
  const params = toParams(point);
  const fine = rmsError(law, params, [96, 192]);
  const rounded = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Number(v.toFixed(3))]),
  );
  console.log(
    `${id}: RMS ${value.toFixed(3)} mag (fino: ${fine.toFixed(3)}) en ${((Date.now() - t0) / 1000).toFixed(1)} s · ${law.source}`,
  );
  console.log(`  ${JSON.stringify(rounded)}`);
}
