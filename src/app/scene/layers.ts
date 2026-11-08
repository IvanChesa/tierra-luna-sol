/**
 * Las capas de three del bloom del Sol (fase 9b, D41; `sun-bloom.ts`). Todo lo de la escena está en
 * la capa 0, la de la cámara: estas capas solo eligen qué entra en el render del bloom.
 * - `SUN_LAYER`: el Sol, la fuente del resplandor.
 * - `OCCLUDER_LAYER`: los cuerpos que lo tapan en este frame (en negro, solo para la profundidad):
 *   los que se ven delante de su disco, no todos (`sunOccluders`, en `picking.ts`).
 */
export const SUN_LAYER = 1;
export const OCCLUDER_LAYER = 2;
