/**
 * Identificadores de los cuerpos que calcula `ephemeris/`. Son también el segmento de su URL
 * (`/planetas/marte`). Este módulo no importa nada: el índice de cuerpos de las rutas lo usa
 * sin arrastrar astronomy-engine al bundle inicial.
 */
export const PLANET_IDS = [
  'mercurio',
  'venus',
  'tierra',
  'marte',
  'jupiter',
  'saturno',
  'urano',
  'neptuno',
] as const;
export type PlanetId = (typeof PLANET_IDS)[number];

export const isPlanetId = (id: string): id is PlanetId =>
  (PLANET_IDS as readonly string[]).includes(id);

/** Las cuatro lunas galileanas, que se calculan con `JupiterMoons` de astronomy-engine. */
export const GALILEAN_IDS = ['io', 'europa', 'ganimedes', 'calisto'] as const;
export type GalileanId = (typeof GALILEAN_IDS)[number];
