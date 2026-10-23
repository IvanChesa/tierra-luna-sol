/**
 * Índice ligero de los 30 cuerpos (ids, nombres en español, tipo y cuerpo padre). Es lo único del
 * catálogo que va en el bundle inicial: lo usan las rutas. Los datos y los textos completos están
 * en `bodies.ts`, que solo se carga en diferido.
 */
import type { BodyId, BodyIndexEntry } from './body.model';

export const BODY_INDEX = [
  { id: 'sol', name: 'Sol', kind: 'star', parent: null },
  { id: 'mercurio', name: 'Mercurio', kind: 'planet', parent: 'sol' },
  { id: 'venus', name: 'Venus', kind: 'planet', parent: 'sol' },
  { id: 'tierra', name: 'Tierra', kind: 'planet', parent: 'sol' },
  { id: 'marte', name: 'Marte', kind: 'planet', parent: 'sol' },
  { id: 'jupiter', name: 'Júpiter', kind: 'planet', parent: 'sol' },
  { id: 'saturno', name: 'Saturno', kind: 'planet', parent: 'sol' },
  { id: 'urano', name: 'Urano', kind: 'planet', parent: 'sol' },
  { id: 'neptuno', name: 'Neptuno', kind: 'planet', parent: 'sol' },
  { id: 'luna', name: 'Luna', kind: 'moon', parent: 'tierra' },
  { id: 'fobos', name: 'Fobos', kind: 'moon', parent: 'marte' },
  { id: 'deimos', name: 'Deimos', kind: 'moon', parent: 'marte' },
  { id: 'io', name: 'Ío', kind: 'moon', parent: 'jupiter' },
  { id: 'europa', name: 'Europa', kind: 'moon', parent: 'jupiter' },
  { id: 'ganimedes', name: 'Ganímedes', kind: 'moon', parent: 'jupiter' },
  { id: 'calisto', name: 'Calisto', kind: 'moon', parent: 'jupiter' },
  { id: 'mimas', name: 'Mimas', kind: 'moon', parent: 'saturno' },
  { id: 'encelado', name: 'Encélado', kind: 'moon', parent: 'saturno' },
  { id: 'tetis', name: 'Tetis', kind: 'moon', parent: 'saturno' },
  { id: 'dione', name: 'Dione', kind: 'moon', parent: 'saturno' },
  { id: 'rea', name: 'Rea', kind: 'moon', parent: 'saturno' },
  { id: 'titan', name: 'Titán', kind: 'moon', parent: 'saturno' },
  { id: 'japeto', name: 'Jápeto', kind: 'moon', parent: 'saturno' },
  { id: 'miranda', name: 'Miranda', kind: 'moon', parent: 'urano' },
  { id: 'ariel', name: 'Ariel', kind: 'moon', parent: 'urano' },
  { id: 'umbriel', name: 'Umbriel', kind: 'moon', parent: 'urano' },
  { id: 'titania', name: 'Titania', kind: 'moon', parent: 'urano' },
  { id: 'oberon', name: 'Oberón', kind: 'moon', parent: 'urano' },
  { id: 'triton', name: 'Tritón', kind: 'moon', parent: 'neptuno' },
  { id: 'proteo', name: 'Proteo', kind: 'moon', parent: 'neptuno' },
] as const satisfies readonly BodyIndexEntry[];

export const PLANETS: readonly BodyIndexEntry[] = BODY_INDEX.filter(
  (body) => body.kind === 'planet',
);

/** Las lunas con ficha propia en /lunas (todas menos la nuestra, que está en /luna). */
export const OTHER_MOONS: readonly BodyIndexEntry[] = BODY_INDEX.filter(
  (body) => body.kind === 'moon' && body.id !== 'luna',
);

export function findBody(id: string): BodyIndexEntry | undefined {
  return BODY_INDEX.find((body) => body.id === id);
}

export function findPlanet(id: string): BodyIndexEntry | undefined {
  return PLANETS.find((planet) => planet.id === id);
}

export const isBodyId = (id: string): id is BodyId => findBody(id) !== undefined;
