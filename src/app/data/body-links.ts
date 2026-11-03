/**
 * Enlaces de los cuerpos (fase 9): la ruta de su ficha, sus lunas y el «Ver en 3D». Aparte del índice
 * ligero (`body-index.ts`, que va en el bundle inicial con las rutas): esto solo lo usan las fichas, sus
 * índices y la interfaz del explorador, que se cargan en diferido.
 */
import { BODY_INDEX, findBody } from './body-index';
import type { BodyId, BodyIndexEntry } from './body.model';

/** Ruta de la ficha de un cuerpo (fase 9): /sol, /luna, /planetas/:id o /lunas/:id. */
export function bodyPagePath(id: BodyId): string {
  if (id === 'sol') return '/sol';
  if (id === 'luna') return '/luna';
  return findBody(id)?.kind === 'planet' ? `/planetas/${id}` : `/lunas/${id}`;
}

/** Las lunas de un planeta, en el orden del catálogo (las fichas las ordenan por su distancia). */
export const moonsOf = (id: BodyId): readonly BodyIndexEntry[] =>
  BODY_INDEX.filter((body) => body.kind === 'moon' && body.parent === id);

/**
 * «Ver en 3D» desde la ficha (fase 9): la Tierra y la Luna, en sus vistas; el resto, en el sistema
 * solar con ese cuerpo elegido (`?cuerpo=`).
 */
export function explorerLinkOf(id: BodyId): {
  readonly path: string;
  readonly query: Readonly<Record<string, string>>;
} {
  if (id === 'tierra') return { path: '/explorar/tierra', query: {} };
  if (id === 'luna') return { path: '/explorar/luna', query: {} };
  return { path: '/', query: { cuerpo: id } };
}
