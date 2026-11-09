// Lo real con luz rasante (D48, entrega 10.a; revisión del bloque S, S1). No es albedo, sino la luz con
// que se hizo la foto:
// - la franja de lo real fotografiada junto al terminador de la Voyager 2 (en las lunas de Urano, en
//   1986, con el Sol sobre su hemisferio sur: lo no visto es su noche polar). Ahí el brillo cae hacia el
//   borde y las sombras de los cráteres se alargan hasta el negro;
// - las uniones rectas del mosaico: en los mapas del JPL (las cinco de Urano y Deimos), la última columna,
//   la de la longitud 180°, es más oscura que sus vecinas (un 75 % de su brillo), y en Miranda se juntan
//   ahí dos imágenes con otra luz.
// Pasa a una clase propia de la máscara (`GRAZING`), con su porcentaje. Su brillo a gran escala se lleva
// al de lo real vecino (en luz lineal: la luz multiplica el albedo) y, en la franja del terminador, sus
// sombras se funden en la transición hacia lo recreado (`realWeight`). El resto de lo real sigue igual
// byte a byte. Determinista y sin dependencias.

import { boxBlur, distanceTo, gaussianBlur, rowWeights } from './moon-maps.mjs';

/** Las clases de la máscara (las de `moon-maps.mjs`, y la de la luz rasante). */
export const REAL = 0;
export const FAR = 1;
export const NONE = 2;
export const GRAZING = 3;

/** Los dos tipos de luz rasante, para el informe: la franja del terminador y la unión de 180°. */
export const TERMINATOR = 1;
export const SEAM = 2;

/**
 * Los parámetros (en grados de la esfera, o en columnas del mapa de 2k en la unión):
 * - el perfil del terminador: el L* medio de lo real por distancia a lo no visto, en pasos de
 *   `profileStepDeg`; su meseta, la mediana entre `plateauDeg`; y la franja, hasta donde el perfil queda
 *   a menos de `toleranceL` de la meseta y la parte de sombras (L* < `shadowL`) no pasa de `shadowShare`
 *   (o del doble de la de la meseta), entre `minWidthDeg` y `maxWidthDeg`;
 * - la corrección: las medias por rodajas de `sliceDeg` a lo largo del borde (σ = `alongDeg`), frente a la
 *   de lo real de una banda de `refBandDeg` más allá de la franja; la ganancia, hasta `maxGain`;
 * - el fundido hacia lo recreado: lo corregido pesa de 0 (a `fade[0]` de la anchura) a 1 (a `fade[1]`),
 *   y nada en una sombra (lo corregido de `shadowBelowL[0]` a `shadowBelowL[1]` L* por debajo del brillo
 *   a gran escala que se le pide), suavizado con σ = `fadeBlur` texeles;
 * - la unión de 180°: `seamColumns` columnas a cada lado, entre las medias de las `anchorColumns`
 *   columnas de fuera (σ vertical, `seamSigma`).
 */
export const GRAZING_PARAMS = {
  profileStepDeg: 0.5,
  plateauDeg: [8, 14],
  toleranceL: 2,
  shadowL: 10,
  shadowShare: 0.02,
  minWidthDeg: 1,
  maxWidthDeg: 8,
  sliceDeg: 0.5,
  alongDeg: 3,
  refBandDeg: 3,
  maxGain: 6,
  fade: [0.15, 0.9],
  shadowBelowL: [10, 25],
  fadeBlur: 1.5,
  seamColumns: 12,
  anchorColumns: 8,
  seamSigma: 6,
};

const LUMA = [0.2126, 0.7152, 0.0722];
const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const toSrgb = (v) => {
  const c = Math.min(Math.max(v, 0), 1);
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
};
const yOfLightness = (L) => {
  const f = (L + 16) / 116;
  return f ** 3 > 216 / 24389 ? f ** 3 : (116 * f - 16) / (24389 / 27);
};
const lightnessOfY = (y) => {
  const f = y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116;
  return 116 * f - 16;
};
const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** La luminancia lineal de cada píxel de un mapa RGB (sRGB de 0 a 1). */
function luminanceOf(rgb, pixels) {
  const Y = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    Y[k] =
      LUMA[0] * toLinear(rgb[3 * k]) +
      LUMA[1] * toLinear(rgb[3 * k + 1]) +
      LUMA[2] * toLinear(rgb[3 * k + 2]);
  }
  return Y;
}

/** La media normalizada de `Y` sobre `mask` a la escala σ (texeles; NaN donde no llega). */
function maskedMean(Y, mask, width, height, sigma, minWeight = 1e-3) {
  const num = new Float32Array(Y.length);
  const den = new Float32Array(Y.length);
  for (let k = 0; k < Y.length; k++) {
    den[k] = mask[k] ? 1 : 0;
    num[k] = den[k] * Y[k];
  }
  const n = boxBlur(num, width, height, sigma);
  const d = boxBlur(den, width, height, sigma);
  const out = new Float32Array(Y.length);
  for (let k = 0; k < out.length; k++) out[k] = d[k] > minWeight ? n[k] / d[k] : NaN;
  return out;
}

/**
 * El perfil del terminador de una luna: el L* medio de lo real (por el área) en cada paso de distancia a
 * lo no visto, la parte de sombras de cada paso, su meseta y la anchura de la franja con luz rasante
 * (0 si el perfil no cae: Tritón, cuyo mosaico ya está corregido de la luz).
 */
export function terminatorProfile(rgb, classes, width, height, params = {}) {
  const P = { ...GRAZING_PARAMS, ...params };
  const pixels = width * height;
  const Y = luminanceOf(rgb, pixels);
  const none = Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0));
  const reach = Math.ceil(((P.plateauDeg[1] + 1) * width) / 360);
  const d = distanceTo(none, width, height, reach);
  const weights = rowWeights(height);
  const steps = Math.ceil(P.plateauDeg[1] / P.profileStepDeg);
  const acc = Array.from({ length: steps }, () => [0, 0, 0]);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if (classes[k] !== REAL) continue;
      const step = Math.floor((d[k] * 360) / width / P.profileStepDeg);
      if (step >= steps) continue;
      const L = lightnessOfY(Y[k]);
      acc[step][0] += weights[j] * L;
      acc[step][1] += weights[j];
      if (L < P.shadowL) acc[step][2] += weights[j];
    }
  }
  const bins = acc.map(([sum, n, dark], s) => ({
    fromDeg: s * P.profileStepDeg,
    L: n ? sum / n : NaN,
    shadow: n ? dark / n : NaN,
    weight: n,
  }));
  const plateauBins = bins.filter(
    (b) => b.fromDeg >= P.plateauDeg[0] && b.fromDeg < P.plateauDeg[1] && b.weight > 0,
  );
  if (!plateauBins.length) return { bins, plateau: NaN, plateauShadow: NaN, widthDeg: 0 };
  const sorted = plateauBins.map((b) => b.L).sort((a, b) => a - b);
  const plateau = sorted[Math.floor(sorted.length / 2)];
  const plateauShadow =
    plateauBins.reduce((s, b) => s + b.shadow * b.weight, 0) /
    plateauBins.reduce((s, b) => s + b.weight, 0);
  const shadowLimit = Math.max(P.shadowShare, 2 * plateauShadow);
  // Desde fuera hacia dentro: el primer paso que no cumple marca el final de la franja.
  let widthDeg = 0;
  for (
    let s = plateauBins[0] ? Math.round(P.plateauDeg[0] / P.profileStepDeg) - 1 : 0;
    s >= 0;
    s--
  ) {
    const b = bins[s];
    if (!b.weight) continue;
    if (b.L < plateau - P.toleranceL || b.shadow > shadowLimit) {
      widthDeg = b.fromDeg + P.profileStepDeg;
      break;
    }
  }
  if (widthDeg > 0) widthDeg = Math.min(P.maxWidthDeg, Math.max(P.minWidthDeg, widthDeg));
  return { bins, plateau, plateauShadow, widthDeg };
}

/**
 * Las clases con la luz rasante (`GRAZING`): lo real o lo visto de lejos a menos de `widthDeg` de lo no
 * visto (con `terminator`) y a menos de `seamColumns` columnas de la longitud 180° (con `seam`). Devuelve
 * las clases nuevas, el tipo de cada píxel con luz rasante (`TERMINATOR` o `SEAM`) y la distancia a lo
 * no visto (texeles).
 */
export function grazingClasses(
  classes,
  width,
  height,
  { widthDeg = 0, seam = false },
  params = {},
) {
  const P = { ...GRAZING_PARAMS, ...params };
  const pixels = width * height;
  const out = Uint8Array.from(classes);
  const kind = new Uint8Array(pixels);
  const none = Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0));
  const widthTex = (widthDeg * width) / 360;
  const d = distanceTo(none, width, height, Math.ceil(widthTex) + 2);
  for (let j = 0; j < height; j++) {
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if (classes[k] !== REAL && classes[k] !== FAR) continue;
      if (widthTex > 0 && d[k] < widthTex) {
        out[k] = GRAZING;
        kind[k] = TERMINATOR;
      } else if (seam && (i < P.seamColumns || i >= width - P.seamColumns)) {
        out[k] = GRAZING;
        kind[k] = SEAM;
      }
    }
  }
  return { classes: out, kind, distance: d, widthTex };
}

/**
 * La corrección de lo real con luz rasante (`grazingClasses`): devuelve el mapa corregido (RGB, sRGB de
 * 0 a 1; fuera de la luz rasante, igual) y el peso de lo corregido en el mapa final (`realWeight`: 1 en
 * la unión de 180°; en la franja del terminador, el fundido hacia lo recreado, sin las sombras).
 * - La franja del terminador: la media de cada rodaja de distancia a lo no visto, a lo largo del borde,
 *   frente a la de lo real de la banda de más allá de la franja: su cociente es lo que la luz rasante le
 *   quitaba, y se le devuelve (en luz lineal, con la ganancia acotada).
 * - La unión de 180°: en cada columna de la franja, su media vertical frente a la recta entre las medias
 *   de lo real de fuera de los dos lados (sin el escalón ni la columna oscura).
 */
export function correctGrazing(rgb, grazing, width, height, params = {}) {
  const P = { ...GRAZING_PARAMS, ...params };
  const { classes, kind, distance, widthTex } = grazing;
  const pixels = width * height;
  const Y = luminanceOf(rgb, pixels);
  const gain = new Float32Array(pixels).fill(1);
  const local = new Float32Array(pixels);
  const realWeight = new Float32Array(pixels).fill(1);
  // La franja del terminador.
  if (widthTex > 0) {
    const sliceTex = (P.sliceDeg * width) / 360;
    const slices = Math.ceil(widthTex / sliceTex);
    const along = (P.alongDeg * width) / 360;
    const means = [];
    for (let s = 0; s < slices; s++) {
      const mask = new Uint8Array(pixels);
      for (let k = 0; k < pixels; k++) {
        if (kind[k] === TERMINATOR && Math.floor(distance[k] / sliceTex) === s) mask[k] = 1;
      }
      means.push(maskedMean(Y, mask, width, height, along));
    }
    const band = new Uint8Array(pixels);
    const bandTex = (P.refBandDeg * width) / 360;
    const far = distanceTo(
      Uint8Array.from(classes, (c) => (c === NONE ? 1 : 0)),
      width,
      height,
      Math.ceil(widthTex + bandTex) + 2,
    );
    for (let k = 0; k < pixels; k++) {
      if (classes[k] === REAL && far[k] >= widthTex && far[k] < widthTex + bandTex) band[k] = 1;
    }
    const reference = maskedMean(Y, band, width, height, Math.max(along, 0.75 * widthTex));
    for (let k = 0; k < pixels; k++) {
      if (kind[k] !== TERMINATOR) continue;
      const u = distance[k] / sliceTex - 0.5;
      const s0 = Math.min(slices - 1, Math.max(0, Math.floor(u)));
      const s1 = Math.min(slices - 1, s0 + 1);
      const t = Math.min(1, Math.max(0, u - s0));
      const a = means[s0][k];
      const b = means[s1][k];
      const here = Number.isNaN(a) ? b : Number.isNaN(b) ? a : a * (1 - t) + b * t;
      const ref = reference[k];
      if (Number.isNaN(here) || Number.isNaN(ref) || here <= 0) continue;
      local[k] = here;
      gain[k] = Math.min(P.maxGain, Math.max(1 / P.maxGain, ref / here));
    }
  }
  // La unión de 180°: columna a columna, su media vertical frente a la recta entre las dos anclas.
  const seamCols = [];
  for (let c = 0; c < P.seamColumns; c++) seamCols.push(width - P.seamColumns + c);
  for (let c = 0; c < P.seamColumns; c++) seamCols.push(c);
  if (seamCols.some((x) => kind.some((v, k) => v === SEAM && k % width === x))) {
    const valid = Uint8Array.from(classes, (c) => (c === NONE ? 0 : 1));
    const columnMean = (x) => {
      const num = new Float32Array(height);
      const den = new Float32Array(height);
      for (let j = 0; j < height; j++) {
        const k = j * width + x;
        den[j] = valid[k];
        num[j] = valid[k] * Y[k];
      }
      return { num, den };
    };
    const vblur = (arr) => {
      const out = new Float32Array(height);
      const radius = Math.ceil(3 * P.seamSigma);
      for (let j = 0; j < height; j++) {
        let s = 0;
        let w = 0;
        for (let r = -radius; r <= radius; r++) {
          const y = Math.min(Math.max(j + r, 0), height - 1);
          const g = Math.exp(-(r * r) / (2 * P.seamSigma * P.seamSigma));
          s += g * arr[y];
          w += g;
        }
        out[j] = s / w;
      }
      return out;
    };
    const smoothColumn = (x) => {
      const { num, den } = columnMean(x);
      const n = vblur(num);
      const d = vblur(den);
      return Float32Array.from(n, (v, j) => (d[j] > 0.05 ? v / d[j] : NaN));
    };
    const anchorOf = (xs) => {
      const cols = xs.map(smoothColumn);
      return Float32Array.from({ length: height }, (_, j) => {
        let s = 0;
        let n = 0;
        for (const col of cols) {
          if (!Number.isNaN(col[j])) {
            s += col[j];
            n++;
          }
        }
        return n ? s / n : NaN;
      });
    };
    const left = anchorOf(
      Array.from({ length: P.anchorColumns }, (_, c) => width - P.seamColumns - 1 - c),
    );
    const right = anchorOf(Array.from({ length: P.anchorColumns }, (_, c) => P.seamColumns + c));
    // La posición de cada columna entre los centros de las dos anclas (de 0, la izquierda, a 1).
    const span = 2 * P.seamColumns + P.anchorColumns;
    seamCols.forEach((x, c) => {
      const u = (P.anchorColumns / 2 + 0.5 + c) / span;
      const own = smoothColumn(x);
      for (let j = 0; j < height; j++) {
        const k = j * width + x;
        if (kind[k] !== SEAM) continue;
        const a = left[j];
        const b = right[j];
        if (Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(own[j]) || own[j] <= 0) continue;
        const target = a * (1 - u) + b * u;
        local[k] = own[j];
        gain[k] = Math.min(P.maxGain, Math.max(1 / P.maxGain, target / own[j]));
      }
    });
  }
  // El mapa corregido: el brillo a gran escala de cada píxel (su media local, `local`), llevado al de lo
  // real vecino (`local` × `gain`), como un desplazamiento de su L*. Sin multiplicar el detalle: en la
  // franja, el detalle fino son sobre todo las sombras de la luz rasante, y con la ganancia (hasta ×6)
  // saldrían más marcadas aún.
  const out = Float32Array.from(rgb);
  const shift = new Float32Array(pixels);
  const L = new Float32Array(pixels);
  for (let k = 0; k < pixels; k++) {
    L[k] = lightnessOfY(Y[k]);
    if (classes[k] !== GRAZING || gain[k] === 1 || !(local[k] > 0)) continue;
    // En la franja del terminador, la corrección se apaga en su borde interior (sin escalón con lo real).
    const taper =
      kind[k] === TERMINATOR ? 1 - smoothstep(0.75 * widthTex, widthTex, distance[k]) : 1;
    shift[k] = taper * (lightnessOfY(local[k] * gain[k]) - lightnessOfY(local[k]));
    const to = Math.min(100, Math.max(0, L[k] + shift[k]));
    const ratio = yOfLightness(to) / Math.max(Y[k], 1e-6);
    for (let c = 0; c < 3; c++) out[3 * k + c] = toSrgb(toLinear(rgb[3 * k + c]) * ratio);
  }
  // El fundido de la franja del terminador hacia lo recreado: por la distancia a lo no visto y sin las
  // sombras (lo corregido muy por debajo del brillo a gran escala que se le pide: una sombra no se
  // recupera con un desplazamiento). Suavizado, para que el paso de lo uno a lo otro no deje bordes rotos.
  if (widthTex > 0) {
    const shadow = new Float32Array(pixels);
    for (let k = 0; k < pixels; k++) {
      if (kind[k] !== TERMINATOR || !(local[k] > 0)) continue;
      const below = lightnessOfY(local[k] * gain[k]) - (L[k] + shift[k]);
      shadow[k] = smoothstep(P.shadowBelowL[0], P.shadowBelowL[1], below);
    }
    const soft = gaussianBlur(shadow, width, height, P.fadeBlur, true);
    const weight = new Float32Array(pixels).fill(1);
    for (let k = 0; k < pixels; k++) {
      if (kind[k] !== TERMINATOR) continue;
      const byDistance = smoothstep(P.fade[0] * widthTex, P.fade[1] * widthTex, distance[k]);
      weight[k] = byDistance * (1 - soft[k]);
    }
    const smooth = gaussianBlur(weight, width, height, P.fadeBlur, true);
    for (let k = 0; k < pixels; k++) if (kind[k] === TERMINATOR) realWeight[k] = smooth[k];
  }
  return { rgb: out, gain, shift, realWeight };
}
