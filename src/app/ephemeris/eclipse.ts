/**
 * Eclipses de Sol (fase 5): dónde cae el centro de la sombra de la Luna sobre la Tierra.
 *
 * El eje de la sombra es la recta que va del Sol a la Luna y sigue más allá. Donde corta el
 * elipsoide terrestre está el centro de la sombra; en el máximo de un eclipse central, el punto del
 * máximo que da el catálogo de la NASA. El Sol es el aparente, con la aberración anual (de donde
 * llega su luz; sin ella, la sombra se aparta unos 36 km), y la Luna, la geométrica; con la misma
 * orientación de la Tierra que la escena (`eclToEarthFixed`), que también da al shader de la Tierra
 * la Luna y el Sol en su sistema propio.
 */
import { KM_PER_AU } from './constants';
import { eclToEarthFixed, sunApparentGeocentricEcl } from './coordinates';
import { moonGeocentric } from './ephemeris';
import { dot, mulMat3Vec, normalize, scale, sub, vec3 } from './vec3';

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
