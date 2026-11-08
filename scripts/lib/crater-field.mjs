// La superficie de Proteo (fase 9b, D45): no tiene mosaico (la Voyager 2 lo vio de lejos) y su forma
// solo se baja a mano (PENDIENTES.md: sigue como esfera). D45, cuando no hay nada usable: «cráteres
// generados con su albedo». Un campo de cráteres determinista sobre la esfera, ILUSTRATIVO (ni sus
// posiciones ni sus tamaños son los de Proteo; Pharos no se pone: el Gazetteer no da su posición):
// - la elevación (m), para el mapa de normales (la luz del Sol de la escena marca los cráteres);
// - el albedo relativo (media 1), casi uniforme: Proteo es oscuro y parejo; la escena lo lleva a su
//   albedo geométrico (D29).
// Las distancias, sobre la esfera (sin estirar en los polos ni costura en ±180°).
import { mulberry32 } from './moon-recreate.mjs';
import { sphereFbm } from './moon-recipes.mjs';

/**
 * Los parámetros del campo (ilustrativos, ajuste visual):
 * - diámetros de `minKm` a `maxKm`, con la ley acumulada N(> D) ∝ D^−`slope` (la de una superficie
 *   saturada de cráteres), hasta cubrir `coverage` veces la superficie;
 * - la profundidad de un cráter fresco, `depthRatio` × D (con `maxDepthKm` como mucho), y su borde,
 *   `rimRatio` × D; cada cráter, con una frescura al azar entre `minFreshness` y 1 (los gastados, más
 *   someros; la frescura, sesgada hacia los gastados);
 * - el material que expulsa, hasta `ejectaReach` radios, cayendo con el cubo de la distancia;
 * - lo que un cráter nuevo borra del relieve de debajo (`erase`, en su centro);
 * - el albedo: ±`albedoNoise` de ruido fractal y los cráteres frescos, hasta `freshBrightening` más
 *   claros (el material recién expuesto).
 */
export const CRATER_FIELD = {
  minKm: 3,
  maxKm: 110,
  slope: 2,
  coverage: 1.2,
  depthRatio: 0.18,
  maxDepthKm: 6,
  rimRatio: 0.035,
  minFreshness: 0.2,
  ejectaReach: 2.5,
  erase: 0.85,
  albedoNoise: 0.04,
  freshBrightening: 0.06,
};

/**
 * El campo de cráteres de un cuerpo de radio `radiusKm` en un mapa equirrectangular de `width` ×
 * `width / 2` (la longitud 0 en el centro, creciendo hacia el este; el norte arriba). Devuelve la
 * elevación (m) y el albedo relativo de cada píxel y el número de cráteres. Con la misma semilla, los
 * mismos cráteres a cualquier resolución.
 */
export function craterField({ width, radiusKm, seed = 7, ...overrides }) {
  const P = { ...CRATER_FIELD, ...overrides };
  const height = width / 2;
  const random = mulberry32(seed);
  // Los cráteres, por orden de edad (el primero, el más viejo).
  const surface = 4 * Math.PI * radiusKm ** 2;
  const a = P.minKm ** -P.slope;
  const b = P.maxKm ** -P.slope;
  const craters = [];
  let covered = 0;
  while (covered < P.coverage * surface) {
    const D = (a + random() * (b - a)) ** (-1 / P.slope);
    const z = 2 * random() - 1;
    const phi = 2 * Math.PI * random();
    const s = Math.sqrt(1 - z * z);
    craters.push({
      D,
      dir: [s * Math.cos(phi), s * Math.sin(phi), z],
      // Más gastados que frescos (la frescura, sesgada hacia abajo).
      freshness: P.minFreshness + (1 - P.minFreshness) * random() ** 1.5,
    });
    covered += (Math.PI * D * D) / 4;
  }
  // La dirección de cada píxel (sistema del cuerpo: X, el meridiano 0; Z, el polo).
  const dirs = new Float32Array(3 * width * height);
  for (let y = 0; y < height; y++) {
    const lat = Math.PI / 2 - ((y + 0.5) * Math.PI) / height;
    for (let x = 0; x < width; x++) {
      const lon = ((x + 0.5) / width - 0.5) * 2 * Math.PI;
      const k = 3 * (y * width + x);
      dirs[k] = Math.cos(lat) * Math.cos(lon);
      dirs[k + 1] = Math.cos(lat) * Math.sin(lon);
      dirs[k + 2] = Math.sin(lat);
    }
  }
  const elevation = new Float32Array(width * height);
  const fresh = new Float32Array(width * height);
  for (const crater of craters) {
    const rho = crater.D / 2 / radiusKm;
    const reach = P.ejectaReach * rho;
    const depth = Math.min(P.depthRatio * crater.D, P.maxDepthKm) * 1000 * crater.freshness;
    const rim = P.rimRatio * crater.D * 1000 * crater.freshness;
    const [cx, cy, cz] = crater.dir;
    const latC = Math.asin(cz);
    const lonC = Math.atan2(cy, cx);
    // Las filas que toca (y todas las columnas si llega a un polo).
    const y0 = Math.max(0, Math.floor(((Math.PI / 2 - (latC + reach)) * height) / Math.PI));
    const y1 = Math.min(height - 1, Math.ceil(((Math.PI / 2 - (latC - reach)) * height) / Math.PI));
    const polar = Math.abs(latC) + reach >= Math.PI / 2 - 1e-6;
    const halfLon = polar ? Math.PI : Math.asin(Math.min(1, Math.sin(reach) / Math.cos(latC)));
    const x0 = Math.floor(((lonC - halfLon) / (2 * Math.PI) + 0.5) * width) - 1;
    const x1 = Math.ceil(((lonC + halfLon) / (2 * Math.PI) + 0.5) * width) + 1;
    const cosReach = Math.cos(reach);
    for (let y = y0; y <= y1; y++) {
      for (let xx = polar ? 0 : x0; xx <= (polar ? width - 1 : x1); xx++) {
        const x = ((xx % width) + width) % width;
        const k = y * width + x;
        const dot = dirs[3 * k] * cx + dirs[3 * k + 1] * cy + dirs[3 * k + 2] * cz;
        if (dot < cosReach) continue;
        const t = Math.acos(Math.min(1, dot)) / rho;
        if (t < 1) {
          // El cuenco (parabólico) hasta el borde, sobre lo que había, en parte borrado.
          const keep = 1 - P.erase * (1 - t * t);
          elevation[k] = elevation[k] * keep - depth + (depth + rim) * t * t;
          fresh[k] = Math.max(fresh[k] * keep, crater.freshness ** 4);
        } else {
          // Lo expulsado: del borde hacia fuera, cayendo con el cubo de la distancia, sin escalón al
          // final.
          const fade = 1 - smoothstep(0.6 * P.ejectaReach, P.ejectaReach, t);
          elevation[k] += rim * t ** -3 * fade;
          fresh[k] = Math.max(fresh[k], crater.freshness ** 4 * t ** -2 * fade);
        }
      }
    }
  }
  const albedo = new Float32Array(width * height);
  let sum = 0;
  let weight = 0;
  for (let y = 0; y < height; y++) {
    const latDeg = 90 - ((y + 0.5) * 180) / height;
    const w = Math.cos((latDeg * Math.PI) / 180);
    for (let x = 0; x < width; x++) {
      const lonDeg = ((x + 0.5) / width - 0.5) * 360;
      const k = y * width + x;
      const noise = sphereFbm(latDeg, lonDeg, { frequency: 3, octaves: 6, seed: seed + 101 });
      albedo[k] = 1 + P.albedoNoise * noise + P.freshBrightening * fresh[k];
      sum += w * albedo[k];
      weight += w;
    }
  }
  const mean = sum / weight;
  for (let k = 0; k < albedo.length; k++) albedo[k] /= mean;
  return { elevation, albedo, count: craters.length };
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
