// Las recetas de la recreación de D45 (fase 9b): en lo que no se vio de cada luna, qué unidad de su
// propio terreno real va dónde y con qué brillo regional. Es ilustrativo, por analogía con lo visto, y
// no se presenta como ciencia; la receta de cada luna va escrita también en el informe de la fase.
// Solo Tritón lleva receta propia (su casquete); las demás, la de por defecto: lo no visto, con
// parches de todo lo real de la misma luna y el brillo de lo visto extendido sobre la esfera.

import { gaussianBlur } from './moon-maps.mjs';

const REAL = 0;

/**
 * Lo cerca que está cada punto de lo real (de 0 a 1): la máscara de lo real, reducida a 512 × 256 y
 * desenfocada sobre la esfera con σ = `sigmaDeg` grados; se lee con `at(lat, lon)` (bilineal). Sirve
 * para que una unidad recreada (un casquete) no llegue hasta el borde de lo real con otro brillo.
 */
export function nearReal(classes, W, H, sigmaDeg = 4) {
  const w = 512;
  const h = 256;
  const fx = W / w;
  const fy = H / h;
  const mask = new Float32Array(w * h);
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      let n = 0;
      for (let dy = 0; dy < fy; dy++)
        for (let dx = 0; dx < fx; dx++) if (classes[(j * fy + dy) * W + i * fx + dx] === REAL) n++;
      mask[j * w + i] = n / (fx * fy);
    }
  }
  const blurred = gaussianBlur(mask, w, h, (sigmaDeg * h) / 180, true);
  return {
    at(lat, lon) {
      const x = ((lon + 180) / 360) * w - 0.5;
      const y = ((90 - lat) / 180) * h - 0.5;
      const x0 = Math.floor(x);
      const y0 = Math.min(Math.max(Math.floor(y), 0), h - 2);
      const tx = x - x0;
      const ty = Math.min(Math.max(y - y0, 0), 1);
      const xa = ((x0 % w) + w) % w;
      const xb = (xa + 1) % w;
      const v = (yy, xx) => blurred[yy * w + xx];
      return (
        (v(y0, xa) * (1 - tx) + v(y0, xb) * tx) * (1 - ty) +
        (v(y0 + 1, xa) * (1 - tx) + v(y0 + 1, xb) * tx) * ty
      );
    },
  };
}

/** Un entero de 32 bits mezclado (para el ruido determinista). */
function hash3(x, y, z, seed) {
  let h =
    (Math.imul(x, 0x8da6b343) ^ Math.imul(y, 0xd8163841) ^ Math.imul(z, 0xcb1ab31f) ^ seed) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0;
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Ruido de valor 3D (de −1 a 1), interpolado con la curva de quinto grado, en el punto (x, y, z). */
function valueNoise(x, y, z, seed) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const f = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const u = f(x - xi);
  const v = f(y - yi);
  const w = f(z - zi);
  const lerp = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz, seed);
  return (
    2 *
      lerp(
        lerp(lerp(c(0, 0, 0), c(1, 0, 0), u), lerp(c(0, 1, 0), c(1, 1, 0), u), v),
        lerp(lerp(c(0, 0, 1), c(1, 0, 1), u), lerp(c(0, 1, 1), c(1, 1, 1), u), v),
        w,
      ) -
    1
  );
}

/**
 * Ruido fractal sobre la esfera (de −1 a 1, aproximadamente): la suma de `octaves` ruidos de valor en la
 * dirección de (lat, lon), cada uno al doble de frecuencia y la mitad de amplitud. Sobre la esfera, sin
 * costura en ±180° ni pellizco en los polos. Determinista.
 */
export function sphereFbm(lat, lon, { frequency = 2, octaves = 5, seed = 7 } = {}) {
  const la = (lat * Math.PI) / 180;
  const lo = (lon * Math.PI) / 180;
  const d = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)];
  let sum = 0;
  let amplitude = 1;
  let norm = 0;
  let f = frequency;
  for (let o = 0; o < octaves; o++) {
    sum +=
      amplitude *
      valueNoise(d[0] * f + 17.3 * o, d[1] * f + 5.1 * o, d[2] * f + 11.7 * o, seed + o);
    norm += amplitude;
    amplitude *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Paso suave de 0 a 1 entre `a` y `b`. */
function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * Tritón. Lo que vio la Voyager 2 (1989, verano del sur): el casquete del sur, con sus vetas oscuras,
 * y al norte de él, la «piel de melón» y las llanuras. El norte estaba en la noche polar. La receta:
 * el casquete (lo real al sur de −20°) al sur de −25° y en el norte, por encima de una frontera ondulada
 * con la longitud en torno a los 47° (una frontera de unidades, no una recta de latitud); el resto, con
 * lo real al norte de −30°. El brillo regional del casquete del norte, el medio del casquete del sur
 * (lo real por debajo de −25°), con una transición de unos 10° en la frontera.
 */
function triton({ rgb, classes, W, H, ...options }) {
  const cap = [0, 0, 0];
  let n = 0;
  for (let j = 0; j < H; j++) {
    const lat = 90 - ((j + 0.5) / H) * 180;
    if (lat > -25) continue;
    const w = Math.cos((lat * Math.PI) / 180);
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (classes[k] !== REAL) continue;
      for (let c = 0; c < 3; c++) cap[c] += w * rgb[3 * k + c];
      n += w;
    }
  }
  for (let c = 0; c < 3; c++) cap[c] /= n;
  // Y el brillo medio del terreno que no es casquete (lo real al norte de −30°: la «piel de melón» y las
  // llanuras), para lo no visto fuera del casquete (D48): lo visto extendido sobre la esfera llevaba allí,
  // lejos de lo real, la media de todo lo visto, casquete sur incluido, y el del norte no se distinguía.
  const plains = [0, 0, 0];
  let m = 0;
  for (let j = 0; j < H; j++) {
    const lat = 90 - ((j + 0.5) / H) * 180;
    if (lat < -30) continue;
    const w = Math.cos((lat * Math.PI) / 180);
    for (let i = 0; i < W; i++) {
      const k = j * W + i;
      if (classes[k] !== REAL) continue;
      for (let c = 0; c < 3; c++) plains[c] += w * rgb[3 * k + c];
      m += w;
    }
  }
  for (let c = 0; c < 3; c++) plains[c] /= m;
  // La frontera del casquete del norte (D48, entrega 10.a): «irregular, como la del sur real». La del sur,
  // medida donde la vio la Voyager (`capBoundary`), con su función de estructura; la del norte, en torno a
  // `edge.lat`°, con la misma estadística a la misma distancia sobre la esfera (`irregularBoundary`) y con
  // la transición de brillo de la del sur. En la 9b era un ruido de baja frecuencia (±14° en torno a 47°)
  // con una transición de 4°: un círculo de lados casi rectos que, visto desde el polo, parecía un
  // polígono. Se aparta de lo real (σ de 9°: con 4, la frontera seguía el arco de lo que vio la Voyager y
  // se leía como el borde de los datos).
  const edge = { lat: 47, seed: 11, ...(options.edge ?? {}) };
  const south = capBoundary(rgb, classes, W, H);
  const seenSouth = south.lat.filter((v) => !Number.isNaN(v));
  const southLat = seenSouth.reduce((a, b) => a + b, 0) / seenSouth.length;
  const structure = structureFunction(south.lat, W, [1, 2, 5, 10, 20]);
  // El serpenteo, de 5° a 20° (con modos hasta unos 5° de longitud); lo fino, un ruido isótropo sobre la
  // esfera (con solo la longitud, las ondas finas salían como rayos hacia el polo), de `edge.ragged`°.
  const boundary = irregularBoundary(W, structure, {
    meanLat: edge.lat,
    referenceLat: southLat,
    seed: edge.seed,
    modes: 72,
    fitDeg: [5, 20],
  });
  const ragged = edge.ragged ?? 2.5;
  // La transición, la del sur: de un cuarto a tres cuartos del salto de brillo en `south.widthDeg`
  // (un paso suave cubre esa parte en el 35 % de su anchura), sin el desenfoque de 1° con que se mide.
  const transition = Math.max(2, south.widthDeg - 2) / 0.348;
  // El collar oscuro del casquete (D48): en lo real, justo fuera del borde del sur (de 0,5° a `collar`° (12)
  // al norte de él), el terreno es más oscuro que el resto de lo que no es casquete. Su brillo medio, para
  // ponerlo fuera del borde del norte, con la misma anchura.
  const collarDeg = edge.collar ?? 12;
  const collar = [0, 0, 0];
  let nc = 0;
  for (let i = 0; i < W; i++) {
    const b = south.lat[i];
    if (Number.isNaN(b)) continue;
    for (let j = 0; j < H; j++) {
      const lat = 90 - ((j + 0.5) / H) * 180;
      if (lat < b + 0.5 || lat > b + collarDeg) continue;
      const k = j * W + i;
      if (classes[k] === 2) continue;
      for (let c = 0; c < 3; c++) collar[c] += rgb[3 * k + c];
      nc++;
    }
  }
  for (let c = 0; c < 3; c++) collar[c] /= nc;
  const boundaryAt = (lon) => {
    const x = ((lon + 180) / 360) * W - 0.5;
    const x0 = Math.floor(x);
    const t = x - x0;
    const a = boundary.lat[((x0 % W) + W) % W];
    const b = boundary.lat[(((x0 + 1) % W) + W) % W];
    return a * (1 - t) + b * t;
  };
  const near = nearReal(classes, W, H, edge.clearanceDeg ?? 9);
  const clear = (lat, lon) => 1 - smoothstep(0.04, 0.3, near.at(lat, lon));
  const northCap = (lat, lon) =>
    smoothstep(
      -transition / 2,
      transition / 2,
      lat - boundaryAt(lon) + ragged * sphereFbm(lat, lon, { frequency: 9, octaves: 4, seed: 23 }),
    ) * clear(lat, lon);
  const isCap = (lat, lon) => lat < -25 || (lat > 0 && northCap(lat, lon) > 0.5);
  const capShare = (lat, lon) => (lat < -25 ? 1 : northCap(lat, lon));
  return {
    // Su nombre, para el informe y para docs/datos/recreacion-lunas.md.
    name: 'el casquete de Tritón',

    pool: (srcLat, _srcLon, tLat, tLon) => (isCap(tLat, tLon) ? srcLat < -20 : srcLat > -30),
    target: (lat, lon, filled) => {
      if (lat <= 0) return null;
      const t = capShare(lat, lon);
      // Fuera del casquete: junto a lo real, lo visto extendido; lejos, el brillo de lo que no es casquete.
      const nearSeen = smoothstep(0.02, 0.3, near.at(lat, lon));
      // El collar: de lleno junto al borde y apagándose hasta `collarDeg` hacia fuera.
      const below = boundaryAt(lon) - lat;
      const inCollar = (1 - smoothstep(0, collarDeg, below)) * (1 - nearSeen);
      return [0, 1, 2].map((c) => {
        const outside = filled[c] * nearSeen + plains[c] * (1 - nearSeen);
        return (outside * (1 - inCollar) + collar[c] * inCollar) * (1 - t) + cap[c] * t;
      });
    },
    capMean: cap,
    // Para el informe: la frontera del sur, medida, y la del norte, generada (D48).
    capEdge: {
      southLat,
      southColumns: seenSouth.length,
      transitionDeg: south.widthDeg,
      collar,
      plains,
      exponent: boundary.exponent,
      reference: boundary.reference,
      generated: boundary.generated,
      northCap,
    },
  };
}

/**
 * Las lunas de Urano (D48, entrega 10.a): sus mapas del JPL son mosaicos de las imágenes de la Voyager 2
 * de 1986, con el Sol sobre su hemisferio sur. Lo no visto es su noche polar, así que su borde con lo real
 * es el terminador de las imágenes: lo real junto a él tiene luz rasante (`terminator`, moon-grazing.mjs).
 * Y, como todos los mapas del JPL, la última columna (la de 180°) es más oscura (`seam`).
 */
const uranian = (name) => () => ({
  name,
  terminator: true,
  seam: true,
  // Lo no visto: el brillo regional de lo visto, el detalle fino de los parches (por debajo de 4 px) y,
  // entre medias, los cráteres con la población y el albedo de su real (moon-craters.mjs).
  synthesis: { guide: false, noneDetailSigma: 4 },
  craters: {},
});

/** Deimos: un mapa del JPL (`seam`), sin terminador (lo no cartografiado es el fondo de su carta). */
const deimos = () => ({ seam: true });

/**
 * Miranda (D48): «coronas y cráteres». Lo no visto, con los cráteres de su real y con dos coronas
 * ilustrativas, con las bandas de su terreno bandeado real (moon-craters.mjs, `coronaLayer`).
 */
const miranda = () => ({
  ...uranian('la de Miranda')(),
  craters: { coronae: { count: 2 } },
});

const RECIPES = {
  triton,
  deimos,
  miranda,
  ariel: uranian('la de Ariel'),
  umbriel: uranian('la de Umbriel'),
  titania: uranian('la de Titania'),
  oberon: uranian('la de Oberón'),
};

/** La receta de una luna (vacía si no tiene: lo no visto sigue entonces el brillo de lo visto). */
export function recipeFor(id, measured) {
  return RECIPES[id] ? RECIPES[id](measured) : {};
}

/**
 * El borde del casquete sur real de Tritón (D48: el del norte, «irregular, como el del sur real»): en cada
 * columna con lo real (o lo visto de lejos) entre `range` de latitud, la latitud donde el L* (desenfocado
 * con σ = 1°) pasa, de norte a sur, del brillo de fuera al del casquete (el umbral, a mitad de los dos:
 * las medianas de lo visto al sur de −40° y entre −5° y 25°), con al menos 3° de lo de fuera al norte y
 * 3° del casquete al sur. NaN donde no se ve entero. Y el ancho de la transición (de un cuarto a tres cuartos del salto), de media, en grados.
 */
export function capBoundary(rgb, classes, W, H, { range = [-60, 15] } = {}) {
  const L = new Float32Array(W * H);
  for (let k = 0; k < W * H; k++) {
    const v = 0.2126 * rgb[3 * k] + 0.7152 * rgb[3 * k + 1] + 0.0722 * rgb[3 * k + 2];
    const y = v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    L[k] = 116 * (y > 216 / 24389 ? Math.cbrt(y) : ((24389 / 27) * y + 16) / 116) - 16;
  }
  const smooth = gaussianBlur(L, W, H, W / 360, true);
  const seen = (k) => classes[k] !== 2;
  const median = (lo, hi) => {
    const list = [];
    for (let j = 0; j < H; j++) {
      const lat = 90 - ((j + 0.5) / H) * 180;
      if (lat < lo || lat > hi) continue;
      for (let i = 0; i < W; i += 2) if (seen(j * W + i)) list.push(smooth[j * W + i]);
    }
    list.sort((a, b) => a - b);
    return list[Math.floor(list.length / 2)];
  };
  const cap = median(-90, -40);
  const outside = median(-5, 25);
  const threshold = (cap + outside) / 2;
  const step = cap - outside;
  const rowOf = (lat) => Math.round(((90 - lat) / 180) * H - 0.5);
  const latOf = (j) => 90 - ((j + 0.5) / H) * 180;
  const j0 = rowOf(range[1]);
  const j1 = rowOf(range[0]);
  const stay = Math.round((3 / 180) * H);
  const lat = new Float32Array(W).fill(NaN);
  let widthSum = 0;
  let widthN = 0;
  for (let i = 0; i < W; i++) {
    // Un borde cuenta si antes, más al norte, hay al menos 3° de lo de fuera (por debajo del umbral):
    // si no, el escaneo ha empezado ya en el casquete o en algo tan claro como él.
    let below = 0;
    for (let j = j0; j <= j1; j++) {
      const k = j * W + i;
      if (!seen(k)) break;
      if (smooth[k] < threshold) {
        below++;
        continue;
      }
      if (below < stay) {
        below = 0;
        continue;
      }
      let ok = true;
      for (let d = 1; d <= stay && ok; d++) {
        const kk = (j + d) * W + i;
        if (j + d >= H || !seen(kk) || smooth[kk] < threshold) ok = false;
      }
      if (!ok) continue;
      const above = smooth[(j - 1) * W + i];
      const t = (threshold - above) / Math.max(smooth[k] - above, 1e-6);
      lat[i] = latOf(j - 1 + Math.min(1, Math.max(0, t)));
      // El ancho de la transición: de un cuarto a tres cuartos del salto, hacia el norte y hacia el sur.
      let north = j;
      while (north > j0 && smooth[(north - 1) * W + i] > outside + step / 4) north--;
      let south = j;
      while (south < j1 && smooth[(south + 1) * W + i] < outside + (3 * step) / 4) south++;
      widthSum += ((south - north) * 180) / H;
      widthN++;
      break;
    }
  }
  return { lat, threshold, cap, outside, widthDeg: widthN ? widthSum / widthN : NaN };
}

/**
 * La función de estructura de una frontera (latitud por longitud, NaN donde no hay): para cada separación
 * en longitud (`lagsDeg`), la raíz de la media del cuadrado de la diferencia de latitud entre columnas a
 * esa separación (con la vuelta), y cuántos pares.
 */
export function structureFunction(lat, W, lagsDeg) {
  return lagsDeg.map((lagDeg) => {
    const d = Math.max(1, Math.round((lagDeg * W) / 360));
    let sum = 0;
    let pairs = 0;
    for (let i = 0; i < W; i++) {
      const a = lat[i];
      const b = lat[(i + d) % W];
      if (Number.isNaN(a) || Number.isNaN(b)) continue;
      sum += (a - b) ** 2;
      pairs++;
    }
    return { lagDeg, value: pairs ? Math.sqrt(sum / pairs) : NaN, pairs };
  });
}

/**
 * Una frontera irregular con la estadística de otra (D48): la latitud por longitud, alrededor de
 * `meanLat`, como una suma de cosenos con fases al azar (semilla fija) y amplitudes en ley de potencias,
 * ajustada para que su función de estructura, a la misma distancia sobre la esfera (la longitud por el
 * coseno de la latitud de cada frontera), sea la de `reference` (`structureFunction`, medida a la latitud
 * `referenceLat`) entre 1° y 20°. Devuelve la frontera (W valores) y las dos funciones de estructura.
 */
export function irregularBoundary(
  W,
  reference,
  { meanLat, referenceLat, seed = 5, modes = 400, fitDeg = [1, 20] },
) {
  const random = mulberry(seed);
  const fit = reference.filter(
    (s) => s.lagDeg >= fitDeg[0] && s.lagDeg <= fitDeg[1] && s.value > 0,
  );
  // La ley de potencias de la referencia, en distancia sobre la esfera: S ∝ d^h.
  const xs = fit.map((s) => Math.log(s.lagDeg * Math.cos((referenceLat * Math.PI) / 180)));
  const ys = fit.map((s) => Math.log(s.value));
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  const h =
    xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
    xs.reduce((a, x) => a + (x - mx) ** 2, 0);
  const phases = Array.from({ length: modes }, () => random() * 2 * Math.PI);
  const shape = Float64Array.from({ length: W }, (_, i) => {
    const lon = ((i + 0.5) / W) * 2 * Math.PI;
    let v = 0;
    for (let k = 1; k <= modes; k++) v += k ** -(h + 0.5) * Math.cos(k * lon + phases[k - 1]);
    return v;
  });
  const cosHere = Math.cos((meanLat * Math.PI) / 180);
  const cosRef = Math.cos((referenceLat * Math.PI) / 180);
  // La escala: la que iguala, en media logarítmica, las dos funciones a la misma distancia.
  const lagsHere = fit.map((s) => (s.lagDeg * cosRef) / cosHere);
  const raw = structureFunction(shape, W, lagsHere);
  const scale = Math.exp(
    fit.reduce((a, s, i) => a + Math.log(s.value / raw[i].value), 0) / fit.length,
  );
  const lat = Float32Array.from(shape, (v) => meanLat + scale * v);
  return {
    lat,
    exponent: h,
    reference: fit.map((s) => ({ distanceDeg: s.lagDeg * cosRef, value: s.value })),
    generated: structureFunction(lat, W, lagsHere).map((s, i) => ({
      distanceDeg: fit[i].lagDeg * cosRef,
      value: s.value,
    })),
  };
}

/** Un generador con semilla (mulberry32, como el de moon-recreate.mjs, sin depender de él). */
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
