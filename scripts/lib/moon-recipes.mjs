// Las recetas de la recreación de D45 (fase 9b): en lo que no se vio de cada luna, qué unidad de su
// propio terreno real va dónde y con qué brillo regional. Es ilustrativo, por analogía con lo visto, y
// no se presenta como ciencia; la receta de cada luna va escrita también en el informe de la fase.
// EN CURSO (entrega 9b.d): por ahora, solo Tritón.

const REAL = 0;

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
function triton({ rgb, classes, W, H }) {
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
  const rad = Math.PI / 180;
  const wave = (lon) =>
    7 * Math.sin(3 * lon * rad + 0.7) +
    4 * Math.sin(7 * lon * rad + 2.1) +
    2 * Math.sin(13 * lon * rad + 1.3);
  const isCap = (lat, lon) => lat < -25 || lat + wave(lon) > 47;
  const capShare = (lat, lon) => (lat < -25 ? 1 : smoothstep(42, 52, lat + wave(lon)));
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
