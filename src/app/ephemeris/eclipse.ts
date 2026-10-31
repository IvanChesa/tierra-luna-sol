/**
 * Eclipses de Sol (fase 5): dónde cae el centro de la sombra de la Luna sobre la Tierra. Eclipses de
 * Luna (fase 6): la sombra de la Tierra a la distancia de la Luna (`earthShadow`). Y las sombras de
 * las lunas sobre su planeta (fase 7, `satelliteShadowPoint`), como las de las galileanas en Júpiter.
 *
 * El eje de la sombra es la recta que va del Sol a la Luna y sigue más allá. Donde corta el
 * elipsoide terrestre está el centro de la sombra; en el máximo de un eclipse central, el punto del
 * máximo que da el catálogo de la NASA. El Sol es el aparente, con la aberración anual (de donde
 * llega su luz; sin ella, la sombra se aparta unos 36 km), y la Luna, la geométrica; con la misma
 * orientación de la Tierra que la escena (`eclToEarthFixed`), que también da al shader de la Tierra
 * la Luna y el Sol en su sistema propio.
 */
import { KM_PER_AU, MOON_RADIUS_KM, SUN_RADIUS_KM } from './constants';
import { ECL_TO_EQJ, eclToEarthFixed, sunApparentGeocentricEcl } from './coordinates';
import { moonGeocentric } from './ephemeris';
import {
  Vec3,
  add,
  angleBetweenDeg,
  dot,
  length,
  mulMat3Vec,
  normalize,
  scale,
  sub,
  vec3,
} from './vec3';

/** Elipsoide WGS84: semieje mayor (km) y achatamiento (EPSG 7030). */
export const WGS84_EQUATORIAL_KM = 6378.137;
export const WGS84_FLATTENING = 1 / 298.257223563;
export const WGS84_SOURCE = 'https://epsg.io/7030-ellipsoid';

const DEG = Math.PI / 180;

/**
 * Centro de la sombra de la Luna: latitud geodésica y longitud (grados, este positivo) donde el eje
 * de la sombra corta el elipsoide WGS84, o `null` si no lo corta (no hay eclipse central).
 */
export function moonShadowCenter(date: Date): { latDeg: number; lonDeg: number } | null {
  const toEarthFixed = eclToEarthFixed(date);
  const auToRadii = KM_PER_AU / WGS84_EQUATORIAL_KM;
  const moon = mulMat3Vec(toEarthFixed, scale(moonGeocentric(date), auToRadii));
  const sun = mulMat3Vec(toEarthFixed, scale(sunApparentGeocentricEcl(date), auToRadii));
  const axis = sub(moon, sun);
  // El elipsoide se lleva a la esfera unidad estirando el eje polar.
  const squash = 1 - WGS84_FLATTENING;
  const from = vec3(moon.x, moon.y, moon.z / squash);
  const toward = normalize(vec3(axis.x, axis.y, axis.z / squash));
  const b = dot(from, toward);
  const discriminant = b * b - (dot(from, from) - 1);
  if (discriminant < 0) return null;
  const t = -b - Math.sqrt(discriminant);
  if (t < 0) return null;
  const x = from.x + t * toward.x;
  const y = from.y + t * toward.y;
  const z = (from.z + t * toward.z) * squash;
  // Latitud geodésica: la de la normal del elipsoide en ese punto.
  const e2 = WGS84_FLATTENING * (2 - WGS84_FLATTENING);
  const latDeg = Math.atan2(z, (1 - e2) * Math.hypot(x, y)) / DEG;
  let lonDeg = Math.atan2(y, x) / DEG;
  if (lonDeg <= -180) lonDeg += 360;
  return { latDeg, lonDeg };
}

// --- Eclipses de Luna (fase 6) ---------------------------------------------------------------------

/**
 * Regla de Danjon, la que usa el catálogo de eclipses de la NASA: la atmósfera agranda la sombra como
 * si el radio de la Tierra fuera 1/85 mayor (unos 75 km). Con el radio de la Tierra a 45° de latitud
 * (por su achatamiento), da los radios de la umbra y la penumbra de la NASA (0,6983° y 1,2361° en el
 * eclipse del 3-3-2026: https://eclipse.gsfc.nasa.gov/LEplot/LEplot2001/LE2026Mar03T.pdf).
 */
export const DANJON_ENLARGEMENT = 1 / 85;

/** Radio efectivo de la Tierra para su sombra (km): a 45° de latitud y agrandado por la atmósfera. */
export const EARTH_SHADOW_RADIUS_KM =
  WGS84_EQUATORIAL_KM * (1 - WGS84_FLATTENING / 2) * (1 + DANJON_ENLARGEMENT);

/** La sombra de la Tierra a la distancia de la Luna, vista desde el centro de la Tierra. */
export interface EarthShadow {
  /** Radios angulares de la umbra y la penumbra (grados). */
  readonly umbraDeg: number;
  readonly penumbraDeg: number;
  /** Semidiámetro de la Luna (grados). */
  readonly moonDeg: number;
  /** Distancia angular del centro de la Luna al eje de la sombra (grados). */
  readonly axisDeg: number;
  /**
   * Esa distancia en radios ecuatoriales de la Tierra, a la distancia de la Luna, negativa si la Luna
   * pasa al sur del eje (en declinación): el «gamma» de la NASA.
   */
  readonly gamma: number;
  /** Fracción del diámetro de la Luna dentro de la umbra y de la penumbra (las de la NASA). */
  readonly umbralMagnitude: number;
  readonly penumbralMagnitude: number;
}

/**
 * La sombra de la Tierra en un instante (UTC). El eje es la dirección opuesta al Sol aparente (de
 * donde llega su luz, con la aberración); la Luna, la geométrica, como en `moonShadowCenter`. Los
 * radios: π_L + π_S ∓ s_S, con la paralaje de la Luna (π_L) calculada con el radio de
 * `EARTH_SHADOW_RADIUS_KM`, la del Sol (π_S) y su semidiámetro (s_S).
 */
export function earthShadow(date: Date): EarthShadow {
  const moon = moonGeocentric(date);
  const sun = sunApparentGeocentricEcl(date);
  const moonKm = length(moon) * KM_PER_AU;
  const sunKm = length(sun) * KM_PER_AU;
  const moonParallax = Math.asin(EARTH_SHADOW_RADIUS_KM / moonKm);
  const sunParallax = Math.asin(WGS84_EQUATORIAL_KM / sunKm);
  const sunRadius = Math.asin(SUN_RADIUS_KM / sunKm);
  const moonRadius = Math.asin(MOON_RADIUS_KM / moonKm);
  const umbra = moonParallax + sunParallax - sunRadius;
  const penumbra = moonParallax + sunParallax + sunRadius;
  const antisolar = scale(sun, -1);
  const axis = angleBetweenDeg(moon, antisolar) * DEG;
  // El signo, por la declinación (ecuador de J2000): al norte o al sur del eje.
  const north =
    mulMat3Vec(ECL_TO_EQJ, normalize(moon)).z > mulMat3Vec(ECL_TO_EQJ, normalize(antisolar)).z;
  const magnitude = (radius: number) => (radius + moonRadius - axis) / (2 * moonRadius);
  return {
    umbraDeg: umbra / DEG,
    penumbraDeg: penumbra / DEG,
    moonDeg: moonRadius / DEG,
    axisDeg: axis / DEG,
    gamma: ((north ? 1 : -1) * moonKm * Math.sin(axis)) / WGS84_EQUATORIAL_KM,
    umbralMagnitude: magnitude(umbra),
    penumbralMagnitude: magnitude(penumbra),
  };
}

// --- Sombras de las lunas sobre su planeta (fase 7) ------------------------------------------------

/**
 * Dónde cae el centro de la sombra de una luna sobre su planeta: donde la recta que va del Sol a la
 * luna, más allá de ella, corta el planeta, tomado como una esfera de su radio ecuatorial (las lunas
 * regulares orbitan cerca de su ecuador). Es la misma geometría que pinta la escena (`TLS_SHADOWS`).
 * Posiciones respecto al centro del planeta (ECL, UA), como las del estado del sistema. Devuelve el
 * punto (igual) o `null` si la sombra no toca el planeta.
 */
export function satelliteShadowPoint(
  moonFromPlanet: Vec3,
  sunFromPlanet: Vec3,
  planetRadiusKm: number,
): Vec3 | null {
  const radius = planetRadiusKm / KM_PER_AU;
  const toward = normalize(sub(moonFromPlanet, sunFromPlanet));
  const b = dot(moonFromPlanet, toward);
  const discriminant = b * b - (dot(moonFromPlanet, moonFromPlanet) - radius * radius);
  if (discriminant < 0) return null;
  const t = -b - Math.sqrt(discriminant);
  // Detrás de la luna, no delante: si no, la luna está al otro lado del planeta (o dentro).
  if (t < 0) return null;
  return add(moonFromPlanet, scale(toward, t));
}
