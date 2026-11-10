// GENERADO por scripts/build-textures.mjs el 2026-11-09. No se edita a mano.
// D45 (fase 9b) y D48 (entrega 10.a): de cada luna con mosaico, la fracción de su superficie (por el área
// de la esfera) que es real con detalle, real con luz rasante (corregida), la que solo se fotografió de
// lejos (con detalle recreado) y la que no se vio (recreada entera), medidas en su mapa de 2k
// (scripts/measure-moon-maps.mjs y scripts/lib/moon-grazing.mjs). El método y las demás medidas, en
// docs/datos/recreacion-lunas.md.
import type { BodyId } from './body.model';

export interface MoonRecreation {
  readonly body: BodyId;
  readonly real: number;
  readonly grazing: number;
  readonly far: number;
  readonly none: number;
}

export const MOON_RECREATION: readonly MoonRecreation[] = [
  { body: 'fobos', real: 0.918, grazing: 0.0, far: 0.082, none: 0.0 },
  { body: 'io', real: 0.829, grazing: 0.0, far: 0.171, none: 0.0 },
  { body: 'europa', real: 0.8, grazing: 0.0, far: 0.194, none: 0.006 },
  { body: 'ganimedes', real: 0.979, grazing: 0.0, far: 0.016, none: 0.005 },
  { body: 'calisto', real: 0.875, grazing: 0.0, far: 0.115, none: 0.01 },
  { body: 'mimas', real: 0.8, grazing: 0.0, far: 0.2, none: 0.0 },
  { body: 'encelado', real: 0.742, grazing: 0.0, far: 0.258, none: 0.0 },
  { body: 'tetis', real: 0.799, grazing: 0.0, far: 0.201, none: 0.0 },
  { body: 'dione', real: 0.873, grazing: 0.0, far: 0.127, none: 0.0 },
  { body: 'rea', real: 0.926, grazing: 0.0, far: 0.074, none: 0.0 },
  { body: 'japeto', real: 0.692, grazing: 0.0, far: 0.308, none: 0.0 },
  { body: 'triton', real: 0.302, grazing: 0.0, far: 0.363, none: 0.335 },
  { body: 'deimos', real: 0.55, grazing: 0.005, far: 0.327, none: 0.118 },
  { body: 'miranda', real: 0.273, grazing: 0.067, far: 0.053, none: 0.607 },
  { body: 'ariel', real: 0.219, grazing: 0.024, far: 0.088, none: 0.668 },
  { body: 'umbriel', real: 0.293, grazing: 0.06, far: 0.01, none: 0.637 },
  { body: 'titania', real: 0.258, grazing: 0.05, far: 0.003, none: 0.689 },
  { body: 'oberon', real: 0.299, grazing: 0.035, far: 0.0, none: 0.665 },
];
