/**
 * El cielo desde un lugar de la Tierra (fase 8, «El cielo desde España»): dónde están el Sol, la Luna
 * y los planetas en el cielo del lugar, su brillo y su constelación; la fase del cielo según la altura
 * del Sol; y la refracción de las estrellas (la misma fórmula que astronomy-engine, que copia el shader
 * de la escena).
 *
 * Las posiciones son topocéntricas y aparentes (`Equator` con el observador, de la fecha y con
 * aberración) y su altura lleva la refracción `normal` de astronomy-engine, la que usa también para
 * las salidas y las puestas. La geométrica (sin refracción) es la de los crepúsculos (−6°, −12° y
 * −18°), que por convención no se corrigen (`SearchAltitude`).
 */
import {
  Body,
  Constellation,
  Equator,
  Horizon,
  Illumination,
  MakeTime,
  Refraction,
} from 'astronomy-engine';
import { KM_PER_AU, MOON_RADIUS_KM, SUN_RADIUS_KM } from './constants';
import { GeoObserver, astronomyObserver, horizontalToSkyThree } from './coordinates';
import { toAstroTime } from './time';
import type { Vec3 } from './vec3';

const DEG = Math.PI / 180;

/** Lo que se dibuja en el cielo además de las estrellas: el Sol, la Luna y los siete planetas. */
export const SKY_BODY_IDS = [
  'sol',
  'luna',
  'mercurio',
  'venus',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
] as const;
export type SkyBodyId = (typeof SKY_BODY_IDS)[number];

export const SKY_BODIES: Readonly<Record<SkyBodyId, Body>> = {
  sol: Body.Sun,
  luna: Body.Moon,
  mercurio: Body.Mercury,
  venus: Body.Venus,
  marte: Body.Mars,
  jupiter: Body.Jupiter,
  saturno: Body.Saturn,
  urano: Body.Uranus,
  neptuno: Body.Neptune,
};

export interface SkyBody {
  readonly id: SkyBodyId;
  /** Rumbo desde el norte hacia el este, en [0, 360). */
  readonly azimuthDeg: number;
  /** Altura aparente del centro, con la refracción. */
  readonly altitudeDeg: number;
  /** Altura geométrica del centro, sin refracción. */
  readonly geometricAltitudeDeg: number;
  /** La dirección aparente en los ejes del cielo en Three (X al este, Y al cénit, Z al sur). */
  readonly direction: Vec3;
  /** Magnitud visual (`Illumination`). */
  readonly magnitude: number;
  /** Fracción iluminada del disco (1 en el Sol). */
  readonly phaseFraction: number;
  /** Radio aparente del disco (grados): el Sol y la Luna; en los planetas, 0 (se dibujan como puntos). */
  readonly angularRadiusDeg: number;
  /** Distancia al observador (UA). */
  readonly distanceAu: number;
}

/**
 * El Sol, la Luna y los planetas en el cielo del lugar en un instante. Unos 9 × 2 cálculos de
 * astronomy-engine: se puede llamar en cada frame (la escena del cielo lo hace solo si cambian el
 * instante o el lugar).
 */
export function skyBodies(date: Date, place: GeoObserver): SkyBody[] {
  const time = toAstroTime(date);
  const observer = astronomyObserver(place);
  return SKY_BODY_IDS.map((id) => {
    const body = SKY_BODIES[id];
    const equator = Equator(body, time, observer, true, true);
    const apparent = Horizon(time, observer, equator.ra, equator.dec, 'normal');
    const geometric = Horizon(time, observer, equator.ra, equator.dec);
    const illumination = Illumination(body, time);
    const distanceKm = equator.dist * KM_PER_AU;
    const radiusKm = id === 'sol' ? SUN_RADIUS_KM : id === 'luna' ? MOON_RADIUS_KM : 0;
    return {
      id,
      azimuthDeg: apparent.azimuth,
      altitudeDeg: apparent.altitude,
      geometricAltitudeDeg: geometric.altitude,
      direction: horizontalToSkyThree(apparent.azimuth, apparent.altitude),
      magnitude: illumination.mag,
      phaseFraction: id === 'sol' ? 1 : illumination.phase_fraction,
      angularRadiusDeg: radiusKm > 0 ? Math.asin(radiusKm / distanceKm) / DEG : 0,
      distanceAu: equator.dist,
    };
  });
}

/**
 * Los instantes que salen de una búsqueda (la salida del Sol de la última noche de 2100 cae en 2101)
 * pueden quedar un poco fuera del rango de `toAstroTime`; astronomy-engine los calcula bien.
 */
const searchTime = (date: Date) => MakeTime(date);

/** El símbolo IAU de la constelación en la que se ve un cuerpo (`Gem`, `Sgr`…), con J2000. */
export function constellationOf(id: SkyBodyId, date: Date, place: GeoObserver): string {
  const time = searchTime(date);
  const j2000 = Equator(SKY_BODIES[id], time, astronomyObserver(place), false, true);
  return Constellation(j2000.ra, j2000.dec).symbol;
}

/** El rumbo y la altura (aparente) de un cuerpo en un instante, sin lo demás (las búsquedas). */
export function horizontalOf(
  id: SkyBodyId,
  date: Date,
  place: GeoObserver,
): { azimuthDeg: number; altitudeDeg: number } {
  const time = searchTime(date);
  const observer = astronomyObserver(place);
  const equator = Equator(SKY_BODIES[id], time, observer, true, true);
  const apparent = Horizon(time, observer, equator.ra, equator.dec, 'normal');
  return { azimuthDeg: apparent.azimuth, altitudeDeg: apparent.altitude };
}

/**
 * Altura del borde de arriba del Sol o de la Luna (grados, con la refracción): la del centro más su
 * radio aparente. Es el criterio de las salidas y las puestas de astronomy-engine (`SearchRiseSet` da
 * por salido el astro cuando asoma su borde), salvo la refracción en el horizonte: la `normal` es algo
 * mayor que sus 34′ fijos, y el borde asoma con esta unos segundos antes (menos de 0,1°). Con ella se
 * decide si un eclipse se ve (revisión de la fase 8, hallazgo 9).
 */
export function upperLimbAltitudeOf(id: 'sol' | 'luna', date: Date, place: GeoObserver): number {
  const time = searchTime(date);
  const observer = astronomyObserver(place);
  const equator = Equator(SKY_BODIES[id], time, observer, true, true);
  const apparent = Horizon(time, observer, equator.ra, equator.dec, 'normal');
  const radiusKm = id === 'sol' ? SUN_RADIUS_KM : MOON_RADIUS_KM;
  return apparent.altitude + Math.asin(radiusKm / (equator.dist * KM_PER_AU)) / DEG;
}

/**
 * Refracción atmosférica (grados) que levanta una estrella a esa altura geométrica: la `normal` de
 * astronomy-engine, la fórmula de Saemundsson (Meeus, «Astronomical Algorithms», cap. 16) acotada a −1°
 * y reducida linealmente hasta el nadir. La copia el shader de las estrellas del cielo
 * (`scene/sky/`); el test comprueba que es la misma que `Refraction('normal', h)`.
 */
export function refractionDeg(altitudeDeg: number): number {
  if (altitudeDeg < -90 || altitudeDeg > 90) return 0;
  const hd = Math.max(altitudeDeg, -1);
  let refraction = 1.02 / Math.tan((hd + 10.3 / (hd + 5.11)) * DEG) / 60;
  if (altitudeDeg < -1) refraction *= (altitudeDeg + 90) / 89;
  return refraction;
}

/** La de astronomy-engine, para los tests y para quien quiera la referencia. */
export const referenceRefractionDeg = (altitudeDeg: number): number =>
  Refraction('normal', altitudeDeg);

/**
 * Altura geométrica del centro del Sol en la salida y la puesta: el borde superior en el horizonte,
 * con 34′ de refracción y 16′ de semidiámetro (la convención del USNO y de astronomy-engine).
 */
export const SUNRISE_ALTITUDE_DEG = -0.833;

/** Las fases del cielo según la altura geométrica del Sol. */
export type SkyPhase = 'day' | 'civil' | 'nautical' | 'astronomical' | 'night';

/**
 * La fase del cielo: de día con el Sol sobre el horizonte (su borde superior); el crepúsculo civil
 * hasta −6°, el náutico hasta −12° y el astronómico hasta −18°; y de noche por debajo.
 */
export function skyPhase(sunGeometricAltitudeDeg: number): SkyPhase {
  const h = sunGeometricAltitudeDeg;
  if (h > SUNRISE_ALTITUDE_DEG) return 'day';
  if (h > -6) return 'civil';
  if (h > -12) return 'nautical';
  if (h > -18) return 'astronomical';
  return 'night';
}

/** Los ocho rumbos de la rosa de los vientos, de 45° en 45° desde el norte. */
export const COMPASS_POINTS = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw'] as const;
export type CompassPoint = (typeof COMPASS_POINTS)[number];

/** El rumbo de la rosa de los vientos más cercano (cada uno abarca ±22,5°). */
export function compassPoint(azimuthDeg: number): CompassPoint {
  const a = ((azimuthDeg % 360) + 360) % 360;
  return COMPASS_POINTS[Math.round(a / 45) % 8] as CompassPoint;
}

/** Hasta esta magnitud, un cuerpo se ve a simple vista con el cielo oscuro. */
export const NAKED_EYE_MAGNITUDE = 6;
