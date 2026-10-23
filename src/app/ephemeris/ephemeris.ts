/**
 * Efemérides del Sol, los planetas y la Luna con astronomy-engine (D4).
 * Todas las posiciones son geométricas (sin tiempo de luz ni aberración), en UA y en ECL.
 */
import { Body, GeoMoon, HelioVector, Illumination, MoonPhase } from 'astronomy-engine';
import { eqjToEcl } from './coordinates';
import { PlanetId } from './ids';
import { toAstroTime } from './time';
import { Vec3, length, sub } from './vec3';

const PLANET_BODIES: Record<PlanetId, Body> = {
  mercurio: Body.Mercury,
  venus: Body.Venus,
  tierra: Body.Earth,
  marte: Body.Mars,
  jupiter: Body.Jupiter,
  saturno: Body.Saturn,
  urano: Body.Uranus,
  neptuno: Body.Neptune,
};

/** Posición heliocéntrica (centro del Sol → centro del planeta), ECL, UA. */
export function planetHeliocentric(planet: PlanetId, date: Date): Vec3 {
  return eqjToEcl(HelioVector(PLANET_BODIES[planet], toAstroTime(date)));
}

/** Posición geocéntrica de la Luna (centro de la Tierra → centro de la Luna), ECL, UA. */
export function moonGeocentric(date: Date): Vec3 {
  return eqjToEcl(GeoMoon(toAstroTime(date)));
}

/** Distancias de un cuerpo al Sol y a la Tierra, en UA, a partir de posiciones heliocéntricas. */
export function distancesAu(
  heliocentric: Vec3,
  earthHeliocentric: Vec3,
): { toSun: number; toEarth: number } {
  return { toSun: length(heliocentric), toEarth: length(sub(heliocentric, earthHeliocentric)) };
}

/** Nombres de la fase lunar en español. */
export const MOON_PHASE_NAMES = [
  'Luna nueva',
  'Luna creciente',
  'Cuarto creciente',
  'Gibosa creciente',
  'Luna llena',
  'Gibosa menguante',
  'Cuarto menguante',
  'Luna menguante',
] as const;
export type MoonPhaseName = (typeof MOON_PHASE_NAMES)[number];

/**
 * Margen, en grados de elongación, en el que se usa el nombre de una fase principal
 * (nueva, cuartos, llena). La Luna gana unos 12,2° al día al Sol, así que ±7° son unas
 * ±14 horas alrededor del instante exacto. Es una convención de presentación del proyecto.
 */
export const PRINCIPAL_PHASE_HALF_WIDTH_DEG = 7;

export interface MoonPhaseInfo {
  /** Elongación eclíptica Luna − Sol, en grados [0, 360): 0 nueva, 90 cuarto creciente, 180 llena. */
  readonly angleDeg: number;
  /** Fracción iluminada del disco [0, 1]. */
  readonly illuminatedFraction: number;
  readonly name: MoonPhaseName;
  readonly waxing: boolean;
}

/** Nombre de la fase para una elongación dada (grados). */
export function moonPhaseName(angleDeg: number): MoonPhaseName {
  const a = ((angleDeg % 360) + 360) % 360;
  const w = PRINCIPAL_PHASE_HALF_WIDTH_DEG;
  if (a < w || a >= 360 - w) return 'Luna nueva';
  if (a < 90 - w) return 'Luna creciente';
  if (a < 90 + w) return 'Cuarto creciente';
  if (a < 180 - w) return 'Gibosa creciente';
  if (a < 180 + w) return 'Luna llena';
  if (a < 270 - w) return 'Gibosa menguante';
  if (a < 270 + w) return 'Cuarto menguante';
  return 'Luna menguante';
}

export function moonPhase(date: Date): MoonPhaseInfo {
  const time = toAstroTime(date);
  const angleDeg = MoonPhase(time);
  return {
    angleDeg,
    illuminatedFraction: Illumination(Body.Moon, time).phase_fraction,
    name: moonPhaseName(angleDeg),
    waxing: angleDeg < 180,
  };
}
