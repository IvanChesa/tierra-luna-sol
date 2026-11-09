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
  { body: 'fobos', real: 0.9185, grazing: 0.0, far: 0.0815, none: 0.0 },
  { body: 'io', real: 0.8291, grazing: 0.0, far: 0.1709, none: 0.0 },
  { body: 'europa', real: 0.8005, grazing: 0.0, far: 0.1939, none: 0.0056 },
  { body: 'ganimedes', real: 0.9786, grazing: 0.0, far: 0.0165, none: 0.005 },
  { body: 'calisto', real: 0.8752, grazing: 0.0, far: 0.1147, none: 0.0101 },
  { body: 'mimas', real: 0.8004, grazing: 0.0, far: 0.1996, none: 0.0 },
  { body: 'encelado', real: 0.7422, grazing: 0.0, far: 0.2578, none: 0.0 },
  { body: 'tetis', real: 0.7985, grazing: 0.0, far: 0.2015, none: 0.0 },
  { body: 'dione', real: 0.8727, grazing: 0.0, far: 0.1273, none: 0.0001 },
  { body: 'rea', real: 0.9264, grazing: 0.0, far: 0.0736, none: 0.0 },
  { body: 'japeto', real: 0.6915, grazing: 0.0, far: 0.3085, none: 0.0 },
  { body: 'triton', real: 0.3024, grazing: 0.0, far: 0.3625, none: 0.3351 },
  { body: 'deimos', real: 0.5499, grazing: 0.0052, far: 0.3266, none: 0.1183 },
  { body: 'miranda', real: 0.2727, grazing: 0.0668, far: 0.0531, none: 0.6075 },
  { body: 'ariel', real: 0.2193, grazing: 0.024, far: 0.0884, none: 0.6682 },
  { body: 'umbriel', real: 0.2928, grazing: 0.0601, far: 0.0098, none: 0.6373 },
  { body: 'titania', real: 0.2583, grazing: 0.0499, far: 0.0028, none: 0.689 },
  { body: 'oberon', real: 0.2995, grazing: 0.0349, far: 0.0003, none: 0.6653 },
];
