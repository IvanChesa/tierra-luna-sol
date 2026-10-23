/**
 * Catálogo completo: índice + datos con fuente + textos. Pesa decenas de kB, así que solo lo
 * importa código que se carga en diferido (fichas y visor); las rutas usan `body-index.ts`.
 */
import { BODY_DATA } from './body-data';
import { BODY_INDEX } from './body-index';
import { BODY_TEXTS } from './body-texts';
import type { Body, BodyId } from './body.model';

export const BODIES: readonly Body[] = BODY_INDEX.map((entry) => ({
  ...entry,
  ...BODY_DATA[entry.id],
  ...BODY_TEXTS[entry.id],
}));

const BY_ID = new Map<string, Body>(BODIES.map((body) => [body.id, body]));

export function getBody(id: BodyId): Body {
  const body = BY_ID.get(id);
  if (!body) throw new Error(`No hay ningún cuerpo «${id}» en el catálogo.`);
  return body;
}
