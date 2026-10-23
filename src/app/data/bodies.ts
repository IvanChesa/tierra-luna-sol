/**
 * Catálogo de cuerpos. En la fase 0 solo lleva un cuerpo de prueba para las rutas;
 * la fase 1 lo completa con los 10 cuerpos, sus datos con fuente y body.model.ts.
 */
export interface BodyEntry {
  /** Slug en español; es el segmento de la URL (`/planetas/marte`). */
  readonly id: string;
  readonly name: string;
}

export const PLANETS: readonly BodyEntry[] = [{ id: 'marte', name: 'Marte' }];

export function findPlanet(id: string): BodyEntry | undefined {
  return PLANETS.find((planet) => planet.id === id);
}
