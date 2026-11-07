// Las recetas de la recreación de D45 (fase 9b): en lo que no se vio de cada luna, qué unidad de su
// propio terreno real va dónde y con qué brillo regional. Es ilustrativo, por analogía con lo visto, y
// no se presenta como ciencia; la receta de cada luna va escrita también en el informe de la fase.
// EN CURSO (entrega 9b.d): por ahora, solo Tritón.

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
  // La frontera del casquete del norte: irregular a varias escalas (un ruido fractal sobre la esfera,
  // de ±`edge.amplitude`° en torno a `edge.lat`°), como la del casquete del sur, que no es una
  // recta de latitud; y una transición de unos `edge.width`°. Se aparta de lo real (σ de 9°: con 4,
  // la frontera seguía el arco de lo que vio la Voyager y se leía como el borde de los datos).
  const edge = { lat: 47, amplitude: 14, width: 4, ...(options.edge ?? {}) };
  const wave = (lat, lon) =>
    edge.amplitude * sphereFbm(lat, lon, { frequency: 2.2, octaves: 5, seed: 11 });
  // El casquete del norte se aparta de lo real: donde lo real queda a menos de unos grados (el arco de
  // lo que vio la Voyager llega a 50° N), sigue la «piel de melón» de lo real y no hay escalón de brillo.
  const near = nearReal(classes, W, H, edge.clearanceDeg ?? 9);
  const clear = (lat, lon) => 1 - smoothstep(0.04, 0.3, near.at(lat, lon));
  const northCap = (lat, lon) =>
    smoothstep(edge.lat - edge.width / 2, edge.lat + edge.width / 2, lat + wave(lat, lon)) *
    clear(lat, lon);
  const isCap = (lat, lon) => lat < -25 || (lat > 0 && northCap(lat, lon) > 0.5);
  const capShare = (lat, lon) => (lat < -25 ? 1 : northCap(lat, lon));
  return {
    pool: (srcLat, _srcLon, tLat, tLon) => (isCap(tLat, tLon) ? srcLat < -20 : srcLat > -30),
    target: (lat, lon, filled) => {
      const t = lat > 0 ? capShare(lat, lon) : 0;
      if (t <= 0) return null;
      return [0, 1, 2].map((c) => filled[c] * (1 - t) + cap[c] * t);
    },
    capMean: cap,
  };
}

const RECIPES = { triton };

/** La receta de una luna (vacía si no tiene: lo no visto sigue entonces el brillo de lo visto). */
export function recipeFor(id, measured) {
  return RECIPES[id] ? RECIPES[id](measured) : {};
}
