// La dicotomía de Jápeto (fase 9b, D42; venía de la fase 10): en el mosaico del USGS (normalizado en
// brillo), su cara oscura sale a ~0,6 de la clara, cuando la NASA da un albedo de 0,03–0,05 para el
// hemisferio delantero y de 0,5–0,6 para el trasero (https://science.nasa.gov/saturn/moons/iapetus/).
// Aquí, el cociente entre la región oscura y la clara se lleva al publicado con un factor a gran escala
// (en luz lineal), que conserva el detalle de cada región en proporción: lo que cambia es el brillo de
// cada región, no su relieve. Es una calibración del mapa entero (como el balance de color de Ío), después
// de la recreación de D45: la recreación parte del mosaico tal como llega (sus sondas son de borde, y con
// el material oscuro a 0,045 su gradiente se pierde en 8 bits) y el mismo factor, medido en el mosaico,
// se aplica al mosaico y al mapa recreado (lo real sigue igual en los dos).
import { gaussianBlur, rowWeights } from './moon-maps.mjs';

const toLinear = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const toSrgb8 = (v) => {
  const c = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
  return Math.max(0, Math.min(255, Math.round(255 * c)));
};

/**
 * El umbral de Otsu (con pesos) de unos valores entre 0 y 1: el que separa mejor sus dos modas.
 */
function otsu(values, weights, bins = 256) {
  const hist = new Float64Array(bins);
  let total = 0;
  for (let k = 0; k < values.length; k++) {
    const b = Math.min(bins - 1, Math.max(0, Math.floor(values[k] * bins)));
    hist[b] += weights[k];
    total += weights[k];
  }
  let sum = 0;
  for (let b = 0; b < bins; b++) sum += b * hist[b];
  let wB = 0;
  let sumB = 0;
  let best = { score: -1, b: 0 };
  for (let b = 0; b < bins; b++) {
    wB += hist[b];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += b * hist[b];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const score = wB * wF * (mB - mF) ** 2;
    if (score > best.score) best = { score, b };
  }
  return (best.b + 1) / bins;
}

/**
 * Las regiones oscura y clara de un mapa (por su brillo lineal a gran escala, desenfocado con
 * `sigmaDeg` sobre la esfera, y separadas por el umbral de Otsu) y el brillo medio de cada una
 * (lineal, ponderado por el área). `dark`: 1 en la región oscura.
 */
export function dichotomyRegions(linear, width, height, sigmaDeg = 3) {
  const low = gaussianBlur(linear, width, height, (sigmaDeg * height) / 180, true);
  const rows = rowWeights(height);
  const weights = new Float32Array(width * height);
  let max = 0;
  for (let k = 0; k < low.length; k++) max = Math.max(max, low[k]);
  const scaled = new Float32Array(low.length);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      weights[k] = rows[j];
      scaled[k] = low[k] / max;
    }
  }
  const threshold = otsu(scaled, weights) * max;
  const dark = new Uint8Array(width * height);
  const sums = { dark: [0, 0], bright: [0, 0] };
  for (let k = 0; k < low.length; k++) {
    dark[k] = low[k] < threshold ? 1 : 0;
    const s = dark[k] ? sums.dark : sums.bright;
    s[0] += weights[k] * linear[k];
    s[1] += weights[k];
  }
  return {
    low,
    dark,
    threshold,
    darkMean: sums.dark[0] / sums.dark[1],
    brightMean: sums.bright[0] / sums.bright[1],
    darkFraction: sums.dark[1] / (sums.dark[1] + sums.bright[1]),
  };
}

const DEG = Math.PI / 180;

/** El hemisferio delantero: entero hasta 80° de su ápice y nada desde 110° (grados). */
const LEADING_EDGE_DEG = [80, 110];

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * El brillo medio (lineal, ponderado por el área) de dos regiones (`dark` y `bright`, máscaras de 0 y
 * 1) de un mapa.
 */
function regionMeansOf(linear, { dark, bright }, width, height) {
  const rows = rowWeights(height);
  const sums = { dark: [0, 0], bright: [0, 0] };
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if (dark[k]) {
        sums.dark[0] += rows[j] * linear[k];
        sums.dark[1] += rows[j];
      }
      if (bright[k]) {
        sums.bright[0] += rows[j] * linear[k];
        sums.bright[1] += rows[j];
      }
    }
  }
  return { dark: sums.dark[0] / sums.dark[1], bright: sums.bright[0] / sums.bright[1] };
}

const regionRatio = (linear, regions, width, height) => {
  const means = regionMeansOf(linear, regions, width, height);
  return means.dark / means.bright;
};

/** El brillo medio (lineal, ponderado por el área) de cada región de `regions` en un mapa. */
function regionMeans(linear, regions, width, height) {
  const rows = rowWeights(height);
  const sums = { dark: [0, 0], bright: [0, 0] };
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      const s = regions.dark[k] ? sums.dark : sums.bright;
      s[0] += rows[j] * linear[k];
      s[1] += rows[j];
    }
  }
  return { dark: sums.dark[0] / sums.dark[1], bright: sums.bright[0] / sums.bright[1] };
}

/**
 * Las escalas (σ, grados sobre la esfera): la de las regiones (la de la dicotomía: con 3°, las zonas
 * grises del hemisferio trasero caían en la oscura) y la del factor (el detalle por debajo se conserva).
 * La transición, del 25 % del umbral a cada lado: las manchas oscuras del borde se oscurecen en parte.
 */
const REGION_SIGMA_DEG = 6;
const GAIN_SIGMA_DEG = 1.5;
const TRANSITION = 0.25;

/**
 * Lleva el cociente entre el brillo medio de la región oscura y el de la clara de un mapa (RGB de 8
 * bits en sRGB, equirrectangular; lo cambia en el sitio) a `ratio`: cada píxel, por un factor que vale
 * k en la región oscura y 1 en la clara (el hielo claro no cambia), con una transición suave alrededor
 * del umbral, sobre su brillo a gran escala. k, buscado (bisección) para que el cociente medido sea
 * `ratio`. Devuelve el cociente antes y después, la fracción de la región oscura, k y el brillo medio
 * de la región clara después (lineal: con él se calibra el albedo). `alsoApplyTo`: otros mapas del mismo
 * tamaño (el recreado) a los que se aplica el mismo factor, píxel a píxel.
 */
export function applyDichotomy(data, width, height, ratio, { alsoApplyTo = [] } = {}) {
  const n = width * height;
  const linear = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    linear[k] =
      0.2126 * toLinear(data[3 * k]) +
      0.7152 * toLinear(data[3 * k + 1]) +
      0.0722 * toLinear(data[3 * k + 2]);
  }
  const otsu = dichotomyRegions(linear, width, height, REGION_SIGMA_DEG);
  // El hemisferio delantero (su ápice, a 90° O: −90° E) y el trasero (a 90° E), por la distancia
  // angular de cada píxel a su ápice; el material oscuro se busca solo en el delantero.
  const leading = new Float32Array(n);
  const measureRegions = { dark: new Uint8Array(n), bright: new Uint8Array(n) };
  for (let j = 0; j < height; j++) {
    const lat = (90 - ((j + 0.5) * 180) / height) * DEG;
    for (let i = 0; i < width; i++) {
      const lon = (((i + 0.5) / width) * 360 - 180) * DEG;
      const k = j * width + i;
      // cos θ con el ápice delantero (0°, −90° E): cos φ · cos(λ + 90°).
      const theta = Math.acos(
        Math.min(1, Math.max(-1, Math.cos(lat) * Math.cos(lon + Math.PI / 2))),
      );
      leading[k] = 1 - smooth(LEADING_EDGE_DEG[0] * DEG, LEADING_EDGE_DEG[1] * DEG, theta);
      measureRegions.dark[k] = otsu.dark[k] && leading[k] > 0.5 ? 1 : 0;
      measureRegions.bright[k] = theta > Math.PI / 2 ? 1 : 0;
    }
  }
  const regions = { ...otsu, low: otsu.low };
  const before = regionRatio(linear, measureRegions, width, height);
  const low = gaussianBlur(linear, width, height, (GAIN_SIGMA_DEG * height) / 180, true);
  // La transición, alrededor del umbral de las regiones (±`TRANSITION` de su valor).
  const t = new Float32Array(n);
  const a = regions.threshold * (1 - TRANSITION);
  const b = regions.threshold * (1 + TRANSITION);
  for (let i = 0; i < n; i++) {
    const x = Math.min(1, Math.max(0, (low[i] - a) / (b - a)));
    t[i] = x * x * (3 - 2 * x);
  }
  const gain = new Float32Array(n);
  const measure = (k) => {
    for (let i = 0; i < n; i++) gain[i] = 1 - (1 - k) * (1 - t[i]) * leading[i];
    const scaled = new Float32Array(n);
    for (let i = 0; i < n; i++) scaled[i] = linear[i] * gain[i];
    return regionRatio(scaled, measureRegions, width, height);
  };
  // Con k = 1, nada cambia; el cociente baja al bajar k (bisección).
  let lo = 0;
  let hi = 1;
  for (let step = 0; step < 40; step++) {
    const mid = (lo + hi) / 2;
    if (measure(mid) > ratio) hi = mid;
    else lo = mid;
  }
  const k = (lo + hi) / 2;
  measure(k);
  for (const target of [data, ...alsoApplyTo]) {
    if (target.length !== data.length) throw new Error('La dicotomía: mapas de tamaños distintos');
    for (let i = 0; i < n; i++) {
      for (let c = 0; c < 3; c++)
        target[3 * i + c] = toSrgb8(toLinear(target[3 * i + c]) * gain[i]);
    }
  }
  // Lo medido en el mapa ya cuantizado a 8 bits.
  const final = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    final[i] =
      0.2126 * toLinear(data[3 * i]) +
      0.7152 * toLinear(data[3 * i + 1]) +
      0.0722 * toLinear(data[3 * i + 2]);
  }
  const measured = regionMeansOf(final, measureRegions, width, height);
  let darkArea = 0;
  let allArea = 0;
  const rows = rowWeights(height);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      allArea += rows[j];
      if (measureRegions.dark[j * width + i]) darkArea += rows[j];
    }
  }
  return {
    before,
    after: measured.dark / measured.bright,
    darkFraction: darkArea / allArea,
    brightMean: measured.bright,
    darkGain: k,
  };
}
