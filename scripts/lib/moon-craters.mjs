// Los cráteres de lo recreado (D48, entrega 10.a; revisión del bloque S, S1): lo no visto, «con forma
// del terreno de esa luna, sin manchas de ruido: cráteres con la población y el albedo de su hemisferio
// real». En la 9b, lo no visto de Oberón y de Titania salía de parches de su real llevados a un brillo
// regional hecho con otra recreación a 1/4 de resolución: manchas de camuflaje, sin forma de cráter.
//
// 1. La población de lo real (`spotPopulation`): las manchas claras y oscuras de su L*, por escala, como
//    extremos del espacio de escalas (diferencias de gaussianas de σ a 1,6 σ, de 1,5 a 17 texeles de 2k:
//    de unos 0,4° a 5°), por encima de un umbral relativo al relieve de cada escala. De cada escala y
//    signo: cuántas hay por estereorradián de lo real y su contraste (L*).
// 2. Los cráteres (`craterLayer`): en lo que se recrea, con esa misma densidad por escala y signo, en
//    sitios al azar sobre la esfera (determinista: semilla fija), con el contraste de una mancha real de
//    esa escala y signo (al azar entre las medidas). Una mancha oscura es un cráter de fondo oscuro con
//    su borde claro; una clara, un cráter claro con su halo y, los más claros de los grandes, con rayos
//    (los «rayos claros» de Oberón y de Titania). Perfiles radiales, sin dirección de luz: se ven como
//    albedo, como lo real cerca del polo sur, con el Sol alto. Se desenfocan como la resolución de lo real.
// 3. La calibración (`calibrateCraters`): el contraste a gran escala de lo recreado (la desviación típica
//    de su L* desenfocado) se lleva al de lo real, con un factor común a todos los cráteres.
// Es ilustrativo: ni las posiciones ni los tamaños son los de esa luna, solo su estadística.

import { mulberry32 } from './moon-recreate.mjs';
import { sphereFbm } from './moon-recipes.mjs';
import { boxBlur, gaussianBlur, lowPassContrast, rowWeights } from './moon-maps.mjs';

/** Las escalas de la población (σ de la gaussiana menor, texeles de 2k) y el cociente de la mayor. */
export const SPOT_SCALES = [1.5, 2.1, 3, 4.2, 6, 8.5, 12, 17];
const RATIO = 1.6;

/**
 * Los parámetros:
 * - `threshold`: una mancha cuenta si su respuesta pasa de este múltiplo de la desviación típica de la
 *   respuesta a esa escala en lo real (el relieve de fondo);
 * - `maxLat`: solo entre ±`maxLat` (el equirrectangular estira los polos);
 * - `minRegion`: en cada escala, solo donde lo real llena al menos esta parte del entorno (sin el borde);
 * - `radiusPerScale`: el radio del cráter (en texeles) por cada texel de σ de su escala;
 * - `rays`: con rayos, los cráteres claros de las escalas desde `rays.fromScale` y por encima del
 *   percentil `rays.quantile` de contraste; de `rays.count` rayos, de `rays.width` rad de ancho, hasta
 *   `rays.reach` radios;
 * - `targetContrast`: el contraste a gran escala de lo recreado frente al de lo real (σ = `contrastSigma`).
 */
export const CRATER_PARAMS = {
  threshold: 1.5,
  maxLat: 60,
  minRegion: 0.9,
  radiusPerScale: 1.6,
  rays: {
    fromScale: 4.2,
    quantile: 0.9,
    count: [7, 14],
    width: [0.08, 0.2],
    reach: [3, 5],
    strength: 0.3,
  },
  /** La parte de las manchas que se pintan difusas (sin borde) y no como cráter. */
  blobShare: 0.6,
  /** Lo irregular del contorno: armónicos 2 a 4 del radio, de hasta esta amplitud cada uno. */
  outline: 0.07,
  targetContrast: 0.9,
  contrastSigma: 8,
  /** La latitud hasta la que se mide el contraste de lo real (sin lo más estirado del polo). */
  contrastMaxLat: 60,
  /** Lo más que oscurece un cráter (L*): por debajo, se comprime (como una sombra, no un agujero). */
  maxDarkening: 18,
};

const blurOf = (src, width, height, sigma) =>
  sigma > 3 ? boxBlur(src, width, height, sigma) : gaussianBlur(src, width, height, sigma, true);

/** La pila de diferencias de gaussianas de `L` (de las escalas `SPOT_SCALES`). */
export function dogStack(L, width, height) {
  return SPOT_SCALES.map((s) => {
    const a = blurOf(L, width, height, s);
    const b = blurOf(L, width, height, RATIO * s);
    const d = new Float32Array(L.length);
    for (let k = 0; k < d.length; k++) d[k] = a[k] - b[k];
    return d;
  });
}

/**
 * Las manchas de `L` en `region` (Uint8Array): los extremos del espacio de escalas (el mayor o el menor
 * de su entorno de 3 × 3 en su escala y en las vecinas) por encima del umbral. Devuelve las manchas
 * ({ lat, lon, scale, value }), el área de cada escala (estereorradianes) y su umbral.
 */
export function detectSpots(L, region, width, height, params = {}) {
  const P = { ...CRATER_PARAMS, ...params };
  const stack = dogStack(L, width, height);
  const regionF = Float32Array.from(region, (v) => (v ? 1 : 0));
  const pixelArea = ((2 * Math.PI) / width) * (Math.PI / height);
  const weights = rowWeights(height);
  const valid = SPOT_SCALES.map((s) => {
    const fill = blurOf(regionF, width, height, RATIO * s * 1.5);
    return Uint8Array.from(fill, (f, k) => (region[k] && f >= P.minRegion ? 1 : 0));
  });
  const areas = [];
  const thresholds = [];
  stack.forEach((d, i) => {
    let s2 = 0;
    let n = 0;
    let area = 0;
    for (let j = 0; j < height; j++) {
      const lat = 90 - ((j + 0.5) / height) * 180;
      if (Math.abs(lat) > P.maxLat) continue;
      for (let x = 0; x < width; x++) {
        const k = j * width + x;
        if (!valid[i][k]) continue;
        s2 += weights[j] * d[k] * d[k];
        n += weights[j];
        area += weights[j] * pixelArea;
      }
    }
    thresholds.push(P.threshold * Math.sqrt(n ? s2 / n : 0));
    areas.push(area);
  });
  const spots = [];
  for (let i = 0; i < stack.length; i++) {
    const d = stack[i];
    for (let j = 1; j < height - 1; j++) {
      const lat = 90 - ((j + 0.5) / height) * 180;
      if (Math.abs(lat) > P.maxLat) continue;
      for (let x = 0; x < width; x++) {
        const k = j * width + x;
        const v = d[k];
        if (!valid[i][k] || Math.abs(v) < thresholds[i]) continue;
        const sign = v > 0 ? 1 : -1;
        let extreme = true;
        for (let di = -1; di <= 1 && extreme; di++) {
          const other = stack[i + di];
          if (!other) continue;
          for (let dy = -1; dy <= 1 && extreme; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (!di && !dx && !dy) continue;
              const kk = (j + dy) * width + ((x + dx + width) % width);
              if (sign * other[kk] >= sign * v) {
                extreme = false;
                break;
              }
            }
          }
        }
        if (!extreme) continue;
        spots.push({ lat, lon: -180 + ((x + 0.5) / width) * 360, scale: i, value: v });
      }
    }
  }
  return { spots, areas, thresholds };
}

/**
 * La población de manchas de lo real, por escala y signo: la densidad (por estereorradián) y los
 * contrastes medidos (L*, de la diferencia de gaussianas).
 */
export function spotPopulation(L, region, width, height, params = {}) {
  const { spots, areas, thresholds } = detectSpots(L, region, width, height, params);
  return SPOT_SCALES.map((scale, i) => {
    const bright = spots.filter((s) => s.scale === i && s.value > 0).map((s) => s.value);
    const dark = spots.filter((s) => s.scale === i && s.value < 0).map((s) => -s.value);
    return {
      scale,
      area: areas[i],
      threshold: thresholds[i],
      bright: {
        density: areas[i] ? bright.length / areas[i] : 0,
        values: bright.sort((a, b) => a - b),
      },
      dark: { density: areas[i] ? dark.length / areas[i] : 0, values: dark.sort((a, b) => a - b) },
    };
  });
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** El perfil radial de un cráter oscuro (fondo oscuro y borde claro), de amplitud 1, en r = d / R. */
const darkProfile = (r) =>
  -(1 - smoothstep(0.35, 1, r)) + 0.25 * Math.exp(-(((r - 1) / 0.18) ** 2));

/** El de un cráter claro: el interior y el borde claros y un halo que se apaga hacia fuera. */
const brightProfile = (r) =>
  (1 - smoothstep(0.4, 1.05, r)) * 0.85 +
  0.25 * Math.exp(-(((r - 1) / 0.18) ** 2)) +
  (r > 0.9 ? 0.35 * Math.exp(-(r - 0.9) / 0.8) * smoothstep(0.9, 1.1, r) : 0);

/**
 * Una mancha difusa (sin borde), para las manchas reales que no son cráteres nítidos: lo real de estas
 * lunas, a la resolución de la Voyager, es sobre todo eso. Amplitud 1 en el centro.
 */
const blobProfile = (r) => Math.exp(-(r * r) / (2 * 0.45 * 0.45));

/**
 * La respuesta (la diferencia de gaussianas en su centro, a la escala `scale`) de un cráter de amplitud 1
 * y radio `radiusPerScale` × σ, calculada una vez en un plano: para llevar cada cráter al contraste de la
 * mancha real que lo representa.
 */
function unitResponse(profile, sigma, radiusPerScale) {
  const R = radiusPerScale * sigma;
  const size = Math.ceil(12 * sigma) | 1;
  const c = (size - 1) / 2;
  const img = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) img[y * size + x] = profile(Math.hypot(x - c, y - c) / R);
  }
  const g = (s) => {
    let sum = 0;
    let wsum = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const w = Math.exp(-((x - c) ** 2 + (y - c) ** 2) / (2 * s * s));
        sum += w * img[y * size + x];
        wsum += w;
      }
    }
    return sum / wsum;
  };
  return g(sigma) - g(RATIO * sigma);
}

/**
 * La capa de cráteres (ΔL*, W × H) para `target` (Uint8Array: donde se recrea): con la población de lo
 * real (`spotPopulation`), en sitios al azar de `target` (densidad por estereorradián, la de lo real), con
 * el contraste de una mancha real de su escala y signo y un factor común `gain`. Determinista (`seed`).
 * Desenfocada con σ = `blur` texeles (la resolución de lo real). Devuelve la capa y cuántos cráteres.
 */
export function craterLayer(
  population,
  target,
  width,
  height,
  { seed = 1, gain = 1, blur = 1 } = {},
  params = {},
) {
  const P = { ...CRATER_PARAMS, ...params };
  const random = mulberry32(seed);
  const pixelArea = ((2 * Math.PI) / width) * (Math.PI / height);
  const weights = rowWeights(height);
  // El área de lo que se recrea y una lista de sus píxeles, para sortear sitios (por el área).
  let targetArea = 0;
  const cells = [];
  const cumulative = [];
  for (let j = 0; j < height; j++) {
    for (let x = 0; x < width; x++) {
      const k = j * width + x;
      if (!target[k]) continue;
      targetArea += weights[j] * pixelArea;
      cells.push(k);
      cumulative.push(targetArea);
    }
  }
  const pick = () => {
    const u = random() * targetArea;
    let lo = 0;
    let hi = cumulative.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cumulative[mid] < u) lo = mid + 1;
      else hi = mid;
    }
    const k = cells[lo];
    const j = Math.floor(k / width);
    const x = k - j * width;
    const lat = 90 - ((j + random()) / height) * 180;
    const lon = -180 + ((x + random()) / width) * 360;
    return [lat, lon];
  };
  const craters = [];
  population.forEach((level) => {
    for (const [kind, profile] of [
      ['bright', brightProfile],
      ['dark', darkProfile],
    ]) {
      const { density, values } = level[kind];
      if (!values.length || !density) continue;
      const expected = density * targetArea;
      let count = Math.floor(expected);
      if (random() < expected - count) count++;
      const response = unitResponse(profile, level.scale, P.radiusPerScale);
      const blobResponse = unitResponse(blobProfile, level.scale, P.radiusPerScale);
      const rayLimit =
        values[Math.min(values.length - 1, Math.floor(P.rays.quantile * values.length))];
      for (let n = 0; n < count; n++) {
        const value = values[Math.floor(random() * values.length)];
        const [lat, lon] = pick();
        const blob = random() < P.blobShare;
        const outline = [2, 3, 4].map((order) => ({
          order,
          amplitude: P.outline * random(),
          phase: random() * 2 * Math.PI,
        }));
        const rays =
          !blob && kind === 'bright' && level.scale >= P.rays.fromScale && value >= rayLimit
            ? {
                count:
                  P.rays.count[0] + Math.floor(random() * (P.rays.count[1] - P.rays.count[0] + 1)),
                width: () => P.rays.width[0] + random() * (P.rays.width[1] - P.rays.width[0]),
                reach: P.rays.reach[0] + random() * (P.rays.reach[1] - P.rays.reach[0]),
              }
            : null;
        craters.push({
          lat,
          lon,
          // El radio en texeles del ecuador de 2k.
          radius: P.radiusPerScale * level.scale,
          // Con signo: la respuesta del perfil oscuro ya es negativa (la de la mancha difusa, no).
          amplitude: blob
            ? (gain * (kind === 'bright' ? value : -value)) / blobResponse
            : (gain * (kind === 'bright' ? value : -value)) / response,
          profile: blob ? blobProfile : profile,
          outline,
          rays: rays
            ? Array.from({ length: rays.count }, () => ({
                angle: random() * 2 * Math.PI,
                width: rays.width(),
                strength: P.rays.strength * (0.5 + random()),
                phase: random() * 100,
              }))
            : null,
          rayReach: rays?.reach ?? 0,
        });
      }
    }
  });
  // Pintarlos, del más grande al más pequeño (los pequeños, encima).
  craters.sort((a, b) => b.radius - a.radius);
  const layer = new Float32Array(width * height);
  const texel = (2 * Math.PI) / width;
  for (const crater of craters) {
    const R = crater.radius * texel;
    const reach = (crater.rays ? Math.max(2.2, crater.rayReach) : 2.2) * R;
    const la = (crater.lat * Math.PI) / 180;
    const lo = (crater.lon * Math.PI) / 180;
    const c = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
    const east = [-Math.sin(lo), Math.cos(lo), 0];
    const north = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)];
    const y0 = Math.max(0, Math.floor(((Math.PI / 2 - (la + reach)) * height) / Math.PI));
    const y1 = Math.min(height - 1, Math.ceil(((Math.PI / 2 - (la - reach)) * height) / Math.PI));
    const polar = Math.abs(la) + reach >= Math.PI / 2 - 1e-6;
    const halfLon = polar ? Math.PI : Math.asin(Math.min(1, Math.sin(reach) / Math.cos(la)));
    const x0 = Math.floor(((lo - halfLon) / (2 * Math.PI) + 0.5) * width) - 1;
    const x1 = Math.ceil(((lo + halfLon) / (2 * Math.PI) + 0.5) * width) + 1;
    const cosReach = Math.cos(reach);
    for (let y = y0; y <= y1; y++) {
      const plat = Math.PI / 2 - ((y + 0.5) * Math.PI) / height;
      const cl = Math.cos(plat);
      const sl = Math.sin(plat);
      for (let xx = polar ? 0 : x0; xx <= (polar ? width - 1 : x1); xx++) {
        const x = ((xx % width) + width) % width;
        const plon = ((x + 0.5) / width - 0.5) * 2 * Math.PI;
        const p = [cl * Math.cos(plon), cl * Math.sin(plon), sl];
        const dot = p[0] * c[0] + p[1] * c[1] + p[2] * c[2];
        if (dot < cosReach) continue;
        const e = p[0] * east[0] + p[1] * east[1] + p[2] * east[2];
        const nn = p[0] * north[0] + p[1] * north[1] + p[2] * north[2];
        const theta = Math.atan2(nn, e);
        // El contorno, algo irregular (ni círculos perfectos ni todos iguales).
        let stretch = 1;
        for (const { order, amplitude, phase } of crater.outline) {
          stretch += amplitude * Math.cos(order * theta + phase);
        }
        const r = Math.acos(Math.min(1, dot)) / R / stretch;
        let v = r < 2.2 ? crater.profile(r) : 0;
        if (crater.rays && r > 0.8) {
          let ray = 0;
          for (const { angle, width: w, strength, phase } of crater.rays) {
            let dt = Math.abs(theta - angle) % (2 * Math.PI);
            if (dt > Math.PI) dt = 2 * Math.PI - dt;
            // Más estrechos lejos del cráter (en ángulo): un rayo es una franja de anchura casi fija; y
            // a trozos (una modulación a lo largo), como el material que salta en chorros.
            const angular = w / Math.max(1, r * 0.6);
            const patchy =
              0.55 + 0.45 * Math.sin(phase + 2.3 * r) * Math.sin(1.7 * phase + 3.7 * r);
            ray += strength * patchy * Math.exp(-((dt / angular) ** 2));
          }
          v +=
            ray *
            r ** -0.8 *
            (1 - smoothstep(0.5 * crater.rayReach, crater.rayReach, r)) *
            smoothstep(0.8, 1.3, r);
        }
        layer[y * width + x] += crater.amplitude * v;
      }
    }
  }
  const blurred = blur > 0 ? gaussianBlur(layer, width, height, blur, true) : layer;
  return { layer: blurred, count: craters.length };
}

/**
 * El factor común de los cráteres que lleva el contraste a gran escala de lo recreado (`recreated`, con
 * la capa ya sumada con factor 1) al de lo real (`targetContrast` × σ de lo real), sabiendo que el de la
 * base (sin cráteres) es `baseSigma`: σ² ≈ σ_base² + g² σ_capa². Entre 0,3 y 3.
 */
export function craterGain({ realSigma, baseSigma, layerSigma }, params = {}) {
  const P = { ...CRATER_PARAMS, ...params };
  const want = P.targetContrast * realSigma;
  if (!(layerSigma > 0)) return 1;
  const g2 = (want * want - baseSigma * baseSigma) / (layerSigma * layerSigma);
  return Math.min(3, Math.max(0.3, Math.sqrt(Math.max(g2, 0))));
}

export { lowPassContrast };

/**
 * El terreno bandeado de lo real (las coronas de Miranda, D48): los píxeles de `region` con la orientación
 * más marcada (la coherencia del tensor de estructura, el percentil `quantile`), y en ellos la escala de la
 * pila de diferencias de gaussianas con más energía: la de sus bandas. Para unas bandas senoidales de
 * longitud de onda λ, esa respuesta es máxima en σ ≈ 0,175 λ, con una amplitud de 0,334 veces la de la
 * banda. Devuelve la longitud de onda (texeles de 2k) y la amplitud (L*) de las bandas, y la parte de lo
 * real que es bandeado.
 */
export function bandedTerrain(L, region, width, height, { quantile = 0.8, maxLat = 60 } = {}) {
  const gx = new Float32Array(width * height);
  const gy = new Float32Array(width * height);
  const smooth = gaussianBlur(L, width, height, 1, true);
  for (let j = 1; j < height - 1; j++) {
    const cos = Math.max(0.2, Math.cos(((j + 0.5) / height - 0.5) * Math.PI));
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      gx[k] =
        (smooth[j * width + ((i + 1) % width)] - smooth[j * width + ((i - 1 + width) % width)]) /
        (2 * cos);
      gy[k] = (smooth[k + width] - smooth[k - width]) / 2;
    }
  }
  const t = (a) => gaussianBlur(a, width, height, 6, true);
  const jxx = t(Float32Array.from(gx, (v) => v * v));
  const jyy = t(Float32Array.from(gy, (v) => v * v));
  const jxy = t(Float32Array.from(gx, (v, k) => v * gy[k]));
  const coherence = new Float32Array(width * height);
  const candidates = [];
  for (let j = 0; j < height; j++) {
    const lat = 90 - ((j + 0.5) / height) * 180;
    if (Math.abs(lat) > maxLat) continue;
    for (let i = 0; i < width; i++) {
      const k = j * width + i;
      if (!region[k]) continue;
      const tr = jxx[k] + jyy[k];
      const det = Math.sqrt((jxx[k] - jyy[k]) ** 2 + 4 * jxy[k] ** 2);
      coherence[k] = tr > 1e-9 ? (det / tr) ** 2 : 0;
      candidates.push(coherence[k]);
    }
  }
  candidates.sort((a, b) => a - b);
  const cut = candidates[Math.floor(quantile * (candidates.length - 1))] ?? 1;
  const banded = Uint8Array.from(coherence, (c, k) => (region[k] && c >= cut && c > 0 ? 1 : 0));
  const stack = dogStack(L, width, height);
  const energies = stack.map((d) => {
    let s = 0;
    let n = 0;
    for (let k = 0; k < d.length; k++) {
      if (!banded[k]) continue;
      s += d[k] * d[k];
      n++;
    }
    return n ? Math.sqrt(s / n) : 0;
  });
  let best = 0;
  for (let i = 1; i < energies.length; i++) if (energies[i] > energies[best]) best = i;
  return {
    wavelength: SPOT_SCALES[best] / 0.175,
    amplitude: (energies[best] * Math.SQRT2) / 0.334,
    share: (1 - quantile) * 1,
    energies,
  };
}

/**
 * Las coronas de lo no visto de Miranda (D48): `count` unidades ovoides (un superelipse de exponente 3,
 * como el contorno de lado recto de Inverness y Arden, con su contorno algo irregular), dentro de `target`,
 * con bandas concéntricas que siguen su contorno (la longitud de onda y la amplitud de `bandedTerrain`) en
 * su cinturón exterior y más tenues en su núcleo. Ilustrativas: ni su sitio ni su tamaño son de Miranda
 * (sus semiejes, de `size`° de arco: los de sus coronas reales, de unos 200 a 300 km). Devuelve la capa
 * (ΔL*) y la huella de las coronas (de 0 a 1), para no poner cráteres dentro.
 */
export function coronaLayer(
  target,
  width,
  height,
  {
    wavelength,
    amplitude,
    count = 2,
    size = [
      [30, 40],
      [20, 28],
    ],
    latRange = [25, 60],
    bandFactor = 2.5,
    seed = 1,
  },
) {
  const random = mulberry32(seed);
  const layer = new Float32Array(width * height);
  const footprint = new Float32Array(width * height);
  const coronae = [];
  for (let tries = 0; coronae.length < count && tries < 500; tries++) {
    const lat = latRange[0] + random() * (latRange[1] - latRange[0]);
    const lon = -180 + random() * 360;
    const j = Math.floor(((90 - lat) / 180) * height);
    const i = Math.floor(((lon + 180) / 360) * width);
    if (!target[j * width + i]) continue;
    if (coronae.some((c) => Math.abs(((c.lon - lon + 540) % 360) - 180) < 110)) continue;
    coronae.push({
      lat,
      lon,
      a: size[0][0] + random() * (size[0][1] - size[0][0]),
      b: size[1][0] + random() * (size[1][1] - size[1][0]),
      angle: random() * Math.PI,
      phase: random() * 2 * Math.PI,
      seed: 31 + coronae.length * 7,
      outline: [2, 3, 5].map((order) => ({ order, amp: 0.06 * random(), ph: random() * 6.28 })),
    });
  }
  const lambdaDeg = (wavelength * 360) / width;
  for (let y = 0; y < height; y++) {
    const plat = Math.PI / 2 - ((y + 0.5) * Math.PI) / height;
    for (let x = 0; x < width; x++) {
      const plon = ((x + 0.5) / width - 0.5) * 2 * Math.PI;
      const k = y * width + x;
      for (const c of coronae) {
        const la = (c.lat * Math.PI) / 180;
        const lo = (c.lon * Math.PI) / 180;
        // La proyección gnomónica local (en grados de arco), girada con su orientación.
        const cosC =
          Math.sin(la) * Math.sin(plat) + Math.cos(la) * Math.cos(plat) * Math.cos(plon - lo);
        if (cosC < 0.2) continue;
        const ex = (Math.cos(plat) * Math.sin(plon - lo)) / cosC;
        const ey =
          (Math.cos(la) * Math.sin(plat) - Math.sin(la) * Math.cos(plat) * Math.cos(plon - lo)) /
          cosC;
        const u = (ex * Math.cos(c.angle) + ey * Math.sin(c.angle)) * (180 / Math.PI);
        const v = (-ex * Math.sin(c.angle) + ey * Math.cos(c.angle)) * (180 / Math.PI);
        const theta = Math.atan2(v, u);
        let stretch = 1;
        for (const o of c.outline) stretch += o.amp * Math.cos(o.order * theta + o.ph);
        const rho = (Math.abs(u / c.a) ** 3 + Math.abs(v / c.b) ** 3) ** (1 / 3) / stretch;
        if (rho > 1.25) continue;
        const edge = 1 - smoothstep(0.95, 1.15, rho);
        // La distancia al contorno, en grados (aprox.): las bandas la siguen, onduladas y a trozos (con
        // ruido sobre la esfera), como las de Arden y Elsinore, y no como anillos perfectos. Las anchas, de
        // `bandFactor` veces la longitud de onda medida; encima, las finas, más tenues.
        const latDeg = (plat * 180) / Math.PI;
        const lonDeg = (plon * 180) / Math.PI;
        const wobble = sphereFbm(latDeg, lonDeg, { frequency: 6, octaves: 3, seed: c.seed });
        const patchy = sphereFbm(latDeg, lonDeg, { frequency: 4, octaves: 3, seed: c.seed + 1 });
        const depth = (1 - rho) * Math.min(c.a, c.b) + 0.45 * bandFactor * lambdaDeg * wobble;
        const belt = smoothstep(0.25, 0.45, rho);
        const wide = Math.sin((2 * Math.PI * depth) / (bandFactor * lambdaDeg) + c.phase);
        const fine = Math.sin((2 * Math.PI * depth) / lambdaDeg + 2 * c.phase);
        const band = 0.6 * wide + 0.3 * fine;
        layer[k] +=
          amplitude *
          edge *
          band *
          (0.3 + 0.7 * belt) *
          Math.min(1, Math.max(0, 0.55 + 0.6 * patchy));
        footprint[k] = Math.max(footprint[k], edge);
      }
    }
  }
  return { layer: gaussianBlur(layer, width, height, 1.2, true), footprint, coronae };
}
