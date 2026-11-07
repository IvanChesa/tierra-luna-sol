// La recreación de lo que no se vio de una luna (D45, fase 9b; adenda del 05-11). Determinista, sin
// dependencias, sobre la esfera. EN CURSO (entrega 9b.d): aún no la usa `build-textures.mjs`.
//
// 1. El mapa equirrectangular de 2k (RGB, de 0 a 1) se lleva a un cubo equiangular de seis caras de
//    `N` × `N` (90° por cara: 512 en 2k), con un margen de `P` píxeles por lado. En un cubo equiangular
//    un píxel mide casi lo mismo en toda la cara (±15 %): ni el estiramiento ni el pellizco de los
//    polos del equirrectangular, ni una costura en ±180°. Lo no visto parte del brillo de lo visto
//    extendido (`fillUnseen`), no del gris de relleno del mosaico.
// 2. El brillo objetivo de cada píxel: en lo visto de lejos, su brillo real a una escala bien por encima
//    de su resolución de origen (σ efectiva, de `measure-moon-maps.mjs`); en lo no visto, el regional
//    (con dos niveles: el de una recreación previa a 1/4 de resolución, que pone los accidentes grandes,
//    o el de la receta).
// 3. En cada cara se sintetiza por parches (quilting, Efros y Freeman, 2001): cada parche nuevo es un
//    trozo de B × B píxeles de lo real de la misma luna (por sus unidades: `pool`), el que mejor casa
//    con lo que ya hay en su solape (lo real, las caras ya hechas y los parches anteriores); se cose por
//    el corte de menor error en cada lado, con un fundido de ~2 px. Del parche se toma su detalle, en
//    proporción a su brillo local, sobre el brillo objetivo (`predict`): sin escalones entre parches.
//    Lo real nunca se cambia. Para que no se repita, se castiga cada zona de origen ya usada.
// 4. Junto a lo real, la media de lo recreado se lleva a la de lo real (una corrección que se apaga en
//    `border` píxeles). Las caras vuelven al equirrectangular; lo real se copia tal cual.

import { distanceTo, gaussianBlur, recreationQuality } from './moon-maps.mjs';

/** Un generador de números pseudoaleatorios de 32 bits con semilla (mulberry32). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- El cubo equiangular ---------------------------------------------------------------------------

/**
 * Las seis caras: su centro `n`, su derecha `u` y su arriba `v`, en el sistema de la luna (x hacia la
 * longitud 0, y hacia 90° E, z al polo norte). En las cuatro del ecuador, arriba es el norte.
 */
export const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [0, 1, 0], u: [-1, 0, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, -1, 0], v: [0, 0, 1] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [0, 1, 0], v: [-1, 0, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];

/** La dirección (vector unitario) del píxel (x, y) de una cara de `N` px (x e y pueden salir del borde). */
export function faceDirection(face, x, y, N) {
  const a = ((x + 0.5) / N - 0.5) * (Math.PI / 2);
  const b = ((y + 0.5) / N - 0.5) * (Math.PI / 2);
  const s = Math.tan(a);
  const t = -Math.tan(b);
  const { n, u, v } = FACES[face];
  const d = [n[0] + s * u[0] + t * v[0], n[1] + s * u[1] + t * v[1], n[2] + s * u[2] + t * v[2]];
  const l = Math.hypot(d[0], d[1], d[2]);
  return [d[0] / l, d[1] / l, d[2] / l];
}

/** La cara dominante de una dirección y su posición (x, y continuas) en ella. */
export function directionToFace(d, N) {
  const ax = Math.abs(d[0]);
  const ay = Math.abs(d[1]);
  const az = Math.abs(d[2]);
  let face;
  if (ax >= ay && ax >= az) face = d[0] > 0 ? 0 : 2;
  else if (ay >= az) face = d[1] > 0 ? 1 : 3;
  else face = d[2] > 0 ? 4 : 5;
  return { face, ...faceCoords(face, d, N) };
}

/** La posición (x, y continuas, en px) de una dirección en una cara dada (puede caer fuera de ella). */
export function faceCoords(face, d, N) {
  const { n, u, v } = FACES[face];
  const dn = d[0] * n[0] + d[1] * n[1] + d[2] * n[2];
  const s = (d[0] * u[0] + d[1] * u[1] + d[2] * u[2]) / dn;
  const t = (d[0] * v[0] + d[1] * v[1] + d[2] * v[2]) / dn;
  const a = Math.atan(s);
  const b = -Math.atan(t);
  return { x: (a / (Math.PI / 2) + 0.5) * N - 0.5, y: (b / (Math.PI / 2) + 0.5) * N - 0.5 };
}

/** Latitud y longitud (grados) de una dirección. */
export const latLon = (d) => [
  (Math.asin(Math.max(-1, Math.min(1, d[2]))) * 180) / Math.PI,
  (Math.atan2(d[1], d[0]) * 180) / Math.PI,
];

/** Muestra bilineal de un mapa equirrectangular (W × H, `channels`) en una latitud y longitud. */
function sampleEquirect(map, W, H, channels, lat, lon, out) {
  const fx = ((lon + 180) / 360) * W - 0.5;
  const fy = ((90 - lat) / 180) * H - 0.5;
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const tx = fx - x0;
  const ty = fy - y0;
  const ya = Math.min(Math.max(y0, 0), H - 1);
  const yb = Math.min(Math.max(y0 + 1, 0), H - 1);
  const xa = ((x0 % W) + W) % W;
  const xb = (((x0 + 1) % W) + W) % W;
  for (let c = 0; c < channels; c++) {
    const v00 = map[(ya * W + xa) * channels + c];
    const v10 = map[(ya * W + xb) * channels + c];
    const v01 = map[(yb * W + xa) * channels + c];
    const v11 = map[(yb * W + xb) * channels + c];
    out[c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
  }
  return out;
}

/** Desenfoque gaussiano 2D (canales intercalados) de un lienzo cuadrado S × S, con el borde repetido. */
export function blurCanvas(src, S, channels, sigma) {
  const radius = Math.max(1, Math.ceil(3 * sigma));
  const kernel = new Float32Array(2 * radius + 1);
  let sum = 0;
  for (let k = -radius; k <= radius; k++) {
    kernel[k + radius] = Math.exp(-(k * k) / (2 * sigma * sigma));
    sum += kernel[k + radius];
  }
  for (let k = 0; k < kernel.length; k++) kernel[k] /= sum;
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          const xx = Math.min(Math.max(x + k, 0), S - 1);
          acc += kernel[k + radius] * src[(y * S + xx) * channels + c];
        }
        tmp[(y * S + x) * channels + c] = acc;
      }
    }
  }
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      for (let c = 0; c < channels; c++) {
        let acc = 0;
        for (let k = -radius; k <= radius; k++) {
          const yy = Math.min(Math.max(y + k, 0), S - 1);
          acc += kernel[k + radius] * tmp[(yy * S + x) * channels + c];
        }
        out[(y * S + x) * channels + c] = acc;
      }
    }
  }
  return out;
}

/** Desenfoque normalizado: solo con los píxeles de `weight` (lo real), y extendido fuera de ellos. */
function normalizedBlur(src, weight, S, channels, sigma) {
  const premultiplied = new Float32Array(src.length);
  for (let k = 0; k < S * S; k++) {
    for (let c = 0; c < channels; c++)
      premultiplied[k * channels + c] = src[k * channels + c] * weight[k];
  }
  const num = blurCanvas(premultiplied, S, channels, sigma);
  const den = blurCanvas(weight, S, 1, sigma);
  const out = new Float32Array(src.length);
  for (let k = 0; k < S * S; k++) {
    const w = den[k];
    for (let c = 0; c < channels; c++) {
      out[k * channels + c] = w > 1e-4 ? num[k * channels + c] / w : NaN;
    }
  }
  return { value: out, weight: den };
}

// --- La síntesis -----------------------------------------------------------------------------------

/** Los niveles de brillo a gran escala (σ en px de cara) entre los que se interpola la σ efectiva. */
export const LP_SIGMAS = [1, 2, 4, 8, 16];

/** Los pesos de la luminancia (Rec. 709). */
const LUMA = [0.2126, 0.7152, 0.0722];

/** Clases de cada píxel (las de `scripts/lib/moon-maps.mjs`). */
const REAL = 0;
const FAR = 1;
const NONE = 2;

/** Los parámetros de la síntesis (en px de cara: 512 por cara en 2k). */
export const SYNTHESIS = {
  /** Lado del parche y su solape con los vecinos. */
  patch: 40,
  overlap: 12,
  /** Margen de cada cara (lo que comparte con sus vecinas). */
  margin: 32,
  /** Candidatos por parche: los que se miran a grosso modo y los que se comparan enteros. */
  candidates: 320,
  finalists: 6,
  /** La escala del brillo regional que se respeta en lo no visto (σ, px). */
  regionalSigma: 16,
  /**
   * El peso del brillo a gran escala frente al solape, y el castigo por repetir: por cada vez que ya se
   * ha usado (de media) la zona de origen del candidato, medida en celdas de `usageCell` px. Por zona y
   * no por origen exacto: dos orígenes a 3 px comparten casi todo su contenido.
   */
  lowPassWeight: 0.6,
  noneWeight: 1.5,
  reusePenalty: 0.5,
  usageCell: 8,
  /**
   * El castigo por traer otro grano que el de alrededor: × (1 + `energyPenalty` · ln(E / E₀)²), con E el
   * detalle fino del origen (la raíz de la media del cuadrado de su paso alto de σ = 2 px) y E₀ el de lo
   * real que rodea el destino (su media normalizada, con σ = `energySigma` px). Con el solo error del
   * solape, el «quilting» prefiere los parches lisos (casan con todo: en Ganímedes y Rea, lo recreado salía
   * con la mitad del grano de lo real); y con la mediana de toda la luna como E₀, en una mancha de Mimas
   * entraba un relieve más duro que el de sus vecinos.
   */
  energyPenalty: 2,
  energySigma: 24,
  /**
   * La corrección de la media junto a lo real: entera hasta `borderFull` px de lo real y apagándose
   * hasta `border` px, con la media de cada lado a la escala σ = `borderSigma` px (con una corrección que
   * se apagaba desde el mismo borde, las teselas del borde llegaban a ΔL* 5).
   */
  border: 48,
  borderFull: 8,
  borderSigma: 8,
  /** La pasada fina junto al borde: [σ, entera hasta, apagada en] (px). */
  borderFine: [3, 4, 16],
  /**
   * Y la última, en el equirrectangular ya terminado (después de volver de las caras y del enfoque, que la
   * descolocarían): [σ, entera hasta, apagada en] (texeles, a escala física).
   */
  borderFinal: [1.2, 3, 10],
  /**
   * El grano que se pierde en los dos remuestreos bilineales (del mapa a las caras y de vuelta), devuelto
   * con una máscara de enfoque en lo recreado: lo recreado + `sharpen` × (lo recreado − su desenfoque
   * de σ = `sharpenSigma` px). Calibrado con `recreationQuality` (moon-maps.mjs) en Tritón: sin él, el
   * grano de lo recreado era el 66 % del de lo real vecino.
   */
  sharpen: 'auto',
  sharpenSigma: 1,
  /** El enfoque automático, entre 0 y `sharpenMax`, para llevar el grano de lo recreado al de lo real. */
  sharpenMax: 2.5,
  /**
   * Con guía (el nivel grueso), la escala a la que lo no visto la sigue (σ, px): por encima de 4 px, la
   * estructura de la recreación gruesa; por debajo, el detalle de los parches de este nivel.
   */
  guideSigma: 4,
  /**
   * Lo visto de lejos: su brillo se conserva por encima de `keep` × su resolución de origen (σ), entre
   * `keepMin` y `keepMax` px: se pone solo el detalle que el original no resolvió. Con 3 (y 2 px como
   * mínimo), en las lunas de sombras duras se perdían los bordes de los cráteres de 5 a 10 px de las zonas
   * apenas blandas de Mimas y entraba en ellas un relieve revuelto.
   */
  keep: 1.5,
  keepMin: 1.5,
  keepMax: 12,
};

/**
 * La escala (σ, px) a la que se conserva el brillo de lo visto de lejos: `keep` veces su resolución de
 * origen, entre `keepMin` y `keepMax`. Justo por encima de su resolución de origen, el detalle real
 * está atenuado (blando); bastante por encima, es nítido: de ahí para abajo lo ponen los parches.
 */
function keepSigma(sigmaEff, P) {
  return Math.min(P.keepMax, Math.max(P.keepMin, P.keep * sigmaEff));
}

/**
 * El nivel grueso (a 1/4 de resolución): sus parches cubren unos 64 px del nivel fino. Su brillo
 * regional se impone solo por encima de 16 px suyos (64 del fino, unos 260 km en Tritón): hasta ahí, los
 * parches traen su propia variación a gran escala (con 6, el casquete del norte salía plano).
 */
const COARSE = {
  patch: 16,
  overlap: 4,
  margin: 16,
  regionalSigma: 16,
  border: 10,
  borderFull: 2,
  borderSigma: 2,
  borderFine: null,
  borderFinal: null,
  sharpen: 0,
  keepMin: 0.5,
  keepMax: 3,
};

/**
 * Recrea lo que no se vio (y pone detalle en lo visto de lejos) de un mapa equirrectangular.
 * - `rgb`: Float32Array W × H × 3 (0–1), con los huecos ya rellenos (el gris de `fillGaps`);
 * - `classes`: Uint8Array W × H (0 real, 1 visto de lejos, 2 no visto);
 * - `sigmaEff`: Float32Array W × H, la resolución de origen de cada píxel en px de 2k (σ gaussiana);
 * - `recipe`: `pool(lat, lon, targetLat, targetLon)` (¿vale un parche real centrado en lat/lon para un
 *   destino en targetLat/targetLon?) y `target(lat, lon, filled)` (el brillo regional de lo no visto:
 *   por defecto, el de lo visto extendido);
 * - `seed`: la semilla (determinista).
 * Devuelve el mapa nuevo (Float32Array W × H × 3), la guía del nivel grueso, lo visto extendido y las
 * estadísticas de la síntesis.
 */
export function recreate({ rgb, classes, sigmaEff, W, H, recipe = {}, seed = 1, params = {} }) {
  const P = { ...SYNTHESIS, ...params };
  const N = Math.round(W / 4);
  const M = P.margin;
  const S = N + 2 * M;
  const random = mulberry32(seed);
  const scratch = [0, 0, 0];
  // Lo no visto, con el brillo de lo visto extendido (`fillUnseen`) en lugar del relleno del mosaico:
  // de ahí sale el objetivo regional de lo no visto y el brillo a gran escala junto a ello.
  const base = classes.some((c) => c === NONE) ? fillUnseen(rgb, classes, W, H) : rgb;

  // 0. Dos niveles: si hay algo sin ver, su estructura grande sale antes de una recreación a 1/4 de
  //    resolución (sus parches cubren 4 veces más), que guía después lo no visto aquí.
  let guide = null;
  const hasNone = classes.some((c) => c === NONE);
  if (hasNone && !P.coarsePass) {
    const coarse = downsample4({ rgb: base, classes, sigmaEff, W, H });
    const result = recreate({
      ...coarse,
      recipe,
      seed: seed + 1,
      params: { ...params, coarsePass: true, ...COARSE, ...(params.coarse ?? {}) },
    });
    guide = upsample4(result.rgb, coarse.W, coarse.H);
  }

  // 1. Las caras, con su margen: color, clase, σ efectiva y la dirección de cada píxel.
  const faces = FACES.map((_, f) => {
    const color = new Float32Array(S * S * 3);
    const cls = new Uint8Array(S * S);
    const sigma = new Float32Array(S * S);
    const lat = new Float32Array(S * S);
    const lon = new Float32Array(S * S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const k = y * S + x;
        const d = faceDirection(f, x - M, y - M, N);
        const [la, lo] = latLon(d);
        lat[k] = la;
        lon[k] = lo;
        sampleEquirect(base, W, H, 3, la, lo, scratch);
        color[3 * k] = scratch[0];
        color[3 * k + 1] = scratch[1];
        color[3 * k + 2] = scratch[2];
        const i = Math.min(W - 1, Math.max(0, Math.floor(((lo + 180) / 360) * W)));
        const j = Math.min(H - 1, Math.max(0, Math.floor(((90 - la) / 180) * H)));
        cls[k] = classes[j * W + i];
        sigma[k] = keepSigma(sigmaEff[j * W + i], P);
      }
    }
    return { color, cls, sigma, lat, lon };
  });

  // 2. El brillo a gran escala de cada cara (para lo visto de lejos y para comparar parches) y el objetivo
  //    regional de lo no visto: con guía, la estructura de la recreación gruesa; sin ella, el relleno del
  //    mosaico o lo que diga la receta (`target`).
  const regionalSigma = guide ? P.guideSigma : P.regionalSigma;
  faces.forEach((face, f) => {
    face.levels = LP_SIGMAS.map((s) => blurCanvas(face.color, S, 3, s));
    if (guide) {
      const sampled = new Float32Array(S * S * 3);
      for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
          const k = y * S + x;
          sampleEquirect(guide, W, H, 3, face.lat[k], face.lon[k], scratch);
          sampled[3 * k] = scratch[0];
          sampled[3 * k + 1] = scratch[1];
          sampled[3 * k + 2] = scratch[2];
        }
      }
      face.regional = blurCanvas(sampled, S, 3, regionalSigma);
    } else {
      face.regional = blurCanvas(face.color, S, 3, regionalSigma);
      if (recipe.target) {
        for (let k = 0; k < S * S; k++) {
          if (face.cls[k] !== NONE) continue;
          const t = recipe.target(
            face.lat[k],
            face.lon[k],
            face.regional.subarray(3 * k, 3 * k + 3),
          );
          if (t) {
            face.regional[3 * k] = t[0];
            face.regional[3 * k + 1] = t[1];
            face.regional[3 * k + 2] = t[2];
          }
        }
      }
    }
    face.index = f;
    // El brillo objetivo de cada píxel (`target`) y la escala (`level`, índice en `LP_SIGMAS`) por
    // debajo de la cual el detalle viene de los parches: en lo visto de lejos, su brillo real a la escala
    // conservada; en lo no visto, el regional; en lo real, el suyo a la escala regional (solo para casar).
    const noneLevel = levelOf(regionalSigma);
    face.level = new Float32Array(S * S);
    face.target = new Float32Array(S * S * 3);
    for (let k = 0; k < S * S; k++) {
      const far = face.cls[k] === FAR;
      const level = far ? levelOf(face.sigma[k]) : noneLevel;
      face.level[k] = level;
      for (let c = 0; c < 3; c++) {
        face.target[3 * k + c] =
          face.cls[k] === NONE ? face.regional[3 * k + c] : lowPassAt(face.levels, k, level, c);
      }
    }
  });

  // 3. Los orígenes posibles: parches enteros de lo real en el interior de las caras (cada 3 px).
  const B = P.patch;
  const pool = [];
  for (let f = 0; f < 6; f++) {
    const { cls } = faces[f];
    // Una tabla de sumas de lo «no real» para saber en O(1) si un parche es todo real.
    const integral = new Int32Array((S + 1) * (S + 1));
    for (let y = 0; y < S; y++) {
      let row = 0;
      for (let x = 0; x < S; x++) {
        row += cls[y * S + x] === REAL ? 0 : 1;
        integral[(y + 1) * (S + 1) + x + 1] = integral[y * (S + 1) + x + 1] + row;
      }
    }
    for (let y = M; y + B <= M + N; y += 3) {
      for (let x = M; x + B <= M + N; x += 3) {
        const bad =
          integral[(y + B) * (S + 1) + x + B] -
          integral[y * (S + 1) + x + B] -
          integral[(y + B) * (S + 1) + x] +
          integral[y * (S + 1) + x];
        if (bad === 0) {
          const c = (y + B / 2) * S + x + B / 2;
          pool.push({ f, x, y, lat: faces[f].lat[c], lon: faces[f].lon[c] });
        }
      }
    }
  }
  if (pool.length === 0) throw new Error('Sin parches reales enteros: no hay de dónde recrear.');
  // El detalle fino de cada origen (en luminancia, cada 2 px) y su mediana.
  for (const src of pool) {
    const sf = faces[src.f];
    let sum = 0;
    let n = 0;
    for (let dy = 0; dy < B; dy += 2) {
      for (let dx = 0; dx < B; dx += 2) {
        const k = (src.y + dy) * S + src.x + dx;
        let d = 0;
        for (let c = 0; c < 3; c++) d += LUMA[c] * (sf.color[3 * k + c] - sf.levels[1][3 * k + c]);
        sum += d * d;
        n++;
      }
    }
    src.energy = Math.sqrt(sum / n);
  }
  const energies = pool.map((src) => src.energy).sort((a, b) => a - b);
  const medianEnergy = energies[Math.floor(energies.length / 2)] || 1e-6;
  // El grano que pide cada destino (para el castigo del grano, `energyPenalty`):
  // - en lo no visto, el de lo real que lo rodea (su media normalizada, σ = `energySigma`);
  // - en lo visto de lejos, el que corresponde a su propio relieve: su energía en la primera banda que sí
  //   conserva (por encima de su escala de `keep`), por la relación entre el grano fino y esa banda en lo
  //   real de la misma luna (la mediana). Así un fondo liso de cráter no recibe el relieve de sus vecinos.
  const bandEnergy = (face, a, b) => {
    const e = new Float32Array(S * S);
    for (let k = 0; k < S * S; k++) {
      let d = 0;
      for (let c = 0; c < 3; c++) {
        const hi = a < 0 ? face.color[3 * k + c] : face.levels[a][3 * k + c];
        d += LUMA[c] * (hi - face.levels[b][3 * k + c]);
      }
      e[k] = d * d;
    }
    const blurred = blurCanvas(e, S, 1, 8);
    for (let k = 0; k < S * S; k++) blurred[k] = Math.sqrt(blurred[k]);
    return blurred;
  };
  // Las bandas de referencia: [nivel de arriba, nivel de abajo] de LP_SIGMAS (2–4, 4–8 y 8–16 px).
  const BANDS = [
    [1, 2],
    [2, 3],
    [3, 4],
  ];
  const ratios = BANDS.map(() => []);
  faces.forEach((face) => {
    face.fine = bandEnergy(face, -1, 1);
    face.bands = BANDS.map(([a, b]) => bandEnergy(face, a, b));
    for (let k = 0; k < S * S; k += 7) {
      if (face.cls[k] !== REAL) continue;
      face.bands.forEach((band, j) => {
        if (band[k] > 1e-4) ratios[j].push(face.fine[k] / band[k]);
      });
    }
  });
  const spectrum = ratios.map((list) => {
    list.sort((a, b) => a - b);
    return list.length ? list[Math.floor(list.length / 2)] : 1;
  });
  faces.forEach((face) => {
    const real = new Float32Array(S * S);
    const hp = new Float32Array(S * S);
    for (let k = 0; k < S * S; k++) {
      if (face.cls[k] !== REAL) continue;
      real[k] = 1;
      hp[k] = face.fine[k] * face.fine[k];
    }
    const { value } = normalizedBlur(hp, real, S, 1, P.energySigma);
    face.localEnergy = new Float32Array(S * S);
    for (let k = 0; k < S * S; k++) {
      let wanted = Number.isNaN(value[k]) ? medianEnergy : Math.sqrt(value[k]);
      if (face.cls[k] === FAR) {
        // Una banda que la blandura no ha tocado: la de 4–8 px hasta una escala conservada de 3 px (la de
        // 2–4 ya sale atenuada con una σ de origen de 1,3 y daba poco grano: Ganímedes, 0,57) y la de
        // 8–16 px por encima.
        const keep = face.sigma[k];
        const j = keep <= 3 ? 1 : 2;
        wanted = face.bands[j][k] * spectrum[j];
      }
      face.localEnergy[k] = Math.max(wanted, 1e-4);
    }
  });
  const usage = new SourceUsage(S, B, P.usageCell);

  // 4. La síntesis, cara a cara; cada una toma como fijo lo que ya han hecho sus vecinas.
  const done = new Array(6).fill(false);
  const stats = { patches: 0, reused: 0 };
  const output = faces.map((face) => Float32Array.from(face.color));
  for (let f = 0; f < 6; f++) {
    const face = faces[f];
    const canvas = output[f];
    // fixed: 1 lo real y lo que viene de una cara ya hecha; filled: lo ya sintetizado en esta cara.
    const fixed = new Uint8Array(S * S);
    const filled = new Uint8Array(S * S);
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const k = y * S + x;
        if (face.cls[k] === REAL) {
          fixed[k] = 1;
          continue;
        }
        const inside = x >= M && x < M + N && y >= M && y < M + N;
        if (inside) continue;
        // El margen: de la cara vecina ya hecha que lo contiene.
        const d = faceDirection(f, x - M, y - M, N);
        const other = directionToFace(d, N);
        if (other.face !== f && done[other.face]) {
          sampleFace(output[other.face], S, M, other.x, other.y, scratch);
          canvas[3 * k] = scratch[0];
          canvas[3 * k + 1] = scratch[1];
          canvas[3 * k + 2] = scratch[2];
          fixed[k] = 1;
        }
      }
    }
    const step = B - P.overlap;
    for (let py = M - P.overlap; py < M + N; py += step) {
      for (let px = M - P.overlap; px < M + N; px += step) {
        const x0 = Math.max(0, Math.min(px, S - B));
        const y0 = Math.max(0, Math.min(py, S - B));
        // ¿Hay algo que sintetizar en este parche (en el interior de la cara)?
        let need = 0;
        for (let y = y0; y < y0 + B; y++) {
          for (let x = x0; x < x0 + B; x++) {
            const k = y * S + x;
            if (!fixed[k] && !filled[k] && x >= M && x < M + N && y >= M && y < M + N) need++;
          }
        }
        if (need === 0) continue;
        const best = choosePatch({
          face,
          canvas,
          fixed,
          filled,
          faces,
          pool,
          x0,
          y0,
          S,
          B,
          P,
          random,
          recipe,
          usage,
          medianEnergy,
        });
        placePatch({ face, canvas, fixed, filled, faces, source: best, x0, y0, S, B });
        if (usage.of(best) >= 0.5) stats.reused++;
        usage.mark(best);
        stats.patches++;
      }
    }
    done[f] = true;
  }

  // 6. Junto a lo real, la media de lo recreado llevada a la de lo real (sin saltos de brillo).
  // En dos escalas (la mezcla multibanda de D45): la media ancha en una franja ancha y, después, la
  // fina junto al borde, donde el brillo de lo real puede cambiar deprisa (el limbo de las imágenes).
  for (let f = 0; f < 6; f++) {
    matchBorder({
      face: faces[f],
      canvas: output[f],
      S,
      sigma: P.borderSigma,
      full: P.borderFull,
      fade: P.border,
    });
    if (P.borderFine) {
      const [sigma, full, fade] = P.borderFine;
      matchBorder({ face: faces[f], canvas: output[f], S, sigma, full, fade });
    }
  }

  // 7. Al equirrectangular: lo real, tal cual; lo demás, de su cara dominante.
  const result = Float32Array.from(rgb);
  for (let j = 0; j < H; j++) {
    const lat = 90 - ((j + 0.5) / H) * 180;
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (classes[k] === REAL) continue;
      const lon = -180 + ((i + 0.5) / W) * 360;
      const la = (lat * Math.PI) / 180;
      const lo = (lon * Math.PI) / 180;
      const d = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
      const at = directionToFace(d, N);
      sampleFace(output[at.face], S, M, at.x, at.y, scratch);
      result[3 * k] = scratch[0];
      result[3 * k + 1] = scratch[1];
      result[3 * k + 2] = scratch[2];
    }
  }
  if (P.sharpen === 'auto') calibrateSharpen(result, classes, W, H, P);
  else if (P.sharpen > 0) sharpenSynthesized(result, classes, W, H, P);
  if (P.borderFinal) matchBorderEquirect(result, classes, W, H, P.borderFinal);
  return {
    rgb: result,
    guide,
    base,
    stats: { ...stats, pool: pool.length, sharpen: P.sharpenUsed ?? P.sharpen },
  };
}

/**
 * La última corrección de la media junto a lo real (`SYNTHESIS.borderFinal`), en el equirrectangular: como
 * `matchBorder`, con los desenfoques a escala física y la distancia en texeles (chaflán, con la vuelta).
 */
function matchBorderEquirect(rgb, classes, W, H, [sigma, full, fade]) {
  const real = new Float32Array(W * H);
  const synth = new Float32Array(W * H);
  const realSet = new Uint8Array(W * H);
  for (let k = 0; k < W * H; k++) {
    realSet[k] = classes[k] === REAL ? 1 : 0;
    real[k] = realSet[k];
    synth[k] = 1 - realSet[k];
  }
  const distance = distanceTo(realSet, W, H, fade + 1);
  const realWeight = gaussianBlur(real, W, H, sigma, true);
  const synthWeight = gaussianBlur(synth, W, H, sigma, true);
  for (let c = 0; c < 3; c++) {
    const a = new Float32Array(W * H);
    const b = new Float32Array(W * H);
    for (let k = 0; k < W * H; k++) {
      a[k] = rgb[3 * k + c] * real[k];
      b[k] = rgb[3 * k + c] * synth[k];
    }
    const realMean = gaussianBlur(a, W, H, sigma, true);
    const synthMean = gaussianBlur(b, W, H, sigma, true);
    for (let k = 0; k < W * H; k++) {
      if (realSet[k]) continue;
      const d = distance[k];
      if (d >= fade || realWeight[k] < 1e-3 || synthWeight[k] < 1e-3) continue;
      const t = Math.min(1, Math.max(0, (d - full) / (fade - full)));
      const w = 1 - t * t * (3 - 2 * t);
      const delta = realMean[k] / realWeight[k] - synthMean[k] / synthWeight[k];
      rgb[3 * k + c] = Math.min(1, Math.max(0, rgb[3 * k + c] + w * delta));
    }
  }
}

/**
 * El enfoque de lo recreado calibrado en cada luna (`sharpen: 'auto'`): el que lleva el grano de lo
 * recreado junto a lo real al de lo real vecino (`recreationQuality`), en dos pasos (el grano crece con
 * 1 + s), entre 0 y `sharpenMax`. Con un enfoque fijo (0,9, el de Tritón), Ganímedes salía con el 58 %.
 */
function calibrateSharpen(rgb, classes, W, H, P) {
  const original = Float32Array.from(rgb);
  const ratio = (map) => {
    const gray = new Float32Array(W * H);
    for (let k = 0; k < W * H; k++) {
      gray[k] = LUMA[0] * map[3 * k] + LUMA[1] * map[3 * k + 1] + LUMA[2] * map[3 * k + 2];
    }
    return recreationQuality(gray, classes, W, H).grain.ratioNear;
  };
  let amount = 0;
  let r = ratio(rgb);
  for (let step = 0; step < 2 && Number.isFinite(r) && r > 0; step++) {
    amount = Math.min(P.sharpenMax, Math.max(0, (1 + amount) / r - 1));
    rgb.set(original);
    if (amount > 0) sharpenSynthesized(rgb, classes, W, H, { ...P, sharpen: amount });
    r = ratio(rgb);
  }
  P.sharpenUsed = amount;
}

/**
 * La máscara de enfoque de lo recreado (`SYNTHESIS.sharpen`): en el equirrectangular, con el desenfoque a
 * escala física (la misma distancia sobre la esfera en longitud que en latitud) y sin tocar lo real.
 */
function sharpenSynthesized(rgb, classes, W, H, P) {
  const weight = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) weight[k] = classes[k] === REAL ? 0 : 1;
  const norm = gaussianBlur(weight, W, H, P.sharpenSigma, true);
  for (let c = 0; c < 3; c++) {
    const channel = new Float32Array(W * H);
    for (let k = 0; k < W * H; k++) channel[k] = rgb[3 * k + c] * weight[k];
    const low = gaussianBlur(channel, W, H, P.sharpenSigma, true);
    for (let k = 0; k < W * H; k++) {
      if (!weight[k]) continue;
      const v = rgb[3 * k + c];
      const mean = norm[k] > 1e-3 ? low[k] / norm[k] : v;
      rgb[3 * k + c] = Math.min(1, Math.max(0, v + P.sharpen * (v - mean)));
    }
  }
}

/**
 * Cuánto se ha usado ya cada zona de origen: por cara, una rejilla de celdas de `cell` px; un parche
 * usado suma 1 a cada celda en proporción a lo que la cubre, y el uso de un candidato es la media de
 * las celdas que cubre (en proporción también).
 */
class SourceUsage {
  constructor(S, B, cell) {
    this.B = B;
    this.cell = cell;
    this.cells = Math.ceil(S / cell);
    this.grid = Array.from({ length: 6 }, () => new Float32Array(this.cells * this.cells));
  }

  /** Recorre las celdas que cubre el parche con su fracción cubierta. */
  each(src, visit) {
    const { B, cell, cells } = this;
    const cx0 = Math.floor(src.x / cell);
    const cy0 = Math.floor(src.y / cell);
    const cx1 = Math.min(cells - 1, Math.floor((src.x + B - 1) / cell));
    const cy1 = Math.min(cells - 1, Math.floor((src.y + B - 1) / cell));
    for (let cy = cy0; cy <= cy1; cy++) {
      const h = Math.min(src.y + B, (cy + 1) * cell) - Math.max(src.y, cy * cell);
      for (let cx = cx0; cx <= cx1; cx++) {
        const w = Math.min(src.x + B, (cx + 1) * cell) - Math.max(src.x, cx * cell);
        visit(cy * cells + cx, (w * h) / (cell * cell));
      }
    }
  }

  /** El uso medio de la zona de un origen (0 si nunca se ha usado). */
  of(src) {
    const grid = this.grid[src.f];
    let sum = 0;
    let area = 0;
    this.each(src, (k, a) => {
      sum += grid[k] * a;
      area += a;
    });
    return area ? sum / area : 0;
  }

  /** Apunta un uso del origen. */
  mark(src) {
    const grid = this.grid[src.f];
    this.each(src, (k, a) => {
      grid[k] += a;
    });
  }
}

/**
 * El brillo de lo visto (lo real y lo visto de lejos) extendido a lo no visto, sobre la esfera: una
 * pirámide equirrectangular (cada nivel, la mitad en cada eje) de medias ponderadas por el área de cada
 * píxel y por si se vio; de vuelta hacia arriba, cada píxel conserva su parte vista y completa el resto
 * con el nivel más grueso (`push-pull`). Lo visto queda igual; lo no visto continúa el brillo de lo
 * visto más cercano, cada vez más suave cuanto más lejos.
 */
export function fillUnseen(rgb, classes, W, H) {
  const levels = [];
  let w = W;
  let h = H;
  let value = Float32Array.from(rgb);
  let weight = new Float32Array(W * H);
  let full = new Float32Array(W * H);
  for (let j = 0; j < H; j++) {
    const area = Math.cos(((j + 0.5) / H - 0.5) * Math.PI);
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      full[k] = area;
      weight[k] = classes[k] === NONE ? 0 : area;
    }
  }
  levels.push({ value, weight, full, w, h });
  while (w > 8 && h > 4) {
    const w2 = w / 2;
    const h2 = h / 2;
    const v2 = new Float32Array(w2 * h2 * 3);
    const wt2 = new Float32Array(w2 * h2);
    const f2 = new Float32Array(w2 * h2);
    for (let j = 0; j < h2; j++) {
      for (let i = 0; i < w2; i++) {
        const k2 = j * w2 + i;
        for (let dy = 0; dy < 2; dy++) {
          for (let dx = 0; dx < 2; dx++) {
            const k = (2 * j + dy) * w + 2 * i + dx;
            wt2[k2] += weight[k];
            f2[k2] += full[k];
            for (let c = 0; c < 3; c++) v2[3 * k2 + c] += weight[k] * value[3 * k + c];
          }
        }
        if (wt2[k2] > 0) for (let c = 0; c < 3; c++) v2[3 * k2 + c] /= wt2[k2];
      }
    }
    value = v2;
    weight = wt2;
    full = f2;
    w = w2;
    h = h2;
    levels.push({ value, weight, full, w, h });
  }
  // De vuelta: lo más grueso, relleno con su media vista; cada nivel completa lo que no vio con el de
  // encima (bilineal, con la vuelta en longitud).
  const top = levels[levels.length - 1];
  let total = 0;
  const mean = [0, 0, 0];
  for (let k = 0; k < top.w * top.h; k++) {
    total += top.weight[k];
    for (let c = 0; c < 3; c++) mean[c] += top.weight[k] * top.value[3 * k + c];
  }
  for (let k = 0; k < top.w * top.h; k++) {
    const a = top.weight[k] / (top.full[k] || 1);
    for (let c = 0; c < 3; c++)
      top.value[3 * k + c] = a * top.value[3 * k + c] + (1 - a) * (mean[c] / total);
  }
  const scratch = [0, 0, 0];
  for (let l = levels.length - 2; l >= 0; l--) {
    const L = levels[l];
    const U = levels[l + 1];
    for (let j = 0; j < L.h; j++) {
      const lat = 90 - ((j + 0.5) / L.h) * 180;
      for (let i = 0; i < L.w; i++) {
        const k = j * L.w + i;
        const a = Math.min(1, L.weight[k] / (L.full[k] || 1));
        if (a >= 1) continue;
        const lon = -180 + ((i + 0.5) / L.w) * 360;
        sampleEquirect(U.value, U.w, U.h, 3, lat, lon, scratch);
        for (let c = 0; c < 3; c++)
          L.value[3 * k + c] = a * L.value[3 * k + c] + (1 - a) * scratch[c];
      }
    }
  }
  // Lo visto, tal cual.
  const out = levels[0].value;
  for (let k = 0; k < W * H; k++) {
    if (classes[k] === NONE) continue;
    for (let c = 0; c < 3; c++) out[3 * k + c] = rgb[3 * k + c];
  }
  return out;
}

/** Muestra bilineal de una cara con margen (x, y en px de la cara sin margen). */
function sampleFace(canvas, S, M, fx, fy, out) {
  const x = Math.min(Math.max(fx + M, 0), S - 1.001);
  const y = Math.min(Math.max(fy + M, 0), S - 1.001);
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = x - x0;
  const ty = y - y0;
  for (let c = 0; c < 3; c++) {
    const v00 = canvas[(y0 * S + x0) * 3 + c];
    const v10 = canvas[(y0 * S + x0 + 1) * 3 + c];
    const v01 = canvas[((y0 + 1) * S + x0) * 3 + c];
    const v11 = canvas[((y0 + 1) * S + x0 + 1) * 3 + c];
    out[c] = (v00 * (1 - tx) + v10 * tx) * (1 - ty) + (v01 * (1 - tx) + v11 * tx) * ty;
  }
  return out;
}

/** El nivel de brillo a gran escala (índice fraccionario en `LP_SIGMAS`) de una σ efectiva. */
function levelOf(sigma) {
  if (sigma <= LP_SIGMAS[0]) return 0;
  const last = LP_SIGMAS.length - 1;
  if (sigma >= LP_SIGMAS[last]) return last;
  return Math.log2(sigma / LP_SIGMAS[0]);
}

/**
 * El valor que deja en el píxel `k` de la cara `face` el píxel `ks` del origen `sf`: el detalle del
 * origen por debajo de la escala del destino (el origen menos su brillo a esa escala), con una ganancia
 * en proporción al brillo (destino / origen, acotada entre `GAIN[0]` y `GAIN[1]`), sobre el brillo
 * objetivo del destino. Así cada parche trae su textura, no su brillo: entre parches no hay escalones, y
 * el brillo es el que pide cada zona. Sin acotar (destino × origen / su brillo), en un relieve de sombras
 * negras (las lunas heladas de Saturno) un brillo local de 0,05 multiplicaba el detalle por 10 o más.
 */
function predict(face, k, sf, ks, c, amp = 1) {
  const low = lowPassAt(sf.levels, ks, face.level[k], c);
  const target = face.target[3 * k + c];
  const gain = Math.min(GAIN[1], Math.max(GAIN[0], target / Math.max(low, 1e-3)));
  return target + amp * gain * (sf.color[3 * ks + c] - low);
}

/**
 * La amplitud del detalle de un parche: la que lleva su grano (`src.energy`) al que pide el destino
 * (`wanted`), entre `AMPLITUDE[0]` y `AMPLITUDE[1]`. Sin ella, en un fondo liso de cráter de Mimas
 * entraba el detalle entero de un origen rugoso (el castigo del grano no basta: elige el mejor de los que
 * hay, no el que tiene el grano justo).
 */
function amplitudeFor(src, wanted) {
  return Math.min(AMPLITUDE[1], Math.max(AMPLITUDE[0], wanted / Math.max(src.energy, 1e-5)));
}
const AMPLITUDE = [0.25, 1];

/** Los límites de la ganancia del detalle en `predict`. */
const GAIN = [0.5, 2];

/** Interpola el brillo a gran escala de un píxel entre dos niveles. */
function lowPassAt(levels, k, level, c) {
  const a = Math.floor(level);
  const b = Math.min(a + 1, levels.length - 1);
  const t = level - a;
  return levels[a][3 * k + c] * (1 - t) + levels[b][3 * k + c] * t;
}

/**
 * Elige el origen del parche que va en (x0, y0): entre `candidates` orígenes al azar del conjunto (los
 * que la receta deja para este sitio), los `finalists` que mejor casan con lo que ya hay en el solape y
 * con el brillo a gran escala de su zona, a grosso modo (cada 4 px); entre ellos, el mejor comparado
 * entero (cada 2 px), con el castigo por repetir.
 */
function choosePatch({
  face,
  canvas,
  fixed,
  filled,
  faces,
  pool,
  x0,
  y0,
  S,
  B,
  P,
  random,
  recipe,
  usage,
  medianEnergy,
}) {
  const center = (y0 + B / 2) * S + x0 + B / 2;
  const tLat = face.lat[center];
  const tLon = face.lon[center];
  const wanted = Math.max(face.localEnergy[center], 1e-4);
  const cost = (src, stride) => {
    const sf = faces[src.f];
    const amp = amplitudeFor(src, wanted);
    let overlapErr = 0;
    let overlapN = 0;
    let farErr = 0;
    let farN = 0;
    let noneErr = 0;
    let noneN = 0;
    for (let dy = 0; dy < B; dy += stride) {
      for (let dx = 0; dx < B; dx += stride) {
        const k = (y0 + dy) * S + x0 + dx;
        const ks = (src.y + dy) * S + src.x + dx;
        if (fixed[k] || filled[k]) {
          for (let c = 0; c < 3; c++) {
            const e = predict(face, k, sf, ks, c, amp) - canvas[3 * k + c];
            overlapErr += e * e;
          }
          overlapN++;
        } else {
          // Lo que se sintetiza: que el origen tenga un brillo parecido al objetivo (el tipo de terreno
          // suele ir con el brillo), aunque luego se lleve a él.
          const far = face.cls[k] === FAR;
          let err = 0;
          for (let c = 0; c < 3; c++) {
            const e = lowPassAt(sf.levels, ks, face.level[k], c) - face.target[3 * k + c];
            err += e * e;
          }
          if (far) {
            farErr += err;
            farN++;
          } else {
            noneErr += err;
            noneN++;
          }
        }
      }
    }
    const overlap = overlapN ? overlapErr / overlapN : 0;
    const far = farN ? farErr / farN : 0;
    const none = noneN ? noneErr / noneN : 0;
    return overlap + P.lowPassWeight * far + P.noneWeight * none;
  };
  const candidates = [];
  let tries = 0;
  while (candidates.length < P.candidates && tries < P.candidates * 20) {
    tries++;
    const src = pool[Math.floor(random() * pool.length)];
    if (recipe.pool && !recipe.pool(src.lat, src.lon, tLat, tLon)) continue;
    candidates.push(src);
  }
  if (candidates.length === 0) {
    for (let k = 0; k < P.candidates; k++)
      candidates.push(pool[Math.floor(random() * pool.length)]);
  }
  const penalty = (src) => {
    const mismatch = Math.log(Math.max(src.energy, 1e-5) / wanted);
    return (1 + P.reusePenalty * usage.of(src)) * (1 + P.energyPenalty * mismatch * mismatch);
  };
  const rough = candidates
    .map((src) => ({ src, c: cost(src, 4) * penalty(src) }))
    .sort((a, b) => a.c - b.c)
    .slice(0, P.finalists);
  let best = rough[0].src;
  let bestCost = Infinity;
  for (const { src } of rough) {
    const c = cost(src, 2) * penalty(src);
    if (c < bestCost) {
      bestCost = c;
      best = src;
    }
  }
  return { ...best, amp: amplitudeFor(best, wanted) };
}

/**
 * Coloca el parche: donde ya hay algo (lo fijo o lo sintetizado), por el corte de menor error de cada
 * lado (programación dinámica, como en el quilting); lo fijo nunca se cambia.
 */
function placePatch({ face, canvas, fixed, filled, faces, source, x0, y0, S, B }) {
  const sf = faces[source.f];
  // El error de cada píxel del parche frente a lo que hay (0 donde no hay nada).
  const err = new Float32Array(B * B);
  const occupied = new Uint8Array(B * B);
  for (let dy = 0; dy < B; dy++) {
    for (let dx = 0; dx < B; dx++) {
      const k = (y0 + dy) * S + x0 + dx;
      if (!fixed[k] && !filled[k]) continue;
      occupied[dy * B + dx] = 1;
      const ks = (source.y + dy) * S + source.x + dx;
      let e = 0;
      for (let c = 0; c < 3; c++) {
        const d = predict(face, k, sf, ks, c, source.amp) - canvas[3 * k + c];
        e += d * d;
      }
      err[dy * B + dx] = e;
    }
  }
  // Qué píxeles se toman del parche: los libres siempre; los ocupados, solo los que queden «dentro» de
  // los cortes de cada lado (las franjas de borde ocupadas se resuelven con un camino de error mínimo).
  const take = new Uint8Array(B * B);
  for (let i = 0; i < B * B; i++) take[i] = occupied[i] ? 0 : 1;
  const band = Math.max(4, Math.floor(B / 4));
  cutSide(err, occupied, take, B, band, 'left');
  cutSide(err, occupied, take, B, band, 'right');
  cutSide(err, occupied, take, B, band, 'top');
  cutSide(err, occupied, take, B, band, 'bottom');
  // Un fundido de unos 2 px a cada lado del corte: lo que se toma del parche, con un peso que va de 0
  // a 1 a través del corte; donde no había nada, el parche entero.
  const alpha = new Float32Array(B * B);
  for (let i = 0; i < B * B; i++) alpha[i] = take[i] ? 1 : 0;
  const soft = featherMask(alpha, B);
  for (let dy = 0; dy < B; dy++) {
    for (let dx = 0; dx < B; dx++) {
      const i = dy * B + dx;
      const k = (y0 + dy) * S + x0 + dx;
      if (fixed[k]) continue;
      const a = occupied[i] ? soft[i] : 1;
      if (a <= 0) continue;
      const ks = (source.y + dy) * S + source.x + dx;
      for (let c = 0; c < 3; c++) {
        canvas[3 * k + c] =
          a * predict(face, k, sf, ks, c, source.amp) + (1 - a) * canvas[3 * k + c];
      }
      filled[k] = 1;
    }
  }
}

/** Desenfoque de una máscara B × B (gaussiano de σ ≈ 1 px, separable, con el borde repetido). */
function featherMask(mask, B) {
  const kernel = [0.054, 0.244, 0.403, 0.244, 0.054];
  const tmp = new Float32Array(B * B);
  const out = new Float32Array(B * B);
  for (let y = 0; y < B; y++) {
    for (let x = 0; x < B; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++)
        acc += kernel[k + 2] * mask[y * B + Math.min(B - 1, Math.max(0, x + k))];
      tmp[y * B + x] = acc;
    }
  }
  for (let y = 0; y < B; y++) {
    for (let x = 0; x < B; x++) {
      let acc = 0;
      for (let k = -2; k <= 2; k++)
        acc += kernel[k + 2] * tmp[Math.min(B - 1, Math.max(0, y + k)) * B + x];
      out[y * B + x] = acc;
    }
  }
  return out;
}

/**
 * Un corte de error mínimo en la franja de un lado del parche (`band` px): en cada fila (o columna) de
 * la franja, el píxel donde se pasa de lo que hay a lo nuevo, con un camino continuo (cada paso, como
 * mucho un píxel a un lado). Lo nuevo se toma del corte hacia dentro. Si el lado no tiene nada ocupado,
 * no hay corte.
 */
function cutSide(err, occupied, take, B, band, side) {
  const horizontal = side === 'left' || side === 'right';
  // Coordenadas de la franja: `along` recorre el lado; `across`, de fuera (0) a dentro (band − 1).
  const at = (along, across) => {
    if (side === 'left') return along * B + across;
    if (side === 'right') return along * B + (B - 1 - across);
    if (side === 'top') return across * B + along;
    return (B - 1 - across) * B + along;
  };
  let any = 0;
  for (let along = 0; along < B; along++) {
    for (let across = 0; across < band; across++) any += occupied[at(along, across)];
  }
  if (any === 0) return;
  // Programación dinámica: coste acumulado del camino que corta en `across` en la posición `along`.
  const acc = new Float32Array(B * band);
  const from = new Int8Array(B * band);
  for (let across = 0; across < band; across++) acc[across] = err[at(0, across)];
  for (let along = 1; along < B; along++) {
    for (let across = 0; across < band; across++) {
      let best = acc[(along - 1) * band + across];
      let move = 0;
      if (across > 0 && acc[(along - 1) * band + across - 1] < best) {
        best = acc[(along - 1) * band + across - 1];
        move = -1;
      }
      if (across < band - 1 && acc[(along - 1) * band + across + 1] < best) {
        best = acc[(along - 1) * band + across + 1];
        move = 1;
      }
      acc[along * band + across] = best + err[at(along, across)];
      from[along * band + across] = move;
    }
  }
  let cut = 0;
  for (let across = 1; across < band; across++) {
    if (acc[(B - 1) * band + across] < acc[(B - 1) * band + cut]) cut = across;
  }
  for (let along = B - 1; along >= 0; along--) {
    // Del corte hacia dentro se toma lo nuevo (si está ocupado y no es el corte de otro lado: `take` se
    // queda con la intersección de los lados).
    for (let across = 0; across < band; across++) {
      const i = at(along, across);
      if (!occupied[i]) continue;
      if (across >= cut) take[i] = take[i] === 2 ? 2 : 1;
      else take[i] = 2;
    }
    cut += from[along * band + cut];
  }
  // 2 = fuera de algún corte: no se toma.
  for (let i = 0; i < take.length; i++) if (take[i] === 2) take[i] = 0;
}

/**
 * Junto a lo real: la media de lo no visto recreado (a la escala σ = `sigma`) se lleva a la de lo real
 * extendida por encima del borde, con una corrección entera hasta `full` px de lo real que se apaga hasta
 * `fade` px (la distancia, por chaflán en la cara con su margen).
 */
function matchBorder({ face, canvas, S, sigma, full, fade }) {
  const real = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) real[k] = face.cls[k] === REAL ? 1 : 0;
  const realMean = normalizedBlur(canvas, real, S, 3, sigma);
  const synth = new Float32Array(S * S);
  for (let k = 0; k < S * S; k++) synth[k] = 1 - real[k];
  const synthMean = normalizedBlur(canvas, synth, S, 3, sigma);
  // Lo lejos que queda lo real: el valor de lo real extendido (`realMean`) solo vale cerca de él.
  const distance = faceDistance(real, S, fade + 1);
  for (let k = 0; k < S * S; k++) {
    // Solo lo no visto: en lo visto de lejos, el brillo a gran escala es el real y no se toca (con la
    // corrección hasta 48 px, el fondo claro de un cráter de Mimas salía oscuro); su borde inmediato lo
    // ajusta la última pasada, en el equirrectangular.
    if (real[k] || face.cls[k] !== NONE) continue;
    const d = distance[k];
    if (d >= fade) continue;
    const t = Math.min(1, Math.max(0, (d - full) / (fade - full)));
    const w = 1 - t * t * (3 - 2 * t);
    if (w <= 0.001) continue;
    for (let c = 0; c < 3; c++) {
      const target = realMean.value[3 * k + c];
      const mean = synthMean.value[3 * k + c];
      if (Number.isNaN(target) || Number.isNaN(mean)) continue;
      canvas[3 * k + c] += w * (target - mean);
    }
  }
}

/** La distancia (px, chaflán 3-4 / 3) de cada píxel de una cara S × S a la máscara `inSet`, hasta `cap`. */
function faceDistance(inSet, S, cap) {
  const INF = 3 * cap + 4;
  const d = new Float32Array(S * S);
  for (let k = 0; k < d.length; k++) d[k] = inSet[k] ? 0 : INF;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const k = y * S + x;
      let v = d[k];
      if (x > 0) v = Math.min(v, d[k - 1] + 3);
      if (y > 0) {
        v = Math.min(v, d[k - S] + 3);
        if (x > 0) v = Math.min(v, d[k - S - 1] + 4);
        if (x < S - 1) v = Math.min(v, d[k - S + 1] + 4);
      }
      d[k] = v;
    }
  }
  for (let y = S - 1; y >= 0; y--) {
    for (let x = S - 1; x >= 0; x--) {
      const k = y * S + x;
      let v = d[k];
      if (x < S - 1) v = Math.min(v, d[k + 1] + 3);
      if (y < S - 1) {
        v = Math.min(v, d[k + S] + 3);
        if (x < S - 1) v = Math.min(v, d[k + S + 1] + 4);
        if (x > 0) v = Math.min(v, d[k + S - 1] + 4);
      }
      d[k] = v;
    }
  }
  for (let k = 0; k < d.length; k++) d[k] = Math.min(d[k] / 3, cap);
  return d;
}

/**
 * Reduce a 1/4 el mapa, sus clases y su σ efectiva (para el nivel grueso): el color, la media de cada
 * bloque de 4 × 4; la clase, «no visto» si lo es la mayoría del bloque, «real» si lo es entero y, si no,
 * «visto de lejos»; la σ, la media entre 4 (está en px del nivel fino).
 */
export function downsample4({ rgb, classes, sigmaEff, W, H }) {
  const w = W / 4;
  const h = H / 4;
  const out = new Float32Array(w * h * 3);
  const cls = new Uint8Array(w * h);
  const sigma = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let none = 0;
      let real = 0;
      let s = 0;
      const sum = [0, 0, 0];
      for (let dy = 0; dy < 4; dy++) {
        for (let dx = 0; dx < 4; dx++) {
          const k = (4 * j + dy) * W + 4 * i + dx;
          for (let c = 0; c < 3; c++) sum[c] += rgb[3 * k + c];
          if (classes[k] === NONE) none++;
          if (classes[k] === REAL) real++;
          s += sigmaEff[k];
        }
      }
      const k = j * w + i;
      for (let c = 0; c < 3; c++) out[3 * k + c] = sum[c] / 16;
      cls[k] = none > 8 ? NONE : real === 16 ? REAL : FAR;
      sigma[k] = s / 16 / 4;
    }
  }
  return { rgb: out, classes: cls, sigmaEff: sigma, W: w, H: h };
}

/** Amplía ×4 un mapa equirrectangular (bilineal, con la vuelta en longitud). */
export function upsample4(rgb, w, h) {
  const W = w * 4;
  const H = h * 4;
  const out = new Float32Array(W * H * 3);
  const scratch = [0, 0, 0];
  for (let j = 0; j < H; j++) {
    const lat = 90 - ((j + 0.5) / H) * 180;
    for (let i = 0; i < W; i++) {
      const lon = -180 + ((i + 0.5) / W) * 360;
      sampleEquirect(rgb, w, h, 3, lat, lon, scratch);
      const k = j * W + i;
      out[3 * k] = scratch[0];
      out[3 * k + 1] = scratch[1];
      out[3 * k + 2] = scratch[2];
    }
  }
  return out;
}
