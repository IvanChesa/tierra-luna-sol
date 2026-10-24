/**
 * El modelo de efemérides de los 30 cuerpos del catálogo (`ephemeris/system-state.ts` unido a
 * `data/`), sin `three`: lo usan el motor 3D y también la interfaz (las distancias del índice y de la
 * ficha), que así funciona aunque no haya WebGL. `ephemeris/` no conoce el catálogo (PLAN §4.2):
 * la unión se hace aquí.
 */
import { KM_PER_AU } from '../ephemeris/constants';
import { moonGeocentric, planetHeliocentric } from '../ephemeris/ephemeris';
import { GALILEAN_IDS, GalileanId, PlanetId, isPlanetId } from '../ephemeris/ids';
import { galileanMoons, meanElementsPosition } from '../ephemeris/moons';
import { SolarSystemModel, SystemBodySpec, SystemState } from '../ephemeris/system-state';
import { Vec3, length, sub, vec3 } from '../ephemeris/vec3';
import { BODY_INDEX } from './body-index';
import type { BodyId } from './body.model';
import { MOON_ELEMENTS, MeanElementsMoonId } from './moon-elements';

export const isGalilean = (id: string): id is GalileanId =>
  (GALILEAN_IDS as readonly string[]).includes(id);
export const isMeanElementsMoon = (id: string): id is MeanElementsMoonId => id in MOON_ELEMENTS;

/** De dónde sale la posición de cada cuerpo del catálogo. */
export function bodySource(id: BodyId): SystemBodySpec['source'] {
  if (id === 'sol') return { kind: 'sun' };
  if (isPlanetId(id)) return { kind: 'planet' };
  if (id === 'luna') return { kind: 'earth-moon' };
  if (isGalilean(id)) return { kind: 'galilean' };
  if (isMeanElementsMoon(id)) {
    const entry = MOON_ELEMENTS[id];
    return { kind: 'mean-elements', parent: entry.parent, elements: entry.elements };
  }
  throw new Error(`No sé calcular la posición de «${id}».`);
}

/** Crea el modelo de efemérides de los 30 cuerpos, en el orden del catálogo (con su caché). */
export const createSolarSystemModel = (cacheSize?: number): SolarSystemModel =>
  new SolarSystemModel(
    BODY_INDEX.map((entry) => ({ id: entry.id, source: bodySource(entry.id) })),
    cacheSize,
  );

/**
 * Posición de un cuerpo respecto a su padre (UA, ECL; heliocéntrica en los planetas), con las MISMAS
 * funciones que usa el estado del sistema. Para muestrear órbitas sin calcular los 30 cuerpos.
 */
export function offsetFunction(id: BodyId): (date: Date) => Vec3 {
  const source = bodySource(id);
  switch (source.kind) {
    case 'sun':
      return () => vec3(0, 0, 0);
    case 'planet':
      return (date) => planetHeliocentric(id as PlanetId, date);
    case 'earth-moon':
      return moonGeocentric;
    case 'galilean':
      return (date) => galileanMoons(date)[id as GalileanId];
    case 'mean-elements': {
      const elements = source.elements;
      return (date) => meanElementsPosition(elements, date);
    }
  }
}

/** Distancias de centro a centro, en km (`null` si no tienen sentido: el Sol al Sol…). */
export interface BodyDistances {
  readonly toSunKm: number | null;
  readonly toEarthKm: number | null;
  /** De una luna a su planeta. */
  readonly toParentKm: number | null;
}

export function bodyDistances(state: SystemState, id: BodyId): BodyDistances {
  const helio = state.heliocentricOf(id);
  const isMoon = BODY_INDEX.find((entry) => entry.id === id)?.kind === 'moon';
  return {
    toSunKm: id === 'sol' ? null : length(helio) * KM_PER_AU,
    toEarthKm:
      id === 'tierra' ? null : length(sub(helio, state.heliocentricOf('tierra'))) * KM_PER_AU,
    toParentKm: isMoon ? length(state.parentOffsetOf(id)) * KM_PER_AU : null,
  };
}
