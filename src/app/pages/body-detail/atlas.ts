import { PLANETS, findBody } from '../../data/body-index';
import type { BodyId } from '../../data/body.model';
import { moonsByDistance } from '../shared/moons';

/**
 * El orden del atlas, para pasar de una ficha a la siguiente (fase 9c, 9c.7): el Sol y cada planeta,
 * del más cercano al más lejano, seguido de sus lunas, de la más cercana a la más lejana.
 */
export const ATLAS: readonly BodyId[] = [
  'sol',
  ...PLANETS.flatMap((planet) => [planet.id, ...moonsByDistance(planet.id).map((moon) => moon.id)]),
];

export interface AtlasPage {
  readonly id: BodyId;
  readonly name: string;
}

/** La ficha anterior y la siguiente de un cuerpo en el atlas (en los extremos, `null`). */
export function atlasNeighbors(id: BodyId): {
  readonly previous: AtlasPage | null;
  readonly next: AtlasPage | null;
} | null {
  const at = ATLAS.indexOf(id);
  if (at < 0) return null;
  const page = (other: BodyId | undefined): AtlasPage | null =>
    other ? { id: other, name: findBody(other)?.name ?? other } : null;
  return { previous: page(ATLAS[at - 1]), next: page(ATLAS[at + 1]) };
}
