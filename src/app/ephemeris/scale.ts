/**
 * Escalas de la escena (PLAN §4.4). Funciones puras en float64; las usan igual los cuerpos, las
 * órbitas y las estelas para que todo encaje.
 *
 * - Ilustrativa: la distancia al Sol se comprime con r_vis = K · log10(1 + r / R0), con R0 = 0,1 UA,
 *   y la dirección real se conserva. Los radios se agrandan con una potencia acotada.
 * - Real: distancias y radios físicos (en unidades de escena de `kmPerUnit` km).
 * - Transición: interpolación geométrica de las distancias y los radios. Como la escala
 *   ilustrativa conserva las direcciones y el orden de las distancias, ningún cuerpo adelanta a
 *   otro a mitad de la transición.
 */
import { KM_PER_AU } from './constants';
import { Vec3, length, lerp, scale } from './vec3';

export type ScaleMode = 'illustrative' | 'real';

export interface IllustrativeScale {
  /** K: unidades de escena por década de distancia. */
  readonly unitsPerDecade: number;
  /** R0: distancia de referencia, en UA. */
  readonly referenceAu: number;
  /** Radio visible = clamp(radiusFactor · radio_km ^ radiusExponent, minRadius, maxRadius). */
  readonly radiusFactor: number;
  readonly radiusExponent: number;
  readonly minRadius: number;
  readonly maxRadius: number;
  /** Separación de los sistemas de lunas: offset_vis = R_vis · (1 + moonSpread · log10(r / R)). */
  readonly moonSpread: number;
}

/**
 * Valores iniciales (presentación, sin significado físico): Neptuno queda a ~248 unidades, la
 * Tierra a ~104 y Mercurio a ~69. Se ajustarán con la escena (fases 2 y 7).
 */
export const DEFAULT_ILLUSTRATIVE_SCALE: IllustrativeScale = {
  unitsPerDecade: 100,
  referenceAu: 0.1,
  radiusFactor: 0.06,
  radiusExponent: 0.4,
  minRadius: 0.25,
  maxRadius: 9,
  moonSpread: 1.5,
};

export interface RealScale {
  /** Kilómetros por unidad de escena. */
  readonly kmPerUnit: number;
}

export const DEFAULT_REAL_SCALE: RealScale = { kmPerUnit: 1_000_000 };

/** Distancia ilustrativa (unidades de escena) para una distancia real en UA. Monótona creciente. */
export function illustrativeDistance(
  distanceAu: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  if (distanceAu < 0 || Number.isNaN(distanceAu)) throw new RangeError('Distancia no válida.');
  return params.unitsPerDecade * Math.log10(1 + distanceAu / params.referenceAu);
}

/** Inversa de {@link illustrativeDistance}. */
export function illustrativeDistanceToAu(
  units: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  return params.referenceAu * (10 ** (units / params.unitsPerDecade) - 1);
}

/** Cambia la longitud de un vector conservando su dirección. El vector nulo se queda nulo. */
function withLength(v: Vec3, newLength: number): Vec3 {
  const len = length(v);
  return len === 0 ? v : scale(v, newLength / len);
}

/** Posición heliocéntrica (UA) → posición ilustrativa (unidades de escena), misma dirección. */
export const illustrativePosition = (
  heliocentricAu: Vec3,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): Vec3 => withLength(heliocentricAu, illustrativeDistance(length(heliocentricAu), params));

/** Posición heliocéntrica (UA) → posición real (unidades de escena). */
export const realPosition = (heliocentricAu: Vec3, params: RealScale = DEFAULT_REAL_SCALE): Vec3 =>
  scale(heliocentricAu, KM_PER_AU / params.kmPerUnit);

/** Radio visible de un cuerpo en la escala ilustrativa. Monótono y acotado. */
export function illustrativeRadius(
  radiusKm: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): number {
  const raw = params.radiusFactor * radiusKm ** params.radiusExponent;
  return Math.min(Math.max(raw, params.minRadius), params.maxRadius);
}

export const realRadius = (radiusKm: number, params: RealScale = DEFAULT_REAL_SCALE): number =>
  radiusKm / params.kmPerUnit;

/**
 * Posición de una luna respecto a su planeta en la escala ilustrativa: misma dirección y una
 * distancia que crece con el logaritmo de la real, siempre fuera del planeta agrandado.
 */
export function illustrativeMoonOffset(
  offsetAu: Vec3,
  planetRadiusKm: number,
  planetVisibleRadius: number,
  params: IllustrativeScale = DEFAULT_ILLUSTRATIVE_SCALE,
): Vec3 {
  const ratio = Math.max((length(offsetAu) * KM_PER_AU) / planetRadiusKm, 1);
  return withLength(offsetAu, planetVisibleRadius * (1 + params.moonSpread * Math.log10(ratio)));
}

/** Interpolación geométrica de dos magnitudes positivas: t = 0 da `a`, t = 1 da `b`. */
export function blendMagnitude(a: number, b: number, t: number): number {
  if (t <= 0) return a;
  if (t >= 1) return b;
  if (a <= 0 || b <= 0) return a + (b - a) * t;
  return a ** (1 - t) * b ** t;
}

/**
 * Transición entre dos posiciones de un mismo cuerpo (ilustrativa → real con t de 0 a 1).
 * Interpola la dirección linealmente y la distancia de forma geométrica.
 */
export function blendPosition(from: Vec3, to: Vec3, t: number): Vec3 {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const direction = lerp(from, to, t);
  return withLength(direction, blendMagnitude(length(from), length(to), t));
}
