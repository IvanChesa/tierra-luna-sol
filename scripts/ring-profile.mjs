// El perfil radial de la profundidad óptica de los anillos de Saturno (fase 7, D36): la ocultación de
// β Centauri del 18-08-2008 de Cassini UVIS (COUVIS_8001 del PDS Ring-Moon Systems Node, 1 km de paso,
// con los anillos abiertos 66,7° hacia la estrella), reducido a la tira de los anillos y comprobado
// con los radios publicados de sus divisiones y de sus bordes (`data/saturn-rings.ts`).
//
// - Cada píxel de la tira toma la media de la TRANSMISIÓN e^(−τ) de las muestras que caen en él (la
//   luz que lo atraviesa), no la media de τ: una división estrecha dentro de un píxel deja pasar luz.
// - Donde la estrella no se ve (el centro del anillo B), la medida es una cota inferior: por encima de
//   la τ máxima detectable de cada muestra, o de 5, el anillo se toma por opaco (e^(−5) < 0,7 %).
// - El ruido de la medida (±0,003 en la división de Roche) se deja en 0 por debajo de 0,005, y más
//   allá del anillo F se pone a 0: ahí la línea base de la medida sube (Colwell et al., 2010).
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { SATURN_RING_FEATURES } from '../src/app/data/saturn-rings.ts';

/** τ con la que el anillo se toma por opaco. */
export const OPAQUE_TAU = 5;
/** Por debajo, ruido de la medida: τ = 0. */
export const NOISE_TAU = 0.005;

/**
 * Lee el perfil (una tabla de anchura fija con comas del PDS): el radio (columna 1, km), la τ normal
 * (columna 5; −1 donde no hay medida) y la τ máxima detectable (columna 6). Devuelve los radios
 * (crecientes) y la τ de cada muestra ya acotada.
 */
export async function loadUvisProfile(url) {
  const text = await readFile(fileURLToPath(url), 'latin1');
  const radius = [];
  const tau = [];
  let missing = 0;
  let opaque = 0;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const columns = line.split(',');
    const r = Number(columns[0]);
    const t = Number(columns[4]);
    const tMax = Number(columns[5]);
    if (!Number.isFinite(r) || !Number.isFinite(t) || !Number.isFinite(tMax)) {
      throw new Error(`Fila ilegible del perfil: «${line.slice(0, 40)}»`);
    }
    if (t === -1) {
      missing++;
      continue;
    }
    const lowerBound = tMax > 0 && t >= tMax;
    if (lowerBound || t >= OPAQUE_TAU) opaque++;
    radius.push(r);
    tau.push(lowerBound ? OPAQUE_TAU : Math.min(Math.max(t, 0), OPAQUE_TAU));
  }
  for (let i = 1; i < radius.length; i++) {
    if (!(radius[i] > radius[i - 1])) throw new Error('Los radios del perfil no son crecientes');
  }
  return {
    radius: Float64Array.from(radius),
    tau: Float64Array.from(tau),
    report: `perfil de τ: ${radius.length} muestras de ${radius[0]} a ${radius.at(-1)} km (sin medida, ${missing}; opacas, ${opaque})`,
  };
}

/**
 * τ de cada píxel de una tira de `width` px que cubre de `innerKm` a `outerKm` (el píxel x, de
 * innerKm + x·paso a innerKm + (x + 1)·paso): la media de la transmisión de sus muestras. Un píxel sin
 * muestras toma la transmisión interpolada entre sus vecinos.
 */
export function ringStripTau(profile, innerKm, outerKm, width) {
  const kmPerPx = (outerKm - innerKm) / width;
  const sum = new Float64Array(width);
  const count = new Uint32Array(width);
  for (let i = 0; i < profile.radius.length; i++) {
    const x = Math.floor((profile.radius[i] - innerKm) / kmPerPx);
    if (x < 0 || x >= width) continue;
    sum[x] += Math.exp(-profile.tau[i]);
    count[x]++;
  }
  const transmission = new Float64Array(width).fill(Number.NaN);
  for (let x = 0; x < width; x++) if (count[x]) transmission[x] = sum[x] / count[x];
  for (let x = 0; x < width; x++) {
    if (!Number.isNaN(transmission[x])) continue;
    let left = x - 1;
    while (left >= 0 && Number.isNaN(transmission[left])) left--;
    let right = x + 1;
    while (right < width && Number.isNaN(transmission[right])) right++;
    if (left < 0 && right >= width) throw new Error('El perfil no cubre la tira');
    if (left < 0) transmission[x] = transmission[right];
    else if (right >= width) transmission[x] = transmission[left];
    else {
      const t = (x - left) / (right - left);
      transmission[x] = transmission[left] + t * (transmission[right] - transmission[left]);
    }
  }
  const beyondF = SATURN_RING_FEATURES.fToKm + 50;
  return Float64Array.from(transmission, (value, x) => {
    const tau = -Math.log(Math.max(value, Math.exp(-OPAQUE_TAU)));
    const radius = innerKm + (x + 0.5) * kmPerPx;
    return tau < NOISE_TAU || radius > beyondF ? 0 : tau;
  });
}

/**
 * Comprueba una tira (τ por píxel) con los radios publicados y devuelve lo medido y un informe; falla
 * si algo no cuadra:
 * - cada división, vacía por dentro (su τ mínima, < 0,05 y < 1/4 de la mediana del anillo a sus lados,
 *   de 20 a 150 km de sus bordes): con la tira desplazada más que su anchura, fallaría;
 * - el borde interior del anillo C (donde τ pasa de 0,02), a ±15 km; el exterior del A (donde baja de
 *   0,05), a ±20 km (tiene 7 lóbulos de 12,8 km); el exterior del B (donde baja de 1), a ±100 km (no
 *   es circular); y el núcleo del F (su τ máxima), dentro de su extensión.
 */
export function checkRingFeatures(tau, innerKm, outerKm) {
  const width = tau.length;
  const kmPerPx = (outerKm - innerKm) / width;
  const radiusOf = (x) => innerKm + (x + 0.5) * kmPerPx;
  const between = (from, to) => {
    const list = [];
    for (let x = 0; x < width; x++) {
      const r = radiusOf(x);
      if (r >= from && r <= to) list.push(x);
    }
    return list;
  };
  const median = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.floor((sorted.length - 1) / 2)];
  };
  const features = SATURN_RING_FEATURES;
  const gaps = {};
  const problems = [];
  for (const [id, gap] of Object.entries(features.gaps)) {
    const inside = Math.min(...between(gap.fromKm, gap.toKm).map((x) => tau[x]));
    const sides = median(
      [
        ...between(gap.fromKm - 150, gap.fromKm - 20),
        ...between(gap.toKm + 20, gap.toKm + 150),
      ].map((x) => tau[x]),
    );
    gaps[id] = { minTau: Number(inside.toFixed(4)), sidesTau: Number(sides.toFixed(4)) };
    if (!(inside < 0.05 && inside < 0.25 * sides)) {
      problems.push(`la división de ${gap.name} no está vacía (τ ${inside} frente a ${sides})`);
    }
  }
  /**
   * El radio donde τ cruza un umbral entre dos radios, de un píxel al siguiente: el primer cruce hacia
   * arriba (un borde interior) o el último hacia abajo (uno exterior: antes hay huecos, como la división
   * de Keeler junto al borde del A).
   */
  const crossing = (from, to, rising, threshold) => {
    let found = Number.NaN;
    for (const x of between(from, to)) {
      const next = tau[x + 1];
      if (next === undefined) break;
      if (rising && tau[x] <= threshold && next > threshold) return radiusOf(x) + kmPerPx / 2;
      if (!rising && tau[x] > threshold && next <= threshold) found = radiusOf(x) + kmPerPx / 2;
    }
    return found;
  };
  const fCore = between(features.fFromKm, features.fToKm).reduce(
    (best, x) => (tau[x] > tau[best] ? x : best),
    between(features.fFromKm, features.fToKm)[0],
  );
  const edges = {
    cInnerKm: Math.round(crossing(features.cInnerKm - 500, features.cInnerKm + 500, true, 0.02)),
    // Hasta 200 km por fuera: más allá está el anillito de Huygens (117 806–117 824 km, τ de 1 a 2).
    bOuterKm: Math.round(crossing(features.bOuterKm - 600, features.bOuterKm + 200, false, 1)),
    aOuterKm: Math.round(crossing(features.aOuterKm - 300, features.aOuterKm + 300, false, 0.05)),
    fCoreKm: Math.round(radiusOf(fCore)),
  };
  const tolerances = { cInnerKm: 15, bOuterKm: 100, aOuterKm: 20 };
  for (const [key, tolerance] of Object.entries(tolerances)) {
    if (!(Math.abs(edges[key] - features[key]) <= tolerance)) {
      problems.push(`${key}: ${edges[key]} km (publicado ${features[key]} ± ${tolerance})`);
    }
  }
  if (!(edges.fCoreKm >= features.fFromKm && edges.fCoreKm <= features.fToKm)) {
    problems.push(`el núcleo del anillo F, a ${edges.fCoreKm} km, fuera de su extensión`);
  }
  if (problems.length) throw new Error(`La tira de los anillos no cuadra: ${problems.join('; ')}`);
  const showGaps = Object.entries(gaps)
    .map(([id, g]) => `${features.gaps[id].name} τ ${g.minTau} (a sus lados ${g.sidesTau})`)
    .join(', ');
  return {
    gaps,
    edges,
    report: `anillos, rasgos (${kmPerPx.toFixed(2)} km/px): divisiones vacías: ${showGaps}; bordes: C ${edges.cInnerKm} km (publicado ${features.cInnerKm}), B ${edges.bOuterKm} (${features.bOuterKm}), A ${edges.aOuterKm} (${features.aOuterKm}), núcleo del F ${edges.fCoreKm} (${features.fCoreKm})`,
  };
}
