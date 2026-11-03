import { getBody } from '../../data/bodies';
import { moonsOf } from '../../data/body-links';
import type { BodyId } from '../../data/body.model';

/**
 * Las lunas de un planeta, de la más cercana a la más lejana (por su semieje mayor): en el índice de
 * lunas y en las fichas (revisión de la fase 9, hallazgo 6: en el catálogo, Tritón va antes que Proteo).
 */
export const moonsByDistance = (id: BodyId) =>
  [...moonsOf(id)].sort(
    (a, b) =>
      (getBody(a.id).orbit?.semiMajorAxisKm.value ?? 0) -
      (getBody(b.id).orbit?.semiMajorAxisKm.value ?? 0),
  );
