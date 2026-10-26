/**
 * El sistema que dibuja la escena: los 30 cuerpos del catálogo con lo que el motor necesita de
 * cada uno (padre, radio, achatamiento, cómo se orienta). El modelo de efemérides que los coloca
 * está en `data/solar-system.ts` (sin three): también lo usa la interfaz.
 */
import { BODY_DATA } from '../data/body-data';
import { BODY_INDEX } from '../data/body-index';
import type { BodyId, BodyKind } from '../data/body.model';
import { MOON_ELEMENTS } from '../data/moon-elements';
import { isGalilean, isMeanElementsMoon } from '../data/solar-system';
import { KM_PER_AU } from '../ephemeris/constants';
import { GalileanId, PlanetId, isPlanetId } from '../ephemeris/ids';
import { MeanElements } from '../ephemeris/moons';
import { IauBodyId } from '../ephemeris/orientation';

export { createSolarSystemModel, offsetFunction } from '../data/solar-system';

/** Cómo se orienta cada cuerpo (D19). */
export type RotationModel =
  | { readonly kind: 'iau'; readonly body: IauBodyId }
  | { readonly kind: 'galilean'; readonly moon: GalileanId }
  | { readonly kind: 'mean-elements'; readonly elements: MeanElements };

export interface SceneBody {
  readonly id: BodyId;
  readonly name: string;
  readonly kind: BodyKind;
  readonly parent: BodyId | null;
  /** Índice en el estado del sistema (mismo orden que el catálogo). */
  readonly index: number;
  /** Radio ecuatorial en los planetas, medio en el resto (km). */
  readonly radiusKm: number;
  /** Achatamiento f = (a − c) / a (0 si el catálogo no lo da). */
  readonly flattening: number;
  readonly rotation: RotationModel;
}

function rotationOf(id: BodyId): RotationModel {
  if (id === 'sol' || id === 'luna' || isPlanetId(id)) return { kind: 'iau', body: id };
  if (isGalilean(id)) return { kind: 'galilean', moon: id };
  if (isMeanElementsMoon(id))
    return { kind: 'mean-elements', elements: MOON_ELEMENTS[id].elements };
  throw new Error(`No sé orientar «${id}».`);
}

/** Los 30 cuerpos en el orden del catálogo (los padres van antes que sus lunas). */
export const SCENE_BODIES: readonly SceneBody[] = BODY_INDEX.map((entry, index) => ({
  id: entry.id,
  name: entry.name,
  kind: entry.kind,
  parent: entry.parent,
  index,
  radiusKm: BODY_DATA[entry.id].physical.radiusKm.value,
  flattening: BODY_DATA[entry.id].physical.flatteningRatio?.value ?? 0,
  rotation: rotationOf(entry.id),
}));

const BY_ID = new Map<string, SceneBody>(SCENE_BODIES.map((body) => [body.id, body]));

export function sceneBody(id: BodyId): SceneBody {
  const body = BY_ID.get(id);
  if (!body) throw new Error(`No hay ningún cuerpo «${id}» en la escena.`);
  return body;
}

/** Planeta del sistema al que pertenece un cuerpo (él mismo si es un planeta; null para el Sol). */
export function systemPlanetOf(id: BodyId): PlanetId | null {
  const body = sceneBody(id);
  if (body.kind === 'planet') return body.id as PlanetId;
  if (body.kind === 'moon' && body.parent && isPlanetId(body.parent)) return body.parent;
  return null;
}

/** Radios (km) en el orden del estado del sistema. */
export const RADII_KM = Float64Array.from(SCENE_BODIES, (body) => body.radiusKm);

function neptuneSemiMajorAxisAu(): number {
  const km = BODY_DATA.neptuno.orbit?.semiMajorAxisKm.value;
  if (km === undefined) throw new Error('Falta el semieje mayor de Neptuno en el catálogo.');
  return km / KM_PER_AU;
}

/** Semieje mayor de Neptuno (UA, de la ficha de la NASA): la referencia de la escala real global. */
export const NEPTUNE_SEMI_MAJOR_AXIS_AU = neptuneSemiMajorAxisAu();
